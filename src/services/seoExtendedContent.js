// Extended Topical Authority Hub: 16 Iconic Da Nang Buildings & Villa Compounds + 24 High-Intent Long-Tail SEO Guides
// Powers /buildings/:slug and /guides/:slug across SSR, Sitemap, RSS, llms.txt & React UI

const DANANG_SEO_BUILDINGS = [
  {
    slug: "the-filmore-da-nang",
    name: "The Filmore Da Nang",
    keywordMatch: "filmore",
    areaVi: "Hải Châu (Đường Bạch Đằng · Bờ Tây sông Hàn)",
    areaEn: "Hai Chau (Bach Dang Riverfront)",
    priceRangeVi: "25 – 55 triệu VNĐ/tháng ($1,000 – $2,200/mo)",
    priceRangeEn: "$1,000 – $2,200 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Bán Căn Hộ The Filmore Đà Nẵng — Bảng Giá Thực Tế 2026",
    h1En: "The Filmore Da Nang Apartments for Rent & Sale — 2026 Price Guide",
    descVi: "Cho thuê & chuyển nhượng căn hộ 1PN, 2PN, Dual-Key & Penthouse The Filmore Đà Nẵng (đường Bạch Đằng, Hải Châu) ✓ Hồ bơi vô cực nước ấm, Sauna hồng ngoại, điện EVN →",
    descEn: "Verified 1BR, 2BR & Dual-Key luxury apartments for rent and sale at The Filmore Da Nang on Bach Dang Riverfront ✓ Heated rooftop pool, Technogym & direct owner pricing →",
    keywordsVi: "thuê căn hộ The Filmore Đà Nẵng, giá thuê Filmore Đà Nẵng, mua bán căn hộ The Filmore Bạch Đằng, chung cư The Filmore Hải Châu",
    highlightsVi: "Tọa lạc trên phố đi bộ Bạch Đằng ven sông Hàn (Quận Hải Châu), The Filmore là biểu tượng căn hộ boutique hạng sang với ban công lồi (cantilevered balcony) ngắm trực diện Cầu Rồng, hồ bơi vô cực nước ấm tầng thượng, phòng gym Technogym và hệ thống Smart Home toàn diện."
  },
  {
    slug: "the-panoma-sun-cosmo",
    name: "The Panoma — Sun Cosmo Residence",
    keywordMatch: "panoma",
    areaVi: "Ngũ Hành Sơn / Trần Thị Lý (Bờ Đông sông Hàn)",
    areaEn: "Ngu Hanh Son / Tran Thi Ly Bridge",
    priceRangeVi: "16 – 48 triệu VNĐ/tháng ($650 – $1,950/mo)",
    priceRangeEn: "$650 – $1,950 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Căn Hộ The Panoma (Sun Cosmo Residence) Đà Nẵng 2026",
    h1En: "The Panoma (Sun Cosmo Residence) Da Nang — Apartments for Rent & Sale",
    descVi: "Tổng hợp giỏ hàng cho thuê & mua bán căn hộ Studio, 1PN, 2PN, 3PN The Panoma 1 & 2 (Sun Cosmo Residence Đà Nẵng) ✓ Mới bàn giao, view sông Hàn & biển Mỹ Khê →",
    descEn: "Newly handed-over Studio, 1BR, 2BR & 3BR condos at The Panoma 1 & 2 (Sun Cosmo Residence Da Nang) ✓ Dual Han River & My Khe Beach views, state EVN rates →",
    keywordsVi: "thuê căn hộ The Panoma Đà Nẵng, thuê chung cư Sun Cosmo Residence Đà Nẵng, mua căn hộ Sun Cosmo Đà Nẵng, giá thuê Panoma 1 Panoma 2",
    highlightsVi: "Tổ hợp căn hộ cao cấp mới bàn giao của Sun Group ngay chân cầu Trần Thị Lý, kết nối 3 phút sang trung tâm Hải Châu và 4 phút ra biển Mỹ Khê. 100% căn hộ đón sáng tự nhiên, hồ bơi vô cực view sông Hàn và điện nước giá nhà nước EVN."
  },
  {
    slug: "sun-ponte-residence",
    name: "Sun Ponte Residence",
    keywordMatch: "ponte",
    areaVi: "Sơn Trà (Đường Trần Hưng Đạo · Cầu Rồng)",
    areaEn: "Son Tra (Tran Hung Dao · Dragon Bridge)",
    priceRangeVi: "17 – 45 triệu VNĐ/tháng ($680 – $1,800/mo)",
    priceRangeEn: "$680 – $1,800 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Bán Căn Hộ Sun Ponte Residence Cầu Rồng Đà Nẵng",
    h1En: "Sun Ponte Residence Da Nang — Dragon Bridge Riverfront Condos",
    descVi: "Cho thuê & tư vấn mua bán chuyển nhượng căn hộ Sun Ponte Residence (Trần Hưng Đạo, Sơn Trà, giữa Cầu Rồng & Cầu Trần Thị Lý) ✓ Tầm nhìn pháo hoa sông Hàn →",
    descEn: "Rent or invest in Sun Ponte Residence on Tran Hung Dao riverfront, Da Nang ✓ Direct Dragon Bridge & DIFF fireworks views, resort amenities →",
    keywordsVi: "thuê căn hộ Sun Ponte Đà Nẵng, mua bán Sun Ponte Residence Trần Hưng Đạo, chung cư Sun Ponte Cầu Rồng",
    highlightsVi: "Nằm trên trục đường ven sông Trần Hưng Đạo danh giá giữa Cầu Rồng và Cầu Trần Thị Lý, Sun Ponte Residence sở hữu kiến trúc cầu nối độc bản cùng tầm nhìn trực diện sông Hàn và lễ hội pháo hoa quốc tế DIFF."
  },
  {
    slug: "sun-symphony-residence",
    name: "Sun Symphony Residence",
    keywordMatch: "symphony",
    areaVi: "Sơn Trà (Trần Hưng Đạo – Lê Văn Duyệt · Sông Hàn)",
    areaEn: "Son Tra (Han Riverfront Marina)",
    priceRangeVi: "18 – 50 triệu VNĐ/tháng ($720 – $2,000/mo)",
    priceRangeEn: "$720 – $2,000 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Bán Căn Hộ, Townhouse Sun Symphony Residence Đà Nẵng",
    h1En: "Sun Symphony Residence Da Nang — Riverfront Condos & Villas",
    descVi: "Giỏ hàng cho thuê & mua bán căn hộ cao tầng, townhouse & biệt thự ven sông Sun Symphony Residence Đà Nẵng ✓ Đối diện điểm bắn pháo hoa quốc tế DIFF →",
    descEn: "Riverfront condos and townhouses at Sun Symphony Residence Da Nang overlooking the DIFF fireworks stage and Han River marina →",
    keywordsVi: "Sun Symphony Residence Đà Nẵng, thuê căn hộ Sun Symphony, mua bán Sun Symphony Đà Nẵng",
    highlightsVi: "Quần thể bán đảo ven sông Hàn đối diện trực diện khán đài pháo hoa quốc tế Đà Nẵng (DIFF), quy tụ các tòa tháp căn hộ hiện đại và dãy shophouse/biệt thự bến du thuyền sang trọng."
  },
  {
    slug: "hiyori-garden-tower",
    name: "Hiyori Garden Tower",
    keywordMatch: "hiyori",
    areaVi: "Sơn Trà (Đường Võ Văn Kiệt · Cầu Rồng)",
    areaEn: "Son Tra (Vo Van Kiet Boulevard)",
    priceRangeVi: "18 – 28 triệu VNĐ/tháng ($720 – $1,100/mo)",
    priceRangeEn: "$720 – $1,100 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Căn Hộ Hiyori Garden Tower Đà Nẵng — Chuẩn Nhật Bản",
    h1En: "Hiyori Garden Tower Da Nang — Japanese-Managed 2BR & 3BR Condos",
    descVi: "Cho thuê & chuyển nhượng căn hộ 2PN, 3PN Hiyori Garden Tower (A2 Võ Văn Kiệt, Sơn Trà, Đà Nẵng) ✓ Vận hành chuẩn Nhật Bản, an ninh 24/7, đi bộ ra biển Mỹ Khê →",
    descEn: "Verified 2BR & 3BR apartments for rent at Hiyori Garden Tower on Vo Van Kiet Blvd, Da Nang ✓ Immaculate Japanese management, indoor heated pool, 10-min walk to My Khe Beach →",
    keywordsVi: "thuê căn hộ Hiyori Đà Nẵng, Hiyori Garden Tower cho thuê, giá thuê chung cư Hiyori Võ Văn Kiệt, mua căn hộ Hiyori Đà Nẵng",
    highlightsVi: "Tòa tháp căn hộ tiêu chuẩn Nhật Bản nổi tiếng nhất trên đại lộ Võ Văn Kiệt nối thẳng Cầu Rồng ra biển Mỹ Khê. Được khách Nhật, Hàn, châu Âu và gia đình Việt đánh giá cao nhờ độ sạch sẽ tuyệt đối, lễ tân song ngữ 24/7, hồ bơi trong nhà và điện EVN."
  },
  {
    slug: "the-monarchy-da-nang",
    name: "The Monarchy Block A & B",
    keywordMatch: "monarchy",
    areaVi: "Sơn Trà (535 Trần Hưng Đạo · Bờ Đông sông Hàn)",
    areaEn: "Son Tra (535 Tran Hung Dao Riverfront)",
    priceRangeVi: "14 – 24 triệu VNĐ/tháng ($560 – $950/mo)",
    priceRangeEn: "$560 – $950 / month",
    type: "condo",
    h1Vi: "Thuê Căn Hộ Chung Cư The Monarchy Đà Nẵng — Cho Nuôi Thú Cưng",
    h1En: "The Monarchy Da Nang Apartments for Rent — Pet-Friendly Riverfront",
    descVi: "Danh sách căn hộ 1PN, 2PN, 3PN & Penthouse chung cư The Monarchy Đà Nẵng (Trần Hưng Đạo, Sơn Trà) đang trống ✓ Cho phép nuôi thú cưng, hồ bơi sân vườn, siêu thị tầng 1 →",
    descEn: "1BR, 2BR & 3BR pet-friendly apartments for rent at The Monarchy Da Nang ✓ Resort pool, ground-floor cafes, supermarkets & flexible 3–12 month leases →",
    keywordsVi: "thuê căn hộ Monarchy Đà Nẵng, cho thuê chung cư The Monarchy Block B, căn hộ Monarchy nuôi thú cưng, giá thuê Monarchy Đà Nẵng",
    highlightsVi: "Khu phức hợp căn hộ sôi động nhất bờ Đông sông Hàn với khuôn viên xanh rộng, hồ bơi lớn, chuỗi siêu thị K-Mart, quán cà phê, nhà thuốc ngay dưới chân tòa nhà. Đặc biệt thân thiện với thú cưng (Pet-friendly) và hỗ trợ hợp đồng linh hoạt từ 3–12 tháng."
  },
  {
    slug: "azura-da-nang",
    name: "Azura Da Nang",
    keywordMatch: "azura",
    areaVi: "Sơn Trà (339 Trần Hưng Đạo · Cạnh Cầu Sông Hàn)",
    areaEn: "Son Tra (339 Tran Hung Dao · Han River Bridge)",
    priceRangeVi: "19 – 42 triệu VNĐ/tháng ($750 – $1,650/mo)",
    priceRangeEn: "$750 – $1,650 / month",
    type: "condo",
    h1Vi: "Thuê Căn Hộ Cao Cấp Azura Đà Nẵng View Trực Diện Sông Hàn",
    h1En: "Azura Da Nang Riverfront Apartments for Rent & Sale",
    descVi: "Cho thuê căn hộ 1PN, 2PN, 3PN cao cấp tại tòa tháp Azura (339 Trần Hưng Đạo, Sơn Trà, cạnh Vincom Đà Nẵng) ✓ Diện tích rộng, view pháo hoa sông Hàn, an ninh tuyệt đối →",
    descEn: "Spacious 1BR–3BR riverfront condos at Azura Tower Da Nang next to Vincom Plaza & Han River Bridge ✓ Pool, gym & family-friendly security →",
    keywordsVi: "thuê căn hộ Azura Đà Nẵng, chung cư Azura Trần Hưng Đạo, giá thuê Azura Đà Nẵng",
    highlightsVi: "Tòa căn hộ cao cấp nằm sát Trung tâm thương mại Vincom Plaza và cầu Sông Hàn, nổi bật với diện tích căn hộ rộng thoáng, mật độ cư dân thấp, hồ bơi ngoài trời lớn và cộng đồng chuyên gia quốc tế văn minh."
  },
  {
    slug: "indochina-riverside-towers",
    name: "Indochina Riverside Towers",
    keywordMatch: "indochina",
    areaVi: "Hải Châu (74 Bạch Đằng · Trung tâm Sông Hàn)",
    areaEn: "Hai Chau (74 Bach Dang Central Riverfront)",
    priceRangeVi: "18 – 38 triệu VNĐ/tháng ($720 – $1,500/mo)",
    priceRangeEn: "$720 – $1,500 / month",
    type: "condo",
    h1Vi: "Thuê Căn Hộ Indochina Riverside Bạch Đằng Hải Châu Đà Nẵng",
    h1En: "Indochina Riverside Towers Da Nang — Central Bach Dang Condos",
    descVi: "Cho thuê căn hộ 2PN, 3PN Indochina Riverside Towers (74 Bạch Đằng, Quận Hải Châu) ✓ Trung tâm hành chính Đà Nẵng, view sông Hàn, TTTM & ẩm thực ngay tầng dưới →",
    descEn: "Central 2BR & 3BR riverfront apartments at Indochina Riverside (74 Bach Dang, Hai Chau, Da Nang) ✓ Steps from cafes, offices & Han Market →",
    keywordsVi: "thuê căn hộ Indochina Đà Nẵng, chung cư Indochina 74 Bạch Đằng Hải Châu",
    highlightsVi: "Vị trí kim cương số 74 đường Bạch Đằng ngay trái tim Quận Hải Châu, phù hợp hoàn hảo cho giám đốc và chuyên gia làm việc tại khu trung tâm tài chính – hành chính Đà Nẵng."
  },
  {
    slug: "blooming-tower-da-nang",
    name: "Blooming Tower Da Nang",
    keywordMatch: "blooming",
    areaVi: "Hải Châu (Thuận Phước · Cửa sông Hàn & Vịnh Đà Nẵng)",
    areaEn: "Hai Chau (Thuan Phuoc Bay & Bridge)",
    priceRangeVi: "14 – 28 triệu VNĐ/tháng ($560 – $1,100/mo)",
    priceRangeEn: "$560 – $1,100 / month",
    type: "condo",
    h1Vi: "Thuê Căn Hộ Chung Cư Blooming Tower Thuận Phước Đà Nẵng",
    h1En: "Blooming Tower Da Nang — Bay & Bridge View Condos for Rent",
    descVi: "Cho thuê căn hộ 1PN, 2PN, 3PN diện tích lớn tại Blooming Tower Đà Nẵng (chân cầu Thuận Phước, Hải Châu) ✓ View 3 mặt vịnh biển, sông Hàn & bán đảo Sơn Trà →",
    descEn: "Large-layout 1BR, 2BR & 3BR apartments at Blooming Tower Da Nang with sweeping Da Nang Bay, Thuan Phuoc Bridge & Son Tra views →",
    keywordsVi: "thuê căn hộ Blooming Tower Đà Nẵng, chung cư Blooming Thuận Phước Hải Châu",
    highlightsVi: "Tòa tháp đôi phong cách Hàn Quốc tại giao điểm sông Hàn đổ ra vịnh Đà Nẵng, sở hữu diện tích căn hộ cực rộng, gió biển mát quanh năm và bồn tắm nằm thư giãn."
  },
  {
    slug: "fpt-plaza-da-nang",
    name: "FPT Plaza 1, 2 & 3 (FPT City)",
    keywordMatch: "fpt",
    areaVi: "Ngũ Hành Sơn (Khu đô thị công nghệ FPT City · Hòa Hải)",
    areaEn: "Ngu Hanh Son (FPT Tech Urban Area · Hoa Hai)",
    priceRangeVi: "7,5 – 15 triệu VNĐ/tháng ($300 – $600/mo)",
    priceRangeEn: "$300 – $600 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Bán Căn Hộ FPT Plaza 1, 2, 3 Khu Đô Thị FPT Đà Nẵng",
    h1En: "FPT Plaza 1, 2 & 3 Apartments for Rent & Sale in FPT City Da Nang",
    descVi: "Tổng hợp căn hộ 1PN, 2PN, 3PN cho thuê & chuyển nhượng tại FPT Plaza 1, FPT Plaza 2, FPT Plaza 3 (KĐT FPT City Hòa Hải, Đà Nẵng) ✓ Mới đẹp, điện EVN, giá từ 7,5tr/tháng →",
    descEn: "Modern, high-value 1BR–3BR condos for rent and sale at FPT Plaza 1, 2 & 3 in FPT City Da Nang ✓ Ideal for IT engineers, families & SIS/FPT University staff →",
    keywordsVi: "thuê căn hộ FPT Plaza Đà Nẵng, thuê chung cư FPT Plaza 2, mua bán căn hộ FPT City Hòa Hải Đà Nẵng",
    highlightsVi: "Tâm điểm an cư xanh sạch của cộng đồng kỹ sư công nghệ FPT Software, giảng viên Đại học FPT & trường quốc tế. Hạ tầng quy hoạch đồng bộ, công viên nội khu rộng, cách biển Tân Trà / Non Nước chỉ 3 phút."
  },
  {
    slug: "the-ori-garden-da-nang",
    name: "The Ori Garden Da Nang",
    keywordMatch: "ori garden",
    areaVi: "Liên Chiểu (KĐT Bàu Tràm Lakeside · Gần biển Nguyễn Tất Thành)",
    areaEn: "Lien Chieu (Bau Tram Lakeside · North West Da Nang)",
    priceRangeVi: "6 – 11 triệu VNĐ/tháng ($240 – $440/mo)",
    priceRangeEn: "$240 – $440 / month",
    type: "condo",
    h1Vi: "Thuê & Mua Chung Cư The Ori Garden Liên Chiểu Đà Nẵng Giá Tốt",
    h1En: "The Ori Garden Da Nang — Modern 1BR–3BR Condos in Lien Chieu",
    descVi: "Cho thuê căn hộ 1PN, 2PN, 3PN đầy đủ nội thất tại chung cư The Ori Garden (Liên Chiểu, Đà Nẵng) ✓ Có hồ bơi, vườn Nhật, giá tốt chỉ từ 6–9 triệu/tháng, điện EVN →",
    descEn: "Affordable modern 1BR–3BR furnished condos at The Ori Garden Lien Chieu, Da Nang ✓ Swimming pool, Japanese garden & state EVN utility rates →",
    keywordsVi: "thuê chung cư Ori Garden Đà Nẵng, thuê căn hộ Liên Chiểu Đà Nẵng, The Ori Garden cho thuê đầy đủ nội thất",
    highlightsVi: "Tổ hợp chung cư thiết kế tinh gọn kiểu Nhật tại Tây Bắc Đà Nẵng (Quận Liên Chiểu), đầy đủ hồ bơi, quảng trường, siêu thị và mức giá thuê tốt nhất Đà Nẵng cho gia đình trẻ và chuyên gia khu công nghiệp / cảng Liên Chiểu."
  },
  {
    slug: "muong-thanh-son-tra",
    name: "Mường Thanh Luxury Sơn Trà (Mỹ Khê)",
    keywordMatch: "muong thanh",
    areaVi: "Ngũ Hành Sơn / Sơn Trà (Võ Nguyên Giáp · Sát biển Mỹ Khê)",
    areaEn: "Vo Nguyen Giap Beachfront · My Khe Beach",
    priceRangeVi: "8,5 – 16 triệu VNĐ/tháng ($340 – $630/mo)",
    priceRangeEn: "$340 – $630 / month",
    type: "condo",
    h1Vi: "Thuê Căn Hộ Chung Cư Mường Thanh Biển Mỹ Khê Đà Nẵng Giá Tốt",
    h1En: "Muong Thanh Beachfront Apartments for Rent — Steps to My Khe Beach",
    descVi: "Cho thuê căn hộ 1PN, 2PN chung cư Mường Thanh (270 Võ Nguyên Giáp, sát biển Mỹ Khê & phố Tây An Thượng) ✓ Băng qua đường là bãi tắm Mỹ Khê, giá chỉ từ 8,5–14tr/tháng →",
    descEn: "1BR & 2BR beachfront condos at Muong Thanh Vo Nguyen Giap — literally 50m across the street from My Khe Beach and An Thuong expat quarter →",
    keywordsVi: "thuê căn hộ Mường Thanh Đà Nẵng, chung cư Mường Thanh Võ Nguyên Giáp biển Mỹ Khê",
    highlightsVi: "Vị trí đối diện trực tiếp bãi tắm biển Mỹ Khê trên trục đường tỷ đô Võ Nguyên Giáp và sát ngay khu phố Tây An Thượng, chi phí thuê cực kỳ hợp lý cho người yêu biển."
  },
  {
    slug: "son-tra-ocean-view",
    name: "Sơn Trà Ocean View",
    keywordMatch: "ocean view",
    areaVi: "Sơn Trà (95 Ngô Quyền · Thọ Quang)",
    areaEn: "Son Tra (Ngo Quyen · Near Son Tra Peninsula)",
    priceRangeVi: "11 – 20 triệu VNĐ/tháng ($430 – $800/mo)",
    priceRangeEn: "$430 – $800 / month",
    type: "condo",
    h1Vi: "Thuê Căn Hộ Chung Cư Sơn Trà Ocean View Đà Nẵng — Yên Tĩnh Thoáng Mát",
    h1En: "Son Tra Ocean View Condos for Rent in Da Nang",
    descVi: "Cho thuê căn hộ 1PN, 2PN, 3PN chung cư Sơn Trà Ocean View (Quận Sơn Trà, Đà Nẵng) ✓ Hồ bơi vô cực tầng thượng ngắm trọn biển Mân Thái & bán đảo Sơn Trà →",
    descEn: "Quiet 1BR–3BR apartments at Son Tra Ocean View featuring a rooftop infinity pool overlooking Man Thai Beach and lush Son Tra mountain →",
    keywordsVi: "thuê căn hộ Sơn Trà Ocean View Đà Nẵng, chung cư Thọ Quang Sơn Trà",
    highlightsVi: "Không gian sống trong lành tựa lưng vào lá phổi xanh bán đảo Sơn Trà và hướng mặt ra biển Mân Thái, có hồ bơi vô cực trên tầng thượng cực thoáng."
  },
  {
    slug: "euro-village-da-nang",
    name: "Euro Village 1 & 2 (Làng Châu Âu)",
    keywordMatch: "euro village",
    areaVi: "Sơn Trà (Trần Hưng Đạo) & Cẩm Lệ (Đảo VIP Hòa Xuân)",
    areaEn: "Son Tra Riverfront & Hoa Xuan Island Compound",
    priceRangeVi: "35 – 90 triệu VNĐ/tháng ($1,400 – $3,600/mo)",
    priceRangeEn: "$1,400 – $3,600 / month",
    type: "villa",
    h1Vi: "Thuê & Mua Biệt Thự Euro Village 1 & 2 Làng Châu Âu Đà Nẵng",
    h1En: "Euro Village 1 & 2 Da Nang — Gated Riverfront Pool Villas for Rent",
    descVi: "Bộ sưu tập biệt thự hồ bơi riêng & nhà phố compound an ninh 24/7 tại Euro Village 1 (Trần Hưng Đạo, Sơn Trà) & Euro Village 2 (Hòa Xuân) ✓ Đẳng cấp thượng lưu ven sông Hàn →",
    descEn: "24/7 gated private pool villas and riverfront mansions for long-term rent & sale in Euro Village 1 (Dragon Bridge) and Euro Village 2 (Hoa Xuan) →",
    keywordsVi: "thuê biệt thự Euro Village Đà Nẵng, thuê villa Làng Châu Âu Đà Nẵng, Euro Village 2 Hòa Xuân cho thuê",
    highlightsVi: "Khu biệt thự khép kín (compound) an ninh bảo vệ 24/7 đẳng cấp nhất bên bờ sông Hàn, đường nội khu rợp bóng cây, bến du thuyền và cộng đồng cư dân tinh hoa."
  },
  {
    slug: "dao-xanh-sky-villas",
    name: "Khu Biệt Thự Đảo Xanh (Green Island)",
    keywordMatch: "dao xanh",
    areaVi: "Hải Châu (Đảo biệt lập giữa sông Hàn · Cạnh Cầu Trần Thị Lý)",
    areaEn: "Hai Chau (Private River Island · Central Da Nang)",
    priceRangeVi: "40 – 95 triệu VNĐ/tháng ($1,600 – $3,800/mo)",
    priceRangeEn: "$1,600 – $3,800 / month",
    type: "villa",
    h1Vi: "Thuê Biệt Thự Đảo Xanh Hải Châu Đà Nẵng — Villa Hồ Bơi Giữa Sông Hàn",
    h1En: "Green Island (Dao Xanh) Private Pool Villas in Central Hai Chau, Da Nang",
    descVi: "Cho thuê biệt thự sân vườn & hồ bơi riêng tại Khu biệt thự Đảo Xanh (Quận Hải Châu, Đà Nẵng) ✓ Ốc đảo yên tĩnh tuyệt đối ngay trung tâm thành phố →",
    descEn: "Ultra-exclusive garden & saltwater pool villas on Dao Xanh (Green Island) right in central Hai Chau, surrounded by the Han River →",
    keywordsVi: "thuê biệt thự Đảo Xanh Đà Nẵng, villa Đảo Xanh Hải Châu cho thuê dài hạn",
    highlightsVi: "Hòn đảo biệt thự duy nhất nằm trọn giữa lòng sông Hàn thuộc Quận Hải Châu — vừa biệt lập yên tĩnh 100%, vừa kết nối sân bay và biển Mỹ Khê chỉ trong 5 phút."
  },
  {
    slug: "nam-viet-a-villas",
    name: "Khu Biệt Thự & Nhà Phố Nam Việt Á",
    keywordMatch: "nam viet a",
    areaVi: "Ngũ Hành Sơn (Phường Khuê Mỹ · Ven sông Hàn)",
    areaEn: "Ngu Hanh Son (Khue My Riverfront Villa Quarter)",
    priceRangeVi: "20 – 60 triệu VNĐ/tháng ($800 – $2,400/mo)",
    priceRangeEn: "$800 – $2,400 / month",
    type: "villa",
    h1Vi: "Thuê Biệt Thự Hồ Bơi & Nhà Nguyên Căn Khu Nam Việt Á Đà Nẵng",
    h1En: "Nam Viet A Villas & Townhouses for Rent in Da Nang",
    descVi: "Tổng hợp biệt thự hồ bơi riêng (3–5PN) và nhà nguyên căn 3 tầng hiện đại tại Khu đô thị Nam Việt Á (Ngũ Hành Sơn, Đà Nẵng) ✓ Gần biển Mỹ Khê & trường quốc tế →",
    descEn: "Modern 3–5BR private pool villas and 3-story townhouses in Nam Viet A, Ngu Hanh Son — quiet tree-lined streets 5 mins from My Khe Beach →",
    keywordsVi: "thuê biệt thự Nam Việt Á Đà Nẵng, thuê nhà nguyên căn Nam Việt Á Khuê Mỹ, villa hồ bơi Nam Việt Á",
    highlightsVi: "Khu dân cư trí thức ven sông Hàn đường rộng 7.5m–10.5m nhiều cây xanh, tập trung nhiều biệt thự kiến trúc nhiệt đới có hồ bơi muối khoáng và nhà nguyên căn mới xây giá cực hợp lý."
  }
];

function makeExtraGuide({ slug, catVi, catEn, titleVi, titleEn, descVi, descEn, keywords, sectionsVi, sectionsEn }) {
  return {
    slug,
    catVi,
    catEn,
    datePublished: "2026-11-12",
    dateModified: "2026-11-26",
    titles: {
      vi: `${titleVi} | KIN Estates`,
      en: `${titleEn} | KIN Estates`
    },
    descriptions: {
      vi: descVi,
      en: descEn
    },
    keywords,
    sections: {
      vi: sectionsVi,
      en: sectionsEn
    }
  };
}

const EXTRA_SEO_GUIDES = [
  makeExtraGuide({
    slug: "thue-can-ho-da-nang-duoi-7-trieu",
    catVi: "NGÂN SÁCH TIẾT KIỆM",
    catEn: "BUDGET UNDER $300",
    titleVi: "Thuê Căn Hộ & Studio Đà Nẵng Dưới 7 Triệu Đẹp Đầy Đủ Nội Thất",
    titleEn: "Best Studio & 1BR Apartments in Da Nang Under 7 Million VND ($280/mo)",
    descVi: "Tổng hợp khu vực và kinh nghiệm thuê căn hộ Studio, căn hộ mini Đà Nẵng dưới 7 triệu/tháng đầy đủ nội thất, cửa sổ thoáng, máy giặt riêng tại Hòa Xuân, Sơn Trà, Hải Châu →",
    descEn: "Where to find clean, sunlit furnished studios and apartments in Da Nang under 7M VND ($280/mo) with private washer and fast Wi-Fi →",
    keywords: "thuê căn hộ Đà Nẵng dưới 7 triệu, thuê căn hộ mini Đà Nẵng giá 5 triệu 6 triệu, thuê studio Đà Nẵng giá rẻ đẹp",
    sectionsVi: [
      { h2: "1. Tầm giá 5 – 7 triệu/tháng tại Đà Nẵng thuê được loại căn hộ nào?", p: "Với ngân sách 5 – 7 triệu VNĐ/tháng, khách thuê hoàn toàn chọn được căn hộ Studio rộng 28–38m² hoặc căn 1PN gọn gàng tại Hòa Xuân, Cẩm Lệ, Khuê Mỹ, Thọ Quang (Sơn Trà), Thanh Khê hoặc chung cư The Ori Garden Liên Chiểu, đầy đủ điều hòa inverter, bếp từ, tủ lạnh và máy giặt riêng." },
      { h2: "2. Lưu ý kiểm tra tiền điện nước để không phát sinh chi phí ẩn", p: "Ở phân khúc căn hộ dịch vụ, hãy kiểm tra rõ đơn giá điện (thường 3.500–4.000đ/kWh), miễn phí Wi-Fi và nước sinh hoạt. Nếu muốn tính điện giá nhà nước EVN (~2.800đ/kWh), bạn có thể ưu tiên chung cư thương mại The Ori Garden hoặc FPT Plaza." }
    ],
    sectionsEn: [
      { h2: "1. What Expect Under 7 Million VND ($280/month) in Da Nang?", p: "A 5–7M VND monthly budget unlocks bright 28–38m² furnished studios in Hoa Xuan, Khue My, Son Tra, Thanh Khe, or modern condos in The Ori Garden (Lien Chieu) with A/C, kitchenettes, and washing machines." },
      { h2: "2. Checking Utility Rates Before Signing", p: "Always confirm electricity rates (3,500–4,000 VND/kWh in serviced studios vs ~2,800 VND/kWh state EVN rate in commercial condos) and verify high-speed Wi-Fi stability." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-da-nang-duoi-10-trieu",
    catVi: "PHÂN KHÚC 7–10 TRIỆU",
    catEn: "BUDGET $300–$400",
    titleVi: "Top Căn Hộ & Chung Cư Đà Nẵng Dưới 10 Triệu Đáng Sống Nhất 2026",
    titleEn: "Top Apartments & Condos in Da Nang Under 10 Million VND ($400/mo)",
    descVi: "Gợi ý các tòa căn hộ dịch vụ phố Tây An Thượng, biển Mỹ Khê, FPT Plaza & Sơn Trà tầm giá 7 – 10 triệu/tháng: nội thất mới, ban công thoáng, đi bộ ra biển →",
    descEn: "Best 1-bedroom apartments and condos in Da Nang under 10M VND ($400/mo) across An Thuong, My Khe Beach, Son Tra & FPT Plaza →",
    keywords: "thuê căn hộ Đà Nẵng dưới 10 triệu, thuê căn hộ 1 phòng ngủ Đà Nẵng 8 triệu 9 triệu, thuê chung cư Đà Nẵng dưới 10 triệu",
    sectionsVi: [
      { h2: "1. Phân khúc vàng 7,5 – 10 triệu/tháng cho người độc thân & cặp đôi", p: "Ngân sách 8 – 10 triệu/tháng mở ra hàng loạt căn hộ 1 phòng ngủ tách biệt (40–50m²) tại khu phố Tây An Thượng, Phước Mỹ (đi bộ 4 phút ra biển Mỹ Khê) hoặc căn hộ chung cư 2PN mới bàn giao tại FPT Plaza 1 & 2 (Ngũ Hành Sơn) và Mường Thanh Sơn Trà." },
      { h2: "2. Ưu tiên ban công hướng Đông / Đông Nam và dọn phòng hàng tuần", p: "Các tòa căn hộ dịch vụ chuẩn thiết kế mới tại An Thượng – Mỹ An trong tầm giá 9–10 triệu thường tặng kèm dọn phòng 1 lần/tuần, nước sinh hoạt miễn phí và đường truyền Wi-Fi riêng từng tầng." }
    ],
    sectionsEn: [
      { h2: "1. Best Value 1BR & 2BR Options Under 10M VND ($400/mo)", p: "With 8–10M VND/month, tenants can rent stylish 1BR boutique apartments in An Thuong (4-minute walk to My Khe Beach) or brand-new 2BR condos at FPT Plaza 1 & 2." },
      { h2: "2. Included Weekly Housekeeping & Amenities", p: "Boutique serviced buildings in this bracket typically include free weekly cleaning, municipal water, and dedicated per-floor Wi-Fi routers." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-da-nang-10-den-20-trieu",
    catVi: "PHÂN KHÚC 10–20 TRIỆU",
    catEn: "MID-LUXURY $400–$800",
    titleVi: "Thuê Chung Cư & Nhà Nguyên Căn Đà Nẵng Từ 10 – 20 Triệu/Tháng",
    titleEn: "Best Condos & Whole Houses in Da Nang (10–20 Million VND / Month)",
    descVi: "So sánh lựa chọn thuê chung cư cao cấp (The Monarchy, Hiyori, The Panoma) và nhà nguyên căn 2–3 tầng (Hòa Xuân, Nam Việt Á, Hải Châu) trong tầm giá 10 – 20 triệu/tháng →",
    descEn: "Compare high-rise condos (Monarchy, Hiyori, Panoma) vs 2–3 story whole houses (Hoa Xuan, Nam Viet A) in the 10–20M VND ($400–$800/mo) budget →",
    keywords: "thuê căn hộ Đà Nẵng 15 triệu, thuê nhà nguyên căn Đà Nẵng 12 triệu 15 triệu, thuê chung cư Đà Nẵng từ 10 đến 20 triệu",
    sectionsVi: [
      { h2: "1. Lựa chọn Chung cư cao cấp có hồ bơi & an ninh 24/7", p: "Tầm giá 14 – 20 triệu/tháng giúp bạn thuê được căn 2 phòng ngủ đẹp tại The Monarchy Block B (14–18tr), căn 1PN tại The Panoma Sun Cosmo (16–19tr) hoặc căn 2PN tiêu chuẩn Nhật tại Hiyori Garden Tower (~18–21tr)." },
      { h2: "2. Lựa chọn Nhà nguyên căn 2–3 tầng rộng rãi cho gia đình", p: "Cùng mức 12 – 20 triệu/tháng tại Hòa Xuân, Cẩm Lệ, Khuê Mỹ hoặc Nam Việt Á, bạn thuê được nhà phố nguyên căn 3 phòng ngủ, 3–4 WC, đường ô tô đỗ cửa, cực kỳ thoải mái cho gia đình đông người hoặc kết hợp văn phòng." }
    ],
    sectionsEn: [
      { h2: "1. High-Rise Condos with Resort Pools (14–20M VND)", p: "Rent a river-view 2BR condo at The Monarchy, a brand-new 1BR at The Panoma (Sun Cosmo), or a Japanese-managed 2BR residence at Hiyori Garden Tower." },
      { h2: "2. Spacious 3BR Whole Houses (12–20M VND)", p: "In Hoa Xuan, Cam Le, and Nam Viet A, the same budget secures a modern 3-story townhouse with car parking and state EVN electricity." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-duong-vo-nguyen-giap-da-nang",
    catVi: "TRỤC ĐƯỜNG BIỂN",
    catEn: "BEACHFRONT BOULEVARD",
    titleVi: "Thuê Căn Hộ Đường Võ Nguyên Giáp Mặt Biển Mỹ Khê Đà Nẵng",
    titleEn: "Renting Beachfront Apartments on Vo Nguyen Giap Street, Da Nang",
    descVi: "Tổng hợp các tòa căn hộ & biệt thự cho thuê dài hạn dọc cung đường biển Võ Nguyên Giáp – Trường Sa (Mỹ Khê, Phước Mỹ, Khuê Mỹ) ✓ Đón bình minh biển Đông mỗi sáng →",
    descEn: "Guide to long-term beachfront apartments and coastal villas along Vo Nguyen Giap – Truong Sa Boulevard overlooking My Khe Beach →",
    keywords: "thuê căn hộ đường Võ Nguyên Giáp Đà Nẵng, căn hộ mặt biển Mỹ Khê cho thuê dài hạn, thuê căn hộ đường Trường Sa Đà Nẵng",
    sectionsVi: [
      { h2: "1. Sức hút của cung đường biển Võ Nguyên Giáp – Trường Sa", p: "Là trục đường ven biển đẹp nhất miền Trung chạy dọc bãi tắm Mỹ Khê và Bắc Mỹ An, các căn hộ trên trục Võ Nguyên Giáp sở hữu tầm nhìn đại dương không chắn từ bán đảo Sơn Trà đến Cù Lao Chàm." },
      { h2: "2. Lưu ý kiểm tra cửa kính chống gió biển và ăn mòn muối", p: "Khi thuê dài hạn sát mặt biển, KIN Estates luôn kiểm tra giúp khách hệ cửa nhôm kính kín khít chống gió mùa đông bắc và giàn nóng điều hòa hoạt động êm ái." }
    ],
    sectionsEn: [
      { h2: "1. Living Directly Across from My Khe Beach", p: "Vo Nguyen Giap Boulevard offers unobstructed East Sea sunrises, wide beachfront jogging paths, and immediate access to An Thuong's dining scene." },
      { h2: "2. Acoustic & Coastal Weather Inspection", p: "Our team verifies double-glazed oceanfront balcony seals and A/C condition before you sign a 6–12 month lease." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-duong-bach-dang-tran-hung-dao",
    catVi: "BỜ ĐÔNG & TÂY SÔNG HÀN",
    catEn: "HAN RIVER PROMENADE",
    titleVi: "Thuê Căn Hộ Đường Bạch Đằng & Trần Hưng Đạo Ven Sông Hàn",
    titleEn: "Apartments on Bach Dang & Tran Hung Dao Han Riverfront, Da Nang",
    descVi: "So sánh thuê căn hộ bờ Tây sông Hàn (đường Bạch Đằng — Hải Châu) và bờ Đông sông Hàn (đường Trần Hưng Đạo — Sơn Trà): The Filmore, Indochina, Azura, Monarchy, Sun Ponte →",
    descEn: "Compare West Bank (Bach Dang, Hai Chau) vs East Bank (Tran Hung Dao, Son Tra) riverfront condos in Da Nang →",
    keywords: "thuê căn hộ đường Bạch Đằng Đà Nẵng, thuê căn hộ đường Trần Hưng Đạo Đà Nẵng, căn hộ ven sông Hàn Đà Nẵng",
    sectionsVi: [
      { h2: "1. Đường Bạch Đằng (Bờ Tây — Quận Hải Châu)", p: "Trung tâm phố đi bộ, nhà hàng cao cấp, ngân hàng và cơ quan hành chính. Các tòa tiêu biểu: The Filmore Da Nang, Indochina Riverside, F.Home. Thuận tiện đi sân bay 7 phút và ngắm bình minh hướng Đông." },
      { h2: "2. Đường Trần Hưng Đạo (Bờ Đông — Quận Sơn Trà)", p: "Thoáng đãng, gần biển Mỹ Khê hơn (chỉ 4 phút đi xe), tập trung Azura, Sun Ponte, The Monarchy, Euro Village 1 — ngắm trọn hoàng hôn buông xuống sông Hàn và Cầu Rồng phun lửa cuối tuần." }
    ],
    sectionsEn: [
      { h2: "1. Bach Dang Street (West Bank — Central Hai Chau)", p: "Steps from Michelin-recommended restaurants, riverfront cafes, and corporate offices, anchored by The Filmore and Indochina Riverside." },
      { h2: "2. Tran Hung Dao Street (East Bank — Son Tra)", p: "Closer to My Khe Beach while enjoying sunset views over the Han River at Azura, Sun Ponte, The Monarchy, and Euro Village 1." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-gan-san-bay-da-nang",
    catVi: "TRUNG TÂM & SÂN BAY",
    catEn: "NEAR DA NANG AIRPORT",
    titleVi: "Thuê Căn Hộ & Nhà Nguyên Căn Gần Sân Bay Quốc Tế Đà Nẵng",
    titleEn: "Best Apartments & Houses Near Da Nang International Airport (DAD)",
    descVi: "Gợi ý các khu căn hộ và nhà phố cách Sân bay Quốc tế Đà Nẵng chỉ 5–10 phút di chuyển (Hải Châu, Thanh Khê, Hòa Thuận, Cẩm Lệ) không bị ồn đường băng →",
    descEn: "Quiet, convenient apartments and townhouses 5–10 minutes from Da Nang International Airport (DAD) for frequent flyers & executives →",
    keywords: "thuê căn hộ gần sân bay Đà Nẵng, thuê nhà nguyên căn Hải Châu Thanh Khê gần sân bay",
    sectionsVi: [
      { h2: "1. Dành cho chuyên gia bay công tác hàng tuần", p: "Sân bay Đà Nẵng nằm ngay trong lòng thành phố nên từ khu Bạch Đằng, Nguyễn Văn Linh (Hải Châu), Hòa Thuận hay khu đảo Hòa Xuân di chuyển ra nhà ga T1/T2 chỉ mất 6–10 phút taxi." },
      { h2: "2. Cách chọn vị trí tránh hướng cất hạ cánh trực tiếp", p: "Nên chọn các trục song song phía Đông đường Nguyễn Tri Phương (về phía sông Hàn Hải Châu hoặc Hòa Xuân) để vừa đi sân bay 7 phút vừa yên tĩnh tuyệt đối ban đêm." }
    ],
    sectionsEn: [
      { h2: "1. 6–10 Minute Airport Access Right in the City", p: "Unlike other Asian hubs, Da Nang Airport sits right inside the city—making Hai Chau riverfront and Hoa Xuan ideal 8-minute commutes." },
      { h2: "2. Avoiding Flight-Path Noise", p: "Choose residences east toward the Han Riverfront rather than directly north/south of the runway for whisper-quiet nights." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-gan-truong-quoc-te-da-nang",
    catVi: "GIA ĐÌNH & TRƯỜNG QUỐC TẾ",
    catEn: "INTERNATIONAL SCHOOLS",
    titleVi: "Thuê Nhà & Căn Hộ Gần Trường Quốc Tế SIS, St. Nicholas, APU Đà Nẵng",
    titleEn: "Family Housing Near International Schools in Da Nang (SIS, St. Nicholas)",
    descVi: "Tư vấn chọn thuê biệt thự, nhà nguyên căn & căn hộ 3PN gần Singapore International School (SIS), St. Nicholas, APU và Sky-Line cho gia đình chuyển đến Đà Nẵng →",
    descEn: "Best 3BR condos, townhouses, and pool villas near Singapore International School (SIS), St. Nicholas, and APU in Da Nang →",
    keywords: "thuê nhà gần trường quốc tế Đà Nẵng, thuê biệt thự gần trường SIS Ngũ Hành Sơn, thuê căn hộ gần trường St Nicholas Đà Nẵng",
    sectionsVi: [
      { h2: "1. Khu vực gần trường Singapore International School (SIS) & APU", p: "Gia đình có con học tại SIS hoặc APU (Phú Mỹ An – Ngũ Hành Sơn) thường chọn biệt thự Nam Việt Á, FPT City Hòa Hải hoặc căn hộ 3PN tại The Panoma để đưa đón con chỉ mất 5–8 phút." },
      { h2: "2. Khu vực gần trường St. Nicholas & Sky-Line", p: "Trường St. Nicholas (đường Cách Mạng Tháng Tám) và Sky-Line nằm sát khu đảo VIP Hòa Xuân, Khuê Trung (Cẩm Lệ) và Nam Hải Châu — cực kỳ thuận lợi để thuê nhà nguyên căn sân vườn hoặc biệt thự Euro Village 2." }
    ],
    sectionsEn: [
      { h2: "1. Near Singapore International School (SIS) & APU", p: "Nam Viet A villas, FPT City residences, and 3BR sky condos at The Panoma offer an easy 5–8 minute school run." },
      { h2: "2. Near St. Nicholas International School", p: "Hoa Xuan Eco-Island, Euro Village 2, and southern Hai Chau provide quiet family homes within 5 minutes of campus." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-khu-han-quoc-pham-van-dong",
    catVi: "PHỐ HÀN QUỐC K-TOWN",
    catEn: "KOREAN QUARTER DA NANG",
    titleVi: "Thuê Căn Hộ Khu Hàn Quốc Phạm Văn Đồng – Dương Đình Nghệ Đà Nẵng",
    titleEn: "Renting Apartments in Da Nang's Korean Quarter (Pham Van Dong)",
    descVi: "Khám phá khu căn hộ, nhà hàng & siêu thị Hàn Quốc dọc trục Phạm Văn Đồng – Dương Đình Nghệ – Hồ Nghinh (Quận Sơn Trà, Đà Nẵng) đi bộ ra biển Phạm Văn Đồng →",
    descEn: "Guide to apartments and condos in Da Nang's lively Korean Quarter along Pham Van Dong, Duong Dinh Nghe & Ho Nghinh near the beach →",
    keywords: "thuê căn hộ Phạm Văn Đồng Đà Nẵng, căn hộ khu Hàn Quốc Sơn Trà Đà Nẵng, thuê căn hộ đường Hồ Nghinh Dương Đình Nghệ",
    sectionsVi: [
      { h2: "1. Tiện ích sống 24/7 tại khu phố Hàn Quốc Sơn Trà", p: "Khu vực Phạm Văn Đồng – Dương Đình Nghệ – Hồ Nghinh quy tụ hàng chục siêu thị thực phẩm Hàn – Nhật, nhà hàng BBQ, phòng khám, spa và chỉ cách công viên Biển Đông 300–600m đi bộ." },
      { h2: "2. Đa dạng căn hộ dịch vụ 1–2PN & chung cư Hiyori, Alphanam", p: "Khách thuê có thể chọn các tòa căn hộ dịch vụ mới xây thiết kế tối giản gỗ sáng màu (8–14 triệu/tháng) hoặc chung cư cao tầng khu Võ Văn Kiệt – Phạm Văn Đồng." }
    ],
    sectionsEn: [
      { h2: "1. 24/7 Convenience Near East Sea Park Beach", p: "Packed with Korean/Japanese supermarkets, cafes, clinics, and fitness studios within a 5-minute walk to Pham Van Dong Beach." },
      { h2: "2. Bright Minimalist 1BR & 2BR Apartments", p: "Choose from newly built minimalist serviced apartments ($350–$600/mo) or nearby high-rise towers." }
    ]
  }),
  makeExtraGuide({
    slug: "mau-hop-dong-thue-can-ho-nha-da-nang-song-ngu",
    catVi: "PHÁP LÝ & HỢP ĐỒNG",
    catEn: "BILINGUAL LEASE GUIDE",
    titleVi: "Mẫu Hợp Đồng Thuê Căn Hộ & Nhà Nguyên Căn Đà Nẵng Song Ngữ Chuẩn",
    titleEn: "Standard Bilingual (VN–EN) Rental Contract Terms in Da Nang",
    descVi: "7 điều khoản bắt buộc phải có trong hợp đồng thuê nhà, căn hộ Đà Nẵng (song ngữ Việt – Anh) để bảo vệ 100% tiền đặt cọc và quyền lợi khách thuê lẫn chủ nhà →",
    descEn: "7 mandatory clauses every bilingual Vietnamese–English apartment or house lease in Da Nang must include to protect your deposit →",
    keywords: "mẫu hợp đồng thuê căn hộ Đà Nẵng, hợp đồng thuê nhà song ngữ Việt Anh Đà Nẵng, lưu ý khi ký hợp đồng thuê nhà Đà Nẵng",
    sectionsVi: [
      { h2: "1. 7 điều khoản cốt lõi bảo vệ quyền lợi hai bên", p: "1) Thông tin pháp lý chủ nhà & mã căn.\n2) Giá thuê cố định suốt kỳ hạn, tiền đặt cọc (thường 1 tháng) và chu kỳ thanh toán.\n3) Đơn giá điện (EVN hoặc niêm yết), nước, Wi-Fi, phí quản lý.\n4) Trách nhiệm sửa chữa hao mòn tự nhiên (điều hòa, máy giặt, bình nóng lạnh, thấm tường thuộc về chủ nhà).\n5) Điều khoản chấm dứt sớm và thời hạn hoàn cọc (trong 3–7 ngày làm việc khi bàn giao).\n6) Cam kết hỗ trợ đăng ký tạm trú Công an Phường / Mẫu NA17.\n7) Phụ lục hình ảnh bàn giao tài sản thực tế." },
      { h2: "2. Hỗ trợ soạn thảo & rà soát miễn phí tại KIN Estates", p: "Mọi giao dịch qua KIN Estates Đà Nẵng đều được soạn sẵn hợp đồng song ngữ Việt – Anh chuẩn mực, ký trực tiếp giữa khách thuê và chủ sở hữu." }
    ],
    sectionsEn: [
      { h2: "1. Seven Essential Clauses in a Safe Da Nang Lease", p: "Verify owner title, fixed monthly rent, 1-month deposit refund timeline (within 3–7 days of check-out), explicit utility rates, landlord responsibility for structural/appliance wear-and-tear, NA17 registration, and a photo inventory appendix." },
      { h2: "2. Complimentary Bilingual Contract Preparation", p: "KIN Estates provides clear Vietnamese–English contracts signed directly with the verified property owner at zero fee to tenants." }
    ]
  }),
  makeExtraGuide({
    slug: "kinh-nghiem-dat-coc-thue-nha-da-nang-khong-mat-coc",
    catVi: "BẢO VỆ TIỀN CỌC",
    catEn: "DEPOSIT PROTECTION",
    titleVi: "Kinh Nghiệm Đặt Cọc Thuê Nhà & Căn Hộ Đà Nẵng Không Lo Mất Cọc",
    titleEn: "How to Protect Your Rental Security Deposit in Da Nang (100% Safe)",
    descVi: "Bí quyết đặt cọc giữ căn và nhận lại đủ 100% tiền cọc khi hết hạn hợp đồng thuê căn hộ, nhà nguyên căn tại Đà Nẵng từ kinh nghiệm thực chiến của KIN Estates →",
    descEn: "Practical step-by-step rules to verify landlords, document move-in condition, and receive 100% of your security deposit back in Da Nang →",
    keywords: "kinh nghiệm đặt cọc thuê nhà Đà Nẵng, làm sao không mất tiền cọc thuê căn hộ, quy định hoàn cọc thuê nhà Đà Nẵng",
    sectionsVi: [
      { h2: "1. Chỉ chuyển cọc trực tiếp vào tài khoản chính chủ trên hợp đồng", p: "Trước khi chuyển khoản đặt cọc, hãy đối chiếu tên chủ tài khoản ngân hàng trùng khớp với Căn cước công dân / Giấy chứng nhận quyền sở hữu hoặc văn bản ủy quyền hợp lệ của chủ nhà." },
      { h2: "2. Quay video & chụp ảnh biên bản bàn giao ngày nhận chìa khóa", p: "Chụp rõ chỉ số đồng hồ điện nước và mọi vết xước sẵn có trên sofa, mặt bàn, tường sơn trong 48 giờ đầu tiên gửi vào nhóm chung Zalo/WhatsApp để làm căn cứ hoàn cọc 100% khi trả nhà." }
    ],
    sectionsEn: [
      { h2: "1. Transfer Deposits Directly to the Verified Owner", p: "Always verify that the bank recipient matches the property owner's ID and ownership documents on the bilingual lease." },
      { h2: "2. 48-Hour Move-In Photo & Meter Log", p: "Record electricity/water meter readings and existing cosmetic wear in a shared chat thread within 48 hours of move-in." }
    ]
  }),
  makeExtraGuide({
    slug: "so-sanh-hiyori-va-monarchy-da-nang",
    catVi: "SO SÁNH TOÀ NHÀ",
    catEn: "TOWER COMPARISON",
    titleVi: "So Sánh Chung Cư Hiyori Garden Tower Và The Monarchy Đà Nẵng",
    titleEn: "Hiyori Garden Tower vs. The Monarchy Da Nang — Which Should You Rent?",
    descVi: "Đặt lên bàn cân 2 tòa chung cư được thuê nhiều nhất Quận Sơn Trà Đà Nẵng: Hiyori Garden Tower và The Monarchy về giá thuê, nuôi thú cưng, tiện ích & khoảng cách ra biển →",
    descEn: "Detailed comparison of Hiyori Garden Tower vs The Monarchy in Son Tra, Da Nang: monthly rent, pet policy, pool, beach walk & vibe →",
    keywords: "so sánh Hiyori và Monarchy Đà Nẵng, nên thuê Hiyori hay Monarchy, chung cư Sơn Trà nào tốt nhất",
    sectionsVi: [
      { h2: "1. Khi nào nên chọn Hiyori Garden Tower?", p: "Chọn Hiyori (đường Võ Văn Kiệt) nếu bạn ưu tiên sự yên tĩnh, sạch sẽ chuẩn Nhật, lễ tân an ninh cực kỳ nghiêm ngặt và muốn đi bộ thẳng ra biển Mỹ Khê (khoảng 10 phút). Lưu ý: Hiyori không cho phép nuôi chó mèo." },
      { h2: "2. Khi nào nên chọn The Monarchy Block B?", p: "Chọn The Monarchy (đường Trần Hưng Đạo) nếu bạn nuôi thú cưng (chó/mèo), thích khuôn viên nội khu rộng có sẵn siêu thị, quán cà phê ngay tầng trệt, view trực diện sông Hàn và ngân sách tiết kiệm hơn 3–5 triệu/tháng (2PN từ 14–18 triệu)." }
    ],
    sectionsEn: [
      { h2: "1. Choose Hiyori Garden Tower If...", p: "You value quiet Japanese building management, strict security, an indoor heated pool, and walking access to My Khe Beach (no pets allowed)." },
      { h2: "2. Choose The Monarchy If...", p: "You have pets, love ground-floor cafes/supermarkets and a large garden pool, want direct Han River sunset views, and prefer lower rent ($580–$750/mo for 2BR)." }
    ]
  }),
  makeExtraGuide({
    slug: "so-sanh-the-filmore-va-the-panoma-sun-cosmo",
    catVi: "CHUNG CƯ HẠNG SANG",
    catEn: "LUXURY TOWER DUEL",
    titleVi: "So Sánh The Filmore Và The Panoma Sun Cosmo Đà Nẵng — Thuê & Mua",
    titleEn: "The Filmore vs. The Panoma (Sun Cosmo) Da Nang — Luxury Condo Comparison",
    descVi: "Phân tích chuyên sâu 2 biểu tượng chung cư hạng sang mới nhất ven sông Hàn Đà Nẵng: The Filmore (Bạch Đằng) và The Panoma Sun Cosmo (Trần Thị Lý) cho khách thuê & nhà đầu tư →",
    descEn: "Compare Da Nang's two newest luxury riverfront residences: The Filmore vs The Panoma (Sun Cosmo Residence) across layouts, amenities & yields →",
    keywords: "so sánh The Filmore và Sun Cosmo Đà Nẵng, nên thuê Filmore hay Panoma Đà Nẵng",
    sectionsVi: [
      { h2: "1. The Filmore — Đẳng cấp Boutique Luxury giữa phố Bạch Đằng", p: "Chỉ 206 căn hộ độc bản tại Quận Hải Châu, bàn giao nội thất hoàn thiện cực kỳ tinh xảo, hồ bơi nước ấm và sauna hồng ngoại trên tầng thượng — phù hợp CEO, chuyên gia cấp cao (1PN 25–32tr; 2PN 35–50tr/tháng)." },
      { h2: "2. The Panoma (Sun Cosmo) — Tổ hợp hiện đại tầm nhìn kép Sông & Biển", p: "Quy mô lớn hiện đại ngay cầu Trần Thị Lý, đa dạng diện tích từ Studio, 1PN, 2PN đến 3PN rộng trên 100m², mức giá thuê mềm hơn (1PN từ 16–22tr; 2PN từ 23–34tr/tháng) và đi ra biển Mỹ Khê cực nhanh." }
    ],
    sectionsEn: [
      { h2: "1. The Filmore — Boutique West-Bank Prestige", p: "Ultra-exclusive 206-unit landmark on Bach Dang promenade with heated rooftop infinity pool and infrared sauna ($1,000–$2,100/mo)." },
      { h2: "2. The Panoma (Sun Cosmo) — Modern Dual River & Ocean Views", p: "Newly delivered Sun Group towers offering Studio to spacious 100m²+ 3BR family layouts ($650–$1,800/mo) with 4-minute beach access." }
    ]
  }),
  makeExtraGuide({
    slug: "nen-thue-nha-nguyen-can-hay-chung-cu-da-nang",
    catVi: "TƯ VẤN LỰA CHỌN",
    catEn: "HOUSE VS CONDO",
    titleVi: "Nên Thuê Nhà Nguyên Căn Hay Căn Hộ Chung Cư Tại Đà Nẵng?",
    titleEn: "Whole House vs. Condominium in Da Nang — Which Fits Your Lifestyle?",
    descVi: "Phân tích thực tế chi phí, an ninh, chỗ đỗ ô tô, hóa đơn điện nước và trải nghiệm sống giữa thuê nhà nguyên căn (Hòa Xuân, Hải Châu, Sơn Trà) và thuê chung cư Đà Nẵng →",
    descEn: "Honest pros and cons of renting a whole townhouse vs a high-rise condo in Da Nang: space, security, car parking, pets & monsoon comfort →",
    keywords: "nên thuê nhà nguyên căn hay chung cư Đà Nẵng, ưu nhược điểm thuê nhà phố Đà Nẵng",
    sectionsVi: [
      { h2: "1. Ưu điểm vượt trội của Nhà nguyên căn / Nhà phố Đà Nẵng", p: "Không tốn phí quản lý hàng tháng, đỗ ô tô miễn phí ngay trong sân/trước nhà, thoải mái nuôi thú cưng, tổ chức tiệc gia đình hoặc kết hợp làm văn phòng công ty, diện tích sử dụng gấp đôi chung cư cùng tầm giá (200–300m² sàn)." },
      { h2: "2. Ưu điểm vượt trội của Căn hộ chung cư tầng cao", p: "An ninh thẻ từ 3 lớp 24/7 (đi công tác xa khóa cửa hoàn toàn yên tâm), khô ráo thoáng gió không lo côn trùng mùa mưa, có sẵn hồ bơi & phòng gym ngay trong tòa nhà." }
    ],
    sectionsEn: [
      { h2: "1. Why Families & Teams Love Whole Houses", p: "Zero monthly management fees, private car garage, 200–300m² of multi-floor space, pet freedom, and home-office flexibility." },
      { h2: "2. Why Solo Expats & Couples Prefer High-Rise Condos", p: "Lock-and-leave 24/7 security, breezy upper floors free of insects, panoramic views, and on-site pools and gyms." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-nha-lam-van-phong-studio-da-nang",
    catVi: "NHÀ Ở KẾT HỢP VĂN PHÒNG",
    catEn: "LIVE-WORK TOWNHOUSES",
    titleVi: "Thuê Nhà Nguyên Căn Kết Hợp Làm Văn Phòng & Studio Tại Đà Nẵng",
    titleEn: "Renting Live-Work Houses & Boutique Offices in Da Nang",
    descVi: "Kinh nghiệm chọn thuê nhà nguyên căn 3–4 tầng đường 7.5m–10.5m tại Hải Châu, Hòa Xuân, Nam Việt Á, An Thượng vừa ở vừa mở văn phòng IT, agency, studio sáng tạo →",
    descEn: "How startups, tech teams, and creative studios rent modern 3–4 story live-work houses in Hai Chau, Hoa Xuan & Nam Viet A, Da Nang →",
    keywords: "thuê nhà làm văn phòng Đà Nẵng, thuê nhà nguyên căn vừa ở vừa kinh doanh Đà Nẵng, thuê nhà phố Hòa Xuân Hải Châu làm công ty",
    sectionsVi: [
      { h2: "1. Tiêu chí chọn nhà nguyên căn vừa ở vừa làm việc cho team 5–15 người", p: "Ưu tiên đường rộng tối thiểu 7.5m (vỉa hè 3–4m đỗ được 2–3 ô tô và chục xe máy), tầng 1 thông sàn làm không gian làm việc chung, tầng 2–3 là phòng ngủ khép kín, có sẵn điện 3 pha hoặc công tơ EVN riêng và hỗ trợ xuất hóa đơn / đăng ký địa điểm kinh doanh." },
      { h2: "2. Khu vực giá tốt nhất năm 2026", p: "Khu Nam Việt Á, Đảo VIP Hòa Xuân và khu Nam Hòa Cường (Hải Châu) có rất nhiều nhà 3–4 tầng mới tinh giá chỉ từ 18 – 32 triệu/tháng." }
    ],
    sectionsEn: [
      { h2: "1. Ideal Layout for 5–15 Person Tech & Creative Teams", p: "Look for 7.5m+ wide streets for easy parking, an open-plan ground floor workspace, upper-floor ensuite bedrooms, and business-registration permission in the lease." },
      { h2: "2. Top Value Districts", p: "Nam Viet A, Hoa Xuan Island, and Hoa Cuong (Hai Chau) offer modern 3–4 story houses from $700–$1,300/month." }
    ]
  }),
  makeExtraGuide({
    slug: "can-ho-cho-digital-nomad-remote-work-da-nang",
    catVi: "DIGITAL NOMAD & WFH",
    catEn: "DIGITAL NOMAD GUIDE",
    titleVi: "Top Căn Hộ Cho Digital Nomad & Làm Việc Từ Xa Tại Đà Nẵng",
    titleEn: "Best Apartments in Da Nang for Digital Nomads & Remote Workers (2026)",
    descVi: "Tiêu chuẩn chọn căn hộ Đà Nẵng cho người làm việc từ xa (Remote Work): tốc độ Wi-Fi thực tế 300Mbps+, bàn làm việc công thái học, cách âm họp Zoom & gần coworking →",
    descEn: "Curated Da Nang apartments audited for 300Mbps+ fiber Wi-Fi, sunlit work desks, quiet Zoom acoustics, and walkable specialty coffee →",
    keywords: "căn hộ cho digital nomad Đà Nẵng, thuê căn hộ làm việc từ xa Đà Nẵng, remote work apartment Da Nang",
    sectionsVi: [
      { h2: "1. 3 yếu tố bắt buộc cho dân Remote Work quốc tế", p: "1) Modem cáp quang riêng trong phòng (hoặc Access Point riêng không dùng chung quá tải giờ tối).\n2) Bàn làm việc sâu tối thiểu 60cm đặt gần ánh sáng tự nhiên.\n3) Khu vực xung quanh không có công trình đang khoan bê tông phần thô ban ngày." },
      { h2: "2. KIN Estates kiểm tra thực tế bằng Speedtest & Video Call", p: "Trước khi khách đặt thuê từ xa, chuyên viên KIN Estates đo trực tiếp tốc độ Upload/Download và độ ồn dB ngay tại bàn làm việc của căn hộ." }
    ],
    sectionsEn: [
      { h2: "1. Three Non-Negotiables for Remote Professionals", p: "Dedicated in-unit router (not congested shared hallway Wi-Fi), proper 60cm+ deep work desk by natural light, and verified zero daytime construction next door." },
      { h2: "2. Live Speedtest & Acoustic Verification", p: "KIN Estates runs live Speedtests and 4K video walk-throughs from the apartment before you commit." }
    ]
  }),
  makeExtraGuide({
    slug: "so-hong-lau-dai-va-hop-dong-spa-chung-cu-da-nang",
    catVi: "PHÁP LÝ MUA BÁN",
    catEn: "PINK BOOK VS SPA",
    titleVi: "Phân Biệt Sổ Hồng Lâu Dài & Hợp Đồng SPA Khi Mua Chung Cư Đà Nẵng",
    titleEn: "Pink Book Freehold vs. 50-Year Foreigner SPA in Da Nang Condos",
    descVi: "Giải thích dễ hiểu sự khác nhau giữa căn hộ Sổ hồng sở hữu lâu dài, căn hộ thương mại dịch vụ 50 năm và hợp đồng SPA suất người nước ngoài khi mua căn hộ Đà Nẵng →",
    descEn: "Clear legal breakdown of Vietnamese freehold Pink Book titles vs 50-year Foreigner Quota (SPA) contracts when buying condos in Da Nang →",
    keywords: "sổ hồng lâu dài chung cư Đà Nẵng, hợp đồng SPA người nước ngoài mua căn hộ Đà Nẵng, phân biệt sổ hồng lâu dài và 50 năm",
    sectionsVi: [
      { h2: "1. Căn hộ thương mại Sổ hồng lâu dài (Người Việt Nam)", p: "Được đăng ký hộ khẩu thường trú, tài sản gắn liền đất ở đô thị lâu dài, giá trị thanh khoản và vay ngân hàng cao nhất (tiêu biểu: The Filmore, Sun Cosmo The Panoma, Hiyori, Monarchy, FPT Plaza)." },
      { h2: "2. Suất người nước ngoài (Foreigner Quota — Tối đa 30% giỏ hàng)", p: "Khách quốc tế ký Hợp đồng mua bán (SPA) thời hạn sở hữu 50 năm (được gia hạn theo Luật Nhà ở), được cấp Sổ hồng ghi nhận quyền sở hữu 50 năm, được phép cho thuê hợp pháp và chuyển nhượng lại cho cả người Việt (khi bán lại cho người Việt sẽ chuyển về sở hữu lâu dài)." }
    ],
    sectionsEn: [
      { h2: "1. Vietnamese Freehold Pink Book", p: "Permanent residential ownership available to Vietnamese citizens across commercial condo projects." },
      { h2: "2. Foreigner 30% Quota (Renewable 50-Year Ownership)", p: "Foreigners hold official 50-year renewable ownership with full rights to rent out, inherit, or resell—and if resold to a Vietnamese citizen, the title converts back to permanent freehold." }
    ]
  }),
  makeExtraGuide({
    slug: "thu-tuc-sang-ten-so-hong-mua-ban-can-ho-da-nang",
    catVi: "THỦ TỤC SANG TÊN",
    catEn: "CLOSING & TAXES",
    titleVi: "Thủ Tục & Thuế Phí Sang Tên Sổ Hồng Mua Bán Căn Hộ Nhà Đất Đà Nẵng",
    titleEn: "Step-by-Step Closing Process & Taxes When Buying Property in Da Nang",
    descVi: "Quy trình 4 bước công chứng chuyển nhượng, kê khai thuế thu nhập cá nhân 2%, lệ phí trước bạ 0.5% và thời gian ra Sổ hồng mới tại Đà Nẵng năm 2026 →",
    descEn: "Complete 4-step notary transfer process, 2% PIT, 0.5% registration fee, and timeline for title transfer in Da Nang →",
    keywords: "thủ tục sang tên sổ hồng Đà Nẵng, thuế phí mua bán căn hộ Đà Nẵng, quy trình mua bán chung cư Đà Nẵng",
    sectionsVi: [
      { h2: "1. Các khoản thuế & lệ phí sang tên tiêu chuẩn", p: "• Thuế thu nhập cá nhân (thường bên bán chịu): 2% giá trị chuyển nhượng.\n• Lệ phí trước bạ (thường bên mua chịu): 0,5%.\n• Phí thẩm định hồ sơ & công chứng hợp đồng chuyển nhượng tại Phòng Công chứng Đà Nẵng." },
      { h2: "2. Quy trình 4 bước an toàn tuyệt đối", p: "1) Kiểm tra quy hoạch & tình trạng giải chấp ngân hàng.\n2) Đặt cọc công chứng / ba bên.\n3) Ký Hợp đồng chuyển nhượng tại Văn phòng Công chứng và thanh toán qua ngân hàng.\n4) Nộp hồ sơ một cửa, hoàn thành nghĩa vụ thuế và nhận Sổ hồng cập nhật tên chủ mới (khoảng 12–20 ngày làm việc)." }
    ],
    sectionsEn: [
      { h2: "1. Standard Transfer Taxes & Fees", p: "Personal Income Tax is 2% (customarily seller), Registration Duty is 0.5% (customarily buyer), plus minor notary and administrative fees." },
      { h2: "2. Safe 4-Step Closing Timeline", p: "Title/encumbrance check -> Deposit agreement -> Public Notary signing & bank transfer -> Tax clearance & new Pink Book issuance (12–20 business days)." }
    ]
  }),
  makeExtraGuide({
    slug: "kinh-nghiem-chon-huong-can-ho-chong-nang-mua-mua-da-nang",
    catVi: "KIẾN TRÚC & KHÍ HẬU",
    catEn: "ORIENTATION & MONSOON",
    titleVi: "Kinh Nghiệm Chọn Hướng Căn Hộ Mát Mẻ & Chống Ẩm Mùa Mưa Đà Nẵng",
    titleEn: "Best Apartment Orientations & Monsoon Tips for Living in Da Nang",
    descVi: "Bí quyết kiến trúc sư chọn hướng ban công căn hộ Đà Nẵng mát quanh năm (Đông Nam, Đông Bắc), tiết kiệm 30% tiền điện điều hòa và khô ráo suốt mùa mưa tháng 10–12 →",
    descEn: "Architect's guide to choosing cool Southeast/River-view apartment orientations in Da Nang and staying dry during the Oct–Dec rainy season →",
    keywords: "chọn hướng căn hộ Đà Nẵng, kinh nghiệm thuê nhà mùa mưa Đà Nẵng, căn hộ hướng Đông Nam Đà Nẵng",
    sectionsVi: [
      { h2: "1. Hướng Đông Nam & Đông Bắc — Mát mẻ tiết kiệm điện suốt mùa hè", p: "Đà Nẵng nắng rực rỡ từ tháng 4 đến tháng 8. Các căn ban công hướng Đông Nam hoặc Đông Bắc đón nắng sớm dịu nhẹ và gió biển mát rượi cả chiều tối. Nếu chọn căn hướng Tây ngắm hoàng hôn sông Hàn, hãy ưu tiên tòa dùng kính hộp Low-E 2 lớp (như The Filmore, The Panoma, Hiyori) kèm rèm blackout." },
      { h2: "2. Mẹo giữ căn hộ thơm tho khô ráo mùa mưa tháng 10 – tháng 12", p: "Chọn tầng trung – cao (từ tầng 8 trở lên), kiểm tra gioăng cao su cửa sổ ban công và bật chế độ Dry trên điều hòa inverter 1–2 tiếng mỗi ngày mưa lớn." }
    ],
    sectionsEn: [
      { h2: "1. Southeast & Northeast — Cool Sea Breezes All Summer", p: "Southeast-facing balconies catch gentle morning light and cool afternoon ocean breezes. For West-facing sunset river views, choose towers with double Low-E thermal glass." },
      { h2: "2. Monsoon Comfort (October–December)", p: "Mid-to-high floors (8F+) with tight rubber window seals and inverter A/C 'Dry' mode keep interiors crisp and fresh." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-can-ho-ngan-han-3-thang-6-thang-da-nang",
    catVi: "THUÊ LINH HOẠT 3–6 THÁNG",
    catEn: "3–6 MONTH LEASES",
    titleVi: "Thuê Căn Hộ Đà Nẵng 3 Tháng – 6 Tháng Linh Hoạt Đầy Đủ Nội Thất",
    titleEn: "Flexible 3-Month & 6-Month Apartment Rentals in Da Nang",
    descVi: "Danh sách khu vực và tòa nhà hỗ trợ hợp đồng thuê căn hộ 3 tháng, 6 tháng tại Đà Nẵng cho chuyên gia dự án, Việt kiều về nước & khách trú đông (Workcation) →",
    descEn: "Where to find verified 3-month and 6-month furnished apartment and villa leases in Da Nang without paying hotel rates →",
    keywords: "thuê căn hộ Đà Nẵng 3 tháng, thuê căn hộ 6 tháng Đà Nẵng, thuê căn hộ theo quý Đà Nẵng",
    sectionsVi: [
      { h2: "1. Những tòa nhà & khu vực nhận hợp đồng 3 – 6 tháng", p: "Trong khi nhiều chủ nhà chung cư yêu cầu tối thiểu 1 năm, KIN Estates luôn có giỏ hàng tuyển chọn hỗ trợ ký 3–6 tháng tại: khu phố Tây An Thượng, Mỹ An, Phước Mỹ, chung cư The Monarchy và một số căn chọn lọc tại Hiyori, Mường Thanh, Hòa Xuân." },
      { h2: "2. Tiết kiệm 40–55% so với thuê khách sạn / Airbnb theo ngày", p: "Ký hợp đồng 3–6 tháng trực tiếp chủ nhà giúp bạn hưởng mức giá dài hạn, có bếp nấu riêng, máy giặt sấy và đăng ký tạm trú đầy đủ." }
    ],
    sectionsEn: [
      { h2: "1. Buildings Welcoming 3–6 Month Contracts", p: "An Thuong boutique apartments, My An, Phuoc My, The Monarchy, and select owner units in Hiyori and Hoa Xuan accept 3-to-6-month stays." },
      { h2: "2. Save 40–55% Compared to Short-Term Booking Platforms", p: "Direct 3–6 month residential leases unlock true local monthly pricing, full kitchens, and official NA17 registration." }
    ]
  }),
  makeExtraGuide({
    slug: "thue-villa-nghi-duong-dai-han-cho-chuyen-gia-da-nang",
    catVi: "BIỆT THỰ CHUYÊN GIA",
    catEn: "EXECUTIVE POOL VILLAS",
    titleVi: "Thuê Biệt Thự Nghỉ Dưỡng Dài Hạn Cho Chuyên Gia & Gia Đình Đà Nẵng",
    titleEn: "Long-Term Executive Pool Villas in Da Nang — Corporate & Family Leases",
    descVi: "Dịch vụ tìm thuê biệt thự hồ bơi riêng tiêu chuẩn 5 sao tại Đà Nẵng (Euro Village, Đảo Xanh, Nam Việt Á, trục biển Trường Sa) có xuất hóa đơn VAT cho công ty nước ngoài →",
    descEn: "Corporate-ready private pool villas in Da Nang with VAT invoicing, bilingual contracts, pool/garden care, and 24/7 security →",
    keywords: "thuê biệt thự cho chuyên gia Đà Nẵng, thuê villa dài hạn có hóa đơn VAT Đà Nẵng, executive villa rental Da Nang",
    sectionsVi: [
      { h2: "1. Tiêu chuẩn biệt thự dành cho Tổng giám đốc & Chuyên gia FDI", p: "Hồ bơi riêng xử lý điện phân muối an toàn cho da, gara đỗ 2 ô tô, từ 3–5 phòng ngủ khép kín (ensuite bathroom), hệ thống lọc nước tổng sinh hoạt và bảo trì sân vườn – hồ bơi định kỳ hàng tuần." },
      { h2: "2. Hỗ trợ hợp đồng pháp nhân công ty & khấu trừ thuế", p: "KIN Estates hỗ trợ rà soát hồ sơ chủ nhà đủ điều kiện ký hợp đồng thuê với pháp nhân doanh nghiệp FDI và kê khai thuế thuê tài sản minh bạch." }
    ],
    sectionsEn: [
      { h2: "1. Five-Star Residential Standards", p: "Saltwater pools, enclosed car garages, 3–5 ensuite bedrooms, whole-house water filtration, and scheduled weekly pool/garden maintenance." },
      { h2: "2. Corporate Lease & Tax Invoice Support", p: "We match corporate tenants with landlords able to sign company-name leases with full tax compliance." }
    ]
  }),
  makeExtraGuide({
    slug: "bang-gia-thue-nha-nguyen-can-hoa-xuan-cam-le-2026",
    catVi: "BẢNG GIÁ HÒA XUÂN",
    catEn: "HOA XUAN HOUSE PRICES",
    titleVi: "Bảng Giá Thuê Nhà Nguyên Căn Hòa Xuân & Cẩm Lệ Đà Nẵng 2026",
    titleEn: "2026 House & Villa Rent Prices in Hoa Xuan & Cam Le, Da Nang",
    descVi: "Cập nhật giá thuê nhà nguyên căn 2–4 tầng, nhà phố sân vườn & biệt thự ven sông tại Đảo VIP Hòa Xuân, Nam Hòa Xuân và Quận Cẩm Lệ Đà Nẵng mới nhất 2026 →",
    descEn: "Updated 2026 monthly rent guide for 2–4 story townhouses and riverfront villas in Hoa Xuan Eco-Island and Cam Le, Da Nang →",
    keywords: "giá thuê nhà nguyên căn Hòa Xuân 2026, thuê nhà Đảo VIP Hòa Xuân, thuê nhà Nam Hòa Xuân Cẩm Lệ Đà Nẵng",
    sectionsVi: [
      { h2: "1. Mặt bằng giá thuê nhà nguyên căn Hòa Xuân – Cẩm Lệ 2026", p: "• Nhà 2–3 tầng cơ bản / nội thất gọn (3PN): 10 – 14 triệu/tháng.\n• Nhà phố 3 tầng thiết kế hiện đại đầy đủ nội thất cao cấp: 15 – 25 triệu/tháng.\n• Biệt thự sân vườn / hồ bơi ven sông Đảo VIP & Euro Village 2: 32 – 65 triệu/tháng." },
      { h2: "2. Vì sao Hòa Xuân là khu đô thị đáng sống bậc nhất cho gia đình?", p: "Quy hoạch điện âm 100%, công viên ven sông thoáng mát, đường 7.5m ô tô tránh nhau rộng rãi, không ngập lụt và chỉ cách cầu Hòa Xuân – siêu thị Mega Market 5 phút." }
    ],
    sectionsEn: [
      { h2: "1. 2026 Monthly Rent Brackets in Hoa Xuan", p: "Standard 3BR townhouses rent for 10–14M VND ($400–$560); designer fully furnished 3-story homes run 15–25M VND ($600–$1,000); riverfront pool villas range from 32–65M VND ($1,250–$2,600)." },
      { h2: "2. Underground Utilities & Wide Tree-Lined Streets", p: "Master-planned streets, riverside parks, zero congestion, and 5-minute access to Mega Market in Hai Chau." }
    ]
  }),
  makeExtraGuide({
    slug: "bang-gia-thue-can-ho-an-thuong-my-an-2026",
    catVi: "BẢNG GIÁ AN THƯỢNG",
    catEn: "AN THUONG RENT INDEX",
    titleVi: "Bảng Giá Thuê Căn Hộ Phố Tây An Thượng & Mỹ An Đà Nẵng 2026",
    titleEn: "2026 An Thuong & My An Beach Quarter Apartment Rent Guide",
    descVi: "Chi tiết giá thuê Studio, căn hộ 1PN, 2PN, Loft kiến trúc & Penthouse tại khu phố Tây An Thượng (An Thượng 1–38, Hoàng Kế Viêm, Châu Thị Vĩnh Tế, Mỹ An) →",
    descEn: "2026 monthly rent index across An Thuong Streets 1–38, Hoang Ke Viem, and My An beachside quarter in Da Nang →",
    keywords: "giá thuê căn hộ An Thượng Đà Nẵng, thuê studio An Thượng, thuê căn hộ Hoàng Kế Viêm Châu Thị Vĩnh Tế",
    sectionsVi: [
      { h2: "1. Khung giá thuê thực tế tại An Thượng – Mỹ An năm 2026", p: "• Studio cửa sổ / ban công nhỏ đầy đủ tiện nghi: 6,5 – 9 triệu/tháng.\n• Căn hộ 1PN thiết kế kiến trúc / Loft gỗ tự nhiên gần biển: 9,5 – 15 triệu/tháng.\n• Căn hộ 2PN rộng có bồn tắm / thang máy / hồ bơi sân thượng: 14 – 23 triệu/tháng." },
      { h2: "2. Mẹo chọn đường yên tĩnh trong khu An Thượng", p: "Nếu thích yên tĩnh ngủ sâu nhưng vẫn đi bộ 2 phút ra quán cà phê Hoàng Kế Viêm, hãy chọn các tuyến An Thượng 20–38 hoặc khu Nam An Thượng giáp Đỗ Bá – Nguyễn Văn Thoại." }
    ],
    sectionsEn: [
      { h2: "1. 2026 Monthly Rent Tiers in An Thuong", p: "Modern Studios: 6.5–9M VND ($260–$360); Architect 1BR/Lofts: 9.5–15M VND ($380–$600); 2BR Suites with rooftop pool: 14–23M VND ($550–$900)." },
      { h2: "2. Quietest Lanes Inside the Expat Quarter", p: "Streets An Thuong 20–38 and lanes south of Ngo Thi Si offer peaceful nights just 2 minutes from Hoang Ke Viem's lively cafes." }
    ]
  }),
  makeExtraGuide({
    slug: "kinh-nghiem-ky-gui-cho-thue-can-ho-da-nang-hieu-qua",
    catVi: "DÀNH CHO CHỦ NHÀ",
    catEn: "FOR PROPERTY OWNERS",
    titleVi: "Kinh Nghiệm Ký Gửi Cho Thuê Căn Hộ & Biệt Thự Đà Nẵng Lấp Phòng Nhanh",
    titleEn: "Landlord Guide: How to Rent Out Your Da Nang Property Faster at Top Yield",
    descVi: "5 bí quyết giúp chủ nhà căn hộ, nhà nguyên căn & biệt thự tại Đà Nẵng cho thuê nhanh gấp 3 lần với tệp khách chuyên gia nước ngoài giữ nhà sạch và thanh toán đúng hạn →",
    descEn: "5 proven ways Da Nang property owners attract reliable long-term expat & executive tenants with minimal vacancy →",
    keywords: "ký gửi cho thuê căn hộ Đà Nẵng, cách cho thuê căn hộ Đà Nẵng nhanh, tìm khách nước ngoài thuê nhà Đà Nẵng",
    sectionsVi: [
      { h2: "1. 5 nâng cấp nhỏ giúp tăng giá thuê 15% và chốt khách ngay lần xem đầu", p: "1) Lắp máy giặt sấy kết hợp (khách Tây/Hàn cực kỳ ưu tiên).\n2) Trang bị bàn làm việc rộng + ghế êm.\n3) Ánh sáng đèn vàng ấm 3000K–4000K thay cho đèn tuýp trắng lạnh.\n4) Nệm dày êm kèm rèm cản nắng 2 lớp.\n5) Bộ ảnh chụp thực tế góc chuẩn kiến trúc rõ nét." },
      { h2: "2. Ký gửi miễn phí lên hệ thống 6 ngôn ngữ KIN Estates Đà Nẵng", p: "Bất động sản của anh/chị được biên tập chuyên nghiệp bằng 6 ngôn ngữ (Việt, Anh, Hàn, Trung, Nga, Nhật), đẩy tự động lên Google & AI và tiếp cận trực tiếp tệp khách chuyên gia thuê dài hạn. Liên hệ Zalo/Hotline chủ nhà: 0389 711 601." }
    ],
    sectionsEn: [
      { h2: "1. Five High-ROI Upgrades That Attract Long-Term Expats", p: "Washer-dryer combo, ergonomic work desk, warm 3000K–4000K lighting, quality mattress with blackout curtains, and daylight architectural photography." },
      { h2: "2. List Across 6 Languages on KIN Estates Da Nang", p: "Your residence is marketed in Vietnamese, English, Korean, Chinese, Russian & Japanese to vetted 6–12+ month tenants. Owner hotline/Zalo: +84 389 711 601." }
    ]
  }),
  makeExtraGuide({
    slug: "checklist-ban-giao-nha-thue-da-nang",
    catVi: "BIÊN BẢN BÀN GIAO",
    catEn: "MOVE-IN CHECKLIST",
    titleVi: "Checklist Biên Bản Bàn Giao Căn Hộ & Nhà Thuê Đà Nẵng Chuẩn Nhất",
    titleEn: "Complete Move-In Handover Inventory Checklist for Da Nang Rentals",
    descVi: "Danh mục 12 điểm cần ghi rõ trong Biên bản bàn giao căn hộ, nhà nguyên căn & biệt thự Đà Nẵng ngày nhận chìa khóa để minh bạch 100% giữa chủ nhà và người thuê →",
    descEn: "12-point handover checklist covering meter readings, keycards, appliance serials, and photo documentation on move-in day →",
    keywords: "biên bản bàn giao căn hộ cho thuê, checklist nhận nhà thuê Đà Nẵng, kinh nghiệm nhận bàn giao chung cư thuê",
    sectionsVi: [
      { h2: "1. Ghi nhận chỉ số công tơ, thẻ từ & mật khẩu khóa vân tay", p: "Ghi chính xác số kWh điện, m³ nước thời điểm nhận nhà, số lượng thẻ thang máy, thẻ gửi xe, điều khiển máy lạnh/tivi và đổi mật khẩu khóa cửa điện tử riêng cho khách thuê." },
      { h2: "2. Kiểm tra vận hành thực tế 100% thiết bị điện nước", p: "Bật thử toàn bộ điều hòa 15 phút, bình nóng lạnh, bếp từ, lò vi sóng, máy giặt sấy, xả nước bồn cầu/thoát sàn phòng tắm và kiểm tra ngày vệ sinh máy lạnh gần nhất." }
    ],
    sectionsEn: [
      { h2: "1. Meters, Access Cards & Smart Lock Reset", p: "Log exact kWh electricity and water readings, count elevator/parking cards and remotes, and set a private smart-lock PIN." },
      { h2: "2. Live Appliance & Plumbing Test", p: "Run all A/Cs, water heaters, induction stove, washer-dryer, and drainage checks together with our specialist at handover." }
    ]
  })
];

function findBuildingBySlug(slug) {
  const clean = String(slug || "").trim().toLowerCase();
  return DANANG_SEO_BUILDINGS.find((b) => b.slug === clean) || null;
}

module.exports = {
  DANANG_SEO_BUILDINGS,
  EXTRA_SEO_GUIDES,
  findBuildingBySlug
};
