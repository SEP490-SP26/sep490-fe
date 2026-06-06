"use client";
import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import * as signalR from "@microsoft/signalr";

ChartJS.register(ArcElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement);

const STATUSES: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  Processing: { label: "Chờ duyệt", color: "#3b82f6", bg: "#eff6ff", desc: "Consultant gửi lên" },
  Verified: { label: "Đã duyệt", color: "#22c55e", bg: "#f0fdf4", desc: "Chờ gửi khách hàng" },
  Waiting: { label: "Chờ đặt cọc", color: "#f59e0b", bg: "#fffbeb", desc: "Đợi khách xác nhận" },
  Rejected: { label: "Khách từ chối", color: "#ef4444", bg: "#fef2f2", desc: "Từ chối đặt cọc" },
};
const KEYS = ["Processing", "Verified", "Waiting", "Rejected"];

const ROLE_MAP: Record<number, string> = {
  1: "Admin",
  2: "Consultant",
  3: "Manager",
  4: "Warehouse",
  5: "Customer",
  6: "Productions manager",
  7: "Staff",
  8: "General Manager",
};

const ROLE_COLOR: Record<string, string> = {
  Admin: "bg-red-50 text-red-600 border-red-100",
  Consultant: "bg-blue-50 text-blue-600 border-blue-100",
  Manager: "bg-purple-50 text-purple-600 border-purple-100",
  Warehouse: "bg-orange-50 text-orange-600 border-orange-100",
  Staff: "bg-green-50 text-green-600 border-green-100",
  "General Manager": "bg-amber-50 text-amber-600 border-amber-100",
};

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [prodOrders, setProdOrders] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [machineSnapshot, setMachineSnapshot] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<"requests" | "orders" | "machines" | "employees">("requests");

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");

  const getOrderDate = (o: any) => {
    const dateStr = o.order_request_date || o.request_date || o.created_at || o.created_date;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const getProdOrderDate = (o: any) => {
    const dateStr = o.order_date || o.created_at || o.created_date;
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    orders.forEach((o) => {
      const date = getOrderDate(o);
      if (date) {
        yearsSet.add(date.getFullYear());
      }
    });
    prodOrders.forEach((o) => {
      const date = getProdOrderDate(o);
      if (date) {
        yearsSet.add(date.getFullYear());
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear());
    }
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [orders, prodOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const date = getOrderDate(o);
      if (!date) return selectedYear === "all" && selectedMonth === "all" && selectedQuarter === "all";

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const quarter = Math.ceil(month / 3);

      if (selectedYear !== "all" && year.toString() !== selectedYear) {
        return false;
      }
      if (selectedMonth !== "all" && month.toString() !== selectedMonth) {
        return false;
      }
      if (selectedQuarter !== "all" && quarter.toString() !== selectedQuarter) {
        return false;
      }
      return true;
    });
  }, [orders, selectedYear, selectedMonth, selectedQuarter]);

  const filteredProdOrders = useMemo(() => {
    return prodOrders.filter((o) => {
      const date = getProdOrderDate(o);
      if (!date) return selectedYear === "all" && selectedMonth === "all" && selectedQuarter === "all";

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const quarter = Math.ceil(month / 3);

      if (selectedYear !== "all" && year.toString() !== selectedYear) {
        return false;
      }
      if (selectedMonth !== "all" && month.toString() !== selectedMonth) {
        return false;
      }
      if (selectedQuarter !== "all" && quarter.toString() !== selectedQuarter) {
        return false;
      }
      return true;
    });
  }, [prodOrders, selectedYear, selectedMonth, selectedQuarter]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    if (e.target.value !== "all") {
      setSelectedQuarter("all");
    }
  };

  const handleQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedQuarter(e.target.value);
    if (e.target.value !== "all") {
      setSelectedMonth("all");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Requests (Yêu cầu báo giá)
      const resReqs = await fetch(
        "https://mmes-sep490.onrender.com/api/Requests/paged?page=1&pageSize=500"
      );
      const dataReqs = await resReqs.json();
      setOrders((dataReqs.data || []).filter((o: any) => o.product_name));

      // Fetch Production Orders (Đơn hàng sản xuất)
      const resOrders = await fetch(
        "https://mmes-sep490.onrender.com/api/Orders/paged?page=1&pageSize=500"
      );
      const dataOrders = await resOrders.json();
      setProdOrders(dataOrders.data || []);

      // Fetch Machines
      try {
        const resMachines = await fetch(
          "https://mmes-sep490.onrender.com/api/Machine/get-all-machines"
        );
        const dataMachines = await resMachines.json();
        setMachines(Array.isArray(dataMachines) ? dataMachines : (dataMachines.data || []));
      } catch (err) {
        console.error("Lỗi fetch machines:", err);
      }

      // Fetch Machine Snapshot
      try {
        const resSnapshot = await fetch(
          "https://mmes-sep490.onrender.com/api/Machine/availability-snapshot"
        );
        const dataSnapshot = await resSnapshot.json();
        setMachineSnapshot(dataSnapshot || null);
      } catch (err) {
        console.error("Lỗi fetch snapshot:", err);
      }

      // Fetch Employees
      try {
        const token = localStorage.getItem("token");
        const resUsers = await fetch(
          "https://mmes-sep490.onrender.com/get-all-user",
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        const dataUsers = await resUsers.json();
        if (Array.isArray(dataUsers)) {
          setEmployees(dataUsers.filter((u: any) => u.role_id !== 5));
        }
      } catch (err) {
        console.error("Lỗi fetch users:", err);
      }
    } catch (e) {
      console.error("Lỗi fetch dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://mmes-sep490.onrender.com/hubs/realtime", {
        accessTokenFactory: () => localStorage.getItem("token") || "",
      })
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        console.log("SignalR Connected");

        connection.on("processing", (data) => {
          console.log("processing", data);

          // reload UI
          fetchData();
        });

        connection.on("update-ui", (data) => {


          fetchData();
        });

        connection.on("consultantCreateRequest", (data) => {


          fetchData();
        });
      })
      .catch((err) => console.error("SignalR error:", err));

    return () => {
      connection.stop();
    };
  }, []);

  // ── Định nghĩa trạng thái và màu sắc đơn sản xuất ──
  const PROD_STATUSES: Record<string, { label: string; color: string; bg: string }> = {
    LayoutPending: { label: "Chờ duyệt layout", color: "#f59e0b", bg: "#fffbeb" },
    Scheduled: { label: "Đã lên lịch", color: "#3b82f6", bg: "#eff6ff" },
    InProcessing: { label: "Đang sản xuất", color: "#8b5cf6", bg: "#f5f3ff" },
    Completed: { label: "Hoàn thành", color: "#22c55e", bg: "#f0fdf4" },
    Cancelled: { label: "Đã hủy", color: "#ef4444", bg: "#fef2f2" },
  };
  const PROD_KEYS = ["LayoutPending", "Scheduled", "InProcessing", "Completed", "Cancelled"];

  // ── Tính KPI Requests ──
  const counts: Record<string, number> = {};
  KEYS.forEach((k) => { counts[k] = 0; });

  filteredOrders.forEach((o: any) => {
    const s = o.process_status?.toLowerCase();
    if (!s) return;
    if (s === "processing" || s === "pending") {
      counts["Processing"]++;
    } else {
      counts["Verified"]++;
      if (s === "waiting") {
        counts["Waiting"]++;
      } else if (s === "rejected" || s === "cancel" || s === "declined") {
        counts["Rejected"]++;
      }
    }
  });

  const total = counts["Processing"] + counts["Verified"];

  // ── Đã đặt cọc (Accepted) ──
  const depositedOrders = filteredOrders.filter((o: any) => o.process_status?.toLowerCase() === "accepted");
  const depositedCount = depositedOrders.length;

  // ── Donut chart Requests ──
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

  // ── Line chart Requests ──
  const requestLineData = useMemo(() => {
    let labels: string[] = [];
    let dataCounts: number[] = [];

    if (selectedYear === "all") {
      const yearCounts: Record<string, number> = {};
      filteredOrders.forEach((o: any) => {
        const d = getOrderDate(o);
        if (d) {
          const y = d.getFullYear().toString();
          yearCounts[y] = (yearCounts[y] || 0) + 1;
        }
      });
      labels = Object.keys(yearCounts).sort();
      dataCounts = labels.map((l) => yearCounts[l]);
    } else if (selectedMonth !== "all") {
      const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
      const dayCounts: Record<string, number> = {};
      for (let i = 1; i <= daysInMonth; i++) dayCounts[i.toString()] = 0;

      filteredOrders.forEach((o: any) => {
        const d = getOrderDate(o);
        if (d) {
          const day = d.getDate().toString();
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      });
      labels = Object.keys(dayCounts).sort((a, b) => parseInt(a) - parseInt(b));
      dataCounts = labels.map((l) => dayCounts[l]);
    } else {
      const monthCounts: Record<string, number> = {};
      for (let i = 1; i <= 12; i++) monthCounts[i.toString()] = 0;

      filteredOrders.forEach((o: any) => {
        const d = getOrderDate(o);
        if (d) {
          const m = (d.getMonth() + 1).toString();
          monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
      });
      const sortedMonths = Object.keys(monthCounts).sort((a, b) => parseInt(a) - parseInt(b));
      labels = sortedMonths.map(m => `Tháng ${m}`);
      dataCounts = sortedMonths.map(m => monthCounts[m]);
    }

    return {
      labels,
      datasets: [
        {
          label: "Số lượng yêu cầu",
          data: dataCounts,
          borderColor: "#8b5cf6",
          backgroundColor: "#8b5cf680",
          tension: 0.4,
        }
      ]
    };
  }, [filteredOrders, selectedYear, selectedMonth]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  // ── Tính KPI Production Orders ──
  const prodCounts: Record<string, number> = {};
  PROD_KEYS.forEach((k) => { prodCounts[k] = 0; });

  filteredProdOrders.forEach((o: any) => {
    const s = o.status;
    if (!PROD_KEYS.includes(s)) return;
    prodCounts[s]++;
  });

  const totalProd = PROD_KEYS.reduce((s, k) => s + prodCounts[k], 0);

  const totalQuantity = useMemo(() => {
    return filteredProdOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
  }, [filteredProdOrders]);

  // ── Donut chart Production Orders ──
  const prodDonutData = {
    labels: PROD_KEYS.map((k) => PROD_STATUSES[k].label),
    datasets: [{
      data: PROD_KEYS.map((k) => prodCounts[k]),
      backgroundColor: PROD_KEYS.map((k) => PROD_STATUSES[k].color),
      borderWidth: 2,
      borderColor: "#ffffff",
    }],
  };
  const prodDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.label}: ${ctx.raw} đơn` } },
    },
  };

  // ── Line chart Production Orders ──
  const prodLineData = useMemo(() => {
    let labels: string[] = [];
    let dataCounts: number[] = [];

    if (selectedYear === "all") {
      const yearCounts: Record<string, number> = {};
      filteredProdOrders.forEach((o: any) => {
        const d = getProdOrderDate(o);
        if (d) {
          const y = d.getFullYear().toString();
          yearCounts[y] = (yearCounts[y] || 0) + 1;
        }
      });
      labels = Object.keys(yearCounts).sort();
      dataCounts = labels.map((l) => yearCounts[l]);
    } else if (selectedMonth !== "all") {
      const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
      const dayCounts: Record<string, number> = {};
      for (let i = 1; i <= daysInMonth; i++) dayCounts[i.toString()] = 0;

      filteredProdOrders.forEach((o: any) => {
        const d = getProdOrderDate(o);
        if (d) {
          const day = d.getDate().toString();
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      });
      labels = Object.keys(dayCounts).sort((a, b) => parseInt(a) - parseInt(b));
      dataCounts = labels.map((l) => dayCounts[l]);
    } else {
      const monthCounts: Record<string, number> = {};
      for (let i = 1; i <= 12; i++) monthCounts[i.toString()] = 0;

      filteredProdOrders.forEach((o: any) => {
        const d = getProdOrderDate(o);
        if (d) {
          const m = (d.getMonth() + 1).toString();
          monthCounts[m] = (monthCounts[m] || 0) + 1;
        }
      });
      const sortedMonths = Object.keys(monthCounts).sort((a, b) => parseInt(a) - parseInt(b));
      labels = sortedMonths.map(m => `Tháng ${m}`);
      dataCounts = sortedMonths.map(m => monthCounts[m]);
    }

    return {
      labels,
      datasets: [
        {
          label: "Số lượng đơn",
          data: dataCounts,
          borderColor: "#3b82f6",
          backgroundColor: "#3b82f680",
          tension: 0.4,
        }
      ]
    };
  }, [filteredProdOrders, selectedYear, selectedMonth]);

  // ── Tính toán số liệu Máy móc ──
  const availabilityMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (machineSnapshot?.machines && Array.isArray(machineSnapshot.machines)) {
      for (const lane of machineSnapshot.machines) {
        if (lane.process_code) {
          map[lane.process_code] = lane;
        }
      }
    }
    return map;
  }, [machineSnapshot]);

  const totalMachinesCount = useMemo(() => {
    return machines.reduce((sum, m) => sum + (m.quantity || 0), 0);
  }, [machines]);

  const freeMachinesCount = useMemo(() => {
    let count = 0;
    Object.values(availabilityMap).forEach((lane: any) => {
      count += (lane.free_now || 0);
    });
    return count;
  }, [availabilityMap]);

  const busyMachinesCount = useMemo(() => {
    let count = 0;
    Object.values(availabilityMap).forEach((lane: any) => {
      count += (lane.busy_now || 0);
    });
    return count;
  }, [availabilityMap]);

  // ── Tính toán số liệu Nhân viên ──
  const totalEmployees = employees.length;
  const activeEmployeesCount = useMemo(() => employees.filter((e) => e.is_active).length, [employees]);
  const lockedEmployeesCount = totalEmployees - activeEmployeesCount;

  const roleDistribution = useMemo(() => {
    const roles: Record<string, number> = {};
    employees.forEach((u) => {
      const name = ROLE_MAP[u.role_id] || "Staff";
      roles[name] = (roles[name] || 0) + 1;
    });
    return roles;
  }, [employees]);

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 mt-1">Tổng quan hoạt động sản xuất và báo giá</p>
        </div>

        {/* ── Bộ lọc Tháng, Quý, Năm ── */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-gray-150 shadow-sm w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider px-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 text-violet-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            Lọc theo:
          </div>

          {/* Lọc theo Năm */}
          <div className="relative min-w-[110px]">
            <select
              value={selectedYear}
              onChange={handleYearChange}
              className="w-full pl-3 pr-8 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">Tất cả Năm</option>
              {availableYears.map((year) => (
                <option key={year} value={year.toString()}>
                  Năm {year}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Lọc theo Quý */}
          <div className="relative min-w-[110px]">
            <select
              value={selectedQuarter}
              onChange={handleQuarterChange}
              className="w-full pl-3 pr-8 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">Tất cả Quý</option>
              <option value="1">Quý 1</option>
              <option value="2">Quý 2</option>
              <option value="3">Quý 3</option>
              <option value="4">Quý 4</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Lọc theo Tháng */}
          <div className="relative min-w-[120px]">
            <select
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full pl-3 pr-8 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
            >
              <option value="all">Tất cả Tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m.toString()}>
                  Tháng {m}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* Nút Xóa bộ lọc nhanh */}
          {(selectedYear !== "all" || selectedMonth !== "all" || selectedQuarter !== "all") && (
            <button
              onClick={() => {
                setSelectedYear("all");
                setSelectedMonth("all");
                setSelectedQuarter("all");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Đang tải dữ liệu...</div>
      ) : (
        <>
          {/* ── Tabs để chuyển đổi các Section hiển thị dữ liệu ── */}
          <div className="flex flex-wrap border-b border-gray-200 mb-6 w-full gap-y-1">
            <button
              onClick={() => setActiveSection("requests")}
              className={`py-3 px-5 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeSection === "requests"
                ? "border-violet-600 text-violet-600 font-extrabold"
                : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H9.75m4.5 15.75H15m-1.5-6H15m-1.5-3H15m-1.5-3H15M9 21v-1.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875V21m-9.75-11.25H8.25m0 0H8.25m0 0h-.008v-.008H8.25v.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Yêu Cầu Báo Giá ({filteredOrders.length})
            </button>
            <button
              onClick={() => setActiveSection("orders")}
              className={`py-3 px-5 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeSection === "orders"
                ? "border-violet-600 text-violet-600 font-extrabold"
                : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
              Đơn Hàng Sản Xuất ({filteredProdOrders.length})
            </button>
            <button
              onClick={() => setActiveSection("machines")}
              className={`py-3 px-5 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeSection === "machines"
                ? "border-violet-600 text-violet-600 font-extrabold"
                : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774a1.125 1.125 0 0 1 .12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738a1.125 1.125 0 0 1-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527a1.125 1.125 0 0 1-1.448-.12l-.774-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.774-.773a1.125 1.125 0 0 1 1.448-.12l.738.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Trạng Thái Máy Móc ({machines.length})
            </button>
            <button
              onClick={() => setActiveSection("employees")}
              className={`py-3 px-5 font-bold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${activeSection === "employees"
                ? "border-violet-600 text-violet-600 font-extrabold"
                : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m0 0a8.967 8.967 0 0 1-2.312-6.086c0-3.442 2.777-6.25 6.2-6.25 2.775 0 5.14 1.845 6.0 4.414m-11 5.822a11.963 11.963 0 0 0 4.053-1.393M9 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              </svg>
              Đội Ngũ Nhân Viên ({employees.length})
            </button>
          </div>

          {activeSection === "requests" && (
            <>
              {/* ── KPI Cards Yêu Cầu Báo Giá ── */}
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
                      {filteredOrders.length > 0 ? Math.round((depositedCount / filteredOrders.length) * 100) : 0}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-1">Khách đã xác nhận cọc</div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all duration-700"
                      style={{
                        width: `${filteredOrders.length > 0
                          ? Math.round((depositedCount / filteredOrders.length) * 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Charts row Requests ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-0.5">Tỉ lệ theo trạng thái</h2>
                  <div className="text-xs text-gray-400 mb-3">Phân bổ 4 nhóm quản lý</div>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1.5 mb-4">
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
                  <div className="relative mx-auto" style={{ height: 240 }}>
                    <Doughnut data={donutData} options={donutOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-0.5">Biểu đồ yêu cầu theo thời gian</h2>
                  <div className="text-xs text-gray-400 mb-3">Thống kê số lượng yêu cầu</div>
                  <div className="relative mx-auto flex flex-col justify-end" style={{ height: 280 }}>
                    <Line data={requestLineData} options={lineOptions} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === "orders" && (
            <>
              {/* ── KPI Cards Đơn Hàng Sản Xuất ── */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                {/* 4 status cards */}
                {PROD_KEYS.map((k) => {
                  const cfg = PROD_STATUSES[k];
                  const pct = totalProd > 0 ? Math.round((prodCounts[k] / totalProd) * 100) : 0;
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
                          {prodCounts[k]}
                        </div>
                        <div
                          className="text-sm font-bold rounded-lg px-2 py-1"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          {pct}%
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 mb-3">Đơn hàng ở trạng thái {cfg.label}</div>
                      <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: cfg.color }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Card tổng sản lượng */}
                {/* <div className="bg-white rounded-2xl p-5 border border-indigo-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-indigo-600">
                    Tổng sản lượng
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {totalQuantity.toLocaleString()}
                    </div>
                    <div className="text-sm font-bold rounded-lg px-2 py-1 text-indigo-600 bg-indigo-50">
                      SP
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Tổng số sản phẩm sản xuất</div>
                  <div className="h-1 rounded-full bg-indigo-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600 transition-all duration-700 w-full" />
                  </div>
                </div> */}
              </div>

              {/* ── Charts row Production Orders ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-0.5">Tỉ lệ theo trạng thái</h2>
                  <div className="text-xs text-gray-400 mb-3">Phân bổ 4 nhóm tiến trình sản xuất</div>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-1.5 mb-4">
                    {PROD_KEYS.map((k) => {
                      const pct = totalProd > 0 ? Math.round((prodCounts[k] / totalProd) * 100) : 0;
                      return (
                        <span key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <span
                            className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                            style={{ background: PROD_STATUSES[k].color }}
                          />
                          {PROD_STATUSES[k].label} {pct}%
                        </span>
                      );
                    })}
                  </div>
                  <div className="relative mx-auto" style={{ height: 240 }}>
                    <Doughnut data={prodDonutData} options={prodDonutOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-gray-900 mb-0.5">Biểu đồ đơn hàng theo thời gian</h2>
                  <div className="text-xs text-gray-400 mb-3">Thống kê số lượng đơn sản xuất</div>
                  <div className="relative mx-auto flex flex-col justify-end" style={{ height: 280 }}>
                    <Line data={prodLineData} options={lineOptions} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeSection === "machines" && (
            <>
              {/* ── KPI Cards Máy móc ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">
                    Phân nhóm máy móc
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {machines.length}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-gray-600 bg-gray-50">
                      Nhóm
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Các nhóm công đoạn chính</div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-400 w-full" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-blue-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-blue-600">
                    Tổng số thiết bị/dây chuyền
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {totalMachinesCount}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-blue-600 bg-blue-50">
                      Máy
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Tổng công suất hoạt động</div>
                  <div className="h-1 rounded-full bg-blue-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 w-full" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-green-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-green-600">
                    Dây chuyền đang rảnh
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {freeMachinesCount}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-green-600 bg-green-50">
                      Rảnh
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Sẵn sàng thực hiện lệnh mới</div>
                  <div className="h-1 rounded-full bg-green-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-700"
                      style={{
                        width: `${totalMachinesCount > 0 ? Math.round((freeMachinesCount / totalMachinesCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-amber-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-amber-600">
                    Dây chuyền đang bận
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {busyMachinesCount}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-amber-600 bg-amber-50">
                      Bận
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Đang chạy lệnh sản xuất</div>
                  <div className="h-1 rounded-full bg-amber-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-700"
                      style={{
                        width: `${totalMachinesCount > 0 ? Math.round((busyMachinesCount / totalMachinesCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Danh sách chi tiết thiết bị dạng thẻ sang trọng ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                {machines.map((m: any) => {
                  const lane = availabilityMap[m.process_code || ""];
                  const totalQty = m.quantity || 1;
                  const freeQty = lane ? lane.free_now : totalQty;
                  const busyQty = lane ? lane.busy_now : 0;
                  const busyPct = Math.round((busyQty / totalQty) * 100);

                  return (
                    <div key={m.process_code} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-extrabold uppercase bg-violet-50 text-violet-600 px-2 py-1 rounded-md border border-violet-100">
                            {m.process_code || "N/A"}
                          </span>
                          <h3 className="text-sm font-bold text-gray-900 mt-2">{m.process_name}</h3>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${freeQty > 0 ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                          {freeQty > 0 ? `Đang rảnh (${freeQty}/${totalQty})` : "Đầy tải (Busy)"}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs text-gray-500 mt-4 border-t pt-3 border-gray-50">
                        <div className="flex justify-between">
                          <span>Công suất ngày:</span>
                          <span className="font-semibold text-gray-800">{m.daily_capacity ? m.daily_capacity.toLocaleString() : 0} SP</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tỉ lệ bận tải:</span>
                          <span className="font-semibold text-gray-800">{busyPct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-violet-600 rounded-full" style={{ width: `${busyPct}%` }} />
                        </div>
                        {lane?.earliest_any_lane_free_at && (
                          <div className="flex justify-between pt-1">
                            <span>Thời điểm rảnh kế tiếp:</span>
                            <span className="font-bold text-amber-600 text-right">
                              {new Date(lane.earliest_any_lane_free_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(lane.earliest_any_lane_free_at).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeSection === "employees" && (
            <>
              {/* ── KPI Cards Nhân viên ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-2xl p-5 border border-gray-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">
                    Tổng số nhân viên
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {totalEmployees}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-gray-600 bg-gray-50">
                      Người
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Toàn bộ nhân sự doanh nghiệp</div>
                  <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gray-400 w-full" />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-emerald-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-emerald-600">
                    Đang hoạt động
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {activeEmployeesCount}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-emerald-600 bg-emerald-50">
                      Online
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Tài khoản đang mở hoạt động</div>
                  <div className="h-1 rounded-full bg-emerald-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${totalEmployees > 0 ? Math.round((activeEmployeesCount / totalEmployees) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-rose-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-rose-600">
                    Tài khoản đang khóa
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {lockedEmployeesCount}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-rose-600 bg-rose-50">
                      Locked
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Tài khoản tạm ngừng hoạt động</div>
                  <div className="h-1 rounded-full bg-rose-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500"
                      style={{ width: `${totalEmployees > 0 ? Math.round((lockedEmployeesCount / totalEmployees) * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-sky-200">
                  <div className="text-xs font-bold uppercase tracking-widest mb-2 text-sky-600">
                    Phân vai trò (Role)
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-4xl font-extrabold text-gray-900 leading-none">
                      {Object.keys(roleDistribution).length}
                    </div>
                    <div className="text-xs font-bold rounded-lg px-2 py-1 text-sky-600 bg-sky-50">
                      Nhóm
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-2 mb-3">Các phòng ban phân chia chính</div>
                  <div className="h-1 rounded-full bg-sky-100 overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500 w-full" />
                  </div>
                </div>
              </div>

              {/* ── Danh sách nhân sự dạng danh thiếp sang trọng ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                {employees.map((e: any) => {
                  const roleName = ROLE_MAP[e.role_id] || "Staff";
                  const initial = e.full_name ? e.full_name.charAt(0).toUpperCase() : (e.username ? e.username.charAt(0).toUpperCase() : "?");
                  const colors = [
                    "bg-blue-500 text-white", "bg-purple-500 text-white",
                    "bg-indigo-500 text-white", "bg-pink-500 text-white",
                    "bg-violet-500 text-white", "bg-teal-500 text-white"
                  ];
                  const colorIdx = (e.user_id || 0) % colors.length;
                  const avatarClass = colors[colorIdx];

                  return (
                    <div key={e.user_id} className="bg-white rounded-2xl border border-gray-150 p-5 shadow-sm hover:shadow-md transition-all flex gap-4 items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shadow-inner ${avatarClass}`}>
                        {initial}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 justify-between">
                          <h3 className="text-sm font-bold text-gray-900 truncate">{e.full_name || "(Chưa thiết lập tên)"}</h3>
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${e.is_active ? "bg-emerald-500" : "bg-rose-500"}`} title={e.is_active ? "Hoạt động" : "Bị khóa"} />
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">@{e.username}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{e.email || "Không có email"}</p>
                        <div className="mt-3">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${ROLE_COLOR[roleName] || "bg-gray-50 text-gray-600 border-gray-100"
                            }`}>
                            {roleName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}