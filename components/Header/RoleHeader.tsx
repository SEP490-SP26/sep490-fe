"use client";

import React from "react";
import { Avatar, Badge, Space, Dropdown } from "antd";
import { BellOutlined, UserOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import { LuSearch } from "react-icons/lu";

interface RoleHeaderProps {
  userInfo?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
  className?: string;
}

export default function RoleHeader({
  userInfo,
  onLogout,
  className = "",
}: RoleHeaderProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const handleScroll = () => {
      // Hiện header khi ở gần đỉnh trang (scrollY < 10)
      setIsVisible(window.scrollY < 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    {
      key: "profile",
      label: "Hồ sơ cá nhân",
      icon: <UserOutlined />,
    },
    {
      key: "settings",
      label: "Cài đặt",
      icon: <SettingOutlined />,
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      danger: true,
      onClick: onLogout,
    },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-3 flex justify-between items-center shadow-sm transition-all duration-500 ease-in-out ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      } ${className}`}
    >
      {/* Left Section: Context/Search (Optional) */}
      <div className="flex items-center gap-4">
        
      </div>

      {/* Right Section: User & Notifications */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <Badge count={5} size="small" offset={[-2, 4]}>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-primary">
            <BellOutlined className="text-xl" />
          </button>
        </Badge>

        {/* User Profile */}
        <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
          <div className="flex items-center gap-3 cursor-pointer group hover:bg-gray-50 py-1 px-2 rounded-lg transition-all duration-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight group-hover:text-primary transition-colors">
                {userInfo?.name || "Người dùng"}
              </p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mt-0.5">
                {userInfo?.role || "Công ty in ấn"}
              </p>
            </div>
            <Avatar
              size="default"
              src={userInfo?.avatar}
              icon={!userInfo?.avatar && <UserOutlined />}
              className="bg-primary/10 text-primary border border-primary/20"
            />
          </div>
        </Dropdown>
      </div>
    </header>
  );
}
