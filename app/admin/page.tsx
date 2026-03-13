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
  6: "Productions manager",
  7: "Staff"
};

const ROLE_COLOR: Record<string, string> = {
  Admin: "bg-red-100 text-red-700",
  Consultant: "bg-blue-100 text-blue-700",
  Manager: "bg-purple-100 text-purple-700",
  Warehouse: "bg-orange-100 text-orange-700",
  Staff: "bg-green-100 text-green-700",
};

const PAGE_SIZE = 7;

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
  const [page, setPage] = useState(1);

  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = useMemo(() => getCurrentUserId(), []);

  /* ===== Popup ===== */
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
     FILTER
  ======================= */
  const filteredUsers = useMemo(() => {
    setPage(1);
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
     PAGINATION
  ======================= */
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredUsers.slice(start, start + PAGE_SIZE);
  }, [filteredUsers, page]);

  /* =======================
     RENDER
  ======================= */
  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tài khoản và phân quyền hệ thống
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 flex gap-4 items-center">
          <div className="relative w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm username, email, tên..."
              className="w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            <option value="ALL">Tất cả vai trò</option>
            {Object.values(ROLE_MAP).map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">
              Đang tải dữ liệu...
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">User</th>
                    <th className="px-6 py-3 text-left font-medium">Email</th>
                    <th className="px-6 py-3 text-left font-medium">Vai trò</th>
                    <th className="px-6 py-3 text-left font-medium">Trạng thái</th>
                    <th className="px-6 py-3 text-center font-medium">
                      Hành động
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {pagedUsers.map((u) => {
                    const roleName = ROLE_MAP[u.role_id];

                    return (
                      <tr
                        key={u.user_id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/admin/admin-update-account/${u.user_id}`
                          )
                        }
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">
                            {u.full_name ?? "(Chưa có tên)"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {u.username}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {u.email ?? <span className="text-gray-400">—</span>}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLOR[roleName]}`}
                          >
                            {roleName}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              u.is_active
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {u.is_active ? "Hoạt động" : "Bị khóa"}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                            }}
                            className={`inline-flex items-center justify-center w-9 h-9 rounded border hover:bg-gray-100 ${
                              u.is_active
                                ? "text-red-600"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-4">
                  <span className="text-sm text-gray-500">
                    Trang {page} / {totalPages}
                  </span>

                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Trước
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`px-3 py-1 rounded ${
                          page === i + 1
                            ? "bg-blue-600 text-white"
                            : "border"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}

                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =======================
          MODAL CONFIRM
      ======================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg shadow p-6">
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
          <div className="bg-white rounded-lg shadow w-[360px] p-6 text-center">
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
    </>
  );
}
