"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { OrderRequest } from "@/schemaValidations/common.schema";
import { EyeOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, message, Table, Tag } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function DesignerRequestsPage() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [allOrders, setAllOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestOrderApi.getList(1, 500);
      if (response?.data && Array.isArray(response.data)) {
        setAllOrders(response.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      message.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  const acceptedOrders = useMemo(() => {
    let filtered = allOrders.filter(
      (o) => o.process_status?.toLowerCase() === "accepted"
    );

    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      filtered = filtered.filter((o) =>
        o.customer_name?.toLowerCase().includes(lowerSearch) ||
        o.product_name?.toLowerCase().includes(lowerSearch) ||
        o.order_request_id?.toString().includes(lowerSearch) ||
        o.order_id?.toString().includes(lowerSearch)
      );
    }
    
    // Sắp xếp đơn mới nhất lên trên
    return filtered.sort((a, b) => b.order_request_id - a.order_request_id);
  }, [allOrders, searchText]);

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "order_id",
      key: "order_id",
      width: 100,
      render: (id: number, record: any) => (
        <span className="font-mono text-gray-500 text-xs">#{id || record.order_request_id}</span>
      ),
    },
    {
      title: "Khách Hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (text: string) => (
        <span className="font-medium text-gray-900">{text}</span>
      ),
    },
    {
      title: "Sản Phẩm Yêu Cầu",
      dataIndex: "product_name",
      key: "product_name",
      render: (text: string) => (
        <span className="font-medium">{text || "Sản phẩm tùy chỉnh"}</span>
      ),
    },
    {
      title: "Số Lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      render: (val: number) => (
        <b className="text-blue-600">{val?.toLocaleString()} SP</b>
      ),
    },
    {
      title: "Ngày Giao",
      dataIndex: "delivery_date",
      key: "delivery_date",
      align: "right" as const,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Trạng Thái",
      key: "status",
      align: "center" as const,
      render: () => <Tag color="green">Đã duyệt (Accept)</Tag>,
    },

  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Danh sách đơn hàng thiết kế</h1>
          <p className="text-gray-500 mt-1 mb-0">Chỉ hiển thị các đơn hàng đã được chấp nhận (Accept)</p>
        </div>
        <Input
          placeholder="Tìm theo tên KH, mã đơn, tên SP..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-xs rounded-lg border-gray-300"
          allowClear
        />
      </div>

      <Card className="shadow-sm rounded-xl overflow-hidden border-0">
        <Table
          columns={columns}
          dataSource={acceptedOrders}
          rowKey="order_request_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn hàng nào cần thiết kế" /> }}
          bordered
          size="middle"
          onRow={(record) => ({
            onClick: () => router.push(`/designer/request-detail/${record.order_request_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
        />
      </Card>
    </div>
  );
}
