'use client'

import { findCustomerByPhone, useCustomer } from '@/context/CustomerContext'
import { auth } from '@/utils/firebaseConfig'
import { CheckCircleOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Typography,
} from 'antd'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

declare global {
  interface Window {
    recaptchaVerifier: any
    confirmationResult: any
  }
}

export default function LoginPage() {
  const [form] = Form.useForm()
  const { login, isLoggedIn } = useCustomer()
  const router = useRouter()

  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [verifiedPhone, setVerifiedPhone] = useState('')

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/customer/profile')
    }
  }, [isLoggedIn, router])

  // Setup reCAPTCHA
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {},
        }
      )
    }

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    }
  }, [])

  // Handle OTP input change for 6-box input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }
    
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  // Handle backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    }
  }

  // Send OTP
  const onSendOtp = async () => {
    const phone = form.getFieldValue('phone')

    if (!phone) {
      message.error('Vui lòng nhập số điện thoại!')
      return
    }

    // Check if phone is registered
    const existingCustomer = findCustomerByPhone(phone)
    if (!existingCustomer) {
      message.error('Số điện thoại chưa được đăng ký! Vui lòng đăng ký tài khoản mới.')
      return
    }

    const formatPh = '+84' + phone.replace(/^0/, '')
    setVerifiedPhone(phone)

    setLoadingOtp(true)
    const appVerifier = window.recaptchaVerifier

    try {
      const confirmationResult = await signInWithPhoneNumber(auth, formatPh, appVerifier)
      window.confirmationResult = confirmationResult
      setIsOtpSent(true)
      message.success('Mã OTP đã được gửi đến số điện thoại của bạn!')
    } catch (error) {
      console.error(error)
      message.error('Gửi OTP thất bại. Vui lòng kiểm tra lại số điện thoại.')
    } finally {
      setLoadingOtp(false)
    }
  }

  // Verify OTP and login
  const onVerifyOtp = async () => {
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      message.error('Vui lòng nhập đủ 6 số OTP!')
      return
    }

    setLoadingOtp(true)
    try {
      await window.confirmationResult.confirm(otpCode)
      
      // Find customer and login
      const customer = findCustomerByPhone(verifiedPhone)
      if (customer) {
        login(customer)
        message.success(`Chào mừng ${customer.name} quay trở lại!`)
        router.push('/customer/profile')
      } else {
        message.error('Không tìm thấy thông tin tài khoản!')
      }
    } catch (err) {
      console.error(err)
      message.error('Mã OTP không đúng!')
    } finally {
      setLoadingOtp(false)
    }
  }

  const inputStyle = 'border-2 border-gray-300 focus:border-blue-500 rounded-lg hover:border-blue-400 text-base py-2'

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4 flex items-center justify-center'>
      <div id='recaptcha-container'></div>
      
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <Title level={2} style={{ color: '#1677ff', marginBottom: 8 }}>
            Đăng Nhập
          </Title>
          <Text type='secondary'>
            Đăng nhập bằng số điện thoại đã đăng ký
          </Text>
        </div>

        <Card className='shadow-xl rounded-2xl border-t-4 border-blue-600'>
          <Form
            form={form}
            layout='vertical'
            size='large'
            requiredMark={false}
          >
            {/* Số điện thoại */}
            <Form.Item
              name='phone'
              label={<span className='font-semibold'>Số điện thoại</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập số điện thoại' },
                { pattern: /^0\d{9}$/, message: 'Số điện thoại không hợp lệ' }
              ]}
            >
              <Input
                prefix={<PhoneOutlined className='text-gray-400' />}
                placeholder='0912345678'
                className={inputStyle}
                disabled={isOtpSent}
                suffix={isVerified ? <CheckCircleOutlined className='text-green-500' /> : null}
              />
            </Form.Item>

            {/* OTP Section */}
            <div className='mb-6'>
              {!isOtpSent ? (
                <Button
                  type='primary'
                  onClick={onSendOtp}
                  loading={loadingOtp}
                  className='w-full h-12 font-bold'
                  size='large'
                >
                  Gửi mã OTP để đăng nhập
                </Button>
              ) : (
                <div className='space-y-4'>
                  <div className='text-center'>
                    <Text type='secondary'>Nhập mã OTP đã gửi đến điện thoại của bạn</Text>
                  </div>
                  
                  {/* 6-box OTP input */}
                  <div className='flex justify-center gap-2'>
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type='text'
                        inputMode='numeric'
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className='w-12 h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none hover:border-blue-400 transition-colors'
                      />
                    ))}
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      type='primary'
                      onClick={onVerifyOtp}
                      loading={loadingOtp}
                      className='flex-1 h-12 font-bold'
                    >
                      Xác nhận đăng nhập
                    </Button>
                    <Button
                      type='link'
                      danger
                      onClick={() => {
                        setIsOtpSent(false)
                        setOtp(['', '', '', '', '', ''])
                      }}
                    >
                      Gửi lại
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className='text-center pt-4 border-t'>
              <Text type='secondary'>
                Chưa có tài khoản?{' '}
                <Link href='/register' className='text-blue-600 font-medium hover:underline'>
                  Đăng ký ngay
                </Link>
              </Text>
            </div>
          </Form>
        </Card>

        {/* Demo Login Section */}
        <Card className='mt-6 bg-yellow-50 border-yellow-200'>
          <div className='text-center mb-3'>
            <Text className='text-yellow-800 font-medium'>
              🧪 Demo Login (Không cần OTP)
            </Text>
          </div>
          <div className='space-y-2'>
            {[
              { phone: '0123456789', name: 'Khách Hàng Demo' },
              { phone: '0987654321', name: 'Nguyễn Văn Test' },
              { phone: '0912345678', name: 'Trần Thị Mẫu' },
            ].map((demo) => {
              const customer = findCustomerByPhone(demo.phone)
              return (
                <Button
                  key={demo.phone}
                  block
                  icon={<UserOutlined />}
                  onClick={() => {
                    if (customer) {
                      login(customer)
                      message.success(`Chào mừng ${customer.name}!`)
                      router.push('/customer/profile')
                    } else {
                      message.error('Không tìm thấy tài khoản demo!')
                    }
                  }}
                  className='text-left flex items-center justify-start'
                >
                  <span className='font-mono text-sm'>{demo.phone}</span>
                  <span className='mx-2 text-gray-400'>-</span>
                  <span>{demo.name}</span>
                </Button>
              )
            })}
          </div>
        </Card>

        {/* Guest access link */}
        <div className='text-center mt-6'>
          <Link href='/order' className='text-gray-500 hover:text-blue-600'>
            Hoặc đặt hàng không cần tài khoản →
          </Link>
        </div>
      </div>
    </div>
  )
}
