'use client'

import { findCustomerByEmail, findCustomerByPhone, useCustomer } from '@/context/CustomerContext'
import { CheckCircleOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
import { otpsApi } from '@/apiRequests/otps'
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Typography,
} from 'antd'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography



export default function RegisterPage() {
  const [form] = Form.useForm()
  const { register, isLoggedIn } = useCustomer()
  const router = useRouter()

  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/')
    }
  }, [isLoggedIn, router])



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
    const email = form.getFieldValue('email')

    if (!email) {
      message.error('Vui lòng nhập email trước khi gửi OTP!')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      form.setFields([{ name: 'email', errors: ['Email không hợp lệ'] }])
      return
    }

    // Check if email already registered
    const existingCustomer = findCustomerByEmail(email)
    if (existingCustomer) {
      message.error('Email này đã được đăng ký! Vui lòng đăng nhập.')
      return
    }

    setLoadingOtp(true)

    try {
      await otpsApi.sendOtp({ email })
      setIsOtpSent(true)
      message.success('Mã OTP đã được gửi đến email của bạn!')
    } catch (error) {
      console.error(error)
      message.error('Gửi OTP thất bại. Vui lòng thử lại.')
    } finally {
      setLoadingOtp(false)
    }
  }

  // Verify OTP
  const onVerifyOtp = async () => {
    const email = form.getFieldValue('email')
    const otpCode = otp.join('')
    if (otpCode.length !== 6) {
      message.error('Vui lòng nhập đủ 6 số OTP!')
      return
    }

    if (!email) {
      message.error('Không tìm thấy email cần xác nhận!')
      return
    }

    setLoadingOtp(true)
    try {
      await otpsApi.verifyOtp({ email, otp: otpCode })
      setIsVerified(true)
      setIsOtpSent(false)
      message.success('Xác thực email thành công!')
    } catch (err) {
      console.error(err)
      message.error('Mã OTP không đúng hoặc đã hết hạn!')
    } finally {
      setLoadingOtp(false)
    }
  }

  // Submit registration
  const onFinish = (values: any) => {
    if (!isVerified) {
      message.error('Vui lòng xác thực email trước!')
      return
    }

    // Check if phone already registered
    const existingCustomer = findCustomerByPhone(values.phone)
    if (existingCustomer) {
      form.setFields([{ name: 'phone', errors: ['Số điện thoại này đã được đăng ký!'] }])
      message.error('Số điện thoại này đã được đăng ký! Vui lòng sử dụng số khác.')
      return
    }

    setLoadingSubmit(true)

    try {
      register({
        phone: values.phone,
        name: values.name,
        email: values.email,
      })

      message.success('Đăng ký thành công! Chào mừng bạn đến với hệ thống.')
      router.push('/')
    } catch (error) {
      message.error('Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const inputStyle = 'border-2 border-gray-300 focus:border-blue-500 rounded-lg hover:border-blue-400 text-base py-2'

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4 flex items-center justify-center'>

      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <Title level={2} style={{ color: '#1677ff', marginBottom: 8 }}>
            Đăng Ký Tài Khoản
          </Title>
          <Text type='secondary'>
            Tạo tài khoản để đặt hàng nhanh hơn và theo dõi đơn hàng
          </Text>
        </div>

        <Card className='shadow-xl rounded-2xl border-t-4 border-blue-600'>
          <Form
            form={form}
            layout='vertical'
            onFinish={onFinish}
            size='large'
            requiredMark='optional'
          >
            {/* Email - Required for OTP Verification */}
            <Form.Item
              name='email'
              label={<span className='font-semibold'>Email</span>}
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' }
              ]}
            >
              <Input
                prefix={<MailOutlined className='text-gray-400' />}
                placeholder='example@email.com'
                className={inputStyle}
                disabled={isOtpSent || isVerified}
                suffix={isVerified ? <CheckCircleOutlined className='text-green-500' /> : null}
              />
            </Form.Item>

            {/* OTP Section (Only before verification) */}
            {!isVerified && (
              <div className='mb-6'>
                {!isOtpSent ? (
                  <Button
                    type='default'
                    onClick={onSendOtp}
                    loading={loadingOtp}
                    className='w-full'
                    size='large'
                  >
                    Gửi mã xác thực OTP
                  </Button>
                ) : (
                  <div className='space-y-4'>
                    <div className='text-center'>
                      <Text type='secondary'>Nhập mã OTP đã gửi đến email của bạn</Text>
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
                        className='flex-1'
                      >
                        Xác nhận OTP
                      </Button>
                      <Button
                        type='link'
                        danger
                        onClick={() => {
                          setIsOtpSent(false)
                          setOtp(['', '', '', '', '', ''])
                        }}
                      >
                        Đổi Email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isVerified && (
              <div className='mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-center'>
                <CheckCircleOutlined className='text-green-500 mr-2' />
                <span className='text-green-700 font-medium'>Email đã được xác minh</span>
              </div>
            )}

            {/* Additional Info - Only reveal if Verified */}
            {isVerified && (
              <>
                {/* Họ tên */}
                <Form.Item
                  name='name'
                  label={<span className='font-semibold'>Họ và tên</span>}
                  rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                >
                  <Input
                    prefix={<UserOutlined className='text-gray-400' />}
                    placeholder='Nguyễn Văn A'
                    className={inputStyle}
                  />
                </Form.Item>

                {/* Số điện thoại */}
                <Form.Item
                  name='phone'
                  label={<span className='font-semibold'>Số điện thoại</span>}
                  rules={[
                    { required: true, message: 'Vui lòng nhập số điện thoại' },
                    { pattern: /^0\d{9}$/, message: 'Số điện thoại không hợp lệ (VD: 0912345678)' }
                  ]}
                >
                  <Input
                    prefix={<PhoneOutlined className='text-gray-400' />}
                    placeholder='0912345678'
                    className={inputStyle}
                  />
                </Form.Item>
              </>
            )}



            {/* Submit button */}
            <Form.Item className='mb-2'>
              <Button
                type='primary'
                htmlType='submit'
                block
                size='large'
                loading={loadingSubmit}
                disabled={!isVerified}
                className={`h-12 font-bold text-base ${!isVerified ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                ĐĂNG KÝ TÀI KHOẢN
              </Button>
            </Form.Item>

            <div className='text-center'>
              <Text type='secondary'>
                Đã có tài khoản?{' '}
                <Link href='/login' className='text-blue-600 font-medium hover:underline'>
                  Đăng nhập ngay
                </Link>
              </Text>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  )
}
