"use client";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const STATUSES: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  Processing: { label: "Chờ duyệt", color: "#3b82f6", bg: "#eff6ff", desc: "Consultant gửi lên" },
  Verified: { label: "Đã duyệt", color: "#22c55e", bg: "#f0fdf4", desc: "Chờ gửi khách hàng" },
  Waiting: { label: "Chờ đặt cọc", color: "#f59e0b", bg: "#fffbeb", desc: "Đợi khách xác nhận" },
  Rejected: { label: "Khách từ chối", color: "#ef4444", bg: "#fef2f2", desc: "Từ chối đặt cọc" },
};
const KEYS = ["Processing", "Verified", "Waiting", "Rejected"];

function formatVND(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + " tỷ";
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + " triệu";
  if (value >= 1_000) return (value / 1_000).toFixed(0) + " nghìn";
  return value.toLocaleString("vi-VN");
}

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          "https://mmes-sep490-84gr.onrender.com/api/Requests/paged?page=1&pageSize=500"
        );
        const data = await res.json();
        setOrders((data.data || []).filter((o: any) => o.product_name));
      } catch (e) {
        console.error("Lỗi fetch orders:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  // ── Tính KPI ──
  const counts: Record<string, number> = {};
  const revenues: Record<string, number> = {};
  KEYS.forEach((k) => { counts[k] = 0; revenues[k] = 0; });

  orders.forEach((o: any) => {
    const s = o.process_status;
    if (!KEYS.includes(s)) return;
    counts[s]++;
    revenues[s] += o.final_cost || 0;
  });

  const total = KEYS.reduce((s, k) => s + counts[k], 0);

  // ── Đã đặt cọc (Accepted) ──
  const depositedOrders = orders.filter((o: any) => o.process_status === "Accepted");
  const depositedCount = depositedOrders.length;
  const totalDepositAmount = depositedOrders.reduce(
    (sum: number, o: any) => sum + (o.deposit_amount || 0),
    0
  );
  const totalAcceptedRevenue = depositedOrders.reduce(
    (sum: number, o: any) => sum + (o.final_cost || 0),
    0
  );

  // ── Donut chart ──
  const donutData = {
    labels: KEYS.map((k) => STATUSES[k].label),
    datasets: [{
      data: KEYS.map((k) => counts[k]),
      backgroundColor: KEYS.map((k) => STATUSES[k].color),
      borderWidth: 2,
      borderColor: "#ffffff",
    }],
  };
  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} đơn` } },
    },
  };

  // ── Bar chart doanh thu ──
  const barData = {
    labels: KEYS.map((k) => STATUSES[k].label),
    datasets: [{
      data: KEYS.map((k) => Math.round((revenues[k] / 1e6) * 10) / 10),
      backgroundColor: KEYS.map((k) => STATUSES[k].color + "cc"),
      borderColor: KEYS.map((k) => STATUSES[k].color),
      borderWidth: 1,
      borderRadius: 5,
    }],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw}M đồng` } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        ticks: { font: { size: 11 }, callback: (v: any) => v + " M" },
        grid: { color: "rgba(128,128,128,0.1)" },
      },
    },
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* ── Deposit summary banner ── */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 mb-5 text-white">
            <div className="text-xs font-bold uppercase tracking-widest opacity-75 mb-3">
              Đơn đã đặt cọc (Accepted)
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-3xl font-extrabold leading-none">{depositedCount}</div>
                <div className="text-xs opacity-70 mt-1">Số đơn đã cọc</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold leading-none">
                  {formatVND(totalDepositAmount)}
                </div>
                <div className="text-xs opacity-70 mt-1">Tổng tiền cọc</div>
              </div>
              <div>
                <div className="text-3xl font-extrabold leading-none">
                  {formatVND(totalAcceptedRevenue)}
                </div>
                <div className="text-xs opacity-70 mt-1">Tổng giá trị đơn</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs opacity-70 mb-1">
                <span>Tỷ lệ cọc / tổng giá trị</span>
                <span>
                  {totalAcceptedRevenue > 0
                    ? Math.round((totalDepositAmount / totalAcceptedRevenue) * 100)
                    : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-700"
                  style={{
                    width: `${totalAcceptedRevenue > 0
                      ? Math.round((totalDepositAmount / totalAcceptedRevenue) * 100)
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── KPI Cards (4 trạng thái + 1 card đã cọc) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">

            {/* 4 status cards */}
            {KEYS.map((k) => {
              const cfg = STATUSES[k];
              const pct = total > 0 ? Math.round((counts[k] / total) * 100) : 0;
              return (
                <div
                  key={k}
                  className="bg-white rounded-2xl p-5 border"
                  style={{ borderColor: cfg.color + "44" }}
                >
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {counts[k]}
                    </div>
                    <div
                      className="text-sm font-bold rounded-lg px-2 py-1"
                      style={{ color: cfg.color, background: cfg.bg }}
                    >
                      {pct}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">{cfg.desc}</div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: cfg.color }}
                    />
                  </div>
                </div>
              );
            })}

            {/* Card đã cọc */}
            <div className="bg-white rounded-2xl p-5 border border-violet-200">
              <div className="text-xs font-bold uppercase tracking-widest mb-2 text-violet-600">
                Đã đặt cọc
              </div>
              <div className="flex items-end justify-between">
                <div className="text-4xl font-extrabold text-gray-900 leading-none">
                  {depositedCount}
                </div>
                <div className="text-sm font-bold rounded-lg px-2 py-1 text-violet-600 bg-violet-50">
                  {orders.length > 0 ? Math.round((depositedCount / orders.length) * 100) : 0}%
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2 mb-1">Khách đã xác nhận cọc</div>
              <div className="text-xs font-semibold text-violet-600 mt-1">
                {formatVND(totalDepositAmount)}
              </div>
              <div className="h-1 rounded-full bg-gray-100 overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-700"
                  style={{
                    width: `${orders.length > 0
                      ? Math.round((depositedCount / orders.length) * 100)
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* Donut */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-0.5">Tỉ lệ theo trạng thái</h2>
              <div className="text-xs text-gray-400 mb-3">Phân bổ 4 nhóm quản lý</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
                {KEYS.map((k) => {
                  const pct = total > 0 ? Math.round((counts[k] / total) * 100) : 0;
                  return (
                    <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ background: STATUSES[k].color }}
                      />
                      {STATUSES[k].label} {pct}%
                    </span>
                  );
                })}
              </div>
              <div className="relative" style={{ height: 200 }}>
                <Doughnut data={donutData} options={donutOptions} />
              </div>
            </div>

            {/* Bar revenue */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-0.5">Doanh thu ước tính</h2>
              <div className="text-xs text-gray-400 mb-3">
                Tổng tiền theo trạng thái (triệu đồng)
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
                {KEYS.map((k) => (
                  <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: STATUSES[k].color }}
                    />
                    {STATUSES[k].label} {(revenues[k] / 1e6).toFixed(1)} M
                  </span>
                ))}
              </div>
              <div className="relative" style={{ height: 200 }}>
                <Bar data={barData} options={barOptions} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}