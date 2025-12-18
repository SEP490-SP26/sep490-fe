"use client";
import { useCustomer } from "@/context/CustomerContext";
import { UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Space } from "antd";
import Link from "next/link";
import { Suspense } from "react";
import HeaderSearch from "./HeaderSearch";

export default function Header() {
  const { customer, isLoggedIn, isLoading } = useCustomer();

  return (
    <div>
      <div
        className={`bg-gray-900 sticky top-0 z-50 mx-auto flex flex-wrap justify-between items-center transition-all duration-300 ease-in-out px-4 sm:px-10 py-2`}
      >
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <div className="text-xl font-bold">
            <Link href="/">
              <span className="text-accent uppercase ">Công TY Cô Phần In ấn</span>
            </Link>
          </div>

          {/* Mobile: Show icon or buttons */}
          <div className="flex items-center space-x-3 sm:hidden ml-auto">
            {!isLoading && (
              isLoggedIn ? (
                <Link href="/customer/profile">
                  <Avatar
                    size="default"
                    icon={<UserOutlined />}
                    className="bg-accent cursor-pointer hover:bg-green-700 transition-colors"
                  />
                </Link>
              ) : (
                <Space size="small">
                  <Link href="/login">
                    <Button type="primary" size="small" ghost className="border-green-500 text-accent">
                      Đăng nhập
                    </Button>
                  </Link>
                </Space>
              )
            )}
          </div>
        </div>

        {/* Search bar */}
        <Suspense>
          <HeaderSearch placeholder="Tìm kiếm sản phẩm in ấn ..." />
        </Suspense>

        {/* Desktop: Show icon or buttons */}
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
                <Link href="/register">
                  <Button 
                    type="primary"
                    className="bg-green-600 hover:bg-green-700 border-green-600"
                  >
                    Đăng ký
                  </Button>
                </Link>
              </Space>
            )
          )}
        </div>
      </div>
    </div>
  );
}
