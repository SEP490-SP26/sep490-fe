"use client";

import Footer from "@/components/Footer/Footer";
import { warehouseNavItems } from "@/components/sidebar/presets";
import Sidebar from "@/components/sidebar/Sidebar";
import { useRouter } from "next/navigation";
import React from "react";

export default function LayoutWarehouse({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

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
        userInfo={{
          name: "Quản lý kho",
          role: "Thủ kho",
        }}
        navItems={warehouseNavItems}
        onLogout={handleLogout}
      />

      {/* Content area (né sidebar) */}
      <div className="ml-72 flex min-h-screen flex-col">
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
