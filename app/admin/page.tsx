"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiUploadCloud, FiFile, FiX, FiCheckCircle, FiAlertCircle,
  FiSearch, FiLock, FiUnlock,
} from "react-icons/fi";

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

type UploadStatus = "idle" | "uploading" | "success" | "error";
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
  7: "Staff",
  8: "General Manager",
};

const ROLE_COLOR: Record<string, string> = {
  Admin: "bg-red-100 text-red-700",
  Consultant: "bg-blue-100 text-blue-700",
  Manager: "bg-purple-100 text-purple-700",
  Warehouse: "bg-orange-100 text-orange-700",
  Staff: "bg-green-100 text-green-700",
  "General Manager": "bg-amber-100 text-amber-700",
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
  /* ===== User list state ===== */
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const currentUserId = useMemo(() => getCurrentUserId(), []);

  /* ===== Upload state ===== */
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ===== Popup ===== */
  const [popup, setPopup] = useState<{ open: boolean; type: PopupType; message: string }>({
    open: false, type: "error", message: "",
  });
  const showPopup = (type: PopupType, message: string) =>
    setPopup({ open: true, type, message });
  const closePopup = () => setPopup((p) => ({ ...p, open: false }));

  /* =======================
     FETCH USERS
  ======================= */
  const fetchUsers = () => {
    setLoading(true);
    fetch("https://amms-juaa.onrender.com/get-all-user", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => res.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  /* =======================
     UPLOAD HANDLERS
  ======================= */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(true);
  }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSet(dropped);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) validateAndSet(picked);
  };

  const validateAndSet = (f: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];
    const validExt =
      f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".csv");
    if (!validTypes.includes(f.type) && !validExt) {
      setUploadError("Chỉ chấp nhận file .xlsx, .xls hoặc .csv");
      setUploadStatus("error");
      setFile(null);
      return;
    }
    setFile(f);
    setUploadStatus("idle");
    setUploadError("");
    setUploadSuccess("");
  };

  const removeFile = () => {
    setFile(null);
    setUploadStatus("idle");
    setUploadError("");
    setUploadSuccess("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadStatus("uploading");
    setUploadError("");
    setUploadSuccess("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("https://amms-juaa.onrender.com/api/User/upload-users", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: formData,
      });
      // const res = await fetch("https://localhost:7109/api/User/upload-users", {
      //   method: "POST",
      //   headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      //   body: formData,
      // });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || `Lỗi ${res.status}`);
      }
      setUploadStatus("success");
      setUploadSuccess("Import người dùng thành công!");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      fetchUsers(); // refresh list
    } catch (err: unknown) {
      setUploadStatus("error");
      setUploadError(err instanceof Error ? err.message : "Upload thất bại, vui lòng thử lại.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* =======================
     LOCK / UNLOCK
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
          body: JSON.stringify({ is_active: !selectedUser.is_active }),
        }
      );
      if (!res.ok) throw new Error();
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === selectedUser.user_id ? { ...u, is_active: !u.is_active } : u
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
     FILTER & PAGINATION
  ======================= */
  const filteredUsers = useMemo(() => {
    setPage(1);
    return users.filter((u) => {
      if (u.user_id === currentUserId) return false;
      const text = `${u.username} ${u.email ?? ""} ${u.full_name ?? ""}`.toLowerCase();
      return (
        text.includes(keyword.toLowerCase()) &&
        (role === "ALL" || ROLE_MAP[u.role_id] === role)
      );
    });
  }, [users, keyword, role, currentUserId]);

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

        {/* ===== UPLOAD SECTION ===== */}
        <div className="bg-white rounded-lg border p-5">
          <h2 className="text-base font-semibold mb-1">Import từ file</h2>
          <p className="text-sm text-gray-500 mb-4">
            Tải lên file Excel hoặc CSV để thêm / cập nhật người dùng hàng loạt
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && inputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-lg transition-all duration-200 flex items-center gap-3 px-4 py-3 text-sm min-w-0
                ${file ? "cursor-default border-blue-400 bg-blue-50" : "cursor-pointer"}
                ${dragging ? "border-blue-500 bg-blue-50" : !file ? "border-gray-300 hover:border-blue-400 hover:bg-gray-50" : ""}
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex items-center gap-3 w-full min-w-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center flex-shrink-0">
                    <FiFile className="text-green-600" size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate text-sm">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400">
                  <FiUploadCloud size={18} className="text-blue-400 flex-shrink-0" />
                  <span className="text-sm">
                    Kéo thả hoặc{" "}
                    <span className="text-blue-600 underline underline-offset-2">chọn file</span>
                    {" "}— .xlsx, .xls, .csv
                  </span>
                </div>
              )}
            </div>

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploadStatus === "uploading"}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white whitespace-nowrap transition-all flex-shrink-0
                ${!file || uploadStatus === "uploading"
                  ? "bg-blue-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm"
                }`}
            >
              {uploadStatus === "uploading" ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Đang tải lên...
                </>
              ) : (
                <>
                  <FiUploadCloud size={15} />
                  Import
                </>
              )}
            </button>
          </div>

          {/* Status messages */}
          {uploadStatus === "success" && (
            <div className="mt-3 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm">
              <FiCheckCircle size={15} className="flex-shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
          {uploadStatus === "error" && uploadError && (
            <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm">
              <FiAlertCircle size={15} className="flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>

        {/* ===== FILTERS ===== */}
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

        {/* ===== TABLE ===== */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Đang tải dữ liệu...</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">User</th>
                    <th className="px-6 py-3 text-left font-medium">Email</th>
                    <th className="px-6 py-3 text-left font-medium">Vai trò</th>
                    <th className="px-6 py-3 text-left font-medium">Trạng thái</th>                    
                  </tr>
                </thead>

                <tbody>
                  {pagedUsers.map((u) => {
                    const roleName = ROLE_MAP[u.role_id];
                    return (
                      <tr key={u.user_id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium">{u.full_name ?? "(Chưa có tên)"}</div>
                          <div className="text-xs text-gray-500">{u.username}</div>
                        </td>

                        <td className="px-6 py-4">
                          {u.email ?? <span className="text-gray-400">—</span>}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${ROLE_COLOR[roleName] ?? "bg-gray-100 text-gray-600"}`}>
                            {roleName}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {u.is_active ? "Hoạt động" : "Bị khóa"}
                          </span>
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
                        className={`px-3 py-1 rounded ${page === i + 1 ? "bg-blue-600 text-white" : "border"}`}
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

      {/* ===== MODAL CONFIRM LOCK/UNLOCK ===== */}
      {selectedUser && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-3">
              {selectedUser.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc muốn{" "}
              <b>{selectedUser.is_active ? "khóa" : "mở khóa"}</b> tài khoản{" "}
              <b>{selectedUser.username}</b> không?
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
                className={`px-4 py-2 rounded text-white ${selectedUser.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
              >
                {submitting ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP ERROR ===== */}
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