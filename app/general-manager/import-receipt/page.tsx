"use client";

import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";
import { CheckCircleOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  DatePicker,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { Suspense, useMemo, useState } from "react";

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

type ProductionStatus = "Finished" | "InProcessing" | "Scheduled";

interface ProductionOrder {
  order_id: number;
  code: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;
  current_stage: string | null;
  production_status: ProductionStatus;
  status?: string;
  import_recieve_path?: string | null;
}

interface ProductionResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: ProductionOrder[];
}

function ImportReceiptContent() {
  const queryClient = useQueryClient();
  const [customerKeyword, setCustomerKeyword] = useState("");
  const [deliveryRange, setDeliveryRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [createdOrderIds, setCreatedOrderIds] = useState<number[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ["orders", "finished-list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 1000);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    },
  });

  const generateImportMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await productionsApi.generateImportReceive({ order_id: orderId });
    },
    onSuccess: (data: any, orderId) => {
      message.success("Tạo phiếu nhập kho thành công!");
      
      const path = data?.data?.import_recieve_path || data?.import_recieve_path;
      if (path) {
        setPdfUrl(path);
        setIsModalVisible(true);
      }

      setCreatedOrderIds((prev) => [...prev, orderId]);
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Có lỗi xảy ra khi tạo phiếu nhập kho.");
    }
  });

  const filteredData = useMemo(() => {
    return (apiData || [])
      .filter((o: any) => o.status === "Importing")
      .filter((o: any) =>
        customerKeyword
          ? o.customer_name?.toLowerCase().includes(customerKeyword.toLowerCase()) ||
            o.code?.toLowerCase().includes(customerKeyword.toLowerCase())
          : true
      )
      .filter((o: any) => {
        if (!deliveryRange?.[0] || !deliveryRange?.[1]) return true;
        const d = dayjs(o.delivery_date);
        return (
          d.isSameOrAfter(deliveryRange[0], "day") &&
          d.isSameOrBefore(deliveryRange[1], "day")
        );
      });
  }, [apiData, customerKeyword, deliveryRange]);

  const columns: ColumnsType<ProductionOrder> = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Mã đơn",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (text) => <span className="font-semibold text-blue-600">{text}</span>,
    },
    { title: "Khách hàng", dataIndex: "customer_name", key: "customer_name" },
    { title: "Sản phẩm", dataIndex: "product_name", key: "product_name" },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      render: (val: number) => <span className="font-medium">{val?.toLocaleString("vi-VN")}</span>,
    },
    {
      title: "Ngày hoàn thành",
      dataIndex: "delivery_date",
      key: "delivery_date",
      render: (v: string) => (v ? dayjs(v).format("DD/MM/YYYY") : "N/A"),
    },
    {
      title: "Trạng thái",
      dataIndex: "production_status",
      key: "status",
      render: () => <Tag color="green">Hoàn thành</Tag>,
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      align: "center",
      render: (_, record) => {
        const orderId = record.order_id || (record as any)._id;
        const isCreated = createdOrderIds.includes(orderId);
        
        return record.status === "Importing" && record.import_recieve_path === null && !isCreated ? (
          <Popconfirm
            title="Tạo phiếu nhập kho"
            description="Bạn có chắc chắn muốn tạo phiếu nhập kho cho sản phẩm này không?"
            onConfirm={() => generateImportMutation.mutate(orderId)}
            okText="Tạo phiếu"
            cancelText="Hủy"
            okButtonProps={{ loading: generateImportMutation.isPending }}
          >
            <button
              type="button"
              disabled={generateImportMutation.isPending && generateImportMutation.variables === orderId}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-900 text-white rounded-lg hover:bg-amber-800 shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
            >
              {(generateImportMutation.isPending && generateImportMutation.variables === orderId) ? <Spin size="small" /> : <CheckCircleOutlined />}
              Duyệt nhập kho
            </button>
          </Popconfirm>
        ) : null;
      },
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Duyệt & Tạo phiếu nhập kho</h1>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 shadow-sm transition-colors font-medium"
        >
          <ReloadOutlined /> Làm mới
        </button>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Space wrap className="flex-1">
            <Input
              placeholder="Tìm mã đơn hoặc khách hàng..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={customerKeyword}
              onChange={(e) => setCustomerKeyword(e.target.value)}
              className="sm:w-[300px] shadow-sm"
              size="large"
              allowClear
            />
            <DatePicker.RangePicker
              format="DD/MM/YYYY"
              placeholder={["Từ ngày", "Đến ngày"]}
              onChange={(dates) => setDeliveryRange(dates as any)}
              size="large"
              className="shadow-sm"
            />
          </Space>
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 whitespace-nowrap">
            Tổng số: <span className="font-bold text-blue-700">{filteredData.length}</span> đơn hoàn thành
          </div>
        </div>

        <Table
          columns={columns as any}
          dataSource={filteredData}
          rowKey={(record: any) => record.order_id || record._id || record.code}
          loading={isLoading}
          pagination={{ pageSize: 12, showSizeChanger: true }}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
        />
      </div>

      <Modal
        title={<span className="text-lg font-semibold text-gray-800">Phiếu Nhập Kho</span>}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setPdfUrl(null);
        }}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => {
              setIsModalVisible(false);
              setPdfUrl(null);
            }}
            className="bg-amber-900 hover:bg-amber-800"
          >
            Đóng
          </Button>,
        ]}
        width={800}
        centered
        destroyOnClose
      >
        {pdfUrl ? (
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={pdfUrl}
              className="w-full h-[70vh] border-0"
              title="Phiếu Nhập Kho"
            />
          </div>
        ) : (
          <div className="flex justify-center items-center h-[70vh]">
            <Spin size="large" />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function ImportReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[80vh]">
          <Spin size="large" />
        </div>
      }
    >
      <ImportReceiptContent />
    </Suspense>
  );
}
