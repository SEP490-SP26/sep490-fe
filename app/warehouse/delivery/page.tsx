"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  DatePicker,
  Input,
  Space,
  Spin,
  Typography,
  Button,
  message,
  Tabs,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { productionsApi } from "@/apiRequests/productions";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Title } = Typography;

/* =======================
   Types
======================= */

type ProductionStatus =
  | "Finished"
  | "InProcessing"
  | "Scheduled"
  | "PendingPaid"
  | "Paid"
  | "LayoutPending";

interface OrderItem {
  order_id: string;
  code: string;
  customer_name: string;
  product_name: string | null;
  product_id: string | null;
  quantity: number;
  created_at: string;
  delivery_date: string;
  status: ProductionStatus;
  can_fulfill: boolean;
  missing_materials: unknown;
  layout_confirmed: boolean;
}

interface PagedOrderResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: OrderItem[];
}

/* =======================
   Status config
======================= */

const statusConfig: Record<
  string,
  { label: string; color: string }
> = {
  Finished: { label: "Sẵn sàng giao", color: "green" },
  InProcessing: { label: "Đang sản xuất", color: "blue" },
  Scheduled: { label: "Đã lên lịch", color: "orange" },
  PendingPaid: { label: "Chờ thanh toán", color: "purple" },
  Paid: { label: "Đã thanh toán", color: "cyan" },
  LayoutPending: { label: "Chờ duyệt layout", color: "gold" },
};

const DISPLAY_STATUSES: ProductionStatus[] = ["Finished", "PendingPaid", "Paid"];

const TAB_ITEMS = [
  { key: "all", label: "Tất cả" },
  { key: "Finished", label: "Sẵn sàng giao" },
  { key: "PendingPaid", label: "Chờ thanh toán" },
  { key: "Paid", label: "Đã thanh toán" },
];

/* =======================
   Component
======================= */

const FinishProduction: React.FC = () => {

  const [data, setData] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [customerKeyword, setCustomerKeyword] = useState("");
  const [deliveryRange, setDeliveryRange] =
    useState<[Dayjs | null, Dayjs | null] | null>(null);

  /* =======================
     Fetch API
  ======================= */

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        "https://amms-juaa.onrender.com/api/Orders/paged?page=1&pageSize=500"
      );
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const json: PagedOrderResponse = await res.json();
      // Keep only orders with the statuses we care about
      const filtered = (json.data || []).filter((o) =>
        DISPLAY_STATUSES.includes(o.status)
      );
      setData(filtered);
    } catch (err) {
      console.error("Fetch orders error:", err);
      message.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* =======================
     Filter data
  ======================= */

  const filteredData = useMemo(() => {
    return data
      .filter((o) =>
        activeTab === "all" ? true : o.status === activeTab
      )
      .filter((o) =>
        customerKeyword
          ? o.customer_name
              .toLowerCase()
              .includes(customerKeyword.toLowerCase())
          : true
      )
      .filter((o) => {
        if (!deliveryRange?.[0] || !deliveryRange?.[1]) return true;
        if (!o.delivery_date) return false;
        const d = dayjs(o.delivery_date);
        return (
          d.isSameOrAfter(deliveryRange[0], "day") &&
          d.isSameOrBefore(deliveryRange[1], "day")
        );
      });
  }, [data, activeTab, customerKeyword, deliveryRange]);

  /* =======================
     Tab counts
  ======================= */

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data.length };
    for (const s of DISPLAY_STATUSES) {
      counts[s] = data.filter((o) => o.status === s).length;
    }
    return counts;
  }, [data]);

  /* =======================
     Transfer handler
  ======================= */

  const handleTransfer = async (orderId: string) => {
    try {
      // Replace with actual shipping transfer API call
      await productionsApi.transferToShipping(Number(orderId));
      setData((prev) =>
        prev.filter((item) => item.order_id !== orderId)
      );
      message.success("Đã bàn giao cho đơn vị vận chuyển");
    } catch (err) {
      console.error(err);
      message.error("Bàn giao thất bại");
    }
  };

  /* =======================
     Columns
  ======================= */

  const columns: ColumnsType<OrderItem> = [
    {
      title: "Mã đơn",
      dataIndex: "code",
      width: 140,
      render: (v) => <strong>{v}</strong>,
    },
    {
      title: "Khách hàng",
      dataIndex: "customer_name",
    },
    {
      title: "Sản phẩm",
      dataIndex: "product_name",
      render: (v) => v ?? <span style={{ color: "#aaa" }}>—</span>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      align: "right",
    },
    {
      title: "Ngày hoàn thành",
      dataIndex: "delivery_date",
      render: (v: string) =>
        v ? dayjs(v).format("DD/MM/YYYY") : <span style={{ color: "#aaa" }}>—</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: string) => {
        const cfg = statusConfig[status];
        return cfg ? (
          <Tag color={cfg.color}>{cfg.label}</Tag>
        ) : (
          <Tag>{status}</Tag>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center",
      render: (_, record) => {
        const status = record.status;

        let text = "";
        let disabled = true;

        if (status === "Finished") {
          text = "Chờ tư vấn viên liên hệ với khách hàng";
          disabled = true;
        } else if (status === "PendingPaid") {
          text = "Chờ khách hàng thanh toán để vận chuyển";
          disabled = true;
        } else if (status === "Paid") {
          text = "Bàn giao cho đơn vị vận chuyển";
          disabled = false;
        } else {
          text = "Không khả dụng";
          disabled = true;
        }

        return (
          <Button
            type="primary"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                handleTransfer(record.order_id);
              }
            }}
          >
            {text}
          </Button>
        );
      },
    },
  ];

  /* =======================
     Render
  ======================= */

  return (
    <Card
      style={{
        borderRadius: 12,
        border: "1px solid #d6e4ff",
        background: "#f5f9ff",
      }}
      styles={{
        body: {
          padding: 20,
        },
      }}
    >
      {/* Header */}
      <Title level={4} style={{ marginBottom: 16 }}>
        Đơn sẵn sàng giao
      </Title>

      {/* Tabs by status */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 16 }}
        items={TAB_ITEMS.map((tab) => ({
          key: tab.key,
          label: (
            <span>
              {tab.label}
              <Tag
                style={{ marginLeft: 6, fontSize: 11 }}
                color={tab.key === "all" ? "default" : statusConfig[tab.key]?.color}
              >
                {tabCounts[tab.key] ?? 0}
              </Tag>
            </span>
          ),
        }))}
      />

      {/* Filters */}
      <Space
        style={{
          marginBottom: 20,
          padding: 16,
          background: "#e6ebff",
          borderRadius: 8,
          width: "100%",
        }}
        wrap
      >
        <Input
          placeholder="🔍 Tìm theo khách hàng"
          allowClear
          style={{ width: 240 }}
          onChange={(e) => setCustomerKeyword(e.target.value)}
        />

        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          placeholder={["Từ ngày", "Đến ngày"]}
          onChange={(dates) => setDeliveryRange(dates as any)}
        />
      </Space>

      {/* Table */}
      <Spin spinning={loading}>
        <Table
          rowKey="order_id"
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10 }}
          bordered
          onRow={() => ({          
            style: {
              cursor: "pointer",
            },
          })}
        />
      </Spin>
    </Card>
  );
};

export default FinishProduction;