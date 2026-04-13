"use client";

import { productionsApi } from "@/apiRequests/productions";
import { useProduction } from "@/context/ProductionContext";
import {
  showErrorToast,
  showInfoToast,
  showSuccessToast,
} from "@/utils/toastService";
import { useMutation, useQuery, useQueryClient, useIsFetching, useIsMutating } from "@tanstack/react-query";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { BiPackage } from "react-icons/bi";
import { useRouter } from "next/navigation";
import {
  BsBook,
  BsCalendar,
  BsCheckCircleFill,
  BsEye,
  BsLayers,
  BsPlay,
  BsPrinter,
  BsScissors,
} from "react-icons/bs";
import { FiZap } from "react-icons/fi";

import { tasksApi } from "@/apiRequests/tasks";
import Title from "antd/es/typography/Title";
import { getSignalRConnection } from "@/lib/signalr";

/* =======================
   ProcessingStages Component
   - Fetches detail API per order to get individual stage status
   - Shows progress bar + Finished/Ready/InProcessing/Unassigned per stage
======================= */
function ProcessingStages({ orderId }: { orderId: number }) {
  const { data: detail } = useQuery({
    queryKey: ["production-detail", orderId.toString()],
    queryFn: () => productionsApi.getProdyctionByOrderId(orderId.toString()),
    staleTime: 30_000,
  });

  if (!detail?.stages || detail.stages.length === 0) {
    return (
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-xs text-gray-400">Đang tải công đoạn...</span>
      </div>
    );
  }

  const sortedStages = [...detail.stages].sort(
    (a: any, b: any) => a.seq_num - b.seq_num
  );

  const totalStages = sortedStages.length;
  const finishedCount = sortedStages.filter(
    (s: any) => s.status === "Finished"
  ).length;
  const progressPercent =
    totalStages > 0 ? Math.round((finishedCount / totalStages) * 100) : 0;
  return (
    <>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Tiến độ</span>
          <span className="font-medium text-gray-700">
            {finishedCount}/{totalStages} công đoạn ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Stage badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {sortedStages.map((stage: any, index: number) => {
          const isFinished = stage.status === "Finished";
          const isActive =
            stage.status === "Ready" || stage.status === "InProcessing";

          return (
            <span
              key={stage.process_id ?? index}
              className={`rounded-md px-2 py-0.5 text-xs border flex items-center gap-1 transition-all duration-300
              ${
                isFinished
                  ? "bg-green-100 text-green-700 border-green-300"
                  : isActive
                  ? "bg-blue-100 text-blue-700 border-blue-300 animate-pulse"
                  : "bg-gray-100 text-gray-500 border-gray-300"
              }`}
            >
              {isFinished && <BsCheckCircleFill className="w-3 h-3" />}
              {stage.process_name}
            </span>
          );
        })}
      </div>
    </>
  );
}

export default function ProdutionManager() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bufferRef = useRef("");
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isManualLoading, setIsManualLoading] = useState(false);

  const isLoading = isFetching > 0 || isMutating > 0 || isManualLoading;

  const {
    products,
    orders,
    productionSchedules,
    completeProduction,
    updateProductionStage,
  } = useProduction();

  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  /* ================== TABS ================== */

  const [activeTab, setActiveTab] = useState<"scheduled" | "processing">("scheduled");

  /*==================ScanQR ======================= */
  const callApi = async (token: string) => {
    setIsManualLoading(true);
    try {
      const res = await tasksApi.finishTask({
        token: token,
      });

      console.log("API success:", res.data);
      showSuccessToast("Scan thành công");
    } catch (error) {
      console.error("API error:", error);
    } finally {
      setIsManualLoading(false);
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

  const [sortType, setSortType] = useState<"delivery" | "progress" | "newest">("newest");

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
      if (sortType === "newest") {
        return b.order_id - a.order_id;
      }
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
      if (sortType === "newest") {
        return b.order_id - a.order_id;
      }
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

  //signalr
  useEffect(() => {
  let conn: any;

  const init = async () => {
    conn = await getSignalRConnection();

    conn.on("update-ui", () => {
      console.log("🔥 nhận update-ui");

      // ✅ QUAN TRỌNG: refresh React Query
      queryClient.invalidateQueries({ queryKey: ["scheduledOrders"] });
      queryClient.invalidateQueries({ queryKey: ["production-detail"] });
    });
  };

  init();

  return () => {
    if (conn) conn.off("update-ui");
  };
}, [queryClient]);

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
            <option value="newest">Mới nhất</option>
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

      {/* ================= TABS ================= */}

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("scheduled")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors
            ${
              activeTab === "scheduled"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
        >
          <BsCalendar className="w-4 h-4" />
          Đã lên lịch
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold
            ${activeTab === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
            {scheduledList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("processing")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors
            ${
              activeTab === "processing"
                ? "border-yellow-500 text-yellow-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
        >
          <BsPlay className="w-4 h-4" />
          Đang sản xuất
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold
            ${activeTab === "processing" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
            {processingList.length}
          </span>
        </button>
      </div>

      {/* ================= TAB CONTENT ================= */}

      {activeTab === "scheduled" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">

            {scheduledPageData.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Không có đơn nào đã lên lịch.</p>
            )}

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
      )}

      {activeTab === "processing" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">

            {processingPageData.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Không có đơn nào đang sản xuất.</p>
            )}

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

                <ProcessingStages orderId={order.order_id} />

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
      )}

      <LoadingOverlay isLoading={isLoading} />
    </div>
  );
}