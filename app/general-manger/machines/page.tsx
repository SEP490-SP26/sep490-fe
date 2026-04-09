"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Input, Button, Tag, Progress } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { machineApi } from "@/apiRequests/machine";
import { Machine } from "@/lib/estimation.types";

export default function MachinesManagementPage() {
  const [searchText, setSearchText] = useState("");

  const { data: machines, isLoading, refetch } = useQuery({
    queryKey: ["machines-all"],
    queryFn: async () => {
      try {
        const res: any = await machineApi.getAllMachine();
        const data = res?.data ?? res ?? [];
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch machines:", error);
        return [];
      }
    },
  });

  // Filter based on search
  const filteredMachines = (machines || []).filter((m: Machine) => {
    return (
      m.process_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      m.process_code?.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const columns = [
    {
      title: "Mã CĐ",
      dataIndex: "process_code",
      key: "process_code",
      width: 120,
      render: (text: string) => <Tag color="geekblue" className="font-medium px-2 py-1">{text || "N/A"}</Tag>,
    },
    {
      title: "Tên máy / Công đoạn",
      dataIndex: "process_name",
      key: "process_name",
      render: (text: string) => <span className="font-semibold text-gray-800">{text}</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 150,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"} className="px-2 py-1">
          {isActive ? "Đang hoạt động" : "Tạm ngưng"}
        </Tag>
      ),
      filters: [
        { text: 'Đang hoạt động', value: true },
        { text: 'Tạm ngưng', value: false },
      ],
      onFilter: (value: boolean | React.Key, record: Machine) => record.is_active === value,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      align: 'center' as const,
      sorter: (a: Machine, b: Machine) => (a.quantity || 0) - (b.quantity || 0),
      render: (val: number) => <span className="font-medium">{val ? val : 1}</span>,
    },
    {
      title: "Công suất / Ngày",
      dataIndex: "daily_capacity",
      key: "daily_capacity",
      width: 160,
      align: 'right' as const,
      render: (val: number) => <span className="font-medium text-blue-700">{val ? val.toLocaleString("vi-VN") : "0"}</span>,
      sorter: (a: Machine, b: Machine) => (a.daily_capacity || 0) - (b.daily_capacity || 0),
    },
    {
      title: "Hiệu suất dự kiến (%)",
      dataIndex: "efficiency_percent",
      key: "efficiency_percent",
      width: 180,
      render: (val: number) => (
         <Progress 
           percent={val || 0} 
           size="small" 
           status={val > 80 ? 'success' : val < 50 ? 'exception' : 'active'}
           className="m-0"
         />
      ),
      sorter: (a: Machine, b: Machine) => (a.efficiency_percent || 0) - (b.efficiency_percent || 0),
    },
    {
      title: "Giờ làm / Ngày",
      dataIndex: "working_hours_per_day",
      key: "working_hours_per_day",
      width: 140,
      align: 'center' as const,
      render: (val: number) => (
        <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {val || 8} h
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý máy móc thiết bị</h1>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={() => refetch()}
          className="bg-blue-600 shadow-sm"
        >
          Cập nhật
        </Button>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Input
            placeholder="Tìm theo mã hoặc tên máy / công đoạn..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="sm:max-w-md w-full shadow-sm hover:border-blue-400 focus:border-blue-500"
            size="large"
            allowClear
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            Tổng số: <span className="font-bold text-blue-700 text-base">{filteredMachines.length}</span> máy / dây chuyền
          </div>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredMachines} 
          rowKey={(record) => record.machine_id || record.process_code}
          loading={isLoading}
          pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ['12', '24', '50'] }}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
          rowClassName="hover:bg-blue-50/50 transition-colors cursor-pointer"
        />
      </div>
    </div>
  );
}
