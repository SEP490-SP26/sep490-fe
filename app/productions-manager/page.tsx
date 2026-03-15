"use client";

import { productionsApi } from "@/apiRequests/productions";
import { useProduction } from "@/context/ProductionContext";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/utils/toastService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
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
import { getSignalRConnection } from "@/lib/signalr";
import { tasksApi } from "@/apiRequests/tasks";
import Title from "antd/es/typography/Title";

export default function ProdutionManager() {
  const queryClient = useQueryClient();
    const bufferRef = useRef("");

  const {
    products,
    orders,
    productionSchedules,
    completeProduction,
    updateProductionStage,
  } = useProduction();

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  /*==================ScanQR ======================= */
  const callApi = async (token: string) => {
    try {
      const res = await tasksApi.finishTask({
        token: token,
      });

      console.log("API success:", res.data);
      showSuccessToast("Scan thành công");
    } catch (error) {
      console.error("API error:", error);
    }
  };

  useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      if (!bufferRef.current) return;

      callApi(bufferRef.current);
      bufferRef.current = "";
      return;
    }

    if (e.key.length === 1) {
      bufferRef.current += e.key;
    }
  };

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, []);
  /* ================== PAGINATION ================== */

  const ITEMS_PER_PAGE = 5;

  const [scheduledPage, setScheduledPage] = useState(1);
  const [processingPage, setProcessingPage] = useState(1);

  /* ================== SEARCH FILTER ================== */

  const [searchOrderId, setSearchOrderId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");

  /* ================== SORT ================== */

  const [sortType, setSortType] = useState<"delivery" | "progress">("delivery");

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

  /* ================== SIGNALR ================== */

  useEffect(() => {
  let conn: any;

  const init = async () => {
    conn = await getSignalRConnection();

    conn.on("OrderUpdated", (data: any) => {
      console.log("🔥 ORDER UPDATED:", data);

      queryClient.invalidateQueries({
        queryKey: ["scheduledOrders"],
      });
    });

    conn.on("ProdUpdated", (data: any) => {
      console.log("⚙️ PROD UPDATED:", data);

      queryClient.invalidateQueries({
        queryKey: ["scheduledOrders"],
      });
    });
  };

  init();

  return () => {
    if (conn) {
      conn.off("OrderUpdated");
      conn.off("ProdUpdated");
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

  /* ================== FILTER DATA ================== */

  const filteredOrders = scheduledOrder.filter((o: any) => {
    const matchOrder =
      !searchOrderId ||
      o.order_id.toString().includes(searchOrderId);

    const matchDate =
      !deliveryDate ||
      new Date(o.delivery_date).toISOString().slice(0, 10) === deliveryDate;

    return matchOrder && matchDate;
  });

  /* ================== SORT + GROUP ================== */

  const scheduledList = filteredOrders
    .filter((o: any) => o.production_status === "Scheduled")
    .sort((a: any, b: any) => {
      if (sortType === "delivery") {
        return (
          new Date(a.delivery_date).getTime() -
          new Date(b.delivery_date).getTime()
        );
      }

      return b.progress_percent - a.progress_percent;
    });

  const processingList = filteredOrders
    .filter((o: any) => o.production_status === "InProcessing")
    .sort((a: any, b: any) => {
      if (sortType === "delivery") {
        return (
          new Date(a.delivery_date).getTime() -
          new Date(b.delivery_date).getTime()
        );
      }

      return b.progress_percent - a.progress_percent;
    });

  /* ================== PAGINATION DATA ================== */

  const scheduledTotalPages = Math.ceil(
    scheduledList.length / ITEMS_PER_PAGE
  );

  const processingTotalPages = Math.ceil(
    processingList.length / ITEMS_PER_PAGE
  );

  const scheduledPageData = scheduledList.slice(
    (scheduledPage - 1) * ITEMS_PER_PAGE,
    scheduledPage * ITEMS_PER_PAGE
  );

  const processingPageData = processingList.slice(
    (processingPage - 1) * ITEMS_PER_PAGE,
    processingPage * ITEMS_PER_PAGE
  );

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

  const getDeliveryColor = (date: string) => {
    const today = new Date();
    const delivery = new Date(date);

    const diffTime = delivery.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 3) return "bg-red-100 text-red-700 border-red-300";
    if (diffDays < 7) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-green-100 text-green-700 border-green-300";
  };

  /* ================== UI ================== */

  return (
    <div>
      <Title level={2}>Lập lịch sản xuất</Title>

      {/* SEARCH BAR */}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">

        <div>
          <label className="text-xs text-gray-500">Tìm Order ID</label>
          <input
            type="text"
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            placeholder="Nhập order id..."
            className="block border rounded-lg px-3 py-2 text-sm w-[180px]"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Ngày giao</label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="block border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500">Sắp xếp</label>
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as any)}
            className="block border rounded-lg px-3 py-2 text-sm"
          >
            <option value="delivery">Ngày giao</option>
            <option value="progress">Tiến độ</option>
          </select>
        </div>

        <button
          onClick={() => {
            setSearchOrderId("");
            setDeliveryDate("");
          }}
          className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================= ĐÃ LÊN LỊCH ================= */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-800">
            <BsCalendar className="w-5 h-5 text-blue-600" />
            Đã lên lịch
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">

            {scheduledPageData.map((order: any) => (
              <div
                key={order.order_id}
                className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition"
              >

                <div className="flex-1 min-w-0">

                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Mã đơn sản xuất:
                      <span className="text-blue-700 ml-1">
                        {order.code}
                      </span>
                    </p>

                    <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                      SL: {order.quantity}
                    </span>
                  </div>

                  <p
                    className={`text-xs mb-3 px-2 py-1 rounded-md inline-block border ${getDeliveryColor(
                      order.delivery_date
                    )}`}
                  >
                    Ngày giao:
                    {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                  </p>

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

                <div className="flex flex-col gap-2">

                  <button
                    onClick={() => handleStart(order.order_id)}
                    disabled={
                      startMutation.isPending &&
                      startMutation.variables === order.order_id
                    }
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition
                      ${
                        startMutation.isPending &&
                        startMutation.variables === order.order_id
                          ? "cursor-not-allowed bg-gray-300 text-gray-600"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      }`}
                  >
                    <BsPlay className="h-3.5 w-3.5" />
                    Bắt đầu
                  </button>

                  <Link
                    href={`/productions-manager/production/${order.order_id}`}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                  >
                    <BsEye className="h-3.5 w-3.5" />
                    Xem chi tiết
                  </Link>

                </div>
              </div>
            ))}

          </div>

          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: scheduledTotalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setScheduledPage(i + 1)}
                className={`px-3 py-1 rounded border text-sm
                ${
                  scheduledPage === i + 1
                    ? "bg-blue-500 text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

        </div>

        {/* ================= ĐANG SẢN XUẤT ================= */}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-800">
            <BsPlay className="w-5 h-5 text-yellow-500" />
            Đang sản xuất
          </h2>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">

            {processingPageData.map((order: any, index: number) => (
              <div
                key={`${order.order_id}-${index}`}
                className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm hover:bg-blue-100 hover:shadow-md transition"
              >

                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    Mã đơn:
                    <span className="text-yellow-600 ml-1">
                      {order.code}
                    </span>
                  </p>

                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    SL: {order.quantity}
                  </span>
                </div>

                <p
                  className={`text-xs mb-3 px-2 py-1 rounded-md inline-block border ${getDeliveryColor(
                    order.delivery_date
                  )}`}
                >
                  Hạn hoàn thành:
                  {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                </p>

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

                <Link
                  href={`/productions-manager/production/${order.order_id}`}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  <BsEye className="w-4 h-4" />
                  Xem chi tiết
                </Link>

              </div>
            ))}

          </div>

          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: processingTotalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setProcessingPage(i + 1)}
                className={`px-3 py-1 rounded border text-sm
                ${
                  processingPage === i + 1
                    ? "bg-yellow-500 text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}