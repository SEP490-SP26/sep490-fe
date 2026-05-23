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
  seq_num?: number;
  process_name?: string;
  status?: string;
  end_time: string | null;
}

interface ProductionOrder {
  prod_id: number;
  order_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  current_stage: string | null;
  production_status: ProductionStatus;
  stage_statuses?: StageStatus[];
  stages?: string[];
  actual_start_date?: string | null;
  end_date?: string | null;
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
  string,
  { label: string; color: string }
> = {
  Finished: { label: "Hoàn thành", color: "green" },
  InProcessing: { label: "Đang sản xuất", color: "blue" },
  Scheduled: { label: "Đã lên lịch", color: "orange" },
  Importing: { label: "Hoàn thành", color: "green" },
};

/* =======================
   Helper – lấy ngày kết thúc thực tế
   Ưu tiên: end_date → end_time lớn nhất trong stage_statuses → delivery_date
======================= */

const getCompletionDate = (o: ProductionOrder): Dayjs | null => {
  // Ưu tiên end_date trên record
  if (o.end_date) return dayjs(o.end_date);

  // Fallback: end_time lớn nhất trong stage_statuses
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

  return null;
};

/* =======================
   Component
======================= */

const FinishProduction: React.FC = () => {
  const router = useRouter();

  const [data, setData] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  // Lọc theo ngày hoàn thành (end_date)
  const [completionRange, setCompletionRange] =
    useState<[Dayjs | null, Dayjs | null] | null>(null);

  /* =======================
     Fetch API
  ======================= */

  useEffect(() => {
    const fetchProductions = async () => {
      try {
        setLoading(true);
        const res: ProductionResponse = await productionsApi.getAllProduction();
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
     Filter FINISHED / IMPORTING only
  ======================= */

  const filteredData = useMemo(() => {
    return data
      .filter(
        (o) =>
          o.production_status === "Finished" ||
          o.production_status === "Importing"
      )
      .filter((o) => {
        if (!searchKeyword) return true;
        const kw = searchKeyword.toLowerCase();
        return o.prod_id?.toString().toLowerCase().includes(kw);
      })
      .filter((o) => {
        if (!completionRange?.[0] || !completionRange?.[1]) return true;
        const completionDate = getCompletionDate(o);
        if (!completionDate) return false;
        return (
          completionDate.isSameOrAfter(completionRange[0], "day") &&
          completionDate.isSameOrBefore(completionRange[1], "day")
        );
      });
  }, [data, searchKeyword, completionRange]);

  /* =======================
     Columns
  ======================= */

  const columns: ColumnsType<ProductionOrder> = [
    {
      title: "Lệnh sản xuất",
      dataIndex: "prod_id",
      width: 130,
      align: "center",
      render: (v) => <strong>#{v}</strong>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      width: 100,
      align: "right",
      render: (v) => v?.toLocaleString("vi-VN"),
    },
    {
      title: "Công đoạn",
      key: "stages",
      render: (_: any, record: ProductionOrder) => {
        if (!record.stage_statuses || record.stage_statuses.length === 0) {
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {record.stages?.map((s, i) => (
                <Tag key={i}>{s}</Tag>
              ))}
            </div>
          );
        }

        const sorted = [...record.stage_statuses].sort(
          (a: any, b: any) => (a.seq_num ?? 0) - (b.seq_num ?? 0)
        );

        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sorted.map((stage: any, i: number) => {
              const isFinished = stage.status === "Finished";
              const isActive =
                stage.status === "Ready" || stage.status === "InProcessing";
              return (
                <Tag
                  key={i}
                  color={
                    isFinished ? "success" : isActive ? "processing" : "default"
                  }
                >
                  {stage.process_name}
                </Tag>
              );
            })}
          </div>
        );
      },
    },
    {
      title: "Ngày bắt đầu",
      key: "start_date",
      width: 130,
      align: "center",
      render: (_: any, record: ProductionOrder) => {
        if (!record.actual_start_date) return <span style={{ color: "#bbb" }}>—</span>;
        return dayjs(record.actual_start_date).format("DD/MM/YYYY");
      },
    },
    {
      title: "Ngày hoàn thành",
      key: "completion_date",
      width: 140,
      align: "center",
      render: (_: any, record: ProductionOrder) => {
        const d = getCompletionDate(record);
        if (!d) return <span style={{ color: "#bbb" }}>—</span>;
        return d.format("DD/MM/YYYY");
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "production_status",
      width: 130,
      align: "center",
      render: (status: string) => {
        const cfg = statusConfig[status] ?? { label: status, color: "default" };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
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
      <Title level={4} style={{ marginBottom: 20 }}>
        Lệnh sản xuất đã hoàn thành
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
          placeholder="🔍 Tìm lệnh sản xuất (ID)"
          allowClear
          style={{ width: 240 }}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />

        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          placeholder={["Hoàn thành từ ngày", "Đến ngày"]}
          onChange={(dates) =>
            setCompletionRange(dates as [Dayjs | null, Dayjs | null] | null)
          }
        />
      </Space>

      {/* Table */}
      <Spin spinning={loading}>
        <Table
          rowKey="prod_id"
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 10 }}
          bordered
          onRow={(record) => ({
            onClick: () => {
              router.push(
                `/productions-manager/production/${record.prod_id}`
              );
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