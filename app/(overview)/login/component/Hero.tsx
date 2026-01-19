"use client";

import authApiRequest from "@/apiRequests/auth";
import { useAuth } from "@/lib/auth-context";
import {
  LoginBodyAlternative,
  LoginBodyAlternativeType,
} from "@/schemaValidations/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { setCookie } from "cookies-next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

export default function Hero() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"username" | "email">("email");
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    clearErrors,
    setFocus,
  } = useForm<LoginBodyAlternativeType>({
    resolver: zodResolver(LoginBodyAlternative),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const toggleLoginMethod = () => {
    const newMethod = loginMethod === "username" ? "email" : "username";
    if (newMethod === "username") {
      setValue("email", "");
      clearErrors("email");
    } else {
      setValue("username", "");
      clearErrors("username");
    }
    setLoginMethod(newMethod);
  };

  useEffect(() => {
    if (errors.username || errors.email) {
      if (loginMethod === "username" && errors.username) {
        setFocus("username");
      } else if (loginMethod === "email" && errors.email) {
        setFocus("email");
      }
    }
  }, [errors.username, errors.email, loginMethod, setFocus]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative flex min-h-screen">
        {/* Left Panel - Graphics */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-cyan-500 p-12 flex-col justify-between">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-sm transform rotate-12"></div>
            </div>
            <span className="text-white text-2xl font-bold">Print<span className="text-cyan-200">Pro</span></span>
          </Link>

          <div className="max-w-md">
            <h1 className="text-white text-4xl font-bold mb-6">
              Giải pháp in ấn chuyên nghiệp cho doanh nghiệp
            </h1>
            <p className="text-blue-100 text-lg">
              Đăng nhập để quản lý đơn hàng, thiết kế và theo dõi tiến độ in ấn của bạn
            </p>

            <div className="mt-12 grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-white font-semibold mb-2">In nhanh</div>
                <div className="text-blue-200 text-sm">Giao hàng 24h</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-white font-semibold mb-2">Chất lượng</div>
                <div className="text-blue-200 text-sm">Độ sắc nét cao</div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-white/80">
            <div className="flex-1 h-px bg-white/30"></div>
            <span>PrintPro © 2024</span>
            <div className="flex-1 h-px bg-white/30"></div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-800">Đăng nhập</h2>
              <p className="text-gray-600 mt-2">Chào mừng trở lại PrintPro</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}