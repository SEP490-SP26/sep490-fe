"use client";
import {
  Order,
  Printer,
  useProduction,
  Worker,
} from "@/context/ProductionContext";
import {
  getPrinterStatusColor,
  getPrinterStatusLabel,
} from "@/utils/printerHelpers";
import { showSuccessToast } from "@/utils/toastService";
import { useEffect, useMemo, useState } from "react";
import {
  BiCalendar,
  BiCheckCircle,
  BiChevronDown,
  BiChevronUp,
  BiCog,
  BiDownload,
  BiEdit,
  BiFilter,
  BiPackage,
  BiPlus,
  BiSearch,
  BiUser,
  BiXCircle,
} from "react-icons/bi";
import { BsCheckCircle, BsExclamationCircle } from "react-icons/bs";
import { FcAutomatic } from "react-icons/fc";
import { FiMoreVertical } from "react-icons/fi";

export default function OrderListPage() {
  const {
    printers,
    workers,
    products,
    materials,
    orders,
    createPurchaseRequest,
    getAvailablePrinters,
    assignPrinterToOrder,
    updateProductionSchedule,
    scheduleProduction,
    getPrinterById,
    removePrinterFromOrder,
    assignWorkerToOrder,
    productionSchedules,
    getMachineAssignmentByOrder,
    getWorkerById,
    updateMachineAssignment,
    getAvailableWorkers,
    assignMachineWithWorker,
  } = useProduction();

  const [checkingOrder, setCheckingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showPrinterSelection, setShowPrinterSelection] = useState(false);
  const [showWorkerSelection, setShowWorkerSelection] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(
    null
  );

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  // Sorting
  const [sortBy, setSortBy] = useState<keyof Order>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Get unique customers and products for filters
  const uniqueCustomers = useMemo(() => {
    const customers = orders.map((order) => order.customer_name);
    return [...new Set(customers)];
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.customer_name.toLowerCase().includes(term) ||
          order.id.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((order) => order.status === statusFilter);
    }

    // Customer filter
    if (customerFilter !== "all") {
      result = result.filter((order) => order.customer_name === customerFilter);
    }

    // Product filter
    if (productFilter !== "all") {
      result = result.filter((order) => order.product_id === productFilter);
    }

    // Date filter
    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from);
      result = result.filter((order) => new Date(order.created_at) >= fromDate);
    }
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((order) => new Date(order.created_at) <= toDate);
    }

    // Sorting
    result.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === "created_at" || sortBy === "delivery_date") {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (sortOrder === "asc") {
        return (aValue as number) > (bValue as number) ? 1 : -1;
      } else {
        return (aValue as number) < (bValue as number) ? 1 : -1;
      }
    });

    return result;
  }, [
    orders,
    searchTerm,
    statusFilter,
    customerFilter,
    productFilter,
    dateFilter,
    sortBy,
    sortOrder,
  ]);

  const findBestPrinterForOrder = (
    order: Order,
    availablePrinters: Printer[]
  ): Printer | null => {
    const product = products.find((p) => p.id === order.product_id);
    if (!product) return null;

    // Tính toán thời gian sản xuất ước tính
    const estimatedDays = Math.ceil(order.quantity / product.production_rate);

    // Điểm số cho từng printer
    let bestPrinter: Printer | null = null;
    let bestScore = -1;

    availablePrinters.forEach((printer) => {
      let score = 0;

      // 1. Ưu tiên capacity phù hợp (không quá dư, không quá thiếu)
      const dailyCapacityFit =
        printer.daily_capacity / (order.quantity / estimatedDays);
      if (dailyCapacityFit >= 0.8 && dailyCapacityFit <= 1.2) {
        score += 30; // Capacity vừa đủ
      } else if (dailyCapacityFit > 1.2) {
        score += 20; // Capacity dư
      } else {
        score += 10; // Capacity thiếu
      }

      // 2. Ưu tiên loại máy phù hợp với sản phẩm
      if (order.product_id === "p1" || order.product_id === "p2") {
        // Catalog, brochure -> ưu tiên offset/digital
        if (printer.type === "offset" || printer.type === "digital") {
          score += 20;
        }
      } else if (order.product_id === "p4") {
        // Hộp giấy -> ưu tiên flexo
        if (printer.type === "flexo") {
          score += 25;
        }
      } else if (order.product_id === "p3") {
        // Poster -> ưu tiên offset
        if (printer.type === "offset") {
          score += 25;
        }
      }

      // 3. Ưu tiên máy ít việc nhất
      const workloadScore = 30 - printer.assigned_orders.length * 5;
      score += Math.max(workloadScore, 0);

      // 4. Ưu tiên máy cùng location (nếu có logic location)
      // score += 5; // Thêm điểm nếu cùng location

      if (score > bestScore) {
        bestScore = score;
        bestPrinter = printer;
      }
    });

    return bestPrinter;
  };

  useEffect(() => {
    // Tự động phân công printer cho các đơn hàng pending và đủ NVL
    orders.forEach((order) => {
      if (
        order.status === "pending" &&
        order.can_fulfill === true &&
        !order.product_id.includes("sample")
      ) {
        // Tránh phân công cho sample data

        // Kiểm tra xem đã có schedule chưa
        const existingSchedule = productionSchedules.find(
          (s) => s.order_id === order.id
        );

        // Nếu chưa có printer được gán
        if (!existingSchedule?.assigned_printer) {
          // Tự động tìm printer phù hợp
          const availablePrinters = getAvailablePrinters();

          // Tìm printer theo logic ưu tiên
          const suitablePrinter = findBestPrinterForOrder(
            order,
            availablePrinters
          );

          if (suitablePrinter) {
            // Tự động gán printer
            setTimeout(() => {
              assignPrinterToOrder(suitablePrinter.id, order.id);

              // Tạo hoặc cập nhật schedule
              if (existingSchedule) {
                updateProductionSchedule(existingSchedule.id, {
                  assigned_printer: suitablePrinter.id,
                });
              }

              console.log(
                `Tự động phân công ${suitablePrinter.name} cho đơn ${order.id}`
              );
            }, 100); // Delay nhỏ để tránh render loop
          }
        }
      }
    });
  }, [orders, productionSchedules]);

  const handleCheckFulfillment = (orderId: string) => {
    setCheckingOrder(orderId);
    // const canFulfill = checkOrderFulfillment(orderId);

    setTimeout(() => {
      setCheckingOrder(null);
    }, 500);
  };

  const handleCreatePR = (orderId: string) => {
    createPurchaseRequest(orderId);
    showSuccessToast(`Đã tạo yêu cầu mua hàng cho nguyên vật liệu thiếu`);
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleSort = (column: keyof Order) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-blue-100 text-blue-800",
      in_production: "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ xử lý",
      scheduled: "Đã lên lịch",
      in_production: "Đang sản xuất",
      completed: "Hoàn thành",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleAutoAssignPrinter = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Tìm printer phù hợp nhất
    const availablePrinters = getAvailablePrinters();
    const suitablePrinter = availablePrinters.find(
      (printer) => printer.daily_capacity >= order.quantity / 3
    );

    if (suitablePrinter) {
      assignPrinterToOrder(suitablePrinter.id, orderId);

      // Cập nhật schedule nếu có
      const existingSchedule = productionSchedules.find(
        (s) => s.order_id === orderId
      );
      if (existingSchedule) {
        updateProductionSchedule(existingSchedule.id, {
          assigned_printer: suitablePrinter.id,
        });
      }

      showSuccessToast(`Đã phân công máy in: ${suitablePrinter.name}`);
    } else {
      setSelectedOrderId(orderId);
      setShowPrinterSelection(true);
    }
  };

  const handleSchedule = (orderId: string) => {
    const schedule = productionSchedules.find((s) => s.order_id === orderId);
    if (schedule?.assigned_printer) {
      scheduleProduction(orderId, schedule.assigned_printer);
      showSuccessToast("Đã lên lịch sản xuất!");
    }
  };

  const getWorkerStatusColor = (status: string) => {
    // Đổi từ Worker['status'] thành string
    const colors: Record<string, string> = {
      available: "bg-green-100 text-green-700",
      busy: "bg-yellow-100 text-yellow-700",
      break: "bg-blue-100 text-blue-700",
      off: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  // Sửa hàm getWorkerStatusLabel
  const getWorkerStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: "Sẵn sàng",
      busy: "Đang làm việc",
      break: "Nghỉ giải lao",
      off: "Nghỉ làm",
    };
    return labels[status] || status;
  };

  const getDepartmentLabel = (department: Worker["department"]) => {
    const labels: Record<Worker["department"], string> = {
      printing: "Tổ in",
      cutting: "Tổ cắt",
      finishing: "Tổ hoàn thiện",
      binding: "Tổ đóng gói",
      qc: "QC",
    };
    return labels[department] || department;
  };

// Auto assign worker for machine
const autoAssignWorkerForMachine = (
  machineId: string,
  orderId: string
): Worker | null => {
  const machine = getPrinterById(machineId);
  if (!machine) return null;

  // Tìm thợ phù hợp với máy này - FIX: cần getAvailableWorkers()
  const availableWorkers = workers?.filter((worker: Worker) => worker.status === "available") || [];

  let bestWorker: Worker | null = null;
  let bestScore = -1;

  availableWorkers.forEach((worker: Worker) => {
    let score = 0;

    // 1. Thợ đang vận hành máy này
    if (worker.current_machine === machineId) {
      score += 50;
    }

    // 2. Thợ cùng bộ phận với máy - FIX: worker.department là string
    const machineType = machine.type;
    const workerDepartment = worker.department as string; // Type assertion
    
    if (
      (machineType === "offset" || machineType === "digital") &&
      workerDepartment === "printing"
    ) {
      score += 30;
    } else if (machineType === "flexo" && workerDepartment === "printing") {
      score += 25;
    }

    // 3. Kinh nghiệm
    score += worker.experience_months / 12; // Mỗi năm +1 điểm

    // 4. Rating
    score += worker.rating * 10;

    // 5. Thợ ít việc
    const workloadScore = 20 - (worker.assigned_orders?.length || 0) * 2;
    score += Math.max(workloadScore, 0);

    if (score > bestScore) {
      bestScore = score;
      bestWorker = worker;
    }
  });

  if (bestWorker) {
    assignWorkerToOrder(bestWorker.id, orderId);
    return bestWorker;
  }

  return null;
};

  // Combined auto assignment
  const autoAssignMachineAndWorker = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order || order.can_fulfill !== true) return;

    // 1. Tự động chọn máy
    const availablePrinters = getAvailablePrinters();
    let bestPrinter: Printer | null = null;
    let bestPrinterScore = -1;

    availablePrinters.forEach((printer) => {
      let score = 0;
      // ... logic chọn máy (như cũ)

      if (score > bestPrinterScore) {
        bestPrinterScore = score;
        bestPrinter = printer;
      }
    });

    if (bestPrinter) {
      // 2. Tự động chọn thợ cho máy này
      const bestWorker = autoAssignWorkerForMachine(bestPrinter.id, orderId);

      // 3. Thực hiện phân công
      assignMachineWithWorker(orderId, bestPrinter.id, bestWorker?.id);

      showSuccessToast(
        `Đã phân công: ${bestPrinter.name}` +
          (bestWorker ? ` - Thợ: ${bestWorker.name}` : "")
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Danh Sách Đơn Hàng</h1>
        <p className="text-gray-600 mt-2">
          Tổng số: {orders.length} đơn hàng • Đang hiển thị:{" "}
          {filteredOrders.length} đơn
        </p>
      </div>
      <div className="max-w-8xl mx-auto">
        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-6">
            {/* First Row: Search and Main Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo khách hàng, mã đơn, sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium">
                  <BiPlus className="w-4 h-4" />
                  Tạo đơn mới
                </button>
              </div>
            </div>

            {/* Second Row: Main Filters */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <BiFilter className="w-4 h-4" />
                  Bộ lọc
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setCustomerFilter("all");
                      setProductFilter("all");
                      setDateFilter({ from: "", to: "" });
                    }}
                    className="text-sm text-red-600 hover:text-gray-900"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Trạng thái
                  </label>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="pending">Chờ xử lý</option>
                      <option value="scheduled">Đã lên lịch</option>
                      <option value="in_production">Đang sản xuất</option>
                      <option value="completed">Hoàn thành</option>
                    </select>
                    <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {/* Product Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Sản phẩm
                  </label>
                  <div className="relative">
                    <select
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm"
                    >
                      <option value="all">Tất cả sản phẩm</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Khoảng thời gian
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <BiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFilter.from}
                        onChange={(e) =>
                          setDateFilter({ ...dateFilter, from: e.target.value })
                        }
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="relative">
                      <BiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFilter.to}
                        onChange={(e) =>
                          setDateFilter({ ...dateFilter, to: e.target.value })
                        }
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {(statusFilter !== "all" ||
                customerFilter !== "all" ||
                productFilter !== "all" ||
                dateFilter.from ||
                dateFilter.to) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm text-gray-600">
                      Đang lọc theo:
                    </span>
                    {statusFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Trạng thái: {getStatusLabel(statusFilter)}
                        <button
                          onClick={() => setStatusFilter("all")}
                          className="hover:text-blue-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {customerFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        KH: {customerFilter}
                        <button
                          onClick={() => setCustomerFilter("all")}
                          className="hover:text-green-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {productFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        SP: {products.find((p) => p.id === productFilter)?.name}
                        <button
                          onClick={() => setProductFilter("all")}
                          className="hover:text-purple-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {dateFilter.from && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        Từ: {formatDate(dateFilter.from)}
                        <button
                          onClick={() =>
                            setDateFilter({ ...dateFilter, from: "" })
                          }
                          className="hover:text-orange-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {dateFilter.to && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        Đến: {formatDate(dateFilter.to)}
                        <button
                          onClick={() =>
                            setDateFilter({ ...dateFilter, to: "" })
                          }
                          className="hover:text-orange-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold text-gray-900">Đơn hàng</h2>
                <span className="text-sm text-gray-500">
                  {filteredOrders.length} kết quả
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button className="px-4 py-2 text-gray-700 hover:text-gray-900 flex items-center gap-2">
                  <BiDownload className="w-4 h-4" />
                  Xuất Excel
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Ngày tạo
                      {sortBy === "created_at" &&
                        (sortOrder === "asc" ? (
                          <BiChevronUp className="w-4 h-4" />
                        ) : (
                          <BiChevronDown className="w-4 h-4" />
                        ))}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã đơn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("customer_name")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Khách hàng
                      {sortBy === "customer_name" &&
                        (sortOrder === "asc" ? (
                          <BiChevronUp className="w-4 h-4" />
                        ) : (
                          <BiChevronDown className="w-4 h-4" />
                        ))}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sản phẩm
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("quantity")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Số lượng
                      {sortBy === "quantity" &&
                        (sortOrder === "asc" ? (
                          <BiChevronUp className="w-4 h-4" />
                        ) : (
                          <BiChevronDown className="w-4 h-4" />
                        ))}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("delivery_date")}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Ngày giao
                      {sortBy === "delivery_date" &&
                        (sortOrder === "asc" ? (
                          <BiChevronUp className="w-4 h-4" />
                        ) : (
                          <BiChevronDown className="w-4 h-4" />
                        ))}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const product = products.find(
                    (p) => p.id === order.product_id
                  );
                  const isMissingMaterials = order.can_fulfill === false;
                  const isWarning =
                    order.can_fulfill === undefined &&
                    order.status === "pending";

                  return (
                    <>
                      <tr
                        key={order.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          isMissingMaterials
                            ? "bg-red-50 hover:bg-red-100"
                            : isWarning
                            ? "bg-yellow-50 hover:bg-yellow-100"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900  ">
                          <span className="flex justify-center font-medium">
                            {order.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">
                              {formatDate(order.delivery_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleExpandOrder(order.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {expandedOrder === order.id ? (
                                <BiChevronUp className="w-5 h-5" />
                              ) : (
                                <BiChevronDown className="w-5 h-5" />
                              )}
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              {isMissingMaterials ? (
                                <div className="flex items-center gap-1 text-red-600">
                                  <BsExclamationCircle className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-green-600">
                                  <BsCheckCircle className="w-5 h-5" />
                                </div>
                              )}
                            </button>
                            <button className="text-gray-600 hover:text-gray-900">
                              <FiMoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {expandedOrder === order.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Order Details */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">
                                  Chi tiết đơn hàng
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Ngày tạo:
                                    </span>
                                    <span className="text-gray-900">
                                      {formatDate(order.created_at)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Ngày giao:
                                    </span>
                                    <span className="text-gray-900">
                                      {formatDate(order.delivery_date)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Sản phẩm:
                                    </span>
                                    <span className="text-gray-900">
                                      {product?.name}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Số lượng:
                                    </span>
                                    <span className="text-gray-900">
                                      {order.quantity}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">
                                  Thao tác
                                </h4>
                                <div className="space-y-2">
                                  {order.can_fulfill === true && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                      <BiCheckCircle className="w-5 h-5 text-green-600" />
                                      <span className="text-green-700 text-sm">
                                        ĐỦ NGUYÊN VẬT LIỆU
                                      </span>
                                      {/* Thêm thông báo tự động phân công */}
                                      {(() => {
                                        const schedule =
                                          productionSchedules.find(
                                            (s) => s.order_id === order.id
                                          );
                                        if (schedule?.assigned_printer) {
                                          const printer = getPrinterById(
                                            schedule.assigned_printer
                                          );
                                          return (
                                            <span className="text-green-600 text-xs ml-2">
                                              • Đã tự động phân công:{" "}
                                              {printer?.name}
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  )}

                                  {order.can_fulfill === false &&
                                    order.missing_materials && (
                                      <div className="space-y-3">
                                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                          <BiXCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                          <div className="flex-1">
                                            <div className="text-red-700 text-sm mb-2">
                                              Thiếu nguyên vật liệu:
                                            </div>
                                            <div className="space-y-1">
                                              {order.missing_materials.map(
                                                (mm) => {
                                                  const material =
                                                    materials.find(
                                                      (m) =>
                                                        m.id === mm.material_id
                                                    );

                                                  return (
                                                    <div
                                                      key={mm.material_id}
                                                      className="text-red-600 text-xs"
                                                    >
                                                      • {material?.name}: Cần{" "}
                                                      {mm.needed}{" "}
                                                      {material?.unit}, Có{" "}
                                                      {mm.available}{" "}
                                                      {material?.unit}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* <button
                                          onClick={() =>
                                            handleCreatePR(order.id)
                                          }
                                          className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                          <FiAlertTriangle className="w-4 h-4" />
                                          Tạo yêu cầu mua hàng
                                        </button> */}
                                      </div>
                                    )}

                                  {/*  PHÂN CÔNG SẢN XUẤT */}
                                  {order.status === "pending" &&
                                    order.can_fulfill === true && (
                                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="font-medium text-blue-700">
                                            PHÂN CÔNG SẢN XUẤT
                                          </h5>

                                          {(() => {
                                            const assignment =
                                              getMachineAssignmentByOrder(
                                                order.id
                                              );
                                            if (assignment) {
                                              return (
                                                <button
                                                  onClick={() => {
                                                    setSelectedOrderId(
                                                      order.id
                                                    );
                                                    setSelectedMachineId(
                                                      assignment.machine_id
                                                    );
                                                    setShowWorkerSelection(
                                                      true
                                                    );
                                                  }}
                                                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                                >
                                                  <BiEdit className="w-3 h-3" />
                                                  {assignment.worker_id
                                                    ? "Đổi thợ"
                                                    : "Thêm thợ"}
                                                </button>
                                              );
                                            }
                                            return null;
                                          })()}
                                        </div>

                                        {/* Hiển thị thông tin đã phân công */}
                                        {(() => {
                                          const assignment =
                                            getMachineAssignmentByOrder(
                                              order.id
                                            );

                                          if (assignment) {
                                            const machine = getPrinterById(
                                              assignment.machine_id
                                            );
                                            const worker = assignment.worker_id
                                              ? getWorkerById(
                                                  assignment.worker_id
                                                )
                                              : null;

                                            return (
                                              <div className="mb-4 space-y-3">
                                                {/* Máy được phân công */}
                                                <div className="p-3 bg-white rounded-lg border">
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <div className="font-medium text-gray-900 flex items-center gap-2">
                                                        <BiCog className="w-4 h-4" />
                                                        {machine?.name}
                                                      </div>
                                                      <div className="text-sm text-gray-500 mt-1">
                                                        <span
                                                          className={`px-2 py-0.5 rounded text-xs ${getPrinterStatusColor(
                                                            machine?.status ||
                                                              "offline"
                                                          )}`}
                                                        >
                                                          {getPrinterStatusLabel(
                                                            machine?.status ||
                                                              "offline"
                                                          )}
                                                        </span>
                                                        <span className="mx-2">
                                                          •
                                                        </span>
                                                        <span>
                                                          {
                                                            machine?.max_print_size
                                                          }
                                                        </span>
                                                        <span className="mx-2">
                                                          •
                                                        </span>
                                                        <span>
                                                          {
                                                            machine?.daily_capacity
                                                          }{" "}
                                                          tờ/ngày
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <button
                                                      onClick={() => {
                                                        setSelectedOrderId(
                                                          order.id
                                                        );
                                                        setShowPrinterSelection(
                                                          true
                                                        );
                                                      }}
                                                      className="text-xs text-blue-600 hover:text-blue-800"
                                                    >
                                                      Đổi máy
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Thợ được phân công */}
                                                {worker ? (
                                                  <div className="p-3 bg-white rounded-lg border">
                                                    <div className="flex items-center justify-between">
                                                      <div>
                                                        <div className="font-medium text-gray-900 flex items-center gap-2">
                                                          <BiUser className="w-4 h-4" />
                                                          {worker.name} (
                                                          {worker.employee_id})
                                                        </div>
                                                        <div className="text-sm text-gray-500 mt-1">
                                                          <span
                                                            className={`px-2 py-0.5 rounded text-xs ${getWorkerStatusColor(
                                                              worker.status
                                                            )}`}
                                                          >
                                                            {getWorkerStatusLabel(
                                                              worker.status
                                                            )}
                                                          </span>
                                                          <span className="mx-2">
                                                            •
                                                          </span>
                                                          <span>
                                                            {getDepartmentLabel(
                                                              worker.department
                                                            )}
                                                          </span>
                                                          <span className="mx-2">
                                                            •
                                                          </span>
                                                          <span>
                                                            {
                                                              worker.experience_months
                                                            }{" "}
                                                            tháng KN
                                                          </span>
                                                        </div>
                                                      </div>
                                                      <button
                                                        onClick={() => {
                                                          setSelectedOrderId(
                                                            order.id
                                                          );
                                                          setSelectedMachineId(
                                                            assignment.machine_id
                                                          );
                                                          setShowWorkerSelection(
                                                            true
                                                          );
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                      >
                                                        Đổi thợ
                                                      </button>
                                                    </div>

                                                    {/* Kỹ năng */}
                                                    {worker.skills.length >
                                                      0 && (
                                                      <div className="mt-2">
                                                        <div className="text-xs text-gray-500">
                                                          Kỹ năng:
                                                        </div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                          {worker.skills
                                                            .slice(0, 3)
                                                            .map((skill) => (
                                                              <span
                                                                key={skill}
                                                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                                                              >
                                                                {skill}
                                                              </span>
                                                            ))}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                    <div className="flex items-center justify-between">
                                                      <div className="text-sm text-yellow-700">
                                                        ⚠️ Chưa phân công thợ
                                                        vận hành
                                                      </div>
                                                      <button
                                                        onClick={() => {
                                                          setSelectedOrderId(
                                                            order.id
                                                          );
                                                          setSelectedMachineId(
                                                            assignment.machine_id
                                                          );
                                                          setShowWorkerSelection(
                                                            true
                                                          );
                                                        }}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                      >
                                                        + Thêm thợ
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          } else {
                                            return (
                                              <div className="text-center py-3 text-gray-500 text-sm mb-3">
                                                Chưa phân công sản xuất
                                              </div>
                                            );
                                          }
                                        })()}

                                        {/* Nút hành động */}
                                        <div className="space-y-2">
                                          {(() => {
                                            const assignment =
                                              getMachineAssignmentByOrder(
                                                order.id
                                              );

                                            if (!assignment) {
                                              return (
                                                <>
                                                  <button
                                                    onClick={() =>
                                                      autoAssignMachineAndWorker(
                                                        order.id
                                                      )
                                                    }
                                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                                  >
                                                    <FcAutomatic className="w-4 h-4" />
                                                    Phân công tự động (máy +
                                                    thợ)
                                                  </button>

                                                  <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                      onClick={() => {
                                                        setSelectedOrderId(
                                                          order.id
                                                        );
                                                        setShowPrinterSelection(
                                                          true
                                                        );
                                                      }}
                                                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                      <BiCog className="w-4 h-4" />
                                                      Chỉ chọn máy
                                                    </button>

                                                    <button
                                                      onClick={() => {
                                                        // Phân công máy tự động, rồi chọn thợ
                                                        handleAutoAssignPrinter(
                                                          order.id
                                                        );
                                                        const newAssignment =
                                                          getMachineAssignmentByOrder(
                                                            order.id
                                                          );
                                                        if (newAssignment) {
                                                          setSelectedOrderId(
                                                            order.id
                                                          );
                                                          setSelectedMachineId(
                                                            newAssignment.machine_id
                                                          );
                                                          setShowWorkerSelection(
                                                            true
                                                          );
                                                        }
                                                      }}
                                                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                      <BiUser className="w-4 h-4" />
                                                      Máy tự động + chọn thợ
                                                    </button>
                                                  </div>
                                                </>
                                              );
                                            } else {
                                              return (
                                                <>
                                                  <button
                                                    onClick={() =>
                                                      handleSchedule(order.id)
                                                    }
                                                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                                  >
                                                    <BiCalendar className="w-4 h-4" />
                                                    LÊN LỊCH SẢN XUẤT
                                                  </button>

                                                  <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                      onClick={() => {
                                                        setSelectedOrderId(
                                                          order.id
                                                        );
                                                        setShowPrinterSelection(
                                                          true
                                                        );
                                                      }}
                                                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                      <BiCog className="w-4 h-4" />
                                                      ĐỔI MÁY
                                                    </button>

                                                    <button
                                                      onClick={() => {
                                                        setSelectedOrderId(
                                                          order.id
                                                        );
                                                        setSelectedMachineId(
                                                          assignment.machine_id
                                                        );
                                                        setShowWorkerSelection(
                                                          true
                                                        );
                                                      }}
                                                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                                    >
                                                      <BiUser className="w-4 h-4" />
                                                      {assignment.worker_id
                                                        ? "ĐỔI THỢ"
                                                        : "THÊM THỢ"}
                                                    </button>
                                                  </div>
                                                </>
                                              );
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                  {/* Popup chọn Worker cho máy */}
                                  {showWorkerSelection &&
                                    selectedOrderId &&
                                    selectedMachineId && (
                                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                                          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                                            <div>
                                              <h3 className="font-semibold text-gray-900">
                                                Chọn thợ vận hành
                                              </h3>
                                              <p className="text-sm text-gray-500 mt-1">
                                                Máy:{" "}
                                                {
                                                  getPrinterById(
                                                    selectedMachineId
                                                  )?.name
                                                }
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => {
                                                setShowWorkerSelection(false);
                                                setSelectedOrderId(null);
                                                setSelectedMachineId(null);
                                              }}
                                              className="text-gray-400 hover:text-gray-600"
                                            >
                                              ✕
                                            </button>
                                          </div>

                                          <div className="p-4 overflow-y-auto max-h-[60vh]">
                                            {/* Các thợ phù hợp với máy */}
                                            <div className="mb-4">
                                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                Thợ phù hợp với máy này
                                              </h4>
                                              <div className="space-y-3">
                                                {(() => {
                                                  const machine =
                                                    getPrinterById(
                                                      selectedMachineId
                                                    );
                                                  const suitableWorkers =
                                                    workers.filter((worker) => {
                                                      // Thợ cùng bộ phận với máy
                                                      if (
                                                        machine?.type ===
                                                          "offset" ||
                                                        machine?.type ===
                                                          "digital"
                                                      ) {
                                                        return (
                                                          worker.department ===
                                                          "printing"
                                                        );
                                                      } else if (
                                                        machine?.type ===
                                                        "flexo"
                                                      ) {
                                                        return (
                                                          worker.department ===
                                                          "printing"
                                                        );
                                                      }
                                                      return true;
                                                    });

                                                  return suitableWorkers.map(
                                                    (worker: any) => {
                                                      const isAssigned =
                                                        worker.assigned_orders.includes(
                                                          selectedOrderId
                                                        );
                                                      const isAvailable =
                                                        worker.status ===
                                                        "available";
                                                      const isCurrentOperator =
                                                        worker.current_machine ===
                                                        selectedMachineId;

                                                      return (
                                                        <div
                                                          key={worker.id}
                                                          className={`p-4 border rounded-lg ${
                                                            isAssigned
                                                              ? "border-green-500 bg-green-50"
                                                              : isCurrentOperator
                                                              ? "border-blue-500 bg-blue-50"
                                                              : isAvailable
                                                              ? "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                                              : "border-gray-200 bg-gray-100 opacity-70"
                                                          }`}
                                                        >
                                                          <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                              <div className="flex items-center gap-3 mb-2">
                                                                <div>
                                                                  <div className="font-semibold text-gray-900">
                                                                    {
                                                                      worker.name
                                                                    }{" "}
                                                                    (
                                                                    {
                                                                      worker.employee_id
                                                                    }
                                                                    )
                                                                  </div>
                                                                  <div className="text-sm text-gray-500">
                                                                    {getDepartmentLabel(
                                                                      worker.department
                                                                    )}{" "}
                                                                    •{" "}
                                                                    {
                                                                      worker.position
                                                                    }
                                                                  </div>
                                                                </div>
                                                                <div
                                                                  className={`px-2 py-1 rounded text-xs font-medium ${getWorkerStatusColor(
                                                                    worker.status
                                                                  )}`}
                                                                >
                                                                  {getWorkerStatusLabel(
                                                                    worker.status
                                                                  )}
                                                                </div>
                                                                {isCurrentOperator && (
                                                                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                                    Đang vận
                                                                    hành máy này
                                                                  </div>
                                                                )}
                                                              </div>

                                                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                                                <div>
                                                                  <div className="font-medium">
                                                                    Kinh nghiệm
                                                                  </div>
                                                                  <div>
                                                                    {
                                                                      worker.experience_months
                                                                    }{" "}
                                                                    tháng
                                                                  </div>
                                                                </div>
                                                                <div>
                                                                  <div className="font-medium">
                                                                    Đánh giá
                                                                  </div>
                                                                  <div className="flex items-center">
                                                                    <span className="text-yellow-500">
                                                                      ⭐
                                                                    </span>
                                                                    <span className="ml-1">
                                                                      {
                                                                        worker.rating
                                                                      }
                                                                      /5
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                                <div>
                                                                  <div className="font-medium">
                                                                    Kỹ năng
                                                                  </div>
                                                                  <div className="flex flex-wrap gap-1 mt-1">
                                                                    {worker.skills
                                                                      .slice(
                                                                        0,
                                                                        2
                                                                      )
                                                                      .map(
                                                                        (
                                                                          skill
                                                                        ) => (
                                                                          <span
                                                                            key={
                                                                              skill
                                                                            }
                                                                            className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
                                                                          >
                                                                            {
                                                                              skill
                                                                            }
                                                                          </span>
                                                                        )
                                                                      )}
                                                                  </div>
                                                                </div>
                                                                <div>
                                                                  <div className="font-medium">
                                                                    Ca làm
                                                                  </div>
                                                                  <div>
                                                                    {worker.shift ===
                                                                    "morning"
                                                                      ? "Sáng"
                                                                      : worker.shift ===
                                                                        "afternoon"
                                                                      ? "Chiều"
                                                                      : "Tối"}
                                                                  </div>
                                                                </div>
                                                              </div>

                                                              {worker.current_machine && (
                                                                <div className="mt-2 text-xs text-gray-500">
                                                                  Máy hiện tại:{" "}
                                                                  {
                                                                    getPrinterById(
                                                                      worker.current_machine
                                                                    )?.name
                                                                  }
                                                                </div>
                                                              )}
                                                            </div>

                                                            <div className="ml-4">
                                                              <button
                                                                onClick={() => {
                                                                  // Phân công thợ cho đơn hàng và máy
                                                                  assignWorkerToOrder(
                                                                    worker.id,
                                                                    selectedOrderId
                                                                  );

                                                                  // Cập nhật current_machine
                                                                  setWorkers(
                                                                    (prev) =>
                                                                      prev.map(
                                                                        (w) =>
                                                                          w.id ===
                                                                          worker.id
                                                                            ? {
                                                                                ...w,
                                                                                current_machine:
                                                                                  selectedMachineId,
                                                                              }
                                                                            : w
                                                                      )
                                                                  );

                                                                  // Cập nhật assignment
                                                                  const assignment =
                                                                    getMachineAssignmentByOrder(
                                                                      selectedOrderId
                                                                    );
                                                                  if (
                                                                    assignment
                                                                  ) {
                                                                    updateMachineAssignment(
                                                                      assignment.id,
                                                                      {
                                                                        worker_id:
                                                                          worker.id,
                                                                        assignment_type:
                                                                          "machine_with_worker",
                                                                      }
                                                                    );
                                                                  }

                                                                  setShowWorkerSelection(
                                                                    false
                                                                  );
                                                                  setSelectedOrderId(
                                                                    null
                                                                  );
                                                                  setSelectedMachineId(
                                                                    null
                                                                  );
                                                                }}
                                                                disabled={
                                                                  !isAvailable &&
                                                                  !isAssigned
                                                                }
                                                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                                                  isAssigned
                                                                    ? "bg-green-600 text-white"
                                                                    : isAvailable ||
                                                                      isCurrentOperator
                                                                    ? "bg-gray-800 text-white hover:bg-gray-900"
                                                                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                                }`}
                                                              >
                                                                {isAssigned
                                                                  ? "Đã chọn"
                                                                  : "Chọn"}
                                                              </button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      );
                                                    }
                                                  );
                                                })()}
                                              </div>
                                            </div>

                                            {/* Tất cả thợ khác */}
                                            <div>
                                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                Tất cả thợ khác
                                              </h4>
                                              <div className="space-y-3">
                                                {workers.map((worker) => {
                                                  const isAssigned =
                                                    worker.assigned_orders.includes(
                                                      selectedOrderId
                                                    );
                                                  const isAvailable =
                                                    worker.status ===
                                                    "available";

                                                  return (
                                                    <div
                                                      key={worker.id}
                                                      className={`p-4 border rounded-lg ${
                                                        isAssigned
                                                          ? "border-green-500 bg-green-50"
                                                          : isAvailable
                                                          ? "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                                          : "border-gray-200 bg-gray-100 opacity-70"
                                                      }`}
                                                    >
                                                      {/* ... tương tự như trên ... */}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredOrders.length === 0 && (
            <div className="py-16 text-center">
              <BiPackage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Không tìm thấy đơn hàng
              </h3>
              <p className="text-gray-500">
                Thử thay đổi bộ lọc hoặc tìm kiếm để xem kết quả
              </p>
            </div>
          )}

          {/* Pagination (simplified) */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Hiển thị <span className="font-medium">1</span> đến{" "}
                  <span className="font-medium">{filteredOrders.length}</span>{" "}
                  của{" "}
                  <span className="font-medium">{filteredOrders.length}</span>{" "}
                  kết quả
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                    Trước
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                    1
                  </button>
                  <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
