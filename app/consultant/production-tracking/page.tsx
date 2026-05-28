"use client";

import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";
import LoadingOverlay from "@/components/common/LoadingOverlay";
import { useQuery } from "@tanstack/react-query";
import { Card, Empty, Input, Progress, Table, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";

const { Title } = Typography;

/* =======================
   ProductionProgress Component
======================= */
function ProductionProgress({ orderId }: { orderId: number }) {
  const { data: detailRes } = useQuery({
    queryKey: ["production-detail", orderId?.toString()],
    queryFn: () => productionsApi.getProdyctionByOrderId(orderId?.toString()),
    staleTime: 30_000,
    enabled: !!orderId,
  });

  const detail = (detailRes as any)?.data || detailRes;

  if (!detail?.stages || detail.stages.length === 0) {
    return <span className="text-xs text-gray-400">Đang tải...</span>;
  }

  const sortedStages = [...detail.stages]
    .filter((s: any) => s.status !== "GroupedWaiting" && s.status !== null && s.status !== undefined)
    .sort((a: any, b: any) => a.seq_num - b.seq_num);

  const totalStages = sortedStages.length;
  const finishedCount = sortedStages.filter((s: any) => s.status === "Finished").length;
  const progressPercent = totalStages > 0 ? Math.round((finishedCount / totalStages) * 100) : 0;

  return (
    <div className="w-full min-w-[120px]">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{finishedCount}/{totalStages} công đoạn</span>
        <span className="font-medium text-gray-700">{progressPercent}%</span>
      </div>
      <Progress percent={progressPercent} size="small" showInfo={false} status={progressPercent === 100 ? "success" : "active"} />
    </div>
  );
}

export default function ProductionTrackingPage() {
  const [searchText, setSearchText] = useState("");

  const { data: orderRes, isPending } = useQuery({
    queryKey: ["consultant-orders"],
    queryFn: () => orderApi.getList(1, 1000),
    staleTime: 60_000,
  });

  const orders = useMemo(() => {
    let list = (orderRes as any)?.data || [];
    if (!Array.isArray(list)) return [];

    list = list.filter((o: any) =>
      o.status === "InProcessing" || o.status === "Scheduled" || o.status === "Finished" || o.status === "Delivery"
    );

    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      list = list.filter((o: any) =>
        o.code?.toLowerCase().includes(lowerSearch) ||
        o.customer_name?.toLowerCase().includes(lowerSearch) ||
        o.product_name?.toLowerCase().includes(lowerSearch)
      );
    }

    list.sort((a: any, b: any) => {
      if (a.status === "InProcessing" && b.status !== "InProcessing") return -1;
      if (a.status !== "InProcessing" && b.status === "InProcessing") return 1;
      return new Date(b.created_at || Date.now()).getTime() - new Date(a.created_at || Date.now()).getTime();
    });

    return list;
  }, [orderRes, searchText]);

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (code: string) => <span className="font-semibold text-blue-600">{code || '-'}</span>,
    },
    {
      title: "Khách Hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (name: string) => <span className="font-medium text-gray-900">{name || 'Khách lẻ'}</span>,
    },
    {
      title: "Sản Phẩm",
      dataIndex: "product_name",
      key: "product_name",
    },
    {
      title: "Số Lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      width: 100,
      render: (val: number) => <b className="text-gray-700">{val?.toLocaleString() || 0}</b>,
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => {
        let color = "default";
        let text = status;
        if (status === "InProcessing") { color = "processing"; text = "Đang sản xuất"; }
        else if (status === "Scheduled") { color = "warning"; text = "Đã lên lịch"; }
        else if (status === "Finished") { color = "success"; text = "Hoàn thành"; }
        else if (status === "Delivery") { color = "green"; text = "Đã giao"; }
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "Tiến Độ Sản Xuất",
      key: "progress",
      width: 200,
      render: (_: any, record: any) => {
        // use production_ids[0] or production_id
        const prodId = record.production_ids?.[0] || record.production_id;
        const orderId = record.order_id || record.id;
        if (!prodId) return <span className="text-gray-400 italic">Chưa có Lệnh SX</span>;
        return <ProductionProgress orderId={orderId} />;
      },
    },
    {
      title: "Dự Kiến Xong / Hẹn Giao",
      key: "end_date",
      width: 150,
      render: (_: any, record: any) => {
        const endDate = record.productions?.[0]?.end_date;
        const deliveryDate = record.delivery_date;

        if (endDate) return <span className="text-green-600 font-medium">SX: {dayjs(endDate).format("DD/MM/YYYY")}</span>;
        if (deliveryDate) return <span className="text-gray-500">Hẹn: {dayjs(deliveryDate).format("DD/MM/YYYY")}</span>;
        return <span className="text-gray-400">-</span>;
      },
    },
    // {
    //   key: "action",
    //   align: "center" as const,
    //   width: 100,
    //   render: (_: any, record: any) => {
    //     const id = record.order_id || record._id;
    //     return (
    //       <Link href={`/consultant/request-detail/${id}`}>
    //         <Button size="small" icon={<EyeOutlined />}>Chi Tiết</Button>
    //       </Link>
    //     )
    //   },
    // },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <Title level={2} style={{ margin: 0 }}>Tiến độ sản xuất đơn hàng</Title>
      </div>

      <Card bordered={false} className="mb-6 shadow-sm">
        <Input.Search
          placeholder="Tìm kiếm theo mã đơn, khách hàng, sản phẩm..."
          allowClear
          onSearch={(val) => setSearchText(val)}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ maxWidth: 500 }}
        />
      </Card>

      <Card bordered={false} className="shadow-sm">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey={(record) => record.order_id || record.code || Math.random().toString()}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn hàng nào đang sản xuất" /> }}
        />
      </Card>

      <LoadingOverlay isLoading={isPending} />
    </div>
  );
}
