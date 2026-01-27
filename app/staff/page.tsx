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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsCalendar className="w-5 h-5 text-blue-500" />
            Đã lên lịch
          </h2>

          <div className="space-y-1.5 max-h-150 overflow-y-auto">
            {scheduledOrder
              .filter((o: any) => o.production_status === "Scheduled")
              .map((order: any) => (
                <div
                  key={order.order_id}
                  className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {/* LEFT */}
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {order.customer_name?.substring(0, 20) || "Khách lẻ"}
                        {order.customer_name?.length > 30 && "..."}
                      </div>
                      <div className="text-xs font-semibold text-blue-700">
                        SL: {order.quantity}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600">
                      Ngày giao:{" "}
                      {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {order.stages.map((stage: string, index: number) => (
                        <div
                          key={index}
                          className="px-2 py-1 rounded border text-xs bg-gray-100 text-gray-500"
                        >
                          {stage}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <button
                    onClick={() => handleStart(order.order_id)}
                    className={`px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${startMutation.isPending &&
                        startMutation.variables === order.order_id
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                  >
                    {startMutation.isPending &&
                      startMutation.variables === order.order_id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        Đang xử lý
                      </>
                    ) : (
                      <>
                        <BsPlay className="w-3 h-3" />
                        Bắt đầu
                      </>
                    )}
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* ================= ĐANG SẢN XUẤT ================= */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsPlay className="w-5 h-5 text-yellow-500" />
            Đang sản xuất
          </h2>

          <div className="space-y-3 max-h-150 overflow-y-auto">
            {scheduledOrder
              .filter((o: any) => o.production_status === "InProcessing")
              .map((order: any, index: number) => (
                <div
                  key={`${order.order_id}-${index}`}
                  className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                >
                  <div className="flex justify-between mb-2">
                    <div className="font-medium">
                      {order.customer_name || "Khách lẻ"}
                    </div>
                    <div className="text-sm text-gray-500">
                      SL: {order.quantity}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1 text-gray-500">
                      <span>Tiến độ</span>
                      <span>{Math.round(order.progress_percent)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${order.progress_percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Stages */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {order.stages.map((stage: string, index: number) => {
                      const currentIndex =
                        order.stages.indexOf(order.current_stage);
                      const isCompleted =
                        currentIndex !== -1 && index < currentIndex;
                      const isCurrent = stage === order.current_stage;

                      return (
                        <div
                          key={index}
                          className={`px-2 py-1 rounded text-xs ${isCurrent
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : isCompleted
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                        >
                          {stage}
                        </div>
                      );
                    })}
                  </div>

                  <Link
                    href={`/staff/production/${order.order_id}`}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
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