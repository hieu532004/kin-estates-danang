const { execFile } = require("node:child_process");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "../..");
let pendingTimer = null;
let running = false;
let rerunNeeded = false;

function shouldAutoDeploy() {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "test" || process.env.KIN_DISABLE_AUTO_DEPLOY === "1") return false;
  if (String(process.env.PUBLIC_SITE_URL || "").includes(".invalid")) return false;
  if (String(process.env.TELEGRAM_WEBHOOK_URL || "").includes(".invalid")) return false;
  // If connected to a cloud MongoDB Atlas URI, both local and Vercel share the same live DB already.
  const uri = String(process.env.MONGODB_URI || "");
  if (uri.startsWith("mongodb+srv://")) return false;
  return true;
}

function runGit(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: REPO_ROOT, timeout: 30_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error((stderr || err.message || "").trim()));
      } else {
        resolve(String(stdout || "").trim());
      }
    });
  });
}

async function syncStoreToLiveWeb(reason = "Telegram update") {
  if (!shouldAutoDeploy()) return { ok: false, skipped: true };
  if (running) {
    rerunNeeded = true;
    return { ok: true, queued: true };
  }
  running = true;
  try {
    await runGit(["add", "-f", "src/data/mongodb_store.json", "src/data/telegram-media/photos"]);
    const diff = await runGit(["diff", "--cached", "--name-only"]);
    if (!diff) {
      return { ok: true, unchanged: true };
    }
    await runGit(["commit", "-m", `Sync catalogue & photos from Telegram (${reason})`]);
    await runGit(["push", "origin", "main"]);
    console.log("✓ Auto-synced catalogue & photos to GitHub/Vercel live website.");
    return { ok: true, pushed: true };
  } catch (err) {
    console.warn("Auto-sync to GitHub/Vercel skipped/failed:", err.message);
    return { ok: false, error: err.message };
  } finally {
    running = false;
    if (rerunNeeded) {
      rerunNeeded = false;
      scheduleAutoDeploy("queued update");
    }
  }
}

function scheduleAutoDeploy(reason = "Telegram update", delayMs = 2500) {
  if (!shouldAutoDeploy()) return;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    syncStoreToLiveWeb(reason).catch(() => {});
  }, delayMs);
}

module.exports = {
  shouldAutoDeploy,
  scheduleAutoDeploy,
  syncStoreToLiveWeb
};
