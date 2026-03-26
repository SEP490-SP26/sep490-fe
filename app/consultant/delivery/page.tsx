"use client";

import {
  EyeOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title } = Typography;

const API_URL = "https://amms-juaa.onrender.com/api/Orders/paged";

interface Order {
  order_id: string;
  code: string;
  customer_name: string;
  product_name: string | null;
  product_id: string | null;
  quantity: number;
  created_at: string;
  delivery_date: string | null;
  status: string;
  can_fulfill: boolean;
  missing_materials: unknown;
  layout_confirmed: boolean;
}

interface ApiResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: Order[];
}

export default function DeliveryPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?page=1&pageSize=500`, {
        headers: { accept: "*/*" },
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const json: ApiResponse = await response.json();
      if (json?.data && Array.isArray(json.data)) {
        setAllOrders(json.data);
      }
    } catch (error) {
      console.error(error);
      message.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const finishedOrders = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    return allOrders
      .filter((o) => o.status === "Finished")
      .filter((o) => {
        if (!search) return true;
        if (o.customer_name?.toLowerCase().includes(search)) return true;
        if (o.product_name?.toLowerCase().includes(search)) return true;
        if (o.code?.toLowerCase().includes(search)) return true;
        if (String(o.order_id).includes(search)) return true;
        if (o.delivery_date && o.delivery_date !== "") {
          if (
            dayjs(o.delivery_date).format("DD/MM/YYYY").includes(search)
          )
            return true;
        }
        return false;
      });
  }, [allOrders, searchText]);

  const today = dayjs();
  const totalQty = finishedOrders.reduce((sum, o) => sum + (o.quantity ?? 0), 0);
  const overdueCount = finishedOrders.filter((o) =>
    o.delivery_date && o.delivery_date !== ""
      ? dayjs(o.delivery_date).isBefore(today, "day")
      : false
  ).length;
  const uniqueCustomers = new Set(finishedOrders.map((o) => o.customer_name))
    .size;

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "code",
      key: "code",
      width: 150,
      render: (code: string) => (
        <span className="font-mono text-gray-500 text-xs">{code}</span>
      ),
    },
    {
      title: "Khách Hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (text: string) => (
        <div className="font-medium text-gray-900">{text}</div>
      ),
    },
    {
      title: "Sản Phẩm",
      dataIndex: "product_name",
      key: "product_name",
      render: (text: string | null) => (
        <span className="font-medium">{text || "—"}</span>
      ),
    },
    {
      title: "Số Lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      render: (val: number) =>
        val != null ? (
          <b className="text-blue-600">{val.toLocaleString("vi-VN")} SP</b>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      title: "Ngày Tạo",
      dataIndex: "created_at",
      key: "created_at",
      align: "center" as const,
      render: (date: string) =>
        date ? (
          <span className="text-gray-600 text-sm">
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      title: "Ngày Giao",
      dataIndex: "delivery_date",
      key: "delivery_date",
      align: "center" as const,
      render: (date: string | null) => {
        if (!date || date === "")
          return <span className="text-gray-400">—</span>;
        const isOverdue = dayjs(date).isBefore(today, "day");
        return (
          <span
            className={
              isOverdue ? "text-red-500 font-medium" : "text-gray-700"
            }
          >
            {isOverdue && (
              <WarningOutlined className="mr-1 text-red-400" />
            )}
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        );
      },
    },
    {
      title: "Trạng Thái",
      key: "status",
      align: "center" as const,
      render: () => <Tag color="success">Hoàn thành</Tag>,
    },
    {
      key: "action",
      align: "center" as const,
      render: (_: unknown, record: Order) => (
        <Link href={`/consultant/delivery/detail/${record.order_id}`}>
          <Button size="small" icon={<EyeOutlined />}>
            Chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  const stats = [
    {
      label: "Tổng đơn hoàn thành",
      value: finishedOrders.length,
      color: "text-green-600",
    },
    {
      label: "Tổng số lượng",
      value: totalQty.toLocaleString("vi-VN") + " SP",
      color: "text-blue-600",
    },
    {
      label: "Khách hàng",
      value: uniqueCustomers,
      color: "text-gray-900",
    },
    {
      label: "Giao quá hạn",
      value: overdueCount,
      color: overdueCount > 0 ? "text-red-500" : "text-gray-900",
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Theo Dõi Vận Chuyển
          </Title>
          <p className="text-gray-500 mt-1">
            Danh sách đơn hàng đã hoàn thành
          </p>
        </div>
        <div className="w-1/3">
          <Input
            placeholder="Tìm mã đơn, khách hàng, sản phẩm..."
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
            allowClear
            suffix={
              <Button
                type="text"
                icon={<ReloadOutlined spin={loading} />}
                onClick={fetchOrders}
                title="Tải lại"
              />
            }
          />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-gray-100 p-4 shadow-sm"
          >
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-medium ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <Card className="shadow-sm border-none">
        <Spin spinning={loading} indicator={<LoadingOutlined />}>
          <Table
            columns={columns}
            dataSource={finishedOrders}
            rowKey="order_id"
            bordered
            size="middle"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Tổng ${total} đơn`,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
            }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    loading
                      ? "Đang tải..."
                      : 'Không có đơn hàng nào có trạng thái "Finished"'
                  }
                />
              ),
            }}
          />
        </Spin>
      </Card>
    </div>
  );
}