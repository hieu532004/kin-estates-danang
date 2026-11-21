/**
 * Saves Telegram and optional Google Sheets settings in the local .env file.
 * Usage:
 *   node setup-telegram-bot.js <TELEGRAM_BOT_TOKEN> [GOOGLE_SHEETS_WEBHOOK_URL]
 */
const fs = require("fs");
const path = require("path");

const token = process.argv[2] || "";
const sheetWebhook = process.argv[3] || "";

if (!token) {
  console.log(`
=======================================================================
🤖 HƯỚNG DẪN KẾT NỐI BOT TELEGRAM QUẢN LÝ TRÊN ĐIỆN THOẠI (BACKEND)
=======================================================================
Website (http://localhost:3000) giờ đã tách biệt 100% dành riêng cho khách hàng quốc tế.
Toàn bộ việc Đăng bài (/add), Xóa bài (/delete), Đổi giá (/price), Xem khách (/inquiries)
được thực hiện riêng tư ngay trên ứng dụng Telegram điện thoại của bạn!

Cách kết nối:
1. Mở Telegram tìm @BotFather -> gõ /newbot -> lấy TELEGRAM_BOT_TOKEN
2. Chạy lệnh:
   node setup-telegram-bot.js <TELEGRAM_BOT_TOKEN>
   (Hoặc điền TELEGRAM_BOT_TOKEN=... vào file .env)
3. Điền TELEGRAM_ADMIN_CHAT_ID bằng ID chat riêng của tài khoản quản trị.
4. Khởi động lại backend. Mở bot trong Telegram và gửi /start.
=======================================================================
`);
  process.exit(0);
}

if (!/^\d{6,16}:[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error("Token Telegram không đúng định dạng.");
  process.exit(1);
}

const envPath = path.join(__dirname, ".env");
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

if (envContent.includes("TELEGRAM_BOT_TOKEN=")) {
  envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*/g, `TELEGRAM_BOT_TOKEN=${token}`);
} else {
  envContent += `\nTELEGRAM_BOT_TOKEN=${token}\n`;
}

if (sheetWebhook) {
  if (envContent.includes("GOOGLE_SHEETS_WEBHOOK_URL=")) {
    envContent = envContent.replace(/GOOGLE_SHEETS_WEBHOOK_URL=.*/g, `GOOGLE_SHEETS_WEBHOOK_URL=${sheetWebhook}`);
  } else {
    envContent += `\nGOOGLE_SHEETS_WEBHOOK_URL=${sheetWebhook}\n`;
  }
}

fs.writeFileSync(envPath, envContent, { encoding: "utf8", mode: 0o600 });
console.log("Đã lưu cấu hình Telegram vào .env. Khởi động lại backend để áp dụng.");
