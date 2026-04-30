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
  estimated_quantity: number;
  actual_quantity?: number;
  quantity_source: string;
}

export interface OutputProduct {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  estimated_quantity: number;
  actual_quantity?: number;
  quantity_source: string;
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
  n_up?: number | null;
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
                {stage.seq_num}
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
  const [qtyError, setQtyError] = useState("");

  const [qrPrepare, setQrPrepare] = useState<any>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [materialQtys, setMaterialQtys] = useState<{ [id: number]: string }>({});
  const [materialErrors, setMaterialErrors] = useState<{ [id: number]: string }>({});

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

  const [cancelStage, setCancelStage] = useState<ProductionStage | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);

  // Global Scanner Detection
  const handleQrScannedRef = useRef<any>(null);

  useEffect(() => {
  let buffer = "";
  let lastKeyTime = 0;
  let scanTimer: NodeJS.Timeout | null = null;

  const finishScan = () => {
    const value = buffer.trim();

    if (value.length >= 6 && handleQrScannedRef.current) {
      handleQrScannedRef.current(value);
    }

    buffer = "";
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const tag = document.activeElement?.tagName;

    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const now = Date.now();

    // nếu ngắt quãng quá lâu mới reset
    if (now - lastKeyTime > 200) {
      buffer = "";
    }

    lastKeyTime = now;

    if (e.key === "Enter") {
      e.preventDefault();

      if (scanTimer) clearTimeout(scanTimer);

      finishScan();
      return;
    }

    if (e.key.length === 1) {
      buffer += e.key;
    }

    // fallback nếu scanner không gửi Enter
    if (scanTimer) clearTimeout(scanTimer);

    scanTimer = setTimeout(() => {
      finishScan();
    }, 300);
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
    if (scanTimer) clearTimeout(scanTimer);
  };
}, []);

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
  const fetchQrPrepare = async (taskId: number) => {
    try {
      setPrepareLoading(true);
      const res = await tasksApi.qrPrepare(taskId);
      const data = res.data ?? res;
      setQrPrepare(data);

      const initQtys: { [id: number]: string } = {};
      const consumable = data.consumable_materials || [];
      consumable.forEach((m: any) => {
        initQtys[m.material_id] = "";
      });
      setMaterialQtys(initQtys);
      setMaterialErrors({});
    } catch (err: any) {
      console.log("Fetch qr-prepare error:", err);
      setPopup({
        open: true,
        type: "error",
        message: err.message || "Lỗi tải qr-prepare",
      });
    } finally {
      setPrepareLoading(false);
    }
  };

  const handleCreateQr = async () => {
    if (!qtyInputStage) return;
    try {
      setQrLoading(true);

      if (qrPrepare && qrPrepare.consumable_materials?.length > 0) {
        for (const mat of qrPrepare.consumable_materials) {
          const val = materialQtys[mat.material_id];
          if (val && val !== "") {
            if (Number(val) < 0) {
              setMaterialErrors((prev) => ({ ...prev, [mat.material_id]: "Số lượng không hợp lệ" }));
              return;
            }
            if (Number(val) > mat.estimated_input_qty) {
              setMaterialErrors((prev) => ({ ...prev, [mat.material_id]: `Tối đa ${mat.estimated_input_qty}` }));
              return;
            }
          }
          if (materialErrors[mat.material_id]) return;
        }
      }

      const defaultQty = Number(qtyInputStage.output_product?.quantity || 0);
      const inputVal = Number(qtyInputValue);
      
      if (qtyInputValue !== "" && inputVal <= 0) {
        setQtyError("Số lượng phải lớn hơn 0");
        return;
      }
      
      const finalQty = qtyInputValue !== "" && inputVal > 0 ? inputVal : defaultQty;

      const materials =
        qrPrepare?.consumable_materials?.map((mat: any) => {
          const qtyLeftStr = materialQtys[mat.material_id];
          const qtyLeft = qtyLeftStr === "" || qtyLeftStr === undefined ? 0 : Number(qtyLeftStr);
          return {
            material_id: mat.material_id,
            quantity_used: 0,
            is_stock: true,
            quantity_left: qtyLeft,
          };
        }) ?? [];

      const data = await tasksApi.createQRByStageId({
        task_id: qtyInputStage.task_id,
        ttl_minutes: 30,
        qty_good: finalQty,
        materials,
      });

      setQrToken((data as any)?.token ?? (data as any)?.data?.token);
      setQtyInputStage(null);
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

  const handleCancelFinish = async () => {
    if (!cancelStage) return;
    if (!cancelReason.trim()) {
      setPopup({ open: true, type: "error", message: "Vui lòng nhập lý do hoàn tác" });
      return;
    }
    try {
      setCancelLoading(true);
      await tasksApi.cancelFinish(cancelStage.task_id, { reason: cancelReason });
      setCancelStage(null);
      setCancelReason("");
      setPopup({
        open: true,
        type: "success",
        message: "Hoàn tác báo cáo thành công",
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
        message: err.message || "Lỗi khi hoàn tác báo cáo",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // Keep ref updated
  useEffect(() => {
    handleQrScannedRef.current = handleQrScanned;
  }, [handleQrScanned]);

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
      <h2 className="font-semibold flex items-center gap-2 text-gray-800 text-lg mb-4">
        <BsGear className="w-5 h-5 text-blue-600" /> Chi tiết từng công đoạn
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Chưa sản xuất */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-50 border border-yellow-200">
            <BsClock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">Chưa hoàn thành</span>
            <span className="ml-auto text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
              {sortedStages?.filter(s => s.status !== "Finished").length ?? 0}
            </span>
          </div>
          {sortedStages?.filter(s => s.status !== "Finished").length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">Tất cả công đoạn đã hoàn thành 🎉</div>
          )}

        {sortedStages?.filter(s => s.status !== "Finished").map((stage, index) => {
          const isCollapsed = collapsedStages[stage.process_id] ?? true;
          const statusInfo = STATUS_MAP[stage.status];
          return (
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
                      {stage.seq_num}
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
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100 h-full">
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

                    {/* N_UP Info */}
                    {(stage.process_name.toLowerCase().includes("cắt") || stage.process_name.toLowerCase().includes("in")) && stage.n_up != null && (
                      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 h-full">
                        <p className="text-xs text-blue-600 font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5">
                          <BsLayers className="w-3.5 h-3.5" />
                          Thông số kỹ thuật
                        </p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-blue-100">
                            <span className="text-gray-500 font-medium">Số SP / 1 tờ giấy:</span>
                            <span className="font-bold text-gray-800">
                              {stage.n_up}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
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
                                Số lượng ước tính
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
                                      {typeof m.estimated_quantity === "number"
                                        ? m.estimated_quantity % 1 !== 0
                                          ? m.estimated_quantity.toFixed(2)
                                          : m.estimated_quantity.toLocaleString("vi-VN")
                                        : m.estimated_quantity}
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
                        <p className="font-semibold text-green-800 mb-3">
                          {stage.output_product.name}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Estimated */}
                          <div className="bg-white border border-green-200 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Ước tính</p>
                            <p className="text-green-700">
                              <span className="font-bold text-lg">
                                {stage.output_product.estimated_quantity.toLocaleString("vi-VN")}
                              </span>{" "}
                              <span className="text-sm">{stage.output_product.unit}</span>
                            </p>
                          </div>
                          {/* Actual */}
                          <div className="bg-white border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">Thực tế</p>
                            <p className="text-blue-700">
                              <span className="font-bold text-lg">
                                {stage.output_product.actual_quantity != null
                                  ? stage.output_product.actual_quantity.toLocaleString("vi-VN")
                                  : "—"}
                              </span>{" "}
                              <span className="text-sm">{stage.output_product.unit}</span>
                            </p>
                          </div>
                        </div>
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
                          setQtyError("");
                          setQtyInputStage(stage);
                          fetchQrPrepare(stage.task_id);
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

        {/* Column 2: Đã hoàn thành */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200">
            <BsCheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">Đã hoàn thành</span>
            <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {sortedStages?.filter(s => s.status === "Finished").length ?? 0}
            </span>
          </div>
          {sortedStages?.filter(s => s.status === "Finished").length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">Chưa có công đoạn hoàn thành</div>
          )}
          {sortedStages?.filter(s => s.status === "Finished").map((stage, index) => {
            const isCollapsed = collapsedStages[stage.process_id] ?? true;
            const statusInfo = STATUS_MAP[stage.status];
            return (
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
                      {stage.seq_num}
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
                          {statusInfo.label}
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
                    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100 h-full">
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

                      {/* N_UP Info */}
                      {(stage.process_name.toLowerCase().includes("cắt") || stage.process_name.toLowerCase().includes("in")) && stage.n_up != null && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 h-full">
                          <p className="text-xs text-blue-600 font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <BsLayers className="w-3.5 h-3.5" />
                            Thông số kỹ thuật
                          </p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-blue-100">
                              <span className="text-gray-500 font-medium">Số SP / 1 tờ giấy:</span>
                              <span className="font-bold text-gray-800">
                                {stage.n_up}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
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
                                  Số lượng ước tính
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
                                        {typeof m.estimated_quantity === "number"
                                          ? m.estimated_quantity % 1 !== 0
                                            ? m.estimated_quantity.toFixed(2)
                                            : m.estimated_quantity.toLocaleString("vi-VN")
                                          : m.estimated_quantity}
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
                          <p className="font-semibold text-green-800 mb-3">
                            {stage.output_product.name}
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {/* Estimated */}
                            <div className="bg-white border border-green-200 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Ước tính</p>
                              <p className="text-green-700">
                                <span className="font-bold text-lg">
                                  {stage.output_product.estimated_quantity.toLocaleString("vi-VN")}
                                </span>{" "}
                                <span className="text-sm">{stage.output_product.unit}</span>
                              </p>
                            </div>
                            {/* Actual */}
                            <div className="bg-white border border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-gray-500 mb-1">Thực tế</p>
                              <p className="text-blue-700">
                                <span className="font-bold text-lg">
                                  {stage.output_product.actual_quantity != null
                                    ? stage.output_product.actual_quantity.toLocaleString("vi-VN")
                                    : "—"}
                                </span>{" "}
                                <span className="text-sm">{stage.output_product.unit}</span>
                              </p>
                            </div>
                          </div>
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
                      
                      {stage.end_time && (() => {
                        const isExpired = new Date().getTime() - new Date(stage.end_time).getTime() > 5 * 60 * 1000;
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelStage(stage);
                              setCancelReason("");
                            }}
                            disabled={isExpired}
                            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm border ${
                              isExpired
                                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                            }`}
                          >
                            <BsXLg className="w-3.5 h-3.5" /> Hoàn tác báo cáo
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* =================== MODALS =================== */}

      {/* Qty Input Modal */}
      {qtyInputStage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[400px] max-w-[95vw] shadow-lg max-h-[90vh] flex flex-col">
            <h3 className="font-semibold text-blue-700 mb-4 text-center">
              Nhập thông tin hoàn thành
            </h3>

            {prepareLoading ? (
              <div className="flex justify-center py-4">
                <span className="text-blue-500 font-medium text-sm">Đang tải dữ liệu...</span>
              </div>
            ) : (
              <div className="overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: '60vh' }}>
                {qrPrepare && qrPrepare.reference_inputs?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Nguyên liệu đầu vào</h4>
                    {qrPrepare.reference_inputs.map((ref: any, idx: number) => (
                      <div key={idx} className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-800">{ref.input_name || ref.material_name || ref.name || "Nguyên liệu"}</span>
                          <span className="text-gray-500">{ref.estimated_qty ?? ref.quantity} {ref.unit}</span>
                        </div>
                        <input
                          type="text"
                          value={`${ref.estimated_qty ?? ref.quantity ?? ""} ${ref.unit || ""}`.trim()}
                          disabled
                          className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {qrPrepare && qrPrepare.consumable_materials?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Nguyên liệu dư</h4>
                    {qrPrepare.consumable_materials.map((mat: any) => (
                      <div key={mat.material_id} className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-800">{mat.material_name}</span>
                          <span className="text-gray-500">Đã xuất: {mat.estimated_input_qty} {mat.unit}</span>
                        </div>
                        <input
                          type="number"
                          placeholder="Nhập lượng dư (Mặc định: 0)"
                          value={materialQtys[mat.material_id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMaterialQtys(prev => ({ ...prev, [mat.material_id]: val }));
                            if (val && Number(val) > mat.estimated_input_qty) {
                              setMaterialErrors(prev => ({ ...prev, [mat.material_id]: `Tối đa ${mat.estimated_input_qty}` }));
                            } else if (val && Number(val) < 0) {
                              setMaterialErrors(prev => ({ ...prev, [mat.material_id]: "Không hợp lệ" }));
                            } else {
                              setMaterialErrors(prev => ({ ...prev, [mat.material_id]: "" }));
                            }
                          }}
                          className={`w-full border rounded-lg px-3 py-2 text-sm ${materialErrors[mat.material_id] ? 'border-red-500' : ''}`}
                        />
                        {materialErrors[mat.material_id] && <span className="text-xs text-red-500 mt-1 block">{materialErrors[mat.material_id]}</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <h4 className="font-bold text-gray-700 uppercase">
                      Số lượng thành phẩm
                    </h4>

                    <span className="text-gray-500">
                      Đơn vị tính: {qtyInputStage?.output_product?.unit}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    placeholder={`Mặc định: ${qtyInputStage?.output_product?.quantity ?? "--"} sp`}
                    value={qtyInputValue}
                    onChange={(e) => {
                      setQtyInputValue(e.target.value);
                      if (e.target.value && Number(e.target.value) <= 0) {
                        setQtyError("Số lượng phải lớn hơn 0");
                      } else {
                        setQtyError("");
                      }
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${qtyError ? 'border-red-500' : ''}`}
                    autoFocus
                  />
                  {qtyError && <span className="text-xs text-red-500 mt-1 block">{qtyError}</span>}
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setQtyInputStage(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateQr}
                disabled={prepareLoading || qrLoading || !!qtyError || Object.values(materialErrors).some(err => err !== "")}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium rounded-lg py-2.5 transition flex items-center justify-center gap-2"
              >
                {qrLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
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
      {/* Cancel Finish Modal */}
      {cancelStage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-red-200 p-6 w-[400px] max-w-[95vw] shadow-lg flex flex-col">
            <h3 className="font-semibold text-red-600 mb-4 text-center flex items-center justify-center gap-2">
              <BsXLg className="w-5 h-5" /> Hoàn tác báo cáo
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Bạn có chắc chắn muốn hoàn tác báo cáo của công đoạn <span className="font-semibold text-gray-800">{cancelStage.process_name}</span> không?
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lý do hoàn tác <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hoàn tác (báo cáo nhầm, v.v...)"
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setCancelStage(null);
                  setCancelReason("");
                }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCancelFinish}
                disabled={cancelLoading || !cancelReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg py-2.5 transition flex items-center justify-center gap-2"
              >
                {cancelLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Xác nhận
              </button>
            </div>
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
