"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import { formatCoatingType, formatProcess } from "@/lib/estimationUtils";
import { RequestDetailResponse } from "@/lib/request.types";
import {
    DollarOutlined,
    DownloadOutlined,
    EditOutlined,
    FileImageOutlined,
    FileTextOutlined,
    SendOutlined,
    ShoppingOutlined,
    UploadOutlined,
    UserOutlined
} from "@ant-design/icons";
import {
    Button,
    Card,
    Collapse,
    Descriptions,
    Divider,
    Empty,
    Form,
    Input,
    message,
    Modal,
    Skeleton,
    Tag,
    Typography,
    Upload
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
    const [orderDetail, setOrderDetail] = useState<RequestDetailResponse | null>(null);

    const [sending, setSending] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updateReason, setUpdateReason] = useState("");
    const [updateForm] = Form.useForm();

    const [uploadingDesign, setUploadingDesign] = useState(false);
    const [uploadingContract, setUploadingContract] = useState(false);

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
            <div className="min-h-screen p-6 bg-slate-50/50">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Skeleton.Button active size="large" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton active paragraph={{ rows: 8 }} className="bg-white p-6 rounded-2xl" />
                            <Skeleton active paragraph={{ rows: 6 }} className="bg-white p-6 rounded-2xl" />
                        </div>
                        <Skeleton active paragraph={{ rows: 10 }} className="bg-white p-6 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!orderDetail) {
        return (
            <div className="min-h-screen p-6 flex items-center justify-center bg-slate-50/30">
                <Card className="shadow-sm border-slate-200 rounded-2xl max-w-md w-full text-center py-12">
                    <Empty description={<span className="text-slate-500 font-medium">Không tìm thấy yêu cầu</span>}
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button type="primary" onClick={() => router.back()} className="mt-8 bg-slate-800 hover:bg-slate-700">
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pending': return 'blue';
            case 'Accepted': return 'green';
            case 'Rejected': return 'red';
            case 'Waiting': return 'orange';
            case 'Processing': return 'cyan';
            case 'Declined': return 'blue';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Waiting': return 'Chờ Khách hàng xác nhận';
            case 'Processing': return 'Đang xử lý';
            case 'Declined': return 'Đơn mới';
            case 'Pending': return 'Đơn mới';
            case 'Accepted': return 'Đã xác nhận';
            case 'Rejected': return 'Đã hủy';
            case 'Verified': return 'Đã được duyệt';
            default: return 'Chưa xác nhận';
        }
    };

    return (
        <div className="min-h-screen pb-8 bg-primary">
            <div className="max-w-7xl mx-auto px-2 pt-2 animate-fade-in-up">
                {/* Header - Compact */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="m-0 text-2xl font-bold text-accent tracking-tight">Yêu cầu #{orderDetail.request_id}</h1>
                            <Tag color={getStatusColor(orderDetail.process_status)} className="rounded-full border-0 px-3 py-0.5 font-medium m-0">
                                {getStatusText(orderDetail.process_status)}
                            </Tag>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {orderDetail.process_status === 'Verified' && (
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                className="bg-blue-600 hover:bg-blue-500 rounded-lg"
                                size="middle"
                                loading={sending}
                                onClick={handleSendQuote}
                            >
                                Gửi báo giá cho khách hàng
                            </Button>
                        )}
                        {orderDetail.process_status === 'Processing' && (
                            <Button
                                type="default"
                                icon={<EditOutlined />}
                                size="middle"
                                className="rounded-lg"
                                onClick={() => router.push(`/consultant?orderId=${orderDetail.request_id}&mode=negotiate`)}
                            >
                                Cập nhật yêu cầu
                            </Button>

                        )}

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
                                        className="rounded-lg"
                                    />
                                </Form.Item>
                            </Form>
                        </Modal>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* ROW 1: Summary & Design Files */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="lg:col-span-2">
                            {/* Summary Card (Customer & Product packed tightly) */}
                            <Card className="h-full rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-primary" bodyStyle={{ padding: '24px' }}>
                                {/* Customer Section */}
                                <div className="mb-6">
                                    <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                        <UserOutlined />
                                        Thông tin khách hàng
                                    </h3>
                                    <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} className="text-sm" labelStyle={{ color: '#64748b' }}>
                                        <Descriptions.Item label="Họ tên"><Text strong className="text-slate-800">{orderDetail.customer_name}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Điện thoại"><Text strong className="text-slate-800">{orderDetail.customer_phone}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Email"><Text strong className="text-slate-800 truncate" style={{ maxWidth: 180 }} title={orderDetail.email}>{orderDetail.email}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Địa chỉ giao hàng" span={3}>
                                            <Text strong className="text-slate-800">{orderDetail.detail_address || <span className="font-normal italic text-slate-400">Chưa cập nhật</span>}</Text>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </div>

                                <Divider className="my-0 mb-6 border-slate-100" />

                                {/* Product Section */}
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                        <ShoppingOutlined />
                                        Chi tiết sản phẩm: <span className="text-slate-800 normal-case font-semibold">{orderDetail.product_name}</span>
                                    </h3>

                                    <Descriptions size="small" column={{ xs: 1, sm: 3, md: 4 }} className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-sm mb-4" labelStyle={{ color: '#64748b' }}>
                                        <Descriptions.Item label="Số lượng" span={1}><Text strong className="text-slate-800 text-base">{orderDetail.quantity.toLocaleString("vi-VN")}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Giao hàng" span={1}><Text strong className="text-slate-800">{dayjs(orderDetail.delevery_date).isValid() ? dayjs(orderDetail.delevery_date).format("DD/MM/YYYY") : "Chưa xác định"}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Kích thước" span={1}><Text strong className="text-slate-800">{orderDetail.product_length_mm} x {orderDetail.product_width_mm} x {orderDetail.product_height_mm} mm</Text></Descriptions.Item>
                                    </Descriptions>

                                    {orderDetail.description && (
                                        <div>
                                            <Text type="secondary" className="block mb-2 text-xs uppercase font-semibold">Mô tả yêu cầu</Text>
                                            <div className="text-slate-700 text-sm leading-relaxed bg-white border border-slate-200 rounded-lg p-3">
                                                {orderDetail.description}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            {/* Design Files Card */}
                            <Card
                                className="shadow-sm rounded-2xl hover:shadow-md transition-all duration-300 border border-slate-100 border-t-4 border-t-primary h-full flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                            <FileImageOutlined />
                                            File đính kèm
                                        </h3>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* File mẫu */}
                                    <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FileTextOutlined className="text-gray-400 text-sm" />
                                                <div>
                                                    <div className="font-medium text-sm">File mẫu</div>
                                                    <div className="text-xs text-gray-500">
                                                        {orderDetail.design_file_path ? `${orderDetail.design_file_path.split(',').length} file thiết kế` : "Chưa tải lên"}
                                                    </div>
                                                </div>
                                            </div>
                                            {orderDetail.design_file_path ? (
                                                <Button
                                                    size="small"
                                                    icon={<DownloadOutlined />}
                                                    onClick={downloadAllDesignFiles}
                                                >
                                                    Tải tất cả
                                                </Button>
                                            ) : (
                                                <Upload
                                                    showUploadList={false}
                                                    customRequest={async (options) => {
                                                        const { file, onSuccess, onError } = options;
                                                        setUploadingDesign(true);
                                                        try {
                                                            await uploadApi.updateDesignFile(orderDetail.request_id, file as File);
                                                            message.success("Tải file thiết kế thành công");
                                                            fetchOrderDetail();
                                                            if (onSuccess) onSuccess("ok");
                                                        } catch (error) {
                                                            message.error("Tải file thất bại");
                                                            if (onError) onError(error as any);
                                                        } finally {
                                                            setUploadingDesign(false);
                                                        }
                                                    }}
                                                >
                                                    <Button size="small" icon={<UploadOutlined />} loading={uploadingDesign}>
                                                        Tải lên
                                                    </Button>
                                                </Upload>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hợp đồng */}
                                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <div>
                                                <div className="font-medium text-sm">Hợp đồng</div>
                                                <div className="text-xs text-gray-500">{(orderDetail as any).contract_file ? "Đã đính kèm" : "Chưa tải lên"}</div>
                                            </div>
                                        </div>
                                        {(orderDetail as any).contract_file ? (
                                            <Button
                                                size="small"
                                                type="primary"
                                                onClick={() => window.open((orderDetail as any).contract_file, "_blank")}
                                            >
                                                Xem
                                            </Button>
                                        ) : (
                                            <Upload
                                                showUploadList={false}
                                                customRequest={async (options) => {
                                                    const { file, onSuccess, onError } = options;
                                                    setUploadingContract(true);
                                                    try {
                                                        const res = await uploadApi.uploadFile([file as File]);
                                                        if (res && res[0] && res[0].url) {
                                                            await requestOrderApi.updateRequest(orderDetail.request_id.toString(), {
                                                                contract_file: res[0].url
                                                            } as any);
                                                            message.success("Tải hợp đồng thành công");
                                                            fetchOrderDetail();
                                                            if (onSuccess) onSuccess("ok");
                                                        }
                                                    } catch (error) {
                                                        message.error("Tải hợp đồng thất bại");
                                                        if (onError) onError(error as any);
                                                    } finally {
                                                        setUploadingContract(false);
                                                    }
                                                }}
                                            >
                                                <Button size="small" icon={<UploadOutlined />} loading={uploadingContract}>
                                                    Tải lên
                                                </Button>
                                            </Upload>
                                        )}
                                    </div>

                                    {/* File khác */}
                                    {(orderDetail as any).other_files && (orderDetail as any).other_files.length > 0 && (
                                        <div className="mt-2">
                                            <div className="text-xs font-medium text-gray-700 mb-1">
                                                File khác ({(orderDetail as any).other_files.length}):
                                            </div>
                                            <div className="space-y-1">
                                                {(orderDetail as any).other_files.slice(0, 2).map((file: any, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="flex items-center justify-between p-1.5 bg-white border rounded text-xs"
                                                    >
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <FileTextOutlined className="text-gray-400" style={{ fontSize: "12px" }} />
                                                            <span className="truncate">{file.name}</span>
                                                        </div>
                                                        <Button
                                                            type="link"
                                                            size="small"
                                                            style={{ padding: 0, fontSize: "12px" }}
                                                            onClick={() => window.open(file.url, "_blank")}
                                                        >
                                                            Tải
                                                        </Button>
                                                    </div>
                                                ))}
                                                {(orderDetail as any).other_files.length > 2 && (
                                                    <div className="text-xs text-gray-500 text-center">
                                                        + {(orderDetail as any).other_files.length - 2} file khác
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>

                    {/* ROW 2: Cost Estimates & Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="lg:col-span-2">
                            {/* Cost Estimates Block */}
                            <Card className="h-full rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-accent">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                    <DollarOutlined />
                                    Thông tin báo giá
                                </h3>
                                {orderDetail.cost_estimate && orderDetail.cost_estimate.filter(x => x.is_active).length > 0 ? (
                                    <div className={`grid gap-4 max-h-[500px] overflow-y-auto pr-1 ${orderDetail.cost_estimate.filter(x => x.is_active).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {orderDetail.cost_estimate.filter(x => x.is_active).map((estimate, index) => {
                                            const hasNote = orderDetail.reason?.includes(`Báo giá ${index + 1}:`);
                                            return (
                                                <div key={estimate.estimate_id} className={`p-4 rounded-xl border ${hasNote ? 'bg-yellow-50 border-yellow-300' : 'bg-slate-50 border-slate-100'}`}>
                                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                                        <Tag className={`m-0 border-0 font-medium px-2 rounded ${hasNote ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-50 text-blue-600'}`}>Báo giá #{index + 1}</Tag>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm">Loại giấy:</span>
                                                        <span className="font-medium text-slate-800 text-sm">{estimate.paper_name || "Chưa xác định"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm">Loại phủ:</span>
                                                        <span className="font-medium text-slate-800 text-sm">{formatCoatingType(estimate.coating_type)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm">Đặt cọc:</span>
                                                        <span className="font-semibold text-accent-dark">{formatCurrency(estimate.deposit_amount)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-slate-500 text-sm font-medium">Tổng chi phí:</span>
                                                        <span className="font-bold text-lg text-accent-dark">{formatCurrency(estimate.final_total_cost)}</span>
                                                    </div>
                                                    {estimate.process_cost && estimate.process_cost.length > 0 && (
                                                        <Collapse ghost size="small" expandIconPosition="end" className="bg-white border border-slate-200 rounded-lg">
                                                            <Panel header={<span className="text-xs font-medium text-slate-600">Chi tiết phí sản xuất</span>} key="1" className="p-0 border-0">
                                                                <div className="space-y-2 py-1">
                                                                    {estimate.process_cost.map(proc => (
                                                                        <div key={proc.process_cost_id} className="flex justify-between items-center">
                                                                            <span className="text-slate-500 text-xs">{formatProcess(proc.process_code)}</span>
                                                                            <span className="text-slate-800 text-xs font-semibold">{formatCurrency(proc.cost)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </Panel>
                                                        </Collapse>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                ) : (
                                    <div className="text-center py-6">
                                        <Text className="text-slate-400 text-sm italic">Chưa có báo giá nào</Text>
                                    </div>
                                )}
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {/* mô tả yêu cầu */}
                                    <Card className="rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-primary">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                                        <FileTextOutlined />
                                                        Mô tả yêu cầu
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="text-slate-700 text-sm leading-relaxed bg-white border border-slate-200 rounded-lg p-3">
                                                {orderDetail.description || "Không có mô tả"}
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Ghi chú của consultant */}
                                    {orderDetail.consultant_note && (
                                        <Card className="mt-6 rounded-2xl border border-blue-100 shadow-sm border-t-4 border-t-blue-400 bg-blue-50/30 pb-0">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-blue-800 mb-4 flex items-center gap-2">
                                                            <FileTextOutlined className="text-blue-500" />
                                                            Ghi chú của Consultant
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-slate-700 text-sm leading-relaxed bg-white border border-blue-200 rounded-lg p-3 whitespace-pre-wrap">
                                                    {orderDetail.consultant_note}
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Yêu cầu chỉnh sửa từ quản lý */}
                                    {orderDetail.reason && (
                                        <Card className="mt-6 border-orange-200 bg-orange-50/30">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-orange-800 mb-4 flex items-center gap-2">
                                                            <FileTextOutlined className="text-orange-500" />
                                                            Yêu cầu chỉnh sửa của quản lý
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-slate-700 text-sm leading-relaxed bg-white border border-orange-200 rounded-lg p-3 space-y-2">
                                                    {orderDetail.reason.split(';').filter((r) => r.trim() !== '').map((line, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <span className="text-orange-500 mt-0.5">•</span>
                                                            <span className="font-medium text-slate-800">{line.trim()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Mobile Back Button */}
                <div className="mt-8 flex justify-center lg:hidden">
                    <Button
                        size="large"
                        onClick={() => router.back()}
                        className="h-12 px-8 rounded-xl font-medium border-slate-300 text-slate-600 hover:border-slate-800 hover:text-slate-800"
                    >
                        Quay lại danh sách
                    </Button>
                </div>

                <style jsx global>{`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translate3d(0, 20px, 0); }
                        to { opacity: 1; transform: translate3d(0, 0, 0); }
                    }
                    .animate-fade-in-up {
                        animation: fadeInUp 0.4s ease-out forwards;
                    }

                    /* Custom Scrollbar for compact lists */
                    .overflow-y-auto::-webkit-scrollbar { width: 4px; }
                    .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
                    .overflow-y-auto::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                    
                    /* Clean up AntD Collapse padding manually if needed */
                    .ant-collapse-ghost > .ant-collapse-item > .ant-collapse-header { padding: 8px 12px; }
                    .ant-collapse-content > .ant-collapse-content-box { padding: 4px 12px 12px; }
                `}</style>
            </div>
        </div>
    );
}