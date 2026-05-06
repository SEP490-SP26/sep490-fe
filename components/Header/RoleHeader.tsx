"use client";

import React from "react";
import { Avatar, Dropdown } from "antd";
import { UserOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { useNotifications } from "@/hooks/useNotifications";

interface RoleHeaderProps {
  userInfo?: {
    name: string;
    role: string;
    avatar?: string;
  };
  onLogout?: () => void;
  onNavigateToRequest?: (requestId: number, status?: string | null) => void;
  accessToken?: string;
  className?: string;
  theme?: "default" | "purple" | "blue" | "amber";
}

const HUB_URL = "https://mmes-sep490-84gr.onrender.com/hubs/realtime";
//const HUB_URL = "https://localhost:7109/hubs/realtime";
export default function RoleHeader({
  userInfo,
  onLogout,
  onNavigateToRequest,
  accessToken,
  className = "",
  theme = "default",
}: RoleHeaderProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [localUser, setLocalUser] = React.useState<any>(null);

  React.useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY < 10);
    window.addEventListener("scroll", handleScroll, { passive: true });

    try {
      const stored = localStorage.getItem("user");
      if (stored) setLocalUser(JSON.parse(stored));
    } catch (err) { }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications({
    hubUrl: HUB_URL,
    role: userInfo?.role ?? "",          // ← bắt buộc, dùng để filter
    roleId: localUser?.role_id,
    userId: localUser?.user_id,
    accessToken,
    onNewNotification: (n) => {
      // Tích hợp toast tại đây, ví dụ với sonner:
      // toast.info(n.message, { description: n.title });
      console.log("[Notification]", n);
    },
  });

  const menuItems = [
    { key: "profile", label: "Hồ sơ cá nhân", icon: <UserOutlined /> },
    { key: "settings", label: "Cài đặt", icon: <SettingOutlined /> },
    { type: "divider" as const },
    { key: "logout", label: "Đăng xuất", icon: <LogoutOutlined />, danger: true, onClick: onLogout },
  ];

  const isPurple = theme === "purple";
  const isBlue = theme === "blue";
  const isAmber = theme === "amber";
  const isDarkTheme = isPurple || isBlue || isAmber;
  
  const headerBgClass = isPurple 
    ? "bg-purple-900 text-white border-purple-800" 
    : isBlue
      ? "bg-blue-900 text-white border-blue-800"
      : isAmber
        ? "bg-amber-900 text-white border-amber-800"
        : "bg-white/80 backdrop-blur-md border-gray-100 text-gray-800";

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b
        px-6 py-3 flex justify-between items-center shadow-sm
        transition-all duration-500 ease-in-out
        ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}
        ${headerBgClass} ${className}`}
    >
      <div />

      <div className="flex items-center gap-6">
        <NotificationPanel
          notifications={notifications}
          unreadCount={unreadCount}
          connected={connected}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClearAll={clearAll}
          onNavigate={onNavigateToRequest}
          theme={theme}
        />

        <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
          <div className={`flex items-center gap-3 cursor-pointer group py-1 px-2 rounded-lg transition-all duration-200 ${isPurple ? 'hover:bg-purple-800' : isBlue ? 'hover:bg-blue-800' : isAmber ? 'hover:bg-amber-800' : 'hover:bg-gray-50'}`}>
            <div className="text-right hidden sm:block">
              <p className={`text-sm font-semibold leading-tight transition-colors ${isDarkTheme ? 'text-white' : 'text-gray-800 group-hover:text-primary'}`}>
                {localUser?.full_name || userInfo?.name || "Người dùng"}
              </p>
              <p className={`text-[11px] uppercase tracking-wider font-medium mt-0.5 ${isDarkTheme ? 'text-gray-200' : 'text-gray-400'}`}>
                {userInfo?.role || "Công ty in ấn"}
              </p>
            </div>
            <Avatar
              size="default"
              src={userInfo?.avatar}
              icon={!userInfo?.avatar && <UserOutlined />}
              className={isPurple 
                ? "bg-purple-800 text-white border border-purple-700" 
                : isBlue 
                  ? "bg-blue-800 text-white border border-blue-700" 
                  : isAmber
                    ? "bg-amber-800 text-white border border-amber-700"
                    : "bg-primary/10 text-primary border border-primary/20"}
            />
          </div>
        </Dropdown>
      </div>
    </header>
  );
}