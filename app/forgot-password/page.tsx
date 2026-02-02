"use client";

import { useState, useEffect } from "react";

const API_BASE = "https://amms-juaa.onrender.com";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
    type: "success",
  });

  // Auto close popup
  useEffect(() => {
    if (popup.open) {
      const t = setTimeout(() => {
        setPopup((p) => ({ ...p, open: false }));
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [popup.open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email),
      });

      if (!res.ok) throw new Error("Gửi email thất bại");

      setPopup({
        open: true,
        title: "Thành công",
        message: "Nếu email tồn tại, link reset đã được gửi.",
        type: "success",
      });

      setEmail("");
    } catch (err: any) {
      setPopup({
        open: true,
        title: "Lỗi",
        message: err.message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {popup.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[360px] rounded-xl shadow-xl overflow-hidden">
            <div
              className={`px-4 py-3 text-white font-semibold ${
                popup.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {popup.title}
            </div>

            <div className="p-5 text-gray-700">{popup.message}</div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            Quên mật khẩu
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Nhập email"
              className="w-full border px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {loading ? "Đang gửi..." : "Gửi link reset"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
