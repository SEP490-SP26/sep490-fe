"use client";
import { consultantNavItems } from "@/components/sidebar/presets";
import RoleHeader from "@/components/Header/RoleHeader";
import Sidebar from "@/components/sidebar/Sidebar";
import { useRouter } from "next/navigation";
import React from "react";
import { FiList, FiLogOut, FiShoppingCart } from "react-icons/fi";

export default function LayoutConsultant({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const userInfo = {
    name: "Tư vấn viên",
    role: "Consultant",
  };
  const handleNavigate = (id: number, status?: string | null) => {
  if (!status) return;

  switch (status) {
    case "Pending":
      router.push(`/consultant?orderId=${id}&mode=negotiate`);
      break;
    case "Verified":
      router.push(`/consultant/request-detail/${id}`);
      break;
    case "Declined":
      router.push(`/consultant?$orderId=${id}&mode=negotiate`);
      break;
    default:
      router.push(`/consultant/${id}`);
  }
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
        navItems={[...consultantNavItems]}
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
          onNavigateToRequest={handleNavigate}
        />
        <main className="flex-1">
          {/* Content */}
          <div className=" min-h-full">
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
