import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
        setHeaderColor?: (color: string) => void;
      };
    };
    L?: any;
  }
}

type TabKey = "report" | "apartments" | "leads" | "leases" | "about";

interface Apartment {
  _id: string;
  code: string;
  propertyType?: string;
  title: Record<string, string> | string;
  building: string;
  address?: string;
  areaName: string;
  district?: string;
  priceUsd: number;
  priceVnd: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeM2?: number | null;
  landAreaM2?: number | null;
  floor?: number | null;
  orientation?: string;
  frontageRoad?: string;
  furnishing?: string;
  cleaningService?: string;
  managementFee?: string;
  parking?: string;
  poolInfo?: string;
  minLeaseMonths?: number | null;
  depositMonths?: number | null;
  availableFrom?: string | null;
  electricityRate?: string | null;
  waterRate?: string | null;
  wifiIncluded?: boolean;
  petPolicy?: string;
  status: string;
  isVisible?: boolean;
  featured?: boolean;
  isPinned?: boolean;
  pinnedAt?: string | null;
  boostedAt?: string | null;
  createdAt?: string;
  daysListed?: number;
  daysSinceBoost?: number;
  landlordName?: string;
  landlordPhone?: string;
  adminNote?: string;
  locationAccuracy?: "exact" | "area";
  coordinates?: { lat: number; lng: number } | null;
  architecturalNotes?: Record<string, string> | string;
  tags?: string[];
  images?: string[];
  contactSummary?: { people: number; clicks: number; bookings: number };
}

interface Inquiry {
  _id: string;
  code?: string;
  type: string;
  clientName: string;
  messenger?: string;
  contactHandle?: string;
  apartmentCode?: string;
  apartmentTitle?: string;
  budgetUsd?: string;
  bedrooms?: string;
  viewingTime?: string;
  requestedViewingTime?: string;
  moveInDate?: string;
  notes?: string;
  adminNotes?: string;
  status: string;
  createdAt?: string;
}

interface Lease {
  _id: string;
  code: string;
  apartmentCode: string;
  apartmentTitle?: string;
  building?: string;
  address?: string;
  tenantName: string;
  tenantContact?: string;
  messenger?: string;
  priceUsd: number;
  priceVnd?: number;
  depositMonths?: number;
  paymentDay?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  notes?: string;
  daysLeft?: number | null;
}

interface MediaItem {
  id: string;
  url: string;
  contentType: string;
  createdAt: string | null;
  usedBy: Array<{ code: string; title: string }>;
}

interface AboutTourPhoto {
  id: string;
  image: string;
  caption?: Record<string, string> | string;
  tag?: string;
  date?: string;
  createdAt?: string;
}

interface AboutTestimonial {
  id: string;
  clientName: string;
  subtitle?: string;
  rating?: number;
  avatar?: string;
  quote?: Record<string, string> | string;
  image?: string;
  createdAt?: string;
}

interface AboutContent {
  heroImage: string;
  founderName: string;
  founderQuote: Record<string, string> | string;
  clientTourPhotos: AboutTourPhoto[];
  testimonials: AboutTestimonial[];
  updatedAt?: string;
}

interface ReportData {
  generatedAt: string;
  kpi: {
    totalApartments: number;
    availableCount: number;
    rentedCount: number;
    reservedCount: number;
    hiddenCount: number;
    pinnedCount?: number;
    typeCounts?: Record<string, number>;
    occupancyRate: number;
    activeLeasesCount: number;
    activeRevenueVnd: number;
    activeRevenueUsd: number;
    vacantPotentialVnd: number;
    vacantPotentialUsd: number;
    totalInquiries: number;
    newLeadsCount: number;
    pendingBookingsCount: number;
    confirmedBookingsCount: number;
    expiringSoonCount: number;
  };
  areaBreakdown: Array<{ area: string; total: number; available: number; rented: number; leads: number; revenueVnd: number }>;
  topApartments: Apartment[];
  slowVacantApartments?: Apartment[];
  statusFunnel: Record<string, number>;
  channels: Array<{ name: string; count: number }>;
  expiringSoonLeases: Lease[];
  apartments: Apartment[];
  inquiries: Inquiry[];
  leases: Lease[];
  aboutContent?: AboutContent;
  dbStatus?: { mode?: string; isNativeMongoConnected?: boolean };
}

const RATE_VND = 25480;
const PROPERTY_CATEGORIES = [
  { val: "condo", label: "Căn hộ chung cư", short: "Chung cư" },
  { val: "apartment", label: "Căn hộ thường", short: "Căn hộ thường" },
  { val: "house", label: "Nhà nguyên căn", short: "Nhà nguyên căn" },
  { val: "villa", label: "Biệt thự / Villa", short: "Villa" },
  { val: "penthouse", label: "Penthouse", short: "Penthouse" }
];
const getAptCategoryLabel = (pt?: string) =>
  PROPERTY_CATEGORIES.find((c) => c.val === pt)?.short || "Chung cư";

const AREAS = [
  { val: "Han Riverfront", label: "Ven sông Hàn" },
  { val: "An Thuong", label: "An Thượng" },
  { val: "My Khe Beachfront", label: "Biển Mỹ Khê" },
  { val: "Son Tra", label: "Sơn Trà" },
  { val: "Hải Châu", label: "Hải Châu" },
  { val: "Ngũ Hành Sơn", label: "Ngũ Hành Sơn" },
  { val: "Mỹ An", label: "Mỹ An" },
  { val: "Phước Mỹ", label: "Phước Mỹ" },
  { val: "Khuê Mỹ", label: "Khuê Mỹ" },
  { val: "Nam Việt Á", label: "Nam Việt Á" },
  { val: "Hòa Xuân", label: "Hòa Xuân" },
  { val: "Cẩm Lệ", label: "Cẩm Lệ" },
  { val: "Thanh Khê", label: "Thanh Khê" },
  { val: "Liên Chiểu", label: "Liên Chiểu" },
  { val: "Hòa Khánh", label: "Hòa Khánh" },
  { val: "FPT City / Hòa Hải", label: "FPT City / Hòa Hải" },
  { val: "Thọ Quang", label: "Thọ Quang" },
  { val: "Thuận Phước", label: "Thuận Phước" },
  { val: "Hòa Vang", label: "Hòa Vang" }
];
type CatAttrKey = "managementFee" | "parking" | "furnishing" | "cleaningService" | "frontageRoad" | "poolInfo";

interface CategorySpecConfig {
  titleLabel: string;
  titlePlaceholder: string;
  bldgLabel: string;
  bldgPlaceholder: string;
  bldgPresets: string[];
  sizeLabel: string;
  floorLabel: string;
  defaultFloor: string;
  hasLandArea: boolean;
  elecPresets: string[];
  tags: string[];
  attrs: Array<{ key: CatAttrKey; label: string; placeholder: string; presets: string[] }>;
}

const CATEGORY_CONFIG: Record<string, CategorySpecConfig> = {
  condo: {
    titleLabel: "Tên căn hộ chung cư *",
    titlePlaceholder: "VD: The Panoma 2 — Căn góc 2PN View Sông Hàn",
    bldgLabel: "Tòa nhà / Dự án chung cư",
    bldgPlaceholder: "VD: The Panoma, The Filmore, Hiyori, Monarchy...",
    bldgPresets: ["The Panoma", "The Filmore", "Hiyori Garden Tower", "The Monarchy", "Azura", "FPT Plaza"],
    sizeLabel: "DT thông thủy (m²)",
    floorLabel: "Tầng căn hộ",
    defaultFloor: "15",
    hasLandArea: false,
    elecPresets: ["Giá nhà nước (EVN ~2,800đ/kWh)", "Theo hóa đơn EVN"],
    tags: ["View sông Hàn", "Gần biển", "Hồ bơi vô cực", "Gym", "Ban công", "Bàn làm việc", "Máy giặt sấy", "Điện EVN", "An ninh 24/7", "Thú cưng"],
    attrs: [
      {
        key: "managementFee",
        label: "Phí quản lý vận hành tòa nhà",
        placeholder: "VD: Đã bao gồm trong giá thuê / 18k/m²",
        presets: ["Đã bao gồm", "Chưa bao gồm", "Miễn phí năm đầu"]
      },
      {
        key: "parking",
        label: "Chỗ đỗ xe (Hầm / Nội khu)",
        placeholder: "VD: Hầm đỗ ô tô & xe máy",
        presets: ["Hầm ô tô & xe máy", "Hầm xe máy", "Đỗ ô tô nội khu"]
      },
      {
        key: "furnishing",
        label: "Tiêu chuẩn bàn giao nội thất",
        placeholder: "VD: Full nội thất cao cấp mới 100%",
        presets: ["Full nội thất cao cấp", "Nội thất tiêu chuẩn", "Nội thất cơ bản"]
      }
    ]
  },
  apartment: {
    titleLabel: "Tên căn hộ thường / Căn hộ dịch vụ / Studio *",
    titlePlaceholder: "VD: Studio Ban Công Thoáng — Đi bộ 4 phút ra Mỹ Khê",
    bldgLabel: "Tên tòa căn hộ / Tuyến đường",
    bldgPlaceholder: "VD: Tòa An Thượng 2 / Đường Hoàng Kế Viêm",
    bldgPresets: ["Khu phố An Thượng", "Ven biển Mỹ Khê", "Phước Mỹ", "Sơn Trà"],
    sizeLabel: "Diện tích phòng (m²)",
    floorLabel: "Tầng số",
    defaultFloor: "4",
    hasLandArea: false,
    elecPresets: ["3,800đ/kWh", "4,000đ/kWh", "Giá nhà nước (EVN)"],
    tags: ["Gần biển", "Ban công", "Máy giặt riêng", "Dọn phòng tuần", "Wi-Fi miễn phí", "Bàn làm việc", "Thang máy", "Giờ giấc tự do", "Thú cưng"],
    attrs: [
      {
        key: "cleaningService",
        label: "Dịch vụ dọn phòng & thay ga",
        placeholder: "VD: Miễn phí dọn phòng 1 lần/tuần",
        presets: ["Miễn phí 1 lần/tuần", "Miễn phí 2 lần/tuần", "Tự túc"]
      },
      {
        key: "furnishing",
        label: "Nội thất & Thiết bị giặt sấy",
        placeholder: "VD: Full nội thất + Máy giặt riêng trong phòng",
        presets: ["Full nội thất + Máy giặt riêng", "Studio khép kín đầy đủ", "1PN tách bếp riêng"]
      },
      {
        key: "parking",
        label: "Chỗ để xe",
        placeholder: "VD: Tầng 1 để xe máy miễn phí, camera 24/7",
        presets: ["Tầng 1 xe máy miễn phí", "Đỗ ô tô trước nhà"]
      }
    ]
  },
  house: {
    titleLabel: "Tên nhà nguyên căn / Nhà phố *",
    titlePlaceholder: "VD: Nhà nguyên căn 3 tầng mới đẹp — Đảo VIP Hòa Xuân",
    bldgLabel: "Tên đường / Khu dân cư",
    bldgPlaceholder: "VD: Khu đảo VIP Hòa Xuân / Đường Đỗ Nhuận",
    bldgPresets: ["Khu Đảo VIP Hòa Xuân", "Nam Hòa Xuân", "Khu Nam Việt Á", "Khu Phố An Thượng"],
    sizeLabel: "Tổng DT sàn (m²)",
    floorLabel: "Số tầng nhà",
    defaultFloor: "3",
    hasLandArea: true,
    elecPresets: ["Giá nhà nước (EVN ~2,800đ/kWh)", "Công tơ điện EVN riêng"],
    tags: ["Nhà nguyên căn", "Chỗ đỗ ô tô", "Sân thượng", "Sân vườn", "Phù hợp mở VP", "Điện EVN", "Khu dân trí yên tĩnh", "Thú cưng"],
    attrs: [
      {
        key: "frontageRoad",
        label: "Đường / Kiệt trước nhà",
        placeholder: "VD: Đường 7.5m vỉa hè 4m đỗ ô tô thoải mái",
        presets: ["Đường 7.5m vỉa hè rộng", "Đường 5.5m ô tô tránh", "Kiệt ô tô 4m", "Kiệt xe máy 3m"]
      },
      {
        key: "furnishing",
        label: "Hiện trạng nội thất & Công năng",
        placeholder: "VD: Full nội thất gia đình / Vừa ở vừa mở văn phòng",
        presets: ["Full nội thất gia đình", "Nội thất cơ bản", "Phù hợp ở kết hợp VP", "Nhà trống"]
      },
      {
        key: "parking",
        label: "Sân đỗ xe / Gara",
        placeholder: "VD: Sân đỗ ô tô 7 chỗ trong nhà",
        presets: ["Sân đỗ ô tô trong nhà", "Đỗ ô tô trước cửa", "Sân để xe rộng"]
      }
    ]
  },
  villa: {
    titleLabel: "Tên Biệt thự / Pool Villa *",
    titlePlaceholder: "VD: Biệt thự Hồ bơi Muối khoáng 4PN — Khu Nam Việt Á",
    bldgLabel: "Khu biệt thự / Tuyến đường",
    bldgPlaceholder: "VD: Khu biệt thự Nam Việt Á / Euro Village",
    bldgPresets: ["Khu biệt thự Nam Việt Á", "Euro Village 1", "Euro Village 2", "Đảo Xanh", "Đảo VIP Hòa Xuân"],
    sizeLabel: "Tổng DT sàn (m²)",
    floorLabel: "Số tầng biệt thự",
    defaultFloor: "3",
    hasLandArea: true,
    elecPresets: ["Giá nhà nước (EVN ~2,800đ/kWh)", "Điện 3 pha EVN nhà nước"],
    tags: ["Biệt thự", "Hồ bơi riêng", "Sân vườn BBQ", "Chỗ đỗ ô tô", "An ninh 24/7", "Gần biển", "View sông Hàn", "Điện EVN", "Thú cưng"],
    attrs: [
      {
        key: "poolInfo",
        label: "Hồ bơi & Khuôn viên sân vườn",
        placeholder: "VD: Hồ bơi riêng muối khoáng + Sân vườn BBQ",
        presets: ["Hồ bơi riêng muối khoáng", "Hồ bơi riêng + Sân BBQ", "Bao vệ sinh hồ bơi tuần", "Biệt thự sân vườn"]
      },
      {
        key: "parking",
        label: "Gara ô tô & An ninh khu vực",
        placeholder: "VD: Gara 2 ô tô + Bảo vệ compound 24/7",
        presets: ["Gara riêng 2 ô tô", "Compound bảo vệ 24/7", "Đường 7.5m–10.5m đỗ xe"]
      },
      {
        key: "furnishing",
        label: "Tiêu chuẩn nội thất Villa",
        placeholder: "VD: Full nội thất nghỉ dưỡng gỗ tự nhiên",
        presets: ["Full nội thất nghỉ dưỡng", "Nội thất gỗ tự nhiên cao cấp", "Nội thất cơ bản"]
      }
    ]
  },
  penthouse: {
    titleLabel: "Tên Penthouse / Duplex / Sky Villa *",
    titlePlaceholder: "VD: Sky Penthouse Duplex 3PN — View Toàn cảnh Sông Hàn",
    bldgLabel: "Tòa tháp / Dự án hạng sang",
    bldgPlaceholder: "VD: The Filmore, Azura, Indochina, Blooming...",
    bldgPresets: ["The Filmore Da Nang", "The Panoma", "Azura", "Indochina Riverside", "Blooming Tower"],
    sizeLabel: "Tổng diện tích (m²)",
    floorLabel: "Tầng đỉnh (Floor)",
    defaultFloor: "25",
    hasLandArea: false,
    elecPresets: ["Giá nhà nước (EVN ~2,800đ/kWh)"],
    tags: ["Penthouse", "View sông Hàn", "Gần biển", "Hồ bơi vô cực", "Ban công panorama", "Bàn làm việc", "Gym", "Chỗ đỗ ô tô", "Thú cưng"],
    attrs: [
      {
        key: "furnishing",
        label: "Thiết kế kiến trúc & Bàn giao",
        placeholder: "VD: Duplex thông tầng kính tràn viền + Bếp đảo",
        presets: ["Duplex thông tầng kính tràn", "Penthouse sân vườn riêng", "Sảnh thang máy riêng"]
      },
      {
        key: "poolInfo",
        label: "Hồ bơi riêng / Sân thượng",
        placeholder: "VD: Sân thượng ngắm pháo hoa / Hồ bơi vô cực",
        presets: ["Hồ bơi riêng trên cao", "Terrace ngắm pháo hoa", "Hồ bơi vô cực tòa nhà"]
      },
      {
        key: "managementFee",
        label: "Phí quản lý & Đỗ xe VIP",
        placeholder: "VD: Đã bao gồm phí quản lý + Ô đỗ ô tô định danh",
        presets: ["Đã bao gồm phí quản lý", "Kèm ô đỗ ô tô hầm"]
      }
    ]
  }
};
const FALLBACK_IMG = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=70";

/* Crisp Minimalist Inline SVG Icons */
const Icon = {
  Chart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Key: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  Plus: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  ),
  External: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  ),
  Check: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Checklist: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="6" height="6" rx="1.5" />
      <path d="m4.5 8 1 1 2-2" />
      <path d="M13 8h8" />
      <rect x="3" y="14" width="6" height="6" rx="1.5" />
      <path d="M13 17h8" />
    </svg>
  ),
  Image: ({ size = 15 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-5-5L5 20" />
    </svg>
  ),
  Edit: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  Trash: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  ),
  Eye: ({ off = false }: { off?: boolean }) =>
    off ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.94" />
        <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19" />
        <path d="m1 1 22 22" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  Phone: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  Pin: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  PinTop: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1 1 1 0 0 1 1 1z" />
    </svg>
  ),
  Boost: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 7 7-1.4 1.4L13 6.8V21h-2V6.8l-4.6 4.6L5 10z" />
    </svg>
  ),
  Copy: ({ size = 13 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Category: ({ type, size = 14 }: { type: string; size?: number }) => {
    if (type === "condo") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2M10 22v-4h4v4" />
        </svg>
      );
    }
    if (type === "apartment") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
          <rect x="9" y="13" width="6" height="8" />
        </svg>
      );
    }
    if (type === "house") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12 12 3l10 9" />
          <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
          <path d="M10 21v-6h4v6" />
        </svg>
      );
    }
    if (type === "villa") {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 20h18" />
          <path d="M5 20v-8l7-5 7 5v8" />
          <path d="M2 23c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
        </svg>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15 9 22 9 16.5 13.5 18.5 21 12 16.8 5.5 21 7.5 13.5 2 9 9 9" />
      </svg>
    );
  }
};

function fmtVnd(n: number | undefined | null): string {
  const v = Number(n || 0);
  if (v >= 1_000_000) {
    const tr = v / 1_000_000;
    return `${tr % 1 === 0 ? tr.toFixed(0) : tr.toFixed(1).replace(".", ",")}tr ₫`;
  }
  return `${v.toLocaleString("vi-VN")} ₫`;
}

function titleOf(apt: Apartment): string {
  if (typeof apt.title === "string") return apt.title;
  return apt.title?.vi || apt.title?.en || apt.code;
}

function notesOf(apt: Apartment): string {
  if (typeof apt.architecturalNotes === "string") return apt.architecturalNotes;
  return apt.architecturalNotes?.vi || apt.architecturalNotes?.en || "";
}

function buildSeoSharePost(apt: Apartment): string {
  const siteOrigin = "https://www.kinestatesdanang.com";
  const canonicalUrl = `${siteOrigin}/apartments/${encodeURIComponent(apt.code)}`;
  const pt = apt.propertyType || "condo";
  const headlinePrefix =
    pt === "house"
      ? "🏡 CHO THUÊ NHÀ NGUYÊN CĂN ĐÀ NẴNG"
      : pt === "villa"
      ? "🌴 CHO THUÊ BIỆT THỰ / VILLA HỒ BƠI ĐÀ NẴNG"
      : pt === "penthouse"
      ? "✨ CHO THUÊ PENTHOUSE ĐÀ NẴNG"
      : pt === "apartment"
      ? "🏠 CHO THUÊ CĂN HỘ DỊCH VỤ ĐÀ NẴNG"
      : "🏢 CHO THUÊ CĂN HỘ CHUNG CƯ ĐÀ NẴNG";
  const vndNum = Number(apt.priceVnd || 0);
  const priceText =
    vndNum >= 1_000_000
      ? `${(vndNum / 1_000_000) % 1 === 0 ? (vndNum / 1_000_000).toFixed(0) : (vndNum / 1_000_000).toFixed(1).replace(".", ",")} triệu/tháng${apt.priceUsd ? ` (~$${apt.priceUsd})` : ""}`
      : `$${apt.priceUsd || 0}/tháng`;
  const isHouseOrVilla = pt === "house" || pt === "villa";
  const specs = [
    apt.bedrooms != null ? `${apt.bedrooms} phòng ngủ` : "",
    apt.bathrooms != null ? `${apt.bathrooms} WC` : "",
    apt.landAreaM2 ? `DT đất ${apt.landAreaM2}m²` : "",
    apt.sizeM2 != null ? `${isHouseOrVilla && apt.landAreaM2 ? "DT sàn " : ""}${apt.sizeM2}m²` : "",
    apt.floor != null ? (isHouseOrVilla ? `${apt.floor} tầng` : `Tầng ${apt.floor}`) : ""
  ]
    .filter(Boolean)
    .join(" · ");

  const extraLines = [
    apt.frontageRoad ? `🛣 Đường/Mặt tiền: ${apt.frontageRoad}` : "",
    apt.poolInfo ? `🏊 Hồ bơi & Sân vườn: ${apt.poolInfo}` : "",
    apt.furnishing ? `🛋 Nội thất: ${apt.furnishing}` : "",
    apt.cleaningService ? `🧹 Dịch vụ: ${apt.cleaningService}` : "",
    apt.managementFee ? `🏢 Phí quản lý: ${apt.managementFee}` : "",
    apt.parking ? `🚗 Đỗ xe: ${apt.parking}` : "",
    apt.electricityRate ? `⚡ Điện: ${apt.electricityRate}` : ""
  ].filter(Boolean);

  const notes = notesOf(apt).trim();

  return [
    `${headlinePrefix} — ${titleOf(apt)}`,
    `📍 Khu vực: ${apt.address || areaDisplayLabel(apt.areaName)}, Đà Nẵng`,
    `💰 Giá thuê trực tiếp: ${priceText}`,
    specs ? `📐 Thông số: ${specs}` : "",
    ...extraLines,
    notes ? `\n✨ Chi tiết: ${notes}` : "",
    "",
    `👉 Xem bộ ảnh thực tế, vị trí bản đồ & đặt lịch xem nhà tại Website chính thức:`,
    `🔗 ${canonicalUrl}`,
    `🌐 Kho căn hộ, nhà nguyên căn & biệt thự Đà Nẵng: ${siteOrigin}`,
    `📞 Hotline / Zalo / WhatsApp: 0389 711 601 (KIN Estates Đà Nẵng)`,
    `#ThueCanHoDaNang #ThueNhaDaNang #VillaDaNang #BatDongSanDaNang #DaNangApartment #KINEstates`
  ]
    .filter((l) => l !== "")
    .join("\n");
}

function buildNapBacklinkProfile(): string {
  return [
    "🏛️ HỒ SƠ THƯƠNG HIỆU ĐỒNG NHẤT (NAP) — DÙNG TẠO BACKLINK TOP 1 GOOGLE",
    "• Tên thương hiệu chuẩn: KIN Estates Đà Nẵng — Cho Thuê Căn Hộ, Nhà & Biệt Thự Đà Nẵng",
    "• Tên quốc tế: KIN Estates — Da Nang Apartments, Houses & Pool Villas",
    "• Website chính thức (Backlink gốc): https://www.kinestatesdanang.com",
    "• Trang căn hộ & biệt thự: https://www.kinestatesdanang.com/apartments",
    "• Trang 19 khu vực Đà Nẵng: https://www.kinestatesdanang.com/areas",
    "• Trang cẩm nang & giá thuê 2026: https://www.kinestatesdanang.com/guides",
    "• Sitemap nộp Google Search Console: https://www.kinestatesdanang.com/sitemap.xml",
    "• RSS Feed tự động: https://www.kinestatesdanang.com/rss.xml",
    "• Hotline / Zalo / WhatsApp: 0389 711 601 (+84 389 711 601)",
    "• Khu vực hoạt động: Toàn bộ 19 khu vực Thành phố Đà Nẵng, Việt Nam",
    "• Giới thiệu ngắn (Copy dán vào Bio Fanpage / Google Maps / YouTube / TikTok / LinkedIn / Medium / Batdongsan / Chợ Tốt):",
    "KIN Estates Đà Nẵng (https://www.kinestatesdanang.com) chuyên cho thuê dài hạn & tư vấn mua bán căn hộ chung cư (The Filmore, The Panoma, Hiyori, Monarchy), căn hộ dịch vụ gần biển Mỹ Khê - An Thượng, nhà nguyên căn và biệt thự hồ bơi tại 19 khu vực Đà Nẵng. Giá trực tiếp chủ nhà, dẫn xem nhà thực tế & hỗ trợ đăng ký tạm trú NA17. Liên hệ Zalo/WhatsApp: 0389 711 601."
  ].join("\n");
}

function normalizeAreaValue(raw?: string): string {
  const s = String(raw || "").trim();
  if (!s) return "Han Riverfront";
  const folded = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();
  if (folded.includes("hoa xuan")) return "Hòa Xuân";
  if (folded.includes("cam le")) return "Cẩm Lệ";
  if (folded.includes("nam viet a")) return "Nam Việt Á";
  if (folded.includes("fpt") || folded.includes("hoa hai")) return "FPT City / Hòa Hải";
  if (folded.includes("hoa khanh")) return "Hòa Khánh";
  if (folded.includes("lien chieu")) return "Liên Chiểu";
  if (folded.includes("thanh khe")) return "Thanh Khê";
  if (folded.includes("hoa vang")) return "Hòa Vang";
  if (folded.includes("ngu hanh son")) return "Ngũ Hành Sơn";
  if (folded.includes("phuoc my")) return "Phước Mỹ";
  if (folded.includes("khue my")) return "Khuê Mỹ";
  if (folded.includes("tho quang")) return "Thọ Quang";
  if (folded.includes("thuan phuoc")) return "Thuận Phước";
  if (folded.includes("my an")) return "Mỹ An";
  if (folded.includes("an thuong")) return "An Thuong";
  if (folded.includes("my khe")) return "My Khe Beachfront";
  if (folded.includes("son tra")) return "Son Tra";
  if (folded.includes("hai chau")) return "Hải Châu";
  if (folded.includes("han river") || folded.includes("song han")) return "Han Riverfront";
  return AREAS.some((a) => a.val === s) ? s : "Han Riverfront";
}

function areaDisplayLabel(raw?: string): string {
  const val = normalizeAreaValue(raw);
  return AREAS.find((a) => a.val === val)?.label || raw || "Đà Nẵng";
}

function statusLabelVi(status: string): string {
  switch (status) {
    case "New": return "Mới";
    case "Contacted": return "Đã liên hệ";
    case "Viewing_Scheduled": return "Đã hẹn xem";
    case "Pending": return "Chờ giữ chỗ";
    case "Confirmed": return "Đang giữ chỗ";
    case "Rented_Closed": return "Đã chốt thuê";
    case "Cancelled": return "Đã hủy";
    default: return status;
  }
}

function contactHref(handle?: string, messenger?: string): { href: string; label: string } | null {
  const raw = String(handle || "").trim();
  if (!raw || /^bấm liên hệ/i.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  const m = String(messenger || "").toLowerCase();
  if (raw.startsWith("@") || m.includes("telegram")) {
    const u = raw.replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "");
    if (u && !/^\d+$/.test(u)) return { href: `https://t.me/${u}`, label: `Telegram @${u}` };
  }
  if (m.includes("zalo") && digits.length >= 9) {
    return { href: `https://zalo.me/${digits}`, label: `Zalo ${raw}` };
  }
  if (m.includes("whatsapp") && digits.length >= 9) {
    const intl = digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
    return { href: `https://wa.me/${intl}`, label: `WhatsApp ${raw}` };
  }
  if (digits.length >= 8) {
    return { href: `tel:${raw.replace(/\s+/g, "")}`, label: `Gọi ${raw}` };
  }
  return { href: `https://t.me/${raw.replace(/^@/, "")}`, label: raw };
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function formatRelativeTimeVi(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin}p trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h trước`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}n trước`;
  return new Date(t).toLocaleDateString("vi-VN");
}

function buildLeadQuickActions(handle?: string, messenger?: string) {
  const raw = String(handle || "").trim();
  if (!raw || /^bấm liên hệ/i.test(raw)) return { clean: "", digits: "", tgHref: "", zaloHref: "", waHref: "", telHref: "" };
  const digits = raw.replace(/\D/g, "");
  const isPhone = digits.length >= 8 && digits.length <= 15;
  const intlDigits = digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
  const tgUser = raw.startsWith("@") || String(messenger || "").toLowerCase().includes("telegram")
    ? raw.replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "").trim()
    : "";
  return {
    clean: raw,
    digits,
    tgHref: tgUser && !/^\d+$/.test(tgUser) ? `https://t.me/${tgUser}` : "",
    zaloHref: isPhone ? `https://zalo.me/${digits}` : "",
    waHref: isPhone ? `https://wa.me/${intlDigits}` : "",
    telHref: isPhone ? `tel:${raw.replace(/\s+/g, "")}` : ""
  };
}

async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Ảnh không hợp lệ."));
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Không xử lý được ảnh."));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function StudioApp() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("kin_studio_token") || "");
  const [authed, setAuthed] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [passcode, setPasscode] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  const [tab, setTab] = useState<TabKey>("report");
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<string>("");

  // Apartments filters & multi-select
  const [aptSearch, setAptSearch] = useState<string>("");
  const [aptFilter, setAptFilter] = useState<string>("all");
  const [aptTypeFilter, setAptTypeFilter] = useState<string>("all");
  const [aptSort, setAptSort] = useState<"priority" | "slow" | "leads" | "newest" | "price-desc" | "price-asc">("priority");
  const [aptSelectMode, setAptSelectMode] = useState<boolean>(false);
  const [selectedApts, setSelectedApts] = useState<string[]>([]);
  const [bulkAptModalOpen, setBulkAptModalOpen] = useState<boolean>(false);
  const [bulkAptSaving, setBulkAptSaving] = useState<boolean>(false);
  const [resolvingMap, setResolvingMap] = useState<boolean>(false);
  const [pingingSeo, setPingingSeo] = useState<boolean>(false);
  const aboutHeroDirtyRef = useRef<boolean>(false);
  const [bulkAptForm, setBulkAptForm] = useState({
    pinAction: "",
    propertyType: "",
    status: "",
    visibility: "",
    areaName: "",
    priceMode: "",
    priceValue: ""
  });

  // Cloud Media Library modal (shared for standalone management or picking into apartment)
  const [mediaModalOpen, setMediaModalOpen] = useState<boolean>(false);
  const [mediaPickerMode, setMediaPickerMode] = useState<boolean>(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState<boolean>(false);
  const [photoUrlInput, setPhotoUrlInput] = useState<string>("");

  // About Us CMS (Tour Photos + Customer Feedback + Hero/Quote)
  const [aboutSubTab, setAboutSubTab] = useState<"photos" | "feedback" | "brand">("photos");
  const [uploadingAbout, setUploadingAbout] = useState<boolean>(false);
  const [tourPhotoModalOpen, setTourPhotoModalOpen] = useState<boolean>(false);
  const [editingTourPhotoId, setEditingTourPhotoId] = useState<string | null>(null);
  const [savingTourPhoto, setSavingTourPhoto] = useState<boolean>(false);
  const [tourPhotoForm, setTourPhotoForm] = useState({
    image: "",
    caption: "",
    tag: "Đà Nẵng · Dẫn khách xem nhà",
    date: new Date().toISOString().slice(0, 7)
  });

  const [fbModalOpen, setFbModalOpen] = useState<boolean>(false);
  const [editingFbId, setEditingFbId] = useState<string | null>(null);
  const [savingFb, setSavingFb] = useState<boolean>(false);
  const [fbForm, setFbForm] = useState({
    clientName: "",
    subtitle: "",
    rating: 5,
    avatar: "",
    quote: "",
    image: ""
  });

  const [aboutHeroForm, setAboutHeroForm] = useState({
    heroImage: "",
    founderName: "",
    founderQuote: ""
  });
  const [savingAboutBrand, setSavingAboutBrand] = useState<boolean>(false);

  // Leads filters, multi-select & CRUD modal
  const [leadSearch, setLeadSearch] = useState<string>("");
  const [leadSubTab, setLeadSubTab] = useState<"all" | "viewings" | "bookings">("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<"all" | "urgent" | "scheduled" | "contacted" | "closed">("all");
  const [leadAptFilter, setLeadAptFilter] = useState<string>("");
  const [leadSelectMode, setLeadSelectMode] = useState<boolean>(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [bulkLeadModalOpen, setBulkLeadModalOpen] = useState<boolean>(false);
  const [bulkLeadStatus, setBulkLeadStatus] = useState<string>("Contacted");
  const [leadModalOpen, setLeadModalOpen] = useState<boolean>(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [savingLead, setSavingLead] = useState<boolean>(false);
  const [leadForm, setLeadForm] = useState({
    clientName: "",
    contactHandle: "",
    messenger: "Zalo",
    apartmentCode: "CURATED-SHORTLIST",
    type: "viewing",
    status: "New",
    viewingTime: "",
    moveInDate: "",
    budgetUsd: "",
    bedrooms: "",
    notes: "",
    adminNotes: ""
  });

  // Leases filter & CRUD modal
  const [leaseSearch, setLeaseSearch] = useState<string>("");
  const [leaseModalOpen, setLeaseModalOpen] = useState<boolean>(false);
  const [editingLeaseCode, setEditingLeaseCode] = useState<string | null>(null);
  const [savingLease, setSavingLease] = useState<boolean>(false);
  const [leaseForm, setLeaseForm] = useState({
    apartmentCode: "",
    tenantName: "",
    tenantContact: "",
    messenger: "Zalo",
    priceVndTr: "20",
    priceUsd: "785",
    depositMonths: "1",
    paymentDay: "5",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    status: "Active",
    notes: ""
  });

  // Apartment Editor Sheet
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [savingApt, setSavingApt] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [form, setForm] = useState({
    propertyType: "condo",
    isPinned: false,
    title: "",
    building: "",
    areaName: "Han Riverfront",
    address: "",
    status: "Available",
    isVisible: true,
    priceVndTr: "18.5",
    priceUsd: "725",
    bedrooms: "2",
    bathrooms: "2",
    sizeM2: "70",
    landAreaM2: "",
    floor: "15",
    frontageRoad: "",
    furnishing: "",
    cleaningService: "",
    managementFee: "",
    parking: "",
    poolInfo: "",
    availableFrom: "",
    minLeaseMonths: "6",
    depositMonths: "1",
    electricityRate: "Giá nhà nước (EVN ~2,800đ/kWh)",
    waterRate: "Giá nhà nước",
    wifiIncluded: true,
    petPolicy: "Thương lượng (Cho phép thú cưng nhỏ)",
    landlordName: "",
    landlordPhone: "",
    adminNote: "",
    tags: ["View sông Hàn", "Bàn làm việc", "Điện EVN"] as string[],
    notes: "",
    images: [] as string[],
    lat: 16.0545,
    lng: 108.2345,
    hasPin: false
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<any>(null);
  const markerObjRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? "" : cur)), 2800);
  };

  const copyToClipboard = async (text: string, okMessage: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      showToast(okMessage);
    } catch {
      showToast("Không thể copy tự động trên thiết bị này.");
    }
  };

  const handlePingSearchEngines = async () => {
    if (pingingSeo) return;
    setPingingSeo(true);
    try {
      const r = await fetch("/api/studio/seo/ping", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" })
      });
      const data = await r.json();
      if (data.ok) {
        showToast(`✓ Đã bắn tín hiệu Index ${data.count || 160}+ trang lên Google WebSub, Bing, ChatGPT & Naver!`);
      } else {
        showToast("Đã gửi yêu cầu đồng bộ Sitemap & IndexNow.");
      }
    } catch {
      showToast("Không thể kết nối máy chủ SEO lúc này.");
    } finally {
      setPingingSeo(false);
    }
  };

  const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const h: Record<string, string> = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) h["X-Telegram-Init-Data"] = initData;
    return h;
  };

  const loadReport = async (overrideToken?: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const activeTok = overrideToken ?? token;
      if (activeTok) headers.Authorization = `Bearer ${activeTok}`;
      const initData = window.Telegram?.WebApp?.initData;
      if (initData) headers["X-Telegram-Init-Data"] = initData;

      const r = await fetch("/api/studio/report", { headers, cache: "no-store" });
      if (r.status === 403) {
        setAuthed(false);
        return false;
      }
      const data = await r.json();
      if (data.ok) {
        setReport(data);
        if (data.aboutContent && !aboutHeroDirtyRef.current) {
          const fq = data.aboutContent.founderQuote;
          setAboutHeroForm({
            heroImage: data.aboutContent.heroImage || "",
            founderName: data.aboutContent.founderName || "",
            founderQuote: typeof fq === "string" ? fq : fq?.vi || fq?.en || ""
          });
        }
        setAuthed(true);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMediaLibrary = async () => {
    setMediaLoading(true);
    try {
      const r = await fetch("/api/studio/media", { headers: authHeaders(), cache: "no-store" });
      const j = await r.json();
      if (j.ok) setMediaItems(j.items || []);
    } catch {
      showToast("Không tải được kho ảnh Cloud.");
    } finally {
      setMediaLoading(false);
    }
  };

  const openMediaLibrary = async (picker = false) => {
    setMediaPickerMode(picker);
    setMediaModalOpen(true);
    await loadMediaLibrary();
  };

  // Auth Bootstrap
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
    tg?.setHeaderColor?.("#12171D");

    (async () => {
      try {
        if (tg?.initData) {
          const r = await fetch("/api/studio/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData })
          });
          const j = await r.json();
          if (j.ok && j.token) {
            localStorage.setItem("kin_studio_token", j.token);
            setToken(j.token);
            await loadReport(j.token);
            setCheckingAuth(false);
            return;
          }
        }
        if (token) {
          const ok = await loadReport(token);
          if (ok) {
            setCheckingAuth(false);
            return;
          }
        }
        const loc = await fetch("/api/studio/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        });
        const locJson = await loc.json();
        if (locJson.ok && locJson.token) {
          localStorage.setItem("kin_studio_token", locJson.token);
          setToken(locJson.token);
          await loadReport(locJson.token);
        }
      } catch {
        // fallback to passcode screen
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  // Leaflet Map Picker inside Apartment Editor
  useEffect(() => {
    if (!editorOpen || !mapContainerRef.current || !window.L) return;
    const timer = window.setTimeout(() => {
      const L = window.L;
      if (!mapContainerRef.current) return;
      if (mapObjRef.current) {
        mapObjRef.current.remove();
        mapObjRef.current = null;
      }
      const startLat = Number.isFinite(form.lat) ? form.lat : 16.0545;
      const startLng = Number.isFinite(form.lng) ? form.lng : 108.2345;
      const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView(
        [startLat, startLng],
        form.hasPin ? 16 : 13
      );
      L.tileLayer("https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}", { maxZoom: 19 }).addTo(map);
      const marker = L.marker([startLat, startLng], { draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setForm((prev) => ({ ...prev, lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)), hasPin: true }));
      });
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setForm((prev) => ({ ...prev, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), hasPin: true }));
      });
      mapObjRef.current = map;
      markerObjRef.current = marker;
      setTimeout(() => map.invalidateSize(true), 120);
    }, 120);
    return () => {
      window.clearTimeout(timer);
      if (mapObjRef.current) {
        mapObjRef.current.remove();
        mapObjRef.current = null;
      }
    };
  }, [editorOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const r = await fetch("/api/studio/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode })
    });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      setAuthError(j.error || "Sai mã khóa quản trị.");
      return;
    }
    localStorage.setItem("kin_studio_token", j.token);
    setToken(j.token);
    await loadReport(j.token);
  };

  /* ======================= APARTMENTS CRUD ======================= */
  const resolveMapLinkIntoForm = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;
    setResolvingMap(true);
    try {
      const r = await fetch("/api/studio/resolve-map", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ input: trimmed })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        showToast(j.error || "Chưa nhận diện được link bản đồ này.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        ...(j.address ? { address: j.address } : {}),
        ...(j.areaName ? { areaName: normalizeAreaValue(j.areaName) } : {}),
        ...(j.coordinates
          ? { lat: Number(j.coordinates.lat), lng: Number(j.coordinates.lng), hasPin: true }
          : {})
      }));
      if (j.coordinates) {
        markerObjRef.current?.setLatLng([j.coordinates.lat, j.coordinates.lng]);
        mapObjRef.current?.setView([j.coordinates.lat, j.coordinates.lng], 16);
      }
      showToast("✓ Đã tự nhận địa chỉ chính xác & ghim bản đồ!");
    } catch {
      showToast("Không kết nối được bộ giải mã bản đồ.");
    } finally {
      setResolvingMap(false);
    }
  };

  // Automatic real-time silent background sync (zero manual sync button needed)
  useEffect(() => {
    if (!authed) return;
    const syncSilently = () => {
      if (document.visibilityState === "hidden") return;
      void loadReport(undefined, true);
    };
    const interval = window.setInterval(syncSilently, 18_000);
    window.addEventListener("focus", syncSilently);
    document.addEventListener("visibilitychange", syncSilently);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", syncSilently);
      document.removeEventListener("visibilitychange", syncSilently);
    };
  }, [authed, token]);

  const openCreateEditor = (defaultType = "condo") => {
    const cfg = CATEGORY_CONFIG[defaultType] || CATEGORY_CONFIG.condo;
    setEditingCode(null);
    setPhotoUrlInput("");
    setForm({
      propertyType: defaultType,
      isPinned: false,
      title: "",
      building: "",
      areaName: "Han Riverfront",
      address: "",
      status: "Available",
      isVisible: true,
      priceVndTr: defaultType === "villa" ? "45" : defaultType === "apartment" ? "9.5" : "18",
      priceUsd: String(Math.round((defaultType === "villa" ? 45_000_000 : defaultType === "apartment" ? 9_500_000 : 18_000_000) / RATE_VND)),
      bedrooms: defaultType === "villa" || defaultType === "house" ? "3" : defaultType === "apartment" ? "1" : "2",
      bathrooms: defaultType === "villa" || defaultType === "house" ? "3" : defaultType === "apartment" ? "1" : "2",
      sizeM2: defaultType === "villa" ? "260" : defaultType === "house" ? "180" : defaultType === "apartment" ? "45" : "70",
      landAreaM2: defaultType === "villa" ? "200" : defaultType === "house" ? "90" : "",
      floor: cfg.defaultFloor,
      frontageRoad: "",
      furnishing: "",
      cleaningService: "",
      managementFee: "",
      parking: "",
      poolInfo: "",
      availableFrom: "",
      minLeaseMonths: defaultType === "house" || defaultType === "villa" ? "12" : "6",
      depositMonths: defaultType === "house" || defaultType === "villa" ? "2" : "1",
      electricityRate: cfg.elecPresets[0] || "Giá nhà nước (EVN ~2,800đ/kWh)",
      waterRate: "Giá nhà nước",
      wifiIncluded: true,
      petPolicy: "Thương lượng (Cho phép thú cưng nhỏ)",
      landlordName: "",
      landlordPhone: "",
      adminNote: "",
      tags: cfg.tags.slice(0, 3),
      notes: "",
      images: [],
      lat: 16.0545,
      lng: 108.2345,
      hasPin: false
    });
    setEditorOpen(true);
  };

  const openEditEditor = (apt: Apartment) => {
    setEditingCode(apt.code);
    setPhotoUrlInput("");
    const vndTr = apt.priceVnd ? (apt.priceVnd / 1_000_000).toFixed(1).replace(/\.0$/, "") : "";
    const initAddr = apt.address || "";
    setForm({
      propertyType: apt.propertyType || "condo",
      isPinned: Boolean(apt.isPinned),
      title: titleOf(apt),
      building: apt.building || "",
      areaName: normalizeAreaValue(apt.areaName),
      address: initAddr,
      status: apt.status || "Available",
      isVisible: apt.isVisible !== false && apt.status !== "Hidden",
      priceVndTr: vndTr,
      priceUsd: String(apt.priceUsd || ""),
      bedrooms: String(apt.bedrooms ?? 1),
      bathrooms: String(apt.bathrooms ?? 1),
      sizeM2: String(apt.sizeM2 ?? 60),
      landAreaM2: apt.landAreaM2 ? String(apt.landAreaM2) : "",
      floor: String(apt.floor ?? 1),
      frontageRoad: apt.frontageRoad || "",
      furnishing: apt.furnishing || "",
      cleaningService: apt.cleaningService || "",
      managementFee: apt.managementFee || "",
      parking: apt.parking || "",
      poolInfo: apt.poolInfo || "",
      availableFrom: apt.availableFrom || "",
      minLeaseMonths: String(apt.minLeaseMonths ?? 6),
      depositMonths: String(apt.depositMonths ?? 1),
      electricityRate: apt.electricityRate || "",
      waterRate: apt.waterRate || "",
      wifiIncluded: apt.wifiIncluded !== false,
      petPolicy: apt.petPolicy || "",
      landlordName: apt.landlordName || "",
      landlordPhone: apt.landlordPhone || "",
      adminNote: apt.adminNote || "",
      tags: Array.isArray(apt.tags) ? apt.tags : [],
      notes: notesOf(apt),
      images: Array.isArray(apt.images) ? apt.images : [],
      lat: apt.coordinates?.lat ?? 16.0545,
      lng: apt.coordinates?.lng ?? 108.2345,
      hasPin: Boolean(apt.coordinates && apt.locationAccuracy === "exact")
    });
    setEditorOpen(true);
    // If existing apartment has a raw Google Maps URL stuck in address, auto-resolve it immediately on open!
    if (/^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl|(?:www\.|maps\.)?google\.)/i.test(initAddr.trim())) {
      setTimeout(() => void resolveMapLinkIntoForm(initAddr), 200);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, addToLibraryOnly = false) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingPhoto(true);
    try {
      const uploaded: string[] = [];
      for (const file of files.slice(0, 12)) {
        const dataUrl = await compressImageToDataUrl(file);
        const r = await fetch("/api/studio/upload-photo", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ dataUrl })
        });
        const j = await r.json();
        if (j.ok && j.url) uploaded.push(j.url);
      }
      if (uploaded.length) {
        if (!addToLibraryOnly) {
          setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
        } else {
          await loadMediaLibrary();
        }
        showToast(`Đã tải lên ${uploaded.length} ảnh lên Cloud!`);
      }
    } catch {
      showToast("Có lỗi khi tải ảnh, thử lại nhé.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= form.images.length) return;
    const copy = [...form.images];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setForm((p) => ({ ...p, images: copy }));
  };

  const handleSaveApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return showToast("Vui lòng nhập tên căn hộ.");
    setSavingApt(true);
    try {
      const vnd = Math.round(parseFloat(form.priceVndTr.replace(",", ".")) * 1_000_000) || 0;
      const usd = parseInt(form.priceUsd, 10) || Math.round(vnd / RATE_VND);
      const landM2 = parseFloat(String(form.landAreaM2 || "").replace(",", "."));
      const payload: any = {
        propertyType: form.propertyType || "condo",
        isPinned: form.status === "Rented" ? false : Boolean(form.isPinned),
        title: form.title.trim(),
        building: form.building.trim() || "KIN Estates Residence",
        areaName: form.areaName,
        address: form.address.trim(),
        status: form.status,
        isVisible: form.status === "Hidden" ? false : form.isVisible,
        priceVnd: vnd || Math.round(usd * RATE_VND),
        priceUsd: usd || Math.round(vnd / RATE_VND),
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 1,
        sizeM2: Number(form.sizeM2) || 60,
        landAreaM2: Number.isFinite(landM2) && landM2 > 0 ? landM2 : null,
        floor: Number(form.floor) || 1,
        frontageRoad: form.frontageRoad.trim(),
        furnishing: form.furnishing.trim(),
        cleaningService: form.cleaningService.trim(),
        managementFee: form.managementFee.trim(),
        parking: form.parking.trim(),
        poolInfo: form.poolInfo.trim(),
        availableFrom: form.availableFrom || null,
        minLeaseMonths: Number(form.minLeaseMonths) || 6,
        depositMonths: Number(form.depositMonths) || 1,
        electricityRate: form.electricityRate.trim(),
        waterRate: form.waterRate.trim(),
        wifiIncluded: form.wifiIncluded,
        petPolicy: form.petPolicy.trim(),
        landlordName: form.landlordName.trim(),
        landlordPhone: form.landlordPhone.trim(),
        adminNote: form.adminNote.trim(),
        tags: form.tags,
        architecturalNotes: form.notes.trim(),
        images: form.images,
        ...(form.hasPin ? { locationAccuracy: "exact", coordinates: { lat: form.lat, lng: form.lng } } : {})
      };
      const url = editingCode ? `/api/apartments/${encodeURIComponent(editingCode)}` : "/api/apartments";
      const method = editingCode ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Không lưu được");
      setEditorOpen(false);
      showToast(editingCode ? "Đã lưu & đồng bộ ngay lên Web!" : "Đã đăng BĐS mới lên Web!");
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingApt(false);
    }
  };

  const quickPatchApt = async (apt: Apartment, updates: Record<string, any>, msg: string) => {
    const r = await fetch(`/api/apartments/${encodeURIComponent(apt.code)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates)
    });
    if (r.ok) {
      showToast(msg);
      await loadReport();
    }
  };

  const handleDeleteApt = async (code: string) => {
    if (!window.confirm(`Xóa vĩnh viễn căn hộ ${code}?`)) return;
    const r = await fetch(`/api/apartments/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setEditorOpen(false);
      showToast(`Đã xóa căn ${code}`);
      await loadReport();
    } else {
      showToast(j.error || "Không thể xóa căn hộ này.");
    }
  };

  const toggleSelectApt = (code: string) => {
    setSelectedApts((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleBulkUpdateApts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApts.length) return;
    const updates: Record<string, any> = {};
    if (bulkAptForm.pinAction === "pin") updates.isPinned = true;
    if (bulkAptForm.pinAction === "unpin") updates.isPinned = false;
    if (bulkAptForm.pinAction === "boost") updates.boostNow = true;
    if (bulkAptForm.propertyType) updates.propertyType = bulkAptForm.propertyType;
    if (bulkAptForm.status) updates.status = bulkAptForm.status;
    if (bulkAptForm.visibility === "show") updates.isVisible = true;
    if (bulkAptForm.visibility === "hide") updates.isVisible = false;
    if (bulkAptForm.areaName) updates.areaName = bulkAptForm.areaName;
    if (bulkAptForm.priceMode && bulkAptForm.priceValue.trim() !== "") {
      const val = parseFloat(bulkAptForm.priceValue.replace(",", "."));
      if (Number.isFinite(val)) {
        updates.priceMode = bulkAptForm.priceMode;
        if (bulkAptForm.priceMode === "fixed") updates.priceVnd = Math.round(val * 1_000_000);
        if (bulkAptForm.priceMode === "percent") updates.priceAdjustPercent = val;
        if (bulkAptForm.priceMode === "delta") updates.priceAdjustVnd = Math.round(val * 1_000_000);
      }
    }
    if (!Object.keys(updates).length) {
      return showToast("Hãy chọn ít nhất 1 mục cần cập nhật.");
    }
    setBulkAptSaving(true);
    try {
      const r = await fetch("/api/studio/apartments/bulk", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "update", codes: selectedApts, updates })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Cập nhật hàng loạt thất bại.");
      setBulkAptModalOpen(false);
      setSelectedApts([]);
      setAptSelectMode(false);
      showToast(`Đã cập nhật ${j.count} căn hộ thành công!`);
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setBulkAptSaving(false);
    }
  };

  const handleBulkDeleteApts = async () => {
    if (!selectedApts.length) return;
    if (!window.confirm(`Xóa vĩnh viễn ${selectedApts.length} căn hộ đã chọn? Thao tác không thể hoàn tác.`)) return;
    const r = await fetch("/api/studio/apartments/bulk", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "delete", codes: selectedApts })
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      setSelectedApts([]);
      setAptSelectMode(false);
      const failNote = j.failed?.length ? ` (${j.failed.length} căn đang giữ chỗ)` : "";
      showToast(`Đã xóa ${j.count} căn hộ${failNote}`);
      await loadReport();
    } else {
      showToast(j.error || "Không thể xóa hàng loạt.");
    }
  };

  const handleDeleteMedia = async (item: MediaItem) => {
    const warn = item.usedBy.length
      ? `Ảnh này đang gắn trên ${item.usedBy.length} căn hộ. Xóa sẽ gỡ ảnh khỏi căn đó và xóa vĩnh viễn trên Cloud?`
      : "Xóa vĩnh viễn ảnh này khỏi kho Cloud?";
    if (!window.confirm(warn)) return;
    const r = await fetch(`/api/studio/media/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (r.ok) {
      setForm((p) => ({ ...p, images: p.images.filter((u) => u !== item.url) }));
      showToast("Đã xóa ảnh khỏi Cloud.");
      await Promise.all([loadMediaLibrary(), loadReport()]);
    }
  };

  /* ======================= CUSTOMERS / LEADS CRUD ======================= */
  const openCreateLead = () => {
    setEditingLeadId(null);
    setLeadForm({
      clientName: "",
      contactHandle: "",
      messenger: "Zalo",
      apartmentCode: report?.apartments?.[0]?.code || "CURATED-SHORTLIST",
      type: "viewing",
      status: "New",
      viewingTime: "",
      moveInDate: "",
      budgetUsd: "",
      bedrooms: "",
      notes: "",
      adminNotes: ""
    });
    setLeadModalOpen(true);
  };

  const openEditLead = (inq: Inquiry) => {
    setEditingLeadId(inq.code || inq._id);
    setLeadForm({
      clientName: inq.clientName || "",
      contactHandle: inq.contactHandle || "",
      messenger: inq.messenger || "Zalo",
      apartmentCode: inq.apartmentCode || "CURATED-SHORTLIST",
      type: ["reservation", "booking"].includes(inq.type) ? "reservation" : "viewing",
      status: inq.status || "New",
      viewingTime: inq.viewingTime ? inq.viewingTime.replace(" ", "T").slice(0, 16) : "",
      moveInDate: inq.moveInDate || "",
      budgetUsd: inq.budgetUsd || "",
      bedrooms: inq.bedrooms || "",
      notes: inq.notes || "",
      adminNotes: inq.adminNotes || ""
    });
    setLeadModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.clientName.trim()) return showToast("Nhập tên khách hàng.");
    setSavingLead(true);
    try {
      const payload = {
        ...leadForm,
        viewingTime: leadForm.viewingTime ? leadForm.viewingTime.replace("T", " ") : ""
      };
      const url = editingLeadId
        ? `/api/inquiries/${encodeURIComponent(editingLeadId)}`
        : "/api/studio/inquiries";
      const method = editingLeadId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Không lưu được thông tin khách.");
      setLeadModalOpen(false);
      showToast(editingLeadId ? "Đã cập nhật khách hàng!" : "Đã thêm khách hàng mới!");
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingLead(false);
    }
  };

  const updateLeadStatus = async (inq: Inquiry, updates: Record<string, any>, msg: string) => {
    const r = await fetch(`/api/inquiries/${encodeURIComponent(inq.code || inq._id)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates)
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return showToast(j.error || "Không cập nhật được");
    showToast(msg);
    await loadReport();
  };

  const handleReservationAction = async (inq: Inquiry, action: "confirm" | "cancel") => {
    const r = await fetch(`/api/studio/reservations/${encodeURIComponent(inq.code || inq._id)}/${action}`, {
      method: "POST",
      headers: authHeaders()
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return showToast(j.error || "Thao tác thất bại");
    showToast(action === "confirm" ? "Đã xác nhận giữ chỗ!" : "Đã hủy giữ chỗ & mở trống căn!");
    await loadReport();
  };

  const handleDeleteLead = async (inq: Inquiry) => {
    if (!window.confirm(`Xóa khách hàng ${inq.clientName}?`)) return;
    const r = await fetch(`/api/inquiries/${encodeURIComponent(inq.code || inq._id)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      setLeadModalOpen(false);
      showToast("Đã xóa khách hàng.");
      await loadReport();
    } else {
      showToast(j.error || "Không xóa được.");
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleBulkUpdateLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeads.length) return;
    const r = await fetch("/api/studio/inquiries/bulk", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "update", ids: selectedLeads, updates: { status: bulkLeadStatus } })
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      setBulkLeadModalOpen(false);
      setSelectedLeads([]);
      setLeadSelectMode(false);
      showToast(`Đã cập nhật ${j.count} khách hàng!`);
      await loadReport();
    } else {
      showToast(j.error || "Cập nhật thất bại.");
    }
  };

  const handleBulkDeleteLeads = async () => {
    if (!selectedLeads.length) return;
    if (!window.confirm(`Xóa ${selectedLeads.length} khách hàng đã chọn?`)) return;
    const r = await fetch("/api/studio/inquiries/bulk", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action: "delete", ids: selectedLeads })
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      setSelectedLeads([]);
      setLeadSelectMode(false);
      showToast(`Đã xóa ${j.count} khách hàng.`);
      await loadReport();
    } else {
      showToast(j.error || "Không xóa được.");
    }
  };

  /* ======================= LEASES CRUD ======================= */
  const openCreateLease = (inq?: Inquiry) => {
    setEditingLeaseCode(null);
    const firstAvail = report?.apartments.find((a) => a.status === "Available") || report?.apartments[0];
    const targetApt = inq?.apartmentCode
      ? report?.apartments.find((a) => a.code === inq.apartmentCode)
      : firstAvail;
    const vndTr = targetApt?.priceVnd
      ? (targetApt.priceVnd / 1_000_000).toFixed(1).replace(/\.0$/, "")
      : "20";
    setLeaseForm({
      apartmentCode: targetApt?.code || inq?.apartmentCode || "",
      tenantName: inq?.clientName || "",
      tenantContact: inq?.contactHandle || "",
      messenger: inq?.messenger || "Zalo",
      priceVndTr: vndTr,
      priceUsd: String(targetApt?.priceUsd || Math.round(20_000_000 / RATE_VND)),
      depositMonths: String(targetApt?.depositMonths || 1),
      paymentDay: "5",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      status: "Active",
      notes: inq ? `Chốt thuê từ yêu cầu ${inq.code}` : ""
    });
    setLeaseModalOpen(true);
  };

  const openEditLease = (l: Lease) => {
    setEditingLeaseCode(l.code);
    const vnd = l.priceVnd || Math.round((l.priceUsd || 0) * RATE_VND);
    setLeaseForm({
      apartmentCode: l.apartmentCode || "",
      tenantName: l.tenantName || "",
      tenantContact: l.tenantContact || "",
      messenger: l.messenger || "Zalo",
      priceVndTr: vnd ? (vnd / 1_000_000).toFixed(1).replace(/\.0$/, "") : "",
      priceUsd: String(l.priceUsd || ""),
      depositMonths: String(l.depositMonths || 1),
      paymentDay: String(l.paymentDay || 5),
      startDate: l.startDate || "",
      endDate: l.endDate || "",
      status: l.status || "Active",
      notes: l.notes || ""
    });
    setLeaseModalOpen(true);
  };

  const handleSaveLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaseForm.apartmentCode || !leaseForm.tenantName.trim()) {
      return showToast("Nhập mã căn và tên khách thuê.");
    }
    setSavingLease(true);
    try {
      const vnd = Math.round(parseFloat(leaseForm.priceVndTr.replace(",", ".")) * 1_000_000) || 0;
      const usd = parseInt(leaseForm.priceUsd, 10) || Math.round(vnd / RATE_VND);
      const payload = {
        apartmentCode: leaseForm.apartmentCode,
        tenantName: leaseForm.tenantName.trim(),
        tenantContact: leaseForm.tenantContact.trim(),
        messenger: leaseForm.messenger,
        priceVnd: vnd || Math.round(usd * RATE_VND),
        priceUsd: usd || Math.round(vnd / RATE_VND),
        depositMonths: Number(leaseForm.depositMonths) || 1,
        paymentDay: Number(leaseForm.paymentDay) || 5,
        startDate: leaseForm.startDate,
        endDate: leaseForm.endDate,
        status: leaseForm.status,
        notes: leaseForm.notes.trim()
      };
      const url = editingLeaseCode ? `/api/leases/${encodeURIComponent(editingLeaseCode)}` : "/api/leases";
      const method = editingLeaseCode ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Không lưu được hợp đồng");
      setLeaseModalOpen(false);
      showToast(editingLeaseCode ? "Đã cập nhật hợp đồng!" : "Đã tạo hợp đồng & chuyển căn sang Đã thuê!");
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingLease(false);
    }
  };

  const handleCheckoutLease = async (lease: Lease) => {
    if (!window.confirm(`Xác nhận khách ${lease.tenantName} trả phòng ${lease.apartmentCode} và mở trống lại căn hộ?`)) return;
    const r = await fetch(`/api/leases/${encodeURIComponent(lease.code)}/checkout`, {
      method: "POST",
      headers: authHeaders()
    });
    if (r.ok) {
      showToast(`Đã trả phòng & mở trống căn ${lease.apartmentCode}!`);
      await loadReport();
    }
  };

  const handleDeleteLease = async (lease: Lease) => {
    if (!window.confirm(`Xóa vĩnh viễn hợp đồng ${lease.code} của ${lease.tenantName}?`)) return;
    const r = await fetch(`/api/leases/${encodeURIComponent(lease.code)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (r.ok) {
      setLeaseModalOpen(false);
      showToast(`Đã xóa hợp đồng ${lease.code}`);
      await loadReport();
    }
  };

  /* ======================= ABOUT US CRUD (TOUR PHOTOS, FEEDBACK, BRAND) ======================= */
  const viText = (val?: Record<string, string> | string) => {
    if (!val) return "";
    return typeof val === "string" ? val : val.vi || val.en || "";
  };

  const uploadSingleImage = async (file: File): Promise<string | null> => {
    const dataUrl = await compressImageToDataUrl(file);
    const r = await fetch("/api/studio/upload-photo", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ dataUrl })
    });
    const j = await r.json();
    return j.ok && j.url ? j.url : null;
  };

  const handleQuickUploadTourPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingAbout(true);
    try {
      const urls: string[] = [];
      for (const file of files.slice(0, 10)) {
        const u = await uploadSingleImage(file);
        if (u) urls.push(u);
      }
      if (urls.length) {
        const r = await fetch("/api/studio/about/photos", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ images: urls, tag: "Đà Nẵng · Dẫn khách xem nhà" })
        });
        const j = await r.json();
        if (r.ok && j.ok) {
          showToast(`Đã đăng ${urls.length} ảnh dẫn khách lên trang About!`);
          await loadReport();
        }
      }
    } catch {
      showToast("Có lỗi khi tải ảnh, thử lại nhé.");
    } finally {
      setUploadingAbout(false);
      e.target.value = "";
    }
  };

  const openEditTourPhoto = (item?: AboutTourPhoto) => {
    if (item) {
      setEditingTourPhotoId(item.id);
      setTourPhotoForm({
        image: item.image || "",
        caption: viText(item.caption),
        tag: item.tag || "Đà Nẵng · Dẫn khách xem nhà",
        date: item.date || new Date().toISOString().slice(0, 7)
      });
    } else {
      setEditingTourPhotoId(null);
      setTourPhotoForm({
        image: "",
        caption: "",
        tag: "Đà Nẵng · Dẫn khách xem nhà",
        date: new Date().toISOString().slice(0, 7)
      });
    }
    setTourPhotoModalOpen(true);
  };

  const handleSaveTourPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tourPhotoForm.image.trim()) return showToast("Hãy tải ảnh hoặc nhập link ảnh.");
    setSavingTourPhoto(true);
    try {
      const url = editingTourPhotoId
        ? `/api/studio/about/photos/${encodeURIComponent(editingTourPhotoId)}`
        : "/api/studio/about/photos";
      const method = editingTourPhotoId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(tourPhotoForm)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Không lưu được ảnh.");
      setTourPhotoModalOpen(false);
      showToast(editingTourPhotoId ? "Đã cập nhật ảnh & dịch 6 ngôn ngữ!" : "Đã thêm ảnh dẫn khách lên trang About!");
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingTourPhoto(false);
    }
  };

  const handleMoveTourPhoto = async (id: string, move: "left" | "right") => {
    const r = await fetch(`/api/studio/about/photos/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ move })
    });
    if (r.ok) await loadReport();
  };

  const handleDeleteTourPhoto = async (id: string) => {
    if (!window.confirm("Xóa ảnh này khỏi trang About?")) return;
    const r = await fetch(`/api/studio/about/photos/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (r.ok) {
      showToast("Đã xóa ảnh khỏi trang About.");
      await loadReport();
    }
  };

  const openFeedbackModal = (item?: AboutTestimonial) => {
    if (item) {
      setEditingFbId(item.id);
      setFbForm({
        clientName: item.clientName || "",
        subtitle: item.subtitle || "",
        rating: item.rating || 5,
        avatar: item.avatar || "",
        quote: viText(item.quote),
        image: item.image || ""
      });
    } else {
      setEditingFbId(null);
      setFbForm({
        clientName: "",
        subtitle: "",
        rating: 5,
        avatar: "",
        quote: "",
        image: ""
      });
    }
    setFbModalOpen(true);
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbForm.clientName.trim()) return showToast("Nhập tên khách hàng.");
    if (!fbForm.quote.trim() && !fbForm.image.trim()) return showToast("Nhập nhận xét hoặc tải ảnh feedback.");
    setSavingFb(true);
    try {
      const url = editingFbId
        ? `/api/studio/about/testimonials/${encodeURIComponent(editingFbId)}`
        : "/api/studio/about/testimonials";
      const method = editingFbId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(fbForm)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Không lưu được feedback.");
      setFbModalOpen(false);
      showToast(editingFbId ? "Đã cập nhật feedback & dịch 6 ngôn ngữ!" : "Đã đăng feedback lên trang About!");
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingFb(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Xóa feedback này khỏi trang About?")) return;
    const r = await fetch(`/api/studio/about/testimonials/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (r.ok) {
      showToast("Đã xóa feedback.");
      await loadReport();
    }
  };

  const handleSaveAboutBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAboutBrand(true);
    try {
      const r = await fetch("/api/studio/about", {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(aboutHeroForm)
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Không lưu được.");
      aboutHeroDirtyRef.current = false;
      showToast("Đã cập nhật ảnh bìa & trích dẫn trang About!");
      await loadReport();
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setSavingAboutBrand(false);
    }
  };

  /* ======================= FILTERED LISTS ======================= */
  const filteredApartments = useMemo(() => {
    const list = report?.apartments || [];
    const q = aptSearch.trim().toLowerCase();
    const matched = list.filter((a) => {
      const hidden = a.isVisible === false || a.status === "Hidden";
      if (aptTypeFilter !== "all" && (a.propertyType || "condo") !== aptTypeFilter) return false;
      if (aptFilter === "pinned" && (!a.isPinned || hidden || a.status === "Rented")) return false;
      if (aptFilter === "available" && (hidden || a.status !== "Available")) return false;
      if (aptFilter === "reserved" && a.status !== "Reserved") return false;
      if (aptFilter === "rented" && a.status !== "Rented") return false;
      if (aptFilter === "hidden" && !hidden) return false;
      if (!q) return true;
      return [a.code, titleOf(a), a.building, a.address, a.areaName, areaDisplayLabel(a.areaName), getAptCategoryLabel(a.propertyType), a.landlordName, a.landlordPhone].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
    const ts = (v?: string | null) => {
      if (!v) return 0;
      const n = new Date(v).getTime();
      return Number.isFinite(n) ? n : 0;
    };
    const copy = [...matched];
    if (aptSort === "price-desc") {
      copy.sort((a, b) => Number(b.priceVnd || 0) - Number(a.priceVnd || 0));
    } else if (aptSort === "price-asc") {
      copy.sort((a, b) => Number(a.priceVnd || 0) - Number(b.priceVnd || 0));
    } else if (aptSort === "leads") {
      copy.sort((a, b) => (b.contactSummary?.people || 0) - (a.contactSummary?.people || 0));
    } else if (aptSort === "newest") {
      copy.sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
    } else if (aptSort === "slow") {
      copy.sort((a, b) => {
        const aAvail = a.status === "Available" && a.isVisible !== false ? 0 : 1;
        const bAvail = b.status === "Available" && b.isVisible !== false ? 0 : 1;
        if (aAvail !== bAvail) return aAvail - bAvail;
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? 1 : -1;
        const aLeads = a.contactSummary?.people || 0;
        const bLeads = b.contactSummary?.people || 0;
        if (aLeads !== bLeads) return aLeads - bLeads;
        return (b.daysSinceBoost || 0) - (a.daysSinceBoost || 0);
      });
    } else {
      copy.sort((a, b) => {
        const sRank = (x: Apartment) => (x.isVisible === false || x.status === "Hidden" ? 3 : x.status === "Available" ? 0 : x.status === "Reserved" ? 1 : 2);
        const rDiff = sRank(a) - sRank(b);
        if (rDiff !== 0) return rDiff;
        const aPin = Boolean(a.isPinned) && a.status !== "Rented";
        const bPin = Boolean(b.isPinned) && b.status !== "Rented";
        if (aPin !== bPin) return aPin ? -1 : 1;
        if (aPin && bPin) {
          const pDiff = ts(b.pinnedAt) - ts(a.pinnedAt);
          if (pDiff !== 0) return pDiff;
        }
        return Math.max(ts(b.boostedAt), ts(b.createdAt)) - Math.max(ts(a.boostedAt), ts(a.createdAt));
      });
    }
    return copy;
  }, [report, aptSearch, aptFilter, aptTypeFilter, aptSort]);

  const filteredLeads = useMemo(() => {
    const all = (report?.inquiries || []).filter((i) => i.type !== "owner_listing");
    const q = leadSearch.trim().toLowerCase();
    return all.filter((i) => {
      const isBooking = ["reservation", "booking"].includes(i.type);
      if (leadAptFilter && String(i.apartmentCode || "").toUpperCase() !== leadAptFilter.toUpperCase()) return false;
      if (!leadAptFilter) {
        if (leadSubTab === "bookings" && !isBooking) return false;
        if (leadSubTab === "viewings" && isBooking) return false;
      }
      if (leadStatusFilter === "urgent" && !["New", "Pending"].includes(i.status)) return false;
      if (leadStatusFilter === "scheduled" && !["Viewing_Scheduled", "Confirmed"].includes(i.status)) return false;
      if (leadStatusFilter === "contacted" && i.status !== "Contacted") return false;
      if (leadStatusFilter === "closed" && i.status !== "Rented_Closed") return false;
      if (!q) return true;
      return [i.clientName, i.contactHandle, i.code, i.apartmentCode, i.notes, i.adminNotes, i.messenger].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [report, leadSubTab, leadStatusFilter, leadAptFilter, leadSearch]);

  const filteredLeases = useMemo(() => {
    const list = report?.leases || [];
    const q = leaseSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) =>
      [l.code, l.tenantName, l.tenantContact, l.apartmentCode, l.building, l.notes].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [report, leaseSearch]);

  const hasBulkBar =
    (tab === "apartments" && aptSelectMode && selectedApts.length > 0) ||
    (tab === "leads" && leadSelectMode && selectedLeads.length > 0);

  /* ======================= AUTH VIEWS ======================= */
  if (checkingAuth) {
    return (
      <div className="st-lock-wrap">
        <div style={{ color: "#ebd5b0", fontWeight: 700, fontSize: 14.5 }}>Đang mở KIN Studio...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="st-lock-wrap">
        <form className="st-lock-card" onSubmit={handleLogin}>
          <div className="st-logo" style={{ margin: "0 auto 14px", width: 52, height: 52, fontSize: 28 }}>K</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#b38646", textTransform: "uppercase" }}>
            KIN ESTATES STUDIO
          </div>
          <h1 style={{ margin: "6px 0 6px", fontSize: 20, fontWeight: 800, color: "#12171d" }}>
            Quản Trị Nội Bộ
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#586270" }}>
            Nhập mã khóa quản trị hoặc mở trực tiếp từ Bot Telegram của anh.
          </p>
          <input
            type="password"
            className="st-input"
            placeholder="Nhập mã khóa..."
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ textAlign: "center", fontSize: 16, letterSpacing: "0.14em", marginBottom: 12 }}
            autoFocus
          />
          {authError && <div style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{authError}</div>}
          <button type="submit" className="st-btn st-btn--primary">
            <Icon.Lock /> Mở Bảng Điều Khiển
          </button>
        </form>
      </div>
    );
  }

  const kpi = report?.kpi;
  const pendingAlertCount = (kpi?.newLeadsCount || 0) + (kpi?.pendingBookingsCount || 0);

  return (
    <div className={`st-shell ${hasBulkBar ? "has-bulk-bar" : ""}`}>
      {toast && <div className="st-toast">{toast}</div>}

      {/* Top Sticky Header */}
      <header className="st-header">
        <div className="st-brand">
          <div className="st-logo">K</div>
          <div>
            <div className="st-brand-title">KIN STUDIO</div>
            <div className="st-live-pill">
              <span className="st-live-dot" />
              Auto-Sync 24/7
            </div>
          </div>
        </div>
        <div className="st-header-actions">
          <a href="/" target="_blank" rel="noreferrer" className="st-icon-circle" title="Xem Web khách">
            <Icon.External />
          </a>
          <button
            type="button"
            className={`st-icon-circle ${loading ? "st-icon-circle--spin" : ""}`}
            onClick={() => loadReport()}
            disabled={loading}
            title="Làm mới dữ liệu"
          >
            <Icon.Refresh />
          </button>
          <button
            type="button"
            className="st-icon-circle"
            title="Khóa màn hình"
            onClick={() => {
              localStorage.removeItem("kin_studio_token");
              setToken("");
              setAuthed(false);
            }}
          >
            <Icon.Lock />
          </button>
        </div>
      </header>

      <main className="st-content">
        {/* ================= TAB 1: DASHBOARD TỔNG QUAN ================= */}
        {tab === "report" && kpi && report && (
          <>
            <section className="st-hero-card">
              <div className="st-hero-label">
                <span>DOANH THU ĐANG VẬN HÀNH</span>
                <span>{new Date(report.generatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="st-hero-revenue">{fmtVnd(kpi.activeRevenueVnd)} / tháng</div>
              <div className="st-hero-sub">
                ${kpi.activeRevenueUsd.toLocaleString("en-US")}/th từ <b>{kpi.activeLeasesCount}</b> hợp đồng · Tiềm năng căn trống: <b>{fmtVnd(kpi.vacantPotentialVnd)}</b>
              </div>
              <div className="st-progress-wrap">
                <div className="st-progress-head">
                  <span>Tỷ lệ lấp đầy & giữ chỗ</span>
                  <span>{kpi.occupancyRate}% ({kpi.rentedCount + kpi.reservedCount}/{Math.max(1, kpi.totalApartments - kpi.hiddenCount)} căn)</span>
                </div>
                <div className="st-progress-track">
                  <div className="st-progress-fill" style={{ width: `${Math.min(100, kpi.occupancyRate)}%` }} />
                </div>
              </div>
            </section>

            {/* Quick 1-Tap CRUD Shortcuts */}
            <section className="st-quick-actions">
              <button type="button" className="st-quick-btn st-quick-btn--primary" onClick={() => openCreateEditor(aptTypeFilter !== "all" ? aptTypeFilter : "condo")}>
                <span className="st-quick-icon"><Icon.Plus size={18} /></span>
                <span>Đăng BĐS mới</span>
              </button>
              <button type="button" className="st-quick-btn" onClick={openCreateLead}>
                <span className="st-quick-icon"><Icon.Users /></span>
                <span>Thêm khách</span>
              </button>
              <button type="button" className="st-quick-btn" onClick={() => openCreateLease()}>
                <span className="st-quick-icon"><Icon.Key /></span>
                <span>Tạo hợp đồng</span>
              </button>
            </section>

            {/* 2x2 Interactive KPI Cards */}
            <section className="st-kpi-grid">
              <button type="button" className="st-kpi-card" onClick={() => { setAptFilter("available"); setTab("apartments"); }}>
                <div className="st-kpi-top">
                  <span>Căn đang trống</span>
                  <span className="st-badge st-badge--green">Online</span>
                </div>
                <div className="st-kpi-val">{kpi.availableCount}</div>
                <div className="st-kpi-note">Ghim đầu: {kpi.pinnedCount || 0} căn · {kpi.hiddenCount} đang ẩn</div>
              </button>

              <button type="button" className="st-kpi-card" onClick={() => { setAptFilter("rented"); setTab("apartments"); }}>
                <div className="st-kpi-top">
                  <span>Thuê & Giữ chỗ</span>
                  <span className="st-badge st-badge--bronze">Hoạt động</span>
                </div>
                <div className="st-kpi-val">{kpi.rentedCount + kpi.reservedCount}</div>
                <div className="st-kpi-note">{kpi.rentedCount} đã thuê · {kpi.reservedCount} giữ chỗ</div>
              </button>

              <button type="button" className="st-kpi-card" onClick={() => { setLeadAptFilter(""); setTab("leads"); }}>
                <div className="st-kpi-top">
                  <span>Khách chờ xử lý</span>
                  {pendingAlertCount > 0 ? <span className="st-badge st-badge--red">Mới</span> : <span className="st-badge st-badge--gray">Ổn định</span>}
                </div>
                <div className="st-kpi-val">{pendingAlertCount}</div>
                <div className="st-kpi-note">{kpi.totalInquiries} tổng khách quan tâm</div>
              </button>

              <button type="button" className="st-kpi-card" onClick={() => setTab("leases")}>
                <div className="st-kpi-top">
                  <span>HĐ sắp hết hạn</span>
                  <span className={`st-badge ${kpi.expiringSoonCount > 0 ? "st-badge--amber" : "st-badge--green"}`}>45 ngày</span>
                </div>
                <div className="st-kpi-val">{kpi.expiringSoonCount}</div>
                <div className="st-kpi-note">{kpi.activeLeasesCount} hợp đồng hiệu lực</div>
              </button>
            </section>

            {/* Compact 4-Stage Pipeline */}
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">Phễu Khách Hàng</h2>
                <button type="button" className="st-btn-mini" onClick={() => setTab("leads")}>Quản lý →</button>
              </div>
              <div className="st-funnel-grid">
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{(report.statusFunnel.New || 0) + (report.statusFunnel.Pending || 0)}</div>
                  <div className="st-funnel-lbl">Mới</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Contacted || 0}</div>
                  <div className="st-funnel-lbl">Đã LH</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{(report.statusFunnel.Viewing_Scheduled || 0) + (report.statusFunnel.Confirmed || 0)}</div>
                  <div className="st-funnel-lbl">Hẹn / Giữ</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Rented_Closed || 0}</div>
                  <div className="st-funnel-lbl">Đã chốt</div>
                </div>
              </div>
            </section>

            {/* Merged Area Breakdown */}
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">Phân Bổ Theo Khu Vực</h2>
                <span className="st-badge st-badge--gray">{report.areaBreakdown.length} khu vực</span>
              </div>
              <div className="st-bar-list">
                {report.areaBreakdown.map((item) => {
                  const pct = Math.round((item.total / Math.max(1, kpi.totalApartments)) * 100);
                  return (
                    <div key={item.area} className="st-bar-item">
                      <div className="st-bar-row">
                        <span>{item.area}</span>
                        <span style={{ color: "var(--text-sub)", fontSize: 12, fontWeight: 600 }}>
                          {item.total} căn ({item.available} trống) · {item.leads} khách
                        </span>
                      </div>
                      <div className="st-bar-track">
                        <div className="st-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Slow-Moving / Vacant Priority Boost Panel */}
            {(report.slowVacantApartments || []).length > 0 && (
              <section className="st-card st-priority-panel">
                <div className="st-card-head">
                  <div>
                    <h2 className="st-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Icon.PinTop size={15} /> Đẩy Nhanh Cho Thuê (Ghim / Lên Đầu)
                    </h2>
                    <div style={{ fontSize: 11.5, color: "var(--text-sub)", marginTop: 2 }}>
                      Chỉ định căn trống lâu hoặc ít khách hỏi lên vị trí Nổi bật #1 đầu Web
                    </div>
                  </div>
                  <button
                    type="button"
                    className="st-btn-mini"
                    onClick={() => {
                      setAptFilter("available");
                      setAptSort("slow");
                      setTab("apartments");
                    }}
                  >
                    Xem kho →
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {(report.slowVacantApartments || []).slice(0, 4).map((apt) => (
                    <div key={apt.code} className="st-slow-row">
                      <img
                        src={apt.images?.[0] || FALLBACK_IMG}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0, cursor: "pointer" }}
                        onClick={() => openEditEditor(apt)}
                      />
                      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => openEditEditor(apt)}>
                        <div style={{ fontWeight: 700, fontSize: 12.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--navy)" }}>
                          {apt.isPinned ? "★ " : ""}{titleOf(apt)}
                        </div>
                        <div style={{ fontSize: 11.2, color: "var(--text-sub)" }}>
                          {fmtVnd(apt.priceVnd)} · {apt.contactSummary?.people || 0} khách · {apt.daysSinceBoost ? `${apt.daysSinceBoost}n chưa đẩy` : "Mới cập nhật"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                        <button
                          type="button"
                          className={`st-btn-mini ${apt.isPinned ? "st-btn-mini--gold-active" : "st-btn-mini--bronze"}`}
                          onClick={() =>
                            quickPatchApt(
                              apt,
                              apt.isPinned ? { isPinned: false } : { isPinned: true, pinNow: true },
                              apt.isPinned ? `Đã bỏ ghim ${apt.code}` : `Đã ghim ${apt.code} lên đầu Web!`
                            )
                          }
                          title={apt.isPinned ? "Bỏ ghim đầu" : "Ghim cố định lên đầu Web"}
                        >
                          <Icon.PinTop size={12} />
                          <span>{apt.isPinned ? "Đã ghim" : "Ghim"}</span>
                        </button>
                        <button
                          type="button"
                          className="st-btn-mini st-btn-mini--navy"
                          onClick={() => quickPatchApt(apt, { boostNow: true }, `Đã đẩy ${apt.code} lên đầu danh sách!`)}
                          title="Làm mới đẩy lên đầu danh sách"
                        >
                          <Icon.Boost size={12} />
                          <span>Đẩy</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SEO IndexNow + Google WebSub + Backlink Toolkit */}
            <section className="st-card st-seo-panel">
              <div className="st-card-head" style={{ marginBottom: 8 }}>
                <div>
                  <h2 className="st-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon.Boost size={15} /> Đẩy Top Google, AI &amp; Tạo Backlink Chuẩn SEO
                  </h2>
                  <div style={{ fontSize: 11.5, color: "var(--text-sub)", marginTop: 2 }}>
                    Tự động thông báo Google WebSub, Bing, ChatGPT &amp; Naver mỗi khi đăng / sửa / ghim BĐS
                  </div>
                </div>
                <span className="st-badge st-badge--green">Auto Live</span>
              </div>
              <div className="st-seo-pills">
                <span className="st-seo-pill">✓ 19 Khu vực Đà Nẵng</span>
                <span className="st-seo-pill">✓ 14 Danh mục BĐS</span>
                <span className="st-seo-pill">✓ 6 Quốc gia (VI·EN·KO·ZH·RU·JA)</span>
                <span className="st-seo-pill">✓ Sitemap + RSS + IndexNow</span>
              </div>
              <div className="st-seo-actions">
                <button
                  type="button"
                  className="st-btn-mini st-btn-mini--navy"
                  disabled={pingingSeo}
                  onClick={handlePingSearchEngines}
                >
                  <Icon.Boost size={12} />
                  <span>{pingingSeo ? "Đang bắn tín hiệu Index..." : "⚡ Đẩy Index Google & AI Ngay"}</span>
                </button>
                <button
                  type="button"
                  className="st-btn-mini st-btn-mini--bronze"
                  onClick={() =>
                    copyToClipboard(
                      buildNapBacklinkProfile(),
                      "✓ Đã copy Hồ sơ Backlink chuẩn (NAP) để dán lên Google Maps, Fanpage, BĐS!"
                    )
                  }
                >
                  <Icon.Copy size={12} />
                  <span>Copy Hồ Sơ Backlink (NAP)</span>
                </button>
              </div>
            </section>

            {/* Top Contacted Apartments */}
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">Căn Hộ Quan Tâm Nhất</h2>
                <button type="button" className="st-btn-mini" onClick={() => setTab("apartments")}>Tất cả →</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.topApartments.slice(0, 4).map((apt) => (
                  <div
                    key={apt.code}
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => openEditEditor(apt)}
                  >
                    <img
                      src={apt.images?.[0] || FALLBACK_IMG}
                      alt=""
                      style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {titleOf(apt)}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>
                        {fmtVnd(apt.priceVnd)} · {areaDisplayLabel(apt.areaName)}
                      </div>
                    </div>
                    <span className="st-badge st-badge--blue">
                      {apt.contactSummary?.people || 0} LH
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Expiring Leases Alert */}
            {report.expiringSoonLeases.length > 0 && (
              <section className="st-card" style={{ borderColor: "rgba(201,115,5,0.32)", background: "#fffdf7" }}>
                <div className="st-card-head">
                  <h2 className="st-card-title">Hợp Đồng Sắp Hết Hạn</h2>
                  <span className="st-badge st-badge--amber">{report.expiringSoonLeases.length} HĐ</span>
                </div>
                {report.expiringSoonLeases.map((l) => (
                  <div
                    key={l.code}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => openEditLease(l)}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{l.tenantName} · {l.apartmentCode}</div>
                      <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>Hết hạn: {l.endDate}</div>
                    </div>
                    <span className={`st-badge ${(l.daysLeft ?? 0) < 0 ? "st-badge--red" : "st-badge--amber"}`}>
                      {(l.daysLeft ?? 0) < 0 ? `Quá ${Math.abs(l.daysLeft!)} ngày` : `Còn ${l.daysLeft} ngày`}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {/* ================= TAB 2: CĂN HỘ (CRUD + MULTI-SELECT + KHO ẢNH) ================= */}
        {tab === "apartments" && (
          <>
            <div className="st-toolbar">
              <div className="st-search-box">
                <span className="st-search-icon"><Icon.Search /></span>
                <input
                  type="search"
                  className="st-search-input"
                  placeholder="Tìm mã căn, tòa nhà, khu vực..."
                  value={aptSearch}
                  onChange={(e) => setAptSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`st-tool-pill ${aptSelectMode ? "active" : ""}`}
                onClick={() => {
                  setAptSelectMode((v) => !v);
                  setSelectedApts([]);
                }}
              >
                <Icon.Checklist />
                <span>{aptSelectMode ? "Xong" : "Chọn"}</span>
              </button>
              <button type="button" className="st-tool-pill" onClick={() => openMediaLibrary(false)} title="Kho ảnh Cloud">
                <Icon.Image />
                <span>Ảnh</span>
              </button>
            </div>

            {aptSelectMode && (
              <div className="st-select-strip">
                <span>Đã chọn {selectedApts.length}/{filteredApartments.length} căn</span>
                <div className="st-select-strip-actions">
                  <button
                    type="button"
                    className="st-strip-btn"
                    onClick={() => {
                      const allCodes = filteredApartments.map((a) => a.code);
                      setSelectedApts(selectedApts.length === allCodes.length ? [] : allCodes);
                    }}
                  >
                    {selectedApts.length === filteredApartments.length && filteredApartments.length > 0 ? "Bỏ chọn" : "Chọn tất cả"}
                  </button>
                </div>
              </div>
            )}

            {/* Category Filter Row (Condo / Apartment / House / Villa / Penthouse) */}
            <div className="st-chips" style={{ marginBottom: 6 }}>
              {[
                ["all", `Tất cả (${report?.apartments.length || 0})`],
                ["condo", `Chung cư (${kpi?.typeCounts?.condo || 0})`],
                ["apartment", `Căn hộ thường (${kpi?.typeCounts?.apartment || 0})`],
                ["house", `Nhà nguyên căn (${kpi?.typeCounts?.house || 0})`],
                ["villa", `Villa (${kpi?.typeCounts?.villa || 0})`],
                ["penthouse", `Penthouse (${kpi?.typeCounts?.penthouse || 0})`]
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  type="button"
                  className={`st-chip ${aptTypeFilter === key ? "active" : ""}`}
                  onClick={() => setAptTypeFilter(key)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="st-chips">
              {[
                ["all", `Mọi trạng thái`],
                ["pinned", `Đang ghim (${kpi?.pinnedCount || 0})`],
                ["available", `Trống (${kpi?.availableCount || 0})`],
                ["reserved", `Giữ chỗ (${kpi?.reservedCount || 0})`],
                ["rented", `Đã thuê (${kpi?.rentedCount || 0})`],
                ["hidden", `Đang ẩn (${kpi?.hiddenCount || 0})`]
              ].map(([key, lbl]) => (
                <button
                  key={key}
                  type="button"
                  className={`st-chip ${aptFilter === key ? "active" : ""}`}
                  onClick={() => setAptFilter(key)}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="st-sort-bar">
              <span className="st-sort-lbl">Thứ tự kho ({filteredApartments.length} BĐS):</span>
              <select
                className="st-sort-select"
                value={aptSort}
                onChange={(e) => setAptSort(e.target.value as any)}
              >
                <option value="priority">Chuẩn Web (Ghim đầu & Mới đẩy)</option>
                <option value="slow">Cần đẩy thuê (Trống lâu / Ít khách)</option>
                <option value="leads">Nhiều khách hỏi nhất</option>
                <option value="newest">Mới đăng gần đây</option>
                <option value="price-desc">Giá: Cao → Thấp</option>
                <option value="price-asc">Giá: Thấp → Cao</option>
              </select>
            </div>

            {filteredApartments.length === 0 ? (
              <div className="st-empty">Không có căn hộ phù hợp bộ lọc.</div>
            ) : (
              filteredApartments.map((apt) => {
                const isHidden = apt.isVisible === false || apt.status === "Hidden";
                const isAvail = apt.status === "Available";
                const people = apt.contactSummary?.people || 0;
                const isSelected = selectedApts.includes(apt.code);
                const isHouseOrVilla = apt.propertyType === "house" || apt.propertyType === "villa";
                const specParts = [
                  apt.bedrooms != null ? `${apt.bedrooms} PN` : "",
                  apt.landAreaM2 ? `Đất ${apt.landAreaM2}m²` : "",
                  apt.sizeM2 != null ? `${isHouseOrVilla && apt.landAreaM2 ? "Sàn " : ""}${apt.sizeM2}m²` : "",
                  apt.floor != null ? (isHouseOrVilla ? `${apt.floor} tầng` : `T${apt.floor}`) : "",
                  areaDisplayLabel(apt.areaName)
                ].filter(Boolean).join(" · ");

                return (
                  <article
                    key={apt.code}
                    className={`st-apt-card ${isSelected ? "selected" : ""} ${apt.isPinned && !isHidden && apt.status !== "Rented" ? "is-pinned" : ""}`}
                    onClick={aptSelectMode ? () => toggleSelectApt(apt.code) : undefined}
                  >
                    <div className="st-apt-top">
                      {aptSelectMode && (
                        <button
                          type="button"
                          className={`st-check-circle ${isSelected ? "checked" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectApt(apt.code);
                          }}
                        >
                          {isSelected && <Icon.Check size={13} />}
                        </button>
                      )}
                      <div
                        className="st-apt-thumb-wrap"
                        onClick={(e) => {
                          if (aptSelectMode) return;
                          e.stopPropagation();
                          openEditEditor(apt);
                        }}
                      >
                        <img className="st-apt-thumb" src={apt.images?.[0] || FALLBACK_IMG} alt={titleOf(apt)} />
                        <span className="st-apt-photo-count">
                          <Icon.Image size={10} /> {(apt.images || []).length}
                        </span>
                      </div>
                      <div className="st-apt-info">
                        <h3
                          className="st-apt-title"
                          onClick={(e) => {
                            if (aptSelectMode) return;
                            e.stopPropagation();
                            openEditEditor(apt);
                          }}
                        >
                          {titleOf(apt)}
                        </h3>
                        <div className="st-apt-price">
                          {fmtVnd(apt.priceVnd)}/th <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>· ${apt.priceUsd}</span>
                        </div>
                        <div className="st-apt-meta">{specParts}</div>
                        <div className="st-apt-badges">
                          {apt.isPinned && apt.status !== "Rented" && (
                            <span className="st-badge st-badge--gold-pin">
                              <Icon.PinTop size={10} /> Ghim đầu #1
                            </span>
                          )}
                          <span className="st-badge st-badge--bronze">{getAptCategoryLabel(apt.propertyType)}</span>
                          {isHidden ? (
                            <span className="st-badge st-badge--gray">Đang ẩn</span>
                          ) : apt.status === "Rented" ? (
                            <span className="st-badge st-badge--red">Đã thuê</span>
                          ) : apt.status === "Reserved" ? (
                            <span className="st-badge st-badge--amber">Giữ chỗ</span>
                          ) : (
                            <span className="st-badge st-badge--green">Còn trống</span>
                          )}
                          <span className="st-badge st-badge--gray">{apt.code}</span>
                          {isAvail && !isHidden && (apt.daysSinceBoost || 0) >= 3 && (
                            <span className="st-badge st-badge--amber">{apt.daysSinceBoost}n chưa đẩy</span>
                          )}
                          {people > 0 && (
                            <span
                              className="st-badge st-badge--blue"
                              style={{ cursor: "pointer" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeadAptFilter(apt.code);
                                setTab("leads");
                              }}
                            >
                              {people} khách
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!aptSelectMode && (
                      <>
                        <div className="st-apt-priority-strip st-apt-priority-strip--three">
                          <button
                            type="button"
                            className={`st-btn-mini ${apt.isPinned ? "st-btn-mini--gold-active" : "st-btn-mini--bronze"}`}
                            onClick={() =>
                              quickPatchApt(
                                apt,
                                apt.isPinned ? { isPinned: false } : { isPinned: true, pinNow: true },
                                apt.isPinned ? `Đã bỏ ghim ${apt.code}` : `Đã ghim cố định ${apt.code} lên đầu Web!`
                              )
                            }
                          >
                            <Icon.PinTop size={12} />
                            <span>{apt.isPinned ? "Bỏ ghim" : "Ghim đầu"}</span>
                          </button>
                          <button
                            type="button"
                            className="st-btn-mini st-btn-mini--navy"
                            onClick={() =>
                              quickPatchApt(
                                apt,
                                { boostNow: true },
                                `Đã đẩy ${apt.code} lên đầu danh sách như mới đăng!`
                              )
                            }
                          >
                            <Icon.Boost size={12} />
                            <span>Đẩy Top</span>
                          </button>
                          <button
                            type="button"
                            className="st-btn-mini"
                            onClick={() =>
                              copyToClipboard(
                                buildSeoSharePost(apt),
                                `✓ Đã copy bài đăng & Backlink chuẩn SEO của ${apt.code}!`
                              )
                            }
                            title="Copy bài đăng kèm link gốc chuẩn SEO để đăng Facebook, Zalo, Chợ Tốt..."
                          >
                            <Icon.Copy size={12} />
                            <span>Bài &amp; Link</span>
                          </button>
                        </div>
                        <div className="st-apt-actions">
                          <button
                            type="button"
                            className={`st-btn-mini ${isAvail ? "st-btn-mini--amber" : "st-btn-mini--green"}`}
                            onClick={() =>
                              quickPatchApt(
                                apt,
                                { status: isAvail ? "Rented" : "Available", isVisible: true },
                                isAvail ? `Đã chuyển ${apt.code} sang Đã thuê` : `Đã mở trống ${apt.code}`
                              )
                            }
                          >
                            {isAvail ? "Đã thuê" : "Mở trống"}
                          </button>
                          <button
                            type="button"
                            className="st-btn-mini"
                            onClick={() =>
                              quickPatchApt(
                                apt,
                                { isVisible: isHidden, ...(isHidden && apt.status === "Hidden" ? { status: "Available" } : {}) },
                                isHidden ? `Đã hiện ${apt.code} lên Web` : `Đã ẩn ${apt.code} khỏi Web`
                              )
                            }
                          >
                            <Icon.Eye off={!isHidden} />
                            <span>{isHidden ? "Hiện" : "Ẩn"}</span>
                          </button>
                          <button type="button" className="st-btn-mini st-btn-mini--navy" onClick={() => openEditEditor(apt)}>
                            <Icon.Edit />
                            <span>Sửa</span>
                          </button>
                          <button type="button" className="st-btn-mini st-btn-mini--red" onClick={() => handleDeleteApt(apt.code)}>
                            <Icon.Trash />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
          </>
        )}

        {/* ================= TAB 3: KHÁCH HÀNG (FULL CRUD + MULTI-SELECT) ================= */}
        {tab === "leads" && (
          <>
            <div className="st-toolbar">
              <div className="st-search-box">
                <span className="st-search-icon"><Icon.Search /></span>
                <input
                  type="search"
                  className="st-search-input"
                  placeholder="Tìm tên khách, SĐT, mã căn..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className={`st-tool-pill ${leadSelectMode ? "active" : ""}`}
                onClick={() => {
                  setLeadSelectMode((v) => !v);
                  setSelectedLeads([]);
                }}
              >
                <Icon.Checklist />
                <span>{leadSelectMode ? "Xong" : "Chọn"}</span>
              </button>
            </div>

            {leadSelectMode && (
              <div className="st-select-strip">
                <span>Đã chọn {selectedLeads.length}/{filteredLeads.length} khách</span>
                <button
                  type="button"
                  className="st-strip-btn"
                  onClick={() => {
                    const allIds = filteredLeads.map((i) => i.code || i._id);
                    setSelectedLeads(selectedLeads.length === allIds.length ? [] : allIds);
                  }}
                >
                  {selectedLeads.length === filteredLeads.length && filteredLeads.length > 0 ? "Bỏ chọn" : "Chọn tất cả"}
                </button>
              </div>
            )}

            {leadAptFilter ? (
              <div className="st-card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700 }}>ĐANG LỌC THEO CĂN</div>
                  <div style={{ fontWeight: 800, color: "var(--navy)" }}>{leadAptFilter}</div>
                </div>
                <button type="button" className="st-btn-mini" onClick={() => setLeadAptFilter("")}>Xem tất cả</button>
              </div>
            ) : (
              <>
                <div className="st-chips" style={{ marginBottom: 6 }}>
                  {[
                    ["all", `Tất cả (${(report?.inquiries || []).filter((i) => i.type !== "owner_listing").length})`],
                    ["viewings", "Tư vấn & Hẹn xem"],
                    ["bookings", `Giữ chỗ (${(kpi?.pendingBookingsCount || 0) + (kpi?.confirmedBookingsCount || 0)})`]
                  ].map(([key, lbl]) => (
                    <button
                      key={key}
                      type="button"
                      className={`st-chip ${leadSubTab === key ? "active" : ""}`}
                      onClick={() => setLeadSubTab(key as any)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <div className="st-chips">
                  {[
                    ["all", "Mọi tiến độ"],
                    ["urgent", `Cần xử lý (${pendingAlertCount})`],
                    ["scheduled", "Đã hẹn / Đang giữ"],
                    ["contacted", "Đã liên hệ"],
                    ["closed", "Đã chốt thuê"]
                  ].map(([key, lbl]) => (
                    <button
                      key={key}
                      type="button"
                      className={`st-chip ${leadStatusFilter === key ? "active" : ""}`}
                      onClick={() => setLeadStatusFilter(key as any)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </>
            )}

            {filteredLeads.length === 0 ? (
              <div className="st-empty">Chưa có khách hàng nào trong danh sách.</div>
            ) : (
              filteredLeads.map((inq) => {
                const leadKey = inq.code || inq._id;
                const isBooking = ["reservation", "booking"].includes(inq.type);
                const link = contactHref(inq.contactHandle, inq.messenger);
                const quickContact = buildLeadQuickActions(inq.contactHandle, inq.messenger);
                const relTime = formatRelativeTimeVi(inq.createdAt);
                const isSelected = selectedLeads.includes(leadKey);
                const badgeClass =
                  inq.status === "New" || inq.status === "Pending"
                    ? "st-badge--red"
                    : inq.status === "Confirmed" || inq.status === "Viewing_Scheduled"
                    ? "st-badge--amber"
                    : inq.status === "Rented_Closed"
                    ? "st-badge--green"
                    : "st-badge--gray";

                return (
                  <article
                    key={inq._id}
                    className={`st-item-card ${isSelected ? "selected" : ""}`}
                    onClick={leadSelectMode ? () => toggleSelectLead(leadKey) : undefined}
                  >
                    <div className="st-item-head">
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
                        {leadSelectMode && (
                          <button
                            type="button"
                            className={`st-check-circle ${isSelected ? "checked" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectLead(leadKey);
                            }}
                          >
                            {isSelected && <Icon.Check size={13} />}
                          </button>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span>{inq.clientName || "Khách hàng"}</span>
                            {relTime && <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)" }}>· {relTime}</span>}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>
                            {inq.code} · {isBooking ? "Đặt giữ chỗ" : inq.type === "shortlist" ? "Tìm nhà theo nhu cầu" : "Hẹn xem"} · <b>{inq.apartmentCode}</b>
                          </div>
                        </div>
                      </div>
                      <span className={`st-badge ${badgeClass}`}>{statusLabelVi(inq.status)}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {link ? (
                        <a href={link.href} target="_blank" rel="noreferrer" className="st-contact-link" onClick={(e) => e.stopPropagation()}>
                          <Icon.Phone /> {link.label}
                        </a>
                      ) : (
                        <span className="st-badge st-badge--gray">{inq.contactHandle || "Chưa có SĐT"}</span>
                      )}
                      {quickContact.zaloHref && (!link || !link.href.includes("zalo.me")) && (
                        <a href={quickContact.zaloHref} target="_blank" rel="noreferrer" className="st-contact-chip" onClick={(e) => e.stopPropagation()}>
                          Zalo
                        </a>
                      )}
                      {quickContact.waHref && (!link || !link.href.includes("wa.me")) && (
                        <a href={quickContact.waHref} target="_blank" rel="noreferrer" className="st-contact-chip" onClick={(e) => e.stopPropagation()}>
                          WhatsApp
                        </a>
                      )}
                      {quickContact.telHref && (!link || !link.href.startsWith("tel:")) && (
                        <a href={quickContact.telHref} className="st-contact-chip" onClick={(e) => e.stopPropagation()}>
                          Gọi
                        </a>
                      )}
                      {quickContact.clean && (
                        <button
                          type="button"
                          className="st-contact-chip"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard?.writeText(quickContact.clean);
                            showToast(`Đã sao chép: ${quickContact.clean}`);
                          }}
                        >
                          <Icon.Copy size={11} /> Copy
                        </button>
                      )}
                      {inq.budgetUsd && <span className="st-badge st-badge--bronze">{inq.budgetUsd}</span>}
                      {inq.bedrooms && <span className="st-badge st-badge--gray">{inq.bedrooms}</span>}
                      {(inq.viewingTime || inq.requestedViewingTime) && (
                        <span className="st-badge st-badge--amber">
                          <Icon.Calendar /> {inq.viewingTime || inq.requestedViewingTime}
                        </span>
                      )}
                      {inq.moveInDate && <span className="st-badge st-badge--gray">Vào ở: {inq.moveInDate}</span>}
                    </div>

                    {inq.notes && (
                      <div style={{ fontSize: 12.5, color: "var(--text-sub)", background: "var(--surface-soft)", padding: "8px 10px", borderRadius: 10 }}>
                        {inq.notes}
                      </div>
                    )}
                    {inq.adminNotes && (
                      <div style={{ fontSize: 12, color: "var(--bronze-dark)", background: "rgba(179,134,70,0.1)", border: "1px solid rgba(179,134,70,0.25)", padding: "7px 10px", borderRadius: 10 }}>
                        <b>Ghi chú nội bộ:</b> {inq.adminNotes}
                      </div>
                    )}

                    {!leadSelectMode && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 7, borderTop: "1px solid var(--border)" }}>
                        {isBooking && ["New", "Pending"].includes(inq.status) && (
                          <button type="button" className="st-btn-mini st-btn-mini--green" style={{ flex: 1 }} onClick={() => handleReservationAction(inq, "confirm")}>
                            Xác nhận giữ chỗ
                          </button>
                        )}
                        {isBooking && ["New", "Pending", "Confirmed"].includes(inq.status) && (
                          <button type="button" className="st-btn-mini st-btn-mini--red" style={{ flex: 1 }} onClick={() => handleReservationAction(inq, "cancel")}>
                            Hủy giữ chỗ
                          </button>
                        )}
                        {!isBooking && inq.status === "New" && (
                          <button type="button" className="st-btn-mini" onClick={() => updateLeadStatus(inq, { status: "Contacted" }, "Đã đánh dấu Đã liên hệ")}>
                            Đã LH
                          </button>
                        )}
                        <button type="button" className="st-btn-mini st-btn-mini--navy" onClick={() => openEditLead(inq)}>
                          <Icon.Edit /> Sửa
                        </button>
                        <button type="button" className="st-btn-mini st-btn-mini--green" onClick={() => openCreateLease(inq)}>
                          Chốt thuê
                        </button>
                        <button type="button" className="st-btn-mini st-btn-mini--red" onClick={() => handleDeleteLead(inq)}>
                          <Icon.Trash />
                        </button>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </>
        )}

        {/* ================= TAB 4: HỢP ĐỒNG (FULL CRUD) ================= */}
        {tab === "leases" && (
          <>
            <div className="st-search-box">
              <span className="st-search-icon"><Icon.Search /></span>
              <input
                type="search"
                className="st-search-input"
                placeholder="Tìm tên khách thuê, mã hợp đồng, mã căn..."
                value={leaseSearch}
                onChange={(e) => setLeaseSearch(e.target.value)}
              />
            </div>

            {filteredLeases.length === 0 ? (
              <div className="st-empty">Chưa có hợp đồng thuê nào.</div>
            ) : (
              filteredLeases.map((l) => {
                const left = daysUntil(l.endDate);
                const ended = l.status === "Ended";
                const link = contactHref(l.tenantContact, l.messenger);
                return (
                  <article key={l.code} className="st-item-card" style={{ opacity: ended ? 0.68 : 1 }}>
                    <div className="st-item-head">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--navy)" }}>{l.tenantName}</div>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                          <b>{l.apartmentCode}</b> · {l.building || l.apartmentTitle}
                        </div>
                      </div>
                      <span className={`st-badge ${ended ? "st-badge--gray" : (left ?? 99) <= 30 ? "st-badge--red" : "st-badge--green"}`}>
                        {ended
                          ? "Đã trả phòng"
                          : left !== null && left < 0
                          ? `Quá hạn ${Math.abs(left)}n`
                          : left !== null
                          ? `Còn ${left} ngày`
                          : "Đang thuê"}
                      </span>
                    </div>

                    <div style={{ fontSize: 12.5, display: "flex", flexWrap: "wrap", gap: 10, color: "var(--text)" }}>
                      <span><b>{fmtVnd(l.priceVnd || l.priceUsd * RATE_VND)}/th</b> (${l.priceUsd})</span>
                      <span style={{ color: "var(--text-sub)" }}>{l.startDate} → {l.endDate}</span>
                    </div>

                    {l.notes && (
                      <div style={{ fontSize: 12, color: "var(--text-sub)", background: "var(--surface-soft)", padding: "7px 10px", borderRadius: 10 }}>
                        {l.notes}
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", paddingTop: 7, borderTop: "1px solid var(--border)" }}>
                      {link ? (
                        <a href={link.href} target="_blank" rel="noreferrer" className="st-contact-link">
                          <Icon.Phone /> {link.label}
                        </a>
                      ) : (
                        <span className="st-badge st-badge--gray">{l.tenantContact || "Chưa có LH"}</span>
                      )}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        <button type="button" className="st-btn-mini st-btn-mini--navy" onClick={() => openEditLease(l)}>
                          <Icon.Edit /> Sửa
                        </button>
                        {!ended && (
                          <button type="button" className="st-btn-mini st-btn-mini--amber" onClick={() => handleCheckoutLease(l)}>
                            Trả phòng
                          </button>
                        )}
                        <button type="button" className="st-btn-mini st-btn-mini--red" onClick={() => handleDeleteLease(l)}>
                          <Icon.Trash />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </>
        )}
        {/* ================= TAB 5: TRANG ABOUT & ẢNH / FEEDBACK ================= */}
        {tab === "about" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div className="st-chips" style={{ flex: 1 }}>
                <button type="button" className={`st-chip ${aboutSubTab === "photos" ? "active" : ""}`} onClick={() => setAboutSubTab("photos")}>
                  Ảnh dẫn khách ({report?.aboutContent?.clientTourPhotos?.length || 0})
                </button>
                <button type="button" className={`st-chip ${aboutSubTab === "feedback" ? "active" : ""}`} onClick={() => setAboutSubTab("feedback")}>
                  Feedback ({report?.aboutContent?.testimonials?.length || 0})
                </button>
                <button type="button" className={`st-chip ${aboutSubTab === "brand" ? "active" : ""}`} onClick={() => setAboutSubTab("brand")}>
                  Ảnh bìa & Quote
                </button>
              </div>
              <a href="/about" target="_blank" rel="noreferrer" className="st-icon-circle" title="Xem trang About live">
                <Icon.External />
              </a>
            </div>

            {aboutSubTab === "photos" && (
              <>
                <div className="st-row-2">
                  <label className="st-btn st-btn--bronze" style={{ cursor: "pointer" }}>
                    <Icon.Plus size={15} /> {uploadingAbout ? "Đang tải..." : "Tải nhanh nhiều ảnh"}
                    <input type="file" accept="image/*" multiple hidden onChange={handleQuickUploadTourPhotos} disabled={uploadingAbout} />
                  </label>
                  <button type="button" className="st-btn st-btn--primary" onClick={() => openEditTourPhoto()}>
                    <Icon.Image size={15} /> Thêm kèm chú thích
                  </button>
                </div>

                {(report?.aboutContent?.clientTourPhotos || []).length === 0 ? (
                  <div className="st-empty">Chưa có ảnh dẫn khách nào. Tải ảnh từ điện thoại để hiển thị ngay trên trang About!</div>
                ) : (
                  (report?.aboutContent?.clientTourPhotos || []).map((item, idx, arr) => (
                    <article key={item.id} className="st-apt-card">
                      <div className="st-apt-top">
                        <div className="st-apt-thumb-wrap" onClick={() => openEditTourPhoto(item)}>
                          <img className="st-apt-thumb" src={item.image} alt="" />
                        </div>
                        <div className="st-apt-info">
                          <div className="st-badge st-badge--bronze" style={{ marginBottom: 4 }}>
                            {item.tag || "Dẫn khách xem nhà"}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>
                            {viText(item.caption) || "(Chưa có chú thích — chạm Sửa để thêm)"}
                          </div>
                          <div className="st-apt-meta">{item.date || ""}</div>
                        </div>
                      </div>
                      <div className="st-apt-actions">
                        <button type="button" className="st-btn-mini" disabled={idx === 0} onClick={() => handleMoveTourPhoto(item.id, "left")}>
                          ‹ Lên
                        </button>
                        <button type="button" className="st-btn-mini" disabled={idx === arr.length - 1} onClick={() => handleMoveTourPhoto(item.id, "right")}>
                          Xuống ›
                        </button>
                        <button type="button" className="st-btn-mini st-btn-mini--navy" onClick={() => openEditTourPhoto(item)}>
                          <Icon.Edit /> Sửa
                        </button>
                        <button type="button" className="st-btn-mini st-btn-mini--red" onClick={() => handleDeleteTourPhoto(item.id)}>
                          <Icon.Trash /> Xóa
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </>
            )}

            {aboutSubTab === "feedback" && (
              <>
                <button type="button" className="st-btn st-btn--primary" onClick={() => openFeedbackModal()}>
                  <Icon.Plus size={16} /> Thêm Feedback Khách Hàng
                </button>

                {(report?.aboutContent?.testimonials || []).length === 0 ? (
                  <div className="st-empty">Chưa có feedback khách hàng nào.</div>
                ) : (
                  (report?.aboutContent?.testimonials || []).map((fb) => (
                    <article key={fb.id} className="st-item-card">
                      <div className="st-item-head">
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {fb.avatar ? (
                            <img src={fb.avatar} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bronze)" }} />
                          ) : (
                            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--navy)", color: "var(--bronze-light)", display: "grid", placeItems: "center", fontWeight: 800 }}>
                              {(fb.clientName || "K").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--navy)" }}>{fb.clientName}</div>
                            <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>{fb.subtitle}</div>
                          </div>
                        </div>
                        <span style={{ color: "#c7923e", fontSize: 12.5, fontWeight: 800 }}>
                          {"★".repeat(Math.max(1, Math.min(5, Number(fb.rating) || 5)))}
                        </span>
                      </div>
                      {viText(fb.quote) && (
                        <div style={{ fontSize: 12.5, color: "var(--text-sub)", background: "var(--surface-soft)", padding: "8px 10px", borderRadius: 10 }}>
                          “{viText(fb.quote)}”
                        </div>
                      )}
                      {fb.image && (
                        <img
                          src={fb.image}
                          alt=""
                          style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 11, border: "1px solid var(--border)" }}
                        />
                      )}
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                        <button type="button" className="st-btn-mini st-btn-mini--navy" onClick={() => openFeedbackModal(fb)}>
                          <Icon.Edit /> Sửa
                        </button>
                        <button type="button" className="st-btn-mini st-btn-mini--red" onClick={() => handleDeleteFeedback(fb.id)}>
                          <Icon.Trash /> Xóa
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </>
            )}

            {aboutSubTab === "brand" && (
              <form className="st-card" style={{ display: "flex", flexDirection: "column", gap: 12 }} onSubmit={handleSaveAboutBrand}>
                <div className="st-card-head" style={{ marginBottom: 0 }}>
                  <h2 className="st-card-title">Ảnh Bìa & Trích Dẫn Trang About</h2>
                </div>
                {aboutHeroForm.heroImage && (
                  <img
                    src={aboutHeroForm.heroImage}
                    alt=""
                    style={{ width: "100%", height: 175, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)" }}
                  />
                )}
                <label className="st-btn st-btn--outline" style={{ cursor: "pointer" }}>
                  <Icon.Image size={15} /> {uploadingAbout ? "Đang tải ảnh bìa..." : "Chọn ảnh bìa mới từ điện thoại"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingAbout}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingAbout(true);
                      try {
                        const u = await uploadSingleImage(file);
                        if (u) {
                        aboutHeroDirtyRef.current = true;
                        setAboutHeroForm((p) => ({ ...p, heroImage: u }));
                        showToast("Đã tải ảnh bìa mới — bấm Lưu để cập nhật!");
                      }
                    } finally {
                      setUploadingAbout(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>
              <div className="st-field">
                <label className="st-label">Tên đội ngũ / Người đại diện</label>
                <input
                  className="st-input"
                  value={aboutHeroForm.founderName}
                  onChange={(e) => {
                    aboutHeroDirtyRef.current = true;
                    setAboutHeroForm((p) => ({ ...p, founderName: e.target.value }));
                  }}
                />
              </div>
              <div className="st-field">
                <label className="st-label">Lời trích dẫn (Viết Tiếng Việt — tự dịch 6 ngôn ngữ)</label>
                <textarea
                  className="st-textarea"
                  value={aboutHeroForm.founderQuote}
                  onChange={(e) => {
                    aboutHeroDirtyRef.current = true;
                    setAboutHeroForm((p) => ({ ...p, founderQuote: e.target.value }));
                  }}
                />
                </div>
                <button type="submit" className="st-btn st-btn--primary" disabled={savingAboutBrand}>
                  {savingAboutBrand ? "Đang lưu & dịch 6 ngôn ngữ..." : "Lưu Cập Nhật Trang About"}
                </button>
              </form>
            )}
          </>
        )}
      </main>

      {/* FLOATING BULK ACTION BAR — APARTMENTS */}
      {tab === "apartments" && aptSelectMode && selectedApts.length > 0 && (
        <div className="st-bulk-bar">
          <span className="st-bulk-count">Đã chọn {selectedApts.length} căn</span>
          <div className="st-bulk-btns">
            <button
              type="button"
              className="st-bulk-btn st-bulk-btn--edit"
              onClick={() => {
                setBulkAptForm({ pinAction: "", propertyType: "", status: "", visibility: "", areaName: "", priceMode: "", priceValue: "" });
                setBulkAptModalOpen(true);
              }}
            >
              <Icon.Edit size={13} /> Sửa hàng loạt
            </button>
            <button type="button" className="st-bulk-btn st-bulk-btn--delete" onClick={handleBulkDeleteApts}>
              <Icon.Trash size={13} /> Xóa
            </button>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTION BAR — LEADS */}
      {tab === "leads" && leadSelectMode && selectedLeads.length > 0 && (
        <div className="st-bulk-bar">
          <span className="st-bulk-count">Đã chọn {selectedLeads.length} khách</span>
          <div className="st-bulk-btns">
            <button type="button" className="st-bulk-btn st-bulk-btn--edit" onClick={() => setBulkLeadModalOpen(true)}>
              <Icon.Edit size={13} /> Đổi trạng thái
            </button>
            <button type="button" className="st-bulk-btn st-bulk-btn--delete" onClick={handleBulkDeleteLeads}>
              <Icon.Trash size={13} /> Xóa
            </button>
          </div>
        </div>
      )}

      {/* CONTEXT-AWARE FLOATING ACTION BUTTON */}
      {!hasBulkBar && tab === "apartments" && (
        <button type="button" className="st-fab" onClick={() => openCreateEditor(aptTypeFilter !== "all" ? aptTypeFilter : "condo")}>
          <Icon.Plus size={16} /> Đăng BĐS
        </button>
      )}
      {!hasBulkBar && tab === "leads" && (
        <button type="button" className="st-fab" onClick={openCreateLead}>
          <Icon.Plus size={16} /> Thêm khách
        </button>
      )}
      {!hasBulkBar && tab === "leases" && (
        <button type="button" className="st-fab" onClick={() => openCreateLease()}>
          <Icon.Plus size={16} /> Tạo HĐ
        </button>
      )}

      {/* BOTTOM 5-TAB NAVIGATION */}
      <nav className="st-bottom-nav" aria-label="Điều hướng quản trị">
        <button type="button" className={`st-nav-item ${tab === "report" ? "active" : ""}`} onClick={() => setTab("report")}>
          <Icon.Chart />
          <span>Tổng quan</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "apartments" ? "active" : ""}`} onClick={() => setTab("apartments")}>
          <Icon.Home />
          <span>Kho BĐS</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "leads" ? "active" : ""}`} onClick={() => setTab("leads")}>
          <Icon.Users />
          <span>Khách</span>
          {pendingAlertCount > 0 && <span className="st-nav-dot">{pendingAlertCount}</span>}
        </button>
        <button type="button" className={`st-nav-item ${tab === "leases" ? "active" : ""}`} onClick={() => setTab("leases")}>
          <Icon.Key />
          <span>Hợp đồng</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "about" ? "active" : ""}`} onClick={() => setTab("about")}>
          <Icon.Image size={20} />
          <span>About</span>
        </button>
      </nav>

      {/* ================= MODAL 1: BULK EDIT APARTMENTS ================= */}
      {bulkAptModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setBulkAptModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">Sửa Hàng Loạt ({selectedApts.length} căn hộ)</h2>
              <button type="button" className="st-close-btn" onClick={() => setBulkAptModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleBulkUpdateApts}>
              <div style={{ fontSize: 12, color: "var(--text-sub)", background: "var(--surface)", padding: "9px 12px", borderRadius: 12, border: "1px solid var(--border)" }}>
                Chỉ những mục anh chọn mới thay đổi. Mục để <b>"Giữ nguyên"</b> sẽ không bị ảnh hưởng.
              </div>

              <div className="st-field">
                <label className="st-label">Ưu tiên đẩy lên đầu trang Web</label>
                <select className="st-select" value={bulkAptForm.pinAction} onChange={(e) => setBulkAptForm((p) => ({ ...p, pinAction: e.target.value }))}>
                  <option value="">— Giữ nguyên —</option>
                  <option value="pin">Ghim cố định lên đầu Web (Nổi bật #1)</option>
                  <option value="boost">Làm mới đẩy lên đầu danh sách ngay</option>
                  <option value="unpin">Bỏ ghim ưu tiên</option>
                </select>
              </div>

              <div className="st-field">
                <label className="st-label">Phân loại danh mục sản phẩm</label>
                <select className="st-select" value={bulkAptForm.propertyType} onChange={(e) => setBulkAptForm((p) => ({ ...p, propertyType: e.target.value }))}>
                  <option value="">— Giữ nguyên —</option>
                  {PROPERTY_CATEGORIES.map((c) => (
                    <option key={c.val} value={c.val}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Trạng thái BĐS</label>
                  <select className="st-select" value={bulkAptForm.status} onChange={(e) => setBulkAptForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="">— Giữ nguyên —</option>
                    <option value="Available">Còn trống</option>
                    <option value="Reserved">Giữ chỗ</option>
                    <option value="Rented">Đã thuê</option>
                    <option value="Hidden">Đang ẩn</option>
                  </select>
                </div>
                <div className="st-field">
                  <label className="st-label">Hiển thị trên Web</label>
                  <select className="st-select" value={bulkAptForm.visibility} onChange={(e) => setBulkAptForm((p) => ({ ...p, visibility: e.target.value }))}>
                    <option value="">— Giữ nguyên —</option>
                    <option value="show">Hiện lên Web</option>
                    <option value="hide">Ẩn khỏi Web</option>
                  </select>
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Chuyển khu vực</label>
                <select className="st-select" value={bulkAptForm.areaName} onChange={(e) => setBulkAptForm((p) => ({ ...p, areaName: e.target.value }))}>
                  <option value="">— Giữ nguyên —</option>
                  {AREAS.map((a) => (
                    <option key={a.val} value={a.val}>{a.label}</option>
                  ))}
                </select>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Điều chỉnh giá thuê</label>
                  <select className="st-select" value={bulkAptForm.priceMode} onChange={(e) => setBulkAptForm((p) => ({ ...p, priceMode: e.target.value }))}>
                    <option value="">— Giữ nguyên —</option>
                    <option value="fixed">Đặt giá mới (triệu VNĐ)</option>
                    <option value="percent">Tăng / Giảm theo %</option>
                    <option value="delta">Cộng / Trừ (triệu VNĐ)</option>
                  </select>
                </div>
                {bulkAptForm.priceMode && (
                  <div className="st-field">
                    <label className="st-label">
                      {bulkAptForm.priceMode === "percent" ? "VD: 5 hoặc -10 (%)" : "VD: 15 hoặc -1.5 (tr)"}
                    </label>
                    <input
                      className="st-input"
                      inputMode="decimal"
                      placeholder={bulkAptForm.priceMode === "percent" ? "+5 / -5" : "18"}
                      value={bulkAptForm.priceValue}
                      onChange={(e) => setBulkAptForm((p) => ({ ...p, priceValue: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <button type="submit" className="st-btn st-btn--primary" disabled={bulkAptSaving}>
                {bulkAptSaving ? "Đang cập nhật..." : `Áp dụng cho ${selectedApts.length} căn hộ`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: BULK UPDATE LEADS ================= */}
      {bulkLeadModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setBulkLeadModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">Đổi Trạng Thái ({selectedLeads.length} khách)</h2>
              <button type="button" className="st-close-btn" onClick={() => setBulkLeadModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleBulkUpdateLeads}>
              <div className="st-field">
                <label className="st-label">Trạng thái mới</label>
                <select className="st-select" value={bulkLeadStatus} onChange={(e) => setBulkLeadStatus(e.target.value)}>
                  <option value="New">Mới</option>
                  <option value="Contacted">Đã liên hệ</option>
                  <option value="Viewing_Scheduled">Đã hẹn xem</option>
                  <option value="Rented_Closed">Đã chốt thuê</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </div>
              <button type="submit" className="st-btn st-btn--primary">
                Cập nhật {selectedLeads.length} khách hàng
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: CLOUD PHOTO GALLERY CRUD ================= */}
      {mediaModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setMediaModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">
                <Icon.Image size={17} /> {mediaPickerMode ? "Chọn Ảnh Từ Kho Cloud" : `Kho Ảnh Cloud (${mediaItems.length})`}
              </h2>
              <button type="button" className="st-close-btn" onClick={() => setMediaModalOpen(false)}>✕</button>
            </div>
            <div className="st-sheet-body">
              <label className="st-btn st-btn--bronze" style={{ cursor: "pointer" }}>
                <Icon.Plus size={16} /> {uploadingPhoto ? "Đang tải ảnh lên Cloud..." : "Tải thêm ảnh từ điện thoại"}
                <input type="file" accept="image/*" multiple hidden onChange={(e) => handlePhotoUpload(e, true)} disabled={uploadingPhoto} />
              </label>

              {mediaLoading ? (
                <div className="st-empty">Đang tải danh sách ảnh trên Cloud...</div>
              ) : mediaItems.length === 0 ? (
                <div className="st-empty">Kho ảnh đang trống.</div>
              ) : (
                <div className="st-photo-grid">
                  {mediaItems.map((item) => {
                    const alreadyAdded = form.images.includes(item.url);
                    const previewSrc = `/api/studio/media/${item.id}?token=${encodeURIComponent(token)}`;
                    return (
                      <div key={item.id} className="st-media-card">
                        <div
                          className="st-media-thumb"
                          style={{ cursor: mediaPickerMode ? "pointer" : "default" }}
                          onClick={() => {
                            if (!mediaPickerMode) return;
                            if (!alreadyAdded) {
                              setForm((p) => ({ ...p, images: [...p.images, item.url] }));
                              showToast("Đã gắn ảnh vào căn hộ!");
                            } else {
                              showToast("Ảnh này đã có trong căn hộ.");
                            }
                          }}
                        >
                          <img src={previewSrc} alt="" loading="lazy" />
                          {!mediaPickerMode && (
                            <button type="button" className="st-photo-del" onClick={() => handleDeleteMedia(item)} title="Xóa ảnh">
                              ×
                            </button>
                          )}
                          {mediaPickerMode && alreadyAdded && (
                            <span className="st-photo-cover-tag">Đã chọn</span>
                          )}
                        </div>
                        <div className="st-media-foot">
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.usedBy.length ? `${item.usedBy.length} căn` : "Chưa gắn"}
                          </span>
                          {mediaPickerMode ? (
                            <button
                              type="button"
                              style={{ border: "none", background: "none", color: "var(--bronze-dark)", fontWeight: 800, fontSize: 10.5, cursor: "pointer", padding: 0 }}
                              onClick={() => {
                                if (!alreadyAdded) {
                                  setForm((p) => ({ ...p, images: [...p.images, item.url] }));
                                  showToast("Đã thêm ảnh!");
                                }
                              }}
                            >
                              {alreadyAdded ? "✓" : "+ Chọn"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              style={{ border: "none", background: "none", color: "var(--red)", fontWeight: 700, fontSize: 10.5, cursor: "pointer", padding: 0 }}
                              onClick={() => handleDeleteMedia(item)}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: APARTMENT CREATE / EDIT ================= */}
      {editorOpen && (() => {
        const activeCat = CATEGORY_CONFIG[form.propertyType] || CATEGORY_CONFIG.condo;
        return (
        <div className="st-modal-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingCode ? `Sửa BĐS ${editingCode}` : "Đăng Bất Động Sản Mới"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setEditorOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveApartment}>
              <div style={{ background: "var(--green-bg)", color: "var(--green)", fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 12 }}>
                Lưu thẳng Cloud 24/7 — tự đồng bộ tức thì lên Website & Bot Telegram.
              </div>

              {/* 1-Tap Product Category Selector with Bespoke SVG Icons */}
              <div className="st-field">
                <span className="st-label">Danh mục sản phẩm * (Tự động mở bộ thuộc tính chuẩn)</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {PROPERTY_CATEGORIES.map((cat) => {
                    const active = form.propertyType === cat.val;
                    return (
                      <button
                        key={cat.val}
                        type="button"
                        className={`st-chip ${active ? "active" : ""}`}
                        style={{ height: 34, fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}
                        onClick={() => {
                          const nextCfg = CATEGORY_CONFIG[cat.val] || CATEGORY_CONFIG.condo;
                          setForm((p) => ({
                            ...p,
                            propertyType: cat.val,
                            ...(!editingCode ? { floor: nextCfg.defaultFloor } : {})
                          }));
                        }}
                      >
                        <Icon.Category type={cat.val} size={13} />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Top-Priority Pin & Boost Toggle Banner */}
              <div className={`st-pin-banner ${form.isPinned ? "active" : ""}`}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={form.isPinned}
                    onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
                    style={{ width: 18, height: 18, marginTop: 2, accentColor: "#9a6d2f", flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy)", display: "flex", alignItems: "center", gap: 5 }}>
                      <Icon.PinTop size={13} /> Ghim ưu tiên lên đầu trang Web (Nổi bật #1)
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-sub)", marginTop: 1 }}>
                      Dùng cho căn cần đẩy thuê nhanh — luôn hiển thị trên cùng Trang chủ & Danh mục.
                    </div>
                  </div>
                </label>
                {editingCode && (
                  <button
                    type="button"
                    className="st-btn-mini st-btn-mini--navy"
                    style={{ flexShrink: 0 }}
                    onClick={async () => {
                      const r = await fetch(`/api/apartments/${encodeURIComponent(editingCode)}`, {
                        method: "PATCH",
                        headers: authHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({ boostNow: true })
                      });
                      if (r.ok) {
                        showToast(`Đã đẩy ${editingCode} lên đầu danh sách!`);
                        await loadReport();
                      }
                    }}
                  >
                    <Icon.Boost size={12} /> Đẩy Top
                  </button>
                )}
              </div>

              {/* Photo CRUD Grid */}
              <div className="st-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="st-label">Bộ ảnh ({form.images.length} — chạm ảnh đặt làm Ảnh bìa)</span>
                  <button type="button" className="st-btn-mini st-btn-mini--bronze" style={{ height: 28 }} onClick={() => openMediaLibrary(true)}>
                    <Icon.Image size={12} /> Chọn từ Kho
                  </button>
                </div>
                <div className="st-photo-grid">
                  {form.images.map((src, idx) => (
                    <div
                      key={`${src}-${idx}`}
                      className={`st-photo-tile ${idx === 0 ? "cover" : ""}`}
                      onClick={() => {
                        if (idx === 0) return;
                        const copy = [...form.images];
                        const [picked] = copy.splice(idx, 1);
                        copy.unshift(picked);
                        setForm((p) => ({ ...p, images: copy }));
                        showToast("Đã đặt làm Ảnh bìa!");
                      }}
                    >
                      <img src={src} alt="" />
                      <div className="st-photo-order" onClick={(e) => e.stopPropagation()}>
                        {idx > 0 && (
                          <button type="button" className="st-photo-move" onClick={() => movePhoto(idx, -1)}>‹</button>
                        )}
                        {idx < form.images.length - 1 && (
                          <button type="button" className="st-photo-move" onClick={() => movePhoto(idx, 1)}>›</button>
                        )}
                      </div>
                      {idx === 0 && <span className="st-photo-cover-tag">Ảnh bìa</span>}
                      <button
                        type="button"
                        className="st-photo-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          setForm((p) => ({ ...p, images: p.images.filter((_, i) => i !== idx) }));
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <label className="st-photo-add">
                    <Icon.Plus size={18} />
                    <span>{uploadingPhoto ? "Đang tải..." : "Tải ảnh ĐT"}</span>
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => handlePhotoUpload(e, false)} disabled={uploadingPhoto} />
                  </label>
                </div>

                {/* Optional paste URL */}
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <input
                    className="st-input"
                    style={{ height: 36, fontSize: 12.5, padding: "0 10px" }}
                    placeholder="Hoặc dán link ảnh (https://...)"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                  />
                  <button
                    type="button"
                    className="st-btn-mini st-btn-mini--navy"
                    style={{ height: 36, padding: "0 12px" }}
                    onClick={() => {
                      const u = photoUrlInput.trim();
                      if (!u) return;
                      setForm((p) => ({ ...p, images: [...p.images, u] }));
                      setPhotoUrlInput("");
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">{activeCat.titleLabel}</label>
                <input
                  className="st-input"
                  placeholder={activeCat.titlePlaceholder}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">{activeCat.bldgLabel}</label>
                  <input
                    className="st-input"
                    placeholder={activeCat.bldgPlaceholder}
                    value={form.building}
                    onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))}
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">Khu vực</label>
                  <select className="st-select" value={form.areaName} onChange={(e) => setForm((p) => ({ ...p, areaName: e.target.value }))}>
                    {AREAS.map((a) => (
                      <option key={a.val} value={a.val}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {activeCat.bldgPresets.length > 0 && (
                <div className="st-preset-chips">
                  {activeCat.bldgPresets.map((bp) => (
                    <button
                      key={bp}
                      type="button"
                      className={`st-preset-chip ${form.building === bp ? "active" : ""}`}
                      onClick={() => setForm((p) => ({ ...p, building: bp }))}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              )}

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Trạng thái</label>
                  <select className="st-select" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="Available">Còn trống</option>
                    <option value="Reserved">Giữ chỗ</option>
                    <option value="Rented">Đã thuê</option>
                    <option value="Hidden">Đang ẩn</option>
                  </select>
                </div>
                <div className="st-field">
                  <label className="st-label">Hiển thị Web</label>
                  <select
                    className="st-select"
                    value={form.isVisible ? "yes" : "no"}
                    onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.value === "yes" }))}
                  >
                    <option value="yes">Đang hiện công khai</option>
                    <option value="no">Ẩn khỏi Web khách</option>
                  </select>
                </div>
              </div>

              <div className="st-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="st-label">Địa chỉ hiển thị (hoặc dán link Google Maps vào đây)</label>
                  {/^https?:\/\//i.test(form.address.trim()) && (
                    <button
                      type="button"
                      className="st-btn-mini st-btn-mini--bronze"
                      style={{ height: 24, fontSize: 11 }}
                      disabled={resolvingMap}
                      onClick={() => void resolveMapLinkIntoForm(form.address)}
                    >
                      {resolvingMap ? "Đang lấy địa chỉ..." : "📍 Nhận địa chỉ từ Link"}
                    </button>
                  )}
                </div>
                <input
                  className="st-input"
                  placeholder="Nhập địa chỉ hoặc dán link https://maps.app.goo.gl/... tự nhận"
                  value={form.address}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((p) => ({ ...p, address: val }));
                    if (/^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl|(?:www\.|maps\.)?google\.)/i.test(val.trim())) {
                      void resolveMapLinkIntoForm(val);
                    }
                  }}
                />
                {resolvingMap && (
                  <div style={{ fontSize: 11.5, color: "var(--bronze)", fontWeight: 700, marginTop: 2 }}>
                    ⏳ Đang giải mã link Google Maps sang địa chỉ đường phố & tọa độ chính xác...
                  </div>
                )}
              </div>

              {/* Map Picker */}
              <div className="st-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="st-label">
                    Vị trí bản đồ {form.hasPin ? `(${form.lat}, ${form.lng})` : "(Chạm để thả ghim)"}
                  </span>
                  <button
                    type="button"
                    className="st-btn-mini"
                    style={{ height: 28 }}
                    onClick={() => {
                      navigator.geolocation?.getCurrentPosition(
                        (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          setForm((p) => ({ ...p, lat, lng, hasPin: true }));
                          markerObjRef.current?.setLatLng([lat, lng]);
                          mapObjRef.current?.setView([lat, lng], 16);
                          showToast("Đã lấy tọa độ GPS!");
                        },
                        () => showToast("Không lấy được GPS — chạm trực tiếp lên bản đồ.")
                      );
                    }}
                  >
                    <Icon.Pin /> GPS tôi
                  </button>
                </div>
                <div ref={mapContainerRef} className="st-map-picker" />
              </div>

              {/* Price VND <-> USD */}
              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Giá thuê (Triệu VNĐ/th)</label>
                  <input
                    className="st-input"
                    inputMode="decimal"
                    value={form.priceVndTr}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val.replace(",", "."));
                      setForm((p) => ({
                        ...p,
                        priceVndTr: val,
                        ...(num > 0 ? { priceUsd: String(Math.round((num * 1_000_000) / RATE_VND)) } : {})
                      }));
                    }}
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">USD / tháng</label>
                  <input
                    className="st-input"
                    inputMode="numeric"
                    value={form.priceUsd}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val);
                      setForm((p) => ({
                        ...p,
                        priceUsd: val,
                        ...(num > 0 ? { priceVndTr: ((num * RATE_VND) / 1_000_000).toFixed(1).replace(/\.0$/, "") } : {})
                      }));
                    }}
                  />
                </div>
              </div>

              {activeCat.hasLandArea ? (
                <div className="st-row-2">
                  <div className="st-field">
                    <label className="st-label">Diện tích đất (m²)</label>
                    <input
                      className="st-input"
                      inputMode="decimal"
                      placeholder="VD: 100"
                      value={form.landAreaM2}
                      onChange={(e) => setForm((p) => ({ ...p, landAreaM2: e.target.value }))}
                    />
                  </div>
                  <div className="st-field">
                    <label className="st-label">{activeCat.sizeLabel}</label>
                    <input
                      className="st-input"
                      inputMode="decimal"
                      placeholder="VD: 240"
                      value={form.sizeM2}
                      onChange={(e) => setForm((p) => ({ ...p, sizeM2: e.target.value }))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="st-row-3">
                <div className="st-field">
                  <label className="st-label">Phòng ngủ</label>
                  <input className="st-input" inputMode="numeric" value={form.bedrooms} onChange={(e) => setForm((p) => ({ ...p, bedrooms: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">WC</label>
                  <input className="st-input" inputMode="numeric" value={form.bathrooms} onChange={(e) => setForm((p) => ({ ...p, bathrooms: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">{activeCat.hasLandArea ? activeCat.floorLabel : activeCat.sizeLabel}</label>
                  <input
                    className="st-input"
                    inputMode="decimal"
                    value={activeCat.hasLandArea ? form.floor : form.sizeM2}
                    onChange={(e) =>
                      setForm((p) => (activeCat.hasLandArea ? { ...p, floor: e.target.value } : { ...p, sizeM2: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className={activeCat.hasLandArea ? "st-row-2" : "st-row-3"}>
                {!activeCat.hasLandArea && (
                  <div className="st-field">
                    <label className="st-label">{activeCat.floorLabel}</label>
                    <input className="st-input" inputMode="numeric" value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))} />
                  </div>
                )}
                <div className="st-field">
                  <label className="st-label">HĐ tối thiểu (tháng)</label>
                  <input className="st-input" inputMode="numeric" value={form.minLeaseMonths} onChange={(e) => setForm((p) => ({ ...p, minLeaseMonths: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">Cọc (tháng)</label>
                  <input className="st-input" inputMode="numeric" value={form.depositMonths} onChange={(e) => setForm((p) => ({ ...p, depositMonths: e.target.value }))} />
                </div>
              </div>

              {/* Category-Specific Dynamic Attributes Box */}
              <div className="st-cat-attr-box">
                <div className="st-cat-attr-head">
                  <Icon.Category type={form.propertyType} size={14} />
                  <span>Thuộc tính chuẩn: {PROPERTY_CATEGORIES.find((c) => c.val === form.propertyType)?.label}</span>
                </div>
                {activeCat.attrs.map((attr) => (
                  <div key={attr.key} className="st-field">
                    <label className="st-label">{attr.label}</label>
                    <input
                      className="st-input"
                      placeholder={attr.placeholder}
                      value={form[attr.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [attr.key]: e.target.value }))}
                    />
                    <div className="st-preset-chips">
                      {attr.presets.map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          className={`st-preset-chip ${form[attr.key] === pr ? "active" : ""}`}
                          onClick={() => setForm((p) => ({ ...p, [attr.key]: pr }))}
                        >
                          {pr}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="st-field">
                <label className="st-label">Ngày có thể vào ở (Tùy chọn)</label>
                <input type="date" className="st-input" value={form.availableFrom} onChange={(e) => setForm((p) => ({ ...p, availableFrom: e.target.value }))} />
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Giá điện</label>
                  <input className="st-input" value={form.electricityRate} onChange={(e) => setForm((p) => ({ ...p, electricityRate: e.target.value }))} />
                  {activeCat.elecPresets.length > 0 && (
                    <div className="st-preset-chips">
                      {activeCat.elecPresets.map((ep) => (
                        <button key={ep} type="button" className="st-preset-chip" onClick={() => setForm((p) => ({ ...p, electricityRate: ep }))}>
                          {ep}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="st-field">
                  <label className="st-label">Thú cưng</label>
                  <input className="st-input" value={form.petPolicy} onChange={(e) => setForm((p) => ({ ...p, petPolicy: e.target.value }))} />
                </div>
              </div>

              <div className="st-field">
                <span className="st-label">Tiện ích nổi bật ({getAptCategoryLabel(form.propertyType)})</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {activeCat.tags.map((tag) => {
                    const on = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        className={`st-chip ${on ? "active" : ""}`}
                        style={{ height: 30, fontSize: 11.5 }}
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            tags: on ? p.tags.filter((t) => t !== tag) : [...p.tags, tag]
                          }))
                        }
                      >
                        {on ? "✓ " : ""}{tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Mô tả chi tiết</label>
                <textarea
                  className="st-textarea"
                  placeholder="Nội thất, ánh sáng, bàn làm việc, tiện ích xung quanh..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              {/* Private Landlord & Internal Admin Note Box */}
              <div className="st-cat-attr-box" style={{ background: "var(--surface-soft)" }}>
                <div className="st-cat-attr-head" style={{ color: "var(--navy)" }}>
                  <Icon.Lock />
                  <span>Thông tin chủ nhà & Ghi chú nội bộ (Bảo mật — không hiện lên Web)</span>
                </div>
                <div className="st-row-2">
                  <div className="st-field">
                    <label className="st-label">Tên chủ nhà / Quản lý</label>
                    <input
                      className="st-input"
                      placeholder="VD: Chị Lan chủ nhà"
                      value={form.landlordName}
                      onChange={(e) => setForm((p) => ({ ...p, landlordName: e.target.value }))}
                    />
                  </div>
                  <div className="st-field">
                    <label className="st-label">SĐT / Zalo chủ nhà</label>
                    <input
                      className="st-input"
                      placeholder="0905xxxxxx"
                      value={form.landlordPhone}
                      onChange={(e) => setForm((p) => ({ ...p, landlordPhone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="st-field">
                  <label className="st-label">Ghi chú nội bộ (Mã khóa cửa, hoa hồng, lưu ý...)</label>
                  <input
                    className="st-input"
                    placeholder="VD: Pass cửa 2580#, hoa hồng 1 tháng..."
                    value={form.adminNote}
                    onChange={(e) => setForm((p) => ({ ...p, adminNote: e.target.value }))}
                  />
                </div>
              </div>

              <button type="submit" className="st-btn st-btn--primary" disabled={savingApt}>
                {savingApt ? "Đang lưu & đồng bộ lên Web..." : editingCode ? "Lưu Thay Đổi" : "Đăng Bất Động Sản Lên Web"}
              </button>

              {editingCode && (
                <button type="button" className="st-btn st-btn--danger" onClick={() => handleDeleteApt(editingCode)}>
                  <Icon.Trash /> Xóa Vĩnh Viễn BĐS Này
                </button>
              )}
            </form>
          </div>
        </div>
        );
      })()}

      {/* ================= MODAL 5: CUSTOMER / LEAD CREATE & EDIT ================= */}
      {leadModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setLeadModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingLeadId ? "Sửa Thông Tin Khách Hàng" : "Thêm Khách Hàng Mới"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setLeadModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveLead}>
              <div className="st-field">
                <label className="st-label">Tên khách hàng *</label>
                <input
                  className="st-input"
                  placeholder="VD: Anh Minh / David Kim"
                  value={leadForm.clientName}
                  onChange={(e) => setLeadForm((p) => ({ ...p, clientName: e.target.value }))}
                  required
                />
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">SĐT / @Telegram / Zalo</label>
                  <input
                    className="st-input"
                    placeholder="0905xxxxxx"
                    value={leadForm.contactHandle}
                    onChange={(e) => setLeadForm((p) => ({ ...p, contactHandle: e.target.value }))}
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">Kênh liên hệ</label>
                  <select className="st-select" value={leadForm.messenger} onChange={(e) => setLeadForm((p) => ({ ...p, messenger: e.target.value }))}>
                    <option value="Zalo">Zalo</option>
                    <option value="Telegram">Telegram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Điện thoại">Điện thoại</option>
                    <option value="Website">Website</option>
                  </select>
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Căn hộ quan tâm</label>
                <select
                  className="st-select"
                  value={leadForm.apartmentCode}
                  onChange={(e) => setLeadForm((p) => ({ ...p, apartmentCode: e.target.value }))}
                >
                  <option value="CURATED-SHORTLIST">Tư vấn chung / Chưa chọn căn</option>
                  {(report?.apartments || []).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {titleOf(a).slice(0, 38)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Trạng thái</label>
                  <select className="st-select" value={leadForm.status} onChange={(e) => setLeadForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="New">Mới</option>
                    <option value="Contacted">Đã liên hệ</option>
                    <option value="Viewing_Scheduled">Đã hẹn xem</option>
                    <option value="Rented_Closed">Đã chốt thuê</option>
                    <option value="Cancelled">Đã hủy</option>
                  </select>
                </div>
                <div className="st-field">
                  <label className="st-label">Ngân sách dự kiến</label>
                  <input
                    className="st-input"
                    placeholder="VD: 15-20tr"
                    value={leadForm.budgetUsd}
                    onChange={(e) => setLeadForm((p) => ({ ...p, budgetUsd: e.target.value }))}
                  />
                </div>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Ngày giờ hẹn xem</label>
                  <input
                    type="datetime-local"
                    className="st-input"
                    value={leadForm.viewingTime}
                    onChange={(e) => setLeadForm((p) => ({ ...p, viewingTime: e.target.value }))}
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">Ngày dự kiến vào ở</label>
                  <input
                    type="date"
                    className="st-input"
                    value={leadForm.moveInDate}
                    onChange={(e) => setLeadForm((p) => ({ ...p, moveInDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Ghi chú nhu cầu của khách</label>
                <textarea
                  className="st-textarea"
                  placeholder="Yêu cầu view, thú cưng, thời hạn thuê..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <div className="st-field">
                <label className="st-label">Ghi chú nội bộ Admin (Lịch sử trao đổi, căn đã gửi...)</label>
                <textarea
                  className="st-textarea"
                  style={{ minHeight: 64 }}
                  placeholder="VD: Đã gửi 3 căn Hòa Xuân qua Zalo, hẹn chiều T7 đi xem..."
                  value={leadForm.adminNotes}
                  onChange={(e) => setLeadForm((p) => ({ ...p, adminNotes: e.target.value }))}
                />
              </div>

              <button type="submit" className="st-btn st-btn--primary" disabled={savingLead}>
                {savingLead ? "Đang lưu..." : editingLeadId ? "Lưu Cập Nhật Khách" : "Thêm Khách Hàng"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: LEASE CREATE & EDIT ================= */}
      {leaseModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setLeaseModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingLeaseCode ? `Sửa Hợp Đồng ${editingLeaseCode}` : "Tạo Hợp Đồng Khách Thuê"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setLeaseModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveLease}>
              <div className="st-field">
                <label className="st-label">Căn hộ *</label>
                <select
                  className="st-select"
                  value={leaseForm.apartmentCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const apt = report?.apartments.find((a) => a.code === code);
                    setLeaseForm((p) => ({
                      ...p,
                      apartmentCode: code,
                      ...(apt
                        ? {
                            priceUsd: String(apt.priceUsd),
                            priceVndTr: (apt.priceVnd / 1_000_000).toFixed(1).replace(/\.0$/, "")
                          }
                        : {})
                    }));
                  }}
                >
                  {(report?.apartments || []).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {titleOf(a).slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="st-field">
                <label className="st-label">Tên khách thuê *</label>
                <input
                  className="st-input"
                  value={leaseForm.tenantName}
                  onChange={(e) => setLeaseForm((p) => ({ ...p, tenantName: e.target.value }))}
                  required
                />
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">SĐT / Telegram / Zalo</label>
                  <input
                    className="st-input"
                    value={leaseForm.tenantContact}
                    onChange={(e) => setLeaseForm((p) => ({ ...p, tenantContact: e.target.value }))}
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">Trạng thái HĐ</label>
                  <select className="st-select" value={leaseForm.status} onChange={(e) => setLeaseForm((p) => ({ ...p, status: e.target.value }))}>
                    <option value="Active">Đang thuê</option>
                    <option value="Ended">Đã trả phòng</option>
                  </select>
                </div>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Giá thuê (Triệu VNĐ/th)</label>
                  <input
                    className="st-input"
                    inputMode="decimal"
                    value={leaseForm.priceVndTr}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val.replace(",", "."));
                      setLeaseForm((p) => ({
                        ...p,
                        priceVndTr: val,
                        ...(num > 0 ? { priceUsd: String(Math.round((num * 1_000_000) / RATE_VND)) } : {})
                      }));
                    }}
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">USD / tháng</label>
                  <input
                    className="st-input"
                    inputMode="numeric"
                    value={leaseForm.priceUsd}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val);
                      setLeaseForm((p) => ({
                        ...p,
                        priceUsd: val,
                        ...(num > 0 ? { priceVndTr: ((num * RATE_VND) / 1_000_000).toFixed(1).replace(/\.0$/, "") } : {})
                      }));
                    }}
                  />
                </div>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Ngày bắt đầu</label>
                  <input type="date" className="st-input" value={leaseForm.startDate} onChange={(e) => setLeaseForm((p) => ({ ...p, startDate: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">Ngày kết thúc</label>
                  <input type="date" className="st-input" value={leaseForm.endDate} onChange={(e) => setLeaseForm((p) => ({ ...p, endDate: e.target.value }))} />
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Ghi chú (tạm trú NA17, ngày thu tiền...)</label>
                <textarea className="st-textarea" value={leaseForm.notes} onChange={(e) => setLeaseForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>

              <button type="submit" className="st-btn st-btn--green" disabled={savingLease}>
                {savingLease ? "Đang lưu..." : editingLeaseCode ? "Lưu Cập Nhật Hợp Đồng" : "Lưu Hợp Đồng & Chuyển Đã Thuê"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 7: TOUR PHOTO CREATE / EDIT ================= */}
      {tourPhotoModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setTourPhotoModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingTourPhotoId ? "Sửa Ảnh Dẫn Khách" : "Thêm Ảnh Dẫn Khách"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setTourPhotoModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveTourPhoto}>
              {tourPhotoForm.image && (
                <img
                  src={tourPhotoForm.image}
                  alt=""
                  style={{ width: "100%", height: 185, objectFit: "cover", borderRadius: 14, border: "1px solid var(--border)" }}
                />
              )}
              <label className="st-btn st-btn--outline" style={{ cursor: "pointer" }}>
                <Icon.Image size={15} /> {uploadingAbout ? "Đang tải ảnh..." : tourPhotoForm.image ? "Đổi ảnh khác từ ĐT" : "Chọn ảnh từ điện thoại"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={uploadingAbout}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingAbout(true);
                    try {
                      const u = await uploadSingleImage(file);
                      if (u) setTourPhotoForm((p) => ({ ...p, image: u }));
                    } finally {
                      setUploadingAbout(false);
                      e.target.value = "";
                    }
                  }}
                />
              </label>

              <div className="st-field">
                <label className="st-label">Nhãn khu vực / hoạt động</label>
                <input
                  className="st-input"
                  placeholder="VD: An Thượng · Dẫn khách xem nhà"
                  value={tourPhotoForm.tag}
                  onChange={(e) => setTourPhotoForm((p) => ({ ...p, tag: e.target.value }))}
                />
              </div>

              <div className="st-field">
                <label className="st-label">Chú thích ảnh (Viết Tiếng Việt — tự dịch 6 ngôn ngữ)</label>
                <textarea
                  className="st-textarea"
                  placeholder="VD: Bàn giao chìa khóa căn hộ 2PN view sông Hàn cho khách Nhật..."
                  value={tourPhotoForm.caption}
                  onChange={(e) => setTourPhotoForm((p) => ({ ...p, caption: e.target.value }))}
                />
              </div>

              <button type="submit" className="st-btn st-btn--primary" disabled={savingTourPhoto}>
                {savingTourPhoto ? "Đang lưu & dịch 6 ngôn ngữ..." : editingTourPhotoId ? "Lưu Cập Nhật Ảnh" : "Đăng Ảnh Lên Trang About"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 8: CUSTOMER FEEDBACK CREATE / EDIT ================= */}
      {fbModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setFbModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingFbId ? "Sửa Feedback Khách Hàng" : "Thêm Feedback Khách Hàng"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setFbModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveFeedback}>
              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Tên khách hàng *</label>
                  <input
                    className="st-input"
                    placeholder="VD: Alex & Sarah"
                    value={fbForm.clientName}
                    onChange={(e) => setFbForm((p) => ({ ...p, clientName: e.target.value }))}
                    required
                  />
                </div>
                <div className="st-field">
                  <label className="st-label">Căn hộ / Thời hạn</label>
                  <input
                    className="st-input"
                    placeholder="VD: The Panoma 2 · 12 tháng"
                    value={fbForm.subtitle}
                    onChange={(e) => setFbForm((p) => ({ ...p, subtitle: e.target.value }))}
                  />
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Số sao đánh giá</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`st-chip ${fbForm.rating >= star ? "active" : ""}`}
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setFbForm((p) => ({ ...p, rating: star }))}
                    >
                      {star} ★
                    </button>
                  ))}
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Nội dung đánh giá (Viết Tiếng Việt — tự dịch 6 ngôn ngữ)</label>
                <textarea
                  className="st-textarea"
                  placeholder="Khách khen đội ngũ hỗ trợ tận tâm, căn hộ đúng ảnh..."
                  value={fbForm.quote}
                  onChange={(e) => setFbForm((p) => ({ ...p, quote: e.target.value }))}
                />
              </div>

              <div className="st-field">
                <label className="st-label">Ảnh Avatar khách hàng (Hiển thị tròn trên slide)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {fbForm.avatar ? (
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <img src={fbForm.avatar} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bronze)" }} />
                      <button
                        type="button"
                        className="st-photo-del"
                        style={{ top: -4, right: -4, width: 20, height: 20, fontSize: 11 }}
                        onClick={() => setFbForm((p) => ({ ...p, avatar: "" }))}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--navy)", color: "var(--bronze-light)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                      {(fbForm.clientName || "K").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label className="st-btn st-btn--outline" style={{ cursor: "pointer", height: 40 }}>
                    <Icon.Image size={15} /> {uploadingAbout ? "Đang tải..." : fbForm.avatar ? "Đổi Avatar khách" : "Tải Avatar khách từ ĐT"}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      disabled={uploadingAbout}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAbout(true);
                        try {
                          const u = await uploadSingleImage(file);
                          if (u) setFbForm((p) => ({ ...p, avatar: u }));
                        } finally {
                          setUploadingAbout(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="st-field">
                <label className="st-label">Ảnh chụp màn hình feedback / Ảnh bàn giao (Tùy chọn)</label>
                {fbForm.image && (
                  <div style={{ position: "relative" }}>
                    <img
                      src={fbForm.image}
                      alt=""
                      style={{ width: "100%", maxHeight: 170, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                    />
                    <button
                      type="button"
                      className="st-photo-del"
                      onClick={() => setFbForm((p) => ({ ...p, image: "" }))}
                    >
                      ×
                    </button>
                  </div>
                )}
                <label className="st-btn st-btn--outline" style={{ cursor: "pointer" }}>
                  <Icon.Image size={15} /> {uploadingAbout ? "Đang tải ảnh..." : fbForm.image ? "Đổi ảnh feedback" : "Tải ảnh chụp màn hình / ảnh khách"}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={uploadingAbout}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingAbout(true);
                      try {
                        const u = await uploadSingleImage(file);
                        if (u) setFbForm((p) => ({ ...p, image: u }));
                      } finally {
                        setUploadingAbout(false);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>

              <button type="submit" className="st-btn st-btn--primary" disabled={savingFb}>
                {savingFb ? "Đang lưu & dịch 6 ngôn ngữ..." : editingFbId ? "Lưu Cập Nhật Feedback" : "Đăng Feedback Lên Trang About"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const rootEl = document.getElementById("studio-root");
if (rootEl) {
  createRoot(rootEl).render(<StudioApp />);
}
