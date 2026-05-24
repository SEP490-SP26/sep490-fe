"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

/* ======================
   TYPES
====================== */
type UserForm = {
  user_name: string;
  user_email: string;
  full_name: string;
  role_id: number;
  is_active: boolean;
  user_password?: string;
};

type ApiUser = {
  user_id: number;
  username: string;
  email: string | null;
  full_name: string | null;
  role_id: number;
  is_active: boolean;
};

type PopupState = {
  open: boolean;
  type: "success" | "error";
  message: string;
};

/* ======================
   COMPONENT
====================== */
export default function AdminUpdatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState<UserForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [popup, setPopup] = useState<PopupState>({
    open: false,
    type: "success",
    message: "",
  });

  const showPopup = (type: PopupState["type"], message: string) => {
    setPopup({ open: true, type, message });
  };

  const closePopup = () => {
    setPopup((p) => ({ ...p, open: false }));
  };

  /* ======================
     FETCH USER
  ====================== */
  useEffect(() => {
    if (!id) return;

    fetch("https://mmes-sep490.onrender.com/get-all-user", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((users: ApiUser[]) => {
        const user = users.find(
          (u) => String(u.user_id) === String(id)
        );

        if (!user) {
          showPopup("error", "Không tìm thấy người dùng");
          setTimeout(() => router.back(), 1500);
          return;
        }

        setForm({
          user_name: user.username,
          user_email: user.email ?? "",
          full_name: user.full_name ?? "",
          role_id: user.role_id,
          is_active: user.is_active,
          user_password: "",
        });
      })
      .catch(() => {
        showPopup("error", "Lỗi khi tải dữ liệu người dùng");
        setTimeout(() => router.back(), 1500);
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  /* ======================
     SUBMIT UPDATE
  ====================== */
  const handleSubmit = async () => {
    if (!form) return;
    setSaving(true);

    try {
      const payload: any = { ...form };

      if (!payload.new_password?.trim()) {
        delete payload.new_password;
      }

      const res = await fetch(
        `https://mmes-sep490.onrender.com/admin-update-user/${id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      showPopup("success", "Cập nhật người dùng thành công");
      setTimeout(() => router.back(), 2000);
    } catch {
      showPopup("error", "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  /* ======================
     RENDER
  ====================== */
  if (loading || !form) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center text-gray-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-blue-50 py-10 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border shadow-sm p-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              Thông tin người dùng
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Cập nhật thông tin & phân quyền tài khoản
            </p>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Username
            </label>
            <input
              value={form.user_name}
              disabled
              className="w-full border rounded-md px-3 py-2 bg-gray-100 text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              value={form.user_email}
              onChange={(e) =>
                setForm({ ...form, user_email: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Full name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Họ tên
            </label>
            <input
              value={form.full_name}
              onChange={(e) =>
                setForm({ ...form, full_name: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Vai trò
            </label>
            <select
              value={form.role_id}
              onChange={(e) =>
                setForm({ ...form, role_id: Number(e.target.value) })
              }
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={1}>Admin</option>
              <option value={2}>Consultant</option>
              <option value={3}>Manager</option>
              <option value={4}>Warehouse</option>
              <option value={5}>Customer</option>
              <option value={6}>Productions manager</option>
              <option value={7}>Staff ralo</option>
              <option value={8}>Staff cắt</option>
              <option value={9}>Staff in</option>
              <option value={10}>Staff phủ</option>
              <option value={11}>Staff cán</option>
              <option value={12}>Staff bồi</option>
              <option value={13}>Staff bế</option>
              <option value={14}>Staff dứt</option>
              <option value={15}>Staff dán</option>
            </select>
          </div>

          {/* Reset password */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Mật khẩu mới{" "}
              <span className="text-xs text-gray-400">
                (để trống nếu không đổi)
              </span>
            </label>
            <input
              type="password"
              value={form.user_password}
              onChange={(e) =>
                setForm({ ...form, user_password: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nhập mật khẩu mới"
            />
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm">Tài khoản đang hoạt động</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Hủy
            </button>

            <button
              disabled={saving}
              onClick={handleSubmit}
              className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>

      {/* ======================
          POPUP
      ====================== */}
      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[360px] rounded-xl shadow-lg p-6 text-center space-y-4">
            <div
              className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white ${popup.type === "success"
                ? "bg-green-500"
                : "bg-red-500"
                }`}
            >
              {popup.type === "success" ? "✓" : "✕"}
            </div>

            <p className="text-sm text-gray-700">
              {popup.message}
            </p>

            <button
              onClick={closePopup}
              className={`px-4 py-2 rounded-md text-white text-sm ${popup.type === "success"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
                }`}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
