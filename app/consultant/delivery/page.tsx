"use client";

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LoadingOutlined,
  ReloadOutlined,
  SearchOutlined,
  TruckOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Empty,
  Input,
  message,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title } = Typography;

// ✅ Đổi sang API mới
const API_URL = "https://amms-juaa.onrender.com/api/Requests/paged";

// ✅ Interface cập nhật theo response của API mới
interface Order {
  order_request_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  product_name: string | null;
  quantity: number | null;
  order_request_date: string | null;
  delivery_date: string | null;
  process_status: string | null;
  detail_address: string | null;
  order_id: number | null;
}

interface ApiResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: Order[];
}

// Map each tab to the corresponding API status value(s)
const TAB_STATUS_MAP: Record<string, string[]> = {
  finished: ["Finished"],
  pending_payment: ["PendingPayment", "Pending Payment", "WaitingPayment"],
  delivery: ["Shipping", "InShipping", "InDelivery", "Delivering", "Delivery"],
  completed: ["Delivered", "Received", "Done", "Completed"],
};

type TabKey = keyof typeof TAB_STATUS_MAP;

const TAB_CONFIG: {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
  color: string;
  tagColor: string;
  tagLabel: string;
  emptyText: string;
}[] = [
  {
    key: "finished",
    label: "Đã sản xuất xong",
    icon: <CheckCircleOutlined />,
    color: "text-green-600",
    tagColor: "success",
    tagLabel: "Hoàn thành SX",
    emptyText: 'Không có đơn nào ở trạng thái "Đã sản xuất xong"',
  },
  {
    key: "pending_payment",
    label: "Chờ thanh toán",
    icon: <ClockCircleOutlined />,
    color: "text-yellow-600",
    tagColor: "warning",
    tagLabel: "Chờ thanh toán",
    emptyText: 'Không có đơn nào ở trạng thái "Chờ thanh toán"',
  },
  {
    key: "delivery",
    label: "Đang vận chuyển",
    icon: <TruckOutlined />,
    color: "text-blue-600",
    tagColor: "processing",
    tagLabel: "Đang vận chuyển",
    emptyText: 'Không có đơn nào ở trạng thái "Đang vận chuyển"',
  },
  {
    key: "completed",
    label: "Đã nhận hàng",
    icon: <CheckCircleOutlined />,
    color: "text-purple-600",
    tagColor: "purple",
    tagLabel: "Đã nhận hàng",
    emptyText: 'Không có đơn nào ở trạng thái "Đã nhận hàng"',
  },
];

export default function DeliveryPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("finished");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Gọi API mới
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

  const today = dayjs();

  // Filter orders by tab status + search text
  const getOrdersForTab = useCallback(
    (tabKey: TabKey) => {
      const statuses = TAB_STATUS_MAP[tabKey].map((s) => s.toLowerCase());
      const search = searchText.toLowerCase().trim();

      return allOrders
        // ✅ Dùng process_status thay vì status
        .filter((o) =>
          statuses.includes(o.process_status?.toLowerCase() ?? "")
        )
        .filter((o) => {
          if (!search) return true;
          if (o.customer_name?.toLowerCase().includes(search)) return true;
          if (o.product_name?.toLowerCase().includes(search)) return true;
          // ✅ Tìm theo order_request_id thay vì code / order_id
          if (String(o.order_request_id).includes(search)) return true;
          if (o.order_id && String(o.order_id).includes(search)) return true;
          if (o.delivery_date && o.delivery_date !== "") {
            if (
              dayjs(o.delivery_date).format("DD/MM/YYYY").includes(search)
            )
              return true;
          }
          return false;
        });
    },
    [allOrders, searchText]
  );

  const currentOrders = useMemo(
    () => getOrdersForTab(activeTab),
    [getOrdersForTab, activeTab]
  );

  // Stats for current tab
  const totalQty = currentOrders.reduce(
    (sum, o) => sum + (o.quantity ?? 0),
    0
  );
  const overdueCount = currentOrders.filter((o) =>
    o.delivery_date && o.delivery_date !== ""
      ? dayjs(o.delivery_date).isBefore(today, "day")
      : false
  ).length;
  const uniqueCustomers = new Set(
    currentOrders.map((o) => o.customer_name)
  ).size;

  const tabConfig = TAB_CONFIG.find((t) => t.key === activeTab)!;

  const getColumns = (cfg: (typeof TAB_CONFIG)[number]) => [
    {
      // ✅ Đổi từ "Mã Đơn" (code) sang "Mã Yêu Cầu" (order_request_id)
      title: "Mã YC",
      dataIndex: "order_request_id",
      key: "order_request_id",
      width: 100,
      render: (id: number) => (
        <span className="font-mono text-gray-500 text-xs">#{id}</span>
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
      render: (val: number | null) =>
        val != null ? (
          <b className="text-blue-600">{val.toLocaleString("vi-VN")} SP</b>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      // ✅ Đổi từ created_at sang order_request_date
      title: "Ngày Tạo",
      dataIndex: "order_request_date",
      key: "order_request_date",
      align: "center" as const,
      render: (date: string | null) =>
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
            {isOverdue && <WarningOutlined className="mr-1 text-red-400" />}
            {dayjs(date).format("DD/MM/YYYY")}
          </span>
        );
      },
    },
    {
      title: "Trạng Thái",
      key: "process_status",
      align: "center" as const,
      render: () => (
        <Tag color={cfg.tagColor as string}>{cfg.tagLabel}</Tag>
      ),
    },
    {
      key: "action",
      align: "center" as const,
      // ✅ Dùng order_request_id cho đường dẫn chi tiết
      render: (_: unknown, record: Order) => (
        <Link href={`/consultant/delivery/detail/${record.order_request_id}`}>
          <Button size="small" icon={<EyeOutlined />}>
            Chi tiết
          </Button>
        </Link>
      ),
    },
  ];

  const stats = [
    {
      label: "Tổng đơn",
      value: currentOrders.length,
      color: tabConfig.color,
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

  const tabItems = TAB_CONFIG.map((cfg) => {
    const count = getOrdersForTab(cfg.key).length;
    return {
      key: cfg.key,
      label: (
        <span className="flex items-center gap-2">
          {cfg.icon}
          {cfg.label}
          {count > 0 && (
            <Badge
              count={count}
              size="small"
              style={{ backgroundColor: "#6b7280" }}
            />
          )}
        </span>
      ),
    };
  });

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Theo Dõi Vận Chuyển
          </Title>
          <p className="text-gray-500 mt-1">Quản lý đơn hàng theo trạng thái</p>
        </div>
        <div className="w-1/3">
          <Input
            placeholder="Tìm mã YC, khách hàng, sản phẩm..."
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

      {/* Tabs */}
      <Card className="shadow-sm border-none mb-4">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key as TabKey);
            setSearchText("");
          }}
          items={tabItems}
          size="large"
        />
      </Card>

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
            columns={getColumns(tabConfig)}
            dataSource={currentOrders}
            // ✅ Dùng order_request_id làm rowKey
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
                    loading ? "Đang tải..." : tabConfig.emptyText
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