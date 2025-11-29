"use client";

import React, { Suspense } from "react";
import Loading from "./loading";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";

export default function Layout({ children }: { children: React.ReactNode }) {
//   const [currentPage, setCurrentPage] = useState("");

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
