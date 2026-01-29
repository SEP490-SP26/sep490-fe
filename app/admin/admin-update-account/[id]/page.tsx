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
  new_password?: string;
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

    fetch("https://amms-juaa.onrender.com/get-all-user", {
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
          new_password: "",
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
        `https://amms-juaa.onrender.com/admin-update-user/${id}`,
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
      setTimeout(() => router.back(), 1500);
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
    return <div className="p-6">Đang tải dữ liệu...</div>;
  }

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow space-y-4">
        <h1 className="text-xl font-semibold">Thông tin người dùng</h1>

        {/* Username */}
        <div>
          <label className="block text-sm">Username</label>
          <input
            value={form.user_name}
            disabled
            className="w-full border px-3 py-2 rounded bg-gray-100"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm">Email</label>
          <input
            value={form.user_email}
            onChange={(e) =>
              setForm({ ...form, user_email: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Full name */}
        <div>
          <label className="block text-sm">Họ tên</label>
          <input
            value={form.full_name}
            onChange={(e) =>
              setForm({ ...form, full_name: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm">Vai trò</label>
          <select
            value={form.role_id}
            onChange={(e) =>
              setForm({ ...form, role_id: Number(e.target.value) })
            }
            className="w-full border px-3 py-2 rounded"
          >
            <option value={1}>Admin</option>
            <option value={2}>Consultant</option>
            <option value={3}>Manager</option>
            <option value={4}>Warehouse</option>
            <option value={5}>User</option>
            <option value={6}>Staff</option>
          </select>
        </div>

        {/* Reset password */}
        <div>
          <label className="block text-sm">
            Mật khẩu mới{" "}
            <span className="text-xs text-gray-500">
              (để trống nếu không đổi)
            </span>
          </label>
          <input
            type="password"
            value={form.new_password}
            onChange={(e) =>
              setForm({ ...form, new_password: e.target.value })
            }
            className="w-full border px-3 py-2 rounded"
            placeholder="Nhập mật khẩu mới"
          />
        </div>

        {/* Active */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) =>
              setForm({ ...form, is_active: e.target.checked })
            }
          />
          <span>Hoạt động</span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded"
          >
            Hủy
          </button>

          <button
            disabled={saving}
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {/* ======================
          POPUP
      ====================== */}
      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[360px] rounded-lg shadow-lg p-6 text-center space-y-4">
            <div
              className={`text-lg font-semibold ${
                popup.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {popup.type === "success" ? "Thành công" : "Lỗi"}
            </div>

            <p className="text-sm text-gray-700">
              {popup.message}
            </p>

            <button
              onClick={closePopup}
              className={`px-4 py-2 rounded text-white ${
                popup.type === "success"
                  ? "bg-green-600"
                  : "bg-red-600"
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