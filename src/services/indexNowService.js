const { DANANG_SEO_AREAS, PROPERTY_TYPE_LANDINGS, SEO_GUIDE_ARTICLES, NON_DEFAULT_LANGS } = require("./seoData");

const DEFAULT_ORIGIN = "https://www.kinestatesdanang.com";
const INDEXNOW_KEY = process.env.INDEXNOW_KEY || "a8f4c291e7b04d6392c5f18e7a3b40d9";

function isSearchPingDisabled() {
  return (
    process.env.NODE_ENV === "test" ||
    String(process.env.PUBLIC_SITE_URL || "").includes(".invalid") ||
    String(process.env.TELEGRAM_WEBHOOK_URL || "").includes(".invalid")
  );
}

function getEffectiveOrigin() {
  const env = String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (env && /^https:\/\//i.test(env) && !env.includes(".invalid") && !env.includes("localhost")) {
    return env;
  }
  return DEFAULT_ORIGIN;
}

function buildCoreSeoUrlList(apartments = [], origin = getEffectiveOrigin()) {
  const urls = new Set([
    `${origin}/`,
    `${origin}/apartments`,
    `${origin}/areas`,
    `${origin}/guides`,
    `${origin}/how-to-rent`,
    `${origin}/about`,
    `${origin}/sitemap.xml`,
    `${origin}/rss.xml`,
    `${origin}/llms.txt`
  ]);

  for (const lang of NON_DEFAULT_LANGS) {
    urls.add(`${origin}/${lang}`);
    urls.add(`${origin}/${lang}/apartments`);
  }
  for (const prop of PROPERTY_TYPE_LANDINGS) {
    urls.add(`${origin}/property/${prop.slug}`);
  }
  for (const area of DANANG_SEO_AREAS) {
    urls.add(`${origin}/areas/${area.slug}`);
  }
  for (const guide of SEO_GUIDE_ARTICLES) {
    urls.add(`${origin}/guides/${guide.slug}`);
  }
  for (const apt of apartments || []) {
    if (!apt?.code || apt.isVisible === false || apt.status === "Hidden") continue;
    urls.add(`${origin}/apartments/${encodeURIComponent(apt.code)}`);
    urls.add(`${origin}/en/apartments/${encodeURIComponent(apt.code)}`);
  }
  return [...urls];
}

async function pingGoogleWebSubHub(origin = getEffectiveOrigin()) {
  if (isSearchPingDisabled()) return { ok: true, skipped: true };
  try {
    const body = new URLSearchParams({
      "hub.mode": "publish",
      "hub.url": `${origin}/rss.xml`
    });
    const res = await fetch("https://pubsubhubbub.appspot.com/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(6000)
    });
    return { ok: res.ok || res.status === 204, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function submitUrlsToIndexNow(rawUrls = [], origin = getEffectiveOrigin()) {
  if (isSearchPingDisabled()) return { ok: true, skipped: true, submittedCount: 0 };
  const host = new URL(origin).host;
  const urlList = [...new Set((rawUrls || []).filter((u) => typeof u === "string" && u.startsWith(origin)))].slice(0, 500);
  if (!urlList.length) return { ok: true, submittedCount: 0 };

  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${origin}/${INDEXNOW_KEY}.txt`,
    urlList
  };

  const [indexNowRes, webSubRes] = await Promise.all([
    fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(7000)
    })
      .then((r) => ({ ok: r.ok || r.status === 200 || r.status === 202, status: r.status }))
      .catch((err) => ({ ok: false, error: err.message })),
    pingGoogleWebSubHub(origin)
  ]);

  return {
    ok: Boolean(indexNowRes.ok || webSubRes.ok),
    submittedCount: urlList.length,
    indexNow: indexNowRes,
    googleWebSub: webSubRes,
    timestamp: new Date().toISOString()
  };
}

async function notifyApartmentIndexed(apt) {
  if (!apt?.code || isSearchPingDisabled()) return;
  const origin = getEffectiveOrigin();
  const urls = [
    `${origin}/`,
    `${origin}/apartments`,
    `${origin}/apartments/${encodeURIComponent(apt.code)}`,
    `${origin}/en/apartments/${encodeURIComponent(apt.code)}`,
    `${origin}/sitemap.xml`,
    `${origin}/rss.xml`
  ];
  return submitUrlsToIndexNow(urls, origin);
}

async function submitAllSiteUrlsToSearchEngines(apartments = []) {
  const origin = getEffectiveOrigin();
  const allUrls = buildCoreSeoUrlList(apartments, origin);
  return submitUrlsToIndexNow(allUrls, origin);
}

module.exports = {
  INDEXNOW_KEY,
  buildCoreSeoUrlList,
  submitUrlsToIndexNow,
  notifyApartmentIndexed,
  submitAllSiteUrlsToSearchEngines
};
