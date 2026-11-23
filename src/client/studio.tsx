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

type TabKey = "report" | "apartments" | "leads" | "leases" | "tools";

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
  dbStatus?: { mode?: string };
  botStatus?: { connected?: boolean; mode?: string };
}

const RATE_VND = 25480;
const AREAS = [
  { val: "Han Riverfront", label: "Ven sông Hàn" },
  { val: "An Thuong", label: "An Thượng" },
  { val: "Son Tra", label: "Sơn Trà" },
  { val: "My Khe Beachfront", label: "Biển Mỹ Khê" }
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

function contactHref(handle?: string, messenger?: string): { href: string; label: string } | null {
  const raw = String(handle || "").trim();
  if (!raw || /^bấm liên hệ/i.test(raw)) return null;
  const digits = raw.replace(/\D/g, "");
  const m = String(messenger || "").toLowerCase();
  if (raw.startsWith("@") || m.includes("telegram")) {
    const u = raw.replace(/^@/, "").replace(/^https?:\/\/t\.me\//i, "");
    if (u && !/^\d+$/.test(u)) return { href: `https://t.me/${u}`, label: `💬 Telegram @${u}` };
  }
  if (m.includes("zalo") && digits.length >= 9) {
    return { href: `https://zalo.me/${digits}`, label: `💬 Zalo ${raw}` };
  }
  if (m.includes("whatsapp") && digits.length >= 9) {
    const intl = digits.startsWith("0") ? `84${digits.slice(1)}` : digits;
    return { href: `https://wa.me/${intl}`, label: `💬 WhatsApp ${raw}` };
  }
  if (digits.length >= 8) {
    return { href: `tel:${raw.replace(/\s+/g, "")}`, label: `📞 Gọi ${raw}` };
  }
  return { href: `https://t.me/${raw.replace(/^@/, "")}`, label: `💬 ${raw}` };
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

  // Apartments filter
  const [aptSearch, setAptSearch] = useState<string>("");
  const [aptFilter, setAptFilter] = useState<string>("all");

  // Leads filter
  const [leadSubTab, setLeadSubTab] = useState<"viewings" | "bookings">("viewings");
  const [leadAptFilter, setLeadAptFilter] = useState<string>("");
  const [schedulingLead, setSchedulingLead] = useState<Inquiry | null>(null);
  const [scheduleInput, setScheduleInput] = useState<string>("");

  // Editor sheet
  const [editorOpen, setEditorOpen] = useState<boolean>(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [savingApt, setSavingApt] = useState<boolean>(false);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [form, setForm] = useState({
    title: "",
    building: "",
    areaName: "Han Riverfront",
    address: "",
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

  // Lease modal
  const [leaseModalOpen, setLeaseModalOpen] = useState<boolean>(false);
  const [leaseForm, setLeaseForm] = useState({
    apartmentCode: "",
    tenantName: "",
    tenantContact: "",
    messenger: "Telegram",
    priceUsd: "800",
    depositMonths: "1",
    paymentDay: "5",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    notes: ""
  });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<any>(null);
  const markerObjRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? "" : cur)), 3000);
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

  // Initial auth bootstrap (Telegram Mini App -> stored token -> local admin -> lock screen)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
    tg?.setHeaderColor?.("#14191F");

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
        // Try local admin auto-auth if on localhost
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
        // Show passcode lock screen
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  // Initialize Leaflet Map Picker inside Editor Sheet
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
      const map = L.map(mapContainerRef.current, { zoomControl: true, attributionControl: false }).setView([startLat, startLng], form.hasPin ? 16 : 13);
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
      setAuthError(j.error || "Sai mã khóa.");
      return;
    }
    localStorage.setItem("kin_studio_token", j.token);
    setToken(j.token);
    await loadReport(j.token);
  };

  const openCreateEditor = () => {
    setEditingCode(null);
    setForm({
      title: "",
      building: "",
      areaName: "Han Riverfront",
      address: "",
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
    const vndTr = apt.priceVnd ? (apt.priceVnd / 1_000_000).toFixed(1).replace(/\.0$/, "") : "";
    setForm({
      title: titleOf(apt),
      building: apt.building || "",
      areaName: apt.areaName || "Han Riverfront",
      address: apt.address || "",
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
        showToast(`📸 Đã tải lên ${uploaded.length} ảnh từ điện thoại!`);
      }
    } catch {
      showToast("⚠️ Có lỗi khi tải ảnh, thử lại nhé.");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
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
      showToast(editingCode ? "✅ Đã cập nhật căn hộ & dịch 6 ngôn ngữ!" : "🎉 Đã đăng căn hộ mới & dịch 6 ngôn ngữ!");
      await loadReport();
    } catch (err: any) {
      showToast(`❌ ${err.message}`);
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
    if (r.ok) {
      setEditorOpen(false);
      showToast(`🗑️ Đã xóa căn ${code}`);
      await loadReport();
    }
  };

  const updateLeadStatus = async (inq: Inquiry, updates: Record<string, any>, msg: string) => {
    const r = await fetch(`/api/inquiries/${encodeURIComponent(inq.code || inq._id)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates)
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return showToast(`⚠️ ${j.error || "Không cập nhật được"}`);
    showToast(msg);
    await loadReport();
  };

  const handleReservationAction = async (inq: Inquiry, action: "confirm" | "cancel") => {
    const r = await fetch(`/api/studio/reservations/${encodeURIComponent(inq.code || inq._id)}/${action}`, {
      method: "POST",
      headers: authHeaders()
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return showToast(`⚠️ ${j.error || "Thao tác thất bại"}`);
    showToast(action === "confirm" ? "✅ Đã xác nhận giữ chỗ!" : "🔄 Đã hủy giữ chỗ & mở trống căn!");
    await loadReport();
  };

  const handleDeleteLead = async (inq: Inquiry) => {
    if (!window.confirm(`Xóa yêu cầu của khách ${inq.clientName}?`)) return;
    const r = await fetch(`/api/inquiries/${encodeURIComponent(inq.code || inq._id)}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (r.ok) {
      showToast("🗑️ Đã xóa yêu cầu khách hàng.");
      await loadReport();
    }
  };

  const openLeaseModalFromLead = (inq?: Inquiry) => {
    const firstAvail = report?.apartments.find((a) => a.status === "Available") || report?.apartments[0];
    const targetApt = inq?.apartmentCode
      ? report?.apartments.find((a) => a.code === inq.apartmentCode)
      : firstAvail;
    setLeaseForm({
      apartmentCode: targetApt?.code || inq?.apartmentCode || "",
      tenantName: inq?.clientName || "",
      tenantContact: inq?.contactHandle || "",
      messenger: inq?.messenger || "Telegram",
      priceUsd: String(targetApt?.priceUsd || 800),
      depositMonths: String(targetApt?.depositMonths || 1),
      paymentDay: "5",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      notes: inq ? `Chốt thuê từ yêu cầu ${inq.code}` : ""
    });
    setLeaseModalOpen(true);
  };

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaseForm.apartmentCode || !leaseForm.tenantName.trim()) {
      return showToast("Nhập mã căn và tên khách thuê.");
    }
    const r = await fetch("/api/leases", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(leaseForm)
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return showToast(`⚠️ ${j.error || "Không tạo được hợp đồng"}`);
    setLeaseModalOpen(false);
    showToast("🔑 Đã tạo hợp đồng thuê & chuyển căn sang Đã thuê!");
    await loadReport();
  };

  const handleCheckoutLease = async (lease: Lease) => {
    if (!window.confirm(`Xác nhận khách ${lease.tenantName} trả phòng ${lease.apartmentCode} và mở trống lại căn hộ trên Web?`)) return;
    const r = await fetch(`/api/leases/${encodeURIComponent(lease.code)}/checkout`, {
      method: "POST",
      headers: authHeaders()
    });
    if (r.ok) {
      showToast(`🔓 Đã trả phòng & mở trống căn ${lease.apartmentCode}!`);
      await loadReport();
    }
  };

  const handleSyncWeb = async () => {
    showToast("⏳ Đang đồng bộ lên Web Live...");
    const r = await fetch("/api/studio/sync-web", { method: "POST", headers: authHeaders() });
    const j = await r.json();
    if (j.result?.pushed) showToast("🚀 Đã đẩy lên Web Live! Cập nhật sau ~15s.");
    else if (j.result?.unchanged) showToast("✅ Web Live đã có dữ liệu mới nhất!");
    else showToast("ℹ️ Hệ thống đang đồng bộ tự động.");
  };

  const handleDownloadCsv = async (endpoint: string, filename: string) => {
    const r = await fetch(endpoint, { headers: authHeaders() });
    if (!r.ok) return showToast("⚠️ Không tải được file Excel.");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`📊 Đã tải ${filename}`);
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>, endpoint: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    const r = await fetch(endpoint, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ csvText })
    });
    const j = await r.json();
    if (j.ok) {
      showToast(`✅ Đã nhập ${j.result?.createdOrUpdated || 0} dòng từ Excel!`);
      await loadReport();
    } else {
      showToast(`❌ ${j.error || "Lỗi nhập file CSV"}`);
    }
    e.target.value = "";
  };

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
      return [a.code, titleOf(a), a.building, a.address, a.areaName].some((v) =>
        String(v || "").toLowerCase().includes(q)
      );
    });
  }, [report, aptSearch, aptFilter]);

  const filteredLeads = useMemo(() => {
    const all = (report?.inquiries || []).filter((i) => i.type !== "owner_listing");
    return all.filter((i) => {
      const isBooking = ["reservation", "booking"].includes(i.type);
      if (leadAptFilter && String(i.apartmentCode || "").toUpperCase() !== leadAptFilter.toUpperCase()) return false;
      if (!leadAptFilter) {
        if (leadSubTab === "bookings" && !isBooking) return false;
        if (leadSubTab === "viewings" && isBooking) return false;
      }
      return true;
    });
  }, [report, leadSubTab, leadAptFilter]);

  if (checkingAuth) {
    return (
      <div className="st-lock-wrap">
        <div style={{ color: "#e7cfa8", fontWeight: 700, fontSize: 15 }}>Đang mở KIN Estates Studio...</div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="st-lock-wrap">
        <form className="st-lock-card" onSubmit={handleLogin}>
          <div className="st-logo" style={{ margin: "0 auto 14px", width: 52, height: 52, fontSize: 28 }}>K</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#b88c52", textTransform: "uppercase" }}>
            KIN ESTATES STUDIO
          </div>
          <h1 style={{ margin: "6px 0 6px", fontSize: 20, fontWeight: 800, color: "#14191f" }}>
            Bảng Điều Khiển Quản Lý
          </h1>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "#5c6672" }}>
            Khu vực quản trị riêng tư. Nhập mã khóa hoặc mở trực tiếp từ Bot Telegram của anh.
          </p>
          <input
            type="password"
            className="st-input"
            placeholder="Nhập mã khóa quản trị..."
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            style={{ textAlign: "center", fontSize: 16, letterSpacing: "0.12em", marginBottom: 12 }}
            autoFocus
          />
          {authError && <div style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{authError}</div>}
          <button type="submit" className="st-btn st-btn--primary">
            🔓 Mở Bảng Điều Khiển
          </button>
        </form>
      </div>
    );
  }

  const kpi = report?.kpi;
  const pendingAlertCount = (kpi?.newLeadsCount || 0) + (kpi?.pendingBookingsCount || 0);

  return (
    <div className="st-shell">
      {toast && <div className="st-toast">{toast}</div>}

      {/* Top Sticky Header */}
      <header className="st-header">
        <div className="st-brand">
          <div className="st-logo">K</div>
          <div>
            <div className="st-brand-title">KIN ESTATES</div>
            <div className="st-brand-sub">MOBILE STUDIO & BÁO CÁO</div>
          </div>
        </div>
        <div className="st-header-actions">
          <button type="button" className="st-icon-btn" onClick={() => loadReport()} disabled={loading}>
            {loading ? "⏳" : "🔄"}
          </button>
          <button type="button" className="st-icon-btn st-icon-btn--accent" onClick={openCreateEditor}>
            ＋ Đăng căn
          </button>
        </div>
      </header>

      {/* Main Views */}
      <main className="st-content">
        {/* TAB 1: DETAILED EXECUTIVE REPORT */}
        {tab === "report" && kpi && report && (
          <>
            <section className="st-hero-card">
              <div className="st-hero-label">
                <span>BÁO CÁO DOANH THU & CÔNG SUẤT</span>
                <span>{new Date(report.generatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="st-hero-revenue">{fmtVnd(kpi.activeRevenueVnd)} / tháng</div>
              <div className="st-hero-sub">
                ≈ ${kpi.activeRevenueUsd.toLocaleString("en-US")}/tháng từ {kpi.activeLeasesCount} hợp đồng hiệu lực · Tiềm năng căn trống: <b>{fmtVnd(kpi.vacantPotentialVnd)}</b>
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

            {/* 2x2 Quick KPIs */}
            <section className="st-kpi-grid">
              <button type="button" className="st-kpi-card" onClick={() => { setAptFilter("available"); setTab("apartments"); }}>
                <div className="st-kpi-top">
                  <span>Căn đang trống</span>
                  <span className="st-badge st-badge--green">Online</span>
                </div>
                <div className="st-kpi-val">{kpi.availableCount}</div>
                <div className="st-kpi-note">Tổng kho: {kpi.totalApartments} căn ({kpi.hiddenCount} ẩn)</div>
              </button>

              <button type="button" className="st-kpi-card" onClick={() => { setAptFilter("rented"); setTab("apartments"); }}>
                <div className="st-kpi-top">
                  <span>Đã thuê / Giữ chỗ</span>
                  <span className="st-badge st-badge--amber">Hoạt động</span>
                </div>
                <div className="st-kpi-val">{kpi.rentedCount + kpi.reservedCount}</div>
                <div className="st-kpi-note">{kpi.rentedCount} đã thuê · {kpi.reservedCount} giữ chỗ</div>
              </button>

              <button type="button" className="st-kpi-card" onClick={() => { setLeadAptFilter(""); setTab("leads"); }}>
                <div className="st-kpi-top">
                  <span>Khách chờ xử lý</span>
                  {pendingAlertCount > 0 && <span className="st-badge st-badge--red">Mới</span>}
                </div>
                <div className="st-kpi-val">{pendingAlertCount}</div>
                <div className="st-kpi-note">{kpi.newLeadsCount} hẹn xem · {kpi.pendingBookingsCount} giữ chỗ</div>
              </button>

              <button type="button" className="st-kpi-card" onClick={() => setTab("leases")}>
                <div className="st-kpi-top">
                  <span>HĐ sắp hết hạn</span>
                  <span className={`st-badge ${kpi.expiringSoonCount > 0 ? "st-badge--red" : "st-badge--green"}`}>45 ngày</span>
                </div>
                <div className="st-kpi-val">{kpi.expiringSoonCount}</div>
                <div className="st-kpi-note">{kpi.activeLeasesCount} hợp đồng đang chạy</div>
              </button>
            </section>

            {/* CRM Funnel */}
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">📈 Phễu Chăm Sóc Khách Hàng</h2>
                <span className="st-badge st-badge--navy">{kpi.totalInquiries} yêu cầu</span>
              </div>
              <div className="st-funnel-grid">
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.New || 0}</div>
                  <div className="st-funnel-lbl">🆕 Mới</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Contacted || 0}</div>
                  <div className="st-funnel-lbl">📞 Đã LH</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Viewing_Scheduled || 0}</div>
                  <div className="st-funnel-lbl">📅 Đã hẹn xem</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Pending || 0}</div>
                  <div className="st-funnel-lbl">⏳ Chờ giữ chỗ</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Confirmed || 0}</div>
                  <div className="st-funnel-lbl">🟡 Đang giữ</div>
                </div>
                <div className="st-funnel-box">
                  <div className="st-funnel-num">{report.statusFunnel.Rented_Closed || 0}</div>
                  <div className="st-funnel-lbl">🔑 Đã chốt</div>
                </div>
              </div>
              {report.channels.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {report.channels.map((ch) => (
                    <span key={ch.name} className="st-badge st-badge--gray">
                      {ch.name}: {ch.count}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Area Breakdown */}
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">🗺️ Phân Bổ Theo Khu Vực Đà Nẵng</h2>
              </div>
              <div className="st-bar-list">
                {report.areaBreakdown.map((item) => {
                  const pct = Math.round((item.total / Math.max(1, kpi.totalApartments)) * 100);
                  return (
                    <div key={item.area} className="st-bar-item">
                      <div className="st-bar-row">
                        <span>{item.area}</span>
                        <span style={{ color: "var(--text-sub)", fontSize: 12 }}>
                          {item.total} căn ({item.available} trống) · 👥 {item.leads} khách
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

            {/* Top Apartments by Demand */}
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">🔥 Căn Hộ Được Hỏi Nhiều Nhất</h2>
                <button type="button" className="st-btn-mini" onClick={() => setTab("apartments")}>Xem tất cả →</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {report.topApartments.slice(0, 4).map((apt) => (
                  <div
                    key={apt.code}
                    style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                    onClick={() => openEditEditor(apt)}
                  >
                    <img
                      src={apt.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=70"}
                      alt=""
                      style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {titleOf(apt)}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>
                        {fmtVnd(apt.priceVnd)} · {apt.code}
                      </div>
                    </div>
                    <span className="st-badge st-badge--blue">
                      👥 {apt.contactSummary?.people || 0} LH
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Expiring Leases Alert */}
            {report.expiringSoonLeases.length > 0 && (
              <section className="st-card" style={{ borderColor: "rgba(217,119,6,0.35)", background: "#fffdf7" }}>
                <div className="st-card-head">
                  <h2 className="st-card-title">⚠️ Hợp Đồng Sắp Hết Hạn</h2>
                  <span className="st-badge st-badge--amber">{report.expiringSoonLeases.length} HĐ</span>
                </div>
                {report.expiringSoonLeases.map((l) => (
                  <div key={l.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
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

            <div className="st-row-2">
              <button type="button" className="st-btn st-btn--outline" onClick={() => handleDownloadCsv("/api/excel/apartments.csv", "KIN_Estates_CanHo.csv")}>
                📊 Tải Excel Kho Căn
              </button>
              <button type="button" className="st-btn st-btn--primary" onClick={handleSyncWeb}>
                🚀 Đồng bộ Web Live
              </button>
            </div>
          </>
        )}

        {/* TAB 2: APARTMENTS INVENTORY */}
        {tab === "apartments" && (
          <>
            <div className="st-search-box">
              <span className="st-search-icon">🔍</span>
              <input
                type="search"
                className="st-search-input"
                placeholder="Tìm mã căn, tên tòa nhà, địa chỉ..."
                value={aptSearch}
                onChange={(e) => setAptSearch(e.target.value)}
              />
            </div>

            <div className="st-chips">
              {[
                ["all", `Tất cả (${report?.apartments.length || 0})`],
                ["available", `🟢 Trống (${kpi?.availableCount || 0})`],
                ["reserved", `🟡 Giữ chỗ (${kpi?.reservedCount || 0})`],
                ["rented", `🔴 Đã thuê (${kpi?.rentedCount || 0})`],
                ["hidden", `🙈 Ẩn (${kpi?.hiddenCount || 0})`]
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
                return (
                  <article key={apt.code} className="st-apt-card">
                    <div className="st-apt-top">
                      <div className="st-apt-thumb-wrap" onClick={() => openEditEditor(apt)}>
                        <img
                          className="st-apt-thumb"
                          src={apt.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=70"}
                          alt={titleOf(apt)}
                        />
                        <span className="st-apt-photo-count">📸 {(apt.images || []).length}</span>
                      </div>
                      <div className="st-apt-info">
                        <h3 className="st-apt-title" onClick={() => openEditEditor(apt)}>{titleOf(apt)}</h3>
                        <div className="st-apt-price">
                          {fmtVnd(apt.priceVnd)}/th <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontWeight: 600 }}>· ${apt.priceUsd}</span>
                        </div>
                        <div className="st-apt-meta">
                          {apt.bedrooms ?? "-"} PN · {apt.sizeM2 ?? "-"} m² · 📍 {apt.address || apt.building}
                        </div>
                        <div className="st-apt-badges">
                          {isHidden ? (
                            <span className="st-badge st-badge--gray">🙈 Đang ẩn</span>
                          ) : apt.status === "Rented" ? (
                            <span className="st-badge st-badge--red">🔴 Đã thuê</span>
                          ) : apt.status === "Reserved" ? (
                            <span className="st-badge st-badge--amber">🟡 Giữ chỗ</span>
                          ) : (
                            <span className="st-badge st-badge--green">🟢 Đang trống</span>
                          )}
                          <span className="st-badge st-badge--gray">{apt.code}</span>
                          {people > 0 && (
                            <span
                              className="st-badge st-badge--blue"
                              style={{ cursor: "pointer" }}
                              onClick={() => { setLeadAptFilter(apt.code); setTab("leads"); }}
                            >
                              🔔 {people} khách LH
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="st-apt-actions">
                      <button
                        type="button"
                        className={`st-btn-mini ${isAvail ? "st-btn-mini--red" : "st-btn-mini--green"}`}
                        onClick={() =>
                          quickPatchApt(
                            apt,
                            { status: isAvail ? "Rented" : "Available", isVisible: true },
                            isAvail ? `🔴 Đã đổi ${apt.code} sang Đã thuê` : `🟢 Đã mở trống ${apt.code}`
                          )
                        }
                      >
                        {isAvail ? "🔴 Thuê" : "🟢 Trống"}
                      </button>
                      <button
                        type="button"
                        className="st-btn-mini"
                        onClick={() =>
                          quickPatchApt(
                            apt,
                            { isVisible: isHidden, ...(isHidden && apt.status === "Hidden" ? { status: "Available" } : {}) },
                            isHidden ? `👁️ Đã hiện ${apt.code} lên Web` : `🙈 Đã ẩn ${apt.code} khỏi Web`
                          )
                        }
                      >
                        {isHidden ? "👁️ Hiện" : "🙈 Ẩn"}
                      </button>
                      <button type="button" className="st-btn-mini st-btn-mini--navy" onClick={() => openEditEditor(apt)}>
                        ✏️ Sửa
                      </button>
                      <button
                        type="button"
                        className="st-btn-mini"
                        onClick={() => { setLeadAptFilter(apt.code); setTab("leads"); }}
                      >
                        👥 ({people})
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </>
        )}

        {/* TAB 3: LEADS & BOOKINGS */}
        {tab === "leads" && (
          <>
            {leadAptFilter ? (
              <div className="st-card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>ĐANG LỌC THEO CĂN HỘ</div>
                  <div style={{ fontWeight: 800, color: "var(--navy)" }}>🏠 {leadAptFilter}</div>
                </div>
                <button type="button" className="st-btn-mini" onClick={() => setLeadAptFilter("")}>✕ Xem tất cả</button>
              </div>
            ) : (
              <div className="st-row-2">
                <button
                  type="button"
                  className={`st-btn ${leadSubTab === "viewings" ? "st-btn--primary" : "st-btn--outline"}`}
                  style={{ height: 38 }}
                  onClick={() => setLeadSubTab("viewings")}
                >
                  📅 Hẹn xem & Tư vấn
                </button>
                <button
                  type="button"
                  className={`st-btn ${leadSubTab === "bookings" ? "st-btn--primary" : "st-btn--outline"}`}
                  style={{ height: 38 }}
                  onClick={() => setLeadSubTab("bookings")}
                >
                  🟡 Đặt phòng ({(kpi?.pendingBookingsCount || 0) + (kpi?.confirmedBookingsCount || 0)})
                </button>
              </div>
            )}

            {filteredLeads.length === 0 ? (
              <div className="st-empty">Chưa có yêu cầu khách hàng nào trong mục này.</div>
            ) : (
              filteredLeads.map((inq) => {
                const isBooking = ["reservation", "booking"].includes(inq.type);
                const link = contactHref(inq.contactHandle, inq.messenger);
                const badgeClass =
                  inq.status === "New" || inq.status === "Pending"
                    ? "st-badge--red"
                    : inq.status === "Confirmed" || inq.status === "Viewing_Scheduled"
                    ? "st-badge--amber"
                    : inq.status === "Rented_Closed"
                    ? "st-badge--green"
                    : "st-badge--gray";
                return (
                  <article key={inq._id} className="st-item-card">
                    <div className="st-item-head">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--navy)" }}>
                          {inq.clientName || "Khách hàng"}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-sub)" }}>
                          {inq.code} · {isBooking ? "Yêu cầu giữ chỗ" : "Hẹn xem / Tư vấn"} · Căn <b>{inq.apartmentCode}</b>
                        </div>
                      </div>
                      <span className={`st-badge ${badgeClass}`}>{inq.status}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                      {link ? (
                        <a href={link.href} target="_blank" rel="noreferrer" className="st-contact-link">
                          {link.label}
                        </a>
                      ) : (
                        <span className="st-badge st-badge--gray">{inq.contactHandle || "Chưa có SĐT"}</span>
                      )}
                      {inq.viewingTime && <span className="st-badge st-badge--amber">⏰ Xem: {inq.viewingTime}</span>}
                      {inq.moveInDate && <span className="st-badge st-badge--gray">📦 Vào: {inq.moveInDate}</span>}
                    </div>

                    {inq.notes && (
                      <div style={{ fontSize: 12.5, color: "var(--text-sub)", background: "var(--surface-soft)", padding: "8px 10px", borderRadius: 10 }}>
                        {inq.notes}
                      </div>
                    )}

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                      {isBooking ? (
                        <>
                          {["New", "Pending"].includes(inq.status) && (
                            <button type="button" className="st-btn-mini st-btn-mini--green" style={{ flex: 1 }} onClick={() => handleReservationAction(inq, "confirm")}>
                              ✅ Xác nhận giữ chỗ
                            </button>
                          )}
                          {["New", "Pending", "Confirmed"].includes(inq.status) && (
                            <button type="button" className="st-btn-mini st-btn-mini--red" style={{ flex: 1 }} onClick={() => handleReservationAction(inq, "cancel")}>
                              ❌ Hủy giữ chỗ
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {inq.status !== "Contacted" && (
                            <button type="button" className="st-btn-mini" onClick={() => updateLeadStatus(inq, { status: "Contacted" }, "📞 Đã đánh dấu Đã liên hệ")}>
                              📞 Đã LH
                            </button>
                          )}
                          <button
                            type="button"
                            className="st-btn-mini st-btn-mini--amber"
                            onClick={() => {
                              setSchedulingLead(inq);
                              setScheduleInput("");
                            }}
                          >
                            📅 Chốt giờ xem
                          </button>
                          <button type="button" className="st-btn-mini st-btn-mini--green" onClick={() => openLeaseModalFromLead(inq)}>
                            🔑 Chốt thuê
                          </button>
                          <button type="button" className="st-btn-mini st-btn-mini--red" onClick={() => handleDeleteLead(inq)}>
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </>
        )}

        {/* TAB 4: ACTIVE TENANTS & LEASES */}
        {tab === "leases" && (
          <>
            <button type="button" className="st-btn st-btn--primary" onClick={() => openLeaseModalFromLead()}>
              ＋ Tạo Hợp Đồng Khách Thuê Mới
            </button>

            {(report?.leases || []).length === 0 ? (
              <div className="st-empty">Chưa có hợp đồng thuê nào.</div>
            ) : (
              (report?.leases || []).map((l) => {
                const left = daysUntil(l.endDate);
                const ended = l.status === "Ended";
                const link = contactHref(l.tenantContact, l.messenger);
                return (
                  <article key={l.code} className="st-item-card" style={{ opacity: ended ? 0.65 : 1 }}>
                    <div className="st-item-head">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--navy)" }}>
                          🔑 {l.tenantName}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-sub)" }}>
                          Căn <b>{l.apartmentCode}</b> · {l.building || l.apartmentTitle}
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

                    <div style={{ fontSize: 12.5, display: "flex", flexWrap: "wrap", gap: 8, color: "var(--text)" }}>
                      <span>💰 <b>${l.priceUsd}/th</b> ({fmtVnd(l.priceVnd || l.priceUsd * RATE_VND)})</span>
                      <span>📅 {l.startDate} → {l.endDate}</span>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                      {link ? (
                        <a href={link.href} target="_blank" rel="noreferrer" className="st-contact-link">
                          {link.label}
                        </a>
                      ) : (
                        <span className="st-badge st-badge--gray">{l.tenantContact || "N/A"}</span>
                      )}
                      {!ended && (
                        <button type="button" className="st-btn-mini st-btn-mini--amber" onClick={() => handleCheckoutLease(l)}>
                          🔓 Trả phòng & Mở trống
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </>
        )}

        {/* TAB 5: TOOLS & EXCEL */}
        {tab === "tools" && (
          <>
            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">📊 Xuất & Nhập Excel 2 Chiều (.CSV)</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" className="st-btn st-btn--outline" onClick={() => handleDownloadCsv("/api/excel/apartments.csv", "KIN_Estates_KhoCanHo.csv")}>
                  📥 Tải Excel Kho Căn Hộ
                </button>
                <button type="button" className="st-btn st-btn--outline" onClick={() => handleDownloadCsv("/api/excel/inquiries.csv", "KIN_Estates_KhachHang.csv")}>
                  📥 Tải Excel Khách Hẹn Xem & Đặt Phòng
                </button>
                <button type="button" className="st-btn st-btn--outline" onClick={() => handleDownloadCsv("/api/excel/leases.csv", "KIN_Estates_HopDongThue.csv")}>
                  📥 Tải Excel Hợp Đồng Khách Đang Thuê
                </button>
                <div className="st-divider" />
                <label className="st-btn st-btn--bronze" style={{ cursor: "pointer" }}>
                  📤 Nhập File Excel Cập Nhật Kho Căn (.CSV)
                  <input type="file" accept=".csv,.txt" hidden onChange={(e) => handleImportCsv(e, "/api/excel/import-apartments")} />
                </label>
                <label className="st-btn st-btn--outline" style={{ cursor: "pointer" }}>
                  📤 Nhập File Excel Hợp Đồng Thuê (.CSV)
                  <input type="file" accept=".csv,.txt" hidden onChange={(e) => handleImportCsv(e, "/api/excel/import-leases")} />
                </label>
              </div>
            </section>

            <section className="st-card">
              <div className="st-card-head">
                <h2 className="st-card-title">⚙️ Trạng Thái Hệ Thống</h2>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-sub)", display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                <div>• <b>Database:</b> {report?.dbStatus?.mode || "Ready"}</div>
                <div>• <b>Telegram Bot:</b> {report?.botStatus?.mode || "Ready"}</div>
                <div>• <b>Tự động dịch:</b> 6 ngôn ngữ (VI / EN / ZH / RU / KO / JA)</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button type="button" className="st-btn st-btn--primary" onClick={handleSyncWeb}>
                  🚀 Đồng Bộ Ngay Lên Website Live
                </button>
                <a href="/" target="_blank" rel="noreferrer" className="st-btn st-btn--outline" style={{ textDecoration: "none" }}>
                  🌐 Xem Trang Web Khách Hàng ↗
                </a>
                <button
                  type="button"
                  className="st-btn st-btn--danger"
                  onClick={() => {
                    localStorage.removeItem("kin_studio_token");
                    setToken("");
                    setAuthed(false);
                  }}
                >
                  🔒 Khóa Màn Hình Quản Trị
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Floating Action Button on Apartments tab */}
      {tab === "apartments" && (
        <button type="button" className="st-fab" onClick={openCreateEditor}>
          ＋ Đăng căn mới
        </button>
      )}

      {/* Bottom 5-Tab Mobile Navigation */}
      <nav className="st-bottom-nav" aria-label="Studio navigation">
        <button type="button" className={`st-nav-item ${tab === "report" ? "active" : ""}`} onClick={() => setTab("report")}>
          <span className="st-nav-icon">📊</span>
          <span>Báo cáo</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "apartments" ? "active" : ""}`} onClick={() => setTab("apartments")}>
          <span className="st-nav-icon">🏠</span>
          <span>Căn hộ</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "leads" ? "active" : ""}`} onClick={() => setTab("leads")}>
          <span className="st-nav-icon">👥</span>
          <span>Khách</span>
          {pendingAlertCount > 0 && <span className="st-nav-dot">{pendingAlertCount}</span>}
        </button>
        <button type="button" className={`st-nav-item ${tab === "leases" ? "active" : ""}`} onClick={() => setTab("leases")}>
          <span className="st-nav-icon">🔑</span>
          <span>Hợp đồng</span>
        </button>
        <button type="button" className={`st-nav-item ${tab === "tools" ? "active" : ""}`} onClick={() => setTab("tools")}>
          <span className="st-nav-icon">⚙️</span>
          <span>Excel</span>
        </button>
      </nav>

      {/* APARTMENT CREATE / EDIT MOBILE BOTTOM SHEET */}
      {editorOpen && (
        <div className="st-modal-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">{editingCode ? `✏️ Sửa căn ${editingCode}` : "➕ Đăng Căn Hộ Mới"}</h2>
              <button type="button" className="st-close-btn" onClick={() => setEditorOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleSaveApartment}>
              <div style={{ background: "var(--green-bg)", color: "var(--green)", fontSize: 12, fontWeight: 700, padding: "8px 12px", borderRadius: 12 }}>
                🌐 Anh chỉ cần viết Tiếng Việt — lưu xong Web tự dịch đồng bộ 6 ngôn ngữ!
              </div>

              {/* Photo Upload Grid */}
              <div className="st-field">
                <span className="st-label">📸 Bộ ảnh căn hộ ({form.images.length} ảnh — chạm vào ảnh để chọn Ảnh bìa)</span>
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
                        showToast("⭐ Đã đặt làm Ảnh bìa!");
                      }}
                    >
                      <img src={src} alt="" />
                      {idx === 0 && <span className="st-photo-cover-tag">⭐ Ảnh bìa</span>}
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
                    <span style={{ fontSize: 20 }}>{uploadingPhoto ? "⏳" : "📷"}</span>
                    <span>{uploadingPhoto ? "Đang tải..." : "Thêm ảnh ĐT"}</span>
                    <input type="file" accept="image/*" multiple hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  </label>
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
                  <input
                    className="st-input"
                    placeholder="VD: The Panoma"
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

              <div className="st-field">
                <label className="st-label">Địa chỉ hiển thị trên bản đồ *</label>
                <input
                  className="st-input"
                  placeholder="VD: 58 Trần Thị Lý, Ngũ Hành Sơn, Đà Nẵng"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              {/* Interactive Map Pin Picker */}
              <div className="st-field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="st-label">
                    📍 Ghim trên bản đồ {form.hasPin ? `(${form.lat}, ${form.lng})` : "(Chạm bản đồ để thả ghim)"}
                  </span>
                  <button
                    type="button"
                    className="st-btn-mini"
                    onClick={() => {
                      navigator.geolocation?.getCurrentPosition(
                        (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(6));
                          const lng = Number(pos.coords.longitude.toFixed(6));
                          setForm((p) => ({ ...p, lat, lng, hasPin: true }));
                          markerObjRef.current?.setLatLng([lat, lng]);
                          mapObjRef.current?.setView([lat, lng], 16);
                          showToast("📍 Đã lấy tọa độ GPS hiện tại!");
                        },
                        () => showToast("Không lấy được GPS — hãy chạm trực tiếp lên bản đồ.")
                      );
                    }}
                  >
                    📍 GPS tôi
                  </button>
                </div>
                <div ref={mapContainerRef} className="st-map-picker" />
              </div>

              {/* Price VND <-> USD Auto Sync */}
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
                  <label className="st-label">Hoặc USD/tháng</label>
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
                  <label className="st-label">HĐ tối thiểu (th)</label>
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
                  <label className="st-label">Ngày có thể vào ở</label>
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

              {/* Quick Tags */}
              <div className="st-field">
                <span className="st-label">Tiện ích nổi bật (Chạm để chọn)</span>
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
                <label className="st-label">Mô tả chi tiết căn hộ</label>
                <textarea
                  className="st-textarea"
                  placeholder="Nội thất, ánh sáng, bàn làm việc, tiện ích xung quanh..."
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <button type="submit" className="st-btn st-btn--primary" disabled={savingApt}>
                {savingApt ? "⏳ Đang lưu & dịch 6 ngôn ngữ..." : editingCode ? "✅ Lưu Cập Nhật Căn Hộ" : "🚀 Đăng Căn Hộ Lên Website"}
              </button>

              {editingCode && (
                <button type="button" className="st-btn st-btn--danger" onClick={() => handleDeleteApt(editingCode)}>
                  🗑️ Xóa Vĩnh Viễn Căn Hộ Này
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE VIEWING MODAL */}
      {schedulingLead && (
        <div className="st-modal-backdrop" onClick={() => setSchedulingLead(null)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">📅 Chốt Giờ Hẹn Xem Phòng</h2>
              <button type="button" className="st-close-btn" onClick={() => setSchedulingLead(null)}>✕</button>
            </div>
            <div className="st-sheet-body">
              <div style={{ fontSize: 13, color: "var(--text-sub)" }}>
                Khách: <b>{schedulingLead.clientName}</b> · Căn: <b>{schedulingLead.apartmentCode}</b>
              </div>
              <div className="st-field">
                <label className="st-label">Chọn ngày & giờ xem</label>
                <input
                  type="datetime-local"
                  className="st-input"
                  value={scheduleInput}
                  onChange={(e) => setScheduleInput(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="st-btn st-btn--primary"
                onClick={async () => {
                  if (!scheduleInput) return showToast("Hãy chọn ngày giờ xem phòng.");
                  const formatted = scheduleInput.replace("T", " ");
                  await updateLeadStatus(schedulingLead, { status: "Viewing_Scheduled", viewingTime: formatted }, "✅ Đã chốt lịch hẹn xem phòng!");
                  setSchedulingLead(null);
                }}
              >
                ✅ Xác Nhận Lịch Hẹn Xem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LEASE MODAL */}
      {leaseModalOpen && (
        <div className="st-modal-backdrop" onClick={() => setLeaseModalOpen(false)}>
          <div className="st-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="st-sheet-head">
              <h2 className="st-sheet-title">🔑 Tạo Hợp Đồng Khách Thuê</h2>
              <button type="button" className="st-close-btn" onClick={() => setLeaseModalOpen(false)}>✕</button>
            </div>
            <form className="st-sheet-body" onSubmit={handleCreateLease}>
              <div className="st-field">
                <label className="st-label">Chọn căn hộ *</label>
                <select
                  className="st-select"
                  value={leaseForm.apartmentCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    const apt = report?.apartments.find((a) => a.code === code);
                    setLeaseForm((p) => ({ ...p, apartmentCode: code, ...(apt ? { priceUsd: String(apt.priceUsd) } : {}) }));
                  }}
                >
                  {(report?.apartments || []).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {titleOf(a).slice(0, 42)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="st-field">
                <label className="st-label">Tên khách thuê *</label>
                <input className="st-input" value={leaseForm.tenantName} onChange={(e) => setLeaseForm((p) => ({ ...p, tenantName: e.target.value }))} required />
              </div>
              <div className="st-row-2">
                <div className="st-field">
                  <label className="st-label">SĐT / Telegram / Zalo</label>
                  <input className="st-input" value={leaseForm.tenantContact} onChange={(e) => setLeaseForm((p) => ({ ...p, tenantContact: e.target.value }))} />
                </div>
                <div className="st-field">
                  <label className="st-label">Giá thuê (USD/th)</label>
                  <input className="st-input" inputMode="numeric" value={leaseForm.priceUsd} onChange={(e) => setLeaseForm((p) => ({ ...p, priceUsd: e.target.value }))} />
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
              <button type="submit" className="st-btn st-btn--green">
                🔑 Lưu Hợp Đồng & Đổi Căn Sang Đã Thuê
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
