"use client";

import axios from "@/apiRequests/axios";
import { materialsApi } from "@/apiRequests/materials";
import { requestOrderApi } from "@/apiRequests/request";
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { formatCoatingType, formatProcess } from "@/lib/estimationUtils";
import { RequestDetailResponse } from "@/lib/request.types";
import {
    CheckOutlined,
    DollarOutlined,
    DownloadOutlined,
    EditOutlined,
    FileImageOutlined,
    FileTextOutlined,
    ShoppingOutlined,
    UserOutlined
} from "@ant-design/icons";
import {
    Button,
    Card,
    Collapse,
    Descriptions,
    Divider,
    Empty,
    Input,
    message,
    Popconfirm,
    Popover,
    Skeleton,
    Tag,
    Typography
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

const maskPhone = (phone?: string) => {
    if (!phone) return "";
    if (phone.length <= 6) return phone;
    return phone.slice(0, 3) + "****" + phone.slice(-3);
};

const maskEmail = (email?: string) => {
    if (!email) return "";
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [name, domain] = parts;
    const visibleLength = name.length <= 3 ? 1 : 3;
    return name.slice(0, visibleLength) + "***@" + domain;
};

export default function ManagerRequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [orderDetail, setOrderDetail] = useState<RequestDetailResponse | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const [noteMode, setNoteMode] = useState(false);
    const [estimateNotes, setEstimateNotes] = useState<Record<number, {
        paper_name?: string;
        paper_code?: string;
        coating_type?: string;
        deposit_amount?: string;
        final_total_cost?: string;
        general_note?: string;
    }>>({});

    const [paperTypes, setPaperTypes] = useState<{ code: string; name: string; stock: number; value: string }[]>([]);

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

        const fetchPaperTypes = async () => {
            try {
                const response = await materialsApi.getAllPaperTypes();
                if (response?.paperTypes && Array.isArray(response.paperTypes)) {
                    setPaperTypes(
                        response.paperTypes.map((pt: any) => ({
                            code: pt.code,
                            name: pt.name,
                            stock: pt.stockQty || 0,
                            value: pt.code,
                        }))
                    );
                }
            } catch (error) {
                console.error("Error fetching paper types:", error);
            }
        };

        fetchOrderDetail();
        fetchPaperTypes();
    }, [requestId]);

    const handleNoteChange = (index: number, field: string, value: string) => {
        setEstimateNotes(prev => ({
            ...prev,
            [index]: {
                ...(prev[index] || {}),
                [field]: value
            }
        }));
    };

    const handleApproval = async (status: 'Verified' | 'Declined') => {
        if (!requestId) return;

        let finalNote = "";
        if (status === 'Declined') {
            const notesArray: string[] = [];
            Object.keys(estimateNotes).forEach((key) => {
                const index = parseInt(key);
                const notes = estimateNotes[index];
                if (!notes) return;

                const details = [];
                if (notes.paper_name?.trim()) details.push(`Loại giấy: ${notes.paper_name.trim()}`);
                if (notes.coating_type?.trim()) details.push(`Loại phủ: ${formatCoatingType(notes.coating_type.trim())}`);
                if (notes.deposit_amount?.trim()) details.push(`Đặt cọc: ${notes.deposit_amount.trim()}`);
                if (notes.final_total_cost?.toString().trim()) {
                    const costNum = Number(notes.final_total_cost);
                    const costStr = !isNaN(costNum) ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(costNum) : notes.final_total_cost;
                    details.push(`Tổng chi phí: ${costStr}`);
                }
                if (notes.general_note?.trim()) details.push(`Ghi chú: ${notes.general_note.trim()}`);

                if (details.length > 0) {
                    notesArray.push(`Báo giá ${index + 1}: ${details.join(' | ')}`);
                }
            });

            if (notesArray.length === 0) {
                message.error("Vui lòng nhập ít nhất một thay đổi hoặc ghi chú trước khi xác nhận.");
                return;
            }
            finalNote = notesArray.join("; ");
        }

        const actionText = status === 'Verified' ? "Duyệt yêu cầu" : "Yêu cầu chỉnh sửa";

        setActionLoading(true);
        try {
            await requestOrderApi.approval({
                request_id: Number(requestId),
                note: finalNote,
                status: status
            });
            message.success(status === 'Verified' ? "Đã duyệt yêu cầu thành công" : "Đã gửi yêu cầu chỉnh sửa");
            if (status === 'Declined') {
                setNoteMode(false);
            }
            router.push('/manager/requests-processing');
        } catch (error) {
            console.error(`Error ${status} request:`, error);
            message.error(`Có lỗi xảy ra khi ${actionText.toLowerCase()}, vui lòng thử lại`);
        } finally {
            setActionLoading(false);
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const downloadAllDesignFiles = () => {
        if (!orderDetail.design_file_path) return;

        orderDetail.design_file_path.split(',').forEach((url) => {
            const trimmedUrl = url.trim();
            window.open(trimmedUrl, '_blank');
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Declined': return 'blue';
            case 'Accepted': return 'green';
            case 'Rejected': return 'red';
            case 'Waiting': return 'orange';
            case 'Processing': return 'cyan';
            default: return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'Waiting': return 'Chờ Khách hàng xác nhận';
            case 'Processing': return 'Đang xử lý';
            case 'Declined': return 'Đơn mới';
            case 'Accepted': return 'Đã xác nhận';
            case 'Rejected': return 'Đã hủy';
            default: return status;
        }
    };

    return (
        <div className="min-h-screen pb-8 bg-slate-50/30">
            <div className="max-w-7xl mx-auto px-2  animate-fade-in-up">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-4">
                    <div>
                        <div className="flex items-center gap-2 ">
                            <h1 className="m-0 text-2xl font-bold text-slate-800 tracking-tight">Yêu cầu #{orderDetail.request_id}</h1>
                            <Tag color={getStatusColor(orderDetail.process_status)} className="rounded-full border-0 px-3 py-0.5 font-medium m-0">
                                {getStatusText(orderDetail.process_status)}
                            </Tag>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {noteMode ? (
                            <>
                                <Button onClick={() => setNoteMode(false)} block className="rounded-lg text-sm font-medium h-auto py-2">
                                    Hủy bỏ
                                </Button>
                                <Popconfirm
                                    title={<span className="text-lg font-medium">Xác nhận yêu cầu chỉnh sửa ?</span>}
                                    onConfirm={() => handleApproval('Declined')}
                                    okText="Xác nhận"
                                    cancelText="Hủy"
                                >
                                    <Button type="primary" block className="rounded-lg text-sm font-medium h-auto py-2 bg-slate-800 hover:bg-slate-700 shadow-none border-0" loading={actionLoading}>
                                        Xác nhận yêu cầu chỉnh sửa
                                    </Button>
                                </Popconfirm>
                            </>
                        ) : (
                            <>
                                <Button icon={<EditOutlined />} onClick={() => setNoteMode(true)} danger block className="rounded-lg text-sm font-medium h-auto py-2">
                                    Yêu cầu chỉnh sửa
                                </Button>
                                <Popconfirm
                                    title={<span className="text-lg font-medium">Duyệt yêu cầu?</span>}
                                    onConfirm={() => handleApproval('Verified')}
                                    icon={<CheckOutlined style={{ color: "#1890ff", width: "30px", height: "30px", display: "flex", justifyContent: "center", alignItems: "center" }} />}
                                    okText="Duyệt"
                                    cancelText="Hủy"
                                    okButtonProps={{ className: "bg-primary text-sm font-medium h-auto py-2 shadow-none border-0" }}
                                    cancelButtonProps={{ className: "bg-slate-800 hover:bg-slate-700 text-sm font-medium h-auto py-2 shadow-none border-0" }}
                                >
                                    <Button icon={<CheckOutlined />} block className="rounded-lg bg-primary text-sm font-medium h-auto py-2 shadow-none border-0" loading={actionLoading}>
                                        Duyệt yêu cầu
                                    </Button>
                                </Popconfirm>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {/* ROW 1: Summary & Design Files */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="lg:col-span-2">
                            <Card className="h-full rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-primary" bodyStyle={{ padding: '24px' }}>
                                {/* Customer Section */}
                                <div className="mb-6">
                                    <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                        <UserOutlined />
                                        Thông tin khách hàng
                                    </h3>
                                    <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} className="text-sm" labelStyle={{ color: '#64748b' }}>
                                        <Descriptions.Item label="Họ tên"><Text strong className="text-slate-800">{orderDetail.customer_name}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Điện thoại"><Text strong className="text-slate-800">{maskPhone(orderDetail.customer_phone)}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Email"><Text strong className="text-slate-800 truncate" style={{ maxWidth: 180 }} title={maskEmail(orderDetail.email)}>{maskEmail(orderDetail.email)}</Text></Descriptions.Item>
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
                                        <Descriptions.Item label="Kích thước" span={1}><Text strong className="text-slate-800">{orderDetail.product_length_mm || 0} x {orderDetail.product_width_mm || 0} x {orderDetail.product_height_mm || 0} mm</Text></Descriptions.Item>
                                        <Descriptions.Item label="Số lượng" span={1}><Text strong className="text-slate-800 text-base">{orderDetail.quantity.toLocaleString("vi-VN")}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Dự kiến" span={1}><Text strong className="text-slate-800">{dayjs(orderDetail.delevery_date).isValid() ? dayjs(orderDetail.delevery_date).format("DD/MM/YYYY") : "Chưa xác định"}</Text></Descriptions.Item>
                                        {orderDetail.product_type && <Descriptions.Item label="Kiểu hộp" span={1}><Text strong className="text-slate-800">{orderDetail.product_type}</Text></Descriptions.Item>}
                                        {orderDetail.paper_name && <Descriptions.Item label="Loại giấy" span={1}><Text strong className="text-slate-800">{orderDetail.paper_name}</Text></Descriptions.Item>}
                                        {orderDetail.coating_type && orderDetail.coating_type !== "NONE" && <Descriptions.Item label="Loại phủ" span={1}><Text strong className="text-slate-800">{formatCoatingType(orderDetail.coating_type)}</Text></Descriptions.Item>}
                                        {orderDetail.wave_type && orderDetail.wave_type !== "NONE" && <Descriptions.Item label="Kiểu sóng" span={1}><Text strong className="text-slate-800">{orderDetail.wave_type}</Text></Descriptions.Item>}
                                        {orderDetail.number_of_plates > 0 && <Descriptions.Item label="Số kẽm" span={1}><Text strong className="text-slate-800">{orderDetail.number_of_plates}</Text></Descriptions.Item>}
                                        {orderDetail.is_one_side_box !== undefined && orderDetail.is_one_side_box !== null && <Descriptions.Item label="In 1 mặt" span={1}><Text strong className="text-slate-800">{orderDetail.is_one_side_box ? "Có" : "Không"}</Text></Descriptions.Item>}
                                        {orderDetail.glue_tab_mm > 0 && <Descriptions.Item label="Lề dán" span={1}><Text strong className="text-slate-800">{orderDetail.glue_tab_mm} mm</Text></Descriptions.Item>}
                                        {orderDetail.bleed_mm > 0 && <Descriptions.Item label="Tràn lề" span={1}><Text strong className="text-slate-800">{orderDetail.bleed_mm} mm</Text></Descriptions.Item>}
                                        {orderDetail.print_width_mm > 0 && orderDetail.print_height_mm > 0 && <Descriptions.Item label="Kích thước in" span={1}><Text strong className="text-slate-800">{orderDetail.print_width_mm} x {orderDetail.print_height_mm} mm</Text></Descriptions.Item>}
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
                                                <span className="text-xs text-gray-400">Không có file</span>
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
                                            <span className="text-xs text-gray-400">Không có file</span>
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
                            <Card className="h-full rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-accent">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                    <DollarOutlined />
                                    Thông tin báo giá
                                </h3>
                                {orderDetail.cost_estimate && orderDetail.cost_estimate.filter(x => x.is_active).length > 0 ? (
                                    <div className={`grid gap-4 max-h-[500px] overflow-y-auto pr-1 ${orderDetail.cost_estimate.filter(x => x.is_active).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                        {orderDetail.cost_estimate.filter(x => x.is_active).map((estimate, index) => (
                                            <div key={estimate.estimate_id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                                    <Tag className="m-0 border-0 bg-blue-50 text-blue-600 font-medium px-2 rounded">Báo giá #{index + 1}</Tag>
                                                </div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-slate-500 text-sm whitespace-nowrap">Loại giấy:</span>
                                                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                                        <span className={`font-medium text-slate-800 text-sm text-right ${noteMode ? 'text-slate-400' : ''}`}>{estimate.paper_name || "Chưa xác định"}</span>
                                                        {noteMode && (
                                                            <Popover
                                                                content={
                                                                    <TextArea
                                                                        rows={3}
                                                                        placeholder="Ghi chú thay đổi..."
                                                                        className="w-64 text-xs font-normal"
                                                                        value={estimateNotes[index]?.paper_name || ''}
                                                                        onChange={(e) => handleNoteChange(index, 'paper_name', e.target.value)}
                                                                    />
                                                                }
                                                                title={<span className="text-xs">Chỉnh sửa loại giấy</span>}
                                                                trigger="click"
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    type={estimateNotes[index]?.paper_name ? "primary" : "default"}
                                                                    icon={<EditOutlined />}
                                                                />
                                                            </Popover>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-slate-500 text-sm whitespace-nowrap">Loại phủ:</span>
                                                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                                        <span className={`font-medium text-slate-800 text-sm text-right ${noteMode ? ' text-slate-400' : ''}`}>{formatCoatingType(estimate.coating_type)}</span>
                                                        {noteMode && (
                                                            <Popover
                                                                content={
                                                                    <TextArea
                                                                        rows={3}
                                                                        placeholder="Ghi chú thay đổi..."
                                                                        className="w-64 text-xs font-normal"
                                                                        value={estimateNotes[index]?.coating_type || ''}
                                                                        onChange={(e) => handleNoteChange(index, 'coating_type', e.target.value)}
                                                                    />
                                                                }
                                                                title={<span className="text-xs">Chỉnh sửa loại phủ</span>}
                                                                trigger="click"
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    type={estimateNotes[index]?.coating_type ? "primary" : "default"}
                                                                    icon={<EditOutlined />}
                                                                />
                                                            </Popover>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-slate-500 text-sm whitespace-nowrap">Đặt cọc:</span>
                                                    <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                                        <span className={`font-semibold text-accent-dark text-right ${noteMode ? 'opacity-50' : ''}`}>{formatCurrency(estimate.deposit_amount)}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-slate-500 text-sm font-medium whitespace-nowrap">Tổng chi phí:</span>
                                                    <div className="flex  items-center justify-end gap-x-2 gap-y-1">
                                                        <span className={`font-bold text-lg text-accent-dark text-right ${noteMode ? 'opacity-50' : ''}`}>{formatCurrency(estimate.final_total_cost)}</span>
                                                        {noteMode && (
                                                            <Popover
                                                                content={
                                                                    <TextArea
                                                                        rows={3}
                                                                        placeholder="Ghi chú thay đổi..."
                                                                        className="w-64 text-xs font-normal"
                                                                        value={estimateNotes[index]?.final_total_cost || ''}
                                                                        onChange={(e: any) => handleNoteChange(index, 'final_total_cost', e.target.value ? String(e.target.value) : '')}
                                                                    />
                                                                }
                                                                title={<span className="text-xs">Chỉnh sửa tổng chi phí</span>}
                                                                trigger="click"
                                                            >
                                                                <Button
                                                                    size="small"
                                                                    type={estimateNotes[index]?.final_total_cost ? "primary" : "default"}
                                                                    icon={<EditOutlined />}
                                                                />
                                                            </Popover>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Material Costs Block (if any exist) */}
                                                {(estimate.paper_cost > 0 || estimate.ink_cost > 0 || estimate.coating_glue_cost > 0 || estimate.mounting_glue_cost > 0 || estimate.lamination_cost > 0) && (
                                                    <Collapse ghost size="small" expandIconPosition="end" className="bg-white border border-slate-200 rounded-lg mb-2">
                                                        <Panel header={<span className="text-xs font-medium text-slate-600">Chi tiết phí vật tư</span>} key="materials" className="p-0 border-0">
                                                            <div className="space-y-2 py-1">
                                                                {estimate.paper_cost > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 text-xs">Phí giấy</span>
                                                                        <span className="text-slate-800 text-xs font-semibold">{formatCurrency(estimate.paper_cost)}</span>
                                                                    </div>
                                                                )}
                                                                {estimate.ink_cost > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 text-xs">Phí mực</span>
                                                                        <span className="text-slate-800 text-xs font-semibold">{formatCurrency(estimate.ink_cost)}</span>
                                                                    </div>
                                                                )}
                                                                {estimate.coating_glue_cost > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 text-xs">Phí keo phủ</span>
                                                                        <span className="text-slate-800 text-xs font-semibold">{formatCurrency(estimate.coating_glue_cost)}</span>
                                                                    </div>
                                                                )}
                                                                {estimate.mounting_glue_cost > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 text-xs">Phí keo bồi</span>
                                                                        <span className="text-slate-800 text-xs font-semibold">{formatCurrency(estimate.mounting_glue_cost)}</span>
                                                                    </div>
                                                                )}
                                                                {estimate.lamination_cost > 0 && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 text-xs">Phí màng/keo cán</span>
                                                                        <span className="text-slate-800 text-xs font-semibold">{formatCurrency(estimate.lamination_cost)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Panel>
                                                    </Collapse>
                                                )}

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
                                                {noteMode && (
                                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                                        <span className="text-slate-500 text-sm mb-2 block font-medium">Ghi chú thêm:</span>
                                                        <TextArea
                                                            rows={2}
                                                            placeholder="Nhập ghi chú thêm cho báo giá này..."
                                                            value={estimateNotes[index]?.general_note || ''}
                                                            onChange={(e) => handleNoteChange(index, 'general_note', e.target.value)}
                                                            className="text-sm rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
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
                                    <Card className="rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-primary">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-sm uppercase tracking-wider font-bold text-primary flex items-center gap-2 m-0">
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

                                    {orderDetail.consultant_note && (
                                        <Card className="mt-4 rounded-2xl border border-blue-100 shadow-sm border-t-4 border-t-blue-400 bg-blue-50/30 pb-0">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-blue-800 flex items-center gap-2 m-0">
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
                                </div>
                            </div>
                        </div>
                    </div>
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
