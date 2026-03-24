"use client";

import Footer from "@/components/Footer/Footer";
import { materialsNavItems, warehouseNavItems } from "@/components/sidebar/presets";
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
    name: "Nhân viên vật tư",
    role: "Materials Manager",
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
        navItems={materialsNavItems}
        onLogout={handleLogout}
      />

      {/* Content area (né sidebar) */}
      <div className="ml-72 flex min-h-screen flex-col">
        <RoleHeader
          userInfo={userInfo}
          onLogout={handleLogout}
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
