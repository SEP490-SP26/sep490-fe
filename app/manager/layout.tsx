"use client";
import Footer from "@/components/Footer/Footer";
import { managerNavItems } from "@/components/sidebar/presets";
import Sidebar from "@/components/sidebar/Sidebar";
import { useRouter } from "next/navigation";
import React from "react";
import { BiCalendarCheck, BiLogOut, BiPackage } from "react-icons/bi";
import { LuLayoutDashboard } from "react-icons/lu";

export default function LayoutManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const navItems = [
    {
      path: "/manager",
      label: "Dashboard",
      icon: LuLayoutDashboard,
    },
    // {
    //   path: "/manager/orders/pending",
    //   label: "Đơn hàng chờ duyệt",
    //   icon: BiNotepad,
    // },
    { path: "/manager/orders", label: "Đơn hàng", icon: BiCalendarCheck },

    { path: "/manager/purchase", label: "Mua hàng", icon: BiPackage },
    // {
    //   path: "/production",
    //   label: "Sản xuất",
    //   icon: BiCalendar,
    // },
    {
      path: "/",
      label: "Đăng xuất",
      icon: BiLogOut,
    },
  ];

  return (
    <div className="bg-gray-50">
      {/* Sidebar */}
      {/* <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-blue-600 text-2xl font-semibold">Quản lý </h1>
        </div>

        <nav className="px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = false; // You can implement active state logic here

            return (
              <Link
                href={item.path}
                key={item.path}
                className={`flex items-center gap-3 px-4 py-3 mb-1 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside> */}

      <Sidebar
        className="bg-blue-900 text-white"
        userInfo={{
          name: "Quản Lý",
          role: "Công ty in ấn",
        }}
        navItems={[...managerNavItems]}
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          document.cookie =
            "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          router.push("/management-login");
        }}
        onItemClick={(item) => {
          // Xử lý khi click vào item
          console.log("Item clicked:", item.label);
        }}
      />

      {/* Content wrapper (bù khoảng sidebar fixed) */}
      <div className="ml-72 min-h-screen flex flex-col">
        {/* Main content */}
        <main className="flex-1 p-6">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
