"use client";
import { productionsApi } from "@/apiRequests/productions";
import { tasksApi } from "@/apiRequests/tasks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { getSignalRConnection } from "@/lib/signalr";
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
  qty_good: number;
  qty_bad?: number;
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
  const focusInput = useCallback(() => {
    if (!hasScannedRef.current && !showManualInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showManualInput]);
  useEffect(() => {
    hasScannedRef.current = false;
    focusInput();
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={focusInput}>
      {showManualInput && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[340px] shadow-lg">
            <h3 className="font-semibold text-blue-700 mb-3 text-center">Nhập token thủ công</h3>
            <input
              type="text"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="Nhập token..."
              className="w-full border rounded-lg px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowManualInput(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2">Hủy</button>
              <button
                onClick={() => { if (!manualToken.trim()) return; onConfirm(manualToken.trim()); setShowManualInput(false); }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2"
              >Xác nhận</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-blue-200 p-6 w-[340px] text-center shadow-lg">
        <h3 className="font-semibold text-blue-700 mb-4">Quét QR để hoàn thành công đoạn</h3>
        <div className="flex justify-center mb-4">
          <QRCodeCanvas value={token} size={220} includeMargin />
        </div>
        <input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          autoFocus
          className="absolute opacity-0 size-1"
          onBlur={(e) => { e.currentTarget.value = ""; }}
        />
        <button onClick={onClose} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg py-2 transition">Đóng</button>
        <button onClick={() => setShowManualInput(true)} className="w-full mt-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg py-2 transition">Nhập token thủ công</button>
      </div>
    </div>
  );
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
   STAGE CARD (shared between finished/unfinished)
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
}) {
  const statusInfo = STATUS_MAP[stage.status];
  const isStageReached = allStages
    .filter((s) => s.seq_num < stage.seq_num)
    .every((s) => s.status === "Finished");
  return (
    <div className={`rounded-2xl border overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md ${statusInfo.border}`}>
      {/* Header */}
      <div
        className={`flex justify-between items-center px-5 py-4 cursor-pointer ${statusInfo.bg}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              stage.status === "Finished"
                ? "bg-green-500 border-green-500 text-white"
                : stage.status === "InProcessing" || stage.status === "Ready"
                ? "bg-white border-blue-500 text-blue-600"
                : "bg-white border-gray-300 text-gray-400"
            }`}
          >
            {stage.seq_num}
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-gray-800 text-base">{stage.process_name}</h3>
            <div className="flex items-center flex-wrap gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                {statusInfo.label}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                {stage.process_code}
              </span>
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
                            {m.actual_qty != null && m.actual_qty > 0 ? fmtNum(m.actual_qty) : "—"}
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
                          <span className="font-bold text-lg">{out.actual_qty > 0 ? fmtNum(out.actual_qty) : "—"}</span>{" "}
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
                        <td className="px-3 py-2.5">{log.scanned_at ? formatDateTime(log.scanned_at) : formatDateTime(stage.end_time)}</td>
                        <td className="px-3 py-2.5 text-right text-green-600 font-bold">{log.qty_good}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-4 border-t border-gray-100">
            {stage.status === "Unassigned" && (
              <button
                onClick={(e) => { e.stopPropagation(); onStartProduction(stage.task_id); }}
                disabled={readyLoading === stage.task_id}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm ${
                  isStageReached
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-500"
                }`}
              >
                {readyLoading === stage.task_id && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                <BsPlayCircle className="w-4 h-4" /> Bắt đầu sản xuất
              </button>
            )}
            {["InProcessing", "Ready"].includes(stage.status) && (
              <button
                onClick={(e) => { e.stopPropagation(); onReportQr(stage); }}
                disabled={qrLoading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
              >
                <BsClipboardCheck className="w-4 h-4" /> Báo cáo hoàn thành (QR)
              </button>
            )}
            {stage.status === "Finished" && stage.end_time && (() => {
              const isExpired = new Date().getTime() - new Date(stage.end_time).getTime() > 5 * 60 * 1000;
              return (
                <button
                  onClick={(e) => { e.stopPropagation(); onCancelFinish(stage); }}
                  disabled={isExpired}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm border ${
                    isExpired
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
  // Global barcode scanner
  const handleQrScannedRef = useRef<((token: string) => void) | null>(null);
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
      if (now - lastKeyTime > 200) buffer = "";
      lastKeyTime = now;
      if (e.key === "Enter") { e.preventDefault(); if (scanTimer) clearTimeout(scanTimer); finishScan(); return; }
      if (e.key.length === 1) buffer += e.key;
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => finishScan(), 300);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); if (scanTimer) clearTimeout(scanTimer); };
  }, []);
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
    const init = async () => {
      conn = await getSignalRConnection();
      const handler = () => {
        queryClient.invalidateQueries({ queryKey: ["group-production-detail", id] });
      };
      conn.on("update-ui", handler);
      return () => { if (conn) conn.off("update-ui", handler); };
    };
    init();
  }, [queryClient, id]);
  const sortedStages = useMemo(() => production?.stages?.slice().sort((a, b) => a.seq_num - b.seq_num), [production]);
  const finishedStages = sortedStages?.filter((s) => s.status === "Finished").length ?? 0;
  const totalStages = sortedStages?.length ?? 0;
  const overallProgress = totalStages > 0 ? Math.round((finishedStages / totalStages) * 100) : 0;
  const groupStatus = GROUP_STATUS_MAP[production?.status ?? ""] ?? { label: production?.status, color: "text-gray-700", bg: "bg-gray-100" };
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
  const handleReportQr = async (stage: GroupStage) => {
    try {
      setQrLoading(true);
      const data = await tasksApi.createQRByStageId({ task_id: stage.task_id, ttl_minutes: 30, qty_good: stage.estimated_output_qty, materials: [] });
      setQrToken((data as any)?.token ?? (data as any)?.data?.token);
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
      setPopup({ open: true, type: "success", message: "Hoàn thành công đoạn thành công 🎉" });
      setTimeout(async () => {
        setPopup((p) => ({ ...p, open: false }));
        await queryClient.invalidateQueries({ queryKey: ["group-production-detail", id] });
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
  useEffect(() => {
    handleQrScannedRef.current = handleQrScanned;
  });
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
              {/* Group badge */}
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                <BsCollection className="w-3.5 h-3.5" />
                Lệnh sản xuất ghép
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <InfoCard
          icon={<BiPackage className="w-5 h-5" />}
          label="Tổng số lượng sản xuất"
          value={production?.total_qty?.toLocaleString("vi-VN") ?? "—"}
          subValue="tổng hợp từ tất cả đơn hàng"
        />
        <InfoCard
          icon={<BsCollection className="w-5 h-5" />}
          label="Số đơn hàng ghép"
          value={`${production?.orders?.length ?? 0} đơn hàng`}
        />
        <InfoCard
          icon={<BsGear className="w-5 h-5" />}
          label="Số công đoạn"
          value={`${finishedStages}/${totalStages} hoàn thành`}
          subValue={`${overallProgress}% tiến độ`}
        />
      </div>
      {/* =================== ORDERS TABLE =================== */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
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
                const orderStatus = ORDER_STATUS_MAP[order.status] ?? { label: order.status, color: "text-gray-600", bg: "bg-gray-100" };
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
              onReportQr={handleReportQr}
              onCancelFinish={(s) => { setCancelStage(s); setCancelReason(""); }}
              readyLoading={readyLoading}
              qrLoading={qrLoading}
              allStages={sortedStages ?? []}
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
              onReportQr={handleReportQr}
              onCancelFinish={(s) => { setCancelStage(s); setCancelReason(""); }}
              readyLoading={readyLoading}
              qrLoading={qrLoading}
              allStages={sortedStages ?? []}
            />
          ))}
        </div>
      </div>
      {/* =================== MODALS =================== */}
      {/* QR Modal */}
      {qrToken && (
        <QrModal
          token={qrToken}
          onClose={() => setQrToken(null)}
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
            <button onClick={() => setPopup({ ...popup, open: false })} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2">
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
                {cancelLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}