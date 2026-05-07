"use client";

import axios from "@/apiRequests/axios";
import { materialsApi } from "@/apiRequests/materials";
import { requestOrderApi } from "@/apiRequests/request";
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { formatCoatingType, formatProcess } from "@/lib/estimationUtils";
import { RequestDetailResponse } from "@/lib/request.types";
import {
    CheckOutlined,
    CreditCardOutlined,
    DollarOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
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
    Modal,
    Popconfirm,
    Popover,
    Skeleton,
    Space,
    Spin,
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

    const [isContractModalVisible, setIsContractModalVisible] = useState(false);
    const [checkingContract, setCheckingContract] = useState(false);

    const [noteMode, setNoteMode] = useState(false);
    const [managerNote, setManagerNote] = useState("");
    const [estimateNotes, setEstimateNotes] = useState<Record<number, {
        paper_name?: string;
        paper_code?: string;
        coating_type?: string;
        deposit_amount?: string;
        final_total_cost?: string;
        general_note?: string;
    }>>({});

    const [paperTypes, setPaperTypes] = useState<{ code: string; name: string; stock: number; value: string }[]>([]);
    const [viewOnlyContract, setViewOnlyContract] = useState<{ path: string, title: string } | null>(null);

    // Fetch order detail from API
    useEffect(() => {
        const fetchOrderDetail = async () => {
            if (!requestId) return;

            setLoading(true);
            try {
                const response = await requestOrderApi.getRequestDetailbyConsultant(requestId);
                const orderData = response?.data || response;

                if (orderData) {
                    // Parse ink_type_names: API trả về string "A,B,C", cần convert thành array
                    const parsed = { ...orderData };
                    if (typeof parsed.ink_type_names === 'string' && parsed.ink_type_names) {
                        parsed.ink_type_names = parsed.ink_type_names.split(',').map((s: string) => s.trim()).filter(Boolean);
                    } else if (!parsed.ink_type_names) {
                        parsed.ink_type_names = [];
                    }
                    if (Array.isArray(parsed.cost_estimate)) {
                        parsed.cost_estimate = parsed.cost_estimate.map((e: any) => ({
                            ...e,
                            ink_type_names: typeof e.ink_type_names === 'string' && e.ink_type_names
                                ? e.ink_type_names.split(',').map((s: string) => s.trim()).filter(Boolean)
                                : (Array.isArray(e.ink_type_names) ? e.ink_type_names : [])
                        }));
                    }
                    setOrderDetail(parsed);
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

    const handleContractCheck = async (isCheck: boolean) => {
        if (!requestId) return;

        let note = "";
        if (!isCheck) {
            note = window.prompt("Nhập lý do từ chối hợp đồng:") || "";
            if (!note) {
                message.error("Vui lòng nhập lý do từ chối");
                return;
            }
        }

        setCheckingContract(true);
        try {
            await requestOrderApi.contractCheckStatus({
                request_id: Number(requestId),
                is_check_contract: isCheck,
                note: note
            });
            message.success(isCheck ? "Đã duyệt hợp đồng thành công" : "Đã từ chối hợp đồng");
            setIsContractModalVisible(false);
            window.location.reload();
        } catch (error) {
            console.error("Error checking contract:", error);
            message.error("Có lỗi xảy ra khi duyệt hợp đồng, vui lòng thử lại");
        } finally {
            setCheckingContract(false);
        }
    };

    const handleApproval = async (status: 'Verified' | 'Declined') => {
        if (!requestId) return;

        let finalNote = "";
        if (status === 'Verified') {
            finalNote = managerNote.trim();
        } else if (status === 'Declined') {
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

            if (managerNote.trim()) {
                notesArray.push(`Lời nhắn chung: ${managerNote.trim()}`);
            }

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
            case 'Processing': return 'Đang chờ duyệt';
            case 'Verified': return 'Đã duyệt';
            case 'Declined': return 'Đơn mới';
            case 'Accepted': return 'Đã xác nhận';
            case 'Rejected': return 'Đã hủy';
            default: return status;
        }
    };

    const contractPath = orderDetail?.customer_signed_contract_path || orderDetail?.cost_estimate?.find(e => e.is_active)?.customer_signed_contract_path;

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
                        {/* {orderDetail.process_status === 'Accepted' && contractPath && (
                            <Button icon={<FileTextOutlined />} type="primary" onClick={() => setIsContractModalVisible(true)} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-sm font-medium h-auto py-2 shadow-none border-0">
                                Xem hợp đồng khách ký
                            </Button>
                        )} */}
                        {orderDetail.process_status === 'Processing' && (
                            noteMode ? (
                                <>
                                    <button 
                                        onClick={() => setNoteMode(false)} 
                                        className="w-full rounded-lg text-sm font-medium h-auto py-2 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <Popconfirm
                                        title={<span className="text-lg font-medium">Xác nhận yêu cầu chỉnh sửa ?</span>}
                                        onConfirm={() => handleApproval('Declined')}
                                        okText="Xác nhận"
                                        cancelText="Hủy"
                                    >
                                        <button 
                                            type="button" 
                                            className="w-full flex justify-center items-center gap-2 rounded-lg text-sm font-medium h-auto py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white shadow-sm transition-colors disabled:opacity-50" 
                                            disabled={actionLoading}
                                        >
                                            {actionLoading && <Spin size="small" />}
                                            Xác nhận yêu cầu chỉnh sửa
                                        </button>
                                    </Popconfirm>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => setNoteMode(true)} 
                                        className="w-full flex justify-center items-center gap-2 rounded-lg text-sm font-medium h-auto py-2 px-4 bg-white border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <EditOutlined />
                                        Yêu cầu chỉnh sửa
                                    </button>
                                    <Popconfirm
                                        title={<span className="text-lg font-medium">Duyệt yêu cầu?</span>}
                                        onConfirm={() => handleApproval('Verified')}
                                        icon={<CheckOutlined style={{ color: "#1890ff", width: "30px", height: "30px", display: "flex", justifyContent: "center", alignItems: "center" }} />}
                                        okText="Duyệt"
                                        cancelText="Hủy"
                                        okButtonProps={{ className: "bg-primary text-sm font-medium h-auto py-2 shadow-none border-0" }}
                                        cancelButtonProps={{ className: "bg-slate-800 hover:bg-slate-700 text-sm font-medium h-auto py-2 shadow-none border-0" }}
                                    >
                                        <button 
                                            type="button" 
                                            className="w-full flex justify-center items-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium h-auto py-2 px-4 shadow-sm transition-colors disabled:opacity-50" 
                                            disabled={actionLoading}
                                        >
                                            {actionLoading ? <Spin size="small" /> : <CheckOutlined />}
                                            Duyệt yêu cầu
                                        </button>
                                    </Popconfirm>
                                </>
                            )
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6">

                    {/* ROW 1: Cost Estimates & Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                        <div className="lg:col-span-2">
                            <Card className="h-full rounded-2xl border border-slate-200 shadow-sm border-t-4 border-t-accent">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-primary mb-4 flex items-center gap-2">
                                    <DollarOutlined />
                                    Thông tin báo giá
                                </h3>
                                {orderDetail.cost_estimate && (
                                    <div className="space-y-6">
                                        {/* Active Estimates */}
                                        {orderDetail.cost_estimate.filter(x => x.is_active).length > 0 ? (
                                            <div className={`grid gap-4 max-h-[500px] overflow-y-auto pr-1 ${orderDetail.cost_estimate.filter(x => x.is_active).length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                                {orderDetail.cost_estimate.filter(x => x.is_active).sort((a, b) => a.estimate_id - b.estimate_id).map((estimate, index) => {
                                                    const prevEstimate = estimate.previous_estimate_id
                                                        ? orderDetail.cost_estimate.find((e: any) => e.estimate_id === estimate.previous_estimate_id)
                                                        : null;

                                                    const renderDiff = (oldVal: any, newVal: any, formatFn?: any, defaultVal: string = "") => {
                                                        const formattedOld = formatFn ? formatFn(oldVal) : (oldVal || defaultVal);
                                                        const formattedNew = formatFn ? formatFn(newVal) : (newVal || defaultVal);

                                                        if (prevEstimate && oldVal !== newVal) {
                                                            return (
                                                                <span className="flex items-center justify-end gap-1.5 flex-nowrap">
                                                                    <span className="line-through text-red-500 text-xs opacity-70 font-normal">{formattedOld}</span>
                                                                    <span className="font-semibold text-green-600 flex items-center gap-1">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                                        {formattedNew}
                                                                    </span>
                                                                </span>
                                                            );
                                                        }
                                                        return <span>{formattedNew}</span>;
                                                    };

                                                    return (
                                                        <div key={estimate.estimate_id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                                                <Tag className="m-0 border-0 bg-blue-50 text-blue-600 font-medium px-2 rounded">Báo giá #{index + 1}</Tag>
                                                            </div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-slate-500 text-sm font-medium whitespace-nowrap">Tổng chi phí:</span>
                                                                <div className="flex items-center justify-end gap-x-2 gap-y-1">
                                                                    <span className={`font-bold text-lg text-accent-dark text-right ${noteMode ? 'opacity-50' : ''}`}>
                                                                        {renderDiff(prevEstimate?.final_total_cost, estimate.final_total_cost, formatCurrency, "0")}
                                                                    </span>
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
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-slate-500 text-sm whitespace-nowrap">Đặt cọc:</span>
                                                                <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                                                    <span className={`font-semibold text-accent-dark text-right ${noteMode ? 'opacity-50' : ''}`}>
                                                                        {renderDiff(prevEstimate?.deposit_amount, estimate.deposit_amount, formatCurrency, "0")}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-slate-500 text-sm whitespace-nowrap">Loại giấy:</span>
                                                                <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                                                                    <span className={`font-medium text-slate-800 text-sm text-right ${noteMode ? 'text-slate-400' : ''}`}>
                                                                        {renderDiff(prevEstimate?.paper_name, estimate.paper_name, null, "Chưa xác định")}
                                                                    </span>
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
                                                                    <span className={`font-medium text-slate-800 text-sm text-right ${noteMode ? ' text-slate-400' : ''}`}>
                                                                        {renderDiff(prevEstimate?.coating_type, estimate.coating_type, formatCoatingType, "Chưa xác định")}
                                                                    </span>
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
                                                            {/* {estimate.ink_type_names && estimate.ink_type_names.length > 0 && (
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-slate-500 text-sm whitespace-nowrap">Loại mực:</span>
                                                                    <div className="flex flex-wrap items-center justify-end gap-1">
                                                                        {estimate.ink_type_names.map((ink, idx) => (
                                                                            <Tag key={idx} color="blue" className="m-0 border-0 rounded px-1.5 text-[11px] h-5 flex items-center">{ink}</Tag>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )} */}

                                                            {(estimate.customer_signed_contract_path || estimate.consultant_contract_path) && (
                                                                <div className="flex justify-between items-center mb-2">
                                                                    <span className="text-slate-500 text-sm whitespace-nowrap">Hợp đồng:</span>
                                                                    <div className="flex items-center gap-2">
                                                                        <Tag color="cyan" className="m-0 border-0 rounded px-1.5 text-[11px] h-5 flex items-center">
                                                                            {estimate.customer_signed_contract_path ? "Đã ký" : "Bản thảo"}
                                                                        </Tag>
                                                                        <Button 
                                                                            size="small" 
                                                                            icon={<EyeOutlined />} 
                                                                            onClick={() => setViewOnlyContract({ 
                                                                                path: estimate.customer_signed_contract_path || estimate.consultant_contract_path, 
                                                                                title: `Hợp đồng báo giá #${index + 1}` 
                                                                            })}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Material Costs Block (if any exist) */}
                                                            {(estimate.paper_cost > 0 || estimate.ink_cost > 0 || estimate.coating_glue_cost > 0 || estimate.mounting_glue_cost > 0 || estimate.lamination_cost > 0) && (
                                                                <Collapse ghost size="small" expandIconPosition="end" className="bg-white border border-slate-200 rounded-lg mb-2">
                                                                    <Panel header={<span className="text-xs font-medium text-slate-600">Chi tiết phí vật tư</span>} key="materials" className="p-0 border-0">
                                                                        <div className="space-y-2 py-1">
                                                                            {estimate.paper_cost > 0 && (
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-slate-500 text-xs">Phí giấy</span>
                                                                                    <span className="text-slate-800 text-xs font-semibold">
                                                                                        {renderDiff(prevEstimate?.paper_cost, estimate.paper_cost, formatCurrency, "0")}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {estimate.ink_cost > 0 && (
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-slate-500 text-xs">Phí mực</span>
                                                                                    <span className="text-slate-800 text-xs font-semibold">
                                                                                        {renderDiff(prevEstimate?.ink_cost, estimate.ink_cost, formatCurrency, "0")}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {estimate.coating_glue_cost > 0 && (
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-slate-500 text-xs">Phí keo phủ</span>
                                                                                    <span className="text-slate-800 text-xs font-semibold">
                                                                                        {renderDiff(prevEstimate?.coating_glue_cost, estimate.coating_glue_cost, formatCurrency, "0")}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {estimate.mounting_glue_cost > 0 && (
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-slate-500 text-xs">Phí keo bồi</span>
                                                                                    <span className="text-slate-800 text-xs font-semibold">
                                                                                        {renderDiff(prevEstimate?.mounting_glue_cost, estimate.mounting_glue_cost, formatCurrency, "0")}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            {estimate.lamination_cost > 0 && (
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-slate-500 text-xs">Phí màng/keo cán</span>
                                                                                    <span className="text-slate-800 text-xs font-semibold">
                                                                                        {renderDiff(prevEstimate?.lamination_cost, estimate.lamination_cost, formatCurrency, "0")}
                                                                                    </span>
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
                                                                            {estimate.process_cost.map(proc => {
                                                                                const prevProc = prevEstimate ? prevEstimate.process_cost?.find((p: any) => p.process_code === proc.process_code) : null;
                                                                                return (
                                                                                    <div key={proc.process_cost_id} className="flex justify-between items-center">
                                                                                        <span className="text-slate-500 text-xs">{formatProcess(proc.process_code)}</span>
                                                                                        <span className="text-slate-800 text-xs font-semibold">
                                                                                            {renderDiff(prevProc?.cost, proc.cost, formatCurrency, "0")}
                                                                                        </span>
                                                                                    </div>
                                                                                )
                                                                            })}
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
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6">
                                                <Text className="text-slate-400 text-sm italic">Chưa có báo giá hiện tại</Text>
                                            </div>
                                        )}

                                        {/* Inactive Estimates History */}
                                        {orderDetail.cost_estimate.filter(x => !x.is_active).length > 0 && (
                                            <div className="mt-4">
                                                <Collapse
                                                    ghost
                                                    className="bg-slate-50 rounded-xl border border-dashed border-slate-300"
                                                    expandIconPosition="end"
                                                >
                                                    <Panel
                                                        header={
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-600 font-bold uppercase text-xs tracking-wider">Lịch sử thay đổi báo giá</span>
                                                                <Tag color="default" className="m-0 rounded-full border-0 text-[10px]">
                                                                    {orderDetail.cost_estimate.filter(x => !x.is_active).length} bản cũ
                                                                </Tag>
                                                            </div>
                                                        }
                                                        key="history"
                                                    >
                                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                                            {orderDetail.cost_estimate
                                                                .filter(x => !x.is_active)
                                                                .sort((a, b) => b.estimate_id - a.estimate_id) // Show newest inactive first
                                                                .map((estimate, idx) => {
                                                                    const prevEstimate = estimate.previous_estimate_id
                                                                        ? orderDetail.cost_estimate.find((e: any) => e.estimate_id === estimate.previous_estimate_id)
                                                                        : null;

                                                                    const renderDiffHistory = (oldVal: any, newVal: any, formatFn?: any, defaultVal: string = "") => {
                                                                        const formattedOld = formatFn ? formatFn(oldVal) : (oldVal || defaultVal);
                                                                        const formattedNew = formatFn ? formatFn(newVal) : (newVal || defaultVal);

                                                                        if (prevEstimate && oldVal !== newVal) {
                                                                            return (
                                                                                <span className="flex items-center justify-end gap-1.5 flex-nowrap">
                                                                                    <span className="line-through text-red-500 text-[10px] opacity-70 font-normal">{formattedOld}</span>
                                                                                    <span className="font-semibold text-green-600 flex items-center gap-1 text-[11px]">
                                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                                                                        {formattedNew}
                                                                                    </span>
                                                                                </span>
                                                                            );
                                                                        }
                                                                        return <span>{formattedNew}</span>;
                                                                    };

                                                                    return (
                                                                        <div key={estimate.estimate_id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                                            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
                                                                                <Tag className="m-0 border-0 bg-slate-100 text-slate-500 text-[10px] font-medium px-2 rounded">Phiên bản #{estimate.estimate_id}</Tag>
                                                                                {/* {prevEstimate && <Tag color="warning" className="m-0 border-0 rounded" style={{ fontSize: '9px' }}>Đã được chỉnh sửa</Tag>} */}
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
                                                                                <div className="flex justify-between items-center text-[11px]">
                                                                                    <span className="text-slate-400 font-medium">Tổng phí:</span>
                                                                                    <span className="text-accent-dark font-bold text-right">
                                                                                        {renderDiffHistory(prevEstimate?.final_total_cost, estimate.final_total_cost, formatCurrency, "0")}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-[11px]">
                                                                                    <span className="text-slate-400">Giấy:</span>
                                                                                    <span className="text-slate-700 font-medium text-right">
                                                                                        {renderDiffHistory(prevEstimate?.paper_name, estimate.paper_name, null, "N/A")}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-[11px]">
                                                                                    <span className="text-slate-400">Phủ:</span>
                                                                                    <span className="text-slate-700 font-medium text-right">
                                                                                        {renderDiffHistory(prevEstimate?.coating_type, estimate.coating_type, formatCoatingType, "N/A")}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-[11px]">
                                                                                    <span className="text-slate-400">Mực:</span>
                                                                                    <div className="flex flex-wrap items-center justify-end gap-1">
                                                                                        {estimate.ink_type_names && estimate.ink_type_names.length > 0 ? (
                                                                                            estimate.ink_type_names.map((ink, idx) => (
                                                                                                <Tag key={idx} color="blue" className="m-0 border-0 rounded px-1 text-[9px] h-4 flex items-center leading-none">{ink}</Tag>
                                                                                            ))
                                                                                        ) : (
                                                                                            <span className="text-slate-700 font-medium text-right">N/A</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-[11px]">
                                                                                    <span className="text-slate-400">Đặt cọc:</span>
                                                                                    <span className="text-slate-700 font-semibold text-right">
                                                                                        {renderDiffHistory(prevEstimate?.deposit_amount, estimate.deposit_amount, formatCurrency, "0")}
                                                                                    </span>
                                                                                </div>
                                                                                {(estimate.customer_signed_contract_path || estimate.consultant_contract_path) && (
                                                                                    <div className="flex justify-between items-center text-[11px] mt-1">
                                                                                        <span className="text-slate-400">Hợp đồng:</span>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <Tag color="cyan" className="m-0 border-0 rounded px-1 text-[9px] h-4 flex items-center leading-none">
                                                                                                {estimate.customer_signed_contract_path ? "Đã ký" : "Bản thảo"}
                                                                                            </Tag>
                                                                                            <Button 
                                                                                                size="small" 
                                                                                                type="text"
                                                                                                icon={<EyeOutlined style={{ fontSize: '12px' }} />} 
                                                                                                className="h-5 w-5 flex items-center justify-center p-0"
                                                                                                onClick={() => setViewOnlyContract({ 
                                                                                                    path: estimate.customer_signed_contract_path || estimate.consultant_contract_path, 
                                                                                                    title: `Hợp đồng phiên bản #${estimate.estimate_id}` 
                                                                                                })}
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                {/* Material Breakdown for History */}
                                                                                {(estimate.paper_cost > 0 || estimate.ink_cost > 0 || estimate.coating_glue_cost > 0 || estimate.mounting_glue_cost > 0 || estimate.lamination_cost > 0) && (
                                                                                    <Collapse ghost size="small" expandIconPosition="end" className="bg-slate-50/50 border border-slate-100 rounded-lg">
                                                                                        <Panel header={<span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Chi tiết vật tư</span>} key="mats" className="p-0 border-0">
                                                                                            <div className="space-y-1.5 py-1 px-1">
                                                                                                {estimate.paper_cost > 0 && (
                                                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                                                        <span className="text-slate-400">Phí giấy</span>
                                                                                                        <span className="text-slate-600 font-medium">
                                                                                                            {renderDiffHistory(prevEstimate?.paper_cost, estimate.paper_cost, formatCurrency, "0")}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                )}
                                                                                                {estimate.ink_cost > 0 && (
                                                                                                    <div className="flex justify-between items-center text-[10px]">
                                                                                                        <span className="text-slate-400">Phí mực</span>
                                                                                                        <span className="text-slate-600 font-medium">
                                                                                                            {renderDiffHistory(prevEstimate?.ink_cost, estimate.ink_cost, formatCurrency, "0")}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                )}
                                                                                                {/* ... other material costs ... */}
                                                                                            </div>
                                                                                        </Panel>
                                                                                    </Collapse>
                                                                                )}

                                                                                {/* Process Breakdown for History */}
                                                                                {estimate.process_cost && estimate.process_cost.length > 0 && (
                                                                                    <Collapse ghost size="small" expandIconPosition="end" className="bg-slate-50/50 border border-slate-100 rounded-lg">
                                                                                        <Panel header={<span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Chi tiết sản xuất</span>} key="procs" className="p-0 border-0">
                                                                                            <div className="space-y-1.5 py-1 px-1">
                                                                                                {estimate.process_cost.map(proc => {
                                                                                                    const prevProc = prevEstimate ? prevEstimate.process_cost?.find((p: any) => p.process_code === proc.process_code) : null;
                                                                                                    return (
                                                                                                        <div key={proc.process_cost_id} className="flex justify-between items-center text-[10px]">
                                                                                                            <span className="text-slate-400">{formatProcess(proc.process_code)}</span>
                                                                                                            <span className="text-slate-600 font-medium">
                                                                                                                {renderDiffHistory(prevProc?.cost, proc.cost, formatCurrency, "0")}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    )
                                                                                                })}
                                                                                            </div>
                                                                                        </Panel>
                                                                                    </Collapse>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                })}
                                                        </div>
                                                    </Panel>
                                                </Collapse>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    {/* Payment Receipts Section */}
                                    {(orderDetail.deposit_receipt_path || orderDetail.remaining_receipt_path) && (
                                        <Card className="mt-0 rounded-2xl border border-orange-100 shadow-sm border-t-4 border-t-orange-500">
                                            <div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-orange-600 mb-0 flex items-center gap-2">
                                                            <CreditCardOutlined />
                                                            Biên lai thanh toán
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    {orderDetail.deposit_receipt_path && (
                                                        <Button
                                                            type="primary"
                                                            icon={<EyeOutlined />}
                                                            onClick={() => window.open(orderDetail.deposit_receipt_path as string, '_blank')}
                                                            className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 border-none shadow-sm h-10 font-medium"
                                                        >
                                                            Xem biên lai đặt cọc
                                                        </Button>
                                                    )}
                                                    {orderDetail.remaining_receipt_path && (
                                                        <Button
                                                            type="primary"
                                                            icon={<EyeOutlined />}
                                                            onClick={() => window.open(orderDetail.remaining_receipt_path as string, '_blank')}
                                                            className="w-full rounded-lg bg-orange-500 hover:bg-orange-600 border-none shadow-sm h-10 font-medium"
                                                        >
                                                            Xem biên lai còn lại
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {orderDetail.consultant_note && (
                                        <Card className="mt-4 rounded-2xl border border-blue-100 shadow-sm border-t-4 border-t-blue-400 bg-blue-50/30 pb-0">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-blue-800 flex items-center gap-2 m-0">
                                                            <FileTextOutlined className="text-blue-500" />
                                                            Ghi chú của tư vấn viên
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-slate-700 text-sm leading-relaxed bg-white border border-blue-200 rounded-lg p-3 whitespace-pre-wrap">
                                                    {orderDetail.consultant_note}
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {orderDetail.process_status === 'Processing' && (
                                        <Card className="mt-4 rounded-2xl border border-green-100 shadow-sm border-t-4 border-t-green-500 bg-green-50/30">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-green-800 flex items-center gap-2 m-0">
                                                            <EditOutlined className="text-green-500" />
                                                            Lời nhắn cho tư vấn viên
                                                        </h3>
                                                    </div>
                                                </div>
                                                <TextArea
                                                    rows={2}
                                                    placeholder="Nhập ghi chú cho tư vấn viên khi duyệt yêu cầu..."
                                                    className="w-full text-sm rounded-lg border-green-200 focus:border-green-400 focus:ring-green-400"
                                                    value={managerNote}
                                                    onChange={(e) => setManagerNote(e.target.value)}
                                                />
                                            </div>
                                        </Card>
                                    )}

                                    {orderDetail.process_status !== 'Processing' && orderDetail.note && (
                                        <Card className="mt-4 rounded-2xl border border-green-100 shadow-sm border-t-4 border-t-green-500 bg-green-50/30">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-green-800 flex items-center gap-2 m-0">
                                                            <FileTextOutlined className="text-green-500" />
                                                            Ghi chú của Manager
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-slate-700 text-sm leading-relaxed bg-white border border-green-200 rounded-lg p-3 whitespace-pre-wrap">
                                                    {orderDetail.note}
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROW 2: Summary & Design Files */}
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
                                        {orderDetail.delivery_date_change_reason && (
                                            <Descriptions.Item label="Lý do đổi ngày" span={2}>
                                                <Text strong className="text-amber-600 italic">{orderDetail.delivery_date_change_reason}</Text>
                                            </Descriptions.Item>
                                        )}
                                        {orderDetail.product_name && <Descriptions.Item label="Kiểu hộp" span={1}><Text strong className="text-slate-800">{orderDetail.product_name}</Text></Descriptions.Item>}
                                        {orderDetail.number_of_plates > 0 && <Descriptions.Item label="Số kẽm" span={1}><Text strong className="text-slate-800">{orderDetail.number_of_plates}</Text></Descriptions.Item>}
                                        {orderDetail.glue_tab_mm > 0 && <Descriptions.Item label="Lề dán" span={1}><Text strong className="text-slate-800">{orderDetail.glue_tab_mm} mm</Text></Descriptions.Item>}
                                        {orderDetail.bleed_mm > 0 && <Descriptions.Item label="Tràn lề" span={1}><Text strong className="text-slate-800">{orderDetail.bleed_mm} mm</Text></Descriptions.Item>}
                                        {orderDetail.print_width_mm > 0 && orderDetail.print_length_mm > 0 && <Descriptions.Item label="Kích thước in" span={1}><Text strong className="text-slate-800">{orderDetail.print_width_mm} x {orderDetail.print_length_mm} mm</Text></Descriptions.Item>}
                                        {/* {orderDetail.ink_type_names && orderDetail.ink_type_names.length > 0 && (
                                            <Descriptions.Item label="Loại mực" span={2}>
                                                <Space wrap size={[4, 4]}>
                                                    {orderDetail.ink_type_names.map((ink, idx) => (
                                                        <Tag key={idx} color="blue" className="m-0 border-0 rounded px-2">{ink}</Tag>
                                                    ))}
                                                </Space>
                                            </Descriptions.Item>
                                        )} */}
                                    </Descriptions>

                                    {orderDetail.description && (
                                        <div className="mt-4">
                                            <Text type="secondary" className="block mb-2 text-xs uppercase font-semibold">Mô tả yêu cầu</Text>
                                            <div className="text-slate-700 text-sm leading-relaxed bg-white border border-slate-200 rounded-lg p-3">
                                                {orderDetail.description}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </div>

                    </div>


                </div>

                <Modal
                    open={isContractModalVisible}
                    onCancel={() => setIsContractModalVisible(false)}
                    footer={orderDetail.is_check_contract === null ? [
                        <Button key="reject" danger onClick={() => handleContractCheck(false)} disabled={checkingContract}>
                            Từ chối
                        </Button>,
                        <Button key="approve" type="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleContractCheck(true)} loading={checkingContract}>
                            Duyệt hợp đồng
                        </Button>
                    ] : [
                        <Button key="close" onClick={() => setIsContractModalVisible(false)}>
                            Đóng
                        </Button>
                    ]}
                    width={1000}
                    title={<span className="text-lg font-bold text-slate-800">Hợp đồng khách hàng đã ký</span>}
                    destroyOnClose
                    centered
                >
                    <div className="py-2">
                        {contractPath ? (
                            <iframe 
                                src={contractPath.endsWith('.pdf') ? contractPath : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(contractPath)}`} 
                                className="w-full rounded-lg border border-slate-200"
                                style={{ height: '75vh' }}
                                title="Customer Signed Contract"
                            />
                        ) : (
                            <Empty description="Không tìm thấy file hợp đồng" />
                        )}
                    </div>
                </Modal>

                <Modal
                    open={!!viewOnlyContract}
                    onCancel={() => setViewOnlyContract(null)}
                    footer={[
                        <Button key="close" onClick={() => setViewOnlyContract(null)}>
                            Đóng
                        </Button>
                    ]}
                    width={1000}
                    title={<span className="text-lg font-bold text-slate-800">{viewOnlyContract?.title || "Xem hợp đồng"}</span>}
                    destroyOnClose
                    centered
                >
                    <div className="py-2">
                        {viewOnlyContract?.path ? (
                            <iframe 
                                src={viewOnlyContract.path.endsWith('.pdf') ? viewOnlyContract.path : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewOnlyContract.path)}`} 
                                className="w-full rounded-lg border border-slate-200"
                                style={{ height: '75vh' }}
                                title="Contract Viewer"
                            />
                        ) : (
                            <Empty description="Không tìm thấy file hợp đồng" />
                        )}
                    </div>
                </Modal>

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
