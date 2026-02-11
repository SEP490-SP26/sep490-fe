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
      {/* POPUP */}
      {popup.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[380px] rounded-xl bg-white shadow-2xl overflow-hidden">
            <div
              className={`px-5 py-3 text-white font-semibold ${
                popup.type === "success"
                  ? "bg-green-600"
                  : "bg-red-600"
              }`}
            >
              {popup.title}
            </div>

            <div className="px-5 py-4 text-sm text-gray-700">
              {popup.message}
            </div>
          </div>
        </div>
      )}

      {/* PAGE */}
      <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
            {/* HEADER */}
            <div className="px-8 py-6 border-b">
              <h1 className="text-xl font-semibold text-gray-800 text-center">
                Quên mật khẩu
              </h1>
              <p className="text-sm text-gray-500 text-center mt-1">
                Nhập email để nhận liên kết đặt lại mật khẩu
              </p>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="px-8 py-6 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium
                           hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
