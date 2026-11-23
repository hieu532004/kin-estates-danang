const TelegramBot = require("node-telegram-bot-api");
const db = require("../db/database");
const sheetsService = require("./googleSheetsService");
const { handleListingWorkflow, priceInput } = require("./telegramListingWorkflow");
const { storeTelegramPhoto, getStoredTelegramPhoto } = require("./telegramMediaService");
const { apartmentMapUrl } = require("./apartmentLocation");
const { getApartmentContactSummary, handleApartmentCrmCommand } = require("./apartmentCrmService");
const autoDeployService = require("./autoDeployService");

let botInstance = null;
let activeToken = "";

function getTelegramAdminChatId() {
  return String(process.env.TELEGRAM_ADMIN_CHAT_ID || db.getSettings().telegramAdminChatId || "").trim();
}

function parseAvailabilityDate(value) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const local = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!iso && !local) return null;
  const [year, month, day] = (iso ? iso.slice(1) : [local[3], local[2], local[1]]).map(Number);
  if (year < 1900 || month < 1 || month > 12 || day < 1 ||
      day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  const pad = number => String(number).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isTelegramAdminChat(chat) {
  const adminId = getTelegramAdminChatId();
  return Boolean(adminId) && chat?.type === "private" && String(chat.id) === adminId;
}

async function registerTelegramBotCommands(token) {
  if (!token) return;
  try {
    const commands = [
      { command: "start", description: "🏛️ Bảng điều khiển chính & Tổng quan kho căn hộ" },
      { command: "wizard", description: "➕ Đăng căn mới từ điện thoại" },
      { command: "draft", description: "📝 Tiếp tục bản nháp" },
      { command: "list", description: "🏠 Kho căn hộ, tìm theo tên hoặc mã" },
      { command: "crm", description: "Khách hàng và lịch xem" },
      { command: "bookings", description: "Yêu cầu đặt phòng" },
      { command: "form", description: "📝 Lấy mẫu chữ điền nhanh thông tin căn hộ" },
      { command: "cancel", description: "❌ Hủy thao tác đang nhập" }
    ];
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands })
    });
  } catch (err) {
    console.warn("Could not set Telegram commands menu.");
  }
}

/**
 * KIN ESTATES — 100% Mobile-First Telegram Bot Property, Customer & Lease Manager
 * Optimized so the Admin never needs an admin web panel:
 * 1. Native Phone Photo Uploads:
 *    - Send 1 or multiple photos (album) directly from phone gallery into Telegram chat
 *    - Proxy endpoint /api/telegram/photo/:fileId serves photos cleanly on the website without links
 *    - Buttons: [📸 Up thêm ảnh từ ĐT] & [🔄 Thay bộ ảnh mới từ ĐT] on every apartment
 * 2. Native Excel File Send & Receive inside Telegram Chat:
 *    - /excel sends the 3 .csv Excel files directly into the Telegram chat as attachments
 *    - Sending an edited .csv file back to the Bot in Telegram automatically imports & updates the database
 * 3. Full Apartment CRUD, Customer Viewing Alerts, Active Tenant & Lease Expiration Tracking
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
    if (/^\[[^\]]+\]$/.test(val)) continue;

    if (key.includes("mã") || key === "code" || key === "id") data.code = val.toUpperCase();
    else if (["ghim bản đồ", "vị trí bản đồ", "bản đồ", "tọa độ", "map", "coordinates"].includes(key)) data.mapInput = val;
    else if (["tên tiếng anh", "title en", "titleen"].includes(key)) data.titleEn = val;
    else if (key.includes("tên") || key.includes("tiêu đề") || key === "title" || key === "name") data.title = val;
    else if (key.includes("tòa") || key.includes("toa") || key === "building" || key.includes("dự án")) data.building = val;
    else if (key.includes("khu") || key === "area") data.areaName = db.normalizeAreaName(val);
    else if (key.includes("địa chỉ") || key.includes("dia chi") || key === "address") {
      data.address = val;
      if (!data.district) {
        const distMap = [
          [/ngũ hành sơn/iu, "Ngũ Hành Sơn"],
          [/sơn trà/iu, "Sơn Trà"],
          [/hải châu/iu, "Hải Châu"],
          [/thanh khê/iu, "Thanh Khê"],
          [/liên chiểu/iu, "Liên Chiểu"],
          [/cẩm lệ/iu, "Cẩm Lệ"],
          [/hòa vang/iu, "Hòa Vang"]
        ];
        const found = distMap.find(([re]) => re.test(val));
        if (found) data.district = found[1];
      }
    }
    else if (key.includes("quận") || key === "district") data.district = val;
    else if (key === "thông số" || key === "thong so" || key === "specs") {
      const segments = val.split(/[|,·•]+/).map((s) => s.trim()).filter(Boolean);
      for (const seg of segments) {
        const br = seg.match(/^(\d{1,2})\s*(?:pn|phòng ngủ|br)$/iu);
        const wc = seg.match(/^(\d{1,2})\s*(?:wc|phòng tắm|bath)$/iu);
        const sz = seg.match(/^(\d{1,5}(?:[.,]\d{1,2})?)\s*m[²2]$/iu);
        const fl = seg.match(/^(?:tầng|tang|floor)\s*(-?\d{1,3})$/iu);
        const ori = seg.match(/^(?:hướng|huong|view)\s*[:：]?\s*(.+)$/iu);
        if (br) data.bedrooms = Number(br[1]);
        else if (wc) data.bathrooms = Number(wc[1]);
        else if (sz) data.sizeM2 = Number(sz[1].replace(",", "."));
        else if (fl) data.floor = Number(fl[1]);
        else if (ori) data.orientation = ori[1].trim();
      }
    }
    else if (key === "hợp đồng" || key === "hop dong" || key === "lease") {
      const segments = val.split(/[|,·•]+/).map((s) => s.trim()).filter(Boolean);
      for (const seg of segments) {
        const minM = seg.match(/(?:tối thiểu|min|hđ)\s*[:：]?\s*(\d{1,2})\s*(?:tháng|th)?/iu);
        const dep = seg.match(/(?:cọc|đặt cọc|deposit)\s*[:：]?\s*(\d{1,2})\s*(?:tháng|th)?/iu);
        const dt = seg.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
        if (minM) data.minLeaseMonths = Number(minM[1]);
        if (dep) data.depositMonths = Number(dep[1]);
        if (dt) {
          const parsedDate = parseAvailabilityDate(dt[1]);
          if (parsedDate) data.availableFrom = parsedDate;
        }
      }
    }
    else if (key === "chi phí" || key === "chi phi" || key === "dịch vụ" || key === "utilities") {
      const segments = val.split(/[|·•]+/).map((s) => s.trim()).filter(Boolean);
      for (const seg of segments) {
        const elec = seg.match(/^(?:điện|dien)\s*[:：]?\s*(.+)$/iu);
        const water = seg.match(/^(?:nước|nuoc)\s*[:：]?\s*(.+)$/iu);
        const wifi = seg.match(/^(?:wi-?fi|internet)\s*[:：]?\s*(.+)$/iu);
        const pet = seg.match(/^(?:thú cưng|thu cung|pet)\s*[:：]?\s*(.+)$/iu);
        if (elec) data.electricityRate = seg.includes(":") || seg.includes("：") ? elec[1].trim() : seg;
        else if (water) data.waterRate = seg.includes(":") || seg.includes("：") ? water[1].trim() : seg;
        else if (wifi) {
          const wv = wifi[1].trim();
          if (/^(có|đã gồm|bao gồm|miễn phí|free|yes|true)/iu.test(wv)) data.wifiIncluded = true;
          else if (/^(không|chưa gồm|no|false)/iu.test(wv)) data.wifiIncluded = false;
        }
        else if (pet) data.petPolicy = pet[1].trim();
      }
    }
    else if (key.includes("giá") || key.includes("gia") || key === "price") data.price = val;
    else if (key.includes("phòng ngủ") || key.includes("phong ngu") || key === "pn" || key === "bedrooms" || key === "br") {
      if (/^\d{1,2}$/.test(val)) data.bedrooms = Number(val);
    }
    else if (key.includes("phòng tắm") || key.includes("wc") || key === "bathrooms") {
      if (/^\d{1,2}$/.test(val)) data.bathrooms = Number(val);
    }
    else if (key.includes("diện tích") || key.includes("dien tich") || key === "m2" || key === "size") {
      const size = val.match(/^(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m[²2])?$/i);
      if (size && Number(size[1].replace(",", ".")) > 0) data.sizeM2 = Number(size[1].replace(",", "."));
    }
    else if (key.includes("tầng") || key.includes("tang") || key === "floor") {
      if (/^-?\d{1,3}$/.test(val)) data.floor = Number(val);
    }
    else if (["ngày có thể vào", "ngày trống", "có thể vào từ", "available from"].includes(key)) {
      const date = parseAvailabilityDate(val);
      if (date) data.availableFrom = date;
    }
    else if (["thuê tối thiểu", "thời hạn thuê tối thiểu", "cọc", "đặt cọc", "tiền cọc"].includes(key)) {
      const months = val.match(/^(\d{1,2})\s*(?:tháng)?$/i);
      if (months) data[key.includes("cọc") ? "depositMonths" : "minLeaseMonths"] = Number(months[1]);
    }
    else if (["wi-fi", "wifi", "internet"].includes(key)) {
      if (/^(có|đã gồm|bao gồm|đã gồm trong giá|bao gồm trong giá|yes|true)$/iu.test(val)) data.wifiIncluded = true;
      if (/^(không|chưa gồm|no|false)$/iu.test(val)) data.wifiIncluded = false;
    }
    else if (key.includes("hướng") || key === "orientation") data.orientation = val;
    else if (key.includes("điện") || key === "electricity") data.electricityRate = val;
    else if (key.includes("nước") || key === "water") data.waterRate = val;
    else if (key.includes("thú cưng") || key.includes("pet")) data.petPolicy = val;
    else if (key.includes("mô tả") || key.includes("mo ta") || key.includes("chi tiết") || key === "description" || key === "notes") data.architecturalNotes = val;
    else if (key.includes("tiện ích") || key.includes("tag")) data.tags = val;
    else if (key.includes("ảnh") || key.includes("anh") || key.includes("image") || key.includes("hình") || key.includes("photo")) {
      if (val.startsWith("http") || val.startsWith("/")) data.images = val;
    }
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
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function getMainMenuButtons() {
  return [
    [
      { text: "🏠 Kho căn hộ", callback_data: "/list" },
      { text: "➕ Đăng căn mới", callback_data: "/wizard" }
    ],
    [
      { text: "📋 Mẫu đăng nhanh", callback_data: "/form" },
      { text: "👥 Khách & lịch xem", callback_data: "/crm" }
    ],
    [
      { text: "📅 Đặt phòng", callback_data: "/bookings" },
      { text: "📝 Bản nháp", callback_data: "/draft" },
      { text: "⚙️ Công cụ", callback_data: "/tools" }
    ]
  ];
}

function getApartmentControlButtons(apt, contactCount, listBack = "/list") {
  const isAvailable = apt.status === "Available";
  const isVisible = apt.isVisible !== false && apt.status !== "Hidden";
  const map = apartmentMapUrl(apt);
  return [
    [
      { text: contactCount === undefined ? "👥 Khách LH" : `👥 Khách LH (${contactCount})`, callback_data: `/apt_contacts ${apt.code}` },
      ...(isVisible && isAvailable && !apt.reservationHold ? [{ text: "📅 Đặt phòng", callback_data: `/book ${apt.code}` }] : []),
      ...(map ? [{ text: "🗺️ Bản đồ", url: map }] : [])
    ],
    [
      ...(apt.reservationHold ? [] : [{
        text: isAvailable ? "🔴 Đã thuê" : "🟢 Đang trống",
        callback_data: `/status ${apt.code} ${isAvailable ? "Rented" : "Available"}`
      }]),
      {
        text: isVisible ? "🙈 Ẩn Web" : "👁️ Hiện Web",
        callback_data: isVisible ? `/hide ${apt.code}` : `/show ${apt.code}`
      }
    ],
    [
      { text: "✏️ Sửa tin", callback_data: `/editfields ${apt.code}` },
      { text: "📸 Thêm ảnh", callback_data: `/addphoto ${apt.code}` },
      { text: "🖼 Chỉnh ảnh", callback_data: `/gallery ${apt.code}` }
    ],
    [
      { text: "⚙️ Hợp đồng / Xóa", callback_data: `/apt_tools ${apt.code}` },
      { text: "⬅️ Kho căn", callback_data: listBack }
    ]
  ];
}

async function processTelegramCommand(rawText, meta = {}) {
  const text = (rawText || "").trim();
  const userKey = String(meta.chatId || meta.username || "admin");
  const incomingPhotos = Array.isArray(meta.photoUrls) ? meta.photoUrls : [];

  if (!text && incomingPhotos.length === 0 && !meta.photoError && !meta.sharedLocation) {
    return {
      reply: "Hãy chọn nút chức năng bên dưới hoặc gửi ảnh / lệnh.",
      buttons: getMainMenuButtons()
    };
  }

  const lower = text.toLowerCase();
  const template = /^đăng căn hộ(?:\s|$)/iu.test(text) ||
    (/(^|\n)\s*(tên|tiêu đề|title)\s*[:：]/iu.test(text) && /(^|\n)\s*(giá|price)\s*[:：]/iu.test(text))
    ? parseMultilineListingText(text) : null;
  let crmText = text.replace(/^\/(?:leads|inquiries|khach)(?=\s|$)/i, "/crm")
    .replace(/^\/lead_status\s+(\S+)\s+Viewing_Scheduled$/i, "/crm_view $1");
  const crmKey = `crm:${userKey}`;
  const startsListing = /^\/(?:wizard|draft|form|add|addphoto|setphoto|gallery|editfields)(?:\s|$)/i.test(text);
  if (startsListing && await db.getTelegramSession(crmKey)) await db.setTelegramSession(crmKey, null);
  if (lower === "/cancel" && await db.getTelegramSession(crmKey)) crmText = "/crm_cancel";
  const crm = template || meta.sharedLocation ? null : await handleApartmentCrmCommand(crmText, { ...meta, userKey });
  if (crm) return crm;

  if (!meta.mediaGroupId) db.appendBotHistory({
    sender: "user",
    user: meta.username || "Admin (Telegram)",
    text: text || (meta.sharedLocation ? "[Đã gửi ghim bản đồ]" : `[Đã tải lên ${incomingPhotos.length} ảnh từ điện thoại]`)
  });

  let quickListing;
  if (/^\/add\s+\S/i.test(text)) {
    const [title, areaName, price, bedrooms, sizeM2, building, address, architecturalNotes] =
      text.replace(/^\/add\s+/i, "").split("|").map(value => value.trim());
    quickListing = {
      title, building, areaName: areaName && db.normalizeAreaName(areaName), price, address, architecturalNotes,
      bedrooms: /^\d+$/.test(bedrooms) ? Number(bedrooms) : undefined,
      sizeM2: Number(sizeM2) > 0 ? Number(sizeM2) : undefined
    };
  }

  const workflow = await handleListingWorkflow({
    text, photos: incomingPhotos, userKey, parseListing: parseMultilineListingText, template, quickListing,
    photoError: meta.photoError, albumId: meta.mediaGroupId, sharedLocation: meta.sharedLocation
  });
  if (workflow) {
    if (!meta.mediaGroupId && !workflow.ignored) recordBotReply(workflow);
    return workflow;
  }

  // 1. /start or /menu or /help
  if (lower === "/start" || lower === "/menu" || lower === "/help") {
    const status = db.getDbStatus();
    const reply =
      `🏠 *KIN ESTATES*\n` +
      `${status.totalApartments} căn · ${status.availableCount} đang trống · ${status.newInquiriesCount} yêu cầu mới\n\n` +
      "Đăng căn mới bằng nút bên dưới hoặc gửi ảnh từ thư viện để bắt đầu bản nháp.";

    const res = { reply, buttons: getMainMenuButtons() };
    recordBotReply(res);
    return res;
  }

  if (lower === "/form" || lower === "/add") {
    const res = {
      reply:
        "📋 *MẪU ĐĂNG CĂN HỘ ĐẦY ĐỦ & ĐƠN GIẢN (CHẠM KHUNG ĐỂ COPY):*\n" +
        "• Chỉ cần viết *Tiếng Việt* — lên Web tự động dịch đồng bộ cả *6 ngôn ngữ (Việt / Anh / Trung / Nga / Hàn / Nhật)*!\n" +
        "• *Đăng ảnh linh hoạt:* Gửi ảnh/album từ điện thoại **trước**, **sau**, hoặc chọn ảnh rồi dán mẫu vào **Chú thích (Caption)** gửi 1 lần đều được!\n" +
        "• *Ghim bản đồ:* Dán tọa độ, link Google Maps hoặc bấm **📎 → Vị trí**:\n\n" +
        "\x60\x60\x60\nĐĂNG CĂN HỘ\n" +
        "Tên: The Panoma 2 — Căn góc 2PN View Sông Hàn\n" +
        "Tòa nhà: The Panoma (Sun Cosmo)\n" +
        "Khu vực: Ven sông Hàn\n" +
        "Địa chỉ: 58 Trần Thị Lý, Phường Mỹ An, Quận Ngũ Hành Sơn, Đà Nẵng\n" +
        "Ghim bản đồ: 16.0508, 108.2355\n" +
        "Giá: 21tr\n" +
        "Thông số: 2PN | 2WC | 74m2 | Tầng 22 | Hướng Đông Nam\n" +
        "Hợp đồng: Tối thiểu 6 tháng | Cọc 1 tháng | Vào ở: 01/12/2026\n" +
        "Chi phí: Điện EVN ~2.800đ | Nước nhà nước | Wi-Fi: Có | Thú cưng: Cho phép thú cưng nhỏ\n" +
        "Tiện ích: View sông Hàn, Hồ bơi vô cực, Gym, Bàn làm việc, Chỗ đỗ ô tô\n" +
        "Mô tả: Căn góc 2 mặt kính Low-E cách âm, nội thất gỗ sồi mới 100%, máy giặt sấy riêng, bàn làm việc cạnh cửa sổ lớn và cáp quang 300Mbps.\n\x60\x60\x60",
      buttons: [[{ text: "➕ Đăng từng bước (/wizard)", callback_data: "/wizard" }, { text: "📝 Mở bản nháp (/draft)", callback_data: "/draft" }]]
    };
    recordBotReply(res);
    return res;
  }

  if (lower === "/tools") {
    return { reply: "⚙️ Công cụ quản lý & Đồng bộ Web", parseMode: null, buttons: [
      [{ text: "🚀 Đồng bộ lên Web Live", callback_data: "/sync_web" }],
      [{ text: "🔑 Khách đang thuê", callback_data: "/tenants" }, { text: "🏡 Chủ nhà gửi căn", callback_data: "/owners" }],
      [{ text: "📊 Xuất / Nhập Excel", callback_data: "/excel" }, { text: "🏠 Về Menu", callback_data: "/menu" }]
    ] };
  }

  if (lower === "/sync_web") {
    const syncRes = await autoDeployService.syncStoreToLiveWeb("manual /sync_web");
    const msg = syncRes.pushed
      ? "✅ Đã đẩy toàn bộ căn hộ & ảnh mới nhất lên Website Deploy!\nTrang web kin-estates-danang.vercel.app sẽ tự cập nhật sau ~15 giây."
      : syncRes.unchanged
      ? "✅ Dữ liệu và ảnh trên Website Deploy đã đồng bộ mới nhất rồi!"
      : syncRes.skipped
      ? "ℹ️ Hệ thống đang chạy ở chế độ Cloud trực tiếp."
      : `⚠️ Chưa thể đồng bộ tự động (${syncRes.error || "lỗi git"}).`;
    return { reply: msg, parseMode: null, buttons: getMainMenuButtons() };
  }

  if (lower.startsWith("/apt_tools ")) {
    const apt = await db.getApartmentByCodeOrId(text.split(/\s+/)[1]);
    if (!apt) return { reply: "Không tìm thấy căn hộ.", buttons: getMainMenuButtons() };
    return { reply: `⚙️ Thao tác nâng cao · ${apt.code}`, parseMode: null, buttons: [
      [{ text: "🔄 Thay toàn bộ ảnh mới", callback_data: `/setphoto ${apt.code}` }],
      [{ text: "🔑 Nhập hợp đồng khách thuê", callback_data: `/rent_prompt ${apt.code}` }],
      [{ text: "🗑️ Xóa bài đăng", callback_data: `/delete ${apt.code}` }, { text: "⬅️ Quay lại", callback_data: `/apt ${apt.code}` }]
    ] };
  }

  const listCommand = text.match(/^\/(list|empty|rented|hidden)(?:\s+(.+))?$/i);
  if (listCommand) {
    const isFixture = String(process.env.PUBLIC_SITE_URL || "").includes(".invalid");
    const filter = listCommand[1].toLowerCase();
    const requested = listCommand[2] || "";
    const paging = requested.match(/^p([1-9]\d*)(?:\s+|$)(.*)$/i);
    const keyword = (paging ? paging[2] : requested).trim();
    const clean = value => String(value || "").normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
    const term = clean(keyword);
    const all = await db.getApartments({ includeHidden: true });
    const apartments = all.filter(apt => {
      const hidden = apt.isVisible === false || apt.status === "Hidden";
      if (filter === "empty" && (hidden || apt.status !== "Available")) return false;
      if (filter === "hidden" && !hidden) return false;
      if (filter === "rented" && !hidden && !["Reserved", "Rented"].includes(apt.status)) return false;
      return !term || [apt.code, apt.building, apt.title?.vi || apt.title, apt.areaName].some(value => clean(value).includes(term));
    });
    const pageSize = isFixture ? 8 : 4;
    const pages = Math.max(1, Math.ceil(apartments.length / pageSize));
    const page = Math.min(pages, Number(paging?.[1] || 1));
    const entries = apartments.slice((page - 1) * pageSize, page * pageSize);
    const contactSummary = await getApartmentContactSummary(entries.map(apt => apt.code));
    const labels = { list: "Kho căn hộ", empty: "Đang trống", rented: "Đã thuê, đã cọc hoặc đang ẩn", hidden: "Đang ẩn" };
    const statuses = { Available: "🟢", Rented: "🔴", Reserved: "🟡", Hidden: "⚪" };
    const listBack = `/${filter}${page > 1 ? ` p${page}` : ""}${keyword ? ` ${keyword}` : ""}`;
    const rows = entries.map(apt => {
      const count = contactSummary.get(apt.code.toUpperCase())?.people || 0;
      const title = String(apt.title?.vi || apt.title?.en || apt.title || apt.code);
      const marker = apt.isVisible === false ? "⚪" : statuses[apt.status] || "⚪";
      const detail = `/apt ${apt.code}`;
      const fromList = `${detail} ${listBack}`;
      return [{ text: `${marker} ${title.slice(0, 24)}${title.length > 24 ? "…" : ""} · ${count} khách`,
        callback_data: listBack !== "/list" && Buffer.byteLength(fromList) <= 64 ? fromList : detail }];
    });
    const pageButton = (label, index) => ({
      text: label,
      callback_data: `/${filter} p${index}${keyword ? " " + keyword : ""}`
    });
    const pager = [
      ...(page > 1 ? [pageButton("‹ Trang trước", page - 1)] : []),
      ...(page < pages ? [pageButton("Trang sau ›", page + 1)] : [])
    ].filter(item => Buffer.byteLength(item.callback_data) <= 64);
    const roomPhotoCards = entries.map(apt => {
      const counts = contactSummary.get(apt.code.toUpperCase()) || { people: 0, bookings: 0 };
      const title = String(apt.title?.vi || apt.title?.en || apt.title || apt.code);
      const marker = apt.isVisible === false ? "⚪" : statuses[apt.status] || "⚪";
      const isAvail = apt.status === "Available";
      const detail = `/apt ${apt.code}`;
      const fromList = `${detail} ${listBack}`;
      const detailCb = listBack !== "/list" && Buffer.byteLength(fromList) <= 64 ? fromList : detail;
      const specLine = [
        apt.priceVnd ? `${Number(apt.priceVnd).toLocaleString("vi-VN")} ₫/th` : "",
        apt.bedrooms != null ? `${apt.bedrooms} PN` : "",
        apt.sizeM2 != null ? `${apt.sizeM2} m²` : ""
      ].filter(Boolean).join(" · ");
      const caption = [
        `${marker} ${title}`,
        `💰 ${specLine || apt.code} · 👥 ${counts.people} khách`,
        apt.address ? `📍 ${apt.address}` : `🏷️ ${apt.code}`
      ].filter(Boolean).join("\n");
      return {
        photo: apt.images?.[0] || "",
        caption,
        buttons: [[
          { text: "⚙️ Chi tiết", callback_data: detailCb },
          { text: `👥 Khách (${counts.people})`, callback_data: `/apt_contacts ${apt.code}` },
          ...(apt.reservationHold ? [{ text: "📸 Ảnh", callback_data: `/addphoto ${apt.code}` }] : [{
            text: isAvail ? "🔴 Thuê" : "🟢 Trống",
            callback_data: `/status ${apt.code} ${isAvail ? "Rented" : "Available"}`
          }])
        ]]
      };
    });
    const res = {
      reply: [`🏠 ${labels[filter]} · ${apartments.length} căn${pages > 1 ? ` (Trang ${page}/${pages})` : ""}`,
        ...(keyword ? [`🔍 Tìm: ${keyword.slice(0, 120)}`] : []),
        entries.length ? (isFixture ? "Chọn căn để xem chi tiết, khách liên hệ và đặt phòng." : "Bấm trực tiếp dưới ảnh từng căn để quản lý, hoặc gõ `/list tên_căn` để tìm nhanh.") : "Không có căn phù hợp."].join("\n"),
      parseMode: null,
      roomPhotoCards,
      buttons: [
        ...(isFixture ? rows : []),
        ...(pager.length ? [pager] : []),
        [{ text: "Tất cả", callback_data: "/list" }, { text: "🟢 Trống", callback_data: "/empty" },
          { text: "🔴 Thuê / Ẩn", callback_data: "/rented" }],
        [{ text: "➕ Đăng căn mới", callback_data: "/wizard" }, { text: "📋 Mẫu đăng", callback_data: "/form" }, { text: "🏠 Menu", callback_data: "/menu" }]
      ]
    };
    recordBotReply(res);
    return res;
  }

  // 5. /apt <code_or_id> — Detailed single apartment control panel
  if (lower.startsWith("/apt ")) {
    const [, code, listBack] = text.match(/^\/apt\s+(\S+)(?:\s+(\/(?:list|empty|rented|hidden)(?:\s+[^\n]+)?))?$/i) || [];
    const apt = await db.getApartmentByCodeOrId(code);
    if (!apt) {
      const res = {
        reply: `❌ Không tìm thấy căn hộ mã *${code}*.`,
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }

    const counts = (await getApartmentContactSummary([apt.code])).get(apt.code.toUpperCase()) ||
      { people: 0, clicks: 0, bookings: 0 };
    const labels = { Available: "🟢 Đang trống", Reserved: "🟡 Đang giữ chỗ", Rented: "🔴 Đã thuê", Hidden: "⚪ Đang ẩn" };
    const specs = [apt.bedrooms != null ? `${apt.bedrooms} PN` : "", apt.bathrooms != null ? `${apt.bathrooms} WC` : "",
      apt.sizeM2 != null ? `${apt.sizeM2} m²` : "", apt.floor != null ? `Tầng ${apt.floor}` : ""].filter(Boolean);
    const reply = [
      `🏠 ${apt.title?.vi || apt.title?.en || apt.title || apt.code}`,
      `${apt.code} · ${labels[apt.status] || apt.status}${apt.isVisible === false && apt.status !== "Hidden" ? " · 🙈 Ẩn Web" : ""}`,
      `📍 ${apt.address || "Chưa nhập địa chỉ"}`,
      `💰 ${Number(apt.priceVnd).toLocaleString("vi-VN")} ₫/tháng · 📸 ${(apt.images || []).length} ảnh`,
      specs.join(" · "), apt.availableFrom ? `📅 Vào ở từ ${apt.availableFrom.split("-").reverse().join("/")}` : "",
      `👥 ${counts.people} khách liên hệ${counts.clicks ? ` · ${counts.clicks} lượt bấm` : ""}${counts.bookings ? ` · ${counts.bookings} yêu cầu đặt` : ""}`,
      apt.architecturalNotes?.vi?.slice(0, 260)
    ].filter(Boolean).join("\n");

    const res = {
      reply,
      parseMode: null,
      photoPreview: apt.images?.[0] || undefined,
      photoAsMainCard: true,
      buttons: getApartmentControlButtons(apt, counts.people, listBack)
    };
    recordBotReply(res);
    return res;
  }

  // 7. /hide <code_or_id> and /show <code_or_id>
  if (lower.startsWith("/hide") || lower.startsWith("/an ")) {
    const code = text.split(/\s+/)[1];
    const updated = await db.updateApartment(code, { isVisible: false });
    if (!updated) {
      const res = { reply: `❌ Không tìm thấy mã căn hộ *${code}*.`, buttons: getMainMenuButtons() };
      recordBotReply(res);
      return res;
    }
    await sheetsService.pushToGoogleSheetsWebhook("hide_apartment", updated);
    const res = {
      reply: `🙈 *ĐÃ ẨN CĂN HỘ KHỎI WEBSITE:* Căn *${updated.code}* (_${updated.title?.vi}_) hiện đã được ẩn khỏi trang khách hàng.`,
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
    if (target.source === "telegram" && !target.images?.length) {
      return { reply: "Căn này cần ít nhất một ảnh trước khi hiện trên web.", buttons: getApartmentControlButtons(target) };
    }
    if (target.source === "telegram" && !target.address) {
      return { reply: "Căn này cần địa chỉ trước khi hiện trên web.", buttons: getApartmentControlButtons(target) };
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
    if (!["Available", "Reserved", "Rented", "Hidden"].includes(nextStatus)) {
      return { reply: "Trạng thái chưa hợp lệ. Hãy dùng các nút của căn hộ.", buttons: getApartmentControlButtons(target) };
    }
    const updates = {
      status: nextStatus,
      isVisible: nextStatus !== "Hidden" && target.isVisible !== false && target.status !== "Hidden"
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
    const rawPrice = priceInput(parts.slice(2).join(" "));
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
  if (/^\/edit(?:\s|$)/i.test(text) || lower.startsWith("/sua ")) {
    const rest = text.replace(/^\/(edit|sua)\s+/i, "").trim();
    const firstSpace = rest.indexOf(" ");
    if (firstSpace < 0) {
      const res = {
        reply:
          `✏️ *HƯỚNG DẪN SỬA THÔNG TIN CĂN HỘ:*\n` +
          `Gửi lệnh: \`/edit MÃ_CĂN trường=giá trị mới | trường2=giá trị 2\`\n\n` +
          `*Các trường hỗ trợ:* \`title\`, \`building\`, \`address\`, \`area\`, \`price\`, \`br\`, \`m2\`, \`floor\`, \`desc\`, \`pet\`, \`elec\`\n\n` +
          `*Ví dụ:*\n` +
          `\`/edit DN-PAN-1902 price=700 | address=Đường Trần Thị Lý, Ngũ Hành Sơn | desc=Căn góc mới nâng cấp\``,
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
  if (/^\/(?:delete|xoa)(?:\s|$)/i.test(text)) {
    const [, code, confirmation] = text.split(/\s+/);
    if (!code) {
      const res = {
        reply: "⚠️ Vui lòng nhập mã căn hộ cần xóa. Ví dụ: `/delete DN-FIL-2401` hoặc gõ `/list` để bấm nút Xóa.",
        buttons: getMainMenuButtons()
      };
      recordBotReply(res);
      return res;
    }
    if (confirmation !== "confirm") {
      const apt = await db.getApartmentByCodeOrId(code);
      if (!apt) return { reply: "Không tìm thấy căn hộ.", buttons: getMainMenuButtons() };
      return {
        reply: `Xóa vĩnh viễn căn ${apt.code}? Bạn có thể ẩn căn nếu muốn giữ dữ liệu.`,
        parseMode: null,
        buttons: [
          [{ text: "Xóa căn", callback_data: `/delete ${apt.code} confirm` }],
          [{ text: "Quay lại căn hộ", callback_data: `/apt ${apt.code}` }]
        ]
      };
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
        `• Giá: *$${created.priceUsd}/tháng*\n` +
        `📸 Bấm **Up thêm ảnh từ ĐT** bên dưới để chọn ảnh từ điện thoại gắn vào căn hộ này!`,
      buttons: getApartmentControlButtons(created),
      mutated: true
    };
    recordBotReply(res);
    return res;
  }

  // Older keyboards still point here. Show the request and keep lease entry explicit.
  if (lower.startsWith("/lead_to_lease ")) {
    const code = text.split(/\s+/)[1];
    const inquiry = await db.getInquiryByCodeOrId(code);
    if (!inquiry) return { reply: "Không tìm thấy yêu cầu.", buttons: getMainMenuButtons() };
    const apartment = await db.getApartmentByCodeOrId(inquiry.apartmentCode);
    return {
      reply: "Mở hồ sơ khách để xử lý yêu cầu. Chỉ nhập hợp đồng khi đã chốt ngày và giá thuê.",
      parseMode: null,
      buttons: [
        [{ text: "Hồ sơ khách", callback_data: `/lead ${inquiry.code || inquiry._id}` }],
        ...(apartment ? [[{ text: "Nhập hợp đồng", callback_data: `/rent_prompt ${apartment.code}` }]] : [])
      ]
    };
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
        [{ text: "Quay lại căn hộ", callback_data: `/apt ${aptCode}` }],
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

  // 14. /excel or /sync — Send Excel files directly inside Telegram chat & support Excel file upload back into chat!
  if (lower.startsWith("/excel") || lower.startsWith("/sync")) {
    const syncRes = await sheetsService.pushToGoogleSheetsWebhook("manual_sync", {});
    const res = {
      reply:
        `📊 *QUẢN LÝ & CẬP NHẬT HÀNG LOẠT QUA FILE EXCEL NGAY TRÊN TELEGRAM*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Em vừa đính kèm **3 file Excel (.csv chuẩn tiếng Việt)** ngay bên dưới tin nhắn này cho anh:\n` +
        `1️⃣ \`KIN_Estates_KhoCanHo.csv\` — Danh sách căn hộ, giá, trạng thái, ẩn/hiện\n` +
        `2️⃣ \`KIN_Estates_KhachHang_LichHen.csv\` — Danh sách khách đặt lịch xem nhà\n` +
        `3️⃣ \`KIN_Estates_KhachDangThue_HopDong.csv\` — Danh sách khách đang thuê & thời hạn\n\n` +
        `💡 *Cách sửa bằng Excel rồi cập nhật ngược lên Web:*\n` +
        `• Anh mở file \`KIN_Estates_KhoCanHo.csv\` bằng Excel, sửa giá, đổi cột \`Status\` (\`Available\` / \`Rented\` / \`Hidden\`) hoặc thêm dòng căn hộ mới.\n` +
        `• Lưu lại rồi **gửi trực tiếp file \`.csv\` đó vào khung chat Bot Telegram này**, Bot sẽ tự động đọc file và cập nhật toàn bộ lên Website!\n` +
        `• _(${syncRes.message || "Đã đồng bộ"})_`,
      buttons: getMainMenuButtons(),
      sendExcelFiles: true
    };
    recordBotReply(res);
    return res;
  }

  const fallback = {
    reply:
      `🤖 Anh có thể chọn nhanh các nút chức năng bên dưới hoặc gửi ảnh trực tiếp từ điện thoại để đăng căn hộ mới nhé!`,
    buttons: getMainMenuButtons()
  };
  recordBotReply(fallback);
  return fallback;
}

function recordBotReply(res) {
  db.appendBotHistory({
    sender: "bot",
    user: "KIN Estates Bot",
    text: res.reply,
    buttons: res.buttons || []
  });
}

// Send the 3 CSV Excel files directly into a Telegram chat via Multipart FormData
async function sendExcelFilesToTelegramChat(token, chatId) {
  if (!token || !chatId) return;
  try {
    const files = [
      {
        name: "KIN_Estates_KhoCanHo.csv",
        caption: "📊 1. File Excel Kho Căn Hộ (Sửa giá/trạng thái rồi gửi lại file này vào Bot để cập nhật)",
        content: await sheetsService.generateApartmentsCsv(true)
      },
      {
        name: "KIN_Estates_KhachHang_LichHen.csv",
        caption: "📅 2. File Excel Danh Sách Khách Đặt Lịch & Điền Form",
        content: await sheetsService.generateInquiriesCsv(true)
      },
      {
        name: "KIN_Estates_KhachDangThue_HopDong.csv",
        caption: "🔑 3. File Excel Hợp Đồng Khách Đang Thuê & Thời Hạn",
        content: await sheetsService.generateLeasesCsv(true)
      }
    ];

    for (const f of files) {
      const formData = new FormData();
      formData.append("chat_id", String(chatId));
      formData.append("caption", f.caption);
      const blob = new Blob([f.content], { type: "text/csv;charset=utf-8" });
      formData.append("document", blob, f.name);
      await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        body: formData
      });
    }
  } catch (err) {
    console.error("Error sending Excel files to Telegram chat:", err.message);
  }
}

async function notifyNewInquiryToTelegram(inquiry) {
  if (inquiry.type === "direct_contact") return;
  const types = {
    viewing: "Yêu cầu xem căn",
    reservation: "Yêu cầu đặt phòng",
    owner_listing: "Chủ nhà gửi căn",
    shortlist: "Khách cần tư vấn"
  };
  const label = types[inquiry.type] || "Khách liên hệ";
  const code = inquiry.code || inquiry._id;
  const apartment = String(inquiry.apartmentCode || "").trim();
  const when = inquiry.type === "reservation" ? inquiry.moveInDate : inquiry.viewingTime;
  const reply = [
    `🔔 ${label} · ${code}`,
    String(inquiry.clientName || "").slice(0, 130),
    apartment && apartment !== "CURATED-SHORTLIST" ? `Căn ${apartment}` : "",
    when ? `Thời gian: ${String(when).slice(0, 100)}` : ""
  ].filter(Boolean).join("\n");
  const buttons = inquiry.type === "owner_listing" ?
    [[{ text: "Xem chủ nhà gửi căn", callback_data: "/owners" }]] :
    [[{ text: "Xem yêu cầu", callback_data: `/lead ${code}` }],
      ...(apartment && apartment !== "CURATED-SHORTLIST" ? [[{ text: "Chi tiết căn", callback_data: `/apt ${apartment}` }]] : [])];
  const chatId = getTelegramAdminChatId();
  const token = getTelegramToken();
  if (!chatId || !token) return;
  try {
    await deliverTelegramResult(botInstance || new TelegramBot(token), token, chatId, { reply, buttons, parseMode: null });
  } catch {
    console.warn("Could not send Telegram inquiry alert.");
  }
}

const chatQueue = new Map();
const albumReplies = new Map();
let webhookBot;
let webhookToken;

function enqueueChat(chatId, work) {
  const next = (chatQueue.get(chatId) || Promise.resolve()).catch(() => {}).then(work);
  chatQueue.set(chatId, next);
  return next.finally(() => {
    if (chatQueue.get(chatId) === next) chatQueue.delete(chatId);
  });
}

function getTelegramToken() {
  return (process.env.TELEGRAM_BOT_TOKEN || activeToken || db.getSettings().telegramBotToken || "").trim();
}

async function preparePhoto(token, msg) {
  const photo = msg.photo?.at(-1) ||
    (msg.document?.mime_type?.startsWith("image/") ? msg.document : null);
  if (!photo) return {};
  try {
    const url = await storeTelegramPhoto(token, photo);
    return { photoUrls: [url] };
  } catch {
    return { photoError: "Không tải được ảnh này. Hãy gửi lại dưới dạng Ảnh từ thư viện." };
  }
}

function telegramOptions(result) {
  const buttons = result.buttons?.map(row => row.filter(button =>
    !button.callback_data || Buffer.byteLength(button.callback_data, "utf8") <= 64
  )).filter(row => row.length);
  return {
    ...(result.parseMode === null ? {} : { parse_mode: "Markdown" }),
    ...(buttons?.length ? { reply_markup: { inline_keyboard: buttons } } : {})
  };
}

async function sendTelegramPhotoItem(client, chatId, photoUrl, caption, inlineKeyboard) {
  if (!photoUrl) return false;
  const replyOpts = {
    ...(caption ? { caption: String(caption).slice(0, 1024) } : {}),
    ...(inlineKeyboard?.length ? { reply_markup: { inline_keyboard: inlineKeyboard } } : {})
  };
  const mediaId = String(photoUrl).match(/^\/api\/telegram\/media\/([a-f0-9]{64})$/)?.[1];
  if (mediaId) {
    const cover = await getStoredTelegramPhoto(mediaId);
    if (!cover) return false;
    await client.sendPhoto(chatId, cover.bytes, replyOpts, {
      filename: "cover." + cover.contentType.split("/").at(-1),
      contentType: cover.contentType
    });
    return true;
  }
  const dataUri = String(photoUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (dataUri) {
    const buf = Buffer.from(dataUri[2], "base64");
    await client.sendPhoto(chatId, buf, replyOpts, {
      filename: "cover." + dataUri[1].split("/").at(-1),
      contentType: dataUri[1]
    });
    return true;
  }
  if (/^https?:\/\//i.test(String(photoUrl))) {
    await client.sendPhoto(chatId, String(photoUrl), replyOpts);
    return true;
  }
  return false;
}

async function deliverTelegramResult(client, token, chatId, result, albumId) {
  if (result.ignored) return;
  if (result.mutated) {
    autoDeployService.scheduleAutoDeploy("Telegram mutation");
  }
  const isFixture = String(process.env.PUBLIC_SITE_URL || "").includes(".invalid");
  const options = telegramOptions(result);
  if (!isFixture && result.photoAsMainCard && result.photoPreview && !albumId) {
    try {
      const sentCard = await sendTelegramPhotoItem(
        client,
        chatId,
        result.photoPreview,
        result.reply,
        options.reply_markup?.inline_keyboard
      );
      if (sentCard) {
        albumReplies.delete(String(chatId));
        if (result.sendExcelFiles) await sendExcelFilesToTelegramChat(token, chatId);
        return;
      }
    } catch {
      // Fall back to standard message delivery if photo cannot be sent.
    }
  }
  if (!isFixture && Array.isArray(result.roomPhotoCards) && result.roomPhotoCards.length > 0) {
    for (const card of result.roomPhotoCards) {
      try {
        const sentPhoto = await sendTelegramPhotoItem(client, chatId, card.photo, card.caption, card.buttons);
        if (!sentPhoto && card.caption) {
          await client.sendMessage(chatId, card.caption, {
            reply_markup: card.buttons?.length ? { inline_keyboard: card.buttons } : undefined
          });
        }
      } catch {
        // Continue rendering remaining cards even if one image URL cannot be fetched by Telegram.
      }
    }
  }
  if (result.photoPreview && !result.photoAsMainCard) {
    const isMediaId = /^\/api\/telegram\/media\/([a-f0-9]{64})$/.test(String(result.photoPreview));
    if (!isFixture || isMediaId) {
      try {
        await sendTelegramPhotoItem(client, chatId, result.photoPreview, result.photoPreviewCaption || "Ảnh bìa xem trước");
      } catch {
        // A failed cover preview should leave the text review and its controls available.
      }
    }
  }
  const album = albumId && albumReplies.get(String(chatId));
  if (album?.id === albumId) {
    try {
      await client.editMessageText(result.reply, { chat_id: chatId, message_id: album.messageId, ...options });
      return;
    } catch (error) {
      if (/message is not modified/i.test(error.message)) return;
    }
  }
  let sent;
  try {
    sent = await client.sendMessage(chatId, result.reply, options);
  } catch (error) {
    if (!options.parse_mode || !/parse entities/i.test(error.message)) throw error;
    delete options.parse_mode;
    sent = await client.sendMessage(chatId, result.reply, options);
  }
  if (albumId) {
    albumReplies.set(String(chatId), { id: albumId, messageId: sent.message_id });
  } else {
    albumReplies.delete(String(chatId));
  }
  if (result.sendExcelFiles) await sendExcelFilesToTelegramChat(token, chatId);
}

async function importTelegramDocument(client, chatId, document) {
  try {
    const link = await client.getFileLink(document.file_id);
    const response = await fetch(link, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Document download failed");
    const csv = await response.text();
    const isLease = /lease|hopdong|khachdangthue/i.test(document.file_name);
    const imported = isLease ? await sheetsService.importLeasesFromExcelPayload(csv) :
      await sheetsService.importRowsFromSheetPayload(csv);
    await client.sendMessage(chatId, `Đã nhập ${imported.createdOrUpdated} mục từ tệp CSV.`, {
      reply_markup: { inline_keyboard: getMainMenuButtons() }
    });
  } catch {
    await client.sendMessage(chatId, "Không nhập được tệp. Kiểm tra định dạng CSV và thử gửi lại.");
  }
}

async function handleTelegramMessage(client, token, msg) {
  if (!isTelegramAdminChat(msg.chat)) return { ok: true };
  const chatId = msg.chat.id;
  const preparedPhoto = preparePhoto(token, msg);
  return enqueueChat(chatId, async () => {
    if (/\.(csv|tsv|txt)$/i.test(msg.document?.file_name || "")) {
      await importTelegramDocument(client, chatId, msg.document);
      return { ok: true };
    }
    const media = await preparedPhoto;
    const sharedLocation = msg.venue ? { ...msg.venue.location, address: msg.venue.address } :
      (msg.location?.live_period ? null : msg.location);
    const rawText = msg.caption || msg.text || (media.photoUrls?.length || media.photoError || sharedLocation ? "" : "/menu");
    const result = await processTelegramCommand(rawText, {
      chatId,
      username: msg.from?.username || msg.from?.first_name || "Telegram Admin",
      mediaGroupId: msg.media_group_id,
      sharedLocation,
      ...media
    });
    await deliverTelegramResult(client, token, chatId, result, msg.media_group_id);
    return result;
  });
}

async function handleTelegramCallback(client, token, query) {
  if (!isTelegramAdminChat(query.message?.chat)) return { ok: true };
  const chatId = query.message.chat.id;
  const acknowledge = client.answerCallbackQuery(query.id).catch(() => {});
  return enqueueChat(chatId, async () => {
    const result = await processTelegramCommand(query.data, {
      chatId, username: query.from?.username || "Telegram Admin"
    });
    await acknowledge;
    await deliverTelegramResult(client, token, chatId, result);
    return result;
  });
}

async function handleTelegramWebhookUpdate(update) {
  if (botInstance) return { ok: true };
  const token = getTelegramToken();
  if (!token) return { ok: true };
  if (!webhookBot || webhookToken !== token) {
    webhookBot = new TelegramBot(token);
    webhookToken = token;
  }
  if (update.message) return handleTelegramMessage(webhookBot, token, update.message);
  if (update.callback_query) return handleTelegramCallback(webhookBot, token, update.callback_query);
  return { ok: true };
}

function initTelegramBot(customToken) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || customToken || db.getSettings().telegramBotToken || "").trim();
  if (!token) return { active: false, mode: "Waiting for TELEGRAM_BOT_TOKEN" };
  if (!getTelegramAdminChatId()) return { active: false, mode: "Waiting for TELEGRAM_ADMIN_CHAT_ID" };
  if (process.env.VERCEL) {
    activeToken = token;
    registerTelegramBotCommands(token);
    return { active: true, mode: "Telegram Webhook Serverless Active" };
  }
  if (botInstance && activeToken === token) return { active: true, mode: "Live Telegram Polling Connected" };

  try {
    const previous = botInstance;
    const client = new TelegramBot(token, { polling: true });
    botInstance = client;
    activeToken = token;
    if (previous) previous.stopPolling().catch(() => {});
    const logUpdateError = () => console.error("Telegram update could not be completed.");
    client.on("message", msg => handleTelegramMessage(client, token, msg).catch(logUpdateError));
    client.on("callback_query", query => handleTelegramCallback(client, token, query).catch(() => {
      logUpdateError();
      const chat = query.message?.chat;
      if (isTelegramAdminChat(chat)) {
        client.sendMessage(chat.id, "Thao tác chưa được xác nhận. Hãy bấm lại nút hoặc mở bản nháp.").catch(() => {});
      }
    }));
    client.on("polling_error", error => {
      console.error("Telegram polling error.", error.response?.statusCode || error.code || "");
    });
    registerTelegramBotCommands(token);
    return { active: true, mode: "Live Telegram Polling Connected" };
  } catch {
    return { active: false, mode: "Telegram Bot initialization failed" };
  }
}

function getBotStatus() {
  const hasToken = Boolean(activeToken || process.env.TELEGRAM_BOT_TOKEN || db.getSettings().telegramBotToken);
  const adminChatId = getTelegramAdminChatId();
  return {
    connected: Boolean(adminChatId && (botInstance || activeToken || (hasToken && process.env.TELEGRAM_WEBHOOK_SECRET))),
    mode: botInstance
      ? "Live Telegram Bot Polling (@BotFather Connected)"
      : hasToken && adminChatId
      ? "Telegram Webhook & Push Active"
      : "Ready for TELEGRAM_BOT_TOKEN",
    hasToken,
    adminChatId: adminChatId || null
  };
}

module.exports = {
  initTelegramBot,
  processTelegramCommand,
  notifyNewInquiryToTelegram,
  handleTelegramWebhookUpdate,
  sendExcelFilesToTelegramChat,
  registerTelegramBotCommands,
  getBotStatus
};
