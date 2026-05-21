"use client";

import { verifyCurrentPassword } from "@/lib/verifyPassword";
import { useEffect, useRef, useState } from "react";

export interface TokenQrModalProps {
  token: string;
  processName?: string;
  onClose: () => void;
  onConfirm: (manualToken?: string) => void;
}

export default function TokenQrModal({
  token,
  processName,
  onClose,
  onConfirm,
}: TokenQrModalProps) {
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [copied, setCopied] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPasswordVerified(false);
    setPassword("");
    setPasswordError("");
    setManualToken("");
    setCopied(false);
    passwordRef.current?.focus();
  }, [token]);

  useEffect(() => {
    if (passwordVerified) {
      tokenInputRef.current?.focus();
    }
  }, [passwordVerified]);

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setVerifying(true);
    setPasswordError("");
    try {
      await verifyCurrentPassword(password);
      setPasswordVerified(true);
      setPassword("");
    } catch {
      setPasswordError("Mật khẩu không đúng. Vui lòng thử lại.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCopy = () => {
    if (!passwordVerified) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanToken = manualToken.trim();
    if (!cleanToken) return;
    onConfirm(cleanToken);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-blue-100 p-6 w-full max-w-[360px] shadow-2xl animate-in fade-in zoom-in duration-200">
        <h3 className="font-bold text-lg text-blue-800 mb-2 text-center">
          {passwordVerified
            ? "Nhập token hoàn thành công đoạn"
            : "Xác nhận mật khẩu"}
        </h3>
        {processName && (
          <p className="text-sm text-gray-500 mb-4 text-center font-medium">
            Công đoạn: <span className="text-blue-600">{processName}</span>
          </p>
        )}

        {!passwordVerified ? (
          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Nhập mật khẩu tài khoản để xem mã token hoàn thành công đoạn.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <input
                ref={passwordRef}
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                placeholder="Nhập mật khẩu..."
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {passwordError && (
                <p className="text-xs text-red-600 mt-1.5">{passwordError}</p>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold rounded-xl py-2.5 text-sm transition-all active:scale-[0.98]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={!password.trim() || verifying}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white font-semibold rounded-xl py-2.5 text-sm shadow-md shadow-blue-200 transition-all active:scale-[0.98]"
              >
                {verifying ? "Đang xác nhận..." : "Xác nhận"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 text-center">
              <p className="text-xs text-gray-500 mb-1.5 uppercase font-semibold tracking-wider">
                Token cần nhập
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-sm font-bold text-blue-600 break-all select-all">
                  {token}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex-shrink-0 text-xs px-2 py-1 rounded transition-all font-medium ${
                    copied
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                  }`}
                >
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nhập mã token hoặc quét
                </label>
                <input
                  ref={tokenInputRef}
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Nhập hoặc quét mã token..."
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner font-mono text-center font-bold text-gray-800"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 font-semibold rounded-xl py-2.5 text-sm transition-all active:scale-[0.98]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!manualToken.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-indigo-300 text-white font-semibold rounded-xl py-2.5 text-sm shadow-md shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
