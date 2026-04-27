"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  LoginBodyAlternative,
  LoginBodyAlternativeType,
} from "@/schemaValidations/auth.schema";
import { useAuth } from "@/lib/auth-context";
import authApiRequest from "@/apiRequests/auth";
import { setCookie } from "cookies-next";
import Image from "next/image";
import { jwtDecode } from "jwt-decode";
import Link from "next/link";
import { useCustomer } from "@/context/CustomerContext";



declare global {
  interface Window {
    google: any;
  }
}

type GoogleJwtPayload = {
  email: string;
  name: string;
  roleid: string; // 👈 claim BE đã set
  exp: number;
};


export default function LoginPage() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"username" | "email">("username");
  const router = useRouter();
  const { login } = useAuth();
  const { login: customerLogin } = useCustomer();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
    clearErrors,
    watch,
    trigger,
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

    // Clear field cũ và validation errors
    if (newMethod === "username") {
      setValue("email", "");
      clearErrors("email");
    } else {
      setValue("username", "");
      clearErrors("username");
    }

    setLoginMethod(newMethod);
  };

  // Xử lý khi form có lỗi validation
  useEffect(() => {
    if (errors.username || errors.email) {
      // Nếu có lỗi ở username hoặc email, focus vào field tương ứng
      if (loginMethod === "username" && errors.username) {
        setFocus("username");
      } else if (loginMethod === "email" && errors.email) {
        setFocus("email");
      }
    }
  }, [errors.username, errors.email, loginMethod, setFocus]);

  const onSubmit = async (data: LoginBodyAlternativeType) => {
    try {
      setIsLoading(true);
      setError("");

      console.log("Form data:", data);
      console.log("Login method:", loginMethod);

      // Tạo payload đúng format backend mong đợi
      // Giả sử backend mong đợi cả 2 field username và email (một trong hai có thể null)
      const payload = {
        username: loginMethod === "username" ? data.username : "string",
        email: loginMethod === "email" ? data.email : "string",
        password: data.password,
      };

      console.log("Sending payload:", payload);

      // Gửi request
      const response = await authApiRequest.login(payload);

      console.log("Response:", response); //

      const { jwt, role_id, user_id, full_name } = response;

      // Lưu token cho middleware
      setCookie("token", jwt, {
        path: "/",
        sameSite: "lax",
        maxAge: 120 * 60,
      });

      //  Lưu auth context
      login(jwt, {
        user_id,
        role_id,
        full_name,
      });

      // Redirect theo role
      switch (role_id) {
        case 1:
          router.replace("/admin");
          break;
        case 2:
          router.replace("/consultant/requests");
          break;
        case 3:
          router.replace("/manager");
          break;
        case 4:
          router.replace("/warehouse");
          break;
        case 5:
          const mockCustomer = {
            id: `CUST-${user_id}`,
            phone: loginMethod === "username" ? data.username : "0123456789",
            name: full_name || "Customer",
            email: loginMethod === "email" ? data.email : "",
            createdAt: new Date().toISOString(),
            addresses: []
          };
          customerLogin(mockCustomer);
          router.replace("/customer/profile");
          break;
        case 6:
          router.replace("/productions-manager");
          break;
        case 18:
          router.replace("/general-manager");
          break;
        default:
          router.replace("/");
          break;
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setIsLoading(false);

      let errorMessage = "Đăng nhập thất bại";

      // Xử lý lỗi mạng
      if (
        err.message?.includes("Network Error") ||
        err.code === "ERR_NETWORK"
      ) {
        errorMessage =
          "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
      }
      // Xử lý lỗi từ server
      else if (err.response) {
        const serverError = err.response.data;
        errorMessage =
          serverError?.message ||
          serverError?.error ||
          `Lỗi server: ${err.response.status}`;

        // Nếu là lỗi 401 (Unauthorized)
        if (err.response.status === 401) {
          errorMessage =
            serverError?.message || "Tài khoản hoặc mật khẩu không chính xác";
        }
      }

      setError(errorMessage);
    }
  };

  /* =========================
       GOOGLE LOGIN
       ========================= */

  useEffect(() => {
    if (document.getElementById("google-gsi")) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = "google-gsi";
    document.body.appendChild(script);
  }, []);

  const handleCredentialResponse = async (response: any) => {
    try {
      setIsLoading(true);
      const res = await authApiRequest.loginWithGoogle(
        response.credential
      );
      // BE Google trả access_token
      const token: string = res.access_token.result;
      if (typeof token !== "string") throw new Error("Token không hợp lệ");
      // Decode JWT để lấy role
      const decoded = jwtDecode<GoogleJwtPayload>(token);

      if (!decoded.roleid) {
        throw new Error("JWT không chứa roleid");
      }

      const role_id = Number(decoded.roleid);

      // Lưu token
      setCookie("token", token, {
        path: "/",
        sameSite: "lax",
        maxAge: 120 * 60,
      });

      // Lưu auth context
      login(token, {
        user_id: role_id, // BE Google chưa trả
        role_id,
        full_name: decoded.name,
      });

      console.log(role_id);
      //Redirect giống login thường
      switch (role_id) {
        case 1:
          router.replace("/admin");
          break;
        case 2:
          router.replace("/consultant/requests");
          break;
        case 3:
          router.replace("/manager");
          break;
        case 4:
          router.replace("/warehouse");
          break;
        case 5:
          const googleMockCustomer = {
            id: `CUST-${role_id}`,
            phone: "0123456789",
            name: decoded.name || "Customer",
            email: decoded.email || "",
            createdAt: new Date().toISOString(),
            addresses: []
          };
          customerLogin(googleMockCustomer);
          router.replace("/customer/profile");
          break;
        default:
          router.replace("/");
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError("Đăng nhập Google thất bại");
      setIsLoading(false);
    }
  };



  const handleGoogleLogin = () => {
    if (!window.google) return;

    window.google.accounts.id.initialize({
      client_id:
        "222419838594-dicvpm40bukb6e5mdk2chtrhfbigg8eo.apps.googleusercontent.com",
      callback: handleCredentialResponse,
      use_fedcm: false,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window.google.accounts.id.prompt();
  };



  return (

    <div className="min-h-screen mx-auto">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="relative flex min-h-screen">
        {/* Left Panel - Graphics */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-dark to-primary-light p-12 flex-col justify-between">
          <Link href="/" className="flex items-center space-x-3">
            {/* <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-sm transform rotate-12"></div>
            </div> */}
            {/* <span className="text-white text-2xl font-bold">Print<span className="text-cyan-200">Pro</span></span> */}
          </Link>

          <div className="max-w-md">
            <h1 className="text-white text-4xl font-bold mb-6">
              Giải pháp in ấn chuyên nghiệp cho doanh nghiệp
            </h1>
            <p className="text-blue-100 text-lg">
              Đăng nhập để quản lý đơn hàng, thiết kế và theo dõi tiến độ in ấn của bạn
            </p>

            <div className="mt-12 grid grid-cols-2 gap-6">
              {/* <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-white font-semibold mb-2">In nhanh</div>
                <div className="text-blue-200 text-sm">Giao hàng 24h</div>
              </div> */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-white font-semibold mb-2">Chất lượng</div>
                <div className="text-blue-200 text-sm">Độ sắc nét cao</div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-white/80">
            <div className="flex-1 h-px bg-white/30"></div>
            {/* <span>PrintPro © 2024</span> */}
            <div className="flex-1 h-px bg-white/30"></div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              {/* <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div> */}
              <h2 className="text-3xl font-bold text-gray-800">Đăng nhập</h2>
              <p className="text-gray-600 mt-2">Chào mừng trở lại Đại Phúc Hải</p>
              <div className="max-w-md w-full space-y-8">

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                  <div className="rounded-md shadow-sm -space-y-px">
                    <div>
                      {loginMethod === "username" ? (
                        <>
                          <label htmlFor="username" className="sr-only">
                            Username
                          </label>
                          <input
                            {...register("username")}
                            id="username"
                            type="text"
                            autoComplete="username"
                            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            placeholder="Tên đăng nhập"
                            onFocus={() => clearErrors("username")}
                          />
                          {errors.username && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.username.message}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <label htmlFor="email" className="sr-only">
                            Email
                          </label>
                          <input
                            {...register("email")}
                            id="email"
                            type="email"
                            autoComplete="email"
                            className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                            placeholder="Email"
                            onFocus={() => clearErrors("email")}
                          />
                          {errors.email && (
                            <p className="text-red-500 text-sm mt-1">
                              {errors.email.message}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    <div>
                      <label htmlFor="password" className="sr-only">
                        Mật khẩu
                      </label>
                      <input
                        {...register("password")}
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                        placeholder="Mật khẩu"
                        onFocus={() => clearErrors("password")}
                      />
                      {errors.password && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.password.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm text-center p-2 bg-red-50 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-end">
                    {/* <button
                      type="button"
                      onClick={toggleLoginMethod}
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      {loginMethod === "username"
                        ? "↪ Đăng nhập bằng Email?"
                        : "↪ Đăng nhập bằng Username?"}
                    </button> */}

                    <a
                      href="/forgot-password"
                      className="text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      Quên mật khẩu?
                    </a>
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Đang đăng nhập...
                        </>
                      ) : (
                        "Đăng nhập"
                      )}
                    </button>
                    <div className="mt-6">
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-gray-50 text-gray-500">Hoặc</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="mt-6 w-full flex items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Image
                          src="https://www.svgrepo.com/show/475656/google-color.svg"
                          alt="Google"
                          width={20}
                          height={20}
                          priority
                        />
                        Đăng nhập bằng Google
                      </button>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Chưa có tài khoản?{" "}
                      <a
                        href="/register"
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        Đăng ký ngay
                      </a>
                    </p>
                  </div>
                </form>
              </div>
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
