"use client";

import React, { useState } from "react";
import {
  Badge,
  Calendar,
  Card,
  Tag,
  Typography,
  Modal,
  Descriptions,
  Progress,
  Empty,
  Button,
  theme
} from "antd";
import type { BadgeProps, CalendarProps } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { productionsApi } from "@/apiRequests/productions";
import {
  HistoryOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CloseOutlined
} from "@ant-design/icons";
import "dayjs/locale/vi";

dayjs.locale("vi");

const { Title, Text } = Typography;

interface ProductionOrder {
  order_id: number;
  code: string;
  quantity: number;
  delivery_date: string;
  production_status: "Scheduled" | "InProcessing" | "Completed" | string;
  product_name: string;
  current_stage?: string;
  stages: string[];
  progress_percent: number;
}

export default function ProductionSchedulePage() {
  const { token } = theme.useToken();
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ================== DATA FETCHING ================== */
  const { data: scheduledOrders = [], isLoading } = useQuery({
    queryKey: ["scheduledOrders"],
    queryFn: async () => {
      const res = await productionsApi.getAllProduction();
      return res.data as ProductionOrder[];
    },
  });

  /* ================== HELPERS ================== */
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "Scheduled":
        return { color: "blue", status: "processing" as BadgeProps["status"], label: "Đã lên lịch" };
      case "InProcessing":
        return { color: "orange", status: "warning" as BadgeProps["status"], label: "Đang sản xuất" };
      case "Finished" :
        return { color: "green", status: "success" as BadgeProps["status"], label: "Hoàn thành" };
        case "Delivery" :
          return { color: "green", status: "success" as BadgeProps["status"], label: "Đã giao hàng" };
      default:
        return { color: "default", status: "default" as BadgeProps["status"], label: status };
    }
  };

  const getListData = (value: Dayjs) => {
    const dateString = value.format("YYYY-MM-DD");
    return scheduledOrders.filter(order =>
      dayjs(order.delivery_date).format("YYYY-MM-DD") === dateString
    );
  };

  /* ================== CALENDAR RENDERING ================== */
  const dateCellRender = (value: Dayjs) => {
    const listData = getListData(value);
    return (
      <ul className="m-0 p-0 list-none">
        {listData.map((item) => {
          const config = getStatusConfig(item.production_status);
          return (
            <li
              key={item.order_id}
              className="mb-1 last:mb-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedOrder(item);
                setIsModalOpen(true);
              }}
            >
              <div className={`px-1.5 py-0.5 rounded text-[10px] truncate cursor-pointer transition-colors duration-200 bg-${config.color}-50 hover:bg-${config.color}-100 border border-${config.color}-200`}>
                <Badge status={config.status} text={item.code} className="mr-1" />
                <span className="text-gray-600 italic"> - {item.product_name || "Sản phẩm"}</span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const cellRender: CalendarProps<Dayjs>["cellRender"] = (current, info) => {
    if (info.type === "date") return dateCellRender(current);
    return info.originNode;
  };

  /* ================== UI ================== */
  return (
    <div className=" bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center ">
        <div>
          <Title level={2} > Lịch sản xuất</Title>
        </div>
        <div className="flex gap-4">
          <Tag color="blue" icon={<ClockCircleOutlined />}>Đã lên lịch</Tag>
          <Tag color="orange" icon={<HistoryOutlined />}>Đang sản xuất</Tag>
          <Tag color="green" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>
        </div>
      </div>

      <Card className="shadow-md rounded-xl border-none overflow-hidden">
        <Calendar
          cellRender={cellRender}
          className="p-4"
        // loading={isLoading}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Text strong className="text-lg">Chi tiết đơn sản xuất: {selectedOrder?.code}</Text>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
            Đóng
          </Button>
        ]}
        width={600}
        closeIcon={<CloseOutlined />}
      >
        {selectedOrder ? (
          <div className="py-4">
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Sản phẩm">
                <Text strong>{selectedOrder.product_name || "Sản phẩm tùy chỉnh"}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng">
                <Text strong className="text-blue-600">{selectedOrder.quantity.toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày giao hàng">
                <Text strong>{dayjs(selectedOrder.delivery_date).format("DD/MM/YYYY")}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={getStatusConfig(selectedOrder.production_status).color}>
                  {getStatusConfig(selectedOrder.production_status).label}
                </Tag>
              </Descriptions.Item>
              {selectedOrder.current_stage && (
                <Descriptions.Item label="Công đoạn hiện tại">
                  <Tag color="processing">{selectedOrder.current_stage}</Tag>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div className="mt-6">
              <Text strong className="block mb-2">Tiến độ sản xuất</Text>
              <Progress
                percent={Math.round(selectedOrder.progress_percent)}
                status={selectedOrder.progress_percent >= 100 ? "success" : "active"}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>

            <div className="mt-6">
              <Text strong className="block mb-2">Các công đoạn</Text>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.stages.map((stage, idx) => (
                  <Tag key={idx} className="px-3 py-1">{stage}</Tag>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Empty description="Không có dữ liệu" />
        )}
      </Modal>

      <style jsx global>{`
        .ant-picker-calendar-date-content {
          height: 100px !important;
          overflow-y: auto;
        }
        .ant-picker-calendar-full .ant-picker-panel {
          border-radius: 12px;
        }
        .ant-picker-cell-selected .ant-picker-calendar-date {
            background: #f0f7ff !important;
            border-top-color: #1890ff !important;
        }
      `}</style>
    </div>
  );
}
