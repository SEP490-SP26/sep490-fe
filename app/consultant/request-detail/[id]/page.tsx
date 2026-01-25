"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { VerifiedRequestReponse } from "@/lib/request.types";
import {
    ArrowLeftOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
    FileImageOutlined,
    HomeOutlined,
    MailOutlined,
    PhoneOutlined,
    ShoppingOutlined,
    DownloadOutlined,
    ExperimentOutlined,
    BuildOutlined,
    ToolOutlined,
    DollarOutlined,
} from "@ant-design/icons";
import {
    Image as AntImage,
    Button,
    Card,
    Typography,
    Breadcrumb,
    Skeleton,
    Empty,
    message,
    Tooltip,
    Tag,
    Descriptions,
    Divider
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text, Paragraph } = Typography;

export default function ConsultantRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [orderDetail, setOrderDetail] = useState<VerifiedRequestReponse | null>(null);

    // Fetch order detail from API
    useEffect(() => {
        const fetchOrderDetail = async () => {
            if (!requestId) return;

            setLoading(true);
            try {
                const response = await requestOrderApi.getRequestDetailbyConsultant(requestId);
                const orderData = response?.data || response;

                if (orderData) {
                    setOrderDetail(orderData);
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

    if (loading) {
        return (
            <div className="min-h-screen p-6">
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
            <div className="min-h-screen p-6 flex items-center justify-center">
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

    // Helper to format production processes
    const renderProductionProcesses = (processes: string) => {
        if (!processes) return <span className="text-slate-400 italic">Chưa xác định</span>;
        return (
            <div className="flex flex-wrap gap-2">
                {processes.split(',').map((proc, index) => (
                    <Tag key={index} color="blue" className="px-3 py-1 text-sm rounded-full m-0 uppercase font-medium">
                        {proc.trim().replace(/_/g, " ")}
                    </Tag>
                ))}
            </div>
        );
    };

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="min-h-screen pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative animate-fade-in-up">
                {/* Navigation & Header */}
                <div className="mb-4">
                    {/* <Breadcrumb
                        items={[
                            { href: '/consultant', title: <HomeOutlined /> },
                            { href: '/consultant/requests', title: 'Quản lý yêu cầu' },
                            { title: `Chi tiết #${orderDetail.request_id}` },
                        ]}
                        className="mb-4 text-slate-500"
                    /> */}

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="!mb-0 tracking-tight text-accent text-3xl font-bold">
                                    Yêu cầu #{orderDetail.request_id}
                                </h1>
                                <Tag color={
                                    orderDetail.process_status === 'Pending' ? 'blue' :
                                        orderDetail.process_status === 'Accepted' ? 'green' : orderDetail.process_status === 'Rejected' ? 'red' : 'orange'
                                } className="ml-2 text-sm px-3 py-1 rounded-full uppercase">
                                    {orderDetail.process_status === 'Waiting' ? 'Chờ Khách hàng xác nhận' :
                                        orderDetail.process_status === 'Pending' ? 'Đơn mới' : orderDetail.process_status === 'Accepted' ? 'Đã xác nhận' : orderDetail.process_status === 'Rejected' ? 'Đã hủy' : 'Chưa xác nhận'}
                                </Tag>
                            </div>
                            {/* <div className="flex items-center gap-4 text-slate-500">
                                <span className="flex items-center gap-1.5"><CalendarOutlined /> {dayjs(orderDetail.order_request_date).format("DD/MM/YYYY HH:mm")}</span>
                            </div> */}
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
                                    <ShoppingOutlined className="text-xl" />
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
                                            {orderDetail.customer_phone}
                                        </a>
                                    </Paragraph>
                                </div>
                                <div>
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Email</Text>
                                    <Paragraph className="text-base mt-1">
                                        <a href={`mailto:${orderDetail.email}`} className="text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-2">
                                            {orderDetail.email}
                                        </a>
                                    </Paragraph>
                                </div>
                                <div className="md:col-span-4">
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Địa chỉ giao hàng</Text>
                                    <Paragraph className="text-slate-700 text-base mt-1 flex items-start gap-2">
                                        {orderDetail.detail_address || <span className="text-slate-400 italic">Chưa cập nhật địa chỉ</span>}
                                    </Paragraph>
                                </div>
                            </div>
                        </div>

                        {/* Cost Estimates Card */}
                        {orderDetail.cost_estimate && orderDetail.cost_estimate.length > 0 && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <DollarOutlined className="text-xl" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 m-0">Thông tin báo giá</h3>
                                </div>

                                <div className="space-y-6">
                                    {orderDetail.cost_estimate.map((estimate, index) => (
                                        <div key={estimate.estimate_id} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                                                <Tag color="blue" className="px-3 py-1 font-medium bg-blue-50 text-blue-700 border-blue-200">
                                                    Báo giá #{index + 1}
                                                </Tag>
                                                <div className="flex gap-6">
                                                    <div className="text-right">
                                                        <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Đặt cọc</Text>
                                                        <Text strong className="text-orange-500 text-lg">{formatCurrency(estimate.deposit_amount)}</Text>
                                                    </div>
                                                    <div className="text-right">
                                                        <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Tổng chi phí</Text>
                                                        <Text strong className="text-emerald-600 text-xl">{formatCurrency(estimate.final_total_cost)}</Text>
                                                    </div>
                                                </div>
                                            </div>

                                            <Divider dashed className="my-3 border-slate-200" />

                                            <Text className="text-slate-500 font-bold block mb-3 text-sm uppercase tracking-wide">Chi tiết chi phí sản xuất</Text>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {estimate.process_cost.map((proc) => (
                                                    <div key={proc.process_cost_id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                                        <Tag className="mr-0" bordered={false}>{proc.process_code}</Tag>
                                                        <Text strong className="text-slate-700">{formatCurrency(proc.cost)}</Text>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Product Details Card */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <ShoppingOutlined className="text-xl" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">Chi tiết sản phẩm</h3>
                            </div>

                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Sản phẩm</Text>
                                        <div className="text-xl font-bold text-slate-800 mt-1">{orderDetail.product_name}</div>
                                        <Tag className="mt-1">{orderDetail.product_type}</Tag>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div>
                                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Số lượng</Text>
                                            <Tag bordered={false} className="bg-white text-slate-700 font-bold text-lg px-4 py-1 rounded-lg border border-slate-200">
                                                {orderDetail.quantity.toLocaleString("vi-VN")}
                                            </Tag>
                                        </div>
                                        <div>
                                            <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider block mb-1">Giao hàng dự kiến</Text>
                                            <Tag icon={<CalendarOutlined />} bordered={false} color="cyan" className="text-base px-3 py-1 m-0">
                                                {dayjs(orderDetail.delevery_date).isValid() ? dayjs(orderDetail.delevery_date).format("DD/MM/YYYY") : "Chưa xác định"}
                                            </Tag>
                                        </div>
                                    </div>
                                </div>

                                <Divider dashed />

                                {/* Technical Specs */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ExperimentOutlined className="text-indigo-500" />
                                            <Text strong className="text-slate-700">Thông số kỹ thuật</Text>
                                        </div>
                                        <Descriptions column={1} size="small" bordered className="bg-slate-50">
                                            <Descriptions.Item label="Loại giấy">{orderDetail.paper_name} ({orderDetail.paper_code})</Descriptions.Item>
                                            <Descriptions.Item label="Kiểu sóng">{orderDetail.wave_type}</Descriptions.Item>
                                            <Descriptions.Item label="Loại phủ">{orderDetail.coating_type}</Descriptions.Item>
                                            <Descriptions.Item label="Số bản kẽm">{orderDetail.number_of_plates}</Descriptions.Item>
                                        </Descriptions>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <BuildOutlined className="text-indigo-500" />
                                            <Text strong className="text-slate-700">Kích thước (mm)</Text>
                                        </div>
                                        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-center justify-around text-center h-[142px]">
                                            <div>
                                                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Dài</div>
                                                <div className="text-2xl font-bold text-indigo-700">{orderDetail.product_length_mm}</div>
                                            </div>
                                            <div className="text-indigo-300 text-lg">×</div>
                                            <div>
                                                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Rộng</div>
                                                <div className="text-2xl font-bold text-indigo-700">{orderDetail.product_width_mm}</div>
                                            </div>
                                            <div className="text-indigo-300 text-lg">×</div>
                                            <div>
                                                <div className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Cao</div>
                                                <div className="text-2xl font-bold text-indigo-700">{orderDetail.product_height_mm}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Divider dashed />

                                {/* Production Layout */}
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <ToolOutlined className="text-indigo-500" />
                                        <Text strong className="text-slate-700">Quy trình sản xuất</Text>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        {renderProductionProcesses(orderDetail.production_processes)}
                                    </div>
                                </div>

                                <Divider dashed />

                                <div>
                                    <Text className="text-slate-400 text-xs uppercase font-bold tracking-wider">Mô tả yêu cầu</Text>
                                    <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed min-h-[80px]">
                                        {orderDetail.description || <span className="text-slate-400 italic">Không có mô tả chi tiết</span>}
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Sidebar - Design Files */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-300 sticky top-6">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                                    <FileImageOutlined className="text-xl" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">File thiết kế</h3>
                            </div>

                            {/* Current Design File Display */}
                            <div className="mb-6">
                                {orderDetail.design_file_path ? (
                                    <div className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 transition-all hover:border-cyan-300">
                                        <div className="flex items-center justify-center">
                                            <AntImage
                                                src={orderDetail.design_file_path}
                                                alt="Design file"
                                                className="w-full object-contain bg-slate-100"
                                                style={{ height: 300, width: '100%' }}
                                                fallback="https://placehold.co/600x400?text=No+Preview"
                                            />
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip title="Tải xuống">
                                                <Button shape="circle" icon={<DownloadOutlined />} href={orderDetail.design_file_path} target="_blank" />
                                            </Tooltip>
                                        </div>
                                        <div className="p-3 bg-white border-t border-slate-100">
                                            <Text ellipsis className="text-slate-500 text-xs block">File hiện tại</Text>
                                            <Text strong className="text-gray-700 text-sm">Design_{orderDetail.request_id}.png</Text>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-40 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 mb-4">
                                        <FileImageOutlined className="text-3xl mb-2 opacity-50" />
                                        <span className="text-sm">Chưa có file thiết kế</span>
                                    </div>
                                )}
                            </div>
                        </div>
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
