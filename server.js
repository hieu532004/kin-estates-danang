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
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use(express.static(path.join(__dirname, "public")));

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
  res.json({
    ok: true,
    platform: "KIN ESTATES — Da Nang Private Residences & CRM",
    database: db.getDbStatus(),
    telegramBot: telegramService.getBotStatus(),
    settings: {
      hasTelegramToken: Boolean(db.getSettings().telegramBotToken),
      telegramBotTokenMasked: db.getSettings().telegramBotToken
        ? db.getSettings().telegramBotToken.slice(0, 8) + "..."
        : "",
      telegramAdminChatId: db.getSettings().telegramAdminChatId,
      googleSheetsWebhookUrl: db.getSettings().googleSheetsWebhookUrl,
      usdToVndRate: db.getSettings().usdToVndRate,
      hideRentedByDefault: Boolean(db.getSettings().hideRentedByDefault)
    },
    syncLogs: db.getSyncLogs()
  });
});

// 2. Apartments Catalogue & Full CRUD (Supports Public & Admin views)
const handleGetApartments = async (req, res) => {
  try {
    const apartments = await db.getApartments(req.query);
    res.json({
      ok: true,
      count: apartments.length,
      apartments,
      dbStatus: db.getDbStatus()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

app.get("/api/apartments", handleGetApartments);
app.get("/api/properties", handleGetApartments);

app.get("/api/apartments/:id", async (req, res) => {
  const apt = await db.getApartmentByCodeOrId(req.params.id);
  if (!apt) return res.status(404).json({ ok: false, error: "Apartment not found" });
  res.json({ ok: true, apartment: apt });
});

app.post("/api/apartments", async (req, res) => {
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

app.patch("/api/apartments/:id", async (req, res) => {
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

app.delete("/api/apartments/:id", async (req, res) => {
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
app.get("/api/inquiries", async (req, res) => {
  const inquiries = await db.getInquiries(req.query);
  res.json({ ok: true, count: inquiries.length, inquiries });
});

app.post("/api/inquiries", async (req, res) => {
  try {
    const inquiry = await db.createInquiry(req.body);
    await telegramService.notifyNewInquiryToTelegram(inquiry);
    await sheetsService.pushToGoogleSheetsWebhook("new_inquiry", inquiry);
    res.status(201).json({ ok: true, inquiry, inquiries: await db.getInquiries() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.patch("/api/inquiries/:id", async (req, res) => {
  try {
    const updated = await db.updateInquiry(req.params.id, req.body);
    if (!updated) return res.status(404).json({ ok: false, error: "Inquiry not found" });
    await sheetsService.pushToGoogleSheetsWebhook("update_inquiry", updated);
    res.json({ ok: true, inquiry: updated, inquiries: await db.getInquiries() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete("/api/inquiries/:id", async (req, res) => {
  try {
    const deleted = await db.deleteInquiry(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Inquiry not found" });
    res.json({ ok: true, deleted, inquiries: await db.getInquiries() });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Approve an owner_listing inquiry into a published apartment
app.post("/api/inquiries/:id/approve-listing", async (req, res) => {
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

app.post("/api/leases", async (req, res) => {
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

app.patch("/api/leases/:id", async (req, res) => {
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

app.post("/api/leases/:id/checkout", async (req, res) => {
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

app.delete("/api/leases/:id", async (req, res) => {
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
app.get("/api/telegram/history", (req, res) => {
  res.json({
    ok: true,
    status: telegramService.getBotStatus(),
    history: db.getBotHistory(),
    dbStatus: db.getDbStatus()
  });
});

app.post("/api/telegram/command", async (req, res) => {
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

// Telegram Serverless Webhook receiver (for Vercel deployment)
app.post("/api/telegram/webhook", async (req, res) => {
  try {
    await telegramService.handleTelegramWebhookUpdate(req.body || {});
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook error:", err.message);
    res.status(200).json({ ok: false, error: err.message });
  }
});

app.post("/api/telegram/config", async (req, res) => {
  const {
    telegramBotToken,
    telegramAdminChatId,
    googleSheetsWebhookUrl,
    hideRentedByDefault,
    registerWebhook
  } = req.body;

  const settings = db.updateSettings({
    ...(telegramBotToken !== undefined && telegramBotToken.trim() !== ""
      ? { telegramBotToken: telegramBotToken.trim() }
      : {}),
    ...(telegramAdminChatId !== undefined ? { telegramAdminChatId: telegramAdminChatId.trim() } : {}),
    ...(googleSheetsWebhookUrl !== undefined ? { googleSheetsWebhookUrl: googleSheetsWebhookUrl.trim() } : {}),
    ...(hideRentedByDefault !== undefined ? { hideRentedByDefault: Boolean(hideRentedByDefault) } : {})
  });

  const botStatus = telegramService.initTelegramBot(settings.telegramBotToken);
  let webhookInfo = null;

  if (registerWebhook && settings.telegramBotToken) {
    const host = `${req.protocol}://${req.get("host")}`;
    const webhookUrl = `${host}/api/telegram/webhook`;
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${settings.telegramBotToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
      );
      webhookInfo = await r.json();
    } catch (e) {
      webhookInfo = { ok: false, error: e.message };
    }
  }

  res.json({ ok: true, settings, botStatus, webhookInfo });
});

// 7. Excel (.csv with UTF-8 BOM for Microsoft Excel) & Google Sheets 2-Way Sync Endpoints
app.get("/api/excel/apartments.csv", async (req, res) => {
  const csv = await sheetsService.generateApartmentsCsv(true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="KIN_Estates_CanHo.csv"');
  res.send(csv);
});

app.get("/api/excel/inquiries.csv", async (req, res) => {
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

app.get("/api/sheets/export.csv", async (req, res) => {
  const csv = await sheetsService.generateApartmentsCsv(true);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="kin_estates_apartments.csv"');
  res.send(csv);
});

app.get("/api/sheets/apps-script", (req, res) => {
  const host = `${req.protocol}://${req.get("host")}`;
  res.json({
    ok: true,
    csvApartmentsUrl: `${host}/api/excel/apartments.csv`,
    csvInquiriesUrl: `${host}/api/excel/inquiries.csv`,
    csvLeasesUrl: `${host}/api/excel/leases.csv`,
    importDataFormula: `=IMPORTDATA("${host}/api/excel/apartments.csv")`,
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

app.post("/api/excel/import-apartments", async (req, res) => {
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

app.post("/api/excel/import-leases", async (req, res) => {
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
    app.listen(PORT, () => {
      console.log(`\n🏛️ KIN ESTATES — Da Nang Private Residences & CRM running at http://localhost:${PORT}`);
    });
  }
}

startServer();

module.exports = app;
