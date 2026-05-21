"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import { paymentApi, PaymentResponse } from "@/apiRequests/payment";
import { estimatesApi, QuoteOption } from "@/apiRequests/estimates";
import { QRCodeCanvas } from "qrcode.react";
import QuoteCard from "@/components/common/QuoteCard";
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
  DownloadOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileTextOutlined,
  FormatPainterOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  ShoppingOutlined,
  SyncOutlined,
  UploadOutlined,
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
  Modal,
  Skeleton,
  Space,
  Steps,
  Tag,
  Tooltip,
  Typography,
  Upload
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  preliminary_estimated_price?: number;
  consultant_contract_path?: string;
  customer_signed_contract_path?: string;
  deposit_receipt_path?: string | null;
  remaining_receipt_path?: string | null;
  delivery_date_change_reason?: string;
  ink_type_names?: string[];
  order_code?: number;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [requestDetail, setRequestDetail] = useState<OrderDetail | null>(null);
  const [designFiles, setDesignFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteOption | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentResponse | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [estimate_finish_date, setEstimateFinishDate] = useState<string>("---");

  const { Panel } = Collapse;

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!requestId) return;

      try {
        const response = await estimatesApi.emailPreview(Number(requestId));
        const data: any = (response as any).data || response;

        if (data && data.quotes) {
          setQuotes(data.quotes);
          if (data.estimate_finish_date) {
            const formattedDate = dayjs(data.estimate_finish_date).format("DD/MM/YYYY");
            setEstimateFinishDate(formattedDate !== "Invalid Date" ? formattedDate : data.estimate_finish_date);
          }
        }
      } catch (error) {
        console.error("Error fetching quotes:", error);
      }
    };

    fetchQuotes();
  }, [requestId]);

  const handlePayClick = async (quote: QuoteOption) => {
    setSelectedQuote(quote);
    setIsModalVisible(true);
    setLoadingQR(true);
    setPaymentInfo(null);
    try {
      const res = await paymentApi.getPaymentQR(String(quote.order_request_id), quote.quote_id, quote.estimate_id);
      const data = (res as any).data || res;
      if (data) {
        setPaymentInfo(data);
      }
    } catch (error) {
      console.error("Error fetching payment QR:", error);
      message.error("Lỗi khi lấy thông tin thanh toán");
      setIsModalVisible(false);
    } finally {
      setLoadingQR(false);
    }
  };

  useEffect(() => {
    if (!requestId || !selectedQuote) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await paymentApi.getStatusPayment(requestId, selectedQuote.quote_id, selectedQuote.estimate_id);
        const data = (response as any).data || response;

        if (data && data.status === 'PAID') {
          router.push(`/request-detail/${requestId}`);
          setIsModalVisible(false);
        }
      } catch (error) {
        // console.error("Error checking payment status:", error);
      }
    };

    const intervalId = setInterval(checkPaymentStatus, 5000);

    return () => clearInterval(intervalId);
  }, [requestId, router, selectedQuote]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount).replace('₫', 'đ');
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    const p = phone.trim();
    if (p.length < 6) return p;
    return p.substring(0, 3) + "****" + p.substring(p.length - 3);
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [user, domain] = email.split("@");
    if (!domain) return email;
    if (user.length <= 2) return "*".repeat(user.length) + "@" + domain;
    return user[0] + "****" + user[user.length - 1] + "@" + domain;
  };

  const ExpiryNote = () => (
    <p className="mt-6 text-sm text-slate-500 italic leading-relaxed border-t border-slate-200 pt-4">
      (*) Báo giá có hiệu lực đến <b>{paymentInfo?.expired_at ? dayjs(paymentInfo.expired_at).format("HH:mm DD/MM/YYYY") : "..."}</b>. Sau thời gian này, mọi thông tin về đơn giá và chi phí có thể thay đổi.
      Mọi thao tác thanh toán sau thời gian này đều sẽ không được ghi nhận, mọi thắc mắc vui lòng liên hệ lại với chúng tôi để được hỗ trợ.
    </p>
  );

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
            preliminary_estimated_price: (orderData as any).preliminary_estimated_price,
            consultant_contract_path: orderData.consultant_contract_path,
            customer_signed_contract_path: orderData.customer_signed_contract_path,
            deposit_receipt_path: orderData.deposit_receipt_path,
            remaining_receipt_path: orderData.remaining_receipt_path,
            delivery_date_change_reason: orderData.delivery_date_change_reason,
            ink_type_names: orderData.ink_type_names || [],
            order_code: orderData.order_code,
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

  // Polling để lấy link biên lai thanh toán nếu đã có thanh toán nhưng chưa có link
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkReceipt = async () => {
      try {
        const response = await requestOrderApi.getDetail(requestId);
        const orderData = response?.data || response;
        if (orderData && (orderData.deposit_receipt_path || orderData.remaining_receipt_path)) {
          setRequestDetail((prev) => prev ? {
            ...prev,
            deposit_receipt_path: orderData.deposit_receipt_path,
            remaining_receipt_path: orderData.remaining_receipt_path,
            payments: orderData.payments || prev.payments,
          } : prev);
        }
      } catch (error) {
        // Bỏ qua lỗi polling
      }
    };

    const hasCompletedPayment = 
      requestDetail?.payments?.some((p) => p.status === 'PAID' || p.status === 'COMPLETED') ||
      ['ACCEPTED', 'PAID', 'COMPLETED'].includes(requestDetail?.process_status?.toUpperCase() || '');

    if (
      hasCompletedPayment &&
      !requestDetail?.deposit_receipt_path &&
      !requestDetail?.remaining_receipt_path
    ) {
      intervalId = setInterval(checkReceipt, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [requestId, requestDetail?.payments, requestDetail?.deposit_receipt_path, requestDetail?.remaining_receipt_path]);

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
      { title: "Chờ xác nhận" },
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
                <Title level={2} className="!mb-1 !text-slate-800 tracking-tight">
                  Yêu cầu #{requestDetail.order_request_id}
                </Title>
                <Text className="text-slate-500 font-medium italic">
                  Giải pháp in ấn toàn diện - Nâng tầm giá trị thương hiệu
                </Text>
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

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 mt-4 shadow-sm">
            <InfoCircleOutlined className="mt-0.5 text-blue-500 text-lg flex-shrink-0" />
            <div>
              <p className="font-bold text-blue-800 mb-1">Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!</p>
              <p className="text-sm m-0 text-slate-700 mt-2">
                Để theo dõi tiến độ chi tiết và xem các cập nhật mới nhất của đơn hàng, vui lòng truy cập mục <Link href="/look-up" className="font-semibold underline text-blue-600 hover:text-blue-800">Tra cứu đơn hàng</Link>.
              </p>
              {requestDetail.process_status?.toUpperCase() === "PENDING" && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 shadow-sm animate-pulse-subtle">
                  <ClockCircleFilled className="text-amber-500 mt-0.5" />
                  <p className="text-sm text-amber-800 m-0">
                    <span className="font-bold">Lưu ý:</span> Yêu cầu của bạn có hiệu lực trong vòng <span className="font-bold underline">24h</span>. Nếu sau khoảng thời gian này tư vấn viên chưa liên hệ bạn, xin vui lòng tạo yêu cầu mới hoặc liên hệ trực tiếp với công ty qua số điện thoại <a href="tel:0987654321" className="font-bold text-amber-900 hover:underline">0987 654 321</a> để được hỗ trợ nhanh nhất.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-8 space-y-8">
            {quotes.length === 0 && (
              <>
                {/* Customer Info */}
                <Card
                  title={<span className="text-base font-bold text-slate-800">Thông tin khách hàng</span>}
                  className="rounded-2xl shadow-sm border-gray-100"
                  bordered={false}
                  extra={<UserOutlined className="text-gray-400" />}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-100 pb-4">
                      {requestDetail.customer_name && (
                        <div className="flex flex-col">
                          <Text type="secondary" className="text-[10px] uppercase font-bold tracking-wider mb-1">Khách hàng</Text>
                          <div className="font-bold text-slate-800">{requestDetail.customer_name}</div>
                        </div>
                      )}
                      {requestDetail.customer_phone && (
                        <div className="flex flex-col">
                          <Text type="secondary" className="text-[10px] uppercase font-bold tracking-wider mb-1">Số điện thoại</Text>
                          <div className="text-slate-600 font-medium">{maskPhone(requestDetail.customer_phone)}</div>
                        </div>
                      )}
                      {requestDetail.customer_email && (
                        <div className="flex flex-col">
                          <Text type="secondary" className="text-[10px] uppercase font-bold tracking-wider mb-1">Email</Text>
                          <div className="text-slate-600 font-medium">{maskEmail(requestDetail.customer_email)}</div>
                        </div>
                      )}
                    </div>
                    {requestDetail.detail_address && (
                      <div>
                        <Text type="secondary" className="text-[10px] uppercase font-bold tracking-wider mb-1 block">Địa chỉ giao hàng</Text>
                        <div className="flex items-start gap-2 text-slate-700 font-medium">
                          <EnvironmentOutlined className="mt-1 text-slate-400" />
                          <span>{requestDetail.detail_address}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* GỘP P */}
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
                        <div className="text-lg font-bold text-slate-800">SP: {requestDetail.product_name}</div>
                      </div>
                      {/* </div> */}

                      {/* <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"> */}
                      {/* <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <TagOutlined className="text-green-500 text-lg" />
                    </div> */}
                      <div>
                        {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Số lượng</Text> */}
                        <div className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          SL: {requestDetail.quantity.toLocaleString("vi-VN")} chiếc
                          <Tooltip title="Số lượng sẽ được xác nhận khi tư vấn viên liên hệ">
                            <InfoCircleOutlined className="text-slate-400 text-base cursor-help" />
                          </Tooltip>
                        </div>
                      </div>
                      {requestDetail.preliminary_estimated_price && (
                        <div>
                          <div className="text-lg font-bold text-orange-600">Giá dự kiến: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(requestDetail.preliminary_estimated_price).replace('₫', 'đ')}</div>
                        </div>
                      )}
                      {/* </div> */}

                      {/* <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    {/* <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                      <CalendarOutlined className="text-cyan-500 text-lg" />
                    </div> */}
                      <div>
                        {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Giao hàng</Text> */}
                        <div className="text-lg font-bold text-slate-800">Giao hàng: {dayjs(requestDetail.delivery_date).format("DD/MM/YYYY")}</div>
                        {requestDetail.delivery_date_change_reason && (
                          <div className="mt-1 text-sm text-amber-600 italic font-medium italic">
                            Lý do đổi ngày: {requestDetail.delivery_date_change_reason}
                          </div>
                        )}
                      </div>
                      {/* </div> */}
                    </div>

                    {/* Mô tả yêu cầu */}
                    {requestDetail.description && (
                      <div>
                        {/* <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-2">Mô tả yêu cầu</Text> */}
                        <div className="mt-1 p-4 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed min-h-[50px]">
                          {requestDetail.description}
                        </div>
                      </div>
                    )}
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
                            {(requestDetail.product_length_mm || requestDetail.product_width_mm || requestDetail.product_height_mm) && (
                              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2">
                                  <Text className="text-slate-500 text-sm font-medium">Kích thước (mm):</Text>
                                </div>
                                <Text className="text-slate-800 font-bold text-base">
                                  {requestDetail.product_length_mm || 0} x {requestDetail.product_width_mm || 0} x {requestDetail.product_height_mm || 0}
                                </Text>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {requestDetail.paper_name && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                  <Text className="text-slate-500 text-sm font-medium">Loại giấy:</Text>
                                  <Text className="text-slate-800 font-bold text-base">{requestDetail.paper_name}</Text>
                                </div>
                              )}
                              {requestDetail.wave_type && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                  <Text className="text-slate-500 text-sm font-medium">Kiểu sóng:</Text>
                                  <Text className="text-slate-800 font-bold text-sm">{requestDetail.wave_type}</Text>
                                </div>
                              )}

                              {requestDetail.coating_type && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                  <Text className="text-slate-500 text-sm font-medium">Loại phủ:</Text>
                                  <Text className="text-slate-800 font-bold text-sm">{getCoatingType(requestDetail.coating_type)}</Text>
                                </div>
                              )}

                              {requestDetail.number_of_plates !== undefined && requestDetail.number_of_plates !== null && requestDetail.number_of_plates !== 0 && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                  <Text className="text-slate-500 text-sm font-medium">Số bản kẽm:</Text>
                                  <Text className="text-slate-800 font-bold text-sm">{requestDetail.number_of_plates}</Text>
                                </div>
                              )}

                              {/* {requestDetail.ink_type_names && requestDetail.ink_type_names.length > 0 && (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors md:col-span-2">
                                  <Text className="text-slate-500 text-sm font-medium">Loại mực:</Text>
                                  <Space wrap size={[4, 4]}>
                                    {requestDetail.ink_type_names.map((ink, idx) => (
                                      <Tag key={idx} color="blue" className="m-0 border-0 rounded px-2">{ink}</Tag>
                                    ))}
                                  </Space>
                                </div>
                              )} */}
                            </div>
                          </div>
                        </Panel>
                      </Collapse>
                    </div>
                  </div>
                </div>
              </>
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

            {/* Quotes Sections */}
            {quotes.length > 0 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-8">
                  {quotes.map((quote, index) => (
                    <QuoteCard
                      key={quote.quote_id}
                      quote={quote}
                      index={index}
                      totalQuotes={quotes.length}
                      estimateFinishDate={estimate_finish_date}
                      actions={
                        !["PAID", "COMPLETED", "ACCEPTED"].includes(requestDetail?.process_status?.toUpperCase() || "") && (
                          <Button
                            type="primary"
                            className="h-10 px-8 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-200 w-full sm:w-auto mt-2 sm:mt-0"
                            onClick={() => handlePayClick(quote)}
                          >
                            Thanh toán
                          </Button>
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Design Files */}
          <div className="lg:col-span-4 space-y-2">
            <DesignFileDisplay designFilePath={requestDetail.design_file_path} requestId={requestDetail.order_request_id} />

            {/* Payment Receipts Section */}
            {(requestDetail.deposit_receipt_path || requestDetail.remaining_receipt_path) ? (
              <div className="flex flex-col gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200 shadow-sm animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-orange-200 shadow-md">
                    <CreditCardOutlined className="text-orange-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Biên lai thanh toán</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Chứng từ</div>
                  </div>
                </div>
                {requestDetail.deposit_receipt_path && (
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(requestDetail.deposit_receipt_path as string, '_blank')}
                    className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 border-none shadow-sm h-10 font-medium"
                  >
                    Xem biên lai đặt cọc
                  </Button>
                )}
                {requestDetail.remaining_receipt_path && (
                  <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(requestDetail.remaining_receipt_path as string, '_blank')}
                    className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 border-none shadow-sm h-10 font-medium"
                  >
                    Xem biên lai thanh toán còn lại
                  </Button>
                )}
              </div>
            ) : (
              (requestDetail.payments?.some(p => p.status === 'PAID' || p.status === 'COMPLETED') ||
               ['ACCEPTED', 'PAID', 'COMPLETED'].includes(requestDetail.process_status?.toUpperCase() || '')) && (
                <div className="flex flex-col gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-orange-200 shadow-md">
                      <SyncOutlined spin className="text-orange-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Biên lai thanh toán</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Đang khởi tạo...</div>
                    </div>
                  </div>
                  <Button
                    type="primary"
                    disabled
                    className="w-full rounded-lg bg-orange-300 border-none shadow-sm h-10 font-medium text-white"
                  >
                    Hệ thống đang tạo biên lai
                  </Button>
                </div>
              )
            )}

            {/* Receipt Secion */}
            {/* {requestDetail.customer_signed_contract_path  && (
              <div className="flex flex-col gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-blue-200 shadow-md">
                    <FileTextOutlined className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">Phiếu thu</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Trạng thái: Đã xác nhận</div>
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={async () => {
                    if (!requestDetail.order_code) {
                      message.error("Không tìm thấy mã đơn hàng để tải phiếu thu");
                      return;
                    }
                    const hide = message.loading("Đang tải phiếu thu...", 0);
                    try {
                      const res = await paymentApi.getPaymentReceipt(String(requestDetail.order_code));
                      
                      const url = window.URL.createObjectURL(new Blob([res.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `Phieu_Thu_${requestDetail.order_code}.docx`);
                      document.body.appendChild(link);
                      link.click();
                      link.parentNode?.removeChild(link);
                      window.URL.revokeObjectURL(url);
                      
                      message.success("Tải phiếu thu thành công!");
                    } catch (error) {
                      console.error(error);
                      message.error("Lỗi khi tải phiếu thu");
                    } finally {
                      hide();
                    }
                  }}
                  className="w-full rounded-lg bg-green-600 hover:bg-green-700 border-none shadow-sm h-10 font-medium"
                >
                  Tải phiếu thu
                </Button>
              </div>
            )} */}

            {/* Contract Section in Sidebar */}
            <div className="space-y-4">
              {requestDetail.customer_signed_contract_path ? (
                <div className="flex flex-col gap-3 p-4 bg-green-50 rounded-xl border border-green-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-green-200 shadow-md">
                      <CheckCircleFilled className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Hợp đồng đã ký</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Trạng thái: Đã xác nhận</div>
                    </div>
                  </div>
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(requestDetail.customer_signed_contract_path, '_blank')}
                    className="w-full rounded-lg bg-green-600 hover:bg-green-700 border-none shadow-sm h-10 font-medium"
                  >
                    Xem hợp đồng ký
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                      <FileTextOutlined className="text-blue-600" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">File Hợp đồng</div>
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Sẵn sàng để xem</div>
                    </div>
                  </div>
                  <Button
                    type="primary"
                    ghost
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      const quoteWithContract = quotes.find(q => q.consultant_contract_path || q.customer_signed_contract_path);
                      const path = requestDetail.consultant_contract_path ||
                        quoteWithContract?.customer_signed_contract_path ||
                        quoteWithContract?.consultant_contract_path;
                      if (path) window.open(path, '_blank');
                    }}
                    className="w-full rounded-lg border-blue-600 text-blue-600 hover:text-blue-700 hover:border-blue-700 h-10 font-medium"
                  >
                    Tải / Xem hợp đồng
                  </Button>
                </div>
              )}
            </div>


            {quotes.length === 0 && showPaymentInfo && (requestDetail.final_total_cost !== undefined || requestDetail.deposit_amount !== undefined) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <CreditCardOutlined className="text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 m-0">Chi phí & Thanh toán</h3>
                </div>

                <div className="space-y-2">
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
