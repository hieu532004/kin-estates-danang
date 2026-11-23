const SUPPORTED_LANGS = ["vi", "en", "zh", "ru", "ko", "ja"];
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
      title: "KIN Estates — Thuê Căn Hộ Đà Nẵng Dài Hạn Tuyển Chọn (Mỹ Khê, An Thượng, Sông Hàn)",
      description: "Cho thuê căn hộ chung cư, penthouse & biệt thự dài hạn (3–12+ tháng) tại Đà Nẵng. Kiểm định thực tế ánh sáng, độ ồn, điện giá EVN, hợp đồng song ngữ & hỗ trợ tạm trú NA17.",
      keywords: "thuê căn hộ Đà Nẵng, cho thuê căn hộ Đà Nẵng dài hạn, thuê chung cư Đà Nẵng, căn hộ biển Mỹ Khê, căn hộ An Thượng, căn hộ view sông Hàn, The Panoma, The Filmore, Hiyori, KIN Estates"
    },
    en: {
      title: "KIN Estates — Long-Term Apartments & Villas for Rent in Da Nang (My Khe, An Thuong, Han River)",
      description: "Curated long-term apartments, penthouses & private villas (3–12+ months) in Da Nang, Vietnam. Physically audited for daylight, quietness, fiber Wi-Fi, official EVN rates & bilingual leases.",
      keywords: "Da Nang apartments for rent, long-term rental Da Nang, expat apartments My Khe Beach, An Thuong apartment rental, Han Riverfront condo Da Nang, KIN Estates Da Nang"
    },
    zh: {
      title: "KIN Estates — 岘港精选长租公寓与海景别墅出租（美溪海滩・安上区・汉江景）",
      description: "专注越南岘港 3–12个月以上长期公寓、顶层公寓与独栋别墅租赁。实地核验采光、隔音、光纤网速、国家标准电价及双语租约。",
      keywords: "岘港长租公寓, 岘港租房, 美溪海滩公寓出租, 岘港安上区租房, 岘港汉江景公寓, KIN Estates"
    },
    ru: {
      title: "KIN Estates — Долгосрочная Аренда Квартир и Вилл в Дананге (Ми Кхе, Ан Тхыонг, Река Хан)",
      description: "Проверенные квартиры, пентхаусы и виллы в Дананге на срок 3–12+ месяцев. Личная проверка света, шума, оптоволокна, гостариф EVN и двуязычный договор.",
      keywords: "аренда квартир в Дананге, долгосрочная аренда Дананг, снять квартиру Ан Тхыонг Ми Кхе, жилье в Дананге, KIN Estates"
    },
    ko: {
      title: "KIN Estates — 다낭 장기 아파트 & 풀빌라 임대 (미케비치 · 안트엉 · 한강 뷰)",
      description: "베트남 다낭 3~12개월 이상 장기 임대 아파트·펜트하우스·빌라 전문. 현지 실사 검증, 채광·방음·광랜 확인, 국가 EVN 전기요금 및 투명한 계약 지원.",
      keywords: "다낭 아파트 임대, 다낭 장기 숙소, 다낭 한강 뷰 아파트, 미케비치 아파트 임대, 다낭 안트엉 레지던스, KIN Estates"
    },
    ja: {
      title: "KIN Estates — ダナン長期賃貸アパート・高級マンション＆ヴィラ（ミーケー・ハン川）",
      description: "ベトナム・ダナンの3〜12ヶ月以上の長期賃貸アパート・ヴィラ専門。現地スタッフが採光・防音・光回線・EVN公定電気料金を直接検証しバイリンガル契約をサポート。",
      keywords: "ダナン アパート 賃貸, ダナン 長期滞在 マンション, ミーケービーチ 賃貸, ダナン ハン川 マンション, KIN Estates"
    }
  },
  "/apartments": {
    vi: {
      title: "Danh Mục Căn Hộ Cho Thuê Tại Đà Nẵng — Giá Trực Tiếp Chủ Nhà | KIN Estates",
      description: "Tìm kiếm & lọc căn hộ cho thuê dài hạn tại Đà Nẵng theo khu vực (An Thượng, Mỹ Khê, Ven sông Hàn, Sơn Trà, Hải Châu), số phòng ngủ, mức giá và bản đồ trực quan.",
      keywords: "danh sách căn hộ Đà Nẵng, thuê căn hộ 1PN 2PN 3PN Đà Nẵng, chung cư cao cấp Đà Nẵng cho thuê, bản đồ căn hộ Đà Nẵng"
    },
    en: {
      title: "All Da Nang Apartments for Rent — Direct Owner Prices & Live Map | KIN Estates",
      description: "Browse verified available long-term apartments in Da Nang by neighborhood (An Thuong, My Khe Beach, Han Riverfront, Son Tra), bedrooms, budget, and interactive map.",
      keywords: "Da Nang apartments list, 1BR 2BR 3BR apartment Da Nang, Da Nang rental map, verified apartments Da Nang"
    },
    zh: {
      title: "岘港精选在租公寓房源列表与交互地图 | KIN Estates",
      description: "按区域（安上区、美溪海滩、汉江岸、山茶郡）、卧室数量与预算实时筛选岘港在租长租公寓与别墅。",
      keywords: "岘港公寓房源, 岘港一居室两居室三居室出租, 岘港租房地图"
    },
    ru: {
      title: "Каталог Квартир в Аренду в Дананге с Картой и Ценами | KIN Estates",
      description: "Актуальный каталог проверенных квартир в Дананге: фильтр по районам (Ан Тхыонг, Ми Кхе, река Хан, Сон Тра), бюджету и спальням.",
      keywords: "каталог квартир Дананг, снять апартаменты Дананг, карта аренды Дананг"
    },
    ko: {
      title: "다낭 전체 임대 아파트 매물 리스트 & 지도 | KIN Estates",
      description: "안트엉, 미케비치, 한강변, 선짜 등 다낭 주요 지역별·침실별·예산별 실시간 검증 매물을 한눈에 비교하세요.",
      keywords: "다낭 아파트 매물, 다낭 1베드룸 2베드룸 3베드룸 임대, 다낭 임대 지도"
    },
    ja: {
      title: "ダナン賃貸アパート全物件一覧・エリアマップ | KIN Estates",
      description: "アントゥオン、ミーケービーチ、ハン川沿い、ソンチャなどエリア別・間取り別・予算別にダナンの長期賃貸物件を検索。",
      keywords: "ダナン 賃貸 物件一覧, ダナン 1LDK 2LDK 賃貸, ダナン マンション マップ"
    }
  },
  "/areas": {
    vi: {
      title: "Các Khu Vực Thuê Căn Hộ Tốt Nhất Đà Nẵng (An Thượng, Mỹ Khê, Sông Hàn, Sơn Trà) | KIN Estates",
      description: "So sánh chi tiết các khu vực đáng sống nhất Đà Nẵng cho người đi làm từ xa & gia đình: nhịp sống sáng–trưa–tối, mặt bằng giá thuê và khoảng cách ra biển.",
      keywords: "khu vực thuê nhà Đà Nẵng, An Thượng Đà Nẵng, thuê nhà ven sông Hàn, biển Mỹ Khê, bán đảo Sơn Trà"
    },
    en: {
      title: "Best Neighborhoods to Rent in Da Nang (An Thuong, My Khe, Han River, Son Tra) | KIN Estates",
      description: "Compare Da Nang's top residential areas side-by-side: morning-to-evening lifestyle rhythm, typical monthly rent, beach proximity, and coworking cafes.",
      keywords: "best areas to live in Da Nang, An Thuong vs Han Riverfront, My Khe Beach apartments, Son Tra rentals"
    },
    zh: {
      title: "岘港租房核心区域对比（安上区・美溪海滩・汉江・山茶）| KIN Estates",
      description: "深度解析岘港最宜居的长租街区：早晚生活节奏、租金区间、海滩距离与配套设施对比。",
      keywords: "岘港租房区域, 安上区, 美溪海滩, 汉江岸, 山茶半岛"
    },
    ru: {
      title: "Лучшие Районы Дананга для Жизни и Аренды (Ан Тхыонг, Ми Кхе, Сон Тра) | KIN Estates",
      description: "Подробное сравнение районов Дананга: атмосфера, цены на аренду, близость к морю и инфраструктура.",
      keywords: "районы Дананга для жизни, Ан Тхыонг, Ми Кхе, Сон Тра, Хай Чау"
    },
    ko: {
      title: "다낭 거주 추천 지역 비교 (안트엉 · 미케비치 · 한강 · 선짜) | KIN Estates",
      description: "다낭 주요 주거 지역의 생활 리듬, 월세 시세, 해변 접근성과 인프라를 한눈에 비교해 드립니다.",
      keywords: "다낭 살기 좋은 지역, 다낭 안트엉, 미케비치, 한강변, 선짜"
    },
    ja: {
      title: "ダナンのおすすめ居住エリア比較（アントゥオン・ミーケー・ハン川・ソンチャ）| KIN Estates",
      description: "ダナン長期滞在に人気のエリアを徹底比較：家賃相場、ビーチまでの距離、周辺環境、暮らしやすさ。",
      keywords: "ダナン 住みやすいエリア, アントゥオン, ミーケービーチ, ハン川, ソンチャ"
    }
  },
  "/how-to-rent": {
    vi: {
      title: "Quy Trình Thuê Căn Hộ Dài Hạn Tại Đà Nẵng (Hợp Đồng, Cọc, Tạm Trú NA17) | KIN Estates",
      description: "Hướng dẫn 5 bước thuê căn hộ tại Đà Nẵng an toàn & minh bạch: xem nhà trực tiếp, ký hợp đồng song ngữ, đặt cọc chủ nhà, biên bản bàn giao và đăng ký tạm trú.",
      keywords: "quy trình thuê căn hộ Đà Nẵng, hợp đồng thuê nhà song ngữ, đăng ký tạm trú Đà Nẵng, kinh nghiệm thuê chung cư Đà Nẵng"
    },
    en: {
      title: "How to Rent an Apartment in Da Nang (Contracts, Deposit, NA17 Registration) | KIN Estates",
      description: "Step-by-step guide to renting long-term in Da Nang safely: shortlist, in-person tours, bilingual lease, direct owner deposit, photo handover & police registration.",
      keywords: "how to rent apartment Da Nang, Da Nang lease contract, Da Nang deposit rules, Vietnam temporary residence registration"
    },
    zh: {
      title: "岘港长租流程指南（合同・押金・暂住登记）| KIN Estates",
      description: "5步透明掌握岘港长期租房流程：精选推荐、实地看房、双语合同、押金条款与公安暂住登记。",
      keywords: "岘港租房流程, 岘港租房合同, 越南暂住登记"
    },
    ru: {
      title: "Как Снять Квартиру в Дананге — Пошаговый Процесс и Договор | KIN Estates",
      description: "5 понятных шагов аренды в Дананге: подборка, личный просмотр, двуязычный договор, депозит напрямую владельцу и регистрация tạm trú.",
      keywords: "как снять квартиру в Дананге, договор аренды Вьетнам, регистрация tam tru Дананг"
    },
    ko: {
      title: "다낭 아파트 장기 임대 절차 가이드 (계약 · 보증금 · 거주 등록) | KIN Estates",
      description: "다낭에서 안전하게 집을 구하는 5단계: 맞춤 매물 추천, 현장 투어, 이중언어 계약, 사진 인수인계서, 공안 거주 등록 안내.",
      keywords: "다낭 집 구하기 절차, 다낭 임대차 계약, 베트남 거주 등록"
    },
    ja: {
      title: "ダナン長期賃貸の流れガイド（契約・デポジット・滞在登録）| KIN Estates",
      description: "ダナンで安心して長期アパートを借りる5ステップ：物件提案、現地内覧、バイリンガル契約、引渡し確認、滞在登録。",
      keywords: "ダナン 賃貸 借り方, ダナン 賃貸契約, ベトナム 滞在登録"
    }
  },
  "/guides": {
    vi: {
      title: "Cẩm Nang Thuê Nhà & Chỉ Số Giá Chung Cư Đà Nẵng 2026 | KIN Estates",
      description: "Bảng giá thuê thực tế các tòa nhà nổi bật tại Đà Nẵng (The Panoma, The Filmore, Hiyori, The Monarchy, Azura), kinh nghiệm chọn hướng nắng & chi phí điện nước EVN.",
      keywords: "giá thuê chung cư Đà Nẵng 2026, The Panoma Sun Cosmo, The Filmore Đà Nẵng, Hiyori Garden Tower, The Monarchy"
    },
    en: {
      title: "Da Nang Rental Guides & Building Price Index 2026 | KIN Estates",
      description: "Real monthly rent benchmarks across Da Nang's top condo towers (The Panoma, The Filmore, Hiyori, Monarchy, Azura), EVN utility tips & expat living guides.",
      keywords: "Da Nang rent prices 2026, The Panoma Da Nang rent, Filmore Da Nang, Hiyori Garden Tower, Da Nang expat guide"
    },
    zh: {
      title: "2026 岘港租房指南与热门大楼租金指数 | KIN Estates",
      description: "盘点岘港热门公寓楼（The Panoma、The Filmore、Hiyori、Monarchy）真实月租区间与生活成本攻略。",
      keywords: "2026 岘港租金, 岘港热门公寓楼, 岘港租房攻略"
    },
    ru: {
      title: "Гид по Аренде и Индекс Цен на Жилье в Дананге 2026 | KIN Estates",
      description: "Реальные цены аренды в популярных ЖК Дананга (The Panoma, The Filmore, Hiyori, Monarchy) и советы для долгосрочной жизни.",
      keywords: "цены на аренду Дананг 2026, ЖК Дананг, гид по жилью Дананг"
    },
    ko: {
      title: "2026 다낭 임대 가이드 & 주요 아파트 시세 지수 | KIN Estates",
      description: "더 파노마, 필모어, 히요리, 모나키 등 다낭 인기 아파트의 실제 월세 시세와 생활비 가이드를 확인하세요.",
      keywords: "다낭 아파트 시세 2026, 다낭 필모어, 히요리, 모나키 월세"
    },
    ja: {
      title: "2026年ダナン賃貸ガイド＆人気マンション家賃相場 | KIN Estates",
      description: "The Panoma、The Filmore、Hiyori、Monarchyなどダナン主要レジデンスの実勢家賃と生活ガイド。",
      keywords: "ダナン 家賃相場 2026, ダナン 人気マンション, ダナン 移住ガイド"
    }
  },
  "/about": {
    vi: {
      title: "Về KIN Estates Đà Nẵng — Đội Ngũ Dẫn Xem Thực Tế & Feedback Khách Hàng",
      description: "Gặp gỡ đội ngũ tư vấn căn hộ dài hạn tại Đà Nẵng. Xem ảnh dẫn khách thực tế, đánh giá 5 sao từ cư dân Việt Nam & quốc tế và quy trình làm việc minh bạch.",
      keywords: "KIN Estates Đà Nẵng, môi giới căn hộ uy tín Đà Nẵng, đánh giá KIN Estates, ký gửi căn hộ Đà Nẵng"
    },
    en: {
      title: "About KIN Estates Da Nang — In-Person Tours & Verified Client Reviews",
      description: "Meet KIN Estates Da Nang: local long-term rental specialists. See real client tour moments, 5-star resident testimonials, and how we support you from viewing to move-in.",
      keywords: "KIN Estates Da Nang reviews, trusted rental agency Da Nang, Da Nang property management, expat housing Da Nang"
    },
    zh: {
      title: "关于 KIN Estates 岘港 — 实地带看与客户真实评价",
      description: "了解 KIN Estates 岘港本地团队：查看实地带看照片、5星客户真实评价以及透明长租服务。",
      keywords: "KIN Estates 岘港评价, 岘港靠谱租房中介, 岘港房东委托"
    },
    ru: {
      title: "О KIN Estates Дананг — Личные Просмотры и Отзывы Клиентов",
      description: "Познакомьтесь с командой KIN Estates в Дананге: реальные фото с просмотров, отзывы арендаторов 5★ и прозрачный сервис.",
      keywords: "KIN Estates Дананг отзывы, агентство аренды Дананг"
    },
    ko: {
      title: "KIN Estates 다낭 소개 — 현장 투어 사진 & 고객 실제 후기",
      description: "다낭 현지 장기 임대 전문팀 KIN Estates를 소개합니다. 실제 투어 현장 사진과 5점 만점 입주 후기를 확인하세요.",
      keywords: "KIN Estates 다낭 후기, 다낭 부동산 추천, 다낭 장기 임대 전문"
    },
    ja: {
      title: "KIN Estatesダナンについて — 現地内覧実績＆お客様の声",
      description: "ダナン長期賃貸専門チームKIN Estatesのご紹介。実際の内覧風景や5つ星の入居者レビューをご覧ください。",
      keywords: "KIN Estates ダナン 評判, ダナン 賃貸 不動産会社"
    }
  },
  "/privacy-policy": {
    vi: {
      title: "Chính Sách Bảo Mật & Xử Lý Dữ Liệu | KIN Estates Đà Nẵng",
      description: "Chính sách bảo mật minh bạch của KIN Estates Đà Nẵng: thông tin thu thập qua biểu mẫu, mục đích sử dụng, thời gian lưu trữ và quyền yêu cầu xóa dữ liệu.",
      keywords: "chính sách bảo mật KIN Estates, bảo vệ dữ liệu khách hàng"
    },
    en: {
      title: "Privacy & Data Policy | KIN Estates Da Nang",
      description: "Plain-language privacy policy explaining what the KIN Estates Da Nang request form collects, why, how long we keep it, and how to request deletion.",
      keywords: "KIN Estates privacy policy, data protection Da Nang"
    },
    zh: {
      title: "隐私与数据保护政策 | KIN Estates 岘港",
      description: "透明说明 KIN Estates 岘港表单收集的信息类型、用途、存储期限以及删除数据的方式。",
      keywords: "KIN Estates 隐私政策"
    },
    ru: {
      title: "Политика Конфиденциальности и Данных | KIN Estates Дананг",
      description: "Прозрачная политика обработки данных KIN Estates в Дананге: какие данные собираются, зачем и как их удалить.",
      keywords: "политика конфиденциальности KIN Estates"
    },
    ko: {
      title: "개인정보 처리방침 | KIN Estates 다낭",
      description: "KIN Estates 다낭 문의 양식의 개인정보 수집 항목, 이용 목적, 보관 기간 및 삭제 요청 절차를 안내합니다.",
      keywords: "KIN Estates 개인정보 처리방침"
    },
    ja: {
      title: "プライバシーポリシー | KIN Estates ダナン",
      description: "KIN Estatesダナンのお問い合わせフォームにおける情報収集・利用目的・保管期間・削除手続きについて。",
      keywords: "KIN Estates プライバシーポリシー"
    }
  }
};

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
    reviewBody: locVal(t.quote, "en") || locVal(t.quote, "vi")
  }));

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": `${origin}/#organization`,
    name: "KIN Estates — Da Nang Private Residences",
    alternateName: ["KIN Estates", "KIN Estates Đà Nẵng"],
    url: origin,
    logo: `${origin}/img/kin-estates-logo.svg`,
    image: DEFAULT_OG_IMAGE,
    telephone: "+84-389-711-601",
    priceRange: "$$ - $$$",
    description: "Curated long-term apartments, penthouses, and private villas for rent (3–12+ months) in Da Nang, Vietnam. Multilingual advisory in Vietnamese, English, Chinese, Russian, Korean, and Japanese.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Da Nang",
      addressRegion: "Da Nang",
      addressCountry: "VN"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 16.0544,
      longitude: 108.2022
    },
    areaServed: [
      { "@type": "City", name: "Da Nang" },
      { "@type": "Place", name: "An Thuong, Da Nang" },
      { "@type": "Place", name: "My Khe Beach, Da Nang" },
      { "@type": "Place", name: "Han Riverfront, Da Nang" },
      { "@type": "Place", name: "Son Tra, Da Nang" },
      { "@type": "Place", name: "Hai Chau, Da Nang" }
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
      reviewCount: String(Math.max(4, testimonials.length)),
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
    url: origin,
    inLanguage: SUPPORTED_LANGS,
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/apartments?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
}

function buildFaqSchema(lang = "vi") {
  const faqs =
    lang === "vi"
      ? [
          {
            q: "Thuê căn hộ dài hạn tại Đà Nẵng cần hợp đồng tối thiểu bao lâu?",
            a: "KIN Estates chuyên căn hộ, penthouse và biệt thự dài hạn từ 3 đến 12+ tháng tại Đà Nẵng. Đặt cọc thông thường 1 tháng, thanh toán theo tháng hoặc 3 tháng trực tiếp với chủ nhà."
          },
          {
            q: "Khu vực nào tốt nhất để thuê căn hộ ở Đà Nẵng?",
            a: "An Thượng & Biển Mỹ Khê phù hợp người nước ngoài và làm việc từ xa gần biển; Ven sông Hàn & Hải Châu phù hợp chuyên gia cần căn hộ cao cấp trung tâm; Sơn Trà phù hợp người thích không gian yên tĩnh gần thiên nhiên."
          },
          {
            q: "Chi phí điện nước khi thuê căn hộ tại Đà Nẵng tính như thế nào?",
            a: "Phần lớn căn hộ chung cư tuyển chọn tại KIN Estates (The Panoma, The Filmore, Hiyori, Monarchy) áp dụng giá điện nhà nước EVN (~2.800đ/kWh) và công khai minh bạch mọi khoản phí trước khi xem nhà."
          },
          {
            q: "KIN Estates có hỗ trợ đăng ký tạm trú cho khách nước ngoài không?",
            a: "Có. Đội ngũ KIN Estates hỗ trợ đầy đủ hợp đồng song ngữ, biên bản bàn giao có ảnh và hướng dẫn đăng ký tạm trú NA17 cùng chủ nhà ngay khi nhận phòng."
          }
        ]
      : [
          {
            q: "What is the minimum lease term for apartments in Da Nang?",
            a: "KIN Estates specializes in long-term apartments, penthouses, and private villas for 3 to 12+ months in Da Nang, with transparent 1-month deposits paid directly to the property owner."
          },
          {
            q: "Which neighborhood is best for renting an apartment in Da Nang?",
            a: "An Thuong and My Khe Beach are ideal for beach access and international cafes; Han Riverfront and Hai Chau offer luxury skyline towers and central convenience; Son Tra offers quiet coastal living."
          },
          {
            q: "How are electricity and water bills charged in Da Nang apartments?",
            a: "Most curated residences at KIN Estates (such as The Panoma, The Filmore, Hiyori, and Monarchy) charge official state EVN electricity rates, with all utility costs disclosed upfront before viewing."
          },
          {
            q: "Does KIN Estates help foreigners with temporary residence registration?",
            a: "Yes. We provide bilingual contracts, photo handover reports with meter readings, and coordinate official temporary residence registration (NA17) with the landlord upon move-in."
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
  const desc = locVal(apt.architecturalNotes, lang) || `${title} — ${apt.building || "Da Nang"}`;
  const imgs = (apt.images || []).map((img) => toAbsoluteUrl(origin, img));
  const url = `${origin}/apartments/${encodeURIComponent(apt.code)}`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: title,
      description: desc,
      url,
      datePosted: apt.createdAt || new Date().toISOString(),
      image: imgs.length ? imgs : [DEFAULT_OG_IMAGE],
      offers: {
        "@type": "Offer",
        priceCurrency: "VND",
        price: Number(apt.priceVnd || 0),
        availability: apt.status === "Available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url
      },
      mainEntity: {
        "@type": "Apartment",
        name: title,
        description: desc,
        numberOfRooms: Number(apt.bedrooms || 1),
        numberOfBathroomsTotal: Number(apt.bathrooms || 1),
        ...(apt.sizeM2 ? { floorSize: { "@type": "QuantitativeValue", value: Number(apt.sizeM2), unitCode: "MTK" } } : {}),
        address: {
          "@type": "PostalAddress",
          streetAddress: apt.address || apt.building || apt.areaName || "Da Nang",
          addressLocality: "Da Nang",
          addressCountry: "VN"
        },
        ...(apt.coordinates?.lat && apt.coordinates?.lng
          ? { geo: { "@type": "GeoCoordinates", latitude: apt.coordinates.lat, longitude: apt.coordinates.lng } }
          : {})
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "KIN Estates", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: lang === "vi" ? "Căn hộ Đà Nẵng" : "Da Nang Apartments", item: `${origin}/apartments` },
        { "@type": "ListItem", position: 3, name: title, item: url }
      ]
    }
  ];
}

function buildItemListSchema(origin, apartments, lang = "vi") {
  const items = (apartments || []).slice(0, 15).map((apt, idx) => ({
    "@type": "ListItem",
    position: idx + 1,
    url: `${origin}/apartments/${encodeURIComponent(apt.code)}`,
    name: locVal(apt.title, lang) || apt.code
  }));
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: lang === "vi" ? "Căn hộ cho thuê dài hạn tại Đà Nẵng" : "Da Nang Long-Term Apartments for Rent",
    numberOfItems: items.length,
    itemListElement: items
  };
}

function buildPageSeoHead({ origin, pathname, lang = "vi", apartment = null, apartments = [], about = null }) {
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const canonicalUrl = `${origin}${cleanPath === "/" ? "/" : cleanPath}${lang !== "vi" ? `?lang=${lang}` : ""}`;
  let title;
  let description;
  let keywords;
  let ogImage = toAbsoluteUrl(origin, about?.heroImage || DEFAULT_OG_IMAGE);
  let ogType = "website";
  const schemas = [buildLocalBusinessSchema(origin, about?.testimonials || []), buildWebsiteSchema(origin)];

  if (apartment) {
    const aptTitle = locVal(apartment.title, lang) || apartment.code;
    const priceLabel = apartment.priceVnd
      ? `${(Number(apartment.priceVnd) / 1_000_000).toFixed(1).replace(/\.0$/, "")}tr/tháng ($${apartment.priceUsd})`
      : `$${apartment.priceUsd}/mo`;
    const specs = [
      apartment.bedrooms ? `${apartment.bedrooms}PN` : "",
      apartment.sizeM2 ? `${apartment.sizeM2}m²` : "",
      apartment.areaName || "Đà Nẵng"
    ]
      .filter(Boolean)
      .join(" · ");
    title = `${aptTitle} (${priceLabel}) | KIN Estates Đà Nẵng`;
    description = `${specs} — ${locVal(apartment.architecturalNotes, lang) || aptTitle}. Thuê dài hạn Đà Nẵng trực tiếp chủ nhà, kiểm định thực tế bởi KIN Estates.`;
    keywords = `${aptTitle}, ${apartment.building || ""}, thuê căn hộ ${apartment.areaName || "Đà Nẵng"}, ${apartment.code}, Da Nang apartment for rent`;
    ogImage = toAbsoluteUrl(origin, apartment.images?.[0] || DEFAULT_OG_IMAGE);
    ogType = "article";
    schemas.push(...buildApartmentSchema(origin, apartment, lang));
  } else {
    const routePack = ROUTE_META[cleanPath] || ROUTE_META["/"];
    const meta = routePack[lang] || routePack.en || routePack.vi;
    title = meta.title;
    description = meta.description;
    keywords = meta.keywords;
    if (cleanPath === "/" || cleanPath === "/apartments") {
      schemas.push(buildItemListSchema(origin, apartments, lang));
    }
    if (cleanPath === "/" || cleanPath === "/how-to-rent") {
      schemas.push(buildFaqSchema(lang));
    }
  }

  const ogLocaleMap = { vi: "vi_VN", en: "en_US", zh: "zh_CN", ru: "ru_RU", ko: "ko_KR", ja: "ja_JP" };
  const jsonLdTags = schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s).replace(/</g, "\\u003c")}</script>`)
    .join("\n  ");

  const seoBlock = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="keywords" content="${escapeHtml(keywords)}" />`,
    `<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />`,
    `<meta name="author" content="KIN Estates Da Nang" />`,
    `<meta name="geo.region" content="VN-DN" />`,
    `<meta name="geo.placename" content="Da Nang" />`,
    `<meta name="geo.position" content="16.0544;108.2022" />`,
    `<meta name="ICBM" content="16.0544, 108.2022" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    buildHreflangLinks(origin, cleanPath),
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="KIN Estates — Da Nang Private Residences" />`,
    `<meta property="og:locale" content="${ogLocaleMap[lang] || "vi_VN"}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`,
    jsonLdTags
  ].join("\n  ");

  return { title, description, seoBlock, lang };
}

function injectSeoIntoHtml(baseHtml, seoHead) {
  let html = String(baseHtml || "");
  html = html.replace(/<html lang="[^"]*">/i, `<html lang="${escapeHtml(seoHead.lang)}">`);
  if (/<!-- KIN_SEO_META_START -->[\s\S]*?<!-- KIN_SEO_META_END -->/.test(html)) {
    return html.replace(
      /<!-- KIN_SEO_META_START -->[\s\S]*?<!-- KIN_SEO_META_END -->/,
      `<!-- KIN_SEO_META_START -->\n  ${seoHead.seoBlock}\n  <!-- KIN_SEO_META_END -->`
    );
  }
  return html.replace(/<title>[\s\S]*?<\/title>\s*<meta name="description"[^>]*>/i, seoHead.seoBlock);
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
    "User-agent: PerplexityBot",
    "Allow: /",
    "User-agent: ClaudeBot",
    "Allow: /",
    "User-agent: Google-Extended",
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
    { path: "/areas", priority: "0.85", changefreq: "weekly" },
    { path: "/how-to-rent", priority: "0.85", changefreq: "monthly" },
    { path: "/guides", priority: "0.85", changefreq: "weekly" },
    { path: "/about", priority: "0.80", changefreq: "weekly" },
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
      `  <url>\n    <loc>${escapeXml(`${origin}${aptPath}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.90</priority>\n${altLinks(aptPath)}${imgTags ? `\n${imgTags}` : ""}\n  </url>`
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
  const minUsd = pricesUsd.length ? Math.min(...pricesUsd) : 450;
  const maxUsd = pricesUsd.length ? Math.max(...pricesUsd) : 2000;

  const lines = [
    "# KIN Estates — Da Nang Private Residences (Long-Term Apartment & Villa Rentals)",
    "",
    "> Curated long-term residential rentals (3–12+ months) in Da Nang, Vietnam. Physically audited apartments, penthouses, and villas across An Thuong, My Khe Beach, Han Riverfront, Son Tra, and Hai Chau. Multilingual service in Vietnamese, English, Chinese, Russian, Korean, and Japanese.",
    "",
    "## Key Facts",
    `- Website: ${origin}`,
    `- Available Long-Term Listings: ${avail.length} verified residences ($${minUsd}–$${maxUsd}/month)`,
    "- Lease Terms: 3–12+ months, direct owner pricing, official EVN electricity rates, bilingual lease & NA17 residency registration support",
    "- Direct Contact: Zalo 0389 711 601 | WhatsApp +84 389 711 601 | Telegram @KIN_Estates",
    "",
    "## Core Pages",
    `- Home: ${origin}/`,
    `- All Da Nang Apartments: ${origin}/apartments`,
    `- Da Nang Neighborhood Guides: ${origin}/areas`,
    `- How to Rent in Da Nang: ${origin}/how-to-rent`,
    `- Building Price Index & Rental Guides: ${origin}/guides`,
    `- About KIN Estates & Client Reviews: ${origin}/about`,
    `- Privacy & Data Policy: ${origin}/privacy-policy`,
    "",
    "## Current Verified Residences in Da Nang"
  ];

  for (const apt of avail.slice(0, 40)) {
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
  getSiteOrigin,
  resolveLang,
  buildPageSeoHead,
  injectSeoIntoHtml,
  generateRobotsTxt,
  generateSitemapXml,
  generateLlmsTxt
};
