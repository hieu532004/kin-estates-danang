const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { initialApartments, initialBuildings, neighborhoods } = require("../data/seedData");

const STORE_PATH = path.join(__dirname, "..", "data", "mongodb_store.json");

// Mongoose Schemas for Native MongoDB / MongoDB Atlas
const ApartmentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    title: {
      vi: String,
      en: String,
      ru: String
    },
    building: String,
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
    electricityRate: { type: String, default: "State Rate (EVN)" },
    naturalLightScore: { type: Number, default: 9.2 },
    remoteWorkSetup: { type: String, default: "Dedicated Work Desk + High-Speed Fiber" },
    petPolicy: { type: String, default: "Ask Curator" },
    status: { type: String, default: "Available" }, // Available | Reserved | Rented
    featured: { type: Boolean, default: false },
    coordinates: {
      lat: { type: Number, default: 16.0583 },
      lng: { type: Number, default: 108.2412 }
    },
    architecturalNotes: {
      vi: String,
      en: String,
      ru: String
    },
    tags: [String],
    images: [String],
    source: { type: String, default: "web" } // web | telegram | google_sheets
  },
  { timestamps: true }
);

const InquirySchema = new mongoose.Schema(
  {
    type: { type: String, default: "shortlist" }, // shortlist | viewing | owner_listing
    clientName: String,
    messenger: String, // Telegram | WhatsApp | Zalo
    contactHandle: String,
    apartmentCode: String,
    apartmentTitle: String,
    budgetUsd: String,
    bedrooms: String,
    moveInDate: String,
    leaseDuration: String,
    notes: String,
    status: { type: String, default: "New" }
  },
  { timestamps: true }
);

const ApartmentModel = mongoose.models.Apartment || mongoose.model("Apartment", ApartmentSchema);
const InquiryModel = mongoose.models.Inquiry || mongoose.model("Inquiry", InquirySchema);

let isNativeMongoConnected = false;
let mongoConnectionMode = "Hybrid Persistent Mongo-JSON Store (Ready)";
let store = {
  apartments: [],
  buildings: [],
  neighborhoods: [],
  inquiries: [],
  syncLogs: [],
  botMessages: [],
  settings: {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
    telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || "",
    googleSheetsWebhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || "",
    googleSheetsCsvUrl: process.env.GOOGLE_SHEETS_CSV_URL || "",
    usdToVndRate: 25480
  }
};

function loadJsonStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      store = {
        ...store,
        ...parsed,
        settings: { ...store.settings, ...(parsed.settings || {}) }
      };
    } else {
      store.apartments = JSON.parse(JSON.stringify(initialApartments));
      store.buildings = JSON.parse(JSON.stringify(initialBuildings));
      store.neighborhoods = JSON.parse(JSON.stringify(neighborhoods));
      store.inquiries = [
        {
          _id: "inq-demo-01",
          type: "viewing",
          clientName: "ukashenko.alex (Digital Nomad)",
          messenger: "Telegram",
          contactHandle: "@alex_nomad_dn",
          apartmentCode: "DN-FIL-2401",
          apartmentTitle: "The Filmore — Loft Kiến Trúc View Sông Hàn",
          budgetUsd: "$1,200 - $1,500",
          bedrooms: "2BR",
          moveInDate: "2026-12-01",
          leaseDuration: "6 months",
          notes: "Looking for high floor river view with dedicated dual-monitor desk.",
          status: "New",
          createdAt: new Date().toISOString()
        }
      ];
      saveJsonStore();
    }
  } catch (err) {
    console.error("Error loading JSON store:", err.message);
    store.apartments = JSON.parse(JSON.stringify(initialApartments));
    store.buildings = JSON.parse(JSON.stringify(initialBuildings));
    store.neighborhoods = JSON.parse(JSON.stringify(neighborhoods));
  }
}

function saveJsonStore() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving JSON store:", err.message);
  }
}

async function initDatabase() {
  loadJsonStore();
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kin_atelier_danang";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 1800 });
    isNativeMongoConnected = true;
    mongoConnectionMode = `Native MongoDB Connected (${uri})`;
    const count = await ApartmentModel.countDocuments();
    if (count === 0) {
      const seedDocs = initialApartments.map(({ _id, ...rest }) => rest);
      await ApartmentModel.insertMany(seedDocs);
    }
    console.log("✓ Connected to Native MongoDB:", uri);
  } catch (err) {
    isNativeMongoConnected = false;
    mongoConnectionMode = "MongoDB Document Persistence Engine (Local JSON-Mongo Hybrid)";
    console.log("ℹ Local mongod daemon not active on 27017 — running with Persistent Mongo-JSON Document Store (data/mongodb_store.json)");
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

  if (filters.area && filters.area !== "all") {
    list = list.filter((a) => a.areaName.toLowerCase() === filters.area.toLowerCase());
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
    list = list.filter((a) => a.status.toLowerCase() === filters.status.toLowerCase());
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
      const code = (a.code || "").toLowerCase();
      const area = (a.areaName || "").toLowerCase();
      return (
        titleVi.includes(q) ||
        titleEn.includes(q) ||
        bldg.includes(q) ||
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

function normalizeApartmentPayload(payload) {
  const rate = store.settings?.usdToVndRate || 25480;
  const priceUsd = Number(payload.priceUsd) || 750;
  const priceVnd = Number(payload.priceVnd) || Math.round((priceUsd * rate) / 100000) * 100000;
  const areaName = payload.areaName || "An Thuong";
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
      ? payload.title
      : payload.title?.vi || payload.title?.en || "Căn Hộ Kiến Trúc Đà Nẵng";

  const titleObj =
    typeof payload.title === "object" && payload.title !== null
      ? {
          vi: payload.title.vi || titleText,
          en: payload.title.en || titleText,
          ru: payload.title.ru || payload.title.en || titleText
        }
      : {
          vi: titleText,
          en: payload.titleEn || titleText,
          ru: payload.titleRu || payload.titleEn || titleText
        };

  const notesText =
    typeof payload.architecturalNotes === "string"
      ? payload.architecturalNotes
      : payload.architecturalNotes?.vi ||
        payload.description ||
        "Không gian sống thiết kế chuẩn kiến trúc đương đại, tràn ngập ánh sáng tự nhiên và thông gió biển Đà Nẵng.";

  const notesObj =
    typeof payload.architecturalNotes === "object" && payload.architecturalNotes !== null
      ? {
          vi: payload.architecturalNotes.vi || notesText,
          en: payload.architecturalNotes.en || notesText,
          ru: payload.architecturalNotes.ru || notesText
        }
      : {
          vi: notesText,
          en: payload.descriptionEn || notesText,
          ru: payload.descriptionRu || notesText
        };

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const code = (payload.code || `DN-KIN-${randomNum}`).toUpperCase();

  let images = payload.images;
  if (typeof images === "string") {
    images = images
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(images) || images.length === 0) {
    images = [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80"
    ];
  }

  let tags = payload.tags;
  if (typeof tags === "string") {
    tags = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    tags = ["Natural Light", "Remote-Work Desk", "State-Rate Electricity"];
  }

  return {
    _id: payload._id || `apt-${Date.now()}`,
    code,
    title: titleObj,
    building: payload.building || "KIN Estates Residence",
    areaName,
    district: payload.district || "Sơn Trà / Ngũ Hành Sơn",
    priceUsd,
    priceVnd,
    bedrooms: Number(payload.bedrooms) || 1,
    bathrooms: Number(payload.bathrooms) || Number(payload.bedrooms) || 1,
    sizeM2: Number(payload.sizeM2) || 65,
    floor: Number(payload.floor) || 12,
    orientation: payload.orientation || "East / Morning Sun",
    minLeaseMonths: Number(payload.minLeaseMonths) || 3,
    depositMonths: Number(payload.depositMonths) || 1,
    electricityRate: payload.electricityRate || "State Rate (EVN)",
    naturalLightScore: Number(payload.naturalLightScore) || 9.5,
    remoteWorkSetup: payload.remoteWorkSetup || "Dedicated Study Desk + High-Speed Fiber",
    petPolicy: payload.petPolicy || "Pet-Friendly on request",
    status: payload.status || "Available",
    featured: Boolean(payload.featured),
    coordinates: payload.coordinates || {
      lat: Number((baseCoord.lat + jitter()).toFixed(4)),
      lng: Number((baseCoord.lng + jitter()).toFixed(4))
    },
    architecturalNotes: notesObj,
    tags,
    images,
    source: payload.source || "web",
    createdAt: payload.createdAt || new Date().toISOString()
  };
}

async function createApartment(payload) {
  const normalized = normalizeApartmentPayload(payload);
  if (isNativeMongoConnected) {
    const { _id, ...docData } = normalized;
    const created = await ApartmentModel.create(docData);
    normalized._id = String(created._id);
  }
  // Always keep JSON store synced as backup/cache
  const existingIdx = store.apartments.findIndex(
    (a) => a.code.toUpperCase() === normalized.code.toUpperCase()
  );
  if (existingIdx >= 0) {
    store.apartments[existingIdx] = normalized;
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
  if (updates.priceUsd !== undefined && updates.priceVnd === undefined) {
    updates.priceUsd = Number(updates.priceUsd);
    updates.priceVnd = Math.round((updates.priceUsd * rate) / 100000) * 100000;
  }

  if (typeof updates.title === "string") {
    updates.title = {
      vi: updates.title,
      en: updates.titleEn || target.title?.en || updates.title,
      ru: target.title?.ru || updates.title
    };
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

async function getInquiries() {
  if (isNativeMongoConnected) {
    const docs = await InquiryModel.find().sort({ createdAt: -1 }).lean();
    return docs.map((d) => ({ ...d, _id: String(d._id) }));
  }
  return store.inquiries || [];
}

async function createInquiry(payload) {
  const inquiry = {
    _id: `inq-${Date.now()}`,
    type: payload.type || "shortlist",
    clientName: payload.clientName || "Anonymous Guest",
    messenger: payload.messenger || "Telegram",
    contactHandle: payload.contactHandle || "",
    apartmentCode: payload.apartmentCode || "CURATED-SHORTLIST",
    apartmentTitle: payload.apartmentTitle || "Personal Architectural Shortlist",
    budgetUsd: payload.budgetUsd || "$800 - $1,500",
    bedrooms: payload.bedrooms || "1-2 BR",
    moveInDate: payload.moveInDate || "Flexible",
    leaseDuration: payload.leaseDuration || "6-12 months",
    notes: payload.notes || "",
    status: "New",
    createdAt: new Date().toISOString()
  };

  if (isNativeMongoConnected) {
    const { _id, ...docData } = inquiry;
    const saved = await InquiryModel.create(docData);
    inquiry._id = String(saved._id);
  }
  store.inquiries.unshift(inquiry);
  saveJsonStore();
  return inquiry;
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
  if (store.botMessages.length > 80) {
    store.botMessages = store.botMessages.slice(-80);
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
  store.syncLogs = store.syncLogs.slice(0, 30);
  saveJsonStore();
}

function getSyncLogs() {
  return store.syncLogs || [];
}

function getDbStatus() {
  return {
    isNativeMongoConnected,
    mongoConnectionMode,
    storePath: STORE_PATH,
    totalApartments: (store.apartments || []).length,
    totalBuildings: (store.buildings || []).length,
    totalInquiries: (store.inquiries || []).length
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
  createInquiry,
  getBuildings,
  getNeighborhoods,
  getSettings,
  updateSettings,
  appendBotHistory,
  getBotHistory,
  logSyncEvent,
  getSyncLogs,
  getDbStatus
};
