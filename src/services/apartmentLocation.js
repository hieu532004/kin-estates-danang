function coordinates(latitude, longitude) {
  if (latitude == null || longitude == null || latitude === "" || longitude === "") return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)) };
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
    .replace(/\b55\d{4}\b/g, "")
    .replace(/,\s*(?:Việt Nam|Vietnam)\s*$/iu, "")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim();
}

function isOfflineTestMode() {
  return String(process.env.PUBLIC_SITE_URL || "").includes(".invalid");
}

async function geocodeAddressNominatim(addressText) {
  if (!addressText || isOfflineTestMode()) return null;
  try {
    const q = /đà nẵng|da nang/iu.test(addressText) ? addressText : `${addressText}, Đà Nẵng, Việt Nam`;
    const endpoint = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=vi&q=${encodeURIComponent(q)}`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "KIN-Estates-DaNang/2.0 (https://www.kinestatesdanang.com)" },
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr[0]) return null;
    const pt = coordinates(arr[0].lat, arr[0].lon);
    const display = cleanAddressLabel(arr[0].display_name || "");
    return pt ? { coordinates: pt, displayAddress: display } : null;
  } catch {
    return null;
  }
}

async function reverseGeocodeNominatim(pt) {
  if (!pt || isOfflineTestMode()) return "";
  try {
    const endpoint = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(pt.lat)}&lon=${encodeURIComponent(pt.lng)}&accept-language=vi`;
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "KIN-Estates-DaNang/2.0 (https://www.kinestatesdanang.com)" },
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
 * or coordinate pair into BOTH exact { lat, lng } coordinates AND a clean human-readable Vietnamese street address.
 */
async function resolveGoogleMapsInput(rawInput) {
  const text = String(rawInput || "").trim();
  if (!text) return null;

  const directCoords = coordinatePair(text);
  if (directCoords) {
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
  if (!isMapUrlString(candidateUrl)) return null;

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
  if (!pt && htmlSnippet) {
    const m3d = htmlSnippet.match(/!3d([+-]?\d+\.\d+)!4d([+-]?\d+\.\d+)/);
    const centerM = htmlSnippet.match(/center=([+-]?\d+\.\d+)%2C([+-]?\d+\.\d+)/i);
    if (m3d) pt = coordinates(m3d[1], m3d[2]);
    else if (centerM) pt = coordinates(centerM[1], centerM[2]);
  }

  let address = extractPlaceTextFromGoogleUrl(expandedUrl);
  if (!pt && address) {
    const geocoded = await geocodeAddressNominatim(address);
    if (geocoded?.coordinates) {
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

function apartmentMapUrl(apartment) {
  const location = apartment.locationAccuracy === "exact" && parseApartmentCoordinates(apartment.coordinates);
  const rawAddr = String(apartment.address || "").trim();
  const address = isMapUrlString(rawAddr) ? "" : rawAddr;
  if (!location && !address) return isMapUrlString(rawAddr) ? rawAddr : null;
  const query = location ? [location.lat, location.lng].join(",") : address;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

module.exports = {
  parseApartmentCoordinates,
  resolveGoogleMapsInput,
  isMapUrlString,
  apartmentMapUrl
};
