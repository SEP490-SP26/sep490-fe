'use client'

import { otpsApi } from '@/apiRequests/otps'
import authApiRequest from '@/apiRequests/auth'
import { useCustomer } from '@/context/CustomerContext'
import { CheckCircleOutlined, LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons'
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
  const [otp, setOtp] = useState('')
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.push('/')
    }
  }, [isLoggedIn, router])

  // Handle OTP input change for 6-box input
  const handleOtpChange = (text: string) => {
    setOtp(text)
  }

  // Send OTP
  const onSendOtp = async () => {
    const email = form.getFieldValue('email')

    if (!email) {
      message.error('Vui lòng nhập email trước khi gửi OTP!')
      return
    }

    const emailError = form.getFieldError('email')
    if (emailError.length > 0) {
      message.error('Vui lòng nhập đúng định dạng email!')
      return
    }

    setLoadingOtp(true)

    try {
      const response = await otpsApi.sendOtp({ email })
      if (response) {
        setIsOtpSent(true)
        message.success('Mã OTP đã được gửi đến email của bạn!')
      }
    } catch (error: any) {
      console.error(error)
      message.error(error?.message || 'Gửi OTP thất bại. Vui lòng kiểm tra lại email.')
    } finally {
      setLoadingOtp(false)
    }
  }

  // Verify OTP
  const onVerifyOtp = async () => {
    const email = form.getFieldValue('email')
    const otpCode = otp
    if (otpCode.length !== 6) {
      message.error('Vui lòng nhập đủ 6 số OTP!')
      return
    }

    setLoadingOtp(true)
    try {
      const response = await otpsApi.verifyOtp({ email, otp: otpCode })
      if (response) {
        setIsVerified(true)
        setIsOtpSent(false)
        message.success('Xác thực email thành công! Bạn có thể điền thông tin đăng ký.')
      }
    } catch (err: any) {
      console.error(err)
      message.error(err?.message || 'Mã OTP không đúng!')
    } finally {
      setLoadingOtp(false)
    }
  }

  // Submit registration
  const onFinish = async (values: any) => {
    if (!isVerified) {
      message.error('Vui lòng xác thực email trước!')
      return
    }

    if (values.password !== values.confirmPassword) {
      message.error('Mật khẩu xác nhận không khớp!')
      return
    }

    setLoadingSubmit(true)

    try {
      const registerData = {
        user_name: values.user_name,
        email: values.email,
        password: values.password,
        phone_number: values.phone,
        full_name: values.name,
      }

      await authApiRequest.register(otp, registerData)

      message.success('Đăng ký thành công! Chào mừng bạn đến với hệ thống. Vui lòng đăng nhập.')
      router.push('/login')
    } catch (error: any) {
      console.error('Registration error:', error)
      message.error(error?.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.')
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
            {/* Email - Required FIRST */}
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

            {/* OTP Section */}
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
                      <Text type='secondary'>Nhập mã OTP đã gửi đến điện thoại của bạn</Text>
                    </div>

                    <div className='flex justify-center mb-4'>
                      <Input.OTP
                        length={6}
                        value={otp}
                        onChange={handleOtpChange}
                        size="large"
                      />
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
                          setOtp('')
                        }}
                      >
                        Đổi email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isVerified && (
              <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center'>
                <CheckCircleOutlined className='text-green-500 mr-2' />
                <span className='text-green-700 font-medium'>Email đã được xác minh</span>
              </div>
            )}

            {/* User details section */}
            {isVerified && (
              <>
                {/* Tên đăng nhập */}
                <Form.Item
                  name='user_name'
                  label={<span className='font-semibold'>Tên đăng nhập</span>}
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên đăng nhập' },
                    { min: 3, message: 'Tên đăng nhập phải có ít nhất 3 ký tự' }
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className='text-gray-400' />}
                    placeholder='tendangnhap'
                    className={inputStyle}
                  />
                </Form.Item>

                {/* Mật khẩu */}
                <Form.Item
                  name='password'
                  label={<span className='font-semibold'>Mật khẩu</span>}
                  rules={[
                    { required: true, message: 'Vui lòng nhập mật khẩu' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className='text-gray-400' />}
                    placeholder='Mật khẩu'
                    className={inputStyle}
                  />
                </Form.Item>

                {/* Xác nhận mật khẩu */}
                <Form.Item
                  name='confirmPassword'
                  label={<span className='font-semibold'>Xác nhận mật khẩu</span>}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className='text-gray-400' />}
                    placeholder='Xác nhận mật khẩu'
                    className={inputStyle}
                  />
                </Form.Item>

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
