"use client";

import React, { useMemo, useState } from "react";
import { Card, Table, Tag, DatePicker, Input, Space } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";

/* =======================
   Types
======================= */

type ProductionStatus = "Finish" | "InProgress" | "Schedule";

interface ProductionOrder {
  order_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  progress_percent: number;
  current_stage: string;
  status: ProductionStatus;
}

interface ProductionResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: ProductionOrder[];
}

/* =======================
   Fake data (UI demo)
======================= */

const response: ProductionResponse = {
  page: 1,
  pageSize: 10,
  hasNext: false,
  data: [
    {
      order_id: 41,
      code: "ORD-00041",
      customer_name: "TRAN VAN MINH",
      product_name: "Catalogue sản phẩm",
      quantity: 500,
      delivery_date: "2026-01-15T08:30:00.000Z",
      progress_percent: 100,
      current_stage: "Hoàn thành",
      status: "Finish",
    },
    {
      order_id: 42,
      code: "ORD-00042",
      customer_name: "LE HOANG NAM",
      product_name: "Hộp giấy cao cấp",
      quantity: 1200,
      delivery_date: "2026-01-18T14:00:00.000Z",
      progress_percent: 100,
      current_stage: "Hoàn thành",
      status: "Finish",
    },
    {
      order_id: 43,
      code: "ORD-00043",
      customer_name: "VO PHUC TIEN",
      product_name: "Thiệp cưới",
      quantity: 1000,
      delivery_date: "2026-01-25T10:00:00.000Z",
      progress_percent: 40,
      current_stage: "Ralo",
      status: "InProgress",
    },
  ],
};

/* =======================
   Status config
======================= */

const statusConfig: Record<
  ProductionStatus,
  { label: string; color: string }
> = {
  Finish: { label: "Hoàn thành", color: "green" },
  InProgress: { label: "Đang sản xuất", color: "blue" },
  Schedule: { label: "Đã lên lịch", color: "orange" },
};

/* =======================
   Component
======================= */

const FinishProduction: React.FC = () => {
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [deliveryRange, setDeliveryRange] =
    useState<[Dayjs | null, Dayjs | null] | null>(null);

  /* =======================
     Filter only FINISH
  ======================= */

  const filteredData = useMemo(() => {
    return response.data
      .filter((o) => o.status === "Finish")
      .filter((o) =>
        customerKeyword
          ? o.customer_name
              .toLowerCase()
              .includes(customerKeyword.toLowerCase())
          : true
      )
      .filter((o) => {
        if (!deliveryRange || !deliveryRange[0] || !deliveryRange[1]) return true;
        const d = dayjs(o.delivery_date);
        return (
          d.isAfter(deliveryRange[0], "day") &&
          d.isBefore(deliveryRange[1], "day")
        );
      });
  }, [customerKeyword, deliveryRange]);

  /* =======================
     Columns
  ======================= */

  const columns: ColumnsType<ProductionOrder> = [
    {
      title: "Mã đơn",
      dataIndex: "code",
      width: 120,
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
      title: "Ngày giao",
      dataIndex: "delivery_date",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
    },
    {
      title: "Tiến độ",
      dataIndex: "progress_percent",
      render: (v: number) => <Tag color="green">{v}%</Tag>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      render: (status: ProductionStatus) => (
        <Tag color={statusConfig[status].color}>
          {statusConfig[status].label}
        </Tag>
      ),
    },
  ];

  return (
    <Card title="Đơn sản xuất hoàn thành">
      {/* Filters */}
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Tìm theo khách hàng"
          allowClear
          style={{ width: 220 }}
          onChange={(e) => setCustomerKeyword(e.target.value)}
        />

        <DatePicker.RangePicker
          format="DD/MM/YYYY"
          onChange={(v) => setDeliveryRange(v)}
        />
      </Space>

      {/* Table */}
      <Table
        rowKey="order_id"
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 5 }}
      />
    </Card>
  );
};

export default FinishProduction;