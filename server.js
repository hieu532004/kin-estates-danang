require("dotenv").config();
const fs = require("node:fs");
const path = require("path");
const { createHmac, timingSafeEqual } = require("node:crypto");
const express = require("express");
const cors = require("cors");
const db = require("./src/db/database");
const telegramService = require("./src/services/telegramService");
const {
  createPublicInquiry, isAnonymousContactClick, getApartmentContactSummary
} = require("./src/services/apartmentCrmService");
const {
  storeTelegramPhoto,
  getStoredTelegramPhoto,
  storeUploadedImageBuffer,
  listStoredTelegramPhotos,
  deleteStoredTelegramPhoto,
  MEDIA_ID,
  FILE_ID
} = require("./src/services/telegramMediaService");
const sheetsService = require("./src/services/googleSheetsService");
const translationService = require("./src/services/translationService");
const autoDeployService = require("./src/services/autoDeployService");
const seoService = require("./src/services/seoService");
const indexNowService = require("./src/services/indexNowService");
const { resolveGoogleMapsInput, isMapUrlString } = require("./src/services/apartmentLocation");

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET_FORMAT = /^[A-Za-z0-9_-]{1,256}$/;
const BOT_TOKEN_FORMAT = /^\d{1,20}:[A-Za-z0-9_-]{1,128}$/;
const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;
const LOCAL_ADDRESS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function safeMatch(provided, expected) {
  if (!expected || typeof provided !== "string") return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function isLocalAdmin(req) {
  const host = req.get("host");
  if (usesTelegramWebhook() || !LOCAL_ADDRESS.has(req.socket.remoteAddress) || !LOCAL_HOST.test(host) ||
      req.get("via") || req.get("forwarded") ||
      Object.keys(req.headers).some((header) => header.startsWith("x-forwarded-")) ||
      req.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.get("origin");
  return !origin || origin === `${req.protocol}://${host}`;
}

function studioSigningSecret() {
  return (
    process.env.KIN_STUDIO_SECRET ||
    process.env.KIN_ADMIN_API_TOKEN ||
    process.env.TELEGRAM_WEBHOOK_SECRET ||
    configuredTelegramToken() ||
    "kin-estates-studio-2026-secret"
  );
}

function configuredStudioPasscode() {
  return String(
    process.env.KIN_ADMIN_PASSCODE ||
    process.env.KIN_ADMIN_API_TOKEN ||
    "kin2026"
  ).trim();
}

function createStudioSessionToken(subject = "admin") {
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = Buffer.from(JSON.stringify({ sub: subject, exp })).toString("base64url");
  const sig = createHmac("sha256", studioSigningSecret()).update(payload).digest("base64url");
  return `ks1.${payload}.${sig}`;
}

function verifyStudioSessionToken(rawToken) {
  if (typeof rawToken !== "string" || !rawToken.startsWith("ks1.")) return false;
  const parts = rawToken.split(".");
  if (parts.length !== 3) return false;
  const [, payload, sig] = parts;
  const expectedSig = createHmac("sha256", studioSigningSecret()).update(payload).digest("base64url");
  if (!safeMatch(sig, expectedSig)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Boolean(decoded && Number(decoded.exp) > Date.now());
  } catch {
    return false;
  }
}

function verifyTelegramWebAppInitData(initData) {
  const botToken = configuredTelegramToken();
  const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || db.getSettings().telegramAdminChatId || "").trim();
  if (!botToken || !initData || typeof initData !== "string") return false;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;
    params.delete("hash");
    const pairs = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = pairs.map(([k, v]) => `${k}=${v}`).join("\n");
    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (!safeMatch(hash, computedHash)) return false;
    const authDate = Number(params.get("auth_date") || 0);
    if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400 * 7) return false;
    const user = JSON.parse(params.get("user") || "{}");
    if (!adminChatId) return Boolean(user.id);
    return String(user.id) === adminChatId;
  } catch {
    return false;
  }
}

function isAdmin(req) {
  const auth = req.get("authorization") || "";
  const token = process.env.KIN_ADMIN_API_TOKEN;
  if (token && safeMatch(auth, `Bearer ${token}`)) return true;
  if (auth.startsWith("Bearer ks1.") && verifyStudioSessionToken(auth.slice(7))) return true;
  const tgInitData = req.get("x-telegram-init-data");
  if (tgInitData && verifyTelegramWebAppInitData(tgInitData)) return true;
  return isLocalAdmin(req);
}

function requireAdmin(req, res, next) {
  res.set("Cache-Control", "no-store");
  if (!isAdmin(req)) return res.status(403).json({ ok: false, error: "Admin authorization required" });
  next();
}

function verifyTelegramWebhook(req, res, next) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !WEBHOOK_SECRET_FORMAT.test(secret)) {
    return res.status(503).json({ ok: false, error: "Telegram webhook is not configured" });
  }
  if (!safeMatch(req.get("x-telegram-bot-api-secret-token"), secret)) {
    return res.status(403).json({ ok: false, error: "Invalid Telegram webhook secret" });
  }
  next();
}

function usesTelegramWebhook() {
  return Boolean(process.env.VERCEL || process.env.TELEGRAM_WEBHOOK_URL);
}

function configuredTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN || db.getSettings().telegramBotToken || "";
}

app.post("/api/telegram/webhook", verifyTelegramWebhook);
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use((err, req, res, next) => {
  if (!err.type || !String(err.type).startsWith("entity.")) return next(err);
  res.status(err.status || 400).json({ ok: false, error: "Invalid request body" });
});

// 301 SEO Redirect from legacy *.vercel.app host to custom domain (preserves 100% search authority)
app.use((req, res, next) => {
  const host = String(req.get("x-forwarded-host") || req.get("host") || "").toLowerCase();
  if (
    process.env.VERCEL &&
    host === "kin-estates-danang.vercel.app" &&
    !req.path.startsWith("/api/") &&
    !req.path.startsWith("/css/") &&
    !req.path.startsWith("/js/") &&
    !req.path.startsWith("/img/") &&
    !req.path.startsWith("/videos/")
  ) {
    return res.redirect(301, `https://www.kinestatesdanang.com${req.originalUrl || "/"}`);
  }
  return next();
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));

function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();
  return (req, res, next) => {
    const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    if (!ip || LOCAL_ADDRESS.has(ip) || String(process.env.PUBLIC_SITE_URL || "").includes(".invalid")) {
      return next();
    }
    const now = Date.now();
    if (buckets.size > 2000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k);
      }
    }
    let entry = buckets.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ ok: false, error: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút." });
    }
    next();
  };
}

const inquiryRateLimit = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });
const studioAuthRateLimit = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 15 });

let dbInitialization;
function ensureInitialized() {
  if (!dbInitialization) {
    dbInitialization = db.initDatabase().then(() => {
      if (!usesTelegramWebhook()) telegramService.initTelegramBot();
    }).catch((err) => {
      dbInitialization = null;
      throw err;
    });
  }
  return dbInitialization;
}

// Middleware to ensure DB is initialized & connected on every API call (including Vercel Serverless cold/warm starts)
app.use("/api", async (req, res, next) => {
  try {
    await ensureInitialized();
    if (process.env.MONGODB_URI) {
      await db.ensureMongoConnection();
    }
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/api/health", (req, res) => {
  res.set("Cache-Control", "no-store");
  const st = db.getDbStatus();
  res.json({
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    databaseConnected: st.isNativeMongoConnected,
    databaseMode: st.mongoConnectionMode,
    telegramConnected: telegramService.getBotStatus().connected
  });
});

// 1. System & Architecture Status
app.get("/api/system/status", async (req, res) => {
  const admin = isAdmin(req);
  const settings = db.getSettings();
  const botStatus = telegramService.getBotStatus();
  res.set("Cache-Control", "no-store");
  res.json({
    ok: true,
    platform: "KIN ESTATES — Da Nang Private Residences & CRM",
    database: await db.getLiveDbStatus(),
    telegramBot: admin ? botStatus : { connected: botStatus.connected, mode: botStatus.mode },
    settings: {
      hasTelegramToken: Boolean(configuredTelegramToken()),
      ...(admin ? {
        telegramAdminChatId: settings.telegramAdminChatId,
        hasGoogleSheetsWebhookUrl: Boolean(settings.googleSheetsWebhookUrl)
      } : {}),
      usdToVndRate: settings.usdToVndRate,
      hideRentedByDefault: Boolean(settings.hideRentedByDefault)
    },
    syncLogs: admin ? db.getSyncLogs() : []
  });
});

// 2. Apartments Catalogue & Full CRUD (Supports Public & Admin views)
const PUBLIC_APARTMENT_FIELDS = [
  "_id", "code", "propertyType", "title", "building", "address", "areaName", "district", "priceUsd", "priceVnd",
  "bedrooms", "bathrooms", "sizeM2", "landAreaM2", "floor", "orientation", "frontageRoad", "furnishing",
  "cleaningService", "managementFee", "parking", "poolInfo", "minLeaseMonths", "depositMonths",
  "electricityRate", "waterRate", "wifiIncluded", "naturalLightScore", "remoteWorkSetup", "petPolicy",
  "status", "availableFrom", "isVisible", "featured", "isPinned", "pinnedAt", "boostedAt",
  "locationAccuracy", "coordinates", "architecturalNotes", "translations", "tags", "images", "createdAt", "updatedAt"
];

function publicApartment(apartment) {
  return Object.fromEntries(PUBLIC_APARTMENT_FIELDS.map((field) => [field, apartment[field]]));
}

const handleGetApartments = async (req, res) => {
  try {
    const admin = isAdmin(req);
    const filters = admin ? req.query : { ...req.query, includeHidden: false, admin: false };
    let apartments = await db.getApartments(filters);
    const targetLang = String(req.query.lang || "").trim().toLowerCase();
    if (translationService.TARGET_LANGS.includes(targetLang)) {
      apartments = await Promise.all(
        apartments.map(async (apt) => {
          const translated = await translationService.translateApartmentForLanguage(apt, targetLang);
          if (translated !== apt) {
            void db.persistApartmentLanguageCache(apt.code, targetLang, translated);
          }
          return translated;
        })
      );
    }
    res.vary("Authorization");
    if (admin) {
      res.set("Cache-Control", "no-store");
    } else {
      const stampSource = apartments
        .map((a) => `${a.code}:${a.status}:${a.isPinned ? 1 : 0}:${a.priceVnd || a.priceUsd}:${a.updatedAt || ""}:${a.boostedAt || ""}:${(a.images || []).length}`)
        .join("|");
      const etag = `W/"kin-${createHmac("sha256", "kin-cat-etag").update(`${targetLang}|${stampSource}`).digest("hex").slice(0, 24)}"`;
      res.set({
        "Cache-Control": "public, s-maxage=2, stale-while-revalidate=15",
        "ETag": etag
      });
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }
    }
    res.json({
      ok: true,
      count: apartments.length,
      apartments: admin ? apartments : apartments.map(publicApartment),
      dbStatus: await db.getLiveDbStatus()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

app.get("/api/apartments", handleGetApartments);
app.get("/api/properties", handleGetApartments);

app.get("/api/apartments/:id", async (req, res) => {
  const admin = isAdmin(req);
  res.vary("Authorization");
  if (admin) res.set("Cache-Control", "no-store");
  else res.set("Cache-Control", "public, s-maxage=2, stale-while-revalidate=10");
  let apt = await db.getApartmentByCodeOrId(req.params.id);
  if (!apt || (!db.isPublicApartment(apt) && !admin)) {
    return res.status(404).json({ ok: false, error: "Apartment not found" });
  }
  const targetLang = String(req.query.lang || "").trim().toLowerCase();
  if (translationService.TARGET_LANGS.includes(targetLang)) {
    const translated = await translationService.translateApartmentForLanguage(apt, targetLang);
    if (translated !== apt) {
      void db.persistApartmentLanguageCache(apt.code, targetLang, translated);
      apt = translated;
    }
  }
  res.json({ ok: true, apartment: admin ? apt : publicApartment(apt) });
});

app.post("/api/apartments", requireAdmin, async (req, res) => {
  try {
    const created = await db.createApartment(req.body);
    await Promise.allSettled([
      sheetsService.pushToGoogleSheetsWebhook("create_apartment", created),
      indexNowService.notifyApartmentIndexed(created)
    ]);
    void telegramService.notifyStudioMutationToTelegram?.("create", created);
    autoDeployService.scheduleAutoDeploy("Studio create apartment");
    res.set("Cache-Control", "no-store").status(201).json({
      ok: true,
      apartment: created,
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/apartments/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await db.updateApartment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: "Apartment not found" });
    await Promise.allSettled([
      sheetsService.pushToGoogleSheetsWebhook("update_apartment", updated),
      indexNowService.notifyApartmentIndexed(updated)
    ]);
    void telegramService.notifyStudioMutationToTelegram?.("update", updated);
    autoDeployService.scheduleAutoDeploy("Studio update apartment");
    res.set("Cache-Control", "no-store").json({
      ok: true,
      apartment: updated,
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/apartments/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await db.deleteApartment(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Apartment not found" });
    await Promise.allSettled([
      sheetsService.pushToGoogleSheetsWebhook("delete_apartment", { code: deleted.code }),
      indexNowService.notifyCatalogRefreshed()
    ]);
    void telegramService.notifyStudioMutationToTelegram?.("delete", deleted);
    autoDeployService.scheduleAutoDeploy("Studio delete apartment");
    res.set("Cache-Control", "no-store").json({
      ok: true,
      deleted,
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 3. Buildings Market Index & Neighborhood Guides
app.get("/api/buildings", (req, res) => {
  res.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
  res.json({ ok: true, buildings: db.getBuildings() });
});

app.get("/api/neighborhoods", (req, res) => {
  res.set("Cache-Control", "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400");
  res.json({ ok: true, neighborhoods: db.getNeighborhoods() });
});

// 4. Inquiries / Customer Leads / Viewing Schedule / Landlord Submissions CRUD
app.get("/api/inquiries", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const inquiries = await db.getInquiries(req.query);
  res.json({ ok: true, count: inquiries.length, inquiries });
});

app.post("/api/inquiries", inquiryRateLimit, async (req, res) => {
  try {
    const result = await createPublicInquiry(req.body, req.headers);
    const inquiry = result?.inquiry || result;
    const replayed = Boolean(result?.replayed);
    if (!replayed && !isAnonymousContactClick(inquiry)) {
      await Promise.allSettled([
        telegramService.notifyNewInquiryToTelegram(inquiry),
        sheetsService.pushToGoogleSheetsWebhook("new_inquiry", inquiry)
      ]);
    }
    const receipt = inquiry.submissionReceipt || {
      type: inquiry.type,
      status: inquiry.status,
      apartmentCode: inquiry.apartmentCode
    };
    res.set("Cache-Control", "no-store").status(replayed ? 200 : 201).json({
      ok: true,
      inquiry: {
        code: inquiry.code,
        type: receipt.type,
        status: receipt.status,
        apartmentCode: receipt.apartmentCode
      }
    });
  } catch (err) {
    const invalid = ["INVALID_INQUIRY", "INVALID_VIEWING_TIME"].includes(err.code);
    const unavailable = ["APARTMENT_UNAVAILABLE", "INQUIRY_REQUEST_CONFLICT"].includes(err.code);
    res.status(unavailable ? 409 : invalid ? 400 : 503).json({
      ok: false, error: unavailable || invalid ? err.message : "Chưa thể lưu yêu cầu. Vui lòng thử lại."
    });
  }
});

app.patch("/api/inquiries/:id", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const updated = await db.updateInquiry(req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: "Inquiry not found" });
    await sheetsService.pushToGoogleSheetsWebhook("update_inquiry", updated);
    res.json({ ok: true, inquiry: updated, inquiries: await db.getInquiries() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/inquiries/:id", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    if (req.query.force === "1") {
      const existing = await db.getInquiryByCodeOrId(req.params.id);
      if (existing && ["reservation", "booking"].includes(existing.type) && existing.status === "Confirmed") {
        await db.transitionReservation(req.params.id, "cancel");
      }
    }
    const deleted = await db.deleteInquiry(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Inquiry not found" });
    res.json({ ok: true, deleted, inquiries: await db.getInquiries() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Approve an owner_listing inquiry into a published apartment
app.post("/api/inquiries/:id/approve-listing", requireAdmin, async (req, res) => {
  try {
    const cmdRes = await telegramService.processTelegramCommand(`/approve_owner ${req.params.id}`, {
      username: "Admin Web"
    });
    res.json({
      ok: true,
      result: cmdRes,
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments(),
      inquiries: await db.getInquiries()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 5. Leases / Active Tenants Management (Quản lý khách đang thuê căn nào, thời hạn)
app.get("/api/leases", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  const leases = await db.getLeases(req.query);
  res.json({ ok: true, count: leases.length, leases });
});

app.post("/api/leases", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const lease = await db.createLease(req.body);
    await Promise.allSettled([
      sheetsService.pushToGoogleSheetsWebhook("create_lease", lease),
      indexNowService.notifyCatalogRefreshed()
    ]);
    res.status(201).json({
      ok: true,
      lease,
      leases: await db.getLeases(),
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/leases/:id", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const updated = await db.updateLease(req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: "Lease not found" });
    await Promise.allSettled([
      sheetsService.pushToGoogleSheetsWebhook("update_lease", updated),
      indexNowService.notifyCatalogRefreshed()
    ]);
    res.json({
      ok: true,
      lease: updated,
      leases: await db.getLeases(),
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/leases/:id/checkout", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const lease = await db.getLeaseByCodeOrId(req.params.id);
    const aptCode = lease ? lease.apartmentCode : req.params.id;
    if (lease) {
      await db.updateLease(lease.code || lease._id, { status: "Ended" });
    } else if (aptCode) {
      await db.updateApartment(aptCode, {
        status: "Available",
        isVisible: true,
        currentTenant: null
      });
    }
    await Promise.allSettled([
      sheetsService.pushToGoogleSheetsWebhook("checkout_lease", { apartmentCode: aptCode }),
      indexNowService.notifyCatalogRefreshed()
    ]);
    res.json({
      ok: true,
      leases: await db.getLeases(),
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/leases/:id", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const deleted = await db.deleteLease(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Lease not found" });
    await indexNowService.notifyCatalogRefreshed();
    res.json({
      ok: true,
      deleted,
      leases: await db.getLeases(),
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 6. Telegram Bot Management & Webhook Endpoints
app.get("/api/telegram/history", requireAdmin, async (req, res) => {
  res.json({
    ok: true,
    status: telegramService.getBotStatus(),
    history: db.getBotHistory(),
    dbStatus: await db.getLiveDbStatus()
  });
});

app.post("/api/telegram/command", requireAdmin, async (req, res) => {
  try {
    const { command, username, photoUrls } = req.body;
    const result = await telegramService.processTelegramCommand(command, {
      username: username || "Admin (Bot Console)",
      photoUrls: photoUrls || []
    });
    res.json({
      ok: true,
      result,
      history: db.getBotHistory(),
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments(),
      inquiries: await db.getInquiries(),
      leases: await db.getLeases(),
      dbStatus: await db.getLiveDbStatus()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await telegramService.handleTelegramWebhookUpdate(req.body || {});
    res.status(200).json({ ok: true });
  } catch {
    console.error("Telegram webhook processing failed");
    res.status(500).json({ ok: false, error: "Telegram webhook processing failed" });
  }
});

function sendTelegramPhoto(res, photo) {
  res.set({
    "Content-Type": photo.contentType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=0, must-revalidate"
  });
  return res.send(photo.bytes);
}

function photoUnavailable(res, status = 404) {
  return res.set("Cache-Control", "no-store").sendStatus(status);
}

app.get("/api/telegram/media/:mediaId", async (req, res) => {
  const { mediaId } = req.params;
  if (!MEDIA_ID.test(mediaId)) return photoUnavailable(res);
  try {
    const mediaUrl = `/api/telegram/media/${mediaId}`;
    const allowed = (await db.hasPublicApartmentPhoto([mediaUrl])) || (await db.hasPublicSiteMedia([mediaUrl]));
    if (!allowed) return photoUnavailable(res);
    const photo = await getStoredTelegramPhoto(mediaId);
    return photo ? sendTelegramPhoto(res, photo) : photoUnavailable(res);
  } catch {
    return photoUnavailable(res, 503);
  }
});

// Public SEO-Optimized Image Route (/photos/<seo-slug>--<mediaId>.jpg) for Google Images & Fast Edge CDN Delivery
app.get("/photos/:seoFilename", async (req, res) => {
  const rawName = String(req.params.seoFilename || "").trim();
  const m = rawName.match(/(?:^|--)([a-f0-9]{64})(?:\.(?:jpe?g|png|webp))?$/i);
  const mediaId = m ? m[1].toLowerCase() : "";
  if (!MEDIA_ID.test(mediaId)) return photoUnavailable(res);
  try {
    await ensureInitialized();
    if (process.env.MONGODB_URI) {
      await db.ensureMongoConnection();
    }
    const mediaUrl = `/api/telegram/media/${mediaId}`;
    const allowed = (await db.hasPublicApartmentPhoto([mediaUrl])) || (await db.hasPublicSiteMedia([mediaUrl]));
    if (!allowed) return photoUnavailable(res);
    const etag = `"kin-img-${mediaId.slice(0, 24)}"`;
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }
    const photo = await getStoredTelegramPhoto(mediaId);
    if (!photo) return photoUnavailable(res);
    const ext = photo.contentType === "image/png" ? "png" : photo.contentType === "image/webp" ? "webp" : "jpg";
    const safeDownloadName = rawName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.(?:jpe?g|png|webp)$/i, "") + `.${ext}`;
    res.set({
      "Content-Type": photo.contentType,
      "Content-Disposition": `inline; filename="${safeDownloadName}"`,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "index, max-image-preview:large",
      "ETag": etag,
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    });
    return res.send(photo.bytes);
  } catch {
    return photoUnavailable(res, 503);
  }
});

app.get("/api/telegram/photo/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!FILE_ID.test(fileId)) return photoUnavailable(res);
  try {
    const paths = [fileId, encodeURIComponent(fileId)].map((id) => `/api/telegram/photo/${id}`);
    if (!await db.hasPublicApartmentPhoto(paths)) return photoUnavailable(res);
    const url = await storeTelegramPhoto(configuredTelegramToken(), { file_id: fileId });
    const photo = await getStoredTelegramPhoto(url.split("/").pop());
    return photo ? sendTelegramPhoto(res, photo) : photoUnavailable(res);
  } catch {
    // Older listings used a placeholder when the Telegram file could no longer be loaded.
    return res.set("Cache-Control", "no-store").redirect(
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85"
    );
  }
});

async function telegramBotApi(token, method, body = {}) {
  try {
    if (!BOT_TOKEN_FORMAT.test(token)) return null;
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "error",
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.ok ? result.result : null;
  } catch {
    return null;
  }
}

function telegramWebhookOptions() {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !WEBHOOK_SECRET_FORMAT.test(secret)) return null;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const configuredUrl = process.env.TELEGRAM_WEBHOOK_URL ||
    (vercelHost ? `https://${vercelHost}/api/telegram/webhook` : "");
  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
        url.pathname !== "/api/telegram/webhook") return null;
    return { url: url.href, secret_token: secret, max_connections: 1 };
  } catch {
    return null;
  }
}

async function registerTelegramWebhook(token) {
  const options = telegramWebhookOptions();
  if (!options) return { ok: false, error: "Configure the webhook URL and TELEGRAM_WEBHOOK_SECRET" };
  const registered = await telegramBotApi(token, "setWebhook", options);
  return registered === true ? { ok: true } : { ok: false, error: "Telegram webhook registration failed" };
}

function renderTelegramConnector(res, status = 200, message = "") {
  res.set("Referrer-Policy", "no-referrer");
  return res.status(status).send(`<!doctype html>
<html lang="vi">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kết nối Telegram | KIN Estates</title>
<style>
  body { margin: 3rem auto; padding: 0 1rem; max-width: 28rem; font: 1rem system-ui; color: #14191f; }
  form, label { display: grid; gap: 0.5rem; }
  form { gap: 1rem; }
  input, button { font: inherit; padding: 0.65rem; }
</style>
<h1>Kết nối bot Telegram</h1>
<p>Tạo bot với <a href="https://t.me/BotFather">@BotFather</a> và lấy token. Điền ID chat riêng của quản trị viên để giới hạn quyền điều khiển.</p>
${message ? `<p role="status">${message}</p>` : ""}
<form method="POST" action="/api/telegram/connect">
  <label>Token từ BotFather<input type="password" name="token" autocomplete="off" required></label>
  <label>ID chat riêng<input name="chatId" inputmode="numeric" autocomplete="off"></label>
  <button type="submit">Kết nối bot</button>
</form>
</html>`);
}

app.get("/api/telegram/connect", requireAdmin, (req, res) => renderTelegramConnector(res));

app.post("/api/telegram/connect", requireAdmin, async (req, res) => {
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  const chatId = typeof req.body.chatId === "string" ? req.body.chatId.trim() : "";
  if (!BOT_TOKEN_FORMAT.test(token) || (chatId && !/^\d{1,20}$/.test(chatId))) {
    return renderTelegramConnector(res, 400, "Kiểm tra lại token hoặc ID chat riêng.");
  }
  if (process.env.TELEGRAM_BOT_TOKEN && token !== process.env.TELEGRAM_BOT_TOKEN) {
    return renderTelegramConnector(res, 400, "Ứng dụng đang dùng token cấu hình qua biến môi trường.");
  }
  if (!(process.env.TELEGRAM_ADMIN_CHAT_ID || chatId || db.getSettings().telegramAdminChatId)) {
    return renderTelegramConnector(res, 400, "Điền ID chat riêng của quản trị viên.");
  }
  if (!await telegramBotApi(token, "getMe")) {
    return renderTelegramConnector(res, 400, "Không xác minh được bot. Kiểm tra lại token từ BotFather.");
  }
  if (usesTelegramWebhook()) {
    if (process.env.VERCEL && !(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID)) {
      return renderTelegramConnector(res, 400, "Đặt TELEGRAM_BOT_TOKEN và TELEGRAM_ADMIN_CHAT_ID trên Vercel trước khi đăng ký webhook.");
    }
    const result = await registerTelegramWebhook(token);
    if (!result.ok) return renderTelegramConnector(res, 502, "Không đăng ký được webhook Telegram.");
    await telegramService.registerTelegramBotCommands(token);
  } else {
    if (!await telegramBotApi(token, "deleteWebhook")) {
      return renderTelegramConnector(res, 502, "Không chuyển được bot sang chế độ chạy trên máy này.");
    }
  }
  db.updateSettings({ ...(process.env.TELEGRAM_BOT_TOKEN ? {} : { telegramBotToken: token }),
    ...(chatId ? { telegramAdminChatId: chatId } : {}) });
  if (!usesTelegramWebhook()) telegramService.initTelegramBot(token);
  return renderTelegramConnector(res, 200, "Đã kết nối bot. Mở bot trên Telegram và gửi /start.");
});

app.post("/api/telegram/config", requireAdmin, async (req, res) => {
  const { telegramBotToken, telegramAdminChatId, googleSheetsWebhookUrl, hideRentedByDefault, registerWebhook } = req.body;
  if ([telegramBotToken, telegramAdminChatId, googleSheetsWebhookUrl].some(
    (value) => value !== undefined && typeof value !== "string"
  )) return res.status(400).json({ ok: false, error: "Invalid Telegram configuration" });

  const suppliedToken = telegramBotToken?.trim();
  const chatId = telegramAdminChatId?.trim();
  if ((suppliedToken && !BOT_TOKEN_FORMAT.test(suppliedToken)) || (chatId && !/^\d{1,20}$/.test(chatId))) {
    return res.status(400).json({ ok: false, error: "Invalid Telegram bot token or private chat ID" });
  }
  if (suppliedToken && process.env.TELEGRAM_BOT_TOKEN && suppliedToken !== process.env.TELEGRAM_BOT_TOKEN) {
    return res.status(400).json({ ok: false, error: "Telegram bot token is managed by the deployment environment" });
  }

  const token = suppliedToken || configuredTelegramToken();
  let webhookInfo = null;
  if (registerWebhook && usesTelegramWebhook()) {
    if (process.env.VERCEL && !(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID)) {
      return res.status(400).json({ ok: false, error: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID on Vercel" });
    }
    webhookInfo = await registerTelegramWebhook(token);
    if (!webhookInfo.ok) return res.status(502).json({ ok: false, webhookInfo });
    await telegramService.registerTelegramBotCommands(token);
  }

  db.updateSettings({
    ...(suppliedToken && !process.env.TELEGRAM_BOT_TOKEN ? { telegramBotToken: suppliedToken } : {}),
    ...(chatId !== undefined ? { telegramAdminChatId: chatId } : {}),
    ...(googleSheetsWebhookUrl?.trim() ? { googleSheetsWebhookUrl: googleSheetsWebhookUrl.trim() } : {}),
    ...(hideRentedByDefault !== undefined ? { hideRentedByDefault: Boolean(hideRentedByDefault) } : {})
  });

  const settings = db.getSettings();
  const status = usesTelegramWebhook() ? telegramService.getBotStatus() : telegramService.initTelegramBot(token);
  res.json({
    ok: true,
    settings: {
      hasTelegramToken: Boolean(token),
      telegramAdminChatId: settings.telegramAdminChatId,
      hasGoogleSheetsWebhookUrl: Boolean(settings.googleSheetsWebhookUrl),
      hideRentedByDefault: Boolean(settings.hideRentedByDefault)
    },
    botStatus: {
      active: status.active ?? status.connected,
      mode: status.mode?.startsWith("Error:") ? "Telegram bot initialization failed" : status.mode
    },
    webhookInfo
  });
});

// 7. Excel (.csv with UTF-8 BOM for Microsoft Excel) & Google Sheets 2-Way Sync Endpoints
app.get("/api/excel/apartments.csv", requireAdmin, async (req, res) => {
  const csv = await sheetsService.generateApartmentsCsv(true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="KIN_Estates_CanHo.csv"');
  res.send(csv);
});

app.get("/api/excel/inquiries.csv", requireAdmin, async (req, res) => {
  const csv = await sheetsService.generateInquiriesCsv(true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="KIN_Estates_KhachHang_LichHen.csv"');
  res.send(csv);
});

app.get("/api/excel/leases.csv", requireAdmin, async (req, res) => {
  const csv = await sheetsService.generateLeasesCsv(true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="KIN_Estates_KhachDangThue_HopDong.csv"');
  res.send(csv);
});

app.get("/api/sheets/export.csv", requireAdmin, async (req, res) => {
  const csv = await sheetsService.generateApartmentsCsv(true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="kin_estates_apartments.csv"');
  res.send(csv);
});

app.get("/api/sheets/apps-script", requireAdmin, (req, res) => {
  const host = `${req.protocol}://${req.get("host")}`;
  const appsScriptCode = sheetsService.getGoogleAppsScriptTemplate(host).replace(
    '    payload: JSON.stringify({ rows })',
    '    headers: { Authorization: "Bearer " + PropertiesService.getScriptProperties().getProperty("KIN_ADMIN_API_TOKEN") },\n' +
    '    payload: JSON.stringify({ rows })'
  );
  res.json({
    ok: true,
    csvApartmentsUrl: `${host}/api/excel/apartments.csv`,
    csvInquiriesUrl: `${host}/api/excel/inquiries.csv`,
    csvLeasesUrl: `${host}/api/excel/leases.csv`,
    importDataFormula: `=IMPORTDATA("${host}/api/excel/apartments.csv")`,
    appsScriptCode,
    syncLogs: db.getSyncLogs()
  });
});

app.post("/api/sheets/sync", requireAdmin, async (req, res) => {
  const result = await sheetsService.pushToGoogleSheetsWebhook("manual_sync", {});
  res.json({ ok: true, result, syncLogs: db.getSyncLogs() });
});

app.post("/api/sheets/import", requireAdmin, async (req, res) => {
  try {
    const payload = req.body.csvText || req.body.rows || [];
    const result = await sheetsService.importRowsFromSheetPayload(payload);
    res.json({
      ok: true,
      result,
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments(),
      syncLogs: db.getSyncLogs()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/excel/import-apartments", requireAdmin, async (req, res) => {
  try {
    const payload = req.body.csvText || req.body.rows || [];
    const result = await sheetsService.importRowsFromSheetPayload(payload);
    res.json({
      ok: true,
      result,
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments(),
      syncLogs: db.getSyncLogs()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/excel/import-leases", requireAdmin, async (req, res) => {
  try {
    const payload = req.body.csvText || req.body.rows || [];
    const result = await sheetsService.importLeasesFromExcelPayload(payload);
    res.json({
      ok: true,
      result,
      leases: await db.getLeases(),
      apartments: await db.getApartments({ includeHidden: true }),
      publicApartments: await db.getApartments(),
      syncLogs: db.getSyncLogs()
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 8. Private Mobile Management Studio & Executive Analytics API (Zero public exposure)
app.post("/api/studio/auth", studioAuthRateLimit, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const { passcode, initData } = req.body || {};
  if (initData && verifyTelegramWebAppInitData(initData)) {
    return res.json({ ok: true, mode: "telegram_mini_app", token: createStudioSessionToken("telegram_admin") });
  }
  if (isLocalAdmin(req) && !passcode && !initData) {
    return res.json({ ok: true, mode: "local_admin", token: createStudioSessionToken("local_admin") });
  }
  const provided = typeof passcode === "string" ? passcode.trim() : "";
  const expected = configuredStudioPasscode();
  const apiToken = process.env.KIN_ADMIN_API_TOKEN;
  if (provided && (safeMatch(provided, expected) || (apiToken && safeMatch(provided, apiToken)))) {
    return res.json({ ok: true, mode: "passcode", token: createStudioSessionToken("passcode_admin") });
  }
  return res.status(403).json({ ok: false, error: "Mã khóa không chính xác." });
});

app.get("/api/studio/report", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    const [apartments, inquiries, leases, aboutContent] = await Promise.all([
      db.getApartments({ includeHidden: true }),
      db.getInquiries(),
      db.getLeases(),
      db.getAboutContent()
    ]);

    const codes = apartments.map((a) => a.code);
    const contactSummaryMap = await getApartmentContactSummary(codes);
    const now = Date.now();
    const rate = db.getSettings().usdToVndRate || 25480;

    let availableCount = 0;
    let rentedCount = 0;
    let reservedCount = 0;
    let hiddenCount = 0;
    let vacantPotentialVnd = 0;
    let vacantPotentialUsd = 0;

    const normalizeAreaLabel = (rawArea) => {
      const s = String(rawArea || "").trim();
      if (!s) return "Khác";
      const folded = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
      if (folded.includes("hoa xuan")) return "Hòa Xuân";
      if (folded.includes("cam le")) return "Cẩm Lệ";
      if (folded.includes("nam viet a")) return "Nam Việt Á";
      if (folded.includes("fpt") || folded.includes("hoa hai")) return "FPT City / Hòa Hải";
      if (folded.includes("hoa khanh")) return "Hòa Khánh";
      if (folded.includes("lien chieu")) return "Liên Chiểu";
      if (folded.includes("thanh khe")) return "Thanh Khê";
      if (folded.includes("hoa vang")) return "Hòa Vang";
      if (folded.includes("phuoc my")) return "Phước Mỹ";
      if (folded.includes("khue my")) return "Khuê Mỹ";
      if (folded.includes("tho quang")) return "Thọ Quang";
      if (folded.includes("thuan phuoc")) return "Thuận Phước";
      if (folded.includes("my an")) return "Mỹ An";
      if (folded.includes("an thuong")) return "An Thượng";
      if (folded.includes("han river") || folded.includes("song han")) return "Ven sông Hàn";
      if (folded.includes("my khe")) return "Biển Mỹ Khê";
      if (folded.includes("son tra")) return "Sơn Trà";
      if (folded.includes("hai chau")) return "Hải Châu";
      if (folded.includes("ngu hanh son")) return "Ngũ Hành Sơn";
      return s;
    };

    const areaMap = new Map();
    const typeCounts = { condo: 0, apartment: 0, house: 0, villa: 0, penthouse: 0 };
    let pinnedCount = 0;
    const enrichedApartments = apartments.map((apt) => {
      const codeUpper = String(apt.code || "").toUpperCase();
      const cs = contactSummaryMap.get(codeUpper) || { people: 0, clicks: 0, bookings: 0 };
      const pt = apt.propertyType || db.inferPropertyType(apt);
      typeCounts[pt] = (typeCounts[pt] || 0) + 1;
      const isHidden = apt.isVisible === false || apt.status === "Hidden";
      if (!isHidden && apt.isPinned && apt.status !== "Rented") pinnedCount++;
      if (isHidden) hiddenCount++;
      else if (apt.status === "Rented") rentedCount++;
      else if (apt.status === "Reserved") reservedCount++;
      else {
        availableCount++;
        vacantPotentialVnd += Number(apt.priceVnd || 0);
        vacantPotentialUsd += Number(apt.priceUsd || 0);
      }

      const createdMs = apt.createdAt ? new Date(apt.createdAt).getTime() : 0;
      const boostedMs = apt.boostedAt ? new Date(apt.boostedAt).getTime() : createdMs;
      const daysListed = createdMs > 0 && Number.isFinite(createdMs) ? Math.max(0, Math.floor((now - createdMs) / 86400000)) : 0;
      const daysSinceBoost = boostedMs > 0 && Number.isFinite(boostedMs) ? Math.max(0, Math.floor((now - boostedMs) / 86400000)) : daysListed;

      const areaKey = normalizeAreaLabel(apt.areaName);
      const areaStat = areaMap.get(areaKey) || { area: areaKey, total: 0, available: 0, rented: 0, leads: 0, revenueVnd: 0 };
      areaStat.total++;
      if (!isHidden && apt.status === "Available") areaStat.available++;
      if (apt.status === "Rented") {
        areaStat.rented++;
        areaStat.revenueVnd += Number(apt.priceVnd || 0);
      }
      areaStat.leads += cs.people;
      areaMap.set(areaKey, areaStat);

      return { ...apt, contactSummary: cs, daysListed, daysSinceBoost };
    });

    const activeLeases = leases.filter((l) => l.status !== "Ended");
    const activeRevenueUsd = activeLeases.reduce((sum, l) => sum + Number(l.priceUsd || 0), 0);
    const activeRevenueVnd = activeLeases.reduce(
      (sum, l) => sum + Number(l.priceVnd || Math.round(Number(l.priceUsd || 0) * rate)),
      0
    );

    const expiringSoonLeases = activeLeases
      .map((l) => {
        const end = l.endDate ? new Date(l.endDate).getTime() : NaN;
        const daysLeft = Number.isFinite(end) ? Math.ceil((end - now) / 86400000) : null;
        return { ...l, daysLeft };
      })
      .filter((l) => l.daysLeft !== null && l.daysLeft <= 45)
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

    const statusFunnel = { New: 0, Contacted: 0, Viewing_Scheduled: 0, Pending: 0, Confirmed: 0, Rented_Closed: 0, Cancelled: 0 };
    const channelStats = new Map();
    let pendingBookingsCount = 0;
    let confirmedBookingsCount = 0;
    let newLeadsCount = 0;

    const crmInquiries = inquiries.filter((inq) => !isAnonymousContactClick(inq));

    for (const inq of crmInquiries) {
      if (inq.type === "owner_listing") continue;
      const st = inq.status || "New";
      if (statusFunnel[st] !== undefined) statusFunnel[st]++;
      if (st === "New" && !["reservation", "booking"].includes(inq.type)) newLeadsCount++;
      if (["reservation", "booking"].includes(inq.type)) {
        if (["New", "Pending"].includes(st)) pendingBookingsCount++;
        if (st === "Confirmed") confirmedBookingsCount++;
      }
      const ch = inq.messenger || "Khác";
      channelStats.set(ch, (channelStats.get(ch) || 0) + 1);
    }

    const totalVisiblePool = Math.max(1, apartments.length - hiddenCount);
    const occupancyRate = Math.round(((rentedCount + reservedCount) / totalVisiblePool) * 100);
    const topApartments = [...enrichedApartments]
      .sort((a, b) => (b.contactSummary.people + b.contactSummary.bookings * 2) - (a.contactSummary.people + a.contactSummary.bookings * 2))
      .slice(0, 6);
    const slowVacantApartments = enrichedApartments
      .filter((a) => a.isVisible !== false && a.status === "Available")
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? 1 : -1;
        const aScore = (a.contactSummary?.people || 0) + (a.contactSummary?.bookings || 0) * 2;
        const bScore = (b.contactSummary?.people || 0) + (b.contactSummary?.bookings || 0) * 2;
        if (aScore !== bScore) return aScore - bScore;
        return (b.daysSinceBoost || 0) - (a.daysSinceBoost || 0);
      })
      .slice(0, 5);

    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      kpi: {
        totalApartments: apartments.length,
        availableCount,
        rentedCount,
        reservedCount,
        hiddenCount,
        pinnedCount,
        typeCounts,
        occupancyRate,
        activeLeasesCount: activeLeases.length,
        activeRevenueVnd,
        activeRevenueUsd,
        vacantPotentialVnd,
        vacantPotentialUsd,
        totalInquiries: crmInquiries.filter((i) => i.type !== "owner_listing").length,
        newLeadsCount,
        pendingBookingsCount,
        confirmedBookingsCount,
        expiringSoonCount: expiringSoonLeases.length
      },
      areaBreakdown: [...areaMap.values()].sort((a, b) => b.total - a.total),
      topApartments,
      slowVacantApartments,
      statusFunnel,
      channels: [...channelStats.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      expiringSoonLeases,
      apartments: enrichedApartments,
      inquiries: crmInquiries,
      leases,
      aboutContent,
      dbStatus: await db.getLiveDbStatus(),
      botStatus: telegramService.getBotStatus()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/studio/upload-photo", requireAdmin, async (req, res) => {
  try {
    const dataUrl = String(req.body?.dataUrl || "");
    const match = dataUrl.match(/^data:image\/[a-z0-9.+-]+;base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) return res.status(400).json({ ok: false, error: "Định dạng ảnh không hợp lệ." });
    const bytes = Buffer.from(match[1], "base64");
    const url = await storeUploadedImageBuffer(bytes);
    res.status(201).json({ ok: true, url });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/studio/reservations/:code/:action", requireAdmin, async (req, res) => {
  try {
    const action = req.params.action === "confirm" ? "confirm" : "cancel";
    const result = await db.transitionReservation(req.params.code, action);
    if (result?.changed && result.inquiry) {
      void telegramService.notifyReservationChangeToTelegram?.(action, result.inquiry);
      void sheetsService.pushToGoogleSheetsWebhook(`reservation_${action}`, result.inquiry);
    }
    autoDeployService.scheduleAutoDeploy(`Studio reservation ${action}`);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Bulk Apartment CRUD (Multi-select update or delete)
app.post("/api/studio/apartments/bulk", requireAdmin, async (req, res) => {
  try {
    const { action, codes, updates } = req.body || {};
    const list = Array.isArray(codes) ? [...new Set(codes.map((c) => String(c || "").trim()).filter(Boolean))] : [];
    if (!list.length) return res.status(400).json({ ok: false, error: "Chưa chọn căn hộ nào." });

    const succeeded = [];
    const failed = [];

    if (action === "delete") {
      for (const code of list) {
        try {
          const removed = await db.deleteApartment(code);
          if (removed) succeeded.push(code);
          else failed.push({ code, error: "Không tìm thấy căn hộ." });
        } catch (err) {
          failed.push({ code, error: err.message });
        }
      }
      if (succeeded.length > 0) {
        await indexNowService.notifyCatalogRefreshed();
      }
      return res.json({ ok: true, action: "delete", count: succeeded.length, succeeded, failed });
    }

    if (action === "update" && updates && typeof updates === "object") {
      const rate = db.getSettings().usdToVndRate || 25480;
      for (const code of list) {
        try {
          const apt = await db.getApartmentByCodeOrId(code);
          if (!apt) {
            failed.push({ code, error: "Không tìm thấy căn hộ." });
            continue;
          }
          const patch = {};
          if (updates.status && ["Available", "Reserved", "Rented", "Hidden"].includes(updates.status)) {
            patch.status = updates.status;
            if (updates.status === "Hidden") patch.isVisible = false;
            else if (updates.isVisible === undefined) patch.isVisible = true;
          }
          if (typeof updates.isVisible === "boolean") {
            patch.isVisible = updates.isVisible;
          }
          if (typeof updates.areaName === "string" && updates.areaName.trim()) {
            patch.areaName = updates.areaName.trim();
          }
          if (typeof updates.propertyType === "string" && updates.propertyType.trim()) {
            patch.propertyType = db.normalizePropertyType(updates.propertyType.trim());
          }
          if (typeof updates.building === "string" && updates.building.trim()) {
            patch.building = updates.building.trim();
          }
          if (typeof updates.featured === "boolean") {
            patch.featured = updates.featured;
          }
          if (typeof updates.isPinned === "boolean") {
            patch.isPinned = updates.isPinned;
            if (updates.isPinned) patch.pinNow = true;
          }
          if (updates.boostNow === true) {
            patch.boostNow = true;
          }
          const baseVnd = Number(apt.priceVnd || Math.round(Number(apt.priceUsd || 0) * rate));
          if (updates.priceMode === "fixed" && Number(updates.priceVnd) > 0) {
            patch.priceVnd = Math.round(Number(updates.priceVnd));
            patch.priceUsd = Math.round(patch.priceVnd / rate);
          } else if (updates.priceMode === "percent" && Number.isFinite(Number(updates.priceAdjustPercent))) {
            const nextVnd = Math.max(1000000, Math.round((baseVnd * (1 + Number(updates.priceAdjustPercent) / 100)) / 100000) * 100000);
            patch.priceVnd = nextVnd;
            patch.priceUsd = Math.round(nextVnd / rate);
          } else if (updates.priceMode === "delta" && Number.isFinite(Number(updates.priceAdjustVnd))) {
            const nextVnd = Math.max(1000000, Math.round(baseVnd + Number(updates.priceAdjustVnd)));
            patch.priceVnd = nextVnd;
            patch.priceUsd = Math.round(nextVnd / rate);
          }
          if (Object.keys(patch).length > 0) {
            await db.updateApartment(code, patch);
          }
          succeeded.push(code);
        } catch (err) {
          failed.push({ code, error: err.message });
        }
      }
      if (succeeded.length > 0) {
        await indexNowService.notifyCatalogRefreshed();
      }
      return res.json({ ok: true, action: "update", count: succeeded.length, succeeded, failed });
    }

    return res.status(400).json({ ok: false, error: "Thao tác hàng loạt không hợp lệ." });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Admin Manual Customer / Inquiry Creation
app.post("/api/studio/inquiries", requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const clientName = String(body.clientName || "").trim();
    if (!clientName) return res.status(400).json({ ok: false, error: "Vui lòng nhập tên khách hàng." });
    const aptCode = String(body.apartmentCode || "CURATED-SHORTLIST").trim().toUpperCase();
    const apt = aptCode && aptCode !== "CURATED-SHORTLIST" ? await db.getApartmentByCodeOrId(aptCode) : null;
    const inquiry = await db.createInquiry({
      type: body.type === "reservation" ? "reservation" : "viewing",
      clientName,
      messenger: String(body.messenger || "Zalo").trim(),
      contactHandle: String(body.contactHandle || "").trim(),
      apartmentCode: apt ? apt.code : aptCode || "CURATED-SHORTLIST",
      apartmentTitle: apt ? (apt.title?.vi || apt.title?.en || apt.code) : String(body.apartmentTitle || "Tư vấn chọn căn hộ"),
      budgetUsd: String(body.budgetUsd || "").trim(),
      bedrooms: String(body.bedrooms || "").trim(),
      viewingTime: String(body.viewingTime || "").trim(),
      moveInDate: String(body.moveInDate || "").trim(),
      notes: String(body.notes || "").trim(),
      adminNotes: String(body.adminNotes || "").trim(),
      status: String(body.status || "New").trim(),
      source: "studio_admin"
    });
    res.status(201).json({ ok: true, inquiry });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Bulk Customer / Inquiry Update or Delete
app.post("/api/studio/inquiries/bulk", requireAdmin, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const { action, ids, updates } = req.body || {};
    const list = Array.isArray(ids) ? [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))] : [];
    if (!list.length) return res.status(400).json({ ok: false, error: "Chưa chọn khách hàng nào." });

    const succeeded = [];
    const failed = [];
    if (action === "delete") {
      let releasedHold = false;
      for (const id of list) {
        try {
          const existing = await db.getInquiryByCodeOrId(id);
          if (existing && ["reservation", "booking"].includes(existing.type) && existing.status === "Confirmed") {
            await db.transitionReservation(id, "cancel");
            releasedHold = true;
          }
          const removed = await db.deleteInquiry(id);
          if (removed) succeeded.push(id);
          else failed.push({ id, error: "Không tìm thấy." });
        } catch (err) {
          failed.push({ id, error: err.message });
        }
      }
      if (releasedHold) {
        await indexNowService.notifyCatalogRefreshed();
      }
      return res.json({ ok: true, action: "delete", count: succeeded.length, succeeded, failed });
    }
    if (action === "update" && updates && typeof updates === "object") {
      for (const id of list) {
        try {
          const updated = await db.updateInquiry(id, updates);
          if (updated) succeeded.push(id);
          else failed.push({ id, error: "Không tìm thấy." });
        } catch (err) {
          failed.push({ id, error: err.message });
        }
      }
      return res.json({ ok: true, action: "update", count: succeeded.length, succeeded, failed });
    }
    return res.status(400).json({ ok: false, error: "Thao tác không hợp lệ." });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Cloud Photo Gallery CRUD (MongoDB Atlas telegram_media)
app.get("/api/studio/media", requireAdmin, async (req, res) => {
  try {
    const [photos, apartments, about] = await Promise.all([
      listStoredTelegramPhotos(),
      db.getApartments({ includeHidden: true }),
      db.getAboutContent()
    ]);
    const usageMap = new Map();
    const markUse = (img, label) => {
      if (!img) return;
      const list = usageMap.get(img) || [];
      list.push(label);
      usageMap.set(img, list);
    };
    for (const apt of apartments) {
      for (const img of apt.images || []) {
        markUse(img, { code: apt.code, title: apt.title?.vi || apt.title?.en || apt.code });
      }
    }
    if (about.heroImage) markUse(about.heroImage, { code: "ABOUT", title: "Ảnh bìa trang About" });
    for (const p of about.clientTourPhotos || []) {
      markUse(p.image, { code: "ABOUT", title: "Ảnh dẫn khách" });
    }
    for (const t of about.testimonials || []) {
      if (t.image) markUse(t.image, { code: "FEEDBACK", title: `Feedback: ${t.clientName}` });
      if (t.avatar) markUse(t.avatar, { code: "AVATAR", title: `Avatar: ${t.clientName}` });
    }
    const items = photos.map((p) => ({
      ...p,
      usedBy: usageMap.get(p.url) || []
    }));
    res.json({ ok: true, count: items.length, items });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/studio/media/:mediaId", async (req, res) => {
  const { mediaId } = req.params;
  if (!MEDIA_ID.test(mediaId)) return photoUnavailable(res);
  const queryToken = typeof req.query.token === "string" ? req.query.token.trim() : "";
  if (!isAdmin(req) && !verifyStudioSessionToken(queryToken)) {
    return res.status(403).json({ ok: false, error: "Unauthorized" });
  }
  try {
    const photo = await getStoredTelegramPhoto(mediaId);
    return photo ? sendTelegramPhoto(res, photo) : photoUnavailable(res);
  } catch {
    return photoUnavailable(res, 503);
  }
});

app.delete("/api/studio/media/:mediaId", requireAdmin, async (req, res) => {
  try {
    const { mediaId } = req.params;
    if (!MEDIA_ID.test(mediaId)) return res.status(400).json({ ok: false, error: "Mã ảnh không hợp lệ." });
    const targetUrl = `/api/telegram/media/${mediaId}`;
    const apartments = await db.getApartments({ includeHidden: true });
    for (const apt of apartments) {
      if (Array.isArray(apt.images) && apt.images.includes(targetUrl)) {
        const nextImages = apt.images.filter((u) => u !== targetUrl);
        await db.updateApartment(apt.code, { images: nextImages });
      }
    }
    await db.removeSiteMediaUrl(targetUrl);
    await deleteStoredTelegramPhoto(mediaId);
    res.json({ ok: true, deletedId: mediaId });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Public & Admin CRUD for About Us (Client Tour Photos, Customer Feedback, Hero & Quote)
async function translateTextAllLangs(rawText) {
  const clean = String(rawText || "").trim();
  const base = { vi: clean, en: clean, zh: clean, ru: clean, ko: clean, ja: clean };
  if (!clean) return base;
  try {
    const results = await Promise.all(
      translationService.TARGET_LANGS.map(async (lang) => {
        const [tr] = await translationService.translateBatch([clean], lang);
        return [lang, tr || clean];
      })
    );
    for (const [lang, val] of results) base[lang] = val;
  } catch {
    // Keep Vietnamese fallback if translation fails
  }
  return base;
}

app.get("/api/site-content/about", async (req, res) => {
  try {
    const about = await db.getAboutContent();
    res.set("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
    res.json({ ok: true, about });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/studio/about", requireAdmin, async (req, res) => {
  try {
    const about = await db.getAboutContent();
    res.set("Cache-Control", "no-store").json({ ok: true, about });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch("/api/studio/about", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const { heroImage, founderName, founderQuote } = req.body || {};
    if (typeof heroImage === "string" && heroImage.trim()) current.heroImage = heroImage.trim();
    if (typeof founderName === "string" && founderName.trim()) current.founderName = founderName.trim();
    if (typeof founderQuote === "string" && founderQuote.trim()) {
      current.founderQuote = await translateTextAllLangs(founderQuote);
    }
    const saved = await db.saveAboutContent(current);
    res.json({ ok: true, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/studio/about/photos", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const { image, images, caption, tag, date } = req.body || {};
    const urls = Array.isArray(images) && images.length ? images : image ? [image] : [];
    const cleanUrls = urls.map((u) => String(u || "").trim()).filter(Boolean);
    if (!cleanUrls.length) return res.status(400).json({ ok: false, error: "Chưa có ảnh nào được chọn." });

    const translatedCaption = caption ? await translateTextAllLangs(caption) : { vi: "", en: "", zh: "", ru: "", ko: "", ja: "" };
    const created = cleanUrls.map((url, idx) => ({
      id: `tour-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      image: url,
      caption: translatedCaption,
      tag: String(tag || "Đà Nẵng · Dẫn khách xem nhà").trim(),
      date: String(date || new Date().toISOString().slice(0, 7)).trim(),
      createdAt: new Date().toISOString()
    }));
    current.clientTourPhotos = [...created, ...(current.clientTourPhotos || [])];
    const saved = await db.saveAboutContent(current);
    res.status(201).json({ ok: true, created, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/studio/about/photos/:id", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const list = [...(current.clientTourPhotos || [])];
    const idx = list.findIndex((p) => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ ok: false, error: "Không tìm thấy ảnh." });

    const { caption, tag, date, image, move } = req.body || {};
    if (move === "left" && idx > 0) {
      [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
    } else if (move === "right" && idx < list.length - 1) {
      [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
    } else {
      const target = { ...list[idx] };
      if (typeof image === "string" && image.trim()) target.image = image.trim();
      if (typeof tag === "string") target.tag = tag.trim();
      if (typeof date === "string") target.date = date.trim();
      if (typeof caption === "string") target.caption = await translateTextAllLangs(caption);
      list[idx] = target;
    }
    current.clientTourPhotos = list;
    const saved = await db.saveAboutContent(current);
    res.json({ ok: true, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/studio/about/photos/:id", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const before = (current.clientTourPhotos || []).length;
    current.clientTourPhotos = (current.clientTourPhotos || []).filter((p) => p.id !== req.params.id);
    if (current.clientTourPhotos.length === before) {
      return res.status(404).json({ ok: false, error: "Không tìm thấy ảnh." });
    }
    const saved = await db.saveAboutContent(current);
    res.json({ ok: true, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/studio/about/testimonials", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const { clientName, subtitle, rating, quote, image, avatar } = req.body || {};
    if (!String(clientName || "").trim()) return res.status(400).json({ ok: false, error: "Vui lòng nhập tên khách hàng." });
    if (!String(quote || "").trim() && !String(image || "").trim()) {
      return res.status(400).json({ ok: false, error: "Vui lòng nhập nội dung nhận xét hoặc tải ảnh feedback." });
    }
    const translatedQuote = await translateTextAllLangs(quote || "");
    const item = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      clientName: String(clientName).trim(),
      subtitle: String(subtitle || "Khách thuê KIN Estates Đà Nẵng").trim(),
      rating: Math.max(1, Math.min(5, Number(rating) || 5)),
      quote: translatedQuote,
      avatar: String(avatar || "").trim(),
      image: String(image || "").trim(),
      createdAt: new Date().toISOString()
    };
    current.testimonials = [item, ...(current.testimonials || [])];
    const saved = await db.saveAboutContent(current);
    res.status(201).json({ ok: true, item, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/studio/about/testimonials/:id", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const list = [...(current.testimonials || [])];
    const idx = list.findIndex((t) => t.id === req.params.id);
    if (idx < 0) return res.status(404).json({ ok: false, error: "Không tìm thấy feedback." });

    const target = { ...list[idx] };
    const { clientName, subtitle, rating, quote, image, avatar } = req.body || {};
    if (typeof clientName === "string" && clientName.trim()) target.clientName = clientName.trim();
    if (typeof subtitle === "string") target.subtitle = subtitle.trim();
    if (rating !== undefined) target.rating = Math.max(1, Math.min(5, Number(rating) || 5));
    if (typeof image === "string") target.image = image.trim();
    if (typeof avatar === "string") target.avatar = avatar.trim();
    if (typeof quote === "string") target.quote = await translateTextAllLangs(quote);
    list[idx] = target;

    current.testimonials = list;
    const saved = await db.saveAboutContent(current);
    res.json({ ok: true, item: target, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/studio/about/testimonials/:id", requireAdmin, async (req, res) => {
  try {
    const current = await db.getAboutContent();
    const before = (current.testimonials || []).length;
    current.testimonials = (current.testimonials || []).filter((t) => t.id !== req.params.id);
    if (current.testimonials.length === before) {
      return res.status(404).json({ ok: false, error: "Không tìm thấy feedback." });
    }
    const saved = await db.saveAboutContent(current);
    res.json({ ok: true, about: saved });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/studio/resolve-map", requireAdmin, async (req, res) => {
  try {
    const raw = String(req.body?.input || "").trim();
    if (!raw) return res.status(400).json({ ok: false, error: "Vui lòng dán link Google Maps hoặc tọa độ." });
    const resolved = await resolveGoogleMapsInput(raw);
    if (!resolved) {
      return res.status(422).json({ ok: false, error: "Chưa đọc được vị trí từ link này. Anh có thể chạm trực tiếp lên bản đồ bên dưới." });
    }
    const areaName = resolved.address ? db.normalizeAreaName(resolved.address) : undefined;
    res.json({
      ok: true,
      address: resolved.address || "",
      coordinates: resolved.coordinates || null,
      areaName
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post("/api/studio/sync-web", requireAdmin, async (req, res) => {
  // Also auto-heal any existing apartments whose address accidentally contains a raw Google Maps link
  const allApts = await db.getApartments({ includeHidden: true });
  let healedCount = 0;
  for (const apt of allApts) {
    if (isMapUrlString(apt.address)) {
      const updated = await db.updateApartment(apt.code, { address: apt.address });
      if (updated && !isMapUrlString(updated.address)) healedCount++;
    }
  }
  const liveStatus = await db.getLiveDbStatus();
  void telegramService.notifyStudioSyncToTelegram?.(liveStatus, healedCount);
  const result = await autoDeployService.syncStoreToLiveWeb("Mobile Studio manual sync");
  res.json({ ok: true, healedCount, liveStatus, result });
});

app.post("/api/studio/seo/ping", requireAdmin, async (req, res) => {
  try {
    const publicApartments = await db.getApartments({ includeHidden: false });
    const pingResult = await indexNowService.submitAllSiteUrlsToSearchEngines(publicApartments);
    res.json({ ok: true, ...pingResult });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Private Mobile Admin Dashboard entry (not linked anywhere on public client website)
app.get(["/kin-studio", "/kin-studio/*"], (req, res) => {
  res.set({
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow"
  });
  res.sendFile(path.join(__dirname, "public", "studio-panel.html"));
});

// Technical SEO & AI Search (GEO): robots.txt, Dynamic MongoDB sitemap.xml, llms.txt
app.get("/robots.txt", (req, res) => {
  const origin = seoService.getSiteOrigin(req);
  res.set({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400"
  });
  res.send(seoService.generateRobotsTxt(origin));
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    await ensureInitialized();
    if (process.env.MONGODB_URI) await db.ensureMongoConnection();
    const origin = seoService.getSiteOrigin(req);
    const apartments = await db.getApartments({ includeHidden: false });
    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600"
    });
    res.send(seoService.generateSitemapXml(origin, apartments));
  } catch {
    res.status(500).type("text/plain").send("Unable to generate sitemap");
  }
});

app.get("/image-sitemap.xml", async (req, res) => {
  try {
    await ensureInitialized();
    if (process.env.MONGODB_URI) await db.ensureMongoConnection();
    const origin = seoService.getSiteOrigin(req);
    const [apartments, about] = await Promise.all([
      db.getApartments({ includeHidden: false }),
      db.getAboutContent().catch(() => null)
    ]);
    res.set({
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600"
    });
    res.send(seoService.generateImageSitemapXml(origin, apartments, about));
  } catch {
    res.status(500).type("text/plain").send("Unable to generate image sitemap");
  }
});

app.get(`/${indexNowService.INDEXNOW_KEY}.txt`, (req, res) => {
  res.set({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, s-maxage=86400"
  });
  res.send(indexNowService.INDEXNOW_KEY);
});

app.get(["/rss.xml", "/feed.xml"], async (req, res) => {
  try {
    await ensureInitialized();
    await db.ensureMongoConnection();
    const origin = seoService.getSiteOrigin(req);
    const apartments = await db.getApartments({ includeHidden: false });
    res.set({
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
    });
    res.send(seoService.generateRssFeedXml(origin, apartments));
  } catch {
    res.status(500).type("text/plain").send("Unable to generate RSS feed");
  }
});

app.get(["/llms.txt", "/llms-full.txt", "/ai.txt"], async (req, res) => {
  try {
    await ensureInitialized();
    await db.ensureMongoConnection();
    const origin = seoService.getSiteOrigin(req);
    const apartments = await db.getApartments({ includeHidden: false });
    res.set({
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600"
    });
    res.send(seoService.generateLlmsTxt(origin, apartments));
  } catch {
    res.status(500).type("text/plain").send("Unable to generate llms.txt");
  }
});

let cachedIndexHtml = null;
function resolveAppShellPath() {
  const shellPath = path.join(__dirname, "public", "app-shell.html");
  if (fs.existsSync(shellPath)) return shellPath;
  return path.join(__dirname, "public", "index.html");
}
function loadBaseIndexHtml() {
  if (!cachedIndexHtml || !process.env.VERCEL) {
    cachedIndexHtml = fs.readFileSync(resolveAppShellPath(), "utf8");
  }
  return cachedIndexHtml;
}

app.get(["/kinestatesdanang", "/kin-estates-da-nang", "/kin-estates"], (req, res) => {
  res.redirect(301, "/");
});

// SPA Fallback with Server-Side Dynamic SEO Meta, 6-Language Sub-Path (/en /ko /zh /ru /ja) Hreflang, OpenGraph & JSON-LD Injection
app.get("*", async (req, res) => {
  try {
    const baseHtml = loadBaseIndexHtml();
    await ensureInitialized();
    await db.ensureMongoConnection();
    const origin = seoService.getSiteOrigin(req);
    const parsed = seoService.parseLocalizedPath(req.path || "/", req.query.lang);
    const lang = parsed.lang;
    const cleanPath = parsed.cleanPath;
    const aptMatch = cleanPath.match(/^\/apartments\/([^/]+)\/?$/i);

    let apartment = null;
    let apartments = [];
    let about = null;

    if (aptMatch) {
      const code = decodeURIComponent(aptMatch[1]);
      const [found, allPublic] = await Promise.all([
        db.getApartmentByCodeOrId(code),
        db.getApartments({ includeHidden: false })
      ]);
      apartments = allPublic;
      if (found && db.isPublicApartment(found)) {
        apartment = found;
      }
    } else if (cleanPath === "/" || /^\/(apartments|areas|property|guides|how-to-rent|about)(\/|$)/i.test(cleanPath)) {
      apartments = await db.getApartments({ includeHidden: false });
    }
    about = await db.getAboutContent().catch(() => null);

    const seoHead = seoService.buildPageSeoHead({ origin, pathname: req.path || "/", lang, apartment, apartments, about });
    const ssrBody = seoService.buildSsrRootMarkup({ origin, pathname: req.path || "/", lang, apartment, apartments, about });
    const html = seoService.injectSeoIntoHtml(baseHtml, seoHead, ssrBody);
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=120"
    });
    res.send(html);
  } catch {
    res.sendFile(resolveAppShellPath());
  }
});

async function startServer() {
  await ensureInitialized();
  if (!process.env.VERCEL) {
    app.listen(PORT, process.env.BIND_HOST, () => {
      console.log(`\n🏛️ KIN ESTATES — Da Nang Private Residences & CRM running at http://localhost:${PORT}`);
    });
  }
}

startServer();

module.exports = app;
