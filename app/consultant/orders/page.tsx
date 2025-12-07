'use client';

import { Order, useProduction } from '@/context/ProductionContext';
import {
    ClockCircleOutlined,
    EditOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { Button, Card, Empty, Input, Table, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useState } from 'react';

const { Title } = Typography;

export default function ConsultantOrdersPage() {
  const { orders } = useProduction();
  const [searchText, setSearchText] = useState('');

  // --- THAY ĐỔI CHÍNH Ở ĐÂY ---
  // Chỉ lọc lấy các đơn có trạng thái là 'pending_consultant' (Chờ tư vấn xử lý)
  const filteredOrders = orders
    .filter(order => order.process_status === 'pending_consultant') 
    .filter(order => 
      order.customer_name.toLowerCase().includes(searchText.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.id.includes(searchText)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Hàm hiển thị trạng thái (Thực tế giờ chỉ còn 1 case pending, nhưng giữ lại để mở rộng sau này)
  const getStatusTag = (status: Order['process_status']) => {
    switch (status) {
      case 'pending_consultant':
        return <Tag icon={<ClockCircleOutlined />} color="blue">Mới - Chờ Xử Lý</Tag>;
      default:
        return <Tag>{status}</Tag>;
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
      render: (_: any, record: Order) => (
         <Link href={`/consultant?orderId=${record.id}`}>
            <Button type="primary" size="small" icon={<EditOutlined />}>
                Tiếp nhận & Báo giá
            </Button>
         </Link>
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
       <div className="flex justify-between items-center mb-6">
        <div>
            <Title level={2} style={{ margin: 0 }}>Đơn Hàng Mới</Title>
            <p className="text-gray-500">Danh sách các yêu cầu đặt in vừa được khách hàng tạo</p>
        </div>
        <div className="w-1/3">
             <Input 
                placeholder="Tìm tên khách, sản phẩm..." 
                prefix={<SearchOutlined />} 
                onChange={(e) => setSearchText(e.target.value)}
                size="large"
             />
             <Link href="/manager/orders" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
             chuyển đến Quản lý đơn hàng &gt;
             </Link>
        </div>
       </div>
       
       <Card className="shadow-sm border-none">
         <Table 
            columns={columns} 
            dataSource={filteredOrders} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Hiện không có đơn hàng mới nào từ khách" /> }}
            bordered
         />
       </Card>
    </div>
  );
}