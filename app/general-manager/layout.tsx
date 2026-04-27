"use client";

import Footer from "@/components/Footer/Footer";
import { generalManagerNavItems } from "@/components/sidebar/presets";
import Sidebar from "@/components/sidebar/Sidebar";
import RoleHeader from "@/components/Header/RoleHeader";
import { useRouter } from "next/navigation";
import React from "react";

export default function LayoutWarehouse({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const userInfo = {
    name: "Quản lí tổng hợp",
    role: "General Manager",
  };

    const handleNavigate = (id: number, status?: string | null) => {
  if (!status) return;
  switch (status.toLowerCase()) {
    case "scheduled":
      router.push(`/general-manager/production-approval?orderId=${id}`);
      break;
    default:
      //router.push(`/general-manager/production-approval`);
      break;
  }
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/management-login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        className="bg-amber-900 text-white"
        navItems={generalManagerNavItems}
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
        <main className="flex-1 p-8">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
