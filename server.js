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

// Proxy route to serve photos uploaded directly from phone via Telegram Bot (Zero external link needed)
app.get("/api/telegram/photo/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const token =
      db.getSettings().telegramBotToken ||
      process.env.TELEGRAM_BOT_TOKEN ||
      "";
    if (!token || !fileId) {
      return res.redirect("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85");
    }
    const fRes = await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
    );
    const fJson = await fRes.json();
    if (!fJson.ok || !fJson.result?.file_path) {
      return res.redirect("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85");
    }
    const imgRes = await fetch(
      `https://api.telegram.org/file/bot${token}/${fJson.result.file_path}`
    );
    if (!imgRes.ok) {
      return res.redirect("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85");
    }
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await imgRes.arrayBuffer();
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("Telegram photo proxy error:", err.message);
    return res.redirect("https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85");
  }
});

// 1-Click Telegram Bot Activator & Webhook Setup Utility (/api/telegram/connect)
app.get("/api/telegram/connect", async (req, res) => {
  const token = String(req.query.token || "").trim();
  const chatId = String(req.query.chatId || "").trim();
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host");
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const webhookUrl = `${proto}://${host}/api/telegram/webhook`;

  let resultHtml = "";
  if (token) {
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meJson = await meRes.json();
      if (!meJson.ok) {
        resultHtml = `<div style="background:#fef2f2;border:1px solid #ef4444;color:#991b1b;padding:16px;border-radius:12px;margin-bottom:20px;">❌ <b>Token không hợp lệ:</b> ${meJson.description || "Vui lòng kiểm tra lại Token từ @BotFather"}</div>`;
      } else {
        db.updateSettings({
          telegramBotToken: token,
          ...(chatId ? { telegramAdminChatId: chatId } : {})
        });
        await telegramService.registerTelegramBotCommands(token);
        let hookDesc = "Đang chạy chế độ Local Polling trực tiếp";
        if (!isLocal) {
          const whRes = await fetch(
            `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
          );
          const whJson = await whRes.json();
          hookDesc = whJson.description || "Webhook connected";
        } else {
          await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
          telegramService.initTelegramBot(token);
        }
        const botUser = meJson.result.username;
        resultHtml = `
          <div style="background:#ecfdf5;border:1px solid #10b981;color:#065f46;padding:20px;border-radius:14px;margin-bottom:24px;">
            <h3 style="margin:0 0 8px 0;font-size:18px;">✅ Đã kết nối Bot @${botUser} thành công!</h3>
            <p style="margin:0 0 6px 0;font-size:14px;">• <b>Tên Bot:</b> ${meJson.result.first_name} (@${botUser})</p>
            <p style="margin:0 0 6px 0;font-size:14px;">• <b>Trạng thái Webhook:</b> ${hookDesc}</p>
            <p style="margin:0 0 16px 0;font-size:14px;">• <b>Menu lệnh tiếng Việt (/wizard, /list, /excel...):</b> Đã cài tự động vào Bot</p>
            <a href="https://t.me/${botUser}?start=admin" target="_blank" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;font-size:14px;">🚀 Mở Bot @${botUser} trên Telegram & Bấm Start ngay →</a>
          </div>
        `;
      }
    } catch (e) {
      resultHtml = `<div style="background:#fef2f2;border:1px solid #ef4444;color:#991b1b;padding:16px;border-radius:12px;margin-bottom:20px;">❌ Lỗi kết nối: ${e.message}</div>`;
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Kết nối Bot Telegram — KIN Estates</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8f6f2; color: #14191f; margin: 0; padding: 24px; display: flex; justify-content: center; }
    .card { max-width: 580px; width: 100%; background: #fff; border-radius: 20px; padding: 28px; box-shadow: 0 18px 45px rgba(15,23,42,0.08); border: 1px solid rgba(15,23,42,0.08); }
    input { width: 100%; box-sizing: border-box; padding: 13px 15px; border-radius: 12px; border: 1px solid #cbd5e1; font-size: 14px; margin-top: 6px; margin-bottom: 16px; }
    button { width: 100%; background: #14191f; color: #fff; border: none; padding: 14px; border-radius: 999px; font-size: 15px; font-weight: 700; cursor: pointer; }
    button:hover { background: #29323d; }
    .step { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 16px; font-size: 13.5px; line-height: 1.55; }
    code { background: #e2e8f0; padding: 2px 6px; border-radius: 5px; font-size: 12.5px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:#9a7b4f;text-transform:uppercase;margin-bottom:6px;">KIN ESTATES • PRIVATE TELEGRAM BOT CONNECTOR</div>
    <h2 style="margin:0 0 12px 0;font-size:22px;">Kích hoạt Bot Quản Lý trên Điện Thoại</h2>
    ${resultHtml}
    <div class="step">
      <b>Bước 1:</b> Mở Telegram tìm <a href="https://t.me/BotFather" target="_blank"><b>@BotFather</b></a> → Gửi <code>/newbot</code> → Đặt tên Bot → Copy mã <b>HTTP API Token</b>.<br/>
      <b>Bước 2:</b> Dán mã Token vào ô bên dưới và bấm <b>Kết nối & Kích hoạt Bot ngay</b>. Hệ thống sẽ tự động cài đặt Webhook và Menu lệnh cho tài khoản <b>@KIN_Estates</b> của anh!
    </div>
    <form method="GET" action="/api/telegram/connect">
      <label style="font-size:13px;font-weight:600;">Telegram Bot Token (Từ @BotFather)</label>
      <input type="text" name="token" placeholder="Ví dụ: 7891234567:AAFl0XYZ..." value="${token}" required />
      <label style="font-size:13px;font-weight:600;">Admin Chat ID (Không bắt buộc — Tự động nhận khi anh bấm /start)</label>
      <input type="text" name="chatId" placeholder="Tự động nhận diện @KIN_Estates khi anh nhắn /start" value="${chatId || db.getSettings().telegramAdminChatId || ""}" />
      <button type="submit">⚡ Kết nối & Kích hoạt Bot Telegram ngay →</button>
    </form>
  </div>
</body>
</html>`);
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
    app.listen(PORT, process.env.BIND_HOST, () => {
      console.log(`\n🏛️ KIN ESTATES — Da Nang Private Residences & CRM running at http://localhost:${PORT}`);
    });
  }
}

startServer();

module.exports = app;
