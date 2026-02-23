"use client";

import { productionsApi } from "@/apiRequests/productions";
import { useProduction } from "@/context/ProductionContext";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/utils/toastService";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { BiPackage } from "react-icons/bi";
import {
  BsBook,
  BsCalendar,
  BsEye,
  BsLayers,
  BsPlay,
  BsPrinter,
  BsScissors,
} from "react-icons/bs";
import { FiZap } from "react-icons/fi";
import { useEffect } from "react";
import { getSignalRConnection } from "@/lib/signalr";

export default function StaffProductionScheduling() {
  const queryClient = useQueryClient();

  const {
    products,
    orders,
    productionSchedules,
    completeProduction,
    updateProductionStage,
  } = useProduction();

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  /* ================== STAGES ================== */
  const productionStages = [
    { id: "ralo", name: "Ralo", icon: BsScissors },
    { id: "cut", name: "Cắt", icon: BsScissors },
    { id: "print", name: "In", icon: BsPrinter },
    { id: "laminate", name: "Cán màng", icon: BsLayers },
    { id: "corrugate", name: "Bồi sóng", icon: BiPackage },
    { id: "crease", name: "Bể", icon: FiZap },
    { id: "diecut", name: "Dứt", icon: BsScissors },
    { id: "glue", name: "Dán", icon: BsBook },
  ];

  /* ================== START PRODUCTION ================== */
  const startMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await productionsApi.startProduction(orderId);
      if (res.success === false) throw new Error(res.message);
      return res;
    },
    onSuccess: (_, orderId) => {
      showSuccessToast(`Đã bắt đầu sản xuất ${orderId}`);
      queryClient.invalidateQueries({ queryKey: ["scheduledOrders"] });
    },
    onError: (err: any) => {
      showErrorToast(err.message || "Không thể bắt đầu sản xuất");
    },
  });

  /* ================== LOAD SCHEDULE ================== */
  const { data: scheduledOrder = [] } = useQuery({
    queryKey: ["scheduledOrders"],
    queryFn: async () => {
      const res = await productionsApi.getAllProduction();
      return res.data;
    },
  });
  /*=========================== SIGNALR =================== */

useEffect(() => {
  let conn: any;

  const init = async () => {
    conn = await getSignalRConnection();

    conn.on("OrderUpdated", (data: any) => {
      console.log("🔥 ORDER UPDATED RECEIVED:", data);

      queryClient.invalidateQueries({
        queryKey: ["scheduledOrders"],
      });
    });
  };

  init();

  return () => {
    if (conn) {
      conn.off("OrderUpdated");
    }
  };
}, []);

useEffect(() => {
  if (!scheduledOrder.length) return;

  const joinGroups = async () => {
    const conn = await getSignalRConnection();

    for (const o of scheduledOrder) {
      await conn.invoke("JoinOrder", o.order_id);
      console.log("Joined order-", o.order_id);
    }
  };

  joinGroups();
}, [scheduledOrder]);



  /* ================== HANDLERS ================== */
  const handleStart = (orderId: string) => {
    if (!startMutation.isPending) startMutation.mutate(orderId);
  };

  const handleUpdateStage = (scheduleId: string, stage: string) => {
    if (confirm(`Chuyển sang công đoạn ${stage}?`)) {
      updateProductionStage(scheduleId, stage);
      showInfoToast(`Đã chuyển sang ${stage}`);
    }
  };

  const handleComplete = (scheduleId: string) => {
    if (confirm("Hoàn thành sản xuất?")) {
      completeProduction(scheduleId);
      showSuccessToast("Hoàn thành sản xuất");
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    const copy = new Set(expandedOrders);
    copy.has(orderId) ? copy.delete(orderId) : copy.add(orderId);
    setExpandedOrders(copy);
  };

  /* ================== UI ================== */
  return (
    <div>
      <h1 className="mb-8 text-xl font-semibold">
        Lập lịch Sản xuất
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= ĐÃ LÊN LỊCH ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-800">
          <BsCalendar className="w-5 h-5 text-blue-600" />
          Đã lên lịch
        </h2>

        {/* List */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {scheduledOrder
            .filter((o: any) => o.production_status === "Scheduled")
            .map((order: any) => (
              <div
                key={order.order_id}
                className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                {/* LEFT */}
                <div className="flex-1 min-w-0">
                  {/* Title + SL */}
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Mã đơn sản xuất:{" "}
                      <span className="text-blue-700">{order.code}</span>
                    </p>

                    <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      SL: {order.quantity}
                    </span>
                  </div>

                  {/* Delivery date */}
                  <p className="text-xs text-gray-500 mb-3">
                    Ngày giao:{" "}
                    {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                  </p>

                  {/* Stages */}
                  <div className="flex flex-wrap gap-1.5">
                    {order.stages.map((stage: string, index: number) => (
                      <span
                        key={index}
                        className="rounded-md border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                      >
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>

                {/* RIGHT */}
                <button
                  onClick={() => handleStart(order.order_id)}
                  disabled={
                    startMutation.isPending &&
                    startMutation.variables === order.order_id
                  }
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition
                    ${
                      startMutation.isPending &&
                      startMutation.variables === order.order_id
                        ? "cursor-not-allowed bg-gray-300 text-gray-600"
                        : "bg-yellow-500 text-white hover:bg-yellow-600"
                    }`}
                >
                  {startMutation.isPending &&
                  startMutation.variables === order.order_id ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang xử lý
                    </>
                  ) : (
                    <>
                      <BsPlay className="h-3.5 w-3.5" />
                      Bắt đầu
                    </>
                  )}
                </button>
              </div>
            ))}
        </div>
      </div>


        {/* ================= ĐANG SẢN XUẤT ================= */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  {/* Header */}
  <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-800">
    <BsPlay className="w-5 h-5 text-yellow-500" />
    Đang sản xuất
  </h2>

  {/* List */}
  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
    {scheduledOrder
      .filter((o: any) => o.production_status === "InProcessing")
      .map((order: any, index: number) => (
        <div
          key={`${order.order_id}-${index}`}
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm hover:bg-blue-100 hover:shadow-md transition"
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900 truncate">
              Mã đơn:{" "}
              <span className="text-yellow-600">{order.code}</span>
            </p>

            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              SL: {order.quantity}
            </span>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Tiến độ</span>
              <span className="font-medium text-gray-700">
                {Math.round(order.progress_percent)}%
              </span>
            </div>

            <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{ width: `${order.progress_percent}%` }}
              />
            </div>
          </div>

          {/* Stages */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {order.stages.map((stage: string, index: number) => {
              const currentIndex =
                order.stages.indexOf(order.current_stage);
              const isCompleted =
                currentIndex !== -1 && index < currentIndex;
              const isCurrent = stage === order.current_stage;

              return (
                <span
                  key={index}
                  className={`rounded-md px-2 py-0.5 text-xs border
                    ${
                      isCurrent
                        ? "bg-blue-100 text-blue-700 border-blue-300"
                        : isCompleted
                        ? "bg-green-100 text-green-700 border-green-300"
                        : "bg-gray-100 text-gray-500 border-gray-300"
                    }`}
                >
                  {stage}
                </span>
              );
            })}
          </div>

          {/* Action */}
          <Link
            href={`/staff/production/${order.order_id}`}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            <BsEye className="w-4 h-4" />
            Xem chi tiết
          </Link>
        </div>
      ))}
  </div>
</div>

      </div>
    </div>
  );
}