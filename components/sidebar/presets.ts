import {
  FiLogOut,
  FiShoppingCart,
  FiPackage,
  FiList,
  FiUsers,
  FiBarChart2,
  FiSettings,
  FiHome,
  FiDollarSign,
  FiUser,
} from "react-icons/fi";
import { LuLayoutDashboard } from "react-icons/lu";
import { NavItem } from "./Sidebar";

// Preset cho Consultant
export const consultantNavItems: NavItem[] = [
  {
    path: "",
    label: "Tạo đơn hàng",
    icon: FiShoppingCart,
    basePath: "/consultant",
  },
  {
    path: "/requests",
    label: "Danh sách yêu cầu",
    icon: FiList,
    basePath: "/consultant",
  },
  // {
  //   path: "/history",
  //   label: "Quản Lý Đơn Hàng",
  //   icon: FiPackage,
  //   basePath: "/consultant",
  // },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

// Preset cho Admin
export const adminNavItems: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: FiHome,
    basePath: "/admin",
    exact: true,
  },
  {
    path: "/users",
    label: "Quản lý người dùng",
    icon: FiUsers,
    basePath: "/admin",
  },
  {
    path: "/orders",
    label: "Tất cả đơn hàng",
    icon: FiList,
    basePath: "/admin",
  },
  {
    path: "/reports",
    label: "Báo cáo",
    icon: FiBarChart2,
    basePath: "/admin",
  },
  {
    path: "/finance",
    label: "Tài chính",
    icon: FiDollarSign,
    basePath: "/admin",
  },
  {
    path: "/settings",
    label: "Cài đặt",
    icon: FiSettings,
    basePath: "/admin",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

//Peset cho manager
export const managerNavItems: NavItem[] = [
  {
    path: "",
    label: "Dashboard",
    icon: LuLayoutDashboard,
    basePath: "/manager",
    // exact: true,
  },
  {
    path: "/orders",
    label: "Danh sách đơn hàng",
    icon: FiPackage,
    basePath: "/manager",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];
// Preset cho Customer
export const customerNavItems: NavItem[] = [
  {
    path: "/profile",
    label: "Hồ sơ của tôi",
    icon: FiUser,
    basePath: "/customer",
    exact: true,
  },
  {
    path: "/orders",
    label: "Đơn hàng của tôi",
    icon: FiPackage,
    basePath: "/customer",
  },
  {
    path: "/look-up",
    label: "Lịch sử giao dịch",
    icon: FiList,
    basePath: "/customer",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];
