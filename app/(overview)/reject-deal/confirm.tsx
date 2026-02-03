'use client'

import { CloseCircleOutlined, HomeOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

export default function RejectDealSuccess() {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    setTimeout(() => setShowContent(true), 200)
  }, [])

  return (
    <div className="min-h-screen bg-primary-dark  flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background circles */}
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

      {/* Main content */}
      <div
        className={`text-center z-10 transition-all duration-700 transform ${showContent ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
          }`}
      >
        {/* Reject icon */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-gray-400 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }} />
          <div className="relative w-32 h-32 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full flex items-center justify-center shadow-2xl shadow-gray-300/50">
            <CloseCircleOutlined className="text-white text-6xl" />
          </div>
          {/* Dots */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-400 rounded-full animate-pulse shadow-lg" />
          <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Text content */}
        <Title level={1} className="!text-gray-700 !mb-2 !text-4xl md:!text-5xl font-bold" style={{ color: '#EEBC21' }}>
          Bạn đã từ chối báo giá
        </Title>

        <Text className="text-lg text-gray-500 block mb-2" style={{ color: '#fff' }}>
          Cảm ơn bạn đã quan tâm đến dịch vụ của chúng tôi
        </Text>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 mb-8 shadow-xl border border-gray-200 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-3">
            <span className="text-2xl">👋</span>
            <span className="font-medium">Hẹn gặp lại bạn!</span>
          </div>
          <Text className="text-gray-500 text-sm">
            Chúng tôi rất tiếc khi chưa có cơ hội phục vụ bạn lần này.
            <br /><br />
            Nếu bạn có bất kỳ thắc mắc hoặc muốn nhận báo giá mới,
            <br />
            đừng ngần ngại liên hệ với chúng tôi nhé!
          </Text>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-gray-600 to-slate-700 hover:from-gray-700 hover:to-slate-800 border-0 shadow-lg shadow-gray-400/40 hover:shadow-xl hover:shadow-gray-500/50 transition-all duration-300 hover:scale-105"
            >
              Về trang chủ
            </Button>
          </Link>

          {/* <Link href="/order">
            <Button 
              size="large"
              icon={<PhoneOutlined />}
              className="h-14 px-10 text-lg font-semibold border-2 border-blue-500 text-blue-600 hover:bg-blue-50 transition-all duration-300 hover:scale-105"
            >
              Liên hệ lại
            </Button>
          </Link> */}
        </div>

        {/* Footer note */}
        <Text className="text-white text-sm mt-10 block ">
          Hotline hỗ trợ: <span className="text-accent font-medium">1900.xxxx</span> | Email: <span className="text-accent font-medium">support@company.com</span>
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
        
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
