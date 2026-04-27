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

type ProductionStatus = "Finished" | "InProcessing" | "Scheduled" | "Importing";

interface StageStatus {
  end_time: string | null;
}

interface ProductionOrder {
  order_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  current_stage: string | null;
  production_status: ProductionStatus;
  stage_statuses?: StageStatus[];
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
  Finished: { label: "Hoàn thành", color: "green" },
  InProcessing: { label: "Đang sản xuất", color: "blue" },
  Scheduled: { label: "Đã lên lịch", color: "orange" },
  Importing: { label: "Hoàn thành", color: "green" },
};

/* =======================
   Helper
======================= */

const getCompletionDate = (o: ProductionOrder): Dayjs => {
  if (o.stage_statuses && o.stage_statuses.length > 0) {
    let latestTime: Dayjs | null = null;
    for (const s of o.stage_statuses) {
      if (s.end_time) {
        const dt = dayjs(s.end_time);
        if (!latestTime || dt.isAfter(latestTime)) {
          latestTime = dt;
        }
      }
    }
    if (latestTime) return latestTime;
  }
  return dayjs(o.delivery_date);
};

/* =======================
   Component
======================= */

const FinishProduction: React.FC = () => {
  const router = useRouter();

  const [data, setData] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [deliveryRange, setDeliveryRange] =
    useState<[Dayjs | null, Dayjs | null] | null>(null);

  /* =======================
     Fetch API
  ======================= */

  useEffect(() => {
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

    fetchProductions();
  }, []);

  /* =======================
     Filter FINISHED only
  ======================= */

  const filteredData = useMemo(() => {
    return data
      .filter((o) => o.production_status === "Finished" || o.production_status === "Importing")
      .filter((o) => {
        if (!searchKeyword) return true;
        const kw = searchKeyword.toLowerCase();
        const matchCustomer = o.customer_name?.toLowerCase().includes(kw);
        const matchCode = o.code?.toLowerCase().includes(kw);
        const matchProduct = o.product_name?.toLowerCase().includes(kw);
        return matchCustomer || matchCode || matchProduct;
      })
      .filter((o) => {
        if (!deliveryRange?.[0] || !deliveryRange?.[1]) return true;
        const d = getCompletionDate(o);
        return (
          d.isSameOrAfter(deliveryRange[0], "day") &&
          d.isSameOrBefore(deliveryRange[1], "day")
        );
      });
  }, [data, searchKeyword, deliveryRange]);

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
      key: "completion_date",
      render: (_, record: ProductionOrder) => getCompletionDate(record).format("DD/MM/YYYY"),
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
      <Title level={4} style={{ marginBottom: 20 }}>
        📦 Đơn sản xuất hoàn thành
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
          placeholder="🔍 Tìm mã đơn, khách hàng, sản phẩm..."
          allowClear
          style={{ width: 300 }}
          onChange={(e) => setSearchKeyword(e.target.value)}
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
          pagination={{ pageSize: 5 }}
          bordered
          onRow={(record) => ({
            onClick: () => {
              router.push(`/productions-manager/production/${record.order_id}`);
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
