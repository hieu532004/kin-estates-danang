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

type TabKey = "report" | "apartments" | "leads" | "leases";

interface Apartment {
  _id: string;
  code: string;
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
  floor?: number | null;
  orientation?: string;
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
  viewingTime?: string;
  moveInDate?: string;
  notes?: string;
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

interface ReportData {
  generatedAt: string;
  kpi: {
    totalApartments: number;
    availableCount: number;
    rentedCount: number;
    reservedCount: number;
    hiddenCount: number;
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
  statusFunnel: Record<string, number>;
  channels: Array<{ name: string; count: number }>;
  expiringSoonLeases: Lease[];
  apartments: Apartment[];
  inquiries: Inquiry[];
  leases: Lease[];
  dbStatus?: { mode?: string; isNativeMongoConnected?: boolean };
}

const RATE_VND = 25480;
const AREAS = [
  { val: "Han Riverfront", label: "Ven sông Hàn" },
  { val: "An Thuong", label: "An Thượng" },
  { val: "My Khe Beachfront", label: "Biển Mỹ Khê" },
  { val: "Son Tra", label: "Sơn Trà" },
  { val: "Hải Châu", label: "Hải Châu" }
];
const QUICK_TAGS = [
  "View sông Hàn",
  "Gần biển",
  "Hồ bơi vô cực",
  "Bàn làm việc",
  "Điện EVN",
  "Gym",
  "Ban công",
  "Máy giặt",
  "Chỗ đỗ ô tô",
  "Thú cưng"
];
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
  )
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

function normalizeAreaValue(raw?: string): string {
  const s = String(raw || "").trim();
  const folded = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (folded.includes("an thuong")) return "An Thuong";
  if (folded.includes("my khe")) return "My Khe Beachfront";
  if (folded.includes("son tra")) return "Son Tra";
  if (folded.includes("hai chau")) return "Hải Châu";
  return "Han Riverfront";
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
  const [aptSelectMode, setAptSelectMode] = useState<boolean>(false);
  const [selectedApts, setSelectedApts] = useState<string[]>([]);
  const [bulkAptModalOpen, setBulkAptModalOpen] = useState<boolean>(false);
  const [bulkAptSaving, setBulkAptSaving] = useState<boolean>(false);
  const [bulkAptForm, setBulkAptForm] = useState({
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

  // Leads filters, multi-select & CRUD modal
  const [leadSearch, setLeadSearch] = useState<string>("");
  const [leadSubTab, setLeadSubTab] = useState<"all" | "viewings" | "bookings">("all");
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
    notes: ""
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
    floor: "15",
    orientation: "Đông Nam",
    availableFrom: "",
    minLeaseMonths: "6",
    depositMonths: "1",
    electricityRate: "Giá nhà nước (EVN ~2,800đ/kWh)",
    waterRate: "Giá nhà nước",
    wifiIncluded: true,
    petPolicy: "Thương lượng (Cho phép thú cưng nhỏ)",
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

  const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const h: Record<string, string> = { ...extra };
    if (token) h.Authorization = `Bearer ${token}`;
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) h["X-Telegram-Init-Data"] = initData;
    return h;
  };

  const loadReport = async (overrideToken?: string) => {
    setLoading(true);
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
        setAuthed(true);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
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
  const openCreateEditor = () => {
    setEditingCode(null);
    setPhotoUrlInput("");
    setForm({
      title: "",
      building: "",
      areaName: "Han Riverfront",
      address: "",
      status: "Available",
      isVisible: true,
      priceVndTr: "18",
      priceUsd: String(Math.round(18_000_000 / RATE_VND)),
      bedrooms: "2",
      bathrooms: "2",
      sizeM2: "70",
      floor: "15",
      orientation: "Đông Nam",
      availableFrom: "",
      minLeaseMonths: "6",
      depositMonths: "1",
      electricityRate: "Giá nhà nước (EVN ~2,800đ/kWh)",
      waterRate: "Giá nhà nước",
      wifiIncluded: true,
      petPolicy: "Thương lượng (Cho phép thú cưng nhỏ)",
      tags: ["View sông Hàn", "Bàn làm việc", "Điện EVN"],
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
    setForm({
      title: titleOf(apt),
      building: apt.building || "",
      areaName: normalizeAreaValue(apt.areaName),
      address: apt.address || "",
      status: apt.status || "Available",
      isVisible: apt.isVisible !== false && apt.status !== "Hidden",
      priceVndTr: vndTr,
      priceUsd: String(apt.priceUsd || ""),
      bedrooms: String(apt.bedrooms ?? 1),
      bathrooms: String(apt.bathrooms ?? 1),
      sizeM2: String(apt.sizeM2 ?? 60),
      floor: String(apt.floor ?? 10),
      orientation: apt.orientation || "",
      availableFrom: apt.availableFrom || "",
      minLeaseMonths: String(apt.minLeaseMonths ?? 6),
      depositMonths: String(apt.depositMonths ?? 1),
      electricityRate: apt.electricityRate || "",
      waterRate: apt.waterRate || "",
      wifiIncluded: apt.wifiIncluded !== false,
      petPolicy: apt.petPolicy || "",
      tags: Array.isArray(apt.tags) ? apt.tags : [],
      notes: notesOf(apt),
      images: Array.isArray(apt.images) ? apt.images : [],
      lat: apt.coordinates?.lat ?? 16.0545,
      lng: apt.coordinates?.lng ?? 108.2345,
      hasPin: Boolean(apt.coordinates && apt.locationAccuracy === "exact")
    });
    setEditorOpen(true);
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
      const payload: any = {
        title: form.title.trim(),
        building: form.building.trim() || "KIN Estates Residence",
        areaName: form.areaName,
        address: form.address.trim(),
        status: form.status,
        isVisible: form.status === "Hidden" ? false : form.isVisible,
        priceVnd: vnd || Math.round(usd * RATE_VND),
        priceUsd: usd || Math.round(vnd / RATE_VND),
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        sizeM2: Number(form.sizeM2) || 60,
        floor: Number(form.floor) || 10,
        orientation: form.orientation.trim(),
        availableFrom: form.availableFrom || null,
        minLeaseMonths: Number(form.minLeaseMonths) || 6,
        depositMonths: Number(form.depositMonths) || 1,
        electricityRate: form.electricityRate.trim(),
        waterRate: form.waterRate.trim(),
        wifiIncluded: form.wifiIncluded,
        petPolicy: form.petPolicy.trim(),
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
      showToast(editingCode ? "Đã lưu & đồng bộ ngay lên Web!" : "Đã đăng căn mới & dịch 6 ngôn ngữ!");
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
      notes: ""
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
      notes: inq.notes || ""
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

  /* ======================= FILTERED LISTS ======================= */
  const filteredApartments = useMemo(() => {
    const list = report?.apartments || [];
    const q = aptSearch.trim().toLowerCase();
    return list.filter((a) => {
      const hidden = a.isVisible === false || a.status === "Hidden";
      if (aptFilter === "available" && (hidden || a.status !== "Available")) return false;
      if (aptFilter === "reserved" && a.status !== "Reserved") return false;
      if (aptFilter === "rented" && a.status !== "Rented") return false;
      if (aptFilter === "hidden" && !hidden) return false;
      if (!q) return true;
      return [a.code, titleOf(a), a.building, a.address, a.areaName, areaDisplayLabel(a.areaName)].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [report, aptSearch, aptFilter]);

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
      if (!q) return true;
      return [i.clientName, i.contactHandle, i.code, i.apartmentCode, i.notes, i.messenger].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [report, leadSubTab, leadAptFilter, leadSearch]);

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
              Cloud 24/7
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
              <button type="button" className="st-quick-btn st-quick-btn--primary" onClick={openCreateEditor}>
                <span className="st-quick-icon"><Icon.Plus size={18} /></span>
                <span>Thêm căn hộ</span>
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
                <div className="st-kpi-note">Tổng {kpi.totalApartments} căn · {kpi.hiddenCount} đang ẩn</div>
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

            <div className="st-chips">
              {[
                ["all", `Tất cả (${report?.apartments.length || 0})`],
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

            {filteredApartments.length === 0 ? (
              <div className="st-empty">Không có căn hộ phù hợp bộ lọc.</div>
            ) : (
              filteredApartments.map((apt) => {
                const isHidden = apt.isVisible === false || apt.status === "Hidden";
                const isAvail = apt.status === "Available";
                const people = apt.contactSummary?.people || 0;
                const isSelected = selectedApts.includes(apt.code);

                return (
                  <article
                    key={apt.code}
                    className={`st-apt-card ${isSelected ? "selected" : ""}`}
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
                        <div className="st-apt-meta">
                          {apt.bedrooms ?? "-"} PN · {apt.sizeM2 ?? "-"} m² · {areaDisplayLabel(apt.areaName)}
                        </div>
                        <div className="st-apt-badges">
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
              <div className="st-chips">
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
            )}

            {filteredLeads.length === 0 ? (
              <div className="st-empty">Chưa có khách hàng nào trong danh sách.</div>
            ) : (
              filteredLeads.map((inq) => {
                const leadKey = inq.code || inq._id;
                const isBooking = ["reservation", "booking"].includes(inq.type);
                const link = contactHref(inq.contactHandle, inq.messenger);
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
                          <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--navy)" }}>
                            {inq.clientName || "Khách hàng"}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>
                            {inq.code} · {isBooking ? "Đặt giữ chỗ" : "Hẹn xem"} · <b>{inq.apartmentCode}</b>
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
                      {inq.viewingTime && (
                        <span className="st-badge st-badge--amber">
                          <Icon.Calendar /> {inq.viewingTime}
                        </span>
                      )}
                      {inq.moveInDate && <span className="st-badge st-badge--gray">Vào ở: {inq.moveInDate}</span>}
                    </div>

                    {inq.notes && (
                      <div style={{ fontSize: 12.5, color: "var(--text-sub)", background: "var(--surface-soft)", padding: "8px 10px", borderRadius: 10 }}>
                        {inq.notes}
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
                setBulkAptForm({ status: "", visibility: "", areaName: "", priceMode: "", priceValue: "" });
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
        <button type="button" className="st-fab" onClick={openCreateEditor}>
          <Icon.Plus size={16} /> Thêm căn
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

      {/* BOTTOM 4-TAB NAVIGATION */}
      <nav className="st-bottom-nav" aria-label="Điều hướng quản trị">
        <button type="button" className={`st-nav-item ${tab === "report" ? "active" : ""}`} onClick={() => setTab("report")}>
          <Icon.Chart />
          <span>Tổng quan</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "apartments" ? "active" : ""}`} onClick={() => setTab("apartments")}>
          <Icon.Home />
          <span>Căn hộ</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "leads" ? "active" : ""}`} onClick={() => setTab("leads")}>
          <Icon.Users />
          <span>Khách hàng</span>
          {pendingAlertCount > 0 && <span className="st-nav-dot">{pendingAlertCount}</span>}
        </button>
        <button type="button" className={`st-nav-item ${tab === "leases" ? "active" : ""}`} onClick={() => setTab("leases")}>
          <Icon.Key />
          <span>Hợp đồng</span>
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

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Trạng thái căn hộ</label>
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
      {editorOpen && (
        <div className="st-modal-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingCode ? `Sửa căn ${editingCode}` : "Đăng Căn Hộ Mới"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setEditorOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveApartment}>
              <div style={{ background: "var(--green-bg)", color: "var(--green)", fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 12 }}>
                Lưu thẳng lên Cloud 24/7 — tự động dịch 6 ngôn ngữ & cập nhật Web ngay lập tức.
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
                <label className="st-label">Tên căn hộ *</label>
                <input
                  className="st-input"
                  placeholder="VD: The Panoma 2 — Căn góc 2PN View Sông Hàn"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Tòa nhà / Dự án</label>
                  <input className="st-input" placeholder="VD: The Panoma" value={form.building} onChange={(e) => setForm((p) => ({ ...p, building: e.target.value }))} />
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
                <label className="st-label">Địa chỉ hiển thị</label>
                <input
                  className="st-input"
                  placeholder="VD: 58 Trần Thị Lý, Ngũ Hành Sơn, Đà Nẵng"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
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
                  <label className="st-label">Diện tích m²</label>
                  <input className="st-input" inputMode="decimal" value={form.sizeM2} onChange={(e) => setForm((p) => ({ ...p, sizeM2: e.target.value }))} />
                </div>
              </div>

              <div className="st-row-3">
                <div className="st-field">
                  <label className="st-label">Tầng</label>
                  <input className="st-input" inputMode="numeric" value={form.floor} onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">HĐ tối thiểu</label>
                  <input className="st-input" inputMode="numeric" value={form.minLeaseMonths} onChange={(e) => setForm((p) => ({ ...p, minLeaseMonths: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">Cọc (tháng)</label>
                  <input className="st-input" inputMode="numeric" value={form.depositMonths} onChange={(e) => setForm((p) => ({ ...p, depositMonths: e.target.value }))} />
                </div>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Hướng / View</label>
                  <input className="st-input" value={form.orientation} onChange={(e) => setForm((p) => ({ ...p, orientation: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">Ngày vào ở</label>
                  <input type="date" className="st-input" value={form.availableFrom} onChange={(e) => setForm((p) => ({ ...p, availableFrom: e.target.value }))} />
                </div>
              </div>

              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">Giá điện</label>
                  <input className="st-input" value={form.electricityRate} onChange={(e) => setForm((p) => ({ ...p, electricityRate: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">Thú cưng</label>
                  <input className="st-input" value={form.petPolicy} onChange={(e) => setForm((p) => ({ ...p, petPolicy: e.target.value }))} />
                </div>
              </div>

              <div className="st-field">
                <span className="st-label">Tiện ích nổi bật</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {QUICK_TAGS.map((tag) => {
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

              <button type="submit" className="st-btn st-btn--primary" disabled={savingApt}>
                {savingApt ? "Đang lưu & dịch 6 ngôn ngữ..." : editingCode ? "Lưu Thay Đổi" : "Đăng Căn Hộ Lên Web"}
              </button>

              {editingCode && (
                <button type="button" className="st-btn st-btn--danger" onClick={() => handleDeleteApt(editingCode)}>
                  <Icon.Trash /> Xóa Vĩnh Viễn Căn Hộ Này
                </button>
              )}
            </form>
          </div>
        </div>
      )}

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
                <label className="st-label">Ghi chú nhu cầu</label>
                <textarea
                  className="st-textarea"
                  placeholder="Yêu cầu view, thú cưng, thời hạn thuê..."
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm((p) => ({ ...p, notes: e.target.value }))}
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
    </div>
  );
}

const rootEl = document.getElementById("studio-root");
if (rootEl) {
  createRoot(rootEl).render(<StudioApp />);
}
