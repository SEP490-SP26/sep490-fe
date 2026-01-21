'use client'

import { otpsApi } from '@/apiRequests/otps'
import { requestOrderApi } from '@/apiRequests/request'
import RejectDealSuccess from './confirm'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileExclamationOutlined,
  MobileOutlined,
  LockOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Typography,
  message,
  Steps,
  Form
} from 'antd'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

const { Title, Text } = Typography
const { TextArea } = Input

function RejectDealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderRequestId');
  const token = searchParams.get('token');

  const [reason, setReason] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) {
      message.warning("Vui lòng nhập số điện thoại");
      return;
    }
    try {
      setLoadingOtp(true);
      await otpsApi.sendOtpSMS({ phone });
      setOtpSent(true);
      message.success("Mã OTP đã được gửi!");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Gửi OTP thất bại");
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleRejectDeal = async () => {
    if (!orderId) {
      message.error("Không tìm thấy mã đơn hàng");
      return;
    }
    if (!phone || !otp) {
      message.error("Vui lòng nhập đầy đủ thông tin xác thực");
      return;
    }
    if (!reason) {
      message.error("Vui lòng chọn hoặc nhập lý do từ chối");
      return;
    }

    try {
      setLoading(true);
      const bodyResquest = {
        orderRequestId: Number(orderId),
        token: token || "",
        reason,
        phone,
        otp
      }
      await requestOrderApi.rejectDeal(bodyResquest);
      message.success("Đã từ chối đơn hàng thành công");
      setIsSuccess(true);
      // router.push("/");
    } catch (err: any) {
      message.error(err.response?.data?.message || "Từ chối thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return <RejectDealSuccess />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-zinc-200 flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-gray-200 rounded-full opacity-30 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-zinc-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float text-gray-300 opacity-40"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${4 + Math.random() * 2}s`,
              fontSize: `${12 + Math.random() * 16}px`,
            }}
          >
            ✕
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Title level={2} style={{ color: '#cf1322', textTransform: 'uppercase' }}>
            Xác Nhận Từ Chối
          </Title>
          <Text type="secondary">
            Vui lòng xác thực và cung cấp lý do để từ chối đơn hàng
          </Text>
        </div>

        <Card className="shadow-lg rounded-xl border-t-4 border-red-500">
          <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-100 flex items-center gap-3">
            <FileExclamationOutlined className="text-2xl text-red-500" />
            <div>
              <Text type="secondary" className="block text-xs uppercase font-semibold">Mã đơn hàng</Text>
              <Text strong className="text-lg">{orderId || "---"}</Text>
            </div>
          </div>

          <div className="space-y-6">
            {/* Phone Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  size="large"
                  placeholder="Nhập số điện thoại"
                  prefix={<MobileOutlined className="text-gray-400" />}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={otpSent}
                />
                <Button
                  size="large"
                  type="primary"
                  onClick={handleSendOtp}
                  loading={loadingOtp}
                  disabled={otpSent || !phone}
                >
                  {otpSent ? "Đã gửi" : "Gửi OTP"}
                </Button>
              </div>
            </div>

            {/* OTP Input */}
            {otpSent && (
              <div className="animate-fade-in">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã OTP <span className="text-red-500">*</span>
                </label>
                <div className="flex justify-center mb-2">
                  <Input.OTP
                    length={6}
                    onChange={(value) => setOtp(value)}
                  />
                </div>
                <Text type="secondary" className="text-xs block text-center">
                  Nhập mã 6 số đã được gửi tới điện thoại của bạn
                </Text>
              </div>
            )}

            {/* Reason Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <Space direction="vertical" className="w-full">
                <Select
                  size="large"
                  value={reason}
                  disabled={!otpSent}
                  onChange={(e) => setReason(e)}
                  placeholder="Chọn lý do từ chối..."
                  className="w-full"
                  status={!reason && otpSent ? "warning" : ""}
                >
                  <Select.Option value="Ngày giao quá gấp">Ngày giao quá gấp</Select.Option>
                  <Select.Option value="Giá không hợp lý">Giá không hợp lý</Select.Option>
                  <Select.Option value="Thay đổi kích thước, số lượng">Thay đổi kích thước, số lượng</Select.Option>
                  <Select.Option value="Lý do khác">Lý do khác</Select.Option>
                </Select>

                {reason === "Lý do khác" && (
                  <TextArea
                    rows={3}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Nhập chi tiết lý do..."
                    className="mt-2"
                  />
                )}
              </Space>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button
              size="large"
              className="flex-1"
              onClick={() => router.push("/")}
            >
              Hủy bỏ
            </Button>
            <Button
              size="large"
              type="primary"
              danger
              className="flex-1"
              icon={<CloseCircleOutlined />}
              disabled={!otpSent || !otp || !reason}
              loading={loading}
              onClick={handleRejectDeal}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </Card>
      </div>
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function RejectDealPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RejectDealContent />
    </Suspense>
  );
}
