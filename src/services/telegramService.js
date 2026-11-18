const TelegramBot = require("node-telegram-bot-api");
const db = require("../db/database");
const sheetsService = require("./googleSheetsService");

let botInstance = null;
let activeToken = "";

/**
 * KIN ESTATES — All-In-One Telegram Bot Real Estate & CRM Management Engine
 * Features:
 * 1. Full Apartment CRUD:
 *    - Step-by-step interactive wizard (/wizard)
 *    - Natural multi-line template parser (/form or "ĐĂNG CĂN HỘ")
 *    - 1-line fast add (/add)
 *    - Photo upload support from Telegram mobile gallery
 *    - 1-click Hide/Show (/hide, /show), Status toggle (Available / Reserved / Rented), Price edit (/price), Field edit (/edit), Delete (/delete)
 * 2. Instant Admin Notifications when clients submit viewing forms, shortlist forms, landlord submissions, or click contact buttons
 * 3. Customer & Viewing Schedule Management (/leads, /appointments, /owners) with 1-click status updates & 1-click approve landlord listing
 * 4. Active Tenant & Lease Expiration Management (/tenants, /rent, /checkout) — tracks who rents which unit, start/end dates, remaining days, and 1-click checkout to reopen unit
 * 5. Excel (.csv UTF-8 BOM) & Google Sheets 2-Way Sync (/excel, /sync)
 */

function parseMultilineListingText(text = "") {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const data = {};
  for (const line of lines) {
    const m = line.match(/^([^:：]+)[:：]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const val = m[2].trim();

    if (key.includes("mã") || key === "code" || key === "id") data.code = val.toUpperCase();
    else if (key.includes("tên") || key.includes("tiêu đề") || key === "title" || key === "name") data.title = val;
    else if (key.includes("tòa") || key.includes("toa") || key === "building" || key.includes("dự án")) data.building = val;
    else if (key.includes("khu") || key === "area") data.areaName = db.normalizeAreaName(val);
    else if (key.includes("địa chỉ") || key.includes("dia chi") || key === "address") data.address = val;
    else if (key.includes("quận") || key === "district") data.district = val;
    else if (key.includes("giá") || key.includes("gia") || key === "price") data.price = val;
    else if (key.includes("phòng ngủ") || key.includes("phong ngu") || key === "pn" || key === "bedrooms" || key === "br") data.bedrooms = parseInt(val, 10) || 1;
    else if (key.includes("phòng tắm") || key.includes("wc") || key === "bathrooms") data.bathrooms = parseInt(val, 10) || 1;
    else if (key.includes("diện tích") || key.includes("dien tich") || key === "m2" || key === "size") data.sizeM2 = parseFloat(val) || 60;
    else if (key.includes("tầng") || key.includes("tang") || key === "floor") data.floor = parseInt(val, 10) || 10;
    else if (key.includes("hướng") || key === "orientation") data.orientation = val;
    else if (key.includes("điện") || key === "electricity") data.electricityRate = val;
    else if (key.includes("nước") || key === "water") data.waterRate = val;
    else if (key.includes("thú cưng") || key.includes("pet")) data.petPolicy = val;
    else if (key.includes("mô tả") || key.includes("mo ta") || key.includes("chi tiết") || key === "description" || key === "notes") data.architecturalNotes = val;
    else if (key.includes("tiện ích") || key.includes("tag")) data.tags = val;
    else if (key.includes("ảnh") || key.includes("anh") || key.includes("image") || key.includes("hình") || key.includes("photo")) data.images = val;
    else if (key.includes("chủ nhà") || key.includes("landlord")) data.landlordName = val;
    else if (key.includes("sđt chủ") || key.includes("phone")) data.landlordPhone = val;
    else if (key.includes("trạng thái") || key === "status") data.status = val;
  }
  return data;
}

function calcDaysRemaining(endDateStr) {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  return diff;
}

function getMainMenuButtons() {
  return [
    [
      { text: "🏠 Kho Căn hộ (/list)", callback_data: "/list" },
      { text: "➕ Đăng từng bước (/wizard)", callback_data: "/wizard" }
    ],
    [
      { text: "📝 Mẫu đăng nhanh (/form)", callback_data: "/form" },
      { text: "🟢 Căn đang trống (/empty)", callback_data: "/empty" }
    ],
    [
      { text: "📅 Khách & Lịch hẹn (/leads)", callback_data: "/leads" },
      { text: "🔑 Khách đang thuê (/tenants)", callback_data: "/tenants" }
    ],
    [
      { text: "🏡 Phòng ký gửi (/owners)", callback_data: "/owners" },
      { text: "📊 File Excel & Sync (/excel)", callback_data: "/excel" }
    ]
  ];
}

function getApartmentControlButtons(apt) {
  const isAvailable = apt.status === "Available";
  const isVisible = apt.isVisible !== false && apt.status !== "Hidden";
  return [
    [
      {
        text: isAvailable ? "🔴 Đổi sang: Đã thuê" : "🟢 Đổi sang: Đang trống",
        callback_data: `/status ${apt.code} ${isAvailable ? "Rented" : "Available"}`
      },
      {
        text: isVisible ? "🙈 Ẩn khỏi Web" : "👁️ Hiện lên Web",
        callback_data: isVisible ? `/hide ${apt.code}` : `/show ${apt.code}`
      }
    ],
    [
      {
        text: `💲 -50$ ($${Math.max(200, apt.priceUsd - 50)})`,
        callback_data: `/price ${apt.code} ${Math.max(200, apt.priceUsd - 50)}`
      },
      {
        text: `💲 +50$ ($${apt.priceUsd + 50})`,
        callback_data: `/price ${apt.code} ${apt.priceUsd + 50}`
      },
      {
        text: "🟡 Đã cọc",
        callback_data: `/status ${apt.code} Reserved`
      }
    ],
    [
      {
        text: "🔑 Gán khách thuê căn này",
        callback_data: `/rent_prompt ${apt.code}`
      },
      {
        text: `🗑️ Xóa ${apt.code}`,
        callback_data: `/delete ${apt.code}`
      }
    ],
    [{ text: "⬅️ Quay lại danh sách (/list)", callback_data: "/list" }]
  ];
}

async function processTelegramCommand(rawText, meta = {}) {
  const text = (rawText || "").trim();
  const userKey = String(meta.chatId || meta.username || "admin");

  if (!text && (!meta.photoUrls || meta.photoUrls.length === 0)) {
    return {
      reply: "Hãy nhập lệnh hoặc chọn các nút chức năng bên dưới.",
      buttons: getMainMenuButtons()
    };
  }

  db.appendBotHistory({
    sender: "user",
    user: meta.username || "Admin (Telegram)",
    text: text || `[Gửi ${meta.photoUrls?.length || 1} ảnh căn hộ]`
  });

  const lower = text.toLowerCase();

  // Check if user is canceling wizard
  if (lower === "/cancel" || lower === "hủy" || lower === "huy") {
    db.setWizardSession(userKey, null);
    const res = {
      reply: "✅ Đã thoát chế độ nhập từng bước. Anh chọn chức năng bên dưới nhé:",
      buttons: getMainMenuButtons()
    };
    recordBotReply(res);
    return res;
  }

  // Check if user is inside interactive /wizard session (and did not type another slash command except /wizard_done)
  const activeWizard = db.getWizardSession(userKey);
  if (
    activeWizard &&
    (!text.startsWith("/") || lower.startsWith("/wiz_"))
  ) {
    const wizRes = await handleWizardStep(userKey, activeWizard, text, meta);
    recordBotReply(wizRes);
    return wizRes;
  }

  // Check if user pasted a multi-line natural template ("ĐĂNG CĂN HỘ" or has "Tên:" and "Giá:")
  if (
    /^đăng căn hộ/i.test(text) ||
    (/(^|\n)\s*(tên|tiêu đề|title)\s*[:：]/i.test(text) && /(^|\n)\s*(giá|price)\s*[:：]/i.test(text))
  ) {
    const parsed = parseMultilineListingText(text);
    if (meta.photoUrls && meta.photoUrls.length > 0) {
      parsed.images = [...(meta.photoUrls || []), ...(parsed.images ? [parsed.images] : [])].join(",");
    }
    const created = await db.createApartment({
      ...parsed,
      source: "telegram"
    });
    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);

    const res = {
      reply:
        `🎉 *ĐÃ ĐĂNG CĂN HỘ MỚI LÊN WEBSITE THÀNH CÔNG!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ Mã căn: *${created.code}*\n` +
        `🏠 Tên: *${created.title.vi}*\n` +
        `🏢 Tòa nhà: ${created.building} (${created.areaName})\n` +
        `📍 Địa chỉ: ${created.address}\n` +
        `💰 Giá thuê: *$${created.priceUsd}/tháng* (~${(created.priceVnd / 1000000).toFixed(1)}tr VNĐ)\n` +
        `🛏 Thông số: ${created.bedrooms}PN • ${created.bathrooms}WC • ${created.sizeM2}m² • Tầng ${created.floor}\n` +
        `👁️ Trạng thái: *${created.status}* (${created.isVisible !== false ? "Đang hiện trên Web" : "Đang ẩn"})\n` +
        `🔗 Link xem ngay: \`/apartments/${created.code}\``,
      buttons: getApartmentControlButtons(created),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 1. /start or /menu or /help
  if (lower === "/start" || lower === "/menu" || lower === "/help") {
    const status = db.getDbStatus();
    const reply =
      `🏛️ *KIN ESTATES — TRUNG TÂM QUẢN LÝ BẤT ĐỘNG SẢN & CRM TELEGRAM*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *TỔNG QUAN HỆ THỐNG HIỆN TẠI:*\n` +
      `• Tổng kho căn hộ: *${status.totalApartments} căn* (_🟢 ${status.availableCount} trống • 🔴 ${status.rentedCount} đã thuê • 🙈 ${status.hiddenCount} đang ẩn_)\n` +
      `• Khách đặt lịch & Điền form: *${status.totalInquiries} khách* (_🔔 ${status.newInquiriesCount} yêu cầu mới_)\n` +
      `• Hợp đồng khách đang thuê: *${status.activeLeasesCount} hợp đồng đang hiệu lực*\n\n` +
      `⚡ *CÁC LỆNH ĐIỀU KHIỂN ĐẦY ĐỦ:*\n` +
      `• \`/wizard\` — Đăng căn hộ mới từng bước (Dễ nhất, hỗ trợ gửi ảnh)\n` +
      `• \`/form\` — Lấy mẫu điền căn hộ nhiều dòng (Copy & Paste)\n` +
      `• \`/list\` — Danh sách căn hộ + Nút Ẩn/Hiện, Đổi trạng thái, Đổi giá, Xóa\n` +
      `• \`/apt MÃ_CĂN\` — Mở bảng điều khiển chi tiết 1 căn hộ\n` +
      `• \`/price MÃ_CĂN GIÁ_MỚI\` — Đổi giá (VD: \`/price DN-PAN-1902 700\` hoặc \`18tr\`)\n` +
      `• \`/hide MÃ_CĂN\` | \`/show MÃ_CĂN\` — Ẩn / Hiện căn hộ trên Web\n` +
      `• \`/leads\` — Quản lý khách đặt lịch hẹn đi xem phòng\n` +
      `• \`/tenants\` — Quản lý khách đang thuê căn nào & thời hạn hợp đồng\n` +
      `• \`/rent MÃ_CĂN | Tên khách | SĐT | Ngày vào | Ngày hết | Giá\` — Gán khách thuê\n` +
      `• \`/checkout MÃ_CĂN\` — Khách trả phòng, mở trống lại căn hộ\n` +
      `• \`/excel\` — Tải & đồng bộ bảng Excel (.csv chuẩn tiếng Việt)`;

    const res = { reply, buttons: getMainMenuButtons() };
    recordBotReply(res);
    return res;
  }

  // 2. /wizard — Interactive step-by-step apartment creation
  if (lower === "/wizard") {
    db.setWizardSession(userKey, {
      step: 1,
      draft: {}
    });
    const res = {
      reply:
        `🪄 *ĐĂNG CĂN HỘ MỚI (BƯỚC 1 / 5): TÊN CĂN HỘ & TÒA NHÀ*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Anh hãy nhập *Tên căn hộ* (có thể kèm tên tòa nhà sau dấu \`|\`):\n\n` +
        `📌 _Ví dụ:_ \`The Panoma 2PN Góc View Sông Hàn | The Panoma (Sun Cosmo)\`\n` +
        `_(Gõ \`/cancel\` bất kỳ lúc nào để hủy)_`,
      buttons: [[{ text: "❌ Hủy đăng từng bước", callback_data: "/cancel" }]]
    };
    recordBotReply(res);
    return res;
  }

  // 3. /form — Copy-paste template for fast full-product upload
  if (lower === "/form") {
    const reply =
      `📝 *MẪU ĐĂNG CĂN HỘ ĐẦY ĐỦ (CHẠM ĐỂ COPY & GỬI LẠI CHO BOT):*\n` +
      `Anh chỉ cần copy đoạn mẫu dưới đây, sửa thông tin (có thể gửi kèm ảnh trong tin nhắn) rồi gửi lại vào đây, Bot sẽ tự động tạo sản phẩm đầy đủ lên Web:\n\n` +
      "```\n" +
      `ĐĂNG CĂN HỘ\n` +
      `Tên: Căn hộ 2PN View Biển & Sông Hàn\n` +
      `Tòa nhà: The Panoma (Sun Cosmo)\n` +
      `Khu vực: Han Riverfront\n` +
      `Địa chỉ: Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng\n` +
      `Giá: 850\n` +
      `Phòng ngủ: 2\n` +
      `Phòng tắm: 2\n` +
      `Diện tích: 72\n` +
      `Tầng: 18\n` +
      `Điện: Giá nhà nước EVN\n` +
      `Thú cưng: Cho phép thú cưng nhỏ\n` +
      `Mô tả: Căn góc 2 mặt thoáng kính Low-E cách âm, đầy đủ sofa da, máy giặt sấy, bàn làm việc rộng và cáp quang 300Mbps.\n` +
      `Ảnh: https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200\n` +
      "```";
    const res = {
      reply,
      buttons: [
        [{ text: "🪄 Chuyển sang Đăng từng bước (/wizard)", callback_data: "/wizard" }],
        [{ text: "⚡ Đăng thử 1 căn mẫu ngay", callback_data: "/quick_demo_add" }],
        ...getMainMenuButtons()
      ]
    };
    recordBotReply(res);
    return res;
  }

  // 4. /list, /empty, /rented, /hidden — List apartments with filters & 1-click actions
  if (
    lower === "/list" ||
    lower.startsWith("/list ") ||
    lower === "/empty" ||
    lower === "/rented" ||
    lower === "/hidden"
  ) {
    const allApartments = await db.getApartments({ includeHidden: true });
    let apartments = allApartments;
    let filterLabel = "TẤT CẢ CĂN HỘ";

    if (lower === "/empty") {
      apartments = allApartments.filter((a) => a.status === "Available" && a.isVisible !== false);
      filterLabel = "CĂN HỘ ĐANG TRỐNG (HIỆN TRÊN WEB)";
    } else if (lower === "/rented") {
      apartments = allApartments.filter((a) => a.status === "Rented" || a.status === "Reserved" || a.isVisible === false);
      filterLabel = "CĂN ĐÃ THUÊ / ĐÃ CỌC / ĐANG ẨN";
    } else if (lower === "/hidden") {
      apartments = allApartments.filter((a) => a.isVisible === false || a.status === "Hidden");
      filterLabel = "CĂN HỘ ĐANG ẨN KHỎI WEB";
    }

    if (apartments.length === 0) {
      const res = {
        reply: `📭 Không có căn hộ nào trong mục *${filterLabel}*.`,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const lines = apartments.map((a, idx) => {
      const statusBadge =
        a.status === "Available"
          ? "🟢 Trống"
          : a.status === "Rented"
          ? "🔴 Đã thuê"
          : a.status === "Reserved"
          ? "🟡 Đã cọc"
          : "🙈 Đang ẩn";
      const visBadge = a.isVisible === false ? " *(Đang ẩn khỏi Web)*" : "";
      const tenantLine = a.currentTenant
        ? `\n   🔑 _Khách thuê: ${a.currentTenant.tenantName} (Hạn: ${a.currentTenant.endDate})_`
        : "";
      return (
        `${idx + 1}. *[${a.code}]* ${a.title?.vi || a.title?.en}\n` +
        `   📍 ${a.building} — ${a.address || a.areaName}\n` +
        `   💰 *$${a.priceUsd}/tháng* (~${(a.priceVnd / 1000000).toFixed(1)}tr) • ${a.bedrooms}PN • ${a.sizeM2}m²\n` +
        `   🏷️ ${statusBadge}${visBadge}${tenantLine}`
      );
    });

    const inlineButtons = [];
    apartments.slice(0, 10).forEach((a) => {
      const isAvail = a.status === "Available";
      const isVis = a.isVisible !== false && a.status !== "Hidden";
      inlineButtons.push([
        {
          text: `⚙️ ${a.code}`,
          callback_data: `/apt ${a.code}`
        },
        {
          text: isAvail ? `🔴 Đặt Đã thuê` : `🟢 Đặt Trống`,
          callback_data: `/status ${a.code} ${isAvail ? "Rented" : "Available"}`
        },
        {
          text: isVis ? `🙈 Ẩn` : `👁️ Hiện`,
          callback_data: isVis ? `/hide ${a.code}` : `/show ${a.code}`
        },
        {
          text: `🗑️ Xóa`,
          callback_data: `/delete ${a.code}`
        }
      ]);
    });

    inlineButtons.push([
      { text: "🟢 Lọc: Đang trống", callback_data: "/empty" },
      { text: "🔴 Lọc: Đã thuê/Ẩn", callback_data: "/rented" },
      { text: "➕ Đăng căn mới", callback_data: "/wizard" }
    ]);

    const res = {
      reply: `📋 *${filterLabel} (${apartments.length} căn):*\n_(Bấm vào mã căn hoặc nút bên dưới để đổi trạng thái / ẩn hiện / xóa ngay)_\n\n` + lines.join("\n\n"),
      buttons: inlineButtons
    };
    recordBotReply(res);
    return res;
  }

  // 5. /apt <code_or_id> — Detailed single apartment control panel
  if (lower.startsWith("/apt ")) {
    const code = text.split(/\s+/)[1];
    const apt = await db.getApartmentByCodeOrId(code);
    if (!apt) {
      const res = {
        reply: `❌ Không tìm thấy căn hộ mã *${code}*.`,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const tenantInfo = apt.currentTenant
      ? `\n🔑 *Khách đang thuê:* ${apt.currentTenant.tenantName} (${apt.currentTenant.tenantContact || "N/A"})\n📅 *Thời hạn thuê:* ${apt.currentTenant.startDate} → ${apt.currentTenant.endDate}`
      : `\n🔑 *Khách đang thuê:* _Chưa có (Đang mở đón khách)_`;

    const reply =
      `🏠 *CHI TIẾT & ĐIỀU KHIỂN CĂN HỘ [${apt.code}]*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `• *Tên:* ${apt.title?.vi || apt.title?.en}\n` +
      `• *Tòa nhà:* ${apt.building}\n` +
      `• *Địa chỉ:* ${apt.address || apt.areaName}\n` +
      `• *Khu vực:* ${apt.areaName}\n` +
      `• *Giá thuê:* *$${apt.priceUsd}/tháng* (~${(apt.priceVnd / 1000000).toFixed(1)} triệu VNĐ)\n` +
      `• *Thông số:* ${apt.bedrooms} PN • ${apt.bathrooms || 1} WC • ${apt.sizeM2} m² • Tầng ${apt.floor || 12}\n` +
      `• *Điện / Nước:* ${apt.electricityRate}\n` +
      `• *Thú cưng:* ${apt.petPolicy}\n` +
      `• *Trạng thái:* *${apt.status}* | *Hiển thị Web:* *${apt.isVisible !== false ? "👁️ Đang hiện" : "🙈 Đang ẩn"}*` +
      tenantInfo +
      `\n• *Mô tả:* _${apt.architecturalNotes?.vi || ""}_\n\n` +
      `💡 *Mẹo sửa nhanh bằng lệnh:*\n` +
      `• Đổi giá: \`/price ${apt.code} 850\` (hoặc \`21tr\`)\n` +
      `• Sửa thông tin: \`/edit ${apt.code} address=Số 10 Bạch Đằng | title=Tên mới\``;

    const res = {
      reply,
      buttons: getApartmentControlButtons(apt)
    };
    recordBotReply(res);
    return res;
  }

  // 6. /quick_demo_add or /add
  if (lower === "/quick_demo_add") {
    const created = await db.createApartment({
      title: {
        vi: "Peninsula Ocean Suite — Căn Hộ 2PN Góc View Biển Mỹ Khê",
        en: "Peninsula Ocean Suite — 2BR Corner My Khe Oceanfront Residence"
      },
      building: "Peninsula Da Nang",
      address: "Đường Võ Nguyên Giáp, Quận Sơn Trà, Đà Nẵng",
      areaName: "My Khe Beachfront",
      priceUsd: 890,
      bedrooms: 2,
      bathrooms: 2,
      sizeM2: 74,
      floor: 22,
      featured: true,
      tags: ["Sea View", "Remote-Work Desk", "Natural Light", "Infinity Pool"],
      images: [
        "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1400&q=85",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85"
      ],
      source: "telegram"
    });
    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);

    const res = {
      reply:
        `✅ *ĐÃ ĐĂNG CĂN HỘ MỚI TỪ TELEGRAM THÀNH CÔNG!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Mã căn: *${created.code}*\n` +
        `• Tên: *${created.title.vi}*\n` +
        `• Địa chỉ: ${created.address}\n` +
        `• Giá thuê: *$${created.priceUsd}/tháng* (~${(created.priceVnd / 1000000).toFixed(1)}tr) • ${created.bedrooms}PN • ${created.sizeM2}m²\n` +
        `• Website & File Excel đã tự động đồng bộ!`,
      buttons: getApartmentControlButtons(created),
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
          `📝 *3 CÁCH ĐĂNG CĂN HỘ MỚI TRÊN TELEGRAM:*\n\n` +
          `1️⃣ *Đăng từng bước (Dễ nhất):* Bấm nút \`🪄 Đăng từng bước (/wizard)\` bên dưới, Bot sẽ hỏi từng mục.\n\n` +
          `2️⃣ *Đăng theo mẫu nhiều dòng:* Bấm \`📝 Mẫu đăng nhanh (/form)\` để copy mẫu.\n\n` +
          `3️⃣ *Đăng nhanh 1 dòng:* Gửi theo cú pháp:\n` +
          `\`/add Tên căn | Khu vực | Giá USD | Số PN | m2 | Tòa nhà | Địa chỉ | Mô tả | Link ảnh\`\n\n` +
          `*Ví dụ:*\n` +
          `\`/add Sơn Trà Ocean Loft | Son Tra | 950 | 2 | 75 | Hiyori Garden Tower | Số 2 Võ Văn Kiệt, Sơn Trà | Căn góc view biển Mỹ Khê, nội thất gỗ óc chó | https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200\``,
        buttons: [
          [
            { text: "🪄 Đăng từng bước (/wizard)", callback_data: "/wizard" },
            { text: "📝 Lấy mẫu điền (/form)", callback_data: "/form" }
          ],
          [{ text: "⚡ Đăng thử 1 căn mẫu ngay", callback_data: "/quick_demo_add" }],
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
      priceInput = "850",
      bedrooms = "1",
      sizeM2 = "65",
      building = "KIN Estates Residence",
      addressOrNotes = "Đà Nẵng",
      notesMaybe = "",
      imageUrl = ""
    ] = parts;

    const hasExplicitAddress = parts.length >= 8;
    const address = hasExplicitAddress ? addressOrNotes : `${building}, ${areaName}, Đà Nẵng`;
    const notes = hasExplicitAddress
      ? notesMaybe
      : addressOrNotes || "Thiết kế chuẩn kiến trúc hiện đại, ánh sáng tự nhiên ngập tràn.";
    const imgFinal = hasExplicitAddress ? imageUrl : notesMaybe.startsWith("http") ? notesMaybe : imageUrl;

    const created = await db.createApartment({
      title: { vi: titleVi, en: titleVi },
      areaName: db.normalizeAreaName(areaName),
      price: priceInput,
      bedrooms: Number(bedrooms) || 1,
      sizeM2: Number(sizeM2) || 65,
      building,
      address,
      architecturalNotes: { vi: notes, en: notes },
      images: imgFinal ? [imgFinal] : meta.photoUrls,
      featured: true,
      source: "telegram"
    });

    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);

    const res = {
      reply:
        `🎉 *ĐĂNG BÀI THÀNH CÔNG LÊN WEBSITE & DATABASE!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Mã căn: *${created.code}*\n` +
        `• Tiêu đề: *${created.title.vi}*\n` +
        `• Địa chỉ: ${created.address} (${created.building})\n` +
        `• Thông số: *${created.bedrooms} PN • ${created.sizeM2}m² • $${created.priceUsd}/tháng (~${(created.priceVnd / 1000000).toFixed(1)}tr)*\n` +
        `• Đồng bộ Excel & Google Sheets: *Đã cập nhật*`,
      buttons: getApartmentControlButtons(created),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 7. /hide <code_or_id> and /show <code_or_id>
  if (lower.startsWith("/hide") || lower.startsWith("/an ")) {
    const code = text.split(/\s+/)[1];
    const updated = await db.updateApartment(code, { isVisible: false, status: "Hidden" });
    if (!updated) {
      const res = { reply: `❌ Không tìm thấy mã căn hộ *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    await sheetsService.pushToGoogleSheetsWebhook("hide_apartment", updated);
    const res = {
      reply: `🙈 *ĐÃ ẨN CĂN HỘ KHỎI WEBSITE:* Căn *${updated.code}* (_${updated.title?.vi}_) hiện đã được ẩn với khách hàng nhưng vẫn lưu trong kho quản lý của anh.`,
      buttons: getApartmentControlButtons(updated),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  if (lower.startsWith("/show") || lower.startsWith("/hien ")) {
    const code = text.split(/\s+/)[1];
    const target = await db.getApartmentByCodeOrId(code);
    if (!target) {
      const res = { reply: `❌ Không tìm thấy mã căn hộ *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    const nextStatus = target.status === "Hidden" ? "Available" : target.status;
    const updated = await db.updateApartment(code, { isVisible: true, status: nextStatus });
    await sheetsService.pushToGoogleSheetsWebhook("show_apartment", updated);
    const res = {
      reply: `👁️ *ĐÃ HIỆN LẠI CĂN HỘ TRÊN WEBSITE:* Căn *${updated.code}* (_${updated.title?.vi}_) đã hiển thị công khai trên Web (Trạng thái: *${updated.status}*).`,
      buttons: getApartmentControlButtons(updated),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 8. /status <code_or_id> [Available|Rented|Reserved|Hidden]
  if (lower.startsWith("/status")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    const target = await db.getApartmentByCodeOrId(code);
    if (!target) {
      const res = {
        reply: "⚠️ Không tìm thấy mã căn hộ. Ví dụ: `/status DN-PAN-1902 Rented`",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const nextStatus = parts[2] || (target.status === "Available" ? "Rented" : "Available");
    const updates = {
      status: nextStatus,
      isVisible: nextStatus === "Hidden" ? false : true
    };
    if (nextStatus === "Available") {
      updates.currentTenant = null;
    }
    const updated = await db.updateApartment(code, updates);
    await sheetsService.pushToGoogleSheetsWebhook("update_status", updated);
    const statusTextVi =
      updated.status === "Available"
        ? "🟢 Đang trống (Hiện trên Web)"
        : updated.status === "Rented"
        ? "🔴 Đã cho thuê (Rented)"
        : updated.status === "Reserved"
        ? "🟡 Đã nhận cọc (Reserved)"
        : "🙈 Đang ẩn";
    const res = {
      reply: `🔄 *ĐÃ CẬP NHẬT TRẠNG THÁI:* Căn *${updated.code}* (${updated.title?.vi}) ➡️ *${statusTextVi}*!`,
      buttons: getApartmentControlButtons(updated),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 9. /price <code_or_id> <new_price_usd_or_vnd>
  if (lower.startsWith("/price") || lower.startsWith("/gia ")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    const rawPrice = parts.slice(2).join(" ");
    if (!code || !rawPrice) {
      const res = {
        reply: "⚠️ Cú pháp đổi giá: `/price MÃ_CĂN GIÁ_MỚI` (VD: `/price DN-PAN-1902 720` hoặc `/price DN-PAN-1902 18.5tr`)",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const updated = await db.updateApartment(code, { price: rawPrice });
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
      buttons: getApartmentControlButtons(updated),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 10. /edit <code_or_id> key=val | key2=val2
  if (lower.startsWith("/edit") || lower.startsWith("/sua ")) {
    const rest = text.replace(/^\/(edit|sua)\s+/i, "").trim();
    const firstSpace = rest.indexOf(" ");
    if (firstSpace < 0) {
      const res = {
        reply:
          `✏️ *HƯỚNG DẪN SỬA THÔNG TIN CĂN HỘ:*\n` +
          `Gửi lệnh: \`/edit MÃ_CĂN trường=giá trị mới | trường2=giá trị 2\`\n\n` +
          `*Các trường hỗ trợ:* \`title\`, \`building\`, \`address\`, \`area\`, \`price\`, \`br\` (số PN), \`m2\`, \`floor\`, \`desc\`, \`img\`, \`pet\`, \`elec\`\n\n` +
          `*Ví dụ:*\n` +
          `\`/edit DN-PAN-1902 price=700 | address=Đường Trần Thị Lý, Ngũ Hành Sơn | desc=Căn góc mới nâng cấp thêm ghế công thái học\``,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const code = rest.slice(0, firstSpace).trim();
    const pairsStr = rest.slice(firstSpace + 1).trim();
    const pairs = pairsStr.split("|").map((s) => s.trim());
    const updates = {};

    for (const p of pairs) {
      const eqIdx = p.indexOf("=");
      if (eqIdx < 0) continue;
      const k = p.slice(0, eqIdx).trim().toLowerCase();
      const v = p.slice(eqIdx + 1).trim();
      if (k === "title" || k === "tên") updates.title = v;
      else if (k === "building" || k === "tòa") updates.building = v;
      else if (k === "address" || k === "địa chỉ") updates.address = v;
      else if (k === "area" || k === "khu vực") updates.areaName = db.normalizeAreaName(v);
      else if (k === "price" || k === "giá") updates.price = v;
      else if (k === "br" || k === "bedrooms" || k === "pn") updates.bedrooms = Number(v);
      else if (k === "wc" || k === "bathrooms") updates.bathrooms = Number(v);
      else if (k === "m2" || k === "size") updates.sizeM2 = Number(v);
      else if (k === "floor" || k === "tầng") updates.floor = Number(v);
      else if (k === "desc" || k === "mô tả") updates.architecturalNotes = v;
      else if (k === "img" || k === "images" || k === "ảnh") updates.images = v;
      else if (k === "pet" || k === "thú cưng") updates.petPolicy = v;
      else if (k === "elec" || k === "điện") updates.electricityRate = v;
    }

    const updated = await db.updateApartment(code, updates);
    if (!updated) {
      const res = { reply: `❌ Không tìm thấy căn hộ mã *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    await sheetsService.pushToGoogleSheetsWebhook("update_apartment", updated);
    const res = {
      reply: `✅ *ĐÃ CẬP NHẬT THÔNG TIN CĂN HỘ [${updated.code}]:*\n• Tên: ${updated.title?.vi}\n• Địa chỉ: ${updated.address}\n• Giá: $${updated.priceUsd}/tháng • ${updated.bedrooms}PN • ${updated.sizeM2}m²`,
      buttons: getApartmentControlButtons(updated),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 11. /delete <code_or_id>
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

  // 12. /leads, /inquiries, /khach, /owners — Customer Leads, Viewing Schedule & Landlord Submissions
  if (
    lower.startsWith("/inquiries") ||
    lower.startsWith("/leads") ||
    lower.startsWith("/khach") ||
    lower.startsWith("/owners")
  ) {
    const onlyOwners = lower.startsWith("/owners");
    const allInquiries = await db.getInquiries();
    const inquiries = onlyOwners
      ? allInquiries.filter((i) => i.type === "owner_listing")
      : allInquiries;

    if (inquiries.length === 0) {
      const res = {
        reply: onlyOwners
          ? "📭 Hiện chưa có chủ nhà nào gửi thông tin phòng ký gửi mới."
          : "📭 Hiện chưa có yêu cầu đặt lịch xem phòng hoặc form khách hàng nào.",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const lines = inquiries.slice(0, 8).map((inq, i) => {
      const typeBadge =
        inq.type === "viewing"
          ? "📅 HẸN XEM PHÒNG"
          : inq.type === "owner_listing"
          ? "🏡 CHỦ NHÀ GỬI PHÒNG"
          : inq.type === "direct_contact"
          ? "💬 BẤM LIÊN HỆ TRỰC TIẾP"
          : "📋 TÌM NHÀ THEO YÊU CẦU";
      const statusBadge =
        inq.status === "New"
          ? "🆕 Mới"
          : inq.status === "Contacted"
          ? "📞 Đã liên hệ"
          : inq.status === "Viewing_Scheduled"
          ? "✅ Đã chốt giờ xem"
          : inq.status === "Rented_Closed"
          ? "🔑 Đã chốt thuê"
          : "📁 Đã lưu";
      return (
        `${i + 1}. *[${inq.code || inq._id}]* ${typeBadge} — *${statusBadge}*\n` +
        `   👤 Khách: *${inq.clientName}* (${inq.messenger}: \`${inq.contactHandle}\`)\n` +
        `   🏠 Căn hộ: *${inq.apartmentCode}* (${inq.apartmentTitle || ""})\n` +
        `   ⏰ Hẹn xem / Dọn vào: *${inq.viewingTime || inq.moveInDate}* | 💰 ${inq.budgetUsd}\n` +
        `   📝 Ghi chú: _"${inq.notes || "Không có"}"_`
      );
    });

    const buttons = [];
    inquiries.slice(0, 6).forEach((inq) => {
      const code = inq.code || inq._id;
      if (inq.type === "owner_listing") {
        buttons.push([
          { text: `✅ Duyệt đăng căn ${code}`, callback_data: `/approve_owner ${code}` },
          { text: `📞 Đã LH ${code}`, callback_data: `/lead_status ${code} Contacted` },
          { text: `🗑️ Xóa`, callback_data: `/del_lead ${code}` }
        ]);
      } else {
        buttons.push([
          { text: `📞 Đã LH (${code})`, callback_data: `/lead_status ${code} Contacted` },
          { text: `📅 Chốt lịch xem`, callback_data: `/lead_status ${code} Viewing_Scheduled` },
          { text: `🔑 Chốt thuê`, callback_data: `/lead_to_lease ${code}` }
        ]);
      }
    });
    buttons.push(...getMainMenuButtons());

    const res = {
      reply:
        `📬 *${onlyOwners ? "DANH SÁCH CHỦ NHÀ KÝ GỬI PHÒNG" : "DANH SÁCH KHÁCH ĐẶT LỊCH XEM PHÒNG & ĐIỀN FORM"} (${inquiries.length}):*\n\n` +
        lines.join("\n\n"),
      buttons
    };
    recordBotReply(res);
    return res;
  }

  // Update Lead Status (/lead_status <code> <status>)
  if (lower.startsWith("/lead_status ")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    const nextStatus = parts[2] || "Contacted";
    const updated = await db.updateInquiry(code, { status: nextStatus });
    if (!updated) {
      const res = { reply: `❌ Không tìm thấy mã khách hàng *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    const res = {
      reply: `✅ *ĐÃ CẬP NHẬT TRẠNG THÁI KHÁCH [${updated.code}]:* Khách *${updated.clientName}* (\`${updated.contactHandle}\`) ➡️ *${updated.status}*!`,
      buttons: [
        [{ text: "📬 Xem lại danh sách khách (/leads)", callback_data: "/leads" }],
        ...getMainMenuButtons()
      ],
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // Delete Lead (/del_lead <code>)
  if (lower.startsWith("/del_lead ")) {
    const code = text.split(/\s+/)[1];
    await db.deleteInquiry(code);
    const res = {
      reply: `🗑️ Đã xóa yêu cầu khách hàng *${code}*.`,
      buttons: getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // Approve Owner Listing (/approve_owner <code>)
  if (lower.startsWith("/approve_owner ")) {
    const code = text.split(/\s+/)[1];
    const inq = await db.getInquiryByCodeOrId(code);
    if (!inq) {
      const res = { reply: `❌ Không tìm thấy mã ký gửi *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    const prop = inq.ownerPropertyData || {};
    const created = await db.createApartment({
      title: prop.title || inq.apartmentTitle || `Căn hộ ký gửi từ ${inq.clientName}`,
      building: prop.building || "KIN Estates Partner Residence",
      address: prop.address || "Đà Nẵng",
      areaName: prop.areaName || "An Thuong",
      price: prop.priceUsd || inq.budgetUsd || 800,
      bedrooms: prop.bedrooms || parseInt(inq.bedrooms, 10) || 1,
      sizeM2: prop.sizeM2 || 65,
      architecturalNotes: prop.notes || inq.notes || "Căn hộ đối tác chủ nhà gửi đăng.",
      images: prop.images,
      landlordName: inq.clientName,
      landlordPhone: inq.contactHandle,
      source: "owner_submission"
    });
    await db.updateInquiry(code, { status: "Rented_Closed", apartmentCode: created.code });
    await sheetsService.pushToGoogleSheetsWebhook("approve_owner_listing", created);

    const res = {
      reply:
        `🎉 *ĐÃ DUYỆT & ĐĂNG PHÒNG CỦA CHỦ NHÀ LÊN WEBSITE!*\n` +
        `• Mã căn mới: *${created.code}*\n` +
        `• Tên: *${created.title.vi}*\n` +
        `• Chủ nhà: ${inq.clientName} (\`${inq.contactHandle}\`)\n` +
        `• Giá: *$${created.priceUsd}/tháng*`,
      buttons: getApartmentControlButtons(created),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // Convert Lead directly to Active Lease (/lead_to_lease <code>)
  if (lower.startsWith("/lead_to_lease ")) {
    const code = text.split(/\s+/)[1];
    const inq = await db.getInquiryByCodeOrId(code);
    if (!inq) {
      const res = { reply: `❌ Không tìm thấy mã khách hàng *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    const aptCode =
      inq.apartmentCode && inq.apartmentCode !== "CURATED-SHORTLIST"
        ? inq.apartmentCode
        : "DN-PAN-1902";
    const lease = await db.createLease({
      apartmentCode: aptCode,
      tenantName: inq.clientName,
      tenantContact: inq.contactHandle,
      messenger: inq.messenger,
      notes: `Chốt thuê từ lịch hẹn xem phòng ${inq.code} (${inq.notes || ""})`
    });
    await db.updateInquiry(code, { status: "Rented_Closed" });
    await sheetsService.pushToGoogleSheetsWebhook("create_lease", lease);

    const res = {
      reply:
        `🔑 *ĐÃ CHỐT KHÁCH THUÊ & CẬP NHẬT TRẠNG THÁI CĂN HỘ!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Mã hợp đồng: *${lease.code}*\n` +
        `• Khách thuê: *${lease.tenantName}* (\`${lease.tenantContact}\`)\n` +
        `• Căn hộ: *${lease.apartmentCode}* (${lease.apartmentTitle})\n` +
        `• Thời hạn: *${lease.startDate}* ➡️ *${lease.endDate}*\n` +
        `• Căn hộ *${lease.apartmentCode}* đã tự động chuyển sang trạng thái *🔴 Đã thuê (Rented)*!`,
      buttons: [
        [
          { text: "🙈 Ẩn luôn căn này khỏi Web", callback_data: `/hide ${lease.apartmentCode}` },
          { text: "🔑 Xem DS Khách đang thuê", callback_data: "/tenants" }
        ],
        ...getMainMenuButtons()
      ],
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 13. /tenants or /leases — Manage Active Tenants, Which Apartment They Rent, and Lease Expiration
  if (lower.startsWith("/tenants") || lower.startsWith("/leases") || lower.startsWith("/hopdong")) {
    const leases = await db.getLeases();
    if (leases.length === 0) {
      const res = {
        reply:
          `📭 Hiện chưa có hợp đồng khách đang thuê nào.\n` +
          `Gõ \`/rent MÃ_CĂN | Tên khách | SĐT/Tele | Ngày vào | Ngày hết hạn | Giá USD\` để thêm khách thuê!`,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const lines = leases.map((l, idx) => {
      const daysLeft = calcDaysRemaining(l.endDate);
      const expBadge =
        l.status === "Ended"
          ? "⚪ Đã trả phòng"
          : daysLeft !== null && daysLeft < 0
          ? `🚨 ĐÃ QUÁ HẠN ${Math.abs(daysLeft)} NGÀY`
          : daysLeft !== null && daysLeft <= 30
          ? `⚠️ Sắp hết hạn (Còn ${daysLeft} ngày)`
          : `🟢 Đang thuê (Còn ${daysLeft ?? "--"} ngày)`;

      return (
        `${idx + 1}. *[${l.code}]* Căn: *${l.apartmentCode}* — ${expBadge}\n` +
        `   👤 Khách thuê: *${l.tenantName}* (\`${l.tenantContact || "N/A"}\`)\n` +
        `   🏢 ${l.building} (${l.address || "Đà Nẵng"})\n` +
        `   💰 *$${l.priceUsd}/tháng* (Cọc ${l.depositMonths || 1} tháng) | 📅 *${l.startDate}* → *${l.endDate}*\n` +
        `   📝 _${l.notes || "Hợp đồng đang hiệu lực"}_`
      );
    });

    const buttons = [];
    leases
      .filter((l) => l.status !== "Ended")
      .slice(0, 6)
      .forEach((l) => {
        buttons.push([
          {
            text: `🔓 Trả phòng & Mở trống ${l.apartmentCode}`,
            callback_data: `/checkout ${l.apartmentCode}`
          },
          {
            text: `🙈 Ẩn ${l.apartmentCode} khỏi Web`,
            callback_data: `/hide ${l.apartmentCode}`
          }
        ]);
      });
    buttons.push(...getMainMenuButtons());

    const res = {
      reply:
        `🔑 *QUẢN LÝ KHÁCH HÀNG ĐANG THUÊ & THỜI HẠN HỢP ĐỒNG (${leases.length}):*\n` +
        `_(Khi khách trả phòng, bấm nút "Trả phòng & Mở trống" để căn hộ tự động hiện lại trạng thái Đang trống trên Web)_\n\n` +
        lines.join("\n\n") +
        `\n\n💡 *Thêm khách thuê mới nhanh:*\n\`/rent DN-PAN-1902 | Nguyễn Văn A | 0905123456 | 2026-11-20 | 2027-05-20 | 654\``,
      buttons
    };
    recordBotReply(res);
    return res;
  }

  // Prompt to assign tenant to apartment (/rent_prompt <code>)
  if (lower.startsWith("/rent_prompt ")) {
    const aptCode = text.split(/\s+/)[1];
    const today = new Date().toISOString().slice(0, 10);
    const sixMo = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
    const res = {
      reply:
        `🔑 *GÁN KHÁCH ĐANG THUÊ CHO CĂN [${aptCode}]:*\n\n` +
        `Chạm để copy lệnh mẫu bên dưới, sửa tên khách & thời hạn rồi gửi lại:\n\n` +
        `\`/rent ${aptCode} | Tên Khách Thuê | @telegram_hoac_SDT | ${today} | ${sixMo} | 850\``,
      buttons: [
        [{ text: `⚡ Gán nhanh khách mẫu vào ${aptCode}`, callback_data: `/rent ${aptCode} | Khách hàng KIN Estates | @kin_tenant | ${today} | ${sixMo}` }],
        ...getMainMenuButtons()
      ]
    };
    recordBotReply(res);
    return res;
  }

  // Create lease command (/rent MÃ_CĂN | Tên khách | Liên hệ | Ngày vào | Ngày hết | Giá)
  if (lower.startsWith("/rent") && !lower.startsWith("/rented") && !lower.startsWith("/rent_prompt")) {
    const body = text.replace(/^\/rent\s*/i, "").trim();
    const parts = body.split("|").map((s) => s.trim());
    if (parts.length < 2) {
      const res = {
        reply:
          `⚠️ *Cú pháp gán khách đang thuê:*\n` +
          `\`/rent MÃ_CĂN | Tên khách | SĐT/Telegram | Ngày bắt đầu | Ngày kết thúc | Giá USD\`\n\n` +
          `*Ví dụ:*\n` +
          `\`/rent DN-PAN-1902 | David Miller | @david_uk | 2026-11-20 | 2027-05-20 | 654\``,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const [apartmentCode, tenantName, tenantContact = "", startDate, endDate, priceUsd] = parts;
    const lease = await db.createLease({
      apartmentCode,
      tenantName,
      tenantContact,
      startDate,
      endDate,
      priceUsd
    });
    await sheetsService.pushToGoogleSheetsWebhook("create_lease", lease);

    const res = {
      reply:
        `🔑 *ĐÃ GHI NHẬN HỢP ĐỒNG KHÁCH THUÊ & ĐỒNG BỘ CĂN HỘ!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• Mã HĐ: *${lease.code}*\n` +
        `• Căn hộ: *${lease.apartmentCode}* (${lease.apartmentTitle})\n` +
        `• Khách thuê: *${lease.tenantName}* (\`${lease.tenantContact}\`)\n` +
        `• Giá thuê: *$${lease.priceUsd}/tháng*\n` +
        `• Thời hạn: *${lease.startDate}* ➡️ *${lease.endDate}*\n` +
        `• Trạng thái căn hộ *${lease.apartmentCode}* đã chuyển sang *🔴 Đã thuê (Rented)*!`,
      buttons: [
        [
          { text: `🙈 Ẩn căn ${lease.apartmentCode} khỏi Web`, callback_data: `/hide ${lease.apartmentCode}` },
          { text: "🔑 Xem DS Khách đang thuê", callback_data: "/tenants" }
        ],
        ...getMainMenuButtons()
      ],
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // Checkout / End Lease & Reopen Apartment (/checkout <apt_code_or_lease_code>)
  if (lower.startsWith("/checkout") || lower.startsWith("/traphong")) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      const res = {
        reply: "⚠️ Vui lòng nhập mã căn hộ hoặc mã hợp đồng khách trả phòng. VD: `/checkout DN-FIL-2401`",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    const lease = await db.getLeaseByCodeOrId(code);
    const aptCode = lease ? lease.apartmentCode : code.toUpperCase();
    if (lease) {
      await db.updateLease(lease.code, { status: "Ended" });
    }
    const updatedApt = await db.updateApartment(aptCode, {
      status: "Available",
      isVisible: true,
      currentTenant: null
    });
    await sheetsService.pushToGoogleSheetsWebhook("checkout_lease", { apartmentCode: aptCode });

    const res = {
      reply:
        `🔓 *KHÁCH ĐÃ TRẢ PHÒNG — CĂN HỘ ĐÃ MỞ TRỐNG LẠI TRÊN WEB!*\n` +
        `• Căn hộ: *${aptCode}* (${updatedApt?.title?.vi || ""})\n` +
        `• Trạng thái mới: *🟢 Available (Đang trống — Hiện công khai trên Web)*`,
      buttons: updatedApt ? getApartmentControlButtons(updatedApt) : getMainMenuButtons(),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // 14. /excel or /sync — Excel & Google Sheets 2-Way Management
  if (lower.startsWith("/excel") || lower.startsWith("/sync")) {
    const syncRes = await sheetsService.pushToGoogleSheetsWebhook("manual_sync", {});
    const res = {
      reply:
        `📊 *LIÊN KẾT & QUẢN LÝ QUA EXCEL / GOOGLE SHEETS 2 CHIỀU*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Hệ thống hỗ trợ xuất & nhập trực tiếp bằng **Microsoft Excel (UTF-8 chuẩn tiếng Việt)** cho cả 3 bảng:\n\n` +
        `1️⃣ *Bảng Excel Kho Căn Hộ:* \`/api/excel/apartments.csv\`\n` +
        `   _(Mở bằng Excel -> Sửa giá, đổi cột Status thành Available/Rented/Hidden, sửa địa chỉ hoặc thêm dòng căn hộ mới -> Upload lại trên trang \`/admin\` để cập nhật hàng loạt!)_\n` +
        `2️⃣ *Bảng Excel Khách Đặt Lịch & Điền Form:* \`/api/excel/inquiries.csv\`\n` +
        `3️⃣ *Bảng Excel Hợp Đồng Khách Đang Thuê:* \`/api/excel/leases.csv\`\n\n` +
        `✅ *Trạng thái đồng bộ:* ${syncRes.message || "Đã đồng bộ dữ liệu mới nhất."}`,
      buttons: getMainMenuButtons(),
      sendExcelFiles: true
    };
    recordBotReply(res);
    return res;
  }

  const fallback = {
    reply:
      `🤖 Em chưa nhận diện được lệnh vừa nhập. Anh có thể chọn nhanh các nút chức năng bên dưới hoặc gõ \`/menu\`, \`/wizard\`, \`/form\`, \`/list\`, \`/leads\`, \`/tenants\`, \`/excel\` nhé!`,
    buttons: getMainMenuButtons()
  };
  recordBotReply(fallback);
  return fallback;
}

async function handleWizardStep(userKey, session, text, meta = {}) {
  const step = session.step || 1;
  const draft = session.draft || {};

  if (step === 1) {
    const parts = text.split("|").map((s) => s.trim());
    draft.title = parts[0] || "Căn hộ Kiến trúc Đà Nẵng";
    draft.building = parts[1] || "KIN Estates Residence";
    db.setWizardSession(userKey, { step: 2, draft });
    return {
      reply:
        `✅ Đã lưu tên: *${draft.title}* (${draft.building})\n\n` +
        `🪄 *BƯỚC 2 / 5: KHU VỰC & ĐỊA CHỈ CỤ THỂ*\n` +
        `Anh chọn khu vực bên dưới hoặc gõ theo dạng: \`Khu vực | Địa chỉ đường, quận\`\n` +
        `📌 _Ví dụ:_ \`Han Riverfront | Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng\``,
      buttons: [
        [
          { text: "🌊 An Thượng (Mỹ Khê)", callback_data: "/wiz_area An Thuong | Khu phố An Thượng, Ngũ Hành Sơn" },
          { text: "🌉 Sông Hàn / Hải Châu", callback_data: "/wiz_area Han Riverfront | Đường Bạch Đằng / Trần Thị Lý" }
        ],
        [
          { text: "🌿 Sơn Trà (Hiyori/Monarchy)", callback_data: "/wiz_area Son Tra | Đường Võ Văn Kiệt, Quận Sơn Trà" },
          { text: "🏖️ Mặt biển Mỹ Khê", callback_data: "/wiz_area My Khe Beachfront | Đường Võ Nguyên Giáp, Đà Nẵng" }
        ],
        [{ text: "❌ Hủy đăng", callback_data: "/cancel" }]
      ]
    };
  }

  if (step === 2) {
    const clean = text.replace(/^\/wiz_area\s*/i, "").trim();
    const parts = clean.split("|").map((s) => s.trim());
    draft.areaName = db.normalizeAreaName(parts[0] || "An Thuong");
    draft.address = parts[1] || parts[0] || `${draft.building}, Đà Nẵng`;
    db.setWizardSession(userKey, { step: 3, draft });
    return {
      reply:
        `✅ Khu vực: *${draft.areaName}* — Địa chỉ: *${draft.address}*\n\n` +
        `🪄 *BƯỚC 3 / 5: GIÁ THUÊ, SỐ PHÒNG NGỦ, DIỆN TÍCH & TẦNG*\n` +
        `Anh nhập cách nhau bởi dấu \`|\`: \`Giá (USD hoặc tr VNĐ) | Số PN | Diện tích m2 | Tầng\`\n\n` +
        `📌 _Ví dụ:_ \`850 | 2 | 72 | 18\` (hoặc \`18.5tr | 1 | 52 | 15\`)`,
      buttons: [
        [
          { text: "1PN • 50m² • $650", callback_data: "/wiz_spec 650 | 1 | 50 | 15" },
          { text: "2PN • 75m² • $950", callback_data: "/wiz_spec 950 | 2 | 75 | 20" }
        ],
        [{ text: "❌ Hủy đăng", callback_data: "/cancel" }]
      ]
    };
  }

  if (step === 3) {
    const clean = text.replace(/^\/wiz_spec\s*/i, "").trim();
    const parts = clean.split("|").map((s) => s.trim());
    draft.price = parts[0] || "800";
    draft.bedrooms = parseInt(parts[1], 10) || 1;
    draft.sizeM2 = parseFloat(parts[2]) || 60;
    draft.floor = parseInt(parts[3], 10) || 12;
    db.setWizardSession(userKey, { step: 4, draft });
    return {
      reply:
        `✅ Thông số: *Giá ${draft.price} • ${draft.bedrooms}PN • ${draft.sizeM2}m² • Tầng ${draft.floor}*\n\n` +
        `🪄 *BƯỚC 4 / 5: MÔ TẢ CHI TIẾT, GIÁ ĐIỆN & THÚ CƯNG*\n` +
        `Anh nhập mô tả chi tiết căn hộ (có thể kèm \`| Giá điện | Chính sách thú cưng\`):\n\n` +
        `📌 _Ví dụ:_ \`Căn góc ban công thoáng mát, nội thất gỗ sồi mới 100%, bàn làm việc rộng | Giá nhà nước EVN | Cho nuôi mèo\``,
      buttons: [
        [
          {
            text: "⚡ Dùng mô tả chuẩn kiến trúc + Điện EVN",
            callback_data:
              "/wiz_desc Thiết kế chuẩn kiến trúc hiện đại, kính Low-E cách âm, bàn làm việc rộng + Wi-Fi 300Mbps | Giá nhà nước EVN | Thương lượng"
          }
        ],
        [{ text: "❌ Hủy đăng", callback_data: "/cancel" }]
      ]
    };
  }

  if (step === 4) {
    const clean = text.replace(/^\/wiz_desc\s*/i, "").trim();
    const parts = clean.split("|").map((s) => s.trim());
    draft.architecturalNotes = parts[0] || "Không gian sống hiện đại, tràn ngập ánh sáng tự nhiên.";
    if (parts[1]) draft.electricityRate = parts[1];
    if (parts[2]) draft.petPolicy = parts[2];
    db.setWizardSession(userKey, { step: 5, draft });
    return {
      reply:
        `✅ Đã lưu mô tả chi tiết.\n\n` +
        `🪄 *BƯỚC 5 / 5 (CUỐI CÙNG): HÌNH ẢNH CĂN HỘ*\n` +
        `• Anh có thể **gửi ảnh trực tiếp từ máy** vào khung chat này, hoặc **dán 1 hay nhiều link ảnh** (cách nhau dấu phẩy).\n` +
        `• Hoặc bấm nút **Hoàn tất & Đăng ngay** bên dưới!`,
      buttons: [
        [{ text: "✅ Hoàn tất & Đăng lên Website ngay!", callback_data: "/wiz_finish" }],
        [{ text: "❌ Hủy đăng", callback_data: "/cancel" }]
      ]
    };
  }

  if (step === 5) {
    if (meta.photoUrls && meta.photoUrls.length > 0) {
      draft.images = [...(draft.images || []), ...meta.photoUrls];
    } else if (text && !text.startsWith("/wiz_finish")) {
      const urls = text
        .split(/[\n,|]+/)
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http") || s.startsWith("/"));
      if (urls.length > 0) {
        draft.images = [...(draft.images || []), ...urls];
      }
    }

    const created = await db.createApartment({
      ...draft,
      source: "telegram"
    });
    db.setWizardSession(userKey, null);
    await sheetsService.pushToGoogleSheetsWebhook("create_apartment", created);

    return {
      reply:
        `🎉 *HOÀN TẤT! CĂN HỘ [${created.code}] ĐÃ LÊN SÓNG WEBSITE!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `• *Tên:* ${created.title.vi}\n` +
        `• *Tòa nhà:* ${created.building} (${created.areaName})\n` +
        `• *Địa chỉ:* ${created.address}\n` +
        `• *Giá thuê:* *$${created.priceUsd}/tháng* (~${(created.priceVnd / 1000000).toFixed(1)}tr VNĐ)\n` +
        `• *Thông số:* ${created.bedrooms}PN • ${created.sizeM2}m² • Tầng ${created.floor}\n` +
        `• *Trạng thái:* *${created.status}* (Đang hiển thị trên Web)`,
      buttons: getApartmentControlButtons(created),
      mutated: true
    };
  }

  db.setWizardSession(userKey, null);
  return { reply: "Đã hoàn tất.", buttons: getMainMenuButtons() };
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
  const typeLabel =
    inquiry.type === "viewing"
      ? "📅 KHÁCH ĐẶT LỊCH HẸN XEM CĂN HỘ!"
      : inquiry.type === "owner_listing"
      ? "🏡 CHỦ NHÀ GỬI THÔNG TIN ĐĂNG PHÒNG MỚI!"
      : inquiry.type === "direct_contact"
      ? "💬 KHÁCH BẤM LIÊN HỆ TRỰC TIẾP TRÊN WEB!"
      : "📋 KHÁCH ĐIỀN FORM TÌM NHÀ THEO YÊU CẦU!";

  const msg =
    `🔔 *${typeLabel}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🆔 Mã yêu cầu: *${inquiry.code || inquiry._id}*\n` +
    `👤 Khách hàng: *${inquiry.clientName}*\n` +
    `📱 Liên hệ (${inquiry.messenger}): \`${inquiry.contactHandle}\`\n` +
    `🏠 Căn hộ quan tâm: *${inquiry.apartmentCode}* (${inquiry.apartmentTitle || ""})\n` +
    `💰 Ngân sách / Giá: *${inquiry.budgetUsd}* | 🛏 ${inquiry.bedrooms}\n` +
    `⏰ Thời gian hẹn xem / Dọn vào: *${inquiry.viewingTime || inquiry.moveInDate}*\n` +
    `📝 Ghi chú: _${inquiry.notes || "Không có"}_`;

  const code = inquiry.code || inquiry._id;
  const actionButtons =
    inquiry.type === "owner_listing"
      ? [
          [
            { text: `✅ Duyệt đăng lên Web ngay (${code})`, callback_data: `/approve_owner ${code}` },
            { text: `📞 Đã liên hệ`, callback_data: `/lead_status ${code} Contacted` }
          ],
          ...getMainMenuButtons()
        ]
      : [
          [
            { text: `📞 Đã liên hệ (${code})`, callback_data: `/lead_status ${code} Contacted` },
            { text: `📅 Đã chốt giờ xem`, callback_data: `/lead_status ${code} Viewing_Scheduled` }
          ],
          [
            { text: `🔑 Chốt khách thuê căn này`, callback_data: `/lead_to_lease ${code}` },
            { text: `🏠 Xem căn ${inquiry.apartmentCode}`, callback_data: `/apt ${inquiry.apartmentCode}` }
          ]
        ];

  db.appendBotHistory({
    sender: "bot",
    user: "KIN Estates Bot (Push Alert)",
    text: msg,
    buttons: actionButtons
  });

  const settings = db.getSettings();
  const token = activeToken || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings.telegramAdminChatId || process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (botInstance && chatId) {
    try {
      await botInstance.sendMessage(chatId, msg, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: actionButtons }
      });
    } catch (err) {
      console.error("Failed to push Telegram message via botInstance:", err.message);
    }
  } else if (token && chatId) {
    // Serverless HTTP push fallback (works on Vercel without active polling daemon!)
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: msg,
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: actionButtons }
        })
      });
    } catch (err) {
      console.error("Failed to push Telegram message via HTTP API:", err.message);
    }
  }
}

// Handle incoming Telegram Webhook update (for Vercel Serverless or Webhook mode)
async function handleTelegramWebhookUpdate(update) {
  const settings = db.getSettings();
  const token = activeToken || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    if (!settings.telegramAdminChatId) {
      db.updateSettings({ telegramAdminChatId: String(chatId) });
    }
    const photoUrls = [];
    if (msg.photo && msg.photo.length > 0 && token) {
      const largest = msg.photo[msg.photo.length - 1];
      try {
        const fRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${largest.file_id}`);
        const fJson = await fRes.json();
        if (fJson.ok && fJson.result?.file_path) {
          photoUrls.push(`https://api.telegram.org/file/bot${token}/${fJson.result.file_path}`);
        }
      } catch (e) {
        // ignore photo fetch error
      }
    }

    const rawText = msg.caption || msg.text || (photoUrls.length > 0 ? "" : "/menu");
    const result = await processTelegramCommand(rawText, {
      chatId,
      username: msg.from?.username || msg.from?.first_name || "Telegram Admin",
      photoUrls
    });

    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: result.reply,
          parse_mode: "Markdown",
          reply_markup: result.buttons ? { inline_keyboard: result.buttons } : undefined
        })
      });
    }
    return result;
  }

  if (update.callback_query) {
    const query = update.callback_query;
    const chatId = query.message?.chat?.id;
    const result = await processTelegramCommand(query.data, {
      chatId,
      username: query.from?.username || "Telegram Admin"
    });
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: query.id })
      });
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: result.reply,
          parse_mode: "Markdown",
          reply_markup: result.buttons ? { inline_keyboard: result.buttons } : undefined
        })
      });
    }
    return result;
  }
  return { ok: true };
}

function initTelegramBot(customToken) {
  const settings = db.getSettings();
  const token = customToken || settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;

  if (!token || token.trim() === "") {
    if (db.getBotHistory().length === 0) {
      processTelegramCommand("/start", { username: "Admin Mobile" });
    }
    return { active: false, mode: "Interactive Bot Console Ready (Nhập Bot Token để kết nối Telegram thật)" };
  }

  activeToken = token.trim();
  if (process.env.VERCEL) {
    return { active: true, mode: "Telegram Webhook Serverless Ready" };
  }

  if (botInstance && activeToken === token) {
    return { active: true, mode: "Live Telegram Polling Connected" };
  }

  try {
    if (botInstance) {
      botInstance.stopPolling();
    }
    botInstance = new TelegramBot(token, { polling: true });

    botInstance.on("message", async (msg) => {
      const chatId = msg.chat.id;
      if (!db.getSettings().telegramAdminChatId) {
        db.updateSettings({ telegramAdminChatId: String(chatId) });
      }
      const photoUrls = [];
      if (msg.photo && msg.photo.length > 0) {
        const largest = msg.photo[msg.photo.length - 1];
        try {
          const fileLink = await botInstance.getFileLink(largest.file_id);
          if (fileLink) photoUrls.push(fileLink);
        } catch (e) {
          // ignore
        }
      }
      const rawText = msg.caption || msg.text || (photoUrls.length > 0 ? "" : "/menu");
      const result = await processTelegramCommand(rawText, {
        chatId,
        username: msg.from?.username || msg.from?.first_name || "Telegram Admin",
        photoUrls
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
        chatId,
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
    connected: Boolean(botInstance || activeToken || db.getSettings().telegramBotToken),
    mode: botInstance
      ? "Live Telegram Bot Polling (@BotFather Connected)"
      : activeToken || db.getSettings().telegramBotToken
      ? "Telegram Webhook & Push Active"
      : "Interactive Bot Console + Sẵn sàng kết nối @BotFather Token",
    hasToken: Boolean(activeToken || db.getSettings().telegramBotToken),
    adminChatId: db.getSettings().telegramAdminChatId || "Tự động nhận diện khi Admin nhắn /start"
  };
}

module.exports = {
  initTelegramBot,
  processTelegramCommand,
  notifyNewInquiryToTelegram,
  handleTelegramWebhookUpdate,
  getBotStatus
};
