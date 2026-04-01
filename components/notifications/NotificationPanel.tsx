"use client";

import React from "react";
import { Badge, Dropdown, Empty, Tooltip } from "antd";
import {
  BellOutlined,
  CheckOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CreditCardOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { AppNotification } from "@/hooks/useNotifications";
import { STATUS_LABELS } from "@/hooks/useNotifications";

interface NotificationPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNavigate?: (requestId: number, status?: string | null) => void;
}

/* ─── Action icon map ────────────────────────────────────────── */

const ACTION_ICON: Record<string, React.ReactNode> = {
  created:                <PlusCircleOutlined className="text-emerald-500" />,
  updated:                <EditOutlined       className="text-blue-500"    />,
  deleted:                <DeleteOutlined     className="text-red-500"     />,
  submitted_for_approval: <SendOutlined       className="text-violet-500"  />,
  manager_verified:       <CheckCircleOutlined className="text-green-500"  />,
  manager_declined:       <CloseCircleOutlined className="text-red-500"    />,
  Payment:                <CreditCardOutlined  className="text-amber-500"  />,
  added:                  <FileTextOutlined    className="text-indigo-500"  />,
};

/* ─── Status pill ────────────────────────────────────────────── */

const STATUS_COLOR: Record<string, string> = {
  Pending:       "bg-yellow-100 text-yellow-700",
  Processing:    "bg-blue-100 text-blue-700",
  Completed:     "bg-green-100 text-green-700",
  Cancelled:     "bg-red-100 text-red-700",
  Approved:      "bg-emerald-100 text-emerald-700",
  Rejected:      "bg-rose-100 text-rose-700",
  Verified:      "bg-teal-100 text-teal-700",
  Declined:      "bg-rose-100 text-rose-700",
  Accepted:      "bg-sky-100 text-sky-700",
  Deposited:     "bg-amber-100 text-amber-700",
  "Full Paid":   "bg-green-100 text-green-700",
};

function StatusPill({ status }: { status?: string | null }) {
  if (!status) return null;
  const label = STATUS_LABELS[status] ?? status;
  const cls = STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Time ago ───────────────────────────────────────────────── */

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return date.toLocaleDateString("vi-VN");
}

/* ─── Single item ────────────────────────────────────────────── */

function NotificationItem({
  notification,
  onMarkAsRead,
  onNavigate,
}: {
  notification: AppNotification;
  onMarkAsRead: (id: string) => void;
  onNavigate?: (requestId: number, status?: string | null) => void;
}) {
  const handleClick = () => {
    if (!notification.read) onMarkAsRead(notification.id);
    onNavigate?.(notification.requestId, notification.newStatus);
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
        {ACTION_ICON[notification.action] ?? <BellOutlined className="text-gray-400" />}
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

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {notification.type === "request_changed" && notification.newStatus && (
            <StatusPill status={notification.newStatus} />
          )}
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
}: NotificationPanelProps) {
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
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Exported bell button ───────────────────────────────────── */

export default function NotificationPanel(props: NotificationPanelProps) {
  return (
    <Dropdown
      trigger={["click"]}
      placement="bottomRight"
      arrow={{ pointAtCenter: true }}
      dropdownRender={() => <Panel {...props} />}
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