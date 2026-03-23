'use client'

import { lookupsApi } from '@/apiRequests/lookups'
import { OrderSummary, RequestSummary } from '@/lib/request.types'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  MailOutlined,
  MobileOutlined,
  ProductOutlined,
  ReloadOutlined,
  ScheduleOutlined,
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
  Tabs,
  message
} from 'antd'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

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
  const [customerName, setCustomerName] = useState('')
  const [myOrders, setMyOrders] = useState<OrderSummary[]>([])
  const [myRequests, setMyRequests] = useState<RequestSummary[]>([])
  const [paginationOrder, setPaginationOrder] = useState({ page: 1, pageSize: 5, hasNext: false })
  const [paginationRequest, setPaginationRequest] = useState({ page: 1, pageSize: 5, hasNext: false })

  // State cho filter/sort
  const [searchTerm, setSearchTerm] = useState('')

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
        message.success('Mã OTP đã được gửi đến Số điện thoại của bạn!')
        setStep('otp')
      } else if (response.message.includes('Không tìm thấy')) {
        message.error('Không tìm thấy Số điện thoại nào gắn với số điện thoại này.')
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
  const handleVerifyOtp = async (page: number = 1, type: 'orders' | 'requests' | 'all' = 'all', phoneArg?: string, otpArg?: string) => {
    const phone = phoneArg || phoneNumber
    const otp = otpArg || otpCode

    if (!otp) {
      message.warning('Vui lòng nhập mã OTP!')
      return
    }

    setLoading(true)
    try {
      console.log('phone', phone, 'otp', otp, 'page', page, 'type', type)
      const response = await lookupsApi.getHistory(phone, otp, page, 5)

      // Lưu phone và otp đã xác thực vào sessionStorage
      if (type === 'all') {
        sessionStorage.setItem('verified_phone', phone)
        sessionStorage.setItem('verified_otp', otp)
        
        // Lấy tên khách hàng từ kết quả đầu tiên (nếu có)
        const name = response.requests.data?.[0]?.customer_name || ''
        setCustomerName(name)
        sessionStorage.setItem('lookup_customer_name', name)
        
        setStep('result')
      }

      let newOrders = myOrders
      let newRequests = myRequests
      let newPaginationOrder = paginationOrder
      let newPaginationRequest = paginationRequest

      if (type === 'all' || type === 'orders') {
        newOrders = response.orders.data || []
        newPaginationOrder = {
          page: response.orders.page,
          pageSize: response.orders.pageSize,
          hasNext: response.orders.hasNext,
        }
        setMyOrders(newOrders)
        setPaginationOrder(newPaginationOrder)
      }

      if (type === 'all' || type === 'requests') {
        newRequests = response.requests.data || []
        newPaginationRequest = {
          page: response.requests.page,
          pageSize: response.requests.pageSize,
          hasNext: response.requests.hasNext,
        }
        setMyRequests(newRequests)
        setPaginationRequest(newPaginationRequest)
      }

      // Save state to sessionStorage
      sessionStorage.setItem('lookup_orders', JSON.stringify(newOrders))
      sessionStorage.setItem('lookup_requests', JSON.stringify(newRequests))
      sessionStorage.setItem('lookup_pagination_order', JSON.stringify(newPaginationOrder))
      sessionStorage.setItem('lookup_pagination_request', JSON.stringify(newPaginationRequest))

      if (type === 'all') {
        if (response.orders.data?.length === 0) {
          // message.info('Không tìm thấy đơn hàng nào.')
        }
        if (response.requests.data?.length === 0) {
          // message.info('Không tìm thấy yêu cầu nào.')
        }
      }

    } catch (error: any) {
      console.error('Error verifying OTP:', error)
      const errorMsg = error?.response?.data?.message || 'OTP không hợp lệ hoặc đã hết hạn.'
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Effect: Kiểm tra session storage khi mount
  useEffect(() => {
    const savedPhone = sessionStorage.getItem('verified_phone')
    const savedOtp = sessionStorage.getItem('verified_otp')
    const savedOrders = sessionStorage.getItem('lookup_orders')
    const savedRequests = sessionStorage.getItem('lookup_requests')
    const savedPaginationOrder = sessionStorage.getItem('lookup_pagination_order')
    const savedPaginationRequest = sessionStorage.getItem('lookup_pagination_request')

    if (savedPhone && savedOtp && savedOrders && savedRequests) {
      setPhoneNumber(savedPhone)
      setOtpCode(savedOtp)
      const savedName = sessionStorage.getItem('lookup_customer_name')
      if (savedName) setCustomerName(savedName)
      
      try {
        setMyOrders(JSON.parse(savedOrders))
        setMyRequests(JSON.parse(savedRequests))
        if (savedPaginationOrder) setPaginationOrder(JSON.parse(savedPaginationOrder))
        if (savedPaginationRequest) setPaginationRequest(JSON.parse(savedPaginationRequest))
        setStep('result')

        // Thử fetch lại dữ liệu mới nhất trong background (optional)
        // handleVerifyOtp(1, 'all', savedPhone, savedOtp) 
      } catch (e) {
        console.error('Error parsing saved data', e)
        // Nếu parse lỗi thì thử verify lại từ đầu
        handleVerifyOtp(1, 'all', savedPhone, savedOtp)
      }
    } else if (savedPhone && savedOtp) {
      setPhoneNumber(savedPhone)
      setOtpCode(savedOtp)
      // Tự động verify nếu có data phone/otp nhưng không có data orders/requests
      handleVerifyOtp(1, 'all', savedPhone, savedOtp)
    }
  }, [])

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
  // --- RESET VỀ BƯỚC ĐẦU ---
  const handleReset = () => {
    setPhoneNumber('')
    setOtpCode('')
    setCustomerName('')
    setMyOrders([])
    setMyRequests([])
    setStep('phone')
    setSearchTerm('')
    sessionStorage.removeItem('verified_phone')
    sessionStorage.removeItem('verified_otp')
    sessionStorage.removeItem('lookup_customer_name')
    sessionStorage.removeItem('lookup_orders')
    sessionStorage.removeItem('lookup_requests')
    sessionStorage.removeItem('lookup_pagination_order')
    sessionStorage.removeItem('lookup_pagination_request')
  }

  // --- HIỂN THỊ TRẠNG THÁI ---
  const renderStatus = (status: string) => {
    const statusUpper = status?.toUpperCase()
    switch (statusUpper) {
      case 'PENDING':
        return <Tag icon={<ClockCircleOutlined />} color="blue">Chờ Xử Lý</Tag>
      case 'WAITING':
      case 'VERIFIED':
      case 'DECLINED':
        return <Tag icon={<SyncOutlined spin />} color="orange">Đang Xử Lý</Tag>
      case 'INPROCESSING':
      case 'IN_PRODUCTION':
        return <Tag icon={<ProductOutlined />} color="purple">Đang Sản Xuất</Tag>
      case 'SCHEDULED':
        return <Tag icon={<ScheduleOutlined />} color="green">Đã Lên lịch</Tag>
      case 'FINISHED':
      case 'COMPLETED':
        return <Tag icon={<CheckCircleOutlined />} color="green">Hoàn Thành</Tag>
      case 'CANCELLED':
      case 'REJECTED':
        return <Tag icon={<CloseCircleOutlined />} color="red">Đã Hủy</Tag>
      case 'NOT ENOUGH':
        return <Tag color="orange">Chưa đủ điều kiện</Tag>
      default:
        return <Tag>{status}</Tag>
    }
  }

  // --- UTILS ---
  const maskPhoneNumber = (phone: string) => {
    if (!phone) return ''
    if (phone.length < 7) return phone
    const visibleStart = 3
    const visibleEnd = 3
    const maskedPart = '*'.repeat(phone.length - visibleStart - visibleEnd)
    return phone.substring(0, visibleStart) + maskedPart + phone.substring(phone.length - visibleEnd)
  }

  // --- FILTER DATA ---
  const filteredOrders = myOrders.filter(order =>
    order.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredRequests = myRequests.filter(req =>
    req.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.request_id?.toString().includes(searchTerm)
  )

  const columns: any = [
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
      sorter: (a: OrderSummary, b: OrderSummary) => dayjs(a.order_date).unix() - dayjs(b.order_date).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: 'Ngày Giao',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
      sorter: (a: OrderSummary, b: OrderSummary) => dayjs(a.delivery_date).unix() - dayjs(b.delivery_date).unix(),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => renderStatus(val),
    },
  ]

  const columnsRequest: any = [
    {
      title: 'Mã Yêu Cầu',
      dataIndex: 'request_id',
      key: 'request_id',
      render: (text: string) => (
        <span className="font-mono font-medium text-blue-600">{text}</span>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
    },
    {
      title: 'Ngày Đặt',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
      sorter: (a: RequestSummary, b: RequestSummary) => {
        const dateA = a.request_date ? dayjs(a.request_date).unix() : 0
        const dateB = b.request_date ? dayjs(b.request_date).unix() : 0
        return dateA - dateB
      },
      defaultSortOrder: 'descend',
    },
    {
      title: 'Ngày Giao',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
      sorter: (a: RequestSummary, b: RequestSummary) => dayjs(a.delivery_date).unix() - dayjs(b.delivery_date).unix(),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (val: string) => renderStatus(val),
    },
  ]

  const tabItems = [
    {
      key: 'orders',
      label: (
        <span>
          Đơn hàng {filteredOrders.length > 0 && <Tag color="blue" className="ml-1">{filteredOrders.length}</Tag>}
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey="order_id"
          pagination={{
            current: paginationOrder.page,
            pageSize: paginationOrder.pageSize,
            total: paginationOrder.hasNext ? (paginationOrder.page * paginationOrder.pageSize) + 1 : (paginationOrder.page * paginationOrder.pageSize),
            onChange: (page) => handleVerifyOtp(page, 'orders'),
            size: 'small',
            showSizeChanger: false
          }}
          locale={{
            emptyText: <Empty description={searchTerm ? "Không tìm thấy kết quả phù hợp" : "Chưa có đơn hàng nào"} />,
          }}
          loading={loading}
          onRow={(record) => ({
            onClick: () => router.push(`/order-detail/${record.order_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
          scroll={{ x: 'max-content' }}
          className="border rounded-lg overflow-hidden shadow-sm"
        />
      ),
    },
    {
      key: 'requests',
      label: (
        <span>
          Yêu cầu {filteredRequests.length > 0 && <Tag color="indigo" className="ml-1">{filteredRequests.length}</Tag>}
        </span>
      ),
      children: (
        <Table
          columns={columnsRequest}
          dataSource={filteredRequests}
          rowKey="order_request_id"
          pagination={{
            current: paginationRequest.page,
            pageSize: paginationRequest.pageSize,
            total: paginationRequest.hasNext ? (paginationRequest.page * paginationRequest.pageSize) + 1 : (paginationRequest.page * paginationRequest.pageSize),
            onChange: (page) => handleVerifyOtp(page, 'requests'),
            size: 'small',
            showSizeChanger: false
          }}
          locale={{
            emptyText: <Empty description={searchTerm ? "Không tìm thấy kết quả phù hợp" : "Chưa có yêu cầu nào"} />,
          }}
          loading={loading}
          onRow={(record: any) => ({
            onClick: () => router.push(`/request-detail/${record.request_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
          scroll={{ x: 'max-content' }}
          className="border rounded-lg overflow-hidden shadow-sm"
        />
      ),
    },
  ];

  // const getStatusLabel = (status: string) => {
  //   const labels: Record<string, string> = {
  //     consultant_verified: "Chờ Duyệt",
  //     manager_approved: "Đang Sản Xuất",
  //     rejected: "Từ Chối",
  //     pending: "Chờ xử lý",
  //     scheduled: "Đã lên lịch",
  //     in_production: "Đang sản xuất",
  //     completed: "Hoàn thành",
  //   };
  //   return labels[status] || status;
  // }

  return (
    <div className="min-h-screen bg-primary py-10 px-4">
      <div className={`mx-auto transition-all duration-300 ${step === 'result' ? 'max-w-[95%] xl:max-w-7xl' : 'max-w-4xl'}`}>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-gray-200 rounded-full opacity-30 animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-10 w-40 h-40 bg-zinc-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <Title level={2} style={{ color: '#EEBC21', textTransform: 'uppercase', marginBottom: '8px' }}>
            Tra Cứu Đơn Hàng
          </Title>
          <div className="mb-6">
            <h3 className="text-white font-medium italic">
              Giải pháp in ấn toàn diện - Nâng tầm giá trị thương hiệu
            </h3>
          </div>
        </div>


        {/* Steps indicator */}
        {/* <div className="max-w-md mx-auto mb-8">
          <Steps
            current={step === 'phone' ? 0 : step === 'otp' ? 1 : 2}
            items={[
              { title: 'Nhập SĐT', icon: <MobileOutlined /> },
              { title: 'Xác thực OTP', icon: <MailOutlined /> },
              { title: 'Kết quả', icon: <FileTextOutlined /> },
            ]}
          />
        </div> */}

        {/* STEP 1: Nhập số điện thoại */}
        {step === 'phone' && (
          <div className="flex justify-center">
            <Card className="w-full max-w-md shadow-lg">
              <div className="text-center mb-4">
                <MobileOutlined className="text-4xl text-blue-500 mb-2" />
                <Title level={4}>Nhập số điện thoại</Title>
                <Text type="secondary">
                  Chúng tôi sẽ gửi mã OTP đến số điện thoại này
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
                  Nhập mã OTP đã được gửi đến Số điện thoại của bạn
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
          <div className="animate-fade-in">
            <Card className="shadow-lg rounded-xl border-t-4 border-blue-500">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <Title level={4} className="!mb-0 text-gray-800">Kết quả tra cứu</Title>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {customerName && (
                      <div className="flex items-center gap-1.5">
                        <Text type="secondary" className="text-sm">Khách hàng:</Text>
                        <Text strong className="text-blue-700">{customerName}</Text>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Text type="secondary" className="text-sm">Số điện thoại:</Text>
                      <Text strong className="tracking-wider">{maskPhoneNumber(phoneNumber)}</Text>
                    </div>
                  </div>
                </div>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  Tra cứu số khác
                </Button>
              </div>

              <div className="mb-2">
                <Input.Search
                  placeholder="Tìm kiếm theo mã đơn, sản phẩm hoặc trạng thái..."
                  allowClear
                  enterButton
                  size="large"
                  onSearch={(value) => setSearchTerm(value)}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Tabs
                defaultActiveKey="orders"
                items={tabItems}
                size="large"
              />

              {/* <div className="text-center mt-8 pt-4 border-t">
                <Link href="/request">
                  <Button type="primary" size="large" icon={<FileTextOutlined />}>
                    Đặt yêu cầu mới
                  </Button>
                </Link>
              </div> */}
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
