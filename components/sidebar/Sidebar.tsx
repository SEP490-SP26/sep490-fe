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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      collapsed ? "5rem" : "18rem"
    );
    return () => {
      document.documentElement.style.removeProperty("--sidebar-width");
    };
  }, [collapsed]);

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
      className={`fixed left-0 top-0 h-full transition-all duration-300 ease-in-out ${
        collapsed ? "w-20" : width
      } border-r border-white/10 shadow-sm flex flex-col z-50 ${className || "bg-slate-900"}`}
    >
      {/* Toggle Button - Floating on Border */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-9 z-50 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center shadow-md text-gray-300 hover:text-white hover:border-white transition-colors cursor-pointer"
        title={collapsed ? "Mở rộng" : "Thu gọn"}
      >
        {collapsed ? <span className="text-[10px]">&gt;</span> : <span className="text-[10px]">&lt;</span>}
      </button>

      {/* Logo */}
      <div className={`pt-4 pb-2 flex items-center transition-all duration-300 ${collapsed ? "justify-center" : "justify-start px-6"}`}>
        <Link href="/" className="flex items-center justify-start w-full overflow-hidden whitespace-nowrap">
          {!collapsed ? (
            <img src="/assets/images/logo_removed.png" alt="Logo" className="h-[80px] w-auto object-contain transition-all duration-300" />
          ) : (
            <img src="/assets/images/logo_removed.png" alt="Icon" className="w-[44px] h-[44px] object-contain transition-all duration-300 mx-auto" />
          )}
        </Link>
      </div>

      {/* Header removed as it is now in RoleHeader */}
      {!collapsed && headerContent}

      {/* Navigation */}
      <nav className={`${collapsed ? "px-3" : "px-4"} py-6 flex-1 overflow-y-auto`}>
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
                className={`group relative flex items-center gap-3 ${
                  collapsed ? "px-3" : "px-4"
                } py-3 mb-2 rounded-lg transition-all duration-200 ${isActive
                  ? "bg-white/20 text-white shadow-lg border-l-4 border-white font-semibold"
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                onClick={() => handleItemClick(item)}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-300 ${isActive ? "text-white" : "text-gray-400"} ${
                    collapsed ? "scale-110" : "group-hover:scale-110"
                  }`}
                />
                <span
                  className={`font-medium transition-all duration-300 origin-left ${isActive ? "text-white" : ""} ${
                    collapsed ? "opacity-0 w-0 translate-x-[-10px] overflow-hidden" : "opacity-100 w-auto translate-x-0"
                  }`}
                >
                  {item.label}
                </span>

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
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
              className="group relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left text-gray-300 hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
            >
              <Icon className="w-5 h-5 text-red-400 transition-all duration-300 group-hover:scale-110" />
              <span className={`font-medium text-red-400 transition-all duration-300 origin-left ${
                collapsed ? "opacity-0 w-0 translate-x-[-10px] overflow-hidden" : "opacity-100 w-auto translate-x-0"
              }`}>
                {logoutItem.label}
              </span>

              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {logoutItem.label}
                </div>
              )}
            </button>
          </div>
        );
      })()}

      {!collapsed && footerContent}
    </div>
  );
}
