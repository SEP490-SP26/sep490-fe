"use client";

import React, { useState } from "react";
import { Badge, Dropdown, Empty, Tooltip } from "antd";
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { AppNotification } from "@/hooks/useNotifications";
import { useRouter, usePathname } from "next/navigation";

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigate?: (requestId: number, status?: string | null) => void;
}

/* ─── Time ago ─────────────────────────────────────────────────────── */

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return date.toLocaleDateString("vi-VN");
}

/* ─── Single item ──────────────────────────────────────────────────── */

function NotificationItem({
  notification,
  onMarkAsRead,
  onNavigate,
  onCloseDropdown,
}: {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onNavigate?: (requestId: number, status?: string | null) => void;
  onCloseDropdown?: () => void;
}) {
  const handleClick = () => {
    if (!notification.read) onMarkAsRead(notification.id);
    // Always call onNavigate when available
    if (onNavigate) {
      onCloseDropdown?.();
      const navId = notification.requestId ?? (Number(notification.id) || 0);
      // Small delay to let dropdown close before navigation
      setTimeout(() => {
        onNavigate(navId, notification.action);
      }, 100);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group flex gap-3 px-4 py-3 cursor-pointer transition-all duration-150
        hover:bg-gray-50 border-b border-gray-50 last:border-0
        ${!notification.read ? "bg-blue-50/40" : ""}`}
    >
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-base">
        <BellOutlined className="text-blue-500" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] font-semibold text-gray-700 leading-tight">
            {notification.title}
          </span>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          )}
        </div>

        <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
          {notification.message}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-gray-400">
            {timeAgo(notification.timestamp)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Dropdown panel ─────────────────────────────────────────── */

function Panel({
  notifications,
  unreadCount,
  connected,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onNavigate,
  onCloseDropdown,
}: NotificationPanelProps & { onCloseDropdown?: () => void }) {
  return (
    <div className="w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">Thông báo</span>
          {unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <Tooltip title={connected ? "Đang kết nối realtime" : "Mất kết nối"}>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full cursor-default
              ${connected ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-green-500 animate-pulse" : "bg-red-400"
              }`}
            />
            {connected ? "Live" : "Offline"}
          </span>
        </Tooltip>
      </div>

      {/* Action bar */}
      {notifications.length > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50/60 border-b border-gray-100">
          <button
            onClick={onMarkAllAsRead}
            className="text-[11px] text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
          >
            <CheckOutlined className="text-[10px]" />
            Đánh dấu tất cả đã đọc
          </button>
          <button
            onClick={onClearAll}
            className="text-[11px] text-gray-400 hover:text-red-400 font-medium flex items-center gap-1 transition-colors"
          >
            <DeleteOutlined className="text-[10px]" />
            Xóa tất cả
          </button>
        </div>
      )}

      {/* List */}
      <div className="max-h-[360px] overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="py-10">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span className="text-xs text-gray-400">Chưa có thông báo nào</span>
              }
            />
          </div>
        ) : (
          notifications.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkAsRead={onMarkAsRead}
              onNavigate={onNavigate}
              onCloseDropdown={onCloseDropdown}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Exported bell button ───────────────────────────────────── */

export default function NotificationPanel(props: NotificationPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
      popupRender={() => <Panel {...props} onCloseDropdown={() => setOpen(false)} />}
    >
      <Badge count={props.unreadCount} size="small" offset={[-2, 4]} overflowCount={99}>
        <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-primary">
          <BellOutlined className="text-xl" />
          {props.connected && (
            <span className="absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full bg-green-400 border-2 border-white" />
          )}
        </button>
      </Badge>
    </Dropdown>
  );
}