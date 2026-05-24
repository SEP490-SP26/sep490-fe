import React, { useState } from "react";
import {
  BsCalendar,
  BsPerson,
  BsCheckCircle,
  BsClock,
  BsChevronDown,
  BsChevronUp,
  BsPrinter,
  BsBoxSeam,
  BsArrowRight,
  BsClipboardCheck,
  BsEye,
  BsGear,
  BsExclamationTriangle,
  BsLayers,
} from "react-icons/bs";
import { BiPackage } from "react-icons/bi";
import { Modal } from "antd";

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
  scanned_at?: string;
  log_time?: string;
  qty_good: number;
  qty_bad?: number;
  report_image_urls?: string[];
}

export interface ProductionStage {
  process_id: number;
  seq_num: number;
  process_name: string;
  process_code: string;
  machine: string;
  task_id: number;
  task_name: string;
  status: "Finished" | "InProcessing" | "Ready" | "Unassigned" | "GroupedWaiting";
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
  is_taken_sub_product?: boolean;
}

export interface ProductionResponse {
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
  string,
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
  GroupedWaiting: {
    label: "Sản xuất trong lệnh ghép",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
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
                ${isDone
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
                ${isDone
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
                ${isDone
                    ? "bg-green-100 text-green-700"
                    : isCurrent
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
              >
                {STATUS_MAP[stage.status]?.label ?? stage.status ?? "—"}
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
   MAIN COMPONENT
======================= */
export default function ProductionDetailReadOnly({ production }: { production: ProductionResponse | null }) {
  const [collapsedStages, setCollapsedStages] = useState<Record<number, boolean>>({});
  const [showPreview, setShowPreview] = useState(false);

  const toggleStage = (processId: number) => {
    setCollapsedStages((prev) => ({
      ...prev,
      [processId]: !(prev[processId] ?? true),
    }));
  };

  if (!production) {
    return <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>;
  }

  const sortedStages = production.stages
    ?.slice()
    .filter((s) => s.status !== "GroupedWaiting" && s.status !== null)
    .sort((a, b) => a.seq_num - b.seq_num);

  const finishedStages = sortedStages?.filter((s) => s.status === "Finished").length ?? 0;
  const totalStages = sortedStages?.length ?? 0;
  const overallProgress = totalStages > 0 ? Math.round((finishedStages / totalStages) * 100) : 0;

  const productionStatus = PRODUCTION_STATUS_MAP[production.production_status ?? ""] ?? {
    label: production.production_status,
    color: "text-gray-700",
    bg: "bg-gray-100",
  };

  const deliveryUrgency = production.delivery_date
    ? getDeliveryUrgency(production.delivery_date)
    : null;

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
    <div className="bg-gray-50 p-2 md:p-4 rounded-xl max-h-[80vh] overflow-y-auto">
      {/* =================== HEADER =================== */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">
                Lệnh: {production.production_code || production.prod_id}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${productionStatus.bg} ${productionStatus.color}`}
              >
                {productionStatus.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Đơn hàng: {production.order_code}</p>
            <p className="text-xs text-gray-500">Khách hàng: {production.customer_name} | Sản phẩm: {production.product_name}</p>
          </div>

          {deliveryUrgency && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${deliveryUrgency.bg} ${deliveryUrgency.color}`}
            >
              <BsExclamationTriangle className="w-4 h-4" />
              Giao hàng: {formatDate(production.delivery_date)} (
              {deliveryUrgency.text})
            </div>
          )}
        </div>
      </div>

      {/* =================== INFO CARDS =================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <InfoCard
          icon={<BiPackage className="w-5 h-5" />}
          label="Số lượng"
          value={production.quantity?.toLocaleString("vi-VN") ?? "—"}
        />
        <InfoCard
          icon={<BsCalendar className="w-5 h-5" />}
          label="Hạn hoàn thành dự kiến"
          value={formatDateTime(finalDeadline)}
        />
        <InfoCard
          icon={<BsClock className="w-5 h-5" />}
          label="Bắt đầu thực tế"
          value={formatDateTime(production.actual_start_date)}
          subValue={
            production.planned_start_date
              ? `Dự kiến: ${formatDateTime(production.planned_start_date)}`
              : undefined
          }
        />
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
      <div className="flex flex-col gap-6">
        {/* Column 1: Chưa hoàn thành */}
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

          {sortedStages?.filter(s => s.status !== "Finished").map((stage) => {
            const isCollapsed = collapsedStages[stage.process_id] ?? true;
            const statusInfo = STATUS_MAP[stage.status] ?? {
              label: stage.status ?? "Không rõ",
              color: "text-gray-500",
              bg: "bg-gray-50",
              border: "border-gray-200",
            };

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
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${stage.status === "Finished"
                          ? "bg-green-500 border-green-500 text-white"
                          : stage.status === "InProcessing" || stage.status === "Ready"
                            ? "bg-white border-blue-500 text-blue-600"
                            : "bg-white border-gray-300 text-gray-400"
                        }`}
                    >
                      {stage.seq_num}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        {stage.process_name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
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
                    {isCollapsed ? <BsChevronDown className="w-5 h-5 text-gray-400" /> : <BsChevronUp className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Stage Body */}
                {!isCollapsed && (
                  <div className="p-5 space-y-5">
                    {/* Time Info */}
                    <div className="w-full grid grid-cols-1 gap-4">
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100 h-full">
                        <p className="text-xs text-green-600 font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5">
                          <BsClock className="w-3.5 h-3.5" />
                          Thời gian thực tế
                        </p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-green-100">
                            <span className="text-gray-500 font-medium">Bắt đầu:</span>
                            <span className="font-bold text-gray-800">{formatDateTime(stage.start_time)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-green-100">
                            <span className="text-gray-500 font-medium">Kết thúc:</span>
                            <span className="font-bold text-gray-800">{formatDateTime(stage.end_time)}</span>
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
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600">Tên vật liệu</th>
                                <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-600">Ước tính</th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-orange-600">ĐVT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stage.input_materials && stage.input_materials.length > 0 ? (
                                stage.input_materials.map((m: any, i: number) => (
                                  <tr key={i} className="border-t hover:bg-orange-50/50 transition">
                                    <td className="px-3 py-2.5 text-gray-700">{m.name}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold">
                                      {typeof m.estimated_quantity === "number"
                                        ? m.estimated_quantity % 1 !== 0
                                          ? m.estimated_quantity.toFixed(2)
                                          : m.estimated_quantity.toLocaleString("vi-VN")
                                        : m.estimated_quantity}
                                    </td>
                                    <td className="px-3 py-2.5 text-center text-gray-500">{m.unit}</td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="px-3 py-4 text-center text-gray-400 text-xs">Không có dữ liệu</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Output Product */}
                      {stage.output_product && (
                        <div className="flex flex-col">
                          <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                            <BsBoxSeam className="w-4 h-4 text-green-500" />
                            Thành phẩm công đoạn
                          </h4>
                          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex flex-col justify-center flex-1">
                            <p className="font-semibold text-green-800 mb-3">{stage.output_product.name}</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white border border-green-200 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Ước tính</p>
                                <p className="text-green-700">
                                  <span className="font-bold text-lg">{stage.output_product.estimated_quantity?.toLocaleString("vi-VN")}</span>{" "}
                                  <span className="text-sm">{stage.output_product.unit}</span>
                                </p>
                              </div>
                              <div className="bg-white border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Thực tế</p>
                                <p className="text-blue-700">
                                  <span className="font-bold text-lg">
                                    {(() => {
                                      const actVal = stage.output_product.actual_quantity ?? (stage.output_product as any).actual_qty;
                                      return actVal != null ? actVal.toLocaleString("vi-VN") : "—";
                                    })()}
                                  </span>{" "}
                                  <span className="text-sm">{stage.output_product.unit}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
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
          {sortedStages?.filter(s => s.status === "Finished").map((stage) => {
            const isCollapsed = collapsedStages[stage.process_id] ?? true;
            const statusInfo = STATUS_MAP[stage.status] ?? {
              label: stage.status ?? "Không rõ",
              color: "text-gray-500",
              bg: "bg-gray-50",
              border: "border-gray-200",
            };

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
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${stage.status === "Finished"
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-white border-gray-300 text-gray-400"
                        }`}
                    >
                      {stage.seq_num}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                        {stage.process_name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
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
                    {isCollapsed ? <BsChevronDown className="w-5 h-5 text-gray-400" /> : <BsChevronUp className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Stage Body */}
                {!isCollapsed && (
                  <div className="p-5 space-y-5">
                    {/* Time Info */}
                    <div className="w-full grid grid-cols-1 gap-4">
                      <div className="bg-green-50 rounded-xl p-4 border border-green-100 h-full">
                        <p className="text-xs text-green-600 font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5">
                          <BsClock className="w-3.5 h-3.5" />
                          Thời gian thực tế
                        </p>
                        <div className="space-y-1.5 text-sm">
                          <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-green-100">
                            <span className="text-gray-500 font-medium">Bắt đầu:</span>
                            <span className="font-bold text-gray-800">{formatDateTime(stage.start_time)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-green-100">
                            <span className="text-gray-500 font-medium">Kết thúc:</span>
                            <span className="font-bold text-gray-800">{formatDateTime(stage.end_time)}</span>
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
                                <th className="px-3 py-2.5 text-left text-xs font-semibold text-purple-600">Thời gian</th>
                                <th className="px-3 py-2.5 text-right text-xs font-semibold text-purple-600">Số lượng thành phẩm</th>
                                <th className="px-3 py-2.5 text-center text-xs font-semibold text-purple-600">Hình ảnh</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stage.logs.map((log, i) => (
                                <tr key={i} className="border-t">
                                  <td className="px-3 py-2.5">{formatDateTime(log.log_time || log.scanned_at)}</td>
                                  <td className="px-3 py-2.5 text-right text-green-600 font-bold">{log.qty_good}</td>
                                  <td className="px-3 py-2.5 text-center">
                                    {log.report_image_urls && log.report_image_urls.length > 0 ? (
                                      <div className="flex justify-center gap-1 flex-wrap">
                                        {log.report_image_urls.map((url, idx) => (
                                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="block w-8 h-8 rounded border border-gray-200 overflow-hidden hover:opacity-80 transition">
                                            <img src={url} alt={`report-${idx}`} className="w-full h-full object-cover" />
                                          </a>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-xs">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
