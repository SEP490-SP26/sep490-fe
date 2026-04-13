"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Input, Button, Tag } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { materialsApi } from "@/apiRequests/materials";
import { Material } from "@/lib/estimation.types";

export default function MaterialsManagementPage() {
  const [searchText, setSearchText] = useState("");

  const { data: materials, isLoading, refetch } = useQuery({
    queryKey: ["materials-all"],
    queryFn: async () => {
      try {
        const res: any = await materialsApi.getAll();
        const data = res?.data ?? res ?? [];
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch materials:", error);
        return [];
      }
    },
  });

  // Filter materials based on search
  const filteredMaterials = (materials || []).filter((m: Material) => {
    return (
      m.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      m.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      m.type?.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const columns = [
    {
      title: "Mã VT",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (text: string) => <span className="font-medium text-blue-600">{text}</span>,
    },
    {
      title: "Tên vật tư",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Material) => (
        <div>
          <div className="font-semibold text-gray-800">{text}</div>
          <div className="text-xs text-gray-500 mt-1">
            {record.type} {record.material_class ? `- ${record.material_class}` : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Đơn vị",
      dataIndex: "unit",
      key: "unit",
      width: 100,
      render: (text: string) => <Tag color="blue">{text || "N/A"}</Tag>,
    },
    {
      title: "Tồn kho",
      dataIndex: "stock_qty",
      key: "stock_qty",
      width: 120,
      align: 'right' as const,
      sorter: (a: Material, b: Material) => (a.stock_qty || 0) - (b.stock_qty || 0),
      render: (val: number, record: Material) => {
        const isLow = val <= record.min_stock;
        return (
          <span className={`font-medium ${isLow ? "text-red-500" : "text-green-600"}`}>
            {val ? val.toLocaleString("vi-VN") : "0"}
          </span>
        );
      },
    },
    {
      title: "Tồn kho tối thiểu",
      dataIndex: "min_stock",
      key: "min_stock",
      width: 160,
      align: 'right' as const,
      render: (val: number) => <span className="text-gray-600">{val ? val.toLocaleString("vi-VN") : "0"}</span>,
    },
    {
      title: "Giá/Đơn vị (VNĐ)",
      dataIndex: "cost_price",
      key: "cost_price",
      width: 150,
      align: 'right' as const,
      sorter: (a: Material, b: Material) => (a.cost_price || 0) - (b.cost_price || 0),
      render: (val: number) => <span className="font-medium">{val ? val.toLocaleString("vi-VN") : "0"}</span>,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý nguyên vật liệu</h1>
        <Button 
          type="primary" 
          icon={<ReloadOutlined />} 
          onClick={() => refetch()}
          className="bg-blue-600 shadow-sm"
        >
          Làm mới
        </Button>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Input
            placeholder="Tìm theo mã, tên hoặc loại vật tư..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="sm:max-w-md w-full shadow-sm hover:border-blue-400 focus:border-blue-500"
            size="large"
            allowClear
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            Tổng số: <span className="font-bold text-blue-700 text-base">{filteredMaterials.length}</span> vật tư
          </div>
        </div>

        <Table 
          columns={columns} 
          dataSource={filteredMaterials} 
          rowKey="material_id"
          loading={isLoading}
          pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ['12', '24', '50'] }}
          bordered
          size="middle"
          scroll={{ x: 800 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
          rowClassName="hover:bg-blue-50/50 transition-colors cursor-pointer"
        />
      </div>
    </div>
  );
}
