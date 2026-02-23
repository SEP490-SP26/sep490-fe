"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import DesignFileDisplay from "@/app/consultant/components/DesignFileDisplay";
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowsAltOutlined,
  BlockOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  CloudUploadOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DeploymentUnitOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  FormatPainterOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  ShoppingOutlined,
  SyncOutlined,
  UserOutlined
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Image as AntImage,
  Breadcrumb,
  Button,
  Card,
  Collapse,
  Empty,
  message,
  Skeleton,
  Steps,
  Tag,
  Typography,
  Upload
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

// Interface dựa trên response từ GET /api/Requests/{id}
interface OrderDetail {
  order_request_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string;
  product_name: string;
  quantity: number;
  description: string;
  design_file_path: string;
  order_request_date?: string; // Optional as it might not be in RequestDetailResponse
  detail_address: string;
  process_status?: string;

  // New fields
  product_type?: string;
  paper_code?: string;
  paper_name?: string;
  coating_type?: string;
  wave_type?: string;
  number_of_plates?: number;
  product_length_mm?: number;
  product_width_mm?: number;
  product_height_mm?: number;
  production_processes?: string;
  is_send_design?: boolean;
  payments?: any[]; // Using any[] or OrderPayment[] if imported
  final_total_cost?: number;
  deposit_amount?: number;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [requestDetail, setRequestDetail] = useState<OrderDetail | null>(null);
  const [designFiles, setDesignFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const { Panel } = Collapse;

  // Fetch order detail từ API
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!requestId) return;

      setLoading(true);
      try {
        const response = await requestOrderApi.getDetail(requestId);
        const orderData = response?.data || response;

        if (orderData) {
          setRequestDetail({
            order_request_id: orderData.order_request_id,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email,
            delivery_date: orderData.delivery_date,
            product_name: orderData.product_name,
            quantity: orderData.quantity,
            description: orderData.description || "",
            design_file_path: orderData.design_file_path || "",
            // order_request_date might be missing in API response types but present in data, handle gracefully
            order_request_date: (orderData as any).order_request_date || new Date().toISOString(),
            detail_address: orderData.detail_address || "",
            process_status: orderData.process_status,

            // New fields mapping
            product_type: orderData.product_type,
            paper_code: orderData.paper_code,
            paper_name: orderData.paper_name,
            coating_type: orderData.coating_type,
            wave_type: orderData.wave_type,
            number_of_plates: orderData.number_of_plates,
            product_length_mm: orderData.product_length_mm,
            product_width_mm: orderData.product_width_mm,
            product_height_mm: orderData.product_height_mm,
            production_processes: orderData.production_processes,
            is_send_design: orderData.is_send_design,
            payments: orderData.payments || [],
            final_total_cost: orderData.final_total_cost,
            deposit_amount: orderData.deposit_amount,
          });
        }
      } catch (error) {
        console.error("Error fetching order detail:", error);
        message.error("Không thể tải thông tin đơn hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [requestId]);

  // Handle design file upload - Sử dụng API update-design-file
  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);

    try {
      // Gọi API upload design file cho order request
      const response = await uploadApi.updateDesignFile(
        parseInt(requestId),
        file as File
      );

      if (response?.url) {
        const newFile: UploadFile = {
          uid: Date.now().toString(),
          name: (file as File).name,
          status: "done",
          url: response.url,
        };
        setDesignFiles((prev) => [...prev, newFile]);

        // Cập nhật design_file_path trong orderDetail
        setRequestDetail((prev) =>
          prev ? { ...prev, design_file_path: response.url } : prev
        );

        message.success("Tải file thiết kế thành công!");
        onSuccess?.(response);
      }
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Tải file thiết kế thất bại!");
      onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (file: UploadFile) => {
    setDesignFiles((prev) => prev.filter((f) => f.uid !== file.uid));
  };

  const getCoatingType = (coatingType: string) => {
    switch (coatingType) {
      case "KEO_NUOC":
        return "Keo Nước";
      case "KEO_DAI":
        return "Keo Dài";
      case "KEO_DAU":
        return "Keo Dầu";
      default:
        return "Không xác định";
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100",
      PROCESSING: "bg-blue-50 text-blue-700 border-blue-200 ring-blue-100",
      CONFIRMED: "bg-cyan-50 text-cyan-700 border-cyan-200 ring-cyan-100",
      COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100",
      CANCELLED: "bg-red-50 text-red-700 border-red-200 ring-red-100",
    };
    const icons: { [key: string]: any } = {
      PENDING: <ClockCircleFilled />,
      PROCESSING: <SyncOutlined spin />,
      CONFIRMED: <CheckCircleFilled />,
      COMPLETED: <CheckCircleFilled />,
      CANCELLED: <CloseCircleFilled />,
    };

    const style = styles[status] || "bg-slate-50 text-slate-700 border-slate-200 ring-slate-100";
    const icon = icons[status] || <InfoCircleOutlined />;

    // Status text mapping needs to be handled cautiously if the status is not standard
    const textMap: Record<string, string> = {
      PENDING: "Chờ xử lý",
      PROCESSING: "Đang xử lý",
      CONFIRMED: "Đã xác nhận",
      COMPLETED: "Hoàn thành",
      CANCELLED: "Đã hủy"
    };

    return (
      <div className={`px-4 py-2 rounded-full border ring-2 flex items-center gap-2 text-sm font-semibold shadow-sm transition-all duration-300 hover:scale-105 ${style}`}>
        {icon}
        <span>{textMap[status] || status}</span>
      </div>
    );
  };

  const getStepInfo = () => {
    const status = requestDetail?.process_status?.toUpperCase();
    const steps = [
      { title: "Chờ xử lý" },
      { title: "Đang xử lý" },
      { title: "Chờ thanh toán" },
      { title: "Đã xác nhận" },
    ];

    let current = 0;
    let stepStatus: "wait" | "process" | "finish" | "error" = "process";

    if (status) {
      if (["PENDING"].includes(status)) {
        current = 0;
      } else if (["PROCESSING", "VERIFIED"].includes(status)) {
        current = 1;
      } else if (["DECLINED"].includes(status)) {
        current = 1;
        stepStatus = "error";
      } else if (["WAITING", "WAITING_CONFIRM"].includes(status)) {
        current = 2;
      } else if (["ACCEPTED", "COMPLETED", "PAID"].includes(status)) {
        current = 3;
        stepStatus = "finish";
      } else if (["CANCEL", "CANCELLED", "REJECTED"].includes(status)) {
        current = 0;
        stepStatus = "error";
      }
    }

    return { current, status: stepStatus, items: steps };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-6xl mx-auto">
          <Skeleton.Button active size="large" className="mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <Card className="shadow-sm rounded-2xl"><Skeleton active paragraph={{ rows: 8 }} /></Card>
            </div>
            <div className="lg:col-span-4">
              <Card className="shadow-sm rounded-2xl"><Skeleton.Image active className="w-full h-48" /></Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!requestDetail) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="shadow-lg rounded-2xl max-w-md w-full text-center py-12">
          <Empty description={<span className="text-slate-500 font-medium">Không tìm thấy yêu cầu</span>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button type="primary" size="large" onClick={() => router.back()} className="mt-8 bg-cyan-600 hover:bg-cyan-500">
            Quay lại danh sách
          </Button>
        </Card>
      </div>
    );
  }

  const showPaymentInfo = ["WAITING", "WAITING_CONFIRM", "ACCEPTED", "COMPLETED", "PAID"].includes(requestDetail.process_status?.toUpperCase() || "");

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative animate-fade-in-up">
        {/* Navigation & Header */}
        <div className="mb-4">
          {/* <Breadcrumb
            items={[
              { href: '/', title: <HomeOutlined /> },
              { title: 'Chi tiết đơn hàng' },
            ]}
            className="mb-4 text-slate-500"
          /> */}

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 ">
                <Title level={2} className="!mb-0 !text-slate-800 tracking-tight">
                  Yêu cầu #{requestDetail.order_request_id}
                </Title>
              </div>
              {/* <div className="flex items-center gap-4 text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarOutlined /> {dayjs(requestDetail.order_request_date).format("DD/MM/YYYY HH:mm")}</span>
              </div> */}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <Card className="rounded-2xl shadow-sm border-slate-100" bordered={false}>
            <Steps
              current={getStepInfo().current}
              status={getStepInfo().status}
              items={getStepInfo().items}
              responsive
              className="px-4 py-2"
            />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Customer Info */}
            <Card
              title={<span className="text-base font-semibold">Thông tin khách hàng</span>}
              className="rounded-2xl shadow-sm border-gray-100"
              bordered={false}
              extra={<UserOutlined className="text-gray-400" />}
            >
              <div className="space-y-2">
                <div>
                  {/* <Text type="secondary" className="text-xs uppercase font-bold">Liên hệ</Text> */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2  border-b border-gray-200 pb-2">
                    <div className="font-medium text-slate-800">Khách hàng: {requestDetail.customer_name}</div>
                    <div className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 transition-colors">
                      Sđt: {requestDetail.customer_phone}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 transition-colors">
                      Email: {requestDetail.customer_email}
                    </div>
                  </div>
                </div>
                <div>
                  {/* <Text type="secondary" className="text-xs uppercase font-bold">Địa chỉ giao hàng</Text> */}
                  <div className="flex items-start gap-2 mt-1 text-slate-700">
                    <EnvironmentOutlined className="mt-1 text-slate-400" />
                    <span>{requestDetail.detail_address}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* GỘP Product Details Card và Technical Specifications Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 mt-4">
              <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-2">
                <h3 className="text-base font-semibold text-slate-800 m-0">Chi tiết sản phẩm & Thông số kỹ thuật</h3>
              </div>

              <div className="space-y-4">
                {/* Thông tin cơ bản sản phẩm - TIÊU ĐỀ VÀ THÔNG TIN CÙNG DÒNG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"> */}
                  {/* <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <ShoppingOutlined className="text-indigo-500 text-lg" />
                    </div> */}
                  <div>
                    {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Sản phẩm</Text> */}
                    <div className="text-lg font-bold text-slate-800">Sản Phẩm: {requestDetail.product_name}</div>
                  </div>
                  {/* </div> */}

                  {/* <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"> */}
                  {/* <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <TagOutlined className="text-green-500 text-lg" />
                    </div> */}
                  <div>
                    {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Số lượng</Text> */}
                    <div className="text-lg font-bold text-slate-800">Số lượng: {requestDetail.quantity.toLocaleString("vi-VN")} chiếc</div>
                  </div>
                  {/* </div> */}

                  {/* <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    {/* <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <CalendarOutlined className="text-cyan-500 text-lg" />
                    </div> */}
                  <div>
                    {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Giao hàng</Text> */}
                    <div className="text-lg font-bold text-slate-800">Giao hàng: {dayjs(requestDetail.delivery_date).format("DD/MM/YYYY")}</div>
                  </div>
                  {/* </div> */}
                </div>

                {/* Mô tả yêu cầu */}
                <div>
                  {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Mô tả yêu cầu</Text> */}
                  <div className="mt-1 p-4 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed min-h-[100px]">
                    {requestDetail.description || <span className="text-slate-400 italic">MÔ tả yêu cầu: Không có mô tả chi tiết</span>}
                  </div>
                </div>
                {/* Thông số kỹ thuật - collapse*/}
                <div className="bg-white rounded-lg border border-slate-100 ">
                  <Collapse
                    ghost
                    expandIconPosition="end"
                    size="small"
                  >
                    <Panel
                      header={<Text className="text-slate-700 font-bold">Thông số kỹ thuật</Text>}
                      key="1"
                    >
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <Text className="text-slate-500 text-sm font-medium">Kích thước (mm):</Text>
                          </div>
                          <Text className="text-slate-800 font-bold text-base">
                            {requestDetail.product_length_mm} x {requestDetail.product_width_mm} x {requestDetail.product_height_mm}
                          </Text>
                        </div>



                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <Text className="text-slate-500 text-sm font-medium">Loại giấy:</Text>
                            <Text className="text-slate-800 font-bold text-base">{requestDetail.paper_name}</Text>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <Text className="text-slate-500 text-sm font-medium">Kiểu sóng:</Text>
                            <Text className="text-slate-800 font-bold text-sm">{requestDetail.wave_type}</Text>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <Text className="text-slate-500 text-sm font-medium">Loại phủ:</Text>
                            <Text className="text-slate-800 font-bold text-sm">{requestDetail.coating_type}</Text>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <Text className="text-slate-500 text-sm font-medium">Số bản kẽm:</Text>
                            <Text className="text-slate-800 font-bold text-sm">{requestDetail.number_of_plates}</Text>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  </Collapse>
                </div>
              </div>
            </div>

            {/* Cost Information */}
            {showPaymentInfo && (requestDetail.final_total_cost !== undefined || requestDetail.deposit_amount !== undefined) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <CreditCardOutlined className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 m-0">Chi phí & Thanh toán</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {requestDetail.final_total_cost !== undefined && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-slate-500 text-sm font-medium mb-1">Tổng chi phí dự kiến</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(requestDetail.final_total_cost)}
                      </div>
                    </div>
                  )}

                  {requestDetail.deposit_amount !== undefined && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-slate-500 text-sm font-medium mb-1">Số tiền đặt cọc</div>
                      <div className="text-2xl font-bold text-amber-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(requestDetail.deposit_amount)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Information Card (if exists) */}
            {showPaymentInfo && requestDetail.payments && requestDetail.payments.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CreditCardOutlined className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 m-0">Lịch sử thanh toán</h3>
                </div>

                <div className="space-y-4">
                  {requestDetail.payments.map((payment, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <div className="font-bold text-slate-700 text-lg">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(payment.amount)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {dayjs(payment.created_at).format('DD/MM/YYYY HH:mm')} - {payment.payment_method}
                        </div>
                      </div>
                      <Tag color={payment.status === 'PAID' || payment.status === 'COMPLETED' ? 'success' : 'warning'} className="mt-2 sm:mt-0 font-semibold px-3 py-1">
                        {payment.status}
                      </Tag>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Design Files */}
          <div className="lg:col-span-4 space-y-8">
            <DesignFileDisplay designFilePath={requestDetail.design_file_path} requestId={requestDetail.order_request_id} />

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <CloudUploadOutlined className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 m-0">Tải lên file thiết kế</h3>
              </div>

              {/* New Uploads List */}
              {designFiles.length > 0 && (
                <div className="mb-6">
                  <Text className="text-slate-800 font-semibold mb-3 block">File mới tải lên ({designFiles.length})</Text>
                  <div className="space-y-3">
                    {designFiles.map((file) => (
                      <div key={file.uid} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                        <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex-shrink-0">
                          <AntImage src={file.url} className="w-full h-full object-cover" preview={false} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text strong className="block text-sm truncate">{file.name}</Text>
                          <Text type="secondary" className="text-xs">Vừa tải lên</Text>
                        </div>
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFile(file)} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div className="mt-2">
                {!requestDetail.design_file_path ? (
                  <Upload
                    customRequest={handleUpload}
                    showUploadList={false}
                    accept="image/*,.pdf"
                    disabled={uploading}
                    className="block w-full"
                  >
                    <div className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                        ${uploading ? 'border-cyan-400 bg-cyan-50' : 'border-slate-300 hover:border-cyan-500 hover:bg-slate-50'}
                     `}>
                      <div className="flex flex-col items-center gap-3">
                        {uploading ? (
                          <SyncOutlined spin className="text-3xl text-cyan-500" />
                        ) : (
                          <CloudUploadOutlined className="text-4xl text-cyan-500 drop-shadow-sm" />
                        )}
                        <div className="text-slate-700 font-semibold">
                          {uploading ? "Đang tải lên..." : "Tải lên file thiết kế"}
                        </div>
                        <Text type="secondary" className="text-xs max-w-[200px] mx-auto">
                          Kéo thả hoặc nhấn để chọn file (JPG, PNG, PDF)
                        </Text>
                      </div>
                    </div>
                  </Upload>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-700 text-sm">
                    <InfoCircleOutlined className="mt-1 flex-shrink-0" />
                    <span>Đã có file thiết kế. Nếu cần thay đổi, vui lòng liên hệ quản trị viên.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Animation Styles Injection */}
        <style jsx global>{`
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translate3d(0, 20px, 0);
        }
        to {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.6s ease-out forwards;
      }
    `}</style>
      </div>
    </div>
  );
}
