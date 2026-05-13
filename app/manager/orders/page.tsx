"use client";
import { orderApi } from "@/apiRequests/order";
import { Order } from "@/context/ProductionContext";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Pagination } from "antd";
import {
  BiCalendar,
  BiCheckCircle,
  BiChevronDown,
  BiChevronRight,
  BiChevronUp,
  BiFilter,
  BiPackage,
  BiSearch,
  BiXCircle,
} from "react-icons/bi";
import { BsCheckCircle, BsExclamationCircle } from "react-icons/bs";
import { FiMoreVertical } from "react-icons/fi";
import Loading from "../loading";

export default function OrderListPage() {
  const router = useRouter();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<keyof Order>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Fetch orders từ API
  const {
    isPending,
    error,
    data: apiData,
  } = useQuery({
    queryKey: ["orders", "list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 100);
        console.log("API Response:", response);
        console.log("Response data:", response.data);

        return {
          orders: response.data || [],
          products: [],
          materials: [],
        };
      } catch (error) {
        console.error("Error fetching orders:", error);
        return { orders: [], products: [], materials: [] };
      }
    },
  });

  const orders = useMemo(() => {
    if (!apiData?.orders) return [];

    return apiData.orders.map((order: any) => ({
      order_id: order.order_id || order._id || order.order_id,
      code: order.code || order.order_number,
      customer_name: order.customer_name || order.customer?.name || "Khách lẻ ",
      product_name: order.product_name || order.product?.name,
      product_id: order.product_id || order.product?.order_id,
      quantity: order.quantity || order.order_quantity || 0,
      created_at: order.created_at || order.created_date || order.date,
      delivery_date: order.delivery_date || order.expected_delivery,
      status: order.status || "pending",
      can_fulfill: order.can_fulfill,
      missing_materials: order.missing_materials || [],
    })) as Order[];
  }, [apiData]);

  // Lấy danh sách products từ API hoặc từ orders
  const products = useMemo(() => {
    if (apiData?.products) return apiData.products;
    const productMap = new Map();
    orders.forEach((order) => {
      if (order.product_id && order.product_name) {
        if (!productMap.has(order.product_id)) {
          productMap.set(order.product_id, {
            order_id: order.product_id,
            name: order.product_name,
            type: order.product_name,
          });
        }
      }
    });
    return Array.from(productMap.values());
  }, [apiData, orders]);

  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.customer_name.toLowerCase().includes(term) ||
          order.order_id.toLowerCase().includes(term) ||
          (order.code && order.code.toLowerCase().includes(term))
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
      result = result.filter(
        (order) =>
          order.product_id === productFilter ||
          order.product_name
            ?.toLowerCase()
            .includes(productFilter.toLowerCase())
      );
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

  // Reset trang về 1 khi có thay đổi bộ lọc
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, customerFilter, productFilter, dateFilter, sortBy, sortOrder]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

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
      cancelled: "bg-red-100 text-red-800",
      delivered: "bg-teal-100 text-teal-800",
      Scheduled: "bg-blue-100 text-blue-800",
      InProcessing: "bg-purple-100 text-purple-800",
      Finished: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
      Delivered: "bg-teal-100 text-teal-800",
      LayoutPending: "bg-amber-100 text-amber-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Scheduled: "Đã lên lịch",
      InProcessing: "Đang sản xuất",
      Finished: "Hoàn thành",
      Cancelled: "Đã hủy",
      Delivered: "Đã giao",
      LayoutPending: "Chờ duyệt layout",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleRowClick = (order: Order) => {
    router.push(`/manager/orders/${order.order_id}`);
  };

  if (isPending) {
    return <Loading text="Đang tải danh sách đơn hàng..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Có lỗi xảy ra
          </h3>
          <p className="text-gray-500">Không thể tải danh sách đơn hàng</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Danh Sách Đơn Hàng</h1>
        {/* <p className="text-gray-600 mt-2">
          Tổng số: {orders.length} đơn hàng • Đang hiển thị:{" "}
          {filteredOrders.length} đơn
        </p> */}
      </div>
      <div className="max-w-8xl mx-auto">
        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-6">
            {/* Second Row: Main Filters */}
            <div className=" border-gray-200 ">
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

              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                {/* Search bar */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Tìm kiếm
                  </label>
                  <div className="relative">
                    <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Khách hàng, mã đơn, sản phẩm..."
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
                {/* Status Filter */}
                <div className="lg:w-48">
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
                      {/* <option value="Pending">Chờ xử lý</option> */}
                      <option value="LayoutPending">Chờ duyệt layout</option>
                      <option value="Scheduled">Đã lên lịch</option>
                      <option value="InProcessing">Đang sản xuất</option>
                      <option value="Finished">Hoàn thành</option>
                      <option value="Delivered">Đã giao</option>
                      {/* <option value="Cancelled">Đã hủy</option> */}
                    </select>
                    <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {/* Product Filter */}
                <div className="lg:w-48">
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
                      {products.map((product: any) => (
                        <option key={product.order_id} value={product.order_id}>
                          {product.name || product.type}
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
                          SP:{" "}
                          {products.find((p: any) => p.order_id === productFilter)
                            ?.name || productFilter}
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
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center hover:text-gray-700"
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
                {paginatedOrders.map((order) => {
                  const product = products.find(
                    (p: any) => p.order_id === order.product_id
                  );
                  const isMissingMaterials = order.can_fulfill === false;
                  const canNavigate =
                    order.can_fulfill === true || order.status !== "pending";

                  return (
                    <React.Fragment key={order.order_id}>
                      {/* Hàng chính */}
                      <tr
                        onClick={() => handleRowClick(order)}
                        className={`hover:bg-gray-50 transition-colors cursor-pointer ${isMissingMaterials
                          ? "bg-red-100 hover:bg-red-200"
                          : canNavigate
                            ? "hover:bg-blue-50"
                            : ""
                          }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.code}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.product_name || product?.name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                        <td
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandOrder(order.order_id);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {expandedOrder === order.order_id ? (
                                <BiChevronUp className="w-5 h-5" />
                              ) : (
                                <BiChevronDown className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-600 hover:text-gray-900"
                            >
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
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              <FiMoreVertical className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {expandedOrder === order.order_id && (
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
                                      Mã đơn:
                                    </span>
                                    <span className="text-gray-900">
                                      {order.code || order.order_id}
                                    </span>
                                  </div>
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
                                      {order.product_name}
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
                                  {order.status === "pending" &&
                                    order.can_fulfill === undefined && (
                                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <BiCheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-green-700 text-sm">
                                          Có thể sản xuất
                                        </span>
                                      </div>
                                    )}

                                  {order.can_fulfill === true && (
                                    <div>
                                      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <BiCheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-green-700 text-sm">
                                          ĐỦ NGUYÊN VẬT LIỆU
                                        </span>
                                      </div>
                                      <div className="pt-4 border-t border-gray-200">
                                        <button
                                          onClick={() =>
                                            router.push(
                                              `/manager/orders/${order.order_id}`
                                            )
                                          }
                                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                        >
                                          <BiChevronRight className="w-4 h-4" />
                                          Xem thông tin chi tiết
                                        </button>
                                      </div>
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
                                                (mm) => (
                                                  <div
                                                    key={mm.material_id}
                                                    className="text-red-600 text-xs"
                                                  >
                                                    •{" "}
                                                    {mm.material_name ||
                                                      `Material ${mm.material_id}`}
                                                    : Cần {mm.needed}, Có{" "}
                                                    {mm.available}
                                                  </div>
                                                )
                                              )}
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
                    </React.Fragment>
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
                {orders.length === 0
                  ? "Chưa có đơn hàng nào"
                  : "Thử thay đổi bộ lọc hoặc tìm kiếm để xem kết quả"}
              </p>
            </div>
          )}

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <Pagination
                current={currentPage}
                pageSize={pageSize}
                total={filteredOrders.length}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size || 10);
                }}
                showSizeChanger
                pageSizeOptions={['10', '20', '50']}
                showTotal={(total) => `Tổng ${total} đơn hàng`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
