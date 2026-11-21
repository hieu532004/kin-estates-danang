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
      // Place coordinates identify the pin. The @ segment can instead be the map camera.
      const place = path.match(/!3d([+-]?\d+(?:\.\d+)?)!4d([+-]?\d+(?:\.\d+)?)/);
      return (place && coordinates(place[1], place[2])) ||
        coordinatePair(url.searchParams.get("query")) || coordinatePair(url.searchParams.get("q"));
    }
    if (url.hostname === "www.openstreetmap.org" || url.hostname === "openstreetmap.org") {
      return coordinates(url.searchParams.get("mlat"), url.searchParams.get("mlon"));
    }
  } catch {
    // Raw coordinates and explicit map pins are the supported inputs.
  }
  return null;
}

function apartmentMapUrl(apartment) {
  const location = apartment.locationAccuracy === "exact" && parseApartmentCoordinates(apartment.coordinates);
  const address = String(apartment.address || "").trim();
  if (!location && !address) return null;
  const query = location ? [location.lat, location.lng].join(",") : address;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(query);
}

module.exports = { parseApartmentCoordinates, apartmentMapUrl };
