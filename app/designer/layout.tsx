"use client";
import { designerNavItems } from "@/components/sidebar/presets";
import RoleHeader from "@/components/Header/RoleHeader";
import Sidebar from "@/components/sidebar/Sidebar";
import { useRouter } from "next/navigation";
import React from "react";

export default function LayoutDesigner({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const userInfo = {
    name: "Thiết kế viên",
    role: "Designer",
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    router.push("/management-login");
  };
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}

      <Sidebar
        className="bg-purple-900 text-white"
        navItems={[...designerNavItems]}
        onLogout={handleLogout}
        onItemClick={(item) => {
          // Xử lý khi click vào item
          console.log("Item clicked:", item.label);
        }}
      />

      {/* Main content */}
      <div className="ml-72 flex flex-col min-h-screen">
        <RoleHeader
          userInfo={userInfo}
          onLogout={handleLogout}
        />
        <main className="flex-1 p-6">
          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm min-h-full">
            {children}
          </div>
        </main>

        {/* Footer main */}
        <footer className=" p-4 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm">
            <p className="text-secondary">
              Hệ thống quản lý công ty in ấn •
              <span className="text-primary font-medium ml-1">
                {new Date().toLocaleDateString("vi-VN")}
              </span>
            </p>
            <div className="flex gap-6">
              <button className="text-primary hover:text-primary-dark transition-colors">
                Trợ giúp
              </button>
              <button className="text-primary hover:text-primary-dark transition-colors">
                Cài đặt
              </button>
              <button className="text-accent hover:text-accent-dark transition-colors font-medium">
                Báo cáo sự cố
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
