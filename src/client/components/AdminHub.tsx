import React, { useState, useEffect, useRef } from "react";
import { Apartment } from "../App";

interface AdminHubProps {
  onPublicApartmentsChange: (publicApts: Apartment[]) => void;
  onNavigateHome: () => void;
  onOpenApartmentPage: (code: string) => void;
}

export const AdminHub: React.FC<AdminHubProps> = ({
  onPublicApartmentsChange,
  onNavigateHome,
  onOpenApartmentPage
}) => {
  const [activeTab, setActiveTab] = useState<
    "bot" | "apartments" | "leads" | "leases" | "excel"
  >("bot");

  const [allApartments, setAllApartments] = useState<Apartment[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [botHistory, setBotHistory] = useState<any[]>([]);
  const [botStatus, setBotStatus] = useState<any>({});
  const [dbStatus, setDbStatus] = useState<any>({});
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState<string>("");

  // Bot input & config state
  const [botInput, setBotInput] = useState<string>("");
  const [botSending, setBotSending] = useState<boolean>(false);
  const [botToken, setBotToken] = useState<string>("");
  const [adminChatId, setAdminChatId] = useState<string>("");
  const [sheetsWebhookUrl, setSheetsWebhookUrl] = useState<string>("");
  const [hideRentedByDefault, setHideRentedByDefault] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Apartment CRUD Form State
  const [aptFilter, setAptFilter] = useState<string>("all");
  const [editingAptCode, setEditingAptCode] = useState<string | null>(null);
  const [aptForm, setAptForm] = useState({
    code: "",
    titleVi: "",
    titleEn: "",
    building: "The Panoma (Sun Cosmo)",
    address: "Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng",
    areaName: "Han Riverfront",
    priceUsd: "850",
    priceVnd: "",
    bedrooms: "2",
    bathrooms: "2",
    sizeM2: "72",
    floor: "18",
    electricityRate: "Giá nhà nước (EVN ~2,800đ/kWh)",
    petPolicy: "Thương lượng (Cho phép thú cưng nhỏ)",
    status: "Available",
    isVisible: true,
    descriptionVi:
      "Không gian sống thiết kế chuẩn kiến trúc đương đại, kính Low-E cách âm, bàn làm việc rộng và cáp quang 300Mbps.",
    tags: "Natural Light, Remote-Work Desk, State-Rate Electricity",
    images:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=85"
  });

  // Inquiries filter state
  const [leadFilter, setLeadFilter] = useState<string>("all");

  // New Lease Form State
  const [leaseForm, setLeaseForm] = useState({
    apartmentCode: "DN-PAN-1902",
    tenantName: "",
    tenantContact: "",
    nationality: "",
    priceUsd: "654",
    depositMonths: "1",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
    hideApartmentOnWeb: false,
    notes: ""
  });

  // Excel import text state
  const [excelCsvText, setExcelCsvText] = useState<string>("");
  const [excelImportTarget, setExcelImportTarget] = useState<"apartments" | "leases">("apartments");
  const [appsScriptData, setAppsScriptData] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? "" : prev));
    }, 4500);
  };

  const fetchAllAdminData = async () => {
    try {
      const [sysRes, aptRes, pubAptRes, inqRes, leaseRes, botRes, scriptRes] =
        await Promise.all([
          fetch("/api/system/status").then((r) => r.json()),
          fetch("/api/apartments?includeHidden=true").then((r) => r.json()),
          fetch("/api/apartments").then((r) => r.json()),
          fetch("/api/inquiries").then((r) => r.json()),
          fetch("/api/leases").then((r) => r.json()),
          fetch("/api/telegram/history").then((r) => r.json()),
          fetch("/api/sheets/apps-script").then((r) => r.json())
        ]);

      if (aptRes.apartments) setAllApartments(aptRes.apartments);
      if (pubAptRes.apartments) onPublicApartmentsChange(pubAptRes.apartments);
      if (inqRes.inquiries) setInquiries(inqRes.inquiries);
      if (leaseRes.leases) setLeases(leaseRes.leases);
      if (botRes.history) setBotHistory(botRes.history);
      if (botRes.status) setBotStatus(botRes.status);
      if (sysRes.database) setDbStatus(sysRes.database);
      if (sysRes.syncLogs) setSyncLogs(sysRes.syncLogs);
      if (sysRes.settings) {
        setAdminChatId(sysRes.settings.telegramAdminChatId || "");
        setSheetsWebhookUrl(sysRes.settings.googleSheetsWebhookUrl || "");
        setHideRentedByDefault(Boolean(sysRes.settings.hideRentedByDefault));
      }
      if (scriptRes.ok) setAppsScriptData(scriptRes);
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [botHistory]);

  // Send command to Telegram Bot Engine
  const sendBotCommand = async (cmdText: string, photoUrls: string[] = []) => {
    if (!cmdText.trim() && photoUrls.length === 0) return;
    setBotSending(true);
    try {
      const res = await fetch("/api/telegram/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: cmdText,
          username: "Admin (KIN Estates)",
          photoUrls
        })
      });
      const data = await res.json();
      if (data.ok) {
        setBotHistory(data.history || []);
        if (data.apartments) setAllApartments(data.apartments);
        if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
        if (data.inquiries) setInquiries(data.inquiries);
        if (data.leases) setLeases(data.leases);
        if (data.dbStatus) setDbStatus(data.dbStatus);
        setBotInput("");
      }
    } finally {
      setBotSending(false);
    }
  };

  // Upload image file from computer/phone and convert to compressed DataURL for instant listing upload
  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    mode: "bot" | "form"
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxW = 1280;
          const scale = img.width > maxW ? maxW / img.width : 1;
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
            if (mode === "bot") {
              sendBotCommand(botInput || "", [dataUrl]);
            } else {
              setAptForm((prev) => ({
                ...prev,
                images: prev.images ? `${prev.images}\n${dataUrl}` : dataUrl
              }));
              showToast("✓ Đã thêm ảnh từ thiết bị vào sản phẩm!");
            }
          }
        };
        img.src = String(ev.target?.result || "");
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  // Save Telegram Bot Token & Webhook Settings
  const handleSaveBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/telegram/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramBotToken: botToken,
        telegramAdminChatId: adminChatId,
        googleSheetsWebhookUrl: sheetsWebhookUrl,
        hideRentedByDefault,
        registerWebhook: true
      })
    });
    const data = await res.json();
    if (data.ok) {
      setBotStatus(data.botStatus);
      showToast("✓ Đã lưu cấu hình Bot Telegram & đồng bộ Webhook!");
      fetchAllAdminData();
    }
  };

  // Save or Update Apartment via Full Form
  const handleSaveApartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      code: aptForm.code.trim() || undefined,
      title: {
        vi: aptForm.titleVi.trim() || "Căn hộ Kiến trúc KIN Estates",
        en: aptForm.titleEn.trim() || aptForm.titleVi.trim() || "KIN Estates Residence"
      },
      building: aptForm.building,
      address: aptForm.address,
      areaName: aptForm.areaName,
      priceUsd: aptForm.priceUsd,
      priceVnd: aptForm.priceVnd ? Number(aptForm.priceVnd) : undefined,
      bedrooms: Number(aptForm.bedrooms) || 1,
      bathrooms: Number(aptForm.bathrooms) || 1,
      sizeM2: Number(aptForm.sizeM2) || 60,
      floor: Number(aptForm.floor) || 12,
      electricityRate: aptForm.electricityRate,
      petPolicy: aptForm.petPolicy,
      status: aptForm.status,
      isVisible: aptForm.isVisible,
      architecturalNotes: {
        vi: aptForm.descriptionVi,
        en: aptForm.descriptionVi
      },
      tags: aptForm.tags,
      images: aptForm.images,
      source: "web_admin"
    };

    const url = editingAptCode
      ? `/api/apartments/${encodeURIComponent(editingAptCode)}`
      : "/api/apartments";
    const method = editingAptCode ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      setAllApartments(data.apartments || []);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      showToast(
        editingAptCode
          ? `✓ Đã cập nhật căn hộ [${data.apartment.code}] thành công!`
          : `✓ Đã đăng căn hộ mới [${data.apartment.code}] lên Website!`
      );
      setEditingAptCode(null);
      setAptForm((prev) => ({
        ...prev,
        code: "",
        titleVi: "",
        titleEn: ""
      }));
    }
  };

  const startEditApartment = (apt: any) => {
    setEditingAptCode(apt.code);
    setAptForm({
      code: apt.code || "",
      titleVi: typeof apt.title === "string" ? apt.title : apt.title?.vi || "",
      titleEn: typeof apt.title === "string" ? apt.title : apt.title?.en || "",
      building: apt.building || "",
      address: apt.address || "",
      areaName: apt.areaName || "An Thuong",
      priceUsd: String(apt.priceUsd || 750),
      priceVnd: String(apt.priceVnd || ""),
      bedrooms: String(apt.bedrooms || 1),
      bathrooms: String(apt.bathrooms || 1),
      sizeM2: String(apt.sizeM2 || 60),
      floor: String(apt.floor || 12),
      electricityRate: apt.electricityRate || "Giá nhà nước EVN",
      petPolicy: apt.petPolicy || "Thương lượng",
      status: apt.status || "Available",
      isVisible: apt.isVisible !== false,
      descriptionVi:
        typeof apt.architecturalNotes === "string"
          ? apt.architecturalNotes
          : apt.architecturalNotes?.vi || "",
      tags: (apt.tags || []).join(", "),
      images: (apt.images || []).join("\n")
    });
    setActiveTab("apartments");
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const quickUpdateApartment = async (code: string, updates: any, label: string) => {
    const res = await fetch(`/api/apartments/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.ok) {
      setAllApartments(data.apartments || []);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      showToast(`✓ ${label} (${code})`);
    }
  };

  const handleDeleteApartment = async (code: string) => {
    const res = await fetch(`/api/apartments/${encodeURIComponent(code)}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (data.ok) {
      setAllApartments(data.apartments || []);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      showToast(`🗑️ Đã xóa căn hộ ${code}`);
    }
  };

  // Inquiries actions
  const handleUpdateInquiry = async (idOrCode: string, updates: any) => {
    const res = await fetch(`/api/inquiries/${encodeURIComponent(idOrCode)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (data.ok) {
      setInquiries(data.inquiries || []);
      showToast(`✓ Đã cập nhật trạng thái khách hàng ${idOrCode}`);
    }
  };

  const handleDeleteInquiry = async (idOrCode: string) => {
    const res = await fetch(`/api/inquiries/${encodeURIComponent(idOrCode)}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (data.ok) {
      setInquiries(data.inquiries || []);
      showToast(`🗑️ Đã xóa yêu cầu ${idOrCode}`);
    }
  };

  const handleConvertInquiryToLease = async (inq: any) => {
    await sendBotCommand(`/lead_to_lease ${inq.code || inq._id}`);
    showToast(`🔑 Đã chuyển khách ${inq.clientName} sang Hợp đồng Đang thuê!`);
    setActiveTab("leases");
  };

  const handleApproveOwnerListing = async (inq: any) => {
    const res = await fetch(
      `/api/inquiries/${encodeURIComponent(inq.code || inq._id)}/approve-listing`,
      { method: "POST" }
    );
    const data = await res.json();
    if (data.ok) {
      if (data.apartments) setAllApartments(data.apartments);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      if (data.inquiries) setInquiries(data.inquiries);
      showToast(`🎉 Đã duyệt & đăng căn hộ của chủ nhà ${inq.clientName} lên Website!`);
    }
  };

  // Leases actions
  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/leases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leaseForm)
    });
    const data = await res.json();
    if (data.ok) {
      setLeases(data.leases || []);
      if (data.apartments) setAllApartments(data.apartments);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      showToast(
        `🔑 Đã thêm hợp đồng khách thuê [${data.lease.code}] — Căn ${data.lease.apartmentCode} chuyển sang Đã thuê!`
      );
      setLeaseForm((prev) => ({ ...prev, tenantName: "", tenantContact: "", notes: "" }));
    }
  };

  const handleCheckoutLease = async (codeOrApt: string) => {
    const res = await fetch(`/api/leases/${encodeURIComponent(codeOrApt)}/checkout`, {
      method: "POST"
    });
    const data = await res.json();
    if (data.ok) {
      setLeases(data.leases || []);
      if (data.apartments) setAllApartments(data.apartments);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      showToast(`🔓 Khách đã trả phòng — Căn hộ đã mở trống lại trên Website!`);
    }
  };

  const handleDeleteLease = async (code: string) => {
    const res = await fetch(`/api/leases/${encodeURIComponent(code)}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (data.ok) {
      setLeases(data.leases || []);
      if (data.apartments) setAllApartments(data.apartments);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      showToast(`🗑️ Đã xóa hợp đồng ${code}`);
    }
  };

  // Excel File Upload / Paste Import
  const handleExcelFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setExcelCsvText(String(ev.target?.result || ""));
      showToast(`✓ Đã đọc file Excel "${file.name}". Bấm "Cập nhật từ Excel lên Server" để áp dụng!`);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  const handleApplyExcelImport = async () => {
    if (!excelCsvText.trim()) {
      showToast("⚠️ Vui lòng chọn file Excel (.csv) hoặc dán dữ liệu từ bảng Excel trước!");
      return;
    }
    const endpoint =
      excelImportTarget === "leases"
        ? "/api/excel/import-leases"
        : "/api/excel/import-apartments";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: excelCsvText })
    });
    const data = await res.json();
    if (data.ok) {
      if (data.apartments) setAllApartments(data.apartments);
      if (data.publicApartments) onPublicApartmentsChange(data.publicApartments);
      if (data.leases) setLeases(data.leases);
      if (data.syncLogs) setSyncLogs(data.syncLogs);
      showToast(
        `📊 Thành công! Đã đồng bộ ${data.result?.createdOrUpdated || 0} dòng từ Excel lên Website & Bot Telegram!`
      );
      setExcelCsvText("");
    }
  };

  const filteredAdminApartments = allApartments.filter((a: any) => {
    if (aptFilter === "available") return a.status === "Available" && a.isVisible !== false;
    if (aptFilter === "rented") return a.status === "Rented";
    if (aptFilter === "reserved") return a.status === "Reserved";
    if (aptFilter === "hidden") return a.isVisible === false || a.status === "Hidden";
    return true;
  });

  const filteredInquiries = inquiries.filter((i: any) => {
    if (leadFilter === "all") return true;
    return i.type === leadFilter;
  });

  const calcDaysLeft = (endDate: string) => {
    if (!endDate) return null;
    const d = new Date(endDate);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86400000);
  };

  return (
    <main className="kin-crm-shell">
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 2500,
            background: "#111622",
            color: "#F9E7CF",
            border: "1px solid rgba(213, 176, 124, 0.55)",
            padding: "0.9rem 1.35rem",
            borderRadius: "14px",
            fontWeight: 700,
            fontSize: "0.86rem",
            boxShadow: "0 16px 40px rgba(0,0,0,0.32)"
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Top Executive Banner */}
      <section className="kin-crm-hero">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "1rem"
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(213, 176, 124, 0.16)",
                border: "1px solid rgba(213, 176, 124, 0.35)",
                color: "#F5D9B8",
                padding: "0.3rem 0.85rem",
                borderRadius: "999px",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "0.65rem"
              }}
            >
              <span>⚡ KIN ESTATES COMMAND CENTER</span>
              <span>·</span>
              <span>TELEGRAM BOT + EXCEL 2-WAY + CRM</span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(1.6rem, 2.6vw, 2.25rem)",
                fontWeight: 800,
                lineHeight: 1.2
              }}
            >
              Trung Tâm Quản Lý Căn Hộ, Khách Thuê & Bot Telegram
            </h1>
            <p
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: "0.9rem",
                marginTop: "0.35rem",
                maxWidth: "780px"
              }}
            >
              Đăng căn hộ mới đầy đủ thông tin, ẩn/hiện căn hộ khi đổi trạng thái trống hoặc đã thuê, nhận thông báo ngay khi khách điền form hẹn xem phòng, theo dõi khách đang thuê căn nào & thời hạn hợp đồng, đồng bộ trực tiếp với Microsoft Excel.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a
              href="/api/excel/apartments.csv"
              download
              className="btn-luxe btn-luxe--bronze"
              style={{ textDecoration: "none", padding: "0.65rem 1.1rem", fontSize: "0.8rem" }}
            >
              <span>📥 Tải Excel Căn Hộ (.csv)</span>
            </a>
            <button
              type="button"
              className="btn-luxe"
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#FFFFFF",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "0.65rem 1.1rem",
                fontSize: "0.8rem"
              }}
              onClick={onNavigateHome}
            >
              <span>← Về Trang Chủ Khách Hàng</span>
            </button>
          </div>
        </div>

        <div className="kin-crm-stat-grid">
          <div className="kin-crm-stat-card">
            <strong>{allApartments.length}</strong>
            <span>Tổng số căn hộ trong kho</span>
          </div>
          <div className="kin-crm-stat-card">
            <strong style={{ color: "#6EE7B7" }}>
              {allApartments.filter((a: any) => a.status === "Available" && a.isVisible !== false).length}
            </strong>
            <span>🟢 Căn đang trống (Hiện trên Web)</span>
          </div>
          <div className="kin-crm-stat-card">
            <strong style={{ color: "#FCA5A5" }}>
              {allApartments.filter((a: any) => a.status === "Rented").length} /{" "}
              {allApartments.filter((a: any) => a.isVisible === false || a.status === "Hidden").length}
            </strong>
            <span>🔴 Đã thuê / 🙈 Đang ẩn khỏi Web</span>
          </div>
          <div className="kin-crm-stat-card">
            <strong style={{ color: "#FDE68A" }}>{inquiries.length}</strong>
            <span>📅 Khách đặt lịch xem & Điền form</span>
          </div>
          <div className="kin-crm-stat-card">
            <strong style={{ color: "#93C5FD" }}>
              {leases.filter((l: any) => l.status !== "Ended").length}
            </strong>
            <span>🔑 Hợp đồng khách đang thuê</span>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="kin-crm-tabs">
        <button
          type="button"
          className={`kin-crm-tab-btn ${activeTab === "bot" ? "active" : ""}`}
          onClick={() => setActiveTab("bot")}
        >
          <span>🤖 1. Bot Telegram Quản Lý Chính</span>
        </button>
        <button
          type="button"
          className={`kin-crm-tab-btn ${activeTab === "apartments" ? "active" : ""}`}
          onClick={() => setActiveTab("apartments")}
        >
          <span>🏠 2. Kho Căn Hộ & Đăng Bài ({allApartments.length})</span>
        </button>
        <button
          type="button"
          className={`kin-crm-tab-btn ${activeTab === "leads" ? "active" : ""}`}
          onClick={() => setActiveTab("leads")}
        >
          <span>📅 3. Khách Đặt Lịch & Phòng Ký Gửi ({inquiries.length})</span>
        </button>
        <button
          type="button"
          className={`kin-crm-tab-btn ${activeTab === "leases" ? "active" : ""}`}
          onClick={() => setActiveTab("leases")}
        >
          <span>🔑 4. Khách Đang Thuê & Thời Hạn ({leases.filter((l) => l.status !== "Ended").length})</span>
        </button>
        <button
          type="button"
          className={`kin-crm-tab-btn ${activeTab === "excel" ? "active" : ""}`}
          onClick={() => setActiveTab("excel")}
        >
          <span>📊 5. Liên Kết & Sửa Qua Excel</span>
        </button>
      </div>

      {/* ====================================================================
          TAB 1: TELEGRAM BOT COMMAND CENTER (PRIMARY WORKFLOW)
          ==================================================================== */}
      {activeTab === "bot" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "1.5rem",
            alignItems: "start"
          }}
        >
          {/* Left: Live Interactive Telegram Bot Simulator / Console */}
          <div className="kin-bot-simulator">
            <div className="kin-bot-sim-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#FFF"
                  }}
                >
                  ✈
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#FFFFFF" }}>
                    KIN Estates Telegram Bot (@KIN_Estates)
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#8CE99A" }}>
                    ● {botStatus.mode || "Sẵn sàng điều khiển trực tiếp & nhận thông báo khách hàng"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => sendBotCommand("/menu")}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  color: "#FFF",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "999px",
                  padding: "0.35rem 0.8rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                🔄 Menu chính (/menu)
              </button>
            </div>

            {/* Quick Action Bar at Top of Bot */}
            <div
              style={{
                background: "#141A24",
                padding: "0.55rem 0.9rem",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                display: "flex",
                gap: "0.4rem",
                overflowX: "auto"
              }}
            >
              {[
                { label: "🪄 Đăng từng bước", cmd: "/wizard" },
                { label: "📝 Mẫu đăng nhanh", cmd: "/form" },
                { label: "🏠 DS Căn hộ", cmd: "/list" },
                { label: "🟢 Căn đang trống", cmd: "/empty" },
                { label: "🔴 Đã thuê/Ẩn", cmd: "/rented" },
                { label: "📅 Khách hẹn xem", cmd: "/leads" },
                { label: "🔑 Khách đang thuê", cmd: "/tenants" }
              ].map((b) => (
                <button
                  key={b.cmd}
                  type="button"
                  onClick={() => sendBotCommand(b.cmd)}
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    color: "#E2E8F0",
                    borderRadius: "999px",
                    padding: "0.3rem 0.7rem",
                    fontSize: "0.73rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    cursor: "pointer"
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Chat Messages Stream */}
            <div className="kin-bot-sim-messages" ref={chatScrollRef}>
              {botHistory.map((m) => (
                <div key={m.id} className={`kin-bot-msg ${m.sender === "user" ? "user" : "bot"}`}>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      opacity: 0.7,
                      marginBottom: "0.25rem",
                      fontWeight: 700
                    }}
                  >
                    {m.user} · {new Date(m.timestamp).toLocaleTimeString("vi-VN")}
                  </div>
                  <div>{m.text}</div>

                  {m.buttons && m.buttons.length > 0 && (
                    <div className="kin-bot-inline-grid">
                      {m.buttons.map((row: any[], rIdx: number) => (
                        <div key={rIdx} className="kin-bot-inline-row">
                          {row.map((btn: any, bIdx: number) => (
                            <button
                              key={bIdx}
                              type="button"
                              className="kin-bot-inline-btn"
                              onClick={() => sendBotCommand(btn.callback_data)}
                            >
                              {btn.text}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Bar (Supports Multiline Paste + Image Upload + Command Send) */}
            <form
              className="kin-bot-sim-inputbar"
              onSubmit={(e) => {
                e.preventDefault();
                sendBotCommand(botInput);
              }}
            >
              <label
                title="Gửi ảnh căn hộ từ máy vào Bot"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#F5D9B8",
                  borderRadius: "10px",
                  padding: "0.55rem 0.75rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  fontWeight: 700,
                  fontSize: "0.82rem"
                }}
              >
                📷 Ảnh
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handleImageFileUpload(e, "bot")}
                />
              </label>
              <textarea
                rows={2}
                value={botInput}
                onChange={(e) => setBotInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendBotCommand(botInput);
                  }
                }}
                placeholder="Nhập lệnh (/wizard, /list, /price DN-PAN-1902 700) hoặc dán mẫu ĐĂNG CĂN HỘ... (Shift+Enter xuống dòng)"
                style={{
                  flex: 1,
                  background: "#0E131B",
                  color: "#FFFFFF",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: "10px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-sans)",
                  resize: "none"
                }}
              />
              <button
                type="submit"
                disabled={botSending}
                style={{
                  background: "linear-gradient(135deg, #D5B07C 0%, #9E7B4F 100%)",
                  color: "#111419",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0 1.1rem",
                  fontWeight: 800,
                  fontSize: "0.84rem",
                  cursor: "pointer"
                }}
              >
                {botSending ? "..." : "Gửi ➤"}
              </button>
            </form>
          </div>

          {/* Right: Connect Live @BotFather Token + Quick Copy Templates */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="kin-crm-panel" style={{ marginBottom: 0 }}>
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.25rem",
                  marginBottom: "0.35rem"
                }}
              >
                🔗 Kết Nối Bot Telegram Thật (@BotFather)
              </h3>
              <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Dán <strong>Bot Token</strong> (lấy từ <code>@BotFather</code> trên Telegram) và <strong>Admin Chat ID</strong> (hoặc chỉ cần nhắn <code>/start</code> vào Bot để hệ thống tự nhận diện). Khi khách điền form hẹn xem phòng trên Web, Bot sẽ báo ngay về điện thoại của anh!
              </p>

              <form onSubmit={handleSaveBotConfig} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div className="kin-input-group">
                  <label>Telegram Bot Token (từ @BotFather)</label>
                  <input
                    type="password"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="VD: 7482910482:AAHxyz..."
                  />
                </div>
                <div className="kin-input-group">
                  <label>Telegram Admin Chat ID (Nhận thông báo khi khách điền form)</label>
                  <input
                    type="text"
                    value={adminChatId}
                    onChange={(e) => setAdminChatId(e.target.value)}
                    placeholder="Tự động nhận khi anh nhắn /start vào Bot (hoặc nhập ID)"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Google Sheets / Excel Apps Script Webhook URL (Tùy chọn)</label>
                  <input
                    type="text"
                    value={sheetsWebhookUrl}
                    onChange={(e) => setSheetsWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                  />
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.55rem",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={hideRentedByDefault}
                    onChange={(e) => setHideRentedByDefault(e.target.checked)}
                  />
                  <span>Tự động ẩn căn hộ khỏi trang khách hàng khi chuyển sang trạng thái "Đã thuê (Rented)"</span>
                </label>

                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  <button type="submit" className="btn-luxe btn-luxe--navy" style={{ padding: "0.7rem 1.2rem" }}>
                    <span>💾 Lưu Cấu Hình & Kích Hoạt Bot</span>
                  </button>
                  <button
                    type="button"
                    className="btn-luxe btn-luxe--outline"
                    style={{ padding: "0.7rem 1rem" }}
                    onClick={async () => {
                      await fetch("/api/inquiries", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          type: "viewing",
                          clientName: "Khách Test Thông Báo Telegram",
                          messenger: "Telegram",
                          contactHandle: "@KIN_Estates",
                          apartmentCode: "DN-PAN-1902",
                          apartmentTitle: "The Panoma 1 — 1PN View Sông Hàn",
                          viewingTime: "Hôm nay lúc 16:30",
                          budgetUsd: "$654/tháng",
                          notes: "Test thông báo tự động khi khách hàng đặt lịch xem phòng trên Website."
                        })
                      });
                      fetchAllAdminData();
                      showToast("🔔 Đã bắn thông báo khách đặt lịch thử nghiệm vào Bot Telegram!");
                    }}
                  >
                    <span>🔔 Test Báo Khách Điền Form</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Copy-Paste Template Box for Telegram Poster */}
            <div className="kin-crm-panel" style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem" }}>
                  📋 Mẫu Đăng Căn Hộ Chuẩn Trên Telegram
                </h3>
                <button
                  type="button"
                  className="btn-luxe btn-luxe--bronze"
                  style={{ padding: "0.38rem 0.85rem", fontSize: "0.75rem" }}
                  onClick={() => {
                    const tpl =
                      `ĐĂNG CĂN HỘ\n` +
                      `Tên: The Panoma 2PN Góc View Sông Hàn & Cầu Rồng\n` +
                      `Tòa nhà: The Panoma (Sun Cosmo)\n` +
                      `Khu vực: Han Riverfront\n` +
                      `Địa chỉ: Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng\n` +
                      `Giá: 950\n` +
                      `Phòng ngủ: 2\n` +
                      `Phòng tắm: 2\n` +
                      `Diện tích: 76\n` +
                      `Tầng: 21\n` +
                      `Điện: Giá nhà nước EVN\n` +
                      `Thú cưng: Cho phép thú cưng nhỏ\n` +
                      `Mô tả: Căn góc 2 mặt kính Low-E nhìn thẳng Sông Hàn, nội thất gỗ sồi mới 100%, bàn làm việc rộng.\n` +
                      `Ảnh: https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200`;
                    setBotInput(tpl);
                    showToast("✓ Đã điền mẫu vào ô chat Bot! Anh chỉ cần bấm Gửi ➤");
                  }}
                >
                  <span>Điền mẫu vào ô Chat Bot ←</span>
                </button>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.65rem" }}>
                Người đăng chỉ cần gửi đoạn tin nhắn theo mẫu này (hoặc gửi kèm ảnh căn hộ) vào Bot Telegram là hệ thống tự động bóc tách địa chỉ, giá, diện tích, mô tả và lên sản phẩm đầy đủ:
              </p>
              <pre
                style={{
                  background: "#F6F3EC",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  fontSize: "0.76rem",
                  lineHeight: 1.5,
                  overflowX: "auto",
                  border: "1px solid rgba(22,25,30,0.08)"
                }}
              >{`ĐĂNG CĂN HỘ
Tên: The Panoma 2PN Góc View Sông Hàn
Tòa nhà: The Panoma (Sun Cosmo)
Khu vực: Han Riverfront
Địa chỉ: Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng
Giá: 950 (hoặc ghi 24tr)
Phòng ngủ: 2
Diện tích: 76
Tầng: 21
Mô tả: Căn góc 2 mặt kính Low-E, bàn làm việc rộng, cáp quang 300Mbps.
Ảnh: https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: FULL APARTMENT CRUD (ADD, EDIT, HIDE/SHOW, STATUS, PRICE, DELETE)
          ==================================================================== */}
      {activeTab === "apartments" && (
        <div>
          {/* Full Product Upload / Edit Form */}
          <div className="kin-crm-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem" }}>
                  {editingAptCode
                    ? `✏️ Đang Chỉnh Sửa Căn Hộ [${editingAptCode}]`
                    : "➕ Đăng Sản Phẩm Căn Hộ Mới Đầy Đủ Thông Tin"}
                </h2>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Điền thông tin chi tiết căn hộ, địa chỉ, giá thuê, ảnh (tải ảnh từ máy hoặc dán link) để lên 1 sản phẩm hoàn chỉnh trên Website.
                </p>
              </div>
              {editingAptCode && (
                <button
                  type="button"
                  className="btn-luxe btn-luxe--outline"
                  onClick={() => setEditingAptCode(null)}
                >
                  <span>✕ Hủy chế độ sửa (Chuyển về thêm mới)</span>
                </button>
              )}
            </div>

            <form onSubmit={handleSaveApartment}>
              <div className="kin-form-grid">
                <div className="kin-input-group">
                  <label>Mã căn hộ (Để trống tự tạo)</label>
                  <input
                    type="text"
                    value={aptForm.code}
                    onChange={(e) => setAptForm({ ...aptForm, code: e.target.value })}
                    placeholder="VD: DN-PAN-2201"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Tiêu đề căn hộ (Tiếng Việt) *</label>
                  <input
                    type="text"
                    required
                    value={aptForm.titleVi}
                    onChange={(e) => setAptForm({ ...aptForm, titleVi: e.target.value })}
                    placeholder="VD: The Panoma 2PN Góc View Sông Hàn"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Tiêu đề Tiếng Anh (Tự đồng bộ nếu trống)</label>
                  <input
                    type="text"
                    value={aptForm.titleEn}
                    onChange={(e) => setAptForm({ ...aptForm, titleEn: e.target.value })}
                    placeholder="VD: The Panoma — 2BR Han River Corner Suite"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Tòa nhà / Dự án *</label>
                  <input
                    type="text"
                    required
                    value={aptForm.building}
                    onChange={(e) => setAptForm({ ...aptForm, building: e.target.value })}
                    placeholder="VD: The Panoma (Sun Cosmo)"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Khu vực *</label>
                  <select
                    value={aptForm.areaName}
                    onChange={(e) => setAptForm({ ...aptForm, areaName: e.target.value })}
                  >
                    <option value="An Thuong">An Thượng (Mỹ Khê)</option>
                    <option value="Son Tra">Sơn Trà (Hiyori / Monarchy)</option>
                    <option value="Han Riverfront">Bờ Sông Hàn / Hải Châu</option>
                    <option value="My Khe Beachfront">Mặt Biển Mỹ Khê</option>
                  </select>
                </div>
                <div className="kin-input-group">
                  <label>Địa chỉ cụ thể *</label>
                  <input
                    type="text"
                    required
                    value={aptForm.address}
                    onChange={(e) => setAptForm({ ...aptForm, address: e.target.value })}
                    placeholder="VD: Đường Trần Thị Lý, Quận Ngũ Hành Sơn, Đà Nẵng"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Giá thuê ($ USD / tháng hoặc ghi "18tr") *</label>
                  <input
                    type="text"
                    required
                    value={aptForm.priceUsd}
                    onChange={(e) => setAptForm({ ...aptForm, priceUsd: e.target.value })}
                    placeholder="VD: 850 hoặc 21.5tr"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Số phòng ngủ (PN)</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={aptForm.bedrooms}
                    onChange={(e) => setAptForm({ ...aptForm, bedrooms: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Số phòng tắm (WC)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={aptForm.bathrooms}
                    onChange={(e) => setAptForm({ ...aptForm, bathrooms: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Diện tích (m²)</label>
                  <input
                    type="number"
                    min={15}
                    value={aptForm.sizeM2}
                    onChange={(e) => setAptForm({ ...aptForm, sizeM2: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Tầng</label>
                  <input
                    type="number"
                    min={1}
                    value={aptForm.floor}
                    onChange={(e) => setAptForm({ ...aptForm, floor: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Trạng thái căn hộ</label>
                  <select
                    value={aptForm.status}
                    onChange={(e) =>
                      setAptForm({
                        ...aptForm,
                        status: e.target.value,
                        isVisible: e.target.value !== "Hidden"
                      })
                    }
                  >
                    <option value="Available">🟢 Đang trống (Available - Hiện trên Web)</option>
                    <option value="Reserved">🟡 Đã nhận cọc (Reserved)</option>
                    <option value="Rented">🔴 Đã cho thuê (Rented)</option>
                    <option value="Hidden">🙈 Đang ẩn khỏi Web (Hidden)</option>
                  </select>
                </div>
                <div className="kin-input-group">
                  <label>Giá điện / Nước</label>
                  <input
                    type="text"
                    value={aptForm.electricityRate}
                    onChange={(e) => setAptForm({ ...aptForm, electricityRate: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Chính sách thú cưng</label>
                  <input
                    type="text"
                    value={aptForm.petPolicy}
                    onChange={(e) => setAptForm({ ...aptForm, petPolicy: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Tiện ích nổi bật (Tags cách nhau dấu phẩy)</label>
                  <input
                    type="text"
                    value={aptForm.tags}
                    onChange={(e) => setAptForm({ ...aptForm, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="kin-form-grid" style={{ marginTop: "0.9rem" }}>
                <div className="kin-input-group">
                  <label>Mô tả chi tiết căn hộ</label>
                  <textarea
                    rows={3}
                    value={aptForm.descriptionVi}
                    onChange={(e) => setAptForm({ ...aptForm, descriptionVi: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <label style={{ marginBottom: 0 }}>Danh sách Ảnh (Mỗi dòng 1 link hoặc tải ảnh từ máy)</label>
                    <label
                      style={{
                        background: "#16191E",
                        color: "#F9E7CF",
                        padding: "0.22rem 0.65rem",
                        borderRadius: "999px",
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        textTransform: "none"
                      }}
                    >
                      📷 Chọn ảnh từ máy tính / ĐT
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => handleImageFileUpload(e, "form")}
                      />
                    </label>
                  </div>
                  <textarea
                    rows={3}
                    value={aptForm.images}
                    onChange={(e) => setAptForm({ ...aptForm, images: e.target.value })}
                    placeholder="Dán link ảnh hoặc chọn ảnh từ máy..."
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginTop: "1.1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.86rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={aptForm.isVisible}
                    onChange={(e) => setAptForm({ ...aptForm, isVisible: e.target.checked })}
                  />
                  <span>👁️ Hiển thị công khai căn hộ này trên trang Website khách hàng</span>
                </label>

                <button type="submit" className="btn-luxe btn-luxe--navy" style={{ padding: "0.8rem 1.6rem" }}>
                  <span>
                    {editingAptCode
                      ? `💾 Lưu Cập Nhật Căn [${editingAptCode}]`
                      : "🚀 Đăng Sản Phẩm Lên Website Ngay"}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Apartments Management Table */}
          <div className="kin-crm-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem", marginBottom: "1rem" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
                📋 Danh Sách Căn Hộ Đang Quản Lý ({filteredAdminApartments.length} căn)
              </h3>
              <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                {[
                  { id: "all", label: `Tất cả (${allApartments.length})` },
                  { id: "available", label: "🟢 Đang trống" },
                  { id: "rented", label: "🔴 Đã thuê" },
                  { id: "reserved", label: "🟡 Đã cọc" },
                  { id: "hidden", label: "🙈 Đang ẩn" }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setAptFilter(f.id)}
                    style={{
                      padding: "0.4rem 0.85rem",
                      borderRadius: "999px",
                      border: "1px solid rgba(22,25,30,0.12)",
                      background: aptFilter === f.id ? "#14171E" : "#F6F3EC",
                      color: aptFilter === f.id ? "#F9E7CF" : "#16191E",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      cursor: "pointer"
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="kin-crm-table-wrap">
              <table className="kin-crm-table">
                <thead>
                  <tr>
                    <th>Ảnh & Mã</th>
                    <th>Tên Căn Hộ & Địa Chỉ</th>
                    <th>Giá Thuê (Đổi nhanh)</th>
                    <th>Trạng Thái (Trống / Đã thuê)</th>
                    <th>Hiển Thị Web</th>
                    <th>Khách Đang Thuê</th>
                    <th>Thao Tác Nhanh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdminApartments.map((apt: any) => {
                    const isVis = apt.isVisible !== false && apt.status !== "Hidden";
                    return (
                      <tr key={apt.code}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                            <img
                              src={(apt.images && apt.images[0]) || ""}
                              alt={apt.code}
                              style={{
                                width: "58px",
                                height: "44px",
                                objectFit: "cover",
                                borderRadius: "8px",
                                cursor: "pointer"
                              }}
                              onClick={() => onOpenApartmentPage(apt.code)}
                            />
                            <div>
                              <strong
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.8rem",
                                  color: "#8B623B",
                                  cursor: "pointer",
                                  textDecoration: "underline"
                                }}
                                onClick={() => onOpenApartmentPage(apt.code)}
                              >
                                {apt.code}
                              </strong>
                              <div style={{ fontSize: "0.73rem", color: "var(--text-muted)" }}>
                                {apt.bedrooms}PN · {apt.sizeM2}m² · T.{apt.floor || 12}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#16191E" }}>
                            {typeof apt.title === "string" ? apt.title : apt.title?.vi || apt.title?.en}
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)" }}>
                            🏢 {apt.building} · 📍 {apt.address || apt.areaName}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ fontWeight: 800, color: "#16191E" }}>$</span>
                            <input
                              type="number"
                              defaultValue={apt.priceUsd}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val > 0 && val !== apt.priceUsd) {
                                  quickUpdateApartment(
                                    apt.code,
                                    { priceUsd: val },
                                    `Đã đổi giá sang $${val}/tháng`
                                  );
                                }
                              }}
                              style={{
                                width: "78px",
                                padding: "0.3rem 0.45rem",
                                borderRadius: "8px",
                                border: "1px solid rgba(22,25,30,0.18)",
                                fontWeight: 800,
                                fontSize: "0.84rem"
                              }}
                            />
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            ~{((apt.priceVnd || apt.priceUsd * 25480) / 1000000).toFixed(1)}tr VNĐ
                          </div>
                        </td>
                        <td>
                          <select
                            value={apt.status || "Available"}
                            onChange={(e) => {
                              const nextSt = e.target.value;
                              quickUpdateApartment(
                                apt.code,
                                {
                                  status: nextSt,
                                  isVisible: nextSt === "Hidden" ? false : true
                                },
                                `Đã đổi trạng thái sang ${nextSt}`
                              );
                            }}
                            style={{
                              padding: "0.36rem 0.6rem",
                              borderRadius: "999px",
                              fontWeight: 700,
                              fontSize: "0.76rem",
                              border: "1px solid rgba(22,25,30,0.15)",
                              background:
                                apt.status === "Available"
                                  ? "#E7F6F0"
                                  : apt.status === "Rented"
                                  ? "#FDECEC"
                                  : apt.status === "Reserved"
                                  ? "#FEF5E7"
                                  : "#EEEFF2"
                            }}
                          >
                            <option value="Available">🟢 Đang trống</option>
                            <option value="Reserved">🟡 Đã cọc</option>
                            <option value="Rented">🔴 Đã thuê</option>
                            <option value="Hidden">🙈 Đang ẩn</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              quickUpdateApartment(
                                apt.code,
                                {
                                  isVisible: !isVis,
                                  status: !isVis
                                    ? apt.status === "Hidden"
                                      ? "Available"
                                      : apt.status
                                    : "Hidden"
                                },
                                !isVis ? "Đã HIỆN lại trên Web" : "Đã ẨN khỏi Web"
                              )
                            }
                            style={{
                              padding: "0.34rem 0.7rem",
                              borderRadius: "999px",
                              border: "none",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              background: isVis ? "rgba(27,122,88,0.14)" : "rgba(100,108,122,0.2)",
                              color: isVis ? "#146346" : "#4A515E"
                            }}
                          >
                            {isVis ? "👁️ Đang hiện" : "🙈 Đang ẩn"}
                          </button>
                        </td>
                        <td>
                          {apt.currentTenant ? (
                            <div style={{ fontSize: "0.76rem" }}>
                              <strong style={{ color: "#16191E" }}>{apt.currentTenant.tenantName}</strong>
                              <div style={{ color: "var(--text-muted)" }}>
                                Hạn: {apt.currentTenant.endDate}
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>— Trống —</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => startEditApartment(apt)}
                              style={{
                                padding: "0.32rem 0.6rem",
                                borderRadius: "8px",
                                border: "1px solid rgba(22,25,30,0.15)",
                                background: "#FFF",
                                fontWeight: 700,
                                fontSize: "0.74rem",
                                cursor: "pointer"
                              }}
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLeaseForm((prev) => ({
                                  ...prev,
                                  apartmentCode: apt.code,
                                  priceUsd: String(apt.priceUsd)
                                }));
                                setActiveTab("leases");
                              }}
                              style={{
                                padding: "0.32rem 0.6rem",
                                borderRadius: "8px",
                                border: "1px solid rgba(168,124,81,0.35)",
                                background: "#FBF7F0",
                                color: "#8B623B",
                                fontWeight: 700,
                                fontSize: "0.74rem",
                                cursor: "pointer"
                              }}
                            >
                              🔑 Gán khách
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteApartment(apt.code)}
                              style={{
                                padding: "0.32rem 0.6rem",
                                borderRadius: "8px",
                                border: "1px solid rgba(201,59,59,0.25)",
                                background: "#FFF5F5",
                                color: "#B42323",
                                fontWeight: 700,
                                fontSize: "0.74rem",
                                cursor: "pointer"
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: CUSTOMER LEADS, VIEWING APPOINTMENTS & LANDLORD SUBMISSIONS
          ==================================================================== */}
      {activeTab === "leads" && (
        <div className="kin-crm-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.8rem", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem" }}>
                📅 Danh Sách Khách Hàng Đặt Lịch Xem Phòng, Điền Form & Chủ Nhà Gửi Phòng
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                Mọi khách hàng bấm đặt lịch xem nhà hoặc điền form trên Website đều tự động lưu vào đây và bắn thông báo tức thì về Bot Telegram của Admin.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
              {[
                { id: "all", label: `Tất cả (${inquiries.length})` },
                { id: "viewing", label: "📅 Đặt lịch xem phòng" },
                { id: "shortlist", label: "📋 Điền form tìm nhà" },
                { id: "owner_listing", label: "🏡 Chủ nhà gửi phòng" }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLeadFilter(f.id)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "999px",
                    border: "1px solid rgba(22,25,30,0.12)",
                    background: leadFilter === f.id ? "#14171E" : "#F6F3EC",
                    color: leadFilter === f.id ? "#F9E7CF" : "#16191E",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    cursor: "pointer"
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="kin-crm-table-wrap">
            <table className="kin-crm-table">
              <thead>
                <tr>
                  <th>Mã & Phân Loại</th>
                  <th>Khách Hàng & Liên Hệ</th>
                  <th>Căn Hộ Quan Tâm & Ngân Sách</th>
                  <th>Giờ Hẹn Xem / Ngày Vào</th>
                  <th>Ghi Chú Của Khách</th>
                  <th>Trạng Thái Xử Lý</th>
                  <th>Thao Tác Nhanh</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inq: any) => {
                  const idOrCode = inq.code || inq._id;
                  return (
                    <tr key={idOrCode}>
                      <td>
                        <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "#8B623B" }}>
                          {idOrCode}
                        </strong>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, marginTop: "2px" }}>
                          {inq.type === "viewing"
                            ? "📅 Hẹn xem phòng"
                            : inq.type === "owner_listing"
                            ? "🏡 Chủ nhà ký gửi"
                            : "📋 Tìm căn hộ"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{inq.clientName}</div>
                        <div style={{ fontSize: "0.78rem", color: "#146346", fontWeight: 700 }}>
                          {inq.messenger}: {inq.contactHandle}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{inq.apartmentCode}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {inq.apartmentTitle} · <strong>{inq.budgetUsd}</strong> ({inq.bedrooms})
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#16191E" }}>
                          ⏰ {inq.viewingTime || inq.moveInDate}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {inq.leaseDuration}
                        </div>
                      </td>
                      <td style={{ maxWidth: "250px" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          {inq.notes || "—"}
                        </div>
                      </td>
                      <td>
                        <select
                          value={inq.status || "New"}
                          onChange={(e) =>
                            handleUpdateInquiry(idOrCode, { status: e.target.value })
                          }
                          style={{
                            padding: "0.35rem 0.6rem",
                            borderRadius: "999px",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            border: "1px solid rgba(22,25,30,0.15)"
                          }}
                        >
                          <option value="New">🆕 Mới gửi</option>
                          <option value="Contacted">📞 Đã liên hệ</option>
                          <option value="Viewing_Scheduled">✅ Đã chốt lịch đi xem</option>
                          <option value="Rented_Closed">🔑 Đã chốt thuê</option>
                          <option value="Archived">📁 Lưu trữ / Hủy</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                          {inq.type === "owner_listing" ? (
                            <button
                              type="button"
                              onClick={() => handleApproveOwnerListing(inq)}
                              style={{
                                padding: "0.35rem 0.7rem",
                                borderRadius: "8px",
                                border: "none",
                                background: "#146346",
                                color: "#FFF",
                                fontWeight: 700,
                                fontSize: "0.74rem",
                                cursor: "pointer"
                              }}
                            >
                              ✅ Duyệt đăng lên Web
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConvertInquiryToLease(inq)}
                              style={{
                                padding: "0.35rem 0.7rem",
                                borderRadius: "8px",
                                border: "none",
                                background: "#14171E",
                                color: "#F9E7CF",
                                fontWeight: 700,
                                fontSize: "0.74rem",
                                cursor: "pointer"
                              }}
                            >
                              🔑 Chốt khách thuê
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteInquiry(idOrCode)}
                            style={{
                              padding: "0.35rem 0.55rem",
                              borderRadius: "8px",
                              border: "1px solid rgba(201,59,59,0.25)",
                              background: "#FFF5F5",
                              color: "#B42323",
                              fontWeight: 700,
                              fontSize: "0.74rem",
                              cursor: "pointer"
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 4: ACTIVE TENANTS & LEASE EXPIRATION MANAGEMENT
          ==================================================================== */}
      {activeTab === "leases" && (
        <div>
          <div className="kin-crm-panel">
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: "0.3rem" }}>
              🔑 Gán Khách Hàng Đang Thuê Căn Hộ & Quản Lý Thời Hạn Hợp Đồng
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Khi anh thêm khách thuê vào một căn hộ, hệ thống sẽ tự động đổi trạng thái căn hộ đó sang <strong>🔴 Đã thuê (Rented)</strong> (và tùy chọn ẩn khỏi Web). Khi khách trả phòng, bấm 1 nút để mở trống lại căn hộ trên Website.
            </p>

            <form onSubmit={handleCreateLease}>
              <div className="kin-form-grid">
                <div className="kin-input-group">
                  <label>Chọn Căn Hộ Khách Thuê *</label>
                  <select
                    value={leaseForm.apartmentCode}
                    onChange={(e) => {
                      const found = allApartments.find((a) => a.code === e.target.value);
                      setLeaseForm({
                        ...leaseForm,
                        apartmentCode: e.target.value,
                        priceUsd: found ? String(found.priceUsd) : leaseForm.priceUsd
                      });
                    }}
                  >
                    {allApartments.map((a) => (
                      <option key={a.code} value={a.code}>
                        [{a.code}] {typeof a.title === "string" ? a.title : a.title?.vi} (${a.priceUsd})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="kin-input-group">
                  <label>Họ Tên Khách Đang Thuê *</label>
                  <input
                    type="text"
                    required
                    value={leaseForm.tenantName}
                    onChange={(e) => setLeaseForm({ ...leaseForm, tenantName: e.target.value })}
                    placeholder="VD: David Miller / Nguyễn Văn A"
                  />
                </div>
                <div className="kin-input-group">
                  <label>SĐT / @Telegram / Zalo Khách *</label>
                  <input
                    type="text"
                    required
                    value={leaseForm.tenantContact}
                    onChange={(e) => setLeaseForm({ ...leaseForm, tenantContact: e.target.value })}
                    placeholder="VD: @david_uk / 0905123456"
                  />
                </div>
                <div className="kin-input-group">
                  <label>Giá Thuê Thực Tế ($ USD / tháng)</label>
                  <input
                    type="number"
                    value={leaseForm.priceUsd}
                    onChange={(e) => setLeaseForm({ ...leaseForm, priceUsd: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Ngày Bắt Đầu Thuê *</label>
                  <input
                    type="date"
                    required
                    value={leaseForm.startDate}
                    onChange={(e) => setLeaseForm({ ...leaseForm, startDate: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Ngày Hết Hạn Hợp Đồng *</label>
                  <input
                    type="date"
                    required
                    value={leaseForm.endDate}
                    onChange={(e) => setLeaseForm({ ...leaseForm, endDate: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Số Tháng Đặt Cọc</label>
                  <input
                    type="number"
                    min={1}
                    value={leaseForm.depositMonths}
                    onChange={(e) => setLeaseForm({ ...leaseForm, depositMonths: e.target.value })}
                  />
                </div>
                <div className="kin-input-group">
                  <label>Ghi chú hợp đồng (Ngày thu tiền, NA17...)</label>
                  <input
                    type="text"
                    value={leaseForm.notes}
                    onChange={(e) => setLeaseForm({ ...leaseForm, notes: e.target.value })}
                    placeholder="VD: Thu tiền ngày 05 hàng tháng, đã khai báo tạm trú"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={leaseForm.hideApartmentOnWeb}
                    onChange={(e) =>
                      setLeaseForm({ ...leaseForm, hideApartmentOnWeb: e.target.checked })
                    }
                  />
                  <span>🙈 Tự động ẩn căn hộ này khỏi trang Web khách hàng trong suốt thời gian khách thuê</span>
                </label>

                <button type="submit" className="btn-luxe btn-luxe--navy" style={{ padding: "0.75rem 1.4rem" }}>
                  <span>🔑 Lưu Hợp Đồng & Đổi Căn Hộ Sang "Đã Thuê"</span>
                </button>
              </div>
            </form>
          </div>

          <div className="kin-crm-panel">
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", marginBottom: "1rem" }}>
              📋 Danh Sách Khách Hàng Đang Thuê Căn Nào & Thời Hạn ({leases.length} hợp đồng)
            </h3>

            <div className="kin-crm-table-wrap">
              <table className="kin-crm-table">
                <thead>
                  <tr>
                    <th>Mã HĐ</th>
                    <th>Căn Hộ Đang Thuê</th>
                    <th>Khách Thuê & Liên Hệ</th>
                    <th>Giá Thuê & Cọc</th>
                    <th>Thời Hạn Thuê (Bắt đầu → Kết thúc)</th>
                    <th>Đếm Ngược Thời Hạn</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map((l: any) => {
                    const daysLeft = calcDaysLeft(l.endDate);
                    return (
                      <tr key={l.code}>
                        <td>
                          <strong style={{ fontFamily: "var(--font-mono)", color: "#8B623B" }}>
                            {l.code}
                          </strong>
                        </td>
                        <td>
                          <strong
                            style={{ cursor: "pointer", textDecoration: "underline" }}
                            onClick={() => onOpenApartmentPage(l.apartmentCode)}
                          >
                            [{l.apartmentCode}]
                          </strong>{" "}
                          {l.apartmentTitle}
                          <div style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                            🏢 {l.building} · 📍 {l.address}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{l.tenantName}</div>
                          <div style={{ fontSize: "0.76rem", color: "#146346", fontWeight: 700 }}>
                            {l.tenantContact}
                          </div>
                        </td>
                        <td>
                          <strong>${l.priceUsd}/tháng</strong>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            Cọc {l.depositMonths || 1} tháng
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>
                            {l.startDate} → {l.endDate}
                          </div>
                          <div style={{ fontSize: "0.73rem", color: "var(--text-secondary)" }}>
                            {l.notes}
                          </div>
                        </td>
                        <td>
                          {l.status === "Ended" ? (
                            <span className="kin-status-pill hidden">⚪ Đã trả phòng</span>
                          ) : daysLeft !== null && daysLeft < 0 ? (
                            <span className="kin-status-pill rented">
                              🚨 Quá hạn {Math.abs(daysLeft)} ngày
                            </span>
                          ) : daysLeft !== null && daysLeft <= 30 ? (
                            <span className="kin-status-pill reserved">
                              ⚠️ Sắp hết hạn (Còn {daysLeft} ngày)
                            </span>
                          ) : (
                            <span className="kin-status-pill available">
                              🟢 Đang thuê (Còn {daysLeft ?? "--"} ngày)
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            {l.status !== "Ended" && (
                              <button
                                type="button"
                                onClick={() => handleCheckoutLease(l.code)}
                                style={{
                                  padding: "0.36rem 0.75rem",
                                  borderRadius: "8px",
                                  border: "none",
                                  background: "#146346",
                                  color: "#FFFFFF",
                                  fontWeight: 700,
                                  fontSize: "0.74rem",
                                  cursor: "pointer"
                                }}
                              >
                                🔓 Trả phòng & Mở trống căn
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteLease(l.code)}
                              style={{
                                padding: "0.36rem 0.55rem",
                                borderRadius: "8px",
                                border: "1px solid rgba(201,59,59,0.25)",
                                background: "#FFF5F5",
                                color: "#B42323",
                                fontWeight: 700,
                                fontSize: "0.74rem",
                                cursor: "pointer"
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 5: 2-WAY EXCEL (.CSV UTF-8 BOM) & GOOGLE SHEETS SYNC
          ==================================================================== */}
      {activeTab === "excel" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "1.5rem"
          }}
        >
          {/* Left: Export & Import via Microsoft Excel */}
          <div className="kin-crm-panel" style={{ marginBottom: 0 }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: "0.35rem" }}>
              📊 Xem & Thay Đổi Hàng Loạt Bằng Microsoft Excel
            </h2>
            <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Tất cả các file tải về đều được mã hóa chuẩn <strong>UTF-8 BOM</strong> để mở trực tiếp bằng <strong>Microsoft Excel</strong> trên Windows/Mac rõ nét tiếng Việt 100%. Anh có thể sửa giá, đổi cột <code>Status</code> (<code>Available</code> / <code>Rented</code> / <code>Hidden</code>), đổi cột <code>Visible</code> (<code>TRUE</code> / <code>FALSE</code>) hoặc thêm dòng mới trong Excel rồi tải ngược lên đây!
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1.4rem" }}>
              <a
                href="/api/excel/apartments.csv"
                download
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.1rem",
                  background: "#F6F3EC",
                  borderRadius: "14px",
                  textDecoration: "none",
                  color: "#16191E",
                  fontWeight: 700,
                  border: "1px solid rgba(22,25,30,0.09)"
                }}
              >
                <span>📥 1. Tải Bảng Excel Kho Căn Hộ (KIN_Estates_CanHo.csv)</span>
                <span style={{ color: "#8B623B" }}>Tải về ↓</span>
              </a>

              <a
                href="/api/excel/inquiries.csv"
                download
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.1rem",
                  background: "#F6F3EC",
                  borderRadius: "14px",
                  textDecoration: "none",
                  color: "#16191E",
                  fontWeight: 700,
                  border: "1px solid rgba(22,25,30,0.09)"
                }}
              >
                <span>📥 2. Tải Bảng Excel Khách Hàng & Lịch Hẹn Xem Phòng (.csv)</span>
                <span style={{ color: "#8B623B" }}>Tải về ↓</span>
              </a>

              <a
                href="/api/excel/leases.csv"
                download
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.1rem",
                  background: "#F6F3EC",
                  borderRadius: "14px",
                  textDecoration: "none",
                  color: "#16191E",
                  fontWeight: 700,
                  border: "1px solid rgba(22,25,30,0.09)"
                }}
              >
                <span>📥 3. Tải Bảng Excel Khách Đang Thuê & Hợp Đồng (.csv)</span>
                <span style={{ color: "#8B623B" }}>Tải về ↓</span>
              </a>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid rgba(22,25,30,0.09)", margin: "1.2rem 0" }} />

            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.18rem", marginBottom: "0.65rem" }}>
              📤 Tải File Excel Vừa Chỉnh Sửa Lên Server (Cập nhật 2 chiều)
            </h3>

            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
              <select
                value={excelImportTarget}
                onChange={(e) => setExcelImportTarget(e.target.value as any)}
                style={{
                  padding: "0.55rem 0.85rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(22,25,30,0.16)",
                  fontWeight: 700,
                  fontSize: "0.82rem"
                }}
              >
                <option value="apartments">🏠 Cập nhật Bảng Kho Căn Hộ (Apartments)</option>
                <option value="leases">🔑 Cập nhật Bảng Hợp Đồng Khách Đang Thuê (Leases)</option>
              </select>

              <label
                className="btn-luxe btn-luxe--outline"
                style={{ padding: "0.55rem 1rem", fontSize: "0.8rem", cursor: "pointer" }}
              >
                <span>📂 Chọn File Excel (.csv) Từ Máy</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  style={{ display: "none" }}
                  onChange={handleExcelFileSelect}
                />
              </label>
            </div>

            <textarea
              rows={6}
              value={excelCsvText}
              onChange={(e) => setExcelCsvText(e.target.value)}
              placeholder="Hoặc copy vùng bảng trực tiếp từ Microsoft Excel / Google Sheets và dán (Ctrl+V) vào đây..."
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "12px",
                border: "1px solid rgba(22,25,30,0.16)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.76rem",
                marginBottom: "0.85rem"
              }}
            />

            <button
              type="button"
              className="btn-luxe btn-luxe--navy"
              style={{ width: "100%", padding: "0.85rem" }}
              onClick={handleApplyExcelImport}
            >
              <span>🚀 Áp Dụng Thay Đổi Từ Excel Lên Website & Bot Telegram</span>
            </button>
          </div>

          {/* Right: Google Sheets Live Formula & Apps Script */}
          <div className="kin-crm-panel" style={{ marginBottom: 0 }}>
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", marginBottom: "0.4rem" }}>
              🔗 Liên Kết Trực Tiếp Với Google Sheets (Real-Time)
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.85rem" }}>
              Nếu muốn xem trực tiếp trên Google Sheets, anh chỉ cần mở 1 trang Google Sheet mới và dán công thức dưới đây vào ô <code>A1</code>:
            </p>
            <div
              style={{
                background: "#14171E",
                color: "#F5D9B8",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                marginBottom: "1rem",
                overflowX: "auto"
              }}
            >
              {appsScriptData?.importDataFormula ||
                `=IMPORTDATA("${window.location.origin}/api/excel/apartments.csv")`}
            </div>

            <h4 style={{ fontSize: "0.86rem", fontWeight: 800, marginBottom: "0.4rem" }}>
              📜 Lịch Sử Đồng Bộ Excel & Bot Telegram Gần Nhất
            </h4>
            <div
              style={{
                maxHeight: "340px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem"
              }}
            >
              {syncLogs.map((log: any) => (
                <div
                  key={log.id}
                  style={{
                    padding: "0.65rem 0.85rem",
                    background: "#F8F6F1",
                    borderRadius: "10px",
                    border: "1px solid rgba(22,25,30,0.07)",
                    fontSize: "0.78rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                    <span>
                      {log.direction === "inbound" ? "📥 Nhập từ Excel" : "📤 Đồng bộ"} · {log.action}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                      {new Date(log.timestamp).toLocaleTimeString("vi-VN")}
                    </span>
                  </div>
                  <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>
                    {log.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
