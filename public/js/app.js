/**
 * KIN ATELIER / DANANG HOMII LUXE — Multi-Page Router, Mobile-First & Map Engine
 * Inspired by https://dananghomii.com/ & https://www.realestate-danang.com/
 */

const state = {
  route: "/",
  lang: "en",
  currency: "USD",
  catViewMode: "split",
  tileStyle: "streets",
  allApartments: [],
  filteredApartments: [],
  buildings: [],
  neighborhoods: [],
  filters: {
    q: "",
    area: "all",
    bedrooms: "all",
    maxPrice: "0",
    tag: "all",
    sort: "featured"
  },
  catMap: null,
  catTileLayer: null,
  catMarkers: {},
  fullMap: null,
  fullTileLayer: null,
  fullMarkers: {},
  detailMap: null
};

const TILE_URLS = {
  streets: {
    url: "https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}",
    attr: "&copy; Google Maps Da Nang"
  },
  satellite: {
    url: "https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}",
    attr: "&copy; Google Satellite Coastal"
  },
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: "&copy; OpenStreetMap contributors"
  }
};

const AREA_IMAGES = [
  "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85"
];

const i18n = {
  en: {
    tab_home: "Home",
    tab_catalogue: "Find My Home",
    tab_map: "Interactive Map",
    tab_areas: "Da Nang Areas",
    tab_buildings: "Buildings & Index",
    tab_process: "How to Rent",
    btn_shortlist: "Personal Shortlist",
    hero_badge: "DA NANG LONG-TERM RENTALS • 3–12+ MONTHS • VERIFIED BY ARCHITECTS",
    hero_title: "Architectural coastal &amp; riverfront <em>residences</em> in Da Nang.",
    hero_lead:
      "Handpicked apartments, penthouses, and coastal villas for expats, digital nomads, and international families. Personally verified for natural morning light, dedicated remote-work desks, and transparent state-rate EVN electricity.",
    lbl_search: "Building or Keyword",
    lbl_area: "Da Nang District",
    lbl_bedrooms: "Bedrooms",
    lbl_budget: "Monthly Budget",
    btn_find_home: "Find My Home →"
  },
  vi: {
    tab_home: "Trang Chủ",
    tab_catalogue: "Tìm Căn Hộ",
    tab_map: "Bản Đồ Đà Nẵng",
    tab_areas: "Khu Vực",
    tab_buildings: "Tòa Nhà & Giá",
    tab_process: "Quy Trình Thuê",
    btn_shortlist: "Nhận Shortlist",
    hero_badge: "THUÊ CĂN HỘ DÀI HẠN ĐÀ NẴNG • 3–12+ THÁNG • KIỂM DUYỆT THỰC TẾ",
    hero_title: "Tuyệt tác căn hộ <em>kiến trúc</em> ven biển &amp; sông Hàn.",
    hero_lead:
      "Bộ sưu tập căn hộ, penthouse và biệt thự tuyển chọn dành cho chuyên gia quốc tế và khách lưu trú dài hạn. Khảo sát thực tế ánh sáng tự nhiên, bàn làm việc riêng và đơn giá điện EVN minh bạch.",
    lbl_search: "Tòa nhà / Mã căn",
    lbl_area: "Khu vực Đà Nẵng",
    lbl_bedrooms: "Phòng ngủ",
    lbl_budget: "Ngân sách / tháng",
    btn_find_home: "Tìm Căn Hộ →"
  },
  ru: {
    tab_home: "Главная",
    tab_catalogue: "Каталог",
    tab_map: "Карта Дананга",
    tab_areas: "Районы",
    tab_buildings: "Комплексы и Цены",
    tab_process: "Как Арендовать",
    btn_shortlist: "Подбор в Telegram",
    hero_badge: "ДОЛГОСРОЧНАЯ АРЕНДА В ДАНАНГЕ • ОТ 3 ДО 12+ МЕСЯЦЕВ",
    hero_title: "Авторские <em>архитектурные</em> резиденции у океана и реки Хан.",
    hero_lead:
      "Отборные апартаменты, пентхаусы и виллы для экспатов и специалистов. Личная проверка естественного освещения, рабочей зоны и государственного тарифа на электричество.",
    lbl_search: "Комплекс или код",
    lbl_area: "Район Дананга",
    lbl_bedrooms: "Спальни",
    lbl_budget: "Бюджет в месяц",
    btn_find_home: "Найти жилье →"
  }
};

function formatPrice(apt) {
  if (state.currency === "VND") {
    const vndMillion = ((apt.priceVnd || apt.priceUsd * 25480) / 1000000).toFixed(1);
    return `${vndMillion}M ₫ / mo`;
  }
  return `$${Number(apt.priceUsd).toLocaleString()} / mo`;
}

function getLocalizedText(field) {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field[state.lang] || field.en || field.vi || "";
}

/* ============================================================================
   INITIALIZATION & 60FPS CINEMATIC MIST VIDEO ENGINE
   ============================================================================ */
async function initApp() {
  initHeroCinemaCanvas();
  setupNavbarScrollEffect();
  bindFilterControls();

  await Promise.all([
    fetchAllData()
  ]);

  // Handle initial URL path
  const initialPath = window.location.pathname || "/";
  handleRouteRender(initialPath, false);

  window.addEventListener("popstate", () => {
    handleRouteRender(window.location.pathname || "/", false);
  });
}

function initHeroCinemaCanvas() {
  const canvas = document.getElementById("hero-cinema-canvas");
  const video = document.getElementById("hero-bg-video");
  if (video) {
    video.play().catch(() => {});
  }
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const slides = [
    "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80"
  ];
  const imgs = [];
  slides.forEach((src) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    imgs.push(img);
  });

  let t = 0;
  function resize() {
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function renderFrame() {
    t += 0.004;
    const w = canvas.width;
    const h = canvas.height;
    const idx = Math.floor(t / 3) % imgs.length;
    const nextIdx = (idx + 1) % imgs.length;
    const cycle = (t % 3) / 3;
    const scale = 1.04 + cycle * 0.08;

    const currentImg = imgs[idx];
    if (currentImg && currentImg.complete && currentImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(currentImg, -w / 2, -h / 2, w, h);
      ctx.restore();
    } else {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#0B1622");
      grad.addColorStop(1, "#1D3B49");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    if (cycle > 0.75) {
      const nextImg = imgs[nextIdx];
      if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = (cycle - 0.75) * 4;
        ctx.drawImage(nextImg, 0, 0, w, h);
        ctx.restore();
      }
    }

    requestAnimationFrame(renderFrame);
  }
  requestAnimationFrame(renderFrame);
}

function setupNavbarScrollEffect() {
  const navbar = document.getElementById("top-navbar");
  if (!navbar) return;
  const updateNav = () => {
    const isHome = state.route === "/";
    navbar.classList.toggle("hero-transparent", isHome && window.scrollY < 45);
  };
  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();
}

/* ============================================================================
   MULTI-PAGE ROUTER ENGINE (Dedicated Pages per Tab)
   ============================================================================ */
function navigateRoute(event, path) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  handleRouteRender(path, true);
}

function handleRouteRender(rawPath, pushHistory = true) {
  const path = rawPath || "/";
  state.route = path;

  if (pushHistory && window.location.pathname !== path) {
    window.history.pushState({ path }, "", path);
  }

  window.scrollTo({ top: 0, behavior: "instant" });

  // Hide all routes
  document.querySelectorAll(".page-route").forEach((el) => el.classList.remove("active"));

  // Determine target route
  let activeTabKey = path;
  if (path.startsWith("/apartment/")) {
    const code = path.replace("/apartment/", "").trim();
    document.getElementById("route-detail")?.classList.add("active");
    activeTabKey = "/apartments";
    renderResidenceDetailPage(code);
  } else if (path === "/apartments") {
    document.getElementById("route-apartments")?.classList.add("active");
    setTimeout(() => {
      ensureCatalogueMap();
      renderCatalogueMapMarkers();
    }, 80);
  } else if (path === "/map") {
    document.getElementById("route-map")?.classList.add("active");
    setTimeout(() => {
      ensureFullpageMap();
      renderFullMapMarkers();
    }, 80);
  } else if (path === "/areas") {
    document.getElementById("route-areas")?.classList.add("active");
  } else if (path === "/buildings") {
    document.getElementById("route-buildings")?.classList.add("active");
  } else if (path === "/process" || path === "/shortlist") {
    document.getElementById("route-process")?.classList.add("active");
    activeTabKey = "/process";
  } else {
    document.getElementById("route-home")?.classList.add("active");
    activeTabKey = "/";
    const v = document.getElementById("hero-bg-video");
    if (v) v.play().catch(() => {});
  }

  // Update desktop & mobile tab buttons
  document.querySelectorAll("#desktop-router-tabs .router-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.route === activeTabKey);
  });
  document.querySelectorAll("#mobile-bottom-tabbar .mobile-tab-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.route === activeTabKey);
  });

  // Show/hide mobile floating map toggle button on Catalogue route
  const mobMapBtn = document.getElementById("mobile-map-toggle-btn");
  if (mobMapBtn) {
    mobMapBtn.classList.toggle("visible-on-catalogue", path === "/apartments");
  }

  // Update navbar transparency
  const navbar = document.getElementById("top-navbar");
  if (navbar) {
    navbar.classList.toggle("hero-transparent", activeTabKey === "/" && window.scrollY < 45);
  }
}

/* ============================================================================
   DATA FETCHING & FILTER / SORT ENGINE
   ============================================================================ */
async function fetchAllData() {
  const [aptRes, bldgRes, areaRes] = await Promise.all([
    fetch("/api/apartments"),
    fetch("/api/buildings"),
    fetch("/api/neighborhoods")
  ]);

  const aptData = await aptRes.json();
  const bldgData = await bldgRes.json();
  const areaData = await areaRes.json();

  state.allApartments = aptData.apartments || [];
  state.buildings = bldgData.buildings || [];
  state.neighborhoods = areaData.neighborhoods || [];

  applyFiltersAndSort();
  renderHomeSpotlight();
  renderAreasPage();
  renderBuildingsPage();
}

function applyFiltersAndSort() {
  let list = [...state.allApartments];
  const f = state.filters;

  if (f.area && f.area !== "all") {
    list = list.filter((a) => (a.areaName || "").toLowerCase() === f.area.toLowerCase());
  }
  if (f.bedrooms && f.bedrooms !== "all") {
    const br = Number(f.bedrooms);
    list = list.filter((a) => (br >= 3 ? a.bedrooms >= 3 : a.bedrooms === br));
  }
  if (f.maxPrice && Number(f.maxPrice) > 0) {
    list = list.filter((a) => Number(a.priceUsd) <= Number(f.maxPrice));
  }
  if (f.tag && f.tag !== "all") {
    list = list.filter((a) =>
      (a.tags || []).some((t) => t.toLowerCase().includes(f.tag.toLowerCase()))
    );
  }
  if (f.q && f.q.trim() !== "") {
    const q = f.q.trim().toLowerCase();
    list = list.filter((a) => {
      const tEn = (a.title?.en || "").toLowerCase();
      const tVi = (a.title?.vi || "").toLowerCase();
      const bldg = (a.building || "").toLowerCase();
      const code = (a.code || "").toLowerCase();
      const area = (a.areaName || "").toLowerCase();
      return tEn.includes(q) || tVi.includes(q) || bldg.includes(q) || code.includes(q) || area.includes(q);
    });
  }

  // Sort
  if (f.sort === "price-asc") {
    list.sort((a, b) => a.priceUsd - b.priceUsd);
  } else if (f.sort === "price-desc") {
    list.sort((a, b) => b.priceUsd - a.priceUsd);
  } else if (f.sort === "size-desc") {
    list.sort((a, b) => (b.sizeM2 || 0) - (a.sizeM2 || 0));
  } else if (f.sort === "light-desc") {
    list.sort((a, b) => (b.naturalLightScore || 0) - (a.naturalLightScore || 0));
  } else {
    list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
  }

  state.filteredApartments = list;
  renderCatalogueGrid();
  if (state.catMap) renderCatalogueMapMarkers();
  if (state.fullMap) renderFullMapMarkers();
}

function buildApartmentCardHtml(apt) {
  const title = getLocalizedText(apt.title);
  const notes = getLocalizedText(apt.architecturalNotes);
  const cover =
    (apt.images && apt.images[0]) ||
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200";
  const tagsHtml = (apt.tags || [])
    .slice(0, 3)
    .map((t) => `<span class="mini-tag-chip">${t}</span>`)
    .join("");

  return `
    <article class="apt-modern-card"
      onmouseenter="highlightMapPin('${apt.code}', true)"
      onmouseleave="highlightMapPin('${apt.code}', false)"
      onclick="navigateRoute(event, '/apartment/${apt.code}')">
      <div>
        <div class="apt-modern-card__media">
          <img src="${cover}" alt="${title}" loading="lazy" />
          <div class="apt-modern-card__top-badges">
            <span class="pill-badge-dark">☀️ Light ${apt.naturalLightScore || 9.5}/10</span>
            <span class="pill-badge-dark pill-badge-green">${apt.status || "Available"}</span>
          </div>
          <div class="apt-modern-card__price-tag">${formatPrice(apt)}</div>
        </div>

        <div class="apt-modern-card__body">
          <div class="apt-modern-card__loc">${apt.areaName} • ${apt.building}</div>
          <h3 class="apt-modern-card__title">${title}</h3>
          <p class="apt-modern-card__desc">${notes}</p>

          <div class="apt-modern-card__specs">
            <div>
              <strong>${apt.bedrooms} BR</strong>
              <span>Bedrooms</span>
            </div>
            <div>
              <strong>${apt.bathrooms || apt.bedrooms} BA</strong>
              <span>Bathrooms</span>
            </div>
            <div>
              <strong>${apt.sizeM2} m²</strong>
              <span>Interior</span>
            </div>
            <div>
              <strong>FL. ${apt.floor || 12}</strong>
              <span>Floor</span>
            </div>
          </div>
        </div>
      </div>

      <div class="apt-modern-card__footer">
        <div style="display:flex; flex-wrap:wrap; gap:0.35rem;">${tagsHtml}</div>
        <span style="font-size:0.78rem; font-weight:700; color:var(--accent-bronze-dark); white-space:nowrap;">Details →</span>
      </div>
    </article>
  `;
}

function renderHomeSpotlight() {
  const grid = document.getElementById("home-featured-grid");
  if (!grid) return;
  const featured = state.allApartments.slice(0, 4);
  grid.innerHTML = featured.map(buildApartmentCardHtml).join("");
}

function renderCatalogueGrid() {
  const grid = document.getElementById("catalogue-cards-grid");
  const countEl = document.getElementById("cat-results-count");
  if (countEl) {
    countEl.textContent = `${state.filteredApartments.length} RESIDENCES`;
  }
  if (!grid) return;

  if (state.filteredApartments.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; background:#fff; padding:3.5rem 2rem; border-radius:18px; text-align:center; border:1px solid var(--border-light);">
        <h3 style="font-family:var(--font-serif); font-size:2rem; margin-bottom:0.5rem;">No residences match your current filters</h3>
        <p style="color:var(--text-secondary); margin-bottom:1.25rem;">Reset your filters or request a personalized shortlist from our Da Nang team.</p>
        <button type="button" class="btn-luxe btn-luxe--dark" onclick="resetAllFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.filteredApartments.map(buildApartmentCardHtml).join("");
}

/* ============================================================================
   BULLETPROOF DUAL MAP ENGINE (Google Maps Streets/Satellite + OpenStreetMap)
   ============================================================================ */
function createTileLayer(styleKey) {
  const cfg = TILE_URLS[styleKey] || TILE_URLS.streets;
  return L.tileLayer(cfg.url, {
    attribution: cfg.attr,
    maxZoom: 19
  });
}

function ensureCatalogueMap() {
  const el = document.getElementById("catalogue-map");
  if (!el || typeof L === "undefined") return;

  if (!state.catMap) {
    state.catMap = L.map("catalogue-map", {
      zoomControl: false,
      scrollWheelZoom: true
    }).setView([16.0595, 108.2365], 13);

    L.control.zoom({ position: "bottomright" }).addTo(state.catMap);
    state.catTileLayer = createTileLayer(state.tileStyle).addTo(state.catMap);

    const box = el.closest(".map-frame-box");
    if (box && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => {
        if (state.catMap) state.catMap.invalidateSize();
      }).observe(box);
    }
  }

  setTimeout(() => {
    if (state.catMap) state.catMap.invalidateSize(true);
  }, 100);
}

function ensureFullpageMap() {
  const el = document.getElementById("fullpage-map");
  if (!el || typeof L === "undefined") return;

  if (!state.fullMap) {
    state.fullMap = L.map("fullpage-map", {
      zoomControl: false,
      scrollWheelZoom: true
    }).setView([16.0595, 108.2365], 13);

    L.control.zoom({ position: "bottomright" }).addTo(state.fullMap);
    state.fullTileLayer = createTileLayer(state.tileStyle).addTo(state.fullMap);

    const box = el.closest(".fullpage-map-wrapper");
    if (box && typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => {
        if (state.fullMap) state.fullMap.invalidateSize();
      }).observe(box);
    }
  }

  setTimeout(() => {
    if (state.fullMap) state.fullMap.invalidateSize(true);
  }, 100);
}

function switchTileStyle(styleKey) {
  state.tileStyle = styleKey;
  if (state.catMap && state.catTileLayer) {
    state.catMap.removeLayer(state.catTileLayer);
    state.catTileLayer = createTileLayer(styleKey).addTo(state.catMap);
  }
  if (state.fullMap && state.fullTileLayer) {
    state.fullMap.removeLayer(state.fullTileLayer);
    state.fullTileLayer = createTileLayer(styleKey).addTo(state.fullMap);
  }
}

function flyMap(target, lat, lng, zoom = 14) {
  const m = target === "full" ? state.fullMap : state.catMap;
  if (!m) return;
  m.invalidateSize();
  m.flyTo([lat, lng], zoom, { duration: 0.85 });
}

function populateMarkersOnMap(mapObj, markerStore, list, drawerId) {
  if (!mapObj || typeof L === "undefined") return;
  Object.values(markerStore).forEach((m) => mapObj.removeLayer(m));
  Object.keys(markerStore).forEach((k) => delete markerStore[k]);

  const bounds = [];

  list.forEach((apt) => {
    const lat = Number(apt.coordinates?.lat) || 16.0583;
    const lng = Number(apt.coordinates?.lng) || 108.2385;
    bounds.push([lat, lng]);

    const label =
      state.currency === "VND"
        ? `${((apt.priceVnd || apt.priceUsd * 25480) / 1000000).toFixed(0)}M ₫`
        : `$${Number(apt.priceUsd).toLocaleString()}`;

    const icon = L.divIcon({
      className: "luxe-pin-wrap",
      html: `<div class="luxe-price-pin" data-pin-code="${apt.code}">${label}</div>`,
      iconSize: [74, 30],
      iconAnchor: [37, 15]
    });

    const marker = L.marker([lat, lng], { icon }).addTo(mapObj);
    marker.on("click", () => {
      showSelectedMapDrawer(drawerId, apt);
      mapObj.flyTo([lat, lng], 15, { duration: 0.6 });
    });
    markerStore[apt.code] = marker;
  });

  if (bounds.length > 1) {
    mapObj.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
  } else if (bounds.length === 1) {
    mapObj.setView(bounds[0], 15);
  }
}

function renderCatalogueMapMarkers() {
  if (!state.catMap) return;
  populateMarkersOnMap(state.catMap, state.catMarkers, state.filteredApartments, "cat-map-drawer");
}

function renderFullMapMarkers() {
  if (!state.fullMap) return;
  populateMarkersOnMap(state.fullMap, state.fullMarkers, state.allApartments, "full-map-drawer");
}

function showSelectedMapDrawer(drawerId, apt) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  const title = getLocalizedText(apt.title);
  const cover = (apt.images && apt.images[0]) || "";

  drawer.innerHTML = `
    <img src="${cover}" alt="${title}" style="width:120px; height:92px; object-fit:cover; border-radius:10px;" />
    <div style="min-width:0;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size:0.68rem; font-weight:700; color:var(--accent-bronze); text-transform:uppercase;">${apt.areaName} • ${apt.bedrooms}BR • ${apt.sizeM2}m²</span>
        <button type="button" onclick="document.getElementById('${drawerId}').classList.remove('open')" style="background:none;border:none;font-size:0.9rem;cursor:pointer;color:var(--text-muted);">✕</button>
      </div>
      <div style="font-family:var(--font-serif); font-size:1.15rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:2px 0 6px;">${title}</div>
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong style="font-size:0.95rem; color:var(--text-primary);">${formatPrice(apt)}</strong>
        <button type="button" class="btn-luxe btn-luxe--dark" style="padding:0.38rem 0.85rem; font-size:0.75rem;"
          onclick="navigateRoute(event, '/apartment/${apt.code}')">
          Open Residence →
        </button>
      </div>
    </div>
  `;
  drawer.classList.add("open");
}

function highlightMapPin(code, active) {
  document.querySelectorAll(`[data-pin-code="${code}"]`).forEach((el) => {
    el.classList.toggle("active", active);
  });
}

/* ============================================================================
   DEDICATED ROUTER PAGES: AREAS, BUILDINGS, RESIDENCE DETAIL
   ============================================================================ */
function renderAreasPage() {
  const grid = document.getElementById("areas-page-grid");
  if (!grid) return;
  const areaFilterKeys = ["An Thuong", "Son Tra", "Han Riverfront", "My Khe Beachfront"];

  grid.innerHTML = state.neighborhoods
    .map((n, idx) => {
      const fKey = areaFilterKeys[idx] || "all";
      const count = state.allApartments.filter(
        (a) => (a.areaName || "").toLowerCase() === fKey.toLowerCase()
      ).length;

      return `
        <article style="background:#fff; border-radius:20px; overflow:hidden; border:1px solid var(--border-light); box-shadow:var(--shadow-card); display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="position:relative; height:230px; overflow:hidden;">
              <img src="${AREA_IMAGES[idx % AREA_IMAGES.length]}" alt="${n.name}" style="width:100%; height:100%; object-fit:cover;" />
              <div style="position:absolute; bottom:12px; left:12px; background:rgba(11,18,25,0.82); color:#fff; padding:0.35rem 0.85rem; border-radius:999px; font-size:0.75rem; font-weight:700;">
                ${n.rentRangeUsd}
              </div>
            </div>
            <div style="padding:1.5rem;">
              <span style="font-size:0.7rem; font-weight:700; color:var(--accent-bronze); text-transform:uppercase; letter-spacing:0.1em;">${n.subtitle}</span>
              <h2 style="font-family:var(--font-serif); font-size:1.85rem; margin:0.2rem 0 0.65rem;">${n.name}</h2>
              <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:1.25rem;">${n.architecturalCharacter}</p>

              <div style="background:var(--bg-ivory); padding:0.9rem 1rem; border-radius:12px; font-size:0.82rem; display:flex; flex-direction:column; gap:0.4rem;">
                <div><strong>🏖 Beach Proximity:</strong> ${n.beachWalk}</div>
                <div><strong>💻 Remote-Work &amp; Cafés:</strong> ${n.remoteWorkScore}</div>
                <div><strong>🔉 Acoustic Profile:</strong> ${n.noiseLevel}</div>
              </div>
            </div>
          </div>

          <div style="padding:0 1.5rem 1.5rem;">
            <button type="button" class="btn-luxe btn-luxe--dark" style="width:100%;"
              onclick="jumpToAreaInCatalogue('${fKey}')">
              Browse ${count || ""} Verified Residences in ${fKey} →
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderBuildingsPage() {
  const grid = document.getElementById("buildings-page-grid");
  if (!grid) return;

  grid.innerHTML = state.buildings
    .map(
      (b) => `
      <article style="background:var(--bg-midnight); color:#fff; border-radius:20px; padding:1.85rem; display:flex; flex-direction:column; justify-content:space-between; box-shadow:var(--shadow-card);">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
            <div>
              <span style="font-size:0.7rem; font-weight:700; color:#F4D3B2; text-transform:uppercase; letter-spacing:0.1em;">${b.area} • ${b.tier}</span>
              <h2 style="font-family:var(--font-serif); font-size:1.95rem; margin-top:0.25rem;">${b.name}</h2>
            </div>
            <span style="font-size:0.72rem; background:rgba(255,255,255,0.1); padding:0.25rem 0.7rem; border-radius:999px;">Est. ${b.yearCompleted}</span>
          </div>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.75rem; margin:1.25rem 0; padding:1rem; background:rgba(255,255,255,0.05); border-radius:12px;">
            <div>
              <span style="font-size:0.68rem; color:rgba(255,255,255,0.55); display:block;">1 BEDROOM</span>
              <strong style="font-size:0.95rem;">${b.avg1BrUsd}</strong>
            </div>
            <div>
              <span style="font-size:0.68rem; color:rgba(255,255,255,0.55); display:block;">2 BEDROOMS</span>
              <strong style="font-size:0.95rem; color:#F4D3B2;">${b.avg2BrUsd}</strong>
            </div>
            <div>
              <span style="font-size:0.68rem; color:rgba(255,255,255,0.55); display:block;">3BR / PENTHOUSE</span>
              <strong style="font-size:0.95rem;">${b.avg3BrUsd}</strong>
            </div>
          </div>

          <div style="font-size:0.85rem; color:rgba(255,255,255,0.8); display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.5rem;">
            <div><strong>🏖 Beach Distance:</strong> ${b.walkToBeach}</div>
            <div><strong>⚡ Electricity Rate:</strong> ${b.electricity}</div>
            <div><strong>🐾 Pet Policy:</strong> ${b.petFriendly}</div>
            <div><strong>🏊 Amenities:</strong> ${b.amenities}</div>
          </div>
        </div>

        <button type="button" class="btn-luxe btn-luxe--bronze" style="width:100%;"
          onclick="jumpToBuildingInCatalogue('${b.name.split(" ")[0]}')">
          Filter Available Units in ${b.name} →
        </button>
      </article>
    `
    )
    .join("");
}

async function renderResidenceDetailPage(code) {
  const container = document.getElementById("residence-detail-page-content");
  if (!container) return;

  let apt = state.allApartments.find(
    (a) => (a.code || "").toUpperCase() === code.toUpperCase()
  );
  if (!apt) {
    const r = await fetch(`/api/apartments/${code}`);
    const d = await r.json();
    apt = d.apartment;
  }

  if (!apt) {
    container.innerHTML = `
      <div style="padding:3rem; text-align:center;">
        <h2>Residence Not Found</h2>
        <button type="button" class="btn-luxe btn-luxe--dark" style="margin-top:1rem;" onclick="navigateRoute(event, '/apartments')">← Back to Catalogue</button>
      </div>
    `;
    return;
  }

  const title = getLocalizedText(apt.title);
  const notes = getLocalizedText(apt.architecturalNotes);
  const images =
    apt.images && apt.images.length
      ? apt.images
      : ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1400"];

  container.innerHTML = `
    <div style="margin-bottom: 1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.75rem;">
      <button type="button" class="btn-luxe btn-luxe--outline" onclick="navigateRoute(event, '/apartments')">
        ← Back to Catalogue
      </button>
      <div style="font-size:0.78rem; font-weight:700; color:var(--accent-bronze); text-transform:uppercase; letter-spacing:0.08em;">
        ${apt.code} • ${apt.areaName} • ${apt.building}
      </div>
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap:2rem; align-items:start;">
      <!-- Left: Gallery & Architectural Details -->
      <div>
        <div style="aspect-ratio:16/10; border-radius:20px; overflow:hidden; margin-bottom:0.75rem; background:#E6E1D8; box-shadow:var(--shadow-card);">
          <img id="detail-hero-photo" src="${images[0]}" alt="${title}" style="width:100%; height:100%; object-fit:cover;" />
        </div>
        <div style="display:flex; gap:0.6rem; overflow-x:auto; margin-bottom:1.5rem;">
          ${images
            .map(
              (img) => `
            <img src="${img}" onclick="document.getElementById('detail-hero-photo').src='${img}'"
              style="width:105px; height:72px; object-fit:cover; border-radius:10px; cursor:pointer; border:2px solid rgba(18,23,29,0.12);" />
          `
            )
            .join("")}
        </div>

        <h1 style="font-family:var(--font-serif); font-size:clamp(2rem, 3.4vw, 2.8rem); line-height:1.15; margin-bottom:0.75rem;">
          ${title}
        </h1>
        <p style="font-size:0.96rem; color:var(--text-secondary); line-height:1.75; margin-bottom:1.5rem;">
          ${notes}
        </p>

        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:0.85rem; margin-bottom:1.75rem;">
          <div style="background:#fff; padding:1rem; border-radius:14px; border:1px solid var(--border-light);">
            <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; display:block;">Interior &amp; Floor</span>
            <strong>${apt.sizeM2} m² • Floor ${apt.floor || 12} (${apt.orientation || "East Ocean Breeze"})</strong>
          </div>
          <div style="background:#fff; padding:1rem; border-radius:14px; border:1px solid var(--border-light);">
            <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; display:block;">Remote-Work Setup</span>
            <strong>${apt.remoteWorkSetup || "Dedicated Desk + 300Mbps Fiber"}</strong>
          </div>
          <div style="background:#fff; padding:1rem; border-radius:14px; border:1px solid var(--border-light);">
            <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; display:block;">Electricity &amp; Deposit</span>
            <strong>${apt.electricityRate} • ${apt.depositMonths || 1}M Deposit</strong>
          </div>
          <div style="background:#fff; padding:1rem; border-radius:14px; border:1px solid var(--border-light);">
            <span style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; display:block;">Pet Policy &amp; Min Lease</span>
            <strong>${apt.petPolicy} • ${apt.minLeaseMonths || 3}–12+ Months</strong>
          </div>
        </div>

        <h3 style="font-family:var(--font-serif); font-size:1.55rem; margin-bottom:0.65rem;">Exact Location in Da Nang</h3>
        <div id="detail-unit-map" style="width:100%; height:290px; border-radius:16px; overflow:hidden; border:1px solid var(--border-medium);"></div>
      </div>

      <!-- Right: Private Viewing & Video Tour Booking Card -->
      <div style="background:#fff; padding:2rem; border-radius:22px; border:1px solid var(--border-medium); box-shadow:var(--shadow-elevated); position:sticky; top:92px;">
        <div style="font-size:0.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.1em;">
          VERIFIED LONG-TERM LEASE (${apt.minLeaseMonths || 3}–12+ MONTHS)
        </div>
        <div style="font-family:var(--font-serif); font-size:2.65rem; font-weight:600; color:var(--text-primary); margin:0.2rem 0;">
          ${formatPrice(apt)}
        </div>
        <div style="font-size:0.82rem; font-weight:700; color:var(--accent-emerald); margin-bottom:1.35rem;">
          ● ${apt.status || "Available"} — Ready for In-Person Viewing or Live HD Video Tour
        </div>

        <form onsubmit="submitUnitViewingForm(event, '${apt.code}', '${title.replace(/'/g, "")}')" style="display:flex; flex-direction:column; gap:0.85rem;">
          <div>
            <label style="font-size:0.74rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:0.3rem;">Your Name *</label>
            <input type="text" name="clientName" class="modern-search-input" required placeholder="Full Name" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1.3fr; gap:0.6rem;">
            <div>
              <label style="font-size:0.74rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:0.3rem;">Messenger</label>
              <select name="messenger" class="modern-select-pill">
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Zalo">Zalo</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.74rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:0.3rem;">Phone or @Username *</label>
              <input type="text" name="contactHandle" class="modern-search-input" required placeholder="+1 / @username" />
            </div>
          </div>
          <div>
            <label style="font-size:0.74rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:0.3rem;">Preferred Viewing Date &amp; Move-In</label>
            <input type="text" name="moveInDate" class="modern-search-input" value="This week • 6–12 months lease" />
          </div>
          <div>
            <label style="font-size:0.74rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:0.3rem;">Notes or Video Tour Request</label>
            <input type="text" name="notes" class="modern-search-input" placeholder="I'd like an in-person viewing or live video walk-through..." />
          </div>
          <button type="submit" class="btn-luxe btn-luxe--bronze" style="width:100%; padding:0.95rem; margin-top:0.25rem;">
            Schedule Private Viewing →
          </button>
          <div id="detail-booking-feedback" style="font-size:0.84rem; font-weight:700; color:var(--accent-emerald);"></div>
        </form>
      </div>
    </div>
  `;

  // Initialize embedded unit map
  setTimeout(() => {
    const mapBox = document.getElementById("detail-unit-map");
    if (!mapBox || typeof L === "undefined") return;
    if (state.detailMap) {
      state.detailMap.remove();
      state.detailMap = null;
    }
    const lat = Number(apt.coordinates?.lat) || 16.0583;
    const lng = Number(apt.coordinates?.lng) || 108.2385;
    state.detailMap = L.map("detail-unit-map").setView([lat, lng], 15);
    createTileLayer("streets").addTo(state.detailMap);
    const icon = L.divIcon({
      className: "luxe-pin-wrap",
      html: `<div class="luxe-price-pin active">${formatPrice(apt)}</div>`,
      iconSize: [90, 32],
      iconAnchor: [45, 16]
    });
    L.marker([lat, lng], { icon }).addTo(state.detailMap);
    setTimeout(() => state.detailMap && state.detailMap.invalidateSize(), 120);
  }, 80);
}

/* ============================================================================
   INTERACTIVE HANDLERS, HERO SEARCH & MOBILE TOGGLES
   ============================================================================ */
function submitHeroSearch(e) {
  e.preventDefault();
  state.filters.q = document.getElementById("hero-q")?.value || "";
  state.filters.area = document.getElementById("hero-area")?.value || "all";
  state.filters.bedrooms = document.getElementById("hero-bedrooms")?.value || "all";
  state.filters.maxPrice = document.getElementById("hero-budget")?.value || "0";

  syncCatalogueFilterInputs();
  applyFiltersAndSort();
  navigateRoute(null, "/apartments");
}

function quickHeroTag(tag) {
  state.filters.tag = tag;
  syncCatalogueFilterInputs();
  applyFiltersAndSort();
  navigateRoute(null, "/apartments");
}

function jumpToAreaInCatalogue(areaKey) {
  state.filters = { ...state.filters, area: areaKey, q: "", tag: "all" };
  syncCatalogueFilterInputs();
  applyFiltersAndSort();
  navigateRoute(null, "/apartments");
}

function jumpToBuildingInCatalogue(bldgKeyword) {
  state.filters = { ...state.filters, q: bldgKeyword, area: "all" };
  syncCatalogueFilterInputs();
  applyFiltersAndSort();
  navigateRoute(null, "/apartments");
}

function syncCatalogueFilterInputs() {
  const qEl = document.getElementById("cat-q");
  const areaEl = document.getElementById("cat-area");
  const brEl = document.getElementById("cat-bedrooms");
  const priceEl = document.getElementById("cat-max-price");
  const sortEl = document.getElementById("cat-sort");

  if (qEl) qEl.value = state.filters.q;
  if (areaEl) areaEl.value = state.filters.area;
  if (brEl) brEl.value = state.filters.bedrooms;
  if (priceEl) priceEl.value = state.filters.maxPrice;
  if (sortEl) sortEl.value = state.filters.sort;

  document.querySelectorAll("#cat-lifestyle-chips .filter-chip-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.tag === state.filters.tag);
  });
}

function resetAllFilters() {
  state.filters = {
    q: "",
    area: "all",
    bedrooms: "all",
    maxPrice: "0",
    tag: "all",
    sort: "featured"
  };
  syncCatalogueFilterInputs();
  applyFiltersAndSort();
}

function toggleMobileCatalogueMap() {
  const splitGrid = document.getElementById("catalogue-split-grid");
  const btn = document.getElementById("mobile-map-toggle-btn");
  if (!splitGrid) return;

  if (splitGrid.classList.contains("view-map-only")) {
    splitGrid.classList.remove("view-map-only");
    splitGrid.classList.add("view-grid-only");
    if (btn) btn.textContent = "🗺️ Switch to Map View";
  } else {
    splitGrid.classList.remove("view-grid-only");
    splitGrid.classList.add("view-map-only");
    if (btn) btn.textContent = "📋 Switch to List View";
    setTimeout(() => {
      ensureCatalogueMap();
      renderCatalogueMapMarkers();
    }, 100);
  }
}

async function submitUnitViewingForm(e, code, title) {
  e.preventDefault();
  const form = e.target;
  const payload = {
    type: "viewing",
    apartmentCode: code,
    apartmentTitle: title,
    clientName: form.clientName.value,
    messenger: form.messenger.value,
    contactHandle: form.contactHandle.value,
    moveInDate: form.moveInDate.value,
    notes: form.notes.value
  };
  const res = await fetch("/api/inquiries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.ok) {
    document.getElementById("detail-booking-feedback").textContent =
      "✓ Viewing request sent! Our Da Nang advisor will contact you on " + payload.messenger + " shortly.";
    form.reset();
  }
}

function bindFilterControls() {
  document.getElementById("cat-q")?.addEventListener("input", (e) => {
    state.filters.q = e.target.value;
    applyFiltersAndSort();
  });
  document.getElementById("cat-area")?.addEventListener("change", (e) => {
    state.filters.area = e.target.value;
    applyFiltersAndSort();
  });
  document.getElementById("cat-bedrooms")?.addEventListener("change", (e) => {
    state.filters.bedrooms = e.target.value;
    applyFiltersAndSort();
  });
  document.getElementById("cat-max-price")?.addEventListener("change", (e) => {
    state.filters.maxPrice = e.target.value;
    applyFiltersAndSort();
  });
  document.getElementById("cat-sort")?.addEventListener("change", (e) => {
    state.filters.sort = e.target.value;
    applyFiltersAndSort();
  });

  document.querySelectorAll("#cat-lifestyle-chips .filter-chip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cat-lifestyle-chips .filter-chip-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.filters.tag = btn.dataset.tag;
      applyFiltersAndSort();
    });
  });

  // Catalogue View Mode (Split / Grid / Map)
  document.querySelectorAll("#cat-view-mode button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cat-view-mode button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const v = btn.dataset.view;
      const grid = document.getElementById("catalogue-split-grid");
      grid.classList.remove("view-grid-only", "view-map-only");
      if (v === "grid") grid.classList.add("view-grid-only");
      if (v === "map") grid.classList.add("view-map-only");
      setTimeout(() => {
        ensureCatalogueMap();
        if (state.catMap) state.catMap.invalidateSize(true);
      }, 120);
    });
  });

  // Language Switcher
  document.querySelectorAll("#lang-switcher button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#lang-switcher button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.lang = btn.dataset.lang;
      const dict = i18n[state.lang] || i18n.en;
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const k = el.getAttribute("data-i18n");
        if (dict[k]) el.innerHTML = dict[k];
      });
      renderHomeSpotlight();
      renderCatalogueGrid();
      if (state.catMap) renderCatalogueMapMarkers();
      if (state.fullMap) renderFullMapMarkers();
    });
  });

  // Currency Switcher
  document.querySelectorAll("#currency-switcher button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#currency-switcher button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.currency = btn.dataset.currency;
      renderHomeSpotlight();
      renderCatalogueGrid();
      if (state.catMap) renderCatalogueMapMarkers();
      if (state.fullMap) renderFullMapMarkers();
    });
  });

  // Concierge Page Form
  document.getElementById("concierge-page-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      type: "shortlist",
      clientName: form.clientName.value,
      messenger: form.messenger.value,
      contactHandle: form.contactHandle.value,
      budgetUsd: form.budgetUsd.value,
      bedrooms: form.bedrooms.value,
      moveInDate: form.moveInDate.value,
      notes: form.notes.value
    };
    const res = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById("concierge-page-feedback").textContent =
        "✓ Request received! Our Da Nang advisor will message you on " + payload.messenger + " within 2 hours.";
      form.reset();
    }
  });
}

document.addEventListener("DOMContentLoaded", initApp);
