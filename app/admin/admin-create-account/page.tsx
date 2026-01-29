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
  { id: 6, label: "Staff" },
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
      // ⚠️ Chỉ gửi password khi có nhập
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

      // Reset form
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
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">
        Tạo tài khoản người dùng
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-4"
      >
        <Input
          label="Họ tên"
          name="full_name"
          value={form.full_name}
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

        <Input
          label="Username"
          name="user_name"
          value={form.user_name}
          onChange={handleChange}
        />

        {/* PASSWORD WITH TOGGLE */}
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
              className="w-full border px-3 py-2 rounded pr-10"
              placeholder="Nhập mật khẩu"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <FiEyeOff/> : <FiEye/>}
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
            className="w-full border px-3 py-2 rounded"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* ACTIVE */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            checked={form.is_active}
            onChange={handleChange}
          />
          Kích hoạt tài khoản ngay
        </label>

        {/* MESSAGE */}
        {message && (
          <p
            className={`text-sm ${
              message.type === "success"
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </form>
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
        className="w-full border px-3 py-2 rounded"
      />
    </div>
  );
}