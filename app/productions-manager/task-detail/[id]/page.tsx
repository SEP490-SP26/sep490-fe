"use client";

import { tasksApi } from "@/apiRequests/tasks";
import { productionsApi } from "@/apiRequests/productions";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BsArrowLeft,
  BsCheckCircleFill,
  BsClipboardCheck,
  BsBoxSeam,
  BsArrowRight,
  BsClock,
  BsImage,
  BsExclamationTriangle,
  BsInboxes,
} from "react-icons/bs";
import { BiPackage } from "react-icons/bi";

/* =======================
   TYPES
======================= */
export interface DecodeQrMaterial {
  material_id: number;
  quantity_used: number;
  is_stock: boolean;
  quantity_left: number;
  material_code: string | null;
  material_name: string | null;
  unit: string | null;
}

export interface DecodeQrReferenceInput {
  input_code: string;
  input_name: string;
  unit: string;
  quantity_used: number;
  quantity_left: number;
}

export interface DecodeQrOutput {
  output_code: string;
  output_name: string;
  unit: string;
  quantity_good: number;
  quantity_bad: number;
}

export interface DecodeQrResponse {
  valid: boolean;
  task_name: string;
  token: string;
  link: string;
  task_id: number;
  prod_id: number;
  qty_good: number;
  exp_unix: number;
  use_manual_input: boolean;
  reason: string | null;
  report_image_url: string | null;
  materials: DecodeQrMaterial[];
  qr_reference_inputs: DecodeQrReferenceInput[];
  outputs: DecodeQrOutput[];
  submitted_payload: unknown | null;
}

export interface StageInputMaterial {
  name: string;
  code: string;
  quantity: number;
  estimated_quantity: number;
  actual_quantity: number | null;
  quantity_source: string;
  unit: string;
}

export interface ProductionStage {
  process_id: number;
  seq_num: number;
  process_name: string;
  process_code: string;
  task_id: number;
  task_name: string;
  status: string;
  input_materials: StageInputMaterial[];
}

/* =======================
   HELPERS
======================= */
function fmtNum(val: number | null | undefined) {
  if (val == null) return "—";
  return val.toLocaleString("vi-VN");
}

function fmtQty(qty: number) {
  return qty % 1 === 0 ? qty.toLocaleString("vi-VN") : qty.toFixed(4);
}

function formatExpiry(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isExpired(unixSeconds: number) {
  return Date.now() / 1000 > unixSeconds;
}

function isNullText(value: unknown) {
  if (value == null) return true;
  return (
    typeof value === "string" &&
    value.trim().toLowerCase() === "null"
  );
}

const MATERIAL_NAME_MAP: Record<number, string> = {
  1: "Giấy C250",
  2: "Giấy C300",
  3: "Giấy E250",
  4: "Sóng E Nâu",
  5: "Sóng B Nâu",
  6: "Sóng E Mộc",
  7: "Mực Cyan",
  8: "Mực Magenta",
  9: "Mực Vàng",
  10: "Mực đen",
  11: "Keo phủ nước",
  12: "Keo phủ dầu",
  13: "Keo bồi",
  15: "Màng cán 12 mic",
  17: "Giấy C200",
  18: "Giấy C350",
  19: "Giấy Ivory 250",
  20: "Giấy Ivory 300",
  21: "Giấy Kraft 230",
  22: "Giấy Bristol 300",
  23: "Giấy Duplex",
  25: "Giấy mỹ thuật",
  26: "Kẽm thô",
  27: "Keo dán",
  28: "Mực trắng",
  29: "Mực Reflex Blue",
  30: "Mực Warm Red",
  31: "Mực Rubine Red",
  32: "Mực Rhodamine Red",
  33: "Mực nhũ vàng",
  34: "Mực nhũ bạc",
  35: "Mực huỳnh quang vàng",
  36: "Mực huỳnh quang cam",
  37: "Mực huỳnh quang hồng",
  38: "Mực tổng hợp",
  39: "Keo phủ UV",
  40: "Màng BOPP bóng 15 mic",
  41: "Màng PET 12 mic",
  42: "Màng BOPP bóng 18 mic",
  43: "Màng chống trầy 18 mic",
  44: "Màng soft touch 18 mic",
  45: "Màng BOPP mờ 15 mic",
  46: "Màng BOPP mờ 18 mic",
  47: "Màng metalize 12 mic",
};

/* =======================
   PAGE
======================= */
export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  // Lấy decode data từ sessionStorage
  const [decodeData, setDecodeData] =
  useState<DecodeQrResponse | null>(null);

const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);

  const raw = sessionStorage.getItem("qr_decode_result");

  if (!raw) {
    setDecodeData(null);
    return;
  }

  try {
    const parsed: DecodeQrResponse = JSON.parse(raw);

    if (parsed.task_id?.toString() === id) {
      setDecodeData(parsed);
    } else {
      setDecodeData(null);
    }
  } catch {
    setDecodeData(null);
  }
}, [id]);

  // State cho stage input materials từ production detail API
  const [stageInputMaterials, setStageInputMaterials] = useState<StageInputMaterial[] | null>(null);
  const [stageName, setStageName] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Gọi API production detail để lấy input_materials của stage khớp task_id
  useEffect(() => {
    if (!decodeData?.prod_id || !decodeData?.task_id) return;

    const fetchStageInputs = async () => {
      setLoadingStage(true);
      setStageError(null);
      try {
        const res = await productionsApi.getProductionByProdId(
          decodeData.prod_id.toString()
        );
        // Unwrap nếu response có wrapper .data
        const detail =
          res && typeof res === "object" && "data" in res && res.data != null
            ? (res as any).data
            : res;

        const stages: ProductionStage[] = detail?.stages ?? [];
        const matchedStage = stages.find(
          (s) => s.task_id === decodeData.task_id
        );

        if (matchedStage) {
          setStageName(matchedStage.task_name ?? matchedStage.process_name);
          setStageInputMaterials(matchedStage.input_materials ?? []);
        } else {
          // task_id không tìm thấy trong stages (ví dụ grouped production)
          setStageInputMaterials([]);
        }
      } catch (err: any) {
        setStageError(err.message || "Không thể tải nguyên liệu đầu vào");
      } finally {
        setLoadingStage(false);
      }
    };

    fetchStageInputs();
  }, [decodeData?.prod_id, decodeData?.task_id]);

  const [confirming, setConfirming] = useState(false);
  const [popup, setPopup] = useState<{
    open: boolean;
    type: "success" | "error";
    message: string;
  }>({ open: false, type: "success", message: "" });

  const handleConfirm = async () => {
    if (!decodeData?.token || confirming) return;
    setConfirming(true);
    try {
      await tasksApi.finishTask({ token: decodeData.token });
      sessionStorage.removeItem("qr_decode_result");
      setPopup({
        open: true,
        type: "success",
        message: "Hoàn thành công đoạn thành công 🎉",
      });
      setTimeout(() => router.back(), 1500);
    } catch (err: any) {
      setPopup({
        open: true,
        type: "error",
        message: err.message || "Lỗi khi xác nhận hoàn thành",
      });
    } finally {
      setConfirming(false);
    }
  };

  if (!mounted) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-500">
        Đang tải...
      </div>
    </div>
  );
}

  if (!decodeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm max-w-sm w-full">
          <BsExclamationTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-gray-800 mb-2">
            Không tìm thấy dữ liệu QR
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Dữ liệu đã hết hạn hoặc không hợp lệ. Vui lòng quét lại mã QR.
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
          >
            <BsArrowLeft className="w-4 h-4" /> Quay lại
          </button>
        </div>
      </div>
    );
  }

  const expired = isExpired(decodeData.exp_unix);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-5 text-sm font-medium transition-colors"
      >
        <BsArrowLeft className="w-4 h-4" /> Quay lại
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                Lệnh sản xuất: #{decodeData.prod_id}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                Mã công đoạn: #{decodeData.task_id}
              </span>
              {decodeData.valid ? (
                <span className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold border border-green-200 flex items-center gap-1">
                  <BsCheckCircleFill className="w-3 h-3" /> Hợp lệ
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                  Không hợp lệ
                </span>
              )}
              {expired && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 flex items-center gap-1">
                  <BsExclamationTriangle className="w-3 h-3" /> Hết hạn
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Xác nhận hoàn thành công đoạn: {decodeData.task_name}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <BsClock className="w-3.5 h-3.5" />
            Hết hạn: {formatExpiry(decodeData.exp_unix)}
          </div>
        </div>
      </div>

      <div className="space-y-5">

  {/* ── 1. NGUYÊN LIỆU ĐẦU VÀO CÔNG ĐOẠN ── */}
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      <BsInboxes className="w-4 h-4 text-indigo-600" />
      Nguyên liệu đầu vào công đoạn
      {stageName && (
        <span className="ml-1 text-m font-bold text-gray-400">- {stageName}</span>
      )}
    </h3>
    {loadingStage ? (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        Đang tải nguyên liệu đầu vào...
      </div>
    ) : stageError ? (
      <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
        {stageError}
      </p>
    ) : (
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-indigo-50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-indigo-600">Tên nguyên liệu</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-indigo-600">Dự kiến</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-indigo-600">ĐVT</th>
            </tr>
          </thead>
          <tbody>
            {!stageInputMaterials || stageInputMaterials.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-center text-sm text-gray-400">
                  Không có nguyên liệu đầu vào cho công đoạn này.
                </td>
              </tr>
            ) : (
              stageInputMaterials.map((mat, i) => (
                <tr key={i} className="border-t hover:bg-indigo-50/30">
                  <td className="px-3 py-2.5 font-medium text-gray-700">{mat.name}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-indigo-600">
                    {fmtQty(mat.estimated_quantity)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{mat.unit ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>

  {/* ── 2. NGUYÊN VẬT LIỆU SỬ DỤNG ── */}
  {/* Nếu materials[] rỗng → fallback dùng stageInputMaterials */}
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      <BsArrowRight className="w-4 h-4 text-orange-500" />
      Nguyên vật liệu sử dụng
    </h3>
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-orange-50">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-orange-600">Tên NVL</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-600">Đã dùng</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-orange-600">Lượng dư</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-orange-600">Nhập kho</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-orange-600">ĐVT</th>
          </tr>
        </thead>
        <tbody>
          {decodeData.materials.length > 0 ? (
            decodeData.materials.map((mat, i) => (
              <tr key={i} className="border-t hover:bg-orange-50/40">
                <td className="px-3 py-2.5 font-medium text-gray-700">
                  {!isNullText(mat.material_name)
                    ? mat.material_name
                    : !isNullText(mat.material_code)
                    ? mat.material_code
                    : MATERIAL_NAME_MAP[mat.material_id] ?? `ID: ${mat.material_id}`}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-blue-600">
                  {fmtNum(mat.quantity_used)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-700">
                  {fmtNum(mat.quantity_left)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                      mat.is_stock
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {mat.is_stock ? "Có" : "Không"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                  {!isNullText(mat.unit) ? mat.unit : ""}
                </td>
              </tr>
            ))
          ) : stageInputMaterials && stageInputMaterials.length > 0 ? (
            // Fallback: hiển thị từ stageInputMaterials
            stageInputMaterials.map((mat, i) => (
              <tr key={i} className="border-t hover:bg-orange-50/40">
                <td className="px-3 py-2.5 font-medium text-gray-700">{mat.name}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-blue-600">
                  {fmtQty(mat.estimated_quantity)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-700">0</td>
                <td className="px-3 py-2.5 text-center">
                  <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                    Không
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                  {!isNullText(mat.unit) ? mat.unit : ""}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-400">
                Không có nguyên vật liệu sử dụng.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* ── 3. BÁN THÀNH PHẨM SỬ DỤNG ── */}
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      <BiPackage className="w-4 h-4 text-purple-600" />
      Bán thành phẩm sử dụng
    </h3>
    <div className="border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-purple-50">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-purple-600">Tên BTP</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-purple-600">Đã dùng</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-purple-600">Lượng dư</th>
            <th className="px-3 py-2.5 text-center text-xs font-semibold text-purple-600">ĐVT</th>
          </tr>
        </thead>
        <tbody>
          {decodeData.qr_reference_inputs.length > 0 ? (
            decodeData.qr_reference_inputs.map((ref, i) => (
              <tr key={i} className="border-t hover:bg-purple-50/30">
                <td className="px-3 py-2.5 font-medium text-gray-700">
                  {!isNullText(ref.input_name) && ref.input_name}{" "}
                  {!isNullText(ref.input_code) && (
                    <span className="text-gray-400 text-xs font-normal">({ref.input_code})</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-blue-600">
                  {fmtNum(ref.quantity_used)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-700">
                  {fmtNum(ref.quantity_left)}
                </td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">
                  {!isNullText(ref.unit) ? ref.unit : "---"}
                </td>
              </tr>
            ))
          ) : stageInputMaterials && stageInputMaterials.length > 0 ? (
            // Fallback: hiển thị từ stageInputMaterials
            stageInputMaterials.map((mat, i) => (
              <tr key={i} className="border-t hover:bg-purple-50/30">
                <td className="px-3 py-2.5 font-medium text-gray-700">{mat.name}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-blue-600">
                  {fmtQty(mat.estimated_quantity)}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-gray-700">—</td>
                <td className="px-3 py-2.5 text-center text-gray-500 text-xs">{mat.unit ?? "—"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-sm text-gray-400">
                Không có bán thành phẩm sử dụng.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>

  {/* ── 4. THÀNH PHẨM ĐẦU RA ── */}
  <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
      <BsBoxSeam className="w-4 h-4 text-green-600" />
      Thành phẩm đầu ra
    </h3>
    {decodeData.outputs.length > 0 ? (
      <div className="space-y-3">
        {decodeData.outputs.map((out, i) => (
          <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-green-800 mb-3">{out.output_name}</p>
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">Số lượng thành phẩm</p>
                <p className="text-green-700 text-right">
                  <span className="font-bold text-lg">{fmtNum(decodeData.qty_good)}</span>{" "}
                  <span className="text-sm">{!isNullText(out.unit) ? out.unit : "sp"}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : stageInputMaterials && stageInputMaterials.length > 0 ? (
      // Fallback: hiển thị từ stageInputMaterials
      <div className="space-y-3">
        {stageInputMaterials.map((mat, i) => (
          <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-green-800 mb-3">{mat.name}</p>
            <div className="bg-white border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">Số lượng dự kiến</p>
                <p className="text-green-700 text-right">
                  <span className="font-bold text-lg">{fmtQty(mat.estimated_quantity)}</span>{" "}
                  <span className="text-sm">{mat.unit ?? "sp"}</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
        Không có thành phẩm đầu ra.
      </p>
    )}
  </div>

  {/* Hình ảnh, ghi chú, action buttons giữ nguyên ... */}
        {/* Hình ảnh báo cáo */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <BsImage className="w-4 h-4 text-teal-600" />
            Hình ảnh báo cáo
          </h3>
          {decodeData.report_image_url ? (
            <a
              href={decodeData.report_image_url}
              target="_blank"
              rel="noreferrer"
              className="block w-32 h-32 rounded-xl border border-gray-200 overflow-hidden hover:opacity-80 hover:shadow-md transition"
            >
              <img
                src={decodeData.report_image_url}
                alt="Hình ảnh báo cáo"
                className="w-full h-full object-cover"
              />
            </a>
          ) : (
            <p className="text-sm text-gray-500 italic">Không có hình ảnh báo cáo</p>
          )}
        </div>

        {/* Ghi chú */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <BsClipboardCheck className="w-4 h-4 text-gray-500" />
            Ghi chú
          </h3>
          <p className={`text-sm bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200 ${!isNullText(decodeData.reason) ? "text-gray-600" : "text-gray-400 italic"}`}>
            {!isNullText(decodeData.reason) ? decodeData.reason : "Không có ghi chú"}
          </p>
        </div>

        {/* Action */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => router.back()}
            disabled={confirming}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !decodeData.valid || expired}
            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <BsCheckCircleFill className="w-4 h-4" />
            {confirming ? "Đang xác nhận..." : "Xác nhận hoàn thành"}
          </button>
        </div>

        {expired && (
          <p className="text-xs text-amber-600 text-center bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Mã QR đã hết hạn — không thể xác nhận. Vui lòng tạo lại báo cáo.
          </p>
        )}
      </div>

      {/* Popup */}
      {popup.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-blue-200 p-6 w-[320px] text-center shadow-lg">
            <h3
              className={`font-semibold mb-3 ${
                popup.type === "success" ? "text-green-600" : "text-red-600"
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
    </div>
  );
}