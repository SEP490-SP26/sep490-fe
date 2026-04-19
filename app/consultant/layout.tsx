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
    role: "Tư vấn viên",
  };
  const handleNavigate = (id: number, status?: string | null) => {
    if (!status) return;
    switch (status.toLowerCase()) {
      case "consultantcreaterequest":
      case "clone-request":
      case "pending":
        router.push(`/consultant/request-detail/${id}`);
        break;
      case "cancel":
        router.push(`/consultant?orderId=${id}&mode=negotiate`);
        break;
      case "processing":
      case "verified":
        router.push(`/consultant/request-detail/${id}`);
        break;
      case "declined":
        router.push(`/consultant/request-detail/${id}`);
        break;
      case "waiting":
        router.push(`/consultant/request-detail/${id}`);
        break;
      case "accepted":
        router.push(`/consultant/request-detail/${id}`);
        break;
      case "rejected":
        router.push(`/consultant/request-detail/${id}`);
        break;
      case "finished":
        router.push(`/consultant/delivery/detail/${id}`);
        break;
      case "pendingpaid":
      case "paid":
        router.push(`/consultant/delivery/detail/${id}`);
        break;
      case "delivery":
        router.push(`/consultant/delivery/detail/${id}`);
        break;
      case "completed":
        router.push(`/consultant/request-detail/${id}`);
        break;
      default:
        router.push(`/consultant/request-detail/${id}`);
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
              <p className="text-secondary">
                copyright © 2026
              </p>
              {/* <button className="text-primary hover:text-primary-dark transition-colors">
                Trợ giúp
              </button>
              <button className="text-primary hover:text-primary-dark transition-colors">
                Cài đặt
              </button>
              <button className="text-accent hover:text-accent-dark transition-colors font-medium">
                Báo cáo sự cố
              </button> */}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
