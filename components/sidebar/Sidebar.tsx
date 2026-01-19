/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { IconType } from "react-icons";

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
      className={`fixed left-0 top-0 h-full ${width} bg-white border-r border-gray-200 shadow-sm ${className}`}
    >
      {/* Header */}
      {headerContent || (
        <div className="p-6 border-b border-gray-100">
          <h1
            className={`text-${primaryColor} font-heading text-xl font-semibold`}
          >
            {userInfo?.name}
          </h1>
          <p className="text-secondary text-sm mt-1">{userInfo?.role}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="px-4 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isLogout =
            item.isLogout || item.label.toLowerCase().includes("đăng xuất");
          const isActive = activeItem === item.label;

          // Xây dựng href
          let href = item.path;
          if (item.basePath && !isLogout) {
            href = `${item.basePath}${item.path}`;
          }

          return (
            <div key={item.label}>
              {isLogout ? (
                <button
                  onClick={() => handleLogout(item)}
                  className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all duration-200 w-full text-left text-accent hover:bg-accent/10 hover:text-accent mt-8 border-t border-gray-100 pt-4"
                >
                  <Icon className="w-5 h-5 text-accent" />
                  <span className="font-medium text-accent">{item.label}</span>
                </button>
              ) : (
                <Link
                  href={href}
                  className={`flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition-all duration-200 ${isActive
                      ? `bg-${primaryColor}/10 text-${primaryColor} shadow-lg shadow-${accentColor}/20 border-l-4 border-${accentColor} font-semibold`
                      : "text-gray-700 hover:bg-primary/5 hover:text-primary"
                    }`}
                  onClick={() => handleItemClick(item)}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? `text-${primaryColor}` : ""
                      }`}
                  />
                  <span
                    className={`font-medium ${isActive ? `text-${primaryColor}` : ""
                      }`}
                  >
                    {item.label}
                  </span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {footerContent}
    </div>
  );
}
