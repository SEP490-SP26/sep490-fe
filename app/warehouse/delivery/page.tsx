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
  Modal,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { productionsApi } from "@/apiRequests/productions";
import { useRouter } from "next/navigation";

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
  | "LayoutPending"
  | "Delivery"
  | string;

interface RequestItem {
  order_id: string;
  order_request_id: string;
  code: string;
  customer_name: string;
  product_name: string | null;
  quantity: number;
  delivery_date: string;
  process_status: ProductionStatus;
  delivery_note: string | null;
}

interface PagedResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: any[];
}

/* =======================
   Status config
======================= */

const statusConfig: Record<string, { label: string; color: string }> = {
  Finished: { label: "Chờ liên hệ khách hàng", color: "green" },
  InProcessing: { label: "Đang sản xuất", color: "blue" },
  Scheduled: { label: "Đã lên lịch", color: "orange" },
  PendingPaid: { label: "Chờ thanh toán", color: "purple" },
  Paid: { label: "Đã thanh toán", color: "cyan" },
  LayoutPending: { label: "Chờ duyệt layout", color: "gold" },
  Delivery: { label: "Đang vận chuyển", color: "volcano" },
};

const DISPLAY_STATUSES: ProductionStatus[] = ["Finished", "PendingPaid", "Paid", "Delivery"];

const TAB_ITEMS = [
  { key: "all", label: "Tất cả" },
  { key: "Finished", label: "Chờ liên hệ" },
  { key: "PendingPaid", label: "Chờ thanh toán" },
  { key: "Paid", label: "Đã thanh toán" },
  { key: "Delivery", label: "Đang vận chuyển" },
];

/* =======================
   Component
======================= */

const FinishProduction: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [customerKeyword, setCustomerKeyword] = useState("");
  const [deliveryRange, setDeliveryRange] =
    useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [noteModal, setNoteModal] = useState<{
    open: boolean;
    content: string | null;
  }>({
    open: false,
    content: null,
  });

  /* =======================
     Normalize status
  ======================= */

  const normalizeStatus = (s: string): ProductionStatus => {
    if (!s) return s;
    const upper = s.toUpperCase();

    if (upper === "FINISHED" || upper === "DONE") return "Finished";
    if (upper === "PENDINGPAID") return "PendingPaid";
    if (upper === "PAID") return "Paid";
    if (upper === "DELIVERY" || upper === "SHIPPING") return "Delivery";

    return s;
  };

  /* =======================
     Fetch API
  ======================= */

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        "https://amms-juaa.onrender.com/api/Requests/paged?page=1&pageSize=500"
      );
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

      const json: PagedResponse = await res.json();

      const mapped: RequestItem[] = (json.data || []).map((r: any) => ({
        order_id: r.order_id, // 🔥 vẫn giữ order_id
        order_request_id: r.order_request_id,
        code: r.order_id,
        customer_name: r.customer_name,
        product_name: r.product_name,
        quantity: r.quantity,
        delivery_date: r.delivery_date,
        process_status: normalizeStatus(r.process_status),
        delivery_note: r.delivery_note,
      }));

      const filtered = mapped.filter((o) =>
        DISPLAY_STATUSES.includes(o.process_status)
      );

      setData(filtered);
    } catch (err) {
      console.error("Fetch requests error:", err);
      message.error("Không thể tải danh sách yêu cầu");
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
        activeTab === "all" ? true : o.process_status === activeTab
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
      counts[s] = data.filter((o) => o.process_status === s).length;
    }
    return counts;
  }, [data]);

  /* =======================
     Transfer handler
  ======================= */

  const handleTransfer = async (orderId: string) => {
    try {
      await productionsApi.transferToShipping(Number(orderId));
      setData((prev) =>
        prev.map((item) =>
          item.order_id === orderId
            ? { ...item, process_status: "Delivery" }
            : item
        )
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

  const columns: ColumnsType<RequestItem> = [
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
      dataIndex: "process_status",
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
      title: "Ghi chú vận chuyển",
      dataIndex: "delivery_note",
      render: (note: string | null) =>
        note ? (
          <Button
            type="link"
            onClick={(e) => {
              e.stopPropagation();
              setNoteModal({
                open: true,
                content: note,
              });
            }}
          >
            Xem
          </Button>
        ) : (
          <span style={{ color: "#aaa" }}>—</span>
        ),
    },
    {
      title: "Thao tác",
      key: "action",
      align: "center",
      render: (_, record) => {
        const status = record.process_status;

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
        } else if (status === "Delivery") {
          text = "Đang vận chuyển";
          disabled = true;
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
      <Title level={4} style={{ marginBottom: 16 }}>
        Đơn sẵn sàng giao
      </Title>

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

      <Spin spinning={loading}>
        <Table
          rowKey="order_id"
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10 }}
          bordered
          onRow={(record) => ({
            onClick: () => {
              router.push(`/warehouse/delivery/detail/${record.order_id}`);
            },
            style: {
              cursor: "pointer",
            },
          })}
        />
      </Spin>

      <Modal
        title="Ghi chú vận chuyển"
        open={noteModal.open}
        onCancel={() => setNoteModal({ open: false, content: null })}
        footer={null}
      >
        <p style={{ whiteSpace: "pre-wrap" }}>
          {noteModal.content}
        </p>
      </Modal>
    </Card>
  );
};

export default FinishProduction;