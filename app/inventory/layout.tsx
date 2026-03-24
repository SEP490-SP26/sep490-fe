"use client";

import Footer from "@/components/Footer/Footer";
import RoleHeader from "@/components/Header/RoleHeader";
import Sidebar from "@/components/sidebar/Sidebar";
import { productionsManagerNavItems } from "@/components/sidebar/presets";
import { useRouter } from "next/navigation";
import React from "react";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const userInfo = {
    name: "Quản lý kho",
    role: "Inventory Manager",
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/management-login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        className="bg-indigo-900 text-white"
        navItems={productionsManagerNavItems}
        onLogout={handleLogout}
      />

      <div className="ml-72 flex min-h-screen flex-col">
        <RoleHeader
          userInfo={userInfo}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
