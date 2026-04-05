"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

/**
 * Event nhận từ backend qua các method role-based.
 * Backend gọi: Clients.Group(ByRole("manager")).SendAsync("methodName", { message })
 */
export interface RoleNotificationEvent {
  message: string;
}

/* ================================================================
   2. APP NOTIFICATION MODEL
   ================================================================ */

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action: string;
}


/* ================================================================
   3b. SIGNALR METHOD LIST

   Backend gọi: Clients.Group(ByRole("manager")).SendAsync("processing", { message })
   Backend đã tự route đúng role qua ByRole() group.
   Frontend chỉ cần đăng ký listener cho các method name mà BE gọi.
   
   Khi BE thêm method mới, chỉ cần thêm tên method vào danh sách này.
   ================================================================ */

/**
 * Danh sách tất cả method name mà backend SendAsync() có thể gọi.
 * Backend route đúng role qua ByRole() → frontend nhận được = hiển thị luôn.
 *
 * Khi BE thêm method mới cho role nào, thêm tên method vào đây.
 */
export const SIGNALR_NOTIFICATION_METHODS: string[] = [
  "processing",
  "createOrder",
  "Paid",
  "waiting",
  "deposited",
  "scheduled",
  "pending",
  "consultantCreateRequest",
  "verified",
  "declined",
  "finishedTask",
  // Thêm method mới ở đây khi BE mở rộng, ví dụ:
  // "approvedRequest",
  // "rejectedRequest",
  // "materialReady",
  // "warehouseExport",
];

/* ================================================================
   4. SINGLETON CONNECTION + INTERNAL EVENT BUS
   
   Vấn đề gốc: SignalR cho phép gọi conn.on() nhiều lần,
   mỗi lần thêm 1 listener mới (không replace).
   → conn.on() chỉ được gọi đúng 1 lần trên singleton,
     sau đó fan-out ra các subscriber qua event bus nội bộ.
   ================================================================ */

type RoleNotificationSubscriber = (method: string, evt: RoleNotificationEvent) => void;

const _subscribers = {
  roleNotification: new Set<RoleNotificationSubscriber>(),
};

let _connection:        signalR.HubConnection | null = null;
let _connectionPromise: Promise<signalR.HubConnection> | null = null;
let _listenersRegistered = false;

/**
 * Trả về singleton HubConnection.
 * Chỉ gọi conn.on() đúng 1 lần duy nhất (guard _listenersRegistered).
 */
export async function getHubConnection(
  hubUrl: string,
  accessToken?: string
): Promise<signalR.HubConnection> {
  if (_connection?.state === signalR.HubConnectionState.Connected) {
    return _connection;
  }

  if (_connectionPromise) return _connectionPromise;

  _connectionPromise = (async () => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: accessToken ? () => accessToken : undefined,
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    await conn.start();
    _connection = conn;
    _connectionPromise = null;

    // ─── Đăng ký listener CHỈ 1 LẦN, fan-out qua subscriber set ───
    if (!_listenersRegistered) {
      _listenersRegistered = true;

      // ─── Đăng ký listener cho tất cả notification methods ───
      for (const method of SIGNALR_NOTIFICATION_METHODS) {
        conn.on(method, (evt: RoleNotificationEvent) => {
          _subscribers.roleNotification.forEach((cb) => cb(method, evt));
        });
      }
    }

    return conn;
  })();

  return _connectionPromise;
}

/* ================================================================
   5. HUB GROUP CONFIG
   ================================================================ */

/** Tất cả role được hỗ trợ join group theo role */
const SUPPORTED_ROLES = [
  "manager",
  "consultant",
  "production manager",
  "warehouse manager",
  "material manager",
];

/**
 * Group config chuẩn theo role.
 *
 * | Role               | Groups                                                          |
 * |--------------------|-----------------------------------------------------------------|
 * | consultant         | JoinRequestsAll + JoinRequestsByRole("consultant")              |
 * | manager            | JoinRequestsAll + JoinRequestsByRole("manager")                 |
 * | production manager | JoinRequestsAll + JoinRequestsByRole("production manager")      |
 * | warehouse manager  | JoinRequestsAll + JoinRequestsByRole("warehouse manager")       |
 * | material manager   | JoinRequestsAll + JoinRequestsByRole("material manager")        |
 * | other              | JoinRequestsAll                                                 |
 */


export const STATUS_LABELS: Record<string, string> = {
  Pending:     "Chờ xử lý",
  Processing:  "Đang xử lý",
  Completed:   "Hoàn thành",
  Cancelled:   "Đã hủy",
  Approved:    "Đã duyệt",
  Rejected:    "Từ chối",
  Verified:    "Đã xác nhận",
  Declined:    "Đã từ chối",
  Accepted:    "Đã chấp nhận",
  Deposited:   "Đã đặt cọc",
  "Full Paid": "Đã thanh toán đủ",
};

/* ================================================================
   7. NOTIFICATION BUILDER
   ================================================================ */

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Build notification từ role-based SignalR method.
 * Backend gọi: SendAsync("processing", { message = "Có yêu cầu #123 cần duyệt" })
 */
function buildNotification(method: string, evt: RoleNotificationEvent): AppNotification {
  return {
    id: genId(),
    title: "Thông báo",
    message: evt.message,
    timestamp: new Date(),
    read: false,
    action: method,
  };
}

/* ================================================================
   8. HOOK OPTIONS
   ================================================================ */

export interface UseNotificationsOptions {
  hubUrl:              string;
  role:                string;
  accessToken?:        string;
  onNewNotification?:  (n: AppNotification) => void;
  maxItems?:           number;
}

/* ================================================================
   9. MAIN HOOK
   ================================================================ */

export function useNotifications({
  hubUrl,
  role,
  accessToken,
  onNewNotification,
  maxItems = 50,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connected, setConnected]         = useState(false);

  // Giữ ref để dùng trong closure mà không cần restart effect
  const roleRef              = useRef(role);
  const onNewNotificationRef = useRef(onNewNotification);
  roleRef.current              = role;
  onNewNotificationRef.current = onNewNotification;

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ── state helpers ── */
  const markAsRead    = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll      = useCallback(() => setNotifications([]), []);

  /* ── SignalR + subscriber lifecycle ── */
  useEffect(() => {
    let cancelled = false;

    // ── Subscriber: role-based SignalR methods ──────────────────
    // Backend đã route đúng role qua ByRole() group → nhận được = hiển thị
    const onRoleNotification: RoleNotificationSubscriber = (method, evt) => {
      const notification = buildNotification(method, evt);
      setNotifications((prev) => [notification, ...prev].slice(0, maxItems));
      onNewNotificationRef.current?.(notification);
    };

    // ── Đăng ký subscriber vào event bus ─────────────────────────
    _subscribers.roleNotification.add(onRoleNotification);

    // ── Khởi động connection + join groups ───────────────────────
    const init = async () => {
      try {
        const conn = await getHubConnection(hubUrl, accessToken);
        if (cancelled) return;

        setConnected(conn.state === signalR.HubConnectionState.Connected);

        conn.onreconnected(async () => {
          setConnected(true);
          await joinGroups(conn, roleRef.current);
        });
        conn.onreconnecting(() => setConnected(false));
        conn.onclose(() => setConnected(false));

        await joinGroups(conn, roleRef.current);
      } catch (err) {
        console.error("[useNotifications] init error:", err);
        setConnected(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      // Chỉ xóa subscriber của hook instance này — không ảnh hưởng role khác
      _subscribers.roleNotification.delete(onRoleNotification);
      // KHÔNG gọi conn.off() — singleton connection dùng chung
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubUrl, accessToken, maxItems]);



  

 
  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}

/* ================================================================
   10. INTERNAL UTILS
   ================================================================ */

async function joinGroups(conn: signalR.HubConnection, role: string) {
  await conn.invoke("JoinByRole", role.toLowerCase()).catch(console.error);
}