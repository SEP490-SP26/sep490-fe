'use client'

import { Order, useProduction } from '@/context/ProductionContext'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import Link from 'next/link'
import { useState } from 'react'

const { Title, Text } = Typography

export default function CustomerHistoryPage() {
  const { orders } = useProduction()

  // State tìm kiếm và hiển thị
  const [phoneNumber, setPhoneNumber] = useState('')
  const [searched, setSearched] = useState(false) // Đã bấm tìm hay chưa
  const [myOrders, setMyOrders] = useState<Order[]>([])

  // State Modal chi tiết
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // --- HÀM TRA CỨU ĐƠN HÀNG ---
  const handleSearch = () => {
    if (!phoneNumber) {
      message.warning('Vui lòng nhập số điện thoại để tra cứu!')
      return
    }

    // Lọc đơn hàng theo SĐT chính xác
    const foundOrders = orders
      .filter(
        (o) =>
          o.customer_phone && o.customer_phone.trim() === phoneNumber.trim()
      )
      .sort(
        (a, b) =>
          new Date(b.created_at || '').getTime() -
          new Date(a.created_at || '').getTime()
      )

    setMyOrders(foundOrders)
    setSearched(true)

    if (foundOrders.length === 0) {
      message.info('Không tìm thấy đơn hàng nào với số điện thoại này.')
    } else {
      message.success(`Tìm thấy ${foundOrders.length} đơn hàng.`)
    }
  }

  // --- HÀM HIỂN THỊ TRẠNG THÁI ---
  const renderStatus = (status: string) => {
    switch (status) {
      case 'pending_consultant':
        return (
          <Tag icon={<ClockCircleOutlined />} color='blue'>
            Chờ Tư Vấn
          </Tag>
        )
      case 'consultant_verified':
        return (
          <Tag icon={<UserOutlined />} color='orange'>
            Đang Xử Lý
          </Tag>
        )
      case 'manager_approved':
        return (
          <Tag icon={<SyncOutlined spin />} color='cyan'>
            Đang Sản Xuất
          </Tag>
        )
      case 'in_production':
        return (
          <Tag icon={<SyncOutlined spin />} color='purple'>
            Đang In Ấn
          </Tag>
        )
      case 'completed':
        return (
          <Tag icon={<CheckCircleOutlined />} color='green'>
            Hoàn Thành
          </Tag>
        )
      case 'rejected':
        return (
          <Tag icon={<CloseCircleOutlined />} color='red'>
            Đã Hủy
          </Tag>
        )
      default:
        return <Tag>{status}</Tag>
    }
  }

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => (
        <span className='font-mono text-gray-500'>#{text.split('-')[1]}</span>
      ),
    },
    {
      title: 'Sản Phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text: string) => (
        <span className='font-medium text-blue-700'>{text}</span>
      ),
    },
    {
      title: 'Ngày Đặt',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'process_status',
      key: 'process_status',
      render: (val: string, record: Order) =>
        renderStatus(record.status === 'in_production' ? 'in_production' : val),
    },
    {
      title: '',
      key: 'action',
      render: (_: any, record: Order) => (
        <Button
          type='link'
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedOrder(record)
            setIsDetailOpen(true)
          }}
        >
          Xem
        </Button>
      ),
    },
  ]

  return (
    <div className='min-h-screen bg-gray-50 py-10 px-4'>
      <div className='max-w-4xl mx-auto'>
        {/* Header & Search */}
        <div className='text-center mb-8'>
          <Title
            level={2}
            style={{ color: '#1677ff', textTransform: 'uppercase' }}
          >
            Lịch Sử Đơn Hàng
          </Title>
          <Text type='secondary'>
            Nhập số điện thoại bạn đã dùng để đặt hàng để xem tình trạng đơn
          </Text>

          <div className='mt-6 flex justify-center gap-2 max-w-md mx-auto'>
            <Input
              size='large'
              placeholder='Nhập số điện thoại (Zalo)...'
              prefix={<SearchOutlined />}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onPressEnter={handleSearch}
            />
            <Button type='primary' size='large' onClick={handleSearch}>
              Tra Cứu
            </Button>
          </div>
        </div>

        {/* Kết quả tra cứu */}
        {searched ? (
          <Card className='shadow-lg rounded-xl border-t-4 border-blue-500'>
            <Table
              columns={columns}
              dataSource={myOrders}
              rowKey='id'
              pagination={{ pageSize: 5 }}
              locale={{
                emptyText: <Empty description='Chưa có đơn hàng nào' />,
              }}
            />
            <div className='text-center mt-4'>
              <Link href='/customer/order'>
                <Button type='dashed'>Đặt đơn hàng mới</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className='text-center mt-12 opacity-50'>
            <SearchOutlined style={{ fontSize: 48, color: '#ccc' }} />
            <p className='mt-2'>Vui lòng nhập SĐT để xem lịch sử</p>
          </div>
        )}

        {/* --- MODAL CHI TIẾT ĐƠN HÀNG CHO KHÁCH --- */}
        <Modal
          title={<span className='text-lg'>Chi Tiết Đơn Hàng</span>}
          open={isDetailOpen}
          onCancel={() => setIsDetailOpen(false)}
          footer={[
            <Button
              key='close'
              type='primary'
              onClick={() => setIsDetailOpen(false)}
            >
              Đóng
            </Button>,
          ]}
          width={700}
        >
          {selectedOrder && (
            <div className='space-y-4'>
              {/* Tiến độ đơn hàng */}
              <div className='bg-blue-50 p-4 rounded-lg flex justify-between items-center'>
                <div>
                  <div className='text-xs text-gray-500 uppercase'>
                    Trạng thái hiện tại
                  </div>
                  <div className='mt-1 text-base'>
                    {renderStatus(selectedOrder.process_status)}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-xs text-gray-500 uppercase'>Mã đơn</div>
                  <div className='font-mono font-bold'>
                    #{selectedOrder.id.split('-')[1]}
                  </div>
                </div>
              </div>

              <Descriptions bordered column={1} size='small'>
                <Descriptions.Item label='Sản phẩm'>
                  <b className='text-blue-700'>{selectedOrder.product_name}</b>
                </Descriptions.Item>
                <Descriptions.Item label='Số lượng đặt'>
                  {selectedOrder.quantity.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label='Ngày đặt hàng'>
                  {dayjs(selectedOrder.created_at).format('HH:mm - DD/MM/YYYY')}
                </Descriptions.Item>
                <Descriptions.Item label='Ngày giao dự kiến'>
                  {selectedOrder.delivery_date
                    ? dayjs(selectedOrder.delivery_date).format('DD/MM/YYYY')
                    : 'Đang cập nhật'}
                </Descriptions.Item>

                {/* Chỉ hiện thông tin này nếu đã được Tư vấn viên chốt */}
                {selectedOrder.final_price && (
                  <Descriptions.Item label='Tổng giá trị'>
                    <span className='font-bold text-red-600 text-base'>
                      {selectedOrder.final_price.toLocaleString()} ₫
                    </span>
                  </Descriptions.Item>
                )}

                <Descriptions.Item label='Ghi chú của bạn'>
                  {selectedOrder.note || 'Không có'}
                </Descriptions.Item>
              </Descriptions>

              {/* Hợp đồng (nếu có) */}
              {selectedOrder.contract_file && (
                <div className='mt-4 p-3 border border-dashed border-blue-300 rounded bg-blue-50 text-center'>
                  <FileTextOutlined className='text-xl text-blue-500 mb-1' />
                  <div className='font-medium text-blue-700'>
                    Hợp đồng điện tử đã được ký kết
                  </div>
                  <div className='text-xs text-gray-500'>
                    Vui lòng liên hệ Zalo nếu cần bản cứng
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
