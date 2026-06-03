"use client";

import Footer from "@/components/Footer/Footer";
import { productionsManagerNavItems } from "@/components/sidebar/presets";
import Sidebar from "@/components/sidebar/Sidebar";
import RoleHeader from "@/components/Header/RoleHeader";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef } from "react";
import { tasksApi } from "@/apiRequests/tasks";
import { showErrorToast } from "@/utils/toastService";

export default function ProductionsManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const userInfo = {
    name: "Quản lý sản xuất",
    role: "Quản lý sản xuất",
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/management-login");
  };

const handleNavigate = (id: number, status?: string | null) => {
  console.log(id, status);
  if (!status) return;
  switch (status.toLowerCase()) {
    case "active":
      router.push(`/productions-manager/production/${id}`);
      break;
    case "scheduled":
      router.push(`/productions-manager/production/${id}`);
      break;
    case "waiting":
      router.push(`/productions-manager/production/${id}`);
      break;
    case "processing":
      router.push(`/productions-manager/production/${id}`);
      break;
    default:
      break;
  }
};

  // GLOBAL SCANNER LOGIC FOR DECODE & NAVIGATE
  const callApiRef = useRef<any>(null);

  useEffect(() => {
    callApiRef.current = async (token: string) => {
      try {
        const data = await tasksApi.decodeQr({ token });
        const decodeResult = data.data ?? data;
        sessionStorage.setItem("qr_decode_result", JSON.stringify(decodeResult));
        router.push(`/productions-manager/task-detail/${decodeResult.task_id}`);
      } catch (error: any) {
        showErrorToast(error.message || "Lỗi khi đọc mã QR");
      }
    };
  }, [router]);

  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;
    let scanTimer: NodeJS.Timeout | null = null;

    const finishScan = () => {
      const value = buffer.trim();
      if (value.length >= 6 && callApiRef.current) {
        callApiRef.current(value);
      }
      buffer = "";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const now = Date.now();
      if (now - lastKeyTime > 200) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        e.preventDefault();
        if (scanTimer) clearTimeout(scanTimer);
        finishScan();
        return;
      }
      if (e.key.length === 1) {
        buffer += e.key;
      }
      if (scanTimer) clearTimeout(scanTimer);
      scanTimer = setTimeout(() => {
        finishScan();
      }, 300);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (scanTimer) clearTimeout(scanTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        className="bg-emerald-900 text-white"
        navItems={productionsManagerNavItems}
        onLogout={handleLogout}
      />

      {/* Content area (né sidebar) */}
      <div className="ml-72 flex min-h-screen flex-col">
        <RoleHeader
          userInfo={userInfo}
          onLogout={handleLogout}
          onNavigateToRequest={handleNavigate}
        />
        {/* Main */}
        <main className="flex-1 p-4">{children}</main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}