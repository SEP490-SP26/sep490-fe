'use client'

import { CloseCircleOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

export default function PaymentCancelPage() {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setTimeout(() => setShowContent(true), 200)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-red-200 rounded-full opacity-30 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-amber-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Floating X particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float text-red-300 opacity-40"
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

      {/* Main content */}
      <div 
        className={`text-center z-10 transition-all duration-700 transform ${
          showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        {/* Cancel icon with shake animation */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }} />
          <div className="relative w-32 h-32 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-300/50 animate-shake">
            <CloseCircleOutlined className="text-white text-6xl" />
          </div>
          {/* Warning dots */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full animate-pulse shadow-lg" />
          <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Text content */}
        <Title level={1} className="!text-red-600 !mb-2 !text-4xl md:!text-5xl font-bold">
          Thanh toán bị hủy
        </Title>
        
        <Text className="text-lg text-gray-600 block mb-2">
          Giao dịch của bạn đã bị hủy hoặc không thành công
        </Text>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-red-100 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
            <CloseCircleOutlined />
            <span className="font-medium">Giao dịch không hoàn tất</span>
          </div>
          <Text className="text-gray-500 text-sm">
            Không có khoản tiền nào bị trừ từ tài khoản của bạn.
            <br />
            Bạn có thể thử lại hoặc liên hệ hỗ trợ nếu cần giúp đỡ.
          </Text>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button 
              type="primary" 
              size="large"
              icon={<HomeOutlined />}
              className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border-0 shadow-lg shadow-red-300/50 hover:shadow-xl hover:shadow-red-400/50 transition-all duration-300 hover:scale-105"
            >
              Về trang chủ
            </Button>
          </Link>
          
          {/* <Button 
            size="large"
            icon={<ReloadOutlined />}
            onClick={() => window.history.back()}
            className="h-14 px-10 text-lg font-semibold border-2 border-orange-500 text-orange-600 hover:bg-orange-50 transition-all duration-300 hover:scale-105"
          >
            Thử lại
          </Button> */}
        </div>

        {/* Footer note */}
        <Text className="text-gray-400 text-sm mt-10 block">
          Cần hỗ trợ? Liên hệ hotline: <span className="text-red-500 font-medium">1900.xxxx</span>
        </Text>
      </div>

      {/* Custom styles for animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-2deg); }
          20%, 40%, 60%, 80% { transform: rotate(2deg); }
        }
        
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
