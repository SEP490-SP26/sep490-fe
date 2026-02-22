"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { VerifiedRequestReponse } from "@/lib/request.types";
import {
    CalendarOutlined,
    CompassOutlined,
    DollarOutlined,
    FileImageOutlined,
    DownloadOutlined,
    ShoppingOutlined,
    UserOutlined,
    PhoneOutlined,
    MailOutlined,
    HomeOutlined,
    SendOutlined,
    EditOutlined
} from "@ant-design/icons";
import {
    Button,
    Card,
    Empty,
    Image,
    message,
    Skeleton,
    Tag,
    Typography,
    Statistic,
    Row,
    Col,
    Divider,
    Tooltip,
    Collapse,
    Badge,
    Modal,
    Form,
    Input
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;
const { Panel } = Collapse;

export default function ConsultantRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [orderDetail, setOrderDetail] = useState<VerifiedRequestReponse | null>(null);

    const [sending, setSending] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updateReason, setUpdateReason] = useState("");
    const [updateForm] = Form.useForm();

    // Fetch order detail from API
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

    useEffect(() => {
        fetchOrderDetail();
    }, [requestId]);

    const handleSendQuote = async () => {
        if (!orderDetail) return;
        setSending(true);
        try {
            await requestOrderApi.sendDeal({ request_id: orderDetail.request_id });
            message.success("Đã gửi báo giá cho khách hàng thành công!");
            await fetchOrderDetail(); // Refresh data to update status
        } catch (error) {
            console.error("Lỗi khi gửi báo giá:", error);
            message.error("Không thể gửi báo giá. Vui lòng thử lại sau.");
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-6xl mx-auto">
                    <Skeleton.Button active size="large" className="mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Skeleton active paragraph={{ rows: 8 }} />
                        <Skeleton active paragraph={{ rows: 8 }} />
                        <Skeleton active paragraph={{ rows: 8 }} />
                        <Skeleton active paragraph={{ rows: 8 }} />
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

    // Helper to format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Download all design files
    const downloadAllDesignFiles = () => {
        if (!orderDetail.design_file_path) return;

        orderDetail.design_file_path.split(',').forEach((url, index) => {
            const trimmedUrl = url.trim();
            window.open(trimmedUrl, '_blank');
        });
    };

    return (
        <div className="min-h-screen pb-8">
            <div className="w-full max-w-full px-6 pt-4 relative animate-fade-in-up">
                {/* Header - Compact */}
                <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <h1 className="!mb-0 tracking-tight text-accent text-xl lg:text-2xl font-bold">
                                Yêu cầu #{orderDetail.request_id}
                            </h1>
                            <Tag color={
                                orderDetail.process_status === 'Pending' ? 'blue' :
                                    orderDetail.process_status === 'Accepted' ? 'green' : orderDetail.process_status === 'Rejected' ? 'red' : 'orange'
                            } className="text-xs lg:text-sm px-3 py-1 rounded-full uppercase font-medium">
                                {orderDetail.process_status === 'Waiting' ? 'Chờ Khách hàng xác nhận' :
                                    orderDetail.process_status === 'Pending' ? 'Đơn mới' : orderDetail.process_status === 'Accepted' ? 'Đã xác nhận' : orderDetail.process_status === 'Rejected' ? 'Đã hủy' : orderDetail.process_status === 'Verified' ? 'Đã được duyệt' : orderDetail.process_status === 'Processing' ? 'Đang xử lý' : 'Chưa xác nhận'}
                            </Tag>
                        </div>
                        <div className="flex gap-2">
                            {orderDetail.process_status === 'Verified' && (
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    className="bg-blue-600 hover:bg-blue-500"
                                    size="small"
                                    loading={sending}
                                    onClick={handleSendQuote}
                                >
                                    Gửi báo giá cho khách hàng
                                </Button>
                            )}
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                className="bg-blue-600 hover:bg-blue-500"
                                size="small"
                                onClick={() => router.push(`/consultant?orderId=${orderDetail.request_id}&mode=negotiate&reason=${encodeURIComponent(updateReason.trim())}`)}
                            >
                                Cập nhật yêu cầu
                            </Button>

                            {/* Confirm Update Modal */}
                            <Modal
                                title={
                                    <div className="flex items-center gap-2">
                                        <EditOutlined className="text-blue-600" />
                                        <span>Xác nhận cập nhật yêu cầu</span>
                                    </div>
                                }
                                open={updateModalOpen}
                                onCancel={() => setUpdateModalOpen(false)}
                                footer={[
                                    <Button key="cancel" onClick={() => setUpdateModalOpen(false)}>
                                        Hủy
                                    </Button>,
                                    <Button
                                        key="confirm"
                                        type="primary"
                                        className="bg-blue-600 hover:bg-blue-500"
                                        disabled={!updateReason.trim()}
                                        onClick={() => {
                                            if (!updateReason.trim()) {
                                                message.warning("Vui lòng nhập lý do cập nhật!");
                                                return;
                                            }
                                            setUpdateModalOpen(false);
                                            router.push(`/consultant?orderId=${orderDetail.request_id}&mode=negotiate&reason=${encodeURIComponent(updateReason.trim())}`);
                                        }}
                                    >
                                        Xác nhận
                                    </Button>
                                ]}
                            >
                                <Form form={updateForm} layout="vertical">
                                    <Form.Item
                                        label="Lý do cập nhật"
                                        required
                                        help={!updateReason.trim() ? "Vui lòng nhập lý do trước khi tiếp tục" : ""}
                                        validateStatus={!updateReason.trim() ? "warning" : ""}
                                    >
                                        <Input.TextArea
                                            rows={4}
                                            placeholder="Nhập lý do cập nhật yêu cầu..."
                                            value={updateReason}
                                            onChange={(e) => setUpdateReason(e.target.value)}
                                            maxLength={500}
                                            showCount
                                        />
                                    </Form.Item>
                                </Form>
                            </Modal>
                        </div>


                    </div>
                </div>

                {/* Main Content - 2x2 Grid with Optimized Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card 1: Customer & Address (Top Left) */}
                    <Card
                        className="shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 border border-slate-100 h-full"
                        bodyStyle={{ padding: '20px' }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                                <UserOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">Thông tin khách hàng</h3>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {/* Khách hàng & Số điện thoại - Same Line */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-2">
                                        {/* <UserOutlined className="text-slate-500" /> */}
                                        <Text className="text-slate-500 text-sm font-medium">Khách hàng:</Text>
                                    </div>
                                    <Text className="text-primary font-bold text-base uppercase truncate max-w-[150px]" title={orderDetail.customer_name}>{orderDetail.customer_name}</Text>
                                </div>

                                <div className="flex-1 flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-2">
                                        {/* <PhoneOutlined className="text-slate-500" /> */}
                                        <Text className="text-slate-500 text-sm font-medium">Số điện thoại:</Text>
                                    </div>
                                    <Text className="text-slate-800 font-bold text-base">{orderDetail.customer_phone}</Text>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-2">

                                    <Text className="text-slate-500 text-sm font-medium">Email:</Text>
                                </div>
                                <Text className="text-slate-800 font-bold text-base truncate ml-2">{orderDetail.email}</Text>
                            </div>

                            {/* Địa chỉ */}
                            <div className="p-3 bg-cyan-50 rounded-lg border border-cyan-100">
                                <div className="flex items-start gap-2">
                                    {/* <CompassOutlined className="text-cyan-600 mt-1 flex-shrink-0" /> */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <Text className="text-cyan-700 text-sm font-medium">Địa chỉ giao hàng:</Text>
                                        </div>
                                        <Text className="text-slate-800 font-medium text-sm leading-relaxed">
                                            {orderDetail.detail_address || <span className="text-slate-400 italic">Chưa cập nhật địa chỉ</span>}
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Card 2: File (Top Right) */}
                    <Card
                        className="shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 border border-slate-100 h-full"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-pink-50 flex items-center justify-center text-pink-600">
                                    <FileImageOutlined className="text-xl" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 m-0">File thiết kế</h3>
                                    {orderDetail.design_file_path && (
                                        <div className="flex items-center gap-1">
                                            <Text className="text-slate-500 text-sm">
                                                {orderDetail.design_file_path.split(',').length} file
                                            </Text>
                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<DownloadOutlined />}
                                                onClick={downloadAllDesignFiles}
                                                className="text-blue-600 p-0 h-auto"
                                            >
                                                <span className="text-xs">Tải tất cả</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {orderDetail.design_file_path ? (
                            <div className="flex-1">
                                {(() => {
                                    const fileList = orderDetail.design_file_path.split(',').filter(f => f.trim());
                                    const isSingleFile = fileList.length === 1;

                                    return (
                                        <div className={isSingleFile ? "h-40" : "grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4"}>
                                            {fileList.map((url, index) => {
                                                const trimmedUrl = url.trim();
                                                const isImage = /\.(jpeg|jpg|gif|png|webp|bmp)$/i.test(trimmedUrl);
                                                const fileName = trimmedUrl.split('/').pop() || `File ${index + 1}`;

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`${isSingleFile ? "w-full h-50" : "aspect-square"} border border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all duration-200 group design-file-image`}
                                                    >
                                                        {isImage ? (
                                                            <>
                                                                <Image
                                                                    src={trimmedUrl}
                                                                    alt={fileName}
                                                                    width="100%"
                                                                    height="50s%"
                                                                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200`}
                                                                    preview={{
                                                                        mask: (
                                                                            <div className="flex items-center justify-center gap-1 text-white text-xs">
                                                                                <FileImageOutlined />
                                                                                Xem
                                                                            </div>
                                                                        )
                                                                    }}
                                                                />

                                                            </>
                                                        ) : (
                                                            <a
                                                                href={trimmedUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex flex-col items-center justify-center h-full p-2 bg-gradient-to-br from-slate-50 to-slate-100 hover:from-blue-50 hover:to-blue-100 transition-all duration-200 relative"
                                                            >
                                                                <FileImageOutlined className={isSingleFile ? "text-4xl text-slate-400 group-hover:text-blue-400 mb-2" : "text-xl text-slate-400 group-hover:text-blue-400 mb-1 transition-colors"} />
                                                                <span className={isSingleFile ? "text-sm text-slate-600 font-medium truncate w-full text-center" : "text-xs text-slate-600 font-medium truncate w-full text-center"}>
                                                                    File {index + 1}
                                                                </span>
                                                                <div className="absolute bottom-2 right-2">
                                                                    <DownloadOutlined className="text-slate-400 text-sm" />
                                                                </div>
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center py-8">
                                <FileImageOutlined className="text-4xl text-slate-300 mb-3" />
                                <Text className="text-slate-400">Không có file thiết kế đính kèm</Text>
                            </div>
                        )}
                    </Card>

                    {/* Card 4: Product Detail (Full Width) */}
                    <Card
                        className="shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 border border-slate-100 h-full lg:col-span-2"
                        bodyStyle={{ padding: '20px' }}
                    >
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <ShoppingOutlined className="text-xl" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800">Chi tiết sản phẩm:<span className="text-primary"> {orderDetail.product_name}</span></h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column: Quantity, Delivery, Description */}
                                <div className="space-y-4">
                                    {/* Quantity and Delivery Date - Single Line */}
                                    {/* <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                                        <div className="flex items-center gap-3">
                                            <ShoppingOutlined className="text-indigo-600 text-xl" />
                                            <div>
                                                <Text className="text-indigo-700 font-bold text-sm">Sản phẩm:</Text>
                                                <Text className="text-indigo-800 font-bold text-lg ml-2">{orderDetail.product_name}</Text>
                                            </div>
                                        </div>
                                        <Tag color="blue" className="px-3 py-1 font-medium">
                                            {orderDetail.product_type}
                                        </Tag>
                                    </div> */}

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Quantity */}
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Text className="text-slate-500 text-sm font-medium">Số lượng:</Text>
                                            </div>
                                            <Tag bordered={false} className="bg-white text-slate-700 font-bold text-lg px-3 py-1 rounded-lg border border-slate-200">
                                                {orderDetail.quantity.toLocaleString("vi-VN")}
                                            </Tag>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <CalendarOutlined className="text-slate-500" />
                                                <Text className="text-slate-500 text-sm font-medium">Giao hàng:</Text>
                                            </div>
                                            <Tag icon={<CalendarOutlined />} bordered={false} color="cyan" className="text-base px-3 py-1 m-0 font-medium">
                                                {dayjs(orderDetail.delevery_date).isValid() ? dayjs(orderDetail.delevery_date).format("DD/MM/YYYY") : "Chưa xác định"}
                                            </Tag>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <Text className="text-slate-700 font-bold">Mô tả yêu cầu:</Text>
                                        </div>
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl text-slate-600 leading-relaxed min-h-[80px] max-h-48 overflow-y-auto">
                                            {orderDetail.description || <span className="text-slate-400 italic">Không có mô tả chi tiết</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Technical Specs */}
                                <div>
                                    {/* Technical Specs - In Collapse */}
                                    <div className="bg-white rounded-lg  h-full">

                                        <div
                                            className="h-full"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <Text className="text-slate-500 text-sm font-medium">Kích thước (mm):</Text>
                                                    </div>
                                                    <Text className="text-slate-800 font-bold text-base">
                                                        {orderDetail.product_length_mm} x {orderDetail.product_width_mm} x {orderDetail.product_height_mm}
                                                    </Text>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                        <Text className="text-slate-500 text-sm font-medium">Loại giấy:</Text>
                                                        <Text className="text-slate-800 font-bold text-base">{orderDetail.paper_name}</Text>
                                                    </div>
                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                        <Text className="text-slate-500 text-sm font-medium">Kiểu sóng:</Text>
                                                        <Text className="text-slate-800 font-bold text-sm">{orderDetail.wave_type}</Text>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                        <Text className="text-slate-500 text-sm font-medium">Loại phủ:</Text>
                                                        <Text className="text-slate-800 font-bold text-sm">{orderDetail.coating_type}</Text>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                        <Text className="text-slate-500 text-sm font-medium">Số bản kẽm:</Text>
                                                        <Text className="text-slate-800 font-bold text-sm">{orderDetail.number_of_plates}</Text>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Card 3: Cost Estimates (Full Width) */}
                    <Card
                        className="shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 border border-slate-100 h-full lg:col-span-2"

                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <DollarOutlined className="text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 m-0">Thông tin báo giá</h3>
                                {/* {orderDetail.cost_estimate && (
                                    <Text className="text-slate-500 text-sm">
                                        {orderDetail.cost_estimate.length} báo giá
                                    </Text>
                                )} */}
                            </div>
                        </div>

                        {orderDetail.cost_estimate && orderDetail.cost_estimate.filter(x => x.is_active).length > 0 ? (
                            <div className="space-y-3">
                                {orderDetail.cost_estimate.filter(x => x.is_active).map((estimate, index) => (
                                    <div key={estimate.estimate_id} className="border border-emerald-100 rounded-lg p-3 bg-gradient-to-r from-emerald-50/30 to-white hover:border-emerald-200 transition-colors">
                                        {/* Estimate Header & Summary - Compact Row */}
                                        {/* <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Tag color="green" className="m-0 font-bold bg-green-100 text-green-700 border-0">
                                                    BÁO GIÁ #{index + 1}
                                                </Tag>
                                                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <Text className="text-slate-500 text-sm">Đặt cọc:</Text>
                                                    <Text className="text-emerald-700 font-bold text-sm">
                                                        {formatCurrency(estimate.deposit_amount)}
                                                    </Text>
                                                </div>
                                                <div className="h-4 w-px bg-emerald-200"></div>
                                                <div className="flex items-center gap-1.5">
                                                    <Text className="text-slate-500 text-sm font-bold">Tổng:</Text>
                                                    <Text className="text-emerald-700 font-bold text-base">
                                                        {formatCurrency(estimate.final_total_cost)}
                                                    </Text>
                                                </div>
                                            </div>
                                        </div> */}

                                        {/* Process Costs - In Compact Collapse */}
                                        <div className="bg-white rounded border border-slate-100">
                                            <Collapse
                                                ghost
                                                expandIconPosition="end"
                                                size="small"
                                                className="compact-collapse"
                                            >
                                                <Panel
                                                    header={
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Tag color="green" className="m-0 font-bold bg-green-100 text-green-700 border-0">
                                                                    BÁO GIÁ #{index + 1}
                                                                </Tag>
                                                                <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                                                                {/* <span className="text-slate-500 text-sm hidden sm:inline">Ngày tạo: {dayjs(estimate.created_at).format("DD/MM/YYYY")}</span> */}
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Text className="text-slate-500 text-sm">Đặt cọc:</Text>
                                                                    <Text className="text-emerald-700 font-bold text-sm">
                                                                        {formatCurrency(estimate.deposit_amount)}
                                                                    </Text>
                                                                </div>
                                                                <div className="h-4 w-px bg-emerald-200"></div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Text className="text-slate-500 text-sm font-bold">Tổng:</Text>
                                                                    <Text className="text-emerald-700 font-bold text-base">
                                                                        {formatCurrency(estimate.final_total_cost)}
                                                                    </Text>
                                                                </div>
                                                            </div>
                                                            <div className="h-4 w-px bg-emerald-200"></div>
                                                            <Text className="text-slate-600 text-sm font-medium">Chi tiết chi phí sản xuất</Text>
                                                            <Badge count={estimate.process_cost.length} style={{ backgroundColor: '#10b981', transform: 'scale(0.8)' }} />
                                                        </div>
                                                    }
                                                    key="1"
                                                    className="!border-b-0"
                                                >
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 pt-1 pb-2 px-1">
                                                        {estimate.process_cost.map((proc) => (
                                                            <div
                                                                key={proc.process_cost_id}
                                                                className="flex items-center justify-between px-1 border-r border-slate-400 last:border-0"
                                                            >
                                                                <div className="flex items-center gap-1.5    overflow-hidden">
                                                                    <Tag color="blue" className="m-0 font-bold bg-blue-100 text-blue-700 border-0">
                                                                        {proc.process_code}
                                                                    </Tag>
                                                                </div>
                                                                <Text className="text-emerald-600 font-medium text-xs whitespace-nowrap ml-1">
                                                                    {formatCurrency(proc.cost)}
                                                                </Text>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Panel>
                                            </Collapse>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                                <DollarOutlined className="text-4xl text-slate-300 mb-3" />
                                <Text className="text-slate-400">Chưa có báo giá nào</Text>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Mobile Back Button */}
                <div className="mt-8 flex justify-center lg:hidden">
                    <Button
                        size="large"
                        onClick={() => router.back()}
                        className="h-12 px-8 rounded-xl font-medium border-slate-300 text-slate-600 hover:border-cyan-500 hover:text-cyan-600"
                    >
                        Quay lại danh sách
                    </Button>
                </div>

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
                    
                    .design-file-image .ant-image-img {
                        object-fit: cover;
                    }
                    
                    /* Compact collapse styles */
                    .compact-collapse .ant-collapse-header {
                        padding: 8px 12px !important;
                    }
                    .compact-collapse .ant-collapse-content-box {
                        padding: 0 12px 8px !important;
                    }
                `}</style>
            </div >
        </div >
    );
}