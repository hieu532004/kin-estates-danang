function coordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) };
}

/**
 * Strict Da Nang City municipal bounding box (excludes Hoi An / Dien Ban south of 15.96
 * and prevents foreign server-IP fallbacks like Vercel Ashburn, VA 39.02,-77.84).
 */
function isWithinGreaterDaNang(pt) {
  if (!pt || typeof pt !== "object") return false;
  const lat = Number(pt.lat);
  const lng = Number(pt.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 15.96 && lat <= 16.22 && lng >= 107.95 && lng <= 108.35;
}

const EXACT_TOWER_COORDS = [
  [/\bhiyori\b/iu, { lat: 16.061263, lng: 108.23562 }],
  [/\bfilmore\b/iu, { lat: 16.0614, lng: 108.2238 }],
  [/\bpanoma\b|\bsun\s*cosmo\b/iu, { lat: 16.0508, lng: 108.2355 }],
  [/\bmonarchy\b/iu, { lat: 16.0574, lng: 108.2314 }],
  [/\bsun\s*ponte\b/iu, { lat: 16.0595, lng: 108.2312 }],
  [/\bsun\s*symphony\b/iu, { lat: 16.0828, lng: 108.2275 }],
  [/\bazura\b/iu, { lat: 16.0715, lng: 108.2302 }],
  [/\bindochina\b/iu, { lat: 16.0706, lng: 108.2248 }],
  [/\bblooming\s*tower\b/iu, { lat: 16.0912, lng: 108.2195 }],
  [/\beuro\s*village\b|\blàng\s*châu\s*âu\b/iu, { lat: 16.0588, lng: 108.2298 }],
  [/\bđảo\s*xanh\b|\bdao\s*xanh\b/iu, { lat: 16.0462, lng: 108.2274 }],
  [/\bfpt\s*plaza\b|\bfpt\s*city\b/iu, { lat: 15.9788, lng: 108.2618 }],
  [/\bori\s*garden\b|\bbàu\s*tràm\b/iu, { lat: 16.1125, lng: 108.1328 }]
];

const DANANG_LANDMARK_COORDS = [
  [/hiyori|an\s*trung\s*đông/iu, { lat: 16.061263, lng: 108.23562 }],
  [/filmore|bình\s*thuận/iu, { lat: 16.0614, lng: 108.2238 }],
  [/panoma|sun\s*cosmo|trần\s*thị\s*lý|tran\s*thi\s*ly|nguyễn\s*văn\s*trỗi/iu, { lat: 16.0508, lng: 108.2355 }],
  [/monarchy|sun\s*ponte/iu, { lat: 16.0574, lng: 108.2314 }],
  [/sun\s*symphony/iu, { lat: 16.0828, lng: 108.2275 }],
  [/azura|indochina/iu, { lat: 16.0715, lng: 108.2302 }],
  [/blooming\s*tower|thuận\s*phước|thuan\s*phuoc/iu, { lat: 16.0912, lng: 108.2195 }],
  [/euro\s*village|làng\s*châu\s*âu/iu, { lat: 16.0588, lng: 108.2298 }],
  [/đảo\s*xanh|dao\s*xanh/iu, { lat: 16.0462, lng: 108.2274 }],
  [/fpt\s*plaza|fpt\s*city|hòa\s*hải|hoa\s*hai/iu, { lat: 15.9788, lng: 108.2618 }],
  [/ori\s*garden|bàu\s*tràm/iu, { lat: 16.1125, lng: 108.1328 }],
  [/mỹ\s*đa\s*đông|my\s*da\s*dong/iu, { lat: 16.045655, lng: 108.246931 }],
  [/lê\s*văn\s*quý|le\s*van\s*quy/iu, { lat: 16.071229, lng: 108.238203 }],
  [/an\s*đồn|an\s*don/iu, { lat: 16.074076, lng: 108.22966 }],
  [/bắc\s*đẩu|bac\s*dau/iu, { lat: 16.07714, lng: 108.208719 }],
  [/nguyễn\s*lộ\s*trạch|nguyen\s*lo\s*trach/iu, { lat: 16.032728, lng: 108.22934 }],
  [/lê\s*duẩn|le\s*duan/iu, { lat: 16.071468, lng: 108.221136 }],
  [/điện\s*biên\s*phủ|dien\s*bien\s*phu/iu, { lat: 16.066975, lng: 108.199785 }],
  [/trần\s*nguyên\s*đán|tran\s*nguyen\s*dan/iu, { lat: 16.078338, lng: 108.159092 }],
  [/đỗ\s*nhuận|do\s*nhuan/iu, { lat: 16.060849, lng: 108.169695 }],
  [/an\s*thượng|an\s*thuong|hoàng\s*kế\s*viêm|châu\s*thị\s*vĩnh\s*tế|nguyễn\s*văn\s*thoại|mỹ\s*an/iu, { lat: 16.049056, lng: 108.247323 }],
  [/võ\s*nguyên\s*giáp|vo\s*nguyen\s*giap|mỹ\s*khê|my\s*khe|phước\s*mỹ|phuoc\s*my|phạm\s*văn\s*đồng/iu, { lat: 16.0628, lng: 108.2462 }],
  [/nam\s*việt\s*á|nam\s*viet\s*a|bùi\s*tá\s*hán|khuê\s*mỹ|khue\s*my/iu, { lat: 16.0348, lng: 108.2415 }],
  [/bạch\s*đằng|bach\s*dang/iu, { lat: 16.0652, lng: 108.2244 }],
  [/trần\s*hưng\s*đạo|tran\s*hung\s*dao/iu, { lat: 16.0635, lng: 108.2305 }],
  [/võ\s*văn\s*kiệt|vo\s*van\s*kiet/iu, { lat: 16.0619, lng: 108.2382 }],
  [/thọ\s*quang|tho\s*quang/iu, { lat: 16.0945, lng: 108.2468 }],
  [/hòa\s*xuân|hoa\s*xuan/iu, { lat: 16.0175, lng: 108.2215 }],
  [/cẩm\s*lệ|cam\s*le/iu, { lat: 16.0195, lng: 108.2028 }],
  [/thanh\s*khê|thanh\s*khe/iu, { lat: 16.0665, lng: 108.1945 }],
  [/hòa\s*khánh|hoa\s*khanh|liên\s*chiểu|lien\s*chieu/iu, { lat: 16.0695, lng: 108.1555 }],
  [/hòa\s*vang|hoa\s*vang/iu, { lat: 15.9985, lng: 108.1325 }],
  [/ngũ\s*hành\s*sơn|ngu\s*hanh\s*son/iu, { lat: 16.0395, lng: 108.2455 }],
  [/sơn\s*trà|son\s*tra|ngô\s*quyền/iu, { lat: 16.0665, lng: 108.2365 }],
  [/hải\s*châu|hai\s*chau|sông\s*hàn|han\s*river/iu, { lat: 16.0645, lng: 108.2225 }]
];

function lookupDaNangLandmarkCoordinates(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  for (const [pattern, pt] of DANANG_LANDMARK_COORDS) {
    if (pattern.test(s)) return { lat: pt.lat, lng: pt.lng };
  }
  return null;
}

const pair = /^@?\s*([+-]?\d{1,3}(?:\.\d+)?)\s*,\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/;

function coordinatePair(text) {
  const match = String(text || "").match(pair);
  return match ? coordinates(match[1], match[2]) : null;
}

function isMapUrlString(value) {
  const text = String(value || "").trim();
  if (!/^https?:\/\//i.test(text)) return false;
  try {
    const u = new URL(text);
    return /^(?:(?:www|maps)\.)?google\.|^maps\.app\.goo\.gl$|^goo\.gl$|^(?:www\.)?openstreetmap\.org$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function parseApartmentCoordinates(value) {
  if (value && typeof value === "object") {
    return coordinates(value.lat ?? value.latitude, value.lng ?? value.longitude);
  }
  const text = String(value || "").trim();
  const direct = coordinatePair(text);
  if (direct) return direct;

  try {
    const url = new URL(text);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    if (/^(?:(?:www|maps)\.)?google\.(?:com|com\.vn|[a-z]{2}|co\.[a-z]{2})$/.test(url.hostname)) {
      const path = decodeURIComponent(url.pathname);
      // Place coordinates (!3d...!4d...) identify the exact pin. Camera-only /@lat,lng URLs without a place/ftid are ignored.
      const place = path.match(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/);
      if (place) return coordinates(place[1], place[2]);
      const fromQuery =
        coordinatePair(url.searchParams.get("query")) ||
        coordinatePair(url.searchParams.get("q")) ||
        coordinatePair(url.searchParams.get("ll")) ||
        coordinatePair(url.searchParams.get("center"));
      if (fromQuery) return fromQuery;
      // If URL explicitly names a /maps/place/... pin and includes @lat,lng, accept @lat,lng
      if (/\/maps\/place\//i.test(path)) {
        const atMatch = path.match(/@([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/);
        if (atMatch) return coordinates(atMatch[1], atMatch[2]);
      }
    }
    if (url.hostname === "www.openstreetmap.org" || url.hostname === "openstreetmap.org") {
      return coordinates(url.searchParams.get("mlat"), url.searchParams.get("mlon"));
    }
  } catch {
    // Raw coordinates and explicit map pins are the supported synchronous inputs.
  }
  return null;
}

function extractPlaceTextFromGoogleUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    for (const param of ["q", "query", "destination", "daddr"]) {
      const val = url.searchParams.get(param);
      if (val && !coordinatePair(val)) {
        return cleanAddressLabel(val);
      }
    }
    const path = decodeURIComponent(url.pathname.replace(/\+/g, " "));
    const placeMatch = path.match(/\/maps\/(?:place|search)\/([^/@]+)/i);
    if (placeMatch && placeMatch[1] && !coordinatePair(placeMatch[1])) {
      return cleanAddressLabel(placeMatch[1]);
    }
  } catch {
    // Ignore malformed URLs
  }
  return "";
}

function cleanAddressLabel(raw) {
  return String(raw || "")
    .replace(/\+/g, " ")
    .replace(/\b5\d{4}\b/g, "")
    .replace(/,\s*(?:Việt Nam|Vietnam)\s*$/iu, "")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

function isOfflineTestMode() {
  return (
    process.env.NODE_ENV === "test" ||
    String(process.env.PUBLIC_SITE_URL || "").includes(".invalid") ||
    String(process.env.TELEGRAM_WEBHOOK_URL || "").includes(".invalid")
  );
}

function buildDaNangQueryCandidates(addressText) {
  const cleaned = cleanAddressLabel(addressText);
  if (!cleaned) return [];
  const candidates = [];
  const pushUnique = (q) => {
    const norm = String(q || "").replace(/\s{2,}/g, " ").trim();
    if (norm && !candidates.some((c) => c.toLowerCase() === norm.toLowerCase())) {
      candidates.push(norm);
    }
  };

  pushUnique(/đà nẵng|da nang/iu.test(cleaned) ? `${cleaned}, Việt Nam` : `${cleaned}, Đà Nẵng, Việt Nam`);

  // Strip legacy district/ward segments that may differ after 2025/2026 OSM ward mergers
  const firstSegment = cleaned.split(",")[0]?.trim() || "";
  if (firstSegment) {
    pushUnique(`${firstSegment}, Đà Nẵng`);
    if (!/^đường\s+/iu.test(firstSegment)) {
      pushUnique(`Đường ${firstSegment}, Đà Nẵng`);
    }
    const withoutHouseNum = firstSegment.replace(/^\d+[A-Za-z0-9/-]*\s+/u, "").trim();
    if (withoutHouseNum && withoutHouseNum !== firstSegment) {
      pushUnique(`${withoutHouseNum}, Đà Nẵng`);
      if (!/^đường\s+/iu.test(withoutHouseNum)) {
        pushUnique(`Đường ${withoutHouseNum}, Đà Nẵng`);
      }
    }
    const withoutTrailingBranch = withoutHouseNum.replace(/\s+\d+$/u, "").trim();
    if (withoutTrailingBranch && withoutTrailingBranch !== withoutHouseNum && withoutTrailingBranch.length >= 4) {
      pushUnique(`Đường ${withoutTrailingBranch}, Đà Nẵng`);
    }
  }
  return candidates.slice(0, 5);
}

async function queryNominatimBounded(queryText, acceptLang = "vi") {
  const endpoint =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3` +
    `&countrycodes=vn&viewbox=107.98,16.20,108.33,15.965&bounded=1` +
    `&accept-language=${encodeURIComponent(acceptLang)}&q=${encodeURIComponent(queryText)}`;
  const res = await fetch(endpoint, {
    headers: { "User-Agent": "KIN-Estates-DaNang/2.1 (https://www.kinestatesdanang.com)" },
    signal: AbortSignal.timeout(4200)
  });
  if (!res.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || arr.length === 0) return null;
  for (const item of arr) {
    const rawDisp = String(item.display_name || "");
    if (!/đà\s*nẵng|da\s*nang/iu.test(rawDisp)) continue;
    const pt = coordinates(item.lat, item.lon);
    if (isWithinGreaterDaNang(pt)) {
      return { coordinates: pt, displayAddress: cleanAddressLabel(rawDisp) };
    }
  }
  return null;
}

async function geocodeAddressNominatim(addressText) {
  if (!addressText || isOfflineTestMode()) return null;
  // Exact named tower match first (prevents generic street midpoint override on iconic buildings)
  for (const [pattern, pt] of EXACT_TOWER_COORDS) {
    if (pattern.test(addressText)) {
      return { coordinates: { lat: pt.lat, lng: pt.lng }, displayAddress: cleanAddressLabel(addressText) };
    }
  }
  const candidates = buildDaNangQueryCandidates(addressText);
  for (const candidate of candidates) {
    try {
      const hit = await queryNominatimBounded(candidate, "vi");
      if (hit?.coordinates && isWithinGreaterDaNang(hit.coordinates)) {
        return hit;
      }
    } catch {
      // Try next fallback candidate
    }
  }
  const landmarkPt = lookupDaNangLandmarkCoordinates(addressText);
  if (landmarkPt) {
    return { coordinates: landmarkPt, displayAddress: cleanAddressLabel(addressText) };
  }
  return null;
}

async function reverseGeocodeNominatim(pt) {
  if (!pt || !isWithinGreaterDaNang(pt) || isOfflineTestMode()) return "";
  try {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(pt.lat)}&lon=${encodeURIComponent(pt.lng)}&accept-language=vi`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "KIN-Estates-DaNang/2.1 (https://www.kinestatesdanang.com)" },
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return "";
    const data = await res.json();
    const a = data?.address || {};
    const parts = [
      [a.house_number, a.road].filter(Boolean).join(" "),
      a.quarter || a.suburb || a.neighbourhood || a.village || "",
      a.city_district || a.county || "",
      a.city || a.state || "Đà Nẵng"
    ].filter(Boolean);
    const dedup = [];
    for (const p of parts) {
      if (!dedup.some((x) => x.toLowerCase() === p.toLowerCase())) dedup.push(p);
    }
    return cleanAddressLabel(dedup.join(", ") || data?.display_name || "");
  } catch {
    return "";
  }
}

/**
 * Resolves any Google Maps shortlink (maps.app.goo.gl / goo.gl), full Google Maps URL,
 * coordinate pair, OR Da Nang street address into verified Da Nang { lat, lng } coordinates
 * AND a clean human-readable street address.
 */
async function resolveGoogleMapsInput(rawInput) {
  const text = String(rawInput || "").trim();
  if (!text) return null;

  const directCoords = coordinatePair(text);
  if (directCoords) {
    if (!isOfflineTestMode() && !isWithinGreaterDaNang(directCoords)) return null;
    const revAddr = await reverseGeocodeNominatim(directCoords);
    return {
      coordinates: directCoords,
      address: revAddr || "",
      expandedUrl: "",
      fromUrl: false
    };
  }

  // Also extract embedded map URL if user pasted text + URL together
  const urlMatch = text.match(/https?:\/\/[^\s<>"]+/i);
  const candidateUrl = urlMatch ? urlMatch[0] : text;

  // Support plain Vietnamese/English Da Nang street addresses when called from Studio
  if (!isMapUrlString(candidateUrl)) {
    if (isOfflineTestMode()) return null;
    const geocodedPlain = await geocodeAddressNominatim(text);
    if (!geocodedPlain?.coordinates) return null;
    return {
      coordinates: geocodedPlain.coordinates,
      address: cleanAddressLabel(text),
      expandedUrl: "",
      fromUrl: false
    };
  }

  let expandedUrl = candidateUrl;
  let htmlSnippet = "";

  if (!isOfflineTestMode()) {
    try {
      const u = new URL(candidateUrl);
      if (/^(?:maps\.app\.goo\.gl|goo\.gl)$/i.test(u.hostname)) {
        const res = await fetch(candidateUrl, {
          redirect: "follow",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
            "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"
          },
          signal: AbortSignal.timeout(6000)
        });
        if (res.url) expandedUrl = res.url;
        htmlSnippet = (await res.text().catch(() => "")).slice(0, 40000);
      }
    } catch {
      // Keep original URL if redirect fetch times out
    }
  }

  let pt = parseApartmentCoordinates(expandedUrl);
  if (pt && !isOfflineTestMode() && !isWithinGreaterDaNang(pt)) {
    pt = null;
  }
  if (!pt && htmlSnippet) {
    // IMPORTANT: Never parse generic `center=` staticmap previews — on US cloud servers (Vercel iad1),
    // Google sets `center=39.0267994,-77.844326` (Ashburn, Virginia)! Only accept `!3d...!4d...` INSIDE Da Nang.
    const m3d = htmlSnippet.match(/!3d([+-]?\d+\.\d+)!4d([+-]?\d+\.\d+)/);
    if (m3d) {
      const candidatePt = coordinates(m3d[1], m3d[2]);
      if (isWithinGreaterDaNang(candidatePt)) pt = candidatePt;
    }
  }

  let address = extractPlaceTextFromGoogleUrl(expandedUrl);
  if (!pt && address) {
    const geocoded = await geocodeAddressNominatim(address);
    if (geocoded?.coordinates && isWithinGreaterDaNang(geocoded.coordinates)) {
      pt = geocoded.coordinates;
    }
  }
  if (pt && !address) {
    address = await reverseGeocodeNominatim(pt);
  }

  if (!pt && !address) return null;
  return {
    coordinates: pt || null,
    address: address || "",
    expandedUrl,
    fromUrl: true
  };
}

function apartmentMapUrl(apartment, hl = "vi") {
  const parsed = parseApartmentCoordinates(apartment.coordinates);
  const location =
    apartment.locationAccuracy === "exact" &&
    parsed &&
    (isOfflineTestMode() || isWithinGreaterDaNang(parsed))
      ? parsed
      : null;
  const rawAddr = String(apartment.address || "").trim();
  const address = isMapUrlString(rawAddr) ? "" : rawAddr;
  if (!location && !address) return isMapUrlString(rawAddr) ? rawAddr : null;
  const scopedAddress =
    address && !/đà nẵng|da nang/iu.test(address) ? `${address}, Đà Nẵng, Việt Nam` : address;
  const query = location ? [location.lat, location.lng].join(",") : scopedAddress;
  const base = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
  return hl && !isOfflineTestMode() ? `${base}&hl=${encodeURIComponent(hl)}` : base;
}

module.exports = {
  parseApartmentCoordinates,
  isWithinGreaterDaNang,
  geocodeAddressNominatim,
  lookupDaNangLandmarkCoordinates,
  resolveGoogleMapsInput,
  isMapUrlString,
  apartmentMapUrl
};
