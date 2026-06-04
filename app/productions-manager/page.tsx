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
import {
  getSignalRConnection,
  PRODUCTION_MANAGER_SIGNALR_EVENTS,
} from "@/lib/signalr";

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
              ${isFinished
                  ? "bg-green-100 text-green-700 border-green-300"
                  : isActive
                    ? "bg-blue-100 text-blue-700 border-blue-300 animate-pulse"
                    : "bg-gray-100 text-gray-500 border-gray-300"
                }`}
            >
              {isFinished && <BsCheckCircleFill className="w-3 h-3" />}
              {stage.process_name} - ID: #{stage.task_id }
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
              ${isFinished
                  ? "bg-green-100 text-green-700 border-green-300"
                  : isActive
                    ? "bg-purple-100 text-purple-700 border-purple-300 animate-pulse"
                    : "bg-gray-100 text-gray-500 border-gray-300"
                }`}
            >
              {isFinished && <BsCheckCircleFill className="w-3 h-3" />}
              {stage.process_name} - ID: #{stage.task_id}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function unwrapProductionDetail(res: unknown) {
  if (res && typeof res === "object" && "data" in res && (res as { data?: unknown }).data != null) {
    return (res as { data: unknown }).data as Record<string, unknown>;
  }
  return res as Record<string, unknown>;
}

function isIssueFileUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

function mapOrderToModalDetail(order: any) {
  const stages = (order.stage_statuses ?? [])
    .filter((s: any) => s.status !== "GroupedWaiting" && s.status !== "Pending" && s.status != null)
    .map((s: any) => ({
      process_name: s.process_name,
      status: s.status,
      seq_num: s.seq_num,
      actual_output_quantity: s.actual_output_quantity,
      output_product: s.output_product,
      input_materials: s.input_materials,
    }));

  return {
    prod_id: order.prod_id,
    quantity: order.group_total_qty ?? order.quantity,
    stages,
    sub_product_issue_file: "",
  };
}

/* =======================
   Group productions by order_id / list_order_id
======================= */
interface ProductionGroup {
  groupKey: string;
  orderIds: number[];
  productions: any[];
}

function groupProductionsByOrderId(productions: any[]): ProductionGroup[] {
  // Union-Find to merge order_ids connected via GROUP productions
  const parent: Record<number, number> = {};

  function find(x: number): number {
    if (!(x in parent)) parent[x] = x;
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }

  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Initialize all known order_ids
  productions.forEach((o) => {
    if (o.order_id != null) find(o.order_id);
    if (Array.isArray(o.list_order_id)) {
      o.list_order_id.forEach((id: number) => find(id));
    }
  });

  // Union order_ids connected by GROUP productions (via list_order_id)
  productions.forEach((o) => {
    const ids: number[] = Array.isArray(o.list_order_id) ? o.list_order_id : [];
    if (ids.length > 1) {
      for (let i = 1; i < ids.length; i++) {
        union(ids[0], ids[i]);
      }
    }
    // If production has both order_id and list_order_id, union them
    if (o.order_id != null && ids.length > 0) {
      union(o.order_id, ids[0]);
    }
  });

  // Assign each production to its group
  const groupMap: Record<string, { orderIds: Set<number>; productions: any[] }> = {};

  productions.forEach((o) => {
    let gKey: string;

    if (o.order_id != null) {
      gKey = find(o.order_id).toString();
    } else if (Array.isArray(o.list_order_id) && o.list_order_id.length > 0) {
      gKey = find(o.list_order_id[0]).toString();
    } else {
      // Standalone production with no order_id and no list_order_id
      gKey = `standalone_${o.prod_id}`;
    }

    if (!groupMap[gKey]) {
      groupMap[gKey] = { orderIds: new Set(), productions: [] };
    }

    if (o.order_id != null) {
      groupMap[gKey].orderIds.add(o.order_id);
    }
    if (Array.isArray(o.list_order_id)) {
      o.list_order_id.forEach((id: number) => groupMap[gKey].orderIds.add(id));
    }

    groupMap[gKey].productions.push(o);
  });

  return Object.values(groupMap).map((g) => ({
    groupKey:
      g.orderIds.size > 0
        ? Array.from(g.orderIds).sort((a, b) => a - b).join(",")
        : `standalone`,
    orderIds: Array.from(g.orderIds).sort((a, b) => a - b),
    productions: g.productions,
  }));
}

export default function ProdutionManager() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bufferRef = useRef("");
  const modalDismissGuardRef = useRef(false);
  const modalDetailFetchSeqRef = useRef(0);
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; prodId: number | null, actionType: "start" | "importing" | "start_group" | null, orderId?: string }>({
    open: false,
    prodId: null,
    actionType: null,
  });
  const [prodDetailForModal, setProdDetailForModal] = useState<any>(null);
  const [isLoadingModalDetail, setIsLoadingModalDetail] = useState(false);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const openConfirmModal = (order: any, actionType: "start" | "importing" | "start_group" = "importing") => {
    if (modalDismissGuardRef.current) return;
    const prodId = Number(order.prod_id);
    setConfirmModal({ open: true, prodId, actionType, orderId: order.order_id });
    setProdDetailForModal(mapOrderToModalDetail(order));
    setIsLoadingModalDetail(true);
  };

  const closeConfirmModal = () => {
    modalDetailFetchSeqRef.current += 1;
    setConfirmModal({ open: false, prodId: null, actionType: null });
    setProdDetailForModal(null);
    setIsLoadingModalDetail(false);
    modalDismissGuardRef.current = true;
    window.setTimeout(() => {
      modalDismissGuardRef.current = false;
    }, 300);
  };

  useEffect(() => {
    if (!confirmModal.open || confirmModal.prodId == null) return;

    const fetchSeq = ++modalDetailFetchSeqRef.current;
    const prodId = confirmModal.prodId;

    productionsApi
      .getProductionByProdId(prodId.toString())
      .then((res) => {
        if (fetchSeq !== modalDetailFetchSeqRef.current) return;
        const data = unwrapProductionDetail(res);
        setProdDetailForModal((prev: any) => ({
          ...(prev ?? { prod_id: prodId }),
          prod_id: (data.prod_id as number) ?? prodId,
          quantity: (data.quantity as number) ?? prev?.quantity,
          stages: Array.isArray(data.stages) && data.stages.length > 0 ? data.stages : prev?.stages,
          sub_product_issue_file: (data.sub_product_issue_file as string) ?? "",
        }));
      })
      .catch(() => {
        /* giữ dữ liệu từ danh sách lệnh */
      })
      .finally(() => {
        if (fetchSeq === modalDetailFetchSeqRef.current) {
          setIsLoadingModalDetail(false);
        }
      });

    return () => {
      modalDetailFetchSeqRef.current += 1;
    };
  }, [confirmModal.open, confirmModal.prodId]);

  const handleConfirmAction = async () => {
    const prodId = confirmModal.prodId;
    if (prodId == null || Number.isNaN(prodId) || isConfirmingAction) return;

    setIsConfirmingAction(true);
    setIsManualLoading(true);
    try {
      if (confirmModal.actionType === "importing") {
        await productionsApi.markImporting(prodId);
        showSuccessToast(`Đã xác nhận lấy từ bán thành phẩm cho lệnh SX ${prodId}`);
        queryClient.invalidateQueries({ queryKey: ["scheduledOrders"] });
        closeConfirmModal();
      } else if (confirmModal.actionType === "start") {
        await startMutation.mutateAsync({ orderId: confirmModal.orderId as string, prodId: prodId.toString() });
        closeConfirmModal();
      } else if (confirmModal.actionType === "start_group") {
        await productionsApi.startGroupProduction(prodId);
        showSuccessToast(`Đã bắt đầu sản xuất Lệnh SX ghép ${prodId}`);
        queryClient.invalidateQueries({ queryKey: ["scheduledOrders"] });
        closeConfirmModal();
      }
    } catch (err: any) {
      if (confirmModal.actionType !== "start") {
        showErrorToast(err.message || "Có lỗi xảy ra");
      }
    } finally {
      setIsConfirmingAction(false);
      setIsManualLoading(false);
    }
  };

  const isLoading = isFetching > 0 || isMutating > 0 || isManualLoading;

  const {
    products,
    orders,
    productionSchedules,
    completeProduction,
    updateProductionStage,
  } = useProduction();

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  /* ================== TABS ================== */
  const [activeTab, setActiveTab] = useState<"scheduled" | "processing">("scheduled");

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

  const filteredScheduled = scheduledOrder.filter((o: any) => {
    if (o.production_method === null || o.production_method === undefined) return false;
    if (
        (o.production_status === "InProcessing" ||
        o.group_status === "InProcessing")
    )
      return false;

    const listStageStatuses = o.stage_statuses;

    const matchOrder =
      !searchOrderId ||
      o.prod_id?.toString().includes(searchOrderId) ||
      o.order_id?.toString().includes(searchOrderId) ||
      (Array.isArray(o.list_order_id) &&
        o.list_order_id.some((id: number) =>
          id.toString().includes(searchOrderId)
        )) ||
      (Array.isArray(listStageStatuses) &&
        listStageStatuses.some((s: any) =>
          s.task_id?.toString().includes(searchOrderId)
        ));

    const matchDate =
      !deliveryDate ||
      new Date(o.delivery_date).toISOString().slice(0, 10) === deliveryDate;

    const matchCanStart =
      canStartFilter === "all" ||
      (canStartFilter === "can" && o.can_start !== false) ||
      (canStartFilter === "cannot" && o.can_start === false);

    return matchOrder && matchDate && matchCanStart;
  });

  const processingList = scheduledOrder
  .filter(
    (o: any) =>
      (o.production_status === "InProcessing" ||
        o.group_status === "InProcessing") &&
      (!searchOrderId ||
        o.prod_id?.toString().includes(searchOrderId) ||
        o.order_id?.toString().includes(searchOrderId) ||
        (Array.isArray(o.list_order_id) &&
          o.list_order_id.some((id: number) =>
            id.toString().includes(searchOrderId)
          )) ||
        (Array.isArray(o.stage_statuses) &&
          o.stage_statuses.some((s: any) =>
            s.task_id?.toString().includes(searchOrderId)
          )))
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
      const aCanStart = a.can_start !== false;
      const bCanStart = b.can_start !== false;

      if (aCanStart && !bCanStart) return -1;
      if (!aCanStart && bCanStart) return 1;

      if (sortType === "newest") return b.prod_id - a.prod_id;
      if (sortType === "delivery") {
        if (!a.delivery_date && !b.delivery_date) return b.prod_id - a.prod_id;
        if (!a.delivery_date) return 1;
        if (!b.delivery_date) return -1;
        return (
          new Date(a.delivery_date).getTime() -
          new Date(b.delivery_date).getTime()
        );
      }
      return b.progress_percent - a.progress_percent;
    });

  /* ================== GROUP BY ORDER_ID / LIST_ORDER_ID ================== */
  const scheduledGroups = groupProductionsByOrderId(scheduledList);
  const processingGroups = groupProductionsByOrderId(processingList);

  /* ================== PAGINATION DATA ================== */
  const scheduledTotalPages = Math.ceil(scheduledGroups.length / ITEMS_PER_PAGE);
  const processingTotalPages = Math.ceil(processingGroups.length / ITEMS_PER_PAGE);

  const scheduledPageGroups = scheduledGroups.slice(
    (scheduledPage - 1) * ITEMS_PER_PAGE,
    scheduledPage * ITEMS_PER_PAGE
  );

  const processingPageGroups = processingGroups.slice(
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

  const toggleGroupCollapse = (groupKey: string) => {
    const copy = new Set(collapsedGroups);
    copy.has(groupKey) ? copy.delete(groupKey) : copy.add(groupKey);
    setCollapsedGroups(copy);
  };

  /* ================== SIGNALR ================== */
  useEffect(() => {
    let conn: any;
    const events = [...PRODUCTION_MANAGER_SIGNALR_EVENTS];
    const handler = () => {
      console.log("🔥 nhận event SignalR cập nhật UI");
      queryClient.invalidateQueries({ queryKey: ["scheduledOrders"] });
      queryClient.invalidateQueries({ queryKey: ["production-detail"] });
      queryClient.invalidateQueries({ queryKey: ["group-production-detail"] });
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
            placeholder="Nhập lệnh sản xuất, task id..."
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
            ${activeTab === "scheduled"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
        >
          <BsCalendar className="w-4 h-4" />
          Lệnh sản xuất đã lên lịch
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
            ${activeTab === "processing"
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
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {scheduledPageGroups.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">
                Không có lệnh sản xuất nào.
              </p>
            )}

            {scheduledPageGroups.map((group) => {
              const isGroupExpanded = !collapsedGroups.has(group.groupKey);
              return (
                <div key={group.groupKey} className="border border-indigo-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.groupKey)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50/80 to-gray-50/80 hover:from-indigo-100 hover:to-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <BsLayers className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">
                        {group.orderIds.length === 0
                          ? "Lệnh sản xuất độc lập"
                          : group.orderIds.length === 1
                            ? `Đơn hàng #${group.orderIds[0]}`
                            : `Nhóm đơn hàng: ${group.orderIds.map((id: number) => `#${id}`).join(", ")}`}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/70 rounded-full px-2 py-0.5 border border-gray-200">
                        {group.productions.length} lệnh SX
                      </span>
                    </div>
                    <span className={`text-gray-400 transition-transform duration-200 inline-block text-xs ${isGroupExpanded ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {isGroupExpanded && (
                  <div className="p-3 space-y-3">
            {group.productions.map((order: any, index: number) => {
              const grouped = isGrouped(order);

              const canStart = order.can_start !== false;
              const isStarting =
                startMutation.isPending &&
                startMutation.variables?.prodId === order.prod_id;
              const visibleStages = (order.stage_statuses ?? [])
  .filter(
    (s: any) =>
      s.status !== "GroupedWaiting" &&
      s.status !== null &&
      s.status !== undefined
  )
  .sort((a: any, b: any) => a.seq_num - b.seq_num);

const currentStageIndex = visibleStages.findIndex(
  (s: any) => s.is_current === true
);

const previousStages =
  currentStageIndex > 0
    ? visibleStages.slice(0, currentStageIndex)
    : [];

const isNvlAllDone =
  order.production_method === "SUB" &&
  previousStages.length > 0 &&
  previousStages.every((s: any) => s.status === "Finished");

              return (
                <div
                  key={`${order.prod_id}-${index}`}
                  className={`flex items-start justify-between gap-4 rounded-xl border p-4 shadow-sm hover:shadow-md transition
                    ${grouped
                      ? "border-purple-200 bg-purple-50/30"
                      : "border-gray-200 bg-white"
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                        <span>
                          Lệnh sản xuất:
                          <span
                            className={`ml-1 ${grouped ? "text-purple-700" : "text-blue-700"}`}
                          >
                            {order.prod_id}
                          </span>
                        </span>
                        {order.is_priority && (
                          <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-200">
                            Ưu tiên
                          </span>
                        )}
                        {order.created_at && (new Date().getTime() - new Date(order.created_at).getTime()) < 10 * 60 * 60 * 1000 && (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                            Mới tạo
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

                    {/* Ngày bắt đầu + Hạn hoàn thành */}
                    <div className="flex flex-wrap gap-2 my-1.5">
                      {order.planned_start_date && (
                        <p className="text-xs px-2 py-0.5 rounded-md inline-block border bg-blue-50 text-blue-700 border-blue-200">
                          Ngày bắt đầu dự kiến:{" "}
                          {new Date(order.planned_start_date).toLocaleDateString("vi-VN")}
                        </p>
                      )}                      
                      {order.planned_end_date && (<p
                          className={`text-xs px-2 py-0.5 rounded-md inline-block border ${getDeliveryColor(
                            order.planned_end_date
                          )}`}
                        >
                          Hạn hoàn thành:{" "}
                          {new Date(order.planned_end_date).toLocaleDateString("vi-VN")}
                        </p>)}                
                    </div>

                    {/* Stage badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {order.stage_statuses && order.stage_statuses.length > 0
                        ? order.stage_statuses
                            .filter((s: any) => s.status !== "GroupedWaiting" && s.status !== null && s.status !== undefined)
                            .map((stage: any, i: number) => {
                              const isFinished = stage.status === "Finished";
                              return (
                                <span
                                  key={i}
                                  className={`rounded-md border px-2 py-0.5 text-xs flex items-center gap-1
                                    ${isFinished
                                      ? "bg-green-100 text-green-700 border-green-300"
                                      : grouped 
                                        ? "bg-purple-50 text-purple-700 border-purple-300" 
                                        : "bg-gray-50 text-gray-600 border-gray-300"
                                    }`}
                                >
                                  {isFinished && <BsCheckCircleFill className="w-3 h-3" />}
                                  {stage.process_name} - ID: #{stage.task_id}
                                </span>
                              );
                            })
                        : grouped
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
                      onClick={() => {
                        if (confirmModal.open || modalDismissGuardRef.current) return;

                        if (grouped) {
                          openConfirmModal(order, "start_group");
                        } else {
                          if (isNvlAllDone) {
                            openConfirmModal(order, "importing");
                          } else {
                            if (!isStarting) {
                              openConfirmModal(order, "start");
                            }
                          }
                        }
                      }}
                      disabled={(isNvlAllDone ? false : !canStart) || isStarting || confirmModal.open}
                      title={!canStart && !isNvlAllDone ? "Lệnh sản xuất chưa đủ điều kiện bắt đầu" : ""}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition
    ${(isNvlAllDone ? false : !canStart) || isStarting || confirmModal.open
                          ? "cursor-not-allowed bg-gray-300 text-gray-500"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                        }`}
                    >
                      <BsPlay className="h-3.5 w-3.5" />
                      {isNvlAllDone ? "Sản xuất từ Bán thành phẩm có sẵn" : "Bắt đầu"}
                    </button>

                    <Link
                      href={
                        grouped
                          ? `/productions-manager/production/group/${order.prod_id}`
                          : `/productions-manager/production/${order.prod_id}`
                      }
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-semibold transition
                        ${grouped
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
                  )}
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
                  ${scheduledPage === i + 1
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
            {processingPageGroups.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Không có lệnh sản xuất nào đang chạy.
              </p>
            )}

            {processingPageGroups.map((group) => {
              const isGroupExpanded = !collapsedGroups.has(group.groupKey);
              return (
                <div key={group.groupKey} className="border border-indigo-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleGroupCollapse(group.groupKey)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-50/80 to-gray-50/80 hover:from-yellow-100 hover:to-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <BsLayers className="w-4 h-4 text-yellow-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-800">
                        {group.orderIds.length === 0
                          ? "Lệnh sản xuất độc lập"
                          : group.orderIds.length === 1
                            ? `Đơn hàng #${group.orderIds[0]}`
                            : `Nhóm đơn hàng: ${group.orderIds.map((id: number) => `#${id}`).join(", ")}`}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/70 rounded-full px-2 py-0.5 border border-gray-200">
                        {group.productions.length} lệnh SX
                      </span>
                    </div>
                    <span className={`text-gray-400 transition-transform duration-200 inline-block text-xs ${isGroupExpanded ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {isGroupExpanded && (
                  <div className="p-3 space-y-3">
            {group.productions.map((order: any, index: number) => {
              const grouped = isGrouped(order);

              return (
                <div
                  key={`proc-${order.prod_id}-${index}`}
                  className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition
                    ${grouped
                      ? "border-purple-200 bg-purple-50/30 hover:bg-purple-100/50"
                      : "border-blue-200 bg-blue-50/50 hover:bg-blue-50"
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                      <span>
                        Lệnh sản xuất:
                        <span
                          className={`ml-1 ${grouped ? "text-purple-600" : "text-yellow-600"}`}
                        >
                          {order.prod_id}
                        </span>
                      </span>
                      {order.is_priority && (
                        <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-200">
                          Ưu tiên
                        </span>
                      )}
                      {order.created_at && (new Date().getTime() - new Date(order.created_at).getTime()) < 10 * 60 * 60 * 1000 && (
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                          Mới tạo
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

                  {/* Ngày bắt đầu + Hạn hoàn thành */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.planned_start_date && (
                      <p className="text-xs px-2 py-1 rounded-md inline-block border bg-blue-50 text-blue-700 border-blue-200">
                        Ngày bắt đầu dự kiến:{" "}
                        {new Date(order.planned_start_date).toLocaleDateString("vi-VN")}
                      </p>
                    )}
                      {order.planned_end_date &&(<p
                        className={`text-xs px-2 py-1 rounded-md inline-block border ${getDeliveryColor(
                          order.planned_end_date
                        )}`}
                      >
                        Hạn hoàn thành:{" "}
                        {new Date(order.planned_end_date).toLocaleDateString("vi-VN")}
                      </p>)}
                  </div>

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
                      ${grouped
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
                  )}
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
                  ${processingPage === i + 1
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

      {/* ================= CONFIRM MODAL ================= */}
      {confirmModal.open && (() => {
        const detail = prodDetailForModal;
        const finishedStages = detail?.stages?.filter((s: any) => s.status === "Finished") ?? [];
        const allVisibleStages = detail?.stages?.filter((s: any) => s.status !== "GroupedWaiting" && s.status != null && s.status !== "Pending") ?? [];
        const nextStage = allVisibleStages.find((s: any) => s.status !== "Finished");
        const lastFinished = finishedStages[finishedStages.length - 1];

        const issueFileUrl: string = (detail?.sub_product_issue_file ?? "").trim();
        const hasIssueFileUrl = isIssueFileUrl(issueFileUrl);
        const isPdf = hasIssueFileUrl && issueFileUrl.toLowerCase().includes(".pdf");
        const isImage = hasIssueFileUrl && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(issueFileUrl);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                closeConfirmModal();
              }
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-[500px] max-w-full mx-4 overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >

              {/* Header */}
              <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-yellow-100 shrink-0">
                  <BiPackage className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {confirmModal.actionType === "importing" 
                      ? "Xác nhận lấy từ bán thành phẩm" 
                      : confirmModal.actionType === "start_group" 
                        ? "Xác nhận bắt đầu sản xuất (Lệnh ghép)" 
                        : "Xác nhận bắt đầu sản xuất"}
                  </h3>
                  {detail && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Lệnh sản xuất: {detail.prod_id}
                    </p>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {detail ? (
                  <>
                    {/* Công đoạn */}
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                        Công đoạn đã hoàn thành
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allVisibleStages.map((s: any, i: number) => {
                          const done = s.status === "Finished";
                          return (
                            <span key={i} className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border
                              ${done
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                              }`}>
                              {done
                                ? <BsCheckCircleFill className="w-3 h-3" />
                                : <span className="w-3 h-3 rounded-full border border-gray-400 inline-block" />
                              }
                              {s.process_name}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Số lượng */}
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                        Số lượng
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                          <p className="text-[11px] text-gray-400 mb-0.5">Lệnh sản xuất yêu cầu</p>
                          <p className="text-lg font-semibold text-gray-800">
                            {detail.quantity?.toLocaleString("vi-VN")}
                            <span className="text-xs font-normal text-gray-400 ml-1">sp</span>
                          </p>
                        </div>
                        {lastFinished && (
                          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
                            <p className="text-[11px] text-gray-400 mb-0.5">Sản lượng sau BTP</p>
                            <p className="text-lg font-semibold text-gray-800">
                              {lastFinished.actual_output_quantity?.toLocaleString("vi-VN") ?? "—"}
                              <span className="text-xs font-normal text-gray-400 ml-1">
                                {lastFinished.output_product?.unit ?? ""}
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NVL đầu vào công đoạn tiếp theo */}
                    {nextStage?.input_materials?.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                          Nguyên liệu đầu vào — {nextStage.process_name}
                        </p>
                        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                          {nextStage.input_materials.map((m: any, i: number) => (
                            <div key={i} className="flex justify-between items-center px-3 py-2 bg-white text-sm">
                              <span className="text-gray-600">{m.name}</span>
                              <span className="font-medium text-gray-800">
                                {typeof m.quantity === "number"
                                  ? m.quantity % 1 === 0
                                    ? m.quantity.toLocaleString("vi-VN")
                                    : m.quantity.toFixed(2)
                                  : m.quantity}{" "}
                                {m.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phiếu xuất kho bán thành phẩm */}
                    <div>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2">
                        Phiếu xuất kho bán thành phẩm
                      </p>
                      {isLoadingModalDetail ? (
                        <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                          Đang tải phiếu xuất kho...
                        </p>
                      ) : !issueFileUrl ? (
                        <p className="text-sm text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                          Chưa có phiếu xuất kho
                        </p>
                      ) : !hasIssueFileUrl ? (
                        <p className="text-sm text-gray-600 py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg">
                          {issueFileUrl}
                        </p>
                      ) : isPdf ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <iframe
                              src={issueFileUrl}
                              className="w-full h-[360px]"
                              title="Phiếu xuất kho"
                            />
                            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                              <a
                                href={issueFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <BsEye className="w-3 h-3" />
                                Mở toàn màn hình
                              </a>
                            </div>
                          </div>
                        ) : isImage ? (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={issueFileUrl}
                              alt="Phiếu xuất kho"
                              className="w-full object-contain max-h-[360px] bg-gray-50"
                            />
                            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex justify-end">
                              <a
                                href={issueFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <BsEye className="w-3 h-3" />
                                Mở toàn màn hình
                              </a>
                            </div>
                          </div>
                        ) : (
                          <a
                            href={issueFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline border border-blue-200 rounded-lg px-3 py-2 bg-blue-50"
                          >
                            <BsEye className="w-3.5 h-3.5" />
                            Xem phiếu xuất kho
                          </a>
                        )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {confirmModal.actionType === "importing"
                      ? "Xác nhận lệnh sản xuất đã được lấy từ bán thành phẩm"
                      : "Xác nhận bắt đầu sản xuất"}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => closeConfirmModal()}
                  disabled={isConfirmingAction}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmAction()}
                  disabled={isConfirmingAction || confirmModal.prodId == null}
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-white text-sm font-semibold hover:bg-yellow-600 transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <BsCheckCircleFill className="w-3.5 h-3.5" />
                  {isConfirmingAction ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <LoadingOverlay isLoading={isLoading} />
    </div>
  );
}