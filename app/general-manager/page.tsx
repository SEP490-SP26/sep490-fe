"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";
import { materialsApi } from "@/apiRequests/materials";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FiShoppingCart,
  FiSettings,
  FiPackage,
  FiList,
  FiHome,
  FiCalendar,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";
import {
  BsBoxSeam,
  BsTruck,
  BsPlay,
  BsCheckCircle,
  BsExclamationCircle,
  BsHourglassSplit,
} from "react-icons/bs";
import {
  BiSearch,
  BiFilter,
  BiChevronDown,
  BiChevronUp,
  BiChevronRight,
  BiRefresh,
} from "react-icons/bi";
import { LuLayoutDashboard } from "react-icons/lu";
import { Spin, Progress, Tooltip, Badge } from "antd";

export default function GeneralManagerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "commands" | "today" | "materials">("overview");
  const [commandSearch, setCommandSearch] = useState("");
  const [commandStatusFilter, setCommandStatusFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  
  // 1. Fetch Orders from API
  const { data: ordersData, isPending: isOrdersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["orders", "list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 200);
        return response?.data || [];
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    },
  });

  // 2. Fetch Production Commands from API
  const { data: productionsData = [], isPending: isProdLoading, refetch: refetchProds } = useQuery({
    queryKey: ["scheduledOrders"],
    queryFn: async () => {
      try {
        const response = await productionsApi.getAllProduction();
        return response?.data || response || [];
      } catch (error) {
        console.error("Error fetching productions:", error);
        return [];
      }
    },
  });

  // 3. Fetch Missing Materials from API
  const { data: missingMaterialsData = [], isPending: isMatLoading, refetch: refetchMaterials } = useQuery({
    queryKey: ["missing-materials"],
    queryFn: async () => {
      try {
        const response = await materialsApi.getListMissingMaterial(1, 100);
        // Filter those needing order (is_buy = false matches app/general-manager/purchase/page.tsx filter)
        const data = response?.data || response || [];
        return data.filter((m: any) => m.is_buy === false);
      } catch (error) {
        console.error("Error fetching missing materials:", error);
        return [];
      }
    },
  });

  const isLoading = isOrdersLoading || isProdLoading || isMatLoading;

  const handleRefresh = async () => {
    await Promise.all([
      refetchOrders(),
      refetchProds(),
      refetchMaterials()
    ]);
  };

  // ===== DATA WRAPPING & STATS =====

  // Normalize Orders
  const orders = useMemo(() => {
    if (!ordersData) return [];
    return ordersData.map((order: any) => ({
      order_id: order.order_id || order._id,
      code: order.code || "ORD-N/A",
      customer_name: order.customer_name || "Khách lẻ",
      product_name: order.product_name || "Sản phẩm hộp giấy",
      quantity: order.quantity || 0,
      created_at: order.created_at || order.order_date,
      delivery_date: order.delivery_date,
      status: order.status || "pending",
      can_fulfill: order.can_fulfill,
      prod_id: order.production_id || null,
    }));
  }, [ordersData]);

  // Filters & Count Stats
  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const ordersInProduction = orders.filter(
      (o: any) => o.status === "InProcessing" || o.status === "in_production"
    ).length;
    
    const activeProductionCommands = productionsData.length;
    const runningCommands = productionsData.filter(
      (p: any) => p.production_status === "InProcessing" || p.group_status === "InProcessing"
    ).length;

    const scheduledCommands = productionsData.filter(
      (p: any) => p.production_status === "Scheduled" || (!p.production_status && !p.group_status)
    ).length;

    const missingMaterialsCount = missingMaterialsData.length;

    // Detect commands scheduled or active TODAY
    const todayStr = new Date().toDateString();
    const todayCommands = productionsData.filter((p: any) => {
      if (!p.delivery_date) return false;
      const cmdDate = new Date(p.delivery_date).toDateString();
      return cmdDate === todayStr;
    }).length;

    // Pending manager/GM approvals
    const approvalNeededCount = productionsData.filter(
      (p: any) => p.can_start === false && p.production_status === "Scheduled"
    ).length;

    return {
      totalOrders,
      ordersInProduction,
      activeProductionCommands,
      runningCommands,
      scheduledCommands,
      missingMaterialsCount,
      todayCommands,
      approvalNeededCount,
    };
  }, [orders, productionsData, missingMaterialsData]);

  // ===== CHART CALCULATIONS =====

  // 1. Production Status distribution
  const chartStatusData = useMemo(() => {
    const scheduled = productionsData.filter(
      (p: any) => p.production_status === "Scheduled" || (!p.production_status && !p.group_status)
    ).length;
    const inProcessing = productionsData.filter(
      (p: any) => p.production_status === "InProcessing" || p.group_status === "InProcessing"
    ).length;
    const finished = productionsData.filter(
      (p: any) => p.production_status === "Finished" || p.group_status === "Finished"
    ).length;

    return [
      { name: "Đã lên lịch", value: scheduled, color: "#3B82F6" }, // Blue
      { name: "Đang sản xuất", value: inProcessing, color: "#F59E0B" }, // Amber
      { name: "Hoàn thành", value: finished, color: "#10B981" }, // Emerald
    ].filter(item => item.value > 0);
  }, [productionsData]);

  // 2. Top Missing Materials
  const chartMaterialsData = useMemo(() => {
    return [...missingMaterialsData]
      .slice(0, 5)
      .map((m: any) => ({
        name: m.material_name.length > 15 ? m.material_name.substring(0, 13) + "..." : m.material_name,
        "Đã có": Math.round(m.available || 0),
        "Thiếu": Math.round(m.quantity || 0),
      }));
  }, [missingMaterialsData]);

  // Helper: Delivery Date Remaining Badge
  const getDeliveryColor = (date: string) => {
    if (!date) return "bg-gray-100 text-gray-500 border-gray-200";
    const today = new Date();
    const delivery = new Date(date);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "bg-red-100 text-red-700 border-red-300 animate-pulse";
    if (diffDays <= 3) return "bg-red-100 text-red-700 border-red-300";
    if (diffDays <= 7) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-green-100 text-green-700 border-green-300";
  };

  const getRemainingDaysText = (date: string) => {
    if (!date) return "N/A";
    const today = new Date();
    const delivery = new Date(date);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Trễ ${Math.abs(diffDays)} ngày`;
    if (diffDays === 0) return "Hôm nay giao";
    return `Còn ${diffDays} ngày`;
  };

  // Helper: Format Date
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ===== FILTERED TABS LIST =====
  const filteredOrdersProgress = useMemo(() => {
    return orders
      .filter((o: any) => {
        const matchesSearch =
          o.code.toLowerCase().includes(orderSearch.toLowerCase()) ||
          o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) ||
          o.product_name.toLowerCase().includes(orderSearch.toLowerCase());

        const isFulfillable = o.status === "InProcessing" || o.status === "Scheduled" || o.status === "in_production";
        return matchesSearch && isFulfillable;
      })
      .sort((a: any, b: any) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
  }, [orders, orderSearch]);

  const filteredCommands = useMemo(() => {
    return productionsData
      .filter((p: any) => {
        const matchesSearch =
          p.prod_id.toString().includes(commandSearch) ||
          (p.order_code && p.order_code.toLowerCase().includes(commandSearch.toLowerCase()));

        const status = p.production_status || p.group_status || "Scheduled";
        const matchesStatus = commandStatusFilter === "all" || status === commandStatusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => b.prod_id - a.prod_id);
  }, [productionsData, commandSearch, commandStatusFilter]);

  const todayCommandsList = useMemo(() => {
    const todayStr = new Date().toDateString();
    return productionsData.filter((p: any) => {
      if (!p.delivery_date) return false;
      const cmdDate = new Date(p.delivery_date).toDateString();
      return cmdDate === todayStr;
    });
  }, [productionsData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spin size="large" />
        <p className="mt-4 text-gray-500 font-medium animate-pulse">Đang tải dữ liệu tổng quan cho General Manager...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto p-2">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-amber-900 flex items-center gap-2 tracking-tight">
            <LuLayoutDashboard className="w-7 h-7 text-amber-800" />
            Tổng Quan Điều Hành Sản Xuất
          </h1>
          <p className="text-gray-500 mt-0.5 font-medium text-xs">
            Trang giám sát tiến độ thực tế, cảnh báo tài nguyên dành riêng cho Tổng Quản Lý (General Manager)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 border border-amber-850 text-amber-850 hover:bg-amber-50 rounded-lg font-semibold text-xs transition-all duration-300 shadow-sm active:scale-95 animate-none"
        >
          <BiRefresh className="w-4 h-4" />
          Làm mới số liệu
        </button>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Orders In Production */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-5 -mt-5 transition-all group-hover:scale-110 duration-500" />
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 relative z-10">
            <BsBoxSeam className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đơn Hàng Đang SX</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{stats.ordersInProduction}</h3>
            <span className="text-[10px] text-gray-400 font-medium">Trong tổng {stats.totalOrders} đơn</span>
          </div>
        </div>

        {/* Card 2: Today's Commands */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-50 rounded-bl-full -mr-5 -mt-5 transition-all group-hover:scale-110 duration-500" />
          <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0 relative z-10">
            <FiCalendar className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lệnh SX Hôm Nay</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{stats.todayCommands}</h3>
            <span className="text-[10px] text-yellow-600 font-semibold bg-yellow-50 px-1.5 py-0.5 rounded-full">
              {stats.runningCommands} đang chạy
            </span>
          </div>
        </div>

        {/* Card 3: Pending Approvals */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 rounded-bl-full -mr-5 -mt-5 transition-all group-hover:scale-110 duration-500" />
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 relative z-10">
            <FiList className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lệnh SX Chờ Duyệt</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{stats.scheduledCommands}</h3>
            <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded-full">
              {stats.approvalNeededCount} thiếu NVL
            </span>
          </div>
        </div>

        {/* Card 4: Critical Warnings */}
        <div className={`bg-white rounded-xl border p-4 flex items-center gap-3 hover:shadow-md transition-all duration-300 relative overflow-hidden group ${
          stats.missingMaterialsCount > 0 ? "border-red-200" : "border-gray-100"
        }`}>
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full -mr-5 -mt-5 transition-all group-hover:scale-110 duration-500 ${
            stats.missingMaterialsCount > 0 ? "bg-red-50" : "bg-green-50"
          }`} />
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 relative z-10 ${
            stats.missingMaterialsCount > 0 ? "bg-red-100 text-red-600 animate-bounce" : "bg-green-100 text-green-600"
          }`}>
            <FiAlertTriangle className="w-5 h-5" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nguyên Vật Liệu Thiếu</p>
            <h3 className={`text-2xl font-bold mt-0.5 ${stats.missingMaterialsCount > 0 ? "text-red-600" : "text-gray-900"}`}>
              {stats.missingMaterialsCount}
            </h3>
            {stats.missingMaterialsCount > 0 ? (
              <span className="text-[9px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full font-bold">Đặt hàng ngay!</span>
            ) : (
              <span className="text-[9px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full font-medium">Kho ổn định</span>
            )}
          </div>
        </div>
      </div>

      {/* INTERACTIVE WORKFLOW SECTIONS (TABS) */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tab Navigation - px-4 py-2.5 for compact look */}
        <div className="flex flex-wrap border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all duration-300 ${
              activeTab === "overview"
                ? "border-amber-900 text-amber-955 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiTrendingUp className="w-4 h-4" />
            Tổng quan số liệu
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all duration-300 ${
              activeTab === "orders"
                ? "border-amber-900 text-amber-955 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <BsBoxSeam className="w-4 h-4" />
            Tiến độ đơn hàng ({filteredOrdersProgress.length})
          </button>
          <button
            onClick={() => setActiveTab("commands")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all duration-300 ${
              activeTab === "commands"
                ? "border-amber-900 text-amber-955 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiSettings className="w-4 h-4" />
            Trạng thái lệnh SX ({filteredCommands.length})
          </button>
          <button
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all duration-300 ${
              activeTab === "today"
                ? "border-amber-900 text-amber-955 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiCalendar className="w-4 h-4" />
            Lệnh trong ngày ({todayCommandsList.length})
          </button>
          <button
            onClick={() => setActiveTab("materials")}
            className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all duration-300 ${
              activeTab === "materials"
                ? "border-amber-900 text-amber-955 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <FiAlertTriangle className="w-4 h-4" />
            Cảnh báo thiếu vật liệu ({missingMaterialsData.length})
          </button>
        </div>

        {/* Tab Contents - p-4 for compact look */}
        <div className="p-4">
          {/* TAB 0: OVERVIEW CHARTS */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Chart A: Pie Chart - occupies 2 cols */}
              <div className="bg-white rounded-xl border border-gray-105 p-4 shadow-sm flex flex-col justify-between lg:col-span-2">
                <div>
                  <h2 className="text-base font-bold text-amber-900 mb-0.5 flex items-center gap-1">
                    <FiTrendingUp className="text-amber-800" />
                    Cơ Cấu Trạng Thái Lệnh SX
                  </h2>
                  <p className="text-[11px] text-gray-400 mb-4">Tỷ lệ phân bố các lệnh sản xuất hiện có trong hệ thống</p>
                </div>

                <div className="h-[210px] w-full flex items-center justify-center">
                  {chartStatusData.length === 0 ? (
                    <p className="text-xs text-gray-405">Không có dữ liệu lệnh sản xuất</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {chartStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            fontSize: "11px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Chart Legend */}
                <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
                  {chartStatusData.map((item, idx) => (
                    <div key={idx} className="p-1.5 rounded-lg bg-gray-50 border border-gray-100 flex flex-col items-center">
                      <span className="w-2 h-2 rounded-full mb-0.5" style={{ backgroundColor: item.color }} />
                      <span className="text-[9px] text-gray-500 font-medium truncate max-w-full">{item.name}</span>
                      <span className="text-xs font-bold text-gray-800 mt-0.5">{item.value} Lệnh</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart B: Bar Chart - occupies 3 cols */}
              <div className="bg-white rounded-xl border border-gray-105 p-4 shadow-sm lg:col-span-3 flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-amber-900 mb-0.5 flex items-center gap-1">
                    <FiAlertTriangle className="text-amber-800 animate-pulse" />
                    Top Vật Tư Thiếu Hụt Nhiều Nhất
                  </h2>
                  <p className="text-[11px] text-gray-400 mb-4">Mức độ thiếu hụt nguyên vật liệu so với lượng tồn kho hiện tại</p>
                </div>

                <div className="h-[240px] w-full">
                  {chartMaterialsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col text-center text-gray-400 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 p-4">
                      <FiCheckCircle className="w-10 h-10 text-green-500 mb-1" />
                      <p className="font-semibold text-gray-700 text-xs">Tất cả nguyên vật liệu đều Đủ!</p>
                      <p className="text-[10px] mt-0.5">Không phát hiện tình trạng thiếu hụt nào</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartMaterialsData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 500 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <ChartTooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            fontSize: "11px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px", fontWeight: 500 }} />
                        <Bar dataKey="Đã có" fill="#10B981" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="Thiếu" fill="#EF4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ORDER PRODUCTION PROGRESS */}
          {activeTab === "orders" && (
            <div className="space-y-4">
              {/* Tab Header & Search */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-amber-950">Theo dõi chi tiết tiến độ đơn hàng</h3>
                  <p className="text-[11px] text-gray-400">Danh sách các đơn hàng đã duyệt và đang ở công đoạn sản xuất</p>
                </div>
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-900/20 focus:border-amber-900 text-xs focus:outline-none"
                  />
                  <BiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>

              {filteredOrdersProgress.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                  <FiPackage className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="font-semibold text-gray-600 text-xs">Không có đơn hàng nào đang sản xuất</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOrdersProgress.map((order: any) => {
                    const statusText = order.status === "InProcessing" ? "Đang sản xuất" : "Đã lên lịch";
                    
                    return (
                      <div
                        key={order.order_id}
                        onClick={() => router.push(`/general-manager/production-approval?orderId=${order.order_id}`)}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:border-amber-900 hover:shadow-sm transition-all duration-300 cursor-pointer flex flex-col justify-between group"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <div>
                              <span className="font-mono text-[10px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                {order.code}
                              </span>
                              <h4 className="font-bold text-gray-900 mt-1 truncate group-hover:text-amber-900 transition-colors text-xs">
                                {order.product_name}
                              </h4>
                            </div>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              order.status === "InProcessing" ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                            }`}>
                              {statusText}
                            </span>
                          </div>

                          {/* Customer & Quantity */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 mb-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div>
                              <p className="font-semibold text-gray-400">Khách hàng</p>
                              <p className="font-bold text-gray-800 truncate">{order.customer_name}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-400">Số lượng</p>
                              <p className="font-bold text-gray-800">{order.quantity.toLocaleString("vi-VN")}</p>
                            </div>
                          </div>

                          {/* Progress Stepper Visual */}
                          <div className="mb-3">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tiến độ quy trình</p>
                            <div className="flex items-center justify-between relative mt-3">
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 rounded z-0" />
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-green-500 rounded z-0 transition-all duration-500" 
                                   style={{ width: order.status === "InProcessing" ? "50%" : "25%" }} />

                              {/* Step 1: Lên lịch */}
                              <div className="flex flex-col items-center relative z-10">
                                <div className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[9px] font-bold shadow">
                                  ✓
                                </div>
                                <span className="text-[8px] font-bold text-gray-500 mt-1 bg-white px-1">Đã lên lịch</span>
                              </div>

                              {/* Step 2: In ấn */}
                              <div className="flex flex-col items-center relative z-10">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow ${
                                  order.status === "InProcessing"
                                    ? "bg-green-500 text-white"
                                    : "bg-gray-100 text-gray-400 border border-gray-200"
                                }`}>
                                  {order.status === "InProcessing" ? "✓" : "2"}
                                </div>
                                <span className="text-[8px] font-bold text-gray-500 mt-1 bg-white px-1">In ấn</span>
                              </div>

                              {/* Step 3: Gia công */}
                              <div className="flex flex-col items-center relative z-10">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow ${
                                  order.status === "InProcessing"
                                    ? "bg-amber-500 text-white animate-pulse"
                                    : "bg-gray-100 text-gray-400 border border-gray-200"
                                }`}>
                                  3
                                </div>
                                <span className="text-[8px] font-bold text-gray-500 mt-1 bg-white px-1">Gia công</span>
                              </div>

                              {/* Step 4: Đóng gói */}
                              <div className="flex flex-col items-center relative z-10">
                                <div className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center text-[9px] font-bold">
                                  4
                                </div>
                                <span className="text-[8px] font-bold text-gray-500 mt-1 bg-white px-1">Hoàn thành</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-1 text-[11px]">
                          <span className="text-gray-400 font-medium">Hạn giao: {formatDate(order.delivery_date)}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold border ${getDeliveryColor(order.delivery_date)}`}>
                            {getRemainingDaysText(order.delivery_date)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE PRODUCTION COMMANDS */}
          {activeTab === "commands" && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-amber-955">Quản lý danh sách lệnh sản xuất</h3>
                  <p className="text-[11px] text-gray-400">Tổng hợp tất cả các lệnh lẻ & lệnh ghép đang thực thi</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <input
                      type="text"
                      value={commandSearch}
                      onChange={(e) => setCommandSearch(e.target.value)}
                      placeholder="Tìm ID lệnh, mã đơn..."
                      className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-800/20"
                    />
                    <BiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  </div>
                  <select
                    value={commandStatusFilter}
                    onChange={(e) => setCommandStatusFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-800/20 font-semibold"
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="Scheduled">Đã lên lịch</option>
                    <option value="InProcessing">Đang sản xuất</option>
                    <option value="Finished">Đã hoàn thành</option>
                  </select>
                </div>
              </div>

              {/* Commands Table */}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-bold">
                    <tr className="border-b border-gray-200 uppercase tracking-wider">
                      <th className="px-4 py-2.5">Mã Lệnh</th>
                      <th className="px-4 py-2.5">Phân Loại</th>
                      <th className="px-4 py-2.5 text-right">Số Lượng</th>
                      <th className="px-4 py-2.5">Khả Năng Bắt Đầu</th>
                      <th className="px-4 py-2.5">Hạn Hoàn Thành</th>
                      <th className="px-4 py-2.5">Trạng Thế</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredCommands.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400">
                          Không tìm thấy lệnh sản xuất phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredCommands.map((item: any, index: number) => {
                        const isGroup = item.order_id === null;
                        const status = item.production_status || item.group_status || "Scheduled";
                        
                        return (
                          <tr key={`${item.prod_id}-${index}`} className="hover:bg-gray-50 transition duration-150">
                            <td className="px-4 py-2.5 font-mono font-bold text-amber-900">
                              {item.prod_id}
                            </td>
                            <td className="px-4 py-2.5">
                              {isGroup ? (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold border border-purple-200">
                                  Đơn Ghép
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                                  Đơn Lẻ
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                              {(item.group_total_qty ?? item.quantity)?.toLocaleString("vi-VN") ?? "—"}
                            </td>
                            <td className="px-4 py-2.5">
                              {item.can_start !== false ? (
                                <span className="inline-flex items-center gap-1 text-green-600 font-bold">
                                  <FiCheckCircle className="w-3.5 h-3.5" /> Đủ vật tư
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                                  <FiAlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Thiếu vật tư
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500">
                              {formatDate(item.delivery_date)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                status === "InProcessing"
                                  ? "bg-amber-100 text-amber-900"
                                  : status === "Finished"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                              }`}>
                                {status === "InProcessing" ? "Đang sản xuất" : status === "Finished" ? "Đã xong" : "Đã lên lịch"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Link
                                href={
                                  isGroup
                                    ? `/general-manager/production-approval?prodId=${item.prod_id}`
                                    : `/general-manager/production-approval?orderId=${item.order_id}`
                                }
                                className="text-amber-800 hover:text-amber-955 font-bold flex items-center gap-0.5 transition-colors"
                              >
                                Chi tiết <BiChevronRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TODAY SCHEDULE */}
          {activeTab === "today" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-amber-955">Lịch trình lệnh sản xuất trong ngày hôm nay</h3>
                <p className="text-[11px] text-gray-400">Các lệnh sản xuất đến hạn giao hoặc được chỉ định bắt đầu trong ngày hôm nay ({new Date().toLocaleDateString("vi-VN")})</p>
              </div>

              {todayCommandsList.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 border border-dashed rounded-lg">
                  <FiCalendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="font-semibold text-gray-600 text-xs">Hôm nay không có lịch lệnh sản xuất mới</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayCommandsList.map((cmd: any, idx: number) => {
                    const isGroup = cmd.order_id === null;
                    const status = cmd.production_status || cmd.group_status || "Scheduled";

                    return (
                      <div
                        key={`${cmd.prod_id}-${idx}`}
                        className="bg-white border rounded-lg p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-amber-700 transition"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-amber-900 text-xs">LỆNH: {cmd.prod_id}</span>
                            {isGroup ? (
                              <span className="px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">Ghép</span>
                            ) : (
                              <span className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-bold">Lẻ</span>
                            )}
                            <span className="text-[10px] font-semibold text-gray-500">Hạn: {formatDate(cmd.delivery_date)}</span>
                          </div>
                          
                          <div className="mt-1 text-[10px] font-medium text-gray-650 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            <div>Số lượng: <span className="font-bold text-gray-900">{(cmd.group_total_qty ?? cmd.quantity)?.toLocaleString("vi-VN")}</span></div>
                            <div>Máy móc: <span className="text-green-600 font-bold">✓ Sẵn sàng</span></div>
                            <div>
                              Tài nguyên:{" "}
                              {cmd.can_start !== false ? (
                                <span className="text-green-600 font-bold">✓ Đủ vật tư</span>
                              ) : (
                                <span className="text-red-500 font-bold animate-pulse">✗ Thiếu vật tư</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            status === "InProcessing"
                              ? "bg-amber-100 text-amber-900 animate-pulse"
                              : status === "Finished"
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                          }`}>
                            {status === "InProcessing" ? "Đang chạy" : status === "Finished" ? "Hoàn thành" : "Chờ"}
                          </span>
                          
                          <Link
                            href={
                              isGroup
                                ? `/general-manager/production-approval?prodId=${cmd.prod_id}`
                                : `/general-manager/production-approval?orderId=${cmd.order_id}`
                            }
                            className="bg-amber-900 hover:bg-amber-955 text-white px-2.5 py-1 rounded-md text-[10px] font-bold shadow-sm transition"
                          >
                            Điều Hành
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CRITICAL MATERIAL WARNINGS */}
          {activeTab === "materials" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-bold text-amber-955">Danh sách nguyên vật liệu thiếu hụt</h3>
                  <p className="text-[11px] text-gray-400">Các tài nguyên hiện đang có số lượng thấp hơn định mức cần thiết để sản xuất các đơn hàng đã duyệt</p>
                </div>
                {missingMaterialsData.length > 0 && (
                  <Link
                    href="/general-manager/purchase"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow flex items-center gap-1 transition active:scale-95 animate-none"
                  >
                    <FiShoppingCart className="w-3.5 h-3.5" />
                    Đặt vật tư ngay
                  </Link>
                )}
              </div>

              {missingMaterialsData.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                  <FiCheckCircle className="w-10 h-10 mx-auto mb-2 text-green-500" />
                  <p className="font-semibold text-gray-600 text-xs">Tuyệt vời! Kho không thiếu nguyên vật liệu</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {missingMaterialsData.map((item: any, idx: number) => {
                    const required = item.quantity || 0;
                    const stock = item.available || 0;
                    
                    return (
                      <div
                        key={`${item.material_id}-${idx}`}
                        className="bg-white rounded-lg border border-red-200 p-4 hover:shadow-sm transition-all duration-300 flex flex-col justify-between relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <div>
                              <span className="text-[9px] font-bold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">
                                Thiếu Hụt
                              </span>
                              <h4 className="font-bold text-gray-900 mt-1.5 line-clamp-2 text-xs">
                                {item.material_name}
                              </h4>
                              <p className="text-[10px] text-gray-405 mt-0.5">Mã: {item.material_id}</p>
                            </div>
                          </div>

                          {/* Quantities Detail grid */}
                          <div className="grid grid-cols-3 gap-1.5 mt-3 text-center text-[10px]">
                            <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-lg">
                              <p className="text-[8px] font-bold text-gray-400 uppercase">Tồn Kho</p>
                              <p className="font-bold text-gray-800 mt-0.5 truncate">{Math.round(stock).toLocaleString("vi-VN")} {item.unit}</p>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-1.5 rounded-lg">
                              <p className="text-[8px] font-bold text-red-500 uppercase">Cần Mua</p>
                              <p className="font-bold text-red-600 mt-0.5 truncate">{Math.round(required).toLocaleString("vi-VN")} {item.unit}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-100 p-1.5 rounded-lg">
                              <p className="text-[8px] font-bold text-amber-600 uppercase">Ngày Cần</p>
                              <p className="font-bold text-amber-700 mt-0.5 truncate">{item.request_date ? new Date(item.request_date).toLocaleDateString("vi-VN") : "Hôm nay"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 pt-2 mt-3 flex items-center justify-between text-[10px]">
                          <span className="text-gray-450 font-semibold">Cảnh báo hệ thống</span>
                          <Link
                            href={`/general-manager/purchase?search=${item.material_name}`}
                            className="text-blue-650 hover:text-blue-850 font-bold flex items-center gap-0.5 transition-colors"
                          >
                            Xử lý đặt hàng <BiChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
