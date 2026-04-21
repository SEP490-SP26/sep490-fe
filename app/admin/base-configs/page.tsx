"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FiSave, FiRefreshCw, FiDollarSign, FiPercent, FiTool,
  FiLayers, FiClock, FiCreditCard, FiGrid, FiEdit3,
  FiChevronDown, FiChevronRight, FiCheckCircle, FiAlertCircle,
  FiSettings,
} from "react-icons/fi";
import { baseConfigApi, BaseConfigResponse } from "@/apiRequests/baseConfigs";

/* ════════════════════════════════
   Label maps – human-readable labels
═════════════════════════════════ */
const MATERIAL_PRICE_LABELS: Record<string, string> = {
  ink_price_per_kg: "Giá mực (VNĐ/kg)",
  coating_glue_keo_nuoc_per_kg: "Keo nước phủ (VNĐ/kg)",
  coating_glue_keo_dau_per_kg: "Keo dầu phủ (VNĐ/kg)",
  mounting_glue_per_kg: "Keo bồi (VNĐ/kg)",
  lamination_per_kg: "Cán màng (VNĐ/kg)",
};

const MATERIAL_RATE_LABELS: Record<string, string> = {
  ink_rate_gach_noi_dia: "Mực – Gạch nội địa",
  ink_rate_gach_xk_don_gian: "Mực – Gạch XK đơn giản",
  ink_rate_hop_mau: "Mực – Hộp màu",
  ink_rate_gach_nhieu_mau: "Mực – Gạch nhiều màu",
  coating_glue_rate_keo_nuoc: "Phủ keo nước",
  coating_glue_rate_keo_dau: "Phủ keo dầu",
  mounting_glue_rate: "Keo bồi",
  lamination_rate_12mic: "Cán màng 12mic",
};

const WASTE_PRINTING_LABELS: Record<string, string> = {
  GACH_1MAU: "Gạch 1 màu",
  GACH_XUAT_KHAU_DON_GIAN: "Gạch XK đơn giản",
  GACH_XUAT_KHAU_TERACON: "Gạch XK Teracon",
  GACH_NOI_DIA_4SP: "Gạch nội địa 4SP",
  GACH_NOI_DIA_6SP: "Gạch nội địa 6SP",
  HOP_MAU_1LUOT_DON_GIAN: "Hộp màu 1 lượt đơn giản",
  HOP_MAU_1LUOT_THUONG: "Hộp màu 1 lượt thường",
  HOP_MAU_1LUOT_KHO: "Hộp màu 1 lượt khó",
  HOP_MAU_AQUA_DOI: "Hộp màu Aqua đôi",
  HOP_MAU_2LUOT: "Hộp màu 2 lượt",
};

const WASTE_DIECUTING_LABELS: Record<string, string> = {
  lt_5000: "< 5.000 tờ",
  lt_20000: "< 20.000 tờ",
  ge_20000: "≥ 20.000 tờ",
};

const WASTE_COATING_LABELS: Record<string, string> = {
  keo_nuoc: "Keo nước",
  keo_dau_lt_10000: "Keo dầu < 10.000",
  keo_dau_ge_10000: "Keo dầu ≥ 10.000",
};

const WASTE_LAMINATION_LABELS: Record<string, string> = {
  lt_10000: "< 10.000 tờ",
  ge_10000: "≥ 10.000 tờ",
};

const WASTE_GLUING_LABELS: Record<string, string> = {
  lt_100: "< 100",
  lt_500: "< 500",
  lt_2000: "< 2.000",
  ge_2000: "≥ 2.000",
};

const PROCESS_CODE_LABELS: Record<string, string> = {
  BE: "Bế khuôn",
  BOI: "Bồi carton",
  CAN: "Cán màng BOPP",
  CAT: "Cắt",
  DAN: "Dán hộp",
  DUT: "Đục lỗ",
  IN: "In offset",
  PHU: "Phủ",
  RALO: "Xả khuôn",
};

const SYSTEM_PARAM_LABELS: Record<string, string> = {
  default_production_days: "Ngày sản xuất mặc định",
  rush_threshold_days: "Ngưỡng gấp (ngày)",
  vat_percent: "VAT (%)",
  min_start_wait_hours: "Thời gian chờ tối thiểu (giờ)",
};

const PLANNING_LABELS: Record<string, string> = {
  min_start_wait_hours: "Thời gian chờ tối thiểu (giờ)",
  work_start_time: "Giờ bắt đầu làm việc",
  break_start_time: "Giờ bắt đầu nghỉ trưa",
  break_end_time: "Giờ kết thúc nghỉ trưa",
  work_end_time: "Giờ kết thúc làm việc",
};

/* ══ Helpers ═════════════════════ */
function formatCurrency(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function formatDecimal3(n: number): string {
  return n.toFixed(3);
}

/* ══ Sub-components ══════════════ */
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color,
  isOpen,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-4 p-5 rounded-t-xl hover:bg-gray-50/50 transition-colors"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} shadow-sm`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 text-left">
        <h2 className="text-[15px] font-semibold text-gray-800">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      {isOpen ? (
        <FiChevronDown size={18} className="text-gray-400" />
      ) : (
        <FiChevronRight size={18} className="text-gray-400" />
      )}
    </button>
  );
}

function ConfigField({
  label,
  value,
  onChange,
  suffix,
  type = "number",
  error,
  disabled,
}: {
  label: string;
  value: number | string;
  onChange: (v: string) => void;
  suffix?: string;
  type?: string;
  error?: string;
  disabled?: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");

  const isDecimal = suffix === "kg/m²";
  const isText = type === "text";

  const displayValue = (() => {
    if (isText) return String(value);
    if (focused) return editValue;
    const num = Number(value);
    if (isNaN(num)) return String(value);
    if (isDecimal) return formatDecimal3(num);
    return formatCurrency(num);
  })();

  const handleFocus = () => {
    if (!isText) {
      setFocused(true);
      setEditValue(String(value));
    }
  };

  const handleChange = (rawVal: string) => {
    if (isText) {
      onChange(rawVal);
      return;
    }
    setEditValue(rawVal);
  };

  const handleBlur = () => {
    if (!isText) {
      setFocused(false);
      let cleaned: string;
      if (isDecimal) {
        cleaned = editValue.replace(/,/g, ".").replace(/[^\d.]/g, "");
        const dotIdx = cleaned.indexOf(".");
        if (dotIdx !== -1) {
          cleaned = cleaned.substring(0, dotIdx + 1) + cleaned.substring(dotIdx + 1).replace(/\./g, "");
        }
      } else {
        cleaned = editValue.replace(/[^\d]/g, "");
      }
      const num = Number(cleaned);
      if (!isNaN(num) && cleaned !== "") {
        if (isDecimal) {
          onChange(parseFloat(num.toFixed(3)).toString());
        } else {
          onChange(String(num));
        }
      } else {
        onChange("0");
      }
    }
  };

  return (
    <div className="group">
      <label className="block text-xs font-medium text-gray-500 mb-1.5 group-hover:text-blue-600 transition-colors">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode={isText ? "text" : (isDecimal ? "decimal" : "numeric")}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-lg text-sm text-gray-800 
                     focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white
                     hover:border-gray-300 transition-all duration-200
                     ${error ? "border-red-300 bg-red-50/50 focus:ring-red-500/20 focus:border-red-400" : "border-gray-200"}
                     ${disabled ? "opacity-60 cursor-not-allowed bg-gray-100" : ""}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <FiAlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

function CurrencyTableInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");

  const displayValue = focused ? editValue : formatCurrency(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={(e) => setEditValue(e.target.value)}
      onFocus={() => {
        setFocused(true);
        setEditValue(String(value));
      }}
      onBlur={() => {
        setFocused(false);
        const cleaned = editValue.replace(/[^\d]/g, "");
        const num = Number(cleaned);
        onChange(!isNaN(num) && cleaned !== "" ? num : 0);
      }}
      className={className || `w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white`}
    />
  );
}

/* ════════════════════════════════
   MAIN PAGE COMPONENT
═════════════════════════════════ */
export default function BaseConfigsPage() {
  const [config, setConfig] = useState<BaseConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false, type: "success", message: "",
  });

  /* Collapsible sections */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    materialPrices: true,
    materialRates: true,
    wastePrinting: false,
    wasteDieCutting: false,
    wasteMounting: false,
    wasteCoating: false,
    wasteLamination: false,
    wasteGluing: false,
    processCosts: false,
    systemParams: false,
    design: false,
    platePrices: false,
    paymentTerms: false,
    planning: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ───── Fetch config ──────── */
  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await baseConfigApi.getConfigs();
      setConfig(data);
    } catch {
      showToast("error", "Không thể tải cấu hình. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  /* ───── Save config ────────── */
  const handleSave = async () => {
    if (!config) return;

    // ── Validation ──
    for (const [, val] of Object.entries(config.materialPrices)) {
      if (val < 0) { showToast("error", "Giá nguyên liệu không được âm"); return; }
    }
    for (const [, val] of Object.entries(config.materialRates)) {
      if (val < 0) { showToast("error", "Định mức tiêu hao không được âm"); return; }
    }
    if (config.systemParameters.vat_percent < 0 || config.systemParameters.vat_percent > 100) {
      showToast("error", "VAT phải từ 0 đến 100%"); return;
    }
    if (config.systemParameters.default_production_days <= 0) {
      showToast("error", "Số ngày sản xuất mặc định phải lớn hơn 0"); return;
    }
    for (const [, pct] of Object.entries(config.systemParameters.rush_percent_by_days_early)) {
      if (pct < 0 || pct > 100) { showToast("error", "Phụ thu gấp phải từ 0 đến 100%"); return; }
    }
    if (config.design.default_design_cost < 0) {
      showToast("error", "Chi phí thiết kế không được âm"); return;
    }
    for (const [, proc] of Object.entries(config.processCosts.by_process)) {
      if (proc.unit_price < 0) { showToast("error", "Đơn giá công đoạn không được âm"); return; }
    }
    for (const plate of config.platePrices.items) {
      if (plate.price_per_plate < 0) { showToast("error", "Giá bản kẽm không được âm"); return; }
    }
    const payTotal = config.paymentTerms.deposit_percent + config.paymentTerms.remaining_percent;
    if (payTotal !== 100) {
      showToast("error", `Tổng tỷ lệ đặt cọc + còn lại phải bằng 100% (hiện tại: ${payTotal}%)`);
      return;
    }
    if (config.paymentTerms.deposit_percent < 0 || config.paymentTerms.remaining_percent < 0) {
      showToast("error", "Tỷ lệ thanh toán không được âm"); return;
    }

    setSaving(true);
    try {
      await baseConfigApi.updateConfigs(config);
      showToast("success", "Cập nhật cấu hình thành công!");
    } catch {
      showToast("error", "Lưu cấu hình thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  /* ───── Toast ────────── */
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 4000);
  };

  /* ───── Generic updaters ────── */
  const updateMaterialPrice = (key: string, val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      materialPrices: { ...config.materialPrices, [key]: Number(val) || 0 },
    });
  };

  const updateMaterialRate = (key: string, val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      materialRates: { ...config.materialRates, [key]: Number(val) || 0 },
    });
  };

  const updateWastePrinting = (key: string, val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      wasteRules: {
        ...config.wasteRules,
        printing: {
          ...config.wasteRules.printing,
          by_product_type: { ...config.wasteRules.printing.by_product_type, [key]: Number(val) || 0 },
        },
      },
    });
  };

  const updateWastePrintingField = (field: "per_plate" | "default", val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      wasteRules: {
        ...config.wasteRules,
        printing: { ...config.wasteRules.printing, [field]: Number(val) || 0 },
      },
    });
  };

  const updateWasteSection = (
    section: "dieCutting" | "mounting" | "coating" | "lamination" | "gluing",
    key: string,
    val: string
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      wasteRules: {
        ...config.wasteRules,
        [section]: { ...config.wasteRules[section], [key]: Number(val) || 0 },
      },
    });
  };

  const updateProcessCost = (code: string, field: "unit_price" | "unit" | "note", val: string) => {
    if (!config) return;
    const process = { ...config.processCosts.by_process[code] };
    if (field === "unit_price") {
      process.unit_price = Number(val) || 0;
    } else {
      process[field] = val;
    }
    setConfig({
      ...config,
      processCosts: {
        by_process: { ...config.processCosts.by_process, [code]: process },
      },
    });
  };

  const updateSystemParam = (key: string, val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      systemParameters: { ...config.systemParameters, [key]: Number(val) || 0 },
    });
  };

  const updateRushPercent = (dayKey: string, val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      systemParameters: {
        ...config.systemParameters,
        rush_percent_by_days_early: {
          ...config.systemParameters.rush_percent_by_days_early,
          [dayKey]: Number(val) || 0,
        },
      },
    });
  };

  const updatePlatePriceItem = (index: number, val: string) => {
    if (!config) return;
    const items = [...config.platePrices.items];
    items[index] = { ...items[index], price_per_plate: Number(val) || 0 };
    setConfig({
      ...config,
      platePrices: { ...config.platePrices, items },
    });
  };

  const updatePaymentTerm = (key: "deposit_percent" | "remaining_percent", val: string) => {
    if (!config) return;
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    const other = Math.max(0, 100 - num);
    setConfig({
      ...config,
      paymentTerms: {
        deposit_percent: key === "deposit_percent" ? num : other,
        remaining_percent: key === "remaining_percent" ? num : other,
      },
    });
  };

  const updatePlanning = (key: string, val: string) => {
    if (!config) return;
    const numericFields = ["min_start_wait_hours"];
    setConfig({
      ...config,
      planning: {
        ...config.planning,
        [key]: numericFields.includes(key) ? Number(val) || 0 : val,
      },
    });
  };

  const updateDesignCost = (val: string) => {
    if (!config) return;
    setConfig({
      ...config,
      design: { default_design_cost: Number(val) || 0 },
    });
  };

  /* ════════════════════════════════
     RENDER
  ═════════════════════════════════ */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Đang tải cấu hình hệ thống...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <FiAlertCircle className="mx-auto mb-3 text-red-400" size={40} />
          <p className="text-gray-600 mb-4">Không thể tải cấu hình. Vui lòng thử lại.</p>
          <button onClick={fetchConfig} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ═══ Toast ═══ */}
      <div
        className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border transition-all duration-500
          ${toast.show ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"}
          ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}
        `}
      >
        {toast.type === "success" ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
        <span className="text-sm font-medium">{toast.message}</span>
      </div>

      <div className="max-w-5xl mx-auto space-y-6 pb-8">
        {/* ═══ Page Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FiSettings className="text-blue-600" />
              Cấu hình nguyên liệu
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý giá nguyên vật liệu, định mức tiêu hao, chi phí công đoạn và các thông số hệ thống
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 
                         hover:bg-gray-50 hover:border-gray-300 active:scale-[0.97] transition-all shadow-sm"
            >
              <FiRefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Tải lại
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
                         hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <FiSave size={15} />
                  Lưu cấu hình
                </>
              )}
            </button>
          </div>
        </div>

        {/* ════════════════════
           1. GIÁ NGUYÊN LIỆU
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiDollarSign}
            title="Giá nguyên liệu"
            subtitle="Đơn giá các loại nguyên vật liệu chính (VNĐ/kg)"
            color="bg-blue-50 text-blue-600"
            isOpen={openSections.materialPrices}
            onToggle={() => toggleSection("materialPrices")}
          />
          {openSections.materialPrices && (
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(config.materialPrices).map(([key, val]) => (
                <ConfigField
                  key={key}
                  label={MATERIAL_PRICE_LABELS[key] || key}
                  value={val}
                  onChange={(v) => updateMaterialPrice(key, v)}
                  suffix="VNĐ"
                />
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════
           2. ĐỊNH MỨC TIÊU HAO
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiPercent}
            title="Định mức tiêu hao nguyên liệu"
            subtitle="Tỉ lệ tiêu hao nguyên vật liệu trên mỗi m²"
            color="bg-purple-50 text-purple-600"
            isOpen={openSections.materialRates}
            onToggle={() => toggleSection("materialRates")}
          />
          {openSections.materialRates && (
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(config.materialRates).map(([key, val]) => (
                <ConfigField
                  key={key}
                  label={MATERIAL_RATE_LABELS[key] || key}
                  value={val}
                  onChange={(v) => updateMaterialRate(key, v)}
                  suffix="kg/m²"
                />
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════
           3. BÙ HAO – IN ẤN
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiLayers}
            title="Bù hao – In ấn"
            subtitle="Định mức bù hao giấy theo loại sản phẩm và cài đặt in"
            color="bg-amber-50 text-amber-600"
            isOpen={openSections.wastePrinting}
            onToggle={() => toggleSection("wastePrinting")}
          />
          {openSections.wastePrinting && (
            <div className="px-5 pb-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <ConfigField
                  label="Bù hao mỗi kẽm (tờ)"
                  value={config.wasteRules.printing.per_plate}
                  onChange={(v) => updateWastePrintingField("per_plate", v)}
                  suffix="tờ/kẽm"
                />
                <ConfigField
                  label="Bù hao mặc định (tờ)"
                  value={config.wasteRules.printing.default}
                  onChange={(v) => updateWastePrintingField("default", v)}
                  suffix="tờ"
                />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Theo loại sản phẩm
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(config.wasteRules.printing.by_product_type).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={WASTE_PRINTING_LABELS[key] || key}
                      value={val}
                      onChange={(v) => updateWastePrinting(key, v)}
                      suffix="tờ"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           4. BÙ HAO – CÁC CÔNG ĐOẠN KHÁC
        ═════════════════════ */}
        {/* Die Cutting */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiGrid}
            title="Bù hao – Bế / Bồi / Phủ / Cán / Dán"
            subtitle="Bù hao cho các công đoạn gia công sau in"
            color="bg-rose-50 text-rose-600"
            isOpen={openSections.wasteDieCutting}
            onToggle={() => toggleSection("wasteDieCutting")}
          />
          {openSections.wasteDieCutting && (
            <div className="px-5 pb-5 space-y-6">
              {/* Bế */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bế (Die cutting)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(config.wasteRules.dieCutting).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={WASTE_DIECUTING_LABELS[key] || key}
                      value={val}
                      onChange={(v) => updateWasteSection("dieCutting", key, v)}
                      suffix="tờ"
                    />
                  ))}
                </div>
              </div>
              {/* Bồi */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bồi (Mounting)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(config.wasteRules.mounting).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={WASTE_DIECUTING_LABELS[key] || key}
                      value={val}
                      onChange={(v) => updateWasteSection("mounting", key, v)}
                      suffix="tờ"
                    />
                  ))}
                </div>
              </div>
              {/* Phủ */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Phủ (Coating)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(config.wasteRules.coating).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={WASTE_COATING_LABELS[key] || key}
                      value={val}
                      onChange={(v) => updateWasteSection("coating", key, v)}
                      suffix="tờ"
                    />
                  ))}
                </div>
              </div>
              {/* Cán */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cán màng (Lamination)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(config.wasteRules.lamination).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={WASTE_LAMINATION_LABELS[key] || key}
                      value={val}
                      onChange={(v) => updateWasteSection("lamination", key, v)}
                      suffix="tờ"
                    />
                  ))}
                </div>
              </div>
              {/* Dán */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Dán (Gluing)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(config.wasteRules.gluing).map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={WASTE_GLUING_LABELS[key] || key}
                      value={val}
                      onChange={(v) => updateWasteSection("gluing", key, v)}
                      suffix="tờ"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           5. CHI PHÍ CÔNG ĐOẠN
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiTool}
            title="Chi phí công đoạn"
            subtitle="Đơn giá gia công cho từng công đoạn sản xuất"
            color="bg-teal-50 text-teal-600"
            isOpen={openSections.processCosts}
            onToggle={() => toggleSection("processCosts")}
          />
          {openSections.processCosts && (
            <div className="px-5 pb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Công đoạn</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Đơn giá</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Đơn vị</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(config.processCosts.by_process).map(([code, proc]) => (
                      <tr key={code} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono">{code}</span>
                            <span className="text-gray-700 text-sm">{PROCESS_CODE_LABELS[code] || code}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <CurrencyTableInput
                            value={proc.unit_price}
                            onChange={(val) => updateProcessCost(code, "unit_price", String(val))}
                            className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={proc.unit}
                            onChange={(e) => updateProcessCost(code, "unit", e.target.value)}
                            className="w-20 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={proc.note}
                            onChange={(e) => updateProcessCost(code, "note", e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                                       focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           6. THÔNG SỐ HỆ THỐNG
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiSettings}
            title="Thông số hệ thống"
            subtitle="VAT, số ngày sản xuất mặc định, phụ thu gấp..."
            color="bg-indigo-50 text-indigo-600"
            isOpen={openSections.systemParams}
            onToggle={() => toggleSection("systemParams")}
          />
          {openSections.systemParams && (
            <div className="px-5 pb-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(config.systemParameters)
                  .filter(([key]) => key !== "rush_percent_by_days_early")
                  .map(([key, val]) => (
                    <ConfigField
                      key={key}
                      label={SYSTEM_PARAM_LABELS[key] || key}
                      value={val as number}
                      onChange={(v) => updateSystemParam(key, v)}
                    />
                  ))}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Phụ thu gấp theo số ngày sớm hơn (%)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(config.systemParameters.rush_percent_by_days_early).map(([day, pct]) => (
                    <ConfigField
                      key={day}
                      label={`Sớm ${day} ngày`}
                      value={pct}
                      onChange={(v) => updateRushPercent(day, v)}
                      suffix="%"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           7. CHI PHÍ THIẾT KẾ
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiEdit3}
            title="Chi phí thiết kế"
            subtitle="Chi phí thiết kế mặc định"
            color="bg-pink-50 text-pink-600"
            isOpen={openSections.design}
            onToggle={() => toggleSection("design")}
          />
          {openSections.design && (
            <div className="px-5 pb-5">
              <div className="max-w-sm">
                <ConfigField
                  label="Chi phí thiết kế mặc định"
                  value={config.design.default_design_cost}
                  onChange={updateDesignCost}
                  suffix="VNĐ"
                />
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           8. GIÁ BẢN KẼM
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiGrid}
            title="Giá bản kẽm"
            subtitle="Giá bản kẽm theo kích thước"
            color="bg-cyan-50 text-cyan-600"
            isOpen={openSections.platePrices}
            onToggle={() => toggleSection("platePrices")}
          />
          {openSections.platePrices && (
            <div className="px-5 pb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phân loại</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kích thước</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rộng (cm)</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cao (cm)</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Giá/bản kẽm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.platePrices.items.map((plate, idx) => (
                      <tr key={plate.key} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium
                            ${plate.category === "small" ? "bg-green-100 text-green-700" : ""}
                            ${plate.category === "medium" ? "bg-blue-100 text-blue-700" : ""}
                            ${plate.category === "large" ? "bg-orange-100 text-orange-700" : ""}
                            ${plate.category === "xlarge" ? "bg-red-100 text-red-700" : ""}
                          `}>
                            {plate.category_text}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-700">{plate.size_text}</td>
                        <td className="py-3 px-3 text-gray-600">{plate.width_cm}</td>
                        <td className="py-3 px-3 text-gray-600">{plate.height_cm}</td>
                        <td className="py-3 px-3">
                          <div className="relative">
                            <CurrencyTableInput
                              value={plate.price_per_plate}
                              onChange={(val) => updatePlatePriceItem(idx, String(val))}
                              className="w-36 pr-12 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm
                                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">VNĐ</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           9. ĐIỀU KHOẢN THANH TOÁN
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiCreditCard}
            title="Điều khoản thanh toán"
            subtitle="Tỷ lệ đặt cọc và thanh toán còn lại"
            color="bg-emerald-50 text-emerald-600"
            isOpen={openSections.paymentTerms}
            onToggle={() => toggleSection("paymentTerms")}
          />
          {openSections.paymentTerms && (
            <div className="px-5 pb-5 space-y-4 max-w-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ConfigField
                  label="Tỷ lệ đặt cọc (%)"
                  value={config.paymentTerms.deposit_percent}
                  onChange={(v) => updatePaymentTerm("deposit_percent", v)}
                  suffix="%"
                />
                <ConfigField
                  label="Còn lại (%)"
                  value={config.paymentTerms.remaining_percent}
                  onChange={(v) => updatePaymentTerm("remaining_percent", v)}
                  suffix="%"
                />
              </div>
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tổng: {config.paymentTerms.deposit_percent + config.paymentTerms.remaining_percent}%</span>
                  <span className={
                    config.paymentTerms.deposit_percent + config.paymentTerms.remaining_percent === 100
                      ? "text-emerald-600 font-medium" : "text-red-500 font-medium"
                  }>
                    {config.paymentTerms.deposit_percent + config.paymentTerms.remaining_percent === 100
                      ? "✓ Hợp lệ" : "✗ Phải bằng 100%"}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-blue-500 rounded-l-full transition-all duration-300"
                    style={{ width: `${Math.min(config.paymentTerms.deposit_percent, 100)}%` }}
                  />
                  <div
                    className="h-full bg-emerald-500 rounded-r-full transition-all duration-300"
                    style={{ width: `${Math.min(config.paymentTerms.remaining_percent, 100 - Math.min(config.paymentTerms.deposit_percent, 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-600 font-medium">Đặt cọc: {config.paymentTerms.deposit_percent}%</span>
                  <span className="text-emerald-600 font-medium">Còn lại: {config.paymentTerms.remaining_percent}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════
           10. LỊCH LÀM VIỆC
        ═════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            icon={FiClock}
            title="Lịch làm việc & Kế hoạch"
            subtitle="Cài đặt thời gian làm việc, nghỉ trưa và thời gian chờ tối thiểu"
            color="bg-sky-50 text-sky-600"
            isOpen={openSections.planning}
            onToggle={() => toggleSection("planning")}
          />
          {openSections.planning && (
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(config.planning).map(([key, val]) => (
                <ConfigField
                  key={key}
                  label={PLANNING_LABELS[key] || key}
                  value={val}
                  onChange={(v) => updatePlanning(key, v)}
                  type={key === "min_start_wait_hours" ? "number" : "text"}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══ Bottom save bar ═══ */}
        <div className="sticky bottom-4 bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-lg">
          <p className="text-sm text-gray-500">
            Thay đổi sẽ chỉ có hiệu lực sau khi nhấn <strong>Lưu cấu hình</strong>.
          </p>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
            >
              Hủy thay đổi
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                         hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <FiSave size={15} />
                  Lưu cấu hình
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
