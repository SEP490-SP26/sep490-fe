'use client'

import { Order, useProduction } from '@/context/ProductionContext'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Table,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import { useState } from 'react'

const { Title, Text } = Typography

export default function ConsultantOrdersPage() {
  const { orders } = useProduction()
  const [searchText, setSearchText] = useState('')

  // State quản lý Modal chi tiết
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Lọc đơn hàng
  const filteredOrders = orders
    .filter(
      (order) =>
        order.customer_name.toLowerCase().includes(searchText.toLowerCase()) ||
        order.id.includes(searchText)
    )
    .sort(
      (a, b) =>
        new Date(b.created_at || '').getTime() -
        new Date(a.created_at || '').getTime()
    )

  // Hàm xem chi tiết
  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  const renderStatus = (status: string) => {
    switch (status) {
      case 'consultant_verified':
        return (
          <Tag icon={<ClockCircleOutlined />} color='orange'>
            Chờ Duyệt
          </Tag>
        )
      case 'manager_approved':
        return (
          <Tag icon={<CheckCircleOutlined />} color='green'>
            Đang Sản Xuất
          </Tag>
        )
      case 'rejected':
        return (
          <Tag icon={<CloseCircleOutlined />} color='red'>
            Từ Chối
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
      width: 100,
      render: (text: string) => (
        <span className='font-mono text-gray-500'>#{text.split('-')[1]}</span>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text: string, record: Order) => (
        <div>
          <div className='font-medium'>{text}</div>
          <div className='text-xs text-gray-400'>{record.customer_phone}</div>
        </div>
      ),
    },
    {
      title: 'Sản Phẩm',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text: string) => (
        <span className='font-semibold text-blue-600'>{text}</span>
      ),
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      align: 'right' as const,
      render: (val: number) => <b>{val.toLocaleString()}</b>,
    },
    {
      title: 'Tổng Tiền',
      dataIndex: 'final_price',
      align: 'right' as const,
      render: (val: number) => (
        <span className='text-green-600 font-bold'>
          {val?.toLocaleString()} ₫
        </span>
      ),
    },
    {
      title: 'Ngày Giao',
      dataIndex: 'delivery_date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'process_status',
      render: (status: string) => renderStatus(status),
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (_: any, record: Order) => (
        <Button
          type='text'
          icon={<EyeOutlined />}
          className='text-blue-500'
          onClick={() => handleViewDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex justify-between items-center mb-6'>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              Quản Lý Đơn Hàng
            </Title>
            <Text type='secondary'>Danh sách các đơn hàng đã tạo</Text>
          </div>
          <Input
            placeholder='Tìm tên khách, mã đơn...'
            prefix={<SearchOutlined />}
            className='w-64'
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        <Card className='shadow-sm border-none'>
          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey='id'
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* MODAL CHI TIẾT */}
        <Modal
          title={
            <span className='text-xl'>
              Chi Tiết Đơn Hàng #{selectedOrder?.id.split('-')[1]}
            </span>
          }
          open={isDetailOpen}
          onCancel={() => setIsDetailOpen(false)}
          footer={[
            <Button key='close' onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>,
          ]}
          width={800}
        >
          {selectedOrder && (
            <div className='space-y-6'>
              <div className='flex justify-between items-center bg-gray-50 p-4 rounded-lg'>
                <div>
                  <div className='text-gray-500 text-xs uppercase'>
                    Trạng thái
                  </div>
                  <div className='mt-1'>
                    {renderStatus(selectedOrder.process_status)}
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-gray-500 text-xs uppercase'>
                    Ngày tạo
                  </div>
                  <div className='font-medium'>
                    {dayjs(selectedOrder.created_at).format(
                      'HH:mm - DD/MM/YYYY'
                    )}
                  </div>
                </div>
              </div>

              <Descriptions title='Thông tin chi tiết' bordered column={2}>
                <Descriptions.Item label='Khách hàng'>
                  {selectedOrder.customer_name}
                </Descriptions.Item>
                <Descriptions.Item label='SĐT'>
                  {selectedOrder.customer_phone}
                </Descriptions.Item>
                <Descriptions.Item label='Sản phẩm' span={2}>
                  <b className='text-blue-600'>{selectedOrder.product_name}</b>
                </Descriptions.Item>
                <Descriptions.Item label='Số lượng'>
                  {selectedOrder.quantity.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label='Ngày giao'>
                  {dayjs(selectedOrder.delivery_date).format('DD/MM/YYYY')}
                </Descriptions.Item>

                <Descriptions.Item label='Quy cách' span={2}>
                  {selectedOrder.specs ? (
                    <div className='text-xs'>
                      <p>
                        • Kích thước: {selectedOrder.specs.length}x
                        {selectedOrder.specs.width}x{selectedOrder.specs.height}{' '}
                        mm
                      </p>
                      <p>• Giấy: {selectedOrder.specs.paper_id}</p>
                      <p>
                        • Gia công:{' '}
                        {selectedOrder.specs.processing?.join(', ') || 'Không'}
                      </p>
                      <p>
                        • Màu sắc:{' '}
                        {selectedOrder.specs.colors?.map((c) => (
                          <span
                            key={c}
                            style={{
                              background: c,
                              padding: '0 4px',
                              marginRight: 4,
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </p>
                    </div>
                  ) : (
                    'Chưa cập nhật'
                  )}
                </Descriptions.Item>

                <Descriptions.Item label='Tài chính' span={2}>
                  <div className='flex justify-between w-full'>
                    <span>
                      Phí gấp: {selectedOrder.rush_fee?.toLocaleString()} ₫
                    </span>
                    <span className='font-bold text-lg text-blue-700'>
                      Tổng: {selectedOrder.final_price?.toLocaleString()} ₫
                    </span>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label='Ghi chú' span={2}>
                  {selectedOrder.note || 'Không có'}
                </Descriptions.Item>
                <Descriptions.Item label='Hợp đồng' span={2}>
                  {selectedOrder.contract_file ? (
                    <Button type='link' icon={<FileTextOutlined />}>
                      Tải hợp đồng ({selectedOrder.contract_file})
                    </Button>
                  ) : (
                    <span className='italic text-gray-400'>
                      Chưa có hợp đồng
                    </span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}
