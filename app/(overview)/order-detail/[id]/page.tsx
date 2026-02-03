"use client";

import { orderApi, OrderDetailResponse } from "@/apiRequests/order";
import { uploadApi } from "@/apiRequests/uploads";
import {
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  DollarOutlined,
  EnvironmentOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  ProfileOutlined,
  SyncOutlined,
  UserOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  FileImageOutlined,
  UploadOutlined,
  CloudUploadOutlined
} from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  Image,
  Skeleton,
  Tag,
  Typography,
  Breadcrumb,
  Tooltip,
  Row,
  Col,
  Statistic,
  Upload,
  UploadProps,
  UploadFile,
  message
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [designFiles, setDesignFiles] = useState<UploadFile[]>([]);

  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!orderId) return;

      setLoading(true);
      try {
        const response = await orderApi.getDetail(orderId);
        // Kiểm tra structure response, tùy thuộc vào interceptor
        const data = response.data || response;
        // @ts-ignore - Handle potential wrapper mismatch
        setOrder(data.payload || data);

      } catch (error) {
        console.error("Error fetching order detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string; bg: string; border: string }> = {
      InProcessing: {
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        icon: <SyncOutlined />,
        text: "Đang xử lý"
      },
      Scheduled: {
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        icon: <CalendarOutlined />,
        text: "Đã lên lịch"
      },
      Finished: {
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        icon: <CheckCircleFilled />,
        text: "Hoàn thành"
      },
      Cancelled: {
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        icon: <CloseCircleFilled />,
        text: "Đã hủy"
      },
    };

    const config = statusConfig[status] || {
      color: "text-gray-600",
      bg: "bg-gray-50",
      border: "border-gray-200",
      icon: <InfoCircleOutlined />,
      text: status
    };

    return (
      <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${config.bg} ${config.color} ${config.border}`}>
        {config.icon}
        <span>{config.text}</span>
      </div>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      Deposited: { color: "gold", text: "Đã đặt cọc" },
      Unpaid: { color: "default", text: "Chưa thanh toán" },
      FullPayment: { color: "success", text: "Đã thanh toán đủ" },
    };
    const config = statusConfig[status] || { color: "default", text: status };
    return <Tag color={config.color} className="text-sm px-3 py-0.5 rounded mr-0">{config.text}</Tag>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (date: string | null) => {
    return date ? dayjs(date).format("DD/MM/YYYY") : "Chưa cập nhật";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton.Button active size="large" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-xl shadow-sm"><Skeleton active /></Card>
              <Card className="rounded-xl shadow-sm"><Skeleton active /></Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
              <Card className="rounded-xl shadow-sm"><Skeleton active /></Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Empty
          description="Không tìm thấy thông tin đơn hàng"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => router.back()}>Quay lại</Button>
        </Empty>
      </div>
    );
  }

  // Handle design file upload - Sử dụng API update-design-file
  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    setLoading(true);

    try {
      // Gọi API upload design file cho order request
      const response = await uploadApi.updateDesignFile(
        parseInt(orderId),
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
        setOrder((prev) =>
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
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 pb-12 animate-fade-in-up">
      {/* Header Background */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6">
          {/* <Breadcrumb
            items={[
              { href: '/', title: <HomeOutlined /> },
              { title: 'Quản lý đơn hàng', href: '/orders' },
              { title: `Đơn hàng ${order.code}` },
            ]}
            className="mb-4"
          /> */}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Title level={2} className="!mb-0 !text-slate-800">
                  {order.code}
                </Title>
                {getStatusBadge(order.status)}
              </div>

            </div>
            <div className="flex gap-3">
              {/* <Button icon={<PrinterOutlined />}>In đơn hàng</Button> */}
              {/* Add more actions here if needed */}
              <Text type="secondary" className="flex items-center gap-2">
                <CalendarOutlined /> Ngày tạo: {dayjs(order.order_date).format("DD/MM/YYYY HH:mm")}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4">
        <Row gutter={[24, 24]}>
          {/* Left Column - Main Info */}
          <Col xs={24} lg={16}>
            <div className="space-y-6">

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
                      <div className="font-medium text-slate-800">Khách hàng: {order.customer_name}</div>
                      <div className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 transition-colors">
                        Sđt: {order.customer_phone}
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 hover:text-cyan-600 transition-colors">
                        Email: {order.customer_email}
                      </div>
                    </div>
                  </div>
                  <div>
                    {/* <Text type="secondary" className="text-xs uppercase font-bold">Địa chỉ giao hàng</Text> */}
                    <div className="flex items-start gap-2 mt-1 text-slate-700">
                      <EnvironmentOutlined className="mt-1 text-slate-400" />
                      <span>{order.detail_address}</span>
                    </div>
                  </div>
                </div>
              </Card>
              <div className="pt-0.5" />

              {/* Product Information */}
              <Card
                title={<span className="text-lg font-semibold flex items-center gap-2"><ProfileOutlined className="text-cyan-600" /> Thông tin sản phẩm</span>}
                className="rounded-2xl shadow-sm border-gray-100"
                bordered={false}
              >

                <Descriptions column={{ xs: 1, sm: 2 }} colon={false} labelStyle={{ color: '#8c8c8c' }}>
                  <Descriptions.Item label="Tên sản phẩm">
                    <span className="font-medium text-base text-slate-800 flex ">{order.product_name}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Số lượng">
                    <Tag className="text-base px-3 py-1 font-semibold">{order.quantity}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Lệnh sản xuất">
                    #{order.production_id}
                  </Descriptions.Item>
                  {/* <Descriptions.Item label="Thông số kỹ thuật" span={2}>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-700 whitespace-pre-line">
                      {order.specification || "Chưa có thông số chi tiết"}
                    </div>
                  </Descriptions.Item> */}
                  <Descriptions.Item label="Ghi chú" span={2}>
                    <div className="text-slate-600 italic">
                      {order.note || "Không có ghi chú"}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              </Card>


              {/* Production Info */}
              {/* <Card
                title={<span className="text-lg font-semibold flex items-center gap-2"><SafetyCertificateOutlined className="text-cyan-600" /> Thông tin sản xuất</span>}
                className="rounded-2xl shadow-sm border-gray-100 "
                bordered={false}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-blue-600 shadow-sm">
                      <ClockCircleFilled />
                    </div>
                    <div>
                      <div className="text-xs text-blue-600 font-bold uppercase tracking-wide">Ngày bắt đầu</div>
                      <div className="text-lg font-semibold text-slate-800">{formatDate(order.production_start_date)}</div>
                    </div>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                      <CheckCircleFilled />
                    </div>
                    <div>
                      <div className="text-xs text-emerald-600 font-bold uppercase tracking-wide">Dự kiến hoàn thành</div>
                      <div className="text-lg font-semibold text-slate-800">{formatDate(order.production_end_date)}</div>
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <Descriptions column={2}>
                      <Descriptions.Item label="Người duyệt lệnh">{order.approver_name}</Descriptions.Item>
                      <Descriptions.Item label="Ngày giao hàng dự kiến">
                        <span className="font-semibold text-cyan-700">{formatDate(order.delivery_date)}</span>
                      </Descriptions.Item>
                    </Descriptions>
                  </div>
                </div>
              </Card> */}

              <div className="pt-0.5" />

              {/* Financial Information */}
              <Card
                title={<span className="text-lg font-semibold flex items-center gap-2"><DollarOutlined className="text-cyan-600" />Thanh toán</span>}
                className="rounded-2xl shadow-sm border-gray-100"
                bordered={false}
              >
                {/* <div className="flex flex-wrap gap-4 mb-6">
                  {getPaymentStatusBadge(order.payment_status)}
                </div> */}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <Statistic
                    title="Tổng giá trị đơn hàng"
                    value={order.final_total_cost}
                    formatter={(val) => formatCurrency(Number(val))}
                    valueStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Statistic
                    title="Đã đặt cọc"
                    value={order.deposit_amount}
                    formatter={(val) => formatCurrency(Number(val))}
                    valueStyle={{ color: '#d97706', fontWeight: 500 }}
                  />
                  <Statistic
                    title="Phụ phí gấp"
                    value={order.rush_amount}
                    formatter={(val) => formatCurrency(Number(val))}
                    valueStyle={{ color: '#be123c', fontWeight: 500 }}
                  />
                </div>
              </Card>
            </div>
          </Col>

          {/* Right Column - Side Info */}
          <Col xs={24} lg={8}>
            <div className="space-y-6">

              <div className="pt-1" />

              {/* Attachments */}
              <Card
                title={<span className="text-base font-semibold">Tài liệu đính kèm</span>}
                className="rounded-2xl shadow-sm border-gray-100"
                bordered={false}
              >
                <div className="space-y-4">
                  {/* Design File */}
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase mb-2">File thiết kế</div>
                    {order.file_url ? (
                      <div className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                        <Image
                          src={order.file_url}
                          alt="Design"
                          className="object-cover w-full h-40"
                          fallback="https://placehold.co/400x300?text=No+Preview"
                        />


                        <div className="absolute top-2 right-2">
                          <Tooltip title="Tải xuống">
                            <Button
                              size="small"
                              shape="circle"
                              icon={<DownloadOutlined />}
                              href={order.file_url}
                              target="_blank"
                              className="bg-white/90 backdrop-blur-sm shadow-sm"
                            />
                          </Tooltip>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 border border-dashed border-slate-200">
                        {/* <FileImageOutlined className="text-2xl mb-1" /> */}
                        {/* <div className="text-xs">Không có file</div> */}
                        <Upload
                          customRequest={handleUpload}
                          showUploadList={false}
                          accept="image/*,.pdf"
                          disabled={loading}
                          className="block w-full"
                        >
                          <div className={`
                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                        ${loading ? 'border-cyan-400 bg-cyan-50' : 'border-slate-300 hover:border-cyan-500 hover:bg-slate-50'}
                     `}>
                            <div className="flex flex-col items-center gap-3">
                              {loading ? (
                                <SyncOutlined spin className="text-3xl text-cyan-500" />
                              ) : (
                                <CloudUploadOutlined className="text-4xl text-cyan-500 drop-shadow-sm" />
                              )}
                              <div className="text-slate-700 font-semibold">
                                {loading ? "Đang tải lên..." : "Tải lên file thiết kế"}
                              </div>
                              <Text type="secondary" className="text-xs max-w-[200px] mx-auto">
                                Kéo thả hoặc nhấn để chọn file (JPG, PNG, PDF)
                              </Text>
                            </div>
                          </div>
                        </Upload>
                      </div>
                    )}
                  </div>

                  {/* Contract File */}
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase mb-2">Hợp đồng</div>
                    {order.contract_file ? (
                      <a href={order.contract_file} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:border-cyan-400 hover:shadow-sm transition-all text-slate-700">
                          <FilePdfOutlined className="text-red-500 text-xl" />
                          <div className="flex-1 truncate">
                            <div className="font-medium text-sm truncate">Contract_{order.code}.pdf</div>
                            <div className="text-xs text-slate-400">Nhấn để xem</div>
                          </div>
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 text-sm p-2">
                        <InfoCircleOutlined /> Chưa có hợp đồng
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </Col>
        </Row>

        {/* Back Link */}
        {/* <div className="mt-8">
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>Quay lại danh sách</Button>
        </div> */}
      </div>

      <style jsx global>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translate3d(0, 20px, 0); }
            to { opacity: 1; transform: translate3d(0, 0, 0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
          }
        `}</style>
    </div>
  );
}
