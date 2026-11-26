const {
  SUPPORTED_LANGS,
  NON_DEFAULT_LANGS,
  DANANG_SEO_AREAS,
  PROPERTY_TYPE_LANDINGS,
  SEO_GUIDE_ARTICLES,
  findAreaBySlug,
  findAreaByName,
  findPropertyTypeBySlug,
  findGuideArticleBySlug
} = require("./seoData");

const DEFAULT_SITE_URL = "https://www.kinestatesdanang.com";
const DEFAULT_OG_IMAGE = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85";

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

function parseLocalizedPath(rawPathname = "/", queryLang = "") {
  const raw = String(rawPathname || "/").trim() || "/";
  const m = raw.match(/^\/(en|zh|ru|ko|ja)(\/.*)?$/i);
  if (m) {
    const lang = m[1].toLowerCase();
    const rest = m[2] || "/";
    const cleanPath = rest === "/" ? "/" : rest.replace(/\/+$/, "") || "/";
    return { lang, cleanPath, hasPrefix: true };
  }
  const cleanPath = raw === "/" ? "/" : raw.replace(/\/+$/, "") || "/";
  const lang = queryLang ? resolveLang(queryLang) : "vi";
  return { lang, cleanPath, hasPrefix: false };
}

function localizedUrl(origin, cleanPath, lang = "vi") {
  const p = !cleanPath || cleanPath === "/" ? "" : cleanPath.replace(/\/+$/, "");
  if (!lang || lang === "vi") {
    return `${origin}${p || "/"}`;
  }
  return `${origin}/${lang}${p}`;
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

const ROUTE_META = {
  "/": {
    vi: {
      title: "KIN Estates Đà Nẵng — Cho Thuê Căn Hộ, Nhà Nguyên Căn & Biệt Thự",
      description: "KIN Estates Đà Nẵng (kinestatesdanang · kinestatesdanang.com) chuyên cho thuê căn hộ chung cư, studio, nhà nguyên căn, biệt thự hồ bơi & mua bán nhà đất 19 khu vực Đà Nẵng ✓ Giá chủ nhà →",
      keywords: "KIN Estates Đà Nẵng, kinestatesdanang, kinestatesdanang.com, KIN Estates, thuê căn hộ Đà Nẵng, cho thuê căn hộ Đà Nẵng, căn hộ cho thuê Đà Nẵng, thuê nhà Đà Nẵng, thuê nhà nguyên căn Đà Nẵng, cho thuê nhà phố Đà Nẵng, thuê biệt thự Đà Nẵng, thuê villa hồ bơi Đà Nẵng, thuê chung cư Đà Nẵng, thuê căn hộ thường Đà Nẵng, thuê căn hộ mini Đà Nẵng, thuê studio Đà Nẵng, mua bán căn hộ Đà Nẵng, mua nhà Đà Nẵng, ký gửi nhà đất Đà Nẵng, căn hộ Mỹ Khê, An Thượng, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ, Nam Việt Á, Thanh Khê, Liên Chiểu, FPT City, The Filmore, The Panoma Sun Cosmo, Sun Ponte, Hiyori, The Monarchy, Azura"
    },
    en: {
      title: "KIN Estates Da Nang — Apartments, Houses & Pool Villas for Rent",
      description: "KIN Estates Da Nang (kinestatesdanang · kinestatesdanang.com) — verified long-term apartments, studios, whole houses, pool villas & condos across 19 Da Nang districts ✓ Direct owner pricing →",
      keywords: "KIN Estates Da Nang, kinestatesdanang, kinestatesdanang.com, Da Nang apartments for rent, house for rent Da Nang, villa for rent Da Nang, buy condo Da Nang, long-term rental Da Nang, My Khe Beach, An Thuong, Han Riverfront, Son Tra, Hoa Xuan"
    },
    zh: {
      title: "KIN Estates 岘港 — 长租公寓・海景别墅・整栋房屋出租与买房",
      description: "KIN Estates 岘港 (kinestatesdanang · kinestatesdanang.com) 提供3–12个月+长租公寓、独栋泳池别墅与房产买卖投资 ✓ 房东直租透明价 ✓ 覆盖岘港19大区域 →",
      keywords: "KIN Estates, kinestatesdanang, 岘港租房, 岘港长租公寓, 岘港别墅出租, 岘港买房投资, 美溪海滩公寓, 安上区租房"
    },
    ru: {
      title: "KIN Estates Дананг — Аренда Квартир, Домов и Вилл 2026",
      description: "KIN Estates Дананг (kinestatesdanang · kinestatesdanang.com): проверенные квартиры, студии, дома, виллы с бассейном и покупка жилья в 19 районах Дананга ✓ Цены от владельцев →",
      keywords: "KIN Estates, kinestatesdanang, аренда квартир в Дананге, аренда вилл Дананг, снять дом в Дананге, купить квартиру в Дананге"
    },
    ko: {
      title: "KIN Estates 다낭 — 장기 임대 아파트·풀빌라·단독주택 월세 & 매매",
      description: "KIN Estates 다낭 (kinestatesdanang · kinestatesdanang.com) 3~12개월+ 아파트·스튜디오·풀빌라·단독주택 임대 및 부동산 매매 ✓ 집주인 직거래 · 전 19개 구역 →",
      keywords: "KIN Estates, kinestatesdanang, 다낭 아파트 임대, 다낭 풀빌라 임대, 다낭 단독주택 월세, 다낭 아파트 매매, 다낭 한달살기 장기숙소"
    },
    ja: {
      title: "KIN Estates ダナン — 賃貸アパート・ヴィラ・一軒家＆不動産購入",
      description: "KIN Estates ダナン（kinestatesdanang · kinestatesdanang.com）長期賃貸アパート・高級マンション・プール付きヴィラ・一軒家＆不動産売買 ✓ 全19エリア対応 →",
      keywords: "KIN Estates, kinestatesdanang, ダナン 賃貸 アパート, ダナン ヴィラ 賃貸, ダナン 一軒家 賃貸, ダナン 不動産 購入"
    }
  },
  "/apartments": {
    vi: {
      title: "Thuê Chung Cư, Căn Hộ & Biệt Thự Đà Nẵng | KIN Estates",
      description: "Danh sách căn hộ, nhà nguyên căn & biệt thự Đà Nẵng đang trống cập nhật mỗi ngày ✓ Lọc nhanh 19 quận phường, số phòng ngủ, bản đồ giá & ảnh thật 100% →",
      keywords: "danh sách căn hộ cho thuê Đà Nẵng, thuê chung cư Đà Nẵng, thuê nhà nguyên căn Đà Nẵng, thuê biệt thự Đà Nẵng, bản đồ thuê nhà Đà Nẵng"
    },
    en: {
      title: "Available Apartments, Houses & Villas in Da Nang | KIN Estates",
      description: "Browse verified available Da Nang apartments, houses & pool villas with live map pricing ✓ Filter across 19 districts, bedrooms & budget →",
      keywords: "available apartments Da Nang, Da Nang villa rental, house for rent Da Nang, Da Nang rental map"
    },
    zh: {
      title: "岘港在租公寓与独栋别墅房源列表及地图 | KIN Estates",
      description: "实时更新岘港在租公寓、独栋房屋与泳池别墅 ✓ 支持19个区域、居室与预算精准筛选及实时地图找房 →",
      keywords: "岘港在租公寓, 岘港泳池别墅出租, 岘港租房地图"
    },
    ru: {
      title: "Свободные Квартиры, Дома и Виллы в Дананге | KIN Estates",
      description: "Актуальный каталог свободных квартир, домов и вилл в Дананге с ценами на карте ✓ Удобный фильтр по 19 районам, спальням и бюджету →",
      keywords: "каталог квартир Дананг, виллы и дома Дананг, карта аренды Дананг"
    },
    ko: {
      title: "다낭 실시간 공실 아파트·풀빌라 매물 & 지도 | KIN Estates",
      description: "다낭 전 지역 19개 구역 실시간 입주 가능 아파트·스튜디오·풀빌라·단독주택 매물과 가격 지도를 한눈에 비교하세요 →",
      keywords: "다낭 공실 아파트, 다낭 풀빌라 매물, 다낭 임대 지도"
    },
    ja: {
      title: "ダナン空室アパート・ヴィラ一覧＆価格マップ | KIN Estates",
      description: "ダナン全19エリアの入居可能な長期賃貸マンション・ヴィラ・一軒家を地図と条件で簡単検索 →",
      keywords: "ダナン 空室 賃貸, ダナン ヴィラ 一覧, ダナン 物件マップ"
    }
  },
  "/areas": {
    vi: {
      title: "19 Khu Vực Thuê Căn Hộ & Nhà Đà Nẵng Đáng Sống | KIN Estates",
      description: "So sánh giá thuê & nhịp sống 19 khu vực Đà Nẵng: An Thượng, Biển Mỹ Khê, Ven sông Hàn, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ, Thanh Khê, FPT City.",
      keywords: "nên thuê nhà khu vực nào Đà Nẵng, 19 khu vực Đà Nẵng, so sánh An Thượng Sơn Trà Hải Châu Hòa Xuân Cẩm Lệ"
    },
    en: {
      title: "19 Best Neighborhoods to Rent in Da Nang | KIN Estates",
      description: "Compare Da Nang's 19 residential districts side by side: An Thuong, My Khe Beach, Han Riverfront, Son Tra, Hai Chau, Ngu Hanh Son, Hoa Xuan & FPT City →",
      keywords: "best neighborhoods Da Nang, where to live in Da Nang, An Thuong vs Son Tra vs Hoa Xuan"
    },
    zh: {
      title: "岘港租房19大核心区域对比指南（美溪・安上・韩江）| KIN",
      description: "全方位对比岘港19个宜居街区：安上区、美溪海滩、韩江岸、山茶郡、海洲郡、五行山与和春区的租金与生活配套 →",
      keywords: "岘港住哪个区好, 岘港租房区域对比"
    },
    ru: {
      title: "19 Лучших Районов Дананга для Жизни и Аренды | KIN Estates",
      description: "Сравнение 19 районов Дананга по ценам, тишине и близости к пляжу: Ан Тхыонг, Ми Кхе, река Хан, Шонча, Хайтяу, Хоа Суан →",
      keywords: "лучшие районы Дананга, где жить в Дананге"
    },
    ko: {
      title: "다낭 거주 추천 19개 지역 완벽 비교 가이드 | KIN Estates",
      description: "다낭 주요 19개 지역의 월세 시세, 해변 거리, 정숙도, 원격근무 인프라를 1:1로 비교해 보세요 →",
      keywords: "다낭 살기 좋은 동네, 다낭 지역 비교"
    },
    ja: {
      title: "ダナン居住おすすめ19エリア徹底比較 | KIN Estates",
      description: "ダナン長期滞在に人気の19エリアを家賃相場・ビーチ距離・静かさ・利便性で詳しく比較 →",
      keywords: "ダナン 住みやすいエリア, ダナン エリア比較"
    }
  },
  "/how-to-rent": {
    vi: {
      title: "Quy Trình Thuê Căn Hộ Đà Nẵng & Tạm Trú NA17 | KIN Estates",
      description: "Hướng dẫn 5 bước thuê căn hộ, nhà & biệt thự Đà Nẵng an toàn: xem nhà trực tiếp/video 4K, hợp đồng song ngữ, cọc chủ nhà & khai báo tạm trú NA17.",
      keywords: "quy trình thuê căn hộ Đà Nẵng, kinh nghiệm thuê nhà Đà Nẵng, hợp đồng thuê nhà song ngữ, đăng ký tạm trú NA17"
    },
    en: {
      title: "How to Rent an Apartment in Da Nang Safely | KIN Estates",
      description: "5 transparent steps to rent long-term in Da Nang: curated tour, bilingual lease, direct landlord deposit, photo handover & Form NA17 police registration →",
      keywords: "how to rent apartment Da Nang, Vietnam rental contract, Form NA17 Da Nang"
    },
    zh: {
      title: "岘港长租签约流程与外国人暂住登记 NA17 指南 | KIN Estates",
      description: "5步安心在岘港租房：实地或4K视频看房、越英双语合同、房东直付押金、拍照交房及NA17暂住申报 →",
      keywords: "岘港租房流程, 岘港NA17暂住证办理"
    },
    ru: {
      title: "Как Снять Квартиру в Дананге — Договор и NA17 | KIN Estates",
      description: "Прозрачный процесс аренды в Дананге за 5 шагов: видео-тур 4K, двуязычный договор, депозит владельцу и регистрация NA17 →",
      keywords: "как снять квартиру в Дананге, регистрация NA17"
    },
    ko: {
      title: "다낭 아파트 안전 계약 절차 & 공안 거주등록(NA17) | KIN",
      description: "다낭 장기 임대 5단계 안전 가이드: 현장/4K 영상 투어, 이중언어 계약서, 집주인 직접 보증금 및 NA17 거주 등록 지원 →",
      keywords: "다낭 아파트 계약 방법, 다낭 공안 거주등록 NA17"
    },
    ja: {
      title: "ダナン賃貸契約の5ステップ＆警察滞在登録（NA17）| KIN",
      description: "ダナンで安心してお部屋を借りる手順：現地・4K内覧、バイリンガル契約、オーナー直接保証金、NA17滞在登録 →",
      keywords: "ダナン 賃貸 契約の流れ, ベトナム 滞在登録 NA17"
    }
  },
  "/guides": {
    vi: {
      title: "Cẩm Nang Thuê Nhà, Mua Bán & Bảng Giá Đà Nẵng 2026 | KIN",
      description: "Cập nhật bảng giá thuê chung cư, biệt thự & mua bán nhà đất Đà Nẵng 2026 (The Filmore, Panoma, Hiyori, Monarchy) ✓ Điện EVN, chọn khu vực & tạm trú NA17 →",
      keywords: "giá thuê chung cư Đà Nẵng 2026, cẩm nang thuê nhà Đà Nẵng, mua bán căn hộ Đà Nẵng, The Filmore, The Panoma, Hiyori, Monarchy"
    },
    en: {
      title: "Da Nang Rent Price Index, Buying & Living Guides 2026 | KIN",
      description: "2026 monthly rent benchmarks & buying guides across Da Nang's top towers (Filmore, Panoma, Hiyori, Monarchy, Azura) ✓ EVN bills, expat tips & yields →",
      keywords: "Da Nang rent prices 2026, buying property Da Nang, Da Nang expat living guide"
    },
    zh: {
      title: "2026 岘港租房价格指数、买房投资与生活全攻略 | KIN Estates",
      description: "2026最新盘点 The Filmore、The Panoma、Hiyori、Monarchy 月租行情、外籍买房SPA与生活成本攻略 →",
      keywords: "2026岘港房租, 岘港买房攻略"
    },
    ru: {
      title: "Цены на Аренду, Покупку и Гид по Данангу 2026 | KIN Estates",
      description: "Актуальные цены аренды и покупки недвижимости 2026 в топ-ЖК Дананга (Filmore, Panoma, Hiyori, Monarchy) и тарифы EVN →",
      keywords: "цены на аренду в Дананге 2026, купить жилье в Дананге"
    },
    ko: {
      title: "2026 다낭 아파트 월세 시세표·매매·생활 가이드 | KIN Estates",
      description: "더 필모어, 더 파노마, 히요리, 모나키 등 2026년 다낭 월세 시세, 외국인 매매(SPA), 전기·관리비 총정리 →",
      keywords: "2026 다낭 아파트 월세 시세, 다낭 부동산 매매 가이드"
    },
    ja: {
      title: "2026年版ダナン家賃相場・不動産購入＆生活ガイド | KIN",
      description: "The Filmore・The Panoma・Hiyori・Monarchyの最新家賃相場、不動産投資・生活費ガイド →",
      keywords: "ダナン 家賃相場 2026, ダナン 不動産投資"
    }
  },
  "/about": {
    vi: {
      title: "Về KIN Estates Đà Nẵng (kinestatesdanang) — Dẫn Xem & Đánh Giá 5★",
      description: "Hồ sơ chính thức KIN Estates Đà Nẵng (kinestatesdanang · kinestatesdanang.com): tư vấn cho thuê & mua bán căn hộ, nhà nguyên căn, biệt thự 19 khu vực Đà Nẵng ✓ Đánh giá 5★ →",
      keywords: "KIN Estates Đà Nẵng, kinestatesdanang, kinestatesdanang.com, KIN Estates, môi giới bất động sản uy tín Đà Nẵng, ký gửi căn hộ Đà Nẵng"
    },
    en: {
      title: "About KIN Estates Da Nang (kinestatesdanang) — Real Tours & 5★ Reviews",
      description: "Official profile of KIN Estates Da Nang (kinestatesdanang · kinestatesdanang.com): local apartment, house, pool villa & investment specialists ✓ Verified 5★ reviews →",
      keywords: "KIN Estates Da Nang, kinestatesdanang, kinestatesdanang.com, trusted real estate agency Da Nang"
    },
    zh: {
      title: "关于 KIN Estates 岘港 — 真实带看记录与5星客户口碑",
      description: "认识 KIN Estates 岘港本地团队（kinestatesdanang.com）：查看真实带看照片、5星好评与房东委托服务 →",
      keywords: "KIN Estates 岘港, kinestatesdanang"
    },
    ru: {
      title: "О Компании KIN Estates Дананг — Отзывы 5★ и Фото Просмотров",
      description: "Команда экспертов недвижимости в Дананге (kinestatesdanang.com) ✓ Реальные фото туров с клиентами и отзывы 5★ →",
      keywords: "KIN Estates Дананг отзывы, kinestatesdanang"
    },
    ko: {
      title: "KIN Estates 다낭 소개 — 실제 투어 현장 & 5점 만점 입주 후기",
      description: "다낭 장기 임대·매매 전문 파트너 KIN Estates(kinestatesdanang.com)의 실제 고객 투어 사진과 5성급 후기를 확인하세요 →",
      keywords: "KIN Estates 다낭 후기, kinestatesdanang"
    },
    ja: {
      title: "KIN Estatesダナンについて — 内覧実績＆5つ星レビュー",
      description: "ダナン不動産専門チームKIN Estates（kinestatesdanang.com）の実際の内覧風景と5つ星レビューをご紹介 →",
      keywords: "KIN Estates ダナン 評判, kinestatesdanang"
    }
  },
  "/privacy-policy": {
    vi: {
      title: "Chính Sách Bảo Mật & Xử Lý Dữ Liệu | KIN Estates Đà Nẵng",
      description: "Chính sách bảo mật minh bạch của KIN Estates Đà Nẵng: phạm vi thu thập thông tin đặt lịch xem nhà, thời gian lưu trữ và quyền yêu cầu xóa dữ liệu.",
      keywords: "chính sách bảo mật KIN Estates Đà Nẵng, kinestatesdanang"
    },
    en: {
      title: "Privacy & Data Protection Policy | KIN Estates Da Nang",
      description: "Plain-language privacy policy detailing how KIN Estates Da Nang protects inquiry details, retention periods, and data deletion requests.",
      keywords: "KIN Estates Da Nang privacy policy"
    }
  }
};

function buildAreaSeoMeta(areaObj, lang = "vi") {
  const map = {
    vi: {
      title: `Thuê Căn Hộ, Nhà & Biệt Thự ${areaObj.vi} Đà Nẵng | KIN Estates`,
      description: `Cho thuê căn hộ, studio, chung cư, nhà nguyên căn & biệt thự ${areaObj.vi} Đà Nẵng dài hạn ✓ Giá trực tiếp chủ nhà ✓ Điện EVN ✓ Đặt lịch xem thực tế ngay →`,
      keywords: `${areaObj.keywordsVi}, thuê nhà ${areaObj.vi} Đà Nẵng, mua bán căn hộ ${areaObj.vi}, KIN Estates Đà Nẵng, kinestatesdanang`
    },
    en: {
      title: `Apartments, Houses & Villas in ${areaObj.en}, Da Nang | KIN`,
      description: `Verified long-term apartments, studios, houses & villas for rent in ${areaObj.en}, Da Nang (3–12+ mo) ✓ Direct owner pricing ✓ Official EVN rates →`,
      keywords: `apartments for rent ${areaObj.en} Da Nang, house villa ${areaObj.en} Da Nang, KIN Estates`
    },
    zh: {
      title: `岘港${areaObj.zh}长租公寓与别墅出租 | KIN Estates`,
      description: `精选越南岘港${areaObj.zh} 3–12个月以上长租公寓、独栋房屋与泳池别墅 ✓ 房东直租透明价 ✓ 实地核验 →`,
      keywords: `岘港${areaObj.zh}租房, 岘港长租公寓, KIN Estates`
    },
    ru: {
      title: `Аренда Квартир и Вилл — ${areaObj.ru}, Дананг | KIN Estates`,
      description: `Долгосрочная аренда проверенных квартир, домов и вилл в районе ${areaObj.ru} (Дананг) ✓ Без скрытых комиссий ✓ Гостариф EVN →`,
      keywords: `аренда квартир ${areaObj.ru} Дананг, снять жилье Дананг, KIN Estates`
    },
    ko: {
      title: `다낭 ${areaObj.ko} 장기 임대 아파트·풀빌라 월세 | KIN Estates`,
      description: `다낭 ${areaObj.ko} 지역 검증된 장기 임대 아파트·스튜디오·풀빌라·단독주택 ✓ 집주인 직거래 월세 ✓ 국가 EVN 전기요금 →`,
      keywords: `다낭 ${areaObj.ko} 아파트 임대, 다낭 월세, KIN Estates`
    },
    ja: {
      title: `ダナン・${areaObj.ja}の長期賃貸アパート＆ヴィラ | KIN Estates`,
      description: `ダナン${areaObj.ja}エリアの長期賃貸マンション・サービスアパート・ヴィラ（3〜12ヶ月以上）✓ オーナー直接価格 →`,
      keywords: `ダナン ${areaObj.ja} 賃貸, ダナン アパート, KIN Estates`
    }
  };
  return map[lang] || map.en;
}

function buildHreflangLinks(origin, cleanPath) {
  const links = [
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(localizedUrl(origin, cleanPath, "vi"))}" />`,
    `<link rel="alternate" hreflang="vi" href="${escapeHtml(localizedUrl(origin, cleanPath, "vi"))}" />`
  ];
  for (const l of NON_DEFAULT_LANGS) {
    links.push(`<link rel="alternate" hreflang="${l}" href="${escapeHtml(localizedUrl(origin, cleanPath, l))}" />`);
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
    "@type": ["Organization", "RealEstateAgent"],
    "@id": `${origin}/#organization`,
    name: "KIN Estates Đà Nẵng",
    legalName: "KIN Estates Đà Nẵng — Da Nang Private Residences",
    alternateName: [
      "kinestatesdanang",
      "KIN Estates",
      "KIN Estates Da Nang",
      "kinestatesdanang.com",
      "KIN Estates Đà Nẵng",
      "KIN Estates — Da Nang Private Residences"
    ],
    url: `${origin}/`,
    logo: {
      "@type": "ImageObject",
      url: `${origin}/img/kin-logo-512.png`,
      width: 512,
      height: 512
    },
    image: [DEFAULT_OG_IMAGE, `${origin}/img/kin-logo-512.png`],
    telephone: "+84-389-711-601",
    priceRange: "7.000.000₫ - 85.000.000₫ / tháng ($300 - $3,500 / month)",
    currenciesAccepted: "VND, USD",
    paymentAccepted: "Cash, Bank Transfer",
    description:
      "KIN Estates Đà Nẵng (kinestatesdanang · kinestatesdanang.com) chuyên cho thuê và tư vấn mua bán căn hộ chung cư, studio, nhà nguyên căn, penthouse và biệt thự hồ bơi dài hạn tại tất cả 19 khu vực Đà Nẵng. Giá trực tiếp chủ nhà, kiểm định thực tế và hỗ trợ đăng ký tạm trú NA17.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Đà Nẵng",
      addressRegion: "Thành phố Đà Nẵng",
      postalCode: "550000",
      addressCountry: "VN"
    },
    geo: { "@type": "GeoCoordinates", latitude: 16.0544, longitude: 108.2022 },
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
      "Thuê nhà nguyên căn & biệt thự hồ bơi Đà Nẵng",
      "Mua bán & đầu tư căn hộ chung cư Đà Nẵng",
      "Long-term apartments, houses & villas in Da Nang",
      "The Filmore, The Panoma Sun Cosmo, Hiyori, The Monarchy, Azura",
      "Đăng ký tạm trú NA17 cho người nước ngoài"
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
    ...(reviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "5.0",
            reviewCount: String(reviews.length),
            bestRating: "5",
            worstRating: "1"
          },
          review: reviews
        }
      : {})
  };
}

function buildWebsiteSchema(origin) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    name: "KIN Estates Đà Nẵng",
    alternateName: ["kinestatesdanang", "KIN Estates", "KIN Estates Da Nang", "kinestatesdanang.com"],
    url: `${origin}/`,
    publisher: { "@id": `${origin}/#organization` },
    inLanguage: SUPPORTED_LANGS,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/apartments?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

function buildSiteNavigationSchema(origin, lang = "vi") {
  const navItems =
    lang === "vi"
      ? [
          { name: "Tất cả BĐS cho thuê Đà Nẵng", url: `${origin}/apartments` },
          { name: "Thuê Căn hộ Chung cư Đà Nẵng", url: `${origin}/property/can-ho-chung-cu` },
          { name: "Thuê Nhà Nguyên Căn Đà Nẵng", url: `${origin}/property/nha-nguyen-can` },
          { name: "Thuê Biệt Thự & Villa Hồ Bơi", url: `${origin}/property/biet-thu-villa` },
          { name: "19 Khu Vực Đà Nẵng", url: `${origin}/areas` },
          { name: "Bảng Giá & Cẩm Nang 2026", url: `${origin}/guides` },
          { name: "Về KIN Estates Đà Nẵng", url: `${origin}/about` }
        ]
      : [
          { name: "All Da Nang Residences", url: localizedUrl(origin, "/apartments", lang) },
          { name: "Da Nang Condominiums", url: localizedUrl(origin, "/property/can-ho-chung-cu", lang) },
          { name: "Whole Houses for Rent", url: localizedUrl(origin, "/property/nha-nguyen-can", lang) },
          { name: "Private Pool Villas", url: localizedUrl(origin, "/property/biet-thu-villa", lang) },
          { name: "19 Da Nang Neighborhoods", url: localizedUrl(origin, "/areas", lang) },
          { name: "2026 Price Index & Guides", url: localizedUrl(origin, "/guides", lang) },
          { name: "About KIN Estates", url: localizedUrl(origin, "/about", lang) }
        ];
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${origin}/#site-navigation`,
    name: lang === "vi" ? "Danh mục chính KIN Estates Đà Nẵng" : "KIN Estates Da Nang Primary Navigation",
    itemListElement: navItems.map((item, idx) => ({
      "@type": "SiteNavigationElement",
      position: idx + 1,
      name: item.name,
      url: item.url
    }))
  };
}

function buildBreadcrumbSchema(crumbs = []) {
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
            q: "Giá thuê căn hộ, nhà nguyên căn và biệt thự tại Đà Nẵng năm 2026 là bao nhiêu?",
            a: "Năm 2026, căn hộ Studio & 1PN tại Đà Nẵng từ 7–15 triệu/tháng ($300–$600); chung cư 2PN cao cấp (Hiyori, Monarchy, The Panoma, The Filmore) từ 16–35 triệu/tháng ($650–$1,400); nhà nguyên căn, Penthouse & biệt thự hồ bơi từ 30–85 triệu/tháng ($1,200–$3,500)."
          },
          {
            q: "KIN Estates có hỗ trợ cả cho thuê dài hạn lẫn tư vấn mua bán căn hộ, biệt thự Đà Nẵng không?",
            a: "Có. KIN Estates chuyên cho thuê dài hạn (3–12+ tháng) căn hộ, nhà nguyên căn, biệt thự và tư vấn mua bán/chuyển nhượng căn hộ sổ hồng & suất người nước ngoài (SPA) tại toàn bộ 19 khu vực Đà Nẵng."
          },
          {
            q: "Nên chọn khu vực nào khi thuê nhà ở Đà Nẵng?",
            a: "Biển Mỹ Khê & An Thượng gần biển và quán cafe quốc tế; Ven sông Hàn & Hải Châu thuận tiện di chuyển trung tâm và sân bay; Sơn Trà gần biển và thiên nhiên; Hòa Xuân, Cẩm Lệ, Nam Việt Á & FPT City yên tĩnh, rộng rãi và giá cực tốt."
          },
          {
            q: "KIN Estates có hỗ trợ khách nước ngoài đăng ký tạm trú (Form NA17) không?",
            a: "Có. Trong vòng 24 giờ sau nhận nhà, đội ngũ KIN Estates phối hợp chủ nhà hoàn tất khai báo tạm trú Công an Phường và hỗ trợ xin giấy xác nhận mẫu NA17."
          }
        ]
      : [
          {
            q: "How much does it cost to rent an apartment, house, or pool villa in Da Nang in 2026?",
            a: "In 2026, Studios and 1-bedroom apartments range from $300–$600/mo; 2-bedroom condos (Hiyori, Monarchy, The Panoma, The Filmore) range from $650–$1,450/mo; whole houses, penthouses, and private pool villas range from $1,200–$3,500/mo."
          },
          {
            q: "Does KIN Estates cover both long-term rentals and buying property in Da Nang?",
            a: "Yes. KIN Estates specializes in verified 3–12+ month rentals (apartments, houses, villas) and advisory for buying pink-book and foreigner-quota (SPA) properties across all 19 Da Nang districts."
          },
          {
            q: "Does KIN Estates assist foreigners with Form NA17 police residence registration?",
            a: "Yes. Within 24 hours of check-in, we coordinate ward police registration with the landlord and help obtain the official stamped Form NA17 needed for visa extensions and TRC."
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
  const url = localizedUrl(origin, `/apartments/${encodeURIComponent(apt.code)}`, lang);
  const matchedArea = findAreaByName(`${apt.areaName || ""} ${apt.district || ""} ${locVal(apt.title, "vi")}`);

  const amenities = [];
  if (apt.wifiIncluded) amenities.push({ "@type": "LocationFeatureSpecification", name: "High-Speed Fiber Wi-Fi", value: true });
  if (apt.electricityRate) amenities.push({ "@type": "LocationFeatureSpecification", name: `Electricity (${apt.electricityRate})`, value: true });
  if (apt.remoteWorkSetup) amenities.push({ "@type": "LocationFeatureSpecification", name: "Remote Work Desk", value: true });
  if (apt.petPolicy) amenities.push({ "@type": "LocationFeatureSpecification", name: `Pet Policy: ${apt.petPolicy}`, value: true });
  if (apt.frontageRoad) amenities.push({ "@type": "LocationFeatureSpecification", name: `Frontage Road: ${apt.frontageRoad}`, value: true });
  if (apt.poolInfo) amenities.push({ "@type": "LocationFeatureSpecification", name: `Pool & Garden: ${apt.poolInfo}`, value: true });
  if (apt.parking) amenities.push({ "@type": "LocationFeatureSpecification", name: `Parking: ${apt.parking}`, value: true });
  if (apt.furnishing) amenities.push({ "@type": "LocationFeatureSpecification", name: `Furnishing: ${apt.furnishing}`, value: true });

  const crumbs = [
    { name: "KIN Estates Đà Nẵng", url: localizedUrl(origin, "/", lang) },
    { name: lang === "vi" ? "Cho thuê căn hộ Đà Nẵng" : "Da Nang Apartments", url: localizedUrl(origin, "/apartments", lang) }
  ];
  if (matchedArea) {
    crumbs.push({
      name: lang === "vi" ? `Căn hộ ${matchedArea.vi}` : `${matchedArea.en} Rentals`,
      url: localizedUrl(origin, `/areas/${matchedArea.slug}`, lang)
    });
  }
  crumbs.push({ name: title, url });

  const schemaPropertyType =
    apt.propertyType === "villa"
      ? "SingleFamilyResidence"
      : apt.propertyType === "house"
        ? "House"
        : "Apartment";

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
        "@type": schemaPropertyType,
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
    buildBreadcrumbSchema(crumbs)
  ];
}

function buildItemListSchema(origin, apartments, lang = "vi", listTitle = "") {
  const items = (apartments || []).slice(0, 20).map((apt, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: localizedUrl(origin, `/apartments/${encodeURIComponent(apt.code)}`, lang),
    name: locVal(apt.title, lang) || apt.code
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listTitle || (lang === "vi" ? "Căn hộ, Nhà & Biệt thự cho thuê tại Đà Nẵng" : "Da Nang Apartments, Houses & Villas for Rent"),
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

function filterApartmentsForPropLanding(apartments, propObj) {
  if (!propObj?.filter) return apartments || [];
  const f = propObj.filter;
  const list = (apartments || []).filter((a) => {
    if (f.propertyType && (a.propertyType || "condo") !== f.propertyType) return false;
    if (f.bedrooms) {
      const br = Number(f.bedrooms);
      if (br >= 3 ? Number(a.bedrooms || 0) < 3 : Number(a.bedrooms || 0) !== br) return false;
    }
    if (f.tag) {
      const needle = f.tag.toLowerCase();
      const hasTag = (a.tags || []).some((t) => String(t).toLowerCase().includes(needle));
      const hay = `${locVal(a.title, "vi")} ${locVal(a.architecturalNotes, "vi")} ${a.petPolicy || ""} ${a.poolInfo || ""}`.toLowerCase();
      if (!hasTag && !hay.includes(needle)) return false;
    }
    return true;
  });
  return list.length ? list : apartments || [];
}

function propTypeSeoPhrase(propertyType, lang = "vi") {
  const pt = String(propertyType || "condo").toLowerCase();
  if (lang === "vi") {
    if (pt === "house") return "Cho thuê nhà nguyên căn";
    if (pt === "villa") return "Cho thuê biệt thự / Villa";
    if (pt === "apartment") return "Cho thuê căn hộ dịch vụ";
    if (pt === "penthouse") return "Cho thuê Penthouse";
    return "Cho thuê căn hộ chung cư";
  }
  if (pt === "house") return "Whole house for rent";
  if (pt === "villa") return "Private pool villa for rent";
  if (pt === "apartment") return "Serviced apartment for rent";
  if (pt === "penthouse") return "Luxury penthouse for rent";
  return "Condominium for rent";
}

function buildPageSeoHead({ origin, pathname, lang = "vi", apartment = null, apartments = [], about = null }) {
  const parsed = parseLocalizedPath(pathname, lang);
  const effectiveLang = parsed.hasPrefix ? parsed.lang : resolveLang(lang);
  const cleanPath = parsed.cleanPath;

  const areaMatch = cleanPath.match(/^\/areas\/([a-z0-9-]+)$/i);
  const areaObj = areaMatch ? findAreaBySlug(areaMatch[1]) : null;
  const propMatch = cleanPath.match(/^\/property\/([a-z0-9-]+)$/i);
  const propObj = propMatch ? findPropertyTypeBySlug(propMatch[1]) : null;
  const guideMatch = cleanPath.match(/^\/guides\/([a-z0-9-]+)$/i);
  const guideObj = guideMatch ? findGuideArticleBySlug(guideMatch[1]) : null;

  const canonicalUrl = localizedUrl(origin, cleanPath, effectiveLang);
  let title;
  let description;
  let keywords;
  let ogImage = toAbsoluteUrl(origin, about?.heroImage || DEFAULT_OG_IMAGE);
  let ogImageAlt = "KIN Estates Đà Nẵng — Cho thuê & mua bán căn hộ, nhà, biệt thự Đà Nẵng";
  let ogType = "website";
  const schemas = [buildLocalBusinessSchema(origin, about?.testimonials || []), buildWebsiteSchema(origin)];

  if (apartment) {
    const rawTitle = locVal(apartment.title, effectiveLang) || apartment.code;
    const matchedArea = findAreaByName(`${apartment.areaName || ""} ${apartment.district || ""} ${rawTitle}`);
    const areaDisplay =
      effectiveLang === "vi" ? matchedArea?.vi || apartment.areaName || "Đà Nẵng" : matchedArea?.en || apartment.areaName || "Da Nang";
    const vndTr = apartment.priceVnd ? (Number(apartment.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "") : "";
    const priceShort =
      effectiveLang === "vi"
        ? vndTr
          ? `${vndTr}tr/tháng`
          : `$${apartment.priceUsd}/tháng`
        : `$${apartment.priceUsd}/mo`;
    const isHouseOrVilla = apartment.propertyType === "house" || apartment.propertyType === "villa";
    const specs = [
      apartment.bedrooms ? `${apartment.bedrooms}${effectiveLang === "vi" ? "PN" : "BR"}` : "",
      apartment.landAreaM2 ? `${effectiveLang === "vi" ? "Đất " : "Land "}${apartment.landAreaM2}m²` : "",
      apartment.sizeM2 ? `${apartment.sizeM2}m²` : "",
      apartment.floor && isHouseOrVilla ? `${apartment.floor} ${effectiveLang === "vi" ? "tầng" : "floors"}` : "",
      areaDisplay
    ]
      .filter(Boolean)
      .join(" · ");

    const mentionsDaNang = /đà nẵng|da nang|danang/i.test(rawTitle);
    title = mentionsDaNang
      ? `${rawTitle} (${priceShort}) | KIN Estates`
      : `${rawTitle} (${priceShort}) — ${effectiveLang === "vi" ? "Đà Nẵng" : "Da Nang"} | KIN Estates`;

    const typeLead = propTypeSeoPhrase(apartment.propertyType, effectiveLang);
    const extraHighlight = [apartment.frontageRoad, apartment.poolInfo, apartment.furnishing].filter(Boolean)[0] || "";
    const noteSnippet = (extraHighlight ? `${extraHighlight} · ` : "") + (locVal(apartment.architecturalNotes, effectiveLang) || rawTitle);
    description =
      effectiveLang === "vi"
        ? `${typeLead} tại ${areaDisplay}, Đà Nẵng (${specs}, giá ${priceShort}) ✓ ${noteSnippet.slice(0, 84).trim()} ✓ Giá trực tiếp chủ nhà, KIN Estates →`
        : `${typeLead} in ${areaDisplay}, Da Nang (${specs}, ${priceShort}) ✓ ${noteSnippet.slice(0, 84).trim()} ✓ Direct owner pricing by KIN Estates →`;

    keywords = [
      rawTitle,
      apartment.building || "",
      `${typeLead.toLowerCase()} ${matchedArea?.vi || apartment.areaName || "Đà Nẵng"} Đà Nẵng`,
      `thuê căn hộ ${matchedArea?.vi || apartment.areaName || "Đà Nẵng"} Đà Nẵng`,
      `cho thuê nhà nguyên căn ${matchedArea?.vi || "Đà Nẵng"} Đà Nẵng`,
      apartment.bedrooms ? `thuê nhà ${apartment.bedrooms} phòng ngủ Đà Nẵng` : "",
      `apartment house villa for rent ${matchedArea?.en || "Da Nang"}`,
      apartment.code,
      "KIN Estates Đà Nẵng",
      "kinestatesdanang"
    ]
      .filter(Boolean)
      .join(", ");

    ogImage = toAbsoluteUrl(origin, apartment.images?.[0] || DEFAULT_OG_IMAGE);
    ogImageAlt = `${rawTitle} — KIN Estates Đà Nẵng`;
    ogType = "article";
    schemas.push(...buildApartmentSchema(origin, apartment, effectiveLang));
  } else if (propObj) {
    title = propObj.titles[effectiveLang] || propObj.titles.en || propObj.titles.vi;
    description = propObj.descriptions[effectiveLang] || propObj.descriptions.en || propObj.descriptions.vi;
    keywords = `${propObj.keywords[effectiveLang] || propObj.keywords.vi}, KIN Estates Đà Nẵng, kinestatesdanang`;
    ogImageAlt = title;
    const propUnits = filterApartmentsForPropLanding(apartments, propObj);
    schemas.push(
      buildBreadcrumbSchema([
        { name: "KIN Estates Đà Nẵng", url: localizedUrl(origin, "/", effectiveLang) },
        { name: effectiveLang === "vi" ? "Danh mục BĐS Đà Nẵng" : "Da Nang Properties", url: localizedUrl(origin, "/apartments", effectiveLang) },
        { name: title.split("|")[0].trim(), url: canonicalUrl }
      ]),
      buildItemListSchema(origin, propUnits, effectiveLang, title.split("|")[0].trim()),
      buildFaqSchema(effectiveLang)
    );
  } else if (guideObj) {
    title = guideObj.titles[effectiveLang] || guideObj.titles.en || guideObj.titles.vi;
    description = guideObj.descriptions[effectiveLang] || guideObj.descriptions.en || guideObj.descriptions.vi;
    keywords = `${guideObj.keywords}, KIN Estates Đà Nẵng, kinestatesdanang`;
    ogImageAlt = title;
    ogType = "article";
    schemas.push(
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        image: [ogImage],
        datePublished: guideObj.datePublished,
        dateModified: guideObj.dateModified,
        author: { "@id": `${origin}/#organization` },
        publisher: { "@id": `${origin}/#organization` },
        mainEntityOfPage: canonicalUrl,
        inLanguage: effectiveLang
      },
      buildBreadcrumbSchema([
        { name: "KIN Estates Đà Nẵng", url: localizedUrl(origin, "/", effectiveLang) },
        { name: effectiveLang === "vi" ? "Cẩm nang & Bảng giá" : "Da Nang Guides", url: localizedUrl(origin, "/guides", effectiveLang) },
        { name: title.split("|")[0].trim(), url: canonicalUrl }
      ]),
      buildFaqSchema(effectiveLang)
    );
  } else if (areaObj) {
    const meta = buildAreaSeoMeta(areaObj, effectiveLang);
    title = meta.title;
    description = meta.description;
    keywords = meta.keywords;
    ogImageAlt = title;
    const areaUnits = filterApartmentsForArea(apartments, areaObj);
    schemas.push(
      buildBreadcrumbSchema([
        { name: "KIN Estates Đà Nẵng", url: localizedUrl(origin, "/", effectiveLang) },
        { name: effectiveLang === "vi" ? "Khu vực Đà Nẵng" : "Da Nang Neighborhoods", url: localizedUrl(origin, "/areas", effectiveLang) },
        { name: effectiveLang === "vi" ? `Thuê căn hộ ${areaObj.vi}` : `${areaObj.en} Rentals`, url: canonicalUrl }
      ]),
      buildItemListSchema(
        origin,
        areaUnits.length ? areaUnits : apartments,
        effectiveLang,
        effectiveLang === "vi" ? `Căn hộ & Nhà cho thuê tại ${areaObj.vi}, Đà Nẵng` : `Apartments & Villas in ${areaObj.en}, Da Nang`
      ),
      buildFaqSchema(effectiveLang)
    );
  } else {
    const routePack = ROUTE_META[cleanPath] || ROUTE_META["/"];
    const meta = routePack[effectiveLang] || routePack.en || routePack.vi;
    title = meta.title;
    description = meta.description;
    keywords = meta.keywords;
    ogImageAlt = title;

    if (cleanPath === "/") {
      schemas.push(buildSiteNavigationSchema(origin, effectiveLang));
    }
    if (cleanPath !== "/") {
      schemas.push(
        buildBreadcrumbSchema([
          { name: "KIN Estates Đà Nẵng", url: localizedUrl(origin, "/", effectiveLang) },
          { name: title.split("|")[0].trim(), url: canonicalUrl }
        ])
      );
    }
    if (cleanPath === "/" || cleanPath === "/apartments") {
      schemas.push(buildItemListSchema(origin, apartments, effectiveLang));
    }
    if (cleanPath === "/" || cleanPath === "/how-to-rent" || cleanPath === "/guides") {
      schemas.push(buildFaqSchema(effectiveLang));
    }
  }

  const ogLocaleMap = { vi: "vi_VN", en: "en_US", zh: "zh_CN", ru: "ru_RU", ko: "ko_KR", ja: "ja_JP" };
  const currentOgLocale = ogLocaleMap[effectiveLang] || "vi_VN";
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
    `<link rel="alternate" type="application/rss+xml" title="KIN Estates Đà Nẵng — Kho BĐS Mới Nhất" href="${escapeHtml(origin)}/rss.xml" />`,
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

  return { title, description, seoBlock, lang: effectiveLang, cleanPath };
}

function buildSsrRootMarkup({ origin, pathname, lang = "vi", apartment = null, apartments = [], about = null }) {
  const parsed = parseLocalizedPath(pathname, lang);
  const effectiveLang = parsed.hasPrefix ? parsed.lang : resolveLang(lang);
  const cleanPath = parsed.cleanPath;

  const areaMatch = cleanPath.match(/^\/areas\/([a-z0-9-]+)$/i);
  const areaObj = areaMatch ? findAreaBySlug(areaMatch[1]) : null;
  const propMatch = cleanPath.match(/^\/property\/([a-z0-9-]+)$/i);
  const propObj = propMatch ? findPropertyTypeBySlug(propMatch[1]) : null;
  const guideMatch = cleanPath.match(/^\/guides\/([a-z0-9-]+)$/i);
  const guideObj = guideMatch ? findGuideArticleBySlug(guideMatch[1]) : null;

  const areaNavLinks = DANANG_SEO_AREAS.map(
    (a) => `<a href="${escapeHtml(localizedUrl(origin, `/areas/${a.slug}`, effectiveLang))}">${escapeHtml(effectiveLang === "vi" ? `Thuê căn hộ ${a.vi}` : `${a.en} Rentals`)}</a>`
  ).join(" · ");

  const propNavLinks = PROPERTY_TYPE_LANDINGS.map(
    (p) => `<a href="${escapeHtml(localizedUrl(origin, `/property/${p.slug}`, effectiveLang))}">${escapeHtml((p.titles[effectiveLang] || p.titles.en).split("|")[0].trim())}</a>`
  ).join(" · ");

  const guideNavLinks = SEO_GUIDE_ARTICLES.map(
    (g) => `<li><a href="${escapeHtml(localizedUrl(origin, `/guides/${g.slug}`, effectiveLang))}">${escapeHtml((g.titles[effectiveLang] || g.titles.en).split("|")[0].trim())}</a></li>`
  ).join("");

  const langNavLinks = SUPPORTED_LANGS.map(
    (l) => `<a href="${escapeHtml(localizedUrl(origin, cleanPath, l))}">${l.toUpperCase()}</a>`
  ).join(" · ");

  if (guideObj) {
    const secs = guideObj.sections[effectiveLang] || guideObj.sections.en || guideObj.sections.vi;
    const h1 = (guideObj.titles[effectiveLang] || guideObj.titles.en).split("|")[0].trim();
    const secHtml = secs.map((s) => `<section><h2>${escapeHtml(s.h2)}</h2><p>${escapeHtml(s.p)}</p></section>`).join("");
    return (
      `<main style="max-width:960px;margin:24px auto;padding:0 16px;font-family:sans-serif;color:#14191f">` +
      `<nav><a href="${escapeHtml(localizedUrl(origin, "/", effectiveLang))}">KIN Estates Đà Nẵng</a> / <a href="${escapeHtml(localizedUrl(origin, "/guides", effectiveLang))}">${effectiveLang === "vi" ? "Cẩm nang & Bảng giá" : "Guides"}</a></nav>` +
      `<article><h1>${escapeHtml(h1)}</h1>${secHtml}</article>` +
      `<section><h2>${effectiveLang === "vi" ? "Danh mục bất động sản Đà Nẵng" : "Explore Da Nang Properties"}</h2><p>${propNavLinks}</p></section>` +
      `<section><h2>${effectiveLang === "vi" ? "19 Khu vực Đà Nẵng" : "19 Da Nang Neighborhoods"}</h2><p>${areaNavLinks}</p></section>` +
      `</main>`
    );
  }

  if (apartment) {
    const t = locVal(apartment.title, effectiveLang) || apartment.code;
    const desc = locVal(apartment.architecturalNotes, effectiveLang) || "";
    const matchedArea = findAreaByName(`${apartment.areaName || ""} ${apartment.district || ""} ${t}`);
    const priceVnd = apartment.priceVnd
      ? `${(Number(apartment.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "")} triệu VNĐ/tháng`
      : "";
    return (
      `<main style="max-width:960px;margin:24px auto;padding:0 16px;font-family:sans-serif;color:#14191f">` +
      `<nav><a href="${escapeHtml(localizedUrl(origin, "/", effectiveLang))}">KIN Estates Đà Nẵng</a> / <a href="${escapeHtml(localizedUrl(origin, "/apartments", effectiveLang))}">${effectiveLang === "vi" ? "Cho thuê căn hộ Đà Nẵng" : "Da Nang Apartments"}</a>` +
      (matchedArea ? ` / <a href="${escapeHtml(localizedUrl(origin, `/areas/${matchedArea.slug}`, effectiveLang))}">${escapeHtml(effectiveLang === "vi" ? `Căn hộ ${matchedArea.vi}` : matchedArea.en)}</a>` : "") +
      `</nav>` +
      `<h1>${escapeHtml(t)} — ${escapeHtml(effectiveLang === "vi" ? `Cho Thuê Căn Hộ ${matchedArea?.vi || apartment.areaName || "Đà Nẵng"}` : `Da Nang Apartment for Rent (${matchedArea?.en || apartment.areaName || "Da Nang"})`)}</h1>` +
      `<p><strong>${escapeHtml(priceVnd)} ($${escapeHtml(apartment.priceUsd)}/month)</strong> · ${escapeHtml(apartment.bedrooms ?? 1)} ${effectiveLang === "vi" ? "phòng ngủ" : "BR"} · ${escapeHtml(apartment.sizeM2 ?? "-")} m² · ${escapeHtml(apartment.areaName || "Đà Nẵng")}</p>` +
      `<p>${escapeHtml(apartment.address || apartment.building || "Đà Nẵng, Việt Nam")}</p>` +
      `<p>${escapeHtml(desc)}</p>` +
      `<p>KIN Estates Đà Nẵng (kinestatesdanang.com): Zalo / WhatsApp +84 389 711 601 · Telegram @KIN_Estates.</p>` +
      `<footer><p>${propNavLinks}</p><p>${areaNavLinks}</p></footer>` +
      `</main>`
    );
  }

  const avail = (apartments || []).filter((a) => a.status === "Available" && a.isVisible !== false);
  const displayUnits = areaObj
    ? filterApartmentsForArea(avail, areaObj)
    : propObj
      ? filterApartmentsForPropLanding(avail, propObj)
      : avail;
  const unitsToRender = (displayUnits.length ? displayUnits : avail).slice(0, 20);

  const aptLinks = unitsToRender
    .map((a) => {
      const t = locVal(a.title, effectiveLang) || a.code;
      const vndTr = a.priceVnd ? `${(Number(a.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "")}tr/tháng` : "";
      const pLabel = effectiveLang === "vi" && vndTr ? vndTr : `$${escapeHtml(a.priceUsd)}/mo`;
      return `<li><a href="${escapeHtml(localizedUrl(origin, `/apartments/${encodeURIComponent(a.code)}`, effectiveLang))}">${escapeHtml(t)} — ${escapeHtml(pLabel)} (${escapeHtml(a.bedrooms ?? 1)}${effectiveLang === "vi" ? "PN" : "BR"} · ${escapeHtml(a.areaName || "Đà Nẵng")})</a></li>`;
    })
    .join("");

  const heading = propObj
    ? propObj.h1[effectiveLang] || propObj.h1.en
    : areaObj
      ? effectiveLang === "vi"
        ? `Cho Thuê Căn Hộ, Nhà Nguyên Căn & Biệt Thự ${areaObj.vi} Đà Nẵng | KIN Estates`
        : `Apartments, Houses & Villas for Rent in ${areaObj.en}, Da Nang | KIN Estates`
      : (ROUTE_META[cleanPath]?.[effectiveLang] || ROUTE_META["/"][effectiveLang] || ROUTE_META["/"].en).title;

  return (
    `<main style="max-width:1040px;margin:24px auto;padding:0 16px;font-family:sans-serif;color:#14191f">` +
    `<header><nav>` +
    `<a href="${escapeHtml(localizedUrl(origin, "/", effectiveLang))}">KIN Estates Đà Nẵng (kinestatesdanang)</a> · ` +
    `<a href="${escapeHtml(localizedUrl(origin, "/apartments", effectiveLang))}">${effectiveLang === "vi" ? "Căn hộ & Biệt thự" : "Residences"}</a> · ` +
    `<a href="${escapeHtml(localizedUrl(origin, "/areas", effectiveLang))}">${effectiveLang === "vi" ? "19 Khu vực" : "19 Areas"}</a> · ` +
    `<a href="${escapeHtml(localizedUrl(origin, "/guides", effectiveLang))}">${effectiveLang === "vi" ? "Cẩm nang & Bảng giá" : "Guides"}</a> · ` +
    `<a href="${escapeHtml(localizedUrl(origin, "/how-to-rent", effectiveLang))}">${effectiveLang === "vi" ? "Quy trình & NA17" : "How to Rent"}</a> · ` +
    `<a href="${escapeHtml(localizedUrl(origin, "/about", effectiveLang))}">${effectiveLang === "vi" ? "Về KIN Estates" : "About"}</a> | ${langNavLinks}` +
    `</nav></header>` +
    `<h1>${escapeHtml(heading)}</h1>` +
    `<p><strong>KIN Estates Đà Nẵng (kinestatesdanang · kinestatesdanang.com)</strong> — ${escapeHtml(effectiveLang === "vi" ? "Đơn vị chuyên cho thuê dài hạn (3–12+ tháng) & tư vấn mua bán căn hộ chung cư, căn hộ dịch vụ, studio, nhà nguyên căn, penthouse và biệt thự hồ bơi tại 19 khu vực Đà Nẵng. Giá trực tiếp chủ nhà, dẫn xem thực tế & hỗ trợ đăng ký tạm trú NA17. Hotline Zalo/WhatsApp: 0389 711 601 · Telegram: @KIN_Estates." : "Premier long-term apartment, house, pool villa rental & real estate buying advisory across all 19 districts of Da Nang, Vietnam (kinestatesdanang · kinestatesdanang.com). Direct owner pricing, verified inspections & Form NA17 residence registration. WhatsApp/Zalo: +84 389 711 601 · Telegram: @KIN_Estates.")}</p>` +
    (aptLinks ? `<section><h2>${escapeHtml(effectiveLang === "vi" ? "Căn hộ, Nhà nguyên căn & Biệt thự đang trống tại Đà Nẵng" : "Available Residences in Da Nang")}</h2><ul>${aptLinks}</ul></section>` : "") +
    `<section><h2>${escapeHtml(effectiveLang === "vi" ? "Tìm theo loại hình (Thuê & Mua bán)" : "Browse by Property Type (Rent & Buy)")}</h2><p>${propNavLinks}</p></section>` +
    `<section><h2>${escapeHtml(effectiveLang === "vi" ? "Tìm theo 19 khu vực Đà Nẵng" : "Browse 19 Da Nang Neighborhoods")}</h2><p>${areaNavLinks}</p></section>` +
    `<section><h2>${escapeHtml(effectiveLang === "vi" ? "Cẩm nang bất động sản Đà Nẵng 2026" : "Da Nang Real Estate & Rental Guides 2026")}</h2><ul>${guideNavLinks}</ul></section>` +
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
    "# AI Search & Answer Engines (GEO)",
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
    `Sitemap: ${origin}/rss.xml`,
    ""
  ].join("\n");
}

function generateSitemapXml(origin, apartments = []) {
  const today = new Date().toISOString().slice(0, 10);

  const altLinks = (cleanPath) => {
    const rows = [
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(localizedUrl(origin, cleanPath, "vi"))}" />`,
      `    <xhtml:link rel="alternate" hreflang="vi" href="${escapeXml(localizedUrl(origin, cleanPath, "vi"))}" />`
    ];
    for (const l of NON_DEFAULT_LANGS) {
      rows.push(`    <xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(localizedUrl(origin, cleanPath, l))}" />`);
    }
    return rows.join("\n");
  };

  const urlBlocks = [];
  const pushUrl = (loc, cleanPath, priority, changefreq, lastmod = today, extra = "") => {
    urlBlocks.push(
      `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n${altLinks(cleanPath)}${extra}\n  </url>`
    );
  };

  // 1. Core Pages (Vietnamese Default)
  const staticPages = [
    { path: "/", priority: "1.0", changefreq: "daily" },
    { path: "/apartments", priority: "0.95", changefreq: "daily" },
    { path: "/areas", priority: "0.90", changefreq: "weekly" },
    { path: "/guides", priority: "0.90", changefreq: "weekly" },
    { path: "/how-to-rent", priority: "0.85", changefreq: "monthly" },
    { path: "/about", priority: "0.82", changefreq: "weekly" },
    { path: "/privacy-policy", priority: "0.40", changefreq: "yearly" }
  ];
  for (const page of staticPages) {
    pushUrl(localizedUrl(origin, page.path, "vi"), page.path, page.priority, page.changefreq);
  }

  // 2. International Localized Hub Pages (/en, /ko, /zh, /ru, /ja + core hubs)
  for (const l of NON_DEFAULT_LANGS) {
    pushUrl(localizedUrl(origin, "/", l), "/", "0.95", "daily");
    pushUrl(localizedUrl(origin, "/apartments", l), "/apartments", "0.90", "daily");
    pushUrl(localizedUrl(origin, "/areas", l), "/areas", "0.85", "weekly");
    pushUrl(localizedUrl(origin, "/guides", l), "/guides", "0.85", "weekly");
    pushUrl(localizedUrl(origin, "/how-to-rent", l), "/how-to-rent", "0.82", "monthly");
    pushUrl(localizedUrl(origin, "/about", l), "/about", "0.80", "weekly");
  }

  // 3. 14 Property Type & Buy/Rent Landing Pages (/property/:slug + /en + /ko)
  for (const prop of PROPERTY_TYPE_LANDINGS) {
    const p = `/property/${prop.slug}`;
    pushUrl(localizedUrl(origin, p, "vi"), p, "0.94", "daily");
    pushUrl(localizedUrl(origin, p, "en"), p, "0.88", "daily");
    pushUrl(localizedUrl(origin, p, "ko"), p, "0.86", "daily");
  }

  // 4. 19 Da Nang Neighborhood Landing Pages (/areas/:slug + /en + /ko)
  for (const areaObj of DANANG_SEO_AREAS) {
    const p = `/areas/${areaObj.slug}`;
    pushUrl(localizedUrl(origin, p, "vi"), p, "0.90", "daily");
    pushUrl(localizedUrl(origin, p, "en"), p, "0.86", "daily");
    pushUrl(localizedUrl(origin, p, "ko"), p, "0.84", "daily");
  }

  // 5. 6 Deep Pillar SEO Articles (/guides/:slug + /en)
  for (const g of SEO_GUIDE_ARTICLES) {
    const p = `/guides/${g.slug}`;
    pushUrl(localizedUrl(origin, p, "vi"), p, "0.90", "weekly", g.dateModified || today);
    pushUrl(localizedUrl(origin, p, "en"), p, "0.86", "weekly", g.dateModified || today);
  }

  // 6. All Live Public Residences (/apartments/:code) with Image Sitemap tags & Pinned Priority
  for (const apt of apartments || []) {
    if (!apt?.code || apt.isVisible === false || apt.status === "Hidden") continue;
    const aptPath = `/apartments/${encodeURIComponent(apt.code)}`;
    const lastmod = String(apt.boostedAt || apt.updatedAt || apt.createdAt || today).slice(0, 10);
    const prio = apt.isPinned && apt.status === "Available" ? "0.98" : apt.status === "Available" ? "0.94" : "0.78";
    const imgTags = (apt.images || [])
      .slice(0, 6)
      .map((img) => {
        const absImg = toAbsoluteUrl(origin, img);
        return `\n    <image:image>\n      <image:loc>${escapeXml(absImg)}</image:loc>\n      <image:title>${escapeXml(locVal(apt.title, "vi") || apt.code)}</image:title>\n    </image:image>`;
      })
      .join("");
    pushUrl(localizedUrl(origin, aptPath, "vi"), aptPath, prio, "daily", lastmod, imgTags);
    pushUrl(localizedUrl(origin, aptPath, "en"), aptPath, "0.88", "daily", lastmod);
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

function generateRssFeedXml(origin, apartments = []) {
  const visibleApts = (apartments || [])
    .filter((a) => a?.code && a.isVisible !== false && a.status !== "Hidden")
    .sort((a, b) => {
      const aPin = Boolean(a.isPinned) && a.status === "Available" ? 1 : 0;
      const bPin = Boolean(b.isPinned) && b.status === "Available" ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const aTime = Date.parse(a.boostedAt || a.updatedAt || a.createdAt || 0) || 0;
      const bTime = Date.parse(b.boostedAt || b.updatedAt || b.createdAt || 0) || 0;
      return bTime - aTime;
    });

  const nowRfc = new Date().toUTCString();
  const items = [];

  for (const apt of visibleApts.slice(0, 50)) {
    const codeUrl = `${origin}/apartments/${encodeURIComponent(apt.code)}`;
    const titleVi = locVal(apt.title, "vi") || apt.code;
    const leadPhrase = propTypeSeoPhrase(apt.propertyType, "vi");
    const vndTr = apt.priceVnd ? (Number(apt.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "") : "";
    const priceLabel = vndTr ? `${vndTr}tr/tháng` : apt.priceUsd ? `$${apt.priceUsd}/tháng` : "";
    const matchedArea = findAreaByName(`${apt.areaName || ""} ${apt.district || ""} ${titleVi}`);
    const areaLabel = matchedArea?.vi || apt.areaName || "Đà Nẵng";
    const pubTime = Date.parse(apt.boostedAt || apt.updatedAt || apt.createdAt || Date.now());
    const pubDate = Number.isFinite(pubTime) ? new Date(pubTime).toUTCString() : nowRfc;
    const notesVi = locVal(apt.architecturalNotes, "vi");
    const cover = apt.images?.[0] ? toAbsoluteUrl(origin, apt.images[0]) : "";
    const specText = [
      priceLabel ? `Giá: ${priceLabel}` : "",
      apt.bedrooms != null ? `${apt.bedrooms}PN` : "",
      apt.bathrooms != null ? `${apt.bathrooms}WC` : "",
      apt.landAreaM2 ? `Đất ${apt.landAreaM2}m²` : "",
      apt.sizeM2 ? `${apt.sizeM2}m²` : "",
      apt.frontageRoad || "",
      apt.poolInfo || ""
    ]
      .filter(Boolean)
      .join(" · ");
    const desc = `${leadPhrase} tại ${areaLabel}, Đà Nẵng (${titleVi}). ${specText}. ${notesVi || "Giá trực tiếp chủ nhà, hỗ trợ xem nhà thực tế & tạm trú NA17."}`.slice(0, 600);

    items.push(
      [
        "    <item>",
        `      <title>${escapeXml(`${titleVi}${priceLabel ? ` (${priceLabel})` : ""} — ${areaLabel}, Đà Nẵng | KIN Estates`)}</title>`,
        `      <link>${escapeXml(codeUrl)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(codeUrl)}</guid>`,
        `      <pubDate>${escapeXml(pubDate)}</pubDate>`,
        `      <category>${escapeXml(leadPhrase)}</category>`,
        `      <description>${escapeXml(desc)}</description>`,
        cover ? `      <enclosure url="${escapeXml(cover)}" type="image/jpeg" length="0" />` : "",
        "    </item>"
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  for (const g of SEO_GUIDE_ARTICLES) {
    const gUrl = `${origin}/guides/${g.slug}`;
    const gDate = g.dateModified ? new Date(g.dateModified).toUTCString() : nowRfc;
    items.push(
      [
        "    <item>",
        `      <title>${escapeXml(g.titles.vi)}</title>`,
        `      <link>${escapeXml(gUrl)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(gUrl)}</guid>`,
        `      <pubDate>${escapeXml(gDate)}</pubDate>`,
        "      <category>Cẩm nang BĐS Đà Nẵng</category>",
        `      <description>${escapeXml(g.descriptions.vi)}</description>`,
        "    </item>"
      ].join("\n")
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>KIN Estates Đà Nẵng — Cho Thuê Căn Hộ, Nhà Nguyên Căn &amp; Biệt Thự Đà Nẵng</title>",
    `    <link>${escapeXml(origin)}/</link>`,
    "    <description>Cập nhật căn hộ chung cư, căn hộ dịch vụ, nhà nguyên căn, biệt thự hồ bơi &amp; penthouse cho thuê dài hạn mới nhất tại 19 khu vực Đà Nẵng — KIN Estates (kinestatesdanang.com).</description>",
    "    <language>vi-vn</language>",
    `    <lastBuildDate>${escapeXml(nowRfc)}</lastBuildDate>`,
    '    <atom:link href="https://pubsubhubbub.appspot.com/" rel="hub" />',
    `    <atom:link href="${escapeXml(origin)}/rss.xml" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    ""
  ].join("\n");
}

function generateLlmsTxt(origin, apartments = []) {
  const avail = (apartments || []).filter((a) => a.status === "Available" && a.isVisible !== false);
  const pricesUsd = avail.map((a) => Number(a.priceUsd || 0)).filter((n) => n > 0);
  const minUsd = pricesUsd.length ? Math.min(...pricesUsd) : 300;
  const maxUsd = pricesUsd.length ? Math.max(...pricesUsd) : 3500;

  const lines = [
    "# KIN Estates Đà Nẵng (kinestatesdanang.com) — Hệ Sinh Thái Cho Thuê & Mua Bán Căn Hộ, Nhà Nguyên Căn, Penthouse & Biệt Thự Đà Nẵng",
    "",
    "> **KIN Estates Đà Nẵng** (`https://www.kinestatesdanang.com`) là đơn vị tư vấn, vận hành và cho thuê bất động sản dài hạn (3–12+ tháng) kết hợp mua bán – ký gửi căn hộ chung cư cao cấp, căn hộ dịch vụ, studio, nhà nguyên căn, sky penthouse và biệt thự hồ bơi riêng uy tín hàng đầu tại toàn bộ 19 khu vực Thành phố Đà Nẵng, Việt Nam.",
    "",
    "## 1. Hồ Sơ Thương Hiệu Chuẩn Xác Thực (Official Entity & NAP Profile)",
    `- Tên thương hiệu chính thức: KIN Estates Đà Nẵng — Cho Thuê & Mua Bán Căn Hộ, Nhà Nguyên Căn, Biệt Thự Đà Nẵng`,
    `- Tên thương hiệu quốc tế: KIN Estates Da Nang — Verified Apartments, Houses, Penthouses & Private Pool Villas`,
    `- Định danh tìm kiếm: KIN Estates, KIN Estates Đà Nẵng, KIN Estates Da Nang, kinestatesdanang, kinestatesdanang.com`,
    `- Website gốc (Canonical Root): ${origin}`,
    `- Danh mục BĐS trực tuyến: ${origin}/apartments`,
    `- Bản đồ 19 Khu vực Đà Nẵng: ${origin}/areas`,
    `- Cẩm nang & Bảng giá BĐS Đà Nẵng 2026: ${origin}/guides`,
    `- Quy trình thuê nhà & Đăng ký tạm trú NA17: ${origin}/how-to-rent`,
    `- Sơ đồ trang web & RSS thời gian thực: ${origin}/sitemap.xml | ${origin}/rss.xml`,
    `- Cổng ngôn ngữ quốc tế: ${NON_DEFAULT_LANGS.map((l) => `${origin}/${l}`).join(" | ")}`,
    `- Kho sản phẩm đang mở: ${avail.length} bất động sản đã kiểm duyệt thực tế ($${minUsd}–$${maxUsd}/tháng | ~7 triệu – 85 triệu VNĐ/tháng)`,
    "- Hotline / Zalo / WhatsApp trực tiếp: 0389 711 601 (+84 389 711 601)",
    "- Telegram tư vấn: https://t.me/KIN_Estates (@KIN_Estates)",
    "- Địa bàn hoạt động: Thành phố Đà Nẵng, Việt Nam (Hải Châu, Sơn Trà, Ngũ Hành Sơn, Cẩm Lệ, Thanh Khê, Liên Chiểu, Hòa Vang)",
    "",
    "## 2. Giá Trị Cốt Lõi & Tiêu Chuẩn Kiểm Duyệt Bất Động Sản Của KIN Estates",
    "- **0% Phí Môi Giới Đối Với Khách Thuê (Zero Tenant Commission)**: Khách tìm thuê căn hộ, nhà nguyên căn hoặc biệt thự qua KIN Estates được tư vấn, chọn lọc danh sách căn phù hợp và dẫn đi xem nhà trực tiếp (hoặc quay video thực tế 4K theo thời gian thực) hoàn toàn miễn phí.",
    "- **100% Hình Ảnh & Giá Trực Tiếp Chủ Nhà**: Không đăng tin ảo, không kê giá thuê. Mọi bất động sản trên `kinestatesdanang.com` đều được đội ngũ KIN Estates khảo sát thực tế về ánh sáng tự nhiên, độ cách âm, bàn làm việc từ xa (Remote Work), tốc độ cáp quang Wi-Fi, nội thất và tình trạng kỹ thuật trước khi bàn giao.",
    "- **Minh Bạch Đơn Giá Điện Nước EVN & Chi Phí Vận Hành**: Ghi rõ đơn giá điện nhà nước EVN (~2.800đ/kWh tại các tòa chung cư thương mại, nhà phố, biệt thự) hoặc biểu giá niêm yết rõ ràng tại các tòa căn hộ dịch vụ, phí quản lý tòa nhà, phí gửi ô tô/xe máy và chính sách nuôi thú cưng (Pet-friendly).",
    "- **Hợp Đồng Pháp Lý Song Ngữ Việt – Anh & Hỗ Trợ Tạm Trú Mẫu NA17**: Ký kết hợp đồng trực tiếp với chủ sở hữu hợp pháp, lập biên bản bàn giao tài sản kèm hình ảnh chi tiết và hỗ trợ khai báo tạm trú Công an Phường / xác nhận Mẫu NA17 trong vòng 24 giờ cho chuyên gia và khách nước ngoài (gia hạn Visa, làm thẻ tạm trú TRC).",
    "",
    "## 3. Năm Phân Khúc Bất Động Sản Chủ Lực Tại Đà Nẵng & Bảng Giá Tham Chiếu 2026",
    "1. **Căn hộ chung cư thương mại cao cấp (Luxury Condos)**: Tập trung tại The Filmore Da Nang, The Panoma 1 & 2 (Sun Cosmo Residence), Sun Ponte Residence, Hiyori Garden Tower, The Monarchy, Azura, Indochina Riverside, Blooming Tower, FPT Plaza 1-2-3, The Ori Garden. Tiện ích hồ bơi vô cực, phòng gym, lễ tân bảo vệ 24/7, hầm đỗ ô tô, sổ hồng pháp lý chuẩn. Giá thuê: 13 – 38 triệu VNĐ/tháng ($520 – $1,500/tháng). Xem tại: " + `${origin}/property/can-ho-chung-cu`,
    "2. **Căn hộ dịch vụ, Căn hộ thường & Studio gần biển (Serviced Apartments & Studios)**: Phổ biến tại khu phố Tây An Thượng, biển Mỹ Khê, Phước Mỹ, Mỹ An, Sơn Trà, Hải Châu. Đầy đủ nội thất, máy giặt riêng, Wi-Fi tốc độ cao, miễn phí dọn phòng 1–2 lần/tuần, hợp đồng linh hoạt 3–12 tháng. Giá thuê: 7 – 16 triệu VNĐ/tháng ($280 – $650/tháng). Xem tại: " + `${origin}/property/can-ho-thuong`,
    "3. **Nhà nguyên căn & Nhà phố Đà Nẵng (Whole Houses & Townhouses)**: Nhà phố 2–4 tầng hiện đại, đường ô tô 5.5m – 10.5m, sân để xe riêng, điện nước giá nhà nước EVN tại Hòa Xuân, Cẩm Lệ, Hải Châu, Nam Việt Á, Khuê Mỹ, Thanh Khê, Liên Chiểu. Phù hợp gia đình, nhóm chuyên gia hoặc vừa ở vừa làm văn phòng/studio. Giá thuê: 15 – 40 triệu VNĐ/tháng ($600 – $1,600/tháng). Xem tại: " + `${origin}/property/nha-nguyen-can`,
    "4. **Biệt thự nghỉ dưỡng & Villa hồ bơi riêng (Private Pool Villas)**: Khu biệt thự đảo xanh Euro Village 1 & 2, Đảo VIP Hòa Xuân, Nam Việt Á ven sông, Sơn Trà và trục biển Võ Nguyên Giáp – Trường Sa. Diện tích đất 180–500m², 3–6 phòng ngủ khép kín, hồ bơi riêng muối khoáng, sân vườn BBQ và gara ô tô. Giá thuê: 35 – 90+ triệu VNĐ/tháng ($1,400 – $3,600+/tháng). Xem tại: " + `${origin}/property/biet-thu-villa`,
    "5. **Sky Penthouse, Mua Bán Sổ Hồng/Suất Ngoại Quốc (SPA) & Ký Gửi BĐS**: Tư vấn thuê Penthouse thông tầng panorama sông Hàn – biển Mỹ Khê, chuyển nhượng căn hộ chung cư/nhà đất pháp lý sạch và nhận ký gửi bất động sản từ chủ nhà tại Đà Nẵng. Xem tại: " + `${origin}/property/penthouse` + ` | ${origin}/property/mua-ban-nha-dat | ${origin}/property/ky-gui-cho-thue-nha-da-nang`,
    "",
    "## 4. Hệ Thống 14 Chuyên Trang Danh Mục & Nhu Cầu Chuyên Biệt (Canonical Category Hubs)",
    ...PROPERTY_TYPE_LANDINGS.map((p) => `- **${p.titles.vi.split("|")[0].trim()}** (${p.titles.en.split("|")[0].trim()}): ${origin}/property/${p.slug} — ${p.descriptions.vi}`),
    "",
    "## 5. Bản Đồ 19 Khu Vực & Quận Phường Trọng Điểm Tại Đà Nẵng (Neighborhood Hubs)",
    ...DANANG_SEO_AREAS.map((a) => `- **${a.vi}** (${a.en} · ${a.district}): ${origin}/areas/${a.slug} — ${a.descVi}`),
    "",
    "## 6. Cẩm Nang Phân Tích Thị Trường, Pháp Lý & Chi Phí Sống Đà Nẵng 2026",
    ...SEO_GUIDE_ARTICLES.map((g) => `- **${g.titles.vi.split("|")[0].trim()}**: ${origin}/guides/${g.slug} — ${g.descriptions.vi}`),
    "",
    "## 7. Danh Sách Chi Tiết Các Bất Động Sản Đang Mở Cho Thuê Thực Tế (Live Verified Inventory)"
  ];

  for (const apt of avail.slice(0, 80)) {
    const tVi = locVal(apt.title, "vi") || apt.code;
    const tEn = locVal(apt.title, "en") || tVi;
    const typePhrase = propTypeSeoPhrase(apt.propertyType, "vi");
    const vndTr = apt.priceVnd ? (Number(apt.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "") : "";
    const priceStr = `${vndTr ? `${vndTr} triệu VNĐ/tháng (~$${apt.priceUsd}/mo)` : `$${apt.priceUsd}/tháng`}`;
    const detailSpecs = [
      apt.bedrooms != null ? `${apt.bedrooms} phòng ngủ` : "",
      apt.bathrooms != null ? `${apt.bathrooms} WC` : "",
      apt.landAreaM2 ? `DT đất ${apt.landAreaM2}m²` : "",
      apt.sizeM2 ? `DT sử dụng ${apt.sizeM2}m²` : "",
      apt.floor != null ? (apt.propertyType === "house" || apt.propertyType === "villa" ? `${apt.floor} tầng` : `Tầng ${apt.floor}`) : "",
      apt.frontageRoad || "",
      apt.poolInfo || "",
      apt.furnishing || "",
      apt.parking || "",
      apt.electricityRate ? `Điện: ${apt.electricityRate}` : "",
      apt.petPolicy ? `Thú cưng: ${apt.petPolicy}` : ""
    ].filter(Boolean).join(" · ");
    const descVi = String(locVal(apt.architecturalNotes, "vi") || "").replace(/\s+/g, " ").trim();
    lines.push(
      `### [${apt.code}] ${tVi}${tEn && tEn !== tVi ? ` / ${tEn}` : ""}`,
      `- Phân loại: ${typePhrase} | Khu vực: ${apt.address || apt.areaName || "Đà Nẵng"} (${apt.building || "KIN Estates"})`,
      `- Giá thuê niêm yết: ${priceStr} | Hợp đồng tối thiểu: ${apt.minLeaseMonths || 6} tháng (Cọc ${apt.depositMonths || 1} tháng)`,
      `- Thông số kỹ thuật: ${detailSpecs}`,
      descVi ? `- Mô tả thực tế: ${descVi}` : "",
      `- Link chi tiết chính thức (Canonical URL): ${origin}/apartments/${encodeURIComponent(apt.code)}`,
      ""
    );
  }

  return lines.filter((l) => l !== undefined).join("\n") + "\n";
}

module.exports = {
  SUPPORTED_LANGS,
  NON_DEFAULT_LANGS,
  DANANG_SEO_AREAS,
  PROPERTY_TYPE_LANDINGS,
  SEO_GUIDE_ARTICLES,
  findAreaBySlug,
  findAreaByName,
  findPropertyTypeBySlug,
  findGuideArticleBySlug,
  parseLocalizedPath,
  localizedUrl,
  getSiteOrigin,
  resolveLang,
  buildPageSeoHead,
  buildSsrRootMarkup,
  injectSeoIntoHtml,
  generateRobotsTxt,
  generateSitemapXml,
  generateRssFeedXml,
  generateLlmsTxt
};
