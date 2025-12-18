'use client';

import { requestOrderApi } from '@/api/request';
import { OrderRequest } from '@/schemaValidations/common.schema';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MailOutlined,
  ReloadOutlined,
  SearchOutlined,
  SendOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Button, Card, Empty, Input, message, Popconfirm, Space, Spin, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const { Title } = Typography;

export default function ConsultantOrdersPage() {
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [acceptedOrders, setAcceptedOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAccepted, setLoadingAccepted] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageAccepted, setCurrentPageAccepted] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalAccepted, setTotalAccepted] = useState(0);
  const pageSize = 5;

  // Fetch pending orders from API with pagination
  const fetchOrders = async (page: number = currentPage) => {
    setLoading(true);
    try {
      const response = await requestOrderApi.getList(page, pageSize);
      if (response?.data && Array.isArray(response.data)) {
        setOrders(response.data);
        // If API returns total count, use it
        if (response.data.length > 0) {
          setTotalOrders(response.data.length >= pageSize ? (page * pageSize) + pageSize : response.data.length);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      message.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Fetch accepted orders from API (using larger page size for simplicity)
  const fetchAcceptedOrders = async () => {
    setLoadingAccepted(true);
    try {
      const response = await requestOrderApi.getListByStatus(1, 30, 'Accepted');
      if (response?.data && Array.isArray(response.data)) {
        // Only keep orders with Accepted status
        const acceptedOnly = response.data.filter(
          (o: OrderRequest) => o.process_status?.toLowerCase() === 'accepted'
        );
        setAcceptedOrders(acceptedOnly);
        setTotalAccepted(acceptedOnly.length);
      }
    } catch (error) {
      console.error('Error fetching accepted orders:', error);
    } finally {
      setLoadingAccepted(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchAcceptedOrders();
  }, []);

  // Filter orders by search text
  const filterBySearch = (orderList: OrderRequest[]) => 
    orderList.filter(order => 
      order.customer_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.order_request_id?.toString().includes(searchText)
    ).sort((a, b) => new Date(b.order_request_date).getTime() - new Date(a.order_request_date).getTime());

  // Orders by status - "Pending" from API goes to "Đơn mới"
  const pendingOrders = filterBySearch(orders.filter(o => 
    o.process_status?.toLowerCase() === 'pending'
  ));
  const waitingConfirmOrders = filterBySearch(orders.filter(o => 
    o.process_status?.toLowerCase() === 'waiting_customer_confirm'
  ));
  // Accepted orders - filtere from separate API call
  const filteredAcceptedOrders = filterBySearch(acceptedOrders);

  // Status tag renderer
  const getStatusTag = (status: string) => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="blue">Mới - Chờ Báo Giá</Tag>;
      case 'waiting_customer_confirm':
        return <Tag icon={<MailOutlined />} color="orange">Chờ KH Xác Nhận</Tag>;
      case 'accepted':
        return <Tag icon={<FileTextOutlined />} color="purple">Chờ Tạo Đơn</Tag>;
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
  const getActionButton = (record: OrderRequest) => {
    const statusLower = record.process_status?.toLowerCase();
    switch (statusLower) {
      case 'pending':
        return (
          <Link href={`/consultant?orderId=${record.order_request_id}&mode=negotiate`}>
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
              description="Đây là tính năng test."
              onConfirm={() => {
                message.success('Chức năng này cần BE hỗ trợ');
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
      case 'accepted':
        return (
          <Link href={`/consultant?orderId=${record.order_request_id}&mode=create`}>
            <Button type="primary" size="small" icon={<FileTextOutlined />} className="bg-purple-600 hover:bg-purple-700">
              Tạo đơn hàng
            </Button>
          </Link>
        );
      default:
        return (
          <Link href={`/consultant?orderId=${record.order_request_id}`}>
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
      dataIndex: 'order_request_id',
      key: 'order_request_id',
      width: 100,
      render: (id: number) => <span className="font-mono text-gray-500 text-xs">#{id}</span>,
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'customer_name',
      key: 'customer_name',
      render: (text: string, record: OrderRequest) => (
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
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Hành Động',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: OrderRequest) => getActionButton(record),
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
        <Spin spinning={loading} indicator={<LoadingOutlined />}>
          <Table 
            columns={columns} 
            dataSource={pendingOrders} 
            rowKey="order_request_id"
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: totalOrders,
              showSizeChanger: false,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} đơn`,
              onChange: (page) => setCurrentPage(page),
            }}
            locale={{ emptyText: <Empty description="Không có đơn hàng mới" /> }}
            bordered
          />
        </Spin>
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
        <Spin spinning={loading} indicator={<LoadingOutlined />}>
          <Table 
            columns={columns} 
            dataSource={waitingConfirmOrders} 
            rowKey="order_request_id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Không có đơn chờ xác nhận" /> }}
            bordered
          />
        </Spin>
      ),
    },
    {
      key: 'creation',
      label: (
        <span>
          Chờ tạo đơn
          {filteredAcceptedOrders.length > 0 && <Tag color="purple" className="ml-2">{filteredAcceptedOrders.length}</Tag>}
        </span>
      ),
      children: (
        <Spin spinning={loadingAccepted} indicator={<LoadingOutlined />}>
          <Table 
            columns={columns} 
            dataSource={filteredAcceptedOrders} 
            rowKey="order_request_id"
            pagination={{ 
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} đơn chờ tạo`,
            }}
            locale={{ emptyText: <Empty description="Không có đơn chờ tạo" /> }}
            bordered
          />
        </Spin>
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
            suffix={
              <Button 
                type="text" 
                icon={<ReloadOutlined spin={loading} />} 
                onClick={() => fetchOrders(currentPage)}
                title="Tải lại"
              />
            }
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