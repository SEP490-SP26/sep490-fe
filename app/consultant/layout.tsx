"use client";
import { consultantNavItems } from "@/components/sidebar/presets";
import Sidebar from "@/components/sidebar/Sidebar";
import React from "react";
import { FiList, FiLogOut, FiShoppingCart } from "react-icons/fi";

export default function LayoutManager({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}

      <Sidebar
        userInfo={{
          name: "Tư vấn viên A",
          role: "Công ty in ấn",
        }}
        navItems={[...consultantNavItems]}
        onLogout={() => {
          // Xử lý logout
          console.log("Logout clicked");
        }}
        onItemClick={(item) => {
          // Xử lý khi click vào item
          console.log("Item clicked:", item.label);
        }}
      />

      {/* Main content */}
      <main className="ml-72 min-h-screen p-4">
        {/* Content */}
        <div className="bg-white ">{children}</div>

        {/* Footer main */}
        <footer className="mt-8 pt-6 border-t border-gray-100">
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
      </main>
    </div>
  );
}
