"use client";

import { productionsApi } from "@/apiRequests/productions";
import { tasksApi } from "@/apiRequests/tasks";
import Loading from "@/app/manager/loading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { BiPackage } from "react-icons/bi";
import { getSignalRConnection } from "@/lib/signalr";
import {
  BsArrowLeft,
  BsClock,
  BsChevronDown,
  BsChevronUp,
  BsPrinter,
  BsCalendar,
  BsPerson,
  BsCheckCircle,
  BsExclamationTriangle,
  BsGear,
  BsBoxSeam,
  BsArrowRight,
  BsClipboardCheck,
  BsEye,
  BsXLg,
  BsLayers,
} from "react-icons/bs";


/* =======================
   TYPES
======================= */
export interface InputMaterial {
  name: string;
  code: string;
  quantity: number;
  unit: string;
}

export interface OutputProduct {
  name: string;
  code: string;
  quantity: number;
  unit: string;
}

export interface ScanLog {
  scanned_at: string;
  qty_good: number;
  qty_bad: number;
}

export interface ProductionStage {
  process_id: number;
  seq_num: number;
  process_name: string;
  process_code: string;
  machine: string;
  task_id: number;
  task_name: string;
  status: "Finished" | "InProcessing" | "Ready" | "Unassigned";
  assigned_to: string | null;
  assigned_to_name: string | null;
  start_time?: string;
  end_time?: string;
  planned_start_time: string;
  planned_end_time: string;
  qty_good: number;
  qty_bad: number;
  waste_percent: number;
  last_scan_time: string | null;
  logs: ScanLog[];
  input_materials: InputMaterial[];
  output_product: OutputProduct;
}

export interface ProductionResponse {
// --- Định danh và Mã số ---
  prod_id: number;
  production_code: string;
  production_status: string;
  start_date: string | null;
  end_date: string | null;
  order_id: number;
  order_code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  ready_print_file: string;
  ink_type_names: string;
  paper_name?: string | null;
  wave_type?: string | null;
  coating_type?: string | null;
  paper_alternative?: string | null;
  wave_alternative?: string | null;
  created_at: string;
  planned_start_date: string;
  actual_start_date: string | null;
  stages: ProductionStage[];
}

/* =======================
   STATUS MAP
======================= */
const STATUS_MAP: Record<
  ProductionStage["status"],
  { label: string; color: string; bg: string; border: string }
> = {
  Finished: {
    label: "Hoàn thành",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  Ready: {
    label: "Sẵn sàng",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  InProcessing: {
    label: "Đang xử lý",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  Unassigned: {
    label: "Chưa phân công",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
  },
};

const PRODUCTION_STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Scheduled: {
    label: "Đã lên lịch",
    color: "text-blue-700",
    bg: "bg-blue-100",
  },
  InProcessing: {
    label: "Đang sản xuất",
    color: "text-yellow-700",
    bg: "bg-yellow-100",
  },
  Finished: {
    label: "Hoàn thành",
    color: "text-green-700",
    bg: "bg-green-100",
  },
};

/* =======================
   HELPERS
======================= */
function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const subtractDays = (date?: string | null, days?: number) => {
  if (!date) return "";
  const d = new Date(date);
  d.setDate(d.getDate() - (days ?? 0));
  return d.toISOString();
};

function getDeliveryUrgency(dateStr: string) {
  const today = new Date();
  const delivery = new Date(dateStr);
  const diffDays = Math.ceil(
    (delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 3)
    return {
      text: `Còn ${diffDays} ngày`,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
    };
  if (diffDays < 7)
    return {
      text: `Còn ${diffDays} ngày`,
      color: "text-yellow-600",
      bg: "bg-yellow-50 border-yellow-200",
    };
  return {
    text: `Còn ${diffDays} ngày`,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  };
}

/* =======================
   QR MODAL
======================= */
function QrModal({
  token,
  onClose,
  onConfirm,
}: {
  token: string;
  onClose: () => void;
  onConfirm: (manualToken?: string) => void;
}) {
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasScannedRef = useRef(false);

  // Keep focus on the hidden input so barcode scanner input is captured
  const focusInput = useCallback(() => {
    if (!hasScannedRef.current && !showManualInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showManualInput]);

  useEffect(() => {
    hasScannedRef.current = false;
    focusInput();
    // Re-focus every 500ms in case focus is lost
    const interval = setInterval(focusInput, 500);
    return () => clearInterval(interval);
  }, [token, focusInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (hasScannedRef.current) return;
    if (e.key === "Enter") {
      const scannedVal = e.currentTarget.value.trim();
      if (!scannedVal) return;
      hasScannedRef.current = true;
      inputRef.current?.blur();
      onConfirm(scannedVal);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={focusInput}
    >
      {showManualInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[340px] shadow-lg">
            <h3 className="font-semibold text-blue-700 mb-3 text-center">
              Nhập token thủ công
            </h3>
            <p className="text-sm text-gray-600 mb-3 text-center">
              Token cần nhập:
              <br />
              <span className="font-mono text-blue-600 break-all">
                {token}
              </span>
            </p>
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Nhập token..."
              className="w-full border rounded-lg px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowManualInput(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!manualToken.trim()) return;
                  onConfirm(manualToken.trim());
                  setShowManualInput(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-blue-200 p-6 w-[340px] text-center shadow-lg">
        <h3 className="font-semibold text-blue-700 mb-4">
          Quét QR để hoàn thành công đoạn
        </h3>
        <div className="flex justify-center mb-4">
          <QRCodeCanvas value={token} size={220} includeMargin />
        </div>
        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          autoFocus
          className="absolute opacity-0 size-1"
          // Reset value khi blur để sẵn sàng cho lần scan tiếp
          onBlur={(e) => { e.currentTarget.value = ""; }}
        />
        <button
          onClick={onClose}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg py-2 transition"
        >
          Đóng
        </button>
        <button
          onClick={() => setShowManualInput(true)}
          className="w-full mt-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg py-2 transition"
        >
          Nhập token thủ công
        </button>
      </div>
    </div>
  );
}

/* =======================
   TIMELINE
======================= */
function ProductionTimeline({ stages }: { stages: ProductionStage[] }) {
  const sortedStages = [...stages].sort((a, b) => a.seq_num - b.seq_num);

  const finishedCount = sortedStages.filter(
    (s) => s.status === "Finished"
  ).length;
  const progressPercent =
    sortedStages.length > 0
      ? (finishedCount / sortedStages.length) * 100
      : 0;

  return (
    <div className="relative">
      {/* Progress bar bg */}
      <div className="absolute top-5 left-0 right-0 h-1.5 bg-gray-200 rounded-full" />
      {/* Progress bar fill */}
      <div
        className="absolute top-5 left-0 h-1.5 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />

      <div className="flex justify-between relative">
        {sortedStages.map((stage, index) => {
          const isDone = stage.status === "Finished";
          const isCurrent =
            stage.status === "InProcessing" || stage.status === "Ready";

          return (
            <div
              key={stage.process_id}
              className="flex flex-col items-center text-center flex-1"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 text-sm font-bold transition-all duration-300
                ${
                  isDone
                    ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200"
                    : isCurrent
                    ? "bg-white border-blue-500 text-blue-600 shadow-md shadow-blue-200 ring-4 ring-blue-100"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isDone ? (
                  <BsCheckCircle className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>

              <span
                className={`mt-2 text-xs font-semibold leading-tight
                ${
                  isDone
                    ? "text-green-600"
                    : isCurrent
                    ? "text-blue-600"
                    : "text-gray-400"
                }`}
              >
                {stage.process_name}
              </span>

              <span
                className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full font-medium
                ${
                  isDone
                    ? "bg-green-100 text-green-700"
                    : isCurrent
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {STATUS_MAP[stage.status].label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =======================
   INFO CARD COMPONENT
======================= */
function InfoCard({
  icon,
  label,
  value,
  subValue,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 ${className}`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
        {subValue && (
          <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>
        )}
      </div>
    </div>
  );
}

/* =======================
   PAGE
======================= */
export default function ProductionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  

  const [qtyInputStage, setQtyInputStage] =
    useState<ProductionStage | null>(null);
  const [qtyInputValue, setQtyInputValue] = useState<string>("");

  const [collapsedStages, setCollapsedStages] =
    useState<Record<number, boolean>>({});
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [popup, setPopup] = useState<{
    open: boolean;
    type: "success" | "error";
    message: string;
  }>({ open: false, type: "success", message: "" });
  const [showPreview, setShowPreview] = useState(false);

  const toggleStage = (processId: number) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [processId]: !prev[processId],
    }));
  };

  const { data: production, isLoading } =
    useQuery<ProductionResponse>({
      queryKey: ["production-detail", id],
      queryFn: async () => {
        return productionsApi.getProdyctionByOrderId(id!.toString());
      },
      enabled: !!id,
    });


  const sortedStages = useMemo(() => {
    return production?.stages
      ?.slice()
      .sort((a, b) => a.seq_num - b.seq_num);
  }, [production]);

  //signalr
  useEffect(() => {
  let conn: any;

  const init = async () => {
    conn = await getSignalRConnection();

    const handler = () => {
      console.log("🔥 nhận update-ui");

      // ✅ Refetch lại data
      queryClient.invalidateQueries({
        queryKey: ["production-detail", id],
      });
    };

    conn.on("update-ui", handler);

    // cleanup đúng chuẩn
    return () => {
      if (conn) {
        conn.off("update-ui", handler);
      }
    };
  };

  init();
}, [queryClient, id]);

  /* ===== COMPUTED ===== */
  const finishedStages =
    sortedStages?.filter((s) => s.status === "Finished").length ?? 0;
  const totalStages = sortedStages?.length ?? 0;
  const overallProgress =
    totalStages > 0 ? Math.round((finishedStages / totalStages) * 100) : 0;

  /* ===== QR LOGIC ===== */
  const handleCreateQr = async (
    stage: ProductionStage,
    qtyOverride?: number
  ) => {
    try {
      setQrLoading(true);

      const defaultQty = Number(stage.output_product?.quantity || 0);

      if (qtyOverride !== undefined && qtyOverride < 0) {
        setPopup({
          open: true,
          type: "error",
          message: "Số lượng không hợp lệ",
        });
        return;
      }

      const finalQty =
        qtyOverride && qtyOverride > 0 ? qtyOverride : defaultQty;

      const data = await tasksApi.createQRByStageId({
        task_id: stage.task_id,
        ttl_minutes: 30,
        qty_good: finalQty,
      });

      setQrToken((data as any)?.token ?? (data as any)?.data?.token);
    } catch (err: any) {
      setPopup({
        open: true,
        type: "error",
        message: err.message || "Lỗi khi tạo QR",
      });
    } finally {
      setQrLoading(false);
    }
  };

  const handleQrScanned = async (scannedToken: string) => {
    try {
      setQrLoading(true);
      await tasksApi.finishTask({ token: scannedToken });

      setQrToken(null);
      setPopup({
        open: true,
        type: "success",
        message: "Hoàn thành công đoạn thành công 🎉",
      });
      setTimeout(async () => {
        setPopup((p) => ({ ...p, open: false }));
        await queryClient.invalidateQueries({
          queryKey: ["production-detail", id],
        });
      }, 900);
    } catch (err: any) {
      setPopup({
        open: true,
        type: "error",
        message: err.message || "Lỗi khi hoàn thành công đoạn",
      });
    } finally {
      setQrLoading(false);
    }
  };

  if (isLoading) return <Loading text="Đang tải dữ liệu..." />;

  const productionStatus =
    PRODUCTION_STATUS_MAP[production?.production_status ?? ""] ?? {
      label: production?.production_status,
      color: "text-gray-700",
      bg: "bg-gray-100",
    };

  const deliveryUrgency = production?.delivery_date
    ? getDeliveryUrgency(production.delivery_date)
    : null;

  const inkTypes = production?.ink_type_names
    ? production.ink_type_names.split(",").map((s) => s.trim())
    : [];
    //=================
    const lastStage = sortedStages?.[sortedStages.length - 1];
    const addDays = (date?: string | null, days: number = 0) => {
      if (!date) return "";
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d.toISOString();
    };
    const finalDeadline = lastStage?.planned_end_time
  ? addDays(lastStage.planned_end_time, 1)
  : null;
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* BACK BUTTON */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-5 text-sm font-medium transition-colors"
      >
        <BsArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* =================== HEADER =================== */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {production?.production_code}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${productionStatus.bg} ${productionStatus.color}`}
              >
                {productionStatus.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Đơn hàng:{" "}
              <span className="font-semibold text-gray-700">
                {production?.order_code}
              </span>
              <span className="mx-2">•</span>
              Khách hàng:{" "}
              <span className="font-semibold text-gray-700">
                {production?.customer_name}
              </span>
            </p>
          </div>

          {deliveryUrgency && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${deliveryUrgency.bg} ${deliveryUrgency.color}`}
            >
              <BsExclamationTriangle className="w-4 h-4" />
              Giao hàng: {formatDate(production?.delivery_date)} (
              {deliveryUrgency.text})
            </div>
          )}
        </div>
      </div>

      {/* =================== INFO CARDS =================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <InfoCard
          icon={<BsBoxSeam className="w-5 h-5" />}
          label="Sản phẩm"
          value={production?.product_name ?? "—"}
          subValue={`${production?.length_mm} × ${production?.width_mm} × ${production?.height_mm} mm`}
        />
        <InfoCard
          icon={<BiPackage className="w-5 h-5" />}
          label="Số lượng đặt hàng"
          value={production?.quantity?.toLocaleString("vi-VN") ?? "—"}
        />
        <InfoCard
          icon={<BsCalendar className="w-5 h-5" />}
          label="Hạn hoàn thành dự kiến"
          value={formatDateTime(finalDeadline)}
        />
        <InfoCard
          icon={<BsClock className="w-5 h-5" />}
          label="Bắt đầu thực tế"
          value={formatDateTime(production?.actual_start_date)}
          subValue={
            production?.planned_start_date
              ? `Dự kiến: ${formatDateTime(production.planned_start_date)}`
              : undefined
          }
        />
      </div>

      {/* =================== INK TYPES & PRINT FILE =================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BsPrinter className="w-4 h-4 text-blue-600" />
              Mực in & Phụ liệu
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">Mực tiêu chuẩn</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4 pt-4 border-t border-gray-100">
            {production?.paper_name && (
              <div className="min-w-[120px]">
                <span className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">Loại giấy</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">{production.paper_name}</span>
              </div>
            )}
            {production?.paper_alternative && (
              <div className="min-w-[120px]">
                <span className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">Giấy thay thế</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">{production.paper_alternative}</span>
              </div>
            )}
            {production?.wave_type && (
              <div className="min-w-[120px]">
                <span className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">Loại sóng</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">{production.wave_type}</span>
              </div>
            )}
            {production?.wave_alternative && (
              <div className="min-w-[120px]">
                <span className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">Sóng thay thế</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">{production.wave_alternative}</span>
              </div>
            )}
            {production?.coating_type && (
              <div className="min-w-[120px]">
                <span className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">Loại phủ</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">{production.coating_type}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BsClipboardCheck className="w-4 h-4 text-blue-600" />
            File in sẵn sàng
          </h3>
          {production?.ready_print_file ? (
            <div>
              {/* Thumbnail preview */}
              <div
                className="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-3 max-w-[400px]"
                onClick={() => setShowPreview(true)}
              >
                <img
                  src={production.ready_print_file}
                  alt="File in sẵn sàng"
                  className="w-full h-auto max-h-[250px] object-contain"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/60 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                    <BsEye className="w-4 h-4" />
                    Xem phóng to
                  </span>
                </div>
              </div>
              <a
                href={production.ready_print_file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                <BsArrowRight className="w-3 h-3" />
                Mở trong tab mới
              </a>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Chưa có file</span>
          )}
        </div>
      </div>

      {/* =================== OVERALL PROGRESS =================== */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <BsGear className="w-4 h-4 text-blue-600" />
            Tiến độ tổng thể
          </h3>
          <span className="text-sm font-bold text-blue-600">
            {finishedStages}/{totalStages} công đoạn ({overallProgress}%)
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-green-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* =================== TIMELINE =================== */}
      {sortedStages && sortedStages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm overflow-x-auto">
          <h2 className="font-semibold mb-6 flex items-center gap-2 text-gray-800">
            <BsClock className="w-5 h-5 text-blue-600" /> Tiến độ công đoạn
          </h2>
          <div className="min-w-[600px]">
            <ProductionTimeline stages={sortedStages} />
          </div>
        </div>
      )}

      {/* =================== STAGE DETAILS =================== */}
      <div className="space-y-4">
        <h2 className="font-semibold flex items-center gap-2 text-gray-800 text-lg">
          <BsGear className="w-5 h-5 text-blue-600" /> Chi tiết từng công
          đoạn
        </h2>

        {sortedStages?.map((stage, index) => {
          const isCollapsed = collapsedStages[stage.process_id] ?? true;
          const statusInfo = STATUS_MAP[stage.status];          return (
            <div
              key={stage.process_id}
              className={`rounded-2xl border overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md ${statusInfo.border}`}
            >
              {/* Stage Header */}
              <div
                className={`flex justify-between items-center px-5 py-4 cursor-pointer ${statusInfo.bg}`}
                onClick={() => toggleStage(stage.process_id)}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                      stage.status === "Finished"
                        ? "bg-green-500 border-green-500 text-white"
                        : stage.status === "InProcessing" ||
                          stage.status === "Ready"
                        ? "bg-white border-blue-500 text-blue-600"
                        : "bg-white border-gray-300 text-gray-400"
                    }`}
                  >
                    {stage.status === "Finished" ? (
                      <BsCheckCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                      {stage.process_name}
                      <span className="text-gray-400 font-normal text-sm">
                        (Phụ trách: Phòng {stage.process_name})
                      </span>
                    </h3>
                    <div className="flex items-center flex-wrap gap-2">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-md ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}
                      >
                        {production?.production_status === "Scheduled"
                          ? "Chưa bắt đầu sản xuất"
                          : statusInfo.label}
                      </span>
                      {stage.assigned_to_name && (
                        <span className="text-xs text-gray-600 font-medium flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200">
                          <BsPerson className="w-3.5 h-3.5" />
                          {stage.assigned_to_name}
                        </span>
                      )}
                      <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5 px-3 py-1 bg-blue-100 rounded-md border border-blue-300 shadow-sm">
                        <BsClock className="w-3.5 h-3.5" />
                        Dự kiến: {formatDateTime(stage.planned_start_time)} - {formatDateTime(stage.planned_end_time)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isCollapsed ? (
                    <BsChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <BsChevronUp className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Stage Body */}
              {!isCollapsed && (
                <div className="p-5 space-y-5">
                  {/* Time Info - Actual Time */}
                  <div className="w-full">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <p className="text-xs text-green-600 font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <BsClock className="w-3.5 h-3.5" />
                        Thời gian thực tế
                      </p>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-green-100">
                          <span className="text-gray-500 font-medium">Bắt đầu:</span>
                          <span className="font-bold text-gray-800">
                            {formatDateTime(stage.start_time)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-green-100">
                          <span className="text-gray-500 font-medium">Kết thúc:</span>
                          <span className="font-bold text-gray-800">
                            {formatDateTime(stage.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Materials I/O */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Input Materials */}
                    <div className="flex flex-col">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                        <BsArrowRight className="w-4 h-4 text-orange-500" />
                        Nguyên vật liệu đầu vào
                      </h4>
                      <div className="border rounded-xl overflow-hidden flex-1">
                        <table className="w-full text-sm">
                          <thead className="bg-orange-50">
                            <tr>
                              <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600">
                                Tên vật liệu
                              </th>
                              <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-600">
                                Số lượng
                              </th>
                              <th className="px-3 py-2.5 text-center text-xs font-semibold text-orange-600">
                                ĐVT
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stage.input_materials.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-3 py-4 text-center text-gray-400 text-xs"
                                >
                                  Không có dữ liệu
                                </td>
                              </tr>
                            ) : (
                              stage.input_materials.map(
                                (m: any, i: number) => (
                                  <tr
                                    key={i}
                                    className="border-t hover:bg-orange-50/50 transition"
                                  >
                                    <td className="px-3 py-2.5 text-gray-700">
                                      {m.name}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-semibold">
                                      {typeof m.quantity === "number"
                                        ? m.quantity % 1 !== 0
                                          ? m.quantity.toFixed(2)
                                          : m.quantity.toLocaleString("vi-VN")
                                        : m.quantity}
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-gray-500">
                                      {m.unit}
                                    </td>
                                  </tr>
                                )
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Output Product */}
                    <div className="flex flex-col">
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                        <BsBoxSeam className="w-4 h-4 text-green-500" />
                        Thành phẩm công đoạn
                      </h4>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col justify-center flex-1">
                        <p className="font-semibold text-green-800 mb-1">
                          {stage.output_product.name}
                        </p>
                        <p className="text-sm text-green-600">
                          Số lượng:{" "}
                          <span className="font-bold text-lg">
                            {stage.output_product.quantity.toLocaleString(
                              "vi-VN"
                            )}
                          </span>{" "}
                          {stage.output_product.unit}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Scan Logs */}
                  {stage.logs && stage.logs.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                        <BsClipboardCheck className="w-4 h-4 text-purple-500" />
                        Lịch sử scan
                      </h4>
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-purple-50">
                            <tr>
                              <th className="px-3 py-2.5 text-left text-xs font-semibold text-purple-600">
                                Thời gian
                              </th>
                              <th className="px-3 py-2.5 text-right text-xs font-semibold text-purple-600">
                                Số lượng thành phẩm
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stage.logs.map((log, i) => (
                              <tr key={i} className="border-t">
                                <td className="px-3 py-2.5">
                                  {formatDateTime(stage.end_time)}
                                </td>
                                <td className="px-3 py-2.5 text-right text-green-600 font-bold">
                                  {log.qty_good}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Last scan info & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-gray-100 mt-2">
                    <p className="text-xs text-gray-400">
                      {stage.last_scan_time
                        ? `Lần scan cuối: ${formatDateTime(stage.last_scan_time)}`
                        : "Chưa có dữ liệu scan"}
                    </p>
                    
                    {["InProcessing", "Ready"].includes(stage.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQtyInputValue(stage.output_product?.quantity?.toString() || "");
                          setQtyInputStage(stage);
                        }}
                        disabled={qrLoading}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                      >
                        <BsClipboardCheck className="w-4 h-4" /> Báo cáo hoàn thành (QR)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =================== MODALS =================== */}

      {/* Qty Input Modal */}
      {qtyInputStage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[320px] shadow-lg">
            <h3 className="font-semibold text-blue-700 mb-4">
              Nhập số lượng tạo QR
            </h3>
            <input
              type="number"
              min={1}
              placeholder="Để trống = số lượng mặc định"
              value={qtyInputValue}
              onChange={(e) => setQtyInputValue(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setQtyInputStage(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  handleCreateQr(
                    qtyInputStage,
                    qtyInputValue ? Number(qtyInputValue) : undefined
                  );
                  setQtyInputStage(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrToken && (
        <QrModal
          token={qrToken}
          onClose={() => setQrToken(null)}
          onConfirm={(manualToken) =>
            handleQrScanned(manualToken ?? qrToken)
          }
        />
      )}

      {/* Popup */}
      {popup.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[320px] text-center shadow-lg">
            <h3
              className={`font-semibold mb-3 ${
                popup.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {popup.type === "success" ? "Thành công" : "Lỗi"}
            </h3>
            <p className="text-sm mb-4">{popup.message}</p>
            <button
              onClick={() => setPopup({ ...popup, open: false })}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
            >
              OK
            </button>
          </div>
        </div>
      )}
      {/* =================== PRINT FILE PREVIEW MODAL =================== */}
      {showPreview && production?.ready_print_file && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowPreview(false);
              }}
              className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-50 transition"
            >
              <BsXLg className="w-4 h-4" />
            </button>
            <img
              src={production.ready_print_file}
              alt="Preview file in"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
