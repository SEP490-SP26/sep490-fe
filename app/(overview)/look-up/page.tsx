'use client'

import { lookupsApi } from '@/apiRequests/lookups'
import { OrderHistoryItem } from '@/schemaValidations/common.schema'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  MailOutlined,
  MobileOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons'
import {
  Button,
  Card,
  Empty,
  Input,
  Steps,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const { Title, Text } = Typography

export default function CustomerHistoryPage() {
  // State cho form
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otpCode, setOtpCode] = useState('')

  // State cho flow
  const [step, setStep] = useState<'phone' | 'otp' | 'result'>('phone')
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)

  // State cho kết quả
  const [myOrders, setMyOrders] = useState<OrderHistoryItem[]>([])
  const [myRequests, setMyRequests] = useState([])
  const [paginationOrder, setPaginationOrder] = useState({ page: 1, pageSize: 15, hasNext: false })
  const [paginationRequest, setPaginationRequest] = useState({ page: 1, pageSize: 15, hasNext: false })

  // Router để navigate
  const router = useRouter()

  // --- BƯỚC 1: GỬI OTP ---
  const handleSendOtp = async () => {
    if (!phoneNumber) {
      message.warning('Vui lòng nhập số điện thoại!')
      return
    }

    setSendingOtp(true)
    try {
      const response = await lookupsApi.sendOtp(phoneNumber)

      if (response.message.includes('OTP đã được gửi')) {
        message.success('Mã OTP đã được gửi đến email của bạn!')
        setStep('otp')
      } else if (response.message.includes('Không tìm thấy')) {
        message.error('Không tìm thấy email nào gắn với số điện thoại này.')
      } else {
        message.info(response.message)
      }
    } catch (error: any) {
      console.error('Error sending OTP:', error)
      const errorMsg = error?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.'
      message.error(errorMsg)
    } finally {
      setSendingOtp(false)
    }
  }

  // --- BƯỚC 2: XÁC THỰC OTP VÀ LẤY LỊCH SỬ order và request ---
  const handleVerifyOtp = async (page: number = 1) => {
    if (!otpCode) {
      message.warning('Vui lòng nhập mã OTP!')
      return
    }

    setLoading(true)
    try {
      console.log('phone', phoneNumber, 'otp', otpCode, 'page', page)
      const responseOrder = await lookupsApi.getOrderHistory(phoneNumber, otpCode, page, 15)
      const responseRequest = await lookupsApi.getRequestHistory(phoneNumber, otpCode, page, 15)

      setMyRequests(responseRequest.data || [])
      setMyOrders(responseOrder.data || [])
      setPaginationOrder({
        page: responseOrder.page,
        pageSize: responseOrder.pageSize,
        hasNext: responseOrder.hasNext,
      })
      setPaginationRequest({
        page: responseRequest.page,
        pageSize: responseRequest.pageSize,
        hasNext: responseRequest.hasNext,
      })

      // Lưu phone đã xác thực vào sessionStorage để bảo vệ trang chi tiết
      sessionStorage.setItem('verified_phone', phoneNumber)

      setStep('result')

      if (responseOrder.data?.length === 0) {
        message.info('Không tìm thấy đơn hàng nào.')
      } else {
        message.success(`Tìm thấy ${responseOrder.data?.length || 0} đơn hàng.`)
      }

      if (responseRequest.data?.length === 0) {
        message.info('Không tìm thấy yêu cầu nào.')
      } else {
        message.success(`Tìm thấy ${responseRequest.data?.length || 0} đơn hàng.`)
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error)
      const errorMsg = error?.response?.data?.message || 'OTP không hợp lệ hoặc đã hết hạn.'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // --- GỬI LẠI OTP ---
  const handleResendOtp = async () => {
    setSendingOtp(true)
    try {
      const response = await lookupsApi.sendOtp(phoneNumber)
      if (response.message.includes('OTP đã được gửi')) {
        message.success('Đã gửi lại mã OTP!')
      }
    } catch (error) {
      message.error('Có lỗi khi gửi lại OTP.')
    } finally {
      setSendingOtp(false)
    }
  }

  // --- RESET VỀ BƯỚC ĐẦU ---
  const handleReset = () => {
    setPhoneNumber('')
    setOtpCode('')
    setMyOrders([])
    setStep('phone')
  }

  // --- HIỂN THỊ TRẠNG THÁI ---
  const renderStatus = (status: string) => {
    const statusLower = status?.toLowerCase()
    switch (statusLower) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="blue">Chờ Xử Lý</Tag>
      case 'processing':
        return <Tag icon={<SyncOutlined spin />} color="orange">Đang Xử Lý</Tag>
      case 'in_production':
        return <Tag icon={<SyncOutlined spin />} color="purple">Đang Sản Xuất</Tag>
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="green">Hoàn Thành</Tag>
      case 'cancelled':
      case 'rejected':
        return <Tag icon={<CloseCircleOutlined />} color="red">Đã Hủy</Tag>
      case 'not enough':
        return <Tag color="orange">Chưa đủ điều kiện</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const renderPaymentStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Tag color="green">Đã thanh toán</Tag>
      case 'unpaid':
        return <Tag color="red">Chưa thanh toán</Tag>
      case 'partial':
        return <Tag color="orange">Thanh toán một phần</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <span className="font-mono font-medium text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Ngày Đặt',
      dataIndex: 'order_date',
      key: 'order_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Ngày Giao',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => renderStatus(val),
    },
    {
      title: 'Thanh Toán',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (val: string) => renderPaymentStatus(val),
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: OrderHistoryItem) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/order/${record.order_id}`)}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  const columnsRequest = [
    {
      title: 'Mã Yêu Cầu',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => (
        <span className="font-mono font-medium text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Ngày Đặt',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Ngày Giao',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => renderStatus(val),
    },
    {
      title: 'Thanh Toán',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (val: string) => renderPaymentStatus(val),
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/request-detail/${record.order_request_id ?? record.requset_id ?? record.order_id}`)}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Title level={2} style={{ color: '#1677ff', textTransform: 'uppercase' }}>
            Tra Cứu Đơn Hàng
          </Title>
          <Text type="secondary">
            Nhập số điện thoại và xác thực OTP để xem lịch sử đơn hàng của bạn
          </Text>
        </div>

        {/* Steps indicator */}
        <div className="max-w-md mx-auto mb-8">
          <Steps
            current={step === 'phone' ? 0 : step === 'otp' ? 1 : 2}
            items={[
              { title: 'Nhập SĐT', icon: <MobileOutlined /> },
              { title: 'Xác thực OTP', icon: <MailOutlined /> },
              { title: 'Kết quả', icon: <FileTextOutlined /> },
            ]}
          />
        </div>

        {/* STEP 1: Nhập số điện thoại */}
        {step === 'phone' && (
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-lg">
              <div className="text-center mb-4">
                <MobileOutlined className="text-4xl text-blue-500 mb-2" />
                <Title level={4}>Nhập số điện thoại</Title>
                <Text type="secondary">
                  Chúng tôi sẽ gửi mã OTP đến email gắn với số điện thoại này
                </Text>
              </div>

              <Input
                size="large"
                placeholder="Nhập số điện thoại (VD: 0912345678)"
                prefix={<MobileOutlined className="text-gray-400" />}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onPressEnter={handleSendOtp}
                className="mb-4"
              />

              <Button
                type="primary"
                size="large"
                block
                onClick={handleSendOtp}
                loading={sendingOtp}
              >
                Gửi mã OTP
              </Button>
            </Card>
          </div>
        )}

        {/* STEP 2: Nhập OTP */}
        {step === 'otp' && (
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-lg">
              <div className="text-center mb-4">
                <MailOutlined className="text-4xl text-green-500 mb-2" />
                <Title level={4}>Xác thực OTP</Title>
                <Text type="secondary">
                  Nhập mã OTP đã được gửi đến email của bạn
                </Text>
                <div className="mt-2">
                  <Tag color="blue">{phoneNumber}</Tag>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <Input.OTP
                  length={6}
                  value={otpCode}
                  onChange={(text) => setOtpCode(text)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => handleVerifyOtp()}
                  loading={loading}
                >
                  Xác nhận
                </Button>
              </div>

              <div className="text-center mt-4">
                <Button
                  type="link"
                  icon={<ReloadOutlined />}
                  onClick={handleResendOtp}
                  loading={sendingOtp}
                >
                  Gửi lại mã OTP
                </Button>
                <Button type="link" onClick={() => setStep('phone')}>
                  Đổi số điện thoại
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 3: Kết quả tra cứu */}
        {step === 'result' && (
          <Card className="shadow-lg rounded-xl border-t-4 border-blue-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <Title level={4} className="!mb-0">Lịch sử đơn hàng</Title>
                <Text type="secondary">Số điện thoại: {phoneNumber}</Text>
              </div>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                Tra cứu số khác
              </Button>
            </div>

            <Table
              columns={columns}
              dataSource={myOrders}
              rowKey="order_id"
              pagination={{
                current: paginationOrder.page,
                pageSize: paginationOrder.pageSize,
                onChange: (page) => handleVerifyOtp(page),
              }}
              locale={{
                emptyText: <Empty description="Chưa có đơn hàng nào" />,
              }}
              loading={loading}
              onRow={(record) => ({
                onClick: () => router.push(`/order-detail/${record.order_id}`),
                className: 'cursor-pointer hover:bg-slate-50 transition-colors',
              })}
            />

            <Table
              columns={columnsRequest}
              dataSource={myRequests}
              rowKey="order_request_id"
              pagination={{
                current: paginationRequest.page,
                pageSize: paginationRequest.pageSize,
                onChange: (page) => handleVerifyOtp(page),
              }}
              locale={{
                emptyText: <Empty description="Chưa có yêu cầu nào" />,
              }}
              loading={loading}
              onRow={(record: any) => ({
                onClick: () => router.push(`/request-detail/${record.order_request_id ?? record.requset_id ?? record.order_id}`),
                className: 'cursor-pointer hover:bg-slate-50 transition-colors',
              })}
            />

            <div className="text-center mt-4">
              <Link href="/request">
                <Button type="dashed">Đặt yêu cầu mới</Button>
              </Link>
            </div>
          </Card>
        )}

      </div>
    </div>
  )
}
