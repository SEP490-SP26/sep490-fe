"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { FiLock, FiUnlock, FiSearch } from "react-icons/fi";

/* =======================
   TYPES
======================= */
type ApiUser = {
  user_id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role_id: number;
  is_active: boolean;
};

type PopupType = "success" | "error" | "warning";

/* =======================
   CONSTANTS
======================= */
const ROLE_MAP: Record<number, string> = {
  1: "Admin",
  2: "Consultant",
  3: "Manager",
  4: "Warehouse",
  5: "User",
  6: "Staff",
};

const ROLE_COLOR: Record<string, string> = {
  Admin: "bg-red-800 text-white",
  Consultant: "bg-blue-100 text-blue-700",
  Manager: "bg-purple-100 text-purple-700",
  Warehouse: "bg-orange-100 text-orange-700",
  Staff: "bg-green-100 text-green-700",
};

/* =======================
   HELPERS
======================= */
function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw)?.user_id ?? null;
  } catch {
    return null;
  }
}

/* =======================
   COMPONENT
======================= */
export default function AdminUserPage() {
  const router = useRouter();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("ALL");

  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  /* ===== Popup state ===== */
  const [popup, setPopup] = useState<{
    open: boolean;
    type: PopupType;
    message: string;
  }>({
    open: false,
    type: "error",
    message: "",
  });

  const showPopup = (type: PopupType, message: string) => {
    setPopup({ open: true, type, message });
  };

  const closePopup = () => {
    setPopup((p) => ({ ...p, open: false }));
  };

  /* =======================
     FETCH USERS
  ======================= */
  useEffect(() => {
    fetch("https://amms-juaa.onrender.com/get-all-user", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  /* =======================
     CONFIRM LOCK / UNLOCK
  ======================= */
  const confirmToggleUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    try {
      const res = await fetch(
        `https://amms-juaa.onrender.com/admin-update-user/${selectedUser.user_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !selectedUser.is_active,
          }),
        }
      );

      if (!res.ok) throw new Error();

      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id
            ? { ...u, is_active: !u.is_active }
            : u
        )
      );

      setSelectedUser(null);
    } catch {
      showPopup("error", "Cập nhật trạng thái thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  /* =======================
     FILTER USERS
  ======================= */
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (u.user_id === currentUserId) return false;

      const text =
        `${u.username} ${u.email ?? ""} ${u.full_name ?? ""}`.toLowerCase();

      return (
        text.includes(keyword.toLowerCase()) &&
        (role === "ALL" || ROLE_MAP[u.role_id] === role)
      );
    });
  }, [users, keyword, role, currentUserId]);

  /* =======================
     RENDER
  ======================= */
  return (
    <>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>

        {/* Filters */}
        <div className="flex gap-4 bg-white p-4 rounded shadow">
          <div className="relative w-72">
            <FiSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm username, email, tên..."
              className="w-full pl-10 pr-4 py-2 border rounded"
            />
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="ALL">Tất cả vai trò</option>
            {Object.values(ROLE_MAP).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Đang tải dữ liệu...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">User</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-left">Vai trò</th>
                  <th className="px-6 py-3 text-left">Trạng thái</th>
                  <th className="px-6 py-3 text-center">Hành động</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((u) => {
                  const roleName = ROLE_MAP[u.role_id];

                  return (
                    <tr
                      key={u.user_id}
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        router.push(
                          `/admin/admin-update-account/${u.user_id}`
                        )
                      }
                    >
                      <td className="px-6 py-3">
                        <div className="font-medium">
                          {u.full_name ?? "(Chưa có tên)"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.username}
                        </div>
                      </td>

                      <td className="px-6 py-3">{u.email ?? "—"}</td>

                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${ROLE_COLOR[roleName]}`}
                        >
                          {roleName}
                        </span>
                      </td>

                      <td className="px-6 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            u.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {u.is_active ? "Hoạt động" : "Bị khóa"}
                        </span>
                      </td>

                      <td className="px-6 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(u);
                          }}
                          className={`p-2 rounded hover:bg-gray-100 ${
                            u.is_active
                              ? "text-red-500"
                              : "text-green-600"
                          }`}
                        >
                          {u.is_active ? <FiLock /> : <FiUnlock />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* =======================
          MODAL CONFIRM
      ======================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold mb-3">
              {selectedUser.is_active
                ? "Khóa tài khoản"
                : "Mở khóa tài khoản"}
            </h2>

            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc muốn{" "}
              <b>{selectedUser.is_active ? "khóa" : "mở khóa"}</b>{" "}
              tài khoản <b>{selectedUser.username}</b> không?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 border rounded"
                disabled={submitting}
              >
                Hủy
              </button>

              <button
                onClick={confirmToggleUser}
                disabled={submitting}
                className={`px-4 py-2 rounded text-white ${
                  selectedUser.is_active
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================
          POPUP ERROR
      ======================= */}
      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-[360px] p-6 text-center animate-scaleIn">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center bg-red-500 text-white">
              ✕
            </div>

            <p className="mb-6">{popup.message}</p>

            <button
              onClick={closePopup}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}