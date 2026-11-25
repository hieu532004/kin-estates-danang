const { randomBytes } = require("node:crypto");
const db = require("../db/database");
const sheets = require("./googleSheetsService");
const indexNowService = require("./indexNowService");
const { parseApartmentCoordinates, resolveGoogleMapsInput, isMapUrlString, apartmentMapUrl } = require("./apartmentLocation");

const PHOTO_LIMIT = 20;
const propTypes = [
  ["condo", "🏢 Chung cư"],
  ["apartment", "🏠 Căn hộ thường"],
  ["house", "🏡 Nhà nguyên căn"],
  ["villa", "🌴 Biệt thự / Villa"],
  ["penthouse", "✨ Penthouse"]
];
const areas = [
  ["an", "An Thuong", "An Thượng"],
  ["son", "Son Tra", "Sơn Trà"],
  ["han", "Han Riverfront", "Ven sông Hàn"],
  ["mykhe", "My Khe Beachfront", "Biển Mỹ Khê"]
];
const formatNumber = new Intl.NumberFormat("vi-VN");
const button = (text, callback_data) => ({ text, callback_data });

function result(reply, buttons, extra) {
  return { reply, buttons, parseMode: null, ...extra };
}

function titleOf(apartment) {
  return apartment.title?.vi || apartment.title?.en || apartment.title;
}

function priceInput(value) {
  const text = String(value ?? "").trim().toLowerCase();
  const millions = text.match(/^(\d+(?:[.,]\d{1,2})?)\s*(?:tr|triệu)(?:\s*(?:vnd|vnđ|đ|₫))?$/u);
  const dong = text.match(/^(\d{1,3}(?:[., ]\d{3})+|\d{6,})\s*(?:vnd|vnđ|đ|₫)?$/u);
  const usd = text.match(/^\$?\s*(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:usd|\$)?$/);
  const vnd = millions ? Number(millions[1].replace(",", ".")) * 1e6 :
    dong ? Number(dong[1].replace(/[., ]/g, "")) : 0;
  if (vnd >= 100000 && vnd < 1e10) return `${Math.round(vnd)} VND`;
  const dollars = usd && Number(usd[1].replace(",", "."));
  return dollars >= 1 ? String(dollars) : null;
}

function photosFrom(value) {
  return (Array.isArray(value) ? value : String(value || "").split(/[\n,|]+/))
    .map(url => String(url).trim())
    .filter(url => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url) || /^data:image\//i.test(url));
}

function withPhotos(current, photos) {
  return [...new Set([...current, ...photosFrom(photos)])].slice(0, Math.max(PHOTO_LIMIT, current.length));
}

function newSession(mode, properties = {}) {
  return { mode, id: randomBytes(7).toString("hex"), revision: 0, photos: [], ...properties };
}

function listingSession(previous) {
  const draft = previous?.draft || {};
  const step = !draft.title || !draft.building ? "identity" :
    !draft.areaName ? "location" : !priceInput(draft.price) ? "price" : "photos";
  const { images, ...details } = draft;
  return newSession("listing", { step, details, photos: withPhotos([], images) });
}

function sessionFor(previous) {
  if (!previous || previous.id) return previous;
  if (previous.mode === "photo_upload") {
    return newSession("photos", {
      code: previous.apartmentCode,
      replace: previous.replace && !previous.replacedOnce
    });
  }
  return listingSession(previous);
}

function cancelButtons(session) {
  return [button("Hủy thao tác", `/draft_cancel ${session.id}`)];
}

function photoButtons(session) {
  if (!session.photos.length) return [];
  return [
    button("Bỏ một ảnh", `/draft_remove ${session.id}`),
    ...(session.photos.length > 1 ? [button("Chọn ảnh bìa", `/draft_cover ${session.id}`)] : [])
  ];
}

function managementButtons(code) {
  return [
    [button("Mở căn hộ", `/apt ${code}`), button("Kho căn hộ", "/list")],
    [button("Thêm ảnh", `/addphoto ${code}`), button("Thay bộ ảnh", `/setphoto ${code}`)]
  ];
}

function screen(session, note = "") {
  const prefix = note ? `${note}\n\n` : "";
  if (session.mode === "fields") {
    return result(prefix + `Sửa căn ${session.code}\nNhập mỗi mục trên một dòng.\nGiá: 18,5tr\nTên: Căn 2PN có ban công\nĐịa chỉ: Số nhà, đường, phường, Đà Nẵng\n\nThêm ghim bằng 📎 → Vị trí hoặc nhập Ghim bản đồ: vĩ độ, kinh độ.`, [cancelButtons(session)]);
  }
  const count = session.photos.length;
  const countLine = count ? `Đã nhận ${count}/${PHOTO_LIMIT} ảnh.` : "";
  const footer = [photoButtons(session), cancelButtons(session)].filter(row => row.length);
  if (session.mode === "photos") {
    return result(
      prefix + `${session.gallery ? "Chỉnh bộ ảnh" : session.replace ? "Thay bộ ảnh" : "Thêm ảnh"} · ${session.code}\n${countLine ? countLine + "\n" : ""}Bấm 📎 và chọn ảnh từ thư viện. Bấm Xem trước khi đã gửi đủ.`,
      [...(count ? [[button("Xem trước", `/draft_preview ${session.id}`)]] : []), ...footer]
    );
  }
  if (session.step === "identity") {
    const curType = propTypes.find(([k]) => k === (session.details?.propertyType || "condo"))?.[1] || "🏢 Chung cư";
    const typeRows = [
      propTypes.slice(0, 2).map(([k, lbl]) => button(session.details?.propertyType === k ? `✓ ${lbl}` : lbl, `/draft_type ${session.id} ${k}`)),
      propTypes.slice(2, 5).map(([k, lbl]) => button(session.details?.propertyType === k ? `✓ ${lbl}` : lbl, `/draft_type ${session.id} ${k}`))
    ];
    return result(
      prefix + `1/4 · Loại hình (${curType}) · Tên & Dự án/Đường\nChọn loại hình bên dưới (tùy chọn), sau đó nhập:\nTên bài đăng | Tòa nhà hoặc Tên đường\nVí dụ: Căn 2PN view sông | The Panoma${countLine ? "\n" + countLine : ""}`,
      [...typeRows, ...footer]
    );
  }
  if (session.step === "location") {
    return result(prefix + `2/4 · Vị trí\nNhập Khu vực | Số nhà, đường, phường, thành phố hoặc chọn khu vực trước rồi bổ sung địa chỉ ở bước xem trước.\nGửi ghim bằng 📎 → Vị trí.${countLine ? "\n" + countLine : ""}`,
      [areas.slice(0, 2).map(([key, , label]) => button(label, `/draft_area ${session.id} ${key}`)),
        areas.slice(2).map(([key, , label]) => button(label, `/draft_area ${session.id} ${key}`)), ...footer]);
  }
  if (session.step === "price") {
    return result(prefix + `3/4 · Giá thuê\nNhập giá, ví dụ 850 USD hoặc 18,5tr.\nCó thể ghi thêm PN, m² và tầng. Ví dụ: 18,5tr | 2 | 72 | 18${countLine ? "\n" + countLine : ""}`, footer);
  }
  if (session.step === "details") {
    return result(prefix + "Sửa thông tin bản nháp\nNhập mỗi mục trên một dòng.\nTên: Căn góc view sông\nGiá: 20tr\nĐịa chỉ: Số nhà, đường, phường, Đà Nẵng\n\nBạn cũng có thể gửi 📎 → Vị trí.",
      [[button("Xem lại", `/draft_preview ${session.id}`)], ...footer]);
  }
  return result(prefix + `4/4 · Ảnh và mô tả\nBấm 📎 để gửi cả album. Ảnh đầu tiên sẽ làm ảnh bìa.\nBạn có thể gửi thêm một đoạn mô tả hoặc bấm Xem trước.\n${countLine}`.trim(),
    [[button("Xem trước", `/draft_preview ${session.id}`)], ...footer]);
}

function preview(session) {
  const revision = `${session.id}.${session.revision}`;
  const { details = {}, photos } = session;
  const back = [button("Tiếp tục chỉnh", `/draft_resume ${session.id}`), ...cancelButtons(session)];
  if (session.mode === "photos") {
    return result(
      `Xem trước · ${session.code}\n${session.replace ? "Bộ ảnh sau khi lưu có" : "Thêm"} ${photos.length} ảnh.\n${session.replace || session.coverSelected ? "Ảnh 1 sẽ làm ảnh bìa." : "Giữ nguyên ảnh bìa hiện tại."}`,
      [[button("Lưu ảnh lên web", `/draft_save ${revision}`)], back],
      { photoPreview: session.replace || session.coverSelected ? photos[0] : undefined }
    );
  }
  if (session.mode === "fields") {
    const fields = Object.entries(details).filter(([key]) => fieldNames[key]).map(([key, value]) =>
      `${fieldNames[key]}: ${key === "coordinates" ? `${value.lat}, ${value.lng}` : String(value).slice(0, 200)}`);
    const map = apartmentMapUrl(details);
    return result(`Xem trước · ${session.code}\n${fields.join("\n")}`,
      [[button("Lưu lên web", `/draft_save ${revision}`)], ...(map ? [[{ text: "Kiểm tra trên bản đồ", url: map }]] : []), back]);
  }
  const price = db.parsePriceInput(details.price);
  const optional = [
    details.bedrooms === undefined ? null : `${details.bedrooms} PN`,
    details.sizeM2 ? `${details.sizeM2} m²` : null,
    details.floor === undefined ? null : `Tầng ${details.floor}`
  ].filter(Boolean).join(" · ");
  const canPublish = photos.length > 0 && Boolean(details.address);
  const map = apartmentMapUrl(details);
  return result(
    [`Xem trước · ${details.title}`, `${details.building} · ${details.areaName}`,
      details.address ? `Địa chỉ: ${details.address}` : "Bổ sung địa chỉ trước khi đăng.",
      details.coordinates ? `Ghim: ${details.coordinates.lat}, ${details.coordinates.lng}` :
        details.address ? "Bản đồ sẽ tìm theo địa chỉ." : "",
      `${formatNumber.format(price.priceVnd)} ₫/tháng · $${formatNumber.format(price.priceUsd)}`,
      optional, details.availableFrom ? `Vào ở từ ${details.availableFrom.split("-").reverse().join("/")}` : "",
      `${photos.length} ảnh${photos.length ? " · Ảnh 1 làm ảnh bìa" : " · Thêm ít nhất một ảnh để đăng"}`,
      details.architecturalNotes?.slice(0, 500)].filter(Boolean).join("\n"),
    [[...(canPublish ? [button("Đăng lên web", `/draft_publish ${revision}`)] : []),
      button("Lưu căn ở chế độ ẩn", `/draft_hide ${revision}`)],
      ...(map ? [[{ text: "Kiểm tra trên bản đồ", url: map }]] : []),
      [button("Sửa thông tin", `/draft_edit ${session.id}`), button("Chỉnh ảnh", `/draft_resume ${session.id}`)], cancelButtons(session)],
    { photoPreview: photos[0] }
  );
}

const fieldNames = {
  propertyType: "Loại hình", title: "Tên", titleEn: "Tên tiếng Anh", building: "Tòa nhà / Đường", areaName: "Khu vực", address: "Địa chỉ", district: "Quận",
  price: "Giá", bedrooms: "Phòng ngủ", bathrooms: "Phòng tắm", sizeM2: "Diện tích", landAreaM2: "Diện tích đất",
  floor: "Tầng / Số tầng", frontageRoad: "Đường trước nhà", furnishing: "Nội thất", cleaningService: "Dọn phòng",
  managementFee: "Phí quản lý", parking: "Chỗ đỗ xe", poolInfo: "Hồ bơi", isPinned: "Ghim ưu tiên",
  architecturalNotes: "Mô tả", electricityRate: "Điện", waterRate: "Nước", wifiIncluded: "Wi-Fi",
  availableFrom: "Ngày có thể vào", minLeaseMonths: "Thuê tối thiểu", depositMonths: "Cọc",
  petPolicy: "Thú cưng", orientation: "Hướng", tags: "Tiện ích",
  coordinates: "Ghim bản đồ"
};

function listingDetails(parsed) {
  const details = {};
  const lengths = { title: 200, building: 150, areaName: 100, address: 250, architecturalNotes: 2000 };
  for (const key of Object.keys(fieldNames)) {
    const value = parsed[key];
    if (value !== undefined && value !== "") {
      details[key] = typeof value === "string" ? value.slice(0, lengths[key] || 250) : value;
    }
  }
  if (details.price !== undefined) details.price = priceInput(details.price);
  if (parsed.mapInput) {
    const point = parseApartmentCoordinates(parsed.mapInput);
    if (point) Object.assign(details, { coordinates: point, locationAccuracy: "exact" });
  }
  return details;
}

function applyDetails(session, details) {
  const merged = { ...session.details, ...details };
  const step = !merged.title || !merged.building ? "identity" :
    !merged.areaName ? "location" : !merged.price ? "price" : "photos";
  return { ...session, details: merged, step };
}

async function pushListing(event, apartment) {
  void indexNowService.notifyApartmentIndexed(apartment);
  try {
    await sheets.pushToGoogleSheetsWebhook(event, apartment);
  } catch {
    console.warn("Telegram listing saved. Optional Google Sheets sync failed.");
  }
}

function savedListing(apartment, message) {
  const rows = managementButtons(apartment.code);
  const siteBase = process.env.PUBLIC_SITE_URL || (process.env.VERCEL ? "https://www.kinestatesdanang.com" : "");
  if (apartment.isVisible !== false && siteBase) {
    try {
      const link = new URL(`/apartments/${encodeURIComponent(apartment.code)}`, siteBase);
      if (link.protocol === "https:" || link.protocol === "http:") rows.unshift([{ text: "Mở trên website", url: link.href }]);
    } catch {
      // The site URL is optional.
    }
  }
  return result(`${message}\n${apartment.code} · ${titleOf(apartment)}\n${(apartment.images || []).length} ảnh${apartment.isVisible === false ? " · Đang ẩn" : " · Đang hiện trên web"}`,
    rows, { mutated: true });
}

async function commit(session, action, save, acknowledge) {
  if (session.mode === "listing") {
    if (session.step !== "photos" || (action === "/draft_publish" && (!session.photos.length || !session.details.address))) {
      return screen(session, "Cần điền địa chỉ và thêm ảnh trước khi đăng.");
    }
    const code = `DN-KIN-${session.id.toUpperCase()}`;
    const existing = await db.getApartmentByCodeOrId(code);
    let created = existing;
    if (!created) {
      try {
        created = await db.createApartment({
          ...session.details,
          code,
          images: session.photos,
          source: "telegram",
          locationAccuracy: session.details.coordinates ? "exact" : "area",
          coordinates: session.details.coordinates || null,
          isVisible: action === "/draft_publish"
        }, { insertOnly: true, durable: true });
      } catch (error) {
        if (error.code !== "APARTMENT_EXISTS") throw error;
        created = await db.getApartmentByCodeOrId(code);
        if (!created) throw error;
      }
    }
    const response = savedListing(created, created.isVisible ? "Đã đăng căn hộ." : "Đã lưu căn hộ ở chế độ ẩn.");
    await acknowledge(response);
    if (!existing) await pushListing("create_apartment", created);
    return response;
  }

  const current = await db.getApartmentByCodeOrId(session.code);
  if (!current) return result("Căn hộ này không còn trong kho.", [[button("Kho căn hộ", "/list")], cancelButtons(session)]);
  const isPhotos = session.mode === "photos";
  if (isPhotos && !session.photos.length) return screen(session, "Gửi ít nhất một ảnh trước khi lưu.");
  if (!isPhotos && !Object.keys(session.details || {}).length) return screen(session);
  const conflict = async () => {
    const latest = await db.getApartmentByCodeOrId(session.code);
    if (!latest) return result("Căn hộ này không còn trong kho.", [[button("Kho căn hộ", "/list")]]);
    const refreshed = {
      ...session,
      baseUpdatedAt: latest.updatedAt ?? null,
      revision: session.revision + 1
    };
    await save(refreshed);
    const review = preview(refreshed);
    return { ...review, reply: "Căn hộ vừa có thay đổi trên web. Hãy kiểm tra và xác nhận lại.\n\n" + review.reply };
  };
  if (session.baseUpdatedAt !== undefined && (current.updatedAt ?? null) !== session.baseUpdatedAt) {
    return conflict();
  }
  const existing = Array.isArray(current.images) ? current.images : [];
  const images = session.replace ? session.photos : [...new Set([...existing, ...session.photos])];
  if (isPhotos && images.length > PHOTO_LIMIT) {
    return screen(session, `Bộ ảnh sẽ có ${images.length} ảnh. Hãy bỏ bớt để còn tối đa ${PHOTO_LIMIT} ảnh.`);
  }
  if (!session.replace && session.coverSelected && session.photos.length) {
    const cover = session.photos[0];
    images.splice(images.indexOf(cover), 1);
    images.unshift(cover);
  }
  let updated;
  try {
    const patch = isPhotos ? { images } : { ...session.details };
    if (!isPhotos && patch.address && patch.address !== current.address && !patch.coordinates) {
      Object.assign(patch, { coordinates: null, locationAccuracy: "area" });
    }
    updated = await db.updateApartment(session.code, patch, {
      expectedUpdatedAt: current.updatedAt ?? null
    });
  } catch (error) {
    if (error.code === "APARTMENT_CONFLICT") return conflict();
    throw error;
  }
  if (!updated) return result("Căn hộ này không còn trong kho.", [[button("Kho căn hộ", "/list")], cancelButtons(session)]);
  const response = savedListing(updated, isPhotos ? "Đã lưu bộ ảnh." : "Đã lưu thông tin căn hộ.");
  await acknowledge(response);
  await pushListing(isPhotos ? "update_photos" : "update_apartment", updated);
  return response;
}

async function handleListingWorkflow({ text, photos, userKey, parseListing, quickListing, template, photoError, albumId, sharedLocation }) {
  const lower = text.toLowerCase();
  const [command, ref, choice] = lower.split(/\s+/);
  const cancelCurrent = ["/cancel", "hủy", "huy"].includes(command);
  const begins = ["/wizard", "/draft", "/addphoto", "/setphoto", "/gallery", "/editfields"].includes(command);
  const draftCommand = command.startsWith("/draft_") || command.startsWith("/wiz_");
  if (text.startsWith("/") && !begins && !draftCommand && !cancelCurrent && !quickListing && !photos.length && !photoError) return null;
  const original = await db.getTelegramSession(userKey);
  let session = sessionFor(original);
  const save = value => db.setTelegramSession(userKey, value);
  const albumKey = `${userKey}:closed-albums`;
  const isConfirmation = ["/draft_publish", "/draft_hide", "/draft_save"].includes(command);
  const receiptKey = `${userKey}:draft-receipts`;
  const close = async () => {
    if (session.albumIds?.length) {
      const closed = await db.getTelegramSession(albumKey) || [];
      await db.setTelegramSession(albumKey, [...new Set([...closed, ...session.albumIds])].slice(-12));
    }
    await save(null);
  };
  const persist = async (value, response = screen) => {
    const next = { ...value, revision: value.revision + 1 };
    await save(next);
    return response(next);
  };

  if (cancelCurrent) {
    if (session) await close();
    return result(session ? "Đã hủy thao tác." : "Bạn chưa có thao tác đang nhập.", [[button("Menu", "/menu"), button("Kho căn hộ", "/list")]]);
  }

  if (begins) {
    const requestedMode = ["/addphoto", "/setphoto", "/gallery"].includes(command) ? "photos" :
      command === "/editfields" ? "fields" : "listing";
    const gallery = command === "/gallery";
    const replace = gallery || command === "/setphoto";
    if (session && original !== session) await save(session);
    if (session) {
      const sameApartment = session.code?.toLowerCase() === ref;
      const samePhotoAction = Boolean(session.gallery) === gallery && Boolean(session.replace) === replace;
      const resume = command === "/draft" || (session.mode === requestedMode &&
        (requestedMode === "listing" || (sameApartment && (requestedMode !== "photos" || samePhotoAction))));
      return screen(session, resume ? "" : "Bạn đang có một thao tác dở. Hoàn tất hoặc hủy thao tác đó trước.");
    }
    if (requestedMode === "listing") {
      return persist(listingSession());
    }
    const apartment = ref && await db.getApartmentByCodeOrId(ref.toUpperCase());
    if (!apartment) return result("Không tìm thấy căn hộ.", [[button("Kho căn hộ", "/list")]]);
    return persist(newSession(requestedMode, {
      code: apartment.code,
      baseUpdatedAt: apartment.updatedAt ?? null,
      replace,
      gallery,
      photos: gallery ? photosFrom(apartment.images) : []
    }));
  }

  if (sharedLocation) {
    if (!session || session.mode === "photos") {
      return result("Mở bản nháp hoặc chọn Sửa thông tin của căn hộ trước khi gửi vị trí.",
        [[button("Mở bản nháp", "/draft"), button("Kho căn hộ", "/list")]]);
    }
    const point = parseApartmentCoordinates(sharedLocation);
    if (!point) return screen(session, "Không đọc được ghim. Gửi lại vị trí tĩnh từ Telegram.");
    const details = { coordinates: point, locationAccuracy: "exact" };
    if (sharedLocation.address) details.address = String(sharedLocation.address).trim().slice(0, 250);
    if (session.mode === "fields") return persist({ ...session, details: { ...session.details, ...details } }, preview);
    const next = applyDetails(session, details);
    return persist(next, updated => updated.step === "photos" ? preview(updated) : screen(updated, "Đã nhận ghim bản đồ."));
  }

  if (draftCommand) {
    const receipts = isConfirmation ? await db.getTelegramSession(receiptKey) || [] : [];
    const prior = receipts.find(receipt => receipt.action === command && receipt.ref === ref);
    if (prior) {
      if (session?.id === ref.split(".")[0]) await close();
      return prior.response;
    }
    if (!session) return result("Bạn chưa có bản nháp.", [[button("Đăng căn mới", "/wizard"), button("Kho căn hộ", "/list")]]);
    if (original !== session) await save(session);
    if (ref?.split(".")[0] !== session.id) return screen(session, "Nút này thuộc bản nháp cũ. Dùng các nút bên dưới để tiếp tục.");
    if (command === "/draft_cancel") {
      await close();
      return result("Đã hủy thao tác.", [[button("Menu", "/menu"), button("Kho căn hộ", "/list")]]);
    }
    if (command === "/draft_resume") return screen(session);
    if (command === "/draft_edit" && session.mode === "listing" && session.step === "photos") {
      return persist({ ...session, step: "details" });
    }
    if (command === "/draft_preview") {
      if (session.mode === "listing" && session.step === "details") {
        return persist({ ...session, step: "photos" }, preview);
      }
      const ready = session.mode === "photos" ? session.photos.length :
        session.mode === "fields" ? Object.keys(session.details || {}).length : session.step === "photos";
      return ready ? preview(session) : screen(session, "Hãy hoàn tất thông tin đang nhập.");
    }
    if (command === "/draft_cover" || command === "/draft_remove") {
      const remove = command === "/draft_remove";
      if (choice && /^\d+$/.test(choice)) {
        if (ref !== `${session.id}.${session.revision}`) return screen(session, "Thứ tự ảnh đã thay đổi. Hãy chọn lại.");
        const index = Number(choice) - 1;
        if (!session.photos[index]) return screen(session, "Số ảnh không hợp lệ.");
        const reordered = [...session.photos];
        const [selected] = reordered.splice(index, 1);
        if (!remove) reordered.unshift(selected);
        return persist({ ...session, photos: reordered, coverSelected: !remove || session.coverSelected },
          updated => screen(updated, remove ? "Đã bỏ ảnh được chọn." : "Đã đưa ảnh được chọn lên đầu."));
      }
      const options = session.photos.slice(0, PHOTO_LIMIT).map((_, index) =>
        button(`Ảnh ${index + 1}`, `${command} ${session.id}.${session.revision} ${index + 1}`));
      const rows = [];
      for (let i = 0; i < options.length; i += 4) rows.push(options.slice(i, i + 4));
      return result(remove ? "Chọn ảnh muốn bỏ theo thứ tự trong bộ ảnh." : "Chọn ảnh muốn dùng làm ảnh bìa.", [...rows, cancelButtons(session)]);
    }
    if (command === "/draft_type" && session.mode === "listing") {
      const picked = propTypes.find(([key]) => key === choice);
      if (picked) {
        return persist({ ...session, details: { ...session.details, propertyType: picked[0] } }, (updated) =>
          screen(updated, `Đã chọn loại hình: ${picked[1]}`)
        );
      }
    }
    if (command === "/draft_area" && session.mode === "listing" && session.step === "location") {
      const area = areas.find(([key]) => key === choice);
      if (area) return persist(applyDetails(session, { areaName: area[1] }));
    }
    const validAction = session.mode === "listing" ? ["/draft_publish", "/draft_hide"].includes(command) : command === "/draft_save";
    if (!validAction) return screen(session);
    if (ref !== `${session.id}.${session.revision}`) return screen(session, "Bản nháp đã thay đổi. Chọn Xem trước lại trước khi lưu.");
    return commit(session, command, save, async response => {
      await db.setTelegramSession(receiptKey, [...receipts, { action: command, ref, response }].slice(-12));
      await close();
    });
  }

  if (!session && !quickListing && !template && !photos.length && !photoError) return null;
  if (!session && photoError && !photos.length && !template) return result(photoError, [[button("Đăng căn mới", "/wizard")]]);
  if (!session) session = listingSession();

  if (photos.length || photoError) {
    if (albumId && !session.albumIds?.includes(albumId) && (await db.getTelegramSession(albumKey) || []).includes(albumId)) {
      return { ignored: true };
    }
    if (session.mode === "fields") return screen(session, "Hãy lưu hoặc hủy sửa thông tin trước khi đổi ảnh.");
    const merged = withPhotos(session.photos, photos);
    const changed = merged.length !== session.photos.length || merged.some((url, index) => url !== session.photos[index]);
    if (!template && !quickListing && !changed && !photoError && original === session) {
      return screen(session, session.photos.length >= PHOTO_LIMIT ? "Đã đủ giới hạn 20 ảnh." : "");
    }
    session = {
      ...session,
      photos: merged,
      albumIds: albumId ? [...new Set([...(session.albumIds || []), albumId])].slice(-12) : session.albumIds
    };
    if (!template && !quickListing) {
      return persist(session, updated => screen(updated, photoError || (merged.length === PHOTO_LIMIT ? "Đã đủ giới hạn 20 ảnh." : "")));
    }
  }

  if (session.mode === "photos") return screen(session);
  const pinLine = /^(?:ghim bản đồ|vị trí bản đồ|bản đồ|tọa độ|map|coordinates)\s*[:：]/iu.test(text);
  const parsed = template || (pinLine || session.mode === "fields" || session.step === "details" ? parseListing(text) : null);
  if (parsed || quickListing) {
    const details = listingDetails(parsed || quickListing);
    // Support shortened Google Maps links (maps.app.goo.gl) or address URLs in live production
    const candidateMapUrl = parsed?.mapInput || (isMapUrlString(details.address) ? details.address : "");
    if (candidateMapUrl && !details.coordinates && !String(process.env.PUBLIC_SITE_URL || "").includes(".invalid")) {
      const resolved = await resolveGoogleMapsInput(candidateMapUrl);
      if (resolved) {
        if (resolved.coordinates) {
          details.coordinates = resolved.coordinates;
          details.locationAccuracy = "exact";
        }
        if (resolved.address && (!details.address || isMapUrlString(details.address))) {
          details.address = resolved.address.slice(0, 250);
          if (!details.areaName) details.areaName = db.normalizeAreaName(resolved.address);
        }
      }
    }
    const invalidPin = Boolean(parsed?.mapInput && !details.coordinates);
    const pinHint = "Chưa đọc được ghim. Gửi vị trí qua 📎 hoặc nhập cặp vĩ độ, kinh độ.";
    if (session.mode === "fields") {
      if (details.price === null) return screen(session, "Giá chưa hợp lệ. Ví dụ: 18,5tr hoặc 850 USD.");
      if (!Object.keys(details).length) return screen(session, invalidPin ? pinHint : "Hãy nhập ít nhất một dòng theo mẫu.");
      return persist({ ...session, details: { ...session.details, ...details } }, updated => {
        const review = preview(updated);
        return invalidPin ? { ...review, reply: pinHint + "\n\n" + review.reply } : review;
      });
    }
    if (session.step === "details" && (!Object.keys(details).length || details.price === null)) {
      return screen(session, details.price === null ? "Giá chưa hợp lệ. Ví dụ: 18,5tr hoặc 850 USD." : "Hãy nhập ít nhất một dòng theo mẫu.");
    }
    const next = applyDetails(session, details);
    next.photos = withPhotos(session.photos, parsed?.images);
    return persist(next, updated => {
      if (invalidPin) return screen(updated, pinHint);
      return (session.step === "details" || pinLine || (template && updated.photos.length > 0)) && updated.step === "photos" ? preview(updated) :
        screen(updated, details.price === null ? "Giá chưa hợp lệ. Ví dụ: 18,5tr hoặc 850 USD." : "");
    });
  }

  const parts = text.split("|").map(part => part.trim());
  if (session.step === "identity") {
    if (!parts[0] || !parts[1]) return screen(session, "Nhập cả tên căn và tòa nhà, cách nhau bằng dấu |.");
    return persist(applyDetails(session, { title: parts[0].slice(0, 200), building: parts[1].slice(0, 150) }));
  }
  if (session.step === "location") {
    if (!parts[0]) return screen(session);
    return persist(applyDetails(session, {
      areaName: db.normalizeAreaName(parts[0]).slice(0, 100),
      ...(parts[1] ? { address: parts[1].slice(0, 250) } : {})
    }));
  }
  if (session.step === "price") {
    const price = priceInput(parts[0]);
    const numericSpecs = [parts[1], parts[2], parts[3]];
    const validSpecs = numericSpecs.every((value, i) => !value ||
      (i === 1 ? /^\d+(?:[.,]\d+)?$/.test(value) && Number(value.replace(",", ".")) > 0 : /^\d+$/.test(value)));
    if (!price || !validSpecs) return screen(session, "Giá hoặc thông số chưa hợp lệ. Ví dụ: 18,5tr | 2 | 72 | 18.");
    const details = { price };
    for (const [index, key] of ["bedrooms", "sizeM2", "floor"].entries()) {
      if (numericSpecs[index]) details[key] = Number(numericSpecs[index].replace(",", "."));
    }
    return persist(applyDetails(session, details));
  }
  return persist({ ...session, details: { ...session.details, architecturalNotes: text.slice(0, 2000) } });
}

module.exports = { handleListingWorkflow, priceInput };
