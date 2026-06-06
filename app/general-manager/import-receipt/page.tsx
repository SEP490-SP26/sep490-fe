"use client";

import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";
import envConfig from "@/lib/config";
import { CheckCircleOutlined, ReloadOutlined, SearchOutlined, UploadOutlined, DownloadOutlined } from "@ant-design/icons";
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
  Tag,
  Upload
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
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);

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
      
      let path = null;
      if (typeof data === "string") path = data;
      else if (data?.files?.[0]?.file_url) path = data.files[0].file_url;
      else if (data?.files?.[0]?.import_recieve_path) path = data.files[0].import_recieve_path;
      else if (data?.file_url) path = data.file_url;
      else if (data?.data?.import_recieve_path) path = data.data.import_recieve_path;
      else if (data?.import_recieve_path) path = data.import_recieve_path;
      else if (data?.data?.url) path = data.data.url;
      else if (data?.url) path = data.url;
      else if (typeof data?.data === "string") path = data.data;
      else if (data?.data?.path) path = data.data.path;
      else if (data?.path) path = data.path;

      if (path) {
        if (!path.startsWith("http")) {
          path = path.startsWith("/") ? `${envConfig.NEXT_API_ENDPOINT}${path}` : `${envConfig.NEXT_API_ENDPOINT}/${path}`;
        }
        setPdfUrl(path);
      } else {
        console.warn("Could not find path in response:", data);
      }
      
      setCurrentOrderId(orderId);
      setIsModalVisible(true);

      setCreatedOrderIds((prev) => [...prev, orderId]);
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Có lỗi xảy ra khi tạo phiếu nhập kho.");
    }
  });

  const uploadImportMutation = useMutation({
    mutationFn: async ({ orderId, file }: { orderId: number, file: File }) => {
      return await productionsApi.uploadImportReceiveFile(orderId, file);
    },
    onSuccess: () => {
      message.success("Lưu phiếu nhập kho thành công!");
      setIsModalVisible(false);
      setPdfUrl(null);
      setCurrentOrderId(null);
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu nhập kho.");
    }
  });

  const handleSaveReceipt = async () => {
    if (!pdfUrl || currentOrderId === null) return;
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const file = new File([blob], `phieu-nhap-kho-${currentOrderId}.pdf`, { type: "application/pdf" });
      uploadImportMutation.mutate({ orderId: currentOrderId, file });
    } catch (error) {
      console.error("Error fetching PDF:", error);
      message.error("Không thể tải file PDF để lưu.");
    }
  };

  const handleDownloadFile = async () => {
    if (!pdfUrl) return;
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phieu-nhap-kho-${currentOrderId || "download"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      message.error("Có lỗi xảy ra khi tải file.");
    }
  };

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
      width: 190,
      align: "center",
      render: (_, record) => {
        const orderId = record.order_id || (record as any)._id;
        const isCreated = createdOrderIds.includes(orderId);
        
        return record.status === "Importing" && record.import_recieve_path === null ? (
          // <Popconfirm
          //   title="Tạo phiếu nhập kho"
          //   description="Bạn có chắc chắn muốn tạo phiếu nhập kho cho sản phẩm này không?"
          //   onConfirm={() => generateImportMutation.mutate(orderId)}
          //   okText="Tạo phiếu"
          //   cancelText="Hủy"
          //   okButtonProps={{ loading: generateImportMutation.isPending }}
          // >
            <button
              type="button"
              // disabled={generateImportMutation.isPending && generateImportMutation.variables === orderId}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-900 text-white rounded-lg hover:bg-amber-800 shadow-sm transition-colors text-sm font-medium disabled:opacity-50"
              onClick={() => generateImportMutation.mutate(orderId)}
            >
              {(generateImportMutation.isPending && generateImportMutation.variables === orderId) ? <Spin size="small" /> : <CheckCircleOutlined />}
              Tạo phiếu nhập kho
            </button>
          // </Popconfirm>
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
          setCurrentOrderId(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setIsModalVisible(false);
              setPdfUrl(null);
              setCurrentOrderId(null);
            }}
          >
            Đóng
          </Button>,
          pdfUrl ? (
            <Button
              key="download"
              icon={<DownloadOutlined />}
              onClick={handleDownloadFile}
            >
              Tải file
            </Button>
          ) : null,
          <Button
            key="save"
            type="primary"
            loading={uploadImportMutation.isPending}
            onClick={handleSaveReceipt}
            className="bg-amber-900 hover:bg-amber-800"
          >
            Lưu phiếu gốc
          </Button>,
        ]}
        width={800}
        centered
        destroyOnClose
      >
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <span className="text-sm text-gray-700">
            <strong>Lưu ý:</strong> Nếu không chỉnh sửa gì, hãy nhấn <strong>"Lưu phiếu gốc"</strong>.
            Nếu bạn đã chỉnh sửa phiếu, vui lòng tải lên tệp mới.
          </span>
          <Upload
            beforeUpload={(file) => {
              if (currentOrderId) {
                uploadImportMutation.mutate({ orderId: currentOrderId, file });
              }
              return false;
            }}
            showUploadList={false}
            accept=".pdf"
          >
            <Button icon={<UploadOutlined />} loading={uploadImportMutation.isPending}>
              Tải lên phiếu sửa
            </Button>
          </Upload>
        </div>
        {pdfUrl ? (
          <div className="mt-4 rounded-lg overflow-hidden border border-gray-200">
            <iframe
              src={pdfUrl.endsWith('.pdf') ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(pdfUrl)}` : pdfUrl}
              className="w-full h-[60vh] border-0"
              title="Phiếu Nhập Kho"
            />
          </div>
        ) : (
          <div className="flex justify-center items-center h-[60vh]">
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
