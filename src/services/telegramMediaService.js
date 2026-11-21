const { createHash, randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Binary } = require("mongoose").mongo;
const db = require("../db/database");

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 24_000_000;
const DOWNLOAD_TIMEOUT_MS = 15_000;
const MAX_CONCURRENT_DOWNLOADS = 4;
const MAX_QUEUED_DOWNLOADS = 32;
const MEDIA_ID = /^[a-f0-9]{64}$/;
const FILE_ID = /^[A-Za-z0-9_=-]{1,512}$/;
const TOKEN = /^\d{1,20}:[A-Za-z0-9_-]{1,128}$/;
const inFlight = new Map();
const downloadQueue = [];
let activeDownloads = 0;

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function mediaDirectory() {
  const directory = path.resolve(process.env.KIN_TELEGRAM_MEDIA_DIR ||
    path.join(path.dirname(db.getDbStatus().storePath), "telegram-media"));
  const relativeToPublic = path.relative(path.resolve(__dirname, "../../public"), directory);
  if (!relativeToPublic || (!relativeToPublic.startsWith(`..${path.sep}`) && relativeToPublic !== ".." &&
      !path.isAbsolute(relativeToPublic))) {
    throw new Error("Telegram media directory must be outside the public website");
  }
  return directory;
}

function checkedCollection(name) {
  const collection = db.getTelegramCollection(name);
  if (!collection && process.env.VERCEL) {
    throw new Error("Telegram media requires MongoDB on Vercel");
  }
  return collection;
}

async function readLocal(kind, id) {
  try {
    return await fs.readFile(path.join(mediaDirectory(), kind, id));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeLocal(kind, id, bytes) {
  const directory = path.join(mediaDirectory(), kind);
  const temporary = path.join(directory, `.${randomUUID()}.tmp`);
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporary, bytes, { flag: "wx" });
    try {
      await fs.rename(temporary, path.join(directory, id));
    } catch (error) {
      // Windows may reject replacement while another upload is creating the same digest.
      if (!["EEXIST", "EPERM", "EACCES"].includes(error.code)) throw error;
      const existing = await readLocal(kind, id);
      if (!existing?.equals(bytes)) throw error;
    }
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function insertOnce(collection, document) {
  try {
    await collection.insertOne(document);
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
}

function validDimensions(width, height) {
  return width > 0 && height > 0 && width * height <= MAX_PHOTO_PIXELS;
}

function isJpeg(bytes) {
  if (bytes.readUInt16BE(0) !== 0xffd8 || bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) return false;
  let hasFrame = false;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 0xff) return false;
    while (bytes[offset] === 0xff) offset++;
    if (offset + 2 >= bytes.length) return false;
    const marker = bytes[offset++];
    const size = bytes.readUInt16BE(offset);
    if (size < 2 || offset + size >= bytes.length) return false;
    if (marker === 0xda) return hasFrame && size >= 8 && offset + size < bytes.length - 2;
    if ((marker >= 0xc0 && marker <= 0xcf) && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (size < 11 || !validDimensions(bytes.readUInt16BE(offset + 5), bytes.readUInt16BE(offset + 3))) {
        return false;
      }
      hasFrame = true;
    }
    offset += size;
  }
  return false;
}

function isPng(bytes) {
  if (bytes.length < 57 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(8) !== 13 || bytes.toString("ascii", 12, 16) !== "IHDR" ||
      !validDimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20))) {
    return false;
  }
  let hasData = false;
  for (let offset = 33; offset + 12 <= bytes.length;) {
    const size = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    offset += size + 12;
    if (offset > bytes.length) return false;
    if (type === "IDAT" && size > 0) hasData = true;
    if (type === "IEND") return hasData && size === 0 && offset === bytes.length;
  }
  return false;
}

function isWebp(bytes) {
  if (bytes.length < 26 || bytes.toString("latin1", 0, 4) !== "RIFF" ||
      bytes.toString("latin1", 8, 12) !== "WEBP" || bytes.readUInt32LE(4) !== bytes.length - 8) {
    return false;
  }
  let hasImage = false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString("latin1", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    offset = start + size + (size % 2);
    if (offset > bytes.length) return false;
    if (type === "VP8 " && size > 10 && bytes.subarray(start + 3, start + 6).toString("hex") === "9d012a") {
      hasImage = validDimensions(bytes.readUInt16LE(start + 6) & 0x3fff, bytes.readUInt16LE(start + 8) & 0x3fff);
    }
    if (type === "VP8L" && size > 5 && bytes[start] === 0x2f) {
      const dimensions = bytes.readUInt32LE(start + 1);
      hasImage = validDimensions((dimensions & 0x3fff) + 1, ((dimensions >>> 14) & 0x3fff) + 1);
    }
    if (type === "VP8X" && (size !== 10 || !validDimensions(
      bytes.readUIntLE(start + 4, 3) + 1, bytes.readUIntLE(start + 7, 3) + 1
    ))) return false;
  }
  return hasImage && offset === bytes.length;
}

function rasterType(bytes) {
  if (bytes.length < 20 || bytes.length > MAX_PHOTO_BYTES) return null;
  if (isJpeg(bytes)) return "image/jpeg";
  if (isPng(bytes)) return "image/png";
  if (isWebp(bytes)) return "image/webp";
  return null;
}

async function readTelegramResponse(url, maxBytes, signal) {
  const response = await fetch(url, { redirect: "error", signal });
  if (!response.ok || !response.body || Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    throw new Error("Invalid Telegram media response");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks, size);
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new Error("Telegram media exceeds the download limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
}

async function downloadPhoto(token, fileId) {
  let bytes;
  try {
    const origin = "https://api.telegram.org";
    const signal = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS);
    const metadata = JSON.parse(await readTelegramResponse(
      `${origin}/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`, 16 * 1024, signal
    ));
    const file = metadata.result;
    if (!metadata.ok || typeof file?.file_path !== "string" ||
        file.file_size > MAX_PHOTO_BYTES || !/^(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/.test(file.file_path)) {
      throw new Error("Invalid Telegram photo metadata");
    }
    bytes = await readTelegramResponse(
      `${origin}/file/bot${token}/${file.file_path}`, MAX_PHOTO_BYTES, signal
    );
  } catch {
    // Request failures may contain the credential-bearing Telegram URLs.
    throw new Error("Không tải được ảnh Telegram hoặc ảnh vượt giới hạn 5 MB.");
  }
  const contentType = rasterType(bytes);
  if (!contentType) throw new Error("Ảnh Telegram không hợp lệ. Hãy gửi ảnh JPEG, PNG hoặc WebP.");
  return { bytes, contentType };
}

async function resolvePhoto(token, fileId, aliasId) {
  const files = checkedCollection("telegram_media");
  const aliases = files && db.getTelegramCollection("telegram_media_aliases");
  const saved = aliases ? (await aliases.findOne({ _id: aliasId }))?.mediaId
    : (await readLocal("aliases", aliasId))?.toString("utf8");
  if (saved && MEDIA_ID.test(saved)) {
    const exists = files ? await files.findOne({ _id: saved }, { projection: { _id: 1 } })
      : await fs.stat(path.join(mediaDirectory(), "photos", saved)).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
    if (exists) return saved;
  }

  const { bytes, contentType } = await downloadPhoto(token, fileId);
  const mediaId = hash(bytes);
  if (files) {
    await insertOnce(files, { _id: mediaId, bytes: new Binary(bytes), contentType });
    if (saved) await aliases.updateOne({ _id: aliasId }, { $set: { mediaId } }, { upsert: true });
    else await insertOnce(aliases, { _id: aliasId, mediaId });
  } else {
    await writeLocal("photos", mediaId, bytes);
    await writeLocal("aliases", aliasId, mediaId);
  }
  return mediaId;
}

function queuePhoto(token, fileId, aliasId) {
  return new Promise((resolve, reject) => {
    const start = () => {
      activeDownloads++;
      resolvePhoto(token, fileId, aliasId).then(resolve, reject).finally(() => {
        activeDownloads--;
        downloadQueue.shift()?.();
      });
    };
    if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) start();
    else if (downloadQueue.length < MAX_QUEUED_DOWNLOADS) downloadQueue.push(start);
    else reject(new Error("Đang tải nhiều ảnh Telegram. Hãy thử lại sau."));
  });
}

async function storeTelegramPhoto(token, { file_id, file_unique_id } = {}) {
  if (typeof token !== "string" || !TOKEN.test(token) ||
      typeof file_id !== "string" || !FILE_ID.test(file_id)) {
    throw new Error("Thiếu cấu hình Telegram hoặc mã ảnh không hợp lệ.");
  }
  const stableId = typeof file_unique_id === "string" && FILE_ID.test(file_unique_id)
    ? `unique:${file_unique_id}`
    : `file:${token.split(":")[0]}:${file_id}`;
  const aliasId = hash(stableId);
  if (!inFlight.has(aliasId)) {
    const pending = queuePhoto(token, file_id, aliasId).finally(() => inFlight.delete(aliasId));
    inFlight.set(aliasId, pending);
  }
  return `/api/telegram/media/${await inFlight.get(aliasId)}`;
}

async function getStoredTelegramPhoto(mediaId) {
  if (!MEDIA_ID.test(mediaId)) return null;
  const files = checkedCollection("telegram_media");
  if (files) {
    const file = await files.findOne({ _id: mediaId });
    if (!file) return null;
    return { bytes: Buffer.from(file.bytes.value()), contentType: file.contentType };
  }
  const bytes = await readLocal("photos", mediaId);
  const contentType = bytes && rasterType(bytes);
  return contentType ? { bytes, contentType } : null;
}

module.exports = { storeTelegramPhoto, getStoredTelegramPhoto, MEDIA_ID, FILE_ID };
