import Link from 'next/link';
import React from 'react'
import { BiCalendar, BiPackage } from 'react-icons/bi';
import { FaShoppingCart, FaWarehouse } from 'react-icons/fa';
import { LuLayoutDashboard } from 'react-icons/lu';

export default function layout({ children }: { children: React.ReactNode }) {
     const navItems = [
    {
      path: "/",
      label: "Dashboard",
      icon: LuLayoutDashboard,
    },
    { path: "/orders", label: "Đơn hàng", icon: FaShoppingCart },
    { path: "/purchase", label: "Mua hàng", icon: BiPackage },
    // {
    //   path: "/procurement",
    //   label: "QL và theo dõi NVL",
    //   icon: Calendar,
    // },
    {
      path: "/production",
      label: "Sản xuất",
      icon: BiCalendar,
    },
    { path: "/inventory", label: "Kho", icon: FaWarehouse },
  ];
  return (
     <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-blue-600">
            Quản lý Sản xuất
          </h1>
        </div>

        <nav className="px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = false; // You can implement active state logic here

            return (
              <Link href={"/admin" + item.path}
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
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">{children}</main>
    </div>
  )
}
