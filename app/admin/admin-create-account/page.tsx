"use client";

import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

/* ======================
   ROLE OPTIONS
====================== */
const ROLE_OPTIONS = [
  { id: 1, label: "Admin" },
  { id: 2, label: "Consultant" },
  { id: 3, label: "Manager" },
  { id: 4, label: "Warehouse" },
  { id: 5, label: "User" },
  { id: 6, label: "Productions manager" },
  { id: 7, label: "Staff Ralo" },
  { id: 8, label: "Staff Cắt" },
  { id: 9, label: "Staff In" },
  { id: 10, label: "Staff Phủ" },
  { id: 11, label: "Staff Cán" },
  { id: 12, label: "Staff Bồi" },
  { id: 13, label: "Staff Bế" },
  { id: 14, label: "Staff Dứt" },
  { id: 15, label: "Staff Dán" },
];

/* ======================
   MAIN COMPONENT
====================== */
export default function AdminCreateUser() {
  const [form, setForm] = useState({
    user_name: "",
    user_email: "",
    user_password: "",
    user_phone: "",
    full_name: "",
    role_id: 2,
    is_active: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /* ======================
     HANDLE CHANGE
  ====================== */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : value,
    }));
  };

  /* ======================
     SUBMIT FORM
  ====================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const payload: any = { ...form };
      if (!form.user_password.trim()) {
        delete payload.user_password;
      }

      const res = await fetch(
        "https://amms-juaa.onrender.com/admin-create-new-user",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Tạo tài khoản thất bại");

      setMessage({
        type: "success",
        text: "🎉 Tạo tài khoản thành công",
      });

      setForm({
        user_name: "",
        user_email: "",
        user_password: "",
        user_phone: "",
        full_name: "",
        role_id: 2,
        is_active: true,
      });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Có lỗi xảy ra",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow border border-gray-200">
          {/* HEADER */}
          <div className="px-8 py-6 border-b">
            <h1 className="text-xl font-semibold text-gray-800">
              Tạo tài khoản người dùng
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Nhập thông tin và phân quyền cho tài khoản mới
            </p>
          </div>

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="px-8 py-6 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Họ tên"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
              />

              <Input
                label="Username"
                name="user_name"
                value={form.user_name}
                onChange={handleChange}
              />

              <Input
                label="Email"
                type="email"
                name="user_email"
                value={form.user_email}
                onChange={handleChange}
              />

              <Input
                label="Số điện thoại"
                name="user_phone"
                value={form.user_phone}
                onChange={handleChange}
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="user_password"
                  value={form.user_password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* ROLE */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Vai trò
              </label>
              <select
                name="role_id"
                value={form.role_id}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ACTIVE */}
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Kích hoạt tài khoản ngay
            </label>

            {/* MESSAGE */}
            {message && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* ACTION */}
            <div className="pt-4">
              <button
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium
                           hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ======================
   REUSABLE INPUT
====================== */
function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        {...props}
        required
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
