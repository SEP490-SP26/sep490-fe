'use client'

import { orderApi } from '@/apiRequests/order'
import { OrderDetailResponse } from '@/schemaValidations/common.schema'
import {
    ArrowLeftOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    MailOutlined,
    PhoneOutlined,
    ShoppingOutlined,
    UserOutlined,
} from '@ant-design/icons'
import { Button, Card, Descriptions, Result, Skeleton, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

// Render status tag
const renderStatus = (status: string) => {
  const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    Pending: { color: 'orange', text: 'Đang chờ', icon: <ClockCircleOutlined /> },
    Scheduled: { color: 'blue', text: 'Đã lên lịch', icon: <CalendarOutlined /> },
    InProgress: { color: 'processing', text: 'Đang sản xuất', icon: <ClockCircleOutlined /> },
    Completed: { color: 'green', text: 'Hoàn thành', icon: <CheckCircleOutlined /> },
    Cancelled: { color: 'red', text: 'Đã hủy', icon: <ClockCircleOutlined /> },
  }
  const config = statusMap[status] || { color: 'default', text: status, icon: null }
  return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>
}

// Render payment status tag
const renderPaymentStatus = (status: string) => {
  const statusMap: Record<string, { color: string; text: string }> = {
    Unpaid: { color: 'red', text: 'Chưa thanh toán' },
    Deposited: { color: 'orange', text: 'Đã đặt cọc' },
    Paid: { color: 'green', text: 'Đã thanh toán' },
  }
  const config = statusMap[status] || { color: 'default', text: status }
  return <Tag color={config.color}>{config.text}</Tag>
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [loading, setLoading] = useState(true)
  const [orderDetail, setOrderDetail] = useState<OrderDetailResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Kiểm tra xem user đã xác thực OTP chưa
    const verifiedPhone = sessionStorage.getItem('verified_phone')
    if (!verifiedPhone) {
      // Chưa xác thực → redirect về trang tra cứu
      router.push('/history')
      return
    }

    const fetchOrderDetail = async () => {
      if (!orderId) return

      setLoading(true)
      try {
        const response = await orderApi.getDetail(orderId)
        // response có thể trả về dạng { data: ... } hoặc trực tiếp object
        const data = response?.data || response
        setOrderDetail(data as OrderDetailResponse)
      } catch (err) {
        console.error('Error fetching order detail:', err)
        setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderDetail()
  }, [orderId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      </div>
    )
  }

  if (error || !orderDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Result
            status="error"
            title="Không tìm thấy đơn hàng"
            subTitle={error || 'Đơn hàng không tồn tại hoặc đã bị xóa.'}
            extra={
              <Button type="primary" onClick={() => router.back()}>
                Quay lại
              </Button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            className="mb-4"
          >
            Quay lại
          </Button>
          <div className="flex justify-between items-center">
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <FileTextOutlined className="mr-2" />
                {orderDetail.code}
              </Title>
              <Text type="secondary" className="text-lg">
                Chi tiết đơn hàng
              </Text>
            </div>
            <div className="flex gap-2">
              {renderStatus(orderDetail.status)}
              {renderPaymentStatus(orderDetail.payment_status)}
            </div>
          </div>
        </div>

        {/* Thông tin khách hàng */}
        <Card title={<><UserOutlined /> Thông tin khách hàng</>} className="mb-4 shadow-sm">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label={<><UserOutlined className="mr-1" /> Họ tên</>}>
              {orderDetail.customer_name}
            </Descriptions.Item>
            <Descriptions.Item label={<><PhoneOutlined className="mr-1" /> Số điện thoại</>}>
              {orderDetail.customer_phone}
            </Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined className="mr-1" /> Email</>}>
              {orderDetail.customer_email}
            </Descriptions.Item>
            <Descriptions.Item label={<><EnvironmentOutlined className="mr-1" /> Địa chỉ</>} span={2}>
              {orderDetail.detail_address}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Thông tin đơn hàng */}
        <Card title={<><ShoppingOutlined /> Thông tin đơn hàng</>} className="mb-4 shadow-sm">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Sản phẩm">
              <Text strong>{orderDetail.product_name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Số lượng">
              <Tag color="blue">{orderDetail.quantity.toLocaleString()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined className="mr-1" /> Ngày đặt</>}>
              {dayjs(orderDetail.order_date).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label={<><CalendarOutlined className="mr-1" /> Ngày giao</>}>
              <Text strong className="text-green-600">
                {dayjs(orderDetail.delivery_date).format('DD/MM/YYYY')}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Người duyệt">
              {orderDetail.approver_name}
            </Descriptions.Item>
            {orderDetail.note && (
              <Descriptions.Item label="Ghi chú" span={2}>
                {orderDetail.note}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        {/* Thông tin thanh toán */}
        <Card title={<><DollarOutlined /> Thông tin thanh toán</>} className="shadow-sm">
          <Descriptions column={{ xs: 1, sm: 2 }}>
            <Descriptions.Item label="Tổng giá trị">
              <Text strong className="text-xl text-blue-600">
                {orderDetail.final_total_cost.toLocaleString()} ₫
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Đã đặt cọc">
              <Text className="text-green-600">
                {orderDetail.deposit_amount.toLocaleString()} ₫
              </Text>
            </Descriptions.Item>
            {orderDetail.rush_amount > 0 && (
              <Descriptions.Item label="Phí gấp">
                <Text className="text-orange-500">
                  +{orderDetail.rush_amount.toLocaleString()} ₫
                </Text>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Còn lại">
              <Text strong className="text-red-500">
                {(orderDetail.final_total_cost - orderDetail.deposit_amount).toLocaleString()} ₫
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* File đính kèm */}
        {orderDetail.file_url && (
          <Card title="File đính kèm" className="mt-4 shadow-sm">
            <Button type="link" href={orderDetail.file_url} target="_blank">
              Xem file
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
