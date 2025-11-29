"use client";
import { Badge } from "antd";
import Link from "next/link";
import { Suspense } from "react";
import { BsPersonCircle } from "react-icons/bs";
import HeaderSearch from "./HeaderSearch";

export default function Header() {
  return (
    <div>
      <div
        className={`bg-gray-900 sticky top-0 z-50 mx-auto flex flex-wrap justify-between items-center transition-all duration-300 ease-in-out px-4 sm:px-10 py-2`}
      >
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="text-xl font-bold">
            <Link href="/">
              <span className="text-green-600 uppercase ">Công TY Cô Phần In ấn</span>
            </Link>
          </div>

          {/* Hiện trên mobile, ẩn ở sm trở lên */}
          <div className="flex items-center space-x-5 sm:hidden">
            <Link href="/login">
              <Badge>
                <BsPersonCircle className="size-6 fill-green-700" />
              </Badge>
            </Link>
          </div>
        </div>

        {/* Thanh tìm kiếm */}
        <Suspense>
          <HeaderSearch placeholder="Tìm kiếm sản phẩm in ấn ..." />
        </Suspense>

        {/* Icon hiển thị bình thường ở sm trở lên, ẩn trên mobile */}
        <div className="hidden sm:flex justify-items-center items-centerBoardgame space-x-6 lg:space-x-10">
          <Link href="/login">
            <BsPersonCircle className="size-8 fill-green-700" />
          </Link>
        </div>
      </div>
    </div>
  );
}
