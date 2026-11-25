// Canonical SEO Data Hub: 19 Da Nang Areas, 8 Property/Transaction Types, 6 Pillar SEO Articles

const SUPPORTED_LANGS = ["vi", "en", "zh", "ru", "ko", "ja"];
const NON_DEFAULT_LANGS = ["en", "zh", "ru", "ko", "ja"];

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
    keywordsVi: "thuê căn hộ An Thượng Đà Nẵng, cho thuê căn hộ phố Tây An Thượng, thuê studio An Thượng gần biển Mỹ Khê, thuê nhà An Thượng"
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
    keywordsVi: "thuê căn hộ biển Mỹ Khê Đà Nẵng, căn hộ view biển Mỹ Khê, thuê biệt thự biển Mỹ Khê, cho thuê chung cư Võ Nguyên Giáp Đà Nẵng"
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
    keywordsVi: "thuê căn hộ ven sông Hàn Đà Nẵng, căn hộ view sông Hàn cầu Rồng, The Filmore, The Panoma Sun Cosmo, Hiyori, Monarchy, Azura"
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
    keywordsVi: "thuê căn hộ Sơn Trà Đà Nẵng, thuê nhà nguyên căn Sơn Trà, thuê biệt thự Sơn Trà, chung cư Hiyori, The Monarchy, Azura"
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
    keywordsVi: "thuê căn hộ Hải Châu Đà Nẵng, thuê nhà trung tâm Hải Châu, The Filmore, Indochina, Blooming Tower, F.Home Đà Nẵng"
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
    keywordsVi: "thuê căn hộ Ngũ Hành Sơn Đà Nẵng, thuê biệt thự hồ bơi Ngũ Hành Sơn, The Panoma Sun Cosmo Residence, thuê nhà gần biển Đà Nẵng"
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
    keywordsVi: "thuê căn hộ Hòa Xuân Đà Nẵng, thuê nhà nguyên căn đảo VIP Hòa Xuân, Nam Hòa Xuân, biệt thự Euro Village 2 Hòa Xuân"
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
    keywordsVi: "thuê căn hộ Cẩm Lệ Đà Nẵng, thuê nhà nguyên căn quận Cẩm Lệ, thuê chung cư Cẩm Lệ Hòa Xuân giá tốt"
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
    keywordsVi: "thuê căn hộ Nam Việt Á Đà Nẵng, thuê biệt thự hồ bơi Nam Việt Á, thuê nhà nguyên căn Khuê Mỹ Ngũ Hành Sơn"
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
    keywordsVi: "thuê căn hộ Mỹ An Đà Nẵng, cho thuê căn hộ phường Mỹ An Ngũ Hành Sơn, thuê nhà Bắc Mỹ An gần biển"
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
    keywordsVi: "thuê căn hộ Khuê Mỹ Ngũ Hành Sơn Đà Nẵng, thuê biệt thự Khuê Mỹ Hồ Xuân Hương"
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
    keywordsVi: "thuê căn hộ Thanh Khê Đà Nẵng, thuê nhà nguyên căn quận Thanh Khê, căn hộ Nguyễn Tất Thành vịnh Đà Nẵng"
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
    keywordsVi: "thuê căn hộ Liên Chiểu Đà Nẵng, thuê chung cư Ori Garden Liên Chiểu, thuê nhà gần biển Nguyễn Tất Thành"
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
    keywordsVi: "thuê căn hộ FPT City Đà Nẵng, cho thuê chung cư FPT Plaza 1 2 3 Hòa Hải, mua bán thuê biệt thự Hòa Hải"
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

// High-Intent Property Type & Transaction Landing Pages (/property/:slug)
const PROPERTY_TYPE_LANDINGS = [
  {
    slug: "can-ho-chung-cu",
    filter: { propertyType: "condo" },
    titles: {
      vi: "Thuê Căn Hộ Chung Cư Đà Nẵng Cao Cấp 2026 | KIN Estates",
      en: "Condominiums & High-Rise Apartments Da Nang | KIN Estates",
      zh: "岘港高端电梯公寓与小区长租（带泳池健身房）| KIN Estates",
      ru: "Аренда Квартир в Жилых Комплексах Дананга | KIN Estates",
      ko: "다낭 고급 주상복합·대단지 아파트 장기 임대 | KIN Estates",
      ja: "ダナン 高級コンドミニアム・タワーマンション賃貸 | KIN"
    },
    descriptions: {
      vi: "Cho thuê căn hộ chung cư thương mại Đà Nẵng (The Filmore, The Panoma, Hiyori, Monarchy, Azura, FPT Plaza) ✓ Hồ bơi, gym, an ninh 24/7, điện nhà nước EVN →",
      en: "Rent verified high-rise condominiums in Da Nang (The Filmore, Panoma, Hiyori, Monarchy, Azura, FPT Plaza) ✓ Pool, gym, 24/7 security & state EVN rates →",
      zh: "精选岘港高端商业小区公寓（The Filmore、The Panoma、Hiyori、Monarchy），配泳池健身房与24小时安保，国家EVN标准电价 →",
      ru: "Квартиры в современных ЖК Дананга (Filmore, Panoma, Hiyori, Monarchy, Azura) с бассейном, охраной 24/7 и гостарифом EVN →",
      ko: "더 필모어, 더 파노마, 히요리, 모나키 등 다낭 최고급 대단지 아파트 장기 임대 ✓ 수영장·피트니스·24시간 보안·EVN 전기요금 →",
      ja: "The Filmore・Hiyori・Monarchy等の高級コンドミニアム長期賃貸 ✓ プール・ジム・24時間警備・EVN公定電気料金 →"
    },
    keywords: {
      vi: "thuê căn hộ chung cư Đà Nẵng, cho thuê chung cư cao cấp Đà Nẵng, thuê chung cư Sơn Trà Hải Châu Ngũ Hành Sơn Hòa Xuân, Hiyori Filmore Panoma Monarchy",
      en: "condo for rent Da Nang, luxury condominium Da Nang, Hiyori Filmore Panoma Monarchy rent"
    },
    h1: {
      vi: "Cho thuê Căn hộ Chung cư Đà Nẵng — Tiện ích cao cấp, điện giá nhà nước EVN",
      en: "High-Rise Condominiums for Rent in Da Nang — Pools, Security & EVN Rates",
      zh: "岘港高端商业公寓小区 (Condo) 长租精选",
      ru: "Аренда квартир в лучших ЖК и кондоминиумах Дананга",
      ko: "다낭 프리미엄 대단지 아파트 & 주상복합 장기 임대",
      ja: "ダナン 高級コンドミニアム・タワーマンション長期賃貸"
    }
  },
  {
    slug: "can-ho-thuong",
    filter: { propertyType: "apartment" },
    titles: {
      vi: "Thuê Căn Hộ Thường & Căn Hộ Dịch Vụ Đà Nẵng | KIN Estates",
      en: "Serviced & Boutique Apartments for Rent Da Nang | KIN",
      zh: "岘港精品服务式公寓与高性价比长租房 | KIN Estates",
      ru: "Сервисные Апартаменты и Квартиры в Дананге | KIN Estates",
      ko: "다낭 가성비 레지던스 & 서비스드 아파트 월세 | KIN Estates",
      ja: "ダナン サービスアパートメント・ブティック賃貸 | KIN"
    },
    descriptions: {
      vi: "Cho thuê căn hộ thường, căn hộ dịch vụ & mini Đà Nẵng đầy đủ nội thất, miễn phí Wi-Fi & dọn phòng ✓ Gần biển Mỹ Khê, An Thượng, Hải Châu, Sơn Trà, Hòa Xuân →",
      en: "Boutique & serviced apartments in Da Nang with full furniture, fast Wi-Fi & flexible 3–12+ month leases ✓ Walk to My Khe Beach, An Thuong, Hai Chau & Hoa Xuan →",
      zh: "精选岘港高性价比服务式公寓，拎包入住、包高速Wi-Fi与定期保洁，覆盖美溪海滩、安上区、海洲与和春 →",
      ru: "Уютные сервисные апартаменты в Дананге с полной меблировкой, бесплатным Wi-Fi и уборкой ✓ Рядом с пляжем Ми Кхе и центром →",
      ko: "다낭 미케비치·안트엉·하이쩌우·호아쑤언 풀옵션 서비스드 아파트 및 가성비 레지던스 월세 ✓ 빠른 Wi-Fi·청소 서비스 →",
      ja: "ダナンの家具付きサービスアパートメント賃貸 ✓ 無料Wi-Fi・清掃付きで快適長期滞在 →"
    },
    keywords: {
      vi: "thuê căn hộ Đà Nẵng giá tốt, thuê căn hộ dịch vụ Đà Nẵng, cho thuê căn hộ mini Đà Nẵng, căn hộ thường Đà Nẵng đầy đủ nội thất",
      en: "serviced apartment Da Nang monthly, boutique apartment for rent Da Nang, affordable apartment Da Nang"
    },
    h1: {
      vi: "Cho thuê Căn hộ thường & Căn hộ dịch vụ Đà Nẵng — Đầy đủ nội thất, dọn vào ở ngay",
      en: "Serviced & Boutique Apartments for Rent in Da Nang",
      zh: "岘港精品服务式公寓长租精选",
      ru: "Сервисные и бутик-апартаменты в аренду в Дананге",
      ko: "다낭 풀옵션 레지던스 & 서비스드 아파트 임대",
      ja: "ダナン サービスアパートメント＆ブティック賃貸"
    }
  },
  {
    slug: "studio",
    filter: { bedrooms: "1" },
    titles: {
      vi: "Thuê Căn Hộ Studio Đà Nẵng Đẹp Giá Tốt 2026 | KIN Estates",
      en: "Studio Apartments for Rent in Da Nang (Monthly) | KIN Estates",
      zh: "岘港精装单间公寓 (Studio) 长租精选 | KIN Estates",
      ru: "Аренда Студий в Дананге на Долгий Срок | KIN Estates",
      ko: "다낭 스튜디오 원룸 장기 임대 월세 매물 | KIN Estates",
      ja: "ダナン スタジオ・ワンルーム長期賃貸物件 | KIN Estates"
    },
    descriptions: {
      vi: "Cho thuê căn hộ Studio Đà Nẵng đầy đủ nội thất, ban công thoáng, gần biển Mỹ Khê, An Thượng, Sơn Trà, Hải Châu, Hòa Xuân ✓ Giá trực tiếp chủ nhà từ 7tr/tháng →",
      en: "Furnished studio apartments for rent in Da Nang near My Khe Beach, An Thuong, Han River & Hoa Xuan ✓ Direct owner rates from $300/mo ✓ Fast fiber Wi-Fi →",
      zh: "精选岘港美溪海滩、安上区、汉江畔全配家具单间公寓(Studio)，月租$300起，房东直租，光纤宽带与透明电费 →",
      ru: "Уютные студии в аренду в Дананге у пляжа Ми Кхе, в Ан Тхыонг и центре от $300/мес ✓ Без скрытых наценок ✓ Быстрый Wi-Fi →",
      ko: "다낭 미케비치·안트엉·한강변 풀옵션 스튜디오 원룸 장기 임대 월 $300부터 ✓ 집주인 직거래 정찰가 ✓ 빠른 광랜 Wi-Fi →",
      ja: "ダナン（ミーケービーチ・アントゥオン・ハン川）家具付きスタジオ賃貸 月$300〜 ✓ オーナー直接価格 ✓ 高速光回線完備 →"
    },
    keywords: {
      vi: "thuê căn hộ studio Đà Nẵng, cho thuê phòng studio Đà Nẵng giá tốt, thuê studio gần biển Mỹ Khê, studio An Thượng, studio Hòa Xuân, KIN Estates",
      en: "studio apartment Da Nang for rent, monthly studio An Thuong My Khe, cheap nice studio Da Nang, KIN Estates"
    },
    h1: {
      vi: "Cho thuê căn hộ Studio Đà Nẵng — Đầy đủ nội thất, giá trực tiếp chủ nhà",
      en: "Studio Apartments for Rent in Da Nang — Furnished & Direct Owner Pricing",
      zh: "岘港精装单间公寓 (Studio) 长租精选",
      ru: "Аренда студий в Дананге — с мебелью и напрямую от собственников",
      ko: "다낭 풀옵션 스튜디오 원룸 장기 임대 매물",
      ja: "ダナン 家具付きスタジオ・ワンルーム長期賃貸"
    }
  },
  {
    slug: "1-phong-ngu",
    filter: { bedrooms: "1" },
    titles: {
      vi: "Thuê Căn Hộ 1 Phòng Ngủ Đà Nẵng Dài Hạn | KIN Estates 2026",
      en: "1-Bedroom Apartments for Rent in Da Nang | KIN Estates 2026",
      zh: "岘港一居室 (1BR) 长租公寓出租 — 拎包入住 | KIN Estates",
      ru: "Аренда 1-Комнатных Квартир в Дананге | KIN Estates 2026",
      ko: "다낭 1베드룸 (1룸) 장기 임대 아파트 월세 | KIN Estates",
      ja: "ダナン 1LDK・1ベッドルーム長期賃貸アパート | KIN Estates"
    },
    descriptions: {
      vi: "Tổng hợp căn hộ 1 phòng ngủ (1PN) cho thuê dài hạn tại Đà Nẵng: phòng khách riêng, bếp nấu, máy giặt, điện EVN ✓ Mỹ Khê, An Thượng, The Filmore, The Panoma →",
      en: "Curated 1-bedroom long-term apartments in Da Nang with separate living room, full kitchen, washer & fast Wi-Fi ✓ My Khe, An Thuong, Han Riverfront →",
      zh: "精选岘港独立卧室一居室公寓，配齐厨房洗衣机与阳台，覆盖美溪海滩、安上区、The Filmore 与 The Panoma →",
      ru: "Проверенные 1-комнатные квартиры в Дананге с отдельной спальней, кухней и балконом ✓ Пляж Ми Кхе, Ан Тхыонг, центр →",
      ko: "다낭 거실·침실 분리형 1베드룸 아파트 장기 임대 ✓ 주방·세탁기 완비 ✓ 미케비치, 안트엉, 더 필모어, 더 파노마 →",
      ja: "ダナン 独立寝室付き1LDK長期賃貸マンション ✓ キッチン・洗濯機完備 ✓ ミーケー・アントゥオン・ハン川沿い →"
    },
    keywords: {
      vi: "thuê căn hộ 1 phòng ngủ Đà Nẵng, cho thuê chung cư 1PN Đà Nẵng, căn hộ 1PN Sơn Trà Hải Châu Ngũ Hành Sơn Hòa Xuân",
      en: "1 bedroom apartment for rent Da Nang, 1BR condo Da Nang monthly, expat 1 bedroom Da Nang"
    },
    h1: {
      vi: "Cho thuê căn hộ 1 phòng ngủ (1PN) Đà Nẵng — Không gian riêng tư & hiện đại",
      en: "1-Bedroom Apartments for Rent in Da Nang — Separate Living & Full Kitchen",
      zh: "岘港一居室 (1BR) 精选长租公寓",
      ru: "1-комнатные квартиры в аренду в Дананге",
      ko: "다낭 1베드룸 (1LDK) 장기 임대 아파트",
      ja: "ダナン 1ベッドルーム（1LDK）長期賃貸物件"
    }
  },
  {
    slug: "2-phong-ngu",
    filter: { bedrooms: "2" },
    titles: {
      vi: "Thuê Căn Hộ 2 Phòng Ngủ Đà Nẵng Cao Cấp | KIN Estates 2026",
      en: "2-Bedroom Apartments & Condos in Da Nang | KIN Estates 2026",
      zh: "岘港两居室 (2BR) 高端海景江景公寓长租 | KIN Estates",
      ru: "Аренда 2-Комнатных Квартир в Дананге | KIN Estates 2026",
      ko: "다낭 2베드룸 고급 아파트 장기 임대 월세 | KIN Estates 2026",
      ja: "ダナン 2LDK・2ベッドルーム高級賃貸マンション | KIN Estates"
    },
    descriptions: {
      vi: "Cho thuê chung cư 2 phòng ngủ (2PN) Đà Nẵng tại The Filmore, The Panoma, Hiyori, Monarchy, Azura ✓ View sông Hàn & biển Mỹ Khê ✓ Giá trực tiếp chủ nhà →",
      en: "Spacious 2-bedroom condos in Da Nang's top towers (The Filmore, The Panoma, Hiyori, Monarchy, Azura) ✓ Han River & ocean views ✓ Official EVN rates →",
      zh: "岘港热门高端大楼两居室房源（The Filmore、The Panoma、Hiyori、Monarchy），直面韩江与美溪海滩，适合家庭与情侣长租 →",
      ru: "Просторные 2-комнатные квартиры в лучших ЖК Дананга (Filmore, Panoma, Hiyori, Monarchy, Azura) ✓ Вид на реку и море ✓ Гостариф EVN →",
      ko: "더 필모어, 더 파노마, 히요리, 모나키 등 다낭 최고급 2베드룸 아파트 장기 임대 ✓ 한강·오션뷰 ✓ 국가 EVN 전기요금 →",
      ja: "The Filmore・The Panoma・Hiyori・Monarchyなどダナン人気タワーの2LDK長期賃貸 ✓ リバー＆オーシャンビュー →"
    },
    keywords: {
      vi: "thuê căn hộ 2 phòng ngủ Đà Nẵng, cho thuê chung cư 2PN Đà Nẵng, thuê căn hộ 2PN Hiyori, Monarchy, The Filmore, The Panoma Đà Nẵng",
      en: "2 bedroom apartment Da Nang for rent, 2BR condo Hiyori Monarchy Filmore Panoma Da Nang"
    },
    h1: {
      vi: "Cho thuê căn hộ 2 phòng ngủ (2PN) Đà Nẵng — Hiyori, Monarchy, The Panoma, The Filmore",
      en: "2-Bedroom Condos & Apartments for Rent in Da Nang",
      zh: "岘港两居室 (2BR) 精选高端公寓长租",
      ru: "2-комнатные квартиры и апартаменты в Дананге",
      ko: "다낭 2베드룸 인기 아파트 장기 임대 리스트",
      ja: "ダナン 2ベッドルーム（2LDK）高級賃貸マンション"
    }
  },
  {
    slug: "3-phong-ngu",
    filter: { bedrooms: "3" },
    titles: {
      vi: "Thuê Căn Hộ 3 Phòng Ngủ & Gia Đình Đà Nẵng | KIN Estates",
      en: "3-Bedroom Family Apartments & Condos Da Nang | KIN Estates",
      zh: "岘港三居室 (3BR) 家庭宽敞江景公寓长租 | KIN Estates",
      ru: "Аренда 3-Комнатных Квартир в Дананге | KIN Estates",
      ko: "다낭 3베드룸 가족형 대형 아파트 장기 임대 | KIN Estates",
      ja: "ダナン 3LDK・ファミリー向け大型賃貸マンション | KIN Estates"
    },
    descriptions: {
      vi: "Cho thuê căn hộ 3 phòng ngủ (3PN) rộng 95–150m² tại Đà Nẵng cho gia đình & chuyên gia ✓ Hồ bơi, gym, gần trường quốc tế & biển Mỹ Khê ✓ Hợp đồng song ngữ →",
      en: "Spacious 3-bedroom family condos (95–150m²) in Da Nang near international schools, pools & My Khe Beach ✓ Direct owner leases & NA17 support →",
      zh: "岘港 95–150m² 宽敞三居室家庭公寓，配泳池健身房，毗邻国际学校与美溪海滩，提供双语长租合同 →",
      ru: "Большие 3-комнатные квартиры (95–150 м²) для семей в Дананге рядом с международными школами и морем →",
      ko: "다낭 가족 거주에 최적인 95~150m² 대형 3베드룸 아파트 ✓ 수영장·국제학교 인접 ✓ 안전한 이중언어 계약 →",
      ja: "ダナン駐在員・ご家族向け95〜150m²の広々3LDK賃貸 ✓ プール・インターナショナルスクール近接 →"
    },
    keywords: {
      vi: "thuê căn hộ 3 phòng ngủ Đà Nẵng, thuê chung cư 3PN Đà Nẵng cho gia đình, căn hộ 3PN The Panoma Azura Monarchy",
      en: "3 bedroom apartment Da Nang, family condo for rent Da Nang, large apartment Da Nang"
    },
    h1: {
      vi: "Cho thuê căn hộ 3 phòng ngủ (3PN) Đà Nẵng — Không gian rộng cho gia đình & chuyên gia",
      en: "3-Bedroom Family Condos & Residences for Rent in Da Nang",
      zh: "岘港三居室 (3BR) 家庭优选长租公寓",
      ru: "3-комнатные семейные квартиры в Дананге",
      ko: "다낭 3베드룸 가족형 대형 아파트 임대",
      ja: "ダナン 3ベッドルーム（3LDK）ファミリー向け物件"
    }
  },
  {
    slug: "biet-thu-villa",
    filter: { propertyType: "villa" },
    titles: {
      vi: "Thuê Biệt Thự & Villa Hồ Bơi Đà Nẵng Dài Hạn | KIN Estates",
      en: "Private Pool Villas for Rent in Da Nang (Monthly) | KIN",
      zh: "岘港独栋泳池别墅 (Pool Villa) 长期租赁 | KIN Estates",
      ru: "Аренда Вилл с Бассейном в Дананге Долгосрочно | KIN Estates",
      ko: "다낭 프라이빗 풀빌라 장기 임대 월세 전문 | KIN Estates",
      ja: "ダナン 専用プール付きヴィラ長期賃貸 | KIN Estates"
    },
    descriptions: {
      vi: "Cho thuê biệt thự hồ bơi riêng & villa sân vườn Đà Nẵng (3–5PN) tại Nam Việt Á, Euro Village, Đảo Xanh, Sơn Trà, biển Mỹ Khê, Hòa Xuân ✓ Giá chủ nhà, xem thực tế →",
      en: "Private saltwater pool villas & garden homes (3–5BR) for long-term rent in Da Nang: Nam Viet A, Euro Village, Son Tra, My Khe Beach & Hoa Xuan →",
      zh: "岘港南越亚、欧洲村(Euro Village)、美溪海滩与山茶独栋私家泳池别墅长租(3–5卧室)，房东直租透明签约 →",
      ru: "Виллы с собственным бассейном и садом (3–5 спален) в аренду в Дананге: Нам Вьет А, Euro Village, Ми Кхе, Шонча, Хоа Суан →",
      ko: "남비엣아, 유로빌리지, 미케비치, 선짜, 호아쑤언 등 다낭 3~5베드룸 프라이빗 풀빌라 장기 임대 ✓ 집주인 직거래 →",
      ja: "ナムベトア・ユーロビレッジ・ミーケー・ソンチャの専用プール付き高級ヴィラ（3〜5寝室）長期賃貸 →"
    },
    keywords: {
      vi: "thuê biệt thự Đà Nẵng, thuê villa hồ bơi Đà Nẵng dài hạn, thuê biệt thự Nam Việt Á, Euro Village, Đảo Xanh, biệt thự biển Mỹ Khê, Hòa Xuân",
      en: "villa for rent Da Nang, private pool villa Da Nang monthly, long term villa rental Da Nang, Euro Village Nam Viet A villa"
    },
    h1: {
      vi: "Cho thuê Biệt thự & Villa hồ bơi riêng tại Đà Nẵng — Dài hạn 3–12+ tháng",
      en: "Private Pool Villas & Garden Residences for Rent in Da Nang",
      zh: "岘港独栋私家泳池别墅长租精选",
      ru: "Аренда частных вилл с бассейном в Дананге",
      ko: "다낭 프라이빗 풀빌라 & 가든 빌라 장기 임대",
      ja: "ダナン 専用プール付き高級ヴィラ長期賃貸"
    }
  },
  {
    slug: "nha-nguyen-can",
    filter: { propertyType: "house" },
    titles: {
      vi: "Thuê Nhà Nguyên Căn Đà Nẵng Đẹp Giá Tốt 2026 | KIN Estates",
      en: "Houses for Rent in Da Nang — Long-Term Homes | KIN Estates",
      zh: "岘港整栋别墅与独栋民宅长租 — 房东直租 | KIN Estates",
      ru: "Аренда Домов в Дананге на Длительный Срок | KIN Estates",
      ko: "다낭 단독주택 & 타운하우스 장기 임대 월세 | KIN Estates",
      ja: "ダナン 一軒家・タウンハウス長期賃貸物件 | KIN Estates"
    },
    descriptions: {
      vi: "Cho thuê nhà nguyên căn, nhà phố sân vườn & shophouse Đà Nẵng tại Hải Châu, Sơn Trà, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ, Thanh Khê ✓ Có gara ô tô, hợp đồng rõ ràng →",
      en: "Whole houses, modern townhouses & garden homes for long-term rent across Da Nang (An Thuong, Hoa Xuan, Nam Viet A, Hai Chau, Son Tra) ✓ Direct owner deals →",
      zh: "岘港海洲、山茶、五行山、和春与锦荔整栋现代联排与花园住宅长租，带私家车库，房东直接签约 →",
      ru: "Аренда целых домов и таунхаусов в Дананге (Ан Тхыонг, Хоа Суан, Нам Вьет А, Хайтяу, Шонча) на 6–12+ месяцев →",
      ko: "다낭 안트엉, 호아쑤언, 남비엣아, 하이쩌우, 선짜 전 지역 단독주택·타운하우스 장기 임대 ✓ 주차장 완비 →",
      ja: "ダナン各地（アントゥオン・ホアスアン・ハイチャウ・ソンチャ）のモダン一軒家・タウンハウス長期賃貸 →"
    },
    keywords: {
      vi: "thuê nhà nguyên căn Đà Nẵng, cho thuê nhà Đà Nẵng dài hạn, thuê nhà nguyên căn Hòa Xuân, Cẩm Lệ, Sơn Trà, Hải Châu, Ngũ Hành Sơn",
      en: "house for rent Da Nang, townhouse rental Da Nang, long term house Da Nang Vietnam"
    },
    h1: {
      vi: "Cho thuê Nhà nguyên căn & Nhà phố Đà Nẵng — Dài hạn trực tiếp chủ nhà",
      en: "Whole Houses & Townhouses for Long-Term Rent in Da Nang",
      zh: "岘港整栋住宅与联排别墅长租精选",
      ru: "Аренда домов и таунхаусов в Дананге",
      ko: "다낭 단독주택 & 타운하우스 장기 임대",
      ja: "ダナン 一軒家・タウンハウス長期賃貸"
    }
  },
  {
    slug: "penthouse",
    filter: { propertyType: "penthouse" },
    titles: {
      vi: "Thuê Penthouse & Căn Hộ Hạng Sang Đà Nẵng | KIN Estates",
      en: "Luxury Penthouses & Executive Condos Da Nang | KIN Estates",
      zh: "岘港顶层豪宅公寓 (Penthouse) 全景长租 | KIN Estates",
      ru: "Аренда Пентхаусов и Элитных Квартир Дананг | KIN Estates",
      ko: "다낭 럭셔리 펜트하우스 & 최고급 레지던스 임대 | KIN",
      ja: "ダナン 高級ペントハウス・エグゼクティブ賃貸 | KIN Estates"
    },
    descriptions: {
      vi: "Bộ sưu tập Penthouse & căn hộ hạng sang view toàn cảnh sông Hàn, cầu Rồng & biển Mỹ Khê (The Filmore, The Panoma, Azura, Indochina) ✓ Tư vấn riêng tư 1-1 →",
      en: "Exclusive collection of luxury penthouses & sky residences in Da Nang with panoramic Han River & ocean views (The Filmore, The Panoma, Azura) ✓ Private 1-on-1 tours →",
      zh: "岘港顶级江景与海景顶层复式豪宅 (Penthouse)，覆盖 The Filmore、The Panoma、Azura，1对1私密看房服务 →",
      ru: "Эксклюзивные пентхаусы и элитные апартаменты в Дананге с панорамным видом на реку Хан и океан (Filmore, Panoma, Azura) →",
      ko: "한강·용다리·미케비치 파노라마 뷰를 자랑하는 다낭 최고급 펜트하우스 컬렉션 (더 필모어, 더 파노마, 아주라) →",
      ja: "ハン川とオーシャンビューを一望するダナン最高級ペントハウス＆ラグジュアリーレジデンス（The Filmore・Azura等）→"
    },
    keywords: {
      vi: "thuê penthouse Đà Nẵng, cho thuê căn hộ hạng sang Đà Nẵng, penthouse The Filmore, The Panoma, Azura, căn hộ cao cấp view sông Hàn",
      en: "penthouse for rent Da Nang, luxury condo Da Nang, executive apartment Han River Da Nang"
    },
    h1: {
      vi: "Cho thuê Penthouse & Căn hộ hạng sang Đà Nẵng — View toàn cảnh sông Hàn & biển",
      en: "Luxury Penthouses & Sky Residences for Rent in Da Nang",
      zh: "岘港全景顶层豪宅 (Penthouse) 精选",
      ru: "Элитные пентхаусы и апартаменты в Дананге",
      ko: "다낭 럭셔리 펜트하우스 & 스카이 레지던스",
      ja: "ダナン 高級ペントハウス＆ラグジュアリー物件"
    }
  },
  {
    slug: "mua-ban-nha-dat",
    filter: { query: "" },
    titles: {
      vi: "Mua Bán Căn Hộ, Biệt Thự & Nhà Đất Đà Nẵng | KIN Estates",
      en: "Buy Apartments, Condos & Villas in Da Nang | KIN Estates",
      zh: "岘港房产买卖与投资 — 公寓・海景别墅直售 | KIN Estates",
      ru: "Купить Квартиру или Виллу в Дананге — Вьетнам | KIN Estates",
      ko: "다낭 아파트·풀빌라 매매 및 부동산 투자 상담 | KIN Estates",
      ja: "ダナン 不動産購入・マンション・ヴィラ売買 | KIN Estates"
    },
    descriptions: {
      vi: "Tư vấn mua bán & chuyển nhượng căn hộ chung cư, penthouse, biệt thự và nhà phố Đà Nẵng (The Filmore, Sun Cosmo, Hiyori, Hòa Xuân, Mỹ Khê) ✓ Pháp lý sổ hồng minh bạch →",
      en: "Advisory for buying apartments, penthouses & villas in Da Nang (foreigner quota SPA & pink book properties) ✓ Verified resale & investment yield analysis →",
      zh: "越南岘港房产置业与二手转售顾问：外籍可购份额(SPA)海景江景公寓与独栋别墅，法务透明、租金回报分析 →",
      ru: "Покупка и инвестиции в недвижимость Дананга: квартиры и виллы с иностранной квотой (SPA), юридическая проверка и доходность →",
      ko: "다낭 아파트·풀빌라 매매 및 외국인 소유권(SPA) 투자 컨설팅 ✓ 더 필모어, 선코스모, 히요리, 호아쑤언 실매물 안내 →",
      ja: "ダナン不動産購入・投資コンサルティング：外国人購入枠（SPA）対応コンドミニアム・ヴィラの法務確認から賃貸運用まで →"
    },
    keywords: {
      vi: "mua bán căn hộ Đà Nẵng, mua chung cư Đà Nẵng, mua nhà Đà Nẵng, mua biệt thự Đà Nẵng, đầu tư bất động sản Đà Nẵng, chuyển nhượng The Filmore Sun Cosmo Hiyori",
      en: "buy apartment Da Nang, Da Nang real estate for sale, buy condo Da Nang foreigner, villa for sale Da Nang Vietnam"
    },
    h1: {
      vi: "Tư vấn Mua bán & Đầu tư Căn hộ, Biệt thự, Nhà đất Đà Nẵng — Pháp lý minh bạch",
      en: "Buy Apartments, Condos & Villas in Da Nang — Investment & Resale Advisory",
      zh: "岘港公寓与别墅买卖投资顾问 — 产权清晰透明",
      ru: "Покупка квартир, вилл и недвижимости в Дананге",
      ko: "다낭 아파트 · 풀빌라 매매 및 부동산 투자 컨설팅",
      ja: "ダナン コンドミニアム・ヴィラ購入＆不動産投資"
    }
  },
  {
    slug: "can-ho-gan-bien-my-khe",
    filter: { tag: "Gần biển" },
    titles: {
      vi: "Thuê Căn Hộ, Studio & Villa Gần Biển Mỹ Khê Đà Nẵng | KIN Estates",
      en: "Beachside Apartments & Villas Near My Khe Beach Da Nang | KIN",
      zh: "岘港美溪海滩旁海景公寓与别墅长租 | KIN Estates",
      ru: "Квартиры и Виллы у Пляжа Ми Кхе в Дананге | KIN Estates",
      ko: "다낭 미케비치 도보권 오션뷰 아파트 & 풀빌라 임대 | KIN",
      ja: "ダナン ミーケービーチ徒歩圏内の賃貸アパート＆ヴィラ | KIN"
    },
    descriptions: {
      vi: "Tổng hợp căn hộ, studio, nhà nguyên căn & villa đi bộ 3–5 phút ra biển Mỹ Khê, An Thượng, Võ Nguyên Giáp, Phạm Văn Đồng ✓ Đầy đủ nội thất, giá chủ nhà →",
      en: "Walk 3–5 minutes to My Khe Beach: verified beachfront condos, studios & pool villas in An Thuong, My An & Phuoc My ✓ Direct owner rates →",
      zh: "步行3–5分钟直达美溪海滩：精选安上区与武元甲大道海景公寓、Studio及泳池别墅长租 →",
      ru: "3–5 минут пешком до пляжа Ми Кхе: проверенные квартиры, студии и виллы в Ан Тхыонг и Фыок Ми →",
      ko: "미케비치 도보 3~5분 거리 검증된 오션뷰 아파트·스튜디오·풀빌라 장기 임대 ✓ 집주인 직거래 →",
      ja: "ミーケービーチまで徒歩3〜5分の厳選アパート・スタジオ・プールヴィラ長期賃貸 →"
    },
    keywords: {
      vi: "thuê căn hộ gần biển Mỹ Khê Đà Nẵng, căn hộ view biển Đà Nẵng, thuê nhà gần biển Mỹ Khê, căn hộ Võ Nguyên Giáp Phạm Văn Đồng An Thượng",
      en: "beachfront apartment Da Nang, rent apartment near My Khe Beach, ocean view condo Da Nang"
    },
    h1: {
      vi: "Cho thuê Căn hộ, Studio & Biệt thự gần biển Mỹ Khê Đà Nẵng — Đi bộ ra biển",
      en: "Beachside Apartments, Studios & Villas Near My Khe Beach, Da Nang",
      zh: "岘港美溪海滩步行圈精选公寓与别墅",
      ru: "Квартиры и виллы рядом с пляжем Ми Кхе в Дананге",
      ko: "다낭 미케비치 도보권 오션뷰 아파트 & 빌라",
      ja: "ミーケービーチ近くの賃貸マンション＆ヴィラ"
    }
  },
  {
    slug: "can-ho-view-song-han",
    filter: { tag: "View sông Hàn" },
    titles: {
      vi: "Thuê Căn Hộ & Chung Cư View Sông Hàn, Cầu Rồng Đà Nẵng | KIN",
      en: "Han River & Dragon Bridge View Condos Da Nang | KIN Estates",
      zh: "岘港韩江景与龙桥全景高端公寓长租 | KIN Estates",
      ru: "Квартиры с Видом на Реку Хан и Мост Дракона Дананг | KIN",
      ko: "다낭 한강뷰 & 용다리 조망 고급 아파트 장기 임대 | KIN",
      ja: "ダナン ハン川＆ドラゴンブリッジ眺望マンション賃貸 | KIN"
    },
    descriptions: {
      vi: "Bộ sưu tập căn hộ chung cư & penthouse view trực diện sông Hàn, ngắm pháo hoa DIFF & Cầu Rồng (The Filmore, The Panoma, Hiyori, Monarchy, Azura, Indochina) →",
      en: "Panoramic Han River, Dragon Bridge & DIFF fireworks view condos in Da Nang (The Filmore, The Panoma, Hiyori, Monarchy, Azura) ✓ Official EVN rates →",
      zh: "直面韩江、龙桥与国际烟花节全景高端公寓（The Filmore、The Panoma、Hiyori、Monarchy、Azura）长租精选 →",
      ru: "Видовые квартиры на реку Хан и Мост Дракона в лучших ЖК Дананга (Filmore, Panoma, Hiyori, Monarchy, Azura) →",
      ko: "한강·용다리·불꽃축제 파노라마 뷰 아파트 (더 필모어, 더 파노마, 히요리, 모나키, 아주라) 장기 임대 →",
      ja: "ハン川・ドラゴンブリッジ・花火大会を一望する高級賃貸マンション（The Filmore・The Panoma等）→"
    },
    keywords: {
      vi: "thuê căn hộ view sông Hàn Đà Nẵng, căn hộ ngắm Cầu Rồng, căn hộ xem pháo hoa Đà Nẵng, chung cư bờ sông Hàn Bạch Đằng Trần Hưng Đạo",
      en: "Han River view apartment Da Nang, Dragon Bridge condo Da Nang, riverfront luxury apartment Da Nang"
    },
    h1: {
      vi: "Cho thuê Căn hộ & Penthouse View Sông Hàn, Cầu Rồng Đà Nẵng",
      en: "Han Riverfront & Dragon Bridge View Residences in Da Nang",
      zh: "岘港韩江与龙桥全景公寓长租",
      ru: "Квартиры с панорамным видом на реку Хан в Дананге",
      ko: "다낭 한강뷰 & 용다리 파노라마 레지던스",
      ja: "ハン川＆ドラゴンブリッジ眺望レジデンス"
    }
  },
  {
    slug: "can-ho-cho-nuoi-thu-cung",
    filter: { tag: "Thú cưng" },
    titles: {
      vi: "Thuê Căn Hộ & Nhà Cho Nuôi Thú Cưng (Pet-Friendly) Đà Nẵng",
      en: "Pet-Friendly Apartments, Houses & Villas Da Nang | KIN Estates",
      zh: "岘港允许养宠物 (Pet-Friendly) 公寓与别墅长租 | KIN Estates",
      ru: "Квартиры и Виллы Можно с Животными в Дананге | KIN Estates",
      ko: "다낭 반려동물 동반 가능 (Pet-Friendly) 아파트·주택 임대 | KIN",
      ja: "ダナン ペット可（Pet-Friendly）賃貸アパート・一軒家 | KIN"
    },
    descriptions: {
      vi: "Danh sách căn hộ chung cư (The Monarchy, An Thượng), nhà nguyên căn & biệt thự sân vườn cho phép nuôi chó mèo tại Đà Nẵng ✓ Cam kết rõ trong hợp đồng →",
      en: "Verified pet-friendly apartments, condos (The Monarchy), townhouses & garden villas welcoming cats and dogs in Da Nang ✓ Written landlord approval →",
      zh: "精选岘港允许养猫狗的宠物友好型公寓（The Monarchy、安上区）、整栋住宅与花园别墅，合同明确写入养宠许可 →",
      ru: "Проверенные pet-friendly квартиры (The Monarchy), дома и виллы с садом в Дананге, где разрешено проживание с кошками и собаками →",
      ko: "강아지·고양이 동반 입주가 계약서에 명시되는 다낭 펫프렌들리 아파트(더 모나키)·단독주택·정원 풀빌라 →",
      ja: "犬・猫の飼育が契約書で保証されるダナンのペット可マンション・庭付きヴィラ特集 →"
    },
    keywords: {
      vi: "thuê căn hộ cho nuôi thú cưng Đà Nẵng, căn hộ pet friendly Đà Nẵng, thuê nhà nuôi chó mèo Đà Nẵng, chung cư Monarchy nuôi thú cưng",
      en: "pet friendly apartment Da Nang, dog friendly house rental Da Nang, cat friendly condo Da Nang"
    },
    h1: {
      vi: "Cho thuê Căn hộ, Nhà nguyên căn & Villa Cho Nuôi Thú Cưng tại Đà Nẵng",
      en: "Pet-Friendly Apartments, Houses & Garden Villas in Da Nang",
      zh: "岘港宠物友好型 (Pet-Friendly) 公寓与花园别墅",
      ru: "Pet-Friendly квартиры, дома и виллы в Дананге",
      ko: "다낭 반려동물 동반 가능 아파트 & 정원 주택",
      ja: "ダナン ペット飼育可能な賃貸マンション＆ヴィラ"
    }
  },
  {
    slug: "ky-gui-cho-thue-nha-da-nang",
    filter: { query: "" },
    titles: {
      vi: "Nhận Ký Gửi Cho Thuê & Mua Bán Căn Hộ, Nhà, Villa Đà Nẵng | KIN",
      en: "List Your Da Nang Property — Landlord Leasing & Sales | KIN",
      zh: "岘港房东委托出租与出售服务（公寓・别墅管理）| KIN Estates",
      ru: "Сдать или Продать Недвижимость в Дананге — Для Собственников",
      ko: "다낭 부동산 임대·매매 위탁 접수 (집주인 전용) | KIN Estates",
      ja: "ダナン不動産オーナー様向け賃貸・売却委託サービス | KIN"
    },
    descriptions: {
      vi: "Dịch vụ nhận ký gửi cho thuê dài hạn & mua bán căn hộ chung cư, tòa căn hộ, nhà nguyên căn, biệt thự tại Đà Nẵng ✓ Chụp ảnh thực tế, tệp khách chuyên gia uy tín →",
      en: "Partner with KIN Estates Da Nang to lease or sell your condo, apartment building, house, or pool villa to vetted long-term expat & executive tenants →",
      zh: "委托 KIN Estates 出租或出售您在岘港的公寓、整栋住宅或泳池别墅：专业实拍、精准匹配优质长租外籍专家与家庭客户 →",
      ru: "Доверьте сдачу или продажу вашей квартиры, дома или виллы в Дананге агентству KIN Estates: проверенные долгосрочные арендаторы →",
      ko: "다낭 아파트·단독주택·풀빌라 임대 및 매매 위탁: 검증된 외국인 주재원·장기 임차인 빠른 매칭 →",
      ja: "ダナンのマンション・ヴィラの賃貸募集・売却サポート：優良な長期入居者を迅速にご紹介 →"
    },
    keywords: {
      vi: "ký gửi căn hộ Đà Nẵng, nhận ký gửi nhà đất Đà Nẵng, ký gửi cho thuê nhà nguyên căn biệt thự Đà Nẵng, tìm khách thuê căn hộ Đà Nẵng",
      en: "list property Da Nang, property management Da Nang, rent out apartment Da Nang"
    },
    h1: {
      vi: "Nhận Ký Gửi Cho Thuê & Mua Bán Căn Hộ, Nhà Nguyên Căn, Biệt Thự Đà Nẵng",
      en: "Landlord Services — Lease or Sell Your Da Nang Residence with KIN Estates",
      zh: "岘港房东房产委托出租与出售中心",
      ru: "Услуги для собственников недвижимости в Дананге",
      ko: "다낭 부동산 임대 · 매매 위탁 센터",
      ja: "ダナン不動産 賃貸・売却オーナー様窓口"
    }
  }
];

// 6 Deep Indexable Pillar SEO Articles (/guides/:slug)
const SEO_GUIDE_ARTICLES = [
  {
    slug: "gia-thue-can-ho-da-nang-2026",
    datePublished: "2026-10-15",
    dateModified: "2026-11-25",
    titles: {
      vi: "Bảng Giá Thuê Căn Hộ & Chung Cư Đà Nẵng 2026 Chi Tiết | KIN",
      en: "Da Nang Apartment & Condo Rent Prices 2026 Guide | KIN Estates",
      zh: "2026 越南岘港公寓与别墅月租行情完整指南 | KIN Estates",
      ru: "Цены на Аренду Квартир и Вилл в Дананге 2026 | KIN Estates",
      ko: "2026 다낭 아파트·빌라 지역별 월세 시세 완벽 정리 | KIN",
      ja: "2026年ダナン賃貸マンション・ヴィラ家賃相場完全ガイド | KIN"
    },
    descriptions: {
      vi: "Cập nhật giá thuê căn hộ Studio, 1PN, 2PN, 3PN & biệt thự Đà Nẵng 2026 theo từng tòa nhà (The Filmore, The Panoma, Hiyori, Monarchy, Azura) và 19 khu vực →",
      en: "Real 2026 monthly rent benchmarks in Da Nang across Studio, 1BR, 2BR, 3BR condos & villas (The Filmore, Panoma, Hiyori, Monarchy, Azura) + utility breakdown →"
    },
    keywords: "giá thuê căn hộ Đà Nẵng 2026, bảng giá chung cư Đà Nẵng, thuê căn hộ The Filmore giá bao nhiêu, giá thuê Hiyori Monarchy The Panoma, Da Nang rent prices 2026",
    sections: {
      vi: [
        {
          h2: "1. Mặt bằng giá thuê căn hộ Đà Nẵng 2026 theo loại hình",
          p: "Thị trường cho thuê dài hạn tại Đà Nẵng năm 2026 phân hóa rõ theo vị trí (gần biển Mỹ Khê, ven sông Hàn hay khu đô thị mới Hòa Xuân) và tiêu chuẩn vận hành tòa nhà. Căn hộ Studio & 1 phòng ngủ đầy đủ nội thất dao động 7 – 15 triệu/tháng ($300 – $600); chung cư cao cấp 2 phòng ngủ từ 16 – 35 triệu/tháng ($650 – $1,400); căn 3 phòng ngủ, Penthouse và biệt thự hồ bơi riêng từ 33 – 85 triệu/tháng ($1,300 – $3,500)."
        },
        {
          h2: "2. Bảng giá thực tế các tòa chung cư nổi bật tại Đà Nẵng",
          p: "• The Filmore Đà Nẵng (Hải Châu — Bờ Tây sông Hàn): 1PN từ $1,000–$1,300/tháng; 2PN từ $1,450–$2,100/tháng.\n• The Panoma — Sun Cosmo Residence (Ngũ Hành Sơn — Cầu Trần Thị Lý): Studio/1PN từ $650–$950/tháng; 2PN từ $950–$1,400/tháng; 3PN từ $1,400–$2,000/tháng.\n• Hiyori Garden Tower (Sơn Trà — Đường Võ Văn Kiệt): 2PN chuẩn quản lý Nhật Bản từ $750–$1,050/tháng.\n• The Monarchy Block B (Sơn Trà — Bờ Đông sông Hàn, nuôi thú cưng): 2PN từ $620–$900/tháng.\n• Azura, Indochina Riverside & Blooming Tower: 1–3PN từ $650–$1,800/tháng."
        },
        {
          h2: "3. Chi phí điện EVN, nước & cách thuê được giá tốt trực tiếp chủ nhà",
          p: "Thuê hợp đồng 6–12 tháng giúp tiết kiệm 10–18% so với thuê ngắn hạn theo tháng. Toàn bộ các tòa chung cư thương mại đều tính điện theo hóa đơn EVN nhà nước (~2.800đ/kWh). KIN Estates kiểm định trực tiếp từng căn, công khai mọi khoản phí trước khi đi xem và kết nối ký hợp đồng song ngữ trực tiếp với chủ sở hữu."
        }
      ],
      en: [
        {
          h2: "1. Da Nang Monthly Rental Benchmarks by Property Type (2026)",
          p: "In 2026, furnished Studios and 1-bedroom apartments across An Thuong, My Khe Beach, Son Tra, and Hoa Xuan range from $300–$600/month. Modern 2-bedroom condos in landmark towers (Hiyori, Monarchy, The Panoma, The Filmore) range from $650–$1,450/month, while 3-bedroom penthouses and private pool villas range from $1,300–$3,500/month."
        },
        {
          h2: "2. Top Condominium Tower Rent Ranges in Da Nang",
          p: "• The Filmore Da Nang (Hai Chau): 1BR $1,000–$1,300/mo | 2BR $1,450–$2,100/mo.\n• The Panoma / Sun Cosmo Residence (Ngu Hanh Son): 1BR $650–$950/mo | 2BR $950–$1,400/mo | 3BR $1,400–$2,000/mo.\n• Hiyori Garden Tower (Son Tra — Japanese management): 2BR $750–$1,050/mo.\n• The Monarchy (Son Tra — Pet-friendly): 2BR $620–$900/mo."
        },
        {
          h2: "3. Official EVN Electricity & How to Secure Direct Owner Pricing",
          p: "Signing a 6- or 12-month lease saves 10–18% compared to short-term stays. Commercial condo towers charge state EVN electricity rates (~2,800 VND/kWh). KIN Estates audits natural light, acoustics, and fiber internet in person and connects you directly with verified landlords."
        }
      ]
    }
  },
  {
    slug: "so-sanh-khu-vuc-thue-nha-da-nang",
    datePublished: "2026-10-18",
    dateModified: "2026-11-25",
    titles: {
      vi: "Nên Thuê Nhà Khu Vực Nào Ở Đà Nẵng? So Sánh 19 Quận Phường",
      en: "Where to Live in Da Nang? Comparing All 19 Districts (2026)",
      zh: "岘港租房住哪个区最好？19个核心街区深度对比 | KIN",
      ru: "Где Лучше Жить в Дананге? Сравнение Всех Районов | KIN",
      ko: "다낭 어느 동네가 살기 좋을까? 19개 지역 완벽 비교 | KIN",
      ja: "ダナンどこに住むべき？全19エリア徹底比較ガイド | KIN"
    },
    descriptions: {
      vi: "So sánh chi tiết ưu nhược điểm khi thuê căn hộ tại An Thượng, Biển Mỹ Khê, Sơn Trà, Hải Châu, Ngũ Hành Sơn, Hòa Xuân, Cẩm Lệ, Nam Việt Á & FPT City →",
      en: "Side-by-side comparison of An Thuong, My Khe Beach, Han Riverfront, Son Tra, Hai Chau, Hoa Xuan, Cam Le, Nam Viet A & FPT City for expats & families →"
    },
    keywords: "nên thuê căn hộ khu vực nào Đà Nẵng, so sánh An Thượng Sơn Trà Hải Châu Hòa Xuân, khu vực đáng sống nhất Đà Nẵng, where to live in Da Nang",
    sections: {
      vi: [
        {
          h2: "1. Nhóm ven biển & cộng đồng quốc tế: An Thượng, Mỹ An, Biển Mỹ Khê, Phước Mỹ",
          p: "Lựa chọn số 1 cho người làm việc từ xa (Digital Nomad), khách Hàn, Tây và người thích đi bộ 3–5 phút ra biển Mỹ Khê. Xung quanh dày đặc quán specialty coffee, phòng gym, nhà hàng quốc tế. Phù hợp nhất cho căn hộ Studio, 1PN và boutique apartment."
        },
        {
          h2: "2. Nhóm trung tâm & view sông Hàn: Hải Châu, Ven sông Hàn, Sơn Trà",
          p: "Hải Châu và bờ Tây/Đông sông Hàn tập trung các tòa chung cư hạng sang như The Filmore, Hiyori, The Monarchy, Azura. Chỉ 5–8 phút ra sân bay quốc tế Đà Nẵng, bệnh viện Vinmec, trường quốc tế và chuỗi nhà hàng Michelin."
        },
        {
          h2: "3. Nhóm khu đô thị yên tĩnh & giá trị cao: Hòa Xuân, Cẩm Lệ, Nam Việt Á, FPT City",
          p: "Hòa Xuân (Đảo VIP, Nam Hòa Xuân, Euro Village 2), Nam Việt Á và FPT City / Hòa Hải có đường rộng rợp cây xanh, cực kỳ yên tĩnh, không kẹt xe, giá thuê căn hộ và nhà nguyên căn/biệt thự dễ chịu hơn khu trung tâm 20–35% — lý tưởng cho gia đình ở dài hạn và chuyên gia làm việc tại khu công nghệ."
        }
      ],
      en: [
        {
          h2: "1. Beachfront & Expat Core: An Thuong, My Khe Beach, My An & Phuoc My",
          p: "Top pick for remote workers and beach lovers who want a 3–5 minute walk to My Khe Beach, surrounded by specialty coffee roasteries, coworking hubs, and international dining."
        },
        {
          h2: "2. Skyline Luxury & Central Convenience: Hai Chau, Han Riverfront & Son Tra",
          p: "Home to flagship condo towers (The Filmore, Hiyori, The Monarchy, Azura), 5–8 minutes from Da Nang International Airport, Vinmec Hospital, and riverfront promenades."
        },
        {
          h2: "3. Quiet Spacious Living & Great Value: Hoa Xuan, Nam Viet A, Cam Le & FPT City",
          p: "Tree-lined master-planned neighborhoods offering 20–35% more space per dollar—ideal for families renting whole houses, private pool villas, or quiet modern apartments."
        }
      ]
    }
  },
  {
    slug: "kinh-nghiem-thue-biet-thu-nha-nguyen-can-da-nang",
    datePublished: "2026-10-22",
    dateModified: "2026-11-25",
    titles: {
      vi: "Kinh Nghiệm Thuê Biệt Thự Hồ Bơi & Nhà Nguyên Căn Đà Nẵng",
      en: "Guide to Renting Pool Villas & Houses in Da Nang | KIN Estates",
      zh: "岘港长租独栋泳池别墅与整栋房屋避坑指南 | KIN Estates",
      ru: "Как Снять Виллу с Бассейном или Дом в Дананге | KIN Estates",
      ko: "다낭 풀빌라 · 단독주택 장기 임대 필수 체크리스트 | KIN",
      ja: "ダナン プールヴィラ・一軒家長期賃貸チェックリスト | KIN"
    },
    descriptions: {
      vi: "5 lưu ý sống còn khi thuê biệt thự hồ bơi và nhà nguyên căn Đà Nẵng dài hạn: bảo trì hồ bơi, chống thấm mùa mưa, hóa đơn EVN, hợp đồng song ngữ & an ninh →",
      en: "Essential checklist before signing a long-term villa or house lease in Da Nang: pool maintenance, monsoon waterproofing, EVN bills, security & direct owner terms →"
    },
    keywords: "kinh nghiệm thuê biệt thự Đà Nẵng, thuê villa hồ bơi Đà Nẵng, thuê nhà nguyên căn Đà Nẵng dài hạn, Da Nang pool villa rental tips",
    sections: {
      vi: [
        {
          h2: "1. Những khu biệt thự đáng sống nhất Đà Nẵng",
          p: "Các khu biệt thự hồ bơi và nhà phố được khách gia đình & chuyên gia quốc tế ưa chuộng nhất gồm: Nam Việt Á (gần sông Hàn, 5 phút ra biển), Euro Village 1 & 2 (an ninh compound 24/7), Đảo Xanh (trung tâm Hải Châu), khu đảo VIP Hòa Xuân và dải ven biển Mỹ Khê – Sơn Trà."
        },
        {
          h2: "2. 5 hạng mục bắt buộc kiểm tra khi đi xem biệt thự / nhà nguyên căn",
          p: "1) Chi phí vệ sinh hồ bơi & cắt tỉa sân vườn hàng tuần đã gồm trong giá thuê hay chưa.\n2) Hệ thống chống thấm mái, cửa kính và máy hút ẩm cho mùa mưa Đà Nẵng (tháng 10–12).\n3) Công tơ điện 3 pha / giá điện nhà nước EVN và áp lực nước máy bơm tăng áp.\n4) Hợp đồng song ngữ quy định rõ trách nhiệm bảo trì máy lạnh, máy bơm, hệ lọc hồ bơi thuộc về chủ nhà.\n5) Biên bản bàn giao chụp ảnh chi tiết từng phòng và thiết bị ngày nhận chìa khóa."
        }
      ],
      en: [
        {
          h2: "1. Top Villa & House Communities in Da Nang",
          p: "The highest-demand residential villa enclaves are Nam Viet A (riverside quietness, 5 mins to My Khe Beach), Euro Village 1 & 2 (gated 24/7 security), Green Island (Dao Xanh), Hoa Xuan Eco-Island, and Son Tra coastal villas."
        },
        {
          h2: "2. 5-Point Villa Inspection Checklist",
          p: "Verify weekly pool & garden maintenance inclusion, roof/window waterproofing for the Oct–Dec monsoon, direct EVN electricity metering, landlord repair clauses for A/C and pool pumps, and a full photo inventory handover."
        }
      ]
    }
  },
  {
    slug: "huong-dan-thue-can-ho-da-nang-cho-nguoi-nuoc-ngoai",
    datePublished: "2026-10-25",
    dateModified: "2026-11-25",
    titles: {
      vi: "Hướng Dẫn Thuê Căn Hộ Đà Nẵng Cho Người Nước Ngoài (NA17)",
      en: "Expat Guide: Renting an Apartment in Da Nang (Form NA17)",
      zh: "外国人越南岘港长租全攻略（双语合同与NA17暂住登记）",
      ru: "Гайд для Иностранцев: Аренда Жилья в Дананге и NA17",
      ko: "외국인 다낭 아파트 장기 임대 & 공안 거주등록(NA17) 가이드",
      ja: "外国人向けダナン長期賃貸＆警察滞在登録（NA17）完全ガイド"
    },
    descriptions: {
      vi: "Quy trình chuẩn cho người nước ngoài thuê căn hộ dài hạn tại Đà Nẵng: giấy tờ cần có, hợp đồng song ngữ, đặt cọc an toàn & thủ tục khai báo tạm trú Form NA17 →",
      en: "Everything expats and digital nomads need to rent safely in Da Nang: visa & passport requirements, bilingual leases, deposits & 24h Form NA17 police registration →"
    },
    keywords: "thuê căn hộ Đà Nẵng cho người nước ngoài, Form NA17 Da Nang, expat apartment rental Da Nang Vietnam, temporary residence registration Da Nang",
    sections: {
      vi: [
        {
          h2: "1. Giấy tờ cần thiết & Hợp đồng thuê nhà song ngữ",
          p: "Người nước ngoài chỉ cần hộ chiếu còn hạn và thị thực (e-Visa / TRC) hợp lệ để ký hợp đồng thuê căn hộ dài hạn tại Đà Nẵng. KIN Estates cung cấp mẫu hợp đồng song ngữ Việt – Anh bảo vệ quyền lợi minh bạch về tiền cọc, thời hạn báo trước và trách nhiệm bảo trì."
        },
        {
          h2: "2. Khai báo tạm trú Công an Phường (Form NA17) trong 24 giờ",
          p: "Theo quy định pháp luật Việt Nam, chủ nhà có trách nhiệm khai báo tạm trú trực tuyến cho khách nước ngoài ngay khi nhận phòng. KIN Estates phối hợp cùng chủ nhà hoàn tất khai báo trong 24h đầu tiên và hỗ trợ xin bản xác nhận tạm trú có dấu đỏ (Mẫu NA17) để phục vụ gia hạn Visa, mở tài khoản ngân hàng hoặc làm Thẻ tạm trú (TRC)."
        }
      ],
      en: [
        {
          h2: "1. Required Documents & Bilingual Lease Protection",
          p: "Foreign tenants only need a valid passport and current Vietnam visa/TRC. KIN Estates prepares clear Vietnamese–English contracts directly with the verified property owner, protecting your security deposit, utility rates, and maintenance rights."
        },
        {
          h2: "2. Mandatory 24-Hour Police Registration (Form NA17)",
          p: "Within 24 hours of check-in, KIN Estates coordinates your landlord's online immigration declaration and assists with obtaining the red-stamped Form NA17 confirmation needed for visa extensions, TRC applications, and local banking."
        }
      ]
    }
  },
  {
    slug: "mua-ban-dau-tu-can-ho-da-nang-2026",
    datePublished: "2026-11-01",
    dateModified: "2026-11-25",
    titles: {
      vi: "Mua Bán & Đầu Tư Căn Hộ, Biệt Thự Đà Nẵng 2026 | KIN Estates",
      en: "Buying Apartments & Real Estate in Da Nang 2026 Guide | KIN",
      zh: "2026 越南岘港买房投资指南（外籍份额SPA与租金回报）",
      ru: "Покупка и Инвестиции в Недвижимость Дананга 2026 | KIN",
      ko: "2026 다낭 아파트 매매 & 부동산 투자 가이드 (외국인 SPA)",
      ja: "2026年ダナン不動産購入・投資ガイド（外国人枠SPA・利回り）"
    },
    descriptions: {
      vi: "Cẩm nang mua bán căn hộ, nhà đất & biệt thự Đà Nẵng 2026: pháp lý sổ hồng lâu dài, suất người nước ngoài (SPA), tỷ suất cho thuê 6–9%/năm & dự án nổi bật →",
      en: "Complete 2026 guide to buying condos & villas in Da Nang: pink book ownership, 30% foreigner quota (SPA), 6–9% rental yields & top riverfront/beach projects →"
    },
    keywords: "mua bán căn hộ Đà Nẵng 2026, đầu tư bất động sản Đà Nẵng, mua chung cư Đà Nẵng sổ hồng, buy property Da Nang foreigner SPA",
    sections: {
      vi: [
        {
          h2: "1. Xu hướng mua bán căn hộ & nhà đất Đà Nẵng 2026",
          p: "Với hạ tầng du lịch quốc tế bùng nổ, Khu thương mại tự do Đà Nẵng và trung tâm tài chính quốc tế đang triển khai, phân khúc căn hộ ven sông Hàn (The Filmore, Sun Cosmo Residence, Hiyori, Sun Ponte), biệt thự Hòa Xuân – Nam Việt Á và căn hộ công nghệ FPT City ghi nhận tỷ suất khai thác cho thuê thực tế đạt 6–9%/năm."
        },
        {
          h2: "2. Pháp lý mua nhà cho người Việt & khách quốc tế (SPA)",
          p: "Người Việt Nam được cấp Sổ hồng sở hữu lâu dài đối với chung cư thương mại & nhà đất. Khách nước ngoài được phép sở hữu hợp pháp tối đa 30% tổng số căn trong các dự án chung cư thương mại đủ điều kiện (hợp đồng mua bán SPA 50 năm, có quyền gia hạn, bán lại và cho thuê hợp pháp). KIN Estates hỗ trợ trọn gói từ thẩm định căn, kiểm tra pháp lý đến vận hành cho thuê tạo dòng tiền ngay sau khi nhận nhà."
        }
      ],
      en: [
        {
          h2: "1. Why Invest in Da Nang Real Estate in 2026",
          p: "Driven by booming international tourism, Da Nang's Free Trade Zone, and tech-hub expansion, prime Han Riverfront condos (The Filmore, Sun Cosmo Residence, Hiyori), Hoa Xuan villas, and FPT City apartments deliver real net rental yields of 6–9% annually."
        },
        {
          h2: "2. Ownership Rules for Foreign & Vietnamese Buyers",
          p: "Vietnamese citizens receive freehold pink-book ownership. Foreigners can legally own up to 30% of units in eligible commercial condo developments under a 50-year renewable Sale & Purchase Agreement (SPA), with full resale and leasing rights. KIN Estates advises on acquisition, legal due diligence, and turnkey long-term rental management."
        }
      ]
    }
  },
  {
    slug: "chi-phi-song-dien-nuoc-evn-da-nang",
    datePublished: "2026-11-10",
    dateModified: "2026-11-25",
    titles: {
      vi: "Chi Phí Sống, Điện EVN & Phí Quản Lý Chung Cư Đà Nẵng 2026",
      en: "Cost of Living & EVN Utility Bills in Da Nang 2026 | KIN",
      zh: "2026 岘港生活成本、EVN电费与公寓物业费详解 | KIN Estates",
      ru: "Стоимость Жизни и Коммунальные Услуги EVN в Дананге 2026",
      ko: "2026 다낭 한달 생활비, EVN 전기세 & 아파트 관리비 총정리",
      ja: "2026年ダナン生活費・EVN電気代・マンション管理費まとめ"
    },
    descriptions: {
      vi: "Chi tiết hóa đơn điện nhà nước EVN, nước sinh hoạt, internet cáp quang, phí quản lý & gửi xe tại các chung cư Đà Nẵng để bạn dự trù ngân sách chuẩn xác →",
      en: "Transparent breakdown of monthly living costs in Da Nang: state EVN electricity rates, water, 300Mbps fiber internet, condo management & parking fees →"
    },
    keywords: "chi phí sống Đà Nẵng 2026, giá điện EVN chung cư Đà Nẵng, phí quản lý Hiyori Filmore Monarchy, cost of living Da Nang 2026",
    sections: {
      vi: [
        {
          h2: "1. Cách tính tiền điện EVN & nước sinh hoạt",
          p: "Tại các tòa chung cư thương mại (Hiyori, The Filmore, The Panoma, Monarchy, Azura, FPT Plaza), tiền điện được tính trực tiếp theo biểu giá bậc thang EVN nhà nước (trung bình ~2.500 – 3.000đ/kWh). Một căn hộ 1–2PN bật điều hòa thường xuyên hết khoảng 800.000đ – 1.800.000đ/tháng. Tiền nước sinh hoạt rất rẻ, chỉ khoảng 80.000đ – 200.000đ/tháng."
        },
        {
          h2: "2. Internet cáp quang, phí quản lý & gửi xe",
          p: "• Internet cáp quang 300Mbps (Viettel / FPT): ~220.000đ – 300.000đ/tháng (nhiều căn dịch vụ đã bao gồm miễn phí).\n• Phí quản lý tòa nhà: 10.000đ – 28.000đ/m²/tháng (thường được thương lượng chủ nhà bao gồm trong hợp đồng 6–12 tháng).\n• Gửi xe máy: 80.000đ – 150.000đ/tháng; gửi ô tô hầm: 1.000.000đ – 1.800.000đ/tháng."
        }
      ],
      en: [
        {
          h2: "1. Official State EVN Electricity & Water Rates",
          p: "Commercial condos (Hiyori, Filmore, Panoma, Monarchy, Azura) bill electricity at official EVN tiered rates (~2,500–3,000 VND/kWh), averaging $35–$75/month for a 1–2BR unit with regular A/C use. Municipal water averages $4–$10/month."
        },
        {
          h2: "2. Fiber Internet, Building Management & Parking",
          p: "• 300Mbps Fiber Wi-Fi (Viettel/FPT): $9–$12/month (often included in serviced apartments).\n• Building management fees: often included in 6–12 month owner leases.\n• Motorbike basement parking: $3–$6/month; car parking: $40–$70/month."
        }
      ]
    }
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

function findPropertyTypeBySlug(slug) {
  const clean = String(slug || "").trim().toLowerCase();
  return PROPERTY_TYPE_LANDINGS.find((p) => p.slug === clean) || null;
}

function findGuideArticleBySlug(slug) {
  const clean = String(slug || "").trim().toLowerCase();
  return SEO_GUIDE_ARTICLES.find((g) => g.slug === clean) || null;
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
  findGuideArticleBySlug
};
