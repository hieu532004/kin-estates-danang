const db = require("../db/database");

/**
 * Excel (.csv UTF-8 with BOM for Microsoft Excel) & Google Sheets 2-Way Sync Engine
 * Supports:
 * 1. Full Excel CSV Export (with UTF-8 BOM \uFEFF so Vietnamese opens cleanly in Microsoft Excel)
 *    - Apartments Catalogue (/api/excel/apartments.csv)
 *    - Customer Leads & Viewing Appointments (/api/excel/inquiries.csv)
 *    - Active Tenants & Leases (/api/excel/leases.csv)
 * 2. 2-Way Excel Import (Upload edited .csv / .tsv from Excel or paste table text directly)
 * 3. Real-time Outbound Webhook to Google Sheets Apps Script
 */

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Parse CSV or TSV text (supports quoted fields, commas, tabs, and newlines)
function parseDelimitedText(rawText = "") {
  const clean = String(rawText || "").replace(/^\uFEFF/, "").trim();
  if (!clean) return [];

  const firstLine = clean.split(/\r?\n/)[0] || "";
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? "\t" : semiCount > commaCount ? ";" : ",";

  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (ch === "\r" && next === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
        i++;
      } else if (ch === "\n") {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += ch;
      }
    }
  }
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.replace(/^"|"$/g, "").trim());
  const objects = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.every((cell) => !cell)) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] !== undefined ? row[idx] : "";
    });
    objects.push(obj);
  }
  return objects;
}

async function generateApartmentsCsv(withBom = true) {
  const apartments = await db.getApartments({ includeHidden: true });
  const headers = [
    "Code",
    "Property_Type",
    "Title_VI",
    "Title_EN",
    "Building",
    "Address",
    "Area",
    "Price_USD",
    "Price_VND",
    "Bedrooms",
    "Bathrooms",
    "Size_M2",
    "Floor",
    "Status",
    "Visible",
    "Electricity",
    "Pet_Policy",
    "Description_VI",
    "Tags",
    "Image_URLs",
    "Current_Tenant"
  ];

  const rows = apartments.map((a) => [
    escapeCsvField(a.code),
    escapeCsvField(a.propertyType || db.inferPropertyType(a)),
    escapeCsvField(a.title?.vi || ""),
    escapeCsvField(a.title?.en || ""),
    escapeCsvField(a.building || ""),
    escapeCsvField(a.address || ""),
    escapeCsvField(a.areaName || ""),
    a.priceUsd || 0,
    a.priceVnd || 0,
    a.bedrooms || 1,
    a.bathrooms || 1,
    a.sizeM2 || 60,
    a.floor || 1,
    escapeCsvField(a.status || "Available"),
    a.isVisible === false ? "FALSE" : "TRUE",
    escapeCsvField(a.electricityRate || "Giá nhà nước EVN"),
    escapeCsvField(a.petPolicy || ""),
    escapeCsvField(a.architecturalNotes?.vi || ""),
    escapeCsvField((a.tags || []).join(" | ")),
    escapeCsvField((a.images || []).join(" | ")),
    escapeCsvField(
      a.currentTenant
        ? `${a.currentTenant.tenantName} (${a.currentTenant.startDate} -> ${a.currentTenant.endDate})`
        : ""
    )
  ]);

  const csvBody = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return withBom ? "\uFEFF" + csvBody : csvBody;
}

async function generateInquiriesCsv(withBom = true) {
  const inquiries = await db.getInquiries();
  const headers = [
    "Code",
    "Type",
    "Status",
    "Client_Name",
    "Messenger",
    "Contact_Handle",
    "Apartment_Code",
    "Apartment_Title",
    "Viewing_Time",
    "Move_In_Date",
    "Lease_Duration",
    "Budget_USD",
    "Bedrooms",
    "Client_Notes",
    "Admin_Notes",
    "Created_At"
  ];

  const rows = inquiries.map((i) => [
    escapeCsvField(i.code || i._id),
    escapeCsvField(i.type || "viewing"),
    escapeCsvField(i.status || "New"),
    escapeCsvField(i.clientName || ""),
    escapeCsvField(i.messenger || ""),
    escapeCsvField(i.contactHandle || ""),
    escapeCsvField(i.apartmentCode || ""),
    escapeCsvField(i.apartmentTitle || ""),
    escapeCsvField(i.viewingTime || i.moveInDate || ""),
    escapeCsvField(i.moveInDate || ""),
    escapeCsvField(i.leaseDuration || ""),
    escapeCsvField(i.budgetUsd || ""),
    escapeCsvField(i.bedrooms || ""),
    escapeCsvField(i.notes || ""),
    escapeCsvField(i.adminNotes || ""),
    escapeCsvField(i.createdAt || "")
  ]);

  const csvBody = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return withBom ? "\uFEFF" + csvBody : csvBody;
}

async function generateLeasesCsv(withBom = true) {
  const leases = await db.getLeases();
  const headers = [
    "Lease_Code",
    "Apartment_Code",
    "Apartment_Title",
    "Building",
    "Address",
    "Tenant_Name",
    "Tenant_Contact",
    "Nationality",
    "Price_USD",
    "Price_VND",
    "Deposit_Months",
    "Start_Date",
    "End_Date",
    "Status",
    "Hide_On_Web",
    "Notes"
  ];

  const rows = leases.map((l) => [
    escapeCsvField(l.code),
    escapeCsvField(l.apartmentCode),
    escapeCsvField(l.apartmentTitle || ""),
    escapeCsvField(l.building || ""),
    escapeCsvField(l.address || ""),
    escapeCsvField(l.tenantName || ""),
    escapeCsvField(l.tenantContact || ""),
    escapeCsvField(l.nationality || ""),
    l.priceUsd || 0,
    l.priceVnd || 0,
    l.depositMonths || 1,
    escapeCsvField(l.startDate || ""),
    escapeCsvField(l.endDate || ""),
    escapeCsvField(l.status || "Active"),
    l.hideApartmentOnWeb ? "TRUE" : "FALSE",
    escapeCsvField(l.notes || "")
  ]);

  const csvBody = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return withBom ? "\uFEFF" + csvBody : csvBody;
}

async function importRowsFromSheetPayload(inputRowsOrCsv) {
  const rows =
    typeof inputRowsOrCsv === "string"
      ? parseDelimitedText(inputRowsOrCsv)
      : Array.isArray(inputRowsOrCsv)
      ? inputRowsOrCsv
      : [];

  const results = { createdOrUpdated: 0, codes: [] };
  for (const row of rows) {
    const codeVal = row.Code || row.code || row["Mã căn"] || row["Ma_Can"] || "";
    const titleVi =
      row.Title_VI ||
      row.title_vi ||
      row["Tên căn hộ"] ||
      row.title ||
      row.Title ||
      "";
    if (!codeVal && !titleVi) continue;

    const existing = codeVal ? await db.getApartmentByCodeOrId(codeVal) : null;
    const statusRaw = String(row.Status || row.status || row["Trạng thái"] || existing?.status || "Available").trim();
    let normalizedStatus = "Available";
    if (/rented|đã thuê|da thue/i.test(statusRaw)) normalizedStatus = "Rented";
    else if (/reserved|đã cọc|giữ chỗ/i.test(statusRaw)) normalizedStatus = "Reserved";
    else if (/hidden|ẩn|an/i.test(statusRaw)) normalizedStatus = "Hidden";

    const visRaw = row.Visible ?? row.visible ?? row["Hiển thị"];
    const isVisible =
      visRaw !== undefined && visRaw !== ""
        ? !/false|0|no|ẩn|hidden/i.test(String(visRaw))
        : normalizedStatus !== "Hidden";

    const imageStr = row.Image_URLs || row.Image_URL || row.image || row["Ảnh"] || "";
    const images = imageStr
      ? String(imageStr)
          .split(/[|,\n]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : existing?.images;

    const tagStr = row.Tags || row.tags || row["Tiện ích"] || "";
    const tags = tagStr
      ? String(tagStr)
          .split(/[|,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
      : existing?.tags;

    const payload = {
      ...(existing || {}),
      code: codeVal || undefined,
      ...(row.Property_Type || row.propertyType || row["Loại hình"]
        ? { propertyType: db.normalizePropertyType(row.Property_Type || row.propertyType || row["Loại hình"]) }
        : {}),
      title: {
        ...(existing?.title || {}),
        vi: titleVi || existing?.title?.vi || "Căn hộ KIN Estates",
        en: row.Title_EN || row.title_en || existing?.title?.en || titleVi || "KIN Estates Residence"
      },
      building: row.Building || row.building || row["Tòa nhà"] || existing?.building || "KIN Estates Residence",
      address: row.Address || row.address || row["Địa chỉ"] || existing?.address || "Đà Nẵng",
      areaName: row.Area || row.area || row["Khu vực"] || existing?.areaName || "An Thuong",
      priceUsd: Number(row.Price_USD || row.priceUsd || row["Giá USD"] || existing?.priceUsd || 750),
      priceVnd: Number(row.Price_VND || row.priceVnd || row["Giá VNĐ"] || 0) || undefined,
      bedrooms: Number(row.Bedrooms || row.bedrooms || row["Số PN"] || existing?.bedrooms || 1),
      bathrooms: Number(row.Bathrooms || row.bathrooms || row["Số WC"] || existing?.bathrooms || 1),
      sizeM2: Number(row.Size_M2 || row.sizeM2 || row["Diện tích"] || existing?.sizeM2 || 60),
      floor: Number(row.Floor || row.floor || row["Tầng"] || existing?.floor || 12),
      status: normalizedStatus,
      isVisible,
      electricityRate:
        row.Electricity || row.electricityRate || row["Giá điện"] || existing?.electricityRate || "Giá nhà nước EVN",
      petPolicy:
        row.Pet_Policy || row.petPolicy || row["Thú cưng"] || existing?.petPolicy || "Thương lượng",
      architecturalNotes: {
        ...(existing?.architecturalNotes || {}),
        vi:
          row.Description_VI ||
          row.description ||
          row["Mô tả"] ||
          existing?.architecturalNotes?.vi ||
          "Căn hộ kiến trúc đầy đủ nội thất cao cấp tại Đà Nẵng."
      },
      tags,
      images,
      source: "excel"
    };

    const saved = await db.createApartment(payload);
    results.createdOrUpdated++;
    results.codes.push(saved.code);
  }

  db.logSyncEvent({
    direction: "inbound",
    action: "excel_import_apartments",
    status: "success",
    detail: `Đã đồng bộ ${results.createdOrUpdated} căn hộ từ Excel (${results.codes.join(", ")})`
  });
  return results;
}

async function importLeasesFromExcelPayload(inputRowsOrCsv) {
  const rows =
    typeof inputRowsOrCsv === "string"
      ? parseDelimitedText(inputRowsOrCsv)
      : Array.isArray(inputRowsOrCsv)
      ? inputRowsOrCsv
      : [];

  const results = { createdOrUpdated: 0, codes: [] };
  for (const row of rows) {
    const aptCode = row.Apartment_Code || row.apartmentCode || row["Mã căn"] || "";
    const tenantName = row.Tenant_Name || row.tenantName || row["Tên khách thuê"] || "";
    if (!aptCode || !tenantName) continue;

    const saved = await db.createLease({
      code: row.Lease_Code || row.code || row["Mã HĐ"] || undefined,
      apartmentCode: aptCode,
      apartmentTitle: row.Apartment_Title || row.apartmentTitle || undefined,
      building: row.Building || row.building || undefined,
      address: row.Address || row.address || undefined,
      tenantName,
      tenantContact: row.Tenant_Contact || row.tenantContact || row["Liên hệ"] || "",
      nationality: row.Nationality || row.nationality || "",
      priceUsd: Number(row.Price_USD || row.priceUsd || 0) || undefined,
      priceVnd: Number(row.Price_VND || row.priceVnd || 0) || undefined,
      depositMonths: Number(row.Deposit_Months || row.depositMonths || 1),
      startDate: row.Start_Date || row.startDate || row["Ngày bắt đầu"] || undefined,
      endDate: row.End_Date || row.endDate || row["Ngày kết thúc"] || undefined,
      status: row.Status || row.status || "Active",
      hideApartmentOnWeb: /true|1|yes|ẩn/i.test(String(row.Hide_On_Web || "")),
      notes: row.Notes || row.notes || ""
    });
    results.createdOrUpdated++;
    results.codes.push(saved.code);
  }

  db.logSyncEvent({
    direction: "inbound",
    action: "excel_import_leases",
    status: "success",
    detail: `Đã đồng bộ ${results.createdOrUpdated} hợp đồng khách thuê từ Excel (${results.codes.join(", ")})`
  });
  return results;
}

async function pushToGoogleSheetsWebhook(action, payload) {
  const settings = db.getSettings();
  const webhookUrl = settings.googleSheetsWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    db.logSyncEvent({
      direction: "outbound",
      action,
      status: "local_ready",
      detail: "Đã cập nhật Database & File Excel (.csv) trực tuyến."
    });
    return {
      synced: true,
      mode: "feed_ready",
      message: "Database & Excel CSV Feed đã cập nhật tức thì."
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        data: payload,
        allApartments: await db.getApartments({ includeHidden: true }),
        allInquiries: await db.getInquiries(),
        allLeases: await db.getLeases()
      })
    });
    const text = await response.text();
    db.logSyncEvent({
      direction: "outbound",
      action,
      status: response.ok ? "success" : "warning",
      detail: `Đã đẩy lên Google Sheets / Excel Webhook (${response.status}): ${text.slice(0, 120)}`
    });
    return { synced: response.ok, status: response.status, response: text };
  } catch (err) {
    db.logSyncEvent({
      direction: "outbound",
      action,
      status: "error",
      detail: err.message
    });
    return { synced: false, error: err.message };
  }
}

function getGoogleAppsScriptTemplate(serverUrl = "https://kin-estates-danang.vercel.app") {
  return `/**
 * GOOGLE APPS SCRIPT — Đồng bộ 2 chiều Excel / Google Sheets <-> KIN ESTATES & Bot Telegram
 * Cách cài: Mở Google Sheet -> Extensions -> Apps Script -> Dán code -> Deploy dạng Web App.
 */
const API_BASE = "${serverUrl}";

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const body = JSON.parse(e.postData.contents);

  // 1. Sheet Căn hộ (Apartments)
  const aptSheet = ss.getSheetByName("Apartments") || ss.insertSheet("Apartments");
  aptSheet.clearContents();
  aptSheet.appendRow(["Code", "Title_VI", "Title_EN", "Building", "Address", "Area", "Price_USD", "Price_VND", "Bedrooms", "Bathrooms", "Size_M2", "Floor", "Status", "Visible", "Electricity", "Pet_Policy", "Description_VI", "Image_URLs"]);
  (body.allApartments || []).forEach(a => {
    aptSheet.appendRow([
      a.code, a.title?.vi || "", a.title?.en || "", a.building || "", a.address || "", a.areaName || "",
      a.priceUsd || 0, a.priceVnd || 0, a.bedrooms || 1, a.bathrooms || 1, a.sizeM2 || 60, a.floor || 1,
      a.status || "Available", a.isVisible !== false, a.electricityRate || "", a.petPolicy || "",
      a.architecturalNotes?.vi || "", (a.images || []).join(" | ")
    ]);
  });

  // 2. Sheet Khách đặt lịch & Điền form (Inquiries)
  const inqSheet = ss.getSheetByName("Inquiries") || ss.insertSheet("Inquiries");
  inqSheet.clearContents();
  inqSheet.appendRow(["Code", "Type", "Status", "Client_Name", "Messenger", "Contact_Handle", "Apartment_Code", "Viewing_Time", "Budget_USD", "Notes", "Created_At"]);
  (body.allInquiries || []).forEach(i => {
    inqSheet.appendRow([
      i.code, i.type, i.status, i.clientName, i.messenger, i.contactHandle, i.apartmentCode, i.viewingTime || i.moveInDate, i.budgetUsd, i.notes, i.createdAt
    ]);
  });

  // 3. Sheet Hợp đồng khách đang thuê (Leases)
  const leaseSheet = ss.getSheetByName("Leases") || ss.insertSheet("Leases");
  leaseSheet.clearContents();
  leaseSheet.appendRow(["Lease_Code", "Apartment_Code", "Tenant_Name", "Tenant_Contact", "Price_USD", "Start_Date", "End_Date", "Status", "Notes"]);
  (body.allLeases || []).forEach(l => {
    leaseSheet.appendRow([
      l.code, l.apartmentCode, l.tenantName, l.tenantContact, l.priceUsd, l.startDate, l.endDate, l.status, l.notes
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

// Đẩy ngược thay đổi từ Sheet Apartments về Website & Bot Telegram
function pushEditedSheetToServer() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Apartments");
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const rows = data.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  });

  UrlFetchApp.fetch(API_BASE + "/api/sheets/import", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ rows })
  });
}`;
}

module.exports = {
  parseDelimitedText,
  generateApartmentsCsv,
  generateInquiriesCsv,
  generateLeasesCsv,
  pushToGoogleSheetsWebhook,
  importRowsFromSheetPayload,
  importLeasesFromExcelPayload,
  getGoogleAppsScriptTemplate
};
