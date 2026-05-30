"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  FiUsers, FiPackage, FiLayers, FiList, FiFileText,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";

/* =======================
   TYPES
======================= */
type User = {
  user_id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role_id: number;
  is_active: boolean;
};

type RequestItem = {
  order_request_id: number;
  customer_name: string;
  product_name: string;
  quantity: number;
  process_status: string;
  order_request_date: string;
  order_id: number | null;
};

type Order = {
  order_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  status: string;
  created_at: string;
};

type Material = {
  material_id: number;
  code: string;
  name: string;
  stock_qty: number;
  unit: string;
  cost_price: number;
  type: string;
  min_stock: number;
};

type SubProduct = {
  id: number;
  name: string;
  quantity: number;
};

/* =======================
   CONSTANTS
======================= */
const PAGE_SIZE = 7;

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  Scheduled:     { label: "Đã lên lịch",           color: "bg-indigo-100 text-indigo-800" },
  InProcessing:  { label: "Đang sản xuất",         color: "bg-violet-100 text-violet-800" },
  LayoutPending: { label: "Chờ duyệt layout",      color: "bg-amber-100 text-amber-800" },
  Finished:      { label: "Hoàn thành sản xuất",   color: "bg-emerald-100 text-emerald-800" },
  Completed:     { label: "Hoàn thành",            color: "bg-teal-100 text-teal-800" },
  Cancelled:     { label: "Đã hủy",                color: "bg-rose-100 text-rose-800" },
  Importing:     { label: "Đang nhập kho",         color: "bg-orange-100 text-orange-800" },
  Delivery:      { label: "Đang giao hàng",        color: "bg-sky-100 text-sky-800" },
  Accepted:      { label: "Đã đặt cọc",            color: "bg-cyan-100 text-cyan-800" },
  Paid:          { label: "Đã thanh toán đủ",      color: "bg-lime-100 text-lime-800" },
};

const REQUEST_STATUS_MAP: Record<string, { label: string; color: string }> = {
  Pending:    { label: "Chờ xử lý",             color: "bg-slate-100 text-slate-700" },
  Processing: { label: "Đang xử lý",            color: "bg-blue-100 text-blue-800" },
  Verified:   { label: "Đã xác nhận",           color: "bg-indigo-100 text-indigo-800" },
  Waiting:    { label: "Chờ đặt cọc",           color: "bg-amber-100 text-amber-800" },
  Accepted:   { label: "Đã chấp nhận",          color: "bg-teal-100 text-teal-800" },
  Rejected:   { label: "Khách từ chối",         color: "bg-rose-100 text-rose-800" },
  Cancel:     { label: "Đã hủy",                color: "bg-red-100 text-red-800" },
  Declined:   { label: "Đã từ chối",            color: "bg-orange-100 text-orange-800" },
  Finished:   { label: "Hoàn thành sản xuất",   color: "bg-emerald-100 text-emerald-800" },
  Importing:  { label: "Đang nhập kho",         color: "bg-orange-100 text-orange-800" },
  Delivery:   { label: "Đang giao hàng",        color: "bg-sky-100 text-sky-800" },
  Completed:  { label: "Hoàn thành giao hàng",  color: "bg-green-100 text-green-800" },
};

const ROLE_MAP: Record<number, string> = {
  1: "Admin", 2: "Consultant", 3: "Manager", 4: "Warehouse",
  5: "Customer", 6: "Productions Manager", 7: "Staff", 8: "General Manager",
};

const ROLE_COLOR: Record<string, string> = {
  Admin: "bg-red-100 text-red-700",
  Consultant: "bg-blue-100 text-blue-700",
  Manager: "bg-purple-100 text-purple-700",
  Warehouse: "bg-orange-100 text-orange-700",
  Customer: "bg-cyan-100 text-cyan-700",
  "Productions Manager": "bg-indigo-100 text-indigo-700",
  Staff: "bg-green-100 text-green-700",
  "General Manager": "bg-amber-100 text-amber-700",
};

/* =======================
   PAGINATION COMPONENT
======================= */
function Pagination({
  currentPage, totalPages, onPageChange,
}: {
  currentPage: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages: (number | string)[] = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    pages.push(1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages - 1) pages.push("...");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t">
      <span className="text-sm text-gray-500">
        Trang {currentPage} / {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-lg border text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FiChevronLeft size={16} />
        </button>
        {getVisiblePages().map((page, idx) =>
          typeof page === "string" ? (
            <span key={`dots-${idx}`} className="px-2 text-gray-400 text-sm">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {page}
            </button>
          )
        )}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-lg border text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =======================
   MAIN COMPONENT
======================= */
export default function StatisticsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subProducts, setSubProducts] = useState<SubProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [userPage, setUserPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = localStorage.getItem("token") || "";
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      try {
        // Fetch Users
        const userRes = await fetch("https://mmes-sep490.onrender.com/get-all-user", { headers });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUsers(Array.isArray(userData) ? userData : []);
        }

        // Fetch Requests (Yêu cầu báo giá)
        try {
          const reqRes = await fetch("https://mmes-sep490.onrender.com/api/Requests/paged?page=1&pageSize=500", { headers });
          if (reqRes.ok) {
            const reqData = await reqRes.json();
            setRequests(reqData.data || []);
          }
        } catch (e) {
          console.error("Could not fetch requests");
        }

        // Fetch Orders (Đơn hàng sản xuất)
        try {
          const orderRes = await fetch("https://mmes-sep490.onrender.com/api/Orders/paged?page=1&pageSize=500", { headers });
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            setOrders(orderData.data || []);
          }
        } catch (e) {
          console.error("Could not fetch orders");
        }

        // Fetch Materials
        try {
          const materialRes = await fetch("https://mmes-sep490.onrender.com/api/Materials/get-all-materials", { headers });
          if (materialRes.ok) {
            const materialData = await materialRes.json();
            setMaterials(Array.isArray(materialData) ? materialData : materialData.data || []);
          }
        } catch (e) {
          console.error("Could not fetch materials");
        }

        // Fetch SubProducts (Components)
        try {
          const subProductRes = await fetch("https://mmes-sep490.onrender.com/api/SubProducts/paged?page=1&pageSize=200", { headers });
          if (subProductRes.ok) {
            const subProductData = await subProductRes.json();
            setSubProducts(subProductData.data || subProductData || []);
          }
        } catch (e) {
          console.error("Could not fetch components");
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Pagination calculations
  const userTotalPages = Math.ceil(users.length / PAGE_SIZE);
  const pagedUsers = useMemo(() => {
    const start = (userPage - 1) * PAGE_SIZE;
    return users.slice(start, start + PAGE_SIZE);
  }, [users, userPage]);

  const requestTotalPages = Math.ceil(requests.length / PAGE_SIZE);
  const pagedRequests = useMemo(() => {
    const start = (requestPage - 1) * PAGE_SIZE;
    return requests.slice(start, start + PAGE_SIZE);
  }, [requests, requestPage]);

  const orderTotalPages = Math.ceil(orders.length / PAGE_SIZE);
  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * PAGE_SIZE;
    return orders.slice(start, start + PAGE_SIZE);
  }, [orders, orderPage]);

  const materialTotalPages = Math.ceil(materials.length / PAGE_SIZE);
  const pagedMaterials = useMemo(() => {
    const start = (materialPage - 1) * PAGE_SIZE;
    return materials.slice(start, start + PAGE_SIZE);
  }, [materials, materialPage]);

  // Low-stock materials count
  const lowStockCount = useMemo(
    () => materials.filter((m) => m.stock_qty <= m.min_stock).length,
    [materials]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Thống kê hệ thống</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng quan về dữ liệu người dùng, yêu cầu, đơn hàng, nguyên vật liệu và thành phần
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* ===== KPI Cards ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Người dùng</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{users.length}</h3>
              </div>
              <div className="w-11 h-11 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <FiUsers size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Yêu cầu báo giá</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{requests.length}</h3>
              </div>
              <div className="w-11 h-11 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
                <FiFileText size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Đơn hàng SX</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{orders.length}</h3>
              </div>
              <div className="w-11 h-11 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <FiPackage size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Nguyên vật liệu</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{materials.length || '--'}</h3>
                {lowStockCount > 0 && (
                  <p className="text-xs text-red-500 mt-0.5 font-medium">{lowStockCount} dưới tồn kho tối thiểu</p>
                )}
              </div>
              <div className="w-11 h-11 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <FiLayers size={20} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Thành phần (BTP)</p>
                <h3 className="text-3xl font-extrabold text-gray-900">{subProducts.length || '--'}</h3>
              </div>
              <div className="w-11 h-11 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <FiList size={20} />
              </div>
            </div>
          </div>

          {/* ===== DANH SÁCH NGƯỜI DÙNG ===== */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiUsers className="text-blue-500" /> Danh sách Người Dùng
                <span className="ml-1 text-xs font-normal text-gray-400">({users.length})</span>
              </h2>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-6 py-3 font-medium">Tên người dùng</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Vai trò</th>
                  <th className="px-6 py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((user) => {
                  const roleName = ROLE_MAP[user.role_id] || "Khác";
                  return (
                    <tr key={user.user_id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.full_name || "(Chưa có tên)"}</div>
                        <div className="text-xs text-gray-400">{user.username}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{user.email || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLOR[roleName] || "bg-gray-100 text-gray-600"}`}>
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.is_active ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu</td></tr>
                )}
              </tbody>
            </table>
            <Pagination currentPage={userPage} totalPages={userTotalPages} onPageChange={setUserPage} />
          </div>

          {/* ===== DANH SÁCH YÊU CẦU BÁO GIÁ ===== */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiFileText className="text-violet-500" /> Danh sách Yêu Cầu Báo Giá
                <span className="ml-1 text-xs font-normal text-gray-400">({requests.length})</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Mã YC</th>
                    <th className="px-6 py-3 font-medium">Khách hàng</th>
                    <th className="px-6 py-3 font-medium">Sản phẩm</th>
                    <th className="px-6 py-3 font-medium text-right">Số lượng</th>
                    <th className="px-6 py-3 font-medium">Trạng thái</th>
                    <th className="px-6 py-3 font-medium">Ngày yêu cầu</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRequests.map((req) => {
                    const st = REQUEST_STATUS_MAP[req.process_status] || { label: req.process_status || 'N/A', color: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={req.order_request_id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">#{req.order_request_id}</td>
                        <td className="px-6 py-4 text-gray-700">{req.customer_name}</td>
                        <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">{req.product_name}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold text-right">{(req.quantity ?? 0).toLocaleString('vi-VN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {req.order_request_date ? new Date(req.order_request_date).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {requests.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={requestPage} totalPages={requestTotalPages} onPageChange={setRequestPage} />
          </div>

          {/* ===== DANH SÁCH ĐƠN HÀNG SẢN XUẤT ===== */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiPackage className="text-green-500" /> Danh sách Đơn Hàng Sản Xuất
                <span className="ml-1 text-xs font-normal text-gray-400">({orders.length})</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Mã đơn hàng</th>
                    <th className="px-6 py-3 font-medium">Khách hàng</th>
                    <th className="px-6 py-3 font-medium">Sản phẩm</th>
                    <th className="px-6 py-3 font-medium text-right">Số lượng</th>
                    <th className="px-6 py-3 font-medium">Trạng thái</th>
                    <th className="px-6 py-3 font-medium">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOrders.map((order) => {
                    const st = ORDER_STATUS_MAP[order.status] || { label: order.status || 'N/A', color: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={order.order_id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{order.code || `#${order.order_id}`}</td>
                        <td className="px-6 py-4 text-gray-700">{order.customer_name || '—'}</td>
                        <td className="px-6 py-4 text-gray-700 max-w-[200px] truncate">{order.product_name || '—'}</td>
                        <td className="px-6 py-4 text-gray-900 font-semibold text-right">{(order.quantity || 0).toLocaleString('vi-VN')}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('vi-VN') : '—'}
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={orderPage} totalPages={orderTotalPages} onPageChange={setOrderPage} />
          </div>

          {/* ===== DANH SÁCH NGUYÊN VẬT LIỆU ===== */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FiLayers className="text-orange-500" /> Danh sách Nguyên Vật Liệu
                <span className="ml-1 text-xs font-normal text-gray-400">({materials.length})</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-6 py-3 font-medium">Mã NVL</th>
                    <th className="px-6 py-3 font-medium">Tên nguyên vật liệu</th>
                    <th className="px-6 py-3 font-medium">Loại</th>
                    <th className="px-6 py-3 font-medium">Đơn vị</th>
                    <th className="px-6 py-3 font-medium text-right">Tồn kho</th>
                    <th className="px-6 py-3 font-medium text-right">Tối thiểu</th>
                    <th className="px-6 py-3 font-medium text-right">Đơn giá</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMaterials.map((m) => {
                    const isLow = m.stock_qty <= m.min_stock;
                    return (
                      <tr key={m.material_id} className={`border-b last:border-0 hover:bg-gray-50 ${isLow ? 'bg-red-50/40' : ''}`}>
                        <td className="px-6 py-4 font-medium text-gray-900">{m.code}</td>
                        <td className="px-6 py-4 text-gray-700">{m.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-medium">{m.type || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{m.unit}</td>
                        <td className={`px-6 py-4 font-semibold text-right ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                          {m.stock_qty.toLocaleString('vi-VN')}
                          {isLow && <span className="ml-1 text-[10px] text-red-500">⚠</span>}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-right">{m.min_stock.toLocaleString('vi-VN')}</td>
                        <td className="px-6 py-4 text-gray-600 text-right">{m.cost_price.toLocaleString('vi-VN')} ₫</td>
                      </tr>
                    );
                  })}
                  {materials.length === 0 && (
                    <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Không có dữ liệu</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={materialPage} totalPages={materialTotalPages} onPageChange={setMaterialPage} />
          </div>
        </>
      )}
    </div>
  );
}
