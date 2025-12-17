"use client";

import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
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
    <>
      <Header />
      <div className="bg-gray-50">
        <main className="">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </main>
      </div>
      <Footer />
    </>
  );
}
