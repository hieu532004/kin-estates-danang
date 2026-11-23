/**
 * Migrates all local apartments (with 6-language translations), inquiries, leases,
 * and Telegram/Studio uploaded photos directly into MongoDB Atlas.
 *
 * Usage:
 *   node scripts/migrate-to-atlas.js "mongodb+srv://hieuadmin:<PASSWORD>@cluster0.jiofczs.mongodb.net/kin_estates?retryWrites=true&w=majority"
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { Binary } = mongoose.mongo;

const uri = (process.argv[2] || process.env.MONGODB_URI || "").trim();
if (!uri || !uri.startsWith("mongodb+srv://") || uri.includes("<db_password>")) {
  console.error("❌ Vui lòng truyền chuỗi MONGODB_URI hợp lệ (đã thay mật khẩu của hieuadmin).");
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");
const storePath = path.join(rootDir, "src", "data", "mongodb_store.json");
const photosDir = path.join(rootDir, "src", "data", "telegram-media", "photos");

function detectContentType(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return "image/jpeg";
}

async function run() {
  console.log("⏳ Đang kết nối tới MongoDB Atlas...");
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000 });
  console.log("✓ Đã kết nối MongoDB Atlas thành công!");

  const dbConn = mongoose.connection.db;
  const store = JSON.parse(fs.readFileSync(storePath, "utf8"));

  // 1. Upsert Apartments
  const aptCol = dbConn.collection("apartments");
  let aptCount = 0;
  for (const apt of store.apartments || []) {
    const { _id, ...doc } = apt;
    await aptCol.updateOne({ code: doc.code }, { $set: doc }, { upsert: true });
    aptCount++;
  }
  console.log(`✓ Đã đồng bộ ${aptCount} căn hộ lên MongoDB Atlas.`);

  // 2. Upsert Inquiries
  const inqCol = dbConn.collection("inquiries");
  let inqCount = 0;
  for (const inq of store.inquiries || []) {
    const { _id, ...doc } = inq;
    const filter = doc.code ? { code: doc.code } : { clientName: doc.clientName, createdAt: doc.createdAt };
    await inqCol.updateOne(filter, { $set: doc }, { upsert: true });
    inqCount++;
  }
  console.log(`✓ Đã đồng bộ ${inqCount} khách hàng & lịch hẹn lên MongoDB Atlas.`);

  // 3. Upsert Leases
  const leaseCol = dbConn.collection("leases");
  let leaseCount = 0;
  for (const lease of store.leases || []) {
    const { _id, ...doc } = lease;
    await leaseCol.updateOne({ code: doc.code }, { $set: doc }, { upsert: true });
    leaseCount++;
  }
  console.log(`✓ Đã đồng bộ ${leaseCount} hợp đồng thuê lên MongoDB Atlas.`);

  // 4. Upload all local Telegram/Studio photos into telegram_media collection
  const mediaCol = dbConn.collection("telegram_media");
  let photoCount = 0;
  if (fs.existsSync(photosDir)) {
    const files = fs.readdirSync(photosDir).filter((f) => /^[a-f0-9]{64}$/.test(f));
    for (const mediaId of files) {
      const bytes = fs.readFileSync(path.join(photosDir, mediaId));
      const contentType = detectContentType(bytes);
      await mediaCol.updateOne(
        { _id: mediaId },
        { $set: { bytes: new Binary(bytes), contentType } },
        { upsert: true }
      );
      photoCount++;
    }
  }
  console.log(`✓ Đã đồng bộ ${photoCount} ảnh gốc từ điện thoại lên MongoDB Atlas (telegram_media).`);

  // 5. Update local .env so local Bot & server also share the exact same MongoDB Atlas DB
  const envPath = path.join(rootDir, ".env");
  let envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  if (/^MONGODB_URI=/m.test(envText)) {
    envText = envText.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${uri}`);
  } else {
    envText += `\nMONGODB_URI=${uri}\n`;
  }
  fs.writeFileSync(envPath, envText, "utf8");
  console.log("✓ Đã cập nhật MONGODB_URI vào file .env local.");

  await mongoose.disconnect();
  console.log("🎉 HOÀN TẤT DI CHUYỂN TOÀN BỘ DỮ LIỆU & ẢNH LÊN MONGODB ATLAS!");
}

run().catch((err) => {
  console.error("❌ Lỗi kết nối / đồng bộ MongoDB Atlas:", err.message);
  process.exit(1);
});
