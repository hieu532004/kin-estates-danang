/**
 * Curated Da Nang Architectural Living Dataset (12 Verified Residences across 6 Premier Buildings)
 * Modeled after https://dananghomii.com/vi/ & https://dananghomii.com/en/
 */

const initialApartments = [
  {
    _id: "apt-panoma-1902",
    code: "DN-PAN-1902",
    title: {
      vi: "Căn hộ 1 phòng ngủ The Panoma 1 — View sông Hàn & Cầu Trần Thị Lý",
      en: "The Panoma 1 — 1BR Han River & Bridge View Residence",
      ru: "The Panoma 1 — Апартаменты с 1 спальней и видом на реку Хан"
    },
    building: "The Panoma (Sun Cosmo)",
    areaName: "Ngũ Hành Sơn",
    district: "Ngũ Hành Sơn",
    priceUsd: 654,
    priceVnd: 16650000,
    bedrooms: 1,
    bathrooms: 1,
    sizeM2: 50,
    floor: 19,
    orientation: "West-North / View sông Hàn",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN ~2,800đ/kWh)",
    naturalLightScore: 9.6,
    remoteWorkSetup: "Bàn làm việc cạnh kính lớn + Cáp quang 300Mbps",
    petPolicy: "Thương lượng với chủ nhà",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0488, lng: 108.2342 },
    architecturalNotes: {
      vi: "Thiết kế lấy cảm hứng từ nan chiếu Cẩm Nê truyền thống kết hợp mặt kính Low-E kịch trần. Tầm nhìn trực diện sông Hàn lộng gió, cách biển Mỹ Khê chỉ 5 phút di chuyển.",
      en: "Inspired by traditional Cam Ne mat weaving with full-height Low-E acoustic glass overlooking the Han River. 5 minutes to My Khe Beach.",
      ru: "Панорамное остекление Low-E во всю высоту с прямым видом на реку Хан."
    },
    tags: ["View sông Hàn", "Gần biển", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-10T08:00:00.000Z"
  },
  {
    _id: "apt-panoma-2405",
    code: "DN-PAN-2405",
    title: {
      vi: "Căn hộ 2 phòng ngủ góc The Panoma 2 — 2 mặt thoáng View Biển & Sông",
      en: "The Panoma 2 — Corner 2BR Dual Ocean & River Panorama",
      ru: "The Panoma 2 — Угловая квартира с 2 спальнями и видом на океан"
    },
    building: "The Panoma (Sun Cosmo)",
    areaName: "Ngũ Hành Sơn",
    district: "Ngũ Hành Sơn",
    priceUsd: 885,
    priceVnd: 22550000,
    bedrooms: 2,
    bathrooms: 2,
    sizeM2: 74,
    floor: 24,
    orientation: "Đông Nam / View biển Mỹ Khê",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.8,
    remoteWorkSetup: "Phòng làm việc phụ + Ghế công thái học",
    petPolicy: "Cho nuôi mèo sạch sẽ",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0491, lng: 108.2346 },
    architecturalNotes: {
      vi: "Căn góc tầng cao 24 đón nắng sớm biển Mỹ Khê, phòng khách rộng kết nối ban công dài. Nội thất gỗ sồi tự nhiên và thiết bị bếp Bosch đồng bộ.",
      en: "High-floor corner unit capturing morning ocean light, wrap-around balcony, white oak joinery, and integrated Bosch kitchen.",
      ru: "Угловая квартира на 24 этаже с утренним солнцем, дубовой мебелью и техникой Bosch."
    },
    tags: ["Gần biển", "View sông Hàn", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-11T08:00:00.000Z"
  },
  {
    _id: "apt-panoma-2801",
    code: "DN-PAN-2801",
    title: {
      vi: "Căn hộ 3 phòng ngủ The Panoma — Không gian gia đình chuẩn quốc tế",
      en: "The Panoma — 3BR Executive Family Sky Residence",
      ru: "The Panoma — Семейная резиденция с 3 спальнями"
    },
    building: "The Panoma (Sun Cosmo)",
    areaName: "Ngũ Hành Sơn",
    district: "Ngũ Hành Sơn",
    priceUsd: 1450,
    priceVnd: 36900000,
    bedrooms: 3,
    bathrooms: 2,
    sizeM2: 102,
    floor: 28,
    orientation: "Đông Bắc / Toàn cảnh thành phố & Biển",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.9,
    remoteWorkSetup: "Bàn làm việc đôi + Cách âm 2 lớp",
    petPolicy: "Cho nuôi thú cưng nhỏ",
    status: "Available",
    featured: false,
    coordinates: { lat: 16.0485, lng: 108.2339 },
    architecturalNotes: {
      vi: "Diện tích 102m² hiếm có với 3 phòng ngủ đều có cửa sổ lớn đón sáng tự nhiên, phòng giặt sấy riêng biệt và đảo bếp đá thạch anh.",
      en: "Rare 102m² 3-bedroom layout where every bedroom enjoys full daylight glazing, dedicated laundry utility room, and quartz kitchen island.",
      ru: "Просторная планировка 102 м² с 3 спальнями, прачечной и кварцевым островом."
    },
    tags: ["Gần biển", "View sông Hàn", "Bàn làm việc", "Thú cưng", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-11T10:00:00.000Z"
  },
  {
    _id: "apt-filmore-2401",
    code: "DN-FIL-2401",
    title: {
      vi: "The Filmore Đà Nẵng — Loft 2PN Ban Công Vươn Sông Hàn & Cầu Rồng",
      en: "The Filmore Da Nang — Cantilevered 2BR Han River & Dragon Bridge Loft",
      ru: "The Filmore — Архитектурный лофт с 2 спальнями и видом на реку Хан"
    },
    building: "The Filmore Da Nang",
    areaName: "Hải Châu",
    district: "Hải Châu",
    priceUsd: 1350,
    priceVnd: 34400000,
    bedrooms: 2,
    bathrooms: 2,
    sizeM2: 82,
    floor: 24,
    orientation: "Hướng Đông / Trực diện sông Hàn",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.8,
    remoteWorkSetup: "Bàn gỗ tần bì nguyên tấm + Wi-Fi 6",
    petPolicy: "Thương lượng",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0583, lng: 108.2242 },
    architecturalNotes: {
      vi: "Tòa tháp căn hộ hạng sang bậc nhất bờ Tây sông Hàn. Ban công vươn không cột che chắn, hồ bơi nước ấm vô cực tầng thượng, phòng sauna tia hồng ngoại.",
      en: "Boutique luxury landmark on the West bank of the Han River featuring cantilevered balconies, rooftop heated infinity pool, and infrared sauna.",
      ru: "Элитный комплекс на берегу реки Хан с консольным балконом и теплым бассейном на крыше."
    },
    tags: ["View sông Hàn", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-12T08:00:00.000Z"
  },
  {
    _id: "apt-filmore-1608",
    code: "DN-FIL-1608",
    title: {
      vi: "The Filmore Đà Nẵng — Căn hộ 1 phòng ngủ Bespoke Luxury cho Chuyên gia",
      en: "The Filmore Da Nang — 1BR Bespoke Executive River Suite",
      ru: "The Filmore — Люкс с 1 спальней для руководителей"
    },
    building: "The Filmore Da Nang",
    areaName: "Hải Châu",
    district: "Hải Châu",
    priceUsd: 980,
    priceVnd: 24950000,
    bedrooms: 1,
    bathrooms: 1,
    sizeM2: 52,
    floor: 16,
    orientation: "Đông Nam / Sông Hàn",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.5,
    remoteWorkSetup: "Góc làm việc yên tĩnh + Kính cách âm 3 lớp",
    petPolicy: "Không nuôi thú cưng",
    status: "Available",
    featured: false,
    coordinates: { lat: 16.0586, lng: 108.2245 },
    architecturalNotes: {
      vi: "Phù hợp hoàn hảo cho chuyên gia độc thân hoặc cặp đôi làm việc tại trung tâm Hải Châu, đi bộ ra phố đi bộ Bạch Đằng chỉ 30 bước chân.",
      en: "Tailored for solo executives or couples working in central Hai Chau, steps away from the Bach Dang riverfront promenade.",
      ru: "Идеально для специалистов в центре Хайтяу, в двух шагах от набережной Батьданг."
    },
    tags: ["View sông Hàn", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-12T11:00:00.000Z"
  },
  {
    _id: "apt-hiyori-1804",
    code: "DN-HIY-1804",
    title: {
      vi: "Hiyori Garden Tower — Căn hộ 2PN Phong Cách Wabi-Sabi Nhật Bản",
      en: "Hiyori Garden Tower — Minimalist Japanese Wabi-Sabi 2BR Sanctuary",
      ru: "Hiyori Garden Tower — Японский минимализм Ваби-Саби с 2 спальнями"
    },
    building: "Hiyori Garden Tower",
    areaName: "Sơn Trà",
    district: "Sơn Trà",
    priceUsd: 850,
    priceVnd: 21650000,
    bedrooms: 2,
    bathrooms: 2,
    sizeM2: 68,
    floor: 18,
    orientation: "Đông Bắc / View biển & Sơn Trà",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.4,
    remoteWorkSetup: "Bàn làm việc gỗ sồi trắng + Mạng FPT riêng",
    petPolicy: "Không nuôi thú cưng (Quy định tòa nhà)",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0615, lng: 108.2348 },
    architecturalNotes: {
      vi: "Tòa nhà tiêu chuẩn Nhật Bản quản lý cực kỳ sạch sẽ và an ninh trên trục đường Võ Văn Kiệt. Đi bộ thẳng ra biển Mỹ Khê khoảng 10 phút.",
      en: "Japanese-managed residential tower on Vo Van Kiet Boulevard offering immaculate maintenance, 24/7 bilingual reception, and a 10-minute walk to My Khe Beach.",
      ru: "Дом под японским управлением на бульваре Во Ван Киет, 10 минут пешком до пляжа Ми Кхе."
    },
    tags: ["Gần biển", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-13T08:00:00.000Z"
  },
  {
    _id: "apt-hiyori-1202",
    code: "DN-HIY-1202",
    title: {
      vi: "Hiyori Garden Tower — Căn hộ 2PN Tầng Trung View Cầu Rồng",
      en: "Hiyori Garden Tower — Mid-Floor 2BR Dragon Bridge View",
      ru: "Hiyori Garden Tower — Квартира с 2 спальнями и видом на Мост Дракона"
    },
    building: "Hiyori Garden Tower",
    areaName: "Sơn Trà",
    district: "Sơn Trà",
    priceUsd: 769,
    priceVnd: 19600000,
    bedrooms: 2,
    bathrooms: 2,
    sizeM2: 65,
    floor: 12,
    orientation: "Hướng Tây / Ngắm Cầu Rồng phun lửa",
    minLeaseMonths: 6,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.2,
    remoteWorkSetup: "Bàn làm việc trong phòng ngủ phụ",
    petPolicy: "Không nuôi thú cưng",
    status: "Available",
    featured: false,
    coordinates: { lat: 16.0618, lng: 108.2351 },
    architecturalNotes: {
      vi: "Mức giá cực tốt tại Hiyori, đầy đủ máy giặt sấy, bồn tắm nằm, rèm cản nắng 2 lớp và ban công ngắm trọn Cầu Rồng.",
      en: "Best-value 2-bedroom unit in Hiyori complete with washer-dryer, bathtub, blackout curtains, and direct Dragon Bridge views.",
      ru: "Лучшее предложение в Hiyori с ванной, сушильной машиной и видом на Мост Дракона."
    },
    tags: ["Gần biển", "Bàn làm việc", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600566753086-2d87185b9fd2?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-13T10:00:00.000Z"
  },
  {
    _id: "apt-monarchy-1508",
    code: "DN-MON-1508",
    title: {
      vi: "The Monarchy Block B — Căn hộ 2PN Sân Vườn Ven Sông Hàn",
      en: "The Monarchy Block B — 2BR Riverfront Garden Residence",
      ru: "The Monarchy Block B — Резиденция с 2 спальнями у реки Хан"
    },
    building: "The Monarchy Da Nang",
    areaName: "Sơn Trà",
    district: "Sơn Trà",
    priceUsd: 731,
    priceVnd: 18600000,
    bedrooms: 2,
    bathrooms: 2,
    sizeM2: 78,
    floor: 15,
    orientation: "Hướng Tây / Hoàng hôn sông Hàn",
    minLeaseMonths: 3,
    depositMonths: 1,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.1,
    remoteWorkSetup: "Bàn làm việc cạnh cửa sổ + Wi-Fi Mesh",
    petPolicy: "Cho nuôi thú cưng (Pet-Friendly)",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0548, lng: 108.2315 },
    architecturalNotes: {
      vi: "Khu phức hợp sôi động với hồ bơi lớn, siêu thị, quán cà phê và hiệu thuốc ngay tầng trệt. Cho phép thuê linh hoạt từ 3 tháng và thân thiện với thú cưng.",
      en: "Vibrant expat community complex with resort pool, ground-floor cafés, and supermarkets. Flexible 3+ month leases and pet-friendly.",
      ru: "Популярный среди экспатов комплекс с бассейном, кафе и возможностью проживания с животными."
    },
    tags: ["View sông Hàn", "Thú cưng", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600573472589-003525b2b729?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-14T08:00:00.000Z"
  },
  {
    _id: "apt-anthuong-1102",
    code: "DN-ANT-1102",
    title: {
      vi: "An Thượng Atelier — Studio Kiến Trúc Bê Tông Mộc & Gỗ Teak (Cách Biển 350m)",
      en: "An Thuong Atelier — Brutalist Concrete & Teak Studio (350m to My Khe Beach)",
      ru: "An Thuong Atelier — Дизайнерская студия в 350 м от пляжа Ми Кхе"
    },
    building: "An Thuong Boutique Lofts",
    areaName: "An Thượng",
    district: "Ngũ Hành Sơn",
    priceUsd: 577,
    priceVnd: 14700000,
    bedrooms: 1,
    bathrooms: 1,
    sizeM2: 48,
    floor: 4,
    orientation: "Đông Nam / Đón gió biển",
    minLeaseMonths: 3,
    depositMonths: 1,
    electricityRate: "3,800đ/kWh (Miễn phí nước & dọn phòng 1 lần/tuần)",
    naturalLightScore: 9.5,
    remoteWorkSetup: "Bàn kiến trúc sư rộng 1.6m + Giá đỡ màn hình rời",
    petPolicy: "Cho nuôi chó mèo (Pet-Friendly)",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0492, lng: 108.2456 },
    architecturalNotes: {
      vi: "Nằm trong hẻm yên tĩnh khu phố Tây An Thượng, đi bộ 4 phút ra bãi tắm Mỹ Khê và 50m tới các quán cà phê specialty, không gian coworking.",
      en: "Tucked in a quiet cul-de-sac of An Thuong expat quarter, 4-minute walk to My Khe Beach and steps from specialty coffee roasteries.",
      ru: "Тихий переулок в районе Ан Тхыонг, 4 минуты пешком до пляжа Ми Кхе и лучших кофеен."
    },
    tags: ["Gần biển", "Bàn làm việc", "Thú cưng"],
    images: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-14T11:00:00.000Z"
  },
  {
    _id: "apt-anthuong-villa01",
    code: "DN-ANT-V01",
    title: {
      vi: "Biệt thự sân vườn hồ bơi riêng Nam Việt Á — Ngũ Hành Sơn (3PN)",
      en: "Nam Viet A Private Pool Architectural Villa — 3BR Sanctuary",
      ru: "Вилла с собственным бассейном и 3 спальнями в Нгуханьшон"
    },
    building: "Nam Viet A Villa Compound",
    areaName: "Ngũ Hành Sơn",
    district: "Ngũ Hành Sơn",
    priceUsd: 1850,
    priceVnd: 47100000,
    bedrooms: 3,
    bathrooms: 4,
    sizeM2: 240,
    floor: 2,
    orientation: "Đông Nam / Sân vườn nhiệt đới & Hồ bơi riêng",
    minLeaseMonths: 6,
    depositMonths: 2,
    electricityRate: "Giá nhà nước (EVN)",
    naturalLightScore: 9.9,
    remoteWorkSetup: "Phòng làm việc riêng nhìn ra hồ bơi",
    petPolicy: "Thoải mái nuôi thú cưng",
    status: "Available",
    featured: true,
    coordinates: { lat: 16.0365, lng: 108.2418 },
    architecturalNotes: {
      vi: "Biệt thự kiến trúc nhiệt đới hiện đại có hồ bơi muối khoáng riêng, gara ô tô, khu vườn yên tĩnh gần sông Hàn và trường quốc tế.",
      en: "Modern tropical architectural villa with private saltwater pool, enclosed garage, and lush courtyard near international schools.",
      ru: "Современная тропическая вилла с частным бассейном, садом и гаражом."
    },
    tags: ["Biệt thự", "Thú cưng", "Bàn làm việc", "Hồ bơi vô cực", "Điện EVN"],
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80"
    ],
    createdAt: "2026-11-15T09:00:00.000Z"
  }
];

const initialBuildings = [
  {
    id: "bldg-panoma",
    name: "The Panoma (Sun Cosmo)",
    area: "Ngũ Hành Sơn / Trần Thị Lý",
    tier: "Tổ hợp mới bàn giao / Tier A",
    unitCount: 29,
    avg1BrUsd: "$654 – $885",
    avg2BrUsd: "$846 – $1,250",
    avg3BrUsd: "$1,450 – $1,923",
    walkToBeach: "5 phút chạy xe (1.2km)",
    amenities: "Hồ bơi vô cực view sông, Phòng Gym, Kid Club, An ninh 3 lớp",
    electricity: "Giá nhà nước (EVN)",
    petFriendly: "Tuỳ chủ nhà (Mèo/Chó nhỏ)",
    yearCompleted: 2025,
    coordinates: { lat: 16.0488, lng: 108.2342 }
  },
  {
    id: "bldg-filmore",
    name: "The Filmore Da Nang",
    area: "Hải Châu (Bờ Tây Sông Hàn)",
    tier: "Boutique Luxury / Tier A+",
    unitCount: 12,
    avg1BrUsd: "$950 – $1,150",
    avg2BrUsd: "$1,300 – $1,650",
    avg3BrUsd: "$2,100+",
    walkToBeach: "8 phút chạy xe",
    amenities: "Hồ bơi nước ấm tầng thượng, Phòng Gym Technogym, Sauna hồng ngoại",
    electricity: "Giá nhà nước (EVN)",
    petFriendly: "Thương lượng",
    yearCompleted: 2024,
    coordinates: { lat: 16.0583, lng: 108.2242 }
  },
  {
    id: "bldg-hiyori",
    name: "Hiyori Garden Tower",
    area: "Sơn Trà (Đường Võ Văn Kiệt)",
    tier: "Tiêu chuẩn Nhật Bản / Tier A",
    unitCount: 8,
    avg1BrUsd: "Chỉ có căn 2PN & 3PN",
    avg2BrUsd: "$769 – $950",
    avg3BrUsd: "$1,350 – $1,600",
    walkToBeach: "10 phút đi bộ (900m)",
    amenities: "Hồ bơi trong nhà, Quản lý Nhật Bản, Lễ tân 24/7, Công viên nội khu",
    electricity: "Giá nhà nước (EVN)",
    petFriendly: "Không nuôi thú cưng",
    yearCompleted: 2020,
    coordinates: { lat: 16.0615, lng: 108.2348 }
  },
  {
    id: "bldg-monarchy",
    name: "The Monarchy (Block B)",
    area: "Sơn Trà (Bờ Đông Sông Hàn)",
    tier: "Khu cộng đồng Expat / Tier B+",
    unitCount: 14,
    avg1BrUsd: "$480 – $560",
    avg2BrUsd: "$650 – $800",
    avg3BrUsd: "$950 – $1,200",
    walkToBeach: "7 phút chạy xe",
    amenities: "Hồ bơi sân vườn lớn, Chuỗi cà phê & Siêu thị tầng trệt, Khu vui chơi",
    electricity: "Giá nhà nước (EVN)",
    petFriendly: "Cho phép nuôi thú cưng",
    yearCompleted: 2021,
    coordinates: { lat: 16.0548, lng: 108.2315 }
  },
  {
    id: "bldg-anthuong",
    name: "An Thuong Boutique Lofts",
    area: "An Thượng (Ngũ Hành Sơn)",
    tier: "Căn hộ dịch vụ thiết kế / Tier A-",
    unitCount: 19,
    avg1BrUsd: "$520 – $750",
    avg2BrUsd: "$780 – $1,050",
    avg3BrUsd: "Biệt thự $1,500+",
    walkToBeach: "3–5 phút đi bộ (350m)",
    amenities: "Sân thượng ngắm biển, Không gian Coworking, Dọn phòng hàng tuần",
    electricity: "3,500 – 4,000đ/kWh",
    petFriendly: "Cho phép nuôi thú cưng",
    yearCompleted: 2025,
    coordinates: { lat: 16.0492, lng: 108.2456 }
  }
];

const neighborhoods = [
  {
    id: "area-anthuong",
    code: "01",
    name: "An Thượng",
    unitCount: 19,
    subtitle: "Cà phê, dạo bộ và biển",
    beachWalk: "3–6 phút đi bộ ra biển Mỹ Khê / Bắc Mỹ An",
    noiseLevel: "Vừa phải (Hẻm nhỏ yên tĩnh, phố chính nhộn nhịp)",
    remoteWorkScore: "9.8 / 10",
    rentRangeUsd: "$500 – $1,100 / tháng",
    architecturalCharacter:
      "Khu phố quốc tế sôi động nhất Đà Nẵng: bước chân xuống nhà là hàng chục quán cà phê specialty, phòng gym, nhà hàng Âu – Á và bãi biển Mỹ Khê.",
    morningVibe: "Đi bộ chân trần ra biển Mỹ Khê tắm nắng sớm, thưởng thức espresso tại các quán rang xay thủ công.",
    daytimeVibe: "Làm việc từ xa tại các coworking space hoặc căn hộ nhiều ánh sáng, ăn trưa healthy bowl.",
    eveningVibe: "Dạo bộ qua các con phố lên đèn ấm cúng, gặp gỡ cộng đồng chuyên gia quốc tế mà không cần đi xe xa.",
    considerations: "Một số lô đất trống có thể đang xây dựng — chúng tôi kiểm tra kỹ tiếng ồn từng hẻm trước khi gợi ý.",
    onSiteChecklist: "Kiểm tra độ kín của cửa kính ban công, áp lực nước tầng cao và tốc độ Wi-Fi giờ cao điểm."
  },
  {
    id: "area-nguhanhson",
    code: "02",
    name: "Ngũ Hành Sơn",
    unitCount: 36,
    subtitle: "Thêm không gian cho cuộc sống",
    beachWalk: "5–8 phút ra biển Mỹ Khê / Non Nước",
    noiseLevel: "Yên tĩnh, thoáng đãng",
    remoteWorkScore: "9.5 / 10",
    rentRangeUsd: "$600 – $1,950 / tháng",
    architecturalCharacter:
      "Nơi quy tụ tổ hợp căn hộ mới bàn giao The Panoma (Sun Cosmo) bên cầu Trần Thị Lý và khu biệt thự sân vườn Nam Việt Á xanh mát.",
    morningVibe: "Đón bình minh trên sông Hàn từ ban công tầng cao The Panoma hoặc chạy bộ dọc công viên bờ sông.",
    daytimeVibe: "Không gian rộng rãi, yên tĩnh tuyệt đối cho các cuộc họp trực tuyến quốc tế và gia đình có con nhỏ.",
    eveningVibe: "Gió sông mát rượi, đường phố thông thoáng, kết nối qua trung tâm Hải Châu hay biển An Thượng chỉ 5 phút.",
    considerations: "Các tòa tháp mới như The Panoma có nhiều căn đang hoàn thiện nội thất — chúng tôi chọn các tầng đã ổn định cư dân.",
    onSiteChecklist: "Kiểm tra hướng nắng buổi chiều (nên chọn hướng Đông Nam hoặc nhìn về cầu Rồng) và phí quản lý tòa nhà."
  },
  {
    id: "area-haichau",
    code: "03",
    name: "Hải Châu",
    unitCount: 12,
    subtitle: "Nhịp sống thành phố ngay bên",
    beachWalk: "8–10 phút lái xe qua cầu Rồng",
    noiseLevel: "Yên tĩnh trên tầng cao (15F+)",
    remoteWorkScore: "9.6 / 10",
    rentRangeUsd: "$850 – $2,200 / tháng",
    architecturalCharacter:
      "Trung tâm hành chính, tài chính và ẩm thực bên bờ Tây sông Hàn với các tòa tháp biểu tượng như The Filmore, F.Home và Blooming.",
    morningVibe: "Tản bộ dọc đường Bạch Đằng ven sông Hàn, thưởng thức cà phê sáng giữa trung tâm thành phố.",
    daytimeVibe: "Cách sân bay quốc tế Đà Nẵng, bệnh viện Vinmec / Gia Đình và các văn phòng lớn chỉ 5–8 phút.",
    eveningVibe: "Ngắm toàn cảnh cầu Rồng và phố đi bộ Bạch Đằng lung linh ngay từ phòng khách căn hộ.",
    considerations: "Khoảng cách ra biển cần đi qua cầu — bù lại tiện ích đô thị, nhà hàng Michelin và bệnh viện quốc tế ngay dưới chân nhà.",
    onSiteChecklist: "Kiểm tra chỗ đậu ô tô dưới hầm và khả năng cách âm của hệ kính mặt dựng."
  },
  {
    id: "area-sontra",
    code: "04",
    name: "Sơn Trà",
    unitCount: 23,
    subtitle: "Biển và cây xanh bán đảo",
    beachWalk: "5–10 phút đi bộ ra biển Mỹ Khê / Phạm Văn Đồng",
    noiseLevel: "Thấp – Rất thoáng đãng",
    remoteWorkScore: "9.4 / 10",
    rentRangeUsd: "$650 – $1,600 / tháng",
    architecturalCharacter:
      "Sự cân bằng hoàn hảo giữa sông Hàn, biển Mỹ Khê và mảng xanh bán đảo Sơn Trà — nơi tọa lạc của Hiyori Garden Tower, The Monarchy và Azura.",
    morningVibe: "Không khí trong lành từ rừng Sơn Trà và biển Đông, đạp xe dọc cung đường ven biển Hoàng Sa – Võ Nguyên Giáp.",
    daytimeVibe: "Tiện ích nội khu khép kín (hồ bơi, siêu thị, lễ tân Nhật Bản tại Hiyori) giúp cuộc sống hàng ngày cực kỳ nhàn nhã.",
    eveningVibe: "Đi bộ qua cầu Tình Yêu, công viên bờ Đông sông Hàn hoặc thưởng thức hải sản tươi sống ven biển.",
    considerations: "Các căn hướng chính Tây nhìn về sông Hàn sẽ có nắng chiều — cần có rèm cản sáng 2 lớp hoặc kính Low-E.",
    onSiteChecklist: "Kiểm tra quy định nuôi thú cưng (The Monarchy cho phép, Hiyori không cho phép) và đơn giá điện EVN."
  }
];

module.exports = {
  initialApartments,
  initialBuildings,
  neighborhoods
};
