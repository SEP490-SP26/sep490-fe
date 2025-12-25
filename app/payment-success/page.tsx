'use client'

import { CheckCircleOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

export default function PaymentSuccessPage() {
  const [showConfetti, setShowConfetti] = useState(false)
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Trigger animations
    setShowConfetti(true)
    setTimeout(() => setShowContent(true), 300)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-green-200 rounded-full opacity-30 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-teal-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#22c55e', '#10b981', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6'][Math.floor(Math.random() * 6)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      <div 
        className={`text-center z-10 transition-all duration-700 transform ${
          showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        {/* Success checkmark with ring animation */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-30" style={{ animationDuration: '2s' }} />
          <div className="relative w-32 h-32 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-300/50">
            <CheckCircleOutlined className="text-white text-6xl animate-bounce" style={{ animationDuration: '2s' }} />
          </div>
          {/* Sparkles */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-pulse shadow-lg" />
          <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 -right-5 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Text content */}
        <Title level={1} className="!text-green-700 !mb-2 !text-4xl md:!text-5xl font-bold">
          Thanh toán thành công!
        </Title>
        
        <Text className="text-lg text-gray-600 block mb-2">
          Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của chúng tôi
        </Text>
        
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-green-100 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <CheckCircleOutlined />
            <span className="font-medium">Giao dịch đã được xác nhận</span>
          </div>
          <Text className="text-gray-500 text-sm">
            Chúng tôi đã gửi email xác nhận đến địa chỉ email của bạn.
            <br />
            Vui lòng kiểm tra hộp thư để xem chi tiết đơn hàng.
          </Text>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button 
              type="primary" 
              size="large"
              icon={<HomeOutlined />}
              className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-0 shadow-lg shadow-green-300/50 hover:shadow-xl hover:shadow-green-400/50 transition-all duration-300 hover:scale-105"
            >
              Về trang chủ
            </Button>
          </Link>
          
          {/* <Link href="/history">
            <Button 
              size="large"
              className="h-14 px-10 text-lg font-semibold border-2 border-green-500 text-green-600 hover:bg-green-50 transition-all duration-300 hover:scale-105"
            >
              Xem đơn hàng
            </Button>
          </Link> */}
        </div>

        {/* Footer note */}
        <Text className="text-gray-400 text-sm mt-10 block">
          Nếu có bất kỳ thắc mắc nào, vui lòng liên hệ hotline: <span className="text-green-600 font-medium">1900.xxxx</span>
        </Text>
      </div>

      {/* Custom styles for animations */}
      <style jsx global>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti {
          animation: confetti 4s ease-in-out forwards;
        }
      `}</style>
    </div>
  )
}
