'use client'

import { useProduction } from '@/context/ProductionContext'
import { auth } from '@/utils/firebaseConfig'
import { CheckCircleOutlined, InboxOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Result,
  Typography,
  Upload,
} from 'antd'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

declare global {
  interface Window {
    recaptchaVerifier: any
    confirmationResult: any
  }
}

export default function CustomerOrderPage() {
  const [form] = Form.useForm()
  const { addOrder } = useProduction()
  const [isSuccess, setIsSuccess] = useState(false)

  // --- STATE CHO OTP ---
  const [isOtpSent, setIsOtpSent] = useState(false) // Đã gửi OTP chưa
  const [isVerified, setIsVerified] = useState(false) // Đã xác thực thành công chưa
  const [otp, setOtp] = useState('') // Lưu mã OTP người dùng nhập
  const [loadingOtp, setLoadingOtp] = useState(false) // Loading khi gửi/xác thực

  // --- CẤU HÌNH RECAPTCHA (Bắt buộc của Firebase) ---
  useEffect(() => {
    // Chỉ khởi tạo nếu chưa có instance
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved - allow signInWithPhoneNumber.
          },
          'expired-callback': () => {
            // Response expired. Ask user to solve reCAPTCHA again.
          },
        }
      )
    }

    // Cleanup function: Xóa verifier khi thoát trang để tránh lỗi
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    }
  }, [])

  // --- HÀM GỬI OTP ---
  const onSignup = async () => {
    const phoneNumber = form.getFieldValue('phone')
    if (!phoneNumber) {
      message.error('Vui lòng nhập số điện thoại trước!')
      return
    }

    // Convert số điện thoại VN: 09xx -> +849xx
    const formatPh = '+84' + phoneNumber.replace(/^0/, '')

    setLoadingOtp(true)
    const appVerifier = window.recaptchaVerifier

    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formatPh,
        appVerifier
      )
      window.confirmationResult = confirmationResult
      setIsOtpSent(true)
      message.success('Mã OTP đã được gửi đến số điện thoại của bạn!')
    } catch (error) {
      console.error(error)
      message.error(
        'Gửi OTP thất bại. Vui lòng kiểm tra lại số điện thoại hoặc thử lại sau.'
      )
    } finally {
      setLoadingOtp(false)
    }
  }

  // --- HÀM XÁC THỰC OTP ---
  const onOTPVerify = async () => {
    setLoadingOtp(true)
    try {
      const res = await window.confirmationResult.confirm(otp)
      // Xác thực thành công
      setIsVerified(true)
      setIsOtpSent(false) // Tắt chế độ nhập OTP
      message.success('Xác thực số điện thoại thành công!')
    } catch (err) {
      console.error(err)
      message.error('Mã OTP không đúng!')
    } finally {
      setLoadingOtp(false)
    }
  }

  const normFile = (e: any) => {
    if (Array.isArray(e)) return e
    return e?.fileList
  }

  const onFinish = (values: any) => {
    if (!isVerified) {
      message.error('Vui lòng xác thực số điện thoại trước khi gửi đơn hàng!')
      return
    }
    // Giả lập link file
    const fakeFileUrl = values.designFile?.[0]
      ? `https://storage.cloud.com/${values.designFile[0].name}`
      : ''

    addOrder({
      product_id: 'custom',
      product_name: values.productName,
      customer_name: values.customerName,
      customer_phone: values.phone,
      customer_email: values.email,
      quantity: values.quantity,
      delivery_date: values.desiredDate
        ? values.desiredDate.format('YYYY-MM-DD')
        : '',
      design_file_url: fakeFileUrl,
      note: values.note,
      specs: {
        width: 0,
        height: 0,
        length: 0,
        paper_id: '',
        colors: [],
        processing: [],
      },
    })

    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className='flex justify-center items-center min-h-screen bg-gray-50 p-4'>
        <Card className='w-full max-w-2xl shadow-md'>
          <Result
            status='success'
            title='Gửi Yêu Cầu Thành Công!'
            subTitle='Chúng tôi đã nhận được thông tin. Nhân viên tư vấn sẽ liên hệ lại với bạn để chốt giá và quy cách chi tiết.'
            extra={[
              <Button
                type='primary'
                size='large'
                key='back'
                onClick={() => {
                  setIsSuccess(false)
                  form.resetFields()
                }}
              >
                Đặt đơn khác
              </Button>,
              <Link href='/consultant/orders' key='home'>
                <Button size='large'>Về trang chủ</Button>
              </Link>,
              <Link href='/consultant/orders'>
                Chuyển đến giao diện Nhân viên lập lịch
              </Link>,
            ]}
          />
        </Card>
      </div>
    )
  }

  // Style chung cho các ô input để viền đậm và to hơn
  const inputStyle =
    'border-2 border-gray-300 focus:border-blue-500 rounded-lg hover:border-blue-400 text-base py-2'
  const labelStyle = 'font-bold text-gray-800 text-base'

  const inputClass =
    'border-2 border-gray-300 focus:border-blue-600 hover:border-blue-400 rounded-lg font-medium text-gray-700'

  return (
    <div className='min-h-screen bg-gray-100 py-10 px-4'>
      <div id='recaptcha-container'></div>
      {/* Tăng độ rộng form lên max-w-5xl */}
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-10'>
          <Title
            level={2}
            style={{
              color: '#1677ff',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Đặt In Online
          </Title>
          <Text type='secondary' className='text-lg'>
            Điền thông tin sơ bộ để chúng tôi tư vấn giải pháp tốt nhất
          </Text>
        </div>

        <Card className='shadow-xl rounded-2xl border-t-8 border-blue-600'>
          <Form
            form={form}
            layout='vertical'
            onFinish={onFinish}
            size='large'
            requiredMark='optional'
          >
            {/* 1. Thông tin liên hệ */}
            <Card
              type='inner'
              title={
                <span className='text-lg font-bold text-blue-800'>
                  1. THÔNG TIN LIÊN HỆ
                </span>
              }
              className='mb-8 bg-gray-50 border-gray-200'
            >
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Form.Item
                  name='customerName'
                  label={
                    <span className={labelStyle}>Họ và tên / Công ty</span>
                  }
                  rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                >
                  <Input
                    placeholder='VD: Nguyễn Văn A'
                    className={inputStyle}
                  />
                </Form.Item>
                <div>
                  <Form.Item
                    name='phone'
                    label={
                      <span className='font-semibold'>
                        Số điện thoại (Zalo)
                      </span>
                    }
                    rules={[
                      { required: true, message: 'Cần SĐT để liên hệ lại' },
                    ]}
                    className='mb-2'
                  >
                    <Input
                      placeholder='09xxxxxxx'
                      className={inputClass}
                      disabled={isVerified || isOtpSent} // Khóa khi đã gửi OTP hoặc đã xác thực
                      suffix={
                        isVerified ? (
                          <CheckCircleOutlined className='text-green-500' />
                        ) : null
                      }
                    />
                  </Form.Item>

                  {/* Khu vực nút bấm và nhập OTP */}
                  {!isVerified && (
                    <div className='mb-4'>
                      {!isOtpSent ? (
                        <Button
                          type='default'
                          onClick={onSignup}
                          loading={loadingOtp}
                        >
                          Gửi mã xác thực (OTP)
                        </Button>
                      ) : (
                        <div className='flex gap-2 mt-2'>
                          <Input
                            placeholder='Nhập mã 6 số'
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={6}
                            style={{ width: '150px' }}
                          />
                          <Button
                            type='primary'
                            onClick={onOTPVerify}
                            loading={loadingOtp}
                          >
                            Xác nhận
                          </Button>
                          <Button
                            type='link'
                            danger
                            onClick={() => setIsOtpSent(false)}
                          >
                            Gửi lại / Đổi SĐT
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {isVerified && (
                    <span className='text-green-600 font-medium text-sm'>
                      ✓ Số điện thoại đã được xác minh
                    </span>
                  )}
                </div>
                <Form.Item
                  name='email'
                  label={
                    <span className={labelStyle}>Email (Nhận báo giá)</span>
                  }
                  className='md:col-span-2'
                >
                  <Input
                    placeholder='example@email.com'
                    className={inputStyle}
                  />
                </Form.Item>
              </div>
            </Card>

            {/* 2. Yêu cầu sản phẩm */}
            <Card
              type='inner'
              title={
                <span className='text-lg font-bold text-blue-800'>
                  2. YÊU CẦU IN ẤN
                </span>
              }
              className='mb-8 bg-gray-50 border-gray-200'
            >
              <Form.Item
                name='productName'
                label={<span className={labelStyle}>Tên sản phẩm cần in</span>}
                rules={[{ required: true, message: 'Vui lòng nhập tên SP' }]}
              >
                <Input
                  placeholder='VD: Hộp bánh trung thu, Catalogue, Tờ rơi...'
                  className={inputStyle}
                />
              </Form.Item>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <Form.Item
                  name='quantity'
                  label={<span className={labelStyle}>Số lượng dự kiến</span>}
                  rules={[{ required: true, message: 'Nhập số lượng' }]}
                >
                  <InputNumber
                    className={`w-full ${inputStyle}`}
                    min={1}
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    }
                    placeholder='VD: 1,000'
                  />
                </Form.Item>
                <Form.Item
                  name='desiredDate'
                  label={
                    <span className={labelStyle}>Ngày mong muốn nhận hàng</span>
                  }
                  rules={[{ required: true, message: 'Chọn ngày' }]}
                >
                  <DatePicker
                    className={`w-full ${inputStyle}`}
                    format='DD/MM/YYYY'
                    placeholder='Chọn ngày'
                  />
                </Form.Item>
              </div>

              <Form.Item
                name='note'
                label={
                  <span className={labelStyle}>
                    Mô tả thêm (Kích thước, chất liệu...)
                  </span>
                }
              >
                <Input.TextArea
                  rows={4}
                  placeholder='VD: Kích thước 20x20cm, giấy dày, cán bóng...'
                  className={`!border-2 !border-gray-300 !rounded-lg hover:!border-blue-400`}
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className={labelStyle}>File thiết kế mẫu (nếu có)</span>
                }
                name='designFile'
                valuePropName='fileList'
                getValueFromEvent={normFile}
              >
                <Upload.Dragger
                  name='files'
                  action='https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188'
                  listType='picture'
                  maxCount={1}
                  className='bg-white !border-2 !border-dashed !border-blue-300 hover:!border-blue-600 rounded-xl'
                >
                  <p className='ant-upload-drag-icon'>
                    <InboxOutlined
                      style={{ color: '#1677ff', fontSize: '32px' }}
                    />
                  </p>
                  <p className='ant-upload-text font-medium text-gray-600'>
                    Kéo thả file hoặc click để tải lên
                  </p>
                  <p className='ant-upload-hint text-gray-400'>
                    Hỗ trợ PDF, AI, PSD, ZIP (Max 10MB)
                  </p>
                </Upload.Dragger>
              </Form.Item>
            </Card>

            <Form.Item className='mb-0'>
              <Button
                type='primary'
                htmlType='submit'
                block
                size='large'
                className={`h-14 text-xl font-bold shadow-lg rounded-xl ${
                  !isVerified ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={!isVerified}
              >
                GỬI YÊU CẦU BÁO GIÁ
              </Button>
              {!isVerified && (
                <div className='text-center text-red-500 mt-2'>
                  Vui lòng xác thực SĐT để gửi đơn
                </div>
              )}
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}
