import React, { Suspense } from "react";
import Loading from "./loading";
import Footer from "@/components/Footer/Footer";
import OverviewSidebar from "@/components/OverviewSidebar/OverviewSidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
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
