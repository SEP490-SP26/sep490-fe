"use client";
import { Order, useProduction } from "@/context/ProductionContext";
import { formatDate } from "@/utils/format";
import { showSuccessToast } from "@/utils/toastService";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import {
    BiCheckCircle,
    BiChevronDown,
    BiChevronUp,
    BiPackage,
    BiSearch,
    BiXCircle
} from "react-icons/bi";
import { BsCheckCircle, BsExclamationCircle } from "react-icons/bs";
import { FiMoreVertical } from "react-icons/fi";

export default function PendingOrderPage() {
  const {
    products,
    materials,
    orders,
    scheduleProduction,
  } = useProduction();

  const [checkingOrder, setCheckingOrder] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  // const router = useRouter();
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

  const pendingOrdersCount = orders.filter(
    (order) => order.status === "pending"
  );

  const filteredOrders = useMemo(() => {
    let result = [...pendingOrdersCount];

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
    pendingOrdersCount,
    searchTerm,
    statusFilter,
    customerFilter,
    productFilter,
    dateFilter,
    sortBy,
    sortOrder,
  ]);

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

  const handleSchedule = (orderId: string) => {    
      scheduleProduction(orderId);
      showSuccessToast("Đã lên lịch sản xuất!")
  };

  // const handleRowClick = (order: Order) => {
  //   // Chỉ chuyển trang nếu order có thể sản xuất
  //   if (order.can_fulfill === true) {
  //     router.push(`/manager/orders/${order.id}`);
  //   }
  //   // Nếu không đủ NVL, có thể hiển thị thông báo hoặc không làm gì
  // };

  return (
    <div className="min-h-screen bg-gray-50 ">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Danh Sách Đơn Hàng Đang Chờ Duyệt
        </h1>
        <p className="text-gray-600 mt-2">
          Tổng số: {pendingOrdersCount.length} đơn hàng
        </p>
      </div>
      <div className="max-w-8xl mx-auto">
        {/* Toolbar  */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Search Bar */}
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
                  <option value="all">Tất cả</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.type} 
                    </option>
                  ))}
                </select>
                <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div>

            {/* Date Range - Compact */}
            <div className="lg:w-60">
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                Ngày tạo
              </label>
              <div className="grid grid-cols-1 gap-2">
                <div className="relative">
                  <input
                    type="date"
                    value={dateFilter.from}
                    onChange={(e) =>
                      setDateFilter({ ...dateFilter, from: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Từ ngày"
                  />
                </div>
                {/* <div className="relative">
                  <input
                    type="date"
                    value={dateFilter.to}
                    onChange={(e) =>
                      setDateFilter({ ...dateFilter, to: e.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Đến ngày"
                  />
                </div> */}
              </div>
            </div>

            {/* Status Filter - Compact */}
            {/* <div className="lg:w-40">
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                Trạng thái
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm"
                >
                  <option value="all">Tất cả</option>
                  <option value="pending">Đủ NVL</option>
                  <option value="scheduled">Thiếu NVL</option>
                </select>
                <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              </div>
            </div> */}

            {/* Clear Filter Button */}
            <div className="lg:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider opacity-0">
                &nbsp;
              </label>
              <button
                onClick={() => {
                  setStatusFilter("all");
                  setCustomerFilter("all");
                  setProductFilter("all");
                  setDateFilter({ from: "", to: "" });
                  setSearchTerm("");
                }}
                className="w-full lg:w-auto px-4 py-2.5 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                Xóa lọc
              </button>
            </div>
          </div>

          {/* Active Filters Display (dưới cùng) */}
          {(statusFilter !== "all" ||
            productFilter !== "all" ||
            dateFilter.from ||
            dateFilter.to ||
            searchTerm) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-sm text-gray-600">Đang lọc theo:</span>
                {/* ... active filters chips (giữ nguyên) ... */}
              </div>
            </div>
          )}
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          {/* <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
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
          </div> */}

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
                {filteredOrders
                  .filter((order) => order.status == "pending")
                  .map((order) => {
                    const product = products.find(
                      (p) => p.id === order.product_id
                    );
                    const isMissingMaterials = order.can_fulfill === false;
                    const canNavigate = order.can_fulfill === true;

                    return (
                      <React.Fragment key={order.id}>
                        {/* Hàng chính */}
                        <tr
                          // onClick={() => handleRowClick(order)} // Thêm click handler
                          className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                            isMissingMaterials
                              ? "bg-red-100 hover:bg-red-200"
                              : canNavigate
                              ? "hover:bg-blue-50" // Highlight nếu có thể navigate
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
                              {product?.type}
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
                            onClick={(e) => e.stopPropagation()} // Ngăn click vào nút lan ra hàng
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Ngăn lan ra hàng
                                  toggleExpandOrder(order.id);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {expandedOrder === order.id ? (
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
                                        {product?.type}
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
                                        <div className="grid grid-cols-2 gap-2 pt-4">
                                          <button
                                            onClick={() => handleSchedule(order.id)}
                                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                                          >
                                            <BiCheckCircle className="w-4 h-4" />
                                            Duyện và lên lịch sản xuất
                                          </button>
                                          <button
                                            // onClick={() =>
                                            //   router.push(
                                            //     `/manager/orders/${order.id}`
                                            //   )
                                            // }
                                            className="w-full bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800 transition-colors flex items-center justify-center gap-2 text-sm"
                                          >
                                            <BiXCircle  className="w-4 h-4" />
                                            Từ chối đơn hàng
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
                                                  (mm) => {
                                                    const material =
                                                      materials.find(
                                                        (m) =>
                                                          m.id ===
                                                          mm.material_id
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
