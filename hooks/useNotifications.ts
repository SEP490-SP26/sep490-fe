"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";

/* ================================================================
   1. DOMAIN EVENTS
   ================================================================ */

export interface RequestChangedEvent {
  request_id: number;
  old_status: string | null;
  new_status: string | null;
  action:
    | "created"
    | "updated"
    | "deleted"
    | "submitted_for_approval"
    | "manager_verified"
    | "manager_declined"
    | "Payment"
    | (string & {});
  changed_at: string;
  changed_by: string | null;
}

export interface RequestNoteChangedEvent {
  request_id: number;
  note_id?: number;
  consultant_note?: string | null;
  action: "added" | "updated" | "deleted" | (string & {});
  changed_at: string;
  changed_by: string | null;
}

/* ================================================================
   2. APP NOTIFICATION MODEL
   ================================================================ */

export interface AppNotification {
  id: string;
  type: "request_changed" | "request_note";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  requestId: number;
  action: string;
  oldStatus?: string | null;
  newStatus?: string | null;
}

/* ================================================================
   3. ROLE → ACTION FILTER MAP
   
   Định nghĩa action nào sẽ được hiển thị cho role nào.
   BE publish lên group "requests-all" và "requests-role-{role}",
   nhưng vì dùng singleton connection (1 WebSocket), tất cả listener
   đều nhận được event. Filter này là tầng bảo vệ ở client.
   ================================================================ */

/**
 * Các action mà role được phép nhận thông báo.
 * - undefined  → nhận tất cả (dùng cho role không xác định)
 * - string[]   → chỉ nhận các action trong danh sách
 */
const ROLE_ACTION_FILTER: Record<string, string[]> = {
  consultant: [
    "created",           // request mới được assign cho mình
    "manager_verified",  // manager duyệt báo giá của mình
    "manager_declined",  // manager từ chối báo giá
    "Payment",           // khách hàng thanh toán
  ],
  manager: [
    "submitted_for_approval", // consultant gửi lên để duyệt
    "created",                // request mới tạo
    "Payment",                // khách hàng thanh toán
  ],
  production: [
    "Payment",           // khách thanh toán → cần chuẩn bị sản xuất
    "manager_verified",  // request được duyệt → có thể vào lịch
  ],
};

/**
 * Kiểm tra xem role có được nhận action này không.
 * Role không nằm trong ROLE_ACTION_FILTER → nhận tất cả (fallback an toàn).
 */
function isActionAllowedForRole(action: string, role: string): boolean {
  const allowed = ROLE_ACTION_FILTER[role.toLowerCase()];
  if (!allowed) return true; // role lạ → không filter
  return allowed.includes(action);
}

/* ================================================================
   4. SINGLETON CONNECTION + INTERNAL EVENT BUS
   
   Vấn đề gốc: SignalR cho phép gọi conn.on() nhiều lần,
   mỗi lần thêm 1 listener mới (không replace).
   → conn.on() chỉ được gọi đúng 1 lần trên singleton,
     sau đó fan-out ra các subscriber qua event bus nội bộ.
   ================================================================ */

type RequestChangedSubscriber = (evt: RequestChangedEvent) => void;
type RequestNoteSubscriber    = (evt: RequestNoteChangedEvent) => void;

const _subscribers = {
  requestChanged: new Set<RequestChangedSubscriber>(),
  requestNote:    new Set<RequestNoteSubscriber>(),
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

      conn.on("request.changed", (evt: RequestChangedEvent) => {
        _subscribers.requestChanged.forEach((cb) => cb(evt));
      });

      conn.on("request.noteChanged", (evt: RequestNoteChangedEvent) => {
        _subscribers.requestNote.forEach((cb) => cb(evt));
      });
    }

    return conn;
  })();

  return _connectionPromise;
}

/* ================================================================
   5. HUB GROUP CONFIG
   ================================================================ */

export interface HubGroupConfig {
  joinMethod:   string;
  leaveMethod?: string;
  args?:        unknown[];
}

/**
 * Group config chuẩn theo role.
 *
 * | Role         | Groups                                               |
 * |--------------|------------------------------------------------------|
 * | consultant   | JoinRequestsAll + JoinRequestsByRole("consultant")   |
 * | manager      | JoinRequestsAll + JoinRequestsByRole("manager")      |
 * | production   | JoinRequestsAll + JoinRequestsByRole("production")   |
 * | other        | JoinRequestsAll                                      |
 */
export function defaultGroupsForRole(role: string): HubGroupConfig[] {
  const base: HubGroupConfig[] = [
    { joinMethod: "JoinRequestsAll", leaveMethod: "LeaveRequestsAll" },
  ];

  if (["manager", "consultant", "production"].includes(role.toLowerCase())) {
    base.push({
      joinMethod:  "JoinRequestsByRole",
      leaveMethod: "LeaveRequestsByRole",
      args:        [role],
    });
  }

  return base;
}

/* ================================================================
   6. LABEL / META MAPS
   ================================================================ */

export const ACTION_META: Record<string, { title: string; icon: string; color: string }> = {
  created:                { title: "Yêu cầu mới",           icon: "plus",    color: "emerald" },
  updated:                { title: "Cập nhật yêu cầu",      icon: "edit",    color: "blue"    },
  deleted:                { title: "Yêu cầu bị xóa",        icon: "trash",   color: "red"     },
  submitted_for_approval: { title: "Gửi duyệt báo giá",     icon: "send",    color: "violet"  },
  manager_verified:       { title: "Manager đã duyệt",      icon: "check",   color: "green"   },
  manager_declined:       { title: "Manager từ chối",       icon: "x",       color: "red"     },
  Payment:                { title: "Khách hàng thanh toán", icon: "payment", color: "amber"   },
  added:                  { title: "Ghi chú mới",           icon: "note",    color: "indigo"  },
};

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
   7. NOTIFICATION BUILDERS
   ================================================================ */

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function labelStatus(s?: string | null) {
  if (!s) return null;
  return STATUS_LABELS[s] ?? s;
}

function buildRequestChangedNotification(evt: RequestChangedEvent): AppNotification {
  const meta = ACTION_META[evt.action] ?? { title: "Thay đổi yêu cầu", icon: "bell", color: "gray" };
  const newLabel = labelStatus(evt.new_status);
  const oldLabel = labelStatus(evt.old_status);

  let message = `Yêu cầu #${evt.request_id}`;

  switch (evt.action) {
    case "created":
      message += " vừa được tạo mới và giao cho bạn.";
      break;
    case "submitted_for_approval":
      message += " đã được tư vấn viên gửi lên để duyệt báo giá.";
      break;
    case "manager_verified":
      message += " đã được manager xác nhận, chờ khách hàng thanh toán.";
      break;
    case "manager_declined":
      message += " đã bị manager từ chối. Vui lòng cập nhật lại báo giá.";
      break;
    case "Payment":
      message += evt.new_status === "Full Paid"
        ? " — khách hàng đã thanh toán toàn bộ."
        : " — khách hàng đã đặt cọc thành công.";
      break;
    default:
      if (newLabel && oldLabel) message += `: ${oldLabel} → ${newLabel}`;
      else if (newLabel) message += ` chuyển sang "${newLabel}"`;
  }

  return {
    id: genId(),
    type: "request_changed",
    title: meta.title,
    message,
    timestamp: new Date(evt.changed_at),
    read: false,
    requestId: evt.request_id,
    action: evt.action,
    oldStatus: evt.old_status,
    newStatus: evt.new_status,
  };
}

function buildRequestNoteNotification(evt: RequestNoteChangedEvent): AppNotification {
  const meta = ACTION_META[evt.action] ?? { title: "Cập nhật ghi chú", icon: "note", color: "indigo" };
  return {
    id: genId(),
    type: "request_note",
    title: meta.title,
    message: `Ghi chú trong yêu cầu #${evt.request_id} vừa được cập nhật.`,
    timestamp: new Date(evt.changed_at),
    read: false,
    requestId: evt.request_id,
    action: evt.action,
  };
}

/* ================================================================
   8. HOOK OPTIONS
   ================================================================ */

export interface UseNotificationsOptions {
  hubUrl:              string;
  /** Role của user hiện tại — dùng để filter action */
  role:                string;
  groups?:             HubGroupConfig[];
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
  groups,
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

    // ── Subscriber: request.changed ──────────────────────────────
    const onRequestChanged: RequestChangedSubscriber = (evt) => {
      // Filter theo role — đây là nơi quyết định role nào nhận gì
      if (!isActionAllowedForRole(evt.action, roleRef.current)) return;

      const notification = buildRequestChangedNotification(evt);
      setNotifications((prev) => [notification, ...prev].slice(0, maxItems));
      onNewNotificationRef.current?.(notification);
    };

    // ── Subscriber: request.noteChanged ─────────────────────────
    const onRequestNote: RequestNoteSubscriber = (evt) => {
      // Chỉ consultant và manager nhận ghi chú
      const noteRoles = ["consultant", "manager"];
      if (!noteRoles.includes(roleRef.current.toLowerCase())) return;

      const notification = buildRequestNoteNotification(evt);
      setNotifications((prev) => [notification, ...prev].slice(0, maxItems));
      onNewNotificationRef.current?.(notification);
    };

    // ── Đăng ký subscriber vào event bus ─────────────────────────
    _subscribers.requestChanged.add(onRequestChanged);
    _subscribers.requestNote.add(onRequestNote);

    // ── Khởi động connection + join groups ───────────────────────
    const init = async () => {
      try {
        const conn = await getHubConnection(hubUrl, accessToken);
        if (cancelled) return;

        setConnected(conn.state === signalR.HubConnectionState.Connected);

        conn.onreconnected(async () => {
          setConnected(true);
          await joinGroups(conn, groups ?? defaultGroupsForRole(roleRef.current));
        });
        conn.onreconnecting(() => setConnected(false));
        conn.onclose(() => setConnected(false));

        await joinGroups(conn, groups ?? defaultGroupsForRole(roleRef.current));
      } catch (err) {
        console.error("[useNotifications] init error:", err);
        setConnected(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      // Chỉ xóa subscriber của hook instance này — không ảnh hưởng role khác
      _subscribers.requestChanged.delete(onRequestChanged);
      _subscribers.requestNote.delete(onRequestNote);
      // KHÔNG gọi conn.off() — singleton connection dùng chung
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubUrl, accessToken, maxItems]);

  /* ── Dynamic group join/leave ── */
  const joinGroup = useCallback(async (config: HubGroupConfig) => {
    const conn = await getHubConnection(hubUrl, accessToken);
    if (conn.state !== signalR.HubConnectionState.Connected) return;
    await conn.invoke(config.joinMethod, ...(config.args ?? [])).catch(console.error);
  }, [hubUrl, accessToken]);

  const leaveGroup = useCallback(async (config: HubGroupConfig) => {
    const conn = await getHubConnection(hubUrl, accessToken);
    if (conn.state !== signalR.HubConnectionState.Connected) return;
    if (config.leaveMethod) {
      await conn.invoke(config.leaveMethod, ...(config.args ?? [])).catch(console.error);
    }
  }, [hubUrl, accessToken]);

  const joinRequest  = useCallback(
    (id: number) => joinGroup({ joinMethod: "JoinRequest",  leaveMethod: "LeaveRequest",  args: [id] }),
    [joinGroup]
  );

  const leaveRequest = useCallback(
    (id: number) => leaveGroup({ joinMethod: "JoinRequest", leaveMethod: "LeaveRequest",  args: [id] }),
    [leaveGroup]
  );

  return {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead,
    clearAll,
    joinGroup,
    leaveGroup,
    joinRequest,
    leaveRequest,
  };
}

/* ================================================================
   10. INTERNAL UTILS
   ================================================================ */

async function joinGroups(conn: signalR.HubConnection, groups: HubGroupConfig[]) {
  for (const g of groups) {
    await conn.invoke(g.joinMethod, ...(g.args ?? [])).catch(console.error);
  }
}