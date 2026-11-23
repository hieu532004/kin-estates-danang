const SUPPORTED_LANGS = ["vi", "en", "zh", "ru", "ko", "ja"];
const DEFAULT_SITE_URL = "https://www.kinestatesdanang.com";
const DEFAULT_OG_IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85";

// Canonical 19 Da Nang Neighborhood & District SEO Slugs
const DANANG_SEO_AREAS = [
  {
    slug: "an-thuong",
    value: "An Thượng",
    vi: "An Thượng",
    en: "An Thuong",
    zh: "安上街区 (An Thuong)",
    ru: "Ан Тхыонг (An Thuong)",
    ko: "안트엉 (An Thuong)",
    ja: "アントゥオン (An Thuong)",
    keywordsVi: "thuê căn hộ An Thượng Đà Nẵng, cho thuê căn hộ phố Tây An Thượng, thuê studio An Thượng gần biển Mỹ Khê, căn hộ dịch vụ An Thượng Ngũ Hành Sơn"
  },
  {
    slug: "bien-my-khe",
    value: "My Khe Beachfront",
    vi: "Biển Mỹ Khê",
    en: "My Khe Beach",
    zh: "美溪海滩 (My Khe Beach)",
    ru: "Пляж Ми Кхе (My Khe)",
    ko: "미케비치 (My Khe Beach)",
    ja: "ミーケービーチ (My Khe)",
    keywordsVi: "thuê căn hộ biển Mỹ Khê Đà Nẵng, căn hộ view biển Mỹ Khê, cho thuê chung cư gần biển Mỹ Khê, thuê căn hộ Võ Nguyên Giáp Đà Nẵng"
  },
  {
    slug: "ven-song-han",
    value: "Han Riverfront",
    vi: "Ven sông Hàn",
    en: "Han Riverfront",
    zh: "韩江滨江区 (Han River)",
    ru: "Набережная реки Хан",
    ko: "한강변 (Han Riverfront)",
    ja: "ハン川沿い (Han River)",
    keywordsVi: "thuê căn hộ ven sông Hàn Đà Nẵng, căn hộ view sông Hàn cầu Rồng, thuê căn hộ The Filmore, The Panoma Sun Cosmo, Hiyori, Monarchy, Azura"
  },
  {
    slug: "son-tra",
    value: "Sơn Trà",
    vi: "Sơn Trà",
    en: "Son Tra",
    zh: "山茶郡 (Son Tra)",
    ru: "Шонча (Son Tra)",
    ko: "선짜 (Son Tra)",
    ja: "ソンチャ (Son Tra)",
    keywordsVi: "thuê căn hộ Sơn Trà Đà Nẵng, cho thuê chung cư quận Sơn Trà, thuê căn hộ Hiyori, The Monarchy, Azura, Mường Thanh Sơn Trà"
  },
  {
    slug: "hai-chau",
    value: "Hải Châu",
    vi: "Hải Châu",
    en: "Hai Chau",
    zh: "海洲郡 (Hai Chau)",
    ru: "Хайтяу (Hai Chau)",
    ko: "하이쩌우 (Hai Chau)",
    ja: "ハイチャウ (Hai Chau)",
    keywordsVi: "thuê căn hộ Hải Châu Đà Nẵng, cho thuê chung cư quận Hải Châu trung tâm, thuê căn hộ The Filmore, Indochina, Blooming Tower, F.Home Đà Nẵng"
  },
  {
    slug: "ngu-hanh-son",
    value: "Ngũ Hành Sơn",
    vi: "Ngũ Hành Sơn",
    en: "Ngu Hanh Son",
    zh: "五行山郡 (Ngu Hanh Son)",
    ru: "Нгуханьшон (Ngu Hanh Son)",
    ko: "응우한선 (Ngu Hanh Son)",
    ja: "グーハインソン (Ngu Hanh Son)",
    keywordsVi: "thuê căn hộ Ngũ Hành Sơn Đà Nẵng, cho thuê căn hộ biệt thự Ngũ Hành Sơn, The Panoma Sun Cosmo Residence, căn hộ gần biển Đà Nẵng"
  },
  {
    slug: "hoa-xuan",
    value: "Hòa Xuân",
    vi: "Hòa Xuân",
    en: "Hoa Xuan",
    zh: "和春生态区 (Hoa Xuan)",
    ru: "Хоа Суан (Hoa Xuan)",
    ko: "호아쑤언 (Hoa Xuan)",
    ja: "ホアスアン (Hoa Xuan)",
    keywordsVi: "thuê căn hộ Hòa Xuân Đà Nẵng, cho thuê căn hộ đảo VIP Hòa Xuân, Nam Hòa Xuân, Euro Village 2, thuê nhà nguyên căn Hòa Xuân Cẩm Lệ"
  },
  {
    slug: "cam-le",
    value: "Cẩm Lệ",
    vi: "Cẩm Lệ",
    en: "Cam Le",
    zh: "锦荔郡 (Cam Le)",
    ru: "Камле (Cam Le)",
    ko: "껌레 (Cam Le)",
    ja: "カムレ (Cam Le)",
    keywordsVi: "thuê căn hộ Cẩm Lệ Đà Nẵng, cho thuê căn hộ chung cư quận Cẩm Lệ, thuê nhà Cẩm Lệ Hòa Xuân giá tốt"
  },
  {
    slug: "nam-viet-a",
    value: "Nam Việt Á",
    vi: "Nam Việt Á",
    en: "Nam Viet A",
    zh: "南越亚别墅区 (Nam Viet A)",
    ru: "Нам Вьет А (Nam Viet A)",
    ko: "남비엣아 (Nam Viet A)",
    ja: "ナムベトア (Nam Viet A)",
    keywordsVi: "thuê căn hộ Nam Việt Á Đà Nẵng, thuê biệt thự hồ bơi Nam Việt Á, căn hộ Khuê Mỹ Ngũ Hành Sơn yên tĩnh"
  },
  {
    slug: "my-an",
    value: "Mỹ An",
    vi: "Mỹ An",
    en: "My An",
    zh: "美安坊 (My An)",
    ru: "Ми Ан (My An)",
    ko: "미안 (My An)",
    ja: "ミーアン (My An)",
    keywordsVi: "thuê căn hộ Mỹ An Đà Nẵng, cho thuê căn hộ phường Mỹ An Ngũ Hành Sơn, căn hộ Bắc Mỹ An gần biển"
  },
  {
    slug: "phuoc-my",
    value: "Phước Mỹ",
    vi: "Phước Mỹ",
    en: "Phuoc My",
    zh: "福美坊 (Phuoc My)",
    ru: "Фыок Ми (Phuoc My)",
    ko: "프억미 (Phuoc My)",
    ja: "フックミー (Phuoc My)",
    keywordsVi: "thuê căn hộ Phước Mỹ Sơn Trà Đà Nẵng, căn hộ gần công viên Biển Đông, cho thuê studio Phước Mỹ Mỹ Khê"
  },
  {
    slug: "khue-my",
    value: "Khuê Mỹ",
    vi: "Khuê Mỹ",
    en: "Khue My",
    zh: "闺美坊 (Khue My)",
    ru: "Кхуэ Ми (Khue My)",
    ko: "쿠에미 (Khue My)",
    ja: "クエミー (Khue My)",
    keywordsVi: "thuê căn hộ Khuê Mỹ Ngũ Hành Sơn Đà Nẵng, cho thuê căn hộ đường Hồ Xuân Hương, Lê Văn Hiến Đà Nẵng"
  },
  {
    slug: "thanh-khe",
    value: "Thanh Khê",
    vi: "Thanh Khê",
    en: "Thanh Khe",
    zh: "清溪郡 (Thanh Khe)",
    ru: "Тханькхе (Thanh Khe)",
    ko: "탄케 (Thanh Khe)",
    ja: "タインケー (Thanh Khe)",
    keywordsVi: "thuê căn hộ Thanh Khê Đà Nẵng, cho thuê căn hộ Nguyễn Tất Thành vịnh Đà Nẵng, thuê chung cư quận Thanh Khê"
  },
  {
    slug: "lien-chieu",
    value: "Liên Chiểu",
    vi: "Liên Chiểu",
    en: "Lien Chieu",
    zh: "莲沼郡 (Lien Chieu)",
    ru: "Льентьеу (Lien Chieu)",
    ko: "리엔찌에우 (Lien Chieu)",
    ja: "リエンチウ (Lien Chieu)",
    keywordsVi: "thuê căn hộ Liên Chiểu Đà Nẵng, cho thuê chung cư Ori Garden, căn hộ gần biển Nguyễn Tất Thành Liên Chiểu"
  },
  {
    slug: "hoa-khanh",
    value: "Hòa Khánh",
    vi: "Hòa Khánh",
    en: "Hoa Khanh",
    zh: "和庆区 (Hoa Khanh)",
    ru: "Хоа Кхань (Hoa Khanh)",
    ko: "호아칸 (Hoa Khanh)",
    ja: "ホアカイン (Hoa Khanh)",
    keywordsVi: "thuê căn hộ Hòa Khánh Đà Nẵng, cho thuê căn hộ dịch vụ Hòa Khánh Liên Chiểu cho chuyên gia"
  },
  {
    slug: "fpt-city-hoa-hai",
    value: "FPT City / Hòa Hải",
    vi: "FPT City / Hòa Hải",
    en: "FPT City Hoa Hai",
    zh: "FPT科技城・和海 (FPT City)",
    ru: "FPT City / Хоа Хай",
    ko: "FPT 시티 · 호아하이 (FPT City)",
    ja: "FPTシティ・ホアハイ",
    keywordsVi: "thuê căn hộ FPT City Đà Nẵng, cho thuê chung cư FPT Plaza 1 2 3 Hòa Hải, thuê biệt thự Hòa Hải Ngũ Hành Sơn"
  },
  {
    slug: "tho-quang",
    value: "Thọ Quang",
    vi: "Thọ Quang",
    en: "Tho Quang",
    zh: "寿光坊・山茶半岛 (Tho Quang)",
    ru: "Тхо Куанг (Tho Quang)",
    ko: "토꽝 · 선짜 반도 (Tho Quang)",
    ja: "トークアン (Tho Quang)",
    keywordsVi: "thuê căn hộ Thọ Quang Sơn Trà Đà Nẵng, căn hộ view biển Mân Thái Thọ Quang yên tĩnh"
  },
  {
    slug: "thuan-phuoc",
    value: "Thuận Phước",
    vi: "Thuận Phước",
    en: "Thuan Phuoc",
    zh: "顺福区 (Thuan Phuoc)",
    ru: "Тхуан Фыок (Thuan Phuoc)",
    ko: "투안프억 (Thuan Phuoc)",
    ja: "トゥアンフック (Thuan Phuoc)",
    keywordsVi: "thuê căn hộ Thuận Phước Hải Châu Đà Nẵng, thuê chung cư Blooming Tower Đà Nẵng, căn hộ cửa sông Hàn"
  },
  {
    slug: "hoa-vang",
    value: "Hòa Vang",
    vi: "Hòa Vang",
    en: "Hoa Vang",
    zh: "和荣县 (Hoa Vang)",
    ru: "Хоа Ванг (Hoa Vang)",
    ko: "호아방 (Hoa Vang)",
    ja: "ホアヴァン (Hoa Vang)",
    keywordsVi: "thuê nhà nguyên căn Hòa Vang Đà Nẵng, thuê biệt thự nhà vườn sinh thái Hòa Vang"
  }
];

function findAreaBySlug(slug) {
  const clean = String(slug || "").trim().toLowerCase();
  return DANANG_SEO_AREAS.find((a) => a.slug === clean) || null;
}

function findAreaByName(rawName) {
  if (!rawName) return null;
  const fold = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase();
  const f = fold(rawName);
  return (
    DANANG_SEO_AREAS.find(
      (a) =>
        fold(a.value) === f ||
        fold(a.vi) === f ||
        fold(a.en) === f ||
        f.includes(fold(a.vi)) ||
        f.includes(fold(a.en))
    ) || null
  );
}

function getSiteOrigin(req) {
  const envUrl = String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (envUrl && /^https?:\/\//i.test(envUrl) && !envUrl.includes(".invalid")) return envUrl;
  const host = String(req?.get?.("x-forwarded-host") || req?.get?.("host") || "").trim();
  if (host && !/localhost|127\.0\.0\.1|\.vercel\.app$/i.test(host)) {
    const proto = req?.get?.("x-forwarded-proto") || "https";
    return `${proto}://${host}`.replace(/\/+$/, "");
  }
  return DEFAULT_SITE_URL;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeXml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveLang(raw) {
  const s = String(raw || "").trim().toLowerCase().slice(0, 2);
  return SUPPORTED_LANGS.includes(s) ? s : "vi";
}

function locVal(obj, lang = "vi") {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.vi || obj.en || "";
}

function toAbsoluteUrl(origin, maybeRelative) {
  const s = String(maybeRelative || "").trim();
  if (!s) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("/")) return `${origin}${s}`;
  return DEFAULT_OG_IMAGE;
}

// Primary-Keyword-First Titles (50–60 chars) & High-CTR Descriptions (150–160 chars)
const ROUTE_META = {
  "/": {
    vi: {
      title: "Cho Thuê Căn Hộ Đà Nẵng Dài Hạn Giá Tốt | KIN Estates 2026",
      description: "Thuê căn hộ chung cư, studio, 1–3PN, penthouse & biệt thự Đà Nẵng dài hạn (3–12+ tháng) ✓ Giá trực tiếp chủ nhà ✓ Điện EVN ✓ Mỹ Khê, An Thượng, Hòa Xuân →",
      keywords: "thuê căn hộ Đà Nẵng, cho thuê căn hộ Đà Nẵng, thuê căn hộ Đà Nẵng dài hạn, thuê chung cư Đà Nẵng, căn hộ dịch vụ Đà Nẵng, thuê căn hộ Mỹ Khê, thuê căn hộ An Thượng, thuê căn hộ Sơn Trà, thuê căn hộ Hải Châu, thuê căn hộ Ngũ Hành Sơn, thuê căn hộ Hòa Xuân, thuê căn hộ Cẩm Lệ, The Filmore, The Panoma, Hiyori, Monarchy, KIN Estates, kinestatesdanang"
    },
    en: {
      title: "Da Nang Apartments for Rent — Long-Term | KIN Estates 2026",
      description: "Verified long-term apartments, studios, condos & pool villas in Da Nang (3–12+ months) ✓ Direct owner rent ✓ State EVN rates ✓ My Khe, An Thuong, Han River →",
      keywords: "Da Nang apartments for rent, long-term rental Da Nang, expat apartments Da Nang, My Khe Beach apartment, An Thuong apartment rental, Han Riverfront condo, Son Tra Hai Chau Hoa Xuan apartments, KIN Estates Da Nang, kinestatesdanang"
    },
    zh: {
      title: "岘港长租公寓与海景别墅出租 — 房东直租 | KIN Estates 2026",
      description: "精选越南岘港 3–12个月以上长期公寓、单间、顶层公寓与独栋泳池别墅 ✓ 实地核验采光隔音 ✓ 国家EVN标准电价 ✓ 美溪海滩・安上区・韩江景双语签约 →",
      keywords: "岘港租房, 岘港长租公寓, 越南岘港公寓出租, 美溪海滩海景公寓, 岘港安上区租房, 岘港汉江景公寓, KIN Estates, kinestatesdanang"
    },
    ru: {
      title: "Аренда Квартир в Дананге на Долгий Срок | KIN Estates 2026",
      description: "Проверенные квартиры, студии, апартаменты и виллы в Дананге от 3–12+ месяцев ✓ Цены от собственников ✓ Гостариф EVN ✓ Ми Кхе, Ан Тхыонг, река Хан, Сон Тра →",
      keywords: "аренда квартир в Дананге, снять квартиру в Дананге долгосрочно, жилье в Дананге Ми Кхе Ан Тхыонг, аренда апартаментов и вилл Дананг, KIN Estates, kinestatesdanang"
    },
    ko: {
      title: "다낭 장기 임대 아파트 & 풀빌라 월세 전문 | KIN Estates 2026",
      description: "베트남 다낭 3~12개월+ 장기 임대 아파트·스튜디오·풀빌라 ✓ 집주인 직거래 정찰가 ✓ 국가 EVN 전기세 ✓ 미케비치·안트엉·한강뷰·선짜 현지 실사 매물 →",
      keywords: "다낭 아파트 임대, 다낭 한달살기 장기 숙소, 다낭 월세, 다낭 미케비치 아파트, 다낭 안트엉 레지던스, 다낭 한강뷰 아파트, 다낭 풀빌라 임대, KIN Estates, kinestatesdanang"
    },
    ja: {
      title: "ダナン長期賃貸アパート・高級マンション＆ヴィラ | KIN Estates",
      description: "ベトナム・ダナンの長期賃貸アパート・マンション・ヴィラ（3〜12ヶ月以上）✓ オーナー直接価格 ✓ 国営EVN電気料金 ✓ ミーケー・アントゥオン・ハン川現地確認済 →",
      keywords: "ダナン 賃貸 アパート, ダナン 長期滞在 マンション, ダナン サービスアパートメント, ミーケービーチ 賃貸, KIN Estates, kinestatesdanang"
    }
  },
  "/apartments": {
    vi: {
      title: "Thuê Chung Cư & Căn Hộ Đà Nẵng Đang Trống | KIN Estates",
      description: "Danh sách căn hộ cho thuê Đà Nẵng cập nhật thực tế ✓ Lọc nhanh 19 khu vực (An Thượng, Mỹ Khê, Sơn Trà, Hải Châu, Hòa Xuân, Cẩm Lệ), bản đồ giá & ảnh thật →",
      keywords: "danh sách căn hộ cho thuê Đà Nẵng, thuê căn hộ 1 phòng ngủ Đà Nẵng, thuê căn hộ 2 phòng ngủ Đà Nẵng, thuê studio Đà Nẵng, chung cư cao cấp Đà Nẵng cho thuê, bản đồ thuê nhà Đà Nẵng"
    },
    en: {
      title: "Available Apartments for Rent in Da Nang + Map | KIN Estates",
      description: "Browse verified available Da Nang apartments & villas with live map pricing ✓ Filter across 19 districts (An Thuong, My Khe, Son Tra, Hai Chau, Hoa Xuan) →",
      keywords: "available apartments Da Nang, 1 bedroom 2 bedroom condo Da Nang, studio for rent Da Nang, Da Nang rental map, monthly apartment Da Nang"
    },
    zh: {
      title: "岘港在租公寓房源列表与实时价格地图 | KIN Estates",
      description: "实时更新岘港在租长租公寓与别墅 ✓ 支持按19个区域（安上区、美溪海滩、山茶、海洲、和春）、居室与预算精准筛选及地图找房 →",
      keywords: "岘港在租公寓, 岘港一居室两居室三居室出租, 岘港租房地图"
    },
    ru: {
      title: "Свободные Квартиры в Дананге — Цены на Карте | KIN Estates",
      description: "Актуальный каталог свободных квартир и вилл в Дананге ✓ Удобный фильтр по 19 районам (Ан Тхыонг, Ми Кхе, Сон Тра, Хай Чау, Хоа Суан), спальням и бюджету →",
      keywords: "каталог квартир Дананг, снять 1 2 комнатную квартиру Дананг, карта аренды Дананг"
    },
    ko: {
      title: "다낭 실시간 공실 아파트 매물 리스트 & 가격 지도 | KIN Estates",
      description: "다낭 전 지역 19개 구역(안트엉, 미케비치, 선짜, 하이쩌우, 호아쑤언 등) 실시간 입주 가능 아파트·빌라 매물과 인터랙티브 가격 지도를 확인하세요 →",
      keywords: "다낭 공실 아파트, 다낭 1룸 2룸 3룸 월세, 다낭 임대 아파트 지도"
    },
    ja: {
      title: "ダナン空室賃貸物件一覧＆インタラクティブ地図 | KIN Estates",
      description: "ダナン全19エリア（アントゥオン・ミーケー・ソンチャ・ハイチャウ等）の入居可能な長期賃貸マンション・ヴィラを地図と条件で簡単検索 →",
      keywords: "ダナン 空室 賃貸, ダナン 1LDK 2LDK 3LDK, ダナン 物件マップ"
    }
  },
  "/areas": {
    vi: {
      title: "19 Khu Vực Thuê Căn Hộ Đà Nẵng Đáng Sống Nhất | KIN Estates",
      description: "So sánh giá thuê & nhịp sống 19 khu vực Đà Nẵng: An Thượng, Biển Mỹ Khê, Ven sông Hàn, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ, Thanh Khê, FPT City.",
      keywords: "nên thuê căn hộ khu vực nào Đà Nẵng, khu vực đáng sống Đà Nẵng, so sánh An Thượng Sơn Trà Hải Châu Hòa Xuân Cẩm Lệ"
    },
    en: {
      title: "Best Neighborhoods to Rent in Da Nang (19 Areas) | KIN Estates",
      description: "Compare Da Nang's top residential districts side by side: An Thuong, My Khe Beach, Han Riverfront, Son Tra, Hai Chau, Ngu Hanh Son, Hoa Xuan & FPT City →",
      keywords: "best neighborhoods in Da Nang, where to live in Da Nang expat, An Thuong vs Son Tra vs Hai Chau, Hoa Xuan Da Nang"
    },
    zh: {
      title: "岘港租房19大核心区域对比指南（美溪・安上・韩江）| KIN Estates",
      description: "全方位对比岘港宜居街区：安上区、美溪海滩、韩江岸、山茶郡、海洲郡、五行山与和春区的租金区间与生活氛围 →",
      keywords: "岘港住哪个区好, 岘港租房区域对比, 安上区 美溪海滩 山茶郡 海洲郡"
    },
    ru: {
      title: "Лучшие Районы Дананга для Жизни и Аренды Жилья | KIN Estates",
      description: "Сравнение районов Дананга по ценам, тишине и близости к пляжу: Ан Тхыонг, Ми Кхе, река Хан, Шонча, Хайтяу, Нгуханьшон и Хоа Суан →",
      keywords: "лучшие районы Дананга, где жить в Дананге, Ан Тхыонг или Хай Чау или Сон Тра"
    },
    ko: {
      title: "다낭 거주 추천 지역 완벽 비교 (안트엉·미케·선짜·호아쑤언) | KIN",
      description: "다낭 주요 주거 지역의 월세 시세, 해변 거리, 정숙도, 원격근무 인프라를 1:1로 비교하고 나에게 맞는 동네를 찾아보세요 →",
      keywords: "다낭 살기 좋은 동네, 다낭 지역 비교, 안트엉 미케비치 한강 선짜 하이쩌우 호아쑤언"
    },
    ja: {
      title: "ダナン居住エリア徹底比較（ミーケー・ハン川・ソンチャ）| KIN",
      description: "ダナン長期滞在に人気のエリアを家賃相場・ビーチ距離・静かさ・利便性で詳しく比較ガイド →",
      keywords: "ダナン 住みやすいエリア, アントゥオン ミーケー ソンチャ ハイチャウ 比較"
    }
  },
  "/how-to-rent": {
    vi: {
      title: "Quy Trình Thuê Căn Hộ Đà Nẵng & Tạm Trú NA17 | KIN Estates",
      description: "Hướng dẫn 5 bước thuê căn hộ Đà Nẵng an toàn: xem nhà trực tiếp/video 4K, hợp đồng song ngữ, cọc trực tiếp chủ nhà, biên bản bàn giao & khai báo tạm trú NA17.",
      keywords: "quy trình thuê căn hộ Đà Nẵng, kinh nghiệm thuê chung cư Đà Nẵng, hợp đồng thuê nhà song ngữ, đăng ký tạm trú NA17 Đà Nẵng"
    },
    en: {
      title: "How to Rent an Apartment in Da Nang Safely | KIN Estates",
      description: "5 transparent steps to rent long-term in Da Nang: curated tour, bilingual lease, direct landlord deposit, photo handover & Form NA17 police registration →",
      keywords: "how to rent apartment in Da Nang, Vietnam rental contract guide, Form NA17 temporary residence Da Nang"
    },
    zh: {
      title: "岘港长租签约流程与外国人暂住登记 NA17 指南 | KIN Estates",
      description: "5步安心在岘港租房：实地或4K视频看房、越英双语合同、房东直付押金、拍照交房清单及24小时内派出所NA17暂住申报 →",
      keywords: "岘港租房流程, 越南租房合同注意事项, 岘港NA17暂住证办理"
    },
    ru: {
      title: "Как Снять Квартиру в Дананге — Договор и NA17 | KIN Estates",
      description: "Прозрачный процесс аренды в Дананге за 5 шагов: видео-тур 4K, двуязычный договор, депозит владельцу, фото-опись и регистрация в полиции (форма NA17) →",
      keywords: "как снять квартиру в Дананге, договор аренды во Вьетнаме, регистрация NA17 Дананг"
    },
    ko: {
      title: "다낭 아파트 안전 계약 절차 & 공안 거주등록(NA17) | KIN Estates",
      description: "다낭 장기 임대 5단계 안전 가이드: 현장/4K 영상 투어, 이중언어 계약서, 집주인 직접 보증금, 입주 사진 점검 및 NA17 거주 등록 지원 →",
      keywords: "다낭 아파트 계약 방법, 베트남 임대차 계약 주의사항, 다낭 공안 거주등록 NA17"
    },
    ja: {
      title: "ダナン賃貸契約の5ステップ＆警察滞在登録（NA17）| KIN Estates",
      description: "ダナンで安心してお部屋を借りる手順：現地・4Kオンライン内覧、バイリンガル契約、オーナー直接保証金、入居時写真確認、NA17滞在登録 →",
      keywords: "ダナン 賃貸 契約の流れ, ベトナム 一時滞在登録 NA17"
    }
  },
  "/guides": {
    vi: {
      title: "Bảng Giá Thuê Chung Cư Đà Nẵng 2026 & Cẩm Nang | KIN Estates",
      description: "Cập nhật giá thuê thực tế 2026 tại The Filmore, The Panoma Sun Cosmo, Hiyori, Monarchy, Azura ✓ Kinh nghiệm chọn hướng nắng, chống ẩm mùa mưa & giá điện EVN →",
      keywords: "giá thuê chung cư Đà Nẵng 2026, bảng giá thuê căn hộ Đà Nẵng, thuê căn hộ The Filmore, The Panoma, Hiyori Garden Tower, The Monarchy, Azura Đà Nẵng"
    },
    en: {
      title: "Da Nang Condo Rent Price Index & Living Guide 2026 | KIN",
      description: "2026 monthly rent benchmarks for The Filmore, The Panoma, Hiyori, Monarchy & Azura ✓ EVN electricity costs, monsoon tips & remote work internet guide →",
      keywords: "Da Nang cost of living rent 2026, Filmore Da Nang rent, The Panoma Sun Cosmo rent, Hiyori Garden Tower price, Monarchy Da Nang"
    },
    zh: {
      title: "2026 岘港热门公寓租金价格指数与生活全攻略 | KIN Estates",
      description: "2026最新盘点 The Filmore、The Panoma、Hiyori、Monarchy 真实月租行情，详解越南电费水费、雨季防潮与光纤网络攻略 →",
      keywords: "2026岘港房租多少钱, The Filmore 岘港租金, Hiyori 岘港租房"
    },
    ru: {
      title: "Цены на Аренду ЖК в Дананге 2026 и Гид Жизни | KIN Estates",
      description: "Актуальные цены аренды 2026 в топ-ЖК Дананга (The Filmore, The Panoma, Hiyori, Monarchy, Azura), тарифы ЖКХ EVN и советы по сезону дождей →",
      keywords: "стоимость аренды в Дананге 2026, ЖК Filmore Panoma Hiyori Monarchy цены"
    },
    ko: {
      title: "2026 다낭 주요 아파트 월세 시세표 & 생활 가이드 | KIN Estates",
      description: "더 필모어, 더 파노마, 히요리, 모나키, 아주라 등 2026년 다낭 인기 아파트 실제 월세 시세와 전기·관리비, 우기 체크포인트를 총정리했습니다 →",
      keywords: "2026 다낭 아파트 월세 시세, 다낭 필모어 월세, 다낭 히요리 월세, 다낭 모나키 시세"
    },
    ja: {
      title: "2026年版ダナン人気マンション家賃相場＆生活ガイド | KIN",
      description: "The Filmore、The Panoma、Hiyori、Monarchy等の2026年最新家賃相場と、電気水道代・雨季対策・ネット環境ガイド →",
      keywords: "ダナン 家賃相場 2026, Hiyori ダナン 家賃, Filmore ダナン 賃貸"
    }
  },
  "/about": {
    vi: {
      title: "Về KIN Estates Đà Nẵng — Dẫn Xem Thực Tế & Đánh Giá 5 Sao",
      description: "Đội ngũ chuyên tư vấn cho thuê căn hộ & biệt thự dài hạn tại Đà Nẵng (kinestatesdanang.com) ✓ Xem hình ảnh dẫn khách thực tế, đánh giá 5★ & ký gửi căn hộ →",
      keywords: "KIN Estates Đà Nẵng, kinestatesdanang, kinestatesdanang.com, công ty môi giới căn hộ uy tín Đà Nẵng, ký gửi cho thuê căn hộ Đà Nẵng"
    },
    en: {
      title: "About KIN Estates Da Nang — Real Tours & 5★ Client Reviews",
      description: "Meet KIN Estates Da Nang (kinestatesdanang.com): local long-term residence specialists ✓ Browse real client tour moments, verified 5★ reviews & owner services →",
      keywords: "KIN Estates Da Nang, kinestatesdanang, trusted real estate agent Da Nang, Da Nang landlord property management"
    },
    zh: {
      title: "关于 KIN Estates 岘港 — 真实带看记录与5星客户口碑",
      description: "认识 KIN Estates 岘港本地长租顾问团队（kinestatesdanang.com）：查看真实客户带看瞬间、住户5星好评与房东委托管理服务 →",
      keywords: "KIN Estates 岘港, kinestatesdanang, 岘港靠谱租房中介"
    },
    ru: {
      title: "О Компании KIN Estates Дананг — Отзывы 5★ и Фото Просмотров",
      description: "Команда экспертов долгосрочной аренды в Дананге (kinestatesdanang.com) ✓ Реальные фото туров с клиентами, отзывы 5★ и услуги для собственников →",
      keywords: "KIN Estates Дананг отзывы, kinestatesdanang, надежное агентство недвижимости Дананг"
    },
    ko: {
      title: "KIN Estates 다낭 소개 — 실제 투어 현장 & 5점 만점 입주 후기",
      description: "다낭 장기 임대 전문 파트너 KIN Estates(kinestatesdanang.com)의 실제 고객 투어 사진과 생생한 5성급 입주자 후기를 확인하세요 →",
      keywords: "KIN Estates 다낭 후기, kinestatesdanang, 다낭 믿을수있는 부동산"
    },
    ja: {
      title: "KIN Estatesダナンについて — 内覧実績＆5つ星レビュー",
      description: "ダナン長期賃貸専門チームKIN Estates（kinestatesdanang.com）の実際の内覧風景とご入居者様の高評価レビューをご紹介 →",
      keywords: "KIN Estates ダナン 評判, kinestatesdanang, ダナン 不動産仲介"
    }
  },
  "/privacy-policy": {
    vi: {
      title: "Chính Sách Bảo Mật & Xử Lý Dữ Liệu | KIN Estates Đà Nẵng",
      description: "Chính sách bảo mật minh bạch của KIN Estates Đà Nẵng: phạm vi thu thập thông tin đặt lịch xem nhà, thời gian lưu trữ và quyền yêu cầu xóa dữ liệu cá nhân.",
      keywords: "chính sách bảo mật KIN Estates Đà Nẵng, bảo vệ dữ liệu khách hàng kinestatesdanang"
    },
    en: {
      title: "Privacy & Data Protection Policy | KIN Estates Da Nang",
      description: "Plain-language privacy policy detailing how KIN Estates Da Nang protects inquiry details, retention periods, and one-step data deletion requests.",
      keywords: "KIN Estates Da Nang privacy policy, data protection"
    },
    zh: {
      title: "隐私与数据保护政策 | KIN Estates 岘港",
      description: "透明说明 KIN Estates 岘港预约表单的信息收集范围、用途、保留期限及随时申请删除个人数据的方式。",
      keywords: "KIN Estates 隐私政策"
    },
    ru: {
      title: "Политика Конфиденциальности Данных | KIN Estates Дананг",
      description: "Прозрачные правила обработки и защиты персональных данных клиентов KIN Estates в Дананге.",
      keywords: "политика конфиденциальности KIN Estates"
    },
    ko: {
      title: "개인정보 처리 및 데이터 보호 방침 | KIN Estates 다낭",
      description: "KIN Estates 다낭 투어 예약 및 문의 시 수집하는 정보 항목, 보관 기간 및 즉시 파기 요청 절차를 안내합니다.",
      keywords: "KIN Estates 개인정보 처리방침"
    },
    ja: {
      title: "プライバシーおよびデータ保護ポリシー | KIN Estates ダナン",
      description: "KIN Estatesダナンにおける個人情報の取り扱い・利用目的・保管期間・削除申請方法について。",
      keywords: "KIN Estates プライバシーポリシー"
    }
  }
};

function buildAreaSeoMeta(areaObj, lang = "vi") {
  const map = {
    vi: {
      title: `Thuê Căn Hộ ${areaObj.vi} Đà Nẵng Dài Hạn Giá Tốt | KIN Estates`,
      description: `Cho thuê căn hộ, studio, chung cư & biệt thự ${areaObj.vi} Đà Nẵng dài hạn (3–12+ tháng) ✓ Giá trực tiếp chủ nhà ✓ Điện EVN ✓ Đặt lịch xem nhà thực tế ngay →`,
      keywords: `${areaObj.keywordsVi}, thuê nhà ${areaObj.vi} Đà Nẵng, KIN Estates Đà Nẵng, kinestatesdanang`
    },
    en: {
      title: `Apartments for Rent in ${areaObj.en}, Da Nang | KIN Estates`,
      description: `Verified long-term apartments, studios & villas for rent in ${areaObj.en}, Da Nang (3–12+ months) ✓ Direct owner pricing ✓ State EVN utility rates ✓ Book a tour →`,
      keywords: `apartments for rent ${areaObj.en} Da Nang, ${areaObj.en} monthly rental, condo ${areaObj.en} Da Nang, KIN Estates`
    },
    zh: {
      title: `岘港${areaObj.zh}长租公寓与别墅出租 | KIN Estates`,
      description: `精选越南岘港${areaObj.zh} 3–12个月以上长期在租公寓与别墅 ✓ 房东直租透明价 ✓ 实地核验采光与隔音 ✓ 支持中越英服务 →`,
      keywords: `岘港${areaObj.zh}租房, 岘港长租公寓, KIN Estates`
    },
    ru: {
      title: `Аренда Квартир — ${areaObj.ru}, Дананг | KIN Estates`,
      description: `Долгосрочная аренда проверенных квартир, студий и вилл в районе ${areaObj.ru} (Дананг) от 3–12+ месяцев ✓ Без скрытых комиссий ✓ Гостариф EVN →`,
      keywords: `аренда квартир ${areaObj.ru} Дананг, снять жилье Дананг, KIN Estates`
    },
    ko: {
      title: `다낭 ${areaObj.ko} 장기 임대 아파트 & 월세 매물 | KIN Estates`,
      description: `다낭 ${areaObj.ko} 지역 검증된 장기 임대 아파트·스튜디오·풀빌라 매물 ✓ 집주인 직거래 월세 ✓ 국가 EVN 전기요금 및 거주 등록 지원 →`,
      keywords: `다낭 ${areaObj.ko} 아파트 임대, 다낭 월세, KIN Estates`
    },
    ja: {
      title: `ダナン・${areaObj.ja}の長期賃貸アパート＆物件一覧 | KIN Estates`,
      description: `ダナン${areaObj.ja}エリアの長期賃貸マンション・サービスアパート・ヴィラ（3〜12ヶ月以上）✓ オーナー直接価格 ✓ 現地確認済み →`,
      keywords: `ダナン ${areaObj.ja} 賃貸, ダナン アパート, KIN Estates`
    }
  };
  return map[lang] || map.en;
}

function buildHreflangLinks(origin, pathname) {
  const cleanPath = pathname === "/" ? "" : pathname.replace(/\/+$/, "");
  const links = [
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${origin}${cleanPath || "/"}`)}" />`,
    `<link rel="alternate" hreflang="vi" href="${escapeHtml(`${origin}${cleanPath || "/"}`)}" />`
  ];
  for (const lang of SUPPORTED_LANGS) {
    if (lang === "vi") continue;
    links.push(
      `<link rel="alternate" hreflang="${lang}" href="${escapeHtml(`${origin}${cleanPath || "/"}?lang=${lang}`)}" />`
    );
  }
  return links.join("\n  ");
}

function buildLocalBusinessSchema(origin, testimonials = []) {
  const reviews = testimonials.slice(0, 6).map((t) => ({
    "@type": "Review",
    author: { "@type": "Person", name: t.clientName || "Resident" },
    reviewRating: {
      "@type": "Rating",
      ratingValue: Number(t.rating) || 5,
      bestRating: 5,
      worstRating: 1
    },
    reviewBody: locVal(t.quote, "vi") || locVal(t.quote, "en")
  }));

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${origin}/#organization`,
    name: "KIN Estates Đà Nẵng — Cho Thuê Căn Hộ & Biệt Thự Dài Hạn",
    alternateName: [
      "KIN Estates",
      "KIN Estates Da Nang",
      "KIN Estates Đà Nẵng",
      "kinestatesdanang",
      "kinestatesdanang.com",
      "KIN Estates — Da Nang Private Residences"
    ],
    url: origin,
    logo: {
      "@type": "ImageObject",
      url: `${origin}/img/kin-estates-logo.svg`
    },
    image: DEFAULT_OG_IMAGE,
    telephone: "+84-389-711-601",
    priceRange: "$300 - $3,500 / month",
    currenciesAccepted: "VND, USD",
    paymentAccepted: "Cash, Bank Transfer",
    slogan: "Căn hộ & biệt thự dài hạn tuyển chọn tại Đà Nẵng — Kiểm định thực tế, giá trực tiếp chủ nhà",
    description:
      "Chuyên cho thuê căn hộ chung cư, studio, penthouse và biệt thự dài hạn (3–12+ tháng) tại tất cả 19 khu vực Đà Nẵng (Mỹ Khê, An Thượng, Ven sông Hàn, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ, FPT City). Hỗ trợ 6 ngôn ngữ (Việt, Anh, Trung, Nga, Hàn, Nhật).",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Đà Nẵng",
      addressRegion: "Thành phố Đà Nẵng",
      postalCode: "550000",
      addressCountry: "VN"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 16.0544,
      longitude: 108.2022
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "08:00",
        closes: "21:30"
      }
    ],
    areaServed: [
      { "@type": "City", name: "Đà Nẵng" },
      ...DANANG_SEO_AREAS.map((a) => ({
        "@type": "Place",
        name: `${a.vi}, Đà Nẵng`,
        url: `${origin}/areas/${a.slug}`
      }))
    ],
    knowsAbout: [
      "Cho thuê căn hộ Đà Nẵng dài hạn",
      "Long-term apartment rentals in Da Nang",
      "Thuê chung cư Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ",
      "The Filmore Da Nang, The Panoma Sun Cosmo, Hiyori Garden Tower, The Monarchy, Azura",
      "Đăng ký tạm trú NA17 cho người nước ngoài tại Đà Nẵng"
    ],
    availableLanguage: ["Vietnamese", "English", "Chinese", "Russian", "Korean", "Japanese"],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+84-389-711-601",
      contactType: "customer service",
      areaServed: "VN",
      availableLanguage: ["Vietnamese", "English", "Chinese", "Russian", "Korean", "Japanese"]
    },
    sameAs: ["https://t.me/KIN_Estates", "https://zalo.me/0389711601", "https://wa.me/84389711601"],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      reviewCount: String(Math.max(6, testimonials.length)),
      bestRating: "5",
      worstRating: "1"
    },
    ...(reviews.length ? { review: reviews } : {})
  };
}

function buildWebsiteSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: "KIN Estates Đà Nẵng",
    alternateName: ["KIN Estates", "kinestatesdanang", "kinestatesdanang.com", "KIN Estates Da Nang"],
    url: origin,
    publisher: { "@id": `${origin}/#organization` },
    inLanguage: SUPPORTED_LANGS,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/apartments?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

function buildBreadcrumbSchema(origin, crumbs = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: c.name,
      item: c.url
    }))
  };
}

function buildFaqSchema(lang = "vi") {
  const faqs =
    lang === "vi"
      ? [
          {
            q: "Giá thuê căn hộ dài hạn tại Đà Nẵng năm 2026 khoảng bao nhiêu một tháng?",
            a: "Tại Đà Nẵng năm 2026, căn hộ Studio & 1 phòng ngủ (An Thượng, Mỹ Khê, Hòa Xuân, Cẩm Lệ, Sơn Trà) có giá từ 7–15 triệu/tháng ($300–$600); chung cư cao cấp 2 phòng ngủ (Hiyori, Monarchy, The Panoma, The Filmore) từ 16–35 triệu/tháng ($650–$1,400); căn 3PN, Penthouse & Biệt thự hồ bơi từ $1,300–$3,500/tháng."
          },
          {
            q: "Thuê căn hộ Đà Nẵng qua KIN Estates cần hợp đồng tối thiểu bao lâu và đặt cọc thế nào?",
            a: "KIN Estates chuyên cho thuê dài hạn từ 3 tháng, 6 tháng đến 12+ tháng. Tiền đặt cọc thông thường là 1 tháng tiền nhà và thanh toán trực tiếp cho chủ sở hữu theo hợp đồng song ngữ minh bạch."
          },
          {
            q: "Nên chọn khu vực nào khi thuê căn hộ ở Đà Nẵng?",
            a: "Biển Mỹ Khê & Phố Tây An Thượng phù hợp khách thích đi bộ ra biển và nhiều quán cafe làm việc; Ven sông Hàn & Hải Châu phù hợp chuyên gia trung tâm gần sân bay; Sơn Trà cân bằng giữa biển và mảng xanh; Hòa Xuân, Cẩm Lệ & Nam Việt Á yên tĩnh, rộng rãi, giá thuê rất hợp lý cho gia đình."
          },
          {
            q: "Chi phí điện nước khi thuê chung cư, căn hộ tại Đà Nẵng tính giá bao nhiêu?",
            a: "Các tòa chung cư thương mại (The Panoma, The Filmore, Hiyori, Monarchy, Azura, FPT Plaza) tính điện theo hóa đơn nhà nước EVN (~2.800đ/kWh). Với căn hộ dịch vụ nguyên tòa, giá điện dao động 3.500–4.000đ/kWh và thường miễn phí nước, Wi-Fi cùng dọn phòng hàng tuần."
          },
          {
            q: "KIN Estates có hỗ trợ khách nước ngoài đăng ký tạm trú (Mẫu NA17) không?",
            a: "Có. Ngay trong 24 giờ sau khi nhận bàn giao căn hộ, KIN Estates phối hợp cùng chủ nhà khai báo tạm trú Công an Phường và hỗ trợ xin giấy xác nhận dấu đỏ (Form NA17) để gia hạn Visa hoặc làm thẻ tạm trú TRC."
          },
          {
            q: "Có thể xem căn hộ trực tuyến từ xa trước khi đến Đà Nẵng không?",
            a: "Hoàn toàn được. Chuyên viên KIN Estates trực tiếp đến căn hộ gọi Video Call 4K qua Zalo, WhatsApp hoặc Telegram (0389 711 601), kiểm tra thực tế ánh sáng, độ ồn, tốc độ Wi-Fi và môi trường xung quanh cho khách."
          }
        ]
      : [
          {
            q: "How much does it cost to rent a long-term apartment in Da Nang in 2026?",
            a: "In Da Nang (2026), quality studios and 1-bedroom apartments in An Thuong, My Khe, Hoa Xuan, or Son Tra range from $320–$650/month; modern 2-bedroom condos (Hiyori, Monarchy, The Panoma, The Filmore) range from $680–$1,450/month; 3-bedroom penthouses and private pool villas range from $1,400–$3,500/month."
          },
          {
            q: "What is the minimum lease term and deposit for apartments in Da Nang?",
            a: "KIN Estates specializes in 3 to 12+ month residential leases in Da Nang, typically requiring a 1-month security deposit paid directly to the property owner under a clear bilingual contract."
          },
          {
            q: "Which Da Nang neighborhood is best for expats, families, and remote workers?",
            a: "An Thuong and My Khe Beach offer walkable beach living and coworking cafes; Han Riverfront and Hai Chau provide luxury towers near the airport; Son Tra blends nature and beach access; Hoa Xuan, Cam Le, and Nam Viet A offer quiet, spacious family living at great value."
          },
          {
            q: "How are electricity and utilities billed in Da Nang rentals?",
            a: "Condominium towers (The Panoma, Filmore, Hiyori, Monarchy, Azura) bill electricity at official state EVN rates (~2,800 VND/kWh), while boutique serviced apartments charge 3,500–4,000 VND/kWh and usually include fiber Wi-Fi, water, and weekly cleaning."
          },
          {
            q: "Does KIN Estates assist foreigners with Form NA17 police residence registration?",
            a: "Yes. Within 24 hours of check-in, we coordinate ward police registration with the landlord and help obtain the official stamped Form NA17 needed for Vietnam visa extensions and TRC applications."
          }
        ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a }
    }))
  };
}

function buildApartmentSchema(origin, apt, lang = "vi") {
  const title = locVal(apt.title, lang) || apt.code;
  const desc = locVal(apt.architecturalNotes, lang) || `${title} — ${apt.building || "Đà Nẵng"}`;
  const imgs = (apt.images || []).map((img) => toAbsoluteUrl(origin, img));
  const url = `${origin}/apartments/${encodeURIComponent(apt.code)}`;
  const matchedArea = findAreaByName(`${apt.areaName || ""} ${apt.district || ""} ${locVal(apt.title, "vi")}`);

  const amenities = [];
  if (apt.wifiIncluded) amenities.push({ "@type": "LocationFeatureSpecification", name: "High-Speed Fiber Wi-Fi", value: true });
  if (apt.electricityRate) amenities.push({ "@type": "LocationFeatureSpecification", name: `Electricity (${apt.electricityRate})`, value: true });
  if (apt.remoteWorkSetup) amenities.push({ "@type": "LocationFeatureSpecification", name: "Remote Work Desk", value: true });
  if (apt.petPolicy) amenities.push({ "@type": "LocationFeatureSpecification", name: `Pet Policy: ${apt.petPolicy}`, value: true });

  const crumbs = [
    { name: "KIN Estates Đà Nẵng", url: `${origin}/` },
    { name: lang === "vi" ? "Cho thuê căn hộ Đà Nẵng" : "Da Nang Apartments", url: `${origin}/apartments` }
  ];
  if (matchedArea) {
    crumbs.push({
      name: lang === "vi" ? `Căn hộ ${matchedArea.vi}` : `${matchedArea.en} Apartments`,
      url: `${origin}/areas/${matchedArea.slug}`
    });
  }
  crumbs.push({ name: title, url });

  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": `${url}#listing`,
      name: title,
      description: desc,
      url,
      datePosted: apt.createdAt || new Date().toISOString(),
      image: imgs.length ? imgs : [DEFAULT_OG_IMAGE],
      offers: {
        "@type": "Offer",
        priceCurrency: apt.priceVnd ? "VND" : "USD",
        price: Number(apt.priceVnd || apt.priceUsd || 0),
        availability: apt.status === "Available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@id": `${origin}/#organization` },
        url
      },
      mainEntity: {
        "@type": "Apartment",
        name: title,
        description: desc,
        numberOfRooms: Number(apt.bedrooms || 1),
        numberOfBedrooms: Number(apt.bedrooms || 1),
        numberOfBathroomsTotal: Number(apt.bathrooms || 1),
        ...(apt.floor ? { floorLevel: String(apt.floor) } : {}),
        ...(apt.sizeM2 ? { floorSize: { "@type": "QuantitativeValue", value: Number(apt.sizeM2), unitCode: "MTK" } } : {}),
        ...(apt.minLeaseMonths
          ? { leaseLength: { "@type": "QuantitativeValue", value: Number(apt.minLeaseMonths), unitText: "MONTH" } }
          : {}),
        ...(amenities.length ? { amenityFeature: amenities } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: apt.address || apt.building || apt.areaName || "Đà Nẵng",
          addressLocality: matchedArea ? matchedArea.vi : "Đà Nẵng",
          addressRegion: "Đà Nẵng",
          addressCountry: "VN"
        },
        ...(apt.coordinates?.lat && apt.coordinates?.lng
          ? { geo: { "@type": "GeoCoordinates", latitude: apt.coordinates.lat, longitude: apt.coordinates.lng } }
          : {})
      }
    },
    buildBreadcrumbSchema(origin, crumbs)
  ];
}

function buildItemListSchema(origin, apartments, lang = "vi", listTitle = "") {
  const items = (apartments || []).slice(0, 20).map((apt, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: `${origin}/apartments/${encodeURIComponent(apt.code)}`,
    name: locVal(apt.title, lang) || apt.code
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listTitle || (lang === "vi" ? "Căn hộ cho thuê dài hạn tại Đà Nẵng — KIN Estates" : "Da Nang Long-Term Apartments for Rent — KIN Estates"),
    numberOfItems: items.length,
    itemListElement: items
  };
}

function filterApartmentsForArea(apartments, areaObj) {
  if (!areaObj) return apartments || [];
  const fold = (v) =>
    String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase();
  const targetVi = fold(areaObj.vi);
  const targetEn = fold(areaObj.en);
  return (apartments || []).filter((a) => {
    const hay = fold(`${a.areaName || ""} ${a.district || ""} ${a.address || ""} ${locVal(a.title, "vi")} ${locVal(a.title, "en")}`);
    return hay.includes(targetVi) || hay.includes(targetEn);
  });
}

function buildPageSeoHead({ origin, pathname, lang = "vi", apartment = null, apartments = [], about = null }) {
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const areaMatch = cleanPath.match(/^\/areas\/([a-z0-9-]+)$/i);
  const areaObj = areaMatch ? findAreaBySlug(areaMatch[1]) : null;

  const canonicalUrl = `${origin}${cleanPath === "/" ? "/" : cleanPath}${lang !== "vi" ? `?lang=${lang}` : ""}`;
  let title;
  let description;
  let keywords;
  let ogImage = toAbsoluteUrl(origin, about?.heroImage || DEFAULT_OG_IMAGE);
  let ogImageAlt = "KIN Estates Đà Nẵng — Cho thuê căn hộ & biệt thự dài hạn";
  let ogType = "website";
  const schemas = [buildLocalBusinessSchema(origin, about?.testimonials || []), buildWebsiteSchema(origin)];

  if (apartment) {
    const rawTitle = locVal(apartment.title, lang) || apartment.code;
    const matchedArea = findAreaByName(`${apartment.areaName || ""} ${apartment.district || ""} ${rawTitle}`);
    const areaDisplay = lang === "vi" ? matchedArea?.vi || apartment.areaName || "Đà Nẵng" : matchedArea?.en || apartment.areaName || "Da Nang";
    const priceShort = apartment.priceVnd
      ? `${(Number(apartment.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "")}tr/th · $${apartment.priceUsd}`
      : `$${apartment.priceUsd}/${lang === "vi" ? "tháng" : "mo"}`;
    const specs = [
      apartment.bedrooms ? `${apartment.bedrooms}${lang === "vi" ? "PN" : "BR"}` : "",
      apartment.sizeM2 ? `${apartment.sizeM2}m²` : "",
      areaDisplay
    ]
      .filter(Boolean)
      .join(" · ");

    const mentionsDaNang = /đà nẵng|da nang|danang/i.test(rawTitle);
    title = mentionsDaNang
      ? `${rawTitle} (${priceShort}) | KIN Estates`
      : `${rawTitle} (${priceShort}) — ${lang === "vi" ? "Đà Nẵng" : "Da Nang"} | KIN Estates`;

    const noteSnippet = (locVal(apartment.architecturalNotes, lang) || rawTitle).slice(0, 88).trim();
    description =
      lang === "vi"
        ? `Cho thuê căn hộ tại ${areaDisplay}, Đà Nẵng (${specs}, giá ${priceShort}) ✓ ${noteSnippet} ✓ Giá trực tiếp chủ nhà, đặt lịch xem cùng KIN Estates →`
        : `For rent in ${areaDisplay}, Da Nang (${specs}, ${priceShort}) ✓ ${noteSnippet} ✓ Direct owner pricing & verified tour by KIN Estates →`;

    keywords = [
      rawTitle,
      apartment.building || "",
      `thuê căn hộ ${matchedArea?.vi || apartment.areaName || "Đà Nẵng"} Đà Nẵng`,
      `cho thuê chung cư ${matchedArea?.vi || "Đà Nẵng"}`,
      apartment.bedrooms ? `thuê căn hộ ${apartment.bedrooms} phòng ngủ Đà Nẵng` : "",
      `apartment for rent ${matchedArea?.en || "Da Nang"}`,
      apartment.code,
      "KIN Estates Đà Nẵng",
      "kinestatesdanang"
    ]
      .filter(Boolean)
      .join(", ");

    ogImage = toAbsoluteUrl(origin, apartment.images?.[0] || DEFAULT_OG_IMAGE);
    ogImageAlt = `${rawTitle} — KIN Estates Đà Nẵng`;
    ogType = "article";
    schemas.push(...buildApartmentSchema(origin, apartment, lang));
  } else if (areaObj) {
    const meta = buildAreaSeoMeta(areaObj, lang);
    title = meta.title;
    description = meta.description;
    keywords = meta.keywords;
    ogImageAlt = title;
    const areaUnits = filterApartmentsForArea(apartments, areaObj);
    schemas.push(
      buildBreadcrumbSchema(origin, [
        { name: "KIN Estates Đà Nẵng", url: `${origin}/` },
        { name: lang === "vi" ? "Khu vực Đà Nẵng" : "Da Nang Neighborhoods", url: `${origin}/areas` },
        { name: lang === "vi" ? `Thuê căn hộ ${areaObj.vi}` : `${areaObj.en} Apartments`, url: `${origin}/areas/${areaObj.slug}` }
      ])
    );
    schemas.push(
      buildItemListSchema(
        origin,
        areaUnits.length ? areaUnits : apartments,
        lang,
        lang === "vi" ? `Căn hộ cho thuê tại ${areaObj.vi}, Đà Nẵng` : `Apartments for Rent in ${areaObj.en}, Da Nang`
      )
    );
    schemas.push(buildFaqSchema(lang));
  } else {
    const routePack = ROUTE_META[cleanPath] || ROUTE_META["/"];
    const meta = routePack[lang] || routePack.en || routePack.vi;
    title = meta.title;
    description = meta.description;
    keywords = meta.keywords;
    ogImageAlt = title;

    if (cleanPath !== "/") {
      schemas.push(
        buildBreadcrumbSchema(origin, [
          { name: "KIN Estates Đà Nẵng", url: `${origin}/` },
          { name: title.split("|")[0].trim(), url: `${origin}${cleanPath}` }
        ])
      );
    }
    if (cleanPath === "/" || cleanPath === "/apartments") {
      schemas.push(buildItemListSchema(origin, apartments, lang));
    }
    if (cleanPath === "/" || cleanPath === "/how-to-rent" || cleanPath === "/guides") {
      schemas.push(buildFaqSchema(lang));
    }
  }

  const ogLocaleMap = { vi: "vi_VN", en: "en_US", zh: "zh_CN", ru: "ru_RU", ko: "ko_KR", ja: "ja_JP" };
  const currentOgLocale = ogLocaleMap[lang] || "vi_VN";
  const alternateOgLocales = Object.values(ogLocaleMap)
    .filter((loc) => loc !== currentOgLocale)
    .map((loc) => `<meta property="og:locale:alternate" content="${loc}" />`)
    .join("\n  ");

  const jsonLdTags = schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, "\\u003c")}</script>`)
    .join("\n  ");

  const seoBlock = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="keywords" content="${escapeHtml(keywords)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<meta name="author" content="KIN Estates Đà Nẵng (kinestatesdanang.com)" />`,
    `<meta name="application-name" content="KIN Estates Đà Nẵng" />`,
    `<meta name="geo.region" content="VN-DN" />`,
    `<meta name="geo.placename" content="Da Nang, Vietnam" />`,
    `<meta name="geo.position" content="16.0544;108.2022" />`,
    `<meta name="ICBM" content="16.0544, 108.2022" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    buildHreflangLinks(origin, cleanPath),
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="KIN Estates Đà Nẵng" />`,
    `<meta property="og:locale" content="${currentOgLocale}" />`,
    alternateOgLocales,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(ogImageAlt)}" />`,
    jsonLdTags
  ].join("\n  ");

  return { title, description, seoBlock, lang };
}

function buildSsrRootMarkup({ origin, pathname, lang = "vi", apartment = null, apartments = [], about = null }) {
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const areaMatch = cleanPath.match(/^\/areas\/([a-z0-9-]+)$/i);
  const areaObj = areaMatch ? findAreaBySlug(areaMatch[1]) : null;

  const areaNavLinks = DANANG_SEO_AREAS.map(
    (a) => `<a href="${escapeHtml(origin)}/areas/${a.slug}">Thuê căn hộ ${escapeHtml(a.vi)}</a>`
  ).join(" · ");

  if (apartment) {
    const t = locVal(apartment.title, lang) || apartment.code;
    const desc = locVal(apartment.architecturalNotes, lang) || "";
    const matchedArea = findAreaByName(`${apartment.areaName || ""} ${apartment.district || ""} ${t}`);
    const priceVnd = apartment.priceVnd
      ? `${(Number(apartment.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "")} triệu VNĐ/tháng`
      : "";
    return (
      `<main style="max-width:960px;margin:24px auto;padding:0 16px;font-family:sans-serif;color:#14191f">` +
      `<nav><a href="${escapeHtml(origin)}/">KIN Estates Đà Nẵng</a> / <a href="${escapeHtml(origin)}/apartments">Cho thuê căn hộ Đà Nẵng</a>` +
      (matchedArea ? ` / <a href="${escapeHtml(origin)}/areas/${matchedArea.slug}">Căn hộ ${escapeHtml(matchedArea.vi)}</a>` : "") +
      `</nav>` +
      `<h1>${escapeHtml(t)} — Cho Thuê Căn Hộ ${escapeHtml(matchedArea?.vi || apartment.areaName || "Đà Nẵng")}</h1>` +
      `<p><strong>${escapeHtml(priceVnd)} ($${escapeHtml(apartment.priceUsd)}/month)</strong> · ${escapeHtml(apartment.bedrooms ?? 1)} phòng ngủ · ${escapeHtml(apartment.sizeM2 ?? "-")} m² · ${escapeHtml(apartment.areaName || "Đà Nẵng")}</p>` +
      `<p>Địa chỉ / Tòa nhà: ${escapeHtml(apartment.address || apartment.building || "Đà Nẵng, Việt Nam")}</p>` +
      `<p>${escapeHtml(desc)}</p>` +
      `<p>Liên hệ đặt lịch xem nhà trực tiếp cùng KIN Estates Đà Nẵng (kinestatesdanang.com): Zalo / WhatsApp 0389 711 601 · Telegram @KIN_Estates.</p>` +
      `<footer><p>Khám phá thêm khu vực: ${areaNavLinks}</p></footer>` +
      `</main>`
    );
  }

  const avail = (apartments || []).filter((a) => a.status === "Available" && a.isVisible !== false);
  const displayUnits = areaObj ? filterApartmentsForArea(avail, areaObj) : avail;
  const unitsToRender = (displayUnits.length ? displayUnits : avail).slice(0, 20);

  const aptLinks = unitsToRender
    .map((a) => {
      const t = locVal(a.title, lang) || a.code;
      return `<li><a href="${escapeHtml(origin)}/apartments/${encodeURIComponent(a.code)}">${escapeHtml(t)} — $${escapeHtml(a.priceUsd)}/tháng (${escapeHtml(a.bedrooms ?? 1)}PN · ${escapeHtml(a.areaName || "Đà Nẵng")})</a></li>`;
    })
    .join("");

  const fbList = (about?.testimonials || [])
    .slice(0, 4)
    .map(
      (f) =>
        `<li><strong>${escapeHtml(f.clientName)}</strong> (${escapeHtml(f.subtitle || "Đà Nẵng")}): ${escapeHtml(locVal(f.quote, lang))}</li>`
    )
    .join("");

  const heading = areaObj
    ? `Cho Thuê Căn Hộ, Chung Cư & Biệt Thự ${areaObj.vi} Đà Nẵng Dài Hạn | KIN Estates`
    : cleanPath === "/apartments"
      ? "Danh Sách Căn Hộ & Chung Cư Cho Thuê Dài Hạn Tại Đà Nẵng | KIN Estates"
      : cleanPath === "/areas"
        ? "19 Khu Vực Thuê Căn Hộ Đáng Sống Nhất Tại Đà Nẵng | KIN Estates"
        : cleanPath === "/how-to-rent"
          ? "Quy Trình Thuê Căn Hộ Dài Hạn Tại Đà Nẵng & Khai Báo Tạm Trú NA17"
          : cleanPath === "/guides"
            ? "Bảng Giá Thuê Chung Cư Đà Nẵng 2026 (The Filmore, The Panoma, Hiyori, Monarchy)"
            : cleanPath === "/about"
              ? "Về KIN Estates Đà Nẵng (kinestatesdanang.com) — Tư Vấn & Dẫn Xem Căn Hộ Thực Tế"
              : "Cho Thuê Căn Hộ Đà Nẵng Dài Hạn Giá Tốt — KIN Estates Đà Nẵng (kinestatesdanang.com)";

  return (
    `<main style="max-width:1040px;margin:24px auto;padding:0 16px;font-family:sans-serif;color:#14191f">` +
    `<header><nav>` +
    `<a href="${escapeHtml(origin)}/">KIN Estates Đà Nẵng</a> · ` +
    `<a href="${escapeHtml(origin)}/apartments">Thuê căn hộ Đà Nẵng</a> · ` +
    `<a href="${escapeHtml(origin)}/areas">19 Khu vực Đà Nẵng</a> · ` +
    `<a href="${escapeHtml(origin)}/how-to-rent">Quy trình thuê &amp; NA17</a> · ` +
    `<a href="${escapeHtml(origin)}/guides">Bảng giá chung cư 2026</a> · ` +
    `<a href="${escapeHtml(origin)}/about">Về KIN Estates</a> · ` +
    `<a href="${escapeHtml(origin)}/privacy-policy">Chính sách bảo mật</a>` +
    `</nav></header>` +
    `<h1>${escapeHtml(heading)}</h1>` +
    `<p><strong>KIN Estates Đà Nẵng (kinestatesdanang.com)</strong> chuyên cho thuê căn hộ chung cư, căn hộ dịch vụ, studio, 1 phòng ngủ, 2 phòng ngủ, 3 phòng ngủ, penthouse và biệt thự hồ bơi dài hạn (3–12+ tháng) tại Đà Nẵng. Kiểm định thực tế ánh sáng, độ ồn, tốc độ Wi-Fi, điện giá nhà nước EVN, hợp đồng song ngữ trực tiếp chủ nhà và hỗ trợ đăng ký tạm trú NA17 tại các tòa nhà nổi bật: The Filmore, The Panoma Sun Cosmo Residence, Hiyori Garden Tower, The Monarchy, Azura, Blooming Tower, Indochina Riverside, FPT Plaza, Euro Village. Hotline Zalo / WhatsApp: 0389 711 601 · Telegram: @KIN_Estates.</p>` +
    (aptLinks ? `<section><h2>${escapeHtml(areaObj ? `Căn hộ đang cho thuê tại ${areaObj.vi}, Đà Nẵng` : "Căn hộ cho thuê Đà Nẵng đang trống")}</h2><ul>${aptLinks}</ul></section>` : "") +
    `<section><h2>Tìm thuê căn hộ theo 19 khu vực Đà Nẵng</h2><p>${areaNavLinks}</p></section>` +
    (fbList ? `<section><h2>Đánh giá thực tế từ khách thuê KIN Estates Đà Nẵng</h2><ul>${fbList}</ul></section>` : "") +
    `</main>`
  );
}

function injectSeoIntoHtml(baseHtml, seoHead, ssrBody = "") {
  let html = String(baseHtml || "");
  html = html.replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtml(seoHead.lang)}">`);
  if (/<!-- KIN_SEO_META_START -->[\s\S]*?<!-- KIN_SEO_META_END -->/.test(html)) {
    html = html.replace(
      /<!-- KIN_SEO_META_START -->[\s\S]*?<!-- KIN_SEO_META_END -->/,
      `<!-- KIN_SEO_META_START -->\n  ${seoHead.seoBlock}\n  <!-- KIN_SEO_META_END -->`
    );
  } else {
    html = html.replace(/<title>[\s\S]*?<\/title>\s*<meta name="description"[^>]*>/i, seoHead.seoBlock);
  }
  if (ssrBody) {
    if (/<!-- KIN_SSR_ROOT_START -->[\s\S]*?<!-- KIN_SSR_ROOT_END -->/.test(html)) {
      html = html.replace(
        /<!-- KIN_SSR_ROOT_START -->[\s\S]*?<!-- KIN_SSR_ROOT_END -->/,
        `<!-- KIN_SSR_ROOT_START -->${ssrBody}<!-- KIN_SSR_ROOT_END -->`
      );
    } else if (html.includes('<div id="root"></div>')) {
      html = html.replace('<div id="root"></div>', `<div id="root">${ssrBody}</div>`);
    }
  }
  return html;
}

function generateRobotsTxt(origin) {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /kin-studio",
    "Disallow: /kin-studio/",
    "Disallow: /api/studio/",
    "Disallow: /api/inquiries",
    "Disallow: /api/leases",
    "Disallow: /api/telegram/webhook",
    "",
    "# AI Search & Answer Engines (GEO: ChatGPT, Google AI Overviews, Perplexity, Claude)",
    "User-agent: GPTBot",
    "Allow: /",
    "User-agent: OAI-SearchBot",
    "Allow: /",
    "User-agent: ChatGPT-User",
    "Allow: /",
    "User-agent: PerplexityBot",
    "Allow: /",
    "User-agent: ClaudeBot",
    "Allow: /",
    "User-agent: Google-Extended",
    "Allow: /",
    "User-agent: Applebot-Extended",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    ""
  ].join("\n");
}

function generateSitemapXml(origin, apartments = []) {
  const today = new Date().toISOString().slice(0, 10);
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/apartments", priority: "0.95", changefreq: "daily" },
    { path: "/areas", priority: "0.90", changefreq: "weekly" },
    { path: "/guides", priority: "0.88", changefreq: "weekly" },
    { path: "/how-to-rent", priority: "0.85", changefreq: "monthly" },
    { path: "/about", priority: "0.82", changefreq: "weekly" },
    { path: "/privacy-policy", priority: "0.40", changefreq: "yearly" }
  ];

  const altLinks = (p) => {
    const clean = p === "/" ? "" : p;
    const rows = [
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${origin}${clean || "/"}`)}" />`,
      `    <xhtml:link rel="alternate" hreflang="vi" href="${escapeXml(`${origin}${clean || "/"}`)}" />`
    ];
    for (const l of SUPPORTED_LANGS) {
      if (l === "vi") continue;
      rows.push(`    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(`${origin}${clean || "/"}?lang=${l}`)}" />`);
    }
    return rows.join("\n");
  };

  const urlBlocks = [];
  for (const page of staticPages) {
    urlBlocks.push(
      `  <url>\n    <loc>${escapeXml(`${origin}${page.path}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${page.changefreq}</changefreq>\n    <priority>${page.priority}</priority>\n${altLinks(page.path)}\n  </url>`
    );
  }

  // All 19 Da Nang District & Neighborhood SEO Landing Pages
  for (const areaObj of DANANG_SEO_AREAS) {
    const areaPath = `/areas/${areaObj.slug}`;
    urlBlocks.push(
      `  <url>\n    <loc>${escapeXml(`${origin}${areaPath}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.88</priority>\n${altLinks(areaPath)}\n  </url>`
    );
  }

  for (const apt of apartments || []) {
    if (!apt?.code || apt.isVisible === false || apt.status === "Hidden") continue;
    const aptPath = `/apartments/${encodeURIComponent(apt.code)}`;
    const lastmod = String(apt.updatedAt || apt.createdAt || today).slice(0, 10);
    const imgTags = (apt.images || [])
      .slice(0, 5)
      .map((img) => {
        const absImg = toAbsoluteUrl(origin, img);
        return `    <image:image>\n      <image:loc>${escapeXml(absImg)}</image:loc>\n      <image:title>${escapeXml(locVal(apt.title, "vi") || apt.code)}</image:title>\n    </image:image>`;
      })
      .join("\n");
    urlBlocks.push(
      `  <url>\n    <loc>${escapeXml(`${origin}${aptPath}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.92</priority>\n${altLinks(aptPath)}${imgTags ? `\n${imgTags}` : ""}\n  </url>`
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml"',
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urlBlocks,
    "</urlset>",
    ""
  ].join("\n");
}

function generateLlmsTxt(origin, apartments = []) {
  const avail = (apartments || []).filter((a) => a.status === "Available" && a.isVisible !== false);
  const pricesUsd = avail.map((a) => Number(a.priceUsd || 0)).filter((n) => n > 0);
  const minUsd = pricesUsd.length ? Math.min(...pricesUsd) : 350;
  const maxUsd = pricesUsd.length ? Math.max(...pricesUsd) : 2500;

  const lines = [
    "# KIN Estates Đà Nẵng (kinestatesdanang.com) — Da Nang Long-Term Apartments, Condos & Villas for Rent",
    "",
    "> Official website of KIN Estates Da Nang (`kinestatesdanang` / `kinestatesdanang.com`). Specializing in physically audited long-term apartments, studios, luxury condominiums, penthouses, and private pool villas (3–12+ months) across all 19 districts & neighborhoods of Da Nang, Vietnam. Multilingual support in Vietnamese, English, Chinese, Russian, Korean, and Japanese.",
    "",
    "## Brand & Contact Information",
    `- Brand Names: KIN Estates, KIN Estates Đà Nẵng, KIN Estates Da Nang, kinestatesdanang`,
    `- Canonical Website: ${origin}`,
    `- Available Verified Listings: ${avail.length} residences ($${minUsd}–$${maxUsd}/month)`,
    "- Lease Terms: 3–12+ months, direct owner pricing, official state EVN electricity (~2,800 VND/kWh), bilingual Vietnamese–English lease & Form NA17 police residence registration",
    "- Direct Contact: Zalo 0389 711 601 | WhatsApp +84 389 711 601 | Phone +84 389 711 601 | Telegram @KIN_Estates",
    "",
    "## Core Pages",
    `- Home: ${origin}/`,
    `- Available Da Nang Apartments & Live Map: ${origin}/apartments`,
    `- 19 Da Nang Neighborhood Comparison Guide: ${origin}/areas`,
    `- Da Nang Condo Price Index & Living Guides 2026: ${origin}/guides`,
    `- How to Rent & Form NA17 Registration Guide: ${origin}/how-to-rent`,
    `- About KIN Estates & Verified Client Reviews: ${origin}/about`,
    `- Privacy & Data Policy: ${origin}/privacy-policy`,
    "",
    "## Da Nang Neighborhood Landing Pages (19 Areas)",
    ...DANANG_SEO_AREAS.map((a) => `- ${a.vi} (${a.en}): ${origin}/areas/${a.slug}`),
    "",
    "## Featured Condo Towers & Communities Covered",
    "- The Filmore Da Nang (Hai Chau — West Han Riverfront)",
    "- The Panoma / Sun Cosmo Residence (Ngu Hanh Son — Tran Thi Ly Bridge)",
    "- Hiyori Garden Tower (Son Tra — Vo Van Kiet Blvd)",
    "- The Monarchy (Son Tra — East Han Riverfront, Pet-Friendly)",
    "- Azura, Indochina Riverside, Blooming Tower, FPT Plaza 1/2/3, Euro Village 1 & 2 (Hoa Xuan)",
    "",
    "## Current Verified Available Residences in Da Nang"
  ];

  for (const apt of avail.slice(0, 50)) {
    const tEn = locVal(apt.title, "en");
    const tVi = locVal(apt.title, "vi");
    lines.push(
      `- [${apt.code}] ${tEn}${tVi && tVi !== tEn ? ` (${tVi})` : ""} — $${apt.priceUsd}/mo (${apt.bedrooms ?? 1}BR, ${apt.sizeM2 ?? "-"}m², ${apt.areaName || "Da Nang"}): ${origin}/apartments/${encodeURIComponent(apt.code)}`
    );
  }

  return lines.join("\n") + "\n";
}

module.exports = {
  SUPPORTED_LANGS,
  DANANG_SEO_AREAS,
  findAreaBySlug,
  findAreaByName,
  getSiteOrigin,
  resolveLang,
  buildPageSeoHead,
  buildSsrRootMarkup,
  injectSeoIntoHtml,
  generateRobotsTxt,
  generateSitemapXml,
  generateLlmsTxt
};
