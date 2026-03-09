"use client";
import React, { useState } from "react";
import { useCustomer } from "@/context/CustomerContext";
import { UserOutlined, SearchOutlined, CloseOutlined } from "@ant-design/icons";
import { Avatar, Button, Space } from "antd";
import Link from "next/link";
import { Suspense } from "react";
import HeaderSearch from "./HeaderSearch";
import GooeyNav from "../Bits/GooeyNav";

export default function Header() {
  const { customer, isLoggedIn, isLoading } = useCustomer();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    // { label: "Về chúng tôi", href: "/about" },
    // { label: "Sản phẩm", href: "/products" },
    { label: "Tra cứu đơn", href: "/look-up" },
  ];

  return (
    <div>
      <div
        className={` sticky top-0 z-50 mx-auto flex flex-wrap justify-between items-center transition-all duration-300 ease-in-out px-4 sm:px-10 py-2 min-h-[64px]`}
      >
        {/* Left Section: Logo  */}
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold">
            <Link href="/">
              {/* <span className="text-primary uppercase ">In Ấn Đại Phúc Hải</span> */}
              <img src="/assets/images/logo.png" alt="" />
            </Link>
          </div>


        </div>

        {/* Center Section: Navigation or Search Input */}
        <div className="flex-1 flex justify-center px-4">
          <div className={`transition-all duration-300 ${isSearchOpen ? "w-full max-w-2xl" : "w-auto"}`}>
            {isSearchOpen ? (
              <Suspense>
                <HeaderSearch placeholder="Tìm kiếm sản phẩm in ấn ..." className="w-full" />
              </Suspense>
            ) : (
              <div className="hidden sm:block">
                <GooeyNav
                  items={navItems}
                  particleCount={5}
                  particleR={50}
                  particleDistances={[90, 10]}
                  colors={[1, 1]} // Using default/custom colors logic from GooeyNav
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Section: User Controls */}
        <div className="flex items-center">
          {/* Mobile User Controls (Visible on small screens) */}
          <div className="flex items-center space-x-3 sm:hidden">
            {!isLoading && (
              isLoggedIn ? (
                <Link href="/customer/profile">
                  <Avatar
                    size="default"
                    icon={<UserOutlined />}
                    className="bg-primary cursor-pointer hover:bg-green-700 transition-colors"
                  />
                </Link>
              ) : (
                <Link href="/login">
                  <Button type="primary" size="small" ghost className="border-green-500 text-accent">
                    Login
                  </Button>
                </Link>
              )
            )}
          </div>
          {/* right search */}
          <Button
            type="text"
            icon={isSearchOpen ? <CloseOutlined style={{ color: 'white' }} /> : <SearchOutlined style={{ color: 'white' }} />}
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center justify-center hover:bg-gray-800"
          />

          {/* Desktop User Controls */}
          <div className="hidden sm:flex justify-items-center items-center space-x-4">
            {!isLoading && (
              isLoggedIn ? (
                <Link href="/customer/profile">
                  <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                    <Avatar
                      size="default"
                      icon={<UserOutlined />}
                      className="bg-green-600"
                    />
                    <span className="text-accent font-medium hidden lg:inline">
                      {customer?.name?.split(' ').pop() || 'Tài khoản'}
                    </span>
                  </div>
                </Link>
              ) : (
                <Space size="middle">
                  <Link href="/login">
                    <Button
                      type="primary"
                      ghost
                      className="border-green-500 text-accent hover:border-green-400 hover:text-green-400"
                    >
                      Đăng nhập
                    </Button>
                  </Link>
                </Space>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
