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
  FiCalendar,
} from "react-icons/fi";
import { LuLayoutDashboard } from "react-icons/lu";
import { FaSuitcase, FaUserPlus, FaWarehouse } from "react-icons/fa";
import { NavItem } from "./Sidebar";
import { TbTruckDelivery } from "react-icons/tb";

// Preset cho Designer
export const designerNavItems: NavItem[] = [
  {
    path: "/requests",
    label: "Yêu cầu đã duyệt",
    icon: FiList,
    basePath: "/designer",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

// Preset cho Consultant
export const consultantNavItems: NavItem[] = [
  {
    path: "/",
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
  {
    path: "/delivery",
    label: "Vận chuyển",
    icon: TbTruckDelivery ,
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
    path: "/",
    label: "Quản lý user",
    icon: LuLayoutDashboard,
    basePath: "/admin",
    // exact: true,
  },
  // {
  //   path: "/admin-create-account",
  //   label: "Tạo mới tài khoản",
  //   icon: FaUserPlus,
  //   basePath: "/admin",
  // },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

// Preset cho Staff
export const staffNavItems: NavItem[] = [
  {
    path: "/",
    label: "Lịch Sản Xuất",
    icon: FiCalendar,
    basePath: "/staff",
  },
  {
    path: "/finish-production",
    label: "Đã hoàn thành sản xuất",
    icon: FaSuitcase,
    basePath: "/staff",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

export const productionsManagerNavItems: NavItem[] = [
  {
    path: "/schedule",
    label: "Lịch sản xuất",
    icon: FiCalendar,
    basePath: "/productions-manager",
    // exact: true,
  },
  {
    path: "/",
    label: "Đơn đã lên lịch",
    icon: FiCalendar,
    basePath: "/productions-manager",
  },
  {
    path: "/finish-production",
    label: "Đơn đã hoàn thành sản xuất",
    icon: FaSuitcase,
    basePath: "/productions-manager",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

// Preset cho Warehouse
export const warehouseNavItems: NavItem[] = [
  {
    path: "/inventory",
    label: "Nhập kho",
    icon: FaWarehouse,
    basePath: "/warehouse",
  },
  {
    path: "/stock",
    label: "Tồn kho NVL",
    icon: FiPackage,
    basePath: "/warehouse",
  },
  // {
  //   path: "/purchase",
  //   label: "Đặt nguyên vật liệu",
  //   icon: FiList,
  //   basePath: "/warehouse",
  // },
  {
    path: "/delivery",
    label: "Vận chuyển",
    icon: TbTruckDelivery,
    basePath: "/warehouse",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
];

export const materialsNavItems: NavItem[] = [
  {
    path: "",
    label: "Đặt mua nguyên vật liệu",
    icon: FaWarehouse,
    basePath: "/materials-manager",
  },
  {
    path: "/",
    label: "Đăng xuất",
    icon: FiLogOut,
    isLogout: true,
  },
]
;

// Preset cho General Manager
export const generalManagerNavItems: NavItem[] = [
  {
    path: "/materials",
    label: "Quản lý nguyên vật liệu",
    icon: FaWarehouse,
    basePath: "/general-manager",
  },
  {
    path: "/machines",
    label: "Quản lý máy móc",
    icon: FiSettings,
    basePath: "/general-manager",
  },
  {
    path: "/production-approval",
    label: "Duyệt lệnh sản xuất",
    icon: FiList,
    basePath: "/general-manager",
  },
  {
    path: "/purchase",
    label: "Mua nguyên vật liệu",
    icon: FiShoppingCart,
    basePath: "/general-manager",
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
    path: "/requests-processing",
    label: "Yêu cầu cần được duyệt",
    icon: FiList,
    basePath: "/manager",
  },
  {
    path: "/requests",
    label: "Danh sách yêu cầu",
    icon: FiList,
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
