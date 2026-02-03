"use client";

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
      <Sidebar
        userInfo={{
          name: "Warehouse",
          role: "Thủ kho",
        }}
        navItems={warehouseNavItems}
        onLogout={handleLogout}
      />

      {/* Main content */}
      <main className="ml-72 p-8">{children}</main>
    </div>
  );
}
