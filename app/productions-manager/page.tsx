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
======================= */
function ProcessingStages({ prodId }: { prodId: number }) {
  const { data: detail } = useQuery({
    queryKey: ["production-detail", prodId.toString()],
    queryFn: () => productionsApi.getProductionByProdId(prodId.toString()),
    staleTime: 30_000,
  });

  if (!detail?.stages || detail.stages.length === 0) {
    return (
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-xs text-gray-400">Đang tải công đoạn...</span>
      </div>
    );
  }

  const sortedStages = [...detail.stages]
    .filter((s: any) => s.status !== "GroupedWaiting" && s.status !== null && s.status !== undefined)
    .sort((a: any, b: any) => a.seq_num - b.seq_num);

  const totalStages = sortedStages.length;
  const finishedCount = sortedStages.filter(
    (s: any) => s.status === "Finished"
  ).length;
  const progressPercent =
    totalStages > 0 ? Math.round((finishedCount / totalStages) * 100) : 0;

  return (
    <>
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

/* =======================
   GroupProcessingStages Component
======================= */
function GroupProcessingStages({ prodId }: { prodId: number }) {
  const { data: detail } = useQuery({
    queryKey: ["group-production-detail", prodId.toString()],
    queryFn: () => productionsApi.getGroupProductionDetail(prodId),
    staleTime: 30_000,
  });

  if (!detail?.stages || detail.stages.length === 0) {
    return (
      <div className="flex flex-wrap gap-1.5 mb-4 mt-2">
        <span className="text-xs text-gray-400">Đang tải công đoạn...</span>
      </div>
    );
  }

  const sortedStages = [...detail.stages]
    .filter((s: any) => s.status !== "GroupedWaiting" && s.status !== null && s.status !== undefined)
    .sort((a: any, b: any) => a.seq_num - b.seq_num);

  const totalStages = sortedStages.length;
  const finishedCount = sortedStages.filter(
    (s: any) => s.status === "Finished"
  ).length;
  const progressPercent =
    totalStages > 0 ? Math.round((finishedCount / totalStages) * 100) : 0;

  return (
    <div className="mt-3">
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
      <div className="flex flex-wrap gap-1.5 mb-4">
        {sortedStages.map((stage: any, index: number) => {
          const isFinished = stage.status === "Finished";
          const isActive =
            stage.status === "Ready" || stage.status === "InProcessing";
          return (
            <span
              key={stage.task_id ?? index}
              className={`rounded-md px-2 py-0.5 text-xs border flex items-center gap-1 transition-all duration-300
              ${
                isFinished
                  ? "bg-green-100 text-green-700 border-green-300"
                  : isActive
                  ? "bg-purple-100 text-purple-700 border-purple-300 animate-pulse"
                  : "bg-gray-100 text-gray-500 border-gray-300"
              }`}
            >
              {isFinished && <BsCheckCircleFill className="w-3 h-3" />}
              {stage.process_name}
            </span>
          );
        })}
      </div>
    </div>
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
  // Gộp thành 2 tab: "scheduled" (Lệnh sản xuất) và "processing" (Đang sản xuất)
  const [activeTab, setActiveTab] = useState<"scheduled" | "processing">("scheduled");

  /* ================== SCAN QR ================== */
  const callApi = async (token: string) => {
    setIsManualLoading(true);
    try {
      const res = await tasksApi.finishTask({ token });
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
  const [canStartFilter, setCanStartFilter] = useState<"all" | "can" | "cannot">("all");

  /* ================== SORT ================== */
  const [sortType, setSortType] = useState<"delivery" | "progress" | "newest">("newest");

  /* ================== START PRODUCTION ================== */
  const startMutation = useMutation({
    mutationFn: async ({ orderId, prodId }: { orderId: string; prodId: string }) => {
      const res = await productionsApi.startProductionByProdId(prodId);
      if (res.success === false) throw new Error(res.message);
      return res;
    },
    onSuccess: (_, variables) => {
      showSuccessToast(`Lệnh sản xuất đã được bắt đầu ${variables.prodId}`);
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

  // Tất cả lệnh sản xuất (lẻ + ghép) chưa InProcessing
  const filteredScheduled = scheduledOrder.filter((o: any) => {
    if (
      o.production_status === "InProcessing" ||
      o.group_status === "InProcessing"
    )
      return false;

    const matchOrder =
      !searchOrderId || o.prod_id.toString().includes(searchOrderId);

    const matchDate =
      !deliveryDate ||
      new Date(o.delivery_date).toISOString().slice(0, 10) === deliveryDate;

    const matchCanStart =
      canStartFilter === "all" ||
      (canStartFilter === "can" && o.can_start !== false) ||
      (canStartFilter === "cannot" && o.can_start === false);

    return matchOrder && matchDate && matchCanStart;
  });

  // Tất cả lệnh đang sản xuất (lẻ + ghép) đang InProcessing
  const processingList = scheduledOrder
    .filter(
      (o: any) =>
        o.production_status === "InProcessing" ||
        o.group_status === "InProcessing"
    )
    .sort((a: any, b: any) => {
      if (sortType === "newest") return b.prod_id - a.prod_id;
      if (sortType === "delivery")
        return (
          new Date(a.delivery_date).getTime() -
          new Date(b.delivery_date).getTime()
        );
      return b.progress_percent - a.progress_percent;
    });

  /* ================== SORT SCHEDULED ================== */
  const scheduledList = filteredScheduled
    .filter((o: any) => o.production_status === "Scheduled" || (!o.production_status && !o.group_status))
    .sort((a: any, b: any) => {
      if (sortType === "newest") return b.prod_id - a.prod_id;
      if (sortType === "delivery")
        return (
          new Date(a.delivery_date).getTime() -
          new Date(b.delivery_date).getTime()
        );
      return b.progress_percent - a.progress_percent;
    });

  /* ================== PAGINATION DATA ================== */
  const scheduledTotalPages = Math.ceil(scheduledList.length / ITEMS_PER_PAGE);
  const processingTotalPages = Math.ceil(processingList.length / ITEMS_PER_PAGE);

  const scheduledPageData = scheduledList.slice(
    (scheduledPage - 1) * ITEMS_PER_PAGE,
    scheduledPage * ITEMS_PER_PAGE
  );

  const processingPageData = processingList.slice(
    (processingPage - 1) * ITEMS_PER_PAGE,
    processingPage * ITEMS_PER_PAGE
  );

  /* ================== HELPERS ================== */
  const isGrouped = (order: any) => order.order_id === null;

  const getDeliveryColor = (date: string) => {
    const today = new Date();
    const delivery = new Date(date);
    const diffDays = Math.ceil(
      (delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 3) return "bg-red-100 text-red-700 border-red-300";
    if (diffDays < 7) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-green-100 text-green-700 border-green-300";
  };

  const toggleOrderDetails = (orderId: string) => {
    const copy = new Set(expandedOrders);
    copy.has(orderId) ? copy.delete(orderId) : copy.add(orderId);
    setExpandedOrders(copy);
  };

  /* ================== SIGNALR ================== */
  useEffect(() => {
    let conn: any;
    const events = [
      "scheduled",
      "approved-production",
      "production-ready-cancelled",
      "finishedProduction",
      "PendingPaid",
      "Paid",
      "update-ui"
    ];
    const handler = () => {
      console.log("🔥 nhận event SignalR cập nhật UI");
      queryClient.invalidateQueries({ queryKey: ["scheduledOrders"] });
      queryClient.invalidateQueries({ queryKey: ["production-detail"] });
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
  }, [queryClient]);

  /* ================== UI ================== */
  return (
    <div>
      <Title level={2}>Lập lịch sản xuất</Title>

      {/* SEARCH BAR */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-500">Tìm theo lệnh sản xuất</label>
          <input
            type="text"
            value={searchOrderId}
            onChange={(e) => setSearchOrderId(e.target.value)}
            placeholder="Nhập lệnh sản xuất..."
            className="block border rounded-lg px-3 py-2 text-sm w-[180px]"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">Khả năng bắt đầu</label>
          <select
            value={canStartFilter}
            onChange={(e) => setCanStartFilter(e.target.value as any)}
            className="block border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Tất cả</option>
            <option value="can">Có thể bắt đầu</option>
            <option value="cannot">Chưa thể bắt đầu</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Sắp xếp</label>
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as any)}
            className="block border rounded-lg px-3 py-2 text-sm"
          >
            <option value="newest">Mới nhất</option>
            <option value="delivery">Hạn hoàn thành</option>
            <option value="progress">Tiến độ</option>
          </select>
        </div>
        <button
          onClick={() => {
            setSearchOrderId("");
            setDeliveryDate("");
            setCanStartFilter("all");
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
          Lệnh sản xuất
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold
            ${activeTab === "scheduled" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}
          >
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
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold
            ${activeTab === "processing" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}
          >
            {processingList.length}
          </span>
        </button>
      </div>

      {/* ================= TAB: LỆNH SẢN XUẤT ================= */}
      {activeTab === "scheduled" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {scheduledPageData.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Không có lệnh sản xuất nào.
              </p>
            )}

            {scheduledPageData.map((order: any, index: number) => {
              const grouped = isGrouped(order);

              // Nút bắt đầu disabled khi can_start = false
              const canStart = order.can_start !== false;
              const isStarting =
                startMutation.isPending &&
                startMutation.variables?.prodId === order.prod_id;

              return (
                <div
                  key={`${order.prod_id}-${index}`}
                  className={`flex items-start justify-between gap-4 rounded-xl border p-4 shadow-sm hover:shadow-md transition
                    ${
                      grouped
                        ? "border-purple-200 bg-purple-50/30"
                        : "border-gray-200 bg-white"
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        Lệnh sản xuất:
                        <span
                          className={`ml-1 ${grouped ? "text-purple-700" : "text-blue-700"}`}
                        >
                          {order.prod_id}
                        </span>
                      </p>

                      {grouped && (
                        <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                          Ghép
                        </span>
                      )}

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold
                        ${grouped ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                      >
                        SL:{" "}
                        {(order.group_total_qty ?? order.quantity)?.toLocaleString("vi-VN") ?? "—"}
                      </span>
                    </div>

                    {/* Stage badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {grouped
                        ? (order.group_process_codes || "")
                            .split(",")
                            .filter(Boolean)
                            .map((code: string, i: number) => (
                              <span
                                key={i}
                                className="rounded-md border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs text-purple-700 font-medium"
                              >
                                {code.trim()}
                              </span>
                            ))
                        : order.stage_statuses
                        ? order.stage_statuses
                            .filter((s: any) => s.status !== "GroupedWaiting" && s.status !== null && s.status !== undefined)
                            .map((stage: any, i: number) => (
                              <span
                                key={i}
                                className="rounded-md border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                              >
                                {stage.process_name}
                              </span>
                            ))
                        : order.stages?.map((stage: string, i: number) => (
                            <span
                              key={i}
                              className="rounded-md border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                            >
                              {stage}
                            </span>
                          ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={async () => {
                        if (grouped) {
                          try {
                            setIsManualLoading(true);
                            await productionsApi.startGroupProduction(order.prod_id);
                            showSuccessToast(
                              `Đã bắt đầu sản xuất Lệnh SX ghép ${order.prod_id}`
                            );
                            queryClient.invalidateQueries({
                              queryKey: ["scheduledOrders"],
                            });
                          } catch (err: any) {
                            showErrorToast(
                              err.message || "Không thể bắt đầu sản xuất"
                            );
                          } finally {
                            setIsManualLoading(false);
                          }
                        } else {
                          if (!isStarting)
                            startMutation.mutate({
                              orderId: order.order_id,
                              prodId: order.prod_id,
                            });
                        }
                      }}
                      disabled={!canStart || isStarting}
                      title={!canStart ? "Lệnh sản xuất chưa đủ điều kiện bắt đầu" : ""}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition
                        ${
                          !canStart || isStarting
                            ? "cursor-not-allowed bg-gray-300 text-gray-500"
                            : "bg-yellow-500 text-white hover:bg-yellow-600"
                        }`}
                    >
                      <BsPlay className="h-3.5 w-3.5" />
                      Bắt đầu
                    </button>

                    <Link
                      href={
                        grouped
                          ? `/productions-manager/production/group/${order.prod_id}`
                          : `/productions-manager/production/${order.prod_id}`
                      }
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition
                        ${
                          grouped
                            ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                            : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                        }`}
                    >
                      <BsEye className="h-3.5 w-3.5" />
                      Xem chi tiết
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
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

      {/* ================= TAB: ĐANG SẢN XUẤT (1 CỘT) ================= */}
      {activeTab === "processing" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {processingPageData.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Không có lệnh sản xuất nào đang chạy.
              </p>
            )}

            {processingPageData.map((order: any, index: number) => {
              const grouped = isGrouped(order);

              return (
                <div
                  key={`proc-${order.prod_id}-${index}`}
                  className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition
                    ${
                      grouped
                        ? "border-purple-200 bg-purple-50/30 hover:bg-purple-100/50"
                        : "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      Lệnh sản xuất:
                      <span
                        className={`ml-1 ${grouped ? "text-purple-600" : "text-yellow-600"}`}
                      >
                        {order.prod_id}
                      </span>
                      {grouped && (
                        <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200">
                          Ghép
                        </span>
                      )}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold
                      ${grouped ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                    >
                      SL:{" "}
                      {(order.group_total_qty ?? order.quantity)?.toLocaleString("vi-VN") ?? "—"}
                    </span>
                  </div>

                  {order.delivery_date && (
                    <p
                      className={`text-xs mb-3 px-2 py-1 rounded-md inline-block border ${getDeliveryColor(
                        order.delivery_date
                      )}`}
                    >
                      Hạn hoàn thành:{" "}
                      {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                    </p>
                  )}

                  {grouped ? (
                    <GroupProcessingStages prodId={order.prod_id} />
                  ) : (
                    <ProcessingStages prodId={order.prod_id} />
                  )}

                  <Link
                    href={
                      grouped
                        ? `/productions-manager/production/group/${order.prod_id}`
                        : `/productions-manager/production/${order.prod_id}`
                    }
                    className={`mt-3 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition
                      ${
                        grouped
                          ? "border-purple-300 text-purple-700 bg-white hover:bg-purple-50"
                          : "border-gray-300 text-gray-700 bg-white hover:bg-gray-100"
                      }`}
                  >
                    <BsEye className="w-4 h-4" />
                    Xem chi tiết
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
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