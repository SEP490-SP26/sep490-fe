"use client";

import { Button, Result } from "antd";
import { useRouter } from "next/navigation";
import { ArrowLeftOutlined, LoginOutlined } from "@ant-design/icons";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-lg w-full">
        <Result
          status="403"
          title="403"
          subTitle={<span className="text-gray-600 text-base">Xin lỗi, bạn không có quyền truy cập vào trang này hoặc phiên đăng nhập của bạn đã hết hạn.</span>}
          extra={
            <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
              <Button
                type="primary"
                icon={<LoginOutlined />}
                size="large"
                onClick={() => router.push("/management-login")}
                className="bg-blue-600 hover:bg-blue-500 w-full sm:w-auto"
              >
                Đăng nhập Nội bộ
              </Button>
              <Button
                icon={<ArrowLeftOutlined />}
                size="large"
                onClick={() => router.push("/")}
                className="w-full sm:w-auto"
              >
                Về Trang chủ
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
