'use client";'
import Link from "next/link";
import React from "react";
import { FiLogOut, FiShoppingCart } from "react-icons/fi";

export default function layoutManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const navItems = [
    {
      path: "/",
      label: "Lịch Sản Xuất",
      icon: FiShoppingCart,
    },
    { path: "/", label: "Đăng xuất", icon: FiLogOut },
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-blue-600 text-xl font-semibold">Quản Lý In Ấn</h1>
        </div>

        <nav className="px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = false;

            return (
              <Link
                href={"/staff" + item.path}
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
  );
}
