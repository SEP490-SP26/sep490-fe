"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const API_BASE = "https://amms-juaa.onrender.com";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");
  const email = params.get("email");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [popup, setPopup] = useState({
    open: false,
    title: "",
    message: "",
    type: "success",
  });

  // Auto close popup sau 2.5s
  useEffect(() => {
    if (popup.open) {
      const t = setTimeout(() => {
        setPopup((p) => ({ ...p, open: false }));
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [popup.open]);

  // Auto redirect login khi done
  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        router.push("/login");
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [done]);

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white shadow-lg rounded-xl p-6">
          Link không hợp lệ
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setPopup({
        open: true,
        title: "Lỗi",
        message: "Mật khẩu không khớp",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          new_password: password,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Reset password thất bại");
      }

      setDone(true);
    } catch (err: any) {
      setPopup({
        open: true,
        title: "Lỗi",
        message: err.message || "Có lỗi xảy ra",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white shadow-xl rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-green-600">
            Đổi mật khẩu thành công
          </h2>

          <p className="text-gray-500 mt-2">
            Đang chuyển tới trang đăng nhập...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Popup */}
      {popup.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[360px] rounded-xl shadow-xl overflow-hidden animate-scaleIn">
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

      {/* Page */}
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            Đặt lại mật khẩu
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password */}
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Mật khẩu mới"
                className="w-full border px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>

            {/* Confirm */}
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Xác nhận mật khẩu"
                className="w-full border px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600"
              >
                {showConfirm ? "🙈" : "👁"}
              </button>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
