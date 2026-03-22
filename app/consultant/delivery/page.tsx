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

const API_URL = "https://amms-juaa.onrender.com/api/Requests/paged";

interface OrderRequest {
  order_request_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string | null;
  product_name: string | null;
  quantity: number | null;
  description: string | null;
  design_file_path: string | null;
  detail_address: string;
  number_of_plates: number;
  coating_type: string | null;
  process_status: string | null;
  order_request_date: string | null;
  final_cost: number | null;
  deposit_amount: number | null;
}

interface ApiResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: OrderRequest[];
}

export default function DeliveryPage() {
  const [allOrders, setAllOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?page=1&pageSize=500`, {
        headers: { accept: "*/*" },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

  const deliveryOrders = useMemo(() => {
    const search = searchText.toLowerCase().trim();
    return allOrders
      .filter((o) => o.process_status?.toLowerCase() === "delivery")
      .filter((o) => {
        if (!search) return true;
        if (o.customer_name?.toLowerCase().includes(search)) return true;
        if (o.product_name?.toLowerCase().includes(search)) return true;
        if (String(o.order_request_id).includes(search)) return true;
        if (o.delivery_date) {
          if (dayjs(o.delivery_date).format("DD/MM/YYYY").includes(search))
            return true;
        }
        return false;
      });
  }, [allOrders, searchText]);

  const today = dayjs();
  const totalQty = deliveryOrders.reduce(
    (sum, o) => sum + (o.quantity ?? 0),
    0
  );
  const overdueCount = deliveryOrders.filter((o) =>
    o.delivery_date ? dayjs(o.delivery_date).isBefore(today, "day") : false
  ).length;
  const uniqueCustomers = new Set(
    deliveryOrders.map((o) => o.customer_name)
  ).size;

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "order_request_id",
      key: "order_request_id",
      width: 100,
      render: (id: number) => (
        <span className="font-mono text-gray-400 text-xs">#{id}</span>
      ),
    },
    {
      title: "Khách Hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (text: string, record: OrderRequest) => (
        <div>
          <div className="font-medium text-gray-900">{text}</div>
          <div className="text-xs text-gray-400">{record.customer_phone}</div>
        </div>
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
      render: (val: number | null) =>
        val != null ? (
          <b className="text-blue-600">{val.toLocaleString("vi-VN")} SP</b>
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
        if (!date) return <span className="text-gray-400">—</span>;
        const isOverdue = dayjs(date).isBefore(today, "day");
        return (
          <span
            className={
              isOverdue ? "text-red-500 font-medium" : "text-gray-700"
            }
          >
            {isOverdue && <WarningOutlined className="mr-1 text-red-400" />}
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        );
      },
    },
    {
      title: "Địa Chỉ",
      dataIndex: "detail_address",
      key: "detail_address",
      ellipsis: true,
      render: (text: string) => (
        <span className="text-gray-500 text-xs">{text || "—"}</span>
      ),
    },
    {
      title: "Trạng Thái",
      key: "process_status",
      align: "center" as const,
      render: () => <Tag color="processing">Đang giao</Tag>,
    },
    {
      key: "action",
      align: "center" as const,
      render: (_: unknown, record: OrderRequest) => (
        <Link href={`/order/${record.order_request_id}`}>
          <Button size="small" icon={<EyeOutlined />}>
            Chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  const stats = [
    {
      label: "Tổng đơn đang giao",
      value: deliveryOrders.length,
      color: "text-blue-600",
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
      label: "Quá hạn giao",
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
            Danh sách đơn hàng đang trong trạng thái giao hàng
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
            dataSource={deliveryOrders}
            rowKey="order_request_id"
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
                      : 'Không có đơn hàng nào có trạng thái "Delivery"'
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