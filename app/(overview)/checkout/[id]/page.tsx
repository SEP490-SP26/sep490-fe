"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloudUploadOutlined,
  EnvironmentOutlined,
  FileImageOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  ShoppingOutlined,
  SyncOutlined,
  UserOutlined,
  CloseCircleFilled,
  DownloadOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  BuildOutlined,
  FormatPainterOutlined,
  BlockOutlined,
  CreditCardOutlined,
  TagOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  SettingOutlined,
  ArrowsAltOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Image as AntImage,
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  message,
  Skeleton,
  Tag,
  Typography,
  Upload,
  Breadcrumb,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { paymentApi, PaymentResponse } from "@/apiRequests/payment";
import { QRCodeCanvas } from "qrcode.react";

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
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [designFiles, setDesignFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentResponse | null>(null);

  // Fetch order detail từ API
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!requestId) return;

      setLoading(true);
      try {
        const response = await requestOrderApi.getDetail(requestId);
        const orderData = response?.data || response;

        if (orderData) {
          setOrderDetail({
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

  useEffect(() => {
    const fetchPaymentQR = async () => {
      if (!requestId) return;
      try {
        const res = await paymentApi.getPaymentQR(requestId);
        const data = (res as any).data || res;
        if (data) {
          setPaymentInfo(data);
        }
      } catch (error) {
        console.error("Error fetching payment QR:", error);
      }
    };

    fetchPaymentQR();
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
        setOrderDetail((prev) =>
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

  if (!orderDetail) {
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

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-cyan-600 to-blue-600 opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative animate-fade-in-up">
        {/* Navigation & Header */}
        <div className="mb-4">
          <Breadcrumb
            items={[
              { href: '/', title: <HomeOutlined /> },
              { title: 'Chi tiết đơn hàng' },
            ]}
            className="mb-4 text-slate-500"
          />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Title level={2} className="!mb-0 !text-slate-800 tracking-tight">
                  Yêu cầu #{orderDetail.order_request_id}
                </Title>
              </div>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="flex items-center gap-1.5"><CalendarOutlined /> {dayjs(orderDetail.order_request_date).format("DD/MM/YYYY HH:mm")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Customer & Address Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <UserOutlined className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 m-0">Thông tin khách hàng</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                <div>
                  <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Họ và tên</Text>
                  <Paragraph className="text-slate-700 font-medium text-base mt-1">{orderDetail.customer_name}</Paragraph>
                </div>
                <div>
                  <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Số điện thoại</Text>
                  <Paragraph className="text-base mt-1">
                    <a href={`tel:${orderDetail.customer_phone}`} className="text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-2">
                      <PhoneOutlined /> {orderDetail.customer_phone}
                    </a>
                  </Paragraph>
                </div>
                <div>
                  <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Email</Text>
                  <Paragraph className="text-base mt-1">
                    <a href={`mailto:${orderDetail.customer_email}`} className="text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-2">
                      <MailOutlined /> {orderDetail.customer_email}
                    </a>
                  </Paragraph>
                </div>
                <div className="md:col-span-4">
                  <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Địa chỉ giao hàng</Text>
                  <Paragraph className="text-slate-700 text-base mt-1 flex items-start gap-2">
                    <EnvironmentOutlined className="mt-1 text-slate-400" />
                    {orderDetail.detail_address || <span className="text-slate-400 italic">Chưa cập nhật địa chỉ</span>}
                  </Paragraph>
                </div>
              </div>
            </div>

            {/* GỘP Product Details Card và Technical Specifications Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ShoppingOutlined className="text-xl" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 m-0">Chi tiết sản phẩm & Thông số kỹ thuật</h3>
              </div>

              <div className="space-y-6">
                {/* Thông tin cơ bản sản phẩm - TIÊU ĐỀ VÀ THÔNG TIN CÙNG DÒNG */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <ShoppingOutlined className="text-indigo-500 text-lg" />
                    </div>
                    <div>
                      <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Sản phẩm</Text>
                      <div className="text-lg font-bold text-slate-800">{orderDetail.product_name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <TagOutlined className="text-green-500 text-lg" />
                    </div>
                    <div>
                      <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Số lượng</Text>
                      <div className="text-lg font-bold text-slate-800">{orderDetail.quantity.toLocaleString("vi-VN")} chiếc</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <CalendarOutlined className="text-cyan-500 text-lg" />
                    </div>
                    <div>
                      <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Giao hàng</Text>
                      <div className="text-lg font-bold text-slate-800">{dayjs(orderDetail.delivery_date).format("DD/MM/YYYY")}</div>
                    </div>
                  </div>
                </div>

                {/* Mô tả yêu cầu */}
                <div>
                  <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Mô tả yêu cầu</Text>
                  <div className="mt-1 p-4 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed min-h-[100px]">
                    {orderDetail.description || <span className="text-slate-400 italic">Không có mô tả chi tiết</span>}
                  </div>
                </div>

                {/* Thông số kỹ thuật - TIÊU ĐỀ VÀ THÔNG TIN CÙNG DÒNG */}
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-lg font-bold text-slate-800 mb-6">Thông số kỹ thuật</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Kích thước - TIÊU ĐỀ VÀ GIÁ TRỊ CÙNG DÒNG */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <ArrowsAltOutlined className="text-blue-500" />
                          </div>
                          <div>
                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Kích thước</Text>
                            <div className="font-bold text-slate-700 text-lg">
                              {orderDetail.product_length_mm || 0} × {orderDetail.product_width_mm || 0} × {orderDetail.product_height_mm || 0} mm
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loại sản phẩm - TIÊU ĐỀ VÀ GIÁ TRỊ CÙNG DÒNG */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <AppstoreOutlined className="text-geekblue-500" />
                          </div>
                          <div>
                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Loại sản phẩm</Text>
                            <div className="font-bold text-slate-700 text-lg">{orderDetail.product_type || "N/A"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Chất liệu giấy - TIÊU ĐỀ VÀ GIÁ TRỊ CÙNG DÒNG */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <BlockOutlined className="text-orange-500" />
                          </div>
                          <div>
                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Chất liệu giấy</Text>
                            <div className="font-bold text-slate-700 text-lg">
                              {orderDetail.paper_name || "Chưa xác định"}
                              {orderDetail.paper_code && <span className="text-slate-400 text-sm ml-2">({orderDetail.paper_code})</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Phủ bề mặt - TIÊU ĐỀ VÀ GIÁ TRỊ CÙNG DÒNG */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <FormatPainterOutlined className="text-purple-500" />
                          </div>
                          <div>
                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Phủ bề mặt</Text>
                            <div className="font-bold text-slate-700 text-lg">{orderDetail.coating_type || "Không"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Loại sóng - TIÊU ĐỀ VÀ GIÁ TRỊ CÙNG DÒNG */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <DeploymentUnitOutlined className="text-yellow-500" />
                          </div>
                          <div>
                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Loại sóng</Text>
                            <div className="font-bold text-slate-700 text-lg">{orderDetail.wave_type || "Không"}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Số bản kẽm - TIÊU ĐỀ VÀ GIÁ TRỊ CÙNG DÒNG */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <FileTextOutlined className="text-red-500" />
                          </div>
                          <div>
                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Số bản kẽm</Text>
                            <div className="font-bold text-slate-700 text-lg">{orderDetail.number_of_plates || 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quy trình sản xuất - Chiếm cả 2 cột */}
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                          <SettingOutlined className="text-blue-600" />
                        </div>
                        <div>
                          <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Quy trình sản xuất</Text>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {orderDetail.production_processes ? (
                          orderDetail.production_processes.split(',').map((proc, index) => (
                            <Tag key={index} color="blue" className="px-3 py-1.5 text-sm rounded-lg font-medium">
                              {proc.trim()}
                            </Tag>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Chưa có quy trình</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information Card (if exists) */}
            {orderDetail.payments && orderDetail.payments.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CreditCardOutlined className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 m-0">Lịch sử thanh toán</h3>
                </div>

                <div className="space-y-4">
                  {orderDetail.payments.map((payment, idx) => (
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

          {/* Sidebar - Design Files + QR Payment */}
          <div className="lg:col-span-4 space-y-8">
            {paymentInfo && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <QrcodeOutlined className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 m-0">Thanh toán</h3>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white border-2 border-slate-100 rounded-xl relative group">
                    <QRCodeCanvas
                      value={paymentInfo.qr_code}
                      size={200}
                      level={"H"}
                      includeMargin={true}
                    />
                    {/* Overlay instructional text on hover or always visible below */}
                  </div>

                  <div className="w-full space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Ngân hàng</span>
                      <span className="font-semibold text-slate-700">{paymentInfo.bin}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số tài khoản</span>
                      <span className="font-semibold text-slate-700 tracking-wide">{paymentInfo.account_number}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Chủ tài khoản</span>
                      <span className="font-semibold text-slate-700 uppercase">{paymentInfo.account_name}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500">Số tiền</span>
                      <span className="font-bold text-lg text-emerald-600">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(paymentInfo.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Nội dung CK</span>
                      <span className="font-mono font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{paymentInfo.order_code}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 text-center">
                    Quét mã QR hoặc chuyển khoản với nội dung chính xác như trên
                  </p>

                  <Button
                    type="primary"
                    href={paymentInfo.checkout_url}
                    target="_blank"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 h-10 rounded-xl"
                  >
                    <CreditCardOutlined /> Link thanh toán PayOS
                  </Button>
                </div>
                {paymentInfo.expired_at && (
                  <p className="text-sm text-red-500 text-center font-medium mt-4 bg-red-50 py-2 rounded-lg border border-red-100">
                    Hết hạn: {dayjs(paymentInfo.expired_at).format('HH:mm DD/MM/YYYY')}
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Back Actions */}
        <div className="mt-6 flex justify-center pb-8">
          <Button size="large" onClick={() => router.back()} icon={<ArrowLeftOutlined />} className="h-12 px-8 rounded-xl font-medium border-slate-300 text-slate-600 hover:border-cyan-500 hover:text-cyan-600">
            Quay lại danh sách
          </Button>
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
