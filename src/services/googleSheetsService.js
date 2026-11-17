const db = require("../db/database");

/**
 * Google Sheets 2-Way Integration Service
 * Supports:
 * 1. Live CSV Feed (/api/sheets/export.csv) -> Use =IMPORTDATA("http://your-domain/api/sheets/export.csv") in Google Sheets
 * 2. Outbound Webhook push to Google Apps Script Web App whenever listings/inquiries change
 * 3. Inbound Sync from Google Sheets (via Apps Script POST or Public CSV URL)
 */

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function generateApartmentsCsv() {
  const apartments = await db.getApartments();
  const headers = [
    "Code",
    "Title_VI",
    "Title_EN",
    "Building",
    "Area",
    "Price_USD",
    "Price_VND",
    "Bedrooms",
    "Bathrooms",
    "Size_M2",
    "Floor",
    "Status",
    "Featured",
    "Electricity",
    "Pet_Policy",
    "Image_URL"
  ];

  const rows = apartments.map((a) => [
    escapeCsvField(a.code),
    escapeCsvField(a.title?.vi || ""),
    escapeCsvField(a.title?.en || ""),
    escapeCsvField(a.building || ""),
    escapeCsvField(a.areaName || ""),
    a.priceUsd || 0,
    a.priceVnd || 0,
    a.bedrooms || 1,
    a.bathrooms || 1,
    a.sizeM2 || 60,
    a.floor || 1,
    escapeCsvField(a.status || "Available"),
    a.featured ? "TRUE" : "FALSE",
    escapeCsvField(a.electricityRate || "State Rate"),
    escapeCsvField(a.petPolicy || ""),
    escapeCsvField((a.images && a.images[0]) || "")
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

async function pushToGoogleSheetsWebhook(action, payload) {
  const settings = db.getSettings();
  const webhookUrl = settings.googleSheetsWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;

  if (!webhookUrl) {
    db.logSyncEvent({
      direction: "outbound",
      action,
      status: "local_ready",
      detail: "CSV/JSON Feed updated. Configure GOOGLE_SHEETS_WEBHOOK_URL for instant Apps Script push."
    });
    return {
      synced: true,
      mode: "feed_ready",
      message: "Local MongoDB & CSV/JSON Feed updated. Ready for Google Sheets IMPORTDATA or Apps Script Webhook."
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
        allApartments: await db.getApartments()
      })
    });
    const text = await response.text();
    db.logSyncEvent({
      direction: "outbound",
      action,
      status: response.ok ? "success" : "warning",
      detail: `Pushed to Google Sheets Webhook (${response.status}): ${text.slice(0, 120)}`
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

async function importRowsFromSheetPayload(rows = []) {
  const results = { createdOrUpdated: 0, codes: [] };
  for (const row of rows) {
    if (!row.code && !row.Title_VI && !row.title) continue;
    const saved = await db.createApartment({
      code: row.code || row.Code,
      title: {
        vi: row.title_vi || row.Title_VI || row.title || "Căn hộ từ Google Sheets",
        en: row.title_en || row.Title_EN || row.title || "Apartment from Google Sheets"
      },
      building: row.building || row.Building || "Da Nang Residence",
      areaName: row.area || row.Area || "An Thuong",
      priceUsd: Number(row.priceUsd || row.Price_USD || 750),
      bedrooms: Number(row.bedrooms || row.Bedrooms || 1),
      bathrooms: Number(row.bathrooms || row.Bathrooms || 1),
      sizeM2: Number(row.sizeM2 || row.Size_M2 || 65),
      floor: Number(row.floor || row.Floor || 10),
      status: row.status || row.Status || "Available",
      featured: String(row.featured || row.Featured).toUpperCase() === "TRUE",
      images: row.image || row.Image_URL ? [row.image || row.Image_URL] : undefined,
      source: "google_sheets"
    });
    results.createdOrUpdated++;
    results.codes.push(saved.code);
  }
  db.logSyncEvent({
    direction: "inbound",
    action: "sheet_import",
    status: "success",
    detail: `Synchronized ${results.createdOrUpdated} listings from Google Sheets (${results.codes.join(", ")})`
  });
  return results;
}

function getGoogleAppsScriptTemplate(serverUrl = "http://localhost:3000") {
  return `/**
 * GOOGLE APPS SCRIPT — Kết nối 2 chiều Google Sheets <-> KIN ATELIER & Bot Telegram
 * Cách cài: Mở Google Sheet -> Extensions (Tiện ích mở rộng) -> Apps Script -> Dán code này -> Deploy (Triển khai) dạng Web App.
 */
const API_BASE = "${serverUrl}";

// 1. Nhận dữ liệu tự động từ Website & Bot Telegram đẩy lên Google Sheet
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Apartments") || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Apartments");
  const body = JSON.parse(e.postData.contents);
  const list = body.allApartments || [];

  sheet.clearContents();
  sheet.appendRow(["Code", "Title_VI", "Title_EN", "Building", "Area", "Price_USD", "Bedrooms", "Size_M2", "Status", "Featured", "Image_URL"]);

  list.forEach(item => {
    sheet.appendRow([
      item.code,
      item.title ? item.title.vi : "",
      item.title ? item.title.en : "",
      item.building,
      item.areaName,
      item.priceUsd,
      item.bedrooms,
      item.sizeM2,
      item.status,
      item.featured,
      (item.images && item.images[0]) || ""
    ]);
  });

  return ContentService.createTextOutput(JSON.stringify({ ok: true, count: list.length })).setMimeType(ContentService.MimeType.JSON);
}

// 2. Đẩy ngược dữ liệu chỉnh sửa trên Google Sheet về Website & MongoDB
function syncSheetToWebsite() {
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
  generateApartmentsCsv,
  pushToGoogleSheetsWebhook,
  importRowsFromSheetPayload,
  getGoogleAppsScriptTemplate
};
