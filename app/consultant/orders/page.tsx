'use client';

import { Order, useProduction } from '@/context/ProductionContext';
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    EditOutlined,
    EyeOutlined,
    FileTextOutlined,
    MailOutlined,
    SearchOutlined,
    SendOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { Button, Card, Empty, Input, message, Popconfirm, Space, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useState } from 'react';

const { Title } = Typography;

export default function ConsultantOrdersPage() {
  const { orders, updateOrder } = useProduction();
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Filter orders by search text
  const filterBySearch = (orderList: Order[]) => 
    orderList.filter(order => 
      order.customer_name.toLowerCase().includes(searchText.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.id.includes(searchText)
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Orders by status
  const pendingOrders = filterBySearch(orders.filter(o => o.process_status === 'pending_consultant'));
  const waitingConfirmOrders = filterBySearch(orders.filter(o => o.process_status === 'waiting_customer_confirm'));
  const pendingCreationOrders = filterBySearch(orders.filter(o => o.process_status === 'pending_order_creation'));

  // Status tag renderer
  const getStatusTag = (status: Order['process_status']) => {
    switch (status) {
      case 'pending_consultant':
        return <Tag icon={<ClockCircleOutlined />} color="blue">Mới - Chờ Báo Giá</Tag>;
      case 'waiting_customer_confirm':
        return <Tag icon={<MailOutlined />} color="orange">Chờ KH Xác Nhận</Tag>;
      case 'pending_order_creation':
        return <Tag icon={<FileTextOutlined />} color="purple">Chờ Tạo Đơn</Tag>;
      case 'consultant_verified':
        return <Tag icon={<SendOutlined />} color="cyan">Đã Gửi Manager</Tag>;
      case 'manager_approved':
        return <Tag icon={<CheckCircleOutlined />} color="green">Đã Duyệt</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Get action button based on status
  const getActionButton = (record: Order) => {
    switch (record.process_status) {
      case 'pending_consultant':
        return (
          <Link href={`/consultant?orderId=${record.id}&mode=negotiate`}>
            <Button type="primary" size="small" icon={<EditOutlined />}>
              Tiếp nhận & Báo giá
            </Button>
          </Link>
        );
      case 'waiting_customer_confirm':
        return (
          <Space size="small">
            <Tooltip title="Đang chờ khách hàng xác nhận qua email">
              <Button size="small" icon={<MailOutlined />} disabled>
                Chờ xác nhận
              </Button>
            </Tooltip>
            <Popconfirm
              title="Mô phỏng khách hàng xác nhận"
              description="Đây là tính năng test. Thực tế sẽ do Backend xử lý khi KH click email."
              onConfirm={() => {
                updateOrder(record.id, { process_status: 'pending_order_creation' });
                message.success('KH đã xác nhận! Đơn chuyển sang "Chờ tạo đơn".');
              }}
              okText="Xác nhận (Test)"
              cancelText="Hủy"
            >
              <Button size="small" type="dashed" icon={<ThunderboltOutlined />} className="text-orange-500 border-orange-300">
                Simulate
              </Button>
            </Popconfirm>
          </Space>
        );
      case 'pending_order_creation':
        return (
          <Link href={`/consultant?orderId=${record.id}&mode=create`}>
            <Button type="primary" size="small" icon={<FileTextOutlined />} className="bg-purple-600 hover:bg-purple-700">
              Tạo đơn hàng
            </Button>
          </Link>
        );
      default:
        return (
          <Link href={`/consultant?orderId=${record.id}`}>
            <Button size="small" icon={<EyeOutlined />}>
              Xem
            </Button>
          </Link>
        );
    }
  };

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text: string) => <span className="font-mono text-gray-500 text-xs">#{text.split('-')[1]}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text: string, record: Order) => (
        <div>
          <div className="font-medium text-gray-900">{text}</div>
          {record.customer_phone && <div className="text-xs text-gray-500">{record.customer_phone}</div>}
          {record.customer_email && <div className="text-xs text-gray-400">{record.customer_email}</div>}
        </div>
      )
    },
    {
      title: 'Sản Phẩm Yêu Cầu',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text: string) => <span className="font-medium">{text || 'Sản phẩm tùy chỉnh'}</span>
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (val: number) => <b className="text-blue-600">{val.toLocaleString()}</b>,
    },
    {
      title: 'Ngày Giao (Khách hẹn)',
      dataIndex: 'delivery_date',
      key: 'delivery_date',
      align: 'right' as const,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
    },
    {
      title: 'Giá Báo (₫)',
      dataIndex: 'final_price',
      key: 'final_price',
      align: 'right' as const,
      render: (val: number) => val ? <b className="text-green-600">{val.toLocaleString()}</b> : <span className="text-gray-400">-</span>,
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'process_status',
      key: 'process_status',
      align: 'center' as const,
      render: (status: Order['process_status']) => getStatusTag(status),
    },
    {
      title: 'Hành Động',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: Order) => getActionButton(record),
    },
  ];

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span>
          Đơn mới 
          {pendingOrders.length > 0 && <Tag color="red" className="ml-2">{pendingOrders.length}</Tag>}
        </span>
      ),
      children: (
        <Table 
          columns={columns} 
          dataSource={pendingOrders} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Không có đơn hàng mới" /> }}
          bordered
        />
      ),
    },
    {
      key: 'waiting',
      label: (
        <span>
          Chờ KH xác nhận
          {waitingConfirmOrders.length > 0 && <Tag color="orange" className="ml-2">{waitingConfirmOrders.length}</Tag>}
        </span>
      ),
      children: (
        <Table 
          columns={columns} 
          dataSource={waitingConfirmOrders} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Không có đơn chờ xác nhận" /> }}
          bordered
        />
      ),
    },
    {
      key: 'creation',
      label: (
        <span>
          Chờ tạo đơn
          {pendingCreationOrders.length > 0 && <Tag color="purple" className="ml-2">{pendingCreationOrders.length}</Tag>}
        </span>
      ),
      children: (
        <Table 
          columns={columns} 
          dataSource={pendingCreationOrders} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="Không có đơn chờ tạo" /> }}
          bordered
        />
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} style={{ margin: 0 }}>Quản Lý Đơn Hàng</Title>
          <p className="text-gray-500">Xử lý đơn hàng từ khách hàng - Báo giá & Tạo đơn</p>
        </div>
        <div className="w-1/3">
          <Input 
            placeholder="Tìm tên khách, sản phẩm..." 
            prefix={<SearchOutlined />} 
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
          />
          <div className="flex justify-between mt-1">
            <Link href="/consultant" className="text-sm text-blue-600 hover:underline">
              + Tạo đơn hàng mới
            </Link>
            <Link href="/manager/orders" className="text-sm text-gray-500 hover:underline">
              Xem tất cả đơn (Manager) →
            </Link>
          </div>
        </div>
      </div>
       
      <Card className="shadow-sm border-none">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
}