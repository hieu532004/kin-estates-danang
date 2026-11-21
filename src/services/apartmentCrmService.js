const { createHash, randomUUID } = require("node:crypto");
const db = require("../db/database");

const PAGE_SIZE = 5;
const ENTRY_TIMEOUT_MS = 30 * 60 * 1000;
const RESERVATION_TYPES = new Set(["reservation", "booking"]);
const PUBLIC_TYPES = new Set(["viewing", "shortlist", "direct_contact", "owner_listing", ...RESERVATION_TYPES]);
const CONTACT_STATUSES = {
  New: "Mới",
  Contacted: "Đã liên hệ",
  Viewing_Scheduled: "Đã hẹn xem",
  Rented_Closed: "Đã kết thúc",
  Archived: "Đã lưu trữ"
};
const BOOKING_STATUSES = {
  New: "Chờ xác nhận",
  Pending: "Chờ xác nhận",
  Confirmed: "Đang giữ chỗ",
  Cancelled: "Đã hủy",
  Canceled: "Đã hủy"
};
const CRM_COMMANDS = new Set([
  "/apt_contacts", "/crm", "/bookings", "/lead", "/lead_history", "/book", "/crm_status", "/crm_view",
  "/book_confirm", "/book_cancel", "/crm_cancel"
]);

function clean(value, limit = 300) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function codeOf(value) {
  return clean(value, 160).toUpperCase();
}

function isReservation(inquiry) {
  return RESERVATION_TYPES.has(inquiry?.type);
}

function contactIdentity(value) {
  const contact = clean(value, 200).normalize("NFKC").toLowerCase();
  if (!contact || /^(?:bấm liên hệ|khách bấm|click(?:ed)?\b|anonymous$|unknown$|none$|n\/a$)/u.test(contact)) {
    return "";
  }
  if (/^\+?[\d\s().-]+$/.test(contact)) {
    const digits = contact.replace(/\D/g, "").replace(/^(?:00)?84(?=\d{9}$)/, "0");
    return digits.length >= 7 && digits.length <= 15 ? `phone:${digits}` : "";
  }
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) return `email:${contact}`;
  const handle = contact.replace(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\//, "").replace(/^@/, "");
  return /^[\p{L}\d_.-]{2,80}$/u.test(handle) && /\p{L}/u.test(handle) ? `handle:${handle}` : "";
}

function isAnonymousContactClick(inquiry) {
  return inquiry.type === "direct_contact" && !contactIdentity(inquiry.contactHandle);
}

async function getApartmentContactSummary(apartmentCodes) {
  const codes = [...new Set(Array.from(typeof apartmentCodes === "string" ? [apartmentCodes] :
    apartmentCodes || [], codeOf).filter(Boolean))];
  return summarizeContacts(codes, codes.length ? await db.getInquiries({ apartmentCodes: codes }) : []);
}

function summarizeContacts(codes, inquiries) {
  const summary = new Map(codes.map((code) => [code, { people: 0, clicks: 0, bookings: 0 }]));
  const identities = new Map(codes.map((code) => [code, new Set()]));
  for (const inquiry of inquiries) {
    if (inquiry.type === "owner_listing") continue;
    const code = codeOf(inquiry.apartmentCode);
    const row = summary.get(code);
    if (!row) continue;
    if (isAnonymousContactClick(inquiry)) row.clicks++;
    const identity = contactIdentity(inquiry.contactHandle);
    if (identity) identities.get(code).add(identity);
    if (isReservation(inquiry) && ["Pending", "New", "Confirmed"].includes(inquiry.status)) row.bookings++;
  }
  for (const [code, row] of summary) row.people = identities.get(code).size;
  return summary;
}

async function createPublicInquiry(body = {}, headers = {}) {
  const type = clean(body.type, 30) || "viewing";
  if (!PUBLIC_TYPES.has(type)) throw Object.assign(new Error("Loại yêu cầu không hợp lệ."), { code: "INVALID_INQUIRY" });
  const fields = [
    "clientName", "messenger", "contactHandle", "apartmentCode", "apartmentTitle", "budgetUsd",
    "bedrooms", "viewingTime", "moveInDate", "leaseDuration", "notes"
  ];
  const payload = Object.fromEntries(fields.map((field) => [field, clean(body[field], field === "notes" ? 1200 : 200)]));
  if (isReservation({ type }) && !contactIdentity(payload.contactHandle)) {
    throw Object.assign(new Error("Vui lòng nhập số điện thoại hoặc tài khoản liên hệ hợp lệ."),
      { code: "INVALID_INQUIRY" });
  }
  if (type === "owner_listing" && body.ownerPropertyData && typeof body.ownerPropertyData === "object") {
    payload.ownerPropertyData = body.ownerPropertyData;
  }
  const headerKey = typeof headers?.get === "function" ? headers.get("idempotency-key") : headers?.["idempotency-key"];
  const requestId = clean(headerKey || body.idempotencyKey || body.requestId, 160);
  const fingerprint = requestId
    ? createHash("sha256").update(JSON.stringify({ type, ...payload })).digest("hex")
    : undefined;
  return db.submitInquiry(
    { ...payload, type, status: isReservation({ type }) ? "Pending" : "New" },
    { durable: true, requestId: requestId || undefined, fingerprint }
  );
}

function buttons(...rows) {
  return rows.map((row) => row.filter((item) => Buffer.byteLength(item.callback_data) <= 64)).filter((row) => row.length);
}

function button(text, callback_data) {
  return { text, callback_data };
}

function result(reply, keyboard = [], mutated = false) {
  return { reply, buttons: keyboard, parseMode: null, mutated };
}

const menu = [button("Khách hàng", "/crm"), button("Giữ chỗ", "/bookings")];
const cancelEntry = [button("Hủy nhập", "/crm_cancel")];

function pageOf(rows, requestedPage, command) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number.parseInt(requestedPage, 10) || 1));
  const navigation = [];
  if (page > 1) navigation.push(button("‹ Trước", `${command} ${page - 1}`));
  if (page < pages) navigation.push(button("Sau ›", `${command} ${page + 1}`));
  return { rows: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pages, navigation };
}

function newestFirst(rows) {
  const time = (inquiry) => new Date(inquiry.createdAt ?? 0).getTime() || 0;
  return [...rows].sort((left, right) => time(right) - time(left));
}

function contactGroup(inquiry) {
  if (inquiry.type === "owner_listing") return "";
  const identity = contactIdentity(inquiry.contactHandle);
  return identity ? JSON.stringify([codeOf(inquiry.apartmentCode), identity]) : "";
}

function inactiveInquiry(inquiry) {
  return inquiry.status === "Archived" ||
    (isReservation(inquiry) && ["Cancelled", "Canceled"].includes(inquiry.status));
}

function contactRows(rows) {
  const contacts = new Map();
  for (const inquiry of newestFirst(rows)) {
    const group = contactGroup(inquiry);
    if (!group) continue;
    const existing = contacts.get(group);
    if (!existing || inactiveInquiry(existing) && !inactiveInquiry(inquiry)) {
      contacts.set(group, inquiry);
    }
  }
  return newestFirst(contacts.values());
}

function statusLabel(inquiry) {
  return (isReservation(inquiry) ? BOOKING_STATUSES : CONTACT_STATUSES)[inquiry.status] || inquiry.status || "Mới";
}

function inquiryCommand(inquiry) {
  return `${isReservation(inquiry) ? "/book" : "/lead"} ${inquiry.code || inquiry._id}`;
}

async function inquiryList(command, code, requestedPage) {
  const isBookingPage = command === "/bookings";
  const apartment = code ? await db.getApartmentByCodeOrId(code) : null;
  if (code && !apartment) return result("Không tìm thấy căn hộ.", buttons(menu));
  const rows = await db.getInquiries(apartment ? { apartmentCodes: [apartment.code] } : {});
  const filtered = isBookingPage ? rows.filter(isReservation) : contactRows(rows);
  const page = pageOf(filtered, requestedPage, apartment ? `/apt_contacts ${apartment.code}` : command);
  let header = isBookingPage ? "Yêu cầu giữ chỗ" : "Khách hàng & lịch xem";
  const actions = [];
  if (apartment) {
    const apartmentCode = codeOf(apartment.code);
    const summary = summarizeContacts([apartmentCode], rows).get(apartmentCode);
    header = `${apartment.code} · ${summary.people} khách · ${summary.clicks} lượt bấm · ${summary.bookings} yêu cầu giữ chỗ`;
    actions.push(button("Thêm khách", `/lead ${apartment.code}`), button("Tạo yêu cầu giữ chỗ", `/book ${apartment.code}`));
  }
  const entries = page.rows.map((inquiry) => [
    button(`${clean(inquiry.clientName, 35) || inquiry.code} · ${clean(statusLabel(inquiry), 25)}`, inquiryCommand(inquiry))
  ]);
  return result(
    filtered.length ? `${header} · ${filtered.length} yêu cầu\nTrang ${page.page}/${page.pages}`
      : `${header}\nChưa có yêu cầu.`,
    buttons(...entries, page.navigation, actions,
      apartment ? [button("Về căn hộ", `/apt ${apartment.code}`)] : [], menu)
  );
}

async function inquiryHistory(code, requestedPage) {
  const inquiry = await db.getInquiryByCodeOrId(code);
  const group = inquiry && contactGroup(inquiry);
  if (!group) return result("Không tìm thấy lịch sử liên hệ.", buttons(menu));
  const rows = newestFirst((await db.getInquiries({ apartmentCodes: [inquiry.apartmentCode] }))
    .filter((record) => contactGroup(record) === group));
  const page = pageOf(rows, requestedPage, `/lead_history ${inquiry.code || inquiry._id}`);
  const entries = page.rows.map((record) => [
    button(`${statusLabel(record)} · ${record.code || record._id}`, inquiryCommand(record))
  ]);
  return result(
    `Lịch sử · ${clean(inquiry.clientName, 80)} · ${inquiry.apartmentCode}\n${rows.length} yêu cầu · Trang ${page.page}/${page.pages}`,
    buttons(...entries, page.navigation, [
      button("Về chi tiết", inquiryCommand(inquiry)),
      button("Khách của căn này", `/apt_contacts ${inquiry.apartmentCode}`)
    ])
  );
}

function inquiryDetail(inquiry, prefix = "", mutated = false) {
  const code = inquiry.code || inquiry._id;
  const status = statusLabel(inquiry);
  const actions = [];
  if (isReservation(inquiry)) {
    if (["Pending", "New"].includes(inquiry.status)) actions.push(button("Xác nhận giữ chỗ", `/book_confirm ${code}`));
    if (["Pending", "New", "Confirmed"].includes(inquiry.status)) actions.push(button("Hủy giữ chỗ", `/book_cancel ${code}`));
  } else if (inquiry.type !== "owner_listing") {
    if (inquiry.status !== "Contacted") actions.push(button("Đã liên hệ", `/crm_status ${code} Contacted`));
    actions.push(button("Đặt giờ xem", `/crm_view ${code}`));
    if (inquiry.status !== "Archived") actions.push(button("Lưu trữ", `/crm_status ${code} Archived`));
  }
  const details = [
    prefix,
    `${code} · ${status}`,
    `Căn hộ ${inquiry.apartmentCode}`,
    clean(inquiry.clientName, 120),
    clean(inquiry.contactHandle, 200),
    inquiry.viewingTime && `Lịch xem ${clean(inquiry.viewingTime, 160)}`,
    inquiry.moveInDate && `Dự kiến nhận căn ${clean(inquiry.moveInDate, 160)}`,
    clean(inquiry.notes, 700)
  ].filter(Boolean);
  return result(details.join("\n"), buttons(actions, [
    button("Khách của căn này", `/apt_contacts ${inquiry.apartmentCode}`),
    ...(contactGroup(inquiry) ? [button("Lịch sử liên hệ", `/lead_history ${code}`)] : [])
  ], menu), mutated);
}

function entryPrompt(entry) {
  if (entry.mode === "viewing") return "Nhập ngày giờ hẹn xem theo giờ Việt Nam, ví dụ 14:30 25/11.";
  const extra = entry.mode === "booking" ? "Ngày nhận căn" : "Giờ xem";
  return `${entry.apartmentCode}\nGửi một dòng theo mẫu sau. Ngày giờ và ghi chú là tùy chọn.\nTên khách | SĐT hoặc @tài khoản | ${extra} | Ghi chú`;
}

async function saveEntry(entry, text, key) {
  let saved;
  if (entry.mode === "viewing") {
    const viewingTime = db.normalizeViewingTime(text);
    if (!viewingTime) return result(`Ngày giờ chưa hợp lệ. ${entryPrompt(entry)}`, buttons(cancelEntry));
    saved = await db.updateInquiry(entry.code, { viewingTime, status: "Viewing_Scheduled" });
    if (!saved) {
      if (key) await db.setTelegramSession(key, null);
      return result("Không tìm thấy yêu cầu.", buttons(menu));
    }
  } else {
    const [clientName, contactHandle, time, ...notes] = text.split("|").map((part) => part.trim());
    if (!clientName || !contactIdentity(contactHandle)) {
      return result(`Thiếu tên khách hoặc thông tin liên hệ hợp lệ.\n\n${entryPrompt(entry)}`, buttons(cancelEntry));
    }
    const viewingTime = entry.mode === "lead" && time ? db.normalizeViewingTime(time) : "";
    if (entry.mode === "lead" && time && !viewingTime) {
      return result("Giờ xem chưa hợp lệ. Dùng HH:mm DD/MM hoặc YYYY-MM-DD HH:mm, hoặc bỏ trống giờ xem.",
        buttons(cancelEntry));
    }
    saved = await db.getInquiryByCodeOrId(entry.code);
    if (!saved) {
      const payload = {
        code: entry.code,
        clientName: clean(clientName, 120),
        contactHandle: clean(contactHandle, 200),
        messenger: "Liên hệ trực tiếp",
        apartmentCode: entry.apartmentCode,
        apartmentTitle: entry.apartmentTitle,
        notes: clean(notes.join(" | "), 700)
      };
      saved = entry.mode === "booking"
        ? await db.createReservationInquiry({ ...payload, moveInDate: clean(time, 160) })
        : await db.createInquiry({
            ...payload,
            type: time ? "viewing" : "lead",
            status: time ? "Viewing_Scheduled" : "New",
            viewingTime
          }, { durable: true });
    }
  }
  if (key) await db.setTelegramSession(key, null);
  return inquiryDetail(saved, isReservation(saved) ? "Đã tạo yêu cầu chờ xác nhận." : "Đã lưu thông tin khách.", true);
}

async function handleApartmentCrmCommand(rawText, meta = {}) {
  const text = clean(rawText, 2200);
  const [, verb = "", args = ""] = text.match(/^(\S+)(?:\s+([\s\S]*))?$/) || [];
  const command = verb.toLowerCase();
  const [code = "", page] = args.split(/\s+/, 2);
  const content = args.slice(code.length).trim();
  const key = `crm:${String(meta.chatId ?? meta.userKey ?? meta.username ?? "admin")}`;

  try {
    if (!CRM_COMMANDS.has(command)) {
      if (text.startsWith("/") || !text || meta.photoUrls?.length || meta.photoError) return null;
      const entry = await db.getTelegramSession(key);
      if (!entry || entry.expiresAt < Date.now()) return null;
      return await saveEntry(entry, text, key);
    }
    if (command === "/crm_cancel") {
      await db.setTelegramSession(key, null);
      return result("Đã hủy nhập thông tin.", buttons(menu));
    }
    if (command === "/crm" || command === "/bookings") return await inquiryList(command, "", code);
    if (command === "/apt_contacts") {
      return code ? await inquiryList(command, code, page) : result("Nhập /apt_contacts MÃ_CĂN.", buttons(menu));
    }
    if (command === "/lead_history") return await inquiryHistory(code, page);
    if (command === "/book_confirm" || command === "/book_cancel") {
      const confirm = command === "/book_confirm";
      const { inquiry, changed } = await db.transitionReservation(code, confirm ? "confirm" : "cancel");
      return inquiryDetail(inquiry, confirm ? "Giữ chỗ đã được xác nhận." : "Yêu cầu đã được hủy.", changed);
    }
    const inquiry = code ? await db.getInquiryByCodeOrId(code) : null;
    if (command === "/crm_status" || command === "/crm_view") {
      if (!inquiry || isReservation(inquiry) || inquiry.type === "owner_listing") {
        return result("Không tìm thấy yêu cầu khách hàng.", buttons(menu));
      }
      if (command === "/crm_status") {
        if (!["New", "Contacted", "Archived"].includes(content)) {
          return result("Chọn trạng thái từ các nút bên dưới.", inquiryDetail(inquiry).buttons);
        }
        const updated = await db.updateInquiry(code, { status: content });
        return updated ? inquiryDetail(updated, "Đã cập nhật trạng thái.", true)
          : result("Không tìm thấy yêu cầu khách hàng.", buttons(menu));
      }
      const entry = { mode: "viewing", code, expiresAt: Date.now() + ENTRY_TIMEOUT_MS };
      if (content) return await saveEntry(entry, content);
      await db.setTelegramSession(key, entry);
      return result(entryPrompt(entry), buttons(cancelEntry));
    }

    if (inquiry) return inquiryDetail(inquiry);
    if (!code) return result(`Nhập ${command} MÃ_CĂN để tạo yêu cầu hoặc ${command} MÃ_YÊU_CẦU để xem chi tiết.`, buttons(menu));
    const apartment = await db.getApartmentByCodeOrId(code);
    if (!apartment) return result("Không tìm thấy căn hộ hoặc yêu cầu.", buttons(menu));
    if (command === "/book" && (!db.isPublicApartment(apartment) || apartment.status !== "Available" ||
      apartment.reservationHold)) return result("Căn hộ hiện không nhận yêu cầu giữ chỗ.", buttons(menu));
    const entry = {
      mode: command === "/book" ? "booking" : "lead",
      code: "KH-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase(),
      apartmentCode: apartment.code,
      apartmentTitle: apartment.title?.vi || apartment.title?.en || apartment.title || apartment.code,
      expiresAt: Date.now() + ENTRY_TIMEOUT_MS
    };
    if (content) return await saveEntry(entry, content);
    await db.setTelegramSession(key, entry);
    return result(entryPrompt(entry), buttons(cancelEntry));
  } catch (error) {
    if (["RESERVATION_NOT_FOUND", "RESERVATION_CONFLICT", "APARTMENT_UNAVAILABLE",
      "RESERVATION_ACTION_REQUIRED", "VIEWING_SLOT_CONFLICT", "INQUIRY_CONFLICT"].includes(error.code)) return result(error.message, buttons(menu));
    throw error;
  }
}

module.exports = { getApartmentContactSummary, handleApartmentCrmCommand, createPublicInquiry, isAnonymousContactClick };
