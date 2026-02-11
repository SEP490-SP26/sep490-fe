"use client";

import { productionsApi } from "@/apiRequests/productions";
import Loading from "@/app/manager/loading";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { BiPackage } from "react-icons/bi";
import {
  BsArrowLeft,
  BsClock,
  BsChevronDown,
  BsChevronUp,
  BsPrinter,
} from "react-icons/bs";

import { getSignalRConnection } from "@/lib/signalr";


/* =======================
   TYPES
======================= */
export interface OutputProduct {
  name: string;
  code: string;
  quantity: number;
  unit: string;
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
  start_time?: string;
  end_time?: string;
  qty_good: number;
  qty_bad: number;
  waste_percent: number;
  input_materials: any[];
  output_product: OutputProduct;
}

export interface ProductionResponse {
  prod_id: number;
  production_code: string;
  production_status: string;
  start_date: string;
  order_code: string;
  delivery_date: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  stages: ProductionStage[];
}

/* =======================
   STATUS MAP
======================= */
const STATUS_MAP: Record<
  ProductionStage["status"],
  { label: string; color: string }
> = {
  Finished: { label: "Hoàn thành", color: "text-green-600" },
  Ready: { label: "Sẵn sàng", color: "text-yellow-600" },
  InProcessing: { label: "Đang xử lý", color: "text-blue-600" },
  Unassigned: { label: "Chưa phân công", color: "text-gray-500" },
};

/* =======================
   QR MODAL (UI chỉnh)
======================= */
function QrModal({
  token,
  onClose,
  onConfirm,
}: {
  token: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasScannedRef = useRef(false);

  useEffect(() => {
    hasScannedRef.current = false;
    inputRef.current?.focus();
  }, [token]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (hasScannedRef.current) return;
    if (e.key === "Enter") {
      hasScannedRef.current = true;
      inputRef.current?.blur();
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
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
          className="absolute opacity-0"
        />

        <button
          onClick={onClose}
          className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg py-2 transition"
        >
          Đóng
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
  const currentIndex = sortedStages.findIndex(
    (s) => s.status === "InProcessing"
  );

  return (
    <div className="relative mb-8">
      <div className="absolute top-5 left-0 right-0 h-1 bg-blue-100" />
      <div
        className="absolute top-5 left-0 h-1 bg-blue-600 transition-all"
        style={{
          width:
            currentIndex <= 0
              ? "0%"
              : `${(currentIndex / (sortedStages.length - 1)) * 100}%`,
        }}
      />

      <div className="flex justify-between">
        {sortedStages.map((stage) => {
          const isDone = stage.status === "Finished";
          const isCurrent = stage.status === "InProcessing";

          return (
            <div
              key={stage.process_id}
              className="flex flex-col items-center text-center w-full"
            >
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10
                ${
                  isDone
                    ? "bg-green-600 border-green-600 text-white"
                    : isCurrent
                    ? "bg-white border-blue-600 text-blue-600"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {stage.seq_num}
              </div>

              <span
                className={`mt-2 text-sm font-medium
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

              <span className="text-xs text-gray-400 mt-1">
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
   PAGE
======================= */
export default function ProductionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();


  const [qtyInputStage, setQtyInputStage] = useState<ProductionStage | null>(null);
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
    /* =============================== SIGNALR ========================= */
  useEffect(() => {
  if (!production?.prod_id) return;

  let conn: any;

  getSignalRConnection().then((c) => {
    conn = c;
    conn.invoke("JoinProd", production.prod_id);

    conn.on("ProdUpdated", () => {
      queryClient.invalidateQueries({
        queryKey: ["production-detail", id],
      });
    });
  });

  return () => {
    if (conn) {
      conn.off("ProdUpdated");
      conn.invoke("LeaveProd", production.prod_id);
    }
  };
}, [production?.prod_id]);

/*=========================================================================== */


  const sortedStages = useMemo(() => {
    return production?.stages
      ?.slice()
      .sort((a, b) => a.seq_num - b.seq_num);
  }, [production]);

  /* ===== QR LOGIC (GIỮ NGUYÊN) ===== */
  const handleCreateQr = async (
  stage: ProductionStage,
  qtyOverride?: number
) => {
  try {
    setQrLoading(true);

    const defaultQty = stage.input_materials.reduce(
      (sum: number, m: any) => sum + Number(m.quantity || 0),
      0
    );

    const finalQty =
      qtyOverride && qtyOverride > 0 ? qtyOverride : defaultQty;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/Tasks/qr`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: stage.task_id,
          ttl_minutes: 30,
          qty_good: finalQty,
        }),
      }
    );

    const data = await res.json();
    setQrToken(data.token);
  } finally {
    setQrLoading(false);
  }
};


  const handleQrScanned = async (scannedToken: string) => {
    try {
      setQrLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/Tasks/finish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: scannedToken }),
        }
      );

      if (!res.ok) throw new Error(await res.text());

      setQrToken(null);
      setPopup({
        open: true,
        type: "success",
        message: "Hoàn thành công đoạn thành công 🎉",
      });
      //KHÁNH SỬA NẾU CẦN TỰ CMT
      setTimeout(async () => {
        setPopup((p) => ({ ...p, open: false }));
        //
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

  return (
    <div className="min-h-screen bg-blue-50 p-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-blue-600 mb-4"
      >
        <BsArrowLeft /> Quay lại
      </button>

      {/* HEADER */}
      <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6">
        <h1 className="text-xl font-bold text-blue-800 mb-1">
          Lệnh sản xuất {production?.order_code}
        </h1>
        <p className="text-gray-600 text-sm">
          Khách hàng: <b>{production?.customer_name}</b> – Sản phẩm:{" "}
          <b>{production?.product_name}</b>
        </p>
      </div>

      {/* TIMELINE */}
      {sortedStages && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6">
          <h2 className="font-semibold mb-6 flex items-center gap-2 text-blue-700">
            <BsClock /> Tiến độ công đoạn
          </h2>
          <ProductionTimeline stages={sortedStages} />
        </div>
      )}

      {/* STAGE DETAIL */}
      <div className="bg-white rounded-xl border border-blue-200 p-6">
        <h2 className="font-semibold mb-6 flex items-center gap-2 text-blue-700">
          <BsClock /> Chi tiết từng công đoạn
        </h2>

        <div className="space-y-6">
          {sortedStages?.map((stage) => {
            const isCollapsed =
              collapsedStages[stage.process_id] ?? true;

            return (
              <div
                key={stage.process_id}
                className="rounded-xl border border-blue-200 overflow-hidden bg-blue-50"
              >
                <div
                  className="flex justify-between items-center px-4 py-3 cursor-pointer"
                  onClick={() => toggleStage(stage.process_id)}
                >
                  <div>
                    <h3 className="font-bold text-blue-800">
                      {stage.seq_num}. {stage.process_name}
                      <span className="text-gray-500 font-normal">
                        {" "}
                        – {stage.machine}
                      </span>
                    </h3>
                    <span
                      className={`text-sm font-medium ${STATUS_MAP[stage.status].color}`}
                    >
                      {STATUS_MAP[stage.status].label}
                    </span>
                  </div>
                  {isCollapsed ? <BsChevronDown /> : <BsChevronUp />}
                </div>

                {!isCollapsed && (
                  <div className="p-4 space-y-5 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-blue-50 p-3 rounded">
                      <div>
                        <b>Bắt đầu:</b>{" "}
                        {stage.start_time
                          ? new Date(stage.start_time).toLocaleString("vi-VN")
                          : "-"}
                      </div>
                      <div>
                        <b>Kết thúc:</b>{" "}
                        {stage.end_time
                          ? new Date(stage.end_time).toLocaleString("vi-VN")
                          : "-"}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <BiPackage /> Nguyên vật liệu đầu vào
                      </h4>

                      <table className="w-full text-sm border rounded bg-white">
                        <thead className="bg-blue-100">
                          <tr>
                            <th className="px-3 py-2 text-left">Tên</th>
                            <th className="px-3 py-2 text-right">Số lượng</th>
                            <th className="px-3 py-2 text-center">ĐVT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stage.input_materials.length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-3 py-3 text-center text-gray-400"
                              >
                                Không có dữ liệu
                              </td>
                            </tr>
                          ) : (
                            stage.input_materials.map((m: any, i: number) => (
                              <tr key={i} className="border-t">
                                <td className="px-3 py-2">{m.name}</td>
                                <td className="px-3 py-2 text-right">
                                  {m.quantity}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {m.unit}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded p-4">
                      <h4 className="font-medium mb-1 flex items-center gap-2">
                        <BiPackage /> Thành phẩm công đoạn
                      </h4>
                      <p className="text-sm">
                        {stage.output_product.name} –{" "}
                        <b>{stage.output_product.quantity}</b>{" "}
                        {stage.output_product.unit}
                      </p>
                    </div>

                    {stage.status === "Ready" && (
                    <button
                      onClick={() => {
                        setQtyInputStage(stage);
                        setQtyInputValue("");
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <BsPrinter /> Tạo QR
                    </button>
                  )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* MODALS */}
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

      {qrToken && (
        <QrModal
          token={qrToken}
          onClose={() => setQrToken(null)}
          onConfirm={() => handleQrScanned(qrToken)}
        />
      )}

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
    </div>
  );
}
