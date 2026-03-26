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
  message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import { productionsApi } from "@/apiRequests/productions";
import { useRouter } from "next/navigation";

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

const { Title } = Typography;

/* =======================
   Types
======================= */

type ProductionStatus = "Finished" | "InProcessing" | "Scheduled" | "Payment";

interface ProductionOrder {
  order_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  current_stage: string | null;
  production_status: ProductionStatus;
}

interface ProductionResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: ProductionOrder[];
}

/* =======================
   Status config
======================= */

const statusConfig: Record<
  ProductionStatus,
  { label: string; color: string }
> = {
  Finished: { label: "Sẵn sàng giao", color: "green" },
  InProcessing: { label: "Đang sản xuất", color: "blue" },
  Scheduled: { label: "Đã lên lịch", color: "orange" },
  Payment: { label: "Chờ thanh toán", color: "purple" },
};

/* =======================
   Component
======================= */

const FinishProduction: React.FC = () => {
  const router = useRouter();

  const [data, setData] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [customerKeyword, setCustomerKeyword] = useState("");
  const [deliveryRange, setDeliveryRange] =
    useState<[Dayjs | null, Dayjs | null] | null>(null);

  /* =======================
     Fetch API
  ======================= */

      const fetchProductions = async () => {
      try {
        setLoading(true);
        const res: ProductionResponse =
          await productionsApi.getAllProduction();
        setData(res.data || []);
      } catch (err) {
        console.error("Fetch production error:", err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchProductions();
  }, []);

  /* =======================
     Filter FINISHED only
  ======================= */

    const filteredData = useMemo(() => {
    return data
      .filter((o) =>
        o.production_status === "Finished" || o.production_status === "Payment"
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
        const d = dayjs(o.delivery_date);
        return (
          d.isSameOrAfter(deliveryRange[0], "day") &&
          d.isSameOrBefore(deliveryRange[1], "day")
        );
      });
  }, [data, customerKeyword, deliveryRange]);

  /* =======================
     Columns
  ======================= */

  const columns: ColumnsType<ProductionOrder> = [
  {
    title: "Mã đơn",
    dataIndex: "code",
    width: 120,
    render: (v) => <strong>{v}</strong>,
  },
  {
    title: "Khách hàng",
    dataIndex: "customer_name",
  },
  {
    title: "Sản phẩm",
    dataIndex: "product_name",
  },
  {
    title: "Số lượng",
    dataIndex: "quantity",
    align: "right",
  },
  {
    title: "Ngày hoàn thành",
    dataIndex: "delivery_date",
    render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
  },
  {
    title: "Trạng thái",
    dataIndex: "production_status",
    render: (status: ProductionStatus) => (
      <Tag color={statusConfig[status].color}>
        {statusConfig[status].label}
      </Tag>
    ),
  },
  {
      title: "Thao tác",
      key: "action",
      align: "center",
      render: (_, record) => {
        const isPayment = record.production_status === "Payment";
        return (
          <Button
            type="primary"
            disabled={!isPayment}
            title={
              !isPayment
                ? "Chờ tư vấn viên liên hệ khách trước khi bàn giao"
                : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              handleTransfer(record.order_id);
            }}
          >
            {isPayment
              ? "Bàn giao cho đơn vị vận chuyển"
              : "Chờ tư vấn viên liên hệ khách"}
          </Button>
        );
      },
    },
  ];

  const handleTransfer = async (orderId: number) => {
    try {
    // gọi API bàn giao
      await productionsApi.transferToShipping(orderId);
      setData((prev) =>
      prev.map((item) =>
        item.order_id === orderId
          ? { ...item, production_status: "Scheduled" }
          : item
      ));
      message.success("Đã bàn giao cho đơn vị vận chuyển");
    }catch (err) {
      console.error(err);
      message.error("Bàn giao thất bại");
    }
  };

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
      <Title level={4} style={{ marginBottom: 20 }}>
        Đơn sẵn sàng giao
      </Title>
 
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
        />
      </Space>
 
      {/* Table */}
      <Spin spinning={loading}>
        <Table
          rowKey="order_id"
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 5 }}
          bordered
          onRow={(record) => ({
            onClick: () => {
              router.push(`/warehouse/production/${record.order_id}`);
            },
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
