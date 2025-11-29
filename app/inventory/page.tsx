'use client';

import {
    CheckCircleOutlined,
    ExportOutlined,
    FilterOutlined,
    HistoryOutlined,
    ImportOutlined,
    SearchOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { Button, Card, Input, Modal, Select, Space, Statistic, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';

// --- 1. ĐỊNH NGHĨA DỮ LIỆU (TYPES & MOCK DATA) ---

interface InventoryItem {
  key: string;
  id: string;          // Mã NVL (VD: VT00008)
  name: string;        // Tên vật tư
  category: string;    // Phân loại: Giấy, Mực, Kẽm, Keo...
  spec: string;        // Quy cách (Quan trọng ngành in: Khổ 650, 79x109...)
  unit: string;        // Đơn vị: Tờ, Kg, Cuộn
  onHand: number;      // Tồn thực tế trong kho
  reserved: number;    // Đã giữ cho các Lệnh SX đang chờ
  minStock: number;    // Định mức tồn tối thiểu
  avgPrice: number;    // Giá bình quân (để tính giá trị kho)
}

// Dữ liệu giả lập
const initialData: InventoryItem[] = [
  {
    key: '1',
    id: 'VT00008',
    name: 'Giấy Duplex 250 (Hansol)',
    category: 'Giấy tờ',
    spec: 'Khổ 650, chặt 575',
    unit: 'Tờ',
    onHand: 30437,
    reserved: 2843,
    minStock: 5000,
    avgPrice: 2500
  },
  {
    key: '2',
    id: 'VT00012',
    name: 'Giấy Ivory 300',
    category: 'Giấy tờ',
    spec: 'Khổ 79 x 109',
    unit: 'Tờ',
    onHand: 1200,
    reserved: 0,
    minStock: 2000,
    avgPrice: 3200
  },
  {
    key: '3',
    id: 'VT30101',
    name: 'Mực in Offset (Cyan)',
    category: 'Mực',
    spec: 'Lon 1kg',
    unit: 'Kg',
    onHand: 15,
    reserved: 10.5,
    minStock: 20,
    avgPrice: 150000
  },
  {
    key: '4',
    id: 'VT30102',
    name: 'Mực in Offset (Magenta)',
    category: 'Mực',
    spec: 'Lon 1kg',
    unit: 'Kg',
    onHand: 8,
    reserved: 2,
    minStock: 20,
    avgPrice: 150000
  },
  {
    key: '5',
    id: 'VT00433',
    name: 'Kẽm in nhiệt',
    category: 'Kẽm',
    spec: '1030 x 800',
    unit: 'Cái',
    onHand: 50,
    reserved: 4,
    minStock: 10,
    avgPrice: 85000
  },
  {
    key: '6',
    id: 'VT30091',
    name: 'Keo phủ UV',
    category: 'Hóa chất',
    spec: 'Thùng 20kg',
    unit: 'Kg',
    onHand: 200,
    reserved: 45,
    minStock: 50,
    avgPrice: 45000
  },
];


export default function InventoryPage() {
  const [data, setData] = useState<InventoryItem[]>(initialData);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Xử lý lọc dữ liệu
  const filteredData = data.filter(item => {
    const matchSearch = 
      item.name.toLowerCase().includes(searchText.toLowerCase()) || 
      item.id.toLowerCase().includes(searchText.toLowerCase());
    const matchCategory = filterCategory ? item.category === filterCategory : true;
    return matchSearch && matchCategory;
  });

  // Tính toán KPI
  const lowStockCount = data.filter(item => (item.onHand - item.reserved) < item.minStock).length;
  const totalValue = data.reduce((acc, item) => acc + (item.onHand * item.avgPrice), 0);
  const pendingOrders = 5; 

  // Định nghĩa cột cho bảng
  const columns: ColumnsType<InventoryItem> = [
    {
      title: 'Mã NVL',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (text) => <span className="font-semibold text-blue-600">{text}</span>,
    },
    {
      title: 'Tên & Quy cách',
      key: 'info',
      width: 250,
      render: (_, record) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-800">{record.name}</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">
            {record.spec}
          </span>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (cat) => <Tag>{cat}</Tag>
    },
    {
      title: 'Đơn vị',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      align: 'center',
    },
    {
      title: 'Tồn kho',
      children: [
        {
          title: 'Thực tế',
          dataIndex: 'onHand',
          key: 'onHand',
          align: 'right',
          width: 100,
          render: (val) => val.toLocaleString(),
        },
        {
          title: 'Đang tạm giữ',
          dataIndex: 'reserved',
          key: 'reserved',
          align: 'right',
          width: 100,
          render: (val) => val > 0 ? <span className="text-orange-500">{val.toLocaleString()}</span> : '-',
        },
        {
          title: 'Khả dụng',
          key: 'available',
          align: 'right',
          width: 100,
          render: (_, record) => {
            const available = record.onHand - record.reserved;
            const isLow = available < record.minStock;
            return (
              <Tooltip title={isLow ? `Dưới định mức tối thiểu (${record.minStock})` : ''}>
                <span className={`font-bold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                  {available.toLocaleString()}
                </span>
                {isLow && <WarningOutlined className="ml-1 text-red-500 text-xs" />}
              </Tooltip>
            );
          },
        },
      ]
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem lịch sử nhập xuất">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => showHistory(record)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const showHistory = (item: InventoryItem) => {
    Modal.info({
      title: `Lịch sử kho: ${item.name}`,
      content: (
        <div>
          <p>Chức năng này sẽ hiển thị lịch sử nhập xuất của mã <b>{item.id}</b>.</p>
          <p className="text-gray-400 italic">(Đang phát triển...)</p>
        </div>
      ),
      maskClosable: true,
    });
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 uppercase">Quản lý kho</h1>
          <p className="text-gray-500 text-sm">Theo dõi nguyên vật liệu, giấy in và phụ liệu sản xuất</p>
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button type="primary" icon={<ImportOutlined />} className="bg-green-600">Nhập Kho</Button>
          <Button type="primary" icon={<ExportOutlined />} className="bg-blue-600">Xuất SX</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Tổng giá trị kho"
            value={totalValue}
            precision={0}
            suffix="₫"
            styles={{ content: { color: '#3f8600', fontWeight: 'bold' } }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Các nguyên vật liệu sắp hết "
            value={lowStockCount}
            styles={{ content: { color: lowStockCount > 0 ? '#cf1322' : '#3f8600' } }}
            prefix={<WarningOutlined />}
            suffix="mã NVL"
          />
        </Card>
        <Card variant="borderless" className="shadow-sm">
          <Statistic
            title="Lệnh sản xuất đang chờ vật tư"
            value={pendingOrders}
            prefix={<ExportOutlined />}
            suffix="Lệnh"
          />
        </Card>
      </div>

      {/* Filter & Table Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between">
          <div className="flex gap-4 flex-1">
            <Input 
              placeholder="Tìm theo Mã NVL hoặc Tên..." 
              prefix={<SearchOutlined className="text-gray-400" />} 
              onChange={e => setSearchText(e.target.value)}
              className="max-w-md"
              allowClear
            />
            <Select
              placeholder="Lọc theo loại"
              allowClear
              className="w-40"
              onChange={val => setFilterCategory(val)}
              options={[
                { value: 'Giấy tờ', label: 'Giấy tờ (Ram)' },
                { value: 'Giấy cuộn', label: 'Giấy cuộn' },
                { value: 'Mực', label: 'Mực in' },
                { value: 'Kẽm', label: 'Kẽm' },
                { value: 'Hóa chất', label: 'Hóa chất/Keo' },
              ]}
              suffixIcon={<FilterOutlined />}
            />
          </div>
          <div className="text-right text-gray-500 self-center">
            Hiển thị <b>{filteredData.length}</b> vật tư
          </div>
        </div>

        {/* Table */}
        <Table 
          columns={columns} 
          dataSource={filteredData} 
          rowKey="key"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true, 
            showTotal: (total) => `Tổng ${total} mục` 
          }}
          bordered
          size="middle"
          scroll={{ x: 800 }} 
        />
      </div>
    </div>
  );
}