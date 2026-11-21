require("dotenv").config();
const path = require("path");
const { timingSafeEqual } = require("node:crypto");
const express = require("express");
const cors = require("cors");
const db = require("./src/db/database");
const telegramService = require("./src/services/telegramService");
const { createPublicInquiry, isAnonymousContactClick } = require("./src/services/apartmentCrmService");
const {
  storeTelegramPhoto, getStoredTelegramPhoto, MEDIA_ID, FILE_ID
} = require("./src/services/telegramMediaService");
const sheetsService = require("./src/services/googleSheetsService");

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

function isAdmin(req) {
  const token = process.env.KIN_ADMIN_API_TOKEN;
  return (token && safeMatch(req.get("authorization"), `Bearer ${token}`)) || isLocalAdmin(req);
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
app.use(express.static(path.join(__dirname, "public")));

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

// Middleware to ensure DB is initialized on every API call (including Vercel Serverless cold starts)
app.use("/api", async (req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err) {
    next(err);
  }
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
    database: db.getDbStatus(),
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
  "_id", "code", "title", "building", "address", "areaName", "district", "priceUsd", "priceVnd",
  "bedrooms", "bathrooms", "sizeM2", "floor", "orientation", "minLeaseMonths", "depositMonths",
  "electricityRate", "waterRate", "wifiIncluded", "naturalLightScore", "remoteWorkSetup", "petPolicy",
  "status", "availableFrom", "isVisible", "featured", "locationAccuracy", "coordinates", "architecturalNotes", "tags", "images", "createdAt", "updatedAt"
];

function publicApartment(apartment) {
  return Object.fromEntries(PUBLIC_APARTMENT_FIELDS.map((field) => [field, apartment[field]]));
}

const handleGetApartments = async (req, res) => {
  try {
    const admin = isAdmin(req);
    const filters = admin ? req.query : { ...req.query, includeHidden: false, admin: false };
    const apartments = await db.getApartments(filters);
    res.vary("Authorization");
    if (admin) res.set("Cache-Control", "no-store");
    res.json({
      ok: true,
      count: apartments.length,
      apartments: admin ? apartments : apartments.map(publicApartment),
      dbStatus: db.getDbStatus()
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
  const apt = await db.getApartmentByCodeOrId(req.params.id);
  if (!apt || (!db.isPublicApartment(apt) && !admin)) {
    return res.status(404).json({ ok: false, error: "Apartment not found" });
  }
  res.json({ ok: true, apartment: admin ? apt : publicApartment(apt) });
});

app.post("/api/apartments", requireAdmin, async (req, res) => {
  try {
    const created = await db.createApartment(req.body);
    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);
    res.status(201).json({
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
    await sheetsService.pushToGoogleSheetsWebhook("update_apartment", updated);
    res.json({
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
    await sheetsService.pushToGoogleSheetsWebhook("delete_apartment", { code: deleted.code });
    res.json({
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
  res.json({ ok: true, buildings: db.getBuildings() });
});

app.get("/api/neighborhoods", (req, res) => {
  res.json({ ok: true, neighborhoods: db.getNeighborhoods() });
});

// 4. Inquiries / Customer Leads / Viewing Schedule / Landlord Submissions CRUD
app.get("/api/inquiries", requireAdmin, async (req, res) => {
  const inquiries = await db.getInquiries(req.query);
  res.json({ ok: true, count: inquiries.length, inquiries });
});

app.post("/api/inquiries", async (req, res) => {
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
app.get("/api/leases", async (req, res) => {
  const leases = await db.getLeases(req.query);
  res.json({ ok: true, count: leases.length, leases });
});

app.post("/api/leases", requireAdmin, async (req, res) => {
  try {
    const lease = await db.createLease(req.body);
    await sheetsService.pushToGoogleSheetsWebhook("create_lease", lease);
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
    const updated = await db.updateLease(req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: "Lease not found" });
    await sheetsService.pushToGoogleSheetsWebhook("update_lease", updated);
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
    const lease = await db.getLeaseByCodeOrId(req.params.id);
    const aptCode = lease ? lease.apartmentCode : req.params.id;
    if (lease) {
      await db.updateLease(lease.code, { status: "Ended" });
    }
    await db.updateApartment(aptCode, {
      status: "Available",
      isVisible: true,
      currentTenant: null
    });
    await sheetsService.pushToGoogleSheetsWebhook("checkout_lease", { apartmentCode: aptCode });
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
    const deleted = await db.deleteLease(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Lease not found" });
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
app.get("/api/telegram/history", requireAdmin, (req, res) => {
  res.json({
    ok: true,
    status: telegramService.getBotStatus(),
    history: db.getBotHistory(),
    dbStatus: db.getDbStatus()
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
      dbStatus: db.getDbStatus()
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
    if (!await db.hasPublicApartmentPhoto([`/api/telegram/media/${mediaId}`])) return photoUnavailable(res);
    const photo = await getStoredTelegramPhoto(mediaId);
    return photo ? sendTelegramPhoto(res, photo) : photoUnavailable(res);
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

app.get("/api/excel/leases.csv", async (req, res) => {
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

app.post("/api/sheets/sync", async (req, res) => {
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

// SPA Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
