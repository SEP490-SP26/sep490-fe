"use client";
import { useProduction } from "@/context/ProductionContext";
import Link from "next/link";
import { BiCalendar, BiCheckCircle, BiPackage } from "react-icons/bi";
import { FiAlertTriangle, FiClock } from "react-icons/fi";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Chart,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const centerTextPlugin = {
  id: "centerText",
  afterDraw: (chart: any) => {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const centerX = meta.data[0].x;
    const centerY = meta.data[0].y;

    ctx.save();

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#111827";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(`${chart.config.data.datasets[0].data[0]}%`, centerX, centerY);

    ctx.restore();
  },
};
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
  const [kpis, setKpis] = useState({
  total: 0,
  scheduled: 0,
  rate: 0,
});
  const [loadingProd, setLoadingProd] = useState(false);

  useEffect(() => {
    const fetchProductions = async () => {
      try {
        setLoadingProd(true);

        const res = await fetch(
          `https://amms-juaa.onrender.com/api/Productions/get-all-production?page=1&pageSize=50`
        );

        const data = await res.json();

        const list = data.data || [];

// ===== KPI =====
const total = list.length;

const scheduledCount = list.filter(
  (item: any) =>
    item.status === "Scheduled" ||
    item.status === "InProcessing"
).length;

const rate =
  total > 0 ? Math.round((scheduledCount / total) * 100) : 0;

setKpis({
  total,
  scheduled: scheduledCount,
  rate,
});

        const filtered = list.filter(
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
{/* 
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
*/}
  // Tồn kho thấp (< 100 đơn vị)
  {/*
  const lowStockItems = inventory
    .filter((inv) => inv.on_hand < 100)
    .map((inv) => ({
      ...inv,
      material: materials.find((m) => m.id === inv.material_id),
    }));
    */}
{/* 
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
*/}
//=======================CHART=====================
const notScheduled = kpis.total - kpis.scheduled;

const chartData = {
  labels: ["Đã lên lịch", "Chưa lên lịch"],
  datasets: [
    {
      data: [kpis.rate, 100 - kpis.rate],
      backgroundColor: ["#22c55e", "#facc15"],
      borderWidth: 1,
    },
  ],
};

const chartOptions = {
  cutout: "65%",
  plugins: {
    legend: {
      position: "bottom" as const,
    },
  },
};
  return (
    <div>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* KPI Cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
  <h2 className="text-lg font-semibold mb-4">
    Tổng quan sản xuất
  </h2>

  {loadingProd ? (
    <div className="text-center text-gray-400 py-10">
      Đang tải dữ liệu...
    </div>
  ) : (
    <>
      <div className="w-72 h-72 mx-auto">
        <Doughnut
  data={chartData}
  options={chartOptions}
  plugins={[centerTextPlugin]}
/>
      </div>

      <div className="text-center mt-4 space-y-1">
        <div className="text-gray-600">
          Tổng đơn: <b>{kpis.total}</b>
        </div>
        <div className="text-green-600">
          Đã lên lịch: <b>{kpis.scheduled}</b>
        </div>
        <div className="text-purple-600">
          Tỷ lệ lên lịch: <b>{kpis.rate}%</b>
        </div>
      </div>
    </>
  )}
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
                    className={`px-3 py-1 rounded-full text-xs ${order.status === "InProcessing"
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
