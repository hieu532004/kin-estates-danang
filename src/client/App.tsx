import React, { useState, useEffect, useRef } from "react";
import { CustomSelect, SelectOption } from "./components/CustomSelect";
import {
  IconMap,
  IconSearch,
  IconMapPin,
  IconArrowUpRight,
  IconCheck,
  IconChevronDown
} from "./components/Icons";

declare const L: any;

export interface Apartment {
  _id: string;
  code: string;
  title: Record<string, string> | string;
  building: string;
  address?: string;
  areaName: string;
  district?: string;
  priceUsd: number;
  priceVnd?: number;
  bedrooms: number | null;
  bathrooms?: number | null;
  sizeM2: number | null;
  floor?: number | null;
  availableFrom?: string | null;
  orientation?: string;
  minLeaseMonths?: number | null;
  depositMonths?: number | null;
  electricityRate?: string | null;
  waterRate?: string | null;
  naturalLightScore?: number;
  remoteWorkSetup?: string | null;
  petPolicy?: string;
  status?: string;
  isVisible?: boolean;
  featured?: boolean;
  locationAccuracy?: "exact" | "area";
  coordinates?: { lat: number; lng: number } | null;
  architecturalNotes?: Record<string, string> | string;
  translations?: Record<string, {
    address?: string;
    orientation?: string;
    electricityRate?: string;
    waterRate?: string;
    petPolicy?: string;
    remoteWorkSetup?: string;
    tags?: string[];
  }>;
  tags?: string[];
  images?: string[];
}

export interface BuildingInfo {
  id: string;
  name: string;
  area: string;
  tier: string;
  unitCount?: number;
  avg1BrUsd: string;
  avg2BrUsd: string;
  avg3BrUsd: string;
  walkToBeach: string;
  amenities: string;
  electricity: string;
  petFriendly: string;
  yearCompleted: number;
  coordinates?: { lat: number; lng: number };
}

export interface NeighborhoodInfo {
  id: string;
  code?: string;
  name: string;
  unitCount?: number;
  subtitle: string;
  beachWalk: string;
  noiseLevel: string;
  remoteWorkScore: string;
  rentRangeUsd: string;
  architecturalCharacter: string;
  morningVibe?: string;
  daytimeVibe?: string;
  eveningVibe?: string;
  considerations?: string;
  onSiteChecklist?: string;
}

type Lang = "vi" | "en" | "zh" | "ru" | "ko" | "ja";
type Currency = "USD" | "VND";
type ApartmentInquiryType = "viewing" | "reservation";
type ApartmentInquiryState = "idle" | "submitting" | "received" | "unavailable" | "error";

const CATALOGUE_REFRESH_MS = 30_000;
const CATALOGUE_REQUEST_TIMEOUT_MS = 12_000;
const CATALOGUE_REFRESH_MIN_GAP_MS = 1_000;
const DANANG_MAP_CENTER: [number, number] = [16.0545, 108.2345];

const DANANG_ADDRESS_LANDMARKS: Array<[RegExp, [number, number]]> = [
  [/panoma|sun\s*cosmo|trần\s*thị\s*lý|tran\s*thi\s*ly|nguyễn\s*văn\s*trỗi/i, [16.0508, 108.2355]],
  [/filmore|bạch\s*đằng|bach\s*dang|bình\s*thuận/i, [16.0614, 108.2238]],
  [/hiyori|võ\s*văn\s*kiệt|vo\s*van\s*kiet/i, [16.0611, 108.2352]],
  [/monarchy|sun\s*ponte|trần\s*hưng\s*đạo|tran\s*hung\s*dao/i, [16.0574, 108.2314]],
  [/azura|indochina|cầu\s*sông\s*hàn/i, [16.0715, 108.2302]],
  [/nam\s*việt\s*á|nam\s*viet\s*a|bùi\s*tá\s*hán|bui\s*ta\s*han|khuê\s*mỹ/i, [16.0348, 108.2415]],
  [/võ\s*nguyên\s*giáp|vo\s*nguyen\s*giap|mỹ\s*khê|my\s*khe|trường\s*sa|phạm\s*văn\s*đồng/i, [16.0628, 108.2462]],
  [/an\s*thượng|an\s*thuong|hoàng\s*kế\s*viêm|châu\s*thị\s*vĩnh\s*tế|nguyễn\s*văn\s*thoại|mỹ\s*an/i, [16.0498, 108.2459]],
  [/sơn\s*trà|son\s*tra|ngô\s*quyền/i, [16.0609, 108.2345]],
  [/hải\s*châu|hai\s*chau|sông\s*hàn|han\s*river/i, [16.0625, 108.2248]]
];

function getExactLocation(apt?: Apartment): [number, number] | undefined {
  if (!apt) return;
  const coordinates = apt.coordinates;
  if (coordinates) {
    const { lat, lng } = coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }
  const haystack = [apt.address, apt.building, apt.areaName, apt.district].filter(Boolean).join(" ");
  for (const [pattern, coords] of DANANG_ADDRESS_LANDMARKS) {
    if (pattern.test(haystack)) return coords;
  }
}

function getAddressSearchUrl(apt: Apartment): string | undefined {
  const locality = apt.areaName?.trim() || apt.district?.trim();
  const address = apt.address?.trim();
  const building = apt.building?.trim();
  const query = address || [building, locality].filter(Boolean).join(", ");
  if (query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function canRequestApartment(apt?: Apartment): boolean {
  return Boolean(apt && apt.isVisible !== false && (!apt.status || apt.status === "Available"));
}

async function readPublicList<T>(response: Response, field: string): Promise<T[]> {
  if (!response.ok) throw new Error(`Unable to load ${field} (${response.status})`);
  const payload = await response.json();
  const list = payload?.[field];
  if (payload?.ok === false || !Array.isArray(list)) throw new Error(`Invalid ${field} response`);
  return list;
}

type ApartmentPhotoProps = Pick<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "className" | "loading" | "style" | "onClick"> & {
  alt: string;
  unavailableText: string;
  fallbackStyle?: React.CSSProperties;
};

function ApartmentPhoto({ src, alt, unavailableText, fallbackStyle, ...imageProps }: ApartmentPhotoProps) {
  const [failedSource, setFailedSource] = useState<string>();
  const source = src?.trim();
  if (source && source !== failedSource) {
    return (
      <img
        {...imageProps}
        key={source}
        src={source}
        alt={alt}
        decoding={imageProps.loading === "lazy" ? "async" : undefined}
        onError={() => setFailedSource(source)}
      />
    );
  }

  return (
    <span
      className={imageProps.className}
      role={alt ? "img" : undefined}
      aria-label={alt ? `${alt}. ${unavailableText}` : undefined}
      aria-hidden={alt ? undefined : true}
      style={{
        display: "grid", placeItems: "center", textAlign: "center", boxSizing: "border-box",
        background: "var(--bg-sand, #E8E3D8)", color: "var(--text-primary, #16191E)",
        fontSize: "0.75rem", padding: "0.35rem", ...fallbackStyle
      }}
    >
      {unavailableText}
    </span>
  );
}

const fillPhotoSlot: React.CSSProperties = { width: "100%", height: "100%" };

const LANGUAGE_LIST: { code: Lang; short: string; label: string; native: string }[] = [
  { code: "vi", short: "VI", label: "Tiếng Việt", native: "Việt Nam" },
  { code: "en", short: "EN", label: "English", native: "International" },
  { code: "zh", short: "ZH", label: "中文 (Chinese)", native: "简体 / 繁體" },
  { code: "ru", short: "RU", label: "Русский", native: "Russian" },
  { code: "ko", short: "KO", label: "한국어", native: "Korean" },
  { code: "ja", short: "JA", label: "日本語", native: "Japanese" }
];

const UI_TEXT: Record<Lang, {
  nav_apartments: string;
  nav_areas: string;
  nav_how: string;
  nav_guides: string;
  nav_about: string;
  btn_find: string;
  hero_eyebrow: string;
  hero_title: string;
  hero_sub: string;
  search_placeholder: string;
  search_btn: string;
}> = {
  vi: {
    nav_apartments: "Căn hộ",
    nav_areas: "Khu vực",
    nav_how: "Cách thuê",
    nav_guides: "Cẩm nang",
    nav_about: "Về chúng tôi",
    btn_find: "Tìm nhà phù hợp",
    hero_eyebrow: "KIẾN TRÚC KHÔNG GIAN SỐNG & CĂN HỘ DÀI HẠN ĐÀ NẴNG",
    hero_title: "Yêu không gian <em>kiến trúc</em> trước. Rồi yêu cả khu phố.",
    hero_sub: "Chúng tôi tuyển chọn căn hộ, penthouse và biệt thự theo ngân sách và nhịp sống của bạn—kiểm định thực tế ánh sáng, độ ồn, bàn làm việc và hỗ trợ trọn gói thủ tục nhận nhà.",
    search_placeholder: "Toà nhà, khu vực (VD: The Panoma, Filmore, Hiyori...)",
    search_btn: "Tìm"
  },
  en: {
    nav_apartments: "Apartments",
    nav_areas: "Areas",
    nav_how: "How to rent",
    nav_guides: "Guides",
    nav_about: "About us",
    btn_find: "Find my home",
    hero_eyebrow: "DA NANG ARCHITECTURAL RESIDENCES & LONG-TERM RENTALS",
    hero_title: "Fall in love with the <em>architecture</em>. Then the neighborhood.",
    hero_sub: "We curate apartments, penthouses, and coastal villas around your lifestyle—physically auditing natural light, acoustic comfort, workspaces, and handling full move-in registration.",
    search_placeholder: "Search building or district (The Panoma, Filmore, Hiyori...)",
    search_btn: "Search"
  },
  zh: {
    nav_apartments: "精选公寓",
    nav_areas: "热门区域",
    nav_how: "租房流程",
    nav_guides: "生活指南",
    nav_about: "关于我们",
    btn_find: "定制房源",
    hero_eyebrow: "岘港高端建筑公寓与长期别墅租赁 (3–12个月以上)",
    hero_title: "先爱上<em>建筑空间</em>，再爱上整个街区。",
    hero_sub: "我们根据您的预算与生活方式精选岘港河景与海景公寓，实地检测采光、隔音、办公桌与国家电网电价，协助办理暂住登记。",
    search_placeholder: "搜索大楼或区域 (The Panoma, Filmore, Hiyori...)",
    search_btn: "搜索"
  },
  ru: {
    nav_apartments: "Квартиры",
    nav_areas: "Районы",
    nav_how: "Как снять",
    nav_guides: "Гиды",
    nav_about: "О нас",
    btn_find: "Подобрать",
    hero_eyebrow: "АРХИТЕКТУРНЫЕ РЕЗИДЕНЦИИ И ДОЛГОСРОЧНАЯ АРЕНДА В ДАНАНГЕ",
    hero_title: "Полюбите <em>архитектуру</em> дома. А затем и весь район.",
    hero_sub: "Мы подбираем апартаменты, пентхаусы и виллы под ваш бюджет и ритм жизни — лично проверяем свет, тишину, рабочее место и оформляем регистрацию.",
    search_placeholder: "Здание или район (The Panoma, Filmore, Hiyori...)",
    search_btn: "Найти"
  },
  ko: {
    nav_apartments: "아파트",
    nav_areas: "지역 가이드",
    nav_how: "임대 절차",
    nav_guides: "가이드",
    nav_about: "회사 소개",
    btn_find: "맞춤 집 찾기",
    hero_eyebrow: "다낭 프리미엄 건축 레지던스 및 장기 임대 (3~12개월+)",
    hero_title: "먼저 <em>공간</em>과 사랑에 빠지고, 동네를 사랑하게 됩니다.",
    hero_sub: "예산과 라이프스타일에 맞춘 다낭 한강뷰·미케비치 아파트 및 풀빌라 큐레이션. 채광, 방음, 업무 공간 실사 및 거주 등록을 완벽 지원합니다.",
    search_placeholder: "건물명 또는 지역 검색 (The Panoma, Filmore, Hiyori...)",
    search_btn: "검색"
  },
  ja: {
    nav_apartments: "物件一覧",
    nav_areas: "エリア",
    nav_how: "賃貸の流れ",
    nav_guides: "ガイド",
    nav_about: "私たちについて",
    btn_find: "お部屋探し",
    hero_eyebrow: "ダナン建築レジデンス＆長期賃貸アパートメント",
    hero_title: "まず<em>建築空間</em>を愛し、そして街を愛する。",
    hero_sub: "ご予算とライフスタイルに合わせてダナンの高級アパート・ヴィラを厳選。自然光、防音、ワークデスクを現地確認し、滞在登録までサポートします。",
    search_placeholder: "建物名・エリアで検索 (The Panoma, Filmore, Hiyori...)",
    search_btn: "検索"
  }
};

const AREA_IMAGES = [
  "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=85",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85"
];

interface GuideItem {
  id: string;
  cat: Record<Lang, string>;
  title: Record<Lang, string>;
  summary: Record<Lang, string>;
  content: Record<Lang, string>;
}

const GUIDES_DATA: GuideItem[] = [
  {
    id: "guide-01",
    cat: {
      vi: "CHỈ SỐ GIÁ THUÊ 2026",
      en: "2026 RENTAL PRICE INDEX",
      zh: "2026 租金价格指数",
      ru: "ИНДЕКС ЦЕН 2026",
      ko: "2026 임대료 지수",
      ja: "2026年 家賃インデックス"
    },
    title: {
      vi: "Chỉ số giá thuê căn hộ Đà Nẵng 2026: Phân tích chi tiết từng tòa nhà",
      en: "2026 Da Nang Apartment Rental Price Index: Building-by-Building Breakdown",
      zh: "2026 岘港公寓租金指数：核心大楼逐一深度解析",
      ru: "Индекс цен на аренду в Дананге 2026: разбор по жилым комплексам",
      ko: "2026 다낭 아파트 임대료 지수: 주요 타워별 상세 분석",
      ja: "2026年ダナン賃貸マンション価格指数：主要ビル別徹底比較"
    },
    summary: {
      vi: "Tổng hợp mức giá thuê thực tế và giá trung vị (1PN, 2PN, 3PN) tại The Panoma, The Filmore, Hiyori Garden Tower, The Monarchy và khu An Thượng.",
      en: "Verified monthly rent ranges and medians (1BR, 2BR, 3BR) across The Panoma, The Filmore, Hiyori Garden Tower, The Monarchy, and An Thuong.",
      zh: "汇总 The Panoma、The Filmore、Hiyori Garden Tower、The Monarchy 与安上区的 1–3 居室真实月租区间与中位数。",
      ru: "Проверенные диапазоны и медианные цены (1–3 спальни) в The Panoma, The Filmore, Hiyori Garden Tower, The Monarchy и Ан Тхыонг.",
      ko: "더 파노마, 더 필모어, 히요리 가든 타워, 더 모나키 및 안트엉 지역의 1~3베드룸 실제 월세 범위와 중간값.",
      ja: "The Panoma、The Filmore、Hiyori、The Monarchy、アントゥオン地区の1〜3LDK実勢家賃と中央値まとめ。"
    },
    content: {
      vi: `Thị trường căn hộ dài hạn tại Đà Nẵng (hợp đồng từ 3–12 tháng) năm 2026 phân hóa rõ rệt thành 3 nhóm tòa nhà chính:\n\n1. Nhóm Luxury Bờ Sông & Mới Bàn Giao (The Filmore, The Panoma Sun Cosmo): Mức giá 1PN từ $654–$1,100/tháng; 2PN từ $885–$1,650/tháng. Ưu điểm lớn nhất là hệ kính Low-E cách âm tuyệt đối, hồ bơi vô cực và điện nước tính theo giá nhà nước EVN.\n\n2. Nhóm Tiêu Chuẩn Quốc Tế Sơn Trà (Hiyori Garden Tower, Azura, The Monarchy): Mức giá 2PN dao động từ $731–$1,050/tháng. Hiyori nổi bật với quản lý Nhật Bản, còn The Monarchy thân thiện với thú cưng và có khuôn viên nội khu rộng.\n\n3. Nhóm Căn Hộ Dịch Vụ Thiết Kế Khu An Thượng: Giá từ $500–$850/tháng, đi bộ ra biển Mỹ Khê chỉ 3–5 phút, thường bao gồm miễn phí dọn phòng 1 lần/tuần và Wi-Fi riêng.`,
      en: `The 2026 long-term rental market in Da Nang (3–12+ month leases) is structured into three distinct residential tiers:\n\n1. Newly Delivered Riverfront Luxury (The Filmore, The Panoma Sun Cosmo): 1BR units range from $654–$1,100/month; 2BR units range from $885–$1,650/month. Key highlights include triple-glazed Low-E acoustic glass, heated rooftop infinity pools, and official state EVN utility billing.\n\n2. International Standard Towers in Son Tra (Hiyori Garden Tower, Azura, The Monarchy): 2BR apartments range from $731–$1,050/month. Hiyori is renowned for Japanese management, while The Monarchy offers pet-friendly policies and landscaped courtyards.\n\n3. Boutique Architect Lofts in An Thuong: Ranging from $500–$850/month within a 3–5 minute walk to My Khe Beach, typically including weekly housekeeping and dedicated fiber Wi-Fi.`,
      zh: `2026年岘港长期公寓租赁市场（3–12个月以上合同）清晰分为三大主力阵营：\n\n1. 全新交付江景奢华公寓（The Filmore、The Panoma Sun Cosmo）：1居室月租 $654–$1,100；2居室月租 $885–$1,650。最大优势在于双层 Low-E 隔音隔热玻璃、屋顶无边泳池以及按越南国家电网 EVN 标准计费。\n\n2. 山茶郡国际标准公寓楼（Hiyori Garden Tower、Azura、The Monarchy）：2居室月租 $731–$1,050。Hiyori 以纯正日式物业管理著称，The Monarchy 则支持饲养宠物且社区绿化极佳。\n\n3. 安上街区精品设计师公寓：月租 $500–$850，步行 3–5 分钟即达美溪海滩，通常包含每周免费保洁与独立光纤 Wi-Fi。`,
      ru: `Рынок долгосрочной аренды в Дананге в 2026 году (договоры от 3 до 12+ месяцев) делится на 3 основные категории:\n\n1. Новые люксовые комплексы у реки (The Filmore, The Panoma Sun Cosmo): 1 спальня — $654–$1,100/мес; 2 спальни — $885–$1,650/мес. Главные плюсы: шумоизоляционные окна Low-E, панорамный бассейн и государственные тарифы EVN.\n\n2. Комплексы международного стандарта в Шонча (Hiyori Garden Tower, Azura, The Monarchy): 2 спальни стоят $731–$1,050/мес. Hiyori славится японским управлением, а в The Monarchy разрешено проживание с питомцами.\n\n3. Бутик-лофты в районе Ан Тхыонг: $500–$850/мес в 3–5 минутах ходьбы от пляжа Ми Кхе, включая еженедельную уборку и быстрый Wi-Fi.`,
      ko: `2026년 다낭 장기 임대 시장(3~12개월 이상 계약)은 크게 3가지 그룹으로 나뉩니다:\n\n1. 신축 한강뷰 하이엔드 타워 (더 필모어, 더 파노마 선 코스모): 1베드룸 월 $654~$1,100, 2베드룸 월 $885~$1,650 수준입니다. Low-E 방음 유리, 인피니티 풀, 국가 표준 EVN 전기요금이 적용됩니다.\n\n2. 선짜 지역 국제 표준 콘도 (히요리 가든 타워, 아주라, 더 모나키): 2베드룸 월 $731~$1,050 수준입니다. 히요리는 일본식 관리로 유명하며, 더 모나키는 반려동물 동반이 가능합니다.\n\n3. 안트엉 부티크 레지던스: 월 $500~$850 수준으로 미케비치까지 도보 3~5분 거리이며, 주 1회 무료 청소와 전용 Wi-Fi가 포함됩니다.`,
      ja: `2026年のダナン長期賃貸市場（3〜12ヶ月以上の契約）は主に3つのカテゴリーに分かれています：\n\n1. 新築リバーフロント高級レジデンス（The Filmore、The Panoma）：1LDKは月額$654〜$1,100、2LDKは$885〜$1,650。Low-E防音ガラス、インフィニティプール、国営EVN標準電気料金が魅力です。\n\n2. ソンチャ地区の国際基準タワー（Hiyori Garden Tower、Azura、The Monarchy）：2LDKは月額$731〜$1,050。Hiyoriは日系管理で安心感が高く、The Monarchyはペット飼育が可能です。\n\n3. アントゥオン地区のデザイナーズアパート：月額$500〜$850。ミーケービーチまで徒歩3〜5分で、週1回の清掃と専用Wi-Fiが含まれます。`
    }
  },
  {
    id: "guide-02",
    cat: {
      vi: "PHÁP LÝ & VISA",
      en: "LEGAL & VISA",
      zh: "法律与暂住登记",
      ru: "РЕГИСТРАЦИЯ И ВИЗЫ",
      ko: "법률 & 비자 등록",
      ja: "法務・滞在登録"
    },
    title: {
      vi: "Khai báo tạm trú (Form NA17) & Thẻ tạm trú (TRC) cho người nước ngoài",
      en: "Temporary Residence Registration (Form NA17) & Visa Rules for Foreigners",
      zh: "外国人暂住登记（NA17表）与暂住证（TRC）办理指南",
      ru: "Регистрация временного проживания (форма NA17) и визовые правила",
      ko: "외국인 임시 거주 등록(Form NA17) 및 거주증(TRC) 발급 안내",
      ja: "外国人の一時滞在登録（Form NA17）とビザ・滞在許可証ガイド"
    },
    summary: {
      vi: "Ai có trách nhiệm khai báo tạm trú? Thủ tục xin giấy xác nhận dấu đỏ công an phường để gia hạn Visa và mở tài khoản ngân hàng.",
      en: "How mandatory ward police registration works in Da Nang and how we secure your red-stamped Form NA17 for visa renewals.",
      zh: "谁负责办理暂住登记？如何获取派出所红章确认单（NA17表）以用于签证延期与银行开户。",
      ru: "Как работает обязательная регистрация в полиции Дананга и получение формы NA17 с красной печатью.",
      ko: "다낭 관할 공안 거주 등록 절차와 비자 연장·은행 계좌 개설을 위한 NA17 직인 확인서 발급 방법.",
      ja: "ダナンでの警察滞在登録の仕組みと、ビザ延長・銀行口座開設に必要な赤印付きNA17フォームの取得方法。"
    },
    content: {
      vi: `Theo quy định tại Việt Nam, mọi công dân nước ngoài thuê căn hộ dài hạn phải được chủ nhà đăng ký tạm trú trực tuyến hoặc trực tiếp với Công an Phường trong vòng 24 giờ kể từ khi nhận phòng.\n\n• Điều kiện bắt buộc: Căn hộ phải có Sổ hồng/Hợp đồng mua bán hợp pháp và chủ nhà đã đăng ký mã số thuế cho thuê.\n• Khi bạn cần gia hạn E-Visa, xin Thẻ tạm trú (TRC) hoặc mở tài khoản ngân hàng Việt Nam: Bạn sẽ cần bản giấy Mẫu NA17 có đóng dấu đỏ của Công an Phường. Đội ngũ KIN Estates trực tiếp chuẩn bị hồ sơ và hỗ trợ chủ nhà hoàn tất thủ tục này miễn phí cho khách thuê.`,
      en: `Under Vietnamese regulations, every foreign national leasing a long-term residence must be registered by the property owner with the local Ward Police within 24 hours of check-in.\n\n• Legal Requirement: The apartment must hold a valid ownership certificate and rental tax registration.\n• For Visa Extensions, TRC Applications, or Local Bank Accounts: You will need a physical paper copy of Form NA17 bearing the official red stamp of the Ward Police. Our KIN Estates team prepares all paperwork and coordinates this registration free of charge for our tenants.`,
      zh: `根据越南法律规定，所有长期租房的外国公民必须在入住后 24 小时内由房东向当地派出所完成线上或线下暂住登记。\n\n• 必备条件：公寓必须具备合法产权证明及租赁税务登记。\n• 办理签证延期、暂住证（TRC）或越南银行开户：您需要盖有派出所红章的纸质《NA17暂住确认表》。KIN Estates 团队全程免费为您和房东准备材料并办妥此项手续。`,
      ru: `По законам Вьетнама каждый иностранный арендатор должен быть зарегистрирован собственником в районной полиции в течение 24 часов после заселения.\n\n• Обязательное условие: квартира должна иметь легальные документы собственности и налоговый номер.\n• Для продления визы, оформления ВНЖ (TRC) или открытия счета в банке требуется бумажная форма NA17 с красной печатью полиции. Команда KIN Estates бесплатно оформляет этот документ для наших клиентов.`,
      ko: `베트남 규정에 따라 장기 임대 아파트에 입주하는 모든 외국인은 입주 후 24시간 이내에 집주인을 통해 관할 공안에 임시 거주 등록을 해야 합니다.\n\n• 필수 요건: 해당 아파트의 합법적인 소유권 증서 및 임대 세금 등록이 완료되어 있어야 합니다.\n• 비자 연장, 거주증(TRC) 발급 및 베트남 은행 계좌 개설 시 관할 공안의 직인이 찍힌 NA17 양식 원본이 필요합니다. KIN Estates 팀이 모든 서류 절차를 무료로 대행해 드립니다.`,
      ja: `ベトナムの法令により、長期賃貸に入居するすべての外国人は、入居後24時間以内にオーナーを通じて管轄警察へ一時滞在登録を行う必要があります。\n\n• 必須条件：物件が適法な所有権証書と賃貸税務登録を持っていること。\n• ビザ延長、TRC申請、現地銀行口座の開設には、警察の赤印が押された「Form NA17」原本が必要です。KIN Estatesが無料で手続きを代行・サポートします。`
    }
  },
  {
    id: "guide-03",
    cat: {
      vi: "KIỂM ĐỊNH THỰC TẾ",
      en: "ON-SITE INSPECTION",
      zh: "实地核验标准",
      ru: "ПРОВЕРКА КВАРТИРЫ",
      ko: "현장 실사 체크리스트",
      ja: "現地インスペクション"
    },
    title: {
      vi: "24 điều bắt buộc phải kiểm tra khi đi xem căn hộ tại Đà Nẵng",
      en: "The 24-Point On-Site Inspection Checklist Before Signing a Lease",
      zh: "在岘港签约租房前必查的 24 项实地检测清单",
      ru: "24 пункта проверки квартиры в Дананге перед подписанием договора",
      ko: "다낭 아파트 계약 전 반드시 확인해야 할 24가지 현장 체크리스트",
      ja: "ダナンで賃貸契約を結ぶ前に確認すべき24の現地チェック項目"
    },
    summary: {
      vi: "Từ hướng nắng chiều hướng Tây, độ kín gió mùa mưa bão tháng 10 đến kiểm tra tiếng ồn xây dựng và tốc độ mạng cáp quang.",
      en: "From afternoon West sun and October monsoon waterproofing to acoustic radar and fiber internet latency checks.",
      zh: "从西晒隔热、10月雨季门窗防水密封，到周边施工噪音排查与光纤网络延迟实测。",
      ru: "От западного солнца и герметичности окон в сезон дождей до проверки шума стройки и скорости интернета.",
      ko: "오후 서향 채광, 10월 우기 창문 방수 밀폐력부터 주변 공사 소음 및 광랜 인터넷 속도 측정까지.",
      ja: "西日対策や10月雨季の窓枠防水から、周辺工事の騒音チェック、光回線速度の実測まで。"
    },
    content: {
      vi: `Một căn hộ nhìn rất đẹp trên ảnh vẫn có thể gây bất tiện khi ở thực tế nếu bỏ qua 5 yếu tố sau:\n\n1. Tiếng ồn xây dựng xung quanh: Đà Nẵng phát triển nhanh, vì vậy chúng tôi luôn kiểm tra các lô đất trống kế bên trước khi dẫn khách xem.\n2. Hướng nắng và độ thoáng khí: Căn hướng Đông hoặc Đông Nam đón nắng sáng dịu nhẹ và gió biển mát; căn hướng chính Tây cần có kính Low-E và rèm Blackout 2 lớp.\n3. Độ kín khung cửa mùa mưa bão (Tháng 10–12): Kiểm tra gioăng cao su cửa ban công và hệ thống thoát nước lô gia.\n4. Đơn giá điện nước: Luôn xác nhận rõ điện tính theo biểu giá nhà nước EVN (~2,800đ/kWh) hay giá cố định (3,800–4,000đ/kWh).\n5. Bàn làm việc & Router Wi-Fi riêng: Đảm bảo tốc độ tối thiểu 150–300Mbps ngay tại bàn làm việc.`,
      en: `An apartment that looks stunning in photos can still feel uncomfortable day-to-day if you overlook these 5 critical factors:\n\n1. Adjacent Construction Noise: Da Nang grows rapidly, so we inspect neighboring empty plots before scheduling any viewing.\n2. Sun Orientation & Airflow: East and Southeast balconies enjoy gentle morning sun and ocean breeze; West-facing units require Low-E thermal glass and dual blackout curtains.\n3. Monsoon Window Seals (Oct–Dec): We inspect rubber gaskets and balcony floor drains for complete storm waterproofing.\n4. Utility Billing Transparency: Always confirm whether electricity is billed at official state EVN meter rates (~2,800 VND/kWh) or a flat landlord rate.\n5. Ergonomic Desk & Dedicated Fiber Router: Verifying 150–300Mbps speeds directly at your workspace.`,
      zh: `照片上看起来很美的公寓，如果忽略以下 5 个关键因素，实际居住仍可能遇到不便：\n\n1. 周边施工噪音：岘港建设发展快，我们在带看前必查相邻空地是否有在建工程。\n2. 朝向与通风：东向或东南向阳台享受柔和晨光与凉爽海风；正西向户型则必须配备 Low-E 隔热玻璃与双层遮光窗帘。\n3. 雨季门窗密封性（10–12月）：检查阳台胶条与地漏排水系统，确保台风季滴水不漏。\n4. 水电费计价标准：明确电费按越南国家电网 EVN 标准（约 2,800越盾/度）还是固定单价收取。\n5. 办公桌与独立光纤路由：确保办公桌位置实测网速达到 150–300Mbps。`,
      ru: `Даже красивая на фото квартира может оказаться неудобной без проверки 5 важных деталей:\n\n1. Шум от соседних строек: мы заранее проверяем пустующие участки рядом с домом.\n2. Сторона света: Восток и Юго-Восток дарят утреннее солнце и морской бриз; для Запада необходимы стекла Low-E и плотные шторы блэкаут.\n3. Герметичность окон в сезон дождей (октябрь–декабрь): проверка уплотнителей и дренажа балкона.\n4. Тарифы на электроэнергию: государственный счетчик EVN (~2,800 донгов/кВт·ч) или фиксированный тариф.\n5. Рабочий стол и личный роутер: замер скорости Wi-Fi (150–300 Мбит/с) прямо на рабочем месте.`,
      ko: `사진으로 완벽해 보이는 아파트라도 다음 5가지 요소를 놓치면 실거주 시 불편할 수 있습니다:\n\n1. 주변 공사 소음: 다낭은 개발이 활발하므로 투어 전 인접 부지의 공사 여부를 먼저 확인합니다.\n2. 방향 및 통풍: 동향·남동향은 아침 햇살과 바닷바람이 시원하며, 서향은 Low-E 단열 유리와 2중 암막 커튼이 필수입니다.\n3. 우기 창호 밀폐력 (10~12월): 발코니 고무 패킹과 배수 상태를 철저히 점검합니다.\n4. 전기·수도 요금 기준: 국가 표준 EVN 요금(~2,800동/kWh)인지 고정 단가인지 명확히 확인합니다.\n5. 업무용 데스크 및 전용 공유기: 책상 위치에서 최소 150~300Mbps 속도를 보장합니다.`,
      ja: `写真では美しく見えるお部屋でも、以下の5つのポイントを見落とすと実際の暮らしで不便を感じることがあります：\n\n1. 周辺の工事騒音：ダナンは開発が進んでいるため、内覧前に隣接地の工事有無を必ず確認します。\n2. 方角と風通し：東・南東向きは朝日と海風が心地よく、西向きにはLow-E遮熱ガラスと二重遮光カーテンが必須です。\n3. 雨季の窓枠防水（10〜12月）：バルコニーのゴムパッキンと排水設備を点検します。\n4. 電気料金の単価：国営EVNメーター料金（約2,800VND/kWh）か固定単価かを明確にします。\n5. ワークデスクと専用Wi-Fiルーター：デスク位置で150〜300Mbpsの通信速度を実測します。`
    }
  },
  {
    id: "guide-04",
    cat: {
      vi: "BẢO VỆ TIỀN CỌC",
      en: "DEPOSIT PROTECTION",
      zh: "押金安全保障",
      ru: "ЗАЩИТА ДЕПОЗИТА",
      ko: "보증금 100% 보호",
      ja: "敷金返還保証"
    },
    title: {
      vi: "Lấy lại 100% tiền cọc thuê nhà ở Đà Nẵng: Luật nói gì và cách tránh tranh chấp",
      en: "Protecting Your Security Deposit in Da Nang: Bilingual Contract Clauses",
      zh: "在岘港 100% 拿回租房押金：双语合同条款与交房清单指南",
      ru: "Как вернуть 100% залога при аренде в Дананге: защита в договоре",
      ko: "다낭 임대 보증금 100% 돌려받기: 이중언어 계약 조항 및 분쟁 예방",
      ja: "ダナンで敷金を100%返還してもらう方法：バイリンガル契約条項と対策"
    },
    summary: {
      vi: "Cách lập biên bản bàn giao bằng hình ảnh/video, điều khoản hao mòn tự nhiên và thời hạn hoàn trả tiền cọc trong hợp đồng song ngữ.",
      en: "How photo handover inventories and natural wear-and-tear clauses guarantee 100% deposit refunds.",
      zh: "如何通过图文交房核验单、自然损耗免责条款及明确退押期限，确保 100% 退还押金。",
      ru: "Как фото-опись имущества и пункт о естественном износе гарантируют полный возврат депозита.",
      ko: "입주 시 사진·영상 체크리스트 작성, 자연 마모 면책 조항 및 명확한 반환 기한 설정 방법.",
      ja: "写真付き入居時インベントリ、通常損耗（自然劣化）条項、返還期限の明記による敷金保護。"
    },
    content: {
      vi: `Để đảm bảo nhận lại 100% tiền đặt cọc khi kết thúc hợp đồng thuê, quy trình của KIN Estates luôn áp dụng 3 lớp bảo vệ:\n\n1. Biên bản bàn giao kèm ảnh & video ngày nhận nhà (Check-in Inventory): Ghi nhận chi tiết tình trạng hiện tại của sofa, đệm, tường, điều hòa và chỉ số công tơ điện nước.\n2. Điều khoản Hao mòn tự nhiên (Fair Wear & Tear): Ghi rõ trong hợp đồng song ngữ Việt – Anh rằng khách thuê không phải bồi thường cho các hao mòn tự nhiên theo thời gian.\n3. Thời hạn hoàn cọc rõ ràng: Chủ nhà hoàn trả tiền cọc ngay trong vòng 3–5 ngày làm việc sau khi bàn giao chìa khóa và thanh toán hóa đơn điện nước kỳ cuối.`,
      en: `To guarantee a 100% security deposit refund at the end of your lease, KIN Estates enforces a 3-layer protection protocol:\n\n1. Photo & Video Check-In Inventory: Documenting the exact condition of sofas, mattresses, walls, A/C units, and utility meter readings on move-in day.\n2. Fair Wear & Tear Clause: Explicitly written into our bilingual lease so tenants are never charged for normal aging of appliances or paint.\n3. Strict Refund Timeline: Binding the landlord to return the full security deposit within 3–5 business days after key handover and final utility settlement.`,
      zh: `为确保租约到期时 100% 拿回押金，KIN Estates 严格执行三层保障机制：\n\n1. 入住当日图文与视频交接清单（Check-in Inventory）：详细记录沙发、床垫、墙面、空调现状及水电表读数。\n2. 自然损耗免责条款（Fair Wear & Tear）：在双语合同中明确规定租客无需承担正常使用产生的自然折旧。\n3. 明确退押期限：合同约定交还钥匙并结清最后一期水电费后 3–5 个工作日内全额退还押金。`,
      ru: `Чтобы гарантировать 100% возврат депозита по окончании аренды, KIN Estates использует 3 уровня защиты:\n\n1. Фото- и видео-акт приема-передачи при заезде: фиксация состояния мебели, стен, техники и показаний счетчиков.\n2. Пункт о естественном износе (Fair Wear & Tear): арендатор не платит за естественную амортизацию вещей.\n3. Четкий срок возврата: собственник обязан вернуть депозит в течение 3–5 рабочих дней после сдачи ключей.`,
      ko: `계약 종료 시 보증금을 100% 안전하게 돌려받을 수 있도록 KIN Estates는 3중 보호 절차를 적용합니다:\n\n1. 입주 당일 사진·영상 인수인계서(Check-in Inventory): 소파, 매트리스, 벽면, 에어컨 상태와 계량기 수치를 꼼꼼히 기록합니다.\n2. 자연 마모(Fair Wear & Tear) 면책 조항: 일상적인 사용으로 인한 자연 노후화에 대해 임차인이 배상하지 않도록 계약서에 명시합니다.\n3. 명확한 반환 기한: 열쇠 반납 및 공과금 정산 후 3~5영업일 이내에 보증금을 전액 반환하도록 규정합니다.`,
      ja: `退去時に敷金が100%返還されるよう、KIN Estatesでは3つの保護プロトコルを徹底しています：\n\n1. 入居時の写真・動画インベントリ：ソファ、マットレス、壁、エアコンの状態とメーター数値を記録します。\n2. 通常損耗（Fair Wear & Tear）免責条項：経年劣化や通常の使用による摩耗について借主が負担しない旨を契約書に明記します。\n3. 明確な返還期限：鍵の返却と最終光熱費の精算後、3〜5営業日以内に全額返還することを義務付けています。`
    }
  },
  {
    id: "guide-05",
    cat: {
      vi: "CHI PHÍ SINH HOẠT",
      en: "COST OF LIVING",
      zh: "每月生活成本",
      ru: "СТОИМОСТЬ ЖИЗНИ",
      ko: "다낭 한 달 생활비",
      ja: "ダナンの生活費"
    },
    title: {
      vi: "Chi phí sinh hoạt ở Đà Nẵng năm 2026: Một tháng hết bao nhiêu?",
      en: "Cost of Living in Da Nang 2026: Monthly Breakdown for Expats & Couples",
      zh: "2026 岘港生活成本详解：单身与情侣每月开销需要多少？",
      ru: "Стоимость жизни в Дананге 2026: бюджет на месяц для экспатов и пар",
      ko: "2026 다낭 생활비 총정리: 1인 및 커플 기준 한 달 예산은 얼마일까?",
      ja: "2026年ダナン生活費シミュレーション：単身・カップルの月額予算内訳"
    },
    summary: {
      vi: "Bảng tính chi tiết tiền thuê nhà, điện nước EVN, ăn uống, phòng gym, coworking và trường quốc tế tại Đà Nẵng.",
      en: "Realistic monthly budgets covering rent, EVN utilities, dining, gyms, coworking spaces, and international schools.",
      zh: "涵盖房租、EVN 水电费、餐饮咖啡、健身房、共享办公及国际学校的真实月度预算表。",
      ru: "Реальный расчет расходов на аренду, коммуналку EVN, кафе, спортзалы и коворкинги в Дананге.",
      ko: "임대료, EVN 전기·수도 요금, 식비, 피트니스, 코워킹 스페이스 및 국제학교 비용 상세 내역.",
      ja: "家賃、EVN光熱費、食事・カフェ、ジム、コワーキング、インターナショナルスクールまでの月額目安。"
    },
    content: {
      vi: `Chi phí trung bình hàng tháng tại Đà Nẵng cho chuyên gia quốc tế (chưa tính tiền thuê căn hộ):\n\n• Tiền điện (EVN), nước & Internet cáp quang: $45 – $85 / tháng (bật điều hòa 8–10 tiếng/ngày).\n• Ăn uống & Cà phê: $300 – $550 / tháng.\n• Phòng Gym / Yoga / Bơi lội & Coworking: $40 – $90 / tháng.\n• Thuê xe máy (Honda AirBlade / PCX) hoặc di chuyển Grab: $50 – $80 / tháng.\n\nTổng cộng: Chỉ với khoảng $1,100 – $1,800/tháng (đã bao gồm một căn hộ 1–2 phòng ngủ cao cấp), bạn đã có chất lượng sống chuẩn nghỉ dưỡng ven biển.`,
      en: `Average monthly living expenses in Da Nang for international residents (excluding apartment rent):\n\n• State EVN Electricity, Water & Fiber Internet: $45 – $85 / month (running A/C 8–10 hours daily).\n• Dining, Groceries & Specialty Coffee: $300 – $550 / month.\n• Fitness / Yoga / Swimming & Coworking: $40 – $90 / month.\n• Scooter Rental (Honda AirBlade / PCX) or Grab Rides: $50 – $80 / month.\n\nTotal Benchmark: With $1,100 – $1,800/month in total (including a luxury 1–2BR apartment), you enjoy a resort-grade coastal lifestyle.`,
      zh: `在岘港生活的国际人士每月平均开销（不含房租）：\n\n• 国家电网 EVN 电费、水费与光纤网络：$45 – $85 / 月（每天开启空调 8–10 小时）。\n• 餐饮、超市采购与精品咖啡：$300 – $550 / 月。\n• 健身房 / 瑜伽 / 游泳与共享办公：$40 – $90 / 月。\n• 摩托车租赁（本田 AirBlade / PCX）或 Grab 打车：$50 – $80 / 月。\n\n总计参考：每月仅需约 $1,100 – $1,800（含一套高品质 1–2 居室公寓），即可享受海滨度假级生活品质。`,
      ru: `Средние ежемесячные расходы в Дананге (без учета аренды квартиры):\n\n• Электричество (EVN), вода и оптоволоконный интернет: $45 – $85 / мес (с кондиционером 8–10 ч/день).\n• Питание, продукты и кофейни: $300 – $550 / мес.\n• Фитнес / Йога / Бассейн и коворкинг: $40 – $90 / мес.\n• Аренда байка (Honda AirBlade / PCX) или такси Grab: $50 – $80 / мес.\n\nИтого: при бюджете $1,100 – $1,800/мес (включая премиальную квартиру с 1–2 спальнями) вы получаете курортный уровень жизни у океана.`,
      ko: `다낭 거주 외국인 전문가 기준 월평균 생활비 (임대료 제외):\n\n• 전기(EVN), 수도 및 광랜 인터넷: 월 $45 ~ $85 (하루 에어컨 8~10시간 가동 기준).\n• 식비 및 스페셜티 카페: 월 $300 ~ $550.\n• 헬스장 / 요가 / 수영 및 코워킹 스페이스: 월 $40 ~ $90.\n• 오토바이 렌트(혼다 에어블레이드/PCX) 또는 그랩(Grab) 이동: 월 $50 ~ $80.\n\n총합: 고급 1~2베드룸 아파트 임대료를 포함해 월 $1,100 ~ $1,800 수준이면 휴양지급 해변 라이프를 누릴 수 있습니다.`,
      ja: `ダナン滞在中の月額生活費の目安（家賃を除く）：\n\n• 電気代（EVN）・水道・光インターネット：月額 $45 〜 $85（エアコン1日8〜10時間使用）。\n• 食事・食材・カフェ：月額 $300 〜 $550。\n• ジム・ヨガ・コワーキングスペース：月額 $40 〜 $90。\n• バイクレンタル（AirBlade / PCX）またはGrab移動：月額 $50 〜 $80。\n\n合計目安：高級1〜2LDKの家賃を含めても月額 $1,100 〜 $1,800 でリゾート品質の海辺ライフが叶います。`
    }
  },
  {
    id: "guide-06",
    cat: {
      vi: "GIA ĐÌNH & TRƯỜNG HỌC",
      en: "FAMILIES & SCHOOLS",
      zh: "家庭与国际学校",
      ru: "СЕМЬЯ И ШКОЛЫ",
      ko: "가족 & 국제학교",
      ja: "ご家族・インター校"
    },
    title: {
      vi: "Đà Nẵng cho gia đình có con: Trường quốc tế, bệnh viện quốc tế và khu ở",
      en: "Da Nang for Expat Families: International Schools, Healthcare & Safe Compounds",
      zh: "带孩子定居岘港：国际学校、国际医院与宜居社区全指南",
      ru: "Дананг для семей с детьми: международные школы, клиники и жилые комплексы",
      ko: "자녀 동반 다낭 이주 가이드: 국제학교, 국제병원 및 가족 친화형 단지",
      ja: "お子様連れのダナン移住：インターナショナルスクール・国際病院・安心な住環境"
    },
    summary: {
      vi: "So sánh trường St. Nicholas, Singapore International School (SIS), bệnh viện Vinmec / Gia Đình và các khu căn hộ phù hợp cho trẻ nhỏ.",
      en: "Complete guide to St. Nicholas, Singapore International School (SIS), Vinmec / Family Hospital, and family-friendly towers.",
      zh: "对比圣尼古拉斯学校、新加坡国际学校（SIS）、Vinmec / 家庭国际医院及适合儿童居住的公寓社区。",
      ru: "Сравнение школ St. Nicholas и SIS, госпиталей Vinmec / Family Hospital и лучших комплексов для семей.",
      ko: "세인트 니콜라스, 싱가포르 국제학교(SIS), 빈멕/패밀리 국제병원 및 아이 키우기 좋은 아파트 비교.",
      ja: "セント・ニコラス校、シンガポール国際学校（SIS）、Vinmec病院、ファミリー向けマンションの比較。"
    },
    content: {
      vi: `Các gia đình chuyên gia nước ngoài chuyển đến Đà Nẵng thường ưu tiên 3 khu vực:\n\n1. Khu Ngũ Hành Sơn & Nam Việt Á (The Panoma / Biệt thự sân vườn): Gần trường quốc tế Singapore (SIS) và không gian yên tĩnh, an toàn.\n2. Khu Sơn Trà (Hiyori Garden Tower / The Monarchy): Có công viên nội khu, hồ bơi trẻ em và siêu thị ngay tầng trệt.\n3. Khu Hải Châu (The Filmore / Azura): Cách Bệnh viện Quốc tế Vinmec, Bệnh viện Gia Đình (Family Hospital) và Trường Quốc tế St. Nicholas chỉ 5–10 phút di chuyển.`,
      en: `Expat families relocating to Da Nang typically prioritize three residential zones:\n\n1. Ngu Hanh Son & Nam Viet A (The Panoma / Private Garden Villas): Close to Singapore International School (SIS) with quiet, tree-lined streets.\n2. Son Tra Peninsula (Hiyori Garden Tower / The Monarchy): Features internal parks, kids' swimming pools, and ground-floor supermarkets.\n3. Hai Chau Riverfront (The Filmore / Azura): Only 5–10 minutes from Vinmec International Hospital, Family Hospital, and St. Nicholas International School.`,
      zh: `携家人迁居岘港的国际家庭通常优先考虑以下三个区域：\n\n1. 五行山与南越亚别墅区（The Panoma / 花园泳池别墅）：紧邻新加坡国际学校（SIS），街道安静安全。\n2. 山茶郡（Hiyori Garden Tower / The Monarchy）：拥有社区内部公园、儿童泳池及底商超市。\n3. 海洲郡韩江畔（The Filmore / Azura）：距离 Vinmec 国际医院、家庭医院（Family Hospital）及圣尼古拉斯国际学校仅 5–10 分钟车程。`,
      ru: `Семьи экспатов в Дананге чаще всего выбирают три района:\n\n1. Нгуханьшон и Нам Вьет А (The Panoma / частные виллы): рядом с Singapore International School (SIS), тихие зеленые улицы.\n2. Шонча (Hiyori Garden Tower / The Monarchy): внутренние парки, детские бассейны и супермаркеты на первом этаже.\n3. Хайтяу (The Filmore / Azura): 5–10 минут до международных клиник Vinmec и Family Hospital, а также школы St. Nicholas.`,
      ko: `자녀와 함께 다낭으로 이주하는 가족들이 가장 선호하는 3대 거주 지역:\n\n1. 응우한선 & 남비엣아 (더 파노마 / 정원 풀빌라): 싱가포르 국제학교(SIS)와 가깝고 조용하며 안전합니다.\n2. 선짜 지역 (히요리 가든 타워 / 더 모나키): 단지 내 공원, 유아용 수영장, 1층 슈퍼마켓이 잘 갖춰져 있습니다.\n3. 하이쩌우 강변 (더 필모어 / 아주라): 빈멕 국제병원, 패밀리 병원 및 세인트 니콜라스 국제학교까지 차량 5~10분 거리입니다.`,
      ja: `ご家族でダナンへ移住される方に人気の3つのエリア：\n\n1. グーハインソン＆ナムベトア（The Panoma／プール付きヴィラ）：シンガポール国際学校（SIS）に近く、閑静で安全な住環境。\n2. ソンチャ地区（Hiyori Garden Tower／The Monarchy）：敷地内公園、キッズプール、1階スーパーがあり子育てに便利。\n3. ハイチャウ地区（The Filmore／Azura）：Vinmec国際病院、ファミリー病院、セント・ニコラス国際学校まで車で5〜10分。`
    }
  }
];

const FAQ_DATA: { q: Record<Lang, string>; a: Record<Lang, string> }[] = [
  {
    q: {
      vi: "Tôi có thể thuê căn hộ trong bao lâu?",
      en: "What is the minimum lease duration?",
      zh: "公寓最短租期是多久？",
      ru: "Какой минимальный срок аренды квартиры?",
      ko: "최소 임대 계약 기간은 어떻게 되나요?",
      ja: "最短の賃貸契約期間はどのくらいですか？"
    },
    a: {
      vi: "KIN Estates chuyên về căn hộ và biệt thự thuê dài hạn từ 3 tháng, 6 tháng đến 1 năm (hoặc lâu hơn). Các tòa chung cư cao cấp như The Panoma, The Filmore, Hiyori ưu tiên hợp đồng từ 6–12 tháng, trong khi The Monarchy và khu An Thượng hỗ trợ linh hoạt từ 3 tháng.",
      en: "KIN Estates specializes strictly in medium-to-long-term leases starting from 3 months, with 6 to 12 months being standard across premier towers like The Panoma, The Filmore, and Hiyori.",
      zh: "KIN Estates 专注于 3 个月、6 个月至 1 年以上的长期公寓与别墅租赁。The Panoma、The Filmore、Hiyori 等高端大楼优先 6–12 个月合同，而 The Monarchy 与安上区支持灵活的 3 个月起租。",
      ru: "KIN Estates специализируется на долгосрочной аренде от 3 месяцев до 1 года и более. В башнях The Panoma, The Filmore и Hiyori стандарт — 6–12 месяцев, а в The Monarchy и Ан Тхыонг возможна аренда от 3 месяцев.",
      ko: "KIN Estates는 3개월, 6개월에서 1년 이상의 중·장기 임대를 전문으로 합니다. 더 파노마, 더 필모어, 히요리는 6~12개월 계약이 기본이며, 더 모나키와 안트엉 지역은 3개월 단기 계약도 유연하게 가능합니다.",
      ja: "KIN Estatesは3ヶ月、6ヶ月〜1年以上の長期賃貸を専門としています。The Panoma、The Filmore、Hiyoriなどの高級タワーは6〜12ヶ月契約が基本ですが、The Monarchyやアントゥオン地区は3ヶ月から柔軟に契約可能です。"
    }
  },
  {
    q: {
      vi: "Giá thuê hàng tháng bao gồm những gì và chưa bao gồm gì?",
      en: "What is included in the monthly rent?",
      zh: "每月租金包含哪些费用，不包含哪些费用？",
      ru: "Что включено в ежемесячную арендную плату?",
      ko: "월 임대료에는 어떤 항목이 포함되며 무엇이 별도인가요?",
      ja: "月額家賃には何が含まれ、何が別料金ですか？"
    },
    a: {
      vi: "Giá thuê niêm yết đã bao gồm toàn bộ nội thất cao cấp. Tại các tòa căn hộ khu An Thượng, giá thường đã bao gồm phí quản lý, Wi-Fi riêng, nước sinh hoạt và dọn phòng 1 lần/tuần. Tại các tòa chung cư lớn (The Panoma, Filmore, Hiyori), điện và nước được tính minh bạch theo hóa đơn nhà nước EVN thực tế bạn sử dụng.",
      en: "Listed rent includes full furnishing. In boutique An Thuong buildings, Wi-Fi, water, and weekly cleaning are included. In major condo towers, electricity and water are billed transparently at official state EVN meter rates.",
      zh: "挂牌租金均包含全套高品质家具家电。在安上区精品公寓，租金通常包含物业费、独立 Wi-Fi、水费及每周一次保洁；在大型公寓楼（The Panoma、Filmore、Hiyori），水电费按越南国家电网 EVN 实际表数透明计费。",
      ru: "В цену включена вся мебель и техника. В апартаментах Ан Тхыонг обычно включены Wi-Fi, вода и еженедельная уборка. В крупных комплексах (The Panoma, Filmore, Hiyori) свет и вода оплачиваются по гос. счетчикам EVN.",
      ko: "모든 매물은 풀옵션 가구·가전이 포함되어 있습니다. 안트엉 부티크 아파트는 관리비, 전용 Wi-Fi, 수도세 및 주 1회 청소가 포함되며, 대형 타워(파노마, 필모어, 히요리)는 사용한 만큼 국가 표준 EVN 고지서대로 정산합니다.",
      ja: "表示家賃には家具・家電一式が含まれます。アントゥオン地区ではWi-Fi・水道・週1回清掃が含まれる物件が多く、大型タワー（The Panoma、Filmore、Hiyori）では国営EVNメーターの実費精算となります。"
    }
  },
  {
    q: {
      vi: "Dịch vụ tìm nhà của KIN Estates có thu phí khách thuê không?",
      en: "Do you charge tenants an agency or viewing fee?",
      zh: "KIN Estates 的找房与带看服务向租客收费吗？",
      ru: "Берет ли KIN Estates комиссию с арендатора?",
      ko: "KIN Estates의 매물 추천 및 투어 서비스는 수수료가 있나요?",
      ja: "KIN Estatesの物件紹介や内覧に仲介手数料はかかりますか？"
    },
    a: {
      vi: "Hoàn toàn miễn phí (0đ) cho khách thuê. Chi phí tư vấn, đưa đón xem nhà trực tiếp, quay video thực tế, soạn hợp đồng song ngữ và hỗ trợ khai báo tạm trú đều do phía chủ nhà chi trả khi giao dịch thành công.",
      en: "Our advisory service is 100% free for tenants ($0 fee). All shortlisting, in-person viewings, live video tours, and bilingual contract preparation are covered by the property owner.",
      zh: "对租客 100% 免费（0元中介费）。房源筛选、专车实地带看、4K 视频连线、双语合同起草及协助派出所暂住登记的所有费用均由房东承担。",
      ru: "Услуги для арендаторов 100% бесплатны ($0 комиссии). Подбор, личные показы, видео-туры, двуязычный договор и регистрацию оплачивает собственник жилья.",
      ko: "임차인에게는 100% 무료(수수료 0원)입니다. 맞춤 매물 추천, 현장 동행 투어, 라이브 영상 촬영, 이중언어 계약서 작성 및 거주 등록 지원 비용은 모두 임대인이 부담합니다.",
      ja: "借主様へのサービスは100%無料（仲介手数料0円）です。物件提案、現地内覧、4Kビデオ内覧、バイリンガル契約書作成、滞在登録サポートはすべてオーナー負担となります。"
    }
  },
  {
    q: {
      vi: "Tôi chưa ở Đà Nẵng thì có thể xem căn hộ và đặt thuê trước không?",
      en: "Can I inspect and reserve an apartment before arriving in Da Nang?",
      zh: "我人还没到岘港，可以远程看房并提前预订吗？",
      ru: "Можно ли осмотреть и забронировать квартиру до приезда в Дананг?",
      ko: "아직 다낭에 도착하기 전인데 원격으로 집을 보고 예약할 수 있나요?",
      ja: "ダナン到着前にオンライン内覧や事前予約はできますか？"
    },
    a: {
      vi: "Có. Chuyên viên của chúng tôi sẽ đến trực tiếp căn hộ, gọi Video Call 4K trực tiếp (qua WhatsApp, Telegram hoặc Zalo) để bạn kiểm tra ánh sáng, độ ồn, tốc độ Wi-Fi và cảnh quan xung quanh trước khi quyết định đặt giữ căn.",
      en: "Yes. We conduct live 1-on-1 video walk-throughs via WhatsApp, Telegram, or Zalo—testing Wi-Fi speed, natural light, and neighborhood acoustics in real time.",
      zh: "完全可以。我们的顾问会亲自前往公寓，通过 WhatsApp、Telegram 或 Zalo 进行 1对1 实时 4K 视频连线，现场为您测试采光、隔音、Wi-Fi 速度与周边环境。",
      ru: "Да. Наш специалист приедет в квартиру и проведет прямой 4K видео-тур по WhatsApp, Telegram или Zalo — проверит свет, тишину и скорость Wi-Fi в реальном времени.",
      ko: "네, 가능합니다. 담당 전문가가 직접 매물에 방문하여 WhatsApp, Telegram 또는 Zalo로 4K 실시간 영상통화를 연결해 채광, 소음, Wi-Fi 속도를 현장에서 바로 확인해 드립니다.",
      ja: "はい、可能です。担当者が現地のお部屋からWhatsApp、Telegram、Zaloで4Kライブビデオ通話を繋ぎ、日当たり・防音・Wi-Fi速度をリアルタイムでご確認いただけます。"
    }
  },
  {
    q: {
      vi: "Thủ tục khai báo tạm trú (Form NA17) cho người nước ngoài diễn ra thế nào?",
      en: "How does Police Temporary Residence Registration (Form NA17) work?",
      zh: "外国人派出所暂住登记（NA17表）如何办理？",
      ru: "Как проходит регистрация иностранцев в полиции (форма NA17)?",
      ko: "외국인 임시 거주 등록(Form NA17) 절차는 어떻게 진행되나요?",
      ja: "外国人の警察一時滞在登録（Form NA17）はどのように行われますか？"
    },
    a: {
      vi: "Ngay khi bạn nhận bàn giao căn hộ, chúng tôi phối hợp cùng chủ nhà đăng ký tạm trú với Công an Phường trong 24 giờ đầu tiên và hỗ trợ xin bản xác nhận dấu đỏ (Mẫu NA17) phục vụ việc gia hạn Visa hoặc làm Thẻ tạm trú (TRC).",
      en: "Within 24 hours of move-in, we coordinate your official ward police registration and obtain the red-stamped Form NA17 required for visa extensions and TRC applications.",
      zh: "在您入住后的 24 小时内，我们协助房东向辖区派出所完成暂住申报，并帮您获取加盖派出所红章的《NA17暂住确认表》，用于签证延期或办理暂住证（TRC）。",
      ru: "В течение 24 часов после заселения мы вместе с собственником оформляем вашу регистрацию в полиции района и получаем форму NA17 с красной печатью для визы или ВНЖ (TRC).",
      ko: "입주 후 24시간 이내에 집주인과 협력하여 관할 공안에 거주 등록을 완료하며, 추후 비자 연장이나 거주증(TRC) 신청에 필요한 공안 직인 NA17 원본 발급을 도와드립니다.",
      ja: "入居後24時間以内にオーナーと連携して管轄警察への滞在登録を完了し、ビザ延長やTRC取得に必要な赤印付き「Form NA17」の取得までサポートします。"
    }
  }
];

export const App: React.FC = () => {
  const [route, setRoute] = useState<string>(window.location.pathname || "/");
  const [lang, setLang] = useState<Lang>("vi");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [langMenuOpen, setLangMenuOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const [buildings, setBuildings] = useState<BuildingInfo[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<NeighborhoodInfo[]>([]);
  const [savedCodes, setSavedCodes] = useState<string[]>([]);

  // Hero Interactive Showcase State
  const [showcaseMode, setShowcaseMode] = useState<"split" | "photo">("split");
  const [showcaseBldgFilter, setShowcaseBldgFilter] = useState<string>("all");
  const [showcaseAptCode, setShowcaseAptCode] = useState<string>();
  const [mapPinListOpen, setMapPinListOpen] = useState<boolean>(false);

  // Full-Screen Expand Map Dialog & Streamlined Viewing Booking Modal State
  const [expandMapOpen, setExpandMapOpen] = useState<boolean>(false);
  const [expandMapAptCode, setExpandMapAptCode] = useState<string>();
  const [inquiryApartmentCode, setInquiryApartmentCode] = useState<string>();
  const [apartmentInquiryType, setApartmentInquiryType] = useState<ApartmentInquiryType>("viewing");
  const [apartmentInquiryState, setApartmentInquiryState] = useState<ApartmentInquiryState>("idle");
  const apartmentInquiryPending = useRef(false);
  const apartmentInquiryAttempt = useRef<{ body: string; key: string } | null>(null);
  const [photoSelection, setPhotoSelection] = useState<{ code: string; source: string; index: number }>();
  const [activeGuideModal, setActiveGuideModal] = useState<typeof GUIDES_DATA[0] | null>(null);
  const [policyAgreed, setPolicyAgreed] = useState<boolean>(true);
  const [aboutContent, setAboutContent] = useState<{
    heroImage?: string;
    founderName?: string;
    founderQuote?: Record<string, string>;
    clientTourPhotos?: Array<{ id: string; image: string; caption?: Record<string, string> | string; tag?: string; date?: string }>;
    testimonials?: Array<{ id: string; clientName: string; subtitle?: string; rating?: number; avatar?: string; quote?: Record<string, string> | string; image?: string }>;
  } | null>(null);
  const [aboutLightbox, setAboutLightbox] = useState<{ src: string; caption?: string; sub?: string } | null>(null);
  const [fbSlideIdx, setFbSlideIdx] = useState<number>(0);
  const [fbPaused, setFbPaused] = useState<boolean>(false);
  const [fbIsMobile, setFbIsMobile] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth <= 820);
  const tourSliderRef = useRef<HTMLDivElement>(null);
  const [detailPageOtherFilter, setDetailPageOtherFilter] = useState<string>("all");

  // Home Section 01 & 02 State
  const [homeChipFilter, setHomeChipFilter] = useState<string>("all");
  const [activeDistrictIdx, setActiveDistrictIdx] = useState<number>(0);
  const [rhythmTab, setRhythmTab] = useState<"morning" | "day" | "evening">("morning");
  const [compareLeftIdx, setCompareLeftIdx] = useState<string>("0");
  const [compareRightIdx, setCompareRightIdx] = useState<string>("3");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Catalogue (/apartments) Filters
  const [query, setQuery] = useState<string>("");
  const [area, setArea] = useState<string>("all");
  const [bedrooms, setBedrooms] = useState<string>("all");
  const [maxPrice, setMaxPrice] = useState<string>("0");
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<string>("featured");

  // Lead Form State
  const [leadBudget, setLeadBudget] = useState<string>("900");
  const [leadBedrooms, setLeadBedrooms] = useState<string>("2 phòng ngủ");
  const [leadMoveIn, setLeadMoveIn] = useState<string>("Tháng tới (Thuê 6–12 tháng)");
  const [leadMessenger, setLeadMessenger] = useState<string>("Zalo");
  const [bookingFeedback, setBookingFeedback] = useState<string>("");

  const langDropRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroMapRef = useRef<any>(null);
  const expandMapRef = useRef<any>(null);
  const catMapRef = useRef<any>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (langDropRef.current && !langDropRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    const v = heroVideoRef.current;
    if (v) {
      v.playbackRate = 1.0;
      v.play().catch(() => {});
    }
  }, [route]);

  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const onResize = () => setFbIsMobile(window.innerWidth <= 820);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Auto-playing Customer Feedback Carousel on /about
  useEffect(() => {
    const total = aboutContent?.testimonials?.length || 0;
    const visible = fbIsMobile ? 1 : 2;
    const maxIdx = Math.max(0, total - visible);
    if (fbSlideIdx > maxIdx) setFbSlideIdx(0);
    if (route.replace(/\/+$/, "") !== "/about" || fbPaused || maxIdx === 0) return;
    const timer = window.setInterval(() => {
      setFbSlideIdx((prev) => (prev >= maxIdx ? 0 : prev + 1));
    }, 4800);
    return () => window.clearInterval(timer);
  }, [route, fbPaused, fbIsMobile, aboutContent?.testimonials?.length, fbSlideIdx]);

  // Smooth Scroll-Reveal Observer for /about sections
  useEffect(() => {
    if (route.replace(/\/+$/, "") !== "/about") return;
    const nodes = Array.from(document.querySelectorAll(".kin-reveal"));
    if (!nodes.length) return;
    if (typeof IntersectionObserver === "undefined") {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [route, aboutContent]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    fetch("/api/buildings", { signal })
      .then((response) => readPublicList<BuildingInfo>(response, "buildings"))
      .then((list) => { if (!signal.aborted) setBuildings(list); })
      .catch(() => {});
    fetch("/api/neighborhoods", { signal })
      .then((response) => readPublicList<NeighborhoodInfo>(response, "neighborhoods"))
      .then((list) => { if (!signal.aborted) setNeighborhoods(list); })
      .catch(() => {});
    fetch("/api/site-content/about", { signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!signal.aborted && data?.ok && data.about) setAboutContent(data.about); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let activeRequest: AbortController | null = null;
    let lastRequestAt = -Infinity;
    let lastETag: string | null = null;

    const refreshCatalogue = async () => {
      const now = Date.now();
      if (document.visibilityState === "hidden" || activeRequest || now - lastRequestAt < CATALOGUE_REFRESH_MIN_GAP_MS) return;

      const controller = new AbortController();
      activeRequest = controller;
      lastRequestAt = now;
      const timeout = window.setTimeout(() => controller.abort(), CATALOGUE_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(`/api/apartments?lang=${encodeURIComponent(lang)}`, { signal: controller.signal, cache: "no-cache" });
        const etag = response.headers.get("ETag");
        if (response.ok && etag && etag === lastETag) {
          await response.body?.cancel();
          return;
        }
        const next = await readPublicList<Apartment>(response, "apartments");
        if (controller.signal.aborted) return;
        lastETag = etag;
        setApartments((previous) => (
          previous.length === next.length &&
          previous.every((apt, index) => JSON.stringify(apt) === JSON.stringify(next[index]))
            ? previous
            : next
        ));
        setCatalogueLoaded(true);
      } catch {
        // Keep the last good catalogue available for the next refresh.
      } finally {
        window.clearTimeout(timeout);
        activeRequest = null;
      }
    };

    void refreshCatalogue();
    const interval = window.setInterval(refreshCatalogue, CATALOGUE_REFRESH_MS);
    window.addEventListener("focus", refreshCatalogue);
    document.addEventListener("visibilitychange", refreshCatalogue);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCatalogue);
      document.removeEventListener("visibilitychange", refreshCatalogue);
      activeRequest?.abort();
    };
  }, [lang]);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({ path }, "", path);
    }
    setRoute(path);
    setMobileMenuOpen(false);
    setBookingFeedback("");
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  const tx = (
    vi: string,
    en: string,
    zh?: string,
    ru?: string,
    ko?: string,
    ja?: string
  ): string => {
    if (lang === "vi") return vi;
    if (lang === "zh") return zh || en;
    if (lang === "ru") return ru || en;
    if (lang === "ko") return ko || en;
    if (lang === "ja") return ja || en;
    return en;
  };

  const photoUnavailable = tx("Chưa có ảnh", "Photo unavailable", "暂无照片", "Фото недоступно", "사진 없음", "写真なし");

  useEffect(() => {
    setLeadMoveIn(
      tx(
        "Tháng tới (6–12 tháng)",
        "Next month (6–12 mo)",
        "下个月 (租期 6–12个月)",
        "В след. месяце (6–12 мес)",
        "다음 달 (6~12개월 임대)",
        "来月 (6〜12ヶ月契約)"
      )
    );
  }, [lang]);

  const trTag = (raw: string): string => {
    if (lang === "vi") return raw;
    const map: Record<string, string> = {
      "View sông Hàn": tx("View sông Hàn", "Han River View", "韩江景观", "Вид на реку Хан", "한강 뷰", "ハン川ビュー"),
      "Gần biển": tx("Gần biển", "Near Beach", "靠近海滩", "Рядом с пляжем", "해변 근처", "ビーチ近く"),
      "Mới bàn giao": tx("Mới bàn giao", "Newly Handed Over", "全新交付", "Новый дом", "신축", "新築"),
      "Bàn làm việc": tx("Bàn làm việc", "Work Desk", "独立办公桌", "Рабочий стол", "업무용 데스크", "ワークデスク"),
      "Điện EVN": tx("Điện EVN", "State EVN Rate", "国家电网电价", "Гос. тариф EVN", "국가 전력 요금", "国営EVN電気料金"),
      "Thú cưng": tx("Thú cưng", "Pet Friendly", "允许宠物", "Можно с животными", "반려동물 가능", "ペット可"),
      "Biệt thự": tx("Biệt thự", "Private Villa", "独栋别墅", "Вилла", "풀빌라", "プライベートヴィラ"),
      "Hồ bơi vô cực": tx("Hồ bơi vô cực", "Infinity Pool", "无边泳池", "Инфинити-бассейн", "인피니티 풀", "インフィニティプール")
    };
    return map[raw] || raw;
  };

  const trField = (val: string | null | undefined): string => {
    if (!val || lang === "vi") return val || "";
    const dict: Record<string, string> = {
      // Neighborhood Names & Subtitles
      "An Thượng": tx("An Thượng", "An Thuong", "安上街区 (An Thượng)", "Ан Тхыонг", "안트엉 (An Thượng)", "アントゥオン地区"),
      "Ngũ Hành Sơn": tx("Ngũ Hành Sơn", "Ngu Hanh Son", "五行山郡 (Ngũ Hành Sơn)", "Нгуханьшон", "응우한선 (Ngũ Hành Sơn)", "グーハインソン区"),
      "Hải Châu": tx("Hải Châu", "Hai Chau", "海洲郡 (Hải Châu)", "Хайтяу", "하이쩌우 (Hải Châu)", "ハイチャウ区"),
      "Sơn Trà": tx("Sơn Trà", "Son Tra", "山茶郡 (Sơn Trà)", "Шонча", "선짜 (Sơn Trà)", "ソンチャ区"),
      "Cà phê, dạo bộ và biển": tx("Cà phê, dạo bộ và biển", "Specialty Coffee, Walkable Streets & Beach", "精品咖啡、步行街区与海滩", "Кофейни, прогулки и пляж", "스페셜티 카페, 산책로 & 해변", "カフェ、散歩道、そしてビーチ"),
      "Thêm không gian cho cuộc sống": tx("Thêm không gian cho cuộc sống", "Spacious Riverfront & Modern Towers", "开阔的河畔空间与全新公寓群", "Простор у реки и новые башни", "여유로운 공간과 신축 리버뷰 타워", "ゆとりある空間と新築リバーサイド"),
      "Nhịp sống thành phố ngay bên": tx("Nhịp sống thành phố ngay bên", "Central Executive & Riverfront Core", "市中心金融行政核心与韩江畔", "Деловой центр у реки Хан", "도심 인프라와 한강변 핵심 지구", "都市の中心とハン川リバーフロント"),
      "Biển và cây xanh bán đảo": tx("Biển và cây xanh bán đảo", "Peninsula Greenery & Coastal Breeze", "山茶半岛绿意与美溪海风", "Зелень полуострова и океан", "선짜 반도의 자연과 해변 산책", "ソンチャ半島の緑と心地よい海風"),

      // Neighborhood Beach Walk & Noise Level
      "3–6 phút đi bộ ra biển Mỹ Khê / Bắc Mỹ An": tx("3–6 phút đi bộ ra biển Mỹ Khê / Bắc Mỹ An", "3–6 mins walk to My Khe / Bac My An Beach", "步行 3–6 分钟至美溪 / 北美安海滩", "3–6 мин пешком до пляжа Ми Кхе", "미케 / 박미안 해변 도보 3~6분", "ミーケービーチまで徒歩3〜6分"),
      "5–8 phút ra biển Mỹ Khê / Non Nước": tx("5–8 phút ra biển Mỹ Khê / Non Nước", "5–8 mins to My Khe / Non Nuoc Beach", "5–8 分钟至美溪 / ノンヌオック海滩", "5–8 мин до пляжа Ми Кхе / Нон Ныок", "미케 / 논느억 해변 5~8분 거리", "ミーケー・ノンヌオックビーチまで5〜8分"),
      "8–10 phút lái xe qua cầu Rồng": tx("8–10 phút lái xe qua cầu Rồng", "8–10 mins drive across Dragon Bridge", "驾车 8–10 分钟穿过龙桥即达海滩", "8–10 мин на авто через Мост Дракона", "용다리를 건너 차량 8~10분 거리", "ドラゴンブリッジ経由で車8〜10分"),
      "5–10 phút đi bộ ra biển Mỹ Khê / Phạm Văn Đồng": tx("5–10 phút đi bộ ra biển Mỹ Khê / Phạm Văn Đồng", "5–10 mins walk to My Khe / Pham Van Dong Beach", "步行 5–10 分钟至美溪 / 范文同海滩", "5–10 мин пешком до пляжа Ми Кхе", "미케 / 팜반동 해변 도보 5~10분", "ミーケービーチまで徒歩5〜10分"),
      "Vừa phải (Hẻm nhỏ yên tĩnh, phố chính nhộn nhịp)": tx("Vừa phải (Hẻm nhỏ yên tĩnh, phố chính nhộn nhịp)", "Moderate (Quiet cul-de-sacs, lively main streets)", "适中（内巷安静，主街热闹）", "Умеренный (тихие переулки, оживленный центр)", "보통 (골목은 조용하고 메인 거리는 활기참)", "普通（路地は静か、メイン通りは賑やか）"),
      "Yên tĩnh, thoáng đãng": tx("Yên tĩnh, thoáng đãng", "Quiet, open & breezy", "安静开阔，河风凉爽", "Тихо, просторно и свежо", "조용하고 탁 트인 쾌적한 환경", "静かで開放的な住環境"),
      "Yên tĩnh trên tầng cao (15F+)": tx("Yên tĩnh trên tầng cao (15F+)", "Quiet on high floors (15F+)", "高楼层非常安静 (15层以上)", "Тихо на высоких этажах (15+)", "고층(15층+)에서 매우 조용함", "高層階（15階以上）は非常に静か"),
      "Thấp – Rất thoáng đãng": tx("Thấp – Rất thoáng đãng", "Low noise — Very breezy & green", "低噪音 — 绿意盎然且通风极佳", "Низкий шум — много зелени и бриз", "소음 낮음 — 매우 쾌적하고 여유로움", "低騒音 — 緑豊かで風通しが抜群"),

      // Neighborhood Character, Vibes, Considerations & Checklist
      "Khu phố quốc tế sôi động nhất Đà Nẵng: bước chân xuống nhà là hàng chục quán cà phê specialty, phòng gym, nhà hàng Âu – Á và bãi biển Mỹ Khê.": tx(
        "Khu phố quốc tế sôi động nhất Đà Nẵng: bước chân xuống nhà là hàng chục quán cà phê specialty, phòng gym, nhà hàng Âu – Á và bãi biển Mỹ Khê.",
        "Da Nang's most vibrant international quarter: step outside to dozens of specialty coffee roasters, boutique gyms, global dining, and My Khe Beach.",
        "岘港最具活力的国际化街区：下楼即是数十家精品咖啡馆、健身房、欧亚餐厅与美溪海滩。",
        "Самый живой международный квартал Дананга: десятки спешелти-кофеен, спортзалы, рестораны и пляж Ми Кхе прямо у дома.",
        "다낭에서 가장 활기찬 글로벌 타운: 집을 나서면 스페셜티 카페, 피트니스, 다국적 레스토랑과 미케비치가 바로 이어집니다.",
        "ダナンで最も活気ある国際エリア。一歩外に出ればスペシャルティカフェ、ジム、多彩なレストラン、ミーケービーチが広がります。"
      ),
      "Đi bộ chân trần ra biển Mỹ Khê tắm nắng sớm, thưởng thức espresso tại các quán rang xay thủ công.": tx(
        "Đi bộ chân trần ra biển Mỹ Khê tắm nắng sớm, thưởng thức espresso tại các quán rang xay thủ công.",
        "Barefoot morning walks along My Khe Beach followed by artisan espresso at neighborhood roasteries.",
        "清晨赤脚漫步美溪海滩享受晨光，随后在街角手工烘焙咖啡馆品尝浓缩咖啡。",
        "Утренняя прогулка босиком по пляжу Ми Кхе и свежий эспрессо в ремесленных кофейнях.",
        "아침 일찍 미케비치 백사장을 산책하고 동네 로스터리 카페에서 에스프레소를 즐깁니다.",
        "早朝のミーケービーチを散歩し、近所の自家焙煎カフェでエスプレッソを楽しむ朝。"
      ),
      "Làm việc từ xa tại các coworking space hoặc căn hộ nhiều ánh sáng, ăn trưa healthy bowl.": tx(
        "Làm việc từ xa tại các coworking space hoặc căn hộ nhiều ánh sáng, ăn trưa healthy bowl.",
        "Deep focus work from sunlit apartments or coworking hubs, with healthy poke & salad bowls for lunch.",
        "在采光充足的公寓或共享办公空间高效远程工作，午餐享用健康沙拉碗。",
        "Продуктивная работа из светлой квартиры или коворкинга, боулы и смузи на обед.",
        "채광 좋은 아파트나 코워킹 스페이스에서 원격 근무를 하고 건강식 보울로 점심을 해결합니다.",
        "自然光あふれるお部屋やコワーキングスペースで仕事に集中し、ランチにはヘルシーボウルを。"
      ),
      "Dạo bộ qua các con phố lên đèn ấm cúng, gặp gỡ cộng đồng chuyên gia quốc tế mà không cần đi xe xa.": tx(
        "Dạo bộ qua các con phố lên đèn ấm cúng, gặp gỡ cộng đồng chuyên gia quốc tế mà không cần đi xe xa.",
        "Stroll through warm lantern-lit streets and connect with the international creative community without needing a car.",
        "漫步在温暖灯光点亮的街道，无需远行即可与国际专家与数字游民社群交流。",
        "Вечерние прогулки по уютным улочкам и встречи с международным комьюнити пешком.",
        "따뜻한 조명이 켜진 거리를 걸으며 차 없이도 글로벌 전문가 커뮤니티와 교류할 수 있습니다.",
        "温かな灯りがともる通りを歩き、移動の手間なく国際的なコミュニティと交流できます。"
      ),
      "Một số lô đất trống có thể đang xây dựng — chúng tôi kiểm tra kỹ tiếng ồn từng hẻm trước khi gợi ý.": tx(
        "Một số lô đất trống có thể đang xây dựng — chúng tôi kiểm tra kỹ tiếng ồn từng hẻm trước khi gợi ý.",
        "Some infill plots may have active construction — our team physically audits noise levels on every lane before shortlisting.",
        "部分空地可能有新建工程——我们会在推荐前实地排查每条小巷的白噪音与施工情况。",
        "На отдельных участках возможна стройка — мы лично проверяем тишину в каждом переулке перед рекомендацией.",
        "일부 빈 부지에 신축 공사가 있을 수 있어 추천 전 골목별 소음을 직접 확인합니다.",
        "一部の空き地で工事が行われている場合があるため、ご紹介前に路地ごとの騒音を現地確認します。"
      ),
      "Kiểm tra độ kín của cửa kính ban công, áp lực nước tầng cao và tốc độ Wi-Fi giờ cao điểm.": tx(
        "Kiểm tra độ kín của cửa kính ban công, áp lực nước tầng cao và tốc độ Wi-Fi giờ cao điểm.",
        "Verify balcony acoustic door seals, upper-floor water pressure, and peak-hour fiber Wi-Fi stability.",
        "重点核验阳台隔音门窗密封度、高楼层水压以及晚高峰光纤 Wi-Fi 稳定性。",
        "Проверить герметичность балконных дверей, напор воды на верхних этажах и скорость Wi-Fi вечером.",
        "발코니 창문 밀폐 상태, 고층 수압, 피크 시간대 Wi-Fi 속도를 중점적으로 점검합니다.",
        "バルコニー窓の密閉性、高層階の水圧、ピーク時間帯のWi-Fi速度を重点チェックします。"
      ),
      "Nơi quy tụ tổ hợp căn hộ mới bàn giao The Panoma (Sun Cosmo) bên cầu Trần Thị Lý và khu biệt thự sân vườn Nam Việt Á xanh mát.": tx(
        "Nơi quy tụ tổ hợp căn hộ mới bàn giao The Panoma (Sun Cosmo) bên cầu Trần Thị Lý và khu biệt thự sân vườn Nam Việt Á xanh mát.",
        "Home to the newly delivered The Panoma (Sun Cosmo) towers by Tran Thi Ly Bridge and the lush Nam Viet A private villa compound.",
        "汇聚陈氏李桥畔全新交付的 The Panoma (Sun Cosmo) 综合体与绿意盎然的南越亚花园别墅区。",
        "Здесь расположены новые башни The Panoma (Sun Cosmo) у моста Чан Тхи Ли и зеленый квартал вилл Нам Вьет А.",
        "쩐티리 대교 옆 신축 랜드마크 더 파노마(Sun Cosmo)와 푸른 남비엣아 정원 풀빌라 단지가 위치한 곳입니다.",
        "チャンティリー橋畔の新築タワーThe Panoma（Sun Cosmo）と緑豊かなナムベトア高級ヴィラ街が集まるエリア。"
      ),
      "Đón bình minh trên sông Hàn từ ban công tầng cao The Panoma hoặc chạy bộ dọc công viên bờ sông.": tx(
        "Đón bình minh trên sông Hàn từ ban công tầng cao The Panoma hoặc chạy bộ dọc công viên bờ sông.",
        "Watch sunrise over the Han River from The Panoma's high-floor balconies or jog along the riverfront park.",
        "在 The Panoma 高层阳台迎接韩江日出，或沿着河畔公园晨跑。",
        "Встречайте рассвет над рекой Хан с высокого этажа The Panoma или бегайте в парке у воды.",
        "더 파노마 고층 발코니에서 한강 일출을 감상하거나 강변 공원을 따라 아침 조깅을 즐깁니다.",
        "The Panomaの高層バルコニーからハン川の日の出を眺めたり、川沿いの公園で朝ランを楽しめます。"
      ),
      "Không gian rộng rãi, yên tĩnh tuyệt đối cho các cuộc họp trực tuyến quốc tế và gia đình có con nhỏ.": tx(
        "Không gian rộng rãi, yên tĩnh tuyệt đối cho các cuộc họp trực tuyến quốc tế và gia đình có con nhỏ.",
        "Spacious, whisper-quiet interiors ideal for international executive calls and families with children.",
        "空间宽敞、极致安静，非常适合跨国视频会议与有孩家庭居住。",
        "Просторные и тихие квартиры — идеально для рабочих созвонов и семей с детьми.",
        "넓고 조용한 실내 공간으로 글로벌 화상 회의가 잦은 전문가와 자녀 동반 가족에게 이상적입니다.",
        "広々とした静かな空間で、オンライン会議が多い方やお子様連れのご家族に最適です。"
      ),
      "Gió sông mát rượi, đường phố thông thoáng, kết nối qua trung tâm Hải Châu hay biển An Thượng chỉ 5 phút.": tx(
        "Gió sông mát rượi, đường phố thông thoáng, kết nối qua trung tâm Hải Châu hay biển An Thượng chỉ 5 phút.",
        "Cool river breezes and wide boulevards connecting you to central Hai Chau or An Thuong Beach in just 5 minutes.",
        "江风习习、道路宽敞，仅需 5 分钟即可连接海洲市中心或安上海滩。",
        "Свежий речной бриз и быстрый выезд в центр Хайтяу или к пляжу Ан Тхыонг за 5 минут.",
        "시원한 강바람과 넓은 도로망으로 하이쩌우 도심이나 안트엉 해변까지 5분이면 이동합니다.",
        "涼しい川風と広い街路。ハイチャウ中心部やアントゥオンのビーチへも約5分でアクセス可能です。"
      ),
      "Các tòa tháp mới như The Panoma có nhiều căn đang hoàn thiện nội thất — chúng tôi chọn các tầng đã ổn định cư dân.": tx(
        "Các tòa tháp mới như The Panoma có nhiều căn đang hoàn thiện nội thất — chúng tôi chọn các tầng đã ổn định cư dân.",
        "In newly handed-over towers like The Panoma, some units may be fitting out — we select floors with settled occupancy.",
        "像 The Panoma 这样的新交付大楼部分户型可能在装修——我们会为您挑选入住稳定的安静楼层。",
        "В новых башнях вроде The Panoma в отдельных квартирах может идти меблировка — мы выбираем уже заселенные тихие этажи.",
        "더 파노마 같은 신축 타워는 일부 호실이 인테리어 중일 수 있어 입주가 안정된 조용한 층을 엄선합니다.",
        "The Panomaのような新築タワーでは一部内装工事中の住戸があるため、入居が落ち着いた静かなフロアを厳選します。"
      ),
      "Kiểm tra hướng nắng buổi chiều (nên chọn hướng Đông Nam hoặc nhìn về cầu Rồng) và phí quản lý tòa nhà.": tx(
        "Kiểm tra hướng nắng buổi chiều (nên chọn hướng Đông Nam hoặc nhìn về cầu Rồng) và phí quản lý tòa nhà.",
        "Check afternoon sun exposure (Southeast or Dragon Bridge views stay coolest) and confirm building management fees.",
        "检查下午日照角度（建议选择东南向或龙桥景观户型）并确认物业管理费包含情况。",
        "Проверить послеобеденное солнце (лучше выбирать Юго-Восток или вид на Мост Дракона) и стоимость обслуживания.",
        "오후 채광 방향(남동향 또는 용다리 뷰 추천)과 건물 관리비 포함 여부를 확인합니다.",
        "午後の日差し（涼しい南東向きやドラゴンブリッジ眺望がおすすめ）と管理費を確認します。"
      ),
      "Trung tâm hành chính, tài chính và ẩm thực bên bờ Tây sông Hàn với các tòa tháp biểu tượng như The Filmore, F.Home và Blooming.": tx(
        "Trung tâm hành chính, tài chính và ẩm thực bên bờ Tây sông Hàn với các tòa tháp biểu tượng như The Filmore, F.Home và Blooming.",
        "Da Nang's financial, dining, and cultural heart on the West bank of the Han River, anchored by iconic towers like The Filmore.",
        "位于韩江西岸的金融、行政与美食核心区，坐拥 The Filmore 等标志性豪华公寓大楼。",
        "Деловой, культурный и гастрономический центр на западном берегу реки Хан с комплексом The Filmore.",
        "한강 서안의 금융·행정·미식 중심지로 더 필모어 같은 랜드마크 레지던스가 자리 잡고 있습니다.",
        "ハン川西岸に位置する金融・グルメ・文化の中心地。The Filmoreなどの象徴的なタワーがそびえます。"
      ),
      "Tản bộ dọc đường Bạch Đằng ven sông Hàn, thưởng thức cà phê sáng giữa trung tâm thành phố.": tx(
        "Tản bộ dọc đường Bạch Đằng ven sông Hàn, thưởng thức cà phê sáng giữa trung tâm thành phố.",
        "Stroll along the Bach Dang riverfront promenade and enjoy morning coffee in the heart of the city.",
        "沿着韩江畔白藤步行街晨间漫步，在城市中心享用精品早咖啡。",
        "Прогулки по набережной Батьданг вдоль реки Хан и утренний кофе в центре города.",
        "한강변 박당(Bạch Đằng) 산책로를 걷고 도심 카페에서 여유로운 모닝커피를 즐깁니다.",
        "ハン川沿いのバクダン遊歩道を散歩し、街の中心でモーニングコーヒーを味わえます。"
      ),
      "Cách sân bay quốc tế Đà Nẵng, bệnh viện Vinmec / Gia Đình và các văn phòng lớn chỉ 5–8 phút.": tx(
        "Cách sân bay quốc tế Đà Nẵng, bệnh viện Vinmec / Gia Đình và các văn phòng lớn chỉ 5–8 phút.",
        "Only 5–8 minutes from Da Nang International Airport, Vinmec / Family Hospital, and major corporate offices.",
        "距离岘港国际机场、Vinmec / 家庭国际医院及核心写字楼仅 5–8 分钟车程。",
        "Всего 5–8 минут до международного аэропорта Дананга, клиник Vinmec / Family Hospital и офисов.",
        "다낭 국제공항, 빈멕·패밀리 국제병원 및 주요 오피스까지 차량 5~8분이면 충분합니다.",
        "ダナン国際空港、Vinmec国際病院、主要オフィスまで車でわずか5〜8分の好立地。"
      ),
      "Ngắm toàn cảnh cầu Rồng và phố đi bộ Bạch Đằng lung linh ngay từ phòng khách căn hộ.": tx(
        "Ngắm toàn cảnh cầu Rồng và phố đi bộ Bạch Đằng lung linh ngay từ phòng khách căn hộ.",
        "Take in panoramic views of the illuminated Dragon Bridge and Bach Dang promenade right from your living room.",
        "在公寓客厅即可尽览璀璨的龙桥夜景与白藤江畔步行街。",
        "Панорамный вид на сияющий Мост Дракона и набережную Батьданг прямо из вашей гостиной.",
        "거실에서 반짝이는 용다리 야경과 박당 보행자 거리의 파노라마 뷰를 감상할 수 있습니다.",
        "リビングルームからライトアップされたドラゴンブリッジとバクダン通りの夜景を一望できます。"
      ),
      "Khoảng cách ra biển cần đi qua cầu — bù lại tiện ích đô thị, nhà hàng Michelin và bệnh viện quốc tế ngay dưới chân nhà.": tx(
        "Khoảng cách ra biển cần đi qua cầu — bù lại tiện ích đô thị, nhà hàng Michelin và bệnh viện quốc tế ngay dưới chân nhà.",
        "Reaching the beach requires crossing the bridge—compensated by MICHELIN dining, international hospitals, and city conveniences downstairs.",
        "前往海滩需过桥——但楼下即是米其林指南餐厅、国际医院与顶级城市生活配套。",
        "До пляжа нужно проехать через мост, зато рестораны гида MICHELIN и международные клиники прямо у дома.",
        "해변으로 가려면 다리를 건너야 하지만 미슐랭 레스토랑, 국제병원, 도심 편의시설이 바로 집 앞에 있습니다.",
        "ビーチへは橋を渡る必要がありますが、ミシュラン掲載レストランや国際病院がすぐそばにあります。"
      ),
      "Kiểm tra chỗ đậu ô tô dưới hầm và khả năng cách âm của hệ kính mặt dựng.": tx(
        "Kiểm tra chỗ đậu ô tô dưới hầm và khả năng cách âm của hệ kính mặt dựng.",
        "Verify basement car parking availability and test the acoustic insulation of floor-to-ceiling facade glazing.",
        "确认地下车库停车位情况，并测试落地幕墙玻璃的隔音效果。",
        "Проверить наличие подземного паркинга и звукоизоляцию панорамного остекления.",
        "지하 주차장 공간 확보 여부와 통유리 파사드의 방음 성능을 확인합니다.",
        "地下駐車場の空き状況と、全面ガラスファサードの防音性能を確認します。"
      ),
      "Sự cân bằng hoàn hảo giữa sông Hàn, biển Mỹ Khê và mảng xanh bán đảo Sơn Trà — nơi tọa lạc của Hiyori Garden Tower, The Monarchy và Azura.": tx(
        "Sự cân bằng hoàn hảo giữa sông Hàn, biển Mỹ Khê và mảng xanh bán đảo Sơn Trà — nơi tọa lạc của Hiyori Garden Tower, The Monarchy và Azura.",
        "The ideal balance between the Han River, My Khe Beach, and Son Tra Peninsula greenery—home to Hiyori Garden Tower, The Monarchy, and Azura.",
        "韩江、美溪海滩与山茶半岛绿意的完美平衡点——坐落着 Hiyori Garden Tower、The Monarchy 与 Azura。",
        "Идеальный баланс между рекой Хан, пляжем Ми Кхе и зеленью полуострова Шонча — здесь находятся Hiyori, The Monarchy и Azura.",
        "한강, 미케비치, 선짜 반도의 자연이 완벽한 조화를 이루는 곳으로 히요리 가든 타워, 더 모나키, 아주라가 위치합니다.",
        "ハン川、ミーケービーチ、ソンチャ半島の緑が調和するエリア。Hiyori、The Monarchy、Azuraが立地しています。"
      ),
      "Không khí trong lành từ rừng Sơn Trà và biển Đông, đạp xe dọc cung đường ven biển Hoàng Sa – Võ Nguyên Giáp.": tx(
        "Không khí trong lành từ rừng Sơn Trà và biển Đông, đạp xe dọc cung đường ven biển Hoàng Sa – Võ Nguyên Giáp.",
        "Crisp air from Son Tra forest and the East Sea, perfect for morning cycling along the Hoang Sa – Vo Nguyen Giap coast.",
        "呼吸来自山茶森林与东海的新鲜空气，清晨沿着黄沙—武元甲海滨大道骑行。",
        "Свежий воздух леса Шонча и океана, утренние велопрогулки вдоль побережья Хоангша – Во Нгуен Зяп.",
        "선짜 자연림과 바다에서 불어오는 상쾌한 공기를 마시며 해안도로를 따라 아침 라이딩을 즐깁니다.",
        "ソンチャの森と海からの澄んだ空気の中、海岸通りでの朝のサイクリングが楽しめます。"
      ),
      "Tiện ích nội khu khép kín (hồ bơi, siêu thị, lễ tân Nhật Bản tại Hiyori) giúp cuộc sống hàng ngày cực kỳ nhàn nhã.": tx(
        "Tiện ích nội khu khép kín (hồ bơi, siêu thị, lễ tân Nhật Bản tại Hiyori) giúp cuộc sống hàng ngày cực kỳ nhàn nhã.",
        "All-in-one compound amenities (pools, supermarkets, and Japanese reception at Hiyori) make daily living effortless.",
        "完善的社区配套（泳池、超市以及 Hiyori 的日式前台服务）让日常生活轻松惬意。",
        "Закрытая инфраструктура (бассейны, супермаркеты и японский ресепшн в Hiyori) делает быт максимально легким.",
        "수영장, 마트, 히요리의 일본식 컨시어지 등 단지 내 올인원 편의시설로 일상이 매우 편리합니다.",
        "プール、スーパー、Hiyoriの日系コンシェルジュなど館内施設が充実し、毎日の暮らしが快適です。"
      ),
      "Đi bộ qua cầu Tình Yêu, công viên bờ Đông sông Hàn hoặc thưởng thức hải sản tươi sống ven biển.": tx(
        "Đi bộ qua cầu Tình Yêu, công viên bờ Đông sông Hàn hoặc thưởng thức hải sản tươi sống ven biển.",
        "Evening walks by the Love Pier and East Han River park, or fresh coastal seafood dining nearby.",
        "傍晚漫步爱情桥与韩江东岸公园，或在海滨品尝新鲜海鲜料理。",
        "Прогулки у Моста Любви на восточном берегу реки Хан и ужины со свежими морепродуктами у моря.",
        "사랑의 부두와 한강 동안 공원을 산책하거나 해변가에서 신선한 해산물 다이닝을 즐깁니다.",
        "夕方はハン川東岸の公園を散歩したり、ビーチ沿いで新鮮なシーフードを堪能できます。"
      ),
      "Các căn hướng chính Tây nhìn về sông Hàn sẽ có nắng chiều — cần có rèm cản sáng 2 lớp hoặc kính Low-E.": tx(
        "Các căn hướng chính Tây nhìn về sông Hàn sẽ có nắng chiều — cần có rèm cản sáng 2 lớp hoặc kính Low-E.",
        "West-facing river-view units receive direct afternoon sun—look for dual blackout curtains or Low-E thermal glass.",
        "朝西看韩江的户型下午会有日照——建议选择配有双层遮光帘或 Low-E 隔热玻璃的房源。",
        "Квартиры с видом на реку на Западе получают яркое солнце после обеда — нужны шторы блэкаут или стекла Low-E.",
        "한강을 바라보는 서향 호실은 오후 햇살이 강하므로 2중 암막 커튼이나 Low-E 유리가 있는지 확인합니다.",
        "ハン川向きの西向き住戸は西日が入るため、二重遮光カーテンやLow-Eガラスの有無を確認します。"
      ),
      "Kiểm tra quy định nuôi thú cưng (The Monarchy cho phép, Hiyori không cho phép) và đơn giá điện EVN.": tx(
        "Kiểm tra quy định nuôi thú cưng (The Monarchy cho phép, Hiyori không cho phép) và đơn giá điện EVN.",
        "Confirm building pet policies (permitted in The Monarchy, prohibited in Hiyori) and official EVN electricity rates.",
        "确认大楼宠物规定（The Monarchy 允许养宠物，Hiyori 禁止）以及国家电网 EVN 电费标准。",
        "Уточнить правила по животным (разрешены в The Monarchy, запрещены в Hiyori) и тарифы EVN.",
        "건물별 반려동물 규정(더 모나키 가능, 히요리 불가)과 국가 표준 EVN 전기요금을 확인합니다.",
        "ペット規約（The Monarchyは可、Hiyoriは不可）およびEVN電気料金を確認します。"
      ),

      // Building Index Card Fields (/guides)
      "Tổ hợp mới bàn giao / Tier A": tx("Tổ hợp mới bàn giao / Tier A", "Newly Handed Over / Tier A", "全新交付综合体 / Tier A", "Новый комплекс / Tier A", "신축 랜드마크 / Tier A", "新築レジデンス / Tier A"),
      "Boutique Luxury / Tier A+": tx("Boutique Luxury / Tier A+", "Boutique Luxury / Tier A+", "顶奢江景地标 / Tier A+", "Бутик-люкс / Tier A+", "부티크 럭셔리 / Tier A+", "ブティック・ラグジュアリー / Tier A+"),
      "Tiêu chuẩn Nhật Bản / Tier A": tx("Tiêu chuẩn Nhật Bản / Tier A", "Japanese Standard / Tier A", "日本物业标准 / Tier A", "Японский стандарт / Tier A", "일본식 관리 표준 / Tier A", "日系管理基準 / Tier A"),
      "Khu cộng đồng Expat / Tier B+": tx("Khu cộng đồng Expat / Tier B+", "Expat Community / Tier B+", "国际社区与宠物友好 / Tier B+", "Экспат-комьюнити / Tier B+", "글로벌 커뮤니티 / Tier B+", "国際コミュニティ / Tier B+"),
      "Căn hộ dịch vụ thiết kế / Tier A-": tx("Căn hộ dịch vụ thiết kế / Tier A-", "Architect Serviced Lofts / Tier A-", "设计师服务式公寓 / Tier A-", "Дизайнерские лофты / Tier A-", "디자이너 서비스드 로프트 / Tier A-", "デザイナーズ・サービスアパート / Tier A-"),
      "Ngũ Hành Sơn / Trần Thị Lý": tx("Ngũ Hành Sơn / Trần Thị Lý", "Ngu Hanh Son / Tran Thi Ly Bridge", "五行山郡 / 陈氏李桥畔", "Нгуханьшон / Мост Чан Тхи Ли", "응우한선 / 쩐티리 대교", "グーハインソン / チャンティリー橋"),
      "Hải Châu (Bờ Tây Sông Hàn)": tx("Hải Châu (Bờ Tây Sông Hàn)", "Hai Chau (West Han Riverfront)", "海洲郡 (韩江西岸)", "Хайтяу (Западный берег р. Хан)", "하이쩌우 (한강 서안)", "ハイチャウ（ハン川西岸）"),
      "Sơn Trà (Đường Võ Văn Kiệt)": tx("Sơn Trà (Đường Võ Văn Kiệt)", "Son Tra (Vo Van Kiet Blvd)", "山茶郡 (武文杰大道)", "Шонча (бульвар Во Ван Киет)", "선짜 (보반끼엣 대로)", "ソンチャ（ヴォーバンキエット通り）"),
      "Sơn Trà (Bờ Đông Sông Hàn)": tx("Sơn Trà (Bờ Đông Sông Hàn)", "Son Tra (East Han Riverfront)", "山茶郡 (韩江东岸)", "Шонча (Восточный берег р. Хан)", "선짜 (한강 동안)", "ソンチャ（ハン川東岸）"),
      "An Thượng (Ngũ Hành Sơn)": tx("An Thượng (Ngũ Hành Sơn)", "An Thuong (My Khe Beach Quarter)", "安上街区 (美溪海滩旁)", "Ан Тхыонг (у пляжа Ми Кхе)", "안트엉 (미케비치 타운)", "アントゥオン（ミーケービーチ地区）"),
      "Chỉ có căn 2PN & 3PN": tx("Chỉ có căn 2PN & 3PN", "2BR & 3BR Only", "仅设 2居室与 3居室", "Только 2 и 3 спальни", "2베드룸 & 3베드룸 전용", "2LDK・3LDKのみ"),
      "Biệt thự $1,500+": tx("Biệt thự $1,500+", "Villas $1,500+", "独栋别墅 $1,500+", "Виллы $1,500+", "풀빌라 $1,500+", "ヴィラ $1,500+"),
      "Hồ bơi vô cực view sông, Phòng Gym, Kid Club, An ninh 3 lớp": tx("Hồ bơi vô cực view sông, Phòng Gym, Kid Club, An ninh 3 lớp", "River-view Infinity Pool, Fitness Center, Kids Club, 3-Tier Security", "江景无边泳池、健身房、儿童俱乐部、三层安保", "Инфинити-бассейн с видом на реку, спортзал, детский клуб, охрана 24/7", "리버뷰 인피니티 풀, 피트니스, 키즈클럽, 3중 보안", "リバービュー・インフィニティプール、ジム、キッズクラブ、3重セキュリティ"),
      "Hồ bơi nước ấm tầng thượng, Phòng Gym Technogym, Sauna hồng ngoại": tx("Hồ bơi nước ấm tầng thượng, Phòng Gym Technogym, Sauna hồng ngoại", "Heated Rooftop Infinity Pool, Technogym Studio, Infrared Sauna", "屋顶恒温无边泳池、Technogym 健身房、红外线桑拿", "Теплый бассейн на крыше, зал Technogym, инфракрасная сауна", "루프탑 온수 인피니티 풀, 테크노짐 피트니스, 적외선 사우나", "屋上温水インフィニティプール、Technogym、赤外線サウナ"),
      "Hồ bơi trong nhà, Quản lý Nhật Bản, Lễ tân 24/7, Công viên nội khu": tx("Hồ bơi trong nhà, Quản lý Nhật Bản, Lễ tân 24/7, Công viên nội khu", "Indoor Heated Pool, Japanese Management, 24/7 Reception, Internal Park", "室内泳池、日本物业管理、24/7 前台、社区公园", "Крытый бассейн, японское управление, ресепшн 24/7, парк", "실내 수영장, 일본식 관리, 24시간 리셉션, 단지 내 공원", "屋内プール、日系管理、24時間フロント、敷地内公園"),
      "Hồ bơi sân vườn lớn, Chuỗi cà phê & Siêu thị tầng trệt, Khu vui chơi": tx("Hồ bơi sân vườn lớn, Chuỗi cà phê & Siêu thị tầng trệt, Khu vui chơi", "Large Garden Pool, Ground-Floor Cafes & Supermarkets, Playground", "大型花园泳池、底商咖啡馆与超市、儿童游乐区", "Большой бассейн в саду, кафе и супермаркеты на 1 этаже", "대형 가든 풀, 1층 카페 & 슈퍼마켓, 어린이 놀이터", "大型ガーデンプール、1階カフェ＆スーパー、キッズエリア"),
      "Sân thượng ngắm biển, Không gian Coworking, Dọn phòng hàng tuần": tx("Sân thượng ngắm biển, Không gian Coworking, Dọn phòng hàng tuần", "Ocean-View Rooftop Terrace, Coworking Lounge, Weekly Housekeeping", "海景屋顶露台、共享办公空间、每周免费保洁", "Терраса на крыше с видом на океан, коворкинг, уборка раз в неделю", "오션뷰 루프탑 테라스, 코워킹 라운지, 주 1회 청소 포함", "オーシャンビュー屋上テラス、コワーキング、週1回清掃付き"),

      // Apartment Detail & Utility Fields (100% 6-Language Coverage)
      "Giá nhà nước (EVN)": tx("Giá nhà nước (EVN)", "Official State EVN Rate", "越南国家电网标准电价 (EVN)", "Гос. тариф EVN", "국가 표준 전기요금 (EVN)", "国営EVN標準電気料金"),
      "Giá nhà nước (EVN ~2,800đ/kWh)": tx("Giá nhà nước (EVN ~2,800đ/kWh)", "State EVN Rate (~2,800 VND/kWh)", "越南国家电网标准电价 (EVN ~2,800越盾/度)", "Гос. тариф EVN (~2,800 донгов/кВт·ч)", "국가 표준 EVN 전기요금 (~2,800동/kWh)", "国営EVN標準電気料金（約2,800VND/kWh）"),
      "State Rate (EVN)": tx("Giá nhà nước (EVN)", "Official State EVN Rate", "越南国家电网标准电价 (EVN)", "Гос. тариф EVN", "국가 표준 전기요금 (EVN)", "国営EVN標準電気料金"),
      "3,800đ/kWh (Miễn phí nước & dọn phòng 1 lần/tuần)": tx("3,800đ/kWh (Miễn phí nước & dọn phòng 1 lần/tuần)", "3,800 VND/kWh (Free water & weekly cleaning)", "3,800越盾/度（免水费及每周1次保洁）", "3,800 донгов/кВт·ч (вода и уборка раз в неделю бесплатно)", "3,800동/kWh (수도 무료 & 주 1회 청소 포함)", "3,800VND/kWh（水道無料・週1回清掃付き）"),
      "Bàn làm việc cạnh kính lớn + Cáp quang 300Mbps": tx("Bàn làm việc cạnh kính lớn + Cáp quang 300Mbps", "Window-side Work Desk + 300Mbps Fiber", "落地窗旁独立办公桌 + 300Mbps 光纤", "Рабочий стол у панорамного окна + оптоволокно 300 Мбит/с", "통창 옆 업무용 데스크 + 300Mbps 광랜", "窓際ワークデスク＋300Mbps高速光回線"),
      "Phòng làm việc phụ + Ghế công thái học": tx("Phòng làm việc phụ + Ghế công thái học", "Dedicated Study Room + Ergonomic Chair", "独立书房办公间 + 人体工学椅", "Отдельный кабинет + эргономичное кресло", "전용 서재 작업실 + 인체공학 의자", "専用書斎ルーム＋エルゴノミクスチェア"),
      "Bàn làm việc đôi + Cách âm 2 lớp": tx("Bàn làm việc đôi + Cách âm 2 lớp", "Dual Executive Desk + Double Acoustic Glazing", "双人宽敞办公桌 + 双层隔音玻璃", "Двойной рабочий стол + двухслойная звукоизоляция", "2인용 와이드 데스크 + 2중 방음 유리", "デュアルデスク＋二重防音ガラス"),
      "Bàn gỗ tần bì nguyên tấm + Wi-Fi 6": tx("Bàn gỗ tần bì nguyên tấm + Wi-Fi 6", "Solid Ash Wood Desk + Dedicated Wi-Fi 6", "整板白蜡木工作台 + 独立 Wi-Fi 6", "Стол из массива ясеня + Wi-Fi 6", "통원목 데스크 + 전용 Wi-Fi 6", "無垢アッシュ材デスク＋専用Wi-Fi 6"),
      "Góc làm việc yên tĩnh + Kính cách âm 3 lớp": tx("Góc làm việc yên tĩnh + Kính cách âm 3 lớp", "Quiet Study Nook + Triple Acoustic Glass", "安静办公角 + 三层隔音玻璃", "Тихая рабочая зона + трехслойный стеклопакет", "조용한 업무 공간 + 3중 방음 유리", "静かなワークスペース＋三重防音ガラス"),
      "Bàn làm việc gỗ sồi trắng + Mạng FPT riêng": tx("Bàn làm việc gỗ sồi trắng + Mạng FPT riêng", "White Oak Work Desk + Private FPT Fiber", "白橡木办公桌 + 独立 FPT 光纤专线", "Дубовый рабочий стол + выделенный интернет FPT", "화이트 오크 데스크 + 전용 FPT 광랜", "ホワイトオーク材デスク＋専用FPT光回線"),
      "Bàn làm việc trong phòng ngủ phụ": tx("Bàn làm việc trong phòng ngủ phụ", "Workstation in Secondary Bedroom", "次卧配备独立办公桌椅", "Рабочий стол во второй спальне", "서브 침실 내 전용 업무 데스크", "セカンドベッドルーム内ワークデスク"),
      "Bàn làm việc cạnh cửa sổ + Wi-Fi Mesh": tx("Bàn làm việc cạnh cửa sổ + Wi-Fi Mesh", "Sunlit Window Desk + Mesh Wi-Fi System", "窗边采光办公桌 + 全屋 Mesh Wi-Fi", "Стол у окна + система Mesh Wi-Fi", "창가 채광 데스크 + 메시 Wi-Fi", "窓際デスク＋メッシュWi-Fi完備"),
      "Bàn kiến trúc sư rộng 1.6m + Giá đỡ màn hình rời": tx("Bàn kiến trúc sư rộng 1.6m + Giá đỡ màn hình rời", "1.6m Architect Desk + Monitor Arm Mount", "1.6米宽建筑师工作台 + 显示器支架", "Широкий стол архитектора 1.6 м + кронштейн для монитора", "1.6m 와이드 데스크 + 모니터 암 거치대", "幅1.6mワイドデスク＋モニターアーム付き"),
      "Phòng làm việc riêng nhìn ra hồ bơi": tx("Phòng làm việc riêng nhìn ra hồ bơi", "Private Pool-View Study Room", "面朝泳池的独立书房办公室", "Отдельный кабинет с видом на бассейн", "수영장이 보이는 독립 서재", "プールを望む専用書斎ルーム"),
      "Dedicated Work Desk + High-Speed Fiber": tx("Bàn làm việc riêng + Cáp quang tốc độ cao", "Dedicated Work Desk + High-Speed Fiber", "独立办公桌 + 高速光纤网络", "Рабочий стол + скоростное оптоволокно", "전용 업무 데스크 + 초고속 광랜", "専用ワークデスク＋高速光ファイバー"),
      "Cho phép nuôi thú cưng": tx("Cho phép nuôi thú cưng", "Pet Friendly (Allowed)", "允许饲养宠物", "Можно с питомцами", "반려동물 동반 가능", "ペット飼育可"),
      "Cho nuôi thú cưng (Pet-Friendly)": tx("Cho nuôi thú cưng (Pet-Friendly)", "Pet Friendly (Allowed)", "宠物友好（允许饲养）", "Можно с питомцами (Pet-Friendly)", "반려동물 동반 가능 (Pet-Friendly)", "ペット飼育可（ペットフレンドリー）"),
      "Cho nuôi chó mèo (Pet-Friendly)": tx("Cho nuôi chó mèo (Pet-Friendly)", "Cats & Dogs Welcome (Pet-Friendly)", "允许养猫狗（宠物友好）", "Можно с кошками и собаками", "강아지·고양이 동반 가능", "犬・猫飼育可（ペットフレンドリー）"),
      "Cho nuôi mèo sạch sẽ": tx("Cho nuôi mèo sạch sẽ", "Indoor Cats Permitted", "允许饲养爱干净的猫咪", "Разрешены аккуратные кошки", "실내 반려묘 동반 가능", "室内猫飼育可"),
      "Cho nuôi thú cưng nhỏ": tx("Cho nuôi thú cưng nhỏ", "Small Pets Permitted", "允许饲养小型宠物", "Разрешены небольшие питомцы", "소형 반려동물 가능", "小型ペット飼育可"),
      "Thoải mái nuôi thú cưng": tx("Thoải mái nuôi thú cưng", "Pets Welcome (Large Garden)", "欢迎携带宠物（私家花园）", "Питомцы приветствуются", "반려동물 자유 동반 가능", "ペット歓迎（専用庭付き）"),
      "Cho phép nuôi mèo / cún nhỏ": tx("Cho phép nuôi mèo / cún nhỏ", "Cats & Small Dogs Permitted", "允许饲养猫咪 / 小型犬", "Можно с кошками / небольшими собаками", "고양이 / 소형견 동반 가능", "猫・小型犬飼育可"),
      "Cho phép thú cưng (Có công viên nội khu)": tx("Cho phép thú cưng (Có công viên nội khu)", "Pet Friendly (Internal Park)", "允许宠物（设有社区公园）", "Можно с питомцами (есть парк)", "반려동물 가능 (단지 내 공원)", "ペット可（敷地内公園あり）"),
      "Không nuôi thú cưng": tx("Không nuôi thú cưng", "No Pets Allowed", "禁止饲养宠物", "Без животных", "반려동물 불가", "ペット不可"),
      "Không nuôi thú cưng (Quy định tòa nhà)": tx("Không nuôi thú cưng (Quy định tòa nhà)", "No Pets (Building Policy)", "禁止宠物（大楼物业规定）", "Без животных (правила дома)", "반려동물 불가 (건물 규정)", "ペット不可（建物規約）"),
      "Thương lượng": tx("Thương lượng", "Case-by-Case Approval", "视情况协商", "По согласованию", "협의 가능", "応相談"),
      "Thương lượng với chủ nhà": tx("Thương lượng với chủ nhà", "Negotiable with Landlord", "可与房东协商", "По согласованию с собственником", "집주인과 협의 가능", "オーナーと相談可能"),
      "Ask Curator": tx("Thương lượng với chủ nhà", "Case-by-Case Approval", "可与顾问协商", "По согласованию", "담당자 문의", "応相談"),
      "Thương lượng theo hồ sơ khách": tx("Thương lượng theo hồ sơ khách", "Case-by-Case Tenant Profile", "根据租客情况协商", "По согласованию с собственником", "임차인 프로필에 따라 협의", "入居者プロフィールにより応相談"),
      "Tuỳ chủ nhà (Mèo/Chó nhỏ)": tx("Tuỳ chủ nhà (Mèo/Chó nhỏ)", "Case-by-Case (Cats / Small Dogs)", "视房东而定（猫/小型犬）", "По согласованию (кошки/малые собаки)", "집주인 협의 (고양이/소형견)", "オーナー相談（猫・小型犬）"),
      "West-North / View sông Hàn": tx("Tây Bắc / View sông Hàn", "Northwest / Han River View", "西北向 / 韩江全景", "Северо-Запад / Вид на реку Хан", "북서향 / 한강 뷰", "北西向き / ハン川ビュー"),
      "Đông Nam / View biển Mỹ Khê": tx("Đông Nam / View biển Mỹ Khê", "Southeast / My Khe Ocean View", "东南向 / 美溪海景", "Юго-Восток / Вид на океан Ми Кхе", "남동향 / 미케비치 오션뷰", "南東向き / ミーケービーチ眺望"),
      "Đông Bắc / Toàn cảnh thành phố & Biển": tx("Đông Bắc / Toàn cảnh thành phố & Biển", "Northeast / City & Ocean Panorama", "东北向 / 城市与海景全景", "Северо-Восток / Панорама города и океана", "북동향 / 시티 & 오션 파노라마", "北東向き / シティ＆オーシャンパノラマ"),
      "Hướng Đông / Trực diện sông Hàn": tx("Hướng Đông / Trực diện sông Hàn", "East / Direct Han Riverfront", "朝东 / 直面韩江江景", "Восток / Прямой вид на реку Хан", "동향 / 한강 정면 뷰", "東向き / ハン川正面ビュー"),
      "Đông Nam / Sông Hàn": tx("Đông Nam / Sông Hàn", "Southeast / Han River View", "东南向 / 韩江景观", "Юго-Восток / Река Хан", "남동향 / 한강 뷰", "南東向き / ハン川ビュー"),
      "Đông Bắc / View biển & Sơn Trà": tx("Đông Bắc / View biển & Sơn Trà", "Northeast / Ocean & Son Tra View", "东北向 / 海景与山茶半岛", "Северо-Восток / Океан и Шонча", "북동향 / 바다 & 선짜 반도 뷰", "北東向き / オーシャン＆ソンチャ半島眺望"),
      "Hướng Tây / Ngắm Cầu Rồng phun lửa": tx("Hướng Tây / Ngắm Cầu Rồng phun lửa", "West / Dragon Bridge Fire Show View", "朝西 / 直看龙桥喷火景观", "Запад / Вид на Мост Дракона", "서향 / 용다리 불꽃쇼 조망", "西向き / ドラゴンブリッジ眺望"),
      "Hướng Tây / Hoàng hôn sông Hàn": tx("Hướng Tây / Hoàng hôn sông Hàn", "West / Han River Sunset View", "朝西 / 韩江日落景观", "Запад / Закат над рекой Хан", "서향 / 한강 선셋 뷰", "西向き / ハン川サンセット眺望"),
      "Đông Nam / Đón gió biển": tx("Đông Nam / Đón gió biển", "Southeast / Coastal Sea Breeze", "东南向 / 迎美溪海风", "Юго-Восток / Морской бриз", "남동향 / 시원한 해풍", "南東向き / 心地よい海風"),
      "Đông Nam / Sân vườn nhiệt đới & Hồ bơi riêng": tx("Đông Nam / Sân vườn nhiệt đới & Hồ bơi riêng", "Southeast / Tropical Garden & Private Pool", "东南向 / 热带花园与私家泳池", "Юго-Восток / Тропический сад и личный бассейн", "남동향 / 트로피컬 정원 & 개인 풀", "南東向き / トロピカル庭園＆専用プール"),
      "Đông Nam": tx("Đông Nam", "Southeast", "东南向", "Юго-Восток", "남동향", "南東向き")
    };
    const translated = dict[val]
      ? dict[val]
      : val
          .replace(" / tháng", ` / ${tx("tháng", "mo", "月", "мес", "월", "月")}`)
          .replace("3,500 – 4,000đ/kWh", tx("3,500 – 4,000đ/kWh", "3,500 – 4,000 VND/kWh", "3,500 – 4,000 越盾/度", "3,500 – 4,000 донгов/кВт·ч", "3,500 ~ 4,000 VND/kWh", "3,500〜4,000 VND/kWh"))
          .replace("phút đi bộ", tx("phút đi bộ", "mins walk", "分钟步行", "мин пешком", "분 도보", "分（徒歩）"))
          .replace("phút chạy xe", tx("phút chạy xe", "mins drive", "分钟车程", "мин на авто", "분 차량 이동", "分（車）"))
          .replace("phút lái xe", tx("phút lái xe", "mins drive", "分钟车程", "мин на авто", "분 차량 이동", "分（車）"));
    return fmtCurrencyStr(translated);
  };

  const getGoogleMapHl = (l: Lang): string => {
    const map: Record<Lang, string> = {
      vi: "vi",
      en: "en",
      zh: "zh-CN",
      ru: "ru",
      ko: "ko",
      ja: "ja"
    };
    return map[l] || "en";
  };

  const trArea = (raw: string | undefined): string => {
    if (!raw || lang === "vi") return raw || "";
    const map: Record<string, string> = {
      "Ngũ Hành Sơn": tx("Ngũ Hành Sơn", "Ngu Hanh Son", "五行山郡 (Ngũ Hành Sơn)", "Нгуханьшон", "응우한선 (Ngũ Hành Sơn)", "グーハインソン区"),
      "Hải Châu": tx("Hải Châu", "Hai Chau", "海洲郡 (Hải Châu)", "Хайтяу", "하이쩌우 (Hải Châu)", "ハイチャウ区"),
      "Sơn Trà": tx("Sơn Trà", "Son Tra", "山茶郡 (Sơn Trà)", "Шонча", "선짜 (Sơn Trà)", "ソンチャ区"),
      "An Thượng": tx("An Thượng", "An Thuong", "安上街区 (An Thượng)", "Ан Тхыонг", "안트엉 (An Thượng)", "アントゥオン地区"),
      "My Khe Beachfront": tx("Biển Mỹ Khê", "My Khe Beachfront", "美溪海滨", "Пляж Ми Кхе", "미케비치 해변", "ミーケービーチ"),
      "An Thuong": tx("An Thượng", "An Thuong", "安上街区", "Ан Тхыонг", "안트엉", "アントゥオン"),
      "Son Tra": tx("Sơn Trà", "Son Tra", "山茶郡", "Шонча", "선짜", "ソンチャ"),
      "Han Riverfront": tx("Bờ sông Hàn", "Han Riverfront", "韩江畔", "Набережная реки Хан", "한강변", "ハン川リバーフロント")
    };
    return map[raw] || raw;
  };

  const getAptField = (
    apt: Apartment | null | undefined,
    field: "address" | "orientation" | "electricityRate" | "waterRate" | "petPolicy" | "remoteWorkSetup"
  ): string => {
    if (!apt) return "";
    const raw = apt[field] || "";
    if (!raw || lang === "vi") return raw;
    return apt.translations?.[lang]?.[field] || trField(raw);
  };

  const getAptTags = (apt: Apartment | null | undefined): string[] => {
    if (!apt) return [];
    const raw = apt.tags || [];
    if (lang === "vi") return raw;
    const translated = apt.translations?.[lang]?.tags;
    if (Array.isArray(translated) && translated.length === raw.length) return translated;
    return raw.map((t) => trTag(t));
  };

  const getLocalized = (field: Record<string, string> | string | undefined): string => {
    if (!field) return "";
    if (typeof field === "string") return trField(field);
    if (lang === "vi") return field.vi || field.en || "";
    if (lang === "ru") return (field.ru && field.ru !== field.vi ? field.ru : "") || field.en || field.vi || "";
    if (lang === "zh" || lang === "ko" || lang === "ja") {
      if (field[lang] && field[lang] !== field.vi) return field[lang];
      const enText = field.en || "";
      const viText = field.vi || "";
      const i18nDict: Record<string, Record<string, string>> = {
        // Apartment Titles (keyed by English & Vietnamese)
        "The Panoma 1 — 1BR Han River & Bridge View Residence": {
          zh: "The Panoma 1 — 1居室韩江与陈氏李桥全景公寓",
          ko: "더 파노마 1 — 한강 & 쩐티리 대교 뷰 1베드룸 레지던스",
          ja: "The Panoma 1 — ハン川＆チャンティリー橋ビュー 1LDK"
        },
        "The Panoma 2 — Corner 2BR Dual Ocean & River Panorama": {
          zh: "The Panoma 2 — 2居室转角海景与韩江双景公寓",
          ko: "더 파노마 2 — 오션 & 리버 파노라마 코너 2베드룸",
          ja: "The Panoma 2 — オーシャン＆リバーパノラマ角部屋 2LDK"
        },
        "The Panoma 2 — Corner 2BR My Khe Beach & City View": {
          zh: "The Panoma 2 — 2居室转角美溪海景与城市景观公寓",
          ko: "더 파노마 2 — 미케비치 & 시티뷰 코너 2베드룸",
          ja: "The Panoma 2 — ミーケービーチ＆シティビュー角部屋 2LDK"
        },
        "The Panoma — 3BR Executive Family Sky Residence": {
          zh: "The Panoma — 3居室高空全景国际家庭公寓",
          ko: "더 파노마 — 3베드룸 이그제큐티브 패밀리 스카이 레지던스",
          ja: "The Panoma — 3LDK エグゼクティブ・ファミリーレジデンス"
        },
        "The Panoma 2 — 3BR Sky Panorama Executive Suite": {
          zh: "The Panoma 2 — 3居室高空全景行政公寓",
          ko: "더 파노마 2 — 스카이 파노라마 3베드룸 이그제큐티브 스위트",
          ja: "The Panoma 2 — スカイパノラマ 3LDK エグゼクティブスイート"
        },
        "The Filmore Da Nang — Cantilevered 2BR Han River & Dragon Bridge Loft": {
          zh: "The Filmore 岘港 — 2居室悬挑阳台韩江与龙桥奢华公寓",
          ko: "더 필모어 다낭 — 한강 & 용다리 뷰 캔틸레버 발코니 2베드룸",
          ja: "The Filmore ダナン — ハン川＆ドラゴンブリッジ眺望 2LDK"
        },
        "The Filmore Da Nang — 2BR Cantilever Balcony Dragon Bridge View": {
          zh: "The Filmore 岘港 — 2居室悬挑阳台龙桥江景奢华公寓",
          ko: "더 필모어 다낭 — 용다리 리버뷰 캔틸레버 발코니 2베드룸",
          ja: "The Filmore ダナン — ドラゴンブリッジ眺望 2LDK ラグジュアリー"
        },
        "The Filmore Da Nang — 1BR Bespoke Executive River Suite": {
          zh: "The Filmore 岘港 — 1居室韩江畔高管定制奢华公寓",
          ko: "더 필모어 다낭 — 한강변 비스포크 이그제큐티브 1베드룸",
          ja: "The Filmore ダナン — ハン川リバーフロント 1LDK スイート"
        },
        "Hiyori Garden Tower — Minimalist Japanese Wabi-Sabi 2BR Sanctuary": {
          zh: "Hiyori Garden Tower — 日式侘寂风 2居室海景公寓",
          ko: "히요리 가든 타워 — 일본식 미니멀 와비사비 2베드룸",
          ja: "Hiyori Garden Tower — 日系管理・侘び寂びスタイル 2LDK"
        },
        "Hiyori Garden Tower — Mid-Floor 2BR Dragon Bridge View": {
          zh: "Hiyori Garden Tower — 中高层龙桥景观 2居室公寓",
          ko: "히요리 가든 타워 — 용다리 뷰 중층 2베드룸 아파트",
          ja: "Hiyori Garden Tower — ドラゴンブリッジ眺望 2LDK"
        },
        "The Monarchy Block B — 2BR Riverfront Garden Residence": {
          zh: "The Monarchy B座 — 2居室韩江畔花园宠物友好公寓",
          ko: "더 모나키 B동 — 한강변 가든뷰 반려동물 친화 2베드룸",
          ja: "The Monarchy B棟 — ハン川沿いガーデン 2LDK（ペット可）"
        },
        "The Monarchy B — 2BR Pet-Friendly Riverfront Residence": {
          zh: "The Monarchy B — 2居室韩江日落宠物友好公寓",
          ko: "더 모나키 B — 반려동물 동반 가능 한강뷰 2베드룸",
          ja: "The Monarchy B — ペット可・ハン川サンセット眺望 2LDK"
        },
        "An Thuong Atelier — Brutalist Concrete & Teak Studio (350m to My Khe Beach)": {
          zh: "安上建筑师工坊 — 清水混凝土与柚木设计师公寓（距美溪海滩 350米）",
          ko: "안트엉 아틀리에 — 노출 콘크리트 & 티크우드 스튜디오 (미케비치 350m)",
          ja: "アントゥオン・アトリエ — コンクリート＆チーク材スタジオ（ビーチ350m）"
        },
        "An Thuong Architect Loft — 1BR Walk-to-Beach Studio Suite": {
          zh: "安上建筑师 Loft — 步行3分钟到美溪海滩 1居室公寓",
          ko: "안트엉 아키텍트 로프트 — 미케비치 도보 3분 1베드룸",
          ja: "アントゥオン建築ロフト — ミーケービーチ徒歩3分 1LDK"
        },
        "Nam Viet A Private Pool Architectural Villa — 3BR Sanctuary": {
          zh: "南越亚私家泳池建筑别墅 — 3居室热带花园静谧居所",
          ko: "남비엣아 프라이빗 풀 건축 빌라 — 3베드룸 정원 풀빌라",
          ja: "ナムベトア専用プール付き建築ヴィラ — 3LDK プライベート邸宅"
        },
        "Nam Viet A Tropical Pool Villa — 3BR Private Courtyard & Saltwater Pool": {
          zh: "南越亚热带泳池别墅 — 3居室私家花园与盐水泳池",
          ko: "남비엣아 트로피컬 풀빌라 — 프라이빗 해수풀 & 정원 3베드룸",
          ja: "ナムベトア・トロピカルプールヴィラ — 専用塩水プール付き 3LDK"
        },
        "Peninsula Ocean Studio — Travertine & White Oak Coastal Suite": {
          zh: "半岛海景公寓 — 洞石与白橡木海滨套房",
          ko: "페닌슐라 오션 스튜디오 — 트래버틴 & 화이트 오크 해변 스위트",
          ja: "ペニンシュラ・オーシャンスタジオ — トラバーチン＆白オーク海辺スイート"
        },

        // Apartment Architectural Descriptions (architecturalNotes)
        "Inspired by traditional Cam Ne mat weaving with full-height Low-E acoustic glass overlooking the Han River. 5 minutes to My Khe Beach.": {
          zh: "设计灵感源自传统锦泥席编织艺术，配备直通天花板的 Low-E 隔音落地玻璃，直面韩江开阔江景，距离美溪海滩仅 5 分钟车程。",
          ko: "전통 공예에서 영감을 받은 디자인과 천장까지 닿는 Low-E 방음 통유리를 통해 탁 트인 한강 뷰를 선사합니다. 미케비치까지 차량 5분 거리입니다.",
          ja: "伝統工芸に着想を得たデザインと天井までのLow-E防音ガラスを備え、ハン川のパノラマを一望。ミーケービーチまで車でわずか5分です。"
        },
        "High-floor corner unit capturing morning ocean light, wrap-around balcony, white oak joinery, and integrated Bosch kitchen.": {
          zh: "24层高层转角户型，尽享美溪海滩清晨阳光，拥有环绕式宽敞阳台、天然白橡木定制家具以及全套嵌入式博世（Bosch）厨房设备。",
          ko: "24층 고층 코너 호실로 미케비치의 아침 햇살을 가득 담으며, 긴 발코니와 천연 화이트 오크 가구, 보쉬(Bosch) 빌트인 주방이 완비되어 있습니다.",
          ja: "24階の高層角部屋で朝の海光をたっぷり取り込み、ロングバルコニー、天然ホワイトオーク家具、Bosch製ビルトインキッチンを備えています。"
        },
        "Rare 102m² 3-bedroom layout where every bedroom enjoys full daylight glazing, dedicated laundry utility room, and quartz kitchen island.": {
          zh: "罕见的 102m² 三居室格局，每间卧室均设有大面积采光窗，配备独立洗衣烘干房与石英石厨房中岛，非常适合家庭长租。",
          ko: "희소성 높은 102m² 3베드룸 구조로 모든 침실에 대형 채광창이 나 있으며, 별도의 세탁·건조실과 천연 석영 아일랜드 식탁을 갖추고 있습니다.",
          ja: "希少な102m²の3ベッドルーム。全寝室に大きな採光窓があり、専用ランドリールームとクォーツ製キッチンアイランドを備えたファミリー向け邸宅です。"
        },
        "Boutique luxury landmark on the West bank of the Han River featuring cantilevered balconies, rooftop heated infinity pool, and infrared sauna.": {
          zh: "坐落于韩江西岸的顶奢地标公寓，拥有无柱悬挑观景阳台、屋顶恒温无边泳池以及红外线桑拿房。",
          ko: "한강 서안의 최고급 부티크 랜드마크 타워로 기둥 없는 캔틸레버 발코니, 루프탑 온수 인피니티 풀, 적외선 사우나 시설을 자랑합니다.",
          ja: "ハン川西岸の最高級ブティックタワー。柱のないキャンチレバーバルコニー、屋上温水インフィニティプール、赤外線サウナを完備しています。"
        },
        "Tailored for solo executives or couples working in central Hai Chau, steps away from the Bach Dang riverfront promenade.": {
          zh: "专为在海洲市中心工作的单身外籍高管或情侣打造，下楼仅需 30 步即可抵达白藤江畔步行街。",
          ko: "하이쩌우 도심에서 근무하는 1인 전문가나 커플에게 완벽한 공간으로, 박당(Bạch Đằng) 강변 산책로가 도보 30보 거리에 있습니다.",
          ja: "ハイチャウ中心部で働く単身エグゼクティブやカップルに最適。バクダン川沿い遊歩道までわずか徒歩30歩の好立地です。"
        },
        "Japanese-managed residential tower on Vo Van Kiet Boulevard offering immaculate maintenance, 24/7 bilingual reception, and a 10-minute walk to My Khe Beach.": {
          zh: "位于武文杰大道的纯正日本物业管理公寓，环境极致整洁安全，提供 24/7 双语前台服务，直行步行约 10 分钟即达美溪海滩。",
          ko: "보반끼엣 대로의 일본식 관리 레지던스로 완벽한 청결도와 보안을 자랑하며, 24시간 리셉션과 미케비치 도보 10분 거리를 제공합니다.",
          ja: "ヴォーバンキエット通りに位置する日系管理タワー。徹底した清掃とセキュリティ、24時間フロント対応で、ミーケービーチまで徒歩約10分です。"
        },
        "Best-value 2-bedroom unit in Hiyori complete with washer-dryer, bathtub, blackout curtains, and direct Dragon Bridge views.": {
          zh: "Hiyori 极具性价比的两居室房源，配齐洗烘一体机、浴缸、双层遮光窗帘，阳台可直接欣赏龙桥全景。",
          ko: "히요리 내 최고의 가성비를 자랑하는 2베드룸 호실로 세탁·건조기, 욕조, 2중 암막 커튼 및 용다리 직조망 발코니를 갖추고 있습니다.",
          ja: "Hiyori内で最もコストパフォーマンスに優れた2LDK。洗濯乾燥機、バスタブ、二重遮光カーテンを備え、バルコニーからドラゴンブリッジを一望できます。"
        },
        "Vibrant expat community complex with resort pool, ground-floor cafés, and supermarkets. Flexible 3+ month leases and pet-friendly.": {
          zh: "充满活力的国际化社区综合体，一层即有大型花园泳池、超市、咖啡馆与药房。支持 3 个月起灵活租期，且对宠物十分友好。",
          ko: "대형 리조트 풀, 1층 카페, 마트, 약국이 갖춰진 활기찬 외국인 커뮤니티 단지입니다. 3개월 이상 유연한 계약과 반려동물 동반이 가능합니다.",
          ja: "大型プールや1階のカフェ、スーパー、薬局が揃う活気ある外国人コミュニティ複合施設。3ヶ月からの柔軟な契約とペット飼育が可能です。"
        },
        "Tucked in a quiet cul-de-sac of An Thuong expat quarter, 4-minute walk to My Khe Beach and steps from specialty coffee roasteries.": {
          zh: "隐于安上外国人街区的安静内巷，步行 4 分钟即达美溪海滩，出门 50 米便是精品咖啡烘焙馆与共享办公空间。",
          ko: "안트엉 외국인 거리의 조용한 골목에 위치하며 미케비치까지 도보 4분, 스페셜티 카페와 코워킹 스페이스까지 50m 거리입니다.",
          ja: "アントゥオン外国人街の静かな路地に位置し、ミーケービーチまで徒歩4分。スペシャルティカフェやコワーキングスペースへも歩いてすぐです。"
        },
        "Modern tropical architectural villa with private saltwater pool, enclosed garage, and lush courtyard near international schools.": {
          zh: "现代热带建筑风格独栋别墅，拥有私家盐水泳池、封闭式车库与静谧花园，毗邻韩江与国际学校。",
          ko: "개인 해수 수영장, 실내 차고, 푸른 정원을 갖춘 모던 트로피컬 건축 풀빌라로 한강 및 국제학교와 인접해 있습니다.",
          ja: "専用塩水プール、屋内ガレージ、緑豊かな中庭を備えたモダントロピカル建築ヴィラ。ハン川やインターナショナルスクールにも近い静かな環境です。"
        }
      };
      if (i18nDict[enText] && i18nDict[enText][lang]) {
        return i18nDict[enText][lang];
      }
      if (i18nDict[viText] && i18nDict[viText][lang]) {
        return i18nDict[viText][lang];
      }
    }
    return field.en || field.vi || "";
  };

  // Universal USD <-> VND Currency Converter for Numbers, Pins & Text Ranges
  const fmtCurrencyStr = (str: string): string => {
    if (!str || currency === "USD") return str;
    const unit = lang === "vi" ? "tr" : "M";
    return str.replace(/\$([0-9,]+)(\+?)/g, (match, numStr, plus) => {
      const usd = Number(String(numStr).replace(/,/g, ""));
      if (!usd || usd <= 0) return match;
      const m = ((usd * 25480) / 1000000).toFixed(1).replace(/\.0$/, "");
      return `${m}${unit}${plus || ""} ₫`;
    });
  };

  const formatPinPrice = (usdVal: number, hasPlus = false): string => {
    if (currency === "VND") {
      const m = ((usdVal * 25480) / 1000000).toFixed(1).replace(/\.0$/, "");
      const unit = lang === "vi" ? "tr" : "M";
      return `${m}${unit}${hasPlus ? "+" : ""} ₫`;
    }
    return `$${Number(usdVal).toLocaleString()}${hasPlus ? "+" : ""}`;
  };

  const formatPrice = (apt: Apartment): string => {
    const perMo = tx("tháng", "mo", "月", "мес", "월", "月");
    if (currency === "VND") {
      const m = ((apt.priceVnd || apt.priceUsd * 25480) / 1000000).toFixed(1);
      const unit = lang === "vi" ? "tr" : "M";
      return `${m}${unit} ₫ / ${perMo}`;
    }
    return `$${Number(apt.priceUsd).toLocaleString()} / ${perMo}`;
  };

  const toggleSave = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    setSavedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const showcaseUnits = React.useMemo(() => {
    if (showcaseBldgFilter === "all") return apartments;
    return apartments.filter((a) =>
      (a.building || "").toLowerCase().includes(showcaseBldgFilter.toLowerCase())
    );
  }, [apartments, showcaseBldgFilter]);

  const activeShowcaseAptIdx = Math.max(0, showcaseUnits.findIndex((apt) => apt.code === showcaseAptCode));
  const activeShowcaseApt = showcaseUnits[activeShowcaseAptIdx] || apartments[0];
  const heroMapLocations = React.useMemo(() => {
    const locations = new Map<string, { point: [number, number]; units: Apartment[] }>();
    for (const apt of apartments) {
      const point = getExactLocation(apt);
      if (!point) continue;
      const key = JSON.stringify([apt.building, ...point]);
      const location = locations.get(key);
      if (location) location.units.push(apt);
      else locations.set(key, { point, units: [apt] });
    }
    return [...locations.values()];
  }, [apartments]);
  const heroPinUnits = heroMapLocations.find(({ units }) => units.includes(activeShowcaseApt))?.units ?? [];

  const homeCatalogueUnits = React.useMemo(() => {
    if (homeChipFilter === "all") return apartments;
    if (homeChipFilter === "saved") return apartments.filter((a) => savedCodes.includes(a.code));
    if (homeChipFilter === "1" || homeChipFilter === "2" || homeChipFilter === "3") {
      const br = Number(homeChipFilter);
      return apartments.filter((a) => a.bedrooms != null && (br === 3 ? a.bedrooms >= 3 : a.bedrooms === br));
    }
    return apartments.filter((a) =>
      (a.tags || []).some((t) => t.toLowerCase().includes(homeChipFilter.toLowerCase()))
    );
  }, [apartments, homeChipFilter, savedCodes]);

  const filteredApartments = React.useMemo(() => {
    let list = [...apartments];
    if (area !== "all") {
      list = list.filter((a) => (a.areaName || "").toLowerCase().includes(area.toLowerCase()));
    }
    if (bedrooms !== "all") {
      const br = Number(bedrooms);
      list = list.filter((a) => a.bedrooms != null && (br >= 3 ? a.bedrooms >= 3 : a.bedrooms === br));
    }
    if (maxPrice !== "0" && Number(maxPrice) > 0) {
      list = list.filter((a) => Number(a.priceUsd) <= Number(maxPrice));
    }
    if (tag !== "all") {
      list = list.filter((a) =>
        (a.tags || []).some((t) => t.toLowerCase().includes(tag.toLowerCase()))
      );
    }
    if (query.trim() !== "") {
      const q = query.trim().toLowerCase();
      list = list.filter((a) => {
        const t = getLocalized(a.title).toLowerCase();
        const b = (a.building || "").toLowerCase();
        const c = (a.code || "").toLowerCase();
        const ar = (a.areaName || "").toLowerCase();
        return t.includes(q) || b.includes(q) || c.includes(q) || ar.includes(q);
      });
    }
    if (sort === "price-asc") list.sort((a, b) => a.priceUsd - b.priceUsd);
    else if (sort === "price-desc") list.sort((a, b) => b.priceUsd - a.priceUsd);
    else if (sort === "size-desc") list.sort((a, b) => (b.sizeM2 || 0) - (a.sizeM2 || 0));
    return list;
  }, [apartments, area, bedrooms, maxPrice, tag, query, sort, lang]);

  const expandMapUnits = route === "/apartments" ? filteredApartments : apartments;
  const expandMapAptIdx = Math.max(0, expandMapUnits.findIndex((apt) => apt.code === expandMapAptCode));
  const expandDialogApt = expandMapUnits[expandMapAptIdx];
  const detailDialogApt = apartments.find((apt) => apt.code === inquiryApartmentCode);
  const apartmentInquiryUnavailable = apartmentInquiryState === "unavailable" || !canRequestApartment(detailDialogApt);
  const apartmentInquirySubmitting = apartmentInquiryState === "submitting";
  const apartmentInquiryReceived = apartmentInquiryState === "received";
  const apartmentInquiryIsReservation = apartmentInquiryType === "reservation";

  const locationLabel = (apt: Apartment) => {
    if (getExactLocation(apt)) return tx("Vị trí đã xác minh", "Verified location", "已验证位置", "Подтверждённая точка", "확인된 위치", "確認済みの位置");
    if (apt.address?.trim()) return tx("Địa chỉ chưa ghim chính xác", "Address without a verified pin", "地址尚未精确标注", "Адрес без подтверждённой точки", "핀 미확인 주소", "ピン未確認の住所");
    if (getAddressSearchUrl(apt)) return tx("Chỉ có thông tin khu vực", "Area information only", "仅提供区域信息", "Известен только район", "지역 정보만 제공", "エリア情報のみ");
    return tx("Chưa có thông tin vị trí", "Location unavailable", "暂无位置信息", "Местоположение неизвестно", "위치 정보 없음", "所在地情報なし");
  };

  const createMapPopup = (apt: Apartment) => {
    const content = document.createElement("div");
    content.style.display = "flex";
    content.style.flexDirection = "column";
    content.style.gap = "4px";
    const title = document.createElement("strong");
    title.textContent = getLocalized(apt.title);
    const address = document.createElement("div");
    address.style.fontSize = "0.78rem";
    address.style.color = "#475569";
    address.textContent = `📍 ${getAptField(apt, "address").trim() || apt.building?.trim() || trArea(apt.areaName)}`;
    content.append(title, address);
    const gmapUrl = getAddressSearchUrl(apt);
    if (gmapUrl) {
      const mapLink = document.createElement("a");
      mapLink.href = gmapUrl;
      mapLink.target = "_blank";
      mapLink.rel = "noreferrer";
      mapLink.style.fontSize = "0.75rem";
      mapLink.style.fontWeight = "600";
      mapLink.style.color = "#9a7b4f";
      mapLink.textContent = tx("Mở địa chỉ trên Google Maps ↗", "Open address in Google Maps ↗", "在 Google 地图打开地址 ↗", "Открыть адрес в Google Maps ↗", "Google 지도에서 주소 열기 ↗", "Googleマップで住所を開く ↗");
      content.append(mapLink);
    }
    return content;
  };

  // Hero Showcase Map (#hero-showcase-map) — Dynamically Switches Map Tile Language (hl=vi, en, zh-CN, ru, ko, ja)
  useEffect(() => {
    if (route !== "/" || showcaseMode === "photo" || typeof L === "undefined" || apartments.length === 0) {
      heroMapRef.current?.remove();
      heroMapRef.current = null;
      return;
    }
    const el = document.getElementById("hero-showcase-map");
    if (!el) return;

    if (!heroMapRef.current) {
      heroMapRef.current = L.map("hero-showcase-map", {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false
      }).setView(DANANG_MAP_CENTER, 13);
      heroMapRef.current.on("click", () => {
        setMapPinListOpen(false);
      });
    }

    const map = heroMapRef.current;
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    L.tileLayer(`https://mt1.google.com/vt/lyrs=m&hl=${getGoogleMapHl(lang)}&x={x}&y={y}&z={z}`, {
      attribution: "",
      maxZoom: 19
    }).addTo(map);

    heroMapLocations.forEach(({ point, units }) => {
      const minPrice = Math.min(...units.map((u) => u.priceUsd));
      const first = units[0];
      const isSelectedBldg = units.includes(activeShowcaseApt);

      const icon = L.divIcon({
        className: "homii-pin-wrap",
        html: `<div class="homii-map-pin ${isSelectedBldg ? "active" : ""}">
          <span>${formatPinPrice(minPrice, units.length > 1)}</span>
          <span class="pin-count">${units.length}</span>
        </div>`,
        iconSize: [96, 34],
        iconAnchor: [48, 18]
      });

      const marker = L.marker(point, { icon, title: first.address?.trim() || first.building }).addTo(map);
      marker.on("click", (e: any) => {
        if (e && e.originalEvent) e.originalEvent.stopPropagation();
        setShowcaseBldgFilter(first.building || "all");
        setShowcaseAptCode(first.code);
        setMapPinListOpen(true);
        map.flyTo(point, 14, { duration: 0.55 });
      });
    });

    setTimeout(() => map.invalidateSize(true), 120);
  }, [route, showcaseMode, apartments.length, heroMapLocations, activeShowcaseApt, lang, currency]);

  // Expand Map Dialog (#dialog-expand-map) — Dynamically Switches Map Tile Language & Currency
  useEffect(() => {
    if (!expandMapOpen || typeof L === "undefined" || !expandDialogApt) return;

    const timer = window.setTimeout(() => {
      const el = document.getElementById("dialog-expand-map");
      if (!el) return;
      const targetPoint = getExactLocation(expandDialogApt);

      const map = L.map(el, {
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: true
      }).setView(targetPoint ?? DANANG_MAP_CENTER, targetPoint ? 16 : 13);
      expandMapRef.current = map;

      L.tileLayer(`https://mt1.google.com/vt/lyrs=m&hl=${getGoogleMapHl(lang)}&x={x}&y={y}&z={z}`, {
        attribution: "",
        maxZoom: 19
      }).addTo(map);

      const bounds: [number, number][] = [];
      expandMapUnits.forEach((apt) => {
        const point = getExactLocation(apt);
        if (!point) return;
        bounds.push(point);
        const isCurrent = apt.code === expandDialogApt.code;

        const icon = L.divIcon({
          className: "homii-pin-wrap",
          html: `<div class="homii-map-pin ${isCurrent ? "active" : ""}">${formatPinPrice(apt.priceUsd)}</div>`,
          iconSize: [84, 30],
          iconAnchor: [42, 15]
        });

        const marker = L.marker(point, {
          icon, title: apt.address?.trim() || apt.building, zIndexOffset: isCurrent ? 1000 : 0
        }).addTo(map);
        marker.bindPopup(createMapPopup(apt));
        marker.on("click", () => setExpandMapAptCode(apt.code));
        if (isCurrent) marker.openPopup();
      });

      map.invalidateSize(true);
      if (!targetPoint && bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, 80);
    return () => {
      window.clearTimeout(timer);
      expandMapRef.current?.remove();
      expandMapRef.current = null;
    };
  }, [expandMapOpen, expandDialogApt, expandMapUnits, lang, currency]);

  // Catalogue Page Map (/apartments) — Dynamically Switches Map Tile Language & Currency
  useEffect(() => {
    if (route !== "/apartments" || typeof L === "undefined") {
      if (route !== "/apartments" && catMapRef.current) {
        catMapRef.current.remove();
        catMapRef.current = null;
      }
      return;
    }

    const timer = window.setTimeout(() => {
      const el = document.getElementById("catalogue-page-map");
      if (!el) return;
      if (!catMapRef.current) {
        catMapRef.current = L.map("catalogue-page-map", {
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: true
        }).setView(DANANG_MAP_CENTER, 13);
      }

      const map = catMapRef.current;
      map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker || layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });

      L.tileLayer(`https://mt1.google.com/vt/lyrs=m&hl=${getGoogleMapHl(lang)}&x={x}&y={y}&z={z}`, {
        attribution: "",
        maxZoom: 19
      }).addTo(map);

      const bounds: [number, number][] = [];
      filteredApartments.forEach((apt) => {
        const point = getExactLocation(apt);
        if (!point) return;
        bounds.push(point);
        const icon = L.divIcon({
          className: "homii-pin-wrap",
          html: `<div class="homii-map-pin">${formatPinPrice(apt.priceUsd)}</div>`,
          iconSize: [84, 30],
          iconAnchor: [42, 15]
        });
        const popup = createMapPopup(apt);
        const details = document.createElement("a");
        details.href = `/apartments/${encodeURIComponent(apt.code)}`;
        details.textContent = tx("Chi tiết căn hộ", "Explore unit", "查看详情", "Подробнее", "상세 보기", "詳細を見る");
        details.addEventListener("click", (event) => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          openApartmentDetailModal(apt);
        });
        popup.append(details);
        L.marker(point, { icon, title: apt.address?.trim() || apt.building }).addTo(map).bindPopup(popup);
      });

      map.invalidateSize(true);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else {
        map.setView(DANANG_MAP_CENTER, 13);
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [route, filteredApartments, lang, currency]);

  // Dedicated Single Apartment Detail Page (/apartments/:code)
  const [fullscreenPhotoOpen, setFullscreenPhotoOpen] = useState<boolean>(false);
  const detailRouteCode = route.startsWith("/apartments/")
    ? decodeURIComponent(route.replace("/apartments/", "").split("/")[0]).trim()
    : "";
  const currentDetailApt = detailRouteCode
    ? apartments.find(
        (a) =>
          a.code.toLowerCase() === detailRouteCode.toLowerCase() ||
          a._id === detailRouteCode
      )
    : null;
  const detailPhotos = currentDetailApt?.images?.filter((src) => src?.trim()) ?? [];
  const selectedPhoto = photoSelection?.code === currentDetailApt?.code ? photoSelection : undefined;
  const activePhotoIdx = selectedPhoto
    ? detailPhotos[selectedPhoto.index] === selectedPhoto.source
      ? selectedPhoto.index
      : Math.max(0, detailPhotos.indexOf(selectedPhoto.source))
    : 0;
  const activePhotoSource = detailPhotos[activePhotoIdx];

  const selectPhoto = (index: number) => {
    if (currentDetailApt && detailPhotos[index]) {
      setPhotoSelection({ code: currentDetailApt.code, source: detailPhotos[index], index });
    }
  };

  useEffect(() => {
    setFullscreenPhotoOpen(false);
  }, [detailRouteCode, Boolean(activePhotoSource)]);

  const openUnitOnMapDialog = (e: React.MouseEvent, apt: Apartment) => {
    e.stopPropagation();
    setExpandMapAptCode(apt.code);
    setExpandMapOpen(true);
  };

  const openMapOverview = () => {
    setExpandMapAptCode(undefined);
    setExpandMapOpen(true);
  };

  const renderLocationAction = (apt: Apartment, className: string, style?: React.CSSProperties) => {
    if (getExactLocation(apt)) {
      return (
        <button type="button" className={className} style={style} onClick={(e) => openUnitOnMapDialog(e, apt)}>
          <IconMapPin size={14} />
          <span>{tx("Xem vị trí", "View location", "查看位置", "На карте", "위치 보기", "所在地を見る")}</span>
        </button>
      );
    }
    const href = getAddressSearchUrl(apt);
    return href ? (
      <a className={className} style={style} href={href} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        <IconMapPin size={14} />
        <span>{apt.address?.trim()
          ? tx("Tìm địa chỉ", "Search address", "搜索地址", "Найти адрес", "주소 검색", "住所を検索")
          : tx("Tìm khu vực", "Search area", "搜索区域", "Найти район", "지역 검색", "エリアを検索")}</span>
      </a>
    ) : <span className="apt-location-status">{locationLabel(apt)}</span>;
  };

  // Navigating to Dedicated Single Apartment Detail Page (/apartments/:code)
  const openApartmentDetailModal = (apt: Apartment) => {
    setPhotoSelection(undefined);
    setBookingFeedback("");
    setExpandMapOpen(false);
    navigate(`/apartments/${apt.code}`);
  };

  // Opening Streamlined Viewing Booking Dialog (Screenshot 2)
  const openBookingModal = (apt: Apartment) => {
    apartmentInquiryAttempt.current = null;
    setApartmentInquiryType("viewing");
    setApartmentInquiryState("idle");
    setPolicyAgreed(true);
    setInquiryApartmentCode(apt.code);
  };

  const closeBookingModal = () => {
    if (!apartmentInquiryPending.current) setInquiryApartmentCode(undefined);
  };

  const handleLeadSubmit = async (e: React.FormEvent<HTMLFormElement>, customApt?: Apartment) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (customApt && (!policyAgreed || apartmentInquiryUnavailable || apartmentInquiryPending.current || apartmentInquiryState === "received")) return;
    const fd = new FormData(form);
    const contactVal = String(fd.get("contactHandle") || "").trim();
    const nameVal = String(fd.get("clientName") || "").trim();
    const whenVal = String(fd.get("moveInDate") || "").trim();
    const notesVal = String(fd.get("notes") || "").trim();
    const isReservation = customApt && apartmentInquiryType === "reservation";
    if (customApt && (!contactVal || (isReservation && !nameVal))) {
      setApartmentInquiryState("error");
      return;
    }
    const payload = {
      type: customApt ? apartmentInquiryType : "shortlist",
      apartmentCode: customApt ? customApt.code : "CURATED-SHORTLIST",
      apartmentTitle: customApt ? getLocalized(customApt.title) : "Gợi ý căn hộ theo nhu cầu",
      clientName: nameVal || contactVal || "Khách tìm căn hộ",
      messenger: fd.get("messenger") || (customApt ? "Zalo / WhatsApp / Telegram" : leadMessenger),
      contactHandle: contactVal,
      budgetUsd: customApt ? `$${customApt.priceUsd}/tháng` : fd.get("budgetUsd") || `$${leadBudget}/tháng`,
      bedrooms: customApt?.bedrooms != null ? `${customApt.bedrooms} PN` : fd.get("bedrooms") || leadBedrooms,
      moveInDate: customApt ? (isReservation ? whenVal : "") : whenVal || leadMoveIn,
      ...(customApt && !isReservation && whenVal ? { requestedViewingTime: whenVal } : {}),
      notes: notesVal
    };
    const body = JSON.stringify(payload);
    let key: string | undefined;
    if (customApt) {
      if (apartmentInquiryAttempt.current?.body !== body) {
        const requestKey = globalThis.crypto?.randomUUID?.() ??
          `inq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
        apartmentInquiryAttempt.current = { body, key: requestKey };
      }
      key = apartmentInquiryAttempt.current.key;
      apartmentInquiryPending.current = true;
      setApartmentInquiryState("submitting");
    }
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
        body
      });
      if (customApt && [404, 409, 410].includes(res.status)) {
        setApartmentInquiryState("unavailable");
        return;
      }
      if (!res.ok || (await res.json())?.ok !== true) throw new Error("Inquiry failed");
      if (customApt) {
        setApartmentInquiryState("received");
      } else {
        form.reset();
        setBookingFeedback(tx("Đã nhận yêu cầu tìm căn hộ. KIN Estates sẽ liên hệ với bạn.", "Shortlist request received. KIN Estates will contact you.", "已收到选房请求。KIN Estates 将与您联系。", "Заявка на подбор получена. KIN Estates свяжется с вами.", "매물 추천 요청이 접수되었습니다. KIN Estates에서 연락드리겠습니다.", "物件紹介のご依頼を受け付けました。KIN Estates からご連絡します。"));
      }
    } catch {
      if (customApt) setApartmentInquiryState("error");
      else setBookingFeedback(tx("Chưa gửi được yêu cầu. Vui lòng thử lại.", "Could not send your request. Please try again.", "无法发送请求，请重试。", "Не удалось отправить заявку. Попробуйте ещё раз.", "요청을 보내지 못했습니다. 다시 시도해 주세요.", "送信できませんでした。もう一度お試しください。"));
    } finally {
      if (customApt) apartmentInquiryPending.current = false;
    }
  };

  const trackDirectContact = (messenger: string, apt?: Apartment | null) => {
    fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "direct_contact",
        clientName: `Khách bấm nút ${messenger} trên Web`,
        messenger,
        contactHandle: `Bấm liên hệ qua ${messenger}`,
        apartmentCode: apt ? apt.code : "TRANG-CHU",
        apartmentTitle: apt ? getLocalized(apt.title) : "Liên hệ trực tiếp KIN Estates",
        budgetUsd: apt ? `$${apt.priceUsd}/tháng` : "Tư vấn trực tiếp",
        bedrooms: apt?.bedrooms != null ? `${apt.bedrooms} PN` : "Tùy chọn",
        viewingTime: "Vừa bấm liên hệ trên Website",
        notes: apt
          ? `Khách hàng đang xem căn hộ [${apt.code}] (${apt.building}) và bấm nút nhắn tin qua ${messenger}.`
          : `Khách hàng bấm nút liên hệ ${messenger} trên Website.`
      })
    }).catch(() => {});
  };

  const renderApartmentCard = (apt: Apartment) => {
    const title = getLocalized(apt.title);
    const notes = getLocalized(apt.architecturalNotes);
    const isSaved = savedCodes.includes(apt.code);
    const isRented = apt.status === "Rented";
    const isReserved = apt.status === "Reserved";

    return (
      <article key={apt.code} className="apt-modern-card">
        <div>
          <div className="apt-modern-card__media" onClick={() => openApartmentDetailModal(apt)}>
            <ApartmentPhoto
              src={apt.images?.[0]} alt={title} loading="lazy"
              unavailableText={photoUnavailable} fallbackStyle={fillPhotoSlot}
            />
            <div className="apt-modern-card__top-badges">
              <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                {isRented ? (
                  <span className="pill-badge-dark" style={{ background: "rgba(180, 35, 35, 0.92)", color: "#FFF" }}>
                    {tx("🔴 Đã thuê", "🔴 Rented", "🔴 已租", "🔴 Сдано", "🔴 임대완료", "🔴 成約済")}
                  </span>
                ) : isReserved ? (
                  <span className="pill-badge-dark" style={{ background: "rgba(180, 115, 20, 0.92)", color: "#FFF" }}>
                    {tx("🟡 Đã cọc", "🟡 Reserved", "🟡 已预订", "🟡 Бронь", "🟡 예약중", "🟡 予約中")}
                  </span>
                ) : (
                  <span className="pill-badge-dark" style={{ background: "rgba(20, 99, 70, 0.9)", color: "#FFF" }}>
                    {tx("🟢 Đang trống", "🟢 Available", "🟢 可租", "🟢 Свободна", "🟢 공실", "🟢 空室")}
                  </span>
                )}
                {getAptTags(apt).slice(0, 1).map((t) => (
                  <span key={t} className="pill-badge-dark">
                    {t}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className={`save-heart-btn ${isSaved ? "saved" : ""}`}
                onClick={(e) => toggleSave(e, apt.code)}
              >
                {isSaved
                  ? tx("♥ Đã lưu", "♥ Saved", "♥ 已收藏", "♥ Сохранено", "♥ 저장됨", "♥ 保存済")
                  : tx("♡ Lưu", "♡ Save", "♡ 收藏", "♡ Сохранить", "♡ 저장", "♡ 保存")}
              </button>
            </div>
            <div className="apt-modern-card__price-tag">{formatPrice(apt)}</div>
          </div>

          <div className="apt-modern-card__body" onClick={() => openApartmentDetailModal(apt)}>
            <div className="apt-modern-card__loc">
              {trArea(apt.areaName)} · {apt.building}
            </div>
            <h3 className="apt-modern-card__title">{title}</h3>
            {apt.address && (
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>📍</span>
                <span>{apt.address}</span>
              </div>
            )}
            <p className="apt-modern-card__desc">{notes}</p>

            <div className="apt-modern-card__specs">
              <div>
                <strong>{apt.bedrooms ?? "—"}</strong>
                <span>{tx("Phòng ngủ", "Bedrooms", "卧室", "Спальни", "침실", "寝室")}</span>
              </div>
              <div>
                <strong>{apt.sizeM2 != null ? `${apt.sizeM2} m²` : "—"}</strong>
                <span>{tx("Diện tích", "Size", "面积", "Площадь", "면적", "広さ")}</span>
              </div>
              <div>
                <strong>{apt.floor ?? "—"}</strong>
                <span>{tx("Độ cao", "Floor", "楼层", "Этаж", "층수", "階数")}</span>
              </div>
              <div>
                <strong>{apt.minLeaseMonths != null ? apt.minLeaseMonths + tx("T+", "mo+", "个月+", "мес+", "개월+", "ヶ月+") : "—"}</strong>
                <span>{tx("Hợp đồng", "Lease", "租期", "Срок", "계약", "契約")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="apt-modern-card__footer">
          {renderLocationAction(apt, "btn-luxe btn-luxe--outline", { padding: "0.42rem 0.85rem", fontSize: "0.76rem" })}

          <button
            type="button"
            style={{ background: "none", border: "none", fontWeight: 700, fontSize: "0.8rem", color: "var(--bg-navy)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
            onClick={() => openApartmentDetailModal(apt)}
          >
            <span>{tx("Chi tiết căn hộ", "Explore unit", "查看详情", "Подробнее", "상세 보기", "詳細を見る")}</span>
            <IconArrowUpRight size={14} />
          </button>
        </div>
      </article>
    );
  };

  const t = UI_TEXT[lang] || UI_TEXT.vi;
  const currentLangInfo = LANGUAGE_LIST.find((l) => l.code === lang) || LANGUAGE_LIST[0];

  const navItems = [
    { path: "/apartments", label: t.nav_apartments },
    { path: "/areas", label: t.nav_areas },
    { path: "/how-to-rent", label: t.nav_how },
    { path: "/guides", label: t.nav_guides },
    { path: "/about", label: t.nav_about }
  ];

  const activeDistrict = neighborhoods[activeDistrictIdx] || neighborhoods[0];
  const compLeft = neighborhoods[Number(compareLeftIdx)] || neighborhoods[0];
  const compRight = neighborhoods[Number(compareRightIdx)] || neighborhoods[3] || neighborhoods[1];

  return (
    <div className="astryx-app-shell">
      {/* ====================================================================
          STICKY HEADER (Bespoke KIN ESTATES Architectural Brand + 6-Language Dropdown)
          ==================================================================== */}
      <header className="kin-header">
        <div className="kin-header__inner">
          <a
            href="/"
            className="brand-link"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            <div className="brand-emblem" aria-hidden="true">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="kinHdrGold" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F9E7CF" />
                    <stop offset="48%" stopColor="#D5B07C" />
                    <stop offset="100%" stopColor="#9E7B4F" />
                  </linearGradient>
                  <linearGradient id="kinHdrSoft" x1="14" y1="12" x2="50" y2="52" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#F9E7CF" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#9E7B4F" stopOpacity="0.28" />
                  </linearGradient>
                </defs>
                {/* Inner Architectural Frame */}
                <rect x="5" y="5" width="54" height="54" rx="11" stroke="url(#kinHdrSoft)" strokeWidth="1.15" />
                {/* Architectural Archway Portal */}
                <path d="M16.5 47.5V26.5C16.5 17.9396 23.4396 11 32 11C40.5604 11 47.5 17.9396 47.5 26.5V47.5" stroke="url(#kinHdrSoft)" strokeWidth="1.4" strokeLinecap="round" />
                {/* Left High-Rise Monolith Pillar (Vertical Spine of 'K') */}
                <path d="M20.5 47.5V18L26.2 14.5V47.5H20.5Z" fill="url(#kinHdrGold)" />
                {/* Upper Architectural Cantilever Wing of 'K' */}
                <path d="M26.2 31L41.2 16L44.8 19.6L31.6 32.8L26.2 31Z" fill="url(#kinHdrGold)" />
                {/* Lower Diagonal Strut of 'K' + Right Residence Tower */}
                <path d="M30 29.5L44.8 47.5H38L26.2 33.2L30 29.5Z" fill="url(#kinHdrGold)" />
                <path d="M41.2 26L44.8 23.5V42L41.2 37.8V26Z" fill="url(#kinHdrGold)" fillOpacity="0.72" />
                {/* Horizon Baseline & Coastal Wave Reflection */}
                <line x1="13.5" y1="48" x2="50.5" y2="48" stroke="url(#kinHdrGold)" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M19.5 52.2C23.5 50.9 27.8 53.5 32 52.2C36.2 50.9 40.5 53.5 44.5 52.2" stroke="url(#kinHdrGold)" strokeWidth="1.3" strokeLinecap="round" strokeOpacity="0.82" />
                {/* Zenith North-Star Diamond Accent */}
                <path d="M32 6.8L33.7 9.2L32 11.6L30.3 9.2L32 6.8Z" fill="#F9E7CF" />
              </svg>
            </div>
            <div>
              <div className="brand-link__title">
                <span className="brand-title-kin">KIN</span>
                <span className="brand-title-dot" />
                <span className="brand-title-estates">Estates</span>
              </div>
              <div className="brand-link__sub">Da Nang Private Residences</div>
            </div>
          </a>

          <nav aria-label="Main Navigation">
            <ul className="kin-nav-tabs">
              {navItems.map((item) => (
                <li key={item.path}>
                  <button
                    type="button"
                    className={`kin-tab-link ${route === item.path || (item.path === "/apartments" && route.startsWith("/apartments/")) ? "active" : ""}`}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-right-controls">
            {/* Compact Multi-Language Popover Dropdown (VI, EN, ZH, RU, KO, JA) */}
            <div className="header-dropdown-wrap" ref={langDropRef}>
              <button
                type="button"
                className="header-pill-trigger"
                onClick={() => setLangMenuOpen((p) => !p)}
                aria-label="Select Language"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>{currentLangInfo.short}</span>
                <IconChevronDown size={13} />
              </button>

              {langMenuOpen && (
                <div className="header-dropdown-menu">
                  {LANGUAGE_LIST.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className={`header-dropdown-item ${lang === item.code ? "selected" : ""}`}
                      onClick={() => {
                        setLang(item.code);
                        setLangMenuOpen(false);
                      }}
                    >
                      <div>
                        <div>{item.label}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>{item.native}</div>
                      </div>
                      {lang === item.code && <IconCheck size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Compact Currency Switcher Button */}
            <button
              type="button"
              className="header-pill-trigger"
              onClick={() => setCurrency((c) => (c === "USD" ? "VND" : "USD"))}
              title="Switch USD / VND"
            >
              <span>{currency === "USD" ? "$ USD" : "₫ VND"}</span>
            </button>

            <button
              type="button"
              className="btn-luxe btn-luxe--navy"
              onClick={() => {
                if (route !== "/") navigate("/");
                setTimeout(() => {
                  document.getElementById("find-home-section")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
            >
              <span>{t.btn_find}</span>
              <IconArrowUpRight size={14} />
            </button>

            {/* Mobile Circular Hamburger Menu Button with Crisp Vector SVG */}
            <button
              type="button"
              className="mobile-menu-circle-btn"
              aria-label="Toggle Menu"
              onClick={() => setMobileMenuOpen((p) => !p)}
            >
              {mobileMenuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer Menu */}
        <div className={`mobile-nav-drawer ${mobileMenuOpen ? "open" : ""}`}>
          <div className="mobile-drawer-links">
            <button
              type="button"
              className={`mobile-drawer-link ${route === "/" ? "active" : ""}`}
              onClick={() => navigate("/")}
            >
              <span>{lang === "vi" ? "Trang chủ" : "Home"}</span>
              <span>→</span>
            </button>
            {navItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className={`mobile-drawer-link ${route === item.path ? "active" : ""}`}
                onClick={() => navigate(item.path)}
              >
                <span>{item.label}</span>
                <span>→</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-luxe btn-luxe--navy"
            style={{ width: "100%" }}
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/how-to-rent");
            }}
          >
            <span>{t.btn_find}</span>
            <IconArrowUpRight size={15} />
          </button>
        </div>
      </header>

      {/* ====================================================================
          PAGE 1: HOME (/) — Full-Clarity Video Hero + 7 Complete Sections
          ==================================================================== */}
      {route === "/" && (
        <main className="page-route">
          {/* SECTION B: FULL-CLARITY VIDEO HERO + INTERACTIVE SHOWCASE */}
          <section className="kin-hero-section">
            <div className="hero-video-backdrop">
              <video
                ref={heroVideoRef}
                id="hero-bg-video"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1920&q=85"
              >
                <source src="/videos/hero-danang.webm" type="video/webm" />
                <source src="https://upload.wikimedia.org/wikipedia/commons/0/0f/BLM_drone_training_%2834216006294%29.webm" type="video/webm" />
              </video>
              <div className="hero-video-mist-overlay" />
            </div>

            <div className="kin-hero-inner">
              <div className="kin-eyebrow-pill">
                <span className="live-dot" />
                <span>{t.hero_eyebrow}</span>
              </div>

              <h1
                className="kin-hero-title"
                dangerouslySetInnerHTML={{ __html: t.hero_title }}
              />

              <p className="kin-hero-sub">{t.hero_sub}</p>

              {/* Search Bar + Quick Bedroom Pills */}
              <div className="kin-search-strip">
                <form
                  className="kin-search-box"
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate("/apartments");
                  }}
                >
                  <IconSearch size={16} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.search_placeholder}
                  />
                  <button type="submit" className="kin-search-submit">
                    <span>{t.search_btn}</span>
                    <span>→</span>
                  </button>
                </form>

                <div className="kin-quick-pills">
                  {[
                    { label: tx("1 phòng ngủ", "1 Bedroom", "1 卧室", "1 спальня", "1베드룸", "1ベッドルーム"), br: "1" },
                    { label: tx("2 phòng ngủ", "2 Bedrooms", "2 卧室", "2 спальни", "2베드룸", "2ベッドルーム"), br: "2" },
                    { label: tx("3 phòng ngủ", "3 Bedrooms", "3 卧室", "3 спальни", "3베드룸", "3ベッドルーム"), br: "3" },
                    { label: tx("Biệt thự & Penthouse", "Villas & Penthouses", "别墅与顶层公寓", "Виллы и пентхаусы", "풀빌라 & 펜트하우스", "ヴィラ＆ペントハウス"), tag: "Biệt thự" }
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="kin-quick-pill"
                      onClick={() => {
                        if (p.br) setBedrooms(p.br);
                        if (p.tag) setTag(p.tag);
                        navigate("/apartments");
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* HERO INTERACTIVE SHOWCASE WIDGET — HARMONIOUS WARM PALETTE + IN-MAP PREVIEW CARD */}
              {activeShowcaseApt && (
                <div className="showcase-shell">
                  <div className={`showcase-main ${showcaseMode === "photo" ? "mode-photo-only" : ""}`}>
                    {/* Left / Top Half: Photo Carousel + Explore CTA */}
                    <div className="showcase-photo-side">
                      <ApartmentPhoto
                        src={activeShowcaseApt.images?.[0]}
                        alt={getLocalized(activeShowcaseApt.title)}
                        unavailableText={photoUnavailable}
                        fallbackStyle={{ position: "absolute", inset: 0 }}
                      />

                      <div className="showcase-top-bar">
                        <div className="mode-toggle-pill">
                          <button
                            type="button"
                            className={showcaseMode === "photo" ? "active" : ""}
                            onClick={() => setShowcaseMode("photo")}
                          >
                            {tx("Ảnh", "Photo", "照片", "Фото", "사진", "写真")}
                          </button>
                          <button
                            type="button"
                            className={showcaseMode === "split" ? "active" : ""}
                            onClick={() => setShowcaseMode("split")}
                          >
                            <IconMap size={13} /> {tx("Ảnh + bản đồ", "Photo + Map", "照片 + 地图", "Фото + карта", "사진 + 지도", "写真＋地図")}
                          </button>
                        </div>

                        <div className="showcase-counter-badge">
                          {String(activeShowcaseAptIdx + 1).padStart(2, "0")} / {String(showcaseUnits.length).padStart(2, "0")}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="showcase-arrow-btn prev"
                        aria-label="Previous apartment"
                        onClick={() => setShowcaseAptCode(showcaseUnits.at(activeShowcaseAptIdx - 1)?.code)}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="showcase-arrow-btn next"
                        aria-label="Next apartment"
                        onClick={() => setShowcaseAptCode((showcaseUnits[activeShowcaseAptIdx + 1] || showcaseUnits[0])?.code)}
                      >
                        ›
                      </button>

                      <div className="showcase-photo-bottom-stack">
                        <div
                          className="showcase-photo-OverlayCard"
                          onClick={() => openApartmentDetailModal(activeShowcaseApt)}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {getLocalized(activeShowcaseApt.title)}
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {trArea(activeShowcaseApt.areaName)} · {activeShowcaseApt.bedrooms} {tx("phòng ngủ", "BR", "室", "сп.", "침실", "LDK")} · {activeShowcaseApt.sizeM2} m²
                            </div>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "1.12rem", color: "var(--bg-navy)", whiteSpace: "nowrap", flexShrink: 0 }}>
                            {formatPrice(activeShowcaseApt)}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="showcase-explore-cta-btn"
                          onClick={() => openApartmentDetailModal(activeShowcaseApt)}
                        >
                          <span>{tx("Khám phá căn hộ", "Explore apartment", "查看公寓详情", "Смотреть квартиру", "아파트 상세 보기", "物件の詳細を見る")}</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>

                    {/* Right / Bottom Half: Clean Interactive Map with Floating Preview Card & Conditional Price-Pin Popover */}
                    {showcaseMode === "split" && (
                      <div className="showcase-map-side">
                        <div className="showcase-map-canvas-wrap">
                          <div id="hero-showcase-map" style={{ width: "100%", height: "100%" }} />

                          {/* Floating Apartment Preview Card Inside Map (Click to Open Room Details!) */}
                          <div
                            className="map-floating-preview-card"
                            onClick={() => openApartmentDetailModal(activeShowcaseApt)}
                            title={tx("Nhấn để xem chi tiết căn hộ", "Click to view apartment details", "点击查看公寓详情", "Нажмите для деталей", "클릭하여 상세 보기", "クリックして詳細を表示")}
                          >
                            <ApartmentPhoto
                              className="map-preview-thumb"
                              src={activeShowcaseApt.images?.[0]}
                              alt={getLocalized(activeShowcaseApt.title)}
                              unavailableText={photoUnavailable}
                              loading="lazy"
                            />
                            <div className="map-preview-info">
                              <div className="map-preview-title">
                                {getLocalized(activeShowcaseApt.title)}
                              </div>
                              <div className="map-preview-meta">
                                {trArea(activeShowcaseApt.areaName)} · {activeShowcaseApt.bedrooms} {tx("phòng ngủ", "BR", "室", "сп.", "침실", "LDK")} · {activeShowcaseApt.sizeM2} m²
                              </div>
                              <div className="map-preview-price">
                                {formatPrice(activeShowcaseApt)}
                              </div>
                            </div>
                          </div>

                          {/* Conditional Popover: Only appears when user clicks a Price Pin on the Map! */}
                          {mapPinListOpen && heroPinUnits.length > 0 && (
                            <div className="map-nearby-prices-popover" onClick={(e) => e.stopPropagation()}>
                              <div className="map-nearby-header">
                                <span>
                                  {activeShowcaseApt.address?.trim() || activeShowcaseApt.building} · {heroPinUnits.length} {tx("căn", "units", "套房源", "вариантов", "개 호실", "件の部屋")}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setMapPinListOpen(false)}
                                  style={{ background: "none", border: "none", fontWeight: 800, cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.85rem" }}
                                >
                                  ✕
                                </button>
                              </div>
                              <div className="map-nearby-list">
                                {heroPinUnits.map((u) => (
                                  <button
                                    key={u.code}
                                    type="button"
                                    className={`map-nearby-item ${u.code === activeShowcaseApt.code ? "active" : ""}`}
                                    onClick={() => {
                                      setShowcaseAptCode(u.code);
                                      setMapPinListOpen(false);
                                    }}
                                  >
                                    <div>
                                      <strong style={{ color: "var(--text-primary)" }}>
                                        {u.bedrooms} {tx("phòng ngủ", "BR", "室", "сп.", "침실", "LDK")} · {u.sizeM2} m²
                                      </strong>
                                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                        {getAptField(u, "orientation") || trArea(u.areaName)}
                                      </div>
                                    </div>
                                    <strong style={{ color: "var(--accent-bronze-dark)", fontSize: "0.86rem" }}>
                                      {formatPrice(u)}
                                    </strong>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Clean Map Controls (Zoom + Reset + Expand Map) */}
                          <div className="showcase-map-bottom-bar">
                            <div className="map-left-controls">
                              <div className="map-ZoomStack">
                                <button
                                  type="button"
                                  className="map-icon-btn"
                                  aria-label="Zoom in"
                                  onClick={() => heroMapRef.current?.zoomIn()}
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  className="map-icon-btn"
                                  aria-label="Zoom out"
                                  onClick={() => heroMapRef.current?.zoomOut()}
                                >
                                  −
                                </button>
                              </div>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  className="map-icon-btn"
                                  style={{ borderRadius: "10px", boxShadow: "0 4px 14px rgba(22,25,30,0.14)", border: "1px solid rgba(22,25,30,0.08)" }}
                                  title={tx("Mở rộng bản đồ", "Expand map", "展开大地图", "Развернуть карту", "지도 크게 보기", "地図を拡大")}
                                  onClick={() => {
                                    setExpandMapAptCode(activeShowcaseApt.code);
                                    setExpandMapOpen(true);
                                  }}
                                >
                                  ⛶
                                </button>
                                <button
                                  type="button"
                                  className="map-icon-btn"
                                  style={{ borderRadius: "10px", boxShadow: "0 4px 14px rgba(22,25,30,0.14)", border: "1px solid rgba(22,25,30,0.08)" }}
                                  title={tx("Tất cả toà nhà", "All buildings", "显示所有大楼", "Все здания", "모든 건물", "すべての建物")}
                                  onClick={() => {
                                    setShowcaseBldgFilter("all");
                                    setShowcaseAptCode(undefined);
                                    setMapPinListOpen(false);
                                    heroMapRef.current?.flyTo(DANANG_MAP_CENTER, 13, { duration: 0.65 });
                                  }}
                                >
                                  ◎
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="map-float-action"
                              onClick={() => {
                                setExpandMapAptCode(activeShowcaseApt.code);
                                setExpandMapOpen(true);
                              }}
                            >
                              <span>⤢ {tx("Mở rộng bản đồ", "Expand map", "展开地图", "Развернуть карту", "지도 확대", "地図を拡大")}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Harmonious Warm Sand Bottom Bar (No Dark Blue Background!) */}
                  <div className="showcase-bottom-strip">
                    <span className="showcase-trust-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span>{tx("Hợp đồng từ 3 tháng", "Leases from 3 months", "3个月起租", "Аренда от 3 месяцев", "3개월 이상 임대", "3ヶ月からの長期契約")}</span>
                    </span>
                    <span className="showcase-trust-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span>{tx("Hỗ trợ thủ tục tạm trú", "Full move-in registration", "协助办理暂住登记", "Регистрация проживания", "거주 등록 완벽 지원", "滞在登録サポート")}</span>
                    </span>
                    <span className="showcase-trust-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                      </svg>
                      <span>{tx("Điện nước giá nhà nước EVN", "State-rate EVN utilities", "国家电网标准电价", "Гос. тарифы EVN", "국가 표준 전기·수도 요금", "国営EVN標準電気料金")}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 01: THÊM CĂN HỘ ĐÁNG KHÁM PHÁ */}
          <section className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
              <div>
                <span className="eyebrow-badge">
                  {tx("PORTFOLIO TUYỂN CHỌN BỞI KIẾN TRÚC SƯ", "ARCHITECT-CURATED PORTFOLIO", "建筑师严选房源组合", "ПОРТФОЛИО ОТ АРХИТЕКТОРОВ", "건축가가 엄선한 포트폴리오", "建築家が厳選したポートフォリオ")}
                </span>
                <h2 className="section-heading-serif">
                  {tx("Thêm căn hộ đáng khám phá", "More Residences Worth Exploring", "更多值得探索的精选公寓", "Другие резиденции для знакомства", "더 둘러볼 만한 추천 레지던스", "さらに注目の厳選レジデンス")}
                </h2>
              </div>
              <button
                type="button"
                className="btn-luxe btn-luxe--outline"
                onClick={() => navigate("/apartments")}
              >
                <span>
                  {tx(
                    `Tất cả ${apartments.length} căn hộ →`,
                    `All ${apartments.length} apartments →`,
                    `查看全部 ${apartments.length} 套公寓 →`,
                    `Все ${apartments.length} квартир →`,
                    `전체 ${apartments.length}개 아파트 보기 →`,
                    `全 ${apartments.length} 件の物件を見る →`
                  )}
                </span>
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="chips-track">
                {[
                  { key: "all", label: tx("Tất cả", "All", "全部", "Все", "전체", "すべて") },
                  { key: "Gần biển", label: tx("Gần biển", "Near Beach", "靠近海滩", "У пляжа", "해변 근처", "ビーチ近く") },
                  { key: "View sông Hàn", label: tx("View sông Hàn", "Han River View", "韩江景观", "Вид на реку", "한강 뷰", "ハン川ビュー") },
                  { key: "1", label: tx("1 phòng ngủ", "1 Bedroom", "1 卧室", "1 спальня", "1베드룸", "1ベッドルーム") },
                  { key: "2", label: tx("2 phòng ngủ", "2 Bedrooms", "2 卧室", "2 спальни", "2베드룸", "2ベッドルーム") },
                  { key: "3", label: tx("3 phòng ngủ", "3 Bedrooms", "3 卧室", "3 спальни", "3베드룸", "3ベッドルーム") },
                  { key: "Biệt thự", label: tx("Biệt thự", "Villas", "独栋别墅", "Виллы", "풀빌라", "ヴィラ") },
                  { key: "saved", label: `${tx("Đã lưu", "Saved", "已收藏", "Сохранено", "저장됨", "保存済")} (${savedCodes.length})` }
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    className={`filter-chip-btn ${homeChipFilter === c.key ? "active" : ""}`}
                    onClick={() => setHomeChipFilter(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                {tx(
                  `Hiển thị ${homeCatalogueUnits.length} trong ${apartments.length} căn hộ`,
                  `Showing ${homeCatalogueUnits.length} of ${apartments.length} residences`,
                  `显示 ${homeCatalogueUnits.length} / ${apartments.length} 套房源`,
                  `Показано ${homeCatalogueUnits.length} из ${apartments.length} квартир`,
                  `총 ${apartments.length}개 중 ${homeCatalogueUnits.length}개 표시`,
                  `${apartments.length} 件中 ${homeCatalogueUnits.length} 件を表示`
                )}
              </span>
            </div>

            <div className="cards-grid">
              {homeCatalogueUnits.map(renderApartmentCard)}
            </div>
          </section>

          {/* SECTION 02: BỐN KHU VỰC. ĐÂU LÀ NƠI DÀNH CHO BẠN? */}
          <section className="page-container" style={{ background: "#F1EDE4", borderRadius: "28px", margin: "1rem auto" }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <span className="eyebrow-badge">
                {tx("KHÔNG CHỈ LÀ NHÀ. CÒN LÀ CUỘC SỐNG XUNG QUANH.", "MORE THAN A HOME. IT'S YOUR DAILY RHYTHM.", "不仅是住所，更是您的日常节奏", "БОЛЬШЕ ЧЕМ ДОМ — ВАШ РИТМ ЖИЗНИ", "집 그 이상, 당신의 일상이 되는 동네", "住まいだけでなく、毎日の暮らしのリズム")}
              </span>
              <h2 className="section-heading-serif">
                {tx("Bốn khu vực trọng điểm. Đâu là nơi dành cho bạn?", "Four Signature Districts. Which One Fits You?", "四大核心街区，哪一个最适合您？", "Четыре ключевых района. Какой подойдет вам?", "다낭의 4대 핵심 지역, 어디가 가장 잘 맞을까요?", "ダナン4つの主要エリア — あなたに合う街は？")}
              </h2>
              <p style={{ color: "var(--text-secondary)", maxWidth: "62ch", marginTop: "0.35rem" }}>
                {tx(
                  "Biển ở gần, quán cà phê yêu thích hay cửa sổ nhìn ra sông Hàn. Bắt đầu từ điều khiến mỗi ngày của bạn dễ chịu hơn.",
                  "Walkable beach mornings, specialty coffee streets, or panoramic river views. Start with what makes every day effortless.",
                  "步行可达的晨间海滩、精品咖啡街或全景韩江视野。从让您每天感到舒适的生活方式开始。",
                  "Утренний пляж в пешей доступности, уютные кофейни или панорамный вид на реку Хан.",
                  "아침 산책이 가능한 미케비치, 스페셜티 카페 거리, 또는 탁 트인 한강뷰 중에서 선택해 보세요.",
                  "朝のビーチ散歩、カフェ通り、またはハン川のパノラマビュー。毎日が心地よくなる街から選びましょう。"
                )}
              </p>
            </div>

            {activeDistrict && (
              <div className="district-explorer-grid">
                <div className="district-tab-list">
                  {neighborhoods.map((n, idx) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`district-tab-btn ${idx === activeDistrictIdx ? "active" : ""}`}
                      onClick={() => setActiveDistrictIdx(idx)}
                    >
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.75 }}>
                          0{idx + 1} · {trField(n.rentRangeUsd)}
                        </div>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700 }}>
                          {trArea(n.name)}
                        </div>
                        <div style={{ fontSize: "0.82rem", opacity: 0.85 }}>{trField(n.subtitle)}</div>
                      </div>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, padding: "0.3rem 0.7rem", borderRadius: "999px", whiteSpace: "nowrap", flexShrink: 0, background: idx === activeDistrictIdx ? "rgba(255,255,255,0.18)" : "var(--bg-ivory)" }}>
                        {n.unitCount || 12} {tx("căn", "units", "套", "объектов", "호실", "件")}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="district-detail-card">
                  <div style={{ minHeight: "320px", overflow: "hidden" }}>
                    <img
                      src={AREA_IMAGES[activeDistrictIdx % AREA_IMAGES.length]}
                      alt={activeDistrict.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>
                  <div style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <span className="eyebrow-badge">0{activeDistrictIdx + 1} · {trArea(activeDistrict.name)}</span>
                      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.85rem", marginBottom: "0.65rem" }}>
                        {trField(activeDistrict.subtitle)}
                      </h3>
                      <p style={{ fontSize: "0.92rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                        {trField(activeDistrict.architecturalCharacter)}
                      </p>
                      <div style={{ background: "var(--bg-ivory)", padding: "1rem", borderRadius: "14px", fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1.25rem" }}>
                        <div>• <strong>{tx("Ra biển:", "Beach walk:", "距离海滩：", "До пляжа:", "해변 거리:", "ビーチまで:")}</strong> {trField(activeDistrict.beachWalk)}</div>
                        <div>• <strong>{tx("Điểm làm việc & Cà phê:", "Remote work & Cafes:", "办公与咖啡馆：", "Удаленная работа:", "업무 & 카페:", "リモートワーク:")}</strong> {activeDistrict.remoteWorkScore}</div>
                        <div>• <strong>{tx("Độ yên tĩnh:", "Acoustic profile:", "安静程度：", "Тишина:", "소음 수준:", "静かさ:")}</strong> {trField(activeDistrict.noiseLevel)}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn-luxe btn-luxe--navy"
                        onClick={() => {
                          setArea(activeDistrict.name);
                          navigate("/apartments");
                        }}
                      >
                        <span>{tx(`Tìm căn hộ tại ${activeDistrict.name} →`, `Browse ${trArea(activeDistrict.name)} →`, `查看 ${trArea(activeDistrict.name)} 房源 →`, `Квартиры в ${trArea(activeDistrict.name)} →`, `${trArea(activeDistrict.name)} 매물 보기 →`, `${trArea(activeDistrict.name)} の物件を見る →`)}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-luxe btn-luxe--outline"
                        onClick={() => navigate("/areas")}
                      >
                        <span>{tx("So sánh chi tiết các khu", "Compare districts", "对比各个街区", "Сравнить районы", "지역 상세 비교", "エリアを詳しく比較")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 03: TỪ TIN NHẮN ĐẦU TIÊN ĐẾN LÚC NHẬN CHÌA KHÓA */}
          <section className="page-container">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
              <div>
                <span className="eyebrow-badge">
                  {tx("TỪ TIN NHẮN ĐẦU TIÊN ĐẾN LÚC NHẬN CHÌA KHÓA", "FROM FIRST MESSAGE TO KEY HANDOVER", "从第一条消息到交付钥匙", "ОТ ПЕРВОГО СООБЩЕНИЯ ДО КЛЮЧЕЙ", "첫 상담부터 열쇠 인수까지", "最初のメッセージから鍵のお渡しまで")}
                </span>
                <h2 className="section-heading-serif">
                  {tx("Chuyển nhà là bước lớn. Cùng làm mọi việc rõ ràng hơn.", "Moving is a big step. Let's make every detail transparent.", "搬家是人生大事，让我们把每一步都变得清晰透明。", "Переезд — важный шаг. Сделаем всё прозрачным.", "이사는 큰 결정입니다. 모든 과정을 투명하게 안내합니다.", "引っ越しは大切な一歩。すべてを明確で安心なプロセスに。")}
                </h2>
              </div>
              <button type="button" className="btn-luxe btn-luxe--outline" onClick={() => navigate("/how-to-rent")}>
                <span>{tx("Xem chi tiết quy trình thuê →", "See full rental process →", "查看完整租房流程 →", "Весь процесс аренды →", "임대 절차 자세히 보기 →", "賃貸の流れを詳しく見る →")}</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
              {[
                {
                  num: "01",
                  title: tx("Chia sẻ về bạn", "Share Your Rhythm", "告诉我们您的需求", "Расскажите о себе", "원하는 조건 공유", "ご希望の条件を共有"),
                  desc: tx(
                    "Ngân sách, ngày dọn vào và thói quen sinh hoạt (cần bàn làm việc rộng, nuôi thú cưng, thích tầng cao hay đi bộ ra biển).",
                    "Your budget, move-in date, and daily priorities (ergonomic work desk, pet policy, high floor, or walkable beach access).",
                    "您的预算、入住日期与生活习惯（宽敞办公桌、宠物友好、高楼层或步行到海边）。",
                    "Ваш бюджет, дата заезда и привычки (рабочий стол, животные, высокий этаж или близость к океану).",
                    "예산, 입주 희망일, 라이프스타일(업무용 데스크, 반려동물, 고층 뷰, 해변 도보 거리 등)을 알려주세요.",
                    "ご予算、入居希望日、ライフスタイル（ワークデスク、ペット可、高層階、ビーチ徒歩圏内など）をお知らせください。"
                  )
                },
                {
                  num: "02",
                  title: tx("Xem các căn hộ tuyển chọn", "Review Curated Shortlist", "浏览定制房源清单", "Персональная подборка", "맞춤 매물 리스트 확인", "厳選物件リストをご提案"),
                  desc: tx(
                    "Nhận danh sách ngắn các căn đang trống thực tế trong 2 giờ. Chúng tôi sắp xếp lịch dẫn đi xem trực tiếp hoặc gọi Video 4K.",
                    "Receive a verified shortlist of available units within 2 hours. We arrange private in-person viewings or live 4K video tours.",
                    "2小时内收到真实可租房源清单。我们为您安排实地看房或 4K 实时视频看房。",
                    "Получите список проверенных свободных квартир за 2 часа. Организуем личный показ или 4K видео-тур.",
                    "2시간 이내에 실제 공실 매물 리스트를 받아보세요. 현장 방문 또는 4K 라이브 영상 투어를 진행합니다.",
                    "2時間以内に実際の空室リストをご案内。現地内覧または4Kライブビデオ内覧を手配します。"
                  )
                },
                {
                  num: "03",
                  title: tx("Hiểu rõ điều kiện thuê", "Transparent Lease Terms", "透明的合同条款", "Прозрачный договор", "투명한 임대차 계약", "明確な契約条件の確認"),
                  desc: tx(
                    "Minh bạch tiền thuê, tiền cọc, biểu giá điện nước EVN và rà soát hợp đồng song ngữ Việt – Anh trước khi thanh toán.",
                    "Clear monthly rent, security deposit, state EVN utility rates, and reviewed bilingual Vietnamese–English lease contracts.",
                    "明确租金、押金、国家电网 EVN 电价，并在付款前审核越英双语租赁合同。",
                    "Честная цена, залог, государственные тарифы EVN и двуязычный договор перед оплатой.",
                    "임대료, 보증금, 국가 표준 전기·수도 요금을 명시한 한/영·베트남어 계약서를 꼼꼼히 검토합니다.",
                    "家賃、敷金、EVN電気料金を明記したバイリンガル賃貸契約書を事前確認します。"
                  )
                },
                {
                  num: "04",
                  title: tx("Cảm thấy như ở nhà", "Effortless Move-In & NA17", "安心入住与暂住登记", "Комфортный заезд и NA17", "안전한 입주 및 거주 등록", "安心の入居＆滞在登録"),
                  desc: tx(
                    "Kiểm tra thiết bị ngày bàn giao, hoàn tất khai báo tạm trú công an (Form NA17) và đồng hành hỗ trợ suốt kỳ thuê.",
                    "Full photo inventory handover, ward police registration (Form NA17), and ongoing support throughout your lease.",
                    "交房当日设备拍照核验，协助完成派出所暂住登记（NA17表），并在整个租期内提供支持。",
                    "Опись имущества с фото при заезде, регистрация в полиции (форма NA17) и поддержка весь срок.",
                    "입주 당일 시설물 사진 체크리스트 작성, 공안 거주 등록(NA17 양식) 및 거주 기간 내내 케어를 제공합니다.",
                    "入居時の設備写真チェック、警察での滞在登録（Form NA17）、入居後のサポートまで一貫対応。"
                  )
                }
              ].map((step) => (
                <div key={step.num} style={{ background: "#FFFFFF", padding: "1.75rem", borderRadius: "20px", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)" }}>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "2.1rem", fontWeight: 800, color: "var(--accent-bronze-dark)", lineHeight: 1, marginBottom: "0.65rem" }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", marginBottom: "0.45rem" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 04: BẠN MUỐN SỐNG THẾ NÀO Ở ĐÀ NẴNG? (100% ALIGNED FORM & WRAPPED PILLS) */}
          <section className="page-container" id="find-home-section">
            <div className="kin-lead-section-box">
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#F5D9B8", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  {tx("TỔ ẤM BẮT ĐẦU TỪ CUỘC TRÒ CHUYỆN", "YOUR HOME STARTS WITH A CONVERSATION", "理想之家始于一次沟通", "ДОМ НАЧИНАЕТСЯ С ДИАЛОГА", "대화로 시작하는 다낭의 내 집 찾기", "理想の住まいは対話から")}
                </span>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(2rem, 3.4vw, 2.85rem)", fontWeight: 800, margin: "0.4rem 0 0.85rem", lineHeight: 1.15 }}>
                  {tx("Bạn muốn sống thế nào ở Đà Nẵng?", "How do you want to live in Da Nang?", "您想在岘港过怎样的生活？", "Как вы хотите жить в Дананге?", "다낭에서 어떤 삶을 꿈꾸시나요?", "ダナンでどんな暮らしをしたいですか？")}
                </h2>
                <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                  {tx(
                    "Hãy cho chúng tôi biết ngân sách và ngày dự kiến chuyển đến. Chuyên viên KIN Estates tại Đà Nẵng sẽ gửi danh sách các căn hộ phù hợp nhất qua Zalo, WhatsApp hoặc Telegram của bạn.",
                    "Share your monthly budget and target move-in date. Our KIN Estates specialists in Da Nang will send a tailored shortlist directly to your Zalo, WhatsApp, or Telegram.",
                    "告诉我们您的预算和预计入住日期。KIN Estates 岘港顾问将通过 Zalo、WhatsApp 或 Telegram 为您发送匹配的房源清单。",
                    "Укажите бюджет и дату заезда. Специалист KIN Estates в Дананге отправит подборку квартир в ваш Zalo, WhatsApp или Telegram.",
                    "예산과 입주 예정일을 알려주세요. KIN Estates 다낭 전문가가 Zalo, WhatsApp 또는 Telegram으로 맞춤 매물 리스트를 보내드립니다.",
                    "ご予算と入居予定日をお知らせください。KIN Estatesのダナン担当者がZalo、WhatsApp、またはTelegramへ厳選リストをお送りします。"
                  )}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.86rem", color: "#F5D9B8" }}>
                  <span>✓ {tx("Miễn phí 100% dịch vụ tư vấn & dẫn đi xem nhà", "100% free tenant advisory & private viewings", "租客咨询与带看服务 100% 免费", "100% бесплатно для арендаторов", "임대 상담 및 현장 투어 100% 무료", "ご相談・内覧サポートは100%無料")}</span>
                  <span>✓ {tx("Chỉ gửi căn hộ thật đang trống, đã kiểm tra ánh sáng & độ ồn", "Only verified available units audited for light & acoustics", "仅发送实地核验采光与隔音的真实空房", "Только проверенные квартиры (свет и тишина)", "채광·방음 실사를 마친 실제 공실 매물만 안내", "採光・防音を現地確認した実際の空室のみをご案内")}</span>
                  <span>✓ {tx("Phản hồi đa ngôn ngữ: VI · EN · 中文 · RU · KO · JA", "Multilingual team: VI · EN · 中文 · RU · KO · JA", "多语言顾问团队：VI · EN · 中文 · RU · KO · JA", "Поддержка на 6 языках: VI · EN · 中文 · RU · KO · JA", "6개 국어 지원: VI · EN · 中文 · RU · KO · JA", "6ヶ国語対応：VI · EN · 中文 · RU · KO · JA")}</span>
                </div>
              </div>

              <form
                onSubmit={(e) => handleLeadSubmit(e)}
                className="kin-lead-form-card"
              >
                <div className="kin-form-row-2">
                  <div className="kin-form-field">
                    <label className="astryx-select-label">
                      {currency === "VND"
                        ? tx("NGÂN SÁCH (VNĐ / THÁNG)", "BUDGET (VND / MONTH)", "月租预算 (VND / 月)", "БЮДЖЕТ (VND / МЕС)", "월 예산 (VND / 월)", "月額ご予算 (VND / 月)")
                        : tx("NGÂN SÁCH ($ / THÁNG)", "BUDGET ($ / MONTH)", "月租预算 ($ / 月)", "БЮДЖЕТ ($ / МЕС)", "월 예산 ($ / 월)", "月額ご予算 ($ / 月)")}
                    </label>
                    <input
                      type="text"
                      name="budgetUsd"
                      className="modern-search-input"
                      value={
                        currency === "VND"
                          ? fmtCurrencyStr(`$${leadBudget}`)
                          : `$${leadBudget}`
                      }
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        if (digits) setLeadBudget(digits);
                      }}
                    />
                  </div>
                  <div className="kin-form-field">
                    <label className="astryx-select-label">
                      {tx("NGÀY CHUYỂN ĐẾN", "MOVE-IN DATE", "预计入住日期", "ДАТА ЗАЕЗДА", "입주 희망 시기", "入居予定時期")}
                    </label>
                    <input
                      type="text"
                      name="moveInDate"
                      className="modern-search-input"
                      value={leadMoveIn}
                      onChange={(e) => setLeadMoveIn(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.05rem" }}>
                  <label className="astryx-select-label" style={{ marginBottom: "0.42rem" }}>
                    {tx("SỐ PHÒNG NGỦ MONG MUỐN", "PREFERRED BEDROOMS", "期望卧室数量", "КОЛИЧЕСТВО СПАЛЕН", "희망 침실 수", "ご希望の寝室数")}
                  </label>
                  <div className="kin-bedroom-pills-wrap">
                    {[
                      { id: "any", label: tx("Bất kỳ", "Any", "不限", "Любое", "전체", "指定なし") },
                      { id: "studio", label: "Studio" },
                      { id: "1br", label: tx("1 phòng ngủ", "1 BR", "1 卧室", "1 спальня", "1베드룸", "1LDK") },
                      { id: "2br", label: tx("2 phòng ngủ", "2 BR", "2 卧室", "2 спальни", "2베드룸", "2LDK") },
                      { id: "3br", label: tx("Từ 3 phòng ngủ", "3+ BR", "3+ 卧室", "3+ спальни", "3베드룸+", "3LDK+") }
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`filter-chip-btn ${leadBedrooms === b.label || (b.id === "2br" && leadBedrooms === "2 phòng ngủ") ? "active" : ""}`}
                        onClick={() => setLeadBedrooms(b.label)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="kin-form-row-contact">
                  <div className="kin-form-field">
                    <label className="astryx-select-label">
                      {tx("KÊNH LIÊN HỆ", "MESSENGER", "联系渠道", "МЕССЕНДЖЕР", "연락 채널", "連絡アプリ")}
                    </label>
                    <CustomSelect
                      value={leadMessenger}
                      options={[
                        { value: "Zalo", label: "Zalo" },
                        { value: "WhatsApp", label: "WhatsApp" },
                        { value: "Telegram", label: "Telegram" }
                      ]}
                      onChange={setLeadMessenger}
                    />
                  </div>
                  <div className="kin-form-field">
                    <label className="astryx-select-label">
                      {tx("SỐ ĐT HOẶC @USERNAME *", "PHONE OR @USERNAME *", "电话号码或 @用户名 *", "ТЕЛЕФОН ИЛИ @USERNAME *", "전화번호 또는 @아이디 *", "電話番号または @ユーザー名 *")}
                    </label>
                    <input
                      type="text"
                      name="contactHandle"
                      className="modern-search-input"
                      required
                      placeholder={tx("VD: 0905... hoặc @username", "e.g. +84... or @username", "例如：+84... 或 @username", "Напр.: +84... или @username", "예: 0905... 또는 @username", "例: +84... または @username")}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.1rem" }}>
                  <label className="astryx-select-label" style={{ marginBottom: "0.38rem" }}>
                    {tx("GHI CHÚ THÊM (BÀN LÀM VIỆC, THÚ CƯNG, KHU VỰC...)", "NOTES (WORK DESK, PETS, DISTRICT...)", "备注需求（办公桌、宠物、偏好区域等）", "ПОЖЕЛАНИЯ (СТОЛ, ЖИВОТНЫЕ, РАЙОН...)", "추가 요청사항 (업무 데스크, 반려동물, 선호 지역...)", "ご要望（ワークデスク、ペット、希望エリアなど）")}
                  </label>
                  <input
                    type="text"
                    name="notes"
                    className="modern-search-input"
                    placeholder={tx("Cần bàn làm việc rộng, gần biển Mỹ Khê, tầng cao thoáng...", "Ergonomic work desk, near My Khe beach, high floor...", "需要宽敞办公桌、靠近美溪海滩、高楼层...", "Рабочий стол, рядом с пляжем Микхе, высокий этаж...", "넓은 데스크, 미케비치 인근, 고층 선호...", "広いデスク、ミーケービーチ近く、高層階希望...")}
                  />
                </div>

                <button type="submit" className="btn-luxe btn-luxe--bronze" style={{ width: "100%", padding: "0.95rem", fontSize: "0.9rem" }}>
                  <span>{tx("Nhận gợi ý căn hộ phù hợp →", "Receive Curated Shortlist →", "获取定制房源推荐 →", "Получить подборку квартир →", "맞춤 아파트 추천 받기 →", "厳選物件リストを受け取る →")}</span>
                </button>

                {bookingFeedback && (
                  <div style={{ marginTop: "0.75rem", fontSize: "0.84rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {bookingFeedback}
                  </div>
                )}
              </form>
            </div>
          </section>

          {/* SECTION 05: NHỮNG ĐIỀU CẦN BIẾT VỀ ĐÀ NẴNG (FAQ) */}
          <section className="page-container">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "2.5rem", alignItems: "start" }}>
              <div>
                <span className="eyebrow-badge">
                  {tx("TRƯỚC KHI CHUYỂN NHÀ", "BEFORE YOU RELOCATE", "搬家前必读", "ПЕРЕД ПЕРЕЕЗДОМ", "다낭 이주 전 필수 체크", "ダナン移住前の基礎知識")}
                </span>
                <h2 className="section-heading-serif" style={{ marginBottom: "0.85rem" }}>
                  {tx("Những điều cần biết khi thuê căn hộ dài hạn tại Đà Nẵng.", "Essential Questions About Long-Term Rentals in Da Nang.", "在岘港长期租房需要了解的关键问题。", "Важные вопросы о долгосрочной аренде в Дананге.", "다낭 장기 임대 시 꼭 알아야 할 핵심 질문.", "ダナン長期賃貸に関するよくあるご質問。")}
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  {tx(
                    "Giải đáp nhanh các thắc mắc phổ biến nhất về thời hạn hợp đồng, chi phí điện nước EVN, visa và thủ tục đăng ký tạm trú cho người nước ngoài.",
                    "Clear answers on minimum lease durations, official state EVN electricity rates, visas, and mandatory ward police registration.",
                    "快速解答关于起租期、国家电网 EVN 电费、签证以及外国人暂住登记的常见问题。",
                    "Ответы на главные вопросы о сроках договора, тарифах EVN, визах и регистрации иностранцев.",
                    "최소 계약 기간, 국가 표준 전기·수도 요금, 비자 및 외국인 거주 등록(NA17)에 대한 명확한 안내.",
                    "契約期間、EVN電気料金、ビザ、外国人滞在登録（Form NA17）に関する明確な回答。"
                  )}
                </p>
                <button type="button" className="btn-luxe btn-luxe--outline" onClick={() => navigate("/guides")}>
                  <span>{tx("Đọc trọn bộ Cẩm nang Đà Nẵng →", "Read All Da Nang Guides →", "阅读完整岘港生活指南 →", "Читать все гиды по Данангу →", "다낭 생활 가이드 전체 보기 →", "ダナン生活ガイドをすべて読む →")}</span>
                </button>
              </div>

              <div className="faq-accordion-list">
                {FAQ_DATA.map((item, idx) => {
                  const isOpen = openFaqIdx === idx;
                  return (
                    <div key={idx} className="faq-item">
                      <button
                        type="button"
                        className="faq-trigger"
                        onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      >
                        <span>{item.q[lang] || item.q.en}</span>
                        <span style={{ fontSize: "1.25rem", color: "var(--accent-bronze-dark)" }}>
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="faq-body">
                          {fmtCurrencyStr(item.a[lang] || item.a.en)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 06 & 07: BẢNG TÓM TẮT THỊ TRƯỜNG & CHỈ SỐ GIÁ THUÊ ĐÀ NẴNG */}
          <section className="page-container" style={{ paddingBottom: "4rem" }}>
            <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "2.5rem", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)" }}>
              <span className="eyebrow-badge">
                {tx("KIN ESTATES — BÁO CÁO DỮ LIỆU THỊ TRƯỜNG", "KIN ESTATES — MARKET DATA REPORT", "KIN ESTATES — 岘港市场数据报告", "KIN ESTATES — ОТЧЕТ О РЫНКЕ", "KIN ESTATES — 다낭 임대 시장 리포트", "KIN ESTATES — ダナン賃貸市場データ")}
              </span>
              <h2 className="section-heading-serif" style={{ marginBottom: "0.65rem" }}>
                {tx("Tổng quan thị trường & Bảng giá trung vị căn hộ Đà Nẵng", "Da Nang Rental Market Overview & Median Price Index", "岘港公寓租赁市场概览与中位价格指数", "Обзор рынка и медианные цены на квартиры в Дананге", "다낭 아파트 임대 시장 개요 및 중간 가격 지수", "ダナン賃貸市場の概要と家賃中央値インデックス")}
              </h2>
              <p style={{ color: "var(--text-secondary)", maxWidth: "70ch", marginBottom: "1.75rem" }}>
                {tx(
                  "Dữ liệu tổng hợp trực tiếp từ danh mục căn hộ kiểm duyệt thực tế tại Đà Nẵng (The Panoma, The Filmore, Hiyori Garden Tower, The Monarchy, Azura và khu An Thượng).",
                  "Live benchmarks aggregated from verified long-term residences across The Panoma, The Filmore, Hiyori Garden Tower, The Monarchy, Azura, and An Thuong.",
                  "数据直接汇总自岘港实地核验房源（The Panoma、The Filmore、Hiyori Garden Tower、The Monarchy、Azura 与安上区）。",
                  "Данные по проверенным резиденциям в The Panoma, The Filmore, Hiyori Garden Tower, The Monarchy, Azura и Ан Тхыонг.",
                  "더 파노마, 더 필모어, 히요리 가든 타워, 더 모나키, 아주라 및 안트엉 지역의 실사 매물 기준 데이터입니다.",
                  "The Panoma、The Filmore、Hiyori Garden Tower、The Monarchy、Azura、アントゥオン地区の実査物件データ。"
                )}
              </p>

              <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
                <table className="luxe-data-table">
                  <thead>
                    <tr>
                      <th>{tx("Phân khúc căn hộ", "Unit Category", "户型类别", "Категория", "유형", "間取りタイプ")}</th>
                      <th>{tx("Tình trạng nguồn cung", "Primary Buildings", "主要大楼/区域", "Основные здания", "주요 건물/지역", "主な建物・エリア")}</th>
                      <th>{tx("Giá thấp nhất (Từ)", "Entry Price (From)", "最低月租 (起)", "Цена от", "최저가 (부터)", "最低家賃")}</th>
                      <th>{tx("Giá trung vị (Median)", "Median Rent", "中位月租 (Median)", "Медиана", "중간 임대료", "中央値 (Median)")}</th>
                      <th>{tx("Phân khúc cao cấp / Penthouse", "Luxury / Penthouse", "高端 / 顶层公寓", "Премиум / Пентхаус", "하이엔드 / 펜트하우스", "ラグジュアリー / ペントハウス")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{tx("Căn hộ 1 Phòng ngủ / Studio", "Studio / 1-Bedroom Apartment", "单间 / 一居室公寓", "Студия / 1 спальня", "스튜디오 / 1베드룸", "スタジオ / 1ベッドルーム")}</strong></td>
                      <td>{trArea("An Thượng")}, The Panoma, Filmore</td>
                      <td>{fmtCurrencyStr("$577")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</td>
                      <td><strong>{fmtCurrencyStr("$885")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</strong></td>
                      <td>{fmtCurrencyStr("$1,077")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</td>
                    </tr>
                    <tr>
                      <td><strong>{tx("Căn hộ 2 Phòng ngủ (Phổ biến nhất)", "2-Bedroom Residence (Most Popular)", "两居室公寓 (最受欢迎)", "2 спальни (Популярные)", "2베드룸 (가장 인기)", "2ベッドルーム (一番人気)")}</strong></td>
                      <td>The Panoma, Hiyori, Monarchy, Filmore</td>
                      <td>{fmtCurrencyStr("$731")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</td>
                      <td><strong>{fmtCurrencyStr("$1,038")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</strong></td>
                      <td>{fmtCurrencyStr("$1,923")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</td>
                    </tr>
                    <tr>
                      <td><strong>{tx("Căn hộ 3 Phòng ngủ & Biệt thự", "3-Bedroom & Private Villas", "三居室与独栋别墅", "3 спальни и виллы", "3베드룸 & 풀빌라", "3ベッドルーム＆ヴィラ")}</strong></td>
                      <td>The Panoma, Nam Viet A, My Khe</td>
                      <td>{fmtCurrencyStr("$1,450")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</td>
                      <td><strong>{fmtCurrencyStr("$1,731")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</strong></td>
                      <td>{fmtCurrencyStr("$2,500+")} / {tx("tháng", "mo", "月", "мес", "월", "月")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                <div style={{ background: "var(--bg-ivory)", padding: "1.15rem", borderRadius: "14px" }}>
                  <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.25rem" }}>
                    {tx("Toà nhà nổi bật", "Premier Towers", "热门公寓大楼", "Топовые комплексы", "대표 랜드마크 타워", "主要レジデンス")}
                  </strong>
                  {fmtCurrencyStr("The Panoma ($654–$1,923), The Filmore ($980–$2,100), Hiyori Garden Tower ($769+), The Monarchy ($731+).")}
                </div>
                <div style={{ background: "var(--bg-ivory)", padding: "1.15rem", borderRadius: "14px" }}>
                  <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.25rem" }}>
                    {tx("Điều kiện thuê tiêu chuẩn", "Standard Lease Terms", "标准租赁条款", "Стандартные условия", "표준 임대 조건", "標準契約条件")}
                  </strong>
                  {tx(
                    "Hợp đồng 3–6 tháng hoặc 1 năm, đặt cọc 1 tháng, thanh toán 1–3 tháng/lần, điện nước giá nhà nước EVN.",
                    "3–12 month contracts, 1-month security deposit, 1–3 month payment cycles, official EVN state utility rates.",
                    "3–12个月合同，押一付一或押一付三，水电按越南国家电网 EVN 标准计费。",
                    "Договор 3–12 мес., депозит 1 мес., оплата за 1–3 мес., гос. тарифы EVN.",
                    "3~12개월 계약, 보증금 1개월, 1~3개월 단위 납부, 국가 표준 EVN 전기·수도 요금.",
                    "3〜12ヶ月契約、敷金1ヶ月、1〜3ヶ月払い、国営EVN標準光熱費。"
                  )}
                </div>
                <div style={{ background: "var(--bg-ivory)", padding: "1.15rem", borderRadius: "14px" }}>
                  <strong style={{ color: "var(--text-primary)", display: "block", marginBottom: "0.25rem" }}>
                    {tx("Pháp lý & Hỗ trợ", "Legal & Registration", "法律与暂住支持", "Юридическая поддержка", "법률 및 거주 등록 지원", "法務・滞在登録サポート")}
                  </strong>
                  {tx(
                    "Hợp đồng song ngữ Việt – Anh, hỗ trợ đăng ký tạm trú (Form NA17) và bàn giao thiết bị bằng hình ảnh.",
                    "Bilingual Vietnamese–English leases, ward police registration (Form NA17), and full photo handover inventory.",
                    "越英双语合同，免费协助派出所暂住登记（NA17表）及拍照交房核验。",
                    "Двуязычный договор, регистрация в полиции (форма NA17) и фото-опись при заезде.",
                    "이중언어 계약서, 공안 거주 등록(Form NA17) 및 입주 시 사진 인벤토리 점검.",
                    "バイリンガル契約書、警察滞在登録（Form NA17）、写真付き入居チェック。"
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ====================================================================
          PAGE 2: CĂN HỘ (/apartments) — 100% 6-LANGUAGE SYNCHRONIZED
          ==================================================================== */}
      {route === "/apartments" && (
        <main className="page-route">
          <div className="page-container">
            <div style={{ marginBottom: "1.75rem" }}>
              <span className="eyebrow-badge">
                {tx("DANH MỤC CĂN HỘ DÀI HẠN ĐÀ NẴNG", "DA NANG LONG-TERM RESIDENCES", "岘港长期公寓与别墅目录", "КАТАЛОГ КВАРТИР В ДАНАНГЕ", "다낭 장기 임대 아파트 카탈로그", "ダナン長期賃貸物件一覧")}
              </span>
              <h1 className="section-heading-serif">
                {tx(
                  "Cho thuê căn hộ chung cư Đà Nẵng dài hạn — Tổ ấm theo nhịp sống riêng.",
                  "Long-Term Apartments & Villas in Da Nang — Curated for Your Rhythm.",
                  "岘港长期公寓与别墅租赁 — 契合您生活节奏的理想居所。",
                  "Долгосрочная аренда квартир и вилл в Дананге — дом в вашем ритме.",
                  "다낭 장기 임대 아파트 & 풀빌라 — 당신의 라이프스타일에 맞춘 공간.",
                  "ダナン長期賃貸アパート＆ヴィラ — あなたの暮らしに寄り添う住まい。"
                )}
              </h1>
            </div>

            <div style={{ background: "#FFFFFF", padding: "1.25rem", borderRadius: "18px", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)", marginBottom: "1.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem", marginBottom: "1rem" }}>
                <div className="kin-form-field">
                  <label className="astryx-select-label">
                    {tx("TÌM TOÀ NHÀ / KHU VỰC", "SEARCH BUILDING / AREA", "搜索大楼 / 区域", "ПОИСК ЗДАНИЯ / РАЙОНА", "건물명 / 지역 검색", "建物名・エリア検索")}
                  </label>
                  <input
                    type="text"
                    className="modern-search-input"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="The Panoma, Filmore, Hiyori..."
                  />
                </div>
                <div className="kin-form-field">
                  <label className="astryx-select-label">
                    {tx("KHU VỰC ĐÀ NẴNG", "DA NANG DISTRICT", "岘港区域", "РАЙОН ДАНАНГА", "다낭 지역", "ダナンのエリア")}
                  </label>
                  <CustomSelect
                    value={area}
                    options={[
                      { value: "all", label: tx("Tất cả khu vực", "All Districts", "所有区域", "Все районы", "모든 지역", "すべてのエリア") },
                      { value: "An Thượng", label: trArea("An Thượng") },
                      { value: "Ngũ Hành Sơn", label: `${trArea("Ngũ Hành Sơn")} (The Panoma)` },
                      { value: "Hải Châu", label: `${trArea("Hải Châu")} (The Filmore)` },
                      { value: "Sơn Trà", label: `${trArea("Sơn Trà")} (Hiyori / Monarchy)` }
                    ]}
                    onChange={setArea}
                  />
                </div>
                <div className="kin-form-field">
                  <label className="astryx-select-label">
                    {tx("SỐ PHÒNG NGỦ", "BEDROOMS", "卧室数量", "СПАЛЬНИ", "침실 수", "寝室数")}
                  </label>
                  <CustomSelect
                    value={bedrooms}
                    options={[
                      { value: "all", label: tx("Bất kỳ phòng ngủ", "Any Bedrooms", "不限卧室", "Любое кол-во", "모든 침실", "すべて") },
                      { value: "1", label: tx("Studio / 1 phòng ngủ", "Studio / 1 Bedroom", "单间 / 1 卧室", "Студия / 1 спальня", "스튜디오 / 1베드룸", "スタジオ / 1LDK") },
                      { value: "2", label: tx("2 phòng ngủ", "2 Bedrooms", "2 卧室", "2 спальни", "2베드룸", "2LDK") },
                      { value: "3", label: tx("Từ 3 phòng ngủ / Biệt thự", "3+ Bedrooms / Villas", "3+ 卧室 / 别墅", "3+ спальни / Виллы", "3베드룸+ / 풀빌라", "3LDK+ / ヴィラ") }
                    ]}
                    onChange={setBedrooms}
                  />
                </div>
                <div className="kin-form-field">
                  <label className="astryx-select-label">
                    {tx("NGÂN SÁCH TỐI ĐA", "MAX BUDGET", "最高月租预算", "МАКС. БЮДЖЕТ", "최대 예산", "上限ご予算")}
                  </label>
                  <CustomSelect
                    value={maxPrice}
                    options={[
                      { value: "0", label: tx("Mọi mức giá", "Any Price", "不限价格", "Любая цена", "모든 가격대", "すべての価格") },
                      { value: "750", label: fmtCurrencyStr(tx("Dưới $750 / tháng", "Under $750 / mo", "$750 / 月以下", "До $750 / мес", "$750 / 월 이하", "$750 / 月以下")) },
                      { value: "1000", label: fmtCurrencyStr(tx("Dưới $1,000 / tháng", "Under $1,000 / mo", "$1,000 / 月以下", "До $1,000 / мес", "$1,000 / 월 이하", "$1,000 / 月以下")) },
                      { value: "1500", label: fmtCurrencyStr(tx("Dưới $1,500 / tháng", "Under $1,500 / mo", "$1,500 / 月以下", "До $1,500 / мес", "$1,500 / 월 이하", "$1,500 / 月以下")) },
                      { value: "2500", label: fmtCurrencyStr(tx("Dưới $2,500 / tháng", "Under $2,500 / mo", "$2,500 / 月以下", "До $2,500 / мес", "$2,500 / 월 이하", "$2,500 / 月以下")) }
                    ]}
                    onChange={setMaxPrice}
                  />
                </div>
                <div className="kin-form-field">
                  <label className="astryx-select-label">
                    {tx("SẮP XẾP THEO", "SORT BY", "排序方式", "СОРТИРОВКА", "정렬 기준", "並び替え")}
                  </label>
                  <CustomSelect
                    value={sort}
                    options={[
                      { value: "featured", label: tx("Nổi bật nhất", "Featured First", "精选推荐", "Рекомендуемые", "추천순", "おすすめ順") },
                      { value: "price-asc", label: tx("Giá: Thấp đến Cao", "Price: Low to High", "价格：从低到高", "Цена: по возрастанию", "가격: 낮은순", "価格：安い順") },
                      { value: "price-desc", label: tx("Giá: Cao đến Thấp", "Price: High to Low", "价格：从高到低", "Цена: по убыванию", "가격: 높은순", "価格：高い順") },
                      { value: "size-desc", label: tx("Diện tích lớn nhất", "Largest Size", "面积：从大到小", "По площади", "면적: 넓은순", "面積：広い順") }
                    ]}
                    onChange={setSort}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                <div className="chips-track">
                  {["all", "Gần biển", "View sông Hàn", "Bàn làm việc", "Thú cưng", "Điện EVN", "Biệt thự"].map((tChip) => (
                    <button
                      key={tChip}
                      type="button"
                      className={`filter-chip-btn ${tag === tChip ? "active" : ""}`}
                      onClick={() => setTag(tChip)}
                    >
                      {tChip === "all" ? tx("Tất cả tiêu chí", "All Criteria", "全部条件", "Все критерии", "모든 조건", "すべての条件") : trTag(tChip)}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn-luxe btn-luxe--outline"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.78rem" }}
                    onClick={() => {
                      setQuery("");
                      setArea("all");
                      setBedrooms("all");
                      setMaxPrice("0");
                      setTag("all");
                    }}
                  >
                    {tx("Xoá bộ lọc", "Reset Filters", "重置筛选", "Сбросить", "필터 초기화", "リセット")}
                  </button>
                  <button
                    type="button"
                    className="btn-luxe btn-luxe--navy"
                    style={{ padding: "0.45rem 0.95rem", fontSize: "0.78rem" }}
                    onClick={openMapOverview}
                  >
                    <IconMap size={14} /> {tx("Mở bản đồ lớn", "Expand Map", "展开大地图", "Большая карта", "지도 크게 보기", "大きな地図で見る")} ({filteredApartments.length})
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "7fr 5fr", gap: "1.75rem", alignItems: "start" }} className="catalogue-split-grid">
              <div className="cards-grid">
                {filteredApartments.map(renderApartmentCard)}
              </div>
              <div style={{ position: "sticky", top: "90px", height: "620px", borderRadius: "22px", overflow: "hidden", border: "1px solid var(--border-medium)", boxShadow: "var(--shadow-soft)" }}>
                <div id="catalogue-page-map" style={{ width: "100%", height: "100%" }} />
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ====================================================================
          PAGE 2B: CHI TIẾT TỪNG CĂN HỘ (/apartments/:code) — STREAMLINED PRODUCT PAGE
          ==================================================================== */}
      {catalogueLoaded && detailRouteCode && !currentDetailApt && (
        <main className="page-route">
          <div className="page-container">
            <h1 className="section-heading-serif">
              {tx("Căn hộ này hiện không hiển thị", "This apartment is currently unavailable", "此房源暂不可查看", "Эта квартира сейчас недоступна", "현재 이 매물을 볼 수 없습니다", "現在この物件は表示できません")}
            </h1>
            <button type="button" className="apt-detail-back-btn" onClick={() => navigate("/apartments")}>
              <span>← {tx("Tất cả căn hộ", "All Apartments", "所有公寓", "Все квартиры", "전체 아파트", "すべての物件")}</span>
            </button>
          </div>
        </main>
      )}
      {detailRouteCode && currentDetailApt && (
        <main className="page-route">
          <div className="page-container">
            <div className="apt-detail-streamlined-wrap">
              {/* Top Breadcrumb & Back Navigation */}
              <div className="apt-detail-breadcrumb">
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="apt-detail-back-btn"
                    onClick={() => navigate("/apartments")}
                  >
                    <span>← {tx("Tất cả căn hộ", "All Apartments", "所有公寓", "Все квартиры", "전체 아파트", "すべての物件")}</span>
                  </button>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    {trArea(currentDetailApt.areaName)} · <strong style={{ color: "var(--text-primary)" }}>{currentDetailApt.building}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  className="apt-detail-back-btn"
                  onClick={(e) => toggleSave(e, currentDetailApt.code)}
                >
                  <span>
                    {savedCodes.includes(currentDetailApt.code)
                      ? tx("♥ Đã lưu", "♥ Saved", "♥ 已收藏", "♥ Сохранено", "♥ 저장됨", "♥ 保存済")
                      : tx("♡ Lưu căn hộ", "♡ Save", "♡ 收藏", "♡ Сохранить", "♡ 저장", "♡ 保存")}
                  </span>
                </button>
              </div>

              {/* 1. APARTMENT PHOTO GALLERY + THUMBNAILS (With Bottom-Left Counter & Bottom-Right Fullscreen Button) */}
              <div className="apt-detail-gallery-stage">
                <ApartmentPhoto
                  src={activePhotoSource}
                  alt={getLocalized(currentDetailApt.title)}
                  unavailableText={photoUnavailable}
                  fallbackStyle={fillPhotoSlot}
                  onClick={() => setFullscreenPhotoOpen(true)}
                  style={{ cursor: "zoom-in" }}
                />

                {activePhotoSource && (
                  <>
                    <div className="apt-gallery-bottom-counter">{activePhotoIdx + 1} / {detailPhotos.length}</div>
                    <button
                      type="button"
                      className="apt-gallery-fullscreen-btn"
                      onClick={() => setFullscreenPhotoOpen(true)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                      <span>{tx("Toàn màn hình", "Fullscreen", "全屏查看", "На весь экран", "전체 화면", "全画面表示")}</span>
                    </button>
                  </>
                )}

                {detailPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="kin-dialog-gallery-nav prev"
                      onClick={() => selectPhoto(activePhotoIdx === 0 ? detailPhotos.length - 1 : activePhotoIdx - 1)}
                      aria-label="Previous image"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="kin-dialog-gallery-nav next"
                      onClick={() => selectPhoto((activePhotoIdx + 1) % detailPhotos.length)}
                      aria-label="Next image"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              {/* Horizontal Thumbnail Strip */}
              {detailPhotos.length > 0 && (
                <div className="apt-detail-thumbs-row">
                  {detailPhotos.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`apt-detail-thumb-item ${activePhotoIdx === i ? "active" : ""}`}
                      aria-label={`${tx("Xem ảnh", "View photo", "查看照片", "Смотреть фото", "사진 보기", "写真を見る")} ${i + 1}`}
                      aria-pressed={activePhotoIdx === i}
                      onClick={() => selectPhoto(i)}
                    >
                      <ApartmentPhoto
                        src={img} alt="" loading="lazy"
                        unavailableText={photoUnavailable} fallbackStyle={fillPhotoSlot}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* 2. CONTACT & BOOKING CARD IMMEDIATELY BELOW APARTMENT PHOTOS ("BƯỚC TIẾP THEO CỦA BẠN") */}
              <aside className="apt-next-step-card">
                <div className="apt-next-step-eyebrow">
                  {tx("BƯỚC TIẾP THEO CỦA BẠN", "YOUR NEXT STEP", "您的下一步", "ВАШ СЛЕДУЮЩИЙ ШАГ", "다음 단계 안내", "次のステップ")}
                </div>

                <div className="apt-next-step-price-row">
                  <span className="apt-next-step-price-val">
                    {currency === "VND"
                      ? `${((currentDetailApt.priceVnd || currentDetailApt.priceUsd * 25480) / 1000000).toFixed(1)}tr ₫`
                      : `$${Number(currentDetailApt.priceUsd).toLocaleString()}`}
                  </span>
                  <span className="apt-next-step-price-unit">
                    / {tx("tháng", "month", "月", "месяц", "월", "月")}
                  </span>
                </div>

                <p className="apt-next-step-desc">
                  {tx(
                    "Hãy đến xem nhà. Chúng tôi sẽ hẹn thời gian phù hợp với bạn.",
                    "Come see the apartment in person or via live 4K video. We'll arrange a time that works for you.",
                    "欢迎实地或视频看房。我们将为您安排最合适的时间。",
                    "Приходите на просмотр. Мы подберем удобное для вас время.",
                    "현장 방문 또는 4K 영상으로 집을 둘러보세요. 편하신 시간에 맞춰 투어를 잡아드립니다.",
                    "現地またはビデオ内覧へどうぞ。ご都合の良い時間をお手配いたします。"
                  )}
                </p>

                <button
                  type="button"
                  className="apt-next-step-cta"
                  onClick={() => openBookingModal(currentDetailApt)}
                >
                  <span>{tx("Hẹn xem hoặc đặt phòng", "Request a viewing or booking", "预约看房或申请预订", "Запросить просмотр или бронь", "투어 또는 예약 요청", "内覧・入居予約のリクエスト")}</span>
                  <span className="apt-next-step-cta-arrow">→</span>
                </button>

                <div className="apt-next-step-or">
                  {tx("Hoặc nhắn cho chúng tôi", "Or message us directly", "或直接发消息联系我们", "Или напишите нам", "또는 메신저로 바로 문의", "または直接メッセージ")}
                </div>

                <div className="apt-messenger-pills">
                  <a
                    href="https://zalo.me/0389711601"
                    target="_blank"
                    rel="noreferrer"
                    className="apt-messenger-pill"
                    onClick={() => trackDirectContact("Zalo", currentDetailApt)}
                  >
                    <span className="apt-messenger-icon zalo">Zalo</span>
                    <span>Zalo</span>
                  </a>

                  <a
                    href="https://wa.me/84389711601"
                    target="_blank"
                    rel="noreferrer"
                    className="apt-messenger-pill"
                    onClick={() => trackDirectContact("WhatsApp", currentDetailApt)}
                  >
                    <span className="apt-messenger-icon whatsapp">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href="https://t.me/KIN_Estates"
                    target="_blank"
                    rel="noreferrer"
                    className="apt-messenger-pill"
                    onClick={() => trackDirectContact("Telegram", currentDetailApt)}
                  >
                    <span className="apt-messenger-icon telegram">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </span>
                    <span>Telegram</span>
                  </a>
                </div>

                <div className="apt-next-step-footnote">
                  {tx(
                    "Giá và tình trạng căn hộ được xác nhận khi xem nhà.",
                    "Price and apartment availability are confirmed when scheduling your viewing.",
                    "租金价格与房源空置状态将在预约看房时为您最终确认。",
                    "Цена и актуальность квартиры подтверждаются перед просмотром.",
                    "임대료와 공실 여부는 투어 예약 시 최종 확인됩니다.",
                    "家賃および空室状況は内覧予約時に最終確認されます。"
                  )}
                </div>
              </aside>

              {/* 3. STREAMLINED APARTMENT DETAILS IMMEDIATELY BELOW CONTACT CARD (No Bottom Map) */}
              <div className="apt-detail-quick-strip">
                {currentDetailApt.bedrooms != null && <span className="apt-detail-quick-item">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4v16" />
                    <path d="M2 8h18a2 2 0 0 1 2 2v10" />
                    <path d="M2 17h20" />
                    <path d="M6 8v9" />
                  </svg>
                  <span>{currentDetailApt.bedrooms} {tx("phòng ngủ", "bedroom(s)", "卧室", "спальни", "침실", "ベッドルーム")}</span>
                </span>}

                {currentDetailApt.sizeM2 != null && <span className="apt-detail-quick-item">
                  <span>{currentDetailApt.sizeM2} m²</span>
                </span>}

              </div>

              <div className="apt-location-details">
                <div>
                  {currentDetailApt.address?.trim() && <strong>{getAptField(currentDetailApt, "address").trim()}</strong>}
                  <span className="apt-location-status">{locationLabel(currentDetailApt)}</span>
                </div>
                {(getExactLocation(currentDetailApt) || getAddressSearchUrl(currentDetailApt)) &&
                  renderLocationAction(currentDetailApt, "apt-detail-map-jump-btn")}
              </div>

              <div>
                <h1 className="section-heading-serif" style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.15rem)", marginBottom: "0.45rem" }}>
                  {getLocalized(currentDetailApt.title)}
                </h1>

                {currentDetailApt.address && (
                  <div style={{ fontSize: "0.88rem", color: "var(--accent-bronze-dark)", fontWeight: 700, marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📍 {getAptField(currentDetailApt, "address")}</span>
                    <span>·</span>
                    <span>
                      {currentDetailApt.status === "Rented"
                        ? tx("🔴 Đã thuê", "🔴 Rented", "🔴 已租", "🔴 Сдано", "🔴 임대완료", "🔴 成約済")
                        : currentDetailApt.status === "Reserved"
                        ? tx("🟡 Đã cọc", "🟡 Reserved", "🟡 已预订", "🟡 Бронь", "🟡 예약중", "🟡 予約中")
                        : tx("🟢 Đang trống", "🟢 Available", "🟢 可租", "🟢 Свободна", "🟢 공실", "🟢 空室")}
                    </span>
                  </div>
                )}

                <p style={{ fontSize: "0.98rem", color: "var(--text-secondary)", lineHeight: 1.72, marginBottom: "1rem" }}>
                  {getLocalized(currentDetailApt.architecturalNotes)}
                </p>

                <div className="apt-compact-info-pills">
                  {currentDetailApt.availableFrom && <span className="apt-compact-info-pill">
                    {tx("Có thể vào từ", "Available from", "可入住日期", "Доступно с", "입주 가능일", "入居可能日")}{" "}
                    {new Date(currentDetailApt.availableFrom + "T00:00:00Z").toLocaleDateString(lang, { timeZone: "UTC" })}
                  </span>}
                  {currentDetailApt.floor != null && <span className="apt-compact-info-pill">
                    {tx("Tầng", "Floor", "楼层", "Этаж", "층", "階")} {currentDetailApt.floor}
                  </span>}
                  {currentDetailApt.orientation && <span className="apt-compact-info-pill">
                    {getAptField(currentDetailApt, "orientation")}
                  </span>}
                  {currentDetailApt.electricityRate && <span className="apt-compact-info-pill">
                    {getAptField(currentDetailApt, "electricityRate")}
                  </span>}
                  {currentDetailApt.waterRate && <span className="apt-compact-info-pill">
                    {getAptField(currentDetailApt, "waterRate")}
                  </span>}
                  {currentDetailApt.remoteWorkSetup && <span className="apt-compact-info-pill">
                    {getAptField(currentDetailApt, "remoteWorkSetup")}
                  </span>}
                  {currentDetailApt.petPolicy && <span className="apt-compact-info-pill">
                    {getAptField(currentDetailApt, "petPolicy")}
                  </span>}
                  {currentDetailApt.minLeaseMonths != null && <span className="apt-compact-info-pill">
                    {tx("Từ", "Min", "起租", "От", "최소", "最低")} {currentDetailApt.minLeaseMonths} {tx("tháng", "months", "个月", "мес", "개월", "ヶ月")}
                  </span>}
                  {currentDetailApt.depositMonths != null && <span className="apt-compact-info-pill">
                    {tx("Cọc", "Deposit", "押金", "Депозит", "보증금", "敷金")} {currentDetailApt.depositMonths} {tx("tháng", "mo", "个月", "мес", "개월", "ヶ月")}
                  </span>}
                  {getAptTags(currentDetailApt).map((tTag) => (
                    <span key={tTag} className="apt-compact-info-pill">
                      {tTag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Fullscreen Lightbox when clicking "⛶ Toàn màn hình" */}
            {fullscreenPhotoOpen && activePhotoSource && (
              <div className="homii-dialog-backdrop" onClick={() => setFullscreenPhotoOpen(false)}>
                <div style={{ position: "relative", maxWidth: "92vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="kin-booking-close-circle"
                    style={{ top: "-18px", right: "-18px" }}
                    onClick={() => setFullscreenPhotoOpen(false)}
                    aria-label="Close fullscreen photo"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  <ApartmentPhoto
                    src={activePhotoSource}
                    alt={getLocalized(currentDetailApt.title)}
                    unavailableText={photoUnavailable}
                    fallbackStyle={{ width: "min(72vw, 560px)", aspectRatio: "16 / 10", borderRadius: "20px" }}
                    style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: "20px", objectFit: "contain", display: "block", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
                  />
                </div>
              </div>
            )}

            {/* ================================================================
                ALL OTHER APARTMENTS SECTION BELOW DETAIL PAGE
                ================================================================ */}
            <section style={{ paddingTop: "2.25rem", borderTop: "1px solid rgba(22, 25, 30, 0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.35rem" }}>
                <div>
                  <span className="eyebrow-badge">
                    {tx("KHÁM PHÁ THÊM DANH MỤC CĂN HỘ", "MORE CURATED RESIDENCES IN DA NANG", "探索更多岘港精选房源", "ДРУГИЕ КВАРТИРЫ В ДАНАНГЕ", "다낭의 다른 추천 매물 둘러보기", "その他のダナン厳選物件")}
                  </span>
                  <h2 className="section-heading-serif">
                    {tx(
                      "Tất cả các căn hộ khác đang mở thuê tại Đà Nẵng",
                      "All Other Available Residences in Da Nang",
                      "岘港所有其他当前可租公寓与别墅",
                      "Все остальные доступные резиденции в Дананге",
                      "현재 임대 가능한 다른 모든 아파트 & 풀빌라",
                      "現在募集中その他の全レジデンス"
                    )}
                  </h2>
                </div>

                <div className="chips-track">
                  {[
                    { id: "all", label: tx("Tất cả căn hộ", "All Units", "全部房源", "Все", "전체", "すべて") },
                    { id: "same-area", label: `${tx("Cùng khu vực:", "Same District:", "同区域:", "Тот же район:", "같은 지역:", "同エリア:")} ${trArea(currentDetailApt.areaName)}` },
                    { id: "1", label: tx("1 phòng ngủ", "1 Bedroom", "1 卧室", "1 спальня", "1베드룸", "1LDK") },
                    { id: "2", label: tx("2 phòng ngủ", "2 Bedrooms", "2 卧室", "2 спальни", "2베드룸", "2LDK") },
                    { id: "3", label: tx("3+ phòng ngủ & Biệt thự", "3+ BR & Villas", "3+ 卧室与别墅", "3+ спальни", "3베드룸+", "3LDK+") }
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`filter-chip-btn ${detailPageOtherFilter === f.id ? "active" : ""}`}
                      onClick={() => setDetailPageOtherFilter(f.id)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cards-grid">
                {apartments
                  .filter((a) => a.code !== currentDetailApt.code)
                  .filter((a) => {
                    if (detailPageOtherFilter === "same-area") return a.areaName === currentDetailApt.areaName;
                    if (detailPageOtherFilter === "1") return a.bedrooms === 1;
                    if (detailPageOtherFilter === "2") return a.bedrooms === 2;
                    if (detailPageOtherFilter === "3") return (a.bedrooms ?? -1) >= 3;
                    return true;
                  })
                  .map(renderApartmentCard)}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* ====================================================================
          PAGE 3: KHU VỰC (/areas) — 100% 6-LANGUAGE SYNCHRONIZED
          ==================================================================== */}
      {route === "/areas" && (
        <main className="page-route">
          <div className="page-container">
            <div style={{ marginBottom: "2rem" }}>
              <span className="eyebrow-badge">
                {tx("LÀM QUEN VỚI KHU PHỐ ĐÀ NẴNG", "EXPLORE DA NANG NEIGHBORHOODS", "深入了解岘港核心街区", "ГИД ПО РАЙОНАМ ДАНАНГА", "다낭 주요 지역 가이드", "ダナンの主要エリアガイド")}
              </span>
              <h1 className="section-heading-serif">
                {tx(
                  "Nên thuê nhà ở khu nào Đà Nẵng — Chọn khu phố. Tìm cảm giác thân quen.",
                  "Where to Live in Da Nang — Choose Your Neighborhood & Daily Rhythm.",
                  "在岘港租房住哪里好 — 选择契合您生活氛围的街区。",
                  "В каком районе Дананга жить — выберите свой ритм и атмосферу.",
                  "다낭 어디에 살까? — 나에게 맞는 동네와 일상 리ズム 찾기.",
                  "ダナンのどこに住む？ — 心地よい街と暮らしのリズムを選ぶ。"
                )}
              </h1>
              <p style={{ color: "var(--text-secondary)", maxWidth: "66ch", marginTop: "0.4rem" }}>
                {tx(
                  "Khám phá nhịp sống buổi sáng, ban ngày và buổi tối tại từng khu vực, cùng những điều cần kiểm tra thực tế trước khi ký hợp đồng.",
                  "Explore morning, daytime, and evening atmospheres across each district, plus our on-site inspection notes before signing a lease.",
                  "探索每个街区的晨间、白天与夜晚生活氛围，以及签约前必看的实地核验提示。",
                  "Узнайте, как живут районы утром, днем и вечером, а также на что обратить внимание при осмотре.",
                  "각 지역의 아침, 낮, 저녁 분위기와 계약 전 현장에서 꼭 확인해야 할 체크포인트를 살펴보세요.",
                  "各エリアの朝・昼・夜の雰囲気と、契約前に現地で確認すべきチェックポイントをご紹介します。"
                )}
              </p>
            </div>

            {activeDistrict && (
              <div className="district-explorer-grid" style={{ marginBottom: "3rem" }}>
                <div className="district-tab-list">
                  {neighborhoods.map((n, idx) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`district-tab-btn ${idx === activeDistrictIdx ? "active" : ""}`}
                      onClick={() => setActiveDistrictIdx(idx)}
                    >
                      <div>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, opacity: 0.75 }}>
                          0{idx + 1} · {trField(n.rentRangeUsd)}
                        </div>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700 }}>
                          {trArea(n.name)}
                        </div>
                        <div style={{ fontSize: "0.82rem", opacity: 0.85 }}>{trField(n.subtitle)}</div>
                      </div>
                      <span style={{ fontSize: "0.76rem", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{n.unitCount} {tx("căn", "units", "套", "объектов", "호실", "件")}</span>
                    </button>
                  ))}
                </div>

                <div style={{ background: "#FFFFFF", borderRadius: "22px", padding: "2rem", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                    <div>
                      <span className="eyebrow-badge">{tx("KHU VỰC", "DISTRICT", "街区", "РАЙОН", "지역", "エリア")} 0{activeDistrictIdx + 1}</span>
                      <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem" }}>{trArea(activeDistrict.name)} — {trField(activeDistrict.subtitle)}</h2>
                    </div>
                    <button
                      type="button"
                      className="btn-luxe btn-luxe--navy"
                      onClick={() => {
                        setArea(activeDistrict.name);
                        navigate("/apartments");
                      }}
                    >
                      <span>{tx(`Xem căn hộ tại ${activeDistrict.name} →`, `View ${trArea(activeDistrict.name)} Units →`, `查看 ${trArea(activeDistrict.name)} 房源 →`, `Квартиры в ${trArea(activeDistrict.name)} →`, `${trArea(activeDistrict.name)} 매물 보기 →`, `${trArea(activeDistrict.name)} の物件を見る →`)}</span>
                    </button>
                  </div>

                  <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                    {trField(activeDistrict.architecturalCharacter)}
                  </p>

                  <div className="chips-track" style={{ marginBottom: "1rem" }}>
                    {[
                      { key: "morning", label: tx("Nhịp sống buổi sáng", "Morning Rhythm", "晨间氛围", "Утренний ритм", "아침 분위기", "朝の雰囲気") },
                      { key: "day", label: tx("Làm việc ban ngày", "Daytime Work", "日间办公", "Дневная работа", "낮 시간 & 업무", "日中のリモートワーク") },
                      { key: "evening", label: tx("Không gian buổi tối", "Evening Vibe", "夜晚生活", "Вечерняя атмосфера", "저녁 분위기", "夜の雰囲気") }
                    ].map((rt) => (
                      <button
                        key={rt.key}
                        type="button"
                        className={`filter-chip-btn ${rhythmTab === rt.key ? "active" : ""}`}
                        onClick={() => setRhythmTab(rt.key as any)}
                      >
                        {rt.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ background: "var(--bg-ivory)", padding: "1.25rem", borderRadius: "16px", marginBottom: "1.25rem", fontSize: "0.92rem" }}>
                    {rhythmTab === "morning" && trField(activeDistrict.morningVibe)}
                    {rhythmTab === "day" && trField(activeDistrict.daytimeVibe)}
                    {rhythmTab === "evening" && trField(activeDistrict.eveningVibe)}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                    <div style={{ background: "#FDF8F3", padding: "1.1rem", borderRadius: "14px", border: "1px solid rgba(197,155,109,0.3)" }}>
                      <strong style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--accent-bronze-dark)", display: "block", marginBottom: "0.3rem" }}>
                        {tx("ĐIỀU CẦN CÂN NHẮC", "THINGS TO CONSIDER", "需要注意的事项", "ЧТО УЧЕСТЬ", "고려해야 할 점", "検討ポイント")}
                      </strong>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{trField(activeDistrict.considerations)}</p>
                    </div>
                    <div style={{ background: "#F3F8F6", padding: "1.1rem", borderRadius: "14px", border: "1px solid rgba(25,107,82,0.25)" }}>
                      <strong style={{ fontSize: "0.78rem", textTransform: "uppercase", color: "var(--accent-emerald)", display: "block", marginBottom: "0.3rem" }}>
                        {tx("KIỂM TRA TẠI CHỖ KHI XEM NHÀ", "ON-SITE VIEWING CHECKLIST", "看房现场核验清单", "ПРОВЕРКА НА МЕСТЕ", "현장 방문 시 체크리스트", "内覧時の現地チェック項目")}
                      </strong>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{trField(activeDistrict.onSiteChecklist)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "2.25rem", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)", marginBottom: "3rem" }}>
              <span className="eyebrow-badge">
                {tx("SO SÁNH TRỰC TIẾP", "SIDE-BY-SIDE COMPARISON", "街区直观对比", "СРАВНЕНИЕ РАЙОНОВ", "지역 1:1 직접 비교", "エリア徹底比較")}
              </span>
              <h2 className="section-heading-serif" style={{ marginBottom: "1.25rem" }}>
                {tx("Đặt hai khu vực cạnh nhau", "Compare Two Da Nang Districts Side by Side", "将两个区域放在一起对比", "Сравните два района рядом", "두 지역을 나란히 비교해 보세요", "2つのエリアを並べて比較")}
              </h2>

              <div className="kin-form-row-2" style={{ marginBottom: "1.5rem" }}>
                <div className="kin-form-field">
                  <label className="astryx-select-label">{tx("CHỌN KHU VỰC THỨ NHẤT", "FIRST DISTRICT", "选择第一个区域", "ПЕРВЫЙ РАЙОН", "첫 번째 지역 선택", "エリア1を選択")}</label>
                  <CustomSelect
                    value={compareLeftIdx}
                    options={neighborhoods.map((n, i) => ({ value: String(i), label: trArea(n.name), sublabel: trField(n.subtitle) }))}
                    onChange={setCompareLeftIdx}
                  />
                </div>
                <div className="kin-form-field">
                  <label className="astryx-select-label">{tx("CHỌN KHU VỰC THỨ HAI", "SECOND DISTRICT", "选择第二个区域", "ВТОРОЙ РАЙОН", "두 번째 지역 선택", "エリア2を選択")}</label>
                  <CustomSelect
                    value={compareRightIdx}
                    options={neighborhoods.map((n, i) => ({ value: String(i), label: trArea(n.name), sublabel: trField(n.subtitle) }))}
                    onChange={setCompareRightIdx}
                  />
                </div>
              </div>

              {compLeft && compRight && (
                <div style={{ overflowX: "auto" }}>
                  <table className="luxe-data-table">
                    <thead>
                      <tr>
                        <th>{tx("Tiêu chí so sánh", "Comparison Criteria", "对比维度", "Критерий", "비교 항목", "比較項目")}</th>
                        <th>{trArea(compLeft.name)} ({trField(compLeft.subtitle)})</th>
                        <th>{trArea(compRight.name)} ({trField(compRight.subtitle)})</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>{tx("Khoảng cách ra biển", "Walk to Beach", "距离海滩", "До пляжа", "해변 접근성", "ビーチまでの距離")}</strong></td>
                        <td>{trField(compLeft.beachWalk)}</td>
                        <td>{trField(compRight.beachWalk)}</td>
                      </tr>
                      <tr>
                        <td><strong>{tx("Tầm giá thuê phổ biến", "Typical Rent Range", "常见月租范围", "Диапазон цен", "평균 임대료", "一般的な家賃帯")}</strong></td>
                        <td><strong>{trField(compLeft.rentRangeUsd)}</strong></td>
                        <td><strong>{trField(compRight.rentRangeUsd)}</strong></td>
                      </tr>
                      <tr>
                        <td><strong>{tx("Độ yên tĩnh & Tiếng ồn", "Acoustic Profile", "安静程度与噪音", "Уровень тишины", "정숙도 & 소음", "静かさ・騒音レベル")}</strong></td>
                        <td>{trField(compLeft.noiseLevel)}</td>
                        <td>{trField(compRight.noiseLevel)}</td>
                      </tr>
                      <tr>
                        <td><strong>{tx("Không gian làm việc từ xa", "Remote Work & Cafes", "远程办公与咖啡馆", "Удаленная работа", "원격 근무 환경", "リモートワーク環境")}</strong></td>
                        <td>{compLeft.remoteWorkScore}</td>
                        <td>{compRight.remoteWorkScore}</td>
                      </tr>
                      <tr>
                        <td><strong>{tx("Lưu ý thực tế", "Key Considerations", "实地注意事项", "Нюансы", "참고 사항", "注意点")}</strong></td>
                        <td>{trField(compLeft.considerations)}</td>
                        <td>{trField(compRight.considerations)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {/* ====================================================================
          PAGE 4: CÁCH THUÊ (/how-to-rent) — 100% 6-LANGUAGE SYNCHRONIZED
          ==================================================================== */}
      {route === "/how-to-rent" && (
        <main className="page-route">
          <div className="page-container">
            <div style={{ marginBottom: "2.25rem" }}>
              <span className="eyebrow-badge">
                {tx("QUY TRÌNH THUÊ NHÀ MINH BẠCH", "TRANSPARENT RENTAL PROCESS", "透明的租房流程", "ПРОЗРАЧНЫЙ ПРОЦЕСС АРЕНДЫ", "투명한 다낭 임대 프로세스", "明確で安心な賃貸プロセス")}
              </span>
              <h1 className="section-heading-serif">
                {tx(
                  "Thuê nhà qua KIN Estates diễn ra thế nào — Chuyển nhà, từng việc rõ ràng.",
                  "How Renting with KIN Estates Works — Clear Steps from Tour to Handover.",
                  "通过 KIN Estates 租房如何进行 — 每一步都清晰透明。",
                  "Как проходит аренда с KIN Estates — понятные шаги от показа до ключей.",
                  "KIN Estates 임대 진행 방식 — 투어부터 입주까지 명확한 단계별 안내.",
                  "KIN Estatesでの賃貸の流れ — 内覧から入居まで明確なステップ。"
                )}
              </h1>
              <p style={{ color: "var(--text-secondary)", maxWidth: "66ch", marginTop: "0.4rem" }}>
                {tx(
                  "Dịch vụ tư vấn và dẫn đi xem nhà hoàn toàn miễn phí cho khách thuê. Chúng tôi bảo vệ quyền lợi hợp đồng, tiền đặt cọc và thủ tục pháp lý của bạn trong suốt kỳ lưu trú.",
                  "Advisory and property viewings are 100% free for tenants. We safeguard your bilingual lease terms, security deposit, and legal registration throughout your stay.",
                  "租客咨询与看房服务完全免费。我们在整个租期内保障您的双语合同权益、押金安全与合法暂住登记。",
                  "Консультации и показы 100% бесплатны для арендаторов. Мы защищаем ваш депозит, договор и регистрацию.",
                  "임차인을 위한 상담 및 투어 비용은 100% 무료입니다. 계약 조건, 보증금 보호, 거주 등록까지 안전하게 책임집니다.",
                  "入居者様へのご相談・内覧手配は完全無料です。契約条件、敷金保護、滞在登録まで一貫してサポートします。"
                )}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "3rem" }}>
              {[
                {
                  step: tx("Bước 01", "Step 01", "第 01 步", "Шаг 01", "Step 01", "ステップ 01"),
                  title: tx("Gửi yêu cầu & Ngân sách", "Share Brief & Budget", "发送需求与预算", "Запрос и бюджет", "조건 및 예산 공유", "ご希望条件・予算の共有"),
                  desc: tx(
                    "Chia sẻ ngày chuyển vào, số phòng ngủ và thói quen làm việc của bạn qua Zalo, WhatsApp hoặc Telegram.",
                    "Tell us your move-in date, bedroom count, and remote-work needs via Zalo, WhatsApp, or Telegram.",
                    "通过 Zalo、WhatsApp 或 Telegram 告诉我们您的入住日期、卧室数和办公需求。",
                    "Сообщите дату заезда, число спален и требования к работе через Zalo, WhatsApp или Telegram.",
                    "Zalo, WhatsApp 또는 Telegram으로 입주일, 침실 수, 업무 공간 조건을 알려주세요.",
                    "Zalo、WhatsApp、Telegramにて入居希望日や部屋数、ご希望条件をお知らせください。"
                  )
                },
                {
                  step: tx("Bước 02", "Step 02", "第 02 步", "Шаг 02", "Step 02", "ステップ 02"),
                  title: tx("Nhận danh sách ngắn (Shortlist)", "Receive Curated Shortlist", "获取精选房源清单", "Персональный шорт-лист", "맞춤 매물 리스트 수령", "厳選物件リストのご提案"),
                  desc: tx(
                    "Trong vòng 2–4 giờ, nhận danh sách 4–6 căn hộ đang trống thực tế kèm video quay chi tiết và điều kiện điện nước.",
                    "Within 2–4 hours, receive 4–6 verified available residences with walk-through videos and exact utility rates.",
                    "2–4小时内收到 4–6 套真实可租房源、实拍视频及水电费标准。",
                    "За 2–4 часа получите 4–6 свободных квартир с видео и точными тарифами.",
                    "2~4시간 내에 실제 공실 4~6곳의 상세 영상과 전기·수도 요금 조건을 받아보세요.",
                    "2〜4時間以内に実際の空室4〜6件の動画と詳細な光熱費条件をお送りします。"
                  )
                },
                {
                  step: tx("Bước 03", "Step 03", "第 03 步", "Шаг 03", "Step 03", "ステップ 03"),
                  title: tx("Xem nhà trực tiếp hoặc Video 4K", "In-Person or Live 4K Tour", "实地看房或 4K 视频连线", "Личный показ или 4K-тур", "현장 방문 또는 4K 라이브 투어", "現地内覧または4Kライブ内覧"),
                  desc: tx(
                    "Đi xem thực tế cùng chuyên viên hoặc gọi video trực tiếp kiểm tra ánh sáng, độ ồn, áp lực nước và tốc độ Wi-Fi.",
                    "Tour in person with our specialist or join a live 4K video call testing natural light, acoustics, water pressure, and Wi-Fi.",
                    "与顾问实地看房或通过 4K 实时视频测试采光、隔音、水压与 Wi-Fi 速度。",
                    "Осмотрите лично или по 4K видеосвязи: проверим свет, шум, напор воды и Wi-Fi.",
                    "전문가와 함께 현장을 방문하거나 4K 영상통화로 채광, 소음, 수압, Wi-Fi 속도를 확인합니다.",
                    "担当者と現地内覧、または4Kビデオ通話で採光・防音・水圧・Wi-Fi速度を実測します。"
                  )
                },
                {
                  step: tx("Bước 04", "Step 04", "第 04 步", "Шаг 04", "Step 04", "ステップ 04"),
                  title: tx("Ký hợp đồng song ngữ Việt – Anh", "Sign Bilingual Lease", "签署越英双语合同", "Двуязычный договор", "이중언어 임대차 계약 체결", "バイリンガル賃貸契約の締結"),
                  desc: tx(
                    "Làm việc trực tiếp với chủ nhà, ghi rõ biểu giá điện nước EVN, trách nhiệm bảo trì và điều khoản hoàn trả tiền cọc.",
                    "Sign directly with the verified owner—explicitly stating EVN utility rates, maintenance duties, and deposit refund guarantees.",
                    "直接与房东签约，明确注明国家电网 EVN 电价、维修责任与押金退还条款。",
                    "Прямой договор с собственником с фиксацией тарифов EVN и возврата депозита.",
                    "집주인과 직접 계약하며 EVN 전기요금, 수리 책임, 보증금 반환 조항을 명확히 기재합니다.",
                    "オーナーと直接契約。EVN電気料金、修繕責任、敷金返還保証を明記します。"
                  )
                },
                {
                  step: tx("Bước 05", "Step 05", "第 05 步", "Шаг 05", "Step 05", "ステップ 05"),
                  title: tx("Bàn giao & Khai báo tạm trú NA17", "Handover & Form NA17", "交房核验与暂住登记 NA17", "Заезд и форма NA17", "입주 점검 및 거주 등록(NA17)", "鍵のお渡し＆滞在登録(NA17)"),
                  desc: tx(
                    "Lập biên bản bàn giao thiết bị bằng hình ảnh, đăng ký tạm trú công an phường (Form NA17) và hỗ trợ suốt kỳ thuê.",
                    "Complete photo inventory check-in, ward police registration (Form NA17), and ongoing tenant support.",
                    "完成图文设备交接清单，办理派出所暂住登记（NA17表），并提供租期内全程协助。",
                    "Акт приема-передачи с фото, регистрация в полиции (NA17) и помощь весь срок.",
                    "사진 기반 시설물 인수인계서 작성, 관할 공안 거주 등록(NA17) 및 임대 기간 내내 지원합니다.",
                    "写真付きの設備確認書を作成し、警察での滞在登録（Form NA17）と入居後サポートを行います。"
                  )
                }
              ].map((s) => (
                <div key={s.step} style={{ background: "#FFFFFF", padding: "1.6rem", borderRadius: "18px", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)" }}>
                  <span className="eyebrow-badge">{s.step}</span>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", marginBottom: "0.45rem" }}>{s.title}</h3>
                  <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)" }}>{s.desc}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "2.25rem", border: "1px solid var(--border-light)", boxShadow: "var(--shadow-soft)", marginBottom: "3rem" }}>
              <span className="eyebrow-badge">
                {tx("TIÊU CHUẨN KIỂM ĐỊNH THỰC TẾ", "ON-SITE AUDIT STANDARD", "实地核验标准", "СТАНДАРТ ПРОВЕРКИ", "현장 실사 체크 기준", "現地インスペクション基準")}
              </span>
              <h2 className="section-heading-serif" style={{ marginBottom: "1.25rem" }}>
                {tx("Danh sách kiểm tra khi đi xem căn hộ tại Đà Nẵng", "6-Point Inspection Checklist When Viewing Apartments", "岘港看房必查的 6 项核心指标", "Чек-лист из 6 пунктов при осмотре квартиры", "다낭 아파트 투어 시 필수 점검 6대 항목", "ダナン内覧時の6つの重要チェックリスト")}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.15rem" }}>
                {[
                  {
                    title: tx("1. Ánh sáng tự nhiên & Hướng nắng", "1. Sun Orientation & Daylight", "1. 采光与朝向", "1. Освещение и сторона света", "1. 채광 및 방향(향)", "1. 自然光と方角"),
                    desc: tx(
                      "Kiểm tra hướng ban công (Đông / Đông Nam mát mẻ; hướng Tây cần kính Low-E và rèm cản nắng 2 lớp).",
                      "Verify balcony orientation (East/Southeast stays cool; West-facing units require Low-E glass and double blackout curtains).",
                      "检查阳台朝向（东/东南凉爽；西晒户型需配备 Low-E 隔热玻璃与双层遮光帘）。",
                      "Проверка стороны света (Восток/Юго-Восток прохладнее; Запад требует стекла Low-E и блэкаут-штор).",
                      "발코니 방향 확인 (동향/남동향은 시원하며, 서향은 Low-E 유리와 2중 암막 커튼 필수).",
                      "バルコニーの方角を確認（東・南東は涼しく、西向きはLow-Eガラスと遮光カーテンが必須）。"
                    )
                  },
                  {
                    title: tx("2. Tiếng ồn xây dựng & Giao thông", "2. Construction & Traffic Acoustics", "2. 施工与交通噪音", "2. Защита от шума стройки и дорог", "2. 주변 공사 및 교통 소음", "2. 周辺工事・交通の防音性"),
                    desc: tx(
                      "Kiểm tra các lô đất xung quanh tòa nhà và độ cách âm của hệ cửa kính ban công khi đóng kín.",
                      "Inspect adjacent plots for active construction and test balcony acoustic glazing with doors sealed.",
                      "排查大楼周边空地是否有施工，并测试阳台隔音门窗关闭后的静音效果。",
                      "Проверка соседних участков на стройки и тест звукоизоляции балконных дверей.",
                      "건물 주변 빈 부지의 공사 여부와 발코니 창문 밀폐 시 방음 성능을 점검합니다.",
                      "隣接地の工事有無と、バルコニー窓を閉めた際の防音性能を確認します。"
                    )
                  },
                  {
                    title: tx("3. Tốc độ Internet & Bàn làm việc", "3. Fiber Internet & Work Desk", "3. 光纤网速与办公桌", "3. Скорость интернета и стол", "3. 인터넷 속도 & 업무 데스크", "3. 光回線速度＆ワークデスク"),
                    desc: tx(
                      "Đo thực tế tốc độ Upload/Download Wi-Fi ngay tại bàn làm việc và vị trí ổ cắm điện.",
                      "Run live upload/download speed tests directly at the work desk and verify power outlet placement.",
                      "在办公桌旁实测 Wi-Fi 上传/下载速度，并检查电源插座位置。",
                      "Замер скорости Wi-Fi прямо у рабочего стола и проверка розеток.",
                      "업무용 데스크에서 직접 Wi-Fi 업로드/다운로드 속도와 콘센트 위치를 측정합니다.",
                      "デスク位置でのWi-Fi実測速度とコンセント配置を確認します。"
                    )
                  },
                  {
                    title: tx("4. Điều hòa, Áp lực nước & Bình nóng lạnh", "4. HVAC, Water Pressure & Washer", "4. 空调、水压与洗烘设备", "4. Кондиционеры и напор воды", "4. 에어컨, 수압 및 세탁·건조기", "4. エアコン・水圧・洗濯乾燥機"),
                    desc: tx(
                      "Bật thử toàn bộ điều hòa kiểm tra độ êm, xả thử vòi sen và kiểm tra máy giặt sấy.",
                      "Test all inverter A/C units for quiet operation, check shower pressure, and inspect the washer/dryer.",
                      "开启所有空调测试静音效果，测试淋浴水压并检查洗衣机/烘干机。",
                      "Проверка тишины работы кондиционеров, напора воды в душе и стиральной машины.",
                      "모든 에어컨의 소음 및 냉방 상태, 샤워기 수압, 세탁·건조기 작동 여부를 테스트합니다.",
                      "全エアコンの静音性、シャワー水圧、洗濯乾燥機の動作をテストします。"
                    )
                  },
                  {
                    title: tx("5. Chống ẩm & Độ kín cửa mùa mưa", "5. Monsoon Waterproofing & Seals", "5. 雨季防潮与窗户密封", "5. Защита от влаги в сезон дождей", "5. 우기 방수 및 창틀 밀폐력", "5. 雨季の防水・窓枠の密閉性"),
                    desc: tx(
                      "Kiểm tra trần, góc tường và gioăng cửa sổ để đảm bảo khô ráo tuyệt đối vào mùa mưa tháng 10–12.",
                      "Inspect ceiling corners and window rubber seals to guarantee dryness during the October–December monsoon.",
                      "检查天花板角落与窗户胶条，确保 10–12 月雨季绝对干燥不渗水。",
                      "Осмотр потолков, углов и уплотнителей окон перед сезоном дождей (октябрь–декабрь).",
                      "10~12월 우기에도 완벽히 쾌적하도록 천장 모서리와 창틀 고무 패킹을 점검합니다.",
                      "10〜12月の雨季でも快適に過ごせるよう、天井や窓のゴムパッキンを点検します。"
                    )
                  },
                  {
                    title: tx("6. Đơn giá điện EVN & Phí quản lý", "6. EVN Utility Rate & Building Fees", "6. EVN 电价与物业管理费", "6. Тарифы EVN и обслуживание", "6. EVN 전기요금 및 관리비", "6. EVN電気料金と管理費"),
                    desc: tx(
                      "Xác nhận rõ tiền điện tính theo hóa đơn EVN nhà nước (~2,800đ/kWh) và phí quản lý tòa nhà đã bao gồm chưa.",
                      "Confirm whether electricity is billed at state EVN rates (~2,800 VND/kWh) and whether management fees are included.",
                      "确认电费是否按越南国家电网 EVN 账单（约 2,800越盾/度）计费，以及是否包含物业管理费。",
                      "Подтверждение оплаты света по гос. счетчику EVN (~2,800 донгов/кВт·ч) и включения управляющего сбора.",
                      "전기요금이 국가 표준 EVN 고지서(~2,800동/kWh) 기준인지, 관리비 포함 여부를 확인합니다.",
                      "電気代が国営EVN請求（約2,800VND/kWh）か、管理費が含まれているかを明確にします。"
                    )
                  }
                ].map((c) => (
                  <div key={c.title} style={{ background: "var(--bg-ivory)", padding: "1.2rem", borderRadius: "14px" }}>
                    <strong style={{ display: "block", marginBottom: "0.3rem", color: "var(--bg-navy)" }}>{c.title}</strong>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ====================================================================
          PAGE 5: CẨM NANG (/guides) — 100% 6-LANGUAGE SYNCHRONIZED
          ==================================================================== */}
      {route === "/guides" && (
        <main className="page-route">
          <div className="page-container">
            <div style={{ marginBottom: "2rem" }}>
              <span className="eyebrow-badge">
                {tx("CẨM NANG THUÊ NHÀ VÀ SỐNG Ở ĐÀ NẴNG", "DA NANG RELOCATION & LIVING GUIDES", "岘港租房与生活指南", "ГИДЫ ПО ЖИЗНИ И АРЕНДЕ В ДАНАНГЕ", "다낭 임대 및 생활 완벽 가이드", "ダナン賃貸＆移住ガイド")}
              </span>
              <h1 className="section-heading-serif">
                {tx("Chuyển đến. Làm quen. An cư tại Đà Nẵng.", "Relocate. Settle In. Thrive in Da Nang.", "移居、熟悉、安心定居岘港。", "Переезжайте и чувствуйте себя в Дананге как дома.", "다낭으로의 이주, 적응, 그리고 편안한 정착.", "ダナンへ移住し、街に馴染み、心地よく暮らす。")}
              </h1>
              <p style={{ color: "var(--text-secondary)", maxWidth: "66ch", marginTop: "0.4rem" }}>
                {tx(
                  "Tổng hợp kinh nghiệm thực tế về chỉ số giá các tòa nhà, thủ tục thẻ tạm trú (TRC / Form NA17), cách bảo vệ tiền cọc và chi phí sinh hoạt năm 2026.",
                  "In-depth field guides on 2026 building price indices, Form NA17 police registration, deposit protection, and monthly cost of living.",
                  "汇集 2026 各大楼租金指数、暂住证（TRC / NA17表）、押金保护及每月生活成本的实战指南。",
                  "Практические руководства по ценам в комплексах 2026, регистрации NA17, защите депозита и стоимости жизни.",
                  "2026년 건물별 임대료 지수, 거주 등록(TRC/NA17), 보증금 보호법 및 월 생활비 실전 가이드.",
                  "2026年ビル別家賃指数、滞在登録（TRC/Form NA17）、敷金保護、生活費に関する実践ガイド。"
                )}
              </p>
            </div>

            <div className="cards-grid" style={{ marginBottom: "3.25rem" }}>
              {GUIDES_DATA.map((g, idx) => (
                <article
                  key={g.id}
                  className="guide-editorial-card"
                  style={{ animationDelay: `${idx * 65}ms` }}
                  onClick={() => setActiveGuideModal(g)}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                      <span className="eyebrow-badge" style={{ margin: 0 }}>{g.cat[lang] || g.cat.en}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        0{idx + 1}
                      </span>
                    </div>
                    <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.38rem", marginBottom: "0.6rem", lineHeight: 1.28 }}>
                      {g.title[lang] || g.title.en}
                    </h2>
                    <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1.35rem" }}>
                      {fmtCurrencyStr(g.summary[lang] || g.summary.en)}
                    </p>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--accent-bronze-dark)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <span>{tx("Đọc bài viết chi tiết", "Read Full Article", "阅读完整指南", "Читать статью", "가이드 전문 읽기", "記事の全文を読む")}</span>
                    <IconArrowUpRight size={14} />
                  </span>
                </article>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <span className="eyebrow-badge">
                  {tx("CHỈ SỐ GIÁ THUÊ & TIỆN ÍCH TOÀ NHÀ 2026", "2026 BUILDING BENCHMARKS & AMENITIES", "2026 核心公寓大楼租金与配套指数", "ИНДЕКС ЦЕН И ИНФРАСТРУКТУРА 2026", "2026 다낭 주요 빌딩 임대료 & 시설 지수", "2026年 主要レジデンス別・家賃＆設備指数")}
                </span>
                <h2 className="section-heading-serif">
                  {tx("Bảng chỉ số giá thuê các tòa tháp căn hộ hàng đầu Đà Nẵng", "2026 Building-by-Building Rental Price Index", "岘港核心公寓大楼租金价格指数", "Индекс цен на аренду по жилым комплексам Дананга", "다낭 주요 아파트 타워별 임대 가격 지수", "ダナン主要レジデンス別・家賃インデックス")}
                </h2>
              </div>
              <button
                type="button"
                className="btn-luxe btn-luxe--outline"
                onClick={openMapOverview}
              >
                <IconMap size={14} />
                <span>{tx("Xem vị trí trên bản đồ", "View Buildings on Map", "在地图上查看大楼", "На карте Дананга", "지도에서 빌딩 위치 보기", "地図で建物の位置を見る")}</span>
              </button>
            </div>

            <div className="bldg-cards-grid">
              {buildings.map((b, bIdx) => {
                const bldgImages: Record<string, string> = {
                  "bldg-panoma": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=85",
                  "bldg-filmore": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=85",
                  "bldg-hiyori": "https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=1200&q=85",
                  "bldg-monarchy": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85",
                  "bldg-anthuong": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=85"
                };
                const coverImg = bldgImages[b.id] || AREA_IMAGES[bIdx % AREA_IMAGES.length];

                return (
                  <article
                    key={b.id}
                    className="bldg-architect-card"
                    style={{ animationDelay: `${bIdx * 80}ms` }}
                  >
                    <div>
                      {/* Architectural Cover Image Header with Smooth Zoom & Glass Pills */}
                      <div className="bldg-architect-card__media">
                        <img src={coverImg} alt={b.name} loading="lazy" />
                        <div className="bldg-architect-card__overlay">
                          <div className="bldg-media-top-row">
                            <span className="bldg-loc-glass-pill">{trField(b.area)}</span>
                            <span className="bldg-units-glass-pill">
                              <span className="live-dot" style={{ width: "6px", height: "6px" }} />
                              <span>{b.unitCount || 10} {tx("căn", "units", "套", "объектов", "호실", "件")}</span>
                            </span>
                          </div>
                          <div className="bldg-media-bottom-title">
                            <span className="bldg-tier-sub">
                              Est. {b.yearCompleted} · {trField(b.tier)}
                            </span>
                            <h3 className="bldg-title-heading">{b.name}</h3>
                          </div>
                        </div>
                      </div>

                      <div className="bldg-architect-card__body">
                        {/* Harmonious Warm Sand 3-Column Price Matrix */}
                        <div className="bldg-price-matrix">
                          <div className="bldg-price-cell">
                            <span className="bldg-price-cell__label">{tx("1 PHÒNG NGỦ", "1 BEDROOM", "1 卧室", "1 СПАЛЬНЯ", "1베드룸", "1LDK")}</span>
                            <div className="bldg-price-cell__val">{trField(b.avg1BrUsd)}</div>
                          </div>
                          <div className="bldg-price-cell highlight">
                            <span className="bldg-price-cell__label">{tx("2 PHÒNG NGỦ", "2 BEDROOMS", "2 卧室", "2 СПАЛЬНИ", "2베드룸", "2LDK")}</span>
                            <div className="bldg-price-cell__val">{fmtCurrencyStr(b.avg2BrUsd)}</div>
                          </div>
                          <div className="bldg-price-cell">
                            <span className="bldg-price-cell__label">{tx("3 PHÒNG NGỦ", "3 BEDROOMS", "3 卧室", "3 СПАЛЬНИ", "3베드룸", "3LDK")}</span>
                            <div className="bldg-price-cell__val">{trField(b.avg3BrUsd)}</div>
                          </div>
                        </div>

                        {/* Structured Architectural Spec List with Crisp Vector Icons */}
                        <div className="bldg-specs-list">
                          <div className="bldg-spec-row">
                            <span className="bldg-spec-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 12h20" />
                                <path d="M2 17c3.5-2 6.5-2 10 0s6.5 2 10 0" />
                                <circle cx="17" cy="6" r="3" />
                              </svg>
                            </span>
                            <div className="bldg-spec-text">
                              <strong>{tx("Ra biển:", "Beach walk:", "距离海滩：", "До пляжа:", "해변 거리:", "ビーチまで:")}</strong>
                              <span>{trField(b.walkToBeach)}</span>
                            </div>
                          </div>

                          <div className="bldg-spec-row">
                            <span className="bldg-spec-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            </span>
                            <div className="bldg-spec-text">
                              <strong>{tx("Giá điện:", "Electricity:", "电费标准：", "Электричество:", "전기요금:", "電気料金:")}</strong>
                              <span>{trField(b.electricity)}</span>
                            </div>
                          </div>

                          <div className="bldg-spec-row">
                            <span className="bldg-spec-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            </span>
                            <div className="bldg-spec-text">
                              <strong>{tx("Thú cưng:", "Pet policy:", "宠物政策：", "Животные:", "반려동물:", "ペット:")}</strong>
                              <span>{trField(b.petFriendly)}</span>
                            </div>
                          </div>

                          <div className="bldg-spec-row">
                            <span className="bldg-spec-icon">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                              </svg>
                            </span>
                            <div className="bldg-spec-text">
                              <strong>{tx("Tiện ích:", "Amenities:", "配套设施：", "Удобства:", "부대시설:", "共用施設:")}</strong>
                              <span>{trField(b.amenities)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Dual-Action Footer */}
                    <div className="bldg-architect-card__footer">
                      <button
                        type="button"
                        className="bldg-cta-primary"
                        onClick={() => {
                          setQuery(b.name.split(" ")[0]);
                          navigate("/apartments");
                        }}
                      >
                        <span>{tx("Xem căn hộ đang trống", "View Available Units", "查看可租房源", "Смотреть квартиры", "공실 매물 보기", "空室一覧を見る")}</span>
                        <span className="bldg-cta-arrow">→</span>
                      </button>

                      <button
                        type="button"
                        className="bldg-cta-map-btn"
                        title={tx("Xem trên bản đồ", "Locate on Map", "在地图上定位", "Показать на карте", "지도에서 위치 보기", "地図で見る")}
                        onClick={() => {
                          const matchIdx = apartments.findIndex((a) =>
                            a.building.toLowerCase().includes(b.name.split(" ")[1]?.toLowerCase() || b.name.split(" ")[0].toLowerCase())
                          );
                          setExpandMapAptCode(apartments[matchIdx]?.code);
                          setExpandMapOpen(true);
                        }}
                      >
                        <IconMapPin size={16} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ====================================================================
          PAGE 6: VỀ CHÚNG TÔI (/about) — MODERN ANIMATED EDITORIAL + SLIDERS & AVATARS
          ==================================================================== */}
      {route.replace(/\/+$/, "") === "/about" && (() => {
        const locText = (v?: Record<string, string> | string) => {
          if (!v) return "";
          if (typeof v === "string") return v;
          return v[lang] || v.vi || v.en || "";
        };
        const heroPhoto = aboutContent?.heroImage || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85";
        const tourPhotos = aboutContent?.clientTourPhotos || [];
        const testimonials = aboutContent?.testimonials || [];
        const visibleFb = fbIsMobile ? 1 : 2;
        const maxFbIdx = Math.max(0, testimonials.length - visibleFb);
        const safeFbIdx = Math.min(fbSlideIdx, maxFbIdx);
        const fbTransform = fbIsMobile
          ? `translateX(calc(-${safeFbIdx} * (100% + 1.25rem)))`
          : `translateX(calc(-${safeFbIdx} * (50% + 0.625rem)))`;
        const liveAvail = apartments.filter((a) => a.status === "Available");
        const pricesUsd = liveAvail.map((a) => Number(a.priceUsd || 0)).filter((n) => n > 0);
        const minUsd = pricesUsd.length ? Math.min(...pricesUsd) : 450;
        const maxUsd = pricesUsd.length ? Math.max(...pricesUsd) : 2000;
        const scrollTours = (dir: -1 | 1) => {
          tourSliderRef.current?.scrollBy({ left: dir * 380, behavior: "smooth" });
        };

        return (
        <main className="page-route">
          <div className="page-container">
            {/* Editorial Animated Hero */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "2.5rem", alignItems: "center", marginBottom: "2.5rem" }}>
              <div className="kin-reveal is-visible">
                <span className="eyebrow-badge">
                  {tx("VỀ KIN ESTATES — ĐÀ NẴNG", "ABOUT KIN ESTATES — DA NANG", "关于 KIN ESTATES — 岘港", "О KIN ESTATES — ДАНАНГ", "KIN ESTATES 소개 — 다낭", "KIN ESTATESについて — ダナン")}
                </span>
                <h1 className="section-heading-serif" style={{ marginBottom: "0.85rem" }}>
                  {tx(
                    "Hiểu thành phố. Chú trọng từng chi tiết.",
                    "Know the city. Notice the details.",
                    "了解这座城市，留意每一处细节。",
                    "Знаем город. Замечаем детали.",
                    "도시를 이해하고, 모든 디테일을 살핍니다.",
                    "街を知り、細部に目を配る。"
                  )}
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.7, marginBottom: "1rem" }}>
                  {tx(
                    "Trước tiên, chúng tôi lắng nghe nơi bạn làm việc, dạo bộ và thư giãn mỗi tối — rồi mới bắt đầu tìm căn hộ phù hợp. Sau bức ảnh đẹp là cuộc sống mỗi ngày.",
                    "First we ask where you will work, walk, and spend your evenings — then we look for the apartment. Beyond every beautiful photo is everyday life.",
                    "首先我们会了解您平时在哪里办公、散步与度过夜晚，然后再为您寻找合适的公寓。精美照片背后，是真实的日常生活。",
                    "Сначала мы узнаём, где вы работаете, гуляете и проводите вечера — и только потом подбираем квартиру. За красивыми фото стоит повседневная жизнь.",
                    "먼저 당신이 어디서 일하고 산책하며 저녁을 보낼지 여쭤본 뒤 집을 찾습니다. 멋진 사진 너머에는 매일의 일상이 있습니다.",
                    "まずあなたがどこで働き、歩き、夜を過ごすのかを伺ってから住まいを探します。美しい写真の先にあるのは毎日の暮らしです。"
                  )}
                </p>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                  {tx(
                    "KIN Estates chuyên căn hộ, penthouse và biệt thự cho thuê dài hạn (3–12+ tháng) tại Đà Nẵng. Chúng tôi làm việc trực tiếp với chủ nhà, dẫn bạn xem nhà tận nơi và đồng hành suốt thời gian thuê bằng 6 ngôn ngữ (VI · EN · 中文 · RU · KO · JA).",
                    "KIN Estates specializes in long-term apartments, penthouses, and private villas (3–12+ months) in Da Nang. We deal directly with owners, run viewings in person, and support you throughout your lease in 6 languages (VI · EN · ZH · RU · KO · JA).",
                    "KIN Estates 专注岘港 3–12个月以上长期公寓与别墅租赁。我们直接对接房东、亲自陪同看房，并提供六语全程租期支持。",
                    "KIN Estates специализируется на долгосрочной аренде (от 3 до 12+ месяцев) в Дананге. Мы работаем напрямую с собственниками, проводим личные просмотры и остаёмся на связи весь срок аренды.",
                    "KIN Estates는 다낭 3~12개월 이상 장기 임대 전문 에이전시입니다. 임대인과 직접 소통하고 현장 투어부터 계약 기간 내내 6개 국어로 함께합니다.",
                    "KIN Estatesはダナンの3〜12ヶ月以上の長期賃貸専門です。オーナー様と直接やり取りし、現地内覧からご入居期間中まで6ヶ国語でサポートします。"
                  )}
                </p>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button type="button" className="btn-luxe btn-luxe--navy" onClick={() => navigate("/apartments")}>
                    <span>{tx("Khám phá danh mục căn hộ →", "Explore Residences →", "浏览精选房源 →", "Смотреть квартиры →", "전체 매물 둘러보기 →", "物件一覧を見る →")}</span>
                  </button>
                  <button type="button" className="btn-luxe btn-luxe--outline" onClick={() => navigate("/how-to-rent")}>
                    <span>{tx("Quy trình thuê nhà", "How Renting Works", "了解租房流程", "Как проходит аренда", "임대 절차 보기", "賃貸の流れ")}</span>
                  </button>
                </div>
              </div>

              {/* Hero Photo + Floating Glass Trust Cards */}
              <div className="kin-about-hero-visual kin-reveal is-visible kin-reveal-delay-1">
                <div
                  className="kin-about-hero-frame"
                  onClick={() => setAboutLightbox({ src: heroPhoto, caption: aboutContent?.founderName || "KIN Estates Đà Nẵng" })}
                >
                  <img src={heroPhoto} alt="KIN Estates Da Nang" />
                  <div className="kin-hero-float-top">
                    <span className="kin-hero-float-dot" />
                    <span>{tx("Dẫn xem trực tiếp tại Đà Nẵng", "In-Person Tours · Da Nang", "岘港实地陪同看房", "Личные просмотры в Дананге", "다낭 현지 직접 투어", "ダナン現地直接ご案内")}</span>
                  </div>
                  <div className="kin-hero-float-bottom">
                    <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                      <div className="kin-avatar-stack">
                        {testimonials.slice(0, 4).map((t) =>
                          t.avatar ? (
                            <img key={t.id} src={t.avatar} alt={t.clientName} />
                          ) : (
                            <span key={t.id} className="kin-avatar-stack-fallback">
                              {(t.clientName || "K").charAt(0).toUpperCase()}
                            </span>
                          )
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#F5DFBE" }}>★★★★★ 5.0 / 5.0</div>
                        <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.8)" }}>
                          {tx("Cư dân quốc tế & Việt Nam tin chọn", "Trusted by expat & local residents", "深受中外长租客户信赖", "Нам доверяют арендаторы", "다낭 거주 고객 추천", "世界中の入居者から高評価")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Card Animated Metrics Strip */}
            <div className="kin-about-metrics kin-reveal">
              <div className="kin-about-metric">
                <div className="kin-about-metric__num">100%</div>
                <div className="kin-about-metric__lbl">{tx("Căn hộ kiểm định thực tế", "Physically audited homes", "100% 实地核验房源", "100% проверенные квартиры", "100% 현장 실사 매물", "100%現地実地確認済")}</div>
              </div>
              <div className="kin-about-metric">
                <div className="kin-about-metric__num">6</div>
                <div className="kin-about-metric__lbl">{tx("Ngôn ngữ tư vấn trực tiếp", "Languages supported", "6 种语言直接服务", "Языков поддержки", "6개 국어 전담 지원", "6ヶ国語ダイレクト対応")}</div>
              </div>
              <div className="kin-about-metric">
                <div className="kin-about-metric__num">24h</div>
                <div className="kin-about-metric__lbl">{tx("Lên danh sách & hẹn xem", "Shortlist & tour setup", "24小时内推荐并约看", "Подборка за 24 часа", "24시간 내 맞춤 추천", "24時間以内に厳選提案")}</div>
              </div>
              <div className="kin-about-metric">
                <div className="kin-about-metric__num">3–12+</div>
                <div className="kin-about-metric__lbl">{tx("Tháng · Chuyên thuê dài hạn", "Months · Long stays only", "月 · 专注长租", "Месяцев · Долгосрочно", "개월 · 장기 임대 전문", "ヶ月・長期賃貸専門")}</div>
              </div>
            </div>

            {/* 3 Architectural Approach Pillars */}
            <div className="kin-reveal" style={{ marginBottom: "1rem" }}>
              <span className="eyebrow-badge">
                {tx("AM HIỂU ĐỊA PHƯƠNG · CÁCH LÀM MINH BẠCH", "LOCAL KNOWLEDGE · A CLEAR APPROACH", "深耕本地 · 透明方式", "МЕСТНАЯ ЭКСПЕРТИЗА · ПРОЗРАЧНЫЙ ПОДХОД", "현지 전문성 · 투명한 방식", "現地の知見・明快なアプローチ")}
              </span>
              <h2 className="section-heading-serif" style={{ marginBottom: "1.25rem" }}>
                {tx("Sau bức ảnh đẹp là cuộc sống mỗi ngày.", "Beyond the beautiful photo is everyday life.", "精美照片背后，是真实的日常。", "За красивыми фото — реальная жизнь.", "멋진 사진 너머의 매일의 삶.", "美しい写真の先にある毎日の暮らし。")}
              </h2>
            </div>
            <div className="kin-about-pillars">
              <div className="kin-about-pillar kin-reveal">
                <div className="kin-pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <h3>{tx("Chú trọng từng chi tiết", "Attention to detail", "关注每一处细节", "Внимание к деталям", "세심한 디테일", "細部へのこだわり")}</h3>
                <p>{tx("Tình trạng nội thất, vị trí, ánh sáng, độ ồn và mọi điều khoản điện nước được trao đổi rõ ràng trước khi bạn quyết định.", "Condition, location, daylight, noise level, and rental terms are discussed clearly before you decide.", "在您做决定前，明确沟通房屋状况、地段采光及所有租赁条款。", "Состояние квартиры, локация и все условия аренды обсуждаются заранее.", "집의 상태, 위치, 채광 및 모든 계약 조건을 결정 전에 투명하게 안내합니다.", "設備状況、立地、採光、契約条件をご決定前に明確にお伝えします。")}</p>
              </div>
              <div className="kin-about-pillar kin-reveal kin-reveal-delay-1">
                <div className="kin-pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3>{tx("Tư vấn chân thành, không ép chốt", "Clear conversations", "坦诚沟通，绝不催单", "Честный диалог без давления", "부담 없는 솔직한 상담", "押し売りのない誠実なご案内")}</h3>
                <p>{tx("Chúng tôi phân tích thẳng thắn ưu & nhược điểm từng tòa nhà và trả lời trung thực mọi thắc mắc mà không tạo áp lực.", "We explain your options honestly — both strengths and trade-offs — and answer every question without pressure.", "客观分析每栋楼的优缺点，诚实回答您的疑问，不施加任何压力。", "Объясняем плюсы и минусы каждого варианта и отвечаем на вопросы без давления.", "각 건물의 장단점을 솔직히 설명드리고 압박 없이 모든 질문에 답해드립니다.", "各物件のメリット・注意点を率直にお伝えし、無理な勧誘はいたしません。")}</p>
              </div>
              <div className="kin-about-pillar kin-reveal kin-reveal-delay-2">
                <div className="kin-pillar-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
                <h3>{tx("Đồng hành an cư trọn vẹn", "Help settling in", "全程协助安居", "Помощь с заселением", "완벽한 정착 지원", "安心の入居サポート")}</h3>
                <p>{tx("Sắp xếp lịch xem trực tiếp, ký hợp đồng song ngữ, lập biên bản bàn giao có ảnh & chỉ số đồng hồ và hỗ trợ đăng ký tạm trú.", "We coordinate viewings, bilingual contracts, photo handover reports with meter readings, and residency registration.", "安排实地看房、双语合同、带照片与水电表读数的交房清单，并协助办理暂住登记。", "Организуем просмотры, двуязычный договор, акт приёмки с фото и регистрацию tạm trú.", "현장 투어, 이중언어 계약, 사진·계량기 인수인계서 및 공안 거주 등록까지 지원합니다.", "内覧手配、バイリンガル契約、写真付き引渡し確認、滞在登録まで一貫対応します。")}</p>
              </div>
            </div>

            {/* OUR CLIENTS — INTERACTIVE CLIENT TOUR PHOTO SLIDER */}
            {tourPhotos.length > 0 && (
              <section className="kin-reveal" style={{ marginBottom: "0.75rem" }}>
                <div className="kin-carousel-head">
                  <div>
                    <span className="eyebrow-badge">
                      {tx("KHÁCH HÀNG CỦA CHÚNG TÔI", "OUR CLIENTS", "我们的客户", "НАШИ КЛИЕНТЫ", "우리의 고객들", "お客様との歩み")}
                    </span>
                    <h2 className="section-heading-serif" style={{ marginBottom: "0.35rem" }}>
                      {tx("Chúng tôi gặp gỡ và dẫn xem nhà trực tiếp.", "We meet in person.", "我们亲自见面并带您看房。", "Мы встречаемся лично.", "직접 만나 현장 투어를 진행합니다.", "現地で直接お会いしてご案内します。")}
                    </h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.93rem", margin: 0, maxWidth: "620px" }}>
                      {tx(
                        "Khoảnh khắc thực tế cùng các cư dân tại Đà Nẵng — từ buổi đi xem nhà đầu tiên cho đến lúc nhận chìa khóa.",
                        "Real moments with our residents in Da Nang — from the first apartment tour to key handover day.",
                        "与岘港客户的真实瞬间——从首次看房到交付钥匙。",
                        "Реальные моменты с нашими клиентами в Дананге — от первого просмотра до ключей.",
                        "첫 투어부터 입주 키 전달까지 다낭 고객님들과 함께한 실제 현장 사진입니다.",
                        "最初の内覧から鍵の引き渡しまで、ダナンのお客様との実際の風景です。"
                      )}
                    </p>
                  </div>
                  <div className="kin-carousel-nav">
                    <button type="button" className="kin-carousel-btn" onClick={() => scrollTours(-1)} aria-label="Previous photo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <button type="button" className="kin-carousel-btn" onClick={() => scrollTours(1)} aria-label="Next photo">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                    </button>
                  </div>
                </div>

                <div ref={tourSliderRef} className="kin-tour-slider">
                  {tourPhotos.map((item) => {
                    const cap = locText(item.caption);
                    return (
                      <article
                        key={item.id}
                        className="kin-tour-slide"
                        onClick={() => setAboutLightbox({ src: item.image, caption: cap, sub: item.tag || item.date })}
                      >
                        <div className="kin-tour-card__img-wrap">
                          <img src={item.image} alt={cap || "KIN Estates client tour"} loading="lazy" />
                          {(item.tag || item.date) && (
                            <span className="kin-tour-card__tag">{item.tag || item.date}</span>
                          )}
                        </div>
                        {cap && <div className="kin-tour-card__body">{cap}</div>}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* CLIENT FEEDBACK — AUTO-SLIDING CAROUSEL WITH CLIENT AVATARS */}
            {testimonials.length > 0 && (
              <section
                className={`kin-fb-carousel-wrap kin-reveal ${fbPaused ? "is-paused" : ""}`}
                onMouseEnter={() => setFbPaused(true)}
                onMouseLeave={() => setFbPaused(false)}
                onTouchStart={() => setFbPaused(true)}
                onTouchEnd={() => window.setTimeout(() => setFbPaused(false), 3000)}
              >
                <div className="kin-carousel-head">
                  <div>
                    <span className="eyebrow-badge">
                      {tx("ĐÁNH GIÁ & FEEDBACK THỰC TẾ", "CLIENT FEEDBACK & REVIEWS", "客户真实评价", "ОТЗЫВЫ КЛИЕНТОВ", "고객 실제 후기", "お客様の声・レビュー")}
                    </span>
                    <h2 className="section-heading-serif" style={{ marginBottom: 0 }}>
                      {tx("Khách hàng nói gì sau khi nhận nhà cùng KIN Estates?", "What our residents say after moving in.", "入住后的客户真实反馈。", "Что говорят клиенты после заселения.", "입주 후 고객님들이 전해주신 이야기.", "ご入居いただいたお客様の声。")}
                    </h2>
                  </div>
                  {maxFbIdx > 0 && (
                    <div className="kin-carousel-nav">
                      <button
                        type="button"
                        className="kin-carousel-btn"
                        aria-label="Previous review"
                        onClick={() => setFbSlideIdx((prev) => (prev <= 0 ? maxFbIdx : prev - 1))}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                      </button>
                      <button
                        type="button"
                        className="kin-carousel-btn"
                        aria-label="Next review"
                        onClick={() => setFbSlideIdx((prev) => (prev >= maxFbIdx ? 0 : prev + 1))}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="kin-fb-viewport">
                  <div className="kin-fb-track" style={{ transform: fbTransform }}>
                    {testimonials.map((fb) => {
                      const quoteText = locText(fb.quote);
                      const stars = "★".repeat(Math.max(1, Math.min(5, Number(fb.rating) || 5)));
                      const initial = (fb.clientName || "K").trim().charAt(0).toUpperCase();
                      return (
                        <article key={fb.id} className="kin-fb-slide">
                          <span className="kin-fb-watermark" aria-hidden="true">“</span>
                          <div className="kin-fb-header">
                            <div className="kin-fb-avatar-ring">
                              {fb.avatar ? (
                                <img className="kin-fb-avatar-img" src={fb.avatar} alt={fb.clientName} loading="lazy" />
                              ) : (
                                <div className="kin-fb-avatar-initial">{initial}</div>
                              )}
                              <span className="kin-fb-verified-dot" title="Verified Resident">✓</span>
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "var(--text-primary)" }}>{fb.clientName}</div>
                              {fb.subtitle && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{fb.subtitle}</div>}
                              <div className="kin-feedback-stars" style={{ marginTop: "0.18rem" }} aria-label={`${fb.rating || 5} stars`}>
                                {stars}
                              </div>
                            </div>
                          </div>

                          {quoteText && <p className="kin-feedback-quote">“{quoteText}”</p>}

                          {fb.image && (
                            <div
                              className="kin-feedback-proof"
                              onClick={() => setAboutLightbox({ src: fb.image!, caption: quoteText, sub: `${fb.clientName}${fb.subtitle ? ` · ${fb.subtitle}` : ""}` })}
                            >
                              <img src={fb.image} alt={`Feedback from ${fb.clientName}`} loading="lazy" />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </div>

                {maxFbIdx > 0 && (
                  <div className="kin-fb-dots" role="tablist" aria-label="Feedback slides">
                    {Array.from({ length: maxFbIdx + 1 }).map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`kin-fb-dot ${safeFbIdx === idx ? "active" : ""}`}
                        onClick={() => setFbSlideIdx(idx)}
                        aria-label={`Slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Founder / Team Quote with Ambient Glow */}
            <div className="kin-about-quote-box kin-reveal">
              <blockquote>“{locText(aboutContent?.founderQuote) || tx("Tìm một căn hộ không chỉ là chọn bốn bức tường đẹp — mà là có một người bản địa đáng tin cậy đồng hành cùng bạn từ buổi xem nhà đầu tiên cho đến suốt thời gian an cư tại Đà Nẵng.", "Finding a home is about more than choosing the right space — it's about having reliable local people by your side from the first viewing to everyday life in Da Nang.")}”</blockquote>
              <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#E6C89C", letterSpacing: "0.06em" }}>
                — {aboutContent?.founderName || "KIN Estates Đà Nẵng"}
              </div>
            </div>

            {/* Your Habits Become Questions at the Viewing */}
            <h2 className="section-heading-serif kin-reveal" style={{ marginBottom: "1.25rem" }}>
              {tx("Thói quen của bạn trở thành câu hỏi khi đi xem nhà", "Your habits become questions at the viewing", "您的日常习惯，就是我们看房时的核验清单", "Ваши привычки становятся вопросами на просмотре", "당신의 라이프스타일이 현장 투어의 기준이 됩니다", "あなたの習慣が内覧時のチェック基準になります")}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem", marginBottom: "3rem" }}>
              <div className="kin-about-pillar kin-reveal" style={{ padding: "1.65rem" }}>
                <span className="eyebrow-badge">{tx("01 · LÀM VIỆC TẠI NHÀ", "01 · WORKING FROM HOME", "01 · 远程办公", "01 · УДАЛЕННАЯ РАБОТА", "01 · 재택근무", "01 · リモートワーク")}</span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", marginBottom: "0.45rem" }}>
                  {tx("Góc làm việc & Đường truyền", "Where does your workday happen?", "办公空间与光纤网络", "Где проходит ваш рабочий день?", "업무 공간 & 인터넷 환경", "ワークスペース＆光回線")}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
                  {tx("Kiểm tra diện tích bàn làm việc, ánh sáng tự nhiên không chói màn hình, vị trí ổ cắm và tốc độ mạng ngay trong căn phòng bạn sẽ dùng.", "Check desk space, daylight, sockets, and fiber Wi-Fi speed in the exact room you will actually work in.", "实地检查书桌空间、自然采光、插座位置以及实际办公房间的光纤速度。", "Проверяем стол, свет, розетки и скорость интернета именно в той комнате, где вы будете работать.", "실제 업무할 방의 책상 공간, 채광, 콘센트, 광랜 속도를 직접 확인합니다.", "実際に仕事をする部屋のデスク環境・採光・コンセント・Wi-Fi速度を確認します。")}
                </p>
              </div>
              <div className="kin-about-pillar kin-reveal kin-reveal-delay-1" style={{ padding: "1.65rem" }}>
                <span className="eyebrow-badge">{tx("02 · CHUYỂN ĐẾN CÙNG GIA ĐÌNH", "02 · MOVING TOGETHER", "02 · 家庭同住", "02 · ПЕРЕЕЗД ВМЕСТЕ", "02 · 가족·동반 이주", "02 · ご家族での移住")}</span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", marginBottom: "0.45rem" }}>
                  {tx("Bếp, Tủ đồ & Lộ trình mỗi ngày", "What does each person need?", "厨房、收纳与日常动线", "Что важно каждому члену семьи?", "수납·동선 & 생활 인프라", "収納・間取り・生活導線")}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
                  {tx("So sánh kích thước phòng ngủ, hệ tủ lưu trữ cho hợp đồng dài hạn, thang máy, bếp nấu và khoảng cách đến trường học hay siêu thị.", "Compare bedroom sizes, storage for long stays, lift access, kitchens, and daily routes to schools and markets.", "对比卧室空间、长租储物衣柜、电梯与厨房配置以及日常通勤路线。", "Сравниваем спальни, места хранения, лифты и удобство ежедневных маршрутов для каждого.", "침실 구성, 장기 거주 수납공간, 엘리베이터, 국제학교·마트 동선까지 비교합니다.", "寝室・収納・エレベーター・学校やスーパーへの導線を丁寧に比較します。")}
                </p>
              </div>
              <div className="kin-about-pillar kin-reveal kin-reveal-delay-2" style={{ padding: "1.65rem" }}>
                <span className="eyebrow-badge">{tx("03 · CÓ THÚ CƯNG ĐI CÙNG", "03 · BRINGING A PET", "03 · 携带宠物", "03 · С ПИТОМЦЕМ", "03 · 반려동물 동반", "03 · ペットと暮らす")}</span>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", marginBottom: "0.45rem" }}>
                  {tx("Quy định tòa nhà & Hợp đồng", "What are the building rules?", "大楼规定与合同条款", "Какие правила в этом доме?", "건물 규정 & 계약서 명시", "管理規約と契約条項")}
                </h3>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>
                  {tx("Làm rõ quy định nuôi thú cưng của Ban quản lý tòa nhà và ghi rõ sự đồng ý của chủ nhà vào hợp đồng trước khi đặt cọc.", "Clarify pet permissions, building restrictions, and any deposit terms in writing before you decide.", "在签约前明确物业宠物规定、限制与相关押金条款并写入合同。", "Заранее уточняем правила дома по животным и фиксируем согласие владельца в договоре.", "건물 관리규정과 보증금 조건을 사전에 확인하고 임대차 계약서에 명시합니다.", "建物のペット規約や条件を事前確認し、オーナー承諾を契約書に明記します。")}
                </p>
              </div>
            </div>

            {/* 5-Step How Renting Works */}
            <div className="kin-reveal" style={{ marginBottom: "1rem" }}>
              <span className="eyebrow-badge">{tx("QUY TRÌNH THUÊ NHÀ", "HOW RENTING WORKS", "租房流程", "КАК ПРОХОДИТ АРЕНДА", "임대 진행 절차", "ご契約までの流れ")}</span>
              <h2 className="section-heading-serif" style={{ marginBottom: "1.15rem" }}>
                {tx("5 bước đơn giản từ tin nhắn đầu tiên đến lúc nhận chìa khóa", "5 clear steps from your first message to receiving the keys", "从第一条消息到拿到钥匙的5个清晰步骤", "5 простых шагов от первого сообщения до ключей", "첫 문의부터 입주 키 수령까지 5단계", "最初のご相談から鍵のお渡しまで5ステップ")}
              </h2>
            </div>
            <div className="kin-about-steps kin-reveal">
              {[
                { n: "01", vi: "Chia sẻ ngân sách, khu vực, số phòng ngủ và ngày dự kiến vào ở.", en: "Tell us your budget, preferred area, bedrooms, lease length, and move-in date." },
                { n: "02", vi: "Nhận danh sách căn hộ tuyển chọn thực tế trong vòng 24 giờ.", en: "Receive a curated shortlist of verified available homes within 24 hours." },
                { n: "03", vi: "Đi xem nhà trực tiếp cùng đội ngũ KIN Estates theo khung giờ thuận tiện.", en: "Tour the apartments in person at a time that suits your schedule." },
                { n: "04", vi: "Ký hợp đồng song ngữ rõ ràng trực tiếp với chủ nhà trước khi thanh toán cọc.", en: "Sign a clear bilingual lease before paying anything — deposit goes directly to the owner." },
                { n: "05", vi: "Nhận chìa khóa, biên bản bàn giao kèm ảnh & chỉ số điện nước, hỗ trợ tạm trú NA17.", en: "Get keys, a photo handover report with meter readings, and full temporary residency support." }
              ].map((s) => (
                <div key={s.n} className="kin-about-step">
                  <div className="kin-about-step__num">STEP {s.n}</div>
                  <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.58 }}>{lang === "vi" ? s.vi : s.en}</div>
                </div>
              ))}
            </div>

            {/* Live Catalogue & Direct Contact Strip */}
            <div className="kin-reveal" style={{ background: "#FFFFFF", border: "1px solid var(--border-light)", borderRadius: "20px", padding: "1.65rem 1.75rem", marginBottom: "2.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1.25rem", boxShadow: "var(--shadow-soft)" }}>
              <div style={{ maxWidth: "520px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.1em", color: "var(--accent-bronze-dark)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                  {tx("DỮ LIỆU TRỰC TIẾP · CHỈ CHO THUÊ DÀI HẠN (3+ THÁNG)", "LIVE CATALOGUE · LONG STAYS ONLY (3+ MONTHS)", "实时房源 · 专注3个月以上长租", "АКТУАЛЬНЫЙ КАТАЛОГ · ОТ 3 МЕСЯЦЕВ", "실시간 매물 · 3개월 이상 장기 전용", "最新物件・3ヶ月以上の長期専門")}
                </div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.35rem" }}>
                  {tx(
                    `Hiện có ${liveAvail.length} căn hộ đang trống từ $${minUsd} đến $${maxUsd}/tháng`,
                    `Currently ${liveAvail.length} verified residences available from $${minUsd} to $${maxUsd}/month`
                  )}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {tx("Giá công khai trực tiếp từ chủ nhà · Điện nước giá nhà nước · ", "Direct owner pricing · Transparent utility terms · ")}
                  <button
                    type="button"
                    onClick={() => navigate("/privacy-policy")}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--accent-bronze-dark)", fontWeight: 700, textDecoration: "underline", cursor: "pointer", font: "inherit" }}
                  >
                    {tx("Xem chính sách bảo mật & dữ liệu", "Read our Privacy Policy", "查看隐私政策", "Политика конфиденциальности", "개인정보 처리방침 보기", "プライバシーポリシーを見る")}
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                <a href="https://t.me/KIN_Estates" target="_blank" rel="noreferrer" className="btn-luxe btn-luxe--navy" style={{ textDecoration: "none" }}>
                  <span>Telegram @KIN_Estates</span>
                </a>
                <a href="https://zalo.me/0389711601" target="_blank" rel="noreferrer" className="btn-luxe btn-luxe--outline" style={{ textDecoration: "none" }}>
                  <span>Zalo 0389 711 601</span>
                </a>
                <a href="https://wa.me/84389711601" target="_blank" rel="noreferrer" className="btn-luxe btn-luxe--outline" style={{ textDecoration: "none" }}>
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Landlord / Owner Property Submission Card */}
            <div style={{ background: "#FFFFFF", padding: "2rem", borderRadius: "22px", border: "1px solid rgba(168,124,81,0.28)", boxShadow: "var(--shadow-soft)", marginBottom: "2rem" }}>
              <span className="eyebrow-badge">
                {tx("DÀNH CHO CHỦ NHÀ & ĐỐI TÁC ĐÀ NẴNG", "FOR DA NANG PROPERTY OWNERS", "面向岘港房东与合作伙伴", "ДЛЯ СОБСТВЕННИКОВ ЖИЛЬЯ", "다낭 임대인 및 파트너 전용", "ダナンの物件オーナー様へ")}
              </span>
              <h2 className="section-heading-serif" style={{ marginBottom: "0.5rem" }}>
                {tx("Ký gửi căn hộ & biệt thự lên KIN Estates", "Submit Your Residence for Curation", "委托发布您的公寓或别墅", "Разместить квартиру в KIN Estates", "KIN Estates에 매물 등록 의뢰", "物件の掲載・管理を依頼する")}
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
                {tx(
                  "Gửi thông tin căn hộ cần cho thuê dài hạn. Hệ thống sẽ thông báo ngay tới đội ngũ KIN Estates để kiểm duyệt và đăng tải.",
                  "Submit your long-term residence details below. Our advisory team receives an instant notification to review and publish your property.",
                  "在下方提交您的长租房源信息，我们的管理团队将实时收到通知并审核上架。",
                  "Отправьте данные вашей квартиры ниже — команда получит мгновенное уведомление для публикации.",
                  "장기 임대 매물 정보를 남겨주시면 관리팀으로 즉시 알림이 전송되어 검토 후 등록됩니다.",
                  "長期賃貸物件の情報を送信いただくと、担当チームへ即座に通知され審査・掲載されます。"
                )}
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = String(fd.get("title") || "");
                  const building = String(fd.get("building") || "");
                  const address = String(fd.get("address") || "");
                  const areaName = String(fd.get("areaName") || "An Thuong");
                  const priceUsd = String(fd.get("priceUsd") || "800");
                  const bedrooms = String(fd.get("bedrooms") || "1");
                  const sizeM2 = String(fd.get("sizeM2") || "60");
                  const clientName = String(fd.get("clientName") || "Chủ nhà đối tác");
                  const contactHandle = String(fd.get("contactHandle") || "");
                  const images = String(fd.get("images") || "");
                  const notes = String(fd.get("notes") || "");

                  const res = await fetch("/api/inquiries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "owner_listing",
                      clientName,
                      messenger: "Zalo / Telegram",
                      contactHandle,
                      apartmentCode: "PHONG-KY-GUI",
                      apartmentTitle: `${title} (${building})`,
                      budgetUsd: `$${priceUsd}/tháng`,
                      bedrooms: `${bedrooms} PN · ${sizeM2}m²`,
                      viewingTime: address,
                      notes: `Địa chỉ: ${address} | Mô tả: ${notes}`,
                      ownerPropertyData: {
                        title,
                        building,
                        address,
                        areaName,
                        priceUsd,
                        bedrooms: Number(bedrooms) || 1,
                        sizeM2: Number(sizeM2) || 60,
                        images,
                        notes
                      }
                    })
                  });
                  const data = await res.json();
                  if (data.ok) {
                    setBookingFeedback(
                      tx(
                        "✓ Đã gửi thông tin phòng ký gửi! Ban quản trị KIN Estates đã nhận thông báo để duyệt đăng.",
                        "✓ Property submitted! Our team has been notified for immediate review.",
                        "✓ 房源已提交！管理团队已收到通知。",
                        "✓ Объект отправлен! Администратор получил уведомление.",
                        "✓ 매물 접수 완료! 관리팀으로 알림이 전송되었습니다.",
                        "✓ 物件情報を送信しました！担当者へ通知が送られました。"
                      )
                    );
                    e.currentTarget.reset();
                  }
                }}
              >
                <div className="kin-form-grid">
                  <div className="kin-input-group">
                    <label>{tx("Tên căn hộ / Tiêu đề *", "Residence Title *")}</label>
                    <input name="title" required placeholder="VD: Căn hộ 2PN View Sông Hàn" />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Tòa nhà / Khu *", "Building / Compound *")}</label>
                    <input name="building" required placeholder="VD: The Panoma / Hiyori" />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Địa chỉ cụ thể *", "Exact Address *")}</label>
                    <input name="address" required placeholder="VD: Đường Trần Thị Lý, Ngũ Hành Sơn" />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Khu vực", "Area")}</label>
                    <select name="areaName" defaultValue="An Thuong">
                      <option value="An Thuong">An Thượng (Mỹ Khê)</option>
                      <option value="Son Tra">Sơn Trà</option>
                      <option value="Han Riverfront">Bờ Sông Hàn / Hải Châu</option>
                      <option value="My Khe Beachfront">Mặt Biển Mỹ Khê</option>
                    </select>
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Giá mong muốn ($ USD/tháng) *", "Monthly Rent ($ USD) *")}</label>
                    <input name="priceUsd" required placeholder="VD: 850" />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Số phòng ngủ", "Bedrooms")}</label>
                    <input name="bedrooms" type="number" defaultValue={2} min={1} max={8} />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Diện tích (m²)", "Size (m²)")}</label>
                    <input name="sizeM2" type="number" defaultValue={70} min={20} />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Tên Chủ Nhà / Người Đăng *", "Owner Name *")}</label>
                    <input name="clientName" required placeholder="VD: Anh Minh" />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("SĐT Zalo hoặc @Telegram *", "Zalo Phone or @Telegram *")}</label>
                    <input name="contactHandle" required placeholder="VD: 0905... hoặc @username" />
                  </div>
                  <div className="kin-input-group">
                    <label>{tx("Link Ảnh Căn Hộ (Tùy chọn)", "Photo URLs (Optional)")}</label>
                    <input name="images" placeholder="https://..." />
                  </div>
                </div>
                <div className="kin-input-group" style={{ marginTop: "0.85rem" }}>
                  <label>{tx("Mô tả chi tiết (Nội thất, tầng, điện nước, thú cưng...)", "Detailed Description")}</label>
                  <textarea name="notes" rows={2} placeholder="VD: Tầng 18 thoáng mát, điện giá nhà nước EVN..." />
                </div>
                <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <button type="submit" className="btn-luxe btn-luxe--navy">
                    <span>{tx("Gửi thông tin căn hộ đến KIN Estates →", "Submit Residence to KIN Estates →", "提交房源至 KIN Estates →", "Отправить объект в KIN Estates →", "KIN Estates에 매물 제출 →", "KIN Estatesへ物件情報を送信 →")}</span>
                  </button>
                  {bookingFeedback && (
                    <span style={{ color: "var(--accent-emerald)", fontWeight: 700, fontSize: "0.86rem" }}>
                      {bookingFeedback}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </main>
        );
      })()}

      {/* ====================================================================
          PAGE 7: CHÍNH SÁCH BẢO MẬT & DỮ LIỆU (/privacy-policy) — DEDICATED PAGE
          ==================================================================== */}
      {route.replace(/\/+$/, "") === "/privacy-policy" && (
        <main className="page-route">
          <div className="page-container">
            <div className="kin-doc-wrap">
              <nav className="kin-breadcrumb" aria-label="Breadcrumb">
                <button type="button" onClick={() => navigate("/")}>
                  {tx("Trang chủ", "Home", "首页", "Главная", "홈", "ホーム")}
                </button>
                <span>/</span>
                <span>{tx("Chính sách dữ liệu", "Privacy policy", "隐私政策", "Политика конфиденциальности", "개인정보 처리방침", "プライバシーポリシー")}</span>
              </nav>

              <span className="eyebrow-badge">
                {tx("TÀI LIỆU PHÁP LÝ & MINH BẠCH", "DOCUMENTS", "法律与隐私文件", "ДОКУМЕНТЫ", "문서 및 정책", "ドキュメント")}
              </span>
              <h1 className="section-heading-serif" style={{ marginBottom: "0.65rem" }}>
                {tx("Chính sách bảo mật & dữ liệu", "Privacy policy", "隐私与数据政策", "Политика конфиденциальности", "개인정보 처리방침", "プライバシーポリシー")}
              </h1>
              <p style={{ fontSize: "1.02rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: "0.85rem" }}>
                {tx(
                  "Biểu mẫu yêu cầu trên KIN Estates thu thập những gì, vì sao, ai tiếp nhận dữ liệu, chúng tôi lưu giữ bao lâu và cách bạn yêu cầu xóa dữ liệu.",
                  "What the KIN Estates request form collects, why, who receives the data, how long we keep it, and how to have it deleted.",
                  "KIN Estates 预约表单收集哪些信息、收集目的、谁将接收数据、保存期限以及如何申请删除。",
                  "Какие данные собирает форма KIN Estates, зачем, кто их получает, сколько мы их храним и как удалить.",
                  "KIN Estates 문의 양식에서 수집하는 항목, 목적, 수신자, 보관 기간 및 삭제 요청 방법을 안내합니다.",
                  "KIN Estatesのお問い合わせフォームで収集する情報、利用目的、管理体制、保管期間、削除方法について説明します。"
                )}
              </p>

              <div className="kin-doc-meta">
                <strong>KIN Estates Đà Nẵng</strong>
                <span>·</span>
                <span>{tx("Cập nhật 23.11.2026", "Updated 23.11.2026", "更新于 2026.11.23", "Обновлено 23.11.2026", "업데이트 2026.11.23", "更新日 2026.11.23")}</span>
                <span>·</span>
                <span>{tx("3 phút đọc", "3 min read", "阅读约 3 分钟", "3 мин чтения", "약 3분 소요", "読了目安 3分")}</span>
              </div>

              {/* Table of Contents */}
              <div className="kin-doc-toc">
                <div className="kin-doc-toc__title">{tx("Mục lục", "Contents", "目录", "Содержание", "목차", "目次")}</div>
                <ul className="kin-doc-toc__list">
                  <li><a href="#pp-controller">1. {tx("Đơn vị xử lý dữ liệu", "Who handles the data", "数据处理主体", "Кто обрабатывает данные", "데이터 관리 주체", "データ管理者")}</a></li>
                  <li><a href="#pp-collect">2. {tx("Thông tin chúng tôi thu thập", "What we collect", "我们收集的内容", "Что мы собираем", "수집하는 정보", "収集する情報")}</a></li>
                  <li><a href="#pp-why">3. {tx("Mục đích sử dụng", "Why we collect it", "使用目的", "Зачем это нужно", "이용 목적", "利用目的")}</a></li>
                  <li><a href="#pp-recipients">4. {tx("Ai tiếp nhận & Hạ tầng lưu trữ", "Who receives it & Storage", "数据接收方与存储", "Кто получает данные", "제공 및 보관 인프라", "提供先と保管インフラ")}</a></li>
                  <li><a href="#pp-retention">5. {tx("Thời gian lưu trữ", "How long we keep it", "保存期限", "Срок хранения", "보관 기간", "保管期間")}</a></li>
                  <li><a href="#pp-rights">6. {tx("Quyền của bạn", "Your rights", "您的权利", "Ваши права", "고객의 권리", "お客様の権利")}</a></li>
                  <li><a href="#pp-contact">7. {tx("Liên hệ về dữ liệu", "How to reach us", "联系我们", "Связаться с нами", "문의처", "お問い合わせ")}</a></li>
                </ul>
              </div>

              {/* Document Body */}
              <article className="kin-doc-article">
                <p className="kin-doc-lead">
                  {tx(
                    "Trang này giải thích rõ ràng, ngắn gọn và trung thực về những gì xảy ra với thông tin bạn gửi trên website KIN Estates. Mọi nội dung dưới đây phản ánh đúng 100% cách hệ thống của chúng tôi đang vận hành.",
                    "This page explains in plain words what happens to the details you leave on the KIN Estates website. Nothing here goes beyond what we actually do.",
                    "本页面以简洁透明的语言说明您在 KIN Estates 网站提交信息后的处理方式，绝无隐藏条款。",
                    "На этой странице простыми словами описано, что происходит с данными, которые вы оставляете на сайте KIN Estates.",
                    "이 페이지는 KIN Estates 웹사이트에 남겨주신 정보가 어떻게 처리되는지 투명하고 알기 쉽게 설명합니다.",
                    "このページでは、KIN Estatesのウェブサイトにご入力いただいた情報の取り扱いについて分かりやすく説明します。"
                  )}
                </p>

                <section id="pp-controller" className="kin-doc-section">
                  <h2>{tx("1. Đơn vị xử lý dữ liệu", "1. Who handles the data", "1. 数据处理主体", "1. Кто обрабатывает данные", "1. 데이터 관리 주체", "1. データ管理者")}</h2>
                  <p>
                    {tx(
                      "Đơn vị quản lý dữ liệu: KIN Estates — dịch vụ tư vấn và kết nối cho thuê căn hộ, penthouse và biệt thự dài hạn (3–12+ tháng) tại thành phố Đà Nẵng, Việt Nam.",
                      "Data controller: KIN Estates, a long-term residential rental advisory service (3–12+ months) based in Da Nang, Vietnam.",
                      "数据控制方：KIN Estates，位于越南岘港的长期住宅租赁顾问服务机构。",
                      "Оператор данных: KIN Estates — сервис подбора долгосрочной аренды квартир и вилл в Дананге, Вьетнам.",
                      "데이터 관리자: 베트남 다낭 기반 장기 주거 임대 전문 컨설팅 KIN Estates.",
                      "データ管理者：ベトナム・ダナンを拠点とする長期賃貸住宅アドバイザリー KIN Estates。"
                    )}
                  </p>
                </section>

                <section id="pp-collect" className="kin-doc-section">
                  <h2>{tx("2. Thông tin chúng tôi thu thập", "2. What we collect", "2. 我们收集的内容", "2. Что мы собираем", "2. 수집하는 정보", "2. 収集する情報")}</h2>
                  <p>{tx("Khi bạn gửi biểu mẫu hẹn xem nhà, đặt giữ chỗ hoặc ký gửi căn hộ, bạn cung cấp cho chúng tôi:", "Through our viewing, booking, or consultation forms, you share:", "通过预约看房或咨询表单，您向我们提供：", "Через форму заявки вы передаёте нам:", "방문 예약 또는 상담 양식을 통해 다음 정보를 입력하시게 됩니다:", "内覧予約やお問い合わせフォームを通じて以下の情報をご提供いただきます：")}</p>
                  <ul>
                    <li>{tx("Họ tên và kênh liên hệ bạn chọn (Zalo, WhatsApp, Telegram, WeChat hoặc số điện thoại);", "Your name and preferred contact handle (Zalo, WhatsApp, Telegram, WeChat, or phone number);")}</li>
                    <li>{tx("Mã căn hộ bạn quan tâm, thời gian hẹn xem thuận tiện, ngày dự kiến nhận phòng và ghi chú nhu cầu (nếu có);", "The apartment code you are inquiring about, preferred viewing time, move-in date, and optional notes;")}</li>
                    <li>{tx("Xác nhận đồng ý xử lý thông tin (ô đánh dấu ngay trong biểu mẫu).", "Your explicit consent to processing (the checkbox in the form).")}</li>
                  </ul>
                  <p>
                    {tx(
                      "Website KHÔNG yêu cầu thông tin hộ chiếu, số CCCD, số thẻ ngân hàng và KHÔNG bắt buộc bạn tạo tài khoản mật khẩu.",
                      "This website NEVER asks for passport numbers, ID scans, or payment card details, and does not require creating a user account.",
                      "本网站绝不要求您提供护照信息、银行卡号，也无需注册账户。",
                      "Сайт НЕ запрашивает паспортные данные, номера банковских карт и не требует регистрации аккаунта.",
                      "본 웹사이트는 여권 정보나 결제 카드 번호를 요구하지 않으며 별도의 회원가입도 필요하지 않습니다.",
                      "当サイトではパスポート情報やクレジットカード番号の入力、アカウント登録は一切求めません。"
                    )}
                  </p>
                </section>

                <section id="pp-why" className="kin-doc-section">
                  <h2>{tx("3. Mục đích sử dụng", "3. Why we collect it", "3. 使用目的", "3. Зачем это нужно", "3. 이용 목적", "3. 利用目的")}</h2>
                  <p>
                    {tx(
                      "Chúng tôi chỉ dùng thông tin của bạn cho duy nhất 2 mục đích: (1) tìm căn hộ phù hợp nhu cầu và (2) liên hệ xác nhận lịch xem nhà hoặc giữ chỗ theo đúng kênh bạn đã chọn. Chúng tôi không gửi thư quảng cáo spam và tuyệt đối không bán hay trao đổi danh sách khách hàng.",
                      "For two things only: to match you with the right residence and to contact you about your viewing or booking via the messenger you chose. We do not send marketing spam and we never sell or trade client lists.",
                      "仅用于两个目的：为您匹配合适房源，并通过您指定的通讯软件联系看房。我们不发送垃圾推广信息，也绝不出售客户名单。",
                      "Только для двух целей: подобрать подходящее жильё и связаться с вами в выбранном мессенджере. Мы не делаем спам-рассылок и не продаём базы.",
                      "단 두 가지 목적에만 사용합니다: 맞춤 매물 추천 및 선택하신 메신저로의 투어 일정 조율. 스팸 발송이나 제3자 판매는 절대 하지 않습니다.",
                      "目的は2つのみです：ご希望に合う物件のご提案と、ご指定の連絡先への内覧・予約連絡。営業メールの配信や第三者への販売は一切行いません。"
                    )}
                  </p>
                </section>

                <section id="pp-recipients" className="kin-doc-section">
                  <h2>{tx("4. Ai tiếp nhận & Hạ tầng lưu trữ", "4. Who receives it & Storage", "4. 数据接收方与存储", "4. Кто получает данные", "4. 제공 및 보관 인프라", "4. 提供先と保管インフラ")}</h2>
                  <p>
                    {tx(
                      "Yêu cầu của bạn được chuyển trực tiếp tới đội ngũ tư vấn nội bộ KIN Estates tại Đà Nẵng để sắp xếp lịch xem căn hộ. Chúng tôi không chia sẻ dữ liệu của bạn cho bất kỳ công ty môi giới bên ngoài, mạng quảng cáo hay bên môi giới dữ liệu nào.",
                      "Your request goes directly to our internal KIN Estates Da Nang advisory team to coordinate viewings and owner communication. Nothing is passed to external agencies, ad networks, or data brokers."
                    )}
                  </p>
                  <p>
                    {tx(
                      "Dữ liệu yêu cầu được mã hóa truyền tải qua HTTPS và lưu trữ bảo mật trên hạ tầng đám mây MongoDB Atlas & Vercel. Bản đồ trên trang tải nền bản đồ từ dịch vụ bản đồ tiêu chuẩn, do đó trình duyệt của bạn chỉ gửi địa chỉ IP tiêu chuẩn khi tải ô bản đồ như mọi website khác.",
                      "Requests are transmitted over HTTPS and stored securely on MongoDB Atlas and Vercel cloud infrastructure. Interactive maps load standard map tiles directly in your browser."
                    )}
                  </p>
                </section>

                <section id="pp-retention" className="kin-doc-section">
                  <h2>{tx("5. Thời gian lưu trữ", "5. How long we keep it", "5. 保存期限", "5. Срок хранения", "5. 보관 기간", "5. 保管期間")}</h2>
                  <p>
                    {tx(
                      "Chúng tôi lưu giữ thông tin trong suốt thời gian hỗ trợ bạn tìm nhà và theo dõi lịch xem. Sau khi kết thúc quá trình tìm kiếm, dữ liệu yêu cầu được tự động rà soát và xóa khỏi hệ thống sau tối đa 12 tháng kể từ lần liên hệ gần nhất (trừ trường hợp bạn đã ký hợp đồng thuê chính thức cần lưu hồ sơ theo quy định).",
                      "We keep your enquiry while your home search is active so we can pick up seamlessly if you message again. Twelve months after your last contact, enquiry records are purged from our server (unless retained as part of an active signed residential lease)."
                    )}
                  </p>
                </section>

                <section id="pp-rights" className="kin-doc-section">
                  <h2>{tx("6. Quyền của bạn", "6. Your rights", "6. 您的权利", "6. Ваши права", "6. 고객의 권리", "6. お客様の権利")}</h2>
                  <p>
                    {tx(
                      "Bạn có toàn quyền yêu cầu kiểm tra thông tin chúng tôi đang lưu giữ về bạn, chỉnh sửa số điện thoại/kênh liên hệ hoặc yêu cầu xóa toàn bộ dữ liệu bất kỳ lúc nào. Chỉ cần nhắn cho chúng tôi qua Telegram, Zalo hoặc WhatsApp kèm từ khóa \"Xóa dữ liệu\" — chúng tôi sẽ hoàn tất xóa vĩnh viễn trong vòng 30 ngày (thường trong 24 giờ) và nhắn xác nhận lại cho bạn.",
                      "You can ask at any time what details we hold about you, update your contact info, or request complete deletion. Simply message us on Telegram, Zalo, or WhatsApp with the word \"data\" — we permanently delete your record within 30 days (usually within 24 hours) and confirm by message."
                    )}
                  </p>
                </section>

                <section id="pp-contact" className="kin-doc-section">
                  <h2>{tx("7. Liên hệ về dữ liệu", "7. How to reach us", "7. 联系我们", "7. Связаться с нами", "7. 문의처", "7. お問い合わせ")}</h2>
                  <p>{tx("Mọi câu hỏi về quyền riêng tư hoặc yêu cầu xóa dữ liệu, vui lòng liên hệ trực tiếp đội ngũ KIN Estates Đà Nẵng:", "For any privacy questions or data deletion requests, contact the KIN Estates Da Nang team directly:")}</p>
                  <ul>
                    <li><strong>Telegram:</strong> <a href="https://t.me/KIN_Estates" target="_blank" rel="noreferrer" style={{ color: "var(--accent-bronze-dark)", fontWeight: 700 }}>@KIN_Estates</a></li>
                    <li><strong>Zalo:</strong> <a href="https://zalo.me/0389711601" target="_blank" rel="noreferrer" style={{ color: "var(--accent-bronze-dark)", fontWeight: 700 }}>0389 711 601</a></li>
                    <li><strong>WhatsApp / Hotline:</strong> <a href="https://wa.me/84389711601" target="_blank" rel="noreferrer" style={{ color: "var(--accent-bronze-dark)", fontWeight: 700 }}>+84 389 711 601</a></li>
                  </ul>
                  <div style={{ marginTop: "1.35rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn-luxe btn-luxe--navy" onClick={() => navigate("/apartments")}>
                      <span>{tx("← Quay lại danh mục căn hộ", "← Back to Residences", "← 返回房源列表", "← К списку квартир", "← 매물 목록으로", "← 物件一覧に戻る")}</span>
                    </button>
                    <button type="button" className="btn-luxe btn-luxe--outline" onClick={() => navigate("/about")}>
                      <span>{tx("Về KIN Estates", "About KIN Estates", "关于 KIN Estates", "О KIN Estates", "KIN Estates 소개", "KIN Estatesについて")}</span>
                    </button>
                  </div>
                </section>
              </article>
            </div>
          </div>
        </main>
      )}

      {/* LIGHTBOX FOR ABOUT US CLIENT PHOTOS & FEEDBACK SCREENSHOTS */}
      {aboutLightbox && (
        <div className="kin-lightbox-backdrop" onClick={() => setAboutLightbox(null)}>
          <div className="kin-lightbox-box" onClick={(e) => e.stopPropagation()}>
            <img src={aboutLightbox.src} alt={aboutLightbox.caption || "KIN Estates"} />
            {(aboutLightbox.caption || aboutLightbox.sub) && (
              <div className="kin-lightbox-caption">
                {aboutLightbox.sub && (
                  <div style={{ fontSize: "0.78rem", color: "#E6C89C", fontWeight: 700, marginBottom: "0.25rem" }}>
                    {aboutLightbox.sub}
                  </div>
                )}
                {aboutLightbox.caption && <div>{aboutLightbox.caption}</div>}
              </div>
            )}
            <button
              type="button"
              onClick={() => setAboutLightbox(null)}
              style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.28)", borderRadius: "999px", padding: "0.45rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
            >
              {tx("Đóng ✕", "Close ✕", "关闭 ✕", "Закрыть ✕", "닫기 ✕", "閉じる ✕")}
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          DIALOG 1: FULL-SCREEN EXPAND MAP DIALOG ([ ⤢ Mở rộng bản đồ ])
          ==================================================================== */}
      {expandMapOpen && expandDialogApt && (
        <div className="homii-dialog-backdrop" onClick={() => setExpandMapOpen(false)}>
          <div className="expand-map-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="expand-map-left">
              <div id="dialog-expand-map" style={{ width: "100%", height: "100%" }} />
              <div style={{ position: "absolute", top: "14px", left: "14px", zIndex: 500, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", padding: "0.48rem 0.95rem", borderRadius: "999px", fontSize: "0.76rem", fontWeight: 700, border: "1px solid rgba(213,176,124,0.35)", boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}>
                {tx("Cuộn để thu phóng · Chạm vào mức giá trên bản đồ để đổi căn hộ", "Scroll to zoom · Click any price pin on the map to switch residence", "滚动缩放 · 点击地图上的价格标签切换房源", "Крутите для масштаба · Нажмите на цену для смены квартиры", "스크롤하여 확대 · 지도의 가격 핀을 눌러 매물 변경", "スクロールで拡大・地図上の価格ピンをクリックして物件切替")}
              </div>
            </div>

            <div className="expand-map-right">
              {/* Sticky Frosted Header inside Expand Map Right Column */}
              <div className="kin-dialog-topbar">
                <div className="kin-dialog-meta">
                  <span className="kin-dialog-code-pill">{trArea(expandDialogApt.areaName)}</span>
                  <span className="kin-dialog-loc-text">
                    {tx("BẢN ĐỒ CĂN HỘ", "RESIDENCE MAP", "房源地图", "КАРТА КВАРТИР", "아파트 지도", "物件マップ")}
                  </span>
                </div>
                <button
                  type="button"
                  className="kin-dialog-close-btn"
                  onClick={() => setExpandMapOpen(false)}
                  aria-label="Close modal"
                >
                  <span>{tx("Đóng", "Close", "关闭", "Закрыть", "닫기", "閉じる")}</span>
                  <span className="kin-dialog-close-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                </button>
              </div>

              <div className="expand-map-right__scroll">
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF", padding: "0.55rem 0.9rem", borderRadius: "14px", border: "1px solid rgba(22,25,30,0.08)", marginBottom: "1rem", boxShadow: "0 4px 12px rgba(22,25,30,0.04)" }}>
                    <button
                      type="button"
                      onClick={() => setExpandMapAptCode(expandMapUnits.at(expandMapAptIdx - 1)?.code)}
                      style={{ background: "#F5F1E8", border: "none", padding: "0.32rem 0.75rem", borderRadius: "999px", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", color: "#16191E" }}
                    >
                      ‹ {tx("Trước", "Prev", "上一套", "Пред.", "이전", "前へ")}
                    </button>
                    <strong style={{ fontSize: "0.82rem", fontFamily: "var(--font-mono)", color: "#8A683E" }}>
                      {String(expandMapAptIdx + 1).padStart(2, "0")} / {String(expandMapUnits.length).padStart(2, "0")}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setExpandMapAptCode((expandMapUnits[expandMapAptIdx + 1] || expandMapUnits[0])?.code)}
                      style={{ background: "#F5F1E8", border: "none", padding: "0.32rem 0.75rem", borderRadius: "999px", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer", color: "#16191E" }}
                    >
                      {tx("Tiếp", "Next", "下一套", "След.", "다음", "次へ")} ›
                    </button>
                  </div>

                  <div style={{ borderRadius: "18px", overflow: "hidden", aspectRatio: "16/10", marginBottom: "1rem", boxShadow: "0 12px 28px rgba(22,25,30,0.12)" }}>
                    <ApartmentPhoto
                      src={expandDialogApt.images?.[0]}
                      alt={getLocalized(expandDialogApt.title)}
                      unavailableText={photoUnavailable}
                      fallbackStyle={fillPhotoSlot}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </div>

                  <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-bronze-dark)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.28rem" }}>
                    {trArea(expandDialogApt.areaName)} · {expandDialogApt.building}
                  </div>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.45rem", lineHeight: 1.25, marginBottom: "0.55rem" }}>
                    {getLocalized(expandDialogApt.title)}
                  </h3>
                  <div className="apt-location-details">
                    <div>
                      {expandDialogApt.address?.trim() && <strong>{getAptField(expandDialogApt, "address").trim()}</strong>}
                      <span className="apt-location-status">{locationLabel(expandDialogApt)}</span>
                    </div>
                    {!getExactLocation(expandDialogApt) && getAddressSearchUrl(expandDialogApt) &&
                      renderLocationAction(expandDialogApt, "apt-detail-map-jump-btn")}
                  </div>
                  <div style={{ fontSize: "0.86rem", color: "var(--text-secondary)", marginBottom: "0.9rem" }}>
                    {expandDialogApt.bedrooms ?? "—"} {tx("phòng ngủ", "BR", "室", "сп.", "침실", "LDK")} · {expandDialogApt.sizeM2 ?? "—"} m² · {tx("Tầng", "Floor", "楼层", "Этаж", "층", "階")} {expandDialogApt.floor ?? "—"} {expandDialogApt.electricityRate && `· ${getAptField(expandDialogApt, "electricityRate")}`}
                  </div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.9rem", fontWeight: 800, color: "var(--bg-navy)", marginBottom: "1rem" }}>
                    {formatPrice(expandDialogApt)}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  <button
                    type="button"
                    className="btn-luxe btn-luxe--navy"
                    style={{ width: "100%", padding: "0.92rem" }}
                    onClick={() => {
                      setExpandMapOpen(false);
                      openApartmentDetailModal(expandDialogApt);
                    }}
                  >
                    <span>{tx("Khám phá chi tiết & Đặt lịch xem →", "Explore Details & Book Viewing →", "查看公寓完整详情与预约 →", "Подробнее и запись на просмотр →", "상세 정보 및 투어 예약 →", "詳細確認・内覧予約 →")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DIALOG 2: STREAMLINED VIEWING BOOKING DIALOG (Screenshot 2 — .kin-booking-modal)
          ==================================================================== */}
      {inquiryApartmentCode && (
        <div className="homii-dialog-backdrop" onClick={closeBookingModal}>
          <div className="kin-booking-modal" role="dialog" aria-modal="true" aria-labelledby="kin-inquiry-title" onClick={(e) => e.stopPropagation()}>
            {/* Top-Right Circular Close Button with Warm Bronze Ring */}
            <button
              type="button"
              className="kin-booking-close-circle"
              onClick={closeBookingModal}
              disabled={apartmentInquirySubmitting}
              aria-label="Close booking dialog"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="kin-booking-modal__scroll">
              <h2 className="kin-booking-title" id="kin-inquiry-title">
                {tx("Liên hệ về căn hộ", "Apartment enquiry", "咨询房源", "Запрос по квартире", "아파트 문의", "物件についてのお問い合わせ")}
              </h2>

              {/* Compact Apartment Summary Box (Matching Screenshot 2) */}
              {detailDialogApt && <div className="kin-booking-apt-summary">
                <ApartmentPhoto
                  className="kin-booking-apt-thumb"
                  src={detailDialogApt.images?.[0]}
                  alt={getLocalized(detailDialogApt.title)}
                  unavailableText={photoUnavailable}
                />
                <div className="kin-booking-apt-info">
                  <div className="kin-booking-apt-name">
                    {getLocalized(detailDialogApt.title)}
                  </div>
                  <div className="kin-booking-apt-meta">
                    {trArea(detailDialogApt.areaName)} · {detailDialogApt.bedrooms} {tx("phòng ngủ", "BR", "卧室", "сп.", "침실", "LDK")} · {detailDialogApt.sizeM2} m²
                  </div>
                  <div className="kin-booking-apt-price">
                    {formatPrice(detailDialogApt)}
                  </div>
                </div>
              </div>}

              {/* Streamlined Booking Form with Required Policy Consent Checkbox */}
              {detailDialogApt && !apartmentInquiryReceived && <form onSubmit={(e) => handleLeadSubmit(e, detailDialogApt)} aria-busy={apartmentInquirySubmitting}>
                <fieldset className="kin-inquiry-fields" disabled={apartmentInquirySubmitting || apartmentInquiryUnavailable}>
                  <div className="kin-inquiry-types" role="radiogroup" aria-label={tx("Loại yêu cầu", "Request type", "申请类型", "Тип запроса", "요청 유형", "リクエストの種類")}>
                    <label>
                      <input type="radio" name="requestType" value="viewing" checked={!apartmentInquiryIsReservation} onChange={() => {
                        setApartmentInquiryType("viewing");
                        setApartmentInquiryState("idle");
                      }} />
                      <span>{tx("Hẹn xem", "Book a viewing", "预约看房", "Просмотр", "투어 신청", "内覧予約")}</span>
                    </label>
                    <label>
                      <input type="radio" name="requestType" value="reservation" checked={apartmentInquiryIsReservation} onChange={() => {
                        setApartmentInquiryType("reservation");
                        setApartmentInquiryState("idle");
                      }} />
                      <span>{tx("Đặt phòng", "Request booking", "申请预订", "Запросить бронь", "예약 요청", "入居予約")}</span>
                    </label>
                  </div>
                  {apartmentInquiryIsReservation && (
                    <div className="kin-inquiry-field">
                      <label className="kin-booking-field-label" htmlFor="kin-inquiry-name">
                        {tx("Họ và tên", "Full name", "姓名", "Имя и фамилия", "이름", "氏名")}
                      </label>
                      <input id="kin-inquiry-name" className="kin-booking-input" name="clientName" autoComplete="name" required maxLength={120} />
                    </div>
                  )}
                  <div>
                    <label className="kin-booking-field-label" htmlFor="kin-inquiry-contact">
                      <span>{tx("Zalo, WhatsApp, Telegram hoặc WeChat", "Zalo, WhatsApp, Telegram or WeChat", "Zalo、WhatsApp、Telegram 或 微信", "Zalo, WhatsApp, Telegram или WeChat", "Zalo, WhatsApp, Telegram 또는 WeChat", "Zalo、WhatsApp、Telegram または WeChat")}</span>
                    </label>
                    <input
                      type="text"
                      id="kin-inquiry-contact"
                      name="contactHandle"
                      className="kin-booking-input"
                      required
                      maxLength={150}
                      placeholder={tx("@username hoặc số điện thoại", "@username or phone number", "@用户名 或 手机号码", "@username или номер телефона", "@아이디 또는 전화번호", "@ユーザー名または電話番号")}
                    />
                  </div>

                  {/* Policy Agreement Checkbox */}
                  <label className="kin-policy-checkbox-row">
                    <input
                      type="checkbox"
                      className="kin-policy-checkbox-input"
                      checked={policyAgreed}
                      onChange={(e) => setPolicyAgreed(e.target.checked)}
                      required
                    />
                    <span className="kin-policy-checkbox-text">
                      {tx("Tôi đồng ý xử lý thông tin để tìm nhà (", "I agree to data processing to find a home (", "我同意处理个人信息以匹配房源（", "Я согласен на обработку данных для подбора жилья (", "집 찾기를 위한 개인정보 처리에 동의합니다 (", "お部屋探しのための情報処理に同意します（")}
                      <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="kin-policy-link-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tx("chính sách dữ liệu", "data policy", "数据隐私政策", "политика данных", "개인정보 정책", "データポリシー")}
                      </a>
                      {tx(")", ")", "）", ")", ")", "）")}
                    </span>
                  </label>

                  <div>
                    <label className="kin-booking-field-label" htmlFor="kin-inquiry-date">
                      <span>{apartmentInquiryIsReservation
                        ? tx("Ngày nhận phòng dự kiến", "Preferred move-in date", "预计入住日期", "Желаемая дата заезда", "희망 입주일", "入居希望日")
                        : tx("Bạn muốn xem nhà khi nào?", "When would you like to view?", "您希望什么时候看房？", "Когда вы хотите посмотреть?", "언제 집을 보고 싶으신가요?", "いつ内覧をご希望ですか？")}</span>
                      <span className="kin-booking-optional-tag">{tx("không bắt buộc", "optional", "选填", "необязательно", "선택사항", "任意")}</span>
                    </label>
                    <input
                      key={apartmentInquiryType}
                      type={apartmentInquiryIsReservation ? "date" : "text"}
                      id="kin-inquiry-date"
                      name="moveInDate"
                      className="kin-booking-input"
                      maxLength={120}
                      placeholder={apartmentInquiryIsReservation ? undefined : tx("Ví dụ: ngày mai sau 15:00", "e.g. tomorrow after 15:00", "例如：明天下午 15:00 后", "Например: завтра после 15:00", "예: 내일 오후 3시 이후", "例：明日の15:00以降")}
                    />
                  </div>

                  {apartmentInquiryIsReservation && (
                    <div className="kin-inquiry-field kin-inquiry-field--later">
                      <label className="kin-booking-field-label" htmlFor="kin-inquiry-notes">
                        <span>{tx("Ghi chú", "Notes", "备注", "Примечания", "메모", "備考")}</span>
                        <span className="kin-booking-optional-tag">{tx("không bắt buộc", "optional", "选填", "необязательно", "선택사항", "任意")}</span>
                      </label>
                      <textarea id="kin-inquiry-notes" className="kin-booking-input" name="notes" rows={2} maxLength={1000} />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="kin-booking-submit-btn"
                    disabled={!policyAgreed}
                  >
                    <span>{apartmentInquirySubmitting
                      ? tx("Đang gửi…", "Sending…", "正在发送…", "Отправка…", "전송 중…", "送信中…")
                      : apartmentInquiryIsReservation
                        ? tx("Gửi yêu cầu đặt phòng", "Send booking request", "发送预订申请", "Отправить запрос на бронь", "예약 요청 보내기", "入居予約をリクエスト")
                        : tx("Gửi yêu cầu xem căn", "Send viewing request", "发送看房请求", "Отправить запрос на просмотр", "투어 요청 보내기", "内覧をリクエスト")}</span>
                    <span>→</span>
                  </button>

                </fieldset>
              </form>}

              {apartmentInquiryReceived && (
                <p className="kin-inquiry-feedback" role="status">
                  {apartmentInquiryIsReservation
                    ? tx("Yêu cầu đặt phòng đang chờ xác nhận. KIN Estates sẽ liên hệ để kiểm tra tình trạng căn và ngày nhận phòng.", "Booking request pending confirmation. KIN Estates will contact you about availability and your move-in date.", "预订申请待确认。KIN Estates 将联系您核实房源和入住日期。", "Запрос на бронь ожидает подтверждения. KIN Estates свяжется с вами по поводу наличия и даты заезда.", "예약 요청이 확인 대기 중입니다. KIN Estates에서 예약 가능 여부와 입주일에 대해 연락드립니다.", "入居予約は確認待ちです。空室状況と入居日についてKIN Estatesよりご連絡します。")
                    : tx("Đã nhận yêu cầu xem căn. KIN Estates sẽ liên hệ để hẹn giờ.", "Viewing request received. KIN Estates will contact you to arrange a time.", "已收到看房请求。KIN Estates 将联系您安排时间。", "Запрос на просмотр получен. KIN Estates свяжется с вами, чтобы согласовать время.", "투어 요청을 접수했습니다. KIN Estates에서 일정 조율을 위해 연락드립니다.", "内覧リクエストを受け付けました。日程調整のためKIN Estatesよりご連絡します。")}
                </p>
              )}
              {!apartmentInquiryReceived && (apartmentInquiryUnavailable || apartmentInquiryState === "error") && (
                <p className="kin-inquiry-feedback kin-inquiry-feedback--error" role="alert">
                  {apartmentInquiryUnavailable
                    ? tx("Căn này hiện không nhận yêu cầu. Bạn có thể chọn căn khác.", "This apartment is currently unavailable for requests. You can choose another.", "此房源暂不接受申请，您可选择其他房源。", "По этой квартире сейчас не принимаются заявки. Вы можете выбрать другую.", "현재 이 매물은 요청을 받지 않습니다. 다른 매물을 선택할 수 있습니다.", "この物件は現在リクエストを受け付けていません。他の物件をお選びいただけます。")
                    : tx("Chưa gửi được yêu cầu. Vui lòng kiểm tra thông tin và thử lại.", "Request could not be sent. Check your details and try again.", "无法发送请求，请检查资料后重试。", "Не удалось отправить запрос. Проверьте данные и попробуйте снова.", "요청을 보내지 못했습니다. 정보를 확인하고 다시 시도해 주세요.", "リクエストを送信できませんでした。入力内容をご確認の上、再度お試しください。")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          DIALOG 3: GUIDE ARTICLE READER DIALOG — 100% 6-LANGUAGE SYNCHRONIZED
          ==================================================================== */}
      {activeGuideModal && (
        <div className="homii-dialog-backdrop" onClick={() => setActiveGuideModal(null)}>
          <div className="unit-detail-dialog" style={{ maxWidth: "820px" }} onClick={(e) => e.stopPropagation()}>
            {/* Sticky Frosted-Glass Topbar */}
            <div className="kin-dialog-topbar">
              <div className="kin-dialog-meta">
                <span className="kin-dialog-code-pill">KIN ESTATES</span>
                <span className="kin-dialog-loc-text">{activeGuideModal.cat[lang] || activeGuideModal.cat.en}</span>
              </div>
              <button
                type="button"
                className="kin-dialog-close-btn"
                onClick={() => setActiveGuideModal(null)}
                aria-label="Close guide"
              >
                <span>{tx("Đóng", "Close", "关闭", "Закрыть", "닫기", "閉じる")}</span>
                <span className="kin-dialog-close-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </span>
              </button>
            </div>

            <div className="kin-dialog-scroll-body">
              <h2 className="section-heading-serif" style={{ marginBottom: "1.15rem", fontSize: "clamp(1.55rem, 2.5vw, 2.05rem)" }}>
                {activeGuideModal.title[lang] || activeGuideModal.title.en}
              </h2>

              <div className="kin-guide-article-box">
                {fmtCurrencyStr(activeGuideModal.content[lang] || activeGuideModal.content.en)}
              </div>

              <div style={{ marginTop: "1.35rem", background: "linear-gradient(135deg, #14171D 0%, #222731 100%)", color: "#FFFFFF", padding: "1.25rem 1.5rem", borderRadius: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E6C89C" }}>
                    KIN ESTATES · DA NANG ADVISORY
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 600, marginTop: "2px" }}>
                    {tx("Cần tư vấn trực tiếp về căn hộ hoặc thủ tục pháp lý?", "Need tailored residence recommendations or Form NA17 assistance?", "需要定制房源推荐或暂住证办理协助？", "Нужна подборка квартир или помощь с регистрацией NA17?", "맞춤 매물 추천이나 거주 등록 지원이 필요하신가요?", "物件のご提案や滞在登録サポートが必要ですか？")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <a href="https://t.me/KIN_Estates" target="_blank" rel="noreferrer" className="btn-luxe btn-luxe--bronze" style={{ padding: "0.6rem 1.05rem", fontSize: "0.8rem", textDecoration: "none" }}>
                    <span>Telegram @KIN_Estates →</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          KIN ESTATES ARCHITECTURAL FOOTER — 100% 6-LANGUAGE SYNCHRONIZED
          ==================================================================== */}
      <footer style={{ background: "var(--bg-navy)", color: "#FFFFFF", marginTop: "2rem" }}>
        <div className="page-container" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "2.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div className="brand-emblem" style={{ width: "42px", height: "42px", border: "1px solid rgba(213, 176, 124, 0.35)" }}>
                <img src="/img/kin-estates-logo.svg" alt="KIN Estates Logo" style={{ width: "100%", height: "100%", display: "block" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 800, letterSpacing: "0.05em", display: "flex", alignItems: "baseline", gap: "0.32rem" }}>
                  <span style={{ color: "#FFFFFF" }}>KIN</span>
                  <span className="brand-title-dot" />
                  <span style={{ color: "#E6C89C", fontSize: "0.86em", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase" }}>Estates</span>
                </div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245, 217, 184, 0.75)" }}>
                  Da Nang Private Residences
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.75)", marginBottom: "1rem" }}>
              {tx(
                "Không gian sống tuyển chọn tại Đà Nẵng. Chuyên căn hộ chung cư, penthouse và biệt thự dài hạn (3–12+ tháng).",
                "Curated architectural residences in Da Nang. Specializing in long-term apartments, penthouses, and private villas (3–12+ months).",
                "岘港精选建筑居住空间。专注 3–12个月以上长期公寓、顶层公寓与独栋别墅租赁。",
                "Избранные резиденции в Дананге. Долгосрочная аренда квартир, пентхаусов и вилл (3–12+ месяцев).",
                "다낭 큐레이션 프리미엄 레지던스. 아파트, 펜트하우스, 풀빌라 장기 임대(3~12개월+) 전문.",
                "ダナンの厳選レジデンス。長期賃貸アパート・ペントハウス・ヴィラ（3〜12ヶ月以上）専門。"
              )}
            </p>
          </div>

          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#F5D9B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              {tx("KHÁM PHÁ", "EXPLORE", "探索房源", "НАВИГАЦИЯ", "둘러보기", "探索")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.82)" }}>
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/apartments")}>{tx("Tất cả căn hộ Đà Nẵng", "All Da Nang Apartments", "所有岘港公寓", "Все квартиры Дананга", "다낭 전체 아파트", "ダナン全物件一覧")}</span>
              <span style={{ cursor: "pointer" }} onClick={openMapOverview}>{tx("Bản đồ căn hộ Đà Nẵng", "Interactive Residence Map", "岘港房源地图", "Интерактивная карта", "다낭 아파트 지도", "インタラクティブ地図")}</span>
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/areas")}>{tx("Các khu vực Đà Nẵng", "Da Nang Neighborhoods", "岘港核心区域", "Районы Дананга", "다낭 주요 지역", "ダナン主要エリア")}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#F5D9B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              {tx("THÔNG TIN TƯ VẤN", "ADVISORY", "租房指南", "ИНФОРМАЦИЯ", "안내 및 가이드", "ご利用案内")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.82)" }}>
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/how-to-rent")}>{tx("Quy trình thuê nhà", "How to Rent", "租房流程", "Процесс аренды", "임대 진행 절차", "賃貸の流れ")}</span>
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/guides")}>{tx("Cẩm nang & Chỉ số giá", "Guides & Price Index", "生活指南与价格指数", "Гиды и индекс цен", "생활 가이드 & 가격 지수", "ガイド＆家賃指数")}</span>
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/about")}>{tx("Về KIN Estates & Chủ nhà", "About KIN Estates", "关于 KIN Estates", "О компании KIN Estates", "KIN Estates 소개", "KIN Estatesについて")}</span>
              <span style={{ cursor: "pointer" }} onClick={() => navigate("/privacy-policy")}>{tx("Chính sách bảo mật & dữ liệu", "Privacy & Data Policy", "隐私与数据政策", "Политика конфиденциальности", "개인정보 처리방침", "プライバシーポリシー")}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#F5D9B8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              {tx("LIÊN HỆ TRỰC TIẾP", "DIRECT CONTACT", "直接联系", "КОНТАКТЫ", "직접 문의", "お問い合わせ")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.88rem", color: "rgba(255,255,255,0.82)" }}>
              <span>Zalo / WhatsApp: +84 389 711 601</span>
              <a href="https://t.me/KIN_Estates" target="_blank" rel="noreferrer" style={{ color: "#F5D9B8", textDecoration: "none", fontWeight: 700 }}>
                Telegram: @KIN_Estates
              </a>
              <span>VI · EN · 中文 · RU · KO · JA</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          MOBILE STICKY BOTTOM CONTACT BAR WITH CRISP VECTOR SVG ICONS
          ==================================================================== */}
      <nav className="kin-mobile-contact-bar" aria-label="Direct Contact Bar">
        <a href="https://zalo.me/0389711601" target="_blank" rel="noreferrer" className="mobile-contact-item">
          <span className="contact-circle zalo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </span>
          <span>Zalo</span>
        </a>
        <a href="https://wa.me/84389711601" target="_blank" rel="noreferrer" className="mobile-contact-item">
          <span className="contact-circle whatsapp">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <span>WhatsApp</span>
        </a>
        <a href="https://t.me/KIN_Estates" target="_blank" rel="noreferrer" className="mobile-contact-item">
          <span className="contact-circle telegram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </span>
          <span>Telegram</span>
        </a>
        <a href="tel:+84389711601" className="mobile-contact-item">
          <span className="contact-circle call">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <span>{tx("Gọi điện", "Call", "电话", "Звонок", "전화", "電話")}</span>
        </a>
      </nav>
    </div>
  );
};
