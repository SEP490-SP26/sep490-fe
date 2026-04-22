"use client";

import Footer from "@/components/Footer/Footer";
import OverviewSidebar from "@/components/OverviewSidebar/OverviewSidebar";
import React, { Suspense } from "react";

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Đang tải...</div>
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <OverviewSidebar />
      <div className="flex-1 flex flex-col h-full overflow-y-auto relative w-full">
        <main className="flex-1">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
        <Footer />
      </div>
    </div>
  );
}
