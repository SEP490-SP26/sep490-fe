"use client";
import { consultantNavItems } from "@/components/sidebar/presets";
import Sidebar from "@/components/sidebar/Sidebar";
import { useRouter } from "next/navigation";
import React from "react";
import { FiList, FiLogOut, FiShoppingCart } from "react-icons/fi";

export default function LayoutManager({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
          router.push("/management-login");
        }}
        onItemClick={(item) => {
          // Xử lý khi click vào item
          console.log("Item clicked:", item.label);
        }}
      />

      {/* Main content */}
      <main className="ml-72 min-h-screen ">
        {/* Content */}
        <div className="bg-gradient-to-br from-primary-dark to-primary-light ">{children}</div>

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
      </main>
    </div>
  );
}
