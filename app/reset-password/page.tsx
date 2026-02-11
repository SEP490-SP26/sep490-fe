"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

const API_BASE = "https://amms-juaa.onrender.com";

function ResetPasswordForm() {
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

  // Auto close popup
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
  }, [done, router]);

  if (!token || !email) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
        <div className="bg-white border border-gray-200 shadow-lg rounded-2xl px-8 py-6 text-gray-700">
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
      <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
        <div className="bg-white border border-gray-200 shadow-xl rounded-2xl px-10 py-8 text-center">
          <h2 className="text-xl font-semibold text-green-600">
            Đổi mật khẩu thành công
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Đang chuyển tới trang đăng nhập...
          </p>
        </div>
      </div>
    );
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
          <div className="bg-white border border-gray-200 shadow-lg rounded-2xl">
            {/* HEADER */}
            <div className="px-8 py-6 border-b">
              <h1 className="text-xl font-semibold text-gray-800 text-center">
                Đặt lại mật khẩu
              </h1>
              <p className="text-sm text-gray-500 text-center mt-1">
                Nhập mật khẩu mới cho tài khoản của bạn
              </p>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="px-8 py-6 space-y-5"
            >
              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPass ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium
                           hover:bg-blue-700 transition disabled:opacity-60"
              >
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-blue-50">
          Đang tải...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
