"use client";
import { useProduction } from "@/context/ProductionContext";
import Link from "next/link";
import { BiCalendar, BiCheckCircle, BiPackage } from "react-icons/bi";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { useEffect, useState } from "react";

export default function Dashboard() {

  const [missingMaterials, setMissingMaterials] = useState<any[]>([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  useEffect(() => {
    const fetchMissingMaterials = async () => {
      try {
        setLoadingMissing(true);

        const res = await fetch(
          "https://amms-juaa.onrender.com/api/MissingMaterials/paged?page=1&pageSize=10"
        );

        const data = await res.json();
        setMissingMaterials(data.data || []);
      } catch (error) {
        console.error("Lỗi khi fetch Missing Materials:", error);
      } finally {
        setLoadingMissing(false);
      }
    };

    fetchMissingMaterials();
  }, []);

  // ======== PRODUCTIONS (Chỉ lấy 5 đơn gần nhất) ========

  const [productions, setProductions] = useState<any[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);

  useEffect(() => {
    const fetchProductions = async () => {
      try {
        setLoadingProd(true);

        const res = await fetch(
          `https://amms-juaa.onrender.com/api/Productions/get-all-production?page=1&pageSize=50`
        );

        const data = await res.json();

        const filtered = (data.data || []).filter(
          (item: any) =>
            item.status === "Scheduled" ||
            item.status === "InProcessing"
        );

        // Sort mới nhất trước (ưu tiên delivery_date)
        const sorted = filtered.sort(
          (a: any, b: any) =>
            new Date(b.delivery_date).getTime() -
            new Date(a.delivery_date).getTime()
        );

        // Lấy 5 đơn gần nhất
        setProductions(sorted.slice(0, 5));

      } catch (err) {
        console.error("Lỗi fetch production:", err);
      } finally {
        setLoadingProd(false);
      }
    };

    fetchProductions();
  }, []);

  // =========

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
  {/*
  const lowStockItems = inventory
    .filter((inv) => inv.on_hand < 100)
    .map((inv) => ({
      ...inv,
      material: materials.find((m) => m.id === inv.material_id),
    }));
    */}

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
      order: orders.find((o) => o.order_id === schedule.order_id),
    }));

  return (
    <div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

        <div className="flex gap-3">
          <Link href="/warehouse">
            Chuyển đến giao diện Nhân viên lập lịch
          </Link>
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
            {loadingProd ? (
              <div className="text-gray-400 text-center py-8">
                Đang tải dữ liệu...
              </div>
            ) : productions.length > 0 ? (
              productions.map((order) => (
                <div
                  key={order.order_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium">
                      Mã đơn hàng: {order.code}
                    </div>

                    <div className="text-gray-500 text-sm">
                      {order.product_name} • SL: {order.quantity}
                    </div>

                    <div className="text-gray-500 text-sm">
                      Giao:{" "}
                      {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      order.status === "InProcessing"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {order.status === "InProcessing"
                      ? "Đang sản xuất"
                      : "Đã lên lịch"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-center py-8">
                Không có đơn phù hợp
              </div>
            )}
          </div>
        </div>

        {/* Cảnh báo thiếu nguyên vật liệu */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <FiAlertTriangle className="w-5 h-5 text-orange-500" />
            Cảnh báo thiếu nguyên vật liệu
          </h2>

          <div className="space-y-3">
            {loadingMissing ? (
              <div className="text-gray-400 text-center py-8">
                Đang tải dữ liệu...
              </div>
            ) : missingMaterials.length > 0 ? (
              missingMaterials.map((item) => (
                <div
                  key={item.material_id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="text-gray-900 font-medium">
                      {item.material_name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Cần: {item.needed} {item.unit}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Hiện có: {item.available} {item.unit}
                    </div>
                  </div>

                  <div className="text-red-600 font-semibold">
                    Thiếu: {(item.needed - item.available).toFixed(2)}{" "}
                    {item.unit}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-center py-8">
                Không có vật liệu thiếu
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
