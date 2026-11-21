const assert = require("node:assert/strict");
const { fork } = require("node:child_process");
const { createHash } = require("node:crypto");
const { once } = require("node:events");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { setTimeout: pause } = require("node:timers/promises");
const { deflateSync } = require("node:zlib");

const admin = 700000001;
const fixtureToken = "1000000000:synthetic_fixture_only";
const webhookSecret = "synthetic-fixture-webhook";
const apiToken = "synthetic-fixture-admin";
const siteUrl = "https://catalogue.fixture.invalid";
const seedCode = "DN-KIN-FIXTURE";
const seedAddress = "12 Đường Kiểm Thử, An Thượng, Đà Nẵng";
const seedGallery = ["/fixture/original.jpg", "/fixture/original-2.jpg"];
const publicHeaders = { "x-forwarded-host": "catalogue.fixture.invalid" };
const adminHeaders = { authorization: `Bearer ${apiToken}` };

function pngChunk(type, bytes) {
  const nameAndBytes = Buffer.concat([Buffer.from(type), bytes]);
  let crc = 0xffffffff;
  for (const byte of nameAndBytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const chunk = Buffer.alloc(bytes.length + 12);
  chunk.writeUInt32BE(bytes.length);
  nameAndBytes.copy(chunk, 4);
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
  return chunk;
}

function fixturePhoto(number) {
  const header = Buffer.from("00000001000000010802000000", "hex");
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.from([0, number, 110, 220]))),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function mediaPath(number) {
  return `/api/telegram/media/${createHash("sha256").update(fixturePhoto(number)).digest("hex")}`;
}

function runFixture() {
  // The child inherits neither the workspace cwd nor any integration variables.
  // The mocks below also prevent fallbacks from loading credentials or opening connections.
  require("dotenv").config = () => ({ parsed: {} });
  require("mongoose").connect = () => { throw new Error("Unexpected fixture MongoDB connection"); };

  const events = [];
  let sent = 5000;
  let failNextSend = false;
  let failCatalogueWrite;
  const syncFs = require("node:fs");
  const writeFileSync = syncFs.writeFileSync;
  syncFs.writeFileSync = function writeWithFixtureFailure(filename, data, options) {
    if (failCatalogueWrite && typeof data === "string" && typeof filename === "string" &&
        path.dirname(path.resolve(filename)) === path.dirname(process.env.KIN_STORE_PATH)) {
      const newGallery = JSON.parse(data).apartments?.find(apartment => apartment.code === seedCode)?.images;
      if (newGallery?.includes(failCatalogueWrite)) {
        failCatalogueWrite = undefined;
        events.push({ kind: "catalogue-write-rejected" });
        throw Object.assign(new Error("Synthetic fixture catalogue write failure"), { code: "EIO" });
      }
    }
    return writeFileSync.call(this, filename, data, options);
  };
  function record(kind, text, options = {}) {
    for (const button of options.reply_markup?.inline_keyboard?.flat() || []) {
      if (button.callback_data !== undefined) {
        const bytes = Buffer.byteLength(button.callback_data, "utf8");
        assert.ok(bytes > 0 && bytes <= 64, "Telegram callback_data must occupy 1–64 UTF-8 bytes");
      }
    }
    events.push({ kind, text, buttons: options.reply_markup?.inline_keyboard?.flat() || [] });
  }
  const bot = require.resolve("node-telegram-bot-api");
  require.cache[bot] = { id: bot, filename: bot, loaded: true, exports: class FixtureTelegramBot {
    constructor(token, options) {
      assert.equal(token, fixtureToken);
      assert.ok(!options?.polling, "Unexpected fixture polling");
    }
    async sendMessage(chat, text, options) {
      assert.equal(String(chat), String(admin));
      if (failNextSend) {
        failNextSend = false;
        throw new Error("Synthetic Telegram acknowledgement failure");
      }
      record("send", text, options);
      return { message_id: ++sent };
    }
    async editMessageText(text, options) {
      assert.equal(options.chat_id, admin);
      record("edit", text, options);
    }
    async answerCallbackQuery() { events.push({ kind: "ack" }); }
    async sendMediaGroup(chat, media) {
      assert.equal(chat, admin);
      events.push({ kind: "media-group", count: media.length });
      return media.map(() => ({ message_id: ++sent }));
    }
    async sendPhoto(chat) {
      assert.equal(chat, admin);
      events.push({ kind: "photo" });
      return { message_id: ++sent };
    }
  } };

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    if (url.origin !== "https://api.telegram.org") throw new Error("Unexpected fixture outbound fetch");
    if (url.pathname === `/bot${fixtureToken}/sendMessage`) {
      const notification = JSON.parse(options.body);
      assert.equal(String(notification.chat_id), String(admin));
      record("notification", notification.text,
        typeof notification.reply_markup === "string"
          ? { reply_markup: JSON.parse(notification.reply_markup) } : notification);
      return Response.json({ ok: true, result: { message_id: ++sent } });
    }
    if (url.pathname === `/bot${fixtureToken}/getFile`) {
      const fileId = url.searchParams.get("file_id");
      events.push({ kind: "getFile", fileId });
      assert.match(fileId, /^(?:fixture-\d+|fixture-invalid)$/);
      return Response.json({ ok: true, result: { file_path: `photos/${fileId}.png` } });
    }
    const file = url.pathname.match(/^\/file\/bot[^/]+\/photos\/fixture-(\d+|invalid)\.png$/);
    if (file) {
      await pause(20);
      return new Response(file[1] === "invalid" ? "this is not a PNG" : fixturePhoto(Number(file[1])));
    }
    throw new Error("Unexpected fixture Telegram API method");
  };

  const express = require("express");
  const listen = express.application.listen;
  express.application.listen = function startIsolatedListener() {
    const listener = listen.call(this, 0, "127.0.0.1");
    listener.once("listening", () => process.send({ port: listener.address().port }));
    process.on("disconnect", () => listener.close());
    return listener;
  };
  process.on("message", ({ action, value }) => {
    if (action === "failNextSend") failNextSend = true;
    if (action === "failCatalogueWrite") failCatalogueWrite = value;
    process.send(events.splice(0));
  });
  require("../server");
}

async function createFixture(t, { moreApartments = [], inquiries } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "kin-telegram-test-"));
  const store = path.join(root, "store.json");
  const seed = {
    _id: "fixture-apartment", code: seedCode,
    title: { en: "Fixture Apartment", vi: "Căn hộ kiểm thử" },
    building: "Tòa Kiểm Thử", areaName: "An Thuong", address: seedAddress, priceVnd: 20000000, priceUsd: 785,
    status: "Available", isVisible: true, images: seedGallery,
    landlordName: "Fixture landlord", landlordPhone: "5550100"
  };
  await fs.writeFile(store, JSON.stringify({
    apartments: [seed, ...moreApartments],
    inquiries: inquiries || [{ _id: "fixture-inquiry", name: "Fixture inquiry", status: "New" }],
    leases: [{ _id: "fixture-lease", tenantName: "Fixture tenant", status: "Active" }]
  }));

  let child;
  let origin;
  let nextId = 100;
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill();
    await exited;
  }
  t.after(async () => {
    await stop();
    await fs.rm(root, { recursive: true, force: true });
  });
  async function restart() {
    await stop();
    child = fork(__filename, ["--fixture"], {
      cwd: root,
      env: {
        SystemRoot: process.env.SystemRoot,
        PATH: process.env.PATH,
        KIN_STORE_PATH: store,
        KIN_TELEGRAM_MEDIA_DIR: path.join(root, "media"),
        KIN_ADMIN_API_TOKEN: apiToken,
        TELEGRAM_BOT_TOKEN: fixtureToken,
        TELEGRAM_ADMIN_CHAT_ID: String(admin),
        TELEGRAM_WEBHOOK_SECRET: webhookSecret,
        TELEGRAM_WEBHOOK_URL: "https://webhook.fixture.invalid/api/telegram/webhook",
        PUBLIC_SITE_URL: siteUrl
      },
      execArgv: [],
      stdio: ["ignore", "ignore", "inherit", "ipc"]
    });
    const [{ port }] = await once(child, "message", { signal: AbortSignal.timeout(5000) });
    origin = `http://127.0.0.1:${port}`;
  }
  await restart();

  function request(url, { method = "GET", body, headers = {} } = {}) {
    return fetch(origin + url, {
      method, headers: { ...publicHeaders, ...(body && { "content-type": "application/json" }), ...headers },
      body: body && JSON.stringify(body), signal: AbortSignal.timeout(5000), redirect: "manual"
    });
  }

  async function logs(action = "logs", value) {
    const pending = once(child, "message", { signal: AbortSignal.timeout(5000) });
    child.send({ action, value });
    return (await pending)[0];
  }

  function messageUpdate(fields, chat = { id: admin, type: "private" }) {
    const id = ++nextId;
    return { update_id: id, message: { message_id: id, chat, from: { id: chat.id }, ...fields } };
  }

  function callbackUpdate(data, chat = { id: admin, type: "private" }) {
    const id = ++nextId;
    return { update_id: id, callback_query: {
      id: String(id), data, message: { message_id: id, chat }, from: { id: chat.id }
    } };
  }

  function photoUpdate(number, album) {
    return messageUpdate({
      ...(album && { media_group_id: album }),
      photo: [{ file_id: `fixture-${number}`, file_unique_id: `fixture-unique-${number}`, width: 1, height: 1 }]
    });
  }

  function post(update, secret = webhookSecret) {
    return request("/api/telegram/webhook", {
      method: "POST", body: update, headers: { "x-telegram-bot-api-secret-token": secret }
    });
  }

  async function exchange(update) {
    const response = await post(update);
    assert.equal(response.status, 200);
    const exchanges = await logs();
    const result = exchanges.findLast(event => event.kind === "send" || event.kind === "edit");
    assert.ok(result, "Expected a Telegram reply");
    return result;
  }

  async function apartments(url = "/api/apartments") {
    const response = await request(url);
    assert.equal(response.status, 200);
    return (await response.json()).apartments;
  }

  async function detail(code, { authorized = false } = {}) {
    const response = await request(`/api/apartments/${code}`, {
      headers: authorized ? adminHeaders : {}
    });
    assert.equal(response.status, 200);
    return (await response.json()).apartment;
  }

  return {
    seed, request, post, logs, restart, apartments, detail, messageUpdate, callbackUpdate, photoUpdate, exchange,
    message: text => exchange(messageUpdate({ text })), tap: payload => exchange(callbackUpdate(payload)),
    photo: (number, album) => exchange(photoUpdate(number, album))
  };
}

function button(reply, prefix) {
  const match = reply.buttons.find(item => item.callback_data?.split(" ")[0] === prefix);
  assert.ok(match, `Expected ${prefix} button in ${reply.text}`);
  return match.callback_data;
}

async function startListing(fixture, title = "Căn hộ tổng hợp", { address = seedAddress } = {}) {
  const menu = await fixture.message("/start");
  const open = await fixture.tap(button(menu, "/wizard"));
  assert.match(open.text, /tòa nhà/iu);
  const location = await fixture.message(`${title} | Khối Kiểm Thử`);
  const line = address ? await fixture.message(`An Thượng | ${address}`) :
    await fixture.tap(button(location, "/draft_area"));
  assert.match(line.text, /giá thuê/iu);
}

async function submitInquiry(fixture, fields, headers) {
  const response = await fixture.request("/api/inquiries", {
    method: "POST",
    headers,
    body: {
      clientName: "Khách kiểm thử", messenger: "Telegram", contactHandle: "@fixture_guest",
      apartmentCode: seedCode, ...fields
    }
  });
  assert.ok(response.status === 201 || (headers?.["idempotency-key"] && response.status === 200),
    `Expected a successful public inquiry submission, got ${response.status}`);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.ok(body.inquiry?.code, "Public submission must return its request code");
  return body;
}

async function adminInquiries(fixture) {
  const response = await fixture.request("/api/inquiries", { headers: adminHeaders });
  assert.equal(response.status, 200);
  return (await response.json()).inquiries;
}

function bookingState(inquiry) {
  assert.ok(["New", "Pending"].includes(inquiry.status), `Expected ${inquiry.code} to await confirmation`);
}

function futureViewingTime() {
  const day = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeZone: "Asia/Bangkok" })
    .format(new Date(Date.now() + 7 * 86400000));
  return `14:30 ${day}`;
}

function mapQuery(reply) {
  const mapsButton = reply.buttons.find(item => item.url && /google\.com\/maps/.test(item.url));
  assert.ok(mapsButton, "The map check must be reachable from the preview");
  return new URL(mapsButton.url).searchParams.get("query");
}

async function publishedApartment(fixture, preview) {
  const result = await fixture.tap(button(preview, "/draft_publish"));
  const code = result.text.match(/\bDN-KIN-[A-Z0-9]+\b/u)?.[0];
  assert.ok(code, "Publication must acknowledge the exact listing code");
  const detailed = await fixture.detail(code);
  assert.deepEqual((await fixture.apartments()).find(apartment => apartment.code === code), detailed);
  return detailed;
}

if (process.argv.includes("--fixture")) {
  runFixture();
} else {
  const { test } = require("node:test");

  test("publish a resumed listing once using the current album preview", async t => {
    const fixture = await createFixture(t);
    await startListing(fixture);
    await fixture.restart();
    const menu = await fixture.message("/start");
    assert.match((await fixture.tap(button(menu, "/draft"))).text, /giá thuê/iu);
    const ready = await fixture.message("18,5tr | 2 | 72 | 18");
    assert.match(ready.text, /ảnh và mô tả/iu);

    const album = "fixture-main-album";
    const first = await fixture.photo(1, album);
    const before = await fixture.tap(button(first, "/draft_preview"));
    assert.match(before.text, /18\.500\.000/u);
    const oldPublish = button(before, "/draft_publish");
    assert.equal((await fixture.request(mediaPath(1))).status, 404);
    assert.equal((await fixture.apartments()).length, 1);

    const second = await fixture.photo(2, album);
    const stale = await fixture.tap(oldPublish);
    assert.match(stale.text, /đã thay đổi|hết hạn|xem trước lại/iu);
    assert.equal((await fixture.apartments()).length, 1);
    const chooser = await fixture.tap(button(second, "/draft_cover"));
    const secondPhoto = chooser.buttons.find(item => / 2$/.test(item.callback_data));
    assert.ok(secondPhoto);
    const reordered = await fixture.tap(secondPhoto.callback_data);
    const preview = await fixture.tap(button(reordered, "/draft_preview"));
    assert.match(preview.text, /2 ảnh/iu);
    const confirmed = fixture.callbackUpdate(button(preview, "/draft_publish"));
    const published = await fixture.exchange(confirmed);
    assert.match(published.text, /đã đăng/iu);
    assert.equal((await fixture.post(confirmed)).status, 200);
    await fixture.restart();
    assert.equal((await fixture.post(confirmed)).status, 200);
    const listings = await fixture.apartments();
    assert.equal(listings.length, 2);
    const saved = listings.find(apartment => apartment.code !== seedCode);
    assert.equal(saved.title.vi, "Căn hộ tổng hợp");
    assert.equal(saved.priceVnd, 18500000);
    assert.equal(saved.bedrooms, 2);
    assert.equal(saved.sizeM2, 72);
    assert.equal(saved.floor, 18);
    assert.deepEqual(saved.images, [mediaPath(2), mediaPath(1)]);
    assert.ok(published.buttons.some(item => item.url === `${siteUrl}/apartments/${saved.code}`));
    assert.deepEqual((await fixture.detail(saved.code)).images, saved.images);
    const media = await fixture.request(saved.images[0]);
    assert.equal(media.status, 200);
    assert.equal(media.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await media.arrayBuffer()), fixturePhoto(2));
    assert.equal((await fixture.request("/api/apartments/DN-KIN-UNKNOWN")).status, 404);
  });

  test("append and replace only confirmed gallery versions, keeping a cancelled replacement private", async t => {
    const fixture = await createFixture(t);
    const browse = await fixture.message(`/apt ${seedCode}`);
    await fixture.tap(button(browse, "/addphoto"));
    const first = await fixture.photo(3);
    const appendPreview = await fixture.tap(button(first, "/draft_preview"));
    assert.deepEqual((await fixture.detail(seedCode)).images, seedGallery);
    await fixture.tap(button(appendPreview, "/draft_save"));
    const appended = [...seedGallery, mediaPath(3)];
    assert.deepEqual((await fixture.detail(seedCode)).images, appended);

    await fixture.message(`/setphoto ${seedCode}`);
    const replacement = await fixture.photo(4);
    const replacePreview = await fixture.tap(button(replacement, "/draft_preview"));
    const cancelledSave = button(replacePreview, "/draft_save");
    await fixture.tap(button(replacePreview, "/draft_cancel"));
    await fixture.tap(cancelledSave);
    assert.deepEqual((await fixture.detail(seedCode)).images, appended);
    assert.equal((await fixture.request(mediaPath(4))).status, 404);

    await fixture.message(`/setphoto ${seedCode}`);
    const next = await fixture.photo(5);
    const confirmedPreview = await fixture.tap(button(next, "/draft_preview"));
    const save = button(confirmedPreview, "/draft_save");
    await fixture.photo(6);
    await fixture.tap(save);
    assert.deepEqual((await fixture.detail(seedCode)).images, appended);
    const current = await fixture.message("/draft");
    const reviewed = await fixture.tap(button(current, "/draft_preview"));
    await fixture.tap(button(reviewed, "/draft_save"));
    const final = await fixture.detail(seedCode);
    assert.equal(final.priceVnd, fixture.seed.priceVnd);
    assert.deepEqual(final.images, [mediaPath(5), mediaPath(6)]);
    assert.equal((await fixture.request(mediaPath(3))).status, 404);
  });

  test("reject invalid prices and allow an explicitly hidden listing without photos", async t => {
    const fixture = await createFixture(t);
    await startListing(fixture, "Căn hộ ở chế độ ẩn", { address: "" });
    for (const price of ["0", "-850 USD", "giá thương lượng", "18,5tr | hai | 72 | 18"]) {
      const reply = await fixture.message(price);
      assert.match(reply.text, /chưa hợp lệ|không hợp lệ/iu, price);
      assert.match(reply.text, /giá thuê/iu);
    }
    const ready = await fixture.message("850 USD");
    const preview = await fixture.tap(button(ready, "/draft_preview"));
    assert.ok(!preview.buttons.some(item => item.callback_data?.startsWith("/draft_publish ")));
    const hidden = await fixture.tap(button(preview, "/draft_hide"));
    assert.match(hidden.text, /ẩn/iu);
    const code = hidden.text.match(/\bDN-KIN-[A-Z0-9]+\b/u)?.[0];
    assert.ok(code);
    for (const route of ["/api/apartments?includeHidden=true", "/api/properties?admin=true"]) {
      assert.equal((await fixture.apartments(route)).length, 1);
    }
    assert.equal((await fixture.request(`/api/apartments/${code}`)).status, 404);
    const saved = await fixture.detail(code, { authorized: true });
    assert.equal(saved.priceUsd, 850);
    assert.equal(saved.isVisible, false);
    assert.deepEqual(saved.images, []);
  });

  test("authenticate webhook and admin chat before consuming messages or media", async t => {
    const fixture = await createFixture(t);
    assert.equal((await fixture.post(fixture.messageUpdate({ text: "/wizard" }), "wrong-secret")).status, 403);
    for (const chat of [{ id: admin + 1, type: "private" }, { id: admin, type: "group" }]) {
      const rejected = fixture.photoUpdate(7);
      rejected.message.chat = chat;
      assert.equal((await fixture.post(rejected)).status, 200);
      assert.equal((await fixture.post(fixture.callbackUpdate("/wizard", chat))).status, 200);
    }
    assert.deepEqual(await fixture.logs(), []);
    const consoleResponse = await fixture.request("/api/telegram/command", {
      method: "POST", body: { command: "/wizard" }
    });
    assert.equal(consoleResponse.status, 403);
    assert.equal((await fixture.apartments()).length, 1);
    const start = await fixture.message("/start");
    assert.equal(button(start, "/wizard"), "/wizard");
  });

  test("accept a native ten-photo album sent concurrently and deduplicate delivery", async t => {
    const fixture = await createFixture(t);
    await startListing(fixture);
    await fixture.message("18,5tr");
    const album = "fixture-ten-photo-album";
    const updates = Array.from({ length: 10 }, (_, index) => fixture.photoUpdate(20 + index, album));
    const responses = await Promise.all(updates.map(update => fixture.post(update)));
    assert.ok(responses.every(response => response.status === 200));
    const events = await fixture.logs();
    assert.equal(events.filter(event => event.kind === "send").length, 1, "One Telegram message per album");
    assert.ok(events.some(event => /10\/20 ảnh/iu.test(event.text || "")), "All ten images must reach the draft");

    await fixture.exchange(updates[0]);
    const draft = await fixture.message("/draft");
    const preview = await fixture.tap(button(draft, "/draft_preview"));
    assert.match(preview.text, /10 ảnh/iu);
    const result = await fixture.tap(button(preview, "/draft_publish"));
    assert.match(result.text, /đã đăng/iu);
    const published = (await fixture.apartments()).find(apartment => apartment.code !== seedCode);
    assert.deepEqual(new Set(published.images), new Set(Array.from({ length: 10 }, (_, index) => mediaPath(20 + index))));

    await fixture.restart();
    await fixture.message("/wizard");
    assert.equal((await fixture.post(fixture.photoUpdate(30, album))).status, 200);
    assert.equal((await fixture.detail(published.code)).images.length, 10);
    assert.doesNotMatch((await fixture.message("/draft")).text, /đã nhận 1\//iu);
    assert.equal((await fixture.request(mediaPath(30))).status, 404);
  });

  test("retry confirmation after losing the Telegram reply and restarting the backend", async t => {
    const fixture = await createFixture(t);
    await startListing(fixture);
    await fixture.message("18,5tr");
    const photo = await fixture.photo(40);
    const preview = await fixture.tap(button(photo, "/draft_preview"));
    const confirmation = fixture.callbackUpdate(button(preview, "/draft_publish"));
    await fixture.logs("failNextSend");
    assert.equal((await fixture.post(confirmation)).status, 500);
    const code = (await fixture.apartments()).find(apartment => apartment.code !== seedCode).code;
    await fixture.restart();

    const recovered = await fixture.exchange(confirmation);
    assert.equal((await fixture.apartments()).length, 2);
    assert.ok(recovered.text.includes(code), "A replay must acknowledge the previously committed listing");
  });

  test("review a photo replacement again when the web changes the listing", async t => {
    const fixture = await createFixture(t);
    await fixture.message(`/setphoto ${seedCode}`);
    const album = "fixture-partial-album";
    const first = await fixture.photo(41, album);
    const invalid = await fixture.photo("invalid", album);
    assert.match(invalid.text, /không tải được|không hợp lệ/iu);
    const review = await fixture.tap(button(first, "/draft_preview"));
    assert.match(review.text, /1 ảnh/iu);
    assert.equal((await fixture.request(mediaPath(41))).status, 404);

    const changed = await fixture.request(`/api/apartments/${seedCode}`, {
      method: "PATCH", body: { price: "22000000 VND" }, headers: { authorization: `Bearer ${apiToken}` }
    });
    assert.equal(changed.status, 200);
    const conflict = await fixture.tap(button(review, "/draft_save"));
    assert.match(conflict.text, /thay đổi trên web|xung đột/iu);
    assert.deepEqual((await fixture.detail(seedCode)).images, seedGallery);
    await fixture.tap(button(conflict, "/draft_save"));
    const final = await fixture.detail(seedCode);
    assert.equal(final.priceVnd, 22000000);
    assert.deepEqual(final.images, [mediaPath(41)]);
  });

  test("keep the gallery and draft when the catalogue write fails", async t => {
    const fixture = await createFixture(t);
    await fixture.message(`/setphoto ${seedCode}`);
    const photo = await fixture.photo(42);
    const preview = await fixture.tap(button(photo, "/draft_preview"));
    const confirmation = fixture.callbackUpdate(button(preview, "/draft_save"));
    await fixture.logs("failCatalogueWrite", mediaPath(42));
    const response = await fixture.post(confirmation);
    const events = await fixture.logs();
    assert.ok(events.some(event => event.kind === "catalogue-write-rejected"), "The write failure was injected");
    const failures = [];
    if (response.status === 200 && events.some(event => /đã lưu bộ ảnh/iu.test(event.text || ""))) {
      failures.push("Telegram reported success after the fixture store rejected the write");
    }
    if ((await fixture.detail(seedCode)).images.includes(mediaPath(42))) {
      failures.push("the replacement became public after the rejected write");
    }
    const draft = await fixture.message("/draft");
    if (!draft.buttons.some(item => item.callback_data?.startsWith("/draft_preview "))) {
      failures.push("the photo draft was lost after the rejected write");
    }
    assert.deepEqual(failures, []);
    await fixture.restart();
    assert.deepEqual((await fixture.detail(seedCode)).images, seedGallery);
    const resumed = await fixture.message("/draft");
    await fixture.tap(button(await fixture.tap(button(resumed, "/draft_preview")), "/draft_save"));
    assert.deepEqual((await fixture.detail(seedCode)).images, [mediaPath(42)]);
  });

  test("drop a formerly public photo from the API when its only listing is hidden", async t => {
    const fixture = await createFixture(t);
    await fixture.message(`/addphoto ${seedCode}`);
    const photo = await fixture.photo(43);
    const preview = await fixture.tap(button(photo, "/draft_preview"));
    await fixture.tap(button(preview, "/draft_save"));
    assert.equal((await fixture.request(mediaPath(43))).status, 200);
    const hide = await fixture.request(`/api/apartments/${seedCode}`, {
      method: "PATCH", body: { isVisible: false }, headers: { authorization: `Bearer ${apiToken}` }
    });
    assert.equal(hide.status, 200);
    assert.equal((await fixture.apartments()).length, 0);
    assert.equal((await fixture.request(`/api/apartments/${seedCode}`)).status, 404);
    assert.equal((await fixture.request(mediaPath(43))).status, 404);
  });

  test("keep fixture landlord contacts out of public catalogue responses", async t => {
    const fixture = await createFixture(t);
    const results = {
      catalogue: (await fixture.apartments("/api/apartments?admin=true"))[0],
      alias: (await fixture.apartments("/api/properties?includeHidden=true"))[0],
      detail: await fixture.detail(seedCode)
    };
    const exposed = [];
    for (const [route, listing] of Object.entries(results)) {
      assert.equal(listing.code, seedCode);
      for (const key of ["landlordName", "landlordPhone"]) {
        if (listing[key] !== undefined) exposed.push(`${route}.${key}`);
      }
    }
    assert.equal((await fixture.detail(seedCode, { authorized: true })).landlordPhone, fixture.seed.landlordPhone);
    assert.deepEqual(exposed, [], "Public routes must omit landlord contacts");
  });

  test("count unique per-apartment contacts without counting anonymous clicks or landlords", async t => {
    const otherCode = "DN-KIN-SECOND";
    const inquiries = [
      ["KH-RECENT", "viewing", seedCode, "+84 901 234 567", "Khách trùng", "New"],
      ["KH-HISTORY", "viewing", seedCode, "0901-234-567", "Khách trùng", "Archived"],
      ["KH-SECOND", "reservation", seedCode, "@fixture_second", "Khách khác", "Pending"],
      ["KH-OTHER", "viewing", otherCode, "0901234567", "Khách trùng", "New"],
      ["KH-CLICK", "direct_contact", seedCode, "Bấm liên hệ qua Zalo", "Khách bấm Zalo", "New"],
      ["KH-OWNER", "owner_listing", seedCode, "@fixture_owner", "Chủ nhà mẫu", "New"],
      ["KH-SHORT", "shortlist", "CURATED-SHORTLIST", "@fixture_shortlist", "Khách tìm nhà", "New"]
    ].map(([code, type, apartmentCode, contactHandle, clientName, status]) => ({
      _id: code, code, type, apartmentCode, contactHandle, clientName, status,
      messenger: "Zalo", createdAt: code === "KH-HISTORY" ? "2026-01-01T00:00:00Z" : "2026-02-01T00:00:00Z"
    }));
    const fixture = await createFixture(t, {
      moreApartments: [{ _id: "fixture-other", code: otherCode, title: { vi: "Căn mẫu thứ hai" },
        status: "Available", isVisible: true }], inquiries
    });
    const list = await fixture.message("/list");
    const firstRow = list.buttons.find(item => item.callback_data?.match(/^\/apt (\S+)/)?.[1] === seedCode);
    const otherRow = list.buttons.find(item => item.callback_data?.match(/^\/apt (\S+)/)?.[1] === otherCode);
    assert.match(firstRow?.text || "", /2 khách/u);
    assert.match(otherRow?.text || "", /1 khách/u);
    const detail = await fixture.tap(firstRow.callback_data);
    assert.match(detail.text, /2 khách liên hệ/u);
    const people = await fixture.tap(button(detail, "/apt_contacts"));
    assert.match(people.text, /2 khách.*1 lượt bấm/u);
    assert.doesNotMatch(people.text, /KH-CLICK|KH-OWNER|KH-SHORT|KH-OTHER/u);
    const customerRows = people.buttons.filter(item => item.callback_data && /Khách trùng|Khách khác/u.test(item.text));
    assert.equal(customerRows.length, 2, "One selectable row per person, with archived duplicates in history");
    const customer = await fixture.tap(customerRows.find(item => item.text.includes("Khách trùng")).callback_data);
    assert.match(customer.text, /\+84 901 234 567/u);
    const history = await fixture.tap(button(customer, "/lead_history"));
    assert.ok(history.buttons.some(item => item.callback_data?.endsWith(" KH-HISTORY")));
    assert.ok(history.buttons.some(item => item.callback_data?.endsWith(" KH-RECENT")));
    assert.match((await fixture.tap(button(customer, "/apt_contacts"))).text, /2 khách/u);
  });

  test("keep the search and page when returning from a catalogue detail", async t => {
    const moreApartments = Array.from({ length: 9 }, (_, index) => ({
      _id: `fixture-page-${index}`, code: `DN-KIN-PAGE-${index}`,
      title: { vi: `Căn Nắng ${index}` }, status: "Available", isVisible: true
    }));
    const fixture = await createFixture(t, { moreApartments });
    const list = await fixture.message("/list can nang");
    const listings = response => response.buttons.filter(item => item.callback_data?.startsWith("/apt "));
    assert.equal(listings(list).length, 8);
    const next = list.buttons.find(item => /trang sau/iu.test(item.text));
    assert.ok(next);
    const second = await fixture.tap(next.callback_data);
    assert.equal(listings(second).length, 1);
    assert.match(listings(second)[0].text, /0 khách/u);
    const detail = await fixture.tap(listings(second)[0].callback_data);
    const back = detail.buttons.find(item => /quay lại|về kho|kho căn/iu.test(item.text));
    assert.ok(back, "Catalogue detail must offer a return to the list");
    const returned = await fixture.tap(back.callback_data);
    assert.deepEqual(listings(returned), listings(second));
  });

  test("public viewing and booking submit private, pending requests across restart", async t => {
    const fixture = await createFixture(t);
    const viewing = (await submitInquiry(fixture, {
      type: "viewing", contactHandle: "@fixture_private_view", notes: "Ghi chú riêng xem căn",
      viewingTime: "2026-12-21 14:30", status: "Confirmed", adminNotes: "Injected administrator note"
    })).inquiry;
    const bookingBody = await submitInquiry(fixture, {
      type: "reservation", contactHandle: "@fixture_private_book", notes: "Ghi chú riêng giữ căn",
      moveInDate: "2026-12-30", status: "Confirmed", reservationConfirmedAt: "2026-01-01"
    });
    const booking = bookingBody.inquiry;
    for (const receipt of [viewing, booking]) {
      assert.deepEqual(Object.keys(receipt).sort(), ["apartmentCode", "code", "status", "type"]);
      assert.equal(receipt.apartmentCode, seedCode);
      bookingState(receipt);
    }
    assert.deepEqual(Object.keys(bookingBody).sort(), ["inquiry", "ok"]);
    assert.notEqual(booking.code, viewing.code);
    assert.equal((await fixture.detail(seedCode)).status, "Available");

    for (const [route, method, body] of [
      ["/api/inquiries", "GET"], ["/api/excel/inquiries.csv", "GET"],
      [`/api/inquiries/${viewing.code}`, "PATCH", { status: "Confirmed" }],
      [`/api/inquiries/${booking.code}`, "DELETE"]
    ]) {
      assert.equal((await fixture.request(route, { method, body })).status, 403, `${method} ${route}`);
    }
    await fixture.restart();
    const stored = (await adminInquiries(fixture)).filter(inquiry => [viewing.code, booking.code].includes(inquiry.code));
    assert.equal(stored.length, 2);
    stored.forEach(bookingState);
    assert.ok(stored.every(inquiry => inquiry.adminNotes !== "Injected administrator note" && !inquiry.reservationConfirmedAt));
    const listing = await fixture.detail(seedCode);
    assert.equal(listing.status, "Available");
    assert.doesNotMatch(JSON.stringify(listing), /fixture_private|Ghi chú riêng|reservationHold|customerCount|contactCount/u);
  });

  test("reuse the same receipt on retry of a public booking submission", async t => {
    const fixture = await createFixture(t);
    const idempotencyKey = "fixture-public-booking-retry";
    const fields = { type: "reservation", contactHandle: "@fixture_retry", idempotencyKey };
    const headers = { "idempotency-key": idempotencyKey };
    const first = (await submitInquiry(fixture, fields, headers)).inquiry;
    await fixture.restart();
    const retry = (await submitInquiry(fixture, fields, headers)).inquiry;
    const matching = (await adminInquiries(fixture)).filter(inquiry => inquiry.contactHandle === fields.contactHandle);
    assert.deepEqual({ sameReceipt: retry.code === first.code, matching: matching.length }, { sameReceipt: true, matching: 1 });
  });

  test("navigate linked Telegram alerts, recover pending entry, and manage viewing and holds", async t => {
    const fixture = await createFixture(t);
    const viewing = (await submitInquiry(fixture, { type: "viewing", contactHandle: "@fixture_view" })).inquiry;
    const first = (await submitInquiry(fixture, { type: "reservation", contactHandle: "@fixture_book_first" })).inquiry;
    const second = (await submitInquiry(fixture, { type: "reservation", contactHandle: "@fixture_book_second" })).inquiry;
    const notifications = await fixture.logs();
    const alertCommand = receipt => {
      const alert = notifications.find(event => event.text?.includes(receipt.code));
      assert.ok(alert, `Expected an admin alert for ${receipt.code}`);
      const linked = alert.buttons.find(item => item.callback_data?.endsWith(` ${receipt.code}`));
      assert.ok(linked, "The notification must link to the request");
      return linked.callback_data;
    };
    const viewingDetail = await fixture.tap(alertCommand(viewing));
    assert.match(viewingDetail.text, /@fixture_view/u);
    const prompt = await fixture.tap(button(viewingDetail, "/crm_view"));
    assert.match(prompt.text, /ngày giờ/iu);
    await fixture.restart();
    const scheduled = await fixture.message(futureViewingTime());
    assert.match(scheduled.text, /đã hẹn xem|đã lưu/iu);
    assert.equal((await fixture.detail(seedCode)).status, "Available");
    const firstDetail = await fixture.tap(alertCommand(first));
    const secondDetail = await fixture.tap(alertCommand(second));
    assert.match(firstDetail.text, /chờ xác nhận/iu);
    const firstConfirm = button(firstDetail, "/book_confirm");
    const secondConfirm = button(secondDetail, "/book_confirm");
    const confirmed = await fixture.tap(firstConfirm);
    assert.match(confirmed.text, /xác nhận|đang giữ/iu);
    assert.equal((await fixture.detail(seedCode)).status, "Reserved");
    const conflict = await fixture.tap(secondConfirm);
    assert.match(conflict.text, /đã có giữ chỗ|không còn trống|xung đột/iu);
    await fixture.restart();
    const replayed = await fixture.tap(firstConfirm);
    assert.match(replayed.text, /xác nhận|đang giữ/iu);
    assert.equal((await fixture.detail(seedCode)).status, "Reserved");
    assert.doesNotMatch(JSON.stringify(await fixture.detail(seedCode)), new RegExp(first.code, "u"));
    const cancelled = await fixture.tap(button(replayed, "/book_cancel"));
    assert.match(cancelled.text, /đã hủy/iu);
    assert.equal((await fixture.detail(seedCode)).status, "Available");
  });

  test("reject duplicate active viewing slots for the same listing", async t => {
    const fixture = await createFixture(t);
    const first = (await submitInquiry(fixture, { type: "viewing", contactHandle: "@fixture_slot_first" })).inquiry;
    const second = (await submitInquiry(fixture, { type: "viewing", contactHandle: "@fixture_slot_second" })).inquiry;
    const time = futureViewingTime();
    for (const inquiry of [first, second]) {
      const detail = await fixture.message(`/lead ${inquiry.code}`);
      await fixture.tap(button(detail, "/crm_view"));
      await fixture.message(time);
    }
    const scheduled = (await adminInquiries(fixture)).filter(inquiry =>
      [first.code, second.code].includes(inquiry.code) && inquiry.status === "Viewing_Scheduled");
    assert.equal(scheduled.length, 1, "One listing can have only one active viewing at the same time");
  });

  test("confirm a pending hold in one tap and release it manually after restart without creating a lease", async t => {
    const fixture = await createFixture(t);
    async function leases() {
      const response = await fixture.request("/api/leases", { headers: adminHeaders });
      assert.equal(response.status, 200);
      return (await response.json()).leases;
    }
    const initialLeases = await leases();
    assert.equal(initialLeases.length, 1);
    const inquiry = (await submitInquiry(fixture, { type: "reservation" })).inquiry;
    bookingState(inquiry);
    assert.equal((await fixture.detail(seedCode)).status, "Available");
    const detail = await fixture.message(`/book ${inquiry.code}`);
    bookingState((await adminInquiries(fixture)).find(item => item.code === inquiry.code));
    const confirmed = await fixture.tap(button(detail, "/book_confirm"));
    assert.match(confirmed.text, /đã được xác nhận|đang giữ/iu);
    assert.equal((await fixture.detail(seedCode)).status, "Reserved");
    assert.deepEqual(await leases(), initialLeases);

    await fixture.restart();
    assert.equal((await fixture.detail(seedCode)).status, "Reserved");
    const stored = await fixture.message(`/book ${inquiry.code}`);
    assert.match(stored.text, /đang giữ/iu);
    const released = await fixture.tap(button(stored, "/book_cancel"));
    assert.match(released.text, /đã hủy/iu);
    assert.equal((await fixture.detail(seedCode)).status, "Available");
    assert.match((await adminInquiries(fixture)).find(item => item.code === inquiry.code).status, /^Cancell?ed$/u);
    assert.deepEqual(await leases(), initialLeases);
  });

  test("publish the exact Telegram location including zero latitude after restart", async t => {
    const fixture = await createFixture(t);
    await startListing(fixture);
    await fixture.message("18,5tr");
    const photo = await fixture.photo(50);
    const before = await fixture.tap(button(photo, "/draft_preview"));
    assert.equal(mapQuery(before), seedAddress);
    const point = { latitude: 0, longitude: 108.2441 };
    const located = await fixture.exchange(fixture.messageUpdate({ location: point }));
    assert.equal(mapQuery(located), "0,108.2441");
    assert.equal((await fixture.apartments()).length, 1);
    await fixture.restart();
    const rejected = await fixture.tap(button(before, "/draft_publish"));
    assert.match(rejected.text, /đã thay đổi|xem trước lại/iu);
    const preview = await fixture.tap(button(await fixture.message("/draft"), "/draft_preview"));
    const saved = await publishedApartment(fixture, preview);
    assert.equal(saved.address, seedAddress);
    assert.equal(saved.locationAccuracy, "exact");
    assert.deepEqual(saved.coordinates, { lat: 0, lng: 108.2441 });
  });

  test("round-trip a full Telegram listing template, map pin, and album", async t => {
    const fixture = await createFixture(t);
    const form = await fixture.message("/form");
    assert.match(form.text, /ghim bản đồ|vị trí bản đồ/iu);
    await fixture.message([
      "ĐĂNG CĂN HỘ", "Tên: Căn góc thử mẫu", "Tên tiếng Anh: Fixture Corner Suite", "Tòa nhà: Tòa Kiểm Thử",
      "Khu vực: An Thượng", `Địa chỉ: ${seedAddress}`, "Quận: Ngũ Hành Sơn", "Ghim bản đồ: 16.0465, 108.2441",
      "Giá: 18,5tr VND", "Diện tích: 72 m²", "Phòng ngủ: 2", "Phòng tắm: 2", "Tầng: 8", "Hướng: Đông",
      "Thuê tối thiểu: 6 tháng", "Cọc: 1 tháng", "Điện: 3.500 ₫/kWh", "Nước: 100.000 ₫/người/tháng",
      "Wi-Fi: Không", "Thú cưng: Hỏi trước", "Tiện ích: Máy giặt, Ban công", "Mô tả: Căn góc kiểm thử."
    ].join("\n"));
    await fixture.photo(51, "full-template-album");
    const album = await fixture.photo(52, "full-template-album");
    const preview = await fixture.tap(button(album, "/draft_preview"));
    assert.equal(mapQuery(preview), "16.0465,108.2441");
    assert.match(preview.text, /18\.500\.000/u);
    assert.equal((await fixture.apartments()).length, 1);
    const listing = await publishedApartment(fixture, preview);
    const facts = {
      address: seedAddress, district: "Ngũ Hành Sơn", building: "Tòa Kiểm Thử",
      locationAccuracy: "exact", coordinates: { lat: 16.0465, lng: 108.2441 }, priceVnd: 18500000,
      sizeM2: 72, bedrooms: 2, bathrooms: 2, floor: 8, orientation: "Đông", minLeaseMonths: 6,
      depositMonths: 1, electricityRate: "3.500 ₫/kWh", waterRate: "100.000 ₫/người/tháng",
      wifiIncluded: false, petPolicy: "Hỏi trước", tags: ["Máy giặt", "Ban công"], images: [mediaPath(51), mediaPath(52)]
    };
    assert.deepEqual(Object.fromEntries(Object.keys(facts).map(key => [key, listing[key]])), facts);
    assert.equal(listing.title.en, "Fixture Corner Suite");
    assert.equal(listing.architecturalNotes.vi, "Căn góc kiểm thử.");
  });

  test("accept the full listing example's move-in date, deposit, internet and map labels", async t => {
    const fixture = await createFixture(t);
    const input = [
      "ĐĂNG CĂN HỘ", "Tên căn: Căn thử theo ví dụ", "Tòa nhà: Tòa Kiểm Thử", "Khu vực: An Thượng",
      `Địa chỉ hiển thị: ${seedAddress}`, "Vị trí bản đồ: 16.0465, 108.2441", "Giá thuê/tháng: 18,5tr VND",
      "Ngày có thể vào: 01/12/2026", "Đặt cọc: 2 tháng", "Internet: Đã gồm trong giá"
    ].join("\n");
    await fixture.message(input);
    const photo = await fixture.photo(54);
    const preview = await fixture.tap(button(photo, "/draft_preview"));
    const listing = await publishedApartment(fixture, preview);
    const moveInDate = listing.availableFrom ?? listing.availableDate ?? listing.moveInDate;
    assert.deepEqual({ coordinates: listing.coordinates, deposit: listing.depositMonths,
      included: listing.wifiIncluded, moveIn: /^(?:2026-12-01|01\/12\/2026)/.test(moveInDate || "") }, {
      coordinates: { lat: 16.0465, lng: 108.2441 }, deposit: 2, included: true, moveIn: true
    });
  });

  test("replace a Telegram pin with an explicit map link and clear it when the address changes", async t => {
    const fixture = await createFixture(t);
    const point = "16.0465,108.2441";
    await fixture.message(`/editfields ${seedCode}`);
    const explicitMap = "https://www.google.com/maps/search/?api=1&query=16.0465%2C108.2441";
    const reviewed = await fixture.message(`Ghim bản đồ: ${explicitMap}`);
    assert.equal(mapQuery(reviewed), point);
    await fixture.tap(button(reviewed, "/draft_save"));
    assert.deepEqual((await fixture.detail(seedCode)).coordinates, { lat: 16.0465, lng: 108.2441 });
    await fixture.message(`/editfields ${seedCode}`);
    const changedAddress = "18 Đường Bản Đồ, An Thượng, Đà Nẵng";
    const newAddress = await fixture.message(`Địa chỉ: ${changedAddress}`);
    assert.equal(mapQuery(newAddress), changedAddress);
    await fixture.tap(button(newAddress, "/draft_save"));
    const saved = await fixture.detail(seedCode);
    assert.equal(saved.address, changedAddress);
    assert.equal(saved.locationAccuracy, "area");
    assert.equal(saved.coordinates, null);
  });

  test("publish an address-only listing without a fake pin and ignore legacy coordinates", async t => {
    const legacyCode = "DN-KIN-LEGACY";
    const fixture = await createFixture(t, { moreApartments: [{
      _id: "fixture-legacy", code: legacyCode, title: { vi: "Căn cũ không có ghim tin cậy" },
      status: "Available", isVisible: true, coordinates: { lat: 16.047, lng: 108.206 }
    }] });
    assert.equal((await fixture.detail(legacyCode)).coordinates, null);
    await startListing(fixture, "Căn chưa có địa chỉ", { address: "" });
    await fixture.message("18,5tr");
    const photo = await fixture.photo(53);
    const missingAddress = await fixture.tap(button(photo, "/draft_preview"));
    assert.ok(!missingAddress.buttons.some(item => item.callback_data?.startsWith("/draft_publish ")));
    assert.match(missingAddress.text, /địa chỉ/iu);
    await fixture.tap(button(missingAddress, "/draft_edit"));
    const camera = "https://www.google.com/maps/@16.047,108.206,13z";
    const untrusted = await fixture.message(`Địa chỉ: ${seedAddress}\nGhim bản đồ: ${camera}`);
    assert.match(untrusted.text, /chưa đọc được ghim|không.*ghim/iu);
    const preview = await fixture.tap(button(untrusted, "/draft_preview"));
    assert.equal(mapQuery(preview), seedAddress);
    const listing = await publishedApartment(fixture, preview);
    assert.equal(listing.locationAccuracy, "area");
    assert.equal(listing.coordinates, null);
    assert.equal(listing.address, seedAddress);
  });
}
