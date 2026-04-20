/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { IconType } from "react-icons";
import { BellOutlined } from "@ant-design/icons";

export interface NavItem {
  path: string;
  label: string;
  icon: IconType;
  basePath?: string; // Đường dẫn base cho nhóm route
  exact?: boolean; // Chính xác tuyệt đối hay không
  isLogout?: boolean; // Có phải nút logout không
}

export interface SidebarProps {
  // Thông tin user
  userInfo?: {
    name: string;
    role: string;
    avatar?: string;
  };

  // Danh sách menu items
  navItems: NavItem[];

  // Custom styles
  className?: string;
  width?: string;
  accentColor?: string;
  primaryColor?: string;

  // Callback events
  onLogout?: () => void;
  onItemClick?: (item: NavItem) => void;

  // Custom rendering
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export default function Sidebar({
  userInfo,
  navItems,
  className = "",
  width = "w-72",
  accentColor = "accent",
  primaryColor = "primary",
  onLogout,
  onItemClick,
  headerContent,
  footerContent,
}: SidebarProps) {
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("");

  // Thay thế useEffect với logic đơn giản hơn
  useEffect(() => {
    const findActiveItem = () => {
      // Tạo map của các item không phải logout
      const items = navItems.filter((item) => !item.isLogout);

      // Ưu tiên: tìm exact match trước
      for (const item of items) {
        const fullPath = item.basePath
          ? `${item.basePath}${item.path}`
          : item.path;
        if (pathname === fullPath) {
          return item;
        }
      }

      // Nếu không có exact match, tìm startsWith (ưu tiên đường dẫn dài nhất)
      let bestMatch = null;
      let bestMatchLength = 0;

      for (const item of items) {
        const fullPath = item.basePath
          ? `${item.basePath}${item.path}`
          : item.path;

        if (pathname?.startsWith(fullPath)) {
          // Kiểm tra thêm: nếu item có path rỗng (trang chủ), chỉ match khi exact
          if (item.path === "" && pathname !== fullPath) {
            continue;
          }

          // Chọn match dài nhất
          if (fullPath.length > bestMatchLength) {
            bestMatch = item;
            bestMatchLength = fullPath.length;
          }
        }
      }

      return bestMatch;
    };

    const matchedItem = findActiveItem();
    if (matchedItem) {
      setActiveItem(matchedItem.label);
    }
  }, [pathname, navItems]);
  const handleItemClick = (item: NavItem) => {
    if (onItemClick) {
      onItemClick(item);
    }

    if (!item.isLogout) {
      setActiveItem(item.label);
    }
  };

  const handleLogout = (item: NavItem) => {
    if (onLogout) {
      onLogout();
    }
    handleItemClick(item);
  };

  return (
    <div
      className={`fixed left-0 top-0 h-full ${width} border-r border-white/10 shadow-sm flex flex-col ${className || "bg-slate-900"}`}
    >
      {/* Logo */}
      <div className="pt-4 pb-2">
        <Link href="/" className="flex items-center gap-3 group transition-all duration-300">
          <img src="/assets/images/logo_removed.png" alt="Logo" className="h-[80px] w-auto object-contain transition-all duration-300" />
        </Link>
      </div>

      {/* Header removed as it is now in RoleHeader */}
      {headerContent}

      {/* Navigation */}
      <nav className="px-4 py-6 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isLogout =
            item.isLogout || item.label.toLowerCase().includes("đăng xuất");

          if (isLogout) return null;

          const Icon = item.icon;
          const isActive = activeItem === item.label;

          // Xây dựng href
          let href = item.path;
          if (item.basePath) {
            href = `${item.basePath}${item.path}`;
          }

          return (
            <div key={item.label}>
              <Link
                href={href}
                className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${isActive
                  ? "bg-white/20 text-white shadow-lg border-l-4 border-white font-semibold"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                onClick={() => handleItemClick(item)}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`}
                />
                <span
                  className={`font-medium ${isActive ? "text-white" : ""}`}
                >
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      {(() => {
        const logoutItem = navItems.find((item) => item.isLogout || item.label.toLowerCase().includes("đăng xuất"));
        if (!logoutItem) return null;

        const Icon = logoutItem.icon;
        return (
          <div className="p-4 border-t border-white/10 mt-auto">
            <button
              onClick={() => handleLogout(logoutItem)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left text-gray-300 hover:bg-red-500/10 hover:text-red-400"
            >
              <Icon className="w-5 h-5 text-red-400" />
              <span className="font-medium text-red-400">{logoutItem.label}</span>
            </button>
          </div>
        );
      })()}

      {footerContent}
    </div>
  );
}
