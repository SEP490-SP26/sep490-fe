"use client";
import { productionsApi } from "@/apiRequests/productions";
import { tasksApi } from "@/apiRequests/tasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import TokenQrModal from "@/components/production/TokenQrModal";
import {
  assembleQrReportBody,
  getMaterialsSectionTitle,
  isManualInputMode,
  parseReportQty,
  resolveFinalQtyGood,
  resolveIsStock,
  resolveQrMode,
  resolveQtyGoodMax,
  syncQtyFromLeftInput,
  validateQrReport,
} from "@/utils/productionReport";
import {
  getSignalRConnection,
  PRODUCTION_MANAGER_SIGNALR_EVENTS,
} from "@/lib/signalr";
import {
  BsArrowLeft,
  BsClock,
  BsChevronDown,
  BsChevronUp,
  BsCheckCircle,
  BsExclamationTriangle,
  BsGear,
  BsBoxSeam,
  BsArrowRight,
  BsClipboardCheck,
  BsArrowReturnLeft,
  BsPlayCircle,
  BsPerson,
  BsLayers,
  BsCollection,
  BsImage,
} from "react-icons/bs";
import { BiPackage } from "react-icons/bi";

/* =======================
   TYPES
======================= */
export interface GroupInputMaterial {
  code: string;
  name: string;
  unit: string;
  estimated_qty: number;
  actual_qty: number;
}
export interface GroupOutput {
  code: string;
  name: string;
  unit: string;
  estimated_qty: number;
  actual_qty: number;
}
export interface GroupAllocation {
  order_id: number;
  order_code: string;
  qty: number;
}
export interface GroupLog {
  scanned_at?: string;
  log_time?: string;
  qty_good: number;
  qty_bad?: number;
  report_image_urls?: string[];
}
export interface GroupStage {
  task_id: number;
  seq_num: number;
  process_code: string;
  process_name: string;
  status: "Finished" | "InProcessing" | "Ready" | "Unassigned";
  start_time: string | null;
  end_time: string | null;
  estimated_output_qty: number;
  actual_output_qty: number;
  report_image_urls: string[]; // ← thêm field này
  input_materials: GroupInputMaterial[];
  outputs: GroupOutput[];
  logs: GroupLog[];
  allocations: GroupAllocation[];
}
export interface GroupOrder {
  order_id: number;
  order_code: string;
  single_prod_id: number;
  qty: number;
  status: string;
}

export interface PreviousTask {
  order_id: number;
  order_code: string;
  previous_task_id: number;
  previous_prod_id: number;
  previous_prod_kind: string;
  previous_seq_num: number;
  previous_process_code: string;
  previous_process_name: string;
  previous_task_status: string;
  previous_start_time: string | null;
  previous_end_time: string | null;
  is_finished: boolean;
  message: string;
}

export interface PreviousStageContext {
  current_group_task_id: number;
  current_group_prod_id: number;
  current_process_code: string;
  current_process_name: string;
  previous_process_code: string;
  all_previous_finished: boolean;
  previous_tasks: PreviousTask[];
}

export interface GroupProductionResponse {
  prod_id: number;
  code: string;
  status: string;
  product_type_id: number;
  product_type_name: string;
  total_qty: number;
  process_codes: string;
  orders: GroupOrder[];
  stages: GroupStage[];
  previous_stage_context: PreviousStageContext | null;
}

/* =======================
   STATUS MAPS
======================= */
const STATUS_MAP: Record<
  GroupStage["status"],
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
const GROUP_STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Scheduled: { label: "Đã lên lịch", color: "text-blue-700", bg: "bg-blue-100" },
  InProcessing: { label: "Đang sản xuất", color: "text-yellow-700", bg: "bg-yellow-100" },
  Finished: { label: "Hoàn thành", color: "text-green-700", bg: "bg-green-100" },
  Unassigned: { label: "Chưa phân công", color: "text-gray-600", bg: "bg-gray-100" },
};
const ORDER_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  Scheduled: { label: "Đã lên lịch", color: "text-blue-700", bg: "bg-blue-100" },
  InProcessing: { label: "Đang sản xuất", color: "text-yellow-700", bg: "bg-yellow-100" },
  Finished: { label: "Hoàn thành", color: "text-green-700", bg: "bg-green-100" },
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
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtNum(val: number | null | undefined) {
  if (val == null) return "—";
  return val.toLocaleString("vi-VN");
}

/* =======================
   TIMELINE
======================= */
function GroupTimeline({ stages }: { stages: GroupStage[] }) {
  const sorted = [...stages].sort((a, b) => a.seq_num - b.seq_num);
  const finishedCount = sorted.filter((s) => s.status === "Finished").length;
  const progressPercent = sorted.length > 0 ? (finishedCount / sorted.length) * 100 : 0;
  return (
    <div className="relative">
      <div className="absolute top-5 left-0 right-0 h-1.5 bg-gray-200 rounded-full" />
      <div
        className="absolute top-5 left-0 h-1.5 bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
        style={{ width: `${progressPercent}%` }}
      />
      <div className="flex justify-between relative">
        {sorted.map((stage) => {
          const isDone = stage.status === "Finished";
          const isCurrent = stage.status === "InProcessing" || stage.status === "Ready";
          return (
            <div key={stage.task_id} className="flex flex-col items-center text-center flex-1">
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
              <span className={`mt-2 text-xs font-semibold leading-tight ${isDone ? "text-green-600" : isCurrent ? "text-blue-600" : "text-gray-400"}`}>
                {stage.process_name}
              </span>
              <span className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full font-medium ${isDone ? "bg-green-100 text-green-700" : isCurrent ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
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
   INFO CARD
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
    <div className={`bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3 ${className}`}>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
        {subValue && <p className="text-xs text-gray-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );
}

/* =======================
   STAGE CARD
======================= */
function StageCard({
  stage,
  isCollapsed,
  onToggle,
  onStartProduction,
  onReportQr,
  onCancelFinish,
  readyLoading,
  qrLoading,
  allStages,
  productionStatus,
  previousStageContext,
}: {
  stage: GroupStage;
  isCollapsed: boolean;
  onToggle: () => void;
  onStartProduction: (taskId: number) => void;
  onReportQr: (stage: GroupStage) => void;
  onCancelFinish: (stage: GroupStage) => void;
  readyLoading: number | null;
  qrLoading: boolean;
  allStages: GroupStage[];
  productionStatus: string;
  previousStageContext: PreviousStageContext | null;
}) {
  const statusInfo = STATUS_MAP[stage.status];
  const isProductionActive = productionStatus === "InProcessing";

  // Check local: tất cả stage trước trong group đã Finished chưa
  const prevGroupStagesAllDone = allStages
    .filter((s) => s.seq_num < stage.seq_num)
    .every((s) => s.status === "Finished");

  // previous_stage_context từ server (bao gồm single-prod tasks của các đơn ghép)
  const hasPrevCtx = previousStageContext?.current_group_task_id === stage.task_id;
  const allPrevFinished = hasPrevCtx
    ? previousStageContext!.all_previous_finished && prevGroupStagesAllDone
    : prevGroupStagesAllDone;

  const unfinishedPrevTasks = hasPrevCtx
    ? previousStageContext!.previous_tasks.filter((t) => !t.is_finished)
    : [];

  return (
    <div className={`rounded-2xl border overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md ${statusInfo.border}`}>
      {/* Header */}
      <div
        className={`flex justify-between items-center px-5 py-4 cursor-pointer ${statusInfo.bg}`}
        onClick={onToggle}
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
              Mã công đoạn: #{stage.task_id} - {stage.process_name}
              <span className="text-gray-400 font-normal text-sm">
                (Phụ trách: Phòng {stage.process_name})
              </span>
            </h3>
            <div className="flex items-center flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                {statusInfo.label}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                {stage.process_code}
              </span>
              {/* Badge ảnh nếu có */}
              {stage.report_image_urls && stage.report_image_urls.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                  <BsImage className="w-3 h-3" />
                  {stage.report_image_urls.length} ảnh
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-3 text-sm">
            <div className="text-right">
              <p className="text-xs text-gray-400">Ước tính</p>
              <p className="font-bold text-gray-700">{fmtNum(stage.estimated_output_qty)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Thực tế</p>
              <p className={`font-bold ${stage.actual_output_qty > 0 ? "text-green-600" : "text-gray-400"}`}>
                {stage.actual_output_qty > 0 ? fmtNum(stage.actual_output_qty) : "—"}
              </p>
            </div>
          </div>
          {isCollapsed ? <BsChevronDown className="w-5 h-5 text-gray-400" /> : <BsChevronUp className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="p-5 space-y-5">
          {/* Time info */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs text-green-600 font-bold mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <BsClock className="w-3.5 h-3.5" />
              Thời gian thực tế
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
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

          {/* Materials I/O */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input */}
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
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-600">Thực tế</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-orange-600">ĐVT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.input_materials.length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-xs">Không có dữ liệu</td></tr>
                    ) : (
                      stage.input_materials.map((m, i) => (
                        <tr key={i} className="border-t hover:bg-orange-50/50 transition">
                          <td className="px-3 py-2.5 text-gray-700">{m.name}</td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmtNum(m.estimated_qty)}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-blue-600">
                            {(() => {
                              const act = m.actual_qty ?? m.actual_qty ?? (m as any).quantity_used;
                              return act != null ? fmtNum(act) : "—";
                            })()}
                          </td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{m.unit}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Output */}
            <div className="flex flex-col">
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                <BsBoxSeam className="w-4 h-4 text-green-500" />
                Thành phẩm công đoạn
              </h4>
              <div className="space-y-3 flex-1">
                {stage.outputs.map((out, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="font-semibold text-green-800 mb-3">{out.name}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Ước tính</p>
                        <p className="text-green-700">
                          <span className="font-bold text-lg">{fmtNum(out.estimated_qty)}</span>{" "}
                          <span className="text-sm">{out.unit}</span>
                        </p>
                      </div>
                      <div className="bg-white border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Thực tế</p>
                        <p className="text-blue-700">
                          <span className="font-bold text-lg">
                            {(() => {
                              const act = out.actual_qty ?? out.actual_qty;
                              return act != null ? fmtNum(act) : "—";
                            })()}
                          </span>{" "}
                          <span className="text-sm">{out.unit}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Allocations */}
          {stage.allocations && stage.allocations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                <BsLayers className="w-4 h-4 text-indigo-500" />
                Phân bổ theo đơn hàng
              </h4>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-indigo-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-indigo-600">Đơn hàng</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-indigo-600">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.allocations.map((alloc, i) => (
                      <tr key={i} className="border-t hover:bg-indigo-50/40 transition">
                        <td className="px-3 py-2.5 font-medium text-gray-700">{alloc.order_code}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-indigo-700">{fmtNum(alloc.qty)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                    </tr>
                  </thead>
                  <tbody>
                    {stage.logs.map((log, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2.5">{formatDateTime(log.log_time || log.scanned_at)}</td>
                        <td className="px-3 py-2.5 text-right text-green-600 font-bold">{log.qty_good}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========== Stage Report Images ========== */}
          {stage.report_image_urls && stage.report_image_urls.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
                <BsImage className="w-4 h-4 text-teal-500" />
                Hình ảnh báo cáo công đoạn
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {stage.report_image_urls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block aspect-square rounded-xl border border-gray-200 overflow-hidden hover:opacity-80 hover:shadow-md transition"
                  >
                    <img
                      src={url}
                      alt={`stage-report-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ========== Actions ========== */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-end gap-3 pt-4 border-t border-gray-100">
            {stage.status === "Unassigned" && (
              <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                {/* Cảnh báo các task chưa xong — hiển thị nhưng không block click */}
                {!allPrevFinished && unfinishedPrevTasks.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="font-semibold mb-1 flex items-center gap-1">
                      <BsExclamationTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                      Công đoạn trước chưa hoàn thành:
                    </p>
                    <ul className="space-y-0.5 pl-1">
                      {unfinishedPrevTasks.map((t) => (
                        <li key={t.order_id} className="text-amber-600">
                          • Lệnh #{t.previous_task_id}: {t.previous_process_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onStartProduction(stage.task_id); }}
                  disabled={readyLoading === stage.task_id || !isProductionActive || !allPrevFinished}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${!isProductionActive || !allPrevFinished
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"        // production chưa active hoặc chưa xong previous -> disable thật
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"         // đủ điều kiện -> xanh
                    }`}
                >
                  {readyLoading === stage.task_id && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  <BsPlayCircle className="w-4 h-4" /> Bắt đầu sản xuất
                </button>
              </div>
            )}
            {["InProcessing", "Ready"].includes(stage.status) && (
              <button
                onClick={(e) => { e.stopPropagation(); onReportQr(stage); }}
                disabled={qrLoading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
              >
                <BsClipboardCheck className="w-4 h-4" /> Báo cáo hoàn thành
              </button>
            )}
            {stage.status === "Finished" && stage.end_time && (() => {
              const isExpired = new Date().getTime() - new Date(stage.end_time).getTime() > 5 * 60 * 1000;
              return (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelFinish(stage); }}
                  disabled={isExpired}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm border ${isExpired
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                    }`}
                >
                  <BsArrowReturnLeft className="w-3.5 h-3.5" /> Hoàn tác báo cáo
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* =======================
   PAGE
======================= */
export default function GroupProductionPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collapsedStages, setCollapsedStages] = useState<Record<number, boolean>>({});
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrProcessName, setQrProcessName] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);
  const [readyLoading, setReadyLoading] = useState<number | null>(null);
  const [cancelStage, setCancelStage] = useState<GroupStage | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [popup, setPopup] = useState<{ open: boolean; type: "success" | "error"; message: string }>({
    open: false,
    type: "success",
    message: "",
  });

  const [qtyInputStage, setQtyInputStage] = useState<GroupStage | null>(null);
  const [qtyInputValue, setQtyInputValue] = useState<string>("");
  const [qtyError, setQtyError] = useState("");
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [qrPrepare, setQrPrepare] = useState<any>(null);
  const [materialQtys, setMaterialQtys] = useState<{ [id: number]: string }>({});
  const [materialUsed, setMaterialUsed] = useState<{ [id: number]: string }>({});
  const [materialErrors, setMaterialErrors] = useState<{ [id: number]: string }>({});
  const [refUsed, setRefUsed] = useState<{ [code: string]: string }>({});
  const [refLeft, setRefLeft] = useState<{ [code: string]: string }>({});
  const [refErrors, setRefErrors] = useState<{ [code: string]: string }>({});
  const [qtyBadValue, setQtyBadValue] = useState<string>("0");
  const [reportImages, setReportImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const toggleStage = (taskId: number) => {
    setCollapsedStages((prev) => ({ [taskId]: !(prev[taskId] ?? true) }));
  };

  const { data: production, isLoading } = useQuery<GroupProductionResponse>({
    queryKey: ["group-production-detail", id],
    queryFn: async () => {
      return productionsApi.getGroupProductionDetail(Number(id));
    },
    enabled: !!id,
  });

  // SignalR
  useEffect(() => {
    let conn: any;
    const events = [...PRODUCTION_MANAGER_SIGNALR_EVENTS];
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["group-production-detail", id] });
    };

    const init = async () => {
      conn = await getSignalRConnection();
      events.forEach((evt) => {
        conn.on(evt, handler);
      });
    };
    init();

    return () => {
      if (conn) {
        events.forEach((evt) => {
          conn.off(evt, handler);
        });
      }
    };
  }, [queryClient, id]);

  const sortedStages = useMemo(
    () => production?.stages?.slice().sort((a, b) => a.seq_num - b.seq_num),
    [production]
  );
  const finishedStages = sortedStages?.filter((s) => s.status === "Finished").length ?? 0;
  const totalStages = sortedStages?.length ?? 0;
  const overallProgress = totalStages > 0 ? Math.round((finishedStages / totalStages) * 100) : 0;
  const groupStatus = GROUP_STATUS_MAP[production?.status ?? ""] ?? {
    label: production?.status,
    color: "text-gray-700",
    bg: "bg-gray-100",
  };

  /* ===== HANDLERS ===== */
  const handleStartProduction = async (taskId: number) => {
    try {
      setReadyLoading(taskId);
      await tasksApi.readyTask({ task_id: taskId });
      setPopup({ open: true, type: "success", message: "Đã bắt đầu sản xuất công đoạn này" });
      setTimeout(async () => {
        setPopup((p) => ({ ...p, open: false }));
        await queryClient.invalidateQueries({ queryKey: ["group-production-detail", id] });
      }, 900);
    } catch (err: any) {
      setPopup({ open: true, type: "error", message: err.message || "Lỗi khi bắt đầu sản xuất" });
    } finally {
      setReadyLoading(null);
    }
  };

  const handleOpenQtyInput = async (stage: GroupStage) => {
    setPrepareLoading(true);
    setQtyInputStage(stage);

    const estQty = stage.estimated_output_qty ?? 0;
    setQtyInputValue(estQty.toString());
    setQtyBadValue("0");
    setQtyError("");
    setReportImages([]);
    setReportReason("");

    try {
      const res = await tasksApi.qrPrepare(stage.task_id);
      const data = res.data || res;

      const isPrintStage = stage.process_name?.toLowerCase().includes("in");
      if (isPrintStage && data.consumable_materials) {
        data.consumable_materials = data.consumable_materials.map((m: any) => {
          const name = m.material_name?.toLowerCase() || "";
          const isPaper = name.includes("giấy") || name.includes("giay");
          return isPaper ? { ...m, _isPaperInPrint: true } : m;
        });
      }

      setQrPrepare(data);

      const prevActual = data.reference_inputs?.[0]?.actual_qty_prev_stage;
      if (prevActual != null) {
        setQtyInputValue(String(prevActual));
      }

      const initUsed: { [id: number]: string } = {};
      const initLeft: { [id: number]: string } = {};
      const consumable = data.consumable_materials || [];
      consumable.forEach((m: any) => {
        if (m._isPaperInPrint) {
          initUsed[m.material_id] = "0";
          initLeft[m.material_id] = "0";
        } else {
          const maxVal = Number(m.estimated_input_qty || 0);
          initLeft[m.material_id] = "0";
          initUsed[m.material_id] = maxVal.toString();
        }
      });
      setMaterialUsed(initUsed);
      setMaterialQtys(initLeft);
      setMaterialErrors({});

      const initRefUsed: { [code: string]: string } = {};
      const initRefLeft: { [code: string]: string } = {};
      const refs = data.reference_inputs || [];
      refs.forEach((x: any) => {
        const maxVal = Number(x.estimated_qty || 0);
        initRefLeft[x.input_code] = "0";
        initRefUsed[x.input_code] = maxVal.toString();
      });
      setRefUsed(initRefUsed);
      setRefLeft(initRefLeft);
      setRefErrors({});
      setQtyBadValue("0");
    } catch (err: any) {
      setQrPrepare(null);
      setPopup({ open: true, type: "error", message: err.message || "Lỗi khi lấy thông tin gợi ý" });
    } finally {
      setPrepareLoading(false);
    }
  };

  const handleCreateQr = async () => {
    if (!qtyInputStage) return;
    try {
      setQrLoading(true);

      const stageMax = Number(qtyInputStage.estimated_output_qty || 0);
      const maxQtyGood = resolveQtyGoodMax(qrPrepare, stageMax);
      const mode = resolveQrMode(qrPrepare, false);

      const validationError = validateQrReport({
        taskId: qtyInputStage.task_id,
        mode,
        qrPrepare,
        qtyInputValue,
        maxQtyGood,
        materialQtys,
        materialUsed,
        refLeft,
      });
      if (validationError) {
        setQtyError(validationError);
        setQrLoading(false);
        return;
      }

      const finalQty = resolveFinalQtyGood(qtyInputValue, qrPrepare?.suggested_qty);
      const badVal = Number(qtyBadValue || 0);

      const data = await tasksApi.createQRByStageId(
        assembleQrReportBody({
          taskId: qtyInputStage.task_id,
          mode,
          qrPrepare,
          qtyGood: finalQty,
          materialQtys,
          materialUsed,
          refLeft,
          refUsed,
          qtyBad: badVal,
          stageFallback: {
            process_code: qtyInputStage.process_code,
            process_name: qtyInputStage.process_name,
            unit: qtyInputStage.outputs?.[0]?.unit,
          },
          reason: reportReason,
          images: reportImages,
          ttlMinutes: 10,
        })
      );
      setQrToken((data as any)?.token ?? (data as any)?.data?.token);
      setQrProcessName(qtyInputStage.process_name);
      setQtyInputStage(null);
    } catch (err: any) {
      setPopup({ open: true, type: "error", message: err.message || "Lỗi khi tạo QR" });
    } finally {
      setQrLoading(false);
    }
  };

  const handleQrScanned = async (scannedToken: string) => {
    try {
      setQrLoading(true);
      await tasksApi.finishTask({ token: scannedToken });
      setQrToken(null);
      setQrProcessName("");
      setPopup({
        open: true,
        type: "success",
        message: "Hoàn thành công đoạn thành công",
      });
      setTimeout(async () => {
        setPopup((p) => ({ ...p, open: false }));
        await queryClient.invalidateQueries({
          queryKey: ["group-production-detail", id],
        });
      }, 900);
    } catch (err: any) {
      setPopup({ open: true, type: "error", message: err.message || "Lỗi khi hoàn thành công đoạn" });
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
      setPopup({ open: true, type: "success", message: "Hoàn tác báo cáo thành công" });
      setTimeout(async () => {
        setPopup((p) => ({ ...p, open: false }));
        await queryClient.invalidateQueries({ queryKey: ["group-production-detail", id] });
      }, 900);
    } catch (err: any) {
      setPopup({ open: true, type: "error", message: err.message || "Lỗi khi hoàn tác báo cáo" });
    } finally {
      setCancelLoading(false);
    }
  };

  // Note: Global scanner logic removed, now handled in layout.tsx

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-blue-600">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* BACK */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-5 text-sm font-medium transition-colors"
      >
        <BsArrowLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* =================== HEADER =================== */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                <BsCollection className="w-3.5 h-3.5" />
                Lệnh sản xuất
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{production?.code}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${groupStatus.bg} ${groupStatus.color}`}>
                {groupStatus.label}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Loại sản phẩm:{" "}
              <span className="font-semibold text-gray-700">{production?.product_type_name}</span>
              <span className="mx-2">•</span>
              Quy trình:{" "}
              <span className="font-semibold text-gray-700">{production?.process_codes}</span>
            </p>
          </div>
        </div>
      </div>

      {/* =================== INFO CARDS =================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
        <InfoCard
          icon={<BiPackage className="w-5 h-5" />}
          label="Tổng số lượng sản xuất"
          value={production?.total_qty?.toLocaleString("vi-VN") ?? "—"}
          subValue="tổng hợp từ tất cả đơn hàng"
        />
        <InfoCard
          icon={<BsGear className="w-5 h-5" />}
          label="Số công đoạn"
          value={`${finishedStages}/${totalStages} hoàn thành`}
          subValue={`${overallProgress}% tiến độ`}
        />
      </div>

      {/* =================== ORDERS TABLE =================== */}
      {/* <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BsCollection className="w-4 h-4 text-purple-600" />
          Danh sách đơn hàng ghép
        </h3>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-purple-600">Mã đơn hàng</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-purple-600">Số lượng</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-purple-600">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {production?.orders?.map((order) => {
                const orderStatus = ORDER_STATUS_MAP[order.status] ?? {
                  label: order.status,
                  color: "text-gray-600",
                  bg: "bg-gray-100",
                };
                return (
                  <tr key={order.order_id} className="border-t hover:bg-purple-50/30 transition">
                    <td className="px-4 py-3 font-semibold text-gray-800">{order.order_code}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700">{fmtNum(order.qty)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${orderStatus.bg} ${orderStatus.color}`}>
                        {orderStatus.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div> */}

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
        <div className="sticky top-0 z-40 bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-md overflow-x-auto">
          <h2 className="font-semibold mb-6 flex items-center gap-2 text-gray-800">
            <BsClock className="w-5 h-5 text-blue-600" /> Tiến độ công đoạn
          </h2>
          <div className="min-w-[500px]">
            <GroupTimeline stages={sortedStages} />
          </div>
        </div>
      )}

      {/* =================== STAGES =================== */}
      <h2 className="font-semibold flex items-center gap-2 text-gray-800 text-lg mb-4">
        <BsGear className="w-5 h-5 text-blue-600" /> Chi tiết từng công đoạn
      </h2>
      <div className="flex flex-col gap-6">
        {/* Chưa hoàn thành */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-50 border border-yellow-200">
            <BsClock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">Chưa hoàn thành</span>
            <span className="ml-auto text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
              {sortedStages?.filter((s) => s.status !== "Finished").length ?? 0}
            </span>
          </div>
          {sortedStages?.filter((s) => s.status !== "Finished").length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
              Tất cả công đoạn đã hoàn thành 🎉
            </div>
          )}
          {sortedStages?.filter((s) => s.status !== "Finished").map((stage) => (
            <StageCard
              key={stage.task_id}
              stage={stage}
              isCollapsed={collapsedStages[stage.task_id] ?? true}
              onToggle={() => toggleStage(stage.task_id)}
              onStartProduction={handleStartProduction}
              onReportQr={handleOpenQtyInput}
              onCancelFinish={(s) => { setCancelStage(s); setCancelReason(""); }}
              readyLoading={readyLoading}
              qrLoading={qrLoading}
              allStages={sortedStages ?? []}
              productionStatus={production?.status ?? ""}
              previousStageContext={
                production?.previous_stage_context?.current_group_task_id === stage.task_id
                  ? production.previous_stage_context
                  : null
              }
            />
          ))}
        </div>

        {/* Đã hoàn thành */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200">
            <BsCheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-green-700">Đã hoàn thành</span>
            <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {sortedStages?.filter((s) => s.status === "Finished").length ?? 0}
            </span>
          </div>
          {sortedStages?.filter((s) => s.status === "Finished").length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-xl border border-dashed border-gray-200">
              Chưa có công đoạn hoàn thành
            </div>
          )}
          {sortedStages?.filter((s) => s.status === "Finished").map((stage) => (
            <StageCard
              key={stage.task_id}
              stage={stage}
              isCollapsed={collapsedStages[stage.task_id] ?? true}
              onToggle={() => toggleStage(stage.task_id)}
              onStartProduction={handleStartProduction}
              onReportQr={handleOpenQtyInput}
              onCancelFinish={(s) => { setCancelStage(s); setCancelReason(""); }}
              readyLoading={readyLoading}
              qrLoading={qrLoading}
              allStages={sortedStages ?? []}
              productionStatus={production?.status ?? ""}
              previousStageContext={
                production?.previous_stage_context?.current_group_task_id === stage.task_id
                  ? production.previous_stage_context
                  : null
              }
            />
          ))}
        </div>
      </div>

      {/* =================== MODALS =================== */}

      {/* Input Output Qty Modal */}
      {qtyInputStage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <BsClipboardCheck className="w-5 h-5 text-blue-600" /> Tạo mã QR báo cáo
              </h3>
              <button
                onClick={() => setQtyInputStage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <BsArrowLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {prepareLoading ? (
                <div className="flex justify-center py-4">
                  <span className="text-blue-500 font-medium text-sm">Đang tải dữ liệu...</span>
                </div>
              ) : (
                <>
                  {(() => {
                    const mode = resolveQrMode(qrPrepare, false);
                    const manualMode = isManualInputMode(mode);
                    return (
                      <>
                        {qrPrepare && qrPrepare.consumable_materials?.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                              {getMaterialsSectionTitle(mode)}
                            </h4>
                            <div className="border rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Tên vật liệu</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Đã xuất</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Lượng dư</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">Nhập kho</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {qrPrepare.consumable_materials.filter((m: any) => !m._isPaperInPrint).map((mat: any) => {
                                    const qtyLeft = parseReportQty(materialQtys[mat.material_id]);
                                    const willStock = resolveIsStock(qtyLeft);
                                    return (
                                      <tr key={mat.material_id} className="border-t">
                                        <td className="px-3 py-2 text-gray-800 font-medium">{mat.material_name}</td>
                                        <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">
                                          {mat.estimated_input_qty} {mat.unit}
                                        </td>
                                        <td className="px-3 py-2">
                                          <input
                                            type="number"
                                            step="any"
                                            placeholder="0"
                                            value={materialQtys[mat.material_id] ?? ""}
                                            onChange={(e) => {
                                              const maxVal = Number(mat.estimated_input_qty || 0);
                                              const synced = syncQtyFromLeftInput(maxVal, e.target.value);
                                              setMaterialQtys(prev => ({ ...prev, [mat.material_id]: synced.left }));
                                              setMaterialUsed(prev => ({ ...prev, [mat.material_id]: synced.used }));
                                              setMaterialErrors(prev => ({ ...prev, [mat.material_id]: synced.error }));
                                            }}
                                            className={`w-full border rounded-lg px-2 py-1 text-sm text-right ${materialErrors[mat.material_id] ? 'border-red-500 bg-red-50' : ''}`}
                                          />
                                          {materialErrors[mat.material_id] && <span className="text-[10px] text-red-500 mt-1 block">{materialErrors[mat.material_id]}</span>}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <span
                                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${willStock
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-gray-100 text-gray-500"
                                              }`}
                                          >
                                            {willStock ? "Có" : "Không"}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {manualMode && qrPrepare && qrPrepare.reference_inputs?.length > 0 && (
  <div className="mb-4">
    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Nhập kho bán thành phẩm</h4>
    <div className="flex flex-col gap-3">
      {qrPrepare.reference_inputs.map((ref: any) => {
        const refQtyLeft = parseReportQty(refLeft[ref.input_code]);
        const refWillStock = resolveIsStock(refQtyLeft);
        return (
          <div key={ref.input_code} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-800 mb-2">{ref.input_name}</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-400 mb-0.5">Ước tính</p>
                <p className="text-sm font-semibold text-gray-700">
                  {ref.estimated_qty} <span className="text-xs font-normal">{ref.unit}</span>
                </p>
              </div>
              <div className="bg-white border border-blue-100 rounded-lg px-3 py-2">
                <p className="text-[10px] text-gray-400 mb-0.5">Thực tế từ công đoạn trước</p>
                <p className="text-sm font-semibold text-blue-600">
                  {ref.actual_qty_prev_stage != null
                    ? Number(ref.actual_qty_prev_stage).toLocaleString("vi-VN")
                    : "—"}{" "}
                  <span className="text-xs font-normal">{ref.unit}</span>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 font-medium mb-1">Lượng dư</p>
                <input
                  type="number"
                  step="any"
                  placeholder="0"
                  value={refLeft[ref.input_code] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const leftVal = val === "" ? 0 : Number(val);
                    const prevActual = ref.actual_qty_prev_stage;
                    if (prevActual != null) {
                      const maxLeft = prevActual * 0.15;
                      if (val !== "" && leftVal > maxLeft) {
                        setRefErrors(prev => ({
                          ...prev,
                          [ref.input_code]: `Tối đa ${Math.floor(maxLeft).toLocaleString("vi-VN")} (15% Thành phẩm thực tế công đoạn trước)`,
                        }));
                      } else {
                        setRefErrors(prev => ({ ...prev, [ref.input_code]: "" }));
                      }
                      const newQtyGood = Math.max(0, prevActual - leftVal);
                      setQtyInputValue(String(newQtyGood));
                      setQtyError("");
                    } else {
                      const maxVal = Number(ref.estimated_qty || 0);
                      const synced = syncQtyFromLeftInput(maxVal, val);
                      setRefErrors(prev => ({ ...prev, [ref.input_code]: synced.error }));
                    }
                    setRefLeft(prev => ({ ...prev, [ref.input_code]: val }));
                    const usedVal = ref.actual_qty_prev_stage != null
                      ? String(Math.max(0, ref.actual_qty_prev_stage - leftVal))
                      : String(Math.max(0, Number(ref.estimated_qty || 0) - leftVal));
                    setRefUsed(prev => ({ ...prev, [ref.input_code]: usedVal }));
                  }}
                  className={`w-full border rounded-lg px-2 py-1.5 text-sm text-right ${refErrors[ref.input_code] ? "border-red-500 bg-red-50" : "border-gray-200"}`}
                />
                {refErrors[ref.input_code] && (
                  <span className="text-[10px] text-red-500 mt-0.5 block">{refErrors[ref.input_code]}</span>
                )}
              </div>
              <div className="shrink-0 text-center">
                <p className="text-[10px] text-gray-500 font-medium mb-1">Nhập kho</p>
                <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${
                  refWillStock ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {refWillStock ? "Có" : "Không"}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
                      </>
                    );
                  })()}

                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Thành phẩm đầu ra ước tính</h4>
                    <div className="flex justify-between items-center text-sm bg-green-50 px-3 py-2 border border-green-200 rounded-lg">
                      <span className="font-semibold text-green-800">{qtyInputStage.process_name}</span>
                      <span className="font-bold text-green-700">
                        {qtyInputStage.estimated_output_qty?.toLocaleString("vi-VN")} sp
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
  <div className="flex items-center gap-3">
    <label className="text-xs font-bold text-gray-700 uppercase flex-1 leading-snug">
      Số lượng TP đầu ra
      <span className="block text-gray-400 font-normal normal-case text-[10px]">
        (dùng cho công đoạn tiếp theo)
      </span>
      {qrPrepare?.qty_unit && (
        <span className="text-blue-600 font-semibold">({qrPrepare.qty_unit})</span>
      )}
    </label>
    <div className="flex flex-col items-end w-36 shrink-0">
      <input
        type="number"
        min={0}
        placeholder={qrPrepare?.suggested_qty != null ? `Gợi ý: ${qrPrepare.suggested_qty}` : "0"}
        value={qtyInputValue}
        onChange={(e) => {
          const val = e.target.value;
          setQtyInputValue(val);
          const goodVal = val === "" ? 0 : Number(val);
          const firstRef = qrPrepare?.reference_inputs?.[0];
          const prevActual = firstRef?.actual_qty_prev_stage;
            if (prevActual != null) {
              const code = firstRef.input_code;
              const leftVal = refLeft[code] === "" || refLeft[code] === undefined ? 0 : Number(refLeft[code]);
              const sum = goodVal + leftVal;
              const min = Math.floor(prevActual * 0.85);
              if (val !== "" && sum > prevActual) {
                setQtyError(`Tổng số lượng TP đầu ra + Lượng dư (${sum.toLocaleString("vi-VN")}) vượt quá thực tế công đoạn trước (${prevActual.toLocaleString("vi-VN")})`);
              } else if (val !== "" && goodVal < min) {
                setQtyError(`Số lượng TP đầu ra không được nhỏ hơn 85% của thực tế công đoạn trước (${min.toLocaleString("vi-VN")})`);
              } else {
                setQtyError("");
              }
            } else {
            const maxTotal = resolveQtyGoodMax(
              qrPrepare,
              Number(qtyInputStage?.estimated_output_qty || 0)
            );
            if (val !== "" && (goodVal <= 0 || goodVal > maxTotal)) {
              setQtyError(`Số lượng đạt phải từ 1 đến ${maxTotal.toLocaleString("vi-VN")}`);
            } else {
              setQtyError("");
            }
          }
        }}
        className={`w-full border rounded-lg px-3 py-2 text-sm text-right ${qtyError ? "border-red-500" : ""}`}
        autoFocus
      />
      {qtyError && (
        <span className="text-[10px] text-red-500 mt-0.5 text-right">{qtyError}</span>
      )}
    </div>
  </div>
</div>



                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                      Hình ảnh báo cáo (Tùy chọn, tối đa 4 ảnh)
                    </h4>

                    <div className="flex flex-col gap-2">
                      <input
                        id="report-upload"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            const newFiles = Array.from(e.target.files).filter((f) =>
                              f.type.startsWith("image/")
                            );
                            setReportImages((prev) => {
                              const combined = [...prev, ...newFiles];
                              return combined.slice(0, 4);
                            });
                            setPreviewUrls((prev) => {
                              const newUrls = newFiles.map((f) => URL.createObjectURL(f));
                              const combined = [...prev, ...newUrls];
                              // Revoke các URL bị cắt bỏ do vượt giới hạn 4
                              combined.slice(4).forEach((url) => URL.revokeObjectURL(url));
                              return combined.slice(0, 4);
                            });
                          }
                          e.target.value = "";
                        }}
                      />

                      {/* Preview grid */}
                      {reportImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {reportImages.map((file, idx) => (
                            <div key={idx} className="relative group aspect-square">
                              <img
                                src={previewUrls[idx]}
                                alt={`preview-${idx}`}
                                className="w-full h-full object-cover rounded-lg border border-gray-200"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  URL.revokeObjectURL(previewUrls[idx]);
                                  setReportImages((prev) => prev.filter((_, i) => i !== idx));
                                  setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs font-bold leading-none"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          {/* Ô thêm ảnh nếu chưa đủ 4 */}
                          {reportImages.length < 4 && (
                            <label
                              htmlFor="report-upload"
                              className="aspect-square flex flex-col items-center justify-center rounded-lg border border-dashed border-blue-300 bg-blue-50 text-blue-500 cursor-pointer hover:bg-blue-100 transition text-xs font-medium gap-1"
                            >
                              <span className="text-xl leading-none">+</span>
                              <span>Thêm</span>
                            </label>
                          )}
                        </div>
                      )}

                      {/* Button khi chưa có ảnh nào */}
                      {reportImages.length === 0 && (
                        <label
                          htmlFor="report-upload"
                          className="cursor-pointer inline-flex items-center justify-center w-fit px-4 py-2 rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition"
                        >
                          Chọn hình ảnh
                        </label>
                      )}

                      <p className={`text-xs font-medium ${reportImages.length > 0 ? "text-green-600" : "text-gray-500"}`}>
                        {reportImages.length > 0
                          ? `Đã chọn ${reportImages.length}/4 hình ảnh`
                          : "Chưa chọn hình ảnh nào"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Ghi chú (Tùy chọn)</h4>
                    <textarea
                      placeholder="Nhập lý do/ghi chú (nếu có)..."
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setQtyInputStage(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateQr}
                disabled={
                  qrLoading ||
                  prepareLoading ||
                  !!qtyError ||
                  Object.values(materialErrors).some(err => err !== "") ||
                  Object.values(refErrors).some(err => err !== "")
                }
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                {qrLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <BsClipboardCheck className="w-4 h-4" /> Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {qrToken && (
        <TokenQrModal
          token={qrToken}
          processName={qrProcessName}
          onClose={() => { setQrToken(null); setQrProcessName(""); }}
          onConfirm={(manualToken) => handleQrScanned(manualToken ?? qrToken)}
        />
      )}

      {/* Popup */}
      {popup.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[320px] text-center shadow-lg">
            <h3 className={`font-semibold mb-3 ${popup.type === "success" ? "text-green-600" : "text-red-600"}`}>
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
              <BsArrowReturnLeft className="w-5 h-5" /> Hoàn tác báo cáo
            </h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Bạn có chắc chắn muốn hoàn tác báo cáo của công đoạn{" "}
              <span className="font-semibold text-gray-800">{cancelStage.process_name}</span> không?
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Lý do hoàn tác <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hoàn tác..."
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                autoFocus
              />
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setCancelStage(null); setCancelReason(""); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg py-2.5 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCancelFinish}
                disabled={cancelLoading || !cancelReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium rounded-lg py-2.5 transition flex items-center justify-center gap-2"
              >
                {cancelLoading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}