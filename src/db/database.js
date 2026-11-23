const fs = require("fs");
const path = require("path");
const { createHash, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const { initialApartments, initialBuildings, neighborhoods } = require("../data/seedData");
const translationService = require("../services/translationService");

const STORE_PATH = process.env.KIN_STORE_PATH
  ? path.resolve(process.env.KIN_STORE_PATH)
  : path.join(__dirname, "..", "data", "mongodb_store.json");
const TELEGRAM_TOKEN_URL = /api\.telegram\.org\/(?:file\/)?bot\d+(?::|%3a)[\w-]+/i;

// 1. Mongoose Schema: Apartments (Full Product CRUD + Visibility + Tenant Link)
const ApartmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    title: {
      vi: String,
      en: String,
      zh: String,
      ru: String,
      ko: String,
      ja: String
    },
    building: String,
    address: String,
    areaName: String,
    district: String,
    priceUsd: Number,
    priceVnd: Number,
    bedrooms: Number,
    bathrooms: Number,
    sizeM2: Number,
    floor: Number,
    orientation: String,
    minLeaseMonths: { type: Number, default: 3 },
    depositMonths: { type: Number, default: 1 },
    electricityRate: { type: String, default: "Giá nhà nước (EVN ~2,800đ/kWh)" },
    waterRate: { type: String, default: "Giá nhà nước / miễn phí" },
    wifiIncluded: { type: Boolean, default: true },
    naturalLightScore: { type: Number, default: 9.2 },
    remoteWorkSetup: { type: String, default: "Bàn làm việc riêng + Cáp quang 300Mbps" },
    petPolicy: { type: String, default: "Thương lượng (Hỏi chuyên viên)" },
    status: { type: String, default: "Available" }, // Available | Reserved | Rented | Hidden
    availableFrom: String,
    isVisible: { type: Boolean, default: true }, // Controls whether shown on public website
    hideWhenRented: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    landlordName: { type: String, default: "" },
    landlordPhone: { type: String, default: "" },
    adminNote: { type: String, default: "" },
    currentTenant: {
      leaseCode: String,
      tenantName: String,
      tenantContact: String,
      startDate: String,
      endDate: String,
      priceUsd: Number
    },
    locationAccuracy: { type: String, enum: ["exact", "area"] },
    coordinates: {
      type: new mongoose.Schema({ lat: Number, lng: Number }, { _id: false }),
      default: null
    },
    reservationHold: {
      type: new mongoose.Schema({ inquiryCode: String, confirmedAt: Date }, { _id: false }),
      default: undefined
    },
    architecturalNotes: {
      vi: String,
      en: String,
      zh: String,
      ru: String,
      ko: String,
      ja: String
    },
    translations: { type: mongoose.Schema.Types.Mixed, default: undefined },
    tags: [String],
    images: [String],
    source: { type: String, default: "web" } // web | telegram | excel | google_sheets | owner_submission
  },
  { timestamps: true }
);
ApartmentSchema.index({ isVisible: 1, status: 1, featured: -1, createdAt: -1 });
ApartmentSchema.index({ areaName: 1, priceUsd: 1 });
ApartmentSchema.index({ images: 1 });

// 2. Mongoose Schema: Inquiries / Customer Leads / Viewing Schedule / Landlord Submissions
const InquirySchema = new mongoose.Schema(
  {
    code: { type: String, index: true, default: () => newInquiryCode() },
    type: { type: String, default: "viewing" }, // viewing | shortlist | direct_contact | owner_listing | lead | reservation
    clientName: String,
    messenger: String, // Telegram | WhatsApp | Zalo | Phone
    contactHandle: String,
    apartmentCode: { type: String, index: true },
    apartmentTitle: String,
    budgetUsd: String,
    bedrooms: String,
    viewingTime: String,
    requestedViewingTime: String,
    viewingSlotKey: String,
    moveInDate: String,
    leaseDuration: String,
    notes: String,
    ownerPropertyData: mongoose.Schema.Types.Mixed, // When type === "owner_listing"
    status: { type: String, default: "New" }, // Inquiry statuses, or Pending | Confirmed | Cancelled for reservations
    reservationConfirmedAt: Date,
    reservationCancelledAt: Date,
    submissionFingerprint: String,
    submissionReceipt: mongoose.Schema.Types.Mixed,
    adminNotes: { type: String, default: "" }
  },
  { timestamps: true }
);
InquirySchema.index({ viewingSlotKey: 1 }, {
  unique: true, partialFilterExpression: { viewingSlotKey: { $type: "string" } }
});
InquirySchema.index({ createdAt: -1 });
InquirySchema.index({ apartmentCode: 1, createdAt: -1 });
InquirySchema.index({ type: 1, status: 1 });

// 3. Mongoose Schema: Leases / Active Tenants (Quản lý khách đang thuê căn nào & thời hạn)
const LeaseSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    apartmentCode: { type: String, required: true },
    apartmentTitle: String,
    building: String,
    address: String,
    tenantName: { type: String, required: true },
    tenantContact: String,
    messenger: { type: String, default: "Telegram" },
    nationality: { type: String, default: "" },
    priceUsd: Number,
    priceVnd: Number,
    depositMonths: { type: Number, default: 1 },
    paymentDay: { type: Number, default: 5 },
    startDate: String,
    endDate: String,
    status: { type: String, default: "Active" }, // Active | Expiring_Soon | Ended
    hideApartmentOnWeb: { type: Boolean, default: false },
    notes: String
  },
  { timestamps: true }
);
LeaseSchema.index({ status: 1, endDate: 1 });
LeaseSchema.index({ apartmentCode: 1 });

const ApartmentModel = mongoose.models.Apartment || mongoose.model("Apartment", ApartmentSchema);
const InquiryModel = mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);
const LeaseModel = mongoose.models.Lease || mongoose.model("Lease", LeaseSchema);

let isNativeMongoConnected = false;
let mongoConnectionMode = "Hybrid Persistent Mongo-JSON Store (Ready)";

const initialDemoLeases = [
  {
    _id: "lease-demo-01",
    code: "HD-2026-01",
    apartmentCode: "DN-FIL-2401",
    apartmentTitle: "The Filmore — Căn Hộ 2PN Ban Công Cánh Chim View Cầu Rồng",
    building: "The Filmore Da Nang",
    address: "Đường Bạch Đằng, Quận Hải Châu, Đà Nẵng",
    tenantName: "Lucas Meyer (Chuyên gia Đức)",
    tenantContact: "@lucas_meyer_de / +84 905 882 114",
    messenger: "Telegram",
    nationality: "Germany",
    priceUsd: 1350,
    priceVnd: 34400000,
    depositMonths: 2,
    paymentDay: 5,
    startDate: "2026-10-01",
    endDate: "2027-04-01",
    status: "Active",
    hideApartmentOnWeb: false,
    notes: "Hợp đồng 6 tháng, đã đăng ký tạm trú NA17 Công an P. Bình Thuận. Thanh toán ngày 05 hàng tháng.",
    createdAt: new Date().toISOString()
  }
];

const initialDemoInquiries = [
  {
    _id: "inq-demo-01",
    code: "KH-1088",
    type: "viewing",
    clientName: "Alexey Lukashenko",
    messenger: "Telegram",
    contactHandle: "@alex_nomad_dn",
    apartmentCode: "DN-PAN-1902",
    apartmentTitle: "The Panoma 1 — Căn Hộ 1PN View Sông Hàn & Cầu Trần Thị Lý",
    budgetUsd: "$654/tháng",
    bedrooms: "1 PN",
    viewingTime: "Ngày mai 15:30 chiều",
    moveInDate: "2026-12-01",
    leaseDuration: "6 tháng",
    notes: "Đặt lịch xem căn hộ DN-PAN-1902 (Ngày mai 15:30 chiều) — Cần bàn làm việc rộng gần cửa sổ.",
    status: "Viewing_Scheduled",
    adminNotes: "Đã nhắn Telegram xác nhận hẹn tại sảnh The Panoma lúc 15:30.",
    createdAt: new Date().toISOString()
  },
  {
    _id: "inq-demo-02",
    code: "KH-1089",
    type: "shortlist",
    clientName: "Nguyễn Minh Hoàng",
    messenger: "Zalo",
    contactHandle: "0905678912",
    apartmentCode: "CURATED-SHORTLIST",
    apartmentTitle: "Gợi ý căn hộ theo nhu cầu",
    budgetUsd: "$900/tháng",
    bedrooms: "2 phòng ngủ",
    viewingTime: "Cuối tuần này",
    moveInDate: "Tháng tới (Thuê 6–12 tháng)",
    leaseDuration: "12 tháng",
    notes: "Cần căn 2PN khu Sơn Trà hoặc An Thượng, cho nuôi 1 bé Corgi nhỏ, có chỗ đậu ô tô.",
    status: "New",
    adminNotes: "",
    createdAt: new Date().toISOString()
  }
];

let store = {
  apartments: [],
  buildings: [],
  neighborhoods: [],
  inquiries: [],
  leases: [],
  syncLogs: [],
  botMessages: [],
  wizardSessions: {},
  settings: {
    telegramBotToken: "",
    telegramAdminChatId: "",
    googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || "",
    googleSheetsCsvUrl: process.env.GOOGLE_SHEETS_CSV_URL || "",
    usdToVndRate: 25480,
    hideRentedByDefault: false
  }
};

function enrichDefaultApartments(list) {
  const defaultAddresses = {
    "The Panoma (Sun Cosmo)": "Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng",
    "The Filmore Da Nang": "Đường Bạch Đằng, Quận Hải Châu, Đà Nẵng",
    "Hiyori Garden Tower": "Đường Võ Văn Kiệt, Quận Sơn Trà, Đà Nẵng",
    "The Monarchy (Block B)": "Đường Trần Hưng Đạo, Quận Sơn Trà, Đà Nẵng",
    "An Thuong Boutique Lofts": "Khu phố An Thượng 2, Quận Ngũ Hành Sơn, Đà Nẵng",
    "Nam Viet A River Villas": "Khu biệt thự Nam Việt Á, Quận Ngũ Hành Sơn, Đà Nẵng"
  };
  return (list || []).map((apt) => ({
    ...apt,
    address: apt.address || defaultAddresses[apt.building] || `${apt.areaName || "An Thượng"}, Đà Nẵng`,
    status: apt.status || "Available",
    isVisible: apt.isVisible !== undefined ? Boolean(apt.isVisible) : apt.status !== "Hidden",
    hideWhenRented: Boolean(apt.hideWhenRented),
    landlordName: apt.landlordName || "Chủ nhà đối tác KIN Estates",
    landlordPhone: apt.landlordPhone || "0389711601"
  }));
}

function loadJsonStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      store = {
        ...store,
        ...parsed,
        apartments: enrichDefaultApartments(
          parsed.apartments && parsed.apartments.length > 0 ? parsed.apartments : initialApartments
        ),
        leases: parsed.leases && parsed.leases.length > 0 ? parsed.leases : initialDemoLeases,
        inquiries: parsed.inquiries && parsed.inquiries.length > 0 ? parsed.inquiries : initialDemoInquiries,
        settings: { ...store.settings, ...(parsed.settings || {}) }
      };
    } else {
      store.apartments = enrichDefaultApartments(JSON.parse(JSON.stringify(initialApartments)));
      store.buildings = JSON.parse(JSON.stringify(initialBuildings));
      store.neighborhoods = JSON.parse(JSON.stringify(neighborhoods));
      store.inquiries = JSON.parse(JSON.stringify(initialDemoInquiries));
      store.leases = JSON.parse(JSON.stringify(initialDemoLeases));
      saveJsonStore();
    }
  } catch (err) {
    console.error("Error loading JSON store:", err.message);
    store.apartments = enrichDefaultApartments(JSON.parse(JSON.stringify(initialApartments)));
    store.buildings = JSON.parse(JSON.stringify(initialBuildings));
    store.neighborhoods = JSON.parse(JSON.stringify(neighborhoods));
    store.inquiries = JSON.parse(JSON.stringify(initialDemoInquiries));
    store.leases = JSON.parse(JSON.stringify(initialDemoLeases));
  }
}

function saveJsonStore(snapshot = store, { strict = false } = {}) {
  if (process.env.VERCEL && !strict) return;
  const directory = path.dirname(STORE_PATH);
  const settings = { ...snapshot.settings };
  if (process.env.TELEGRAM_BOT_TOKEN) delete settings.telegramBotToken;
  if (process.env.TELEGRAM_ADMIN_CHAT_ID) delete settings.telegramAdminChatId;
  const temporary = path.join(directory, `.${path.basename(STORE_PATH)}.${randomUUID()}.tmp`);
  try {
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temporary, JSON.stringify({ ...snapshot, settings }, null, 2),
      { encoding: "utf8", flag: "wx", mode: 0o600, flush: strict });
    fs.renameSync(temporary, STORE_PATH);
  } catch {
    if (strict) {
      throw Object.assign(new Error("Could not save the local database"), { code: "STORE_WRITE_FAILED" });
    }
    console.warn("Note: In-memory store updated (filesystem write skipped)");
  } finally {
    try { fs.rmSync(temporary, { force: true }); } catch { /* Best-effort cleanup of the staging file. */ }
  }
}

function commitLocalStore(changes) {
  const updated = { ...store, ...changes };
  saveJsonStore(updated, { strict: true });
  store = updated;
}

async function initDatabase() {
  loadJsonStore();
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    isNativeMongoConnected = false;
    mongoConnectionMode = "MongoDB Document Persistence Engine (Local JSON-Mongo Hybrid)";
    return;
  }
  try {
    const isAtlas = uri.startsWith("mongodb+srv://");
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: isAtlas ? 9000 : 2200,
        maxPoolSize: 10
      });
    }
    isNativeMongoConnected = true;
    mongoConnectionMode = isAtlas ? "MongoDB Atlas Cloud Connected (Live 24/7)" : "Native MongoDB Connected";
    const count = await ApartmentModel.countDocuments();
    if (count === 0 && store.apartments.length > 0) {
      const seedDocs = store.apartments.map(({ _id, ...rest }) => rest);
      await ApartmentModel.insertMany(seedDocs);
    }
    const leaseCount = await LeaseModel.countDocuments();
    if (leaseCount === 0 && store.leases.length > 0) {
      await LeaseModel.insertMany(store.leases.map(({ _id, ...rest }) => rest));
    }
    const inqCount = await InquiryModel.countDocuments();
    if (inqCount === 0 && store.inquiries.length > 0) {
      await InquiryModel.insertMany(store.inquiries.map(({ _id, ...rest }) => rest));
    }
    console.log(`✓ Connected to ${mongoConnectionMode}`);
  } catch (err) {
    isNativeMongoConnected = false;
    mongoConnectionMode = "MongoDB Document Persistence Engine (Local JSON-Mongo Hybrid)";
    console.log("ℹ Running with Persistent Mongo-JSON Document Store");
  }
}

async function ensureMongoConnection() {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) return false;
  if (mongoose.connection.readyState === 1) {
    isNativeMongoConnected = true;
    return true;
  }
  await initDatabase();
  return isNativeMongoConnected;
}

async function persistApartmentLanguageCache(code, lang, translatedApt) {
  if (!isNativeMongoConnected || !code || !lang || !translatedApt) return;
  const update = {};
  if (translatedApt.title?.[lang]) update[`title.${lang}`] = translatedApt.title[lang];
  if (translatedApt.architecturalNotes?.[lang]) update[`architecturalNotes.${lang}`] = translatedApt.architecturalNotes[lang];
  if (translatedApt.translations?.[lang]) update[`translations.${lang}`] = translatedApt.translations[lang];
  if (Object.keys(update).length === 0) return;
  try {
    await ApartmentModel.updateOne({ code }, { $set: update });
  } catch {
    // Non-blocking background translation cache write
  }
}

async function getApartments(filters = {}) {
  let list = [];
  if (isNativeMongoConnected) {
    const docs = await ApartmentModel.find().sort({ featured: -1, createdAt: -1 }).lean();
    list = docs.map(readMongoApartment);
  } else {
    list = store.apartments.map(apartmentForRead);
  }

  // If public catalog request (not includeHidden), hide apartments where isVisible === false or status === "Hidden"
  const includeHidden =
    filters.includeHidden === "true" ||
    filters.includeHidden === true ||
    filters.admin === "true" ||
    filters.admin === true;

  if (!includeHidden) {
    list = list.filter(isPublicApartment);
  }

  if (filters.area && filters.area !== "all") {
    list = list.filter((a) => (a.areaName || "").toLowerCase() === filters.area.toLowerCase());
  }
  if (filters.bedrooms && filters.bedrooms !== "all") {
    const br = Number(filters.bedrooms);
    if (br >= 3) {
      list = list.filter((a) => a.bedrooms >= 3);
    } else {
      list = list.filter((a) => a.bedrooms === br);
    }
  }
  if (filters.maxPrice && Number(filters.maxPrice) > 0) {
    list = list.filter((a) => a.priceUsd <= Number(filters.maxPrice));
  }
  if (filters.minPrice && Number(filters.minPrice) > 0) {
    list = list.filter((a) => a.priceUsd >= Number(filters.minPrice));
  }
  if (filters.status && filters.status !== "all") {
    list = list.filter((a) => (a.status || "").toLowerCase() === filters.status.toLowerCase());
  }
  if (filters.tag && filters.tag !== "all") {
    list = list.filter((a) =>
      (a.tags || []).some((t) => t.toLowerCase().includes(filters.tag.toLowerCase()))
    );
  }
  if (filters.q && filters.q.trim() !== "") {
    const q = filters.q.trim().toLowerCase();
    list = list.filter((a) => {
      const titleVi = (a.title?.vi || "").toLowerCase();
      const titleEn = (a.title?.en || "").toLowerCase();
      const bldg = (a.building || "").toLowerCase();
      const addr = (a.address || "").toLowerCase();
      const code = (a.code || "").toLowerCase();
      const area = (a.areaName || "").toLowerCase();
      return (
        titleVi.includes(q) ||
        titleEn.includes(q) ||
        bldg.includes(q) ||
        addr.includes(q) ||
        code.includes(q) ||
        area.includes(q)
      );
    });
  }
  return list;
}

function isPublicApartment(apartment) {
  return apartment.isVisible !== false &&
    apartment.status !== "Hidden" &&
    !(apartment.status === "Rented" && (apartment.hideWhenRented || store.settings?.hideRentedByDefault));
}

async function hasPublicApartmentPhoto(urls) {
  if (isNativeMongoConnected) {
    return Boolean(await ApartmentModel.exists({
      images: { $in: urls },
      isVisible: { $ne: false },
      status: { $ne: "Hidden" },
      $or: [
        { status: { $ne: "Rented" } },
        ...(store.settings?.hideRentedByDefault ? [] : [{ hideWhenRented: { $ne: true } }])
      ]
    }));
  }
  return store.apartments.some(
    (apartment) => isPublicApartment(apartment) && apartment.images?.some((image) => urls.includes(image))
  );
}

async function getApartmentByCodeOrId(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toUpperCase();
  if (isNativeMongoConnected) {
    const codePattern = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let doc = await ApartmentModel.findOne({ code: new RegExp(`^${codePattern}$`, "i") }).lean();
    if (!doc && mongoose.Types.ObjectId.isValid(identifier)) {
      doc = await ApartmentModel.findById(identifier).lean();
    }
    return doc ? readMongoApartment(doc) : null;
  }
  const apartment = findLocalApartment(clean);
  return apartment ? apartmentForRead(apartment) : null;
}

function withoutTelegramTokenUrls(images) {
  return images.filter((image) => typeof image !== "string" || !TELEGRAM_TOKEN_URL.test(image));
}

function withSafeApartmentImages(apartment) {
  if (!Array.isArray(apartment.images)) return apartment;
  return { ...apartment, images: withoutTelegramTokenUrls(apartment.images) };
}

function apartmentForRead(apartment) {
  return withSafeApartmentImages({
    ...apartment,
    ...normalizeApartmentLocation(apartment.locationAccuracy === "exact" ? "exact" : "area", apartment.coordinates)
  });
}

function readMongoApartment(doc) {
  return apartmentForRead({
    ...doc,
    _id: String(doc._id),
    ...(doc.updatedAt instanceof Date ? { updatedAt: doc.updatedAt.toISOString() } : {})
  });
}

function findLocalApartment(identifier) {
  const clean = String(identifier ?? "").trim().toUpperCase();
  return store.apartments.find((apartment) =>
    String(apartment._id).toUpperCase() === clean || String(apartment.code).toUpperCase() === clean
  ) || null;
}

function parsePriceInput(priceInput, priceVndInput) {
  const rate = store.settings?.usdToVndRate || 25480;
  let priceUsd = 0;
  let priceVnd = 0;

  if (typeof priceInput === "string") {
    const clean = priceInput.toLowerCase().trim();
    if (clean.includes("tr") || clean.includes("triệu") || clean.includes("vnd") || clean.includes("đ")) {
      const num = parseFloat(clean.replace(/[^0-9.]/g, ""));
      if (num > 0) {
        priceVnd = num < 1000 ? Math.round(num * 1000000) : Math.round(num);
        priceUsd = Math.round(priceVnd / rate);
      }
    } else {
      const num = parseFloat(clean.replace(/[^0-9.]/g, ""));
      if (num > 100000) {
        priceVnd = Math.round(num);
        priceUsd = Math.round(priceVnd / rate);
      } else if (num > 0) {
        priceUsd = Math.round(num);
        priceVnd = Math.round((priceUsd * rate) / 100000) * 100000;
      }
    }
  } else if (typeof priceInput === "number" && priceInput > 0) {
    if (priceInput > 100000) {
      priceVnd = Math.round(priceInput);
      priceUsd = Math.round(priceVnd / rate);
    } else {
      priceUsd = Math.round(priceInput);
      priceVnd = Math.round((priceUsd * rate) / 100000) * 100000;
    }
  }

  if (priceVndInput && Number(priceVndInput) > 0) {
    priceVnd = Number(priceVndInput);
    if (!priceUsd) priceUsd = Math.round(priceVnd / rate);
  }

  if (!priceUsd || priceUsd <= 0) {
    priceUsd = 750;
    priceVnd = Math.round((priceUsd * rate) / 100000) * 100000;
  }

  return { priceUsd, priceVnd };
}

function normalizeAreaName(input = "") {
  const s = String(input || "").toLowerCase();
  if (s.includes("an thuong") || s.includes("an thượng") || s.includes("my an") || s.includes("mỹ an")) return "An Thuong";
  if (s.includes("son tra") || s.includes("sơn trà") || s.includes("hiyori") || s.includes("monarchy")) return "Son Tra";
  if (s.includes("han") || s.includes("hàn") || s.includes("hai chau") || s.includes("hải châu") || s.includes("filmore") || s.includes("panoma")) return "Han Riverfront";
  if (s.includes("my khe") || s.includes("mỹ khê") || s.includes("beach") || s.includes("biển") || s.includes("võ nguyên giáp")) return "My Khe Beachfront";
  return input || "An Thuong";
}

function normalizeApartmentPayload(payload, { sparse = false } = {}) {
  const { priceUsd, priceVnd } = parsePriceInput(payload.priceUsd || payload.price, payload.priceVnd);
  const fact = (value, fallback) => sparse ? value ?? null : value || fallback;
  const numberFact = (value, fallback) =>
    sparse ? (value == null ? null : Number(value)) : Number(value) || fallback;
  const areaName = normalizeAreaName(payload.areaName || payload.area || "An Thuong");

  const titleText =
    typeof payload.title === "string"
      ? payload.title.trim()
      : payload.title?.vi || payload.title?.en || "Căn Hộ Kiến Trúc Tuyển Chọn Đà Nẵng";

  const enTitleFallback = payload.titleEn || payload.title?.en || titleText;
  const titleObj =
    typeof payload.title === "object" && payload.title !== null
      ? {
          vi: payload.title.vi || titleText,
          en: payload.title.en || enTitleFallback,
          zh: payload.title.zh || enTitleFallback,
          ru: payload.title.ru || enTitleFallback,
          ko: payload.title.ko || enTitleFallback,
          ja: payload.title.ja || enTitleFallback
        }
      : {
          vi: titleText,
          en: enTitleFallback,
          zh: enTitleFallback,
          ru: payload.titleRu || enTitleFallback,
          ko: enTitleFallback,
          ja: enTitleFallback
        };

  const notesText =
    typeof payload.architecturalNotes === "string"
      ? payload.architecturalNotes.trim()
      : payload.architecturalNotes?.vi ||
        payload.description ||
        (sparse ? "" : "Không gian sống thiết kế chuẩn kiến trúc đương đại, tràn ngập ánh sáng tự nhiên, đầy đủ nội thất cao cấp và bàn làm việc tốc độ cao.");

  const enNotesFallback = payload.descriptionEn || payload.architecturalNotes?.en || notesText;
  const notesObj =
    typeof payload.architecturalNotes === "object" && payload.architecturalNotes !== null
      ? {
          vi: payload.architecturalNotes.vi || notesText,
          en: payload.architecturalNotes.en || enNotesFallback,
          zh: payload.architecturalNotes.zh || enNotesFallback,
          ru: payload.architecturalNotes.ru || enNotesFallback,
          ko: payload.architecturalNotes.ko || enNotesFallback,
          ja: payload.architecturalNotes.ja || enNotesFallback
        }
      : {
          vi: notesText,
          en: enNotesFallback,
          zh: enNotesFallback,
          ru: payload.descriptionRu || enNotesFallback,
          ko: enNotesFallback,
          ja: enNotesFallback
        };

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const code = String(payload.code || `DN-KIN-${randomNum}`).trim().toUpperCase();

  let images = payload.images;
  if (typeof images === "string") {
    images = images
      .split(/[\n,|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(images)) images = withoutTelegramTokenUrls(images);
  const isTelegram = payload.source === "telegram";
  const hasExplicitTelegramImages = isTelegram && Array.isArray(payload.images);
  if (!Array.isArray(images) || (images.length === 0 && !hasExplicitTelegramImages)) {
    images = [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ];
  }

  let tags = payload.tags;
  if (typeof tags === "string") {
    tags = tags
      .split(/[,|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    tags = sparse ? [] : ["Natural Light", "Remote-Work Desk", "State-Rate Electricity"];
  }

  const status = payload.status || "Available";
  const isVisible =
    payload.isVisible !== undefined
      ? Boolean(payload.isVisible)
      : status !== "Hidden";

  const building = payload.building || "KIN Estates Residence";
  const address =
    payload.address ||
    `${building}, ${areaName}, Đà Nẵng`;

  return {
    _id: payload._id || `apt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code,
    title: titleObj,
    building,
    address,
    areaName,
    district: fact(payload.district, "Sơn Trà / Ngũ Hành Sơn"),
    priceUsd,
    priceVnd,
    bedrooms: isTelegram && (payload.bedrooms === 0 || payload.bedrooms === "0") ? 0 : numberFact(payload.bedrooms, 1),
    bathrooms: numberFact(payload.bathrooms, Number(payload.bedrooms) || 1),
    sizeM2: numberFact(payload.sizeM2, 65),
    floor: isTelegram && (payload.floor === 0 || payload.floor === "0") ? 0 : numberFact(payload.floor, 12),
    orientation: fact(payload.orientation, "Đông Nam / Đón gió biển"),
    minLeaseMonths: numberFact(payload.minLeaseMonths, 3),
    depositMonths: numberFact(payload.depositMonths, 1),
    electricityRate: fact(payload.electricityRate, "Giá nhà nước (EVN ~2,800đ/kWh)"),
    waterRate: fact(payload.waterRate, "Giá nhà nước"),
    wifiIncluded: payload.wifiIncluded !== undefined ? Boolean(payload.wifiIncluded) : fact(undefined, true),
    naturalLightScore: numberFact(payload.naturalLightScore, 9.5),
    remoteWorkSetup: fact(payload.remoteWorkSetup, "Bàn làm việc riêng + Cáp quang 300Mbps"),
    petPolicy: fact(payload.petPolicy, "Thương lượng (Cho phép thú cưng nhỏ)"),
    status,
    availableFrom: normalizeAvailableFrom(payload.availableFrom),
    isVisible,
    hideWhenRented: Boolean(payload.hideWhenRented),
    featured: payload.featured !== undefined ? Boolean(payload.featured) : true,
    landlordName: payload.landlordName || "",
    landlordPhone: payload.landlordPhone || "",
    adminNote: payload.adminNote || "",
    currentTenant: payload.currentTenant || null,
    ...normalizeApartmentLocation(payload.locationAccuracy, payload.coordinates),
    architecturalNotes: notesObj,
    tags,
    images,
    source: payload.source || "web",
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function apartmentAlreadyExists() {
  return Object.assign(new Error("An apartment with this code already exists"), { code: "APARTMENT_EXISTS" });
}

async function createApartment(payload, { insertOnly = false, durable = false } = {}) {
  const baseNormalized = normalizeApartmentPayload(payload, { sparse: durable && payload.source === "telegram" });
  const normalized = await translationService.translateApartmentAllLanguages(baseNormalized);
  if (!insertOnly) {
    const existing = isNativeMongoConnected ? await getApartmentByCodeOrId(normalized.code) : findLocalApartment(normalized.code);
    if (existing) {
      if (payload.locationAccuracy === undefined && payload.coordinates === undefined) {
        delete normalized.locationAccuracy;
        delete normalized.coordinates;
      }
      if (payload.availableFrom === undefined) delete normalized.availableFrom;
      return updateApartment(existing.code, normalized);
    }
  }
  if (isNativeMongoConnected) {
    const { _id, ...docData } = normalized;
    let created;
    if (insertOnly) {
      await ApartmentModel.init();
      try {
        created = await ApartmentModel.create(docData);
      } catch (error) {
        if (error.code === 11000) throw apartmentAlreadyExists();
        throw error;
      }
    } else {
      created = await ApartmentModel.findOneAndUpdate({ code: normalized.code }, docData, { upsert: true, new: true });
    }
    normalized._id = String(created._id);
    normalized.updatedAt = apartmentRevision(created.updatedAt) ?? normalized.updatedAt;
  }
  const apartments = [...store.apartments];
  const existingIdx = apartments.findIndex(
    (a) => a.code.toUpperCase() === normalized.code.toUpperCase()
  );
  if (!isNativeMongoConnected && insertOnly && existingIdx >= 0) throw apartmentAlreadyExists();
  if (existingIdx >= 0) {
    apartments[existingIdx] = { ...apartments[existingIdx], ...normalized };
  } else {
    apartments.unshift(normalized);
  }
  if (!isNativeMongoConnected && durable) {
    commitLocalStore({ apartments });
  } else {
    store.apartments = apartments;
    saveJsonStore();
  }
  return normalized;
}

function normalizeApartmentLocation(accuracy, coordinates) {
  if (accuracy !== undefined && accuracy !== "exact" && accuracy !== "area") {
    throw new Error("Location accuracy must be exact or area");
  }
  if (accuracy === "area" || (accuracy === undefined && coordinates == null)) {
    return { locationAccuracy: "area", coordinates: null };
  }
  const { lat, lng } = coordinates || {};
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error("Exact location requires a valid latitude and longitude");
  }
  return { locationAccuracy: "exact", coordinates: { lat, lng } };
}

function normalizeApartmentUpdates(target, { _id, reservationHold, ...updates }) {
  const rate = store.settings?.usdToVndRate || 25480;
  if (updates.availableFrom !== undefined) updates.availableFrom = normalizeAvailableFrom(updates.availableFrom);
  const addressChanged = updates.address !== undefined && updates.address !== target.address;
  if (addressChanged && updates.coordinates === undefined) {
    Object.assign(updates, normalizeApartmentLocation("area", null));
  } else if (updates.locationAccuracy !== undefined || updates.coordinates !== undefined) {
    const coordinates = updates.coordinates !== undefined ? updates.coordinates :
      target.locationAccuracy === "exact" ? target.coordinates : null;
    Object.assign(updates, normalizeApartmentLocation(updates.locationAccuracy, coordinates));
  }
  if (updates.priceUsd !== undefined || updates.price !== undefined) {
    const parsed = parsePriceInput(updates.priceUsd ?? updates.price, updates.priceVnd);
    updates.priceUsd = parsed.priceUsd;
    updates.priceVnd = parsed.priceVnd;
  } else if (updates.priceVnd !== undefined) {
    updates.priceVnd = Number(updates.priceVnd);
    updates.priceUsd = Math.round(updates.priceVnd / rate);
  }

  if (typeof updates.title === "string") {
    updates.title = {
      vi: updates.title,
      en: updates.titleEn || updates.title,
      zh: updates.title,
      ru: updates.title,
      ko: updates.title,
      ja: updates.title
    };
  }

  if (typeof updates.architecturalNotes === "string") {
    updates.architecturalNotes = {
      vi: updates.architecturalNotes,
      en: updates.descriptionEn || updates.architecturalNotes,
      zh: updates.architecturalNotes,
      ru: updates.architecturalNotes,
      ko: updates.architecturalNotes,
      ja: updates.architecturalNotes
    };
  }

  if (typeof updates.images === "string") {
    updates.images = updates.images
      .split(/[\n,|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(updates.images)) updates.images = withoutTelegramTokenUrls(updates.images);

  if (typeof updates.tags === "string") {
    updates.tags = updates.tags
      .split(/[,|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (updates.status === "Hidden") {
    updates.isVisible = false;
  } else if (updates.status === "Available" && updates.isVisible === undefined) {
    updates.isVisible = true;
  }
  if (target.reservationHold && updates.status === "Available") updates.status = "Reserved";

  return updates;
}

function apartmentConflict() {
  return Object.assign(new Error("Apartment changed since it was reviewed"), { code: "APARTMENT_CONFLICT" });
}

function apartmentRevision(value) {
  return value instanceof Date ? value.toISOString() : value ?? null;
}

function nextApartmentRevision(updatedAt) {
  const previous = new Date(updatedAt ?? 0).getTime();
  return new Date(Math.max(Date.now(), Number.isFinite(previous) ? previous + 1 : 0));
}

function mirrorApartmentUpdate(target, updated, durable = false) {
  const idx = store.apartments.findIndex(
    (a) => a.code.toUpperCase() === target.code.toUpperCase() || String(a._id) === String(target._id)
  );
  if (idx >= 0) {
    if (durable) {
      const apartments = [...store.apartments];
      apartments[idx] = updated;
      commitLocalStore({ apartments });
    } else {
      store.apartments[idx] = updated;
      saveJsonStore();
    }
  }
}

async function updateApartment(identifier, updates, { expectedUpdatedAt } = {}) {
  const conditional = expectedUpdatedAt !== undefined;
  const expected = apartmentRevision(expectedUpdatedAt);
  const textKeys = ["title", "architecturalNotes", "address", "orientation", "electricityRate", "waterRate", "petPolicy", "remoteWorkSetup", "tags"];
  const shouldRetranslate = textKeys.some((k) => updates[k] !== undefined);

  const prepareMergedPatch = async (target) => {
    const patch = normalizeApartmentUpdates(target, updates);
    if (!shouldRetranslate) return patch;
    const clearedTranslations = { ...(target.translations || {}) };
    for (const lang of translationService.TARGET_LANGS) {
      if (clearedTranslations[lang]) {
        const copy = { ...clearedTranslations[lang] };
        for (const k of ["address", "orientation", "electricityRate", "waterRate", "petPolicy", "remoteWorkSetup", "tags"]) {
          if (updates[k] !== undefined) delete copy[k];
        }
        clearedTranslations[lang] = copy;
      }
    }
    const candidate = { ...target, ...patch, translations: clearedTranslations };
    const translated = await translationService.translateApartmentAllLanguages(candidate);
    return {
      ...patch,
      title: translated.title,
      architecturalNotes: translated.architecturalNotes,
      translations: translated.translations
    };
  };

  if (!isNativeMongoConnected) {
    const target = findLocalApartment(identifier);
    if (conditional && (!target || apartmentRevision(target.updatedAt) !== expected)) throw apartmentConflict();
    if (!target) return null;
    const patch = await prepareMergedPatch(target);
    const updated = {
      ...target,
      ...patch,
      updatedAt: nextApartmentRevision(target.updatedAt).toISOString()
    };
    mirrorApartmentUpdate(target, updated, conditional);
    return apartmentForRead(updated);
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const target = await getApartmentByCodeOrId(identifier);
    if (conditional && (!target || apartmentRevision(target.updatedAt) !== expected)) throw apartmentConflict();
    if (!target) return null;
    const patch = await prepareMergedPatch(target);

    // Compare every write with its read to keep the revision monotonic during concurrent updates.
    const doc = await ApartmentModel.findOneAndUpdate(
      { _id: target._id, updatedAt: target.updatedAt ?? null },
      { $set: { ...patch, updatedAt: nextApartmentRevision(target.updatedAt) } },
      { new: true, timestamps: false }
    ).lean();
    if (doc) {
      const updated = readMongoApartment(doc);
      mirrorApartmentUpdate(target, updated);
      return updated;
    }
    if (conditional) throw apartmentConflict();
  }
  throw apartmentConflict();
}

async function deleteApartment(identifier) {
  const target = isNativeMongoConnected ? await getApartmentByCodeOrId(identifier) : findLocalApartment(identifier);
  if (!target) return null;
  if (target.reservationHold) {
    throw reservationError("RESERVATION_ACTION_REQUIRED", "Hủy giữ chỗ trước khi xóa căn hộ.");
  }

  if (isNativeMongoConnected) {
    const removed = await ApartmentModel.findOneAndDelete({ _id: target._id, reservationHold: null }).lean();
    if (!removed) throw apartmentConflict();
  }

  store.apartments = store.apartments.filter(
    (a) => a.code.toUpperCase() !== target.code.toUpperCase() && String(a._id) !== String(target._id)
  );
  saveJsonStore();
  return target;
}

// ============================================================================
// INQUIRIES / CUSTOMER LEADS / VIEWING APPOINTMENTS / OWNER LISTINGS CRUD
// ============================================================================
function canonicalCode(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function newInquiryCode() {
  return "KH-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
}

function inquirySelector(identifier) {
  const clean = canonicalCode(identifier);
  const pattern = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const code = { code: new RegExp(`^${pattern}$`, "i") };
  return mongoose.Types.ObjectId.isValid(clean) ? { $or: [{ _id: clean.toLowerCase() }, code] } : code;
}

function inquiryForRead(doc) {
  return doc && { ...doc, _id: String(doc._id) };
}

function inquiryIndex(identifier) {
  const code = canonicalCode(identifier);
  return (store.inquiries || []).findIndex(
    (inquiry) => canonicalCode(inquiry.code) === code || canonicalCode(String(inquiry._id)) === code
  );
}

async function getInquiries(filters = {}) {
  const type = typeof filters.type === "string" && filters.type !== "all" ? filters.type : null;
  const status = typeof filters.status === "string" && filters.status !== "all" ? filters.status : null;
  const codes = Array.isArray(filters.apartmentCodes)
    ? [...new Set(filters.apartmentCodes.map(canonicalCode).filter(Boolean))] : null;
  if (codes?.length === 0) return [];
  const codeSet = codes && new Set(codes);
  if (isNativeMongoConnected) {
    const query = { ...(type ? { type } : {}), ...(status ? { status } : {}) };
    if (codes) {
      query.apartmentCode = { $in: codes.map((code) =>
        new RegExp(`^${code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) };
    }
    return (await InquiryModel.find(query).sort({ createdAt: -1 }).lean()).map(inquiryForRead);
  }
  return (store.inquiries || []).filter((inquiry) =>
    (!type || inquiry.type === type) && (!status || inquiry.status === status) &&
    (!codeSet || codeSet.has(canonicalCode(inquiry.apartmentCode)))
  );
}

async function getInquiryByCodeOrId(identifier) {
  if (!canonicalCode(identifier)) return null;
  if (isNativeMongoConnected) {
    return inquiryForRead(await InquiryModel.findOne(inquirySelector(identifier)).lean());
  }
  return store.inquiries?.[inquiryIndex(identifier)] || null;
}

function isReservation(inquiry) {
  return inquiry?.type === "reservation" || inquiry?.type === "booking";
}

const localCalendarYear = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" });

function normalizeViewingTime(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})$/.exec(input);
  const local = /^(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(input);
  if (!iso && !local) return null;
  const [year, month, day, hour, minute] = (iso ? iso.slice(1) :
    [local[5] || localCalendarYear.format(new Date()), local[4], local[3], local[1], local[2]]).map(Number);
  if (year < 1000 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59) return null;
  if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  const pad = (part) => String(part).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

function normalizeAvailableFrom(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !normalizeViewingTime(`${value} 00:00`)) {
    throw new Error("Ngày có thể nhận căn phải theo mẫu YYYY-MM-DD và là ngày hợp lệ.");
  }
  return value;
}

function newViewingTime(type, value) {
  if (value == null || value === "") return "";
  if (!["viewing", "lead", "reservation", "booking"].includes(type)) return value;
  const time = normalizeViewingTime(value);
  if (!time) throw reservationError("INVALID_VIEWING_TIME", "Nhập giờ xem hợp lệ theo mẫu HH:mm DD/MM hoặc YYYY-MM-DD HH:mm.");
  return time;
}

function reservationError(code, message) {
  return Object.assign(new Error(message), { code });
}

function availableForReservation(apartment) {
  return apartment && isPublicApartment(apartment) && apartment.status === "Available" && !apartment.reservationHold;
}

async function createReservationInquiry(payload) {
  return (await submitInquiry({ ...payload, type: "reservation" }, { durable: true })).inquiry;
}

async function reservationInquiryPayload(payload) {
  const code = canonicalCode(payload.apartmentCode);
  const apartment = isNativeMongoConnected ? await getApartmentByCodeOrId(code) : findLocalApartment(code);
  if (!availableForReservation(apartment) || canonicalCode(apartment.code) !== code) {
    throw reservationError("APARTMENT_UNAVAILABLE", "Căn hộ hiện không nhận yêu cầu giữ chỗ.");
  }
  return {
    ...payload,
    type: "reservation",
    status: "Pending",
    apartmentCode: canonicalCode(apartment.code),
    apartmentTitle: apartment.title?.vi || apartment.title?.en || apartment.title || apartment.code
  };
}

function submissionId(requestId) {
  return createHash("sha256").update(`public-inquiry:${requestId}`).digest("hex").slice(0, 24);
}

function verifySubmission(previous, fingerprint) {
  if (previous.submissionFingerprint !== fingerprint) {
    throw reservationError("INQUIRY_REQUEST_CONFLICT", "Mã gửi yêu cầu này đã được dùng cho thông tin khác.");
  }
  return { inquiry: previous, replayed: true };
}

async function createInquiry(payload, options) {
  return (await submitInquiry(payload, options)).inquiry;
}

async function submitInquiry(payload, { durable = false, requestId, fingerprint } = {}) {
  const id = requestId ? submissionId(requestId) : null;
  if (id) {
    const previous = isNativeMongoConnected ? inquiryForRead(await InquiryModel.findById(id).lean())
      : store.inquiries?.find((inquiry) => inquiry._id === id);
    if (previous) return verifySubmission(previous, fingerprint);
  }
  if (isReservation(payload)) {
    payload = await reservationInquiryPayload(payload);
    // Local asynchronous callers can reach this point together. Recheck before committing synchronously.
    if (id && !isNativeMongoConnected) {
      const previous = store.inquiries?.find((inquiry) => inquiry._id === id);
      if (previous) return verifySubmission(previous, fingerprint);
    }
  }
  const now = new Date().toISOString();
  const type = payload.type || "viewing";
  const viewingTime = newViewingTime(type, payload.viewingTime);
  if (payload.status === "Viewing_Scheduled" && !normalizeViewingTime(viewingTime)) {
    throw reservationError("INVALID_VIEWING_TIME", "Cần nhập ngày giờ hẹn xem trước khi chốt lịch.");
  }
  const inquiry = {
    _id: id || payload._id || `inq-${randomUUID()}`,
    code: canonicalCode(payload.code) || newInquiryCode(),
    type,
    clientName: payload.clientName || payload.contactHandle || "Khách hàng KIN Estates",
    messenger: payload.messenger || "Telegram / Zalo",
    contactHandle: payload.contactHandle || "",
    apartmentCode: canonicalCode(payload.apartmentCode) || "CURATED-SHORTLIST",
    apartmentTitle: payload.apartmentTitle || "Yêu cầu tư vấn căn hộ",
    budgetUsd: payload.budgetUsd || (durable ? "" : "$800 - $1,500"),
    bedrooms: payload.bedrooms || (durable ? "" : "1-2 PN"),
    viewingTime,
    requestedViewingTime: payload.requestedViewingTime || "",
    moveInDate: payload.moveInDate || "",
    leaseDuration: payload.leaseDuration || (durable ? "" : "6-12 tháng"),
    notes: payload.notes || "",
    ownerPropertyData: payload.ownerPropertyData || null,
    status: isReservation(payload) ? "Pending" : payload.status || "New",
    adminNotes: payload.adminNotes || "",
    createdAt: payload.createdAt || now,
    updatedAt: now
  };
  if (id) {
    inquiry.submissionFingerprint = fingerprint;
    inquiry.submissionReceipt = { type: inquiry.type, status: inquiry.status, apartmentCode: inquiry.apartmentCode };
  }

  const slot = viewingSlotKey(inquiry);
  if (isNativeMongoConnected) {
    const { _id, ...docData } = inquiry;
    if (slot) {
      await verifyNativeViewingSlot(inquiry, slot);
      docData.viewingSlotKey = slot;
    }
    try {
      const saved = await InquiryModel.create(id ? { ...docData, _id } : docData);
      return { inquiry: inquiryForRead(saved.toObject()), replayed: false };
    } catch (error) {
      if (error.code === 11000 && id) {
        const previous = inquiryForRead(await InquiryModel.findById(id).lean());
        if (previous) return verifySubmission(previous, fingerprint);
      }
      if (error.code === 11000 && slot) throw viewingSlotConflict();
      throw error;
    }
  }
  if (slot && (store.inquiries || []).some((item) => viewingSlotKey(item) === slot)) throw viewingSlotConflict();
  const inquiries = [inquiry, ...(store.inquiries || [])];
  if (durable) commitLocalStore({ inquiries });
  else {
    store.inquiries = inquiries;
    saveJsonStore();
  }
  return { inquiry, replayed: false };
}

const INQUIRY_EDIT_FIELDS = [
  "type", "clientName", "messenger", "contactHandle", "apartmentCode", "apartmentTitle",
  "budgetUsd", "bedrooms", "viewingTime", "requestedViewingTime", "moveInDate", "leaseDuration", "notes",
  "ownerPropertyData", "status", "adminNotes"
];

function inquiryPatch(inquiry, updates) {
  const patch = Object.fromEntries(INQUIRY_EDIT_FIELDS.filter((field) =>
    Object.hasOwn(updates, field)).map((field) => [field, updates[field]]));
  if (patch.apartmentCode !== undefined) patch.apartmentCode = canonicalCode(patch.apartmentCode);
  if (Object.hasOwn(patch, "viewingTime")) patch.viewingTime = newViewingTime(patch.type || inquiry.type, patch.viewingTime);
  if ((patch.status === "Viewing_Scheduled" ||
       (Object.hasOwn(patch, "viewingTime") && !patch.status && inquiry.status === "Viewing_Scheduled")) &&
      !normalizeViewingTime(patch.viewingTime ?? inquiry.viewingTime)) {
    throw reservationError("INVALID_VIEWING_TIME", "Cần nhập ngày giờ hẹn xem trước khi chốt lịch.");
  }
  if (isReservation({ type: patch.type }) && !isReservation(inquiry) ||
      isReservation(inquiry) && ["type", "status", "apartmentCode"].some((field) =>
        Object.hasOwn(patch, field) && patch[field] !== inquiry[field])) {
    throw reservationError("RESERVATION_ACTION_REQUIRED", "Hãy dùng thao tác xác nhận hoặc hủy giữ chỗ.");
  }
  // Ordinary edits to reservation notes must not write an old reservation state back during a confirmation.
  if (isReservation(inquiry)) {
    delete patch.type;
    delete patch.status;
    delete patch.apartmentCode;
  }
  return patch;
}

async function updateInquiry(identifier, updates) {
  if (!canonicalCode(identifier)) return null;
  if (isNativeMongoConnected) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const target = await getInquiryByCodeOrId(identifier);
      if (!target) return null;
      const patch = inquiryPatch(target, updates);
      const slotChanged = ["status", "type", "apartmentCode", "viewingTime"].some((field) => Object.hasOwn(patch, field));
      const candidate = { ...target, ...patch };
      const slot = slotChanged && viewingSlotKey(candidate);
      if (slot) {
        await verifyNativeViewingSlot(candidate, slot);
        patch.viewingSlotKey = slot;
      }
      try {
        const updated = await InquiryModel.findOneAndUpdate(
          { _id: target._id, updatedAt: target.updatedAt ?? null },
          {
            $set: { ...patch, updatedAt: nextApartmentRevision(target.updatedAt) },
            ...(slotChanged && !slot ? { $unset: { viewingSlotKey: 1 } } : {})
          },
          { new: true, timestamps: false }
        ).lean();
        if (updated) return inquiryForRead(updated);
      } catch (error) {
        if (error.code === 11000 && slot) throw viewingSlotConflict();
        throw error;
      }
    }
    throw reservationError("INQUIRY_CONFLICT", "Yêu cầu vừa thay đổi. Tải lại và thử lại.");
  }
  const idx = inquiryIndex(identifier);
  if (idx < 0) return null;
  const inquiries = [...store.inquiries];
  inquiries[idx] = { ...inquiries[idx], ...inquiryPatch(inquiries[idx], updates), updatedAt: new Date().toISOString() };
  const slot = viewingSlotKey(inquiries[idx]);
  if (slot && inquiries.some((item, index) => index !== idx && viewingSlotKey(item) === slot)) throw viewingSlotConflict();
  commitLocalStore({ inquiries });
  return inquiries[idx];
}

function viewingSlotKey(inquiry) {
  if (inquiry.status !== "Viewing_Scheduled" || !["viewing", "lead"].includes(inquiry.type)) return null;
  const apartment = canonicalCode(inquiry.apartmentCode);
  const time = normalizeViewingTime(inquiry.viewingTime);
  if (!apartment || ["CURATED-SHORTLIST", "TRANG-CHU", "PHONG-KY-GUI"].includes(apartment) || !time) return null;
  return `${apartment}:${time}`;
}

function viewingSlotConflict() {
  return reservationError("VIEWING_SLOT_CONFLICT", "Căn hộ đã có lịch xem vào giờ này. Hãy chọn giờ khác.");
}

async function verifyNativeViewingSlot(inquiry, slot) {
  await InquiryModel.init();
  const apartment = canonicalCode(inquiry.apartmentCode).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Existing records may predate the unique slot index.
  const candidates = await InquiryModel.find({
    apartmentCode: new RegExp(`^${apartment}$`, "i"),
    status: "Viewing_Scheduled",
    viewingSlotKey: null
  }).select("_id type apartmentCode status viewingTime").lean();
  if (candidates.some((item) => String(item._id) !== String(inquiry._id) && viewingSlotKey(item) === slot)) {
    throw viewingSlotConflict();
  }
}

async function deleteInquiry(identifier) {
  if (!canonicalCode(identifier)) return null;
  const target = isNativeMongoConnected ? await getInquiryByCodeOrId(identifier)
    : store.inquiries?.[inquiryIndex(identifier)];
  if (!target) return null;
  if (isReservation(target) && target.status === "Confirmed") {
    throw reservationError("RESERVATION_ACTION_REQUIRED", "Hủy giữ chỗ trước khi xóa yêu cầu.");
  }
  if (isNativeMongoConnected) {
    const filter = { _id: target._id, ...(isReservation(target) ? { status: { $ne: "Confirmed" } } : {}) };
    const deleted = await InquiryModel.findOneAndDelete(filter).lean();
    if (!deleted && isReservation(target)) {
      throw reservationError("RESERVATION_ACTION_REQUIRED", "Tải lại yêu cầu và hủy giữ chỗ trước khi xóa.");
    }
    return inquiryForRead(deleted);
  }
  commitLocalStore({ inquiries: store.inquiries.filter((item) => item !== target) });
  return target;
}

function reservationTransition(inquiry, apartment, action) {
  if (!isReservation(inquiry)) throw reservationError("RESERVATION_NOT_FOUND", "Không tìm thấy yêu cầu giữ chỗ.");
  const ownsHold = apartment?.reservationHold?.inquiryCode === inquiry.code;
  const now = new Date();
  if (action === "confirm") {
    if (inquiry.status === "Confirmed" && ownsHold) return null;
    if (!["Pending", "New"].includes(inquiry.status)) {
      throw reservationError("RESERVATION_CONFLICT", "Yêu cầu này không còn chờ xác nhận.");
    }
    if (!availableForReservation(apartment)) {
      throw reservationError("APARTMENT_UNAVAILABLE", "Căn hộ đã có giữ chỗ hoặc không còn trống.");
    }
    return {
      inquiry: { status: "Confirmed", reservationConfirmedAt: now },
      apartment: { status: "Reserved", reservationHold: { inquiryCode: inquiry.code, confirmedAt: now } }
    };
  }
  if (["Cancelled", "Canceled"].includes(inquiry.status)) return null;
  return {
    inquiry: { status: "Cancelled", reservationCancelledAt: now },
    apartment: ownsHold ? {
      status: apartment.status === "Reserved" ? "Available" : apartment.status,
      reservationHold: null
    } : null
  };
}

async function transitionReservation(identifier, action) {
  if (!["confirm", "cancel"].includes(action)) throw new Error("Unknown reservation action");

  if (isNativeMongoConnected) {
    return mongoose.connection.transaction(async (session) => {
      const inquiry = canonicalCode(identifier) &&
        await InquiryModel.findOne(inquirySelector(identifier)).session(session).lean();
      if (!isReservation(inquiry)) return reservationTransition(inquiry, null, action);
      const apartment = await ApartmentModel.findOne({
        code: canonicalCode(inquiry.apartmentCode)
      }).session(session).lean();
      const change = reservationTransition(inquiry, apartment, action);
      if (!change) return { inquiry: inquiryForRead(inquiry), changed: false };
      if (change.apartment) {
        await ApartmentModel.updateOne({ _id: apartment._id }, {
          $set: { ...change.apartment, updatedAt: nextApartmentRevision(apartment.updatedAt) }
        }, { session, timestamps: false });
      }
      const updated = await InquiryModel.findOneAndUpdate({ _id: inquiry._id }, { $set: change.inquiry },
        { new: true, session }).lean();
      return { inquiry: inquiryForRead(updated), changed: true };
    });
  }

  const index = inquiryIndex(identifier);
  const inquiry = store.inquiries?.[index];
  const apartment = isReservation(inquiry) ? findLocalApartment(inquiry.apartmentCode) : null;
  const change = reservationTransition(inquiry, apartment, action);
  if (!change) return { inquiry, changed: false };
  const inquiries = [...store.inquiries];
  inquiries[index] = { ...inquiry, ...change.inquiry, updatedAt: new Date().toISOString() };
  const apartments = change.apartment ? store.apartments.map((item) => item === apartment
    ? { ...item, ...change.apartment, updatedAt: nextApartmentRevision(item.updatedAt).toISOString() } : item)
    : store.apartments;
  commitLocalStore({ inquiries, apartments });
  return { inquiry: inquiries[index], changed: true };
}

// ============================================================================
// LEASES / ACTIVE TENANTS MANAGEMENT (Quản lý khách đang thuê căn nào, thời hạn)
// ============================================================================
async function getLeases(filters = {}) {
  let list = [];
  if (isNativeMongoConnected) {
    const docs = await LeaseModel.find().sort({ createdAt: -1 }).lean();
    list = docs.map((d) => ({ ...d, _id: String(d._id) }));
  } else {
    list = [...(store.leases || [])];
  }
  if (filters.status && filters.status !== "all") {
    list = list.filter((l) => (l.status || "").toLowerCase() === filters.status.toLowerCase());
  }
  return list;
}

async function getLeaseByCodeOrId(identifier) {
  if (!identifier) return null;
  const raw = String(identifier).trim();
  const clean = raw.toUpperCase();
  if (isNativeMongoConnected) {
    const conds = [{ code: clean }, { apartmentCode: clean, status: "Active" }];
    if (mongoose.Types.ObjectId.isValid(raw)) conds.push({ _id: raw });
    const doc = await LeaseModel.findOne({ $or: conds }).lean();
    if (doc) return { ...doc, _id: String(doc._id) };
  }
  return (
    (store.leases || []).find(
      (l) =>
        String(l._id).toUpperCase() === clean ||
        String(l.code || "").toUpperCase() === clean ||
        (String(l.apartmentCode || "").toUpperCase() === clean && l.status === "Active")
    ) || null
  );
}

async function createLease(payload) {
  const aptCode = String(payload.apartmentCode || "").trim().toUpperCase();
  const apt = await getApartmentByCodeOrId(aptCode);
  const { priceUsd, priceVnd } = parsePriceInput(
    payload.priceUsd || apt?.priceUsd || 800,
    payload.priceVnd || apt?.priceVnd
  );

  const code = String(
    payload.code || `HD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  ).toUpperCase();

  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsLater = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

  const lease = {
    _id: payload._id || `lease-${Date.now()}`,
    code,
    apartmentCode: apt ? apt.code : aptCode || "DN-APT-01",
    apartmentTitle:
      payload.apartmentTitle ||
      apt?.title?.vi ||
      apt?.title?.en ||
      `Căn hộ ${aptCode}`,
    building: payload.building || apt?.building || "KIN Estates Residence",
    address: payload.address || apt?.address || "Đà Nẵng",
    tenantName: payload.tenantName || "Khách thuê KIN Estates",
    tenantContact: payload.tenantContact || "",
    messenger: payload.messenger || "Telegram / Zalo",
    nationality: payload.nationality || "",
    priceUsd,
    priceVnd,
    depositMonths: Number(payload.depositMonths) || 1,
    paymentDay: Number(payload.paymentDay) || 5,
    startDate: payload.startDate || today,
    endDate: payload.endDate || sixMonthsLater,
    status: payload.status || "Active",
    hideApartmentOnWeb: Boolean(payload.hideApartmentOnWeb),
    notes: payload.notes || "",
    createdAt: payload.createdAt || new Date().toISOString()
  };

  if (isNativeMongoConnected) {
    const { _id, ...docData } = lease;
    await LeaseModel.findOneAndUpdate({ code: lease.code }, docData, { upsert: true, new: true });
  }

  store.leases = store.leases || [];
  const existIdx = store.leases.findIndex((l) => l.code.toUpperCase() === lease.code);
  if (existIdx >= 0) {
    store.leases[existIdx] = lease;
  } else {
    store.leases.unshift(lease);
  }

  // Automatically sync the linked apartment to Rented status + attach currentTenant
  if (apt && lease.status === "Active") {
    await updateApartment(apt.code, {
      status: "Rented",
      isVisible: lease.hideApartmentOnWeb ? false : apt.isVisible,
      hideWhenRented: Boolean(lease.hideApartmentOnWeb),
      currentTenant: {
        leaseCode: lease.code,
        tenantName: lease.tenantName,
        tenantContact: lease.tenantContact,
        startDate: lease.startDate,
        endDate: lease.endDate,
        priceUsd: lease.priceUsd
      }
    });
  }

  saveJsonStore();
  return lease;
}

async function updateLease(identifier, updates) {
  const target = await getLeaseByCodeOrId(identifier);
  if (!target) return null;

  const { _id: _ignoreId, ...safeUpdates } = updates || {};
  const rate = store.settings?.usdToVndRate || 25480;
  if (safeUpdates.priceUsd !== undefined && safeUpdates.priceVnd === undefined) {
    const parsed = parsePriceInput(safeUpdates.priceUsd, undefined);
    safeUpdates.priceUsd = parsed.priceUsd;
    safeUpdates.priceVnd = parsed.priceVnd;
  } else if (safeUpdates.priceVnd !== undefined && safeUpdates.priceUsd === undefined) {
    safeUpdates.priceVnd = Number(safeUpdates.priceVnd);
    safeUpdates.priceUsd = Math.round(safeUpdates.priceVnd / rate);
  }

  const merged = {
    ...target,
    ...safeUpdates,
    updatedAt: new Date().toISOString()
  };

  const idx = (store.leases || []).findIndex(
    (l) => l.code.toUpperCase() === target.code.toUpperCase() || String(l._id) === String(target._id)
  );
  if (idx >= 0) {
    store.leases[idx] = merged;
  }

  if (isNativeMongoConnected) {
    const { _id: _stripId, ...mongoPatch } = merged;
    await LeaseModel.findOneAndUpdate({ code: target.code }, { $set: mongoPatch });
  }

  // If lease ended, automatically set the apartment back to Available & Visible!
  if (safeUpdates.status === "Ended" && merged.apartmentCode) {
    await updateApartment(merged.apartmentCode, {
      status: "Available",
      isVisible: true,
      currentTenant: null
    });
  }

  saveJsonStore();
  return merged;
}

async function deleteLease(identifier) {
  const target = await getLeaseByCodeOrId(identifier);
  if (!target) return null;

  store.leases = (store.leases || []).filter(
    (l) => l.code.toUpperCase() !== target.code.toUpperCase() && String(l._id) !== String(target._id)
  );
  if (isNativeMongoConnected) {
    await LeaseModel.findOneAndDelete({ code: target.code });
  }
  if (target.apartmentCode && target.status === "Active") {
    await updateApartment(target.apartmentCode, {
      status: "Available",
      isVisible: true,
      currentTenant: null
    });
  }
  saveJsonStore();
  return target;
}

// Wizard session state for multi-step Telegram apartment creation
function getWizardSession(userKey = "default") {
  store.wizardSessions = store.wizardSessions || {};
  return Object.hasOwn(store.wizardSessions, userKey) ? store.wizardSessions[userKey] : null;
}

function setWizardSession(userKey = "default", sessionData) {
  store.wizardSessions = store.wizardSessions || {};
  if (!sessionData) {
    delete store.wizardSessions[userKey];
  } else {
    Object.defineProperty(store.wizardSessions, userKey, {
      value: sessionData, writable: true, enumerable: true, configurable: true
    });
  }
  saveJsonStore();
  return Object.hasOwn(store.wizardSessions, userKey) ? store.wizardSessions[userKey] : undefined;
}

function getTelegramCollection(name) {
  return isNativeMongoConnected ? mongoose.connection.db.collection(name) : null;
}

async function getTelegramSession(key = "default") {
  const sessions = getTelegramCollection("telegram_sessions");
  if (!sessions) return getWizardSession(key);

  const _id = String(key);
  const saved = await sessions.findOne({ _id });
  if (saved) return saved.value;

  const legacy = getWizardSession(_id);
  if (!legacy) return null;
  // Migrate once. A concurrent save or clear always takes precedence over the JSON copy.
  const migrated = await sessions.findOneAndUpdate(
    { _id },
    { $setOnInsert: { value: legacy } },
    { upsert: true, returnDocument: "after" }
  );
  return migrated.value;
}

async function setTelegramSession(key = "default", value) {
  const sessions = getTelegramCollection("telegram_sessions");
  if (!sessions) {
    const wizardSessions = { ...store.wizardSessions, [key]: value };
    if (value == null) delete wizardSessions[key];
    commitLocalStore({ wizardSessions });
    return value ?? null;
  }

  // A cleared value prevents a stale JSON copy from being migrated by another instance.
  await sessions.updateOne({ _id: String(key) }, { $set: { value: value ?? null } }, { upsert: true });
  return value ?? null;
}

function getBuildings() {
  return store.buildings || initialBuildings;
}

function getNeighborhoods() {
  return store.neighborhoods || neighborhoods;
}

const DEFAULT_ABOUT_CONTENT = {
  heroImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
  founderName: "Đội ngũ KIN Estates Đà Nẵng",
  founderQuote: {
    vi: "Tìm một căn hộ không chỉ là chọn bốn bức tường đẹp — mà là có một người bản địa đáng tin cậy đồng hành cùng bạn từ buổi xem nhà đầu tiên cho đến suốt thời gian an cư tại Đà Nẵng.",
    en: "Finding a home is about more than choosing a nice space — it's about having reliable local people by your side from the very first viewing to everyday life in Da Nang.",
    zh: "找房不仅是选择一处漂亮的空间，更是在岘港拥有值得信赖的本地伙伴，从第一次看房到日常安居全程相伴。",
    ru: "Поиск жилья — это больше, чем выбор красивой квартиры. Это надежные люди рядом с вами от первого просмотра до повседневных вопросов в Дананге.",
    ko: "집을 찾는 것은 단순히 예쁜 공간을 고르는 일이 아니라, 첫 투어부터 다낭에서의 일상까지 믿고 의지할 수 있는 현지 파트너와 함께하는 것입니다.",
    ja: "住まい探しは素敵な空間を選ぶだけではなく、最初の内覧からダナンでの日々の暮らしまで頼れる現地パートナーがそばにいることです。"
  },
  clientTourPhotos: [
    {
      id: "tour-default-1",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=82",
      caption: {
        vi: "Bàn giao căn hộ 2PN hướng sông Hàn cho khách hàng chuyên gia quốc tế",
        en: "Key handover for a 2BR Han Riverfront apartment with international remote professionals",
        zh: "为国际远程办公客户交接汉江景两居室公寓",
        ru: "Передача ключей от 2-комнатной квартиры с видом на реку Хан",
        ko: "한강 뷰 2베드룸 아파트 입주 키 전달 및 현장 점검",
        ja: "ハン川ビューの2ベッドルーム物件の鍵引き渡し"
      },
      tag: "Ven sông Hàn · Bàn giao nhà",
      date: "2026-11",
      createdAt: "2026-11-15T09:00:00.000Z"
    },
    {
      id: "tour-default-2",
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=82",
      caption: {
        vi: "Dẫn khách xem trực tiếp căn hộ ban công rộng khu biển Mỹ Khê — An Thượng",
        en: "In-person viewing tour at a spacious balcony residence near My Khe Beach & An Thuong",
        zh: "实地带客户看房：美溪海滩安上区宽敞阳台公寓",
        ru: "Личный просмотр просторной квартиры с балконом в районе Ан Тхыонг",
        ko: "미케 비치 안트엉 지역 넓은 발코니 레지던스 현장 투어",
        ja: "ミーケービーチ・アントゥオンエリアのバルコニー付き物件内覧"
      },
      tag: "An Thượng · Dẫn khách xem nhà",
      date: "2026-11",
      createdAt: "2026-11-18T09:00:00.000Z"
    }
  ],
  testimonials: [
    {
      id: "fb-default-1",
      clientName: "Alex & Sarah",
      subtitle: "The Panoma 2 · Hợp đồng 12 tháng",
      rating: 5,
      quote: {
        vi: "Đội ngũ KIN Estates cực kỳ tận tâm. Chúng tôi chỉ gửi nhu cầu qua Telegram, hôm sau đã đi xem 4 căn đúng ý, ký hợp đồng song ngữ rõ ràng và được hỗ trợ đăng ký tạm trú ngay trong ngày.",
        en: "The KIN Estates team made moving to Da Nang effortless. We messaged on Telegram, toured 4 spot-on apartments the very next day, signed a clear bilingual lease, and had our residency registration done the same afternoon.",
        zh: "KIN Estates 团队非常专业贴心。通过 Telegram 沟通需求后，第二天就看了4套完全符合要求的房子，双语合同清晰透明，当天就帮我们办好了暂住登记。",
        ru: "Команда KIN Estates сделала переезд в Дананг максимально простым. На следующий день посмотрели 4 отличные квартиры, подписали понятный двуязычный договор и сразу оформили регистрацию.",
        ko: "KIN Estates 팀 덕분에 다낭 정착이 정말 수월했습니다. 텔레그램으로 문의한 다음 날 딱 맞는 집 4곳을 보고, 투명한 이중언어 계약과 거주 등록까지 하루 만에 마쳤습니다.",
        ja: "KIN Estatesのスタッフはとても親切でした。Telegramで希望を伝えた翌日に理想通りの4件を内覧でき、明確なバイリンガル契約と滞在登録まで当日中に完了しました。"
      },
      image: "",
      createdAt: "2026-11-10T09:00:00.000Z"
    },
    {
      id: "fb-default-2",
      clientName: "Min-Jun Park",
      subtitle: "The Filmore Đà Nẵng · Hợp đồng 6 tháng",
      rating: 5,
      quote: {
        vi: "Ảnh trên web sao ngoài đời đúng y như vậy, không bị báo giá ảo hay dẫn đi xem căn không liên quan. Đặc biệt các bạn đo sẵn tốc độ Wi-Fi và kiểm tra ánh sáng bàn làm việc rất kỹ.",
        en: "Every photo matched reality — zero fake listings or wasted viewings. They even checked the fiber Wi-Fi speed and desk lighting beforehand since I work remotely full-time.",
        zh: "网站上的照片与实地完全一致，没有任何虚假报价或浪费时间的看房。他们还提前测好了光纤网速和书桌采光，非常适合远程办公。",
        ru: "Все фото на 100% соответствуют реальности, никаких фейковых цен. Ребята даже заранее проверили скорость интернета и свет у рабочего стола.",
        ko: "웹사이트 사진과 실제 집이 100% 똑같아서 믿음이 갔습니다. 원격근무 때문에 와이파이 속도와 책상 채광을 미리 확인해 주신 점이 특히 감동이었어요.",
        ja: "写真と実際の部屋が100%一致していて安心できました。リモートワーク用にWi-Fi速度やデスクの明るさまで事前に確認してくれました。"
      },
      image: "",
      createdAt: "2026-11-14T09:00:00.000Z"
    }
  ],
  updatedAt: "2026-11-23T00:00:00.000Z"
};

function normalizeAboutContent(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    heroImage: typeof src.heroImage === "string" && src.heroImage.trim() ? src.heroImage.trim() : DEFAULT_ABOUT_CONTENT.heroImage,
    founderName: typeof src.founderName === "string" && src.founderName.trim() ? src.founderName.trim() : DEFAULT_ABOUT_CONTENT.founderName,
    founderQuote: src.founderQuote && typeof src.founderQuote === "object" ? src.founderQuote : DEFAULT_ABOUT_CONTENT.founderQuote,
    clientTourPhotos: Array.isArray(src.clientTourPhotos) ? src.clientTourPhotos : DEFAULT_ABOUT_CONTENT.clientTourPhotos,
    testimonials: Array.isArray(src.testimonials) ? src.testimonials : DEFAULT_ABOUT_CONTENT.testimonials,
    updatedAt: src.updatedAt || new Date().toISOString()
  };
}

async function getAboutContent() {
  const col = getTelegramCollection("site_content");
  if (col) {
    const doc = await col.findOne({ _id: "about" });
    if (doc) return normalizeAboutContent(doc);
  }
  if (store.siteContent?.about) {
    return normalizeAboutContent(store.siteContent.about);
  }
  return normalizeAboutContent(DEFAULT_ABOUT_CONTENT);
}

async function saveAboutContent(nextContent) {
  const normalized = normalizeAboutContent({ ...nextContent, updatedAt: new Date().toISOString() });
  const col = getTelegramCollection("site_content");
  if (col) {
    await col.updateOne({ _id: "about" }, { $set: normalized }, { upsert: true });
  }
  store.siteContent = { ...(store.siteContent || {}), about: normalized };
  saveJsonStore();
  return normalized;
}

async function hasPublicSiteMedia(urls) {
  const targets = new Set((urls || []).filter(Boolean));
  if (!targets.size) return false;
  const about = await getAboutContent();
  if (targets.has(about.heroImage)) return true;
  if ((about.clientTourPhotos || []).some((p) => targets.has(p.image))) return true;
  if ((about.testimonials || []).some((t) => targets.has(t.image))) return true;
  return false;
}

async function removeSiteMediaUrl(url) {
  if (!url) return;
  const about = await getAboutContent();
  let changed = false;
  if (about.heroImage === url) {
    about.heroImage = DEFAULT_ABOUT_CONTENT.heroImage;
    changed = true;
  }
  const nextPhotos = (about.clientTourPhotos || []).filter((p) => p.image !== url);
  if (nextPhotos.length !== (about.clientTourPhotos || []).length) {
    about.clientTourPhotos = nextPhotos;
    changed = true;
  }
  const nextReviews = (about.testimonials || []).map((t) => {
    if (t.image === url) {
      changed = true;
      return { ...t, image: "" };
    }
    return t;
  });
  if (changed) {
    about.testimonials = nextReviews;
    await saveAboutContent(about);
  }
}

function getSettings() {
  return {
    ...store.settings,
    ...(process.env.TELEGRAM_BOT_TOKEN ? { telegramBotToken: process.env.TELEGRAM_BOT_TOKEN } : {}),
    ...(process.env.TELEGRAM_ADMIN_CHAT_ID ? { telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID } : {})
  };
}

function updateSettings(partial) {
  store.settings = {
    ...store.settings,
    ...partial
  };
  saveJsonStore();
  return store.settings;
}

function appendBotHistory(entry) {
  store.botMessages = store.botMessages || [];
  store.botMessages.push({
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...entry
  });
  if (store.botMessages.length > 100) {
    store.botMessages = store.botMessages.slice(-100);
  }
  saveJsonStore();
}

function getBotHistory() {
  return store.botMessages || [];
}

function logSyncEvent(event) {
  store.syncLogs = store.syncLogs || [];
  store.syncLogs.unshift({
    id: `sync-${Date.now()}`,
    timestamp: new Date().toISOString(),
    ...event
  });
  store.syncLogs = store.syncLogs.slice(0, 40);
  saveJsonStore();
}

function getSyncLogs() {
  return store.syncLogs || [];
}

function getDbStatus() {
  const allApts = store.apartments || [];
  const availableCount = allApts.filter((a) => a.status === "Available" && a.isVisible !== false).length;
  const rentedCount = allApts.filter((a) => a.status === "Rented").length;
  const hiddenCount = allApts.filter((a) => a.isVisible === false || a.status === "Hidden").length;
  const allInq = store.inquiries || [];
  const newInqCount = allInq.filter((i) => i.status === "New").length;
  const activeLeasesCount = (store.leases || []).filter((l) => l.status === "Active").length;

  return {
    isNativeMongoConnected,
    mongoConnectionMode,
    storePath: STORE_PATH,
    totalApartments: allApts.length,
    availableCount,
    rentedCount,
    hiddenCount,
    totalBuildings: (store.buildings || []).length,
    totalInquiries: allInq.length,
    newInquiriesCount: newInqCount,
    activeLeasesCount
  };
}

module.exports = {
  initDatabase,
  ensureMongoConnection,
  persistApartmentLanguageCache,
  getApartments,
  isPublicApartment,
  hasPublicApartmentPhoto,
  getApartmentByCodeOrId,
  createApartment,
  updateApartment,
  deleteApartment,
  getInquiries,
  getInquiryByCodeOrId,
  createInquiry,
  createReservationInquiry,
  submitInquiry,
  updateInquiry,
  deleteInquiry,
  transitionReservation,
  normalizeViewingTime,
  getLeases,
  getLeaseByCodeOrId,
  createLease,
  updateLease,
  deleteLease,
  getWizardSession,
  setWizardSession,
  getTelegramCollection,
  getTelegramSession,
  setTelegramSession,
  getBuildings,
  getNeighborhoods,
  getAboutContent,
  saveAboutContent,
  hasPublicSiteMedia,
  removeSiteMediaUrl,
  getSettings,
  updateSettings,
  appendBotHistory,
  getBotHistory,
  logSyncEvent,
  getSyncLogs,
  getDbStatus,
  parsePriceInput,
  normalizeAreaName
};
