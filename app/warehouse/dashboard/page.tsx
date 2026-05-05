"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { materialsApi } from "@/apiRequests/materials";
import { subProductsApi } from "@/apiRequests/subproducts";
import { requestOrderApi } from "@/apiRequests/request";
import { BiPackage } from "react-icons/bi";
import { BsBoxSeam, BsTruck, BsGraphUp, BsSearch } from "react-icons/bs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Loading from "@/app/(overview)/loading";

export default function WarehouseDashboard() {
  // Fetch Data
  const { data: materialsData, isLoading: isMatLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await materialsApi.getAll();
      return res; // Assuming Material[]
    },
  });

  const { data: subProductsData, isLoading: isSubLoading } = useQuery({
    queryKey: ["subproducts"],
    queryFn: async () => {
      const res = await subProductsApi.getPaged(1, 500, true);
      return res;
    },
  });

  const { data: requestsData, isLoading: isReqLoading } = useQuery({
    queryKey: ["finished-goods-reqs"],
    queryFn: async () => {
      const res = await requestOrderApi.getList(1, 500);
      return res.data;
    },
  });

  const isLoading = isMatLoading || isSubLoading || isReqLoading;

  const [matSearch, setMatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [reqSearch, setReqSearch] = useState("");
  const PAGE_SIZE = 8;
  const [matPage, setMatPage] = useState(1);
  const [subPage, setSubPage] = useState(1);
  const [reqPage, setReqPage] = useState(1);

  // ===== SUMMARY CALCULATIONS =====
  const totalMaterials = useMemo(() => {
    if (!materialsData) return 0;
    return materialsData.reduce(
      (acc: number, curr: any) =>
        acc + (curr.on_hand ?? curr.stock_qty ?? 0),
      0
    );
  }, [materialsData]);

  const totalSubProducts = useMemo(() => {
    if (!subProductsData?.data) return 0;
    return subProductsData.data.reduce(
      (acc: number, curr: any) => acc + (curr.quantity || 0),
      0
    );
  }, [subProductsData]);

  const totalFinishedGoods = useMemo(() => {
    if (!requestsData?.data) return 0;
    return requestsData.data.reduce(
      (acc: number, curr: any) => acc + (curr.quantity || 0),
      0
    );
  }, [requestsData]);

  // ===== CHART DATA CALCULATIONS =====

  // 1. Top 10 Materials by stock
  const topMaterials = useMemo(() => {
    if (!materialsData) return [];
    return [...materialsData]
      .sort((a: any, b: any) => {
        const stockA = a.on_hand ?? a.stock_qty ?? 0;
        const stockB = b.on_hand ?? b.stock_qty ?? 0;
        return stockB - stockA;
      })
      .slice(0, 10)
      .map((m: any) => ({
        name: m.name || m.code || `ID ${m.material_id}`,
        "Tồn kho": m.on_hand ?? m.stock_qty ?? 0,
      }));
  }, [materialsData]);

  // 2. SubProducts Distribution by Product Type
  const subProductsDistribution = useMemo(() => {
    if (!subProductsData?.data) return [];
    const dist: Record<string, number> = {};
    subProductsData.data.forEach((sp: any) => {
      const typeName = sp.product_type_name || "Khác";
      dist[typeName] = (dist[typeName] || 0) + (sp.quantity || 0);
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [subProductsData]);

  // 3. Finished Goods Distribution by Status
  const requestsByStatus = useMemo(() => {
    if (!requestsData?.data) return [];
    const dist: Record<string, number> = {};
    requestsData.data.forEach((req: any) => {
      const status = req.process_status || "Khác";
      dist[status] = (dist[status] || 0) + (req.quantity || 0);
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [requestsData]);

  const COLORS = [
    "#3B82F6", // blue-500
    "#10B981", // emerald-500
    "#F59E0B", // amber-500
    "#8B5CF6", // violet-500
    "#EC4899", // pink-500
    "#06B6D4", // cyan-500
    "#F43F5E", // rose-500
    "#84CC16", // lime-500
  ];

  if (isLoading) return <Loading />;

  return (
    <div className="max-w-7xl mx-auto pb-12 p-4 md:p-6">
      <div className="flex items-center gap-3 mb-8">
        <BsGraphUp className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
          Tổng Quan Kho (Dashboard)
        </h1>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Raw Materials Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <BsTruck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Tổng Nguyên Vật Liệu
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {totalMaterials.toLocaleString("vi-VN")}
            </h3>
          </div>
        </div>

        {/* Sub-products Card */}
        <div className="bg-white rounded-2xl shadow-sm border-purple-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
            <BiPackage className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Tổng Bán Thành Phẩm
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {totalSubProducts.toLocaleString("vi-VN")}
            </h3>
          </div>
        </div>

        {/* Finished Goods Card */}
        <div className="bg-white rounded-2xl shadow-sm border-green-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 bg-green-50 text-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <BsBoxSeam className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">
              Tổng Thành Phẩm (Dự kiến & Đã nhập)
            </p>
            <h3 className="text-2xl font-bold text-gray-900">
              {totalFinishedGoods.toLocaleString("vi-VN")}
            </h3>
          </div>
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Materials Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-6">
            Top 10 Nguyên Vật Liệu Tồn Kho Nhiều Nhất
          </h2>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topMaterials}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Bar
                  dataKey="Tồn kho"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SubProducts Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">
            Phân Bổ Bán Thành Phẩm (Theo Loại)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subProductsDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent = 0 }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {subProductsDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Finished Goods by Status Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">
            Thống Kê Đơn Thành Phẩm (Theo Trạng Thái)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={requestsByStatus}
                margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar
                  dataKey="value"
                  name="Số lượng"
                  fill="#10B981"
                  radius={[0, 4, 4, 0]}
                  barSize={30}
                >
                  {requestsByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[(index + 1) % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===== DETAIL TABLES ===== */}

      {/* Materials Detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-800">Chi Tiết Nguyên Vật Liệu</h2>
          <div className="relative w-full sm:w-64">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={matSearch} onChange={e => { setMatSearch(e.target.value); setMatPage(1); }} placeholder="Tìm kiếm..." className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>
        {(() => {
          const filtered = (materialsData || []).filter((m: any) => {
            if (!matSearch) return true;
            const s = matSearch.toLowerCase();
            return (m.name || "").toLowerCase().includes(s) || (m.code || "").toLowerCase().includes(s) || (m.type || "").toLowerCase().includes(s);
          });
          const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const paged = filtered.slice((matPage - 1) * PAGE_SIZE, matPage * PAGE_SIZE);
          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50"><tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-blue-700">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-blue-700">Mã</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-blue-700">Tên vật liệu</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-blue-700">Loại</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-blue-700">Tồn kho</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-blue-700">Tối thiểu</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-blue-700">ĐVT</th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-6 text-gray-400">Không có dữ liệu</td></tr>
                    ) : paged.map((m: any, i: number) => {
                      const stock = m.on_hand ?? m.stock_qty ?? 0;
                      const isLow = stock < (m.min_stock || 0);
                      return (
                        <tr key={m.material_id ?? i} className={`border-t hover:bg-blue-50/40 transition ${isLow ? "bg-red-50" : ""}`}>
                          <td className="px-3 py-2.5 text-gray-400">{(matPage - 1) * PAGE_SIZE + i + 1}</td>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{m.code}</td>
                          <td className="px-3 py-2.5 font-medium text-gray-800">{m.name}</td>
                          <td className="px-3 py-2.5 text-gray-500">{m.type || m.main_material_type || "—"}</td>
                          <td className={`px-3 py-2.5 text-right font-bold ${isLow ? "text-red-600" : "text-gray-800"}`}>{stock.toLocaleString("vi-VN")}</td>
                          <td className="px-3 py-2.5 text-right text-gray-500">{(m.min_stock || 0).toLocaleString("vi-VN")}</td>
                          <td className="px-3 py-2.5 text-center text-gray-500">{m.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={matPage <= 1} onClick={() => setMatPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">←</button>
                  <span className="text-sm text-gray-600">{matPage} / {totalPages}</span>
                  <button disabled={matPage >= totalPages} onClick={() => setMatPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">→</button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* SubProducts Detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-800">Chi Tiết Bán Thành Phẩm</h2>
          <div className="relative w-full sm:w-64">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={subSearch} onChange={e => { setSubSearch(e.target.value); setSubPage(1); }} placeholder="Tìm kiếm..." className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
          </div>
        </div>
        {(() => {
          const list = subProductsData?.data || [];
          const filtered = list.filter((sp: any) => {
            if (!subSearch) return true;
            const s = subSearch.toLowerCase();
            return (sp.product_type_name || "").toLowerCase().includes(s) || (sp.product_process || "").toLowerCase().includes(s);
          });
          const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const paged = filtered.slice((subPage - 1) * PAGE_SIZE, subPage * PAGE_SIZE);
          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-purple-50"><tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-purple-700">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-purple-700">Tên</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-purple-700">Công đoạn</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-purple-700">Kích thước</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-purple-700">Số lượng</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-purple-700">Cập nhật</th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-400">Không có dữ liệu</td></tr>
                    ) : paged.map((sp: any, i: number) => (
                      <tr key={sp.id ?? i} className="border-t hover:bg-purple-50/40 transition">
                        <td className="px-3 py-2.5 text-gray-400">{(subPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{sp.product_type_name || "Bán thành phẩm"}</td>
                        <td className="px-3 py-2.5"><span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-md text-xs font-medium border border-purple-200">{sp.product_process}</span></td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{sp.width} × {sp.length}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-purple-700">{(sp.quantity || 0).toLocaleString("vi-VN")}</td>
                        <td className="px-3 py-2.5 text-right text-gray-400 text-xs">{sp.updated_at ? new Date(sp.updated_at).toLocaleDateString("vi-VN") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={subPage <= 1} onClick={() => setSubPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">←</button>
                  <span className="text-sm text-gray-600">{subPage} / {totalPages}</span>
                  <button disabled={subPage >= totalPages} onClick={() => setSubPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">→</button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Finished Goods Detail */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-gray-800">Chi Tiết Thành Phẩm</h2>
          <div className="relative w-full sm:w-64">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={reqSearch} onChange={e => { setReqSearch(e.target.value); setReqPage(1); }} placeholder="Tìm kiếm..." className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>
        </div>
        {(() => {
          const list = requestsData?.data || [];
          const filtered = list.filter((r: any) => {
            if (!reqSearch) return true;
            const s = reqSearch.toLowerCase();
            return (r.product_name || "").toLowerCase().includes(s) || (r.customer_name || "").toLowerCase().includes(s) || (r.process_status || "").toLowerCase().includes(s);
          });
          const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const paged = filtered.slice((reqPage - 1) * PAGE_SIZE, reqPage * PAGE_SIZE);
          return (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-green-50"><tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-green-700">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-green-700">Sản phẩm</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-green-700">Khách hàng</th>
                    <th className="px-3 py-2.5 text-center font-semibold text-green-700">Trạng thái</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-green-700">Số lượng</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-green-700">Ngày giao</th>
                  </tr></thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-6 text-gray-400">Không có dữ liệu</td></tr>
                    ) : paged.map((r: any, i: number) => (
                      <tr key={r.order_request_id ?? i} className="border-t hover:bg-green-50/40 transition">
                        <td className="px-3 py-2.5 text-gray-400">{(reqPage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{r.product_name || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-600">{r.customer_name || "—"}</td>
                        <td className="px-3 py-2.5 text-center"><span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-md text-xs font-medium border border-green-200">{r.process_status}</span></td>
                        <td className="px-3 py-2.5 text-right font-bold text-green-700">{(r.quantity || 0).toLocaleString("vi-VN")}</td>
                        <td className="px-3 py-2.5 text-right text-gray-500 text-xs">{r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("vi-VN") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={reqPage <= 1} onClick={() => setReqPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">←</button>
                  <span className="text-sm text-gray-600">{reqPage} / {totalPages}</span>
                  <button disabled={reqPage >= totalPages} onClick={() => setReqPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40">→</button>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
