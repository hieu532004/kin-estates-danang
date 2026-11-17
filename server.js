require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./src/db/database");
const telegramService = require("./src/services/telegramService");
const sheetsService = require("./src/services/googleSheetsService");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// 1. System & Architecture Status
app.get("/api/system/status", async (req, res) => {
  res.json({
    ok: true,
    platform: "KIN ESTATES — Da Nang Architectural Living",
    referenceBenchmark: "https://dananghomii.com/en/",
    specKitIntegrated: true,
    database: db.getDbStatus(),
    telegramBot: telegramService.getBotStatus(),
    settings: {
      hasTelegramToken: Boolean(db.getSettings().telegramBotToken),
      telegramAdminChatId: db.getSettings().telegramAdminChatId,
      googleSheetsWebhookUrl: db.getSettings().googleSheetsWebhookUrl,
      usdToVndRate: db.getSettings().usdToVndRate
    },
    syncLogs: db.getSyncLogs()
  });
});

// 2. Apartments Catalogue & CRUD
app.get("/api/apartments", async (req, res) => {
  try {
    const apartments = await db.getApartments(req.query);
    res.json({ ok: true, count: apartments.length, apartments });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/apartments/:id", async (req, res) => {
  const apt = await db.getApartmentByCodeOrId(req.params.id);
  if (!apt) return res.status(404).json({ ok: false, error: "Apartment not found" });
  res.json({ ok: true, apartment: apt });
});

app.post("/api/apartments", async (req, res) => {
  try {
    const created = await db.createApartment(req.body);
    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);
    res.status(201).json({ ok: true, apartment: created });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/apartments/:id", async (req, res) => {
  try {
    const updated = await db.updateApartment(req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: "Apartment not found" });
    await sheetsService.pushToGoogleSheetsWebhook("update_apartment", updated);
    res.json({ ok: true, apartment: updated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/apartments/:id", async (req, res) => {
  try {
    const deleted = await db.deleteApartment(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Apartment not found" });
    await sheetsService.pushToGoogleSheetsWebhook("delete_apartment", { code: deleted.code });
    res.json({ ok: true, deleted });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 3. Buildings Market Index & Neighborhood Guides (Danang Homii Core Features)
app.get("/api/buildings", (req, res) => {
  res.json({ ok: true, buildings: db.getBuildings() });
});

app.get("/api/neighborhoods", (req, res) => {
  res.json({ ok: true, neighborhoods: db.getNeighborhoods() });
});

// 4. Inquiries (Personal Shortlist, Viewing Booking & Landlord Submissions)
app.get("/api/inquiries", async (req, res) => {
  const inquiries = await db.getInquiries();
  res.json({ ok: true, inquiries });
});

app.post("/api/inquiries", async (req, res) => {
  try {
    const inquiry = await db.createInquiry(req.body);
    await telegramService.notifyNewInquiryToTelegram(inquiry);
    await sheetsService.pushToGoogleSheetsWebhook("new_inquiry", inquiry);
    res.status(201).json({ ok: true, inquiry });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 5. Telegram Bot Mobile Management Endpoints
app.get("/api/telegram/history", (req, res) => {
  res.json({
    ok: true,
    status: telegramService.getBotStatus(),
    history: db.getBotHistory()
  });
});

app.post("/api/telegram/command", async (req, res) => {
  try {
    const { command, username } = req.body;
    const result = await telegramService.processTelegramCommand(command, {
      username: username || "Chủ nhà (Điện thoại)"
    });
    res.json({
      ok: true,
      result,
      history: db.getBotHistory(),
      apartments: await db.getApartments()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/api/telegram/config", (req, res) => {
  const { telegramBotToken, telegramAdminChatId, googleSheetsWebhookUrl } = req.body;
  const settings = db.updateSettings({
    ...(telegramBotToken !== undefined ? { telegramBotToken: telegramBotToken.trim() } : {}),
    ...(telegramAdminChatId !== undefined ? { telegramAdminChatId: telegramAdminChatId.trim() } : {}),
    ...(googleSheetsWebhookUrl !== undefined ? { googleSheetsWebhookUrl: googleSheetsWebhookUrl.trim() } : {})
  });
  const botStatus = telegramService.initTelegramBot(settings.telegramBotToken);
  res.json({ ok: true, settings, botStatus });
});

// 6. Google Sheets 2-Way Integration Endpoints
app.get("/api/sheets/export.csv", async (req, res) => {
  const csv = await sheetsService.generateApartmentsCsv();
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="kin_atelier_apartments.csv"');
  res.send(csv);
});

app.get("/api/sheets/apps-script", (req, res) => {
  const host = `${req.protocol}://${req.get("host")}`;
  res.json({
    ok: true,
    csvFeedUrl: `${host}/api/sheets/export.csv`,
    importDataFormula: `=IMPORTDATA("${host}/api/sheets/export.csv")`,
    appsScriptCode: sheetsService.getGoogleAppsScriptTemplate(host),
    syncLogs: db.getSyncLogs()
  });
});

app.post("/api/sheets/sync", async (req, res) => {
  const result = await sheetsService.pushToGoogleSheetsWebhook("manual_sync", {});
  res.json({ ok: true, result, syncLogs: db.getSyncLogs() });
});

app.post("/api/sheets/import", async (req, res) => {
  try {
    const result = await sheetsService.importRowsFromSheetPayload(req.body.rows || []);
    res.json({ ok: true, result, apartments: await db.getApartments() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// SPA Fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let dbInitialized = false;
async function ensureInitialized() {
  if (!dbInitialized) {
    await db.initDatabase();
    if (!process.env.VERCEL) {
      telegramService.initTelegramBot();
    }
    dbInitialized = true;
  }
}

async function startServer() {
  await ensureInitialized();
  if (!process.env.VERCEL) {
    app.listen(PORT, () => {
      console.log(`\n🏛️ KIN ESTATES — Da Nang Architectural Living running at http://localhost:${PORT}`);
    });
  }
}

startServer();

module.exports = app;
