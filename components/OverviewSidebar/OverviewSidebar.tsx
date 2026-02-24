"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCustomer } from "@/context/CustomerContext";
import {
    UserOutlined,
    SearchOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    FileSearchOutlined,
    LoginOutlined,
    LogoutOutlined,
    HomeOutlined,
    PhoneOutlined,
    MailOutlined,
    FacebookOutlined,
    InstagramOutlined,
    YoutubeOutlined
} from "@ant-design/icons";
import { Avatar, Button, Tooltip } from "antd";
import Image from "next/image";

export default function OverviewSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { customer, isLoggedIn, isLoading, logout } = useCustomer();
    const pathname = usePathname();

    const navItems = [
        { label: "Trang chủ", href: "/", icon: HomeOutlined },
        { label: "Tra cứu đơn", href: "/look-up", icon: FileSearchOutlined },
        // Add more items here as needed
    ];

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    return (
        <div
            className={`relative flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${collapsed ? "w-20" : "w-64"
                }`}
        >
            {/* Toggle Button - Floating on Border */}
            <button
                onClick={toggleCollapsed}
                className="absolute -right-3 top-9 z-50 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md text-gray-500 hover:text-green-600 hover:border-green-600 transition-colors"
                title={collapsed ? "Mở rộng" : "Thu gọn"}
            >
                {collapsed ? <div className="text-[10px]">&gt;</div> : <div className="text-[10px]">&lt;</div>}
            </button>

            {/* Header / Logo */}
            <div className={`flex items-center ${collapsed ? "justify-center" : "px-6"} border-b border-gray-100 h-16 transition-all duration-300`}>
                <Link href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                    {!collapsed ? (
                        <img src="assets/images/logo.png" alt="Logo" className=" object-contain transition-all duration-300" />
                    ) : (
                        <img src="assets/images/icon.ico" alt="Icon" className="w-8 h-8 object-contain transition-all duration-300" />
                    )}
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6 flex flex-col">
                <ul className="space-y-2 px-3">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-300 ${isActive
                                        ? "bg-primary text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-primary"
                                        }`}
                                >
                                    {/* Active Indicator Bar */}
                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-md transition-all duration-300 ${isActive ? "opacity-100" : "opacity-0"}`} />

                                    <item.icon className={`text-xl transition-all duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`} />

                                    <span className={`font-medium whitespace-nowrap transition-all duration-300 origin-left ${collapsed
                                        ? "opacity-0 w-0 translate-x-[-10px] overflow-hidden"
                                        : "opacity-100 w-auto translate-x-0"
                                        }`}>
                                        {item.label}
                                    </span>

                                    {/* Tooltip for collapsed state */}
                                    {collapsed && (
                                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                                            {item.label}
                                        </div>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Contact & Social */}
                <div className="px-3 mt-auto pt-8">
                    <div className="border-t border-gray-100 pt-4">
                        {!collapsed && (
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">Liên hệ</h3>
                        )}
                        <div className="space-y-1 mb-4">
                            <Tooltip title={collapsed ? "0987 654 321" : ""} placement="right">
                                <a href="tel:0987654321" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-primary transition-colors ${collapsed ? "justify-center" : ""}`}>
                                    <PhoneOutlined className="text-xl" />
                                    {!collapsed && <span className="text-sm font-medium">0987 654 321</span>}
                                </a>
                            </Tooltip>
                            <Tooltip title={collapsed ? "contact@sep490.com" : ""} placement="right">
                                <a href="mailto:contact@sep490.com" className={`flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-primary transition-colors ${collapsed ? "justify-center" : ""}`}>
                                    <MailOutlined className="text-xl" />
                                    {!collapsed && <span className="text-sm font-medium">contact@sep490.com</span>}
                                </a>
                            </Tooltip>
                        </div>

                        {/* {!collapsed && (
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Mạng xã hội</h3>
                        )} */}
                        <div className={`flex items-center px-3 ${collapsed ? "flex-col gap-4" : "gap-4"}`}>
                            <Tooltip title={collapsed ? "Facebook" : ""} placement="right">
                                <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                                    <FacebookOutlined className="text-xl" />
                                </a>
                            </Tooltip>
                            <Tooltip title={collapsed ? "Instagram" : ""} placement="right">
                                <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                                    <InstagramOutlined className="text-xl" />
                                </a>
                            </Tooltip>
                            <Tooltip title={collapsed ? "Youtube" : ""} placement="right">
                                <a href="#" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-600 transition-colors">
                                    <YoutubeOutlined className="text-xl" />
                                </a>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </nav>

            {/* User Section */}
            <div className="border-t border-gray-100 p-4">
                {!isLoading && (
                    <>
                        {isLoggedIn ? (
                            <div className={`flex items-center transition-all duration-300 ${collapsed ? "justify-center" : "gap-3"}`}>
                                <Link href="/customer/profile">
                                    <Avatar
                                        size="large"
                                        icon={<UserOutlined />}
                                        className="bg-green-600 cursor-pointer hover:ring-2 hover:ring-green-300 transition-all border-2 border-white shadow-sm"
                                    />
                                </Link>

                                <div className={`flex-1 overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "w-auto opacity-100"}`}>
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {customer?.name || "Khách hàng"}
                                    </p>
                                    <button
                                        onClick={logout}
                                        className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 mt-0.5 transition-colors"
                                    >
                                        <LogoutOutlined /> Đăng xuất
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={`flex transition-all duration-300 ${collapsed ? "justify-center" : "flex-col gap-2"}`}>
                                {collapsed ? (
                                    <Link href="/login">
                                        <Tooltip title="Đăng nhập" placement="right">
                                            <Button type="primary" shape="circle" icon={<LoginOutlined />} className="bg-green-600 border-green-600 shadow-md hover:scale-105 transition-transform" />
                                        </Tooltip>
                                    </Link>
                                ) : (
                                    <Link href="/login" className="w-full">
                                        <Button type="primary" block className="bg-green-600 border-green-600 hover:bg-green-500 shadow-sm h-10 font-medium">
                                            Đăng nhập
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
