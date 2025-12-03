"use client";
import { useProduction } from "@/context/ProductionContext";
import Link from "next/link";
import { BiCalendar, BiCheckCircle, BiPackage } from "react-icons/bi";
import { FiAlertTriangle, FiClock } from "react-icons/fi";

export default function Dashboard() {
  const { orders, inventory, materials, productionSchedules } = useProduction();

  // KPIs
  const totalOrders = orders.length;
  const scheduledOrders = orders.filter(
    (o) => o.status === "scheduled" || o.status === "in_production"
  ).length;
  const scheduledRate =
    totalOrders > 0 ? ((scheduledOrders / totalOrders) * 100).toFixed(0) : 0;

  // Đơn hàng gần đây (5 đơn mới nhất)
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);

  // Tồn kho thấp (< 100 đơn vị)
  const lowStockItems = inventory
    .filter((inv) => inv.on_hand < 100)
    .map((inv) => ({
      ...inv,
      material: materials.find((m) => m.id === inv.material_id),
    }));

  // Lịch sản xuất hôm nay
  const today = new Date().toISOString().split("T")[0];
  const todaySchedules = productionSchedules
    .filter((s) => {
      const startDate = s.start_date;
      const endDate = s.end_date;
      return today >= startDate && today <= endDate && s.status !== "completed";
    })
    .map((schedule) => ({
      ...schedule,
      order: orders.find((o) => o.id === schedule.order_id),
    }));

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      scheduled: "bg-blue-100 text-blue-700",
      in_production: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
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

  return (
    <div>
      {/* <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div> */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        <div className="flex gap-3">
          <Link href="/staff">Chuyển đến giao diện Nhân viên lập lịch</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BiPackage className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-gray-600 mb-1">Tổng đơn hàng</div>
          <div className="text-blue-600">{totalOrders}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-gray-600 mb-1">Đơn đã lên lịch</div>
          <div className="text-green-600">{scheduledOrders}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <BiCalendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-gray-600 mb-1">Tỷ lệ lên lịch</div>
          <div className="text-purple-600">{scheduledRate}%</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Đơn hàng gần đây */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4">Đơn hàng gần đây</h2>
          <div className="space-y-3">
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-gray-900">{order.customer_name}</div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {order.quantity} • Giao:{" "}
                      {new Date(order.delivery_date).toLocaleDateString(
                        "vi-VN"
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-center py-8">
                Chưa có đơn hàng
              </div>
            )}
          </div>
        </div>

        {/* Tồn kho thấp */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <FiAlertTriangle className="w-5 h-5 text-orange-500" />
            Cảnh báo tồn kho thấp
          </h2>
          <div className="space-y-3">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((item) => (
                <div
                  key={item.material_id}
                  className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-gray-900">{item.material?.name}</div>
                    <div className="text-gray-500 text-sm">
                      Khả dụng: {item.on_hand - item.reserved}{" "}
                      {item.material?.unit}
                    </div>
                  </div>
                  <div className="text-orange-600">
                    {item.on_hand} {item.material?.unit}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-center py-8">
                Tồn kho ổn định
              </div>
            )}
          </div>
        </div>

        {/* Lịch sản xuất hôm nay */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2">
            <FiClock className="w-5 h-5 text-blue-500" />
            Lịch sản xuất hôm nay
          </h2>
          <div className="space-y-3">
            {todaySchedules.length > 0 ? (
              todaySchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 bg-blue-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-gray-900">
                      Đơn hàng: {schedule.order?.customer_name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {schedule.order?.quantity} •{" "}
                      {schedule.start_date} đến {schedule.end_date}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      schedule.status === "in_progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {schedule.status === "in_progress"
                      ? "Đang sản xuất"
                      : "Đã lên lịch"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-center py-8">
                Không có lịch sản xuất hôm nay
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
