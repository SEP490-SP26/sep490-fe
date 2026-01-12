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

export default function LoginPage() {
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
        username: loginMethod === "username" ? data.username : undefined,
        email: loginMethod === "email" ? data.email : undefined,
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
          router.replace("/admin/dashboard");
          break;
        case 2:
          router.replace("/consultant");
          break;
        case 3:
          router.replace("/manager");
          break;
        case 5:
          router.replace("/staff");
          break;
        default:
          router.replace("/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập
          </h2>
          <div className="mt-4 text-center text-sm text-gray-600">
            {loginMethod === "username"
              ? "Đăng nhập bằng Username"
              : "Đăng nhập bằng Email"}
          </div>
        </div>
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

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleLoginMethod}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {loginMethod === "username"
                ? "↪ Đăng nhập bằng Email?"
                : "↪ Đăng nhập bằng Username?"}
            </button>

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
  );
}
