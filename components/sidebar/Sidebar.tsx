/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { FiLogOut, FiShoppingCart, FiPackage, FiList } from "react-icons/fi";

export default function Sidebar() {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("");

  const navItems = [
    {
      path: "",
      label: "Tạo đơn hàng",
      icon: FiShoppingCart,
    },
    {
      path: "/orders",
      label: "Danh sách đơn hàng",
      icon: FiList,
    },
    {
      path: "/history",
      label: "Quản Lý Đơn Hàng",
      icon: FiPackage,
    },
    {
      path: "/",
      label: "Đăng xuất",
      icon: FiLogOut,
    },
  ];

  // Tự động xác định active item dựa trên route
  useEffect(() => {
    const matchedItem = navItems.find(item => {
      if (item.path === "/") return pathname === "/";
      
      const itemPath = `/consultant${item.path}`;
      return pathname === itemPath || 
             (item.path !== "" && pathname?.startsWith(itemPath));
    });
    
    if (matchedItem) {
      setActiveItem(matchedItem.label);
    }
  }, [pathname]);

  return (
    <div className="fixed left-0 top-0 h-full w-72 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-primary font-heading text-xl font-semibold">Tư Vấn Viên A</h1>
        <p className="text-secondary text-sm mt-1">Công ty In Ấn</p>
      </div>

      <nav className="px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const href = item.path === "/" ? "/" : "/consultant" + item.path;
          const isLogout = item.path === "/";
          const isActive = activeItem === item.label;

          return (
            <Link
              href={href}
              key={item.label}
              className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${
                isLogout
                  ? "text-accent hover:bg-accent/10 hover:text-accent mt-8 border-t border-gray-100 pt-4"
                  : `text-gray-700 hover:bg-primary/5 hover:text-primary ${
                      isActive
                        ? "bg-primary/10 text-primary shadow-lg shadow-accent/20 border-l-4 border-accent font-semibold"
                        : ""
                    }`
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isLogout ? "text-accent" : isActive ? "text-primary" : ""
                }`}
              />
              <span
                className={`font-medium ${
                  isLogout ? "text-accent" : isActive ? "text-primary" : ""
                }`}
              >
                {item.label}
              </span>

            </Link>
          );
        })}
      </nav>
    </div>
  );
}