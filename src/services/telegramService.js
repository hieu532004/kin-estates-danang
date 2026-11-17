const TelegramBot = require("node-telegram-bot-api");
const db = require("../db/database");
const sheetsService = require("./googleSheetsService");

let botInstance = null;
let activeToken = "";

/**
 * Unified Mobile Command Processor
 * Works identically for:
 * 1. Real Telegram Mobile App (via node-telegram-bot-api polling)
 * 2. Built-in Web Mobile Telegram Simulator (so the owner can test & manage right away)
 */
async function processTelegramCommand(rawText, meta = {}) {
  const text = (rawText || "").trim();
  if (!text) return { reply: "Hãy nhập lệnh hoặc chọn nút bên dưới.", buttons: getMainMenuButtons() };

  db.appendBotHistory({
    sender: "user",
    user: meta.username || "Chủ nhà (Mobile)",
    text
  });

  const lower = text.toLowerCase();

  // 1. /start or /menu or /help
  if (lower === "/start" || lower === "/menu" || lower === "/help") {
    const status = db.getDbStatus();
    const reply =
      `🏛️ *KIN ESTATES — Quản Lý Căn Hộ Đà Nẵng Trên Điện Thoại*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• Tổng số căn hộ: *${status.totalApartments} căn*\n` +
      `• Yêu cầu xem phòng: *${status.totalInquiries} khách*\n` +
      `• Database: _${status.isNativeMongoConnected ? "MongoDB Live" : "Mongo-JSON Hybrid"}_\n\n` +
      `📱 *CÁC LỆNH QUẢN LÝ NHANH TRÊN ĐIỆN THOẠI:*\n` +
      `1️⃣ \`/list\` — Xem danh sách & bấm nút Xóa / Đổi trạng thái / Đổi giá\n` +
      `2️⃣ \`/add Tên | Khu vực | Giá USD | Số PN | m2 | Tòa nhà | Mô tả | Link ảnh\` — Đăng bài mới siêu tốc\n` +
      `3️⃣ \`/price MÃ_CĂN GIÁ_MỚI\` — VD: \`/price DN-FIL-2401 1290\`\n` +
      `4️⃣ \`/status MÃ_CĂN\` — Đổi trạng thái (Available / Rented)\n` +
      `5️⃣ \`/delete MÃ_CĂN\` — Xóa bài đăng ngay lập tức\n` +
      `6️⃣ \`/inquiries\` — Xem danh sách khách đặt lịch xem căn hộ\n` +
      `7️⃣ \`/sync\` — Đồng bộ 2 chiều với Google Sheets`;

    const res = { reply, buttons: getMainMenuButtons() };
    recordBotReply(res);
    return res;
  }

  // 2. /list — List all apartments with quick action inline buttons
  if (lower === "/list" || lower.startsWith("/list ")) {
    const apartments = await db.getApartments();
    if (apartments.length === 0) {
      const res = {
        reply: "📭 Hiện chưa có căn hộ nào. Gõ `/add` để đăng căn hộ mới!",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const lines = apartments.map(
      (a, idx) =>
        `${idx + 1}. *[${a.code}]* ${a.title?.vi || a.title?.en}\n` +
        `   📍 ${a.areaName} (${a.building}) | 🛏 ${a.bedrooms}PN • ${a.sizeM2}m²\n` +
        `   💰 *$${a.priceUsd}/tháng* (~${(a.priceVnd / 1000000).toFixed(1)}tr) | Trạng thái: *${a.status}*`
    );

    const inlineButtons = [];
    apartments.slice(0, 8).forEach((a) => {
      inlineButtons.push([
        {
          text: `${a.status === "Available" ? "🟢" : "🔴"} ${a.code}: Đổi TT`,
          callback_data: `/status ${a.code}`
        },
        {
          text: `💲 -50$ (${a.code})`,
          callback_data: `/price ${a.code} ${Math.max(300, a.priceUsd - 50)}`
        },
        {
          text: `🗑️ Xóa ${a.code}`,
          callback_data: `/delete ${a.code}`
        }
      ]);
    });
    inlineButtons.push([{ text: "➕ Đăng căn hộ mẫu nhanh", callback_data: "/quick_demo_add" }]);

    const res = {
      reply: `📋 *DANH SÁCH CĂN HỘ ĐANG QUẢN LÝ (${apartments.length} căn):*\n\n` + lines.join("\n\n"),
      buttons: inlineButtons
    };
    recordBotReply(res);
    return res;
  }

  // 3. /quick_demo_add or /add
  if (lower === "/quick_demo_add") {
    const created = await db.createApartment({
      title: {
        vi: "Peninsula Ocean Studio — Căn Hộ Kiến Trúc Đá Tự Nhiên & Gỗ Sồi",
        en: "Peninsula Ocean Studio — Travertine & White Oak Coastal Suite",
        ru: "Peninsula Ocean Studio — Студия у океана из травертина и дуба"
      },
      building: "Peninsula Da Nang",
      areaName: "My Khe Beachfront",
      priceUsd: 820,
      bedrooms: 1,
      bathrooms: 1,
      sizeM2: 60,
      floor: 22,
      featured: true,
      tags: ["Sea View", "Remote-Work Desk", "Natural Light", "Infinity Pool"],
      images: [
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=85"
      ],
      source: "telegram"
    });
    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);

    const res = {
      reply:
        `✅ *ĐÃ ĐĂNG BÀI MỚI TỪ TELEGRAM THÀNH CÔNG!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Mã căn: *${created.code}*\n` +
        `• Tên: ${created.title.vi}\n` +
        `• Khu vực: ${created.areaName} (${created.building})\n` +
        `• Giá thuê: *$${created.priceUsd}/tháng* • ${created.bedrooms}PN • ${created.sizeM2}m²\n` +
        `• Website & Google Sheets đã tự động cập nhật!`,
      buttons: getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  if (lower.startsWith("/add")) {
    const body = text.replace(/^\/add\s*/i, "").trim();
    if (!body) {
      const res = {
        reply:
          `📝 *HƯỚNG DẪN ĐĂNG BÀI TRÊN TELEGRAM:*\n\n` +
          `Gửi theo cú pháp 1 dòng (ngăn cách bởi dấu \`|\`):\n` +
          `\`/add Tên căn hộ | Khu vực | Giá USD | Số PN | Diện tích m2 | Tòa nhà | Mô tả kiến trúc | Link ảnh\`\n\n` +
          `*Ví dụ chạm để copy:*\n` +
          `\`/add Sơn Trà Sky Loft | Son Tra | 950 | 2 | 75 | Hiyori Garden Tower | Căn góc 2 mặt thoáng view biển Mỹ Khê, nội thất gỗ óc chó | https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200\``,
        buttons: [
          [{ text: "⚡ Đăng nhanh căn mẫu (1 chạm)", callback_data: "/quick_demo_add" }],
          ...getMainMenuButtons()
        ]
      };
      recordBotReply(res);
      return res;
    }

    const parts = body.split("|").map((s) => s.trim());
    const [
      titleVi,
      areaName = "An Thuong",
      priceUsd = "850",
      bedrooms = "1",
      sizeM2 = "65",
      building = "KIN Estates Residence",
      notes = "Thiết kế chuẩn studio kiến trúc, ánh sáng tự nhiên ngập tràn.",
      imageUrl = ""
    ] = parts;

    const created = await db.createApartment({
      title: {
        vi: titleVi,
        en: titleVi,
        ru: titleVi
      },
      areaName: normalizeAreaName(areaName),
      priceUsd: Number(priceUsd) || 850,
      bedrooms: Number(bedrooms) || 1,
      sizeM2: Number(sizeM2) || 65,
      building,
      architecturalNotes: {
        vi: notes,
        en: notes,
        ru: notes
      },
      images: imageUrl ? [imageUrl] : undefined,
      featured: true,
      source: "telegram"
    });

    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);

    const res = {
      reply:
        `🎉 *ĐĂNG BÀI THÀNH CÔNG LÊN WEBSITE & MONGODB!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Mã căn: *${created.code}*\n` +
        `• Tiêu đề: *${created.title.vi}*\n` +
        `• Khu vực: ${created.areaName} — ${created.building}\n` +
        `• Thông số: *${created.bedrooms} PN • ${created.sizeM2}m² • $${created.priceUsd}/tháng*\n` +
        `• Đồng bộ Google Sheets: *Đã cập nhật*`,
      buttons: getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 4. /delete <code_or_id>
  if (lower.startsWith("/delete") || lower.startsWith("/xoa")) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      const res = {
        reply: "⚠️ Vui lòng nhập mã căn hộ cần xóa. Ví dụ: `/delete DN-FIL-2401` hoặc gõ `/list` để bấm nút Xóa.",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const removed = await db.deleteApartment(code);
    if (!removed) {
      const res = {
        reply: `❌ Không tìm thấy căn hộ có mã *${code}*. Gõ \`/list\` để kiểm tra lại.`,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    await sheetsService.pushToGoogleSheetsWebhook("delete_apartment", { code: removed.code });
    const res = {
      reply: `🗑️ *ĐÃ XÓA BÀI ĐĂNG:* \`${removed.code}\` — _${removed.title?.vi || removed.title?.en}_ khỏi Website & Database!`,
      buttons: getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 5. /status <code_or_id> [Available|Rented|Reserved]
  if (lower.startsWith("/status")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    const target = await db.getApartmentByCodeOrId(code);
    if (!target) {
      const res = {
        reply: "⚠️ Không tìm thấy mã căn hộ. Ví dụ: `/status DN-FIL-2401`",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const nextStatus = parts[2] || (target.status === "Available" ? "Rented" : "Available");
    const updated = await db.updateApartment(code, { status: nextStatus });
    await sheetsService.pushToGoogleSheetsWebhook("update_status", updated);
    const res = {
      reply: `🔄 *ĐÃ CẬP NHẬT TRẠNG THÁI:* Căn *${updated.code}* chuyển sang *${updated.status}*!`,
      buttons: getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 6. /price <code_or_id> <new_usd>
  if (lower.startsWith("/price")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    const newPrice = Number(parts[2]);
    if (!code || !newPrice) {
      const res = {
        reply: "⚠️ Cú pháp đổi giá: `/price MÃ_CĂN GIÁ_USD_MỚI` (VD: `/price DN-FIL-2401 1250`)",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const updated = await db.updateApartment(code, { priceUsd: newPrice });
    if (!updated) {
      const res = {
        reply: `❌ Không tìm thấy căn hộ mã *${code}*.`,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    await sheetsService.pushToGoogleSheetsWebhook("update_price", updated);
    const res = {
      reply: `💰 *ĐÃ CẬP NHẬT GIÁ THUÊ:* Căn *${updated.code}* hiện có giá *$${updated.priceUsd}/tháng* (~${(updated.priceVnd / 1000000).toFixed(1)} triệu VNĐ).`,
      buttons: getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 7. /inquiries — View customer leads
  if (lower.startsWith("/inquiries") || lower.startsWith("/khach")) {
    const inquiries = await db.getInquiries();
    if (inquiries.length === 0) {
      const res = {
        reply: "📭 Chưa có yêu cầu đặt lịch xem phòng nào mới.",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const lines = inquiries.slice(0, 6).map(
      (inq, i) =>
        `${i + 1}. 👤 *${inq.clientName}* (${inq.messenger}: \`${inq.contactHandle}\`)\n` +
        `   🏠 Quan tâm: *${inq.apartmentCode}* | Ngân sách: ${inq.budgetUsd}\n` +
        `   📅 Nhận phòng: ${inq.moveInDate} (${inq.leaseDuration})\n` +
        `   💬 _"${inq.notes || "Muốn nhận danh sách căn hộ phù hợp"}"_`
    );
    const res = {
      reply: `📬 *DANH SÁCH KHÁCH ĐẶT LỊCH / YÊU CẦU SHORTLIST (${inquiries.length}):*\n\n` + lines.join("\n\n"),
      buttons: getMainMenuButtons()
    };
    recordBotReply(res);
    return res;
  }

  // 8. /sync — Sync with Google Sheets
  if (lower.startsWith("/sync")) {
    const syncRes = await sheetsService.pushToGoogleSheetsWebhook("manual_sync", {});
    const res = {
      reply:
        `📊 *ĐỒNG BỘ GOOGLE SHEETS HOÀN TẤT!*\n` +
        `• Trạng thái: *${syncRes.mode === "feed_ready" ? "Live CSV/JSON Feed Sẵn Sàng" : "Đã đẩy lên Webhook Google Sheets"}*\n` +
        `• Chi tiết: ${syncRes.message || "Tất cả căn hộ đã đồng bộ."}`,
      buttons: getMainMenuButtons()
    };
    recordBotReply(res);
    return res;
  }

  const fallback = {
    reply:
      `🤖 Lệnh không xác định. Anh có thể chọn các nút bên dưới hoặc gõ \`/menu\`, \`/list\`, \`/add\`, \`/delete\`, \`/inquiries\`, \`/sync\`.`,
    buttons: getMainMenuButtons()
  };
  recordBotReply(fallback);
  return fallback;
}

function normalizeAreaName(input = "") {
  const s = input.toLowerCase();
  if (s.includes("an thuong") || s.includes("an thượng")) return "An Thuong";
  if (s.includes("son tra") || s.includes("sơn trà")) return "Son Tra";
  if (s.includes("han") || s.includes("hàn") || s.includes("hai chau")) return "Han Riverfront";
  if (s.includes("my khe") || s.includes("mỹ khê") || s.includes("beach")) return "My Khe Beachfront";
  return input || "An Thuong";
}

function getMainMenuButtons() {
  return [
    [
      { text: "📋 Danh sách căn hộ (/list)", callback_data: "/list" },
      { text: "➕ Đăng căn mới (/add)", callback_data: "/add" }
    ],
    [
      { text: "📬 Khách đặt lịch (/inquiries)", callback_data: "/inquiries" },
      { text: "📊 Đồng bộ Google Sheet (/sync)", callback_data: "/sync" }
    ]
  ];
}

function recordBotReply(res) {
  db.appendBotHistory({
    sender: "bot",
    user: "KIN Estates Bot",
    text: res.reply,
    buttons: res.buttons || []
  });
}

async function notifyNewInquiryToTelegram(inquiry) {
  const msg =
    `🔔 *KHÁCH HÀNG MỚI ĐẶT LỊCH TRÊN WEBSITE!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 Khách hàng: *${inquiry.clientName}*\n` +
    `📱 Liên hệ (${inquiry.messenger}): \`${inquiry.contactHandle}\`\n` +
    `🏠 Căn hộ / Loại: *${inquiry.apartmentCode}* (${inquiry.apartmentTitle})\n` +
    `💰 Ngân sách: *${inquiry.budgetUsd}* | 🛏 ${inquiry.bedrooms}\n` +
    `📅 Ngày dọn vào: *${inquiry.moveInDate}* (${inquiry.leaseDuration})\n` +
    `📝 Ghi chú: _${inquiry.notes || "Không có"}_`;

  db.appendBotHistory({
    sender: "bot",
    user: "KIN Estates Bot (Push Alert)",
    text: msg,
    buttons: getMainMenuButtons()
  });

  const settings = db.getSettings();
  const chatId = settings.telegramAdminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (botInstance && chatId) {
    try {
      await botInstance.sendMessage(chatId, msg, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Failed to push Telegram message:", err.message);
    }
  }
}

function initTelegramBot(customToken) {
  const settings = db.getSettings();
  const token = customToken || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.trim() === "") {
    console.log("ℹ Telegram Bot running in Web Mobile Simulator + Webhook Ready mode (Add TELEGRAM_BOT_TOKEN to connect live @BotFather polling).");
    if (db.getBotHistory().length === 0) {
      processTelegramCommand("/start", { username: "Admin Mobile" });
    }
    return { active: false, mode: "Simulator + Webhook Ready" };
  }

  if (botInstance && activeToken === token) {
    return { active: true, mode: "Live Telegram Polling Connected" };
  }

  try {
    if (botInstance) {
      botInstance.stopPolling();
    }
    botInstance = new TelegramBot(token, { polling: true });
    activeToken = token;

    botInstance.on("message", async (msg) => {
      const chatId = msg.chat.id;
      if (!db.getSettings().telegramAdminChatId) {
        db.updateSettings({ telegramAdminChatId: String(chatId) });
      }
      const rawText = msg.caption || msg.text || "/menu";
      const result = await processTelegramCommand(rawText, {
        username: msg.from?.username || msg.from?.first_name || "Telegram User"
      });
      await botInstance.sendMessage(chatId, result.reply, {
        parse_mode: "Markdown",
        reply_markup: result.buttons ? { inline_keyboard: result.buttons } : undefined
      });
    });

    botInstance.on("callback_query", async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;
      const result = await processTelegramCommand(data, {
        username: query.from?.username || "Telegram Admin"
      });
      await botInstance.answerCallbackQuery(query.id);
      await botInstance.sendMessage(chatId, result.reply, {
        parse_mode: "Markdown",
        reply_markup: result.buttons ? { inline_keyboard: result.buttons } : undefined
      });
    });

    console.log("✓ Live Telegram Bot Polling started successfully!");
    return { active: true, mode: "Live Telegram Polling Connected" };
  } catch (err) {
    console.error("Telegram Bot initialization error:", err.message);
    return { active: false, mode: `Error: ${err.message}` };
  }
}

function getBotStatus() {
  return {
    connected: Boolean(botInstance),
    mode: botInstance ? "Live Telegram Bot Polling (@BotFather Connected)" : "Interactive Mobile Simulator + Instant Token Connect",
    hasToken: Boolean(activeToken || db.getSettings().telegramBotToken),
    adminChatId: db.getSettings().telegramAdminChatId || "Auto-detected on first /start"
  };
}

module.exports = {
  initTelegramBot,
  processTelegramCommand,
  notifyNewInquiryToTelegram,
  getBotStatus
};
