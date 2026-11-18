const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { initialApartments, initialBuildings, neighborhoods } = require("../data/seedData");

const STORE_PATH = path.join(__dirname, "..", "data", "mongodb_store.json");

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
    coordinates: {
      lat: { type: Number, default: 16.0583 },
      lng: { type: Number, default: 108.2412 }
    },
    architecturalNotes: {
      vi: String,
      en: String,
      zh: String,
      ru: String,
      ko: String,
      ja: String
    },
    tags: [String],
    images: [String],
    source: { type: String, default: "web" } // web | telegram | excel | google_sheets | owner_submission
  },
  { timestamps: true }
);

// 2. Mongoose Schema: Inquiries / Customer Leads / Viewing Schedule / Landlord Submissions
const InquirySchema = new mongoose.Schema(
  {
    code: { type: String, default: () => `KH-${Math.floor(1000 + Math.random() * 9000)}` },
    type: { type: String, default: "viewing" }, // viewing | shortlist | direct_contact | owner_listing
    clientName: String,
    messenger: String, // Telegram | WhatsApp | Zalo | Phone
    contactHandle: String,
    apartmentCode: String,
    apartmentTitle: String,
    budgetUsd: String,
    bedrooms: String,
    viewingTime: String,
    moveInDate: String,
    leaseDuration: String,
    notes: String,
    ownerPropertyData: mongoose.Schema.Types.Mixed, // When type === "owner_listing"
    status: { type: String, default: "New" }, // New | Contacted | Viewing_Scheduled | Rented_Closed | Archived
    adminNotes: { type: String, default: "" }
  },
  { timestamps: true }
);

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
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "",
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
    landlordPhone: apt.landlordPhone || "0349456644"
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

function saveJsonStore() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    // On read-only serverless filesystems (e.g. Vercel lambda), keep in-memory store updated without crashing
    console.warn("Note: In-memory store updated (filesystem write skipped):", err.message);
  }
}

async function initDatabase() {
  loadJsonStore();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    isNativeMongoConnected = false;
    mongoConnectionMode = "MongoDB Document Persistence Engine (Local JSON-Mongo Hybrid)";
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2200 });
    isNativeMongoConnected = true;
    mongoConnectionMode = `Native MongoDB Connected`;
    const count = await ApartmentModel.countDocuments();
    if (count === 0) {
      const seedDocs = store.apartments.map(({ _id, ...rest }) => rest);
      await ApartmentModel.insertMany(seedDocs);
    }
    const leaseCount = await LeaseModel.countDocuments();
    if (leaseCount === 0 && store.leases.length > 0) {
      await LeaseModel.insertMany(store.leases.map(({ _id, ...rest }) => rest));
    }
    console.log("✓ Connected to Native MongoDB");
  } catch (err) {
    isNativeMongoConnected = false;
    mongoConnectionMode = "MongoDB Document Persistence Engine (Local JSON-Mongo Hybrid)";
    console.log("ℹ Running with Persistent Mongo-JSON Document Store");
  }
}

async function getApartments(filters = {}) {
  let list = [];
  if (isNativeMongoConnected) {
    const docs = await ApartmentModel.find().sort({ featured: -1, createdAt: -1 }).lean();
    list = docs.map((d) => ({ ...d, _id: String(d._id) }));
  } else {
    list = [...store.apartments];
  }

  // If public catalog request (not includeHidden), hide apartments where isVisible === false or status === "Hidden"
  const includeHidden =
    filters.includeHidden === "true" ||
    filters.includeHidden === true ||
    filters.admin === "true" ||
    filters.admin === true;

  if (!includeHidden) {
    list = list.filter((a) => {
      if (a.isVisible === false || a.status === "Hidden") return false;
      if (a.status === "Rented" && (a.hideWhenRented || store.settings?.hideRentedByDefault)) {
        return false;
      }
      return true;
    });
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

async function getApartmentByCodeOrId(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toUpperCase();
  if (isNativeMongoConnected) {
    let doc = await ApartmentModel.findOne({ code: new RegExp(`^${clean}$`, "i") }).lean();
    if (!doc && mongoose.Types.ObjectId.isValid(identifier)) {
      doc = await ApartmentModel.findById(identifier).lean();
    }
    if (doc) return { ...doc, _id: String(doc._id) };
  }
  return (
    store.apartments.find(
      (a) =>
        String(a._id).toUpperCase() === clean ||
        String(a.code).toUpperCase() === clean
    ) || null
  );
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

function normalizeApartmentPayload(payload) {
  const { priceUsd, priceVnd } = parsePriceInput(payload.priceUsd || payload.price, payload.priceVnd);
  const areaName = normalizeAreaName(payload.areaName || payload.area || "An Thuong");
  const areaCoords = {
    "An Thuong": { lat: 16.0498, lng: 108.2459 },
    "Son Tra": { lat: 16.0609, lng: 108.2345 },
    "Han Riverfront": { lat: 16.0625, lng: 108.2255 },
    "My Khe Beachfront": { lat: 16.0662, lng: 108.2462 }
  };
  const baseCoord = areaCoords[areaName] || { lat: 16.0583, lng: 108.2385 };
  const jitter = () => (Math.random() - 0.5) * 0.004;

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
        "Không gian sống thiết kế chuẩn kiến trúc đương đại, tràn ngập ánh sáng tự nhiên, đầy đủ nội thất cao cấp và bàn làm việc tốc độ cao.";

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
  if (!Array.isArray(images) || images.length === 0) {
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
    tags = ["Natural Light", "Remote-Work Desk", "State-Rate Electricity"];
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
    district: payload.district || "Sơn Trà / Ngũ Hành Sơn",
    priceUsd,
    priceVnd,
    bedrooms: Number(payload.bedrooms) || 1,
    bathrooms: Number(payload.bathrooms) || Number(payload.bedrooms) || 1,
    sizeM2: Number(payload.sizeM2) || 65,
    floor: Number(payload.floor) || 12,
    orientation: payload.orientation || "Đông Nam / Đón gió biển",
    minLeaseMonths: Number(payload.minLeaseMonths) || 3,
    depositMonths: Number(payload.depositMonths) || 1,
    electricityRate: payload.electricityRate || "Giá nhà nước (EVN ~2,800đ/kWh)",
    waterRate: payload.waterRate || "Giá nhà nước",
    wifiIncluded: payload.wifiIncluded !== undefined ? Boolean(payload.wifiIncluded) : true,
    naturalLightScore: Number(payload.naturalLightScore) || 9.5,
    remoteWorkSetup: payload.remoteWorkSetup || "Bàn làm việc riêng + Cáp quang 300Mbps",
    petPolicy: payload.petPolicy || "Thương lượng (Cho phép thú cưng nhỏ)",
    status,
    isVisible,
    hideWhenRented: Boolean(payload.hideWhenRented),
    featured: payload.featured !== undefined ? Boolean(payload.featured) : true,
    landlordName: payload.landlordName || "",
    landlordPhone: payload.landlordPhone || "",
    adminNote: payload.adminNote || "",
    currentTenant: payload.currentTenant || null,
    coordinates: payload.coordinates || {
      lat: Number((baseCoord.lat + jitter()).toFixed(4)),
      lng: Number((baseCoord.lng + jitter()).toFixed(4))
    },
    architecturalNotes: notesObj,
    tags,
    images,
    source: payload.source || "web",
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function createApartment(payload) {
  const normalized = normalizeApartmentPayload(payload);
  if (isNativeMongoConnected) {
    const { _id, ...docData } = normalized;
    const created = await ApartmentModel.findOneAndUpdate(
      { code: normalized.code },
      docData,
      { upsert: true, new: true }
    );
    normalized._id = String(created._id);
  }
  const existingIdx = store.apartments.findIndex(
    (a) => a.code.toUpperCase() === normalized.code.toUpperCase()
  );
  if (existingIdx >= 0) {
    store.apartments[existingIdx] = { ...store.apartments[existingIdx], ...normalized };
  } else {
    store.apartments.unshift(normalized);
  }
  saveJsonStore();
  return normalized;
}

async function updateApartment(identifier, updates) {
  const target = await getApartmentByCodeOrId(identifier);
  if (!target) return null;

  const rate = store.settings?.usdToVndRate || 25480;
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
      ...(target.title || {}),
      vi: updates.title,
      en: updates.titleEn || target.title?.en || updates.title,
      zh: target.title?.zh || updates.title,
      ru: target.title?.ru || updates.title,
      ko: target.title?.ko || updates.title,
      ja: target.title?.ja || updates.title
    };
  }

  if (typeof updates.architecturalNotes === "string") {
    updates.architecturalNotes = {
      ...(target.architecturalNotes || {}),
      vi: updates.architecturalNotes,
      en: updates.descriptionEn || target.architecturalNotes?.en || updates.architecturalNotes,
      zh: target.architecturalNotes?.zh || updates.architecturalNotes,
      ru: target.architecturalNotes?.ru || updates.architecturalNotes,
      ko: target.architecturalNotes?.ko || updates.architecturalNotes,
      ja: target.architecturalNotes?.ja || updates.architecturalNotes
    };
  }

  if (typeof updates.images === "string") {
    updates.images = updates.images
      .split(/[\n,|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

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

  const merged = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (isNativeMongoConnected) {
    await ApartmentModel.findOneAndUpdate({ code: target.code }, merged, { new: true });
  }

  const idx = store.apartments.findIndex(
    (a) => a.code.toUpperCase() === target.code.toUpperCase() || String(a._id) === String(target._id)
  );
  if (idx >= 0) {
    store.apartments[idx] = merged;
    saveJsonStore();
  }
  return merged;
}

async function deleteApartment(identifier) {
  const target = await getApartmentByCodeOrId(identifier);
  if (!target) return null;

  if (isNativeMongoConnected) {
    await ApartmentModel.findOneAndDelete({ code: target.code });
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
async function getInquiries(filters = {}) {
  let list = [];
  if (isNativeMongoConnected) {
    const docs = await InquiryModel.find().sort({ createdAt: -1 }).lean();
    list = docs.map((d) => ({ ...d, _id: String(d._id) }));
  } else {
    list = [...(store.inquiries || [])];
  }
  if (filters.type && filters.type !== "all") {
    list = list.filter((i) => i.type === filters.type);
  }
  if (filters.status && filters.status !== "all") {
    list = list.filter((i) => i.status === filters.status);
  }
  return list;
}

async function getInquiryByCodeOrId(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toUpperCase();
  return (
    (store.inquiries || []).find(
      (i) =>
        String(i._id).toUpperCase() === clean ||
        String(i.code || "").toUpperCase() === clean
    ) || null
  );
}

async function createInquiry(payload) {
  const randomCode = `KH-${Math.floor(1000 + Math.random() * 9000)}`;
  const inquiry = {
    _id: payload._id || `inq-${Date.now()}`,
    code: payload.code || randomCode,
    type: payload.type || "viewing", // viewing | shortlist | direct_contact | owner_listing
    clientName: payload.clientName || payload.contactHandle || "Khách hàng KIN Estates",
    messenger: payload.messenger || "Telegram / Zalo",
    contactHandle: payload.contactHandle || "",
    apartmentCode: payload.apartmentCode || "CURATED-SHORTLIST",
    apartmentTitle: payload.apartmentTitle || "Yêu cầu tư vấn căn hộ",
    budgetUsd: payload.budgetUsd || "$800 - $1,500",
    bedrooms: payload.bedrooms || "1-2 PN",
    viewingTime: payload.viewingTime || payload.moveInDate || "Sớm nhất",
    moveInDate: payload.moveInDate || "Linh hoạt",
    leaseDuration: payload.leaseDuration || "6-12 tháng",
    notes: payload.notes || "",
    ownerPropertyData: payload.ownerPropertyData || null,
    status: payload.status || "New",
    adminNotes: payload.adminNotes || "",
    createdAt: payload.createdAt || new Date().toISOString()
  };

  if (isNativeMongoConnected) {
    const { _id, ...docData } = inquiry;
    const saved = await InquiryModel.create(docData);
    inquiry._id = String(saved._id);
  }
  store.inquiries = store.inquiries || [];
  store.inquiries.unshift(inquiry);
  saveJsonStore();
  return inquiry;
}

async function updateInquiry(identifier, updates) {
  const clean = String(identifier || "").trim().toUpperCase();
  const idx = (store.inquiries || []).findIndex(
    (i) =>
      String(i._id).toUpperCase() === clean ||
      String(i.code || "").toUpperCase() === clean
  );
  if (idx < 0) return null;

  const updated = {
    ...store.inquiries[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  store.inquiries[idx] = updated;

  if (isNativeMongoConnected) {
    await InquiryModel.findOneAndUpdate({ code: updated.code }, updated);
  }
  saveJsonStore();
  return updated;
}

async function deleteInquiry(identifier) {
  const clean = String(identifier || "").trim().toUpperCase();
  const target = await getInquiryByCodeOrId(clean);
  if (!target) return null;
  store.inquiries = (store.inquiries || []).filter(
    (i) =>
      String(i._id).toUpperCase() !== clean &&
      String(i.code || "").toUpperCase() !== clean
  );
  if (isNativeMongoConnected) {
    await InquiryModel.findOneAndDelete({ code: target.code });
  }
  saveJsonStore();
  return target;
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
  const clean = String(identifier).trim().toUpperCase();
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

  const merged = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  const idx = (store.leases || []).findIndex(
    (l) => l.code.toUpperCase() === target.code.toUpperCase() || String(l._id) === String(target._id)
  );
  if (idx >= 0) {
    store.leases[idx] = merged;
  }

  if (isNativeMongoConnected) {
    await LeaseModel.findOneAndUpdate({ code: target.code }, merged);
  }

  // If lease ended, automatically set the apartment back to Available & Visible!
  if (updates.status === "Ended" && merged.apartmentCode) {
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
  return store.wizardSessions[userKey] || null;
}

function setWizardSession(userKey = "default", sessionData) {
  store.wizardSessions = store.wizardSessions || {};
  if (!sessionData) {
    delete store.wizardSessions[userKey];
  } else {
    store.wizardSessions[userKey] = sessionData;
  }
  saveJsonStore();
  return store.wizardSessions[userKey];
}

function getBuildings() {
  return store.buildings || initialBuildings;
}

function getNeighborhoods() {
  return store.neighborhoods || neighborhoods;
}

function getSettings() {
  return store.settings;
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
  getApartments,
  getApartmentByCodeOrId,
  createApartment,
  updateApartment,
  deleteApartment,
  getInquiries,
  getInquiryByCodeOrId,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  getLeases,
  getLeaseByCodeOrId,
  createLease,
  updateLease,
  deleteLease,
  getWizardSession,
  setWizardSession,
  getBuildings,
  getNeighborhoods,
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
