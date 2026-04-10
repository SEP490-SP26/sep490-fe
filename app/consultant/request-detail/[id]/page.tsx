"use client";

import { estimatesApi, OrderRequestWithQuotes } from "@/apiRequests/estimates";
import { materialsApi } from "@/apiRequests/materials";
import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import { Material } from "@/lib/estimation.types";
import { formatCoatingType, formatProcess } from "@/lib/estimationUtils";
import { RequestDetailResponse } from "@/lib/request.types";
import {
    CheckCircleOutlined,
    DollarOutlined,
    DownloadOutlined,
    EditOutlined,
    FileImageOutlined,
    FileTextOutlined,
    InfoCircleOutlined,
    PrinterOutlined,
    SendOutlined,
    ShoppingOutlined,
    UploadOutlined,
    UserOutlined
} from "@ant-design/icons";
import {
    Button,
    Card,
    Checkbox,
    Collapse,
    Descriptions,
    Divider,
    Empty,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Select,
    Skeleton,
    Space,
    Steps,
    Spin,
    Tag,
    Typography,
    Upload
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

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
    const { user } = useAuth();

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<OrderRequestWithQuotes | null>(null);
    const [reviewedContracts, setReviewedContracts] = useState<Set<number>>(new Set());
    const isAllContractsReviewed = previewData && previewData.quotes.length > 0 && reviewedContracts.size === previewData.quotes.length;
    const hasContract = (isPreviewModalOpen && previewData)
        ? (previewData.quotes.length > 0 && previewData.quotes.every(q => q.consultant_contract_path || q.customer_signed_contract_path))
        : (orderDetail?.cost_estimate && orderDetail.cost_estimate.filter(e => e.is_active).length > 0
            ? orderDetail.cost_estimate.filter(e => e.is_active).every(e => e.consultant_contract_path || e.customer_signed_contract_path)
            : !!((orderDetail as any)?.contract_file || orderDetail?.consultant_contract_path));

    const [uploadingDesign, setUploadingDesign] = useState(false);
    const [uploadingContract, setUploadingContract] = useState(false);

    const [customerMessage, setCustomerMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [uploadingPrint, setUploadingPrint] = useState(false);
    const [confirmingLayout, setConfirmingLayout] = useState(false);
    const [isContractCommitted, setIsContractCommitted] = useState(false);

    const [pendingDesignFile, setPendingDesignFile] = useState<File | null>(null);
    const [pendingPrintFile, setPendingPrintFile] = useState<File | null>(null);

    const [isResignModalOpen, setIsResignModalOpen] = useState(false);
    const [resignMessage, setResignMessage] = useState("");
    const [sendingResign, setSendingResign] = useState(false);

    const [alternativeModalOpen, setAlternativeModalOpen] = useState(false);
    const [submittingAlternative, setSubmittingAlternative] = useState(false);
    const [alternativeForm] = Form.useForm();
    const [selectedEstimateForMaterial, setSelectedEstimateForMaterial] = useState<any>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isProduceModalOpen, setIsProduceModalOpen] = useState(false);

    const handleOpenAlternativeModal = (estimate: any) => {
        setSelectedEstimateForMaterial(estimate);

        // Split combined reason if possible
        const reason = estimate.alternative_material_reason || '';
        const parts = reason.split('; ');
        const paperReason = parts.find((p: string) => p.startsWith('Giấy: '))?.replace('Giấy: ', '') || '';
        const waveReason = parts.find((p: string) => p.startsWith('Sóng: '))?.replace('Sóng: ', '') || '';

        alternativeForm.setFieldsValue({
            paper_alternative: estimate.paper_alternative || '',
            paper_alternative_reason: paperReason,
            wave_alternative: estimate.wave_alternative || '',
            wave_alternative_reason: waveReason
        });
        setAlternativeModalOpen(true);
    };

    const handleAlternativeSubmit = async (values: any) => {
        if (!selectedEstimateForMaterial) return;
        setSubmittingAlternative(true);
        const combinedReason = [
            values.paper_alternative_reason ? `Giấy: ${values.paper_alternative_reason}` : '',
            values.wave_alternative_reason ? `Sóng: ${values.wave_alternative_reason}` : ''
        ].filter(Boolean).join('; ');

        try {
            await estimatesApi.alternativeMaterials({
                request_id: Number(requestId),
                estimate_id: selectedEstimateForMaterial.estimate_id,
                paper_alternative: values.paper_alternative || '',
                wave_alternative: values.wave_alternative || '',
                alternative_material_reason: combinedReason
            });
            message.success("Cập nhật vật liệu thay thế thành công!");
            setAlternativeModalOpen(false);
            fetchOrderDetail(false);
        } catch (error) {
            console.error("Lỗi khi cập nhật vật liệu:", error);
            message.error("Lỗi khi cập nhật vật liệu thay thế.");
        } finally {
            setSubmittingAlternative(false);
        }
    };

    // Fetch order detail from API
    const fetchOrderDetail = async (showLoading: boolean = true) => {
        if (!requestId) return;

        if (showLoading) setLoading(true);
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
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrderDetail();

        // Fetch materials
        materialsApi.getAll().then(res => {
            const data = (res as any).data || res;
            setMaterials(Array.isArray(data) ? data : []);
        }).catch(err => console.error("Error fetching materials:", err));
    }, [requestId]);

    const paperOptions = Array.from(new Map(materials.filter(m => m.type === "Giấy").map(m => [m.name, m])).values())
        .map(m => ({ label: m.name, value: m.name }));

    const waveOptions = Array.from(new Map(materials.filter(m => m.type === "Sóng").map(m => [m.name, m])).values())
        .map(m => ({ label: m.name, value: m.name }));

    const handleSendQuote = async () => {
        if (!orderDetail) return;

        // Kiểm tra xem đã có hợp đồng chưa trước khi mở preview
        if (!hasContract) {
            message.warning("Vui lòng tải lên hợp đồng trong phần Thông tin báo giá trước khi xem trước và gửi!");
            return;
        }

        // If not in preview modal, open preview first
        if (!isPreviewModalOpen) {
            setPreviewLoading(true);
            try {
                const response = await estimatesApi.emailPreview(Number(requestId));
                const data = (response as any).data || response;
                if (data && data.quotes && data.quotes.length > 0) {
                    setPreviewData(data);
                    setIsContractCommitted(false); // Reset before opening
                    setReviewedContracts(new Set()); // Reset tracking for contracts
                    setIsPreviewModalOpen(true);
                } else {
                    message.warning("Không tìm thấy thông tin báo giá để xem trước.");
                }
            } catch (error) {
                console.error("Lỗi khi lấy thông tin xem trước:", error);
                message.error("Không thể tải thông tin xem trước báo giá.");
            } finally {
                setPreviewLoading(false);
            }
            return;
        }

        // Processing send in modal
        if (!hasContract) {
            message.warning("Vui lòng tải lên hợp đồng trước khi gửi báo giá cho khách hàng!");
            return;
        }
        setSending(true);
        try {
            // Integrate message sending if present
            if (customerMessage.trim()) {
                await requestOrderApi.consultantMessageToCustomer({
                    request_id: Number(requestId),
                    message: customerMessage
                });
            }

            await requestOrderApi.sendDeal({ request_id: orderDetail.request_id });
            message.success("Đã gửi báo giá cho khách hàng thành công!");
            setCustomerMessage(""); // Clear message after success
            setIsPreviewModalOpen(false);
            await fetchOrderDetail(); // Refresh data to update status
        } catch (error) {
            console.error("Lỗi khi gửi báo giá:", error);
            message.error("Không thể gửi báo giá. Vui lòng thử lại sau.");
        } finally {
            setSending(false);
        }
    };

    // Scroll tracking removed because it doesn't work well with cross-origin iframes
    // Replaced with explicit checkbox confirmation logic

    const handleSendMessageToCustomer = async () => {
        if (!customerMessage.trim()) {
            message.warning("Vui lòng nhập lời nhắn cho khách hàng.");
            return;
        }

        setSendingMessage(true);
        try {
            await requestOrderApi.consultantMessageToCustomer({
                request_id: Number(requestId),
                message: customerMessage
            });
            message.success("Đã gửi lời nhắn cho khách hàng thành công!");
            setCustomerMessage(""); // Clear message after success
        } catch (error) {
            console.error("Lỗi khi gửi lời nhắn:", error);
            message.error("Không thể gửi lời nhắn. Vui lòng thử lại sau.");
        } finally {
            setSendingMessage(false);
        }
    };

    const handleConfirmLayout = async () => {
        if (!orderDetail) return;
        if (!orderDetail.file_url && !pendingPrintFile) {
            message.warning("Vui lòng cần chọn file printer ready trước khi Đưa vào sản xuất!");
            return;
        }
        setConfirmingLayout(true);
        try {
            // Upload Design file if selected
            if (pendingDesignFile) {
                await uploadApi.updateDesignFile(orderDetail.request_id, pendingDesignFile);
            }
            // Upload Print Ready file if selected
            if (pendingPrintFile) {
                const activeEstimate = orderDetail.cost_estimate?.find(e => e.is_active);
                const estimateId = activeEstimate ? activeEstimate.estimate_id : 0;
                await requestOrderApi.uploadPrintReadyFile(orderDetail.request_id, {
                    estimate_id: estimateId,
                    file: pendingPrintFile
                });
            }

            // Confirm layout
            await requestOrderApi.designerConfirmLayout({ request_id: Number(requestId) });
            message.success("Đã Đưa vào sản xuất thành công!");

            // Clear pending files
            setPendingDesignFile(null);
            setPendingPrintFile(null);
            setIsProduceModalOpen(false);

            fetchOrderDetail(false);
        } catch (error: any) {
            console.error("Lỗi khi Đưa vào sản xuất:", error);
            message.error(error.response?.data?.message || "Không thể Đưa vào sản xuất. Vui lòng thử lại.");
        } finally {
            setConfirmingLayout(false);
        }
    };

    const handleSendResignRequest = async () => {
        if (!resignMessage.trim()) {
            message.warning("Vui lòng nhập lời nhắn gửi cho khách hàng.");
            return;
        }
        setSendingResign(true);
        try {
            await requestOrderApi.emailRequestResignContract({
                request_id: Number(requestId),
                custom_message: resignMessage
            });
            message.success("Đã gửi yêu cầu ký lại hợp đồng cho khách hàng!");
            setIsResignModalOpen(false);
            setResignMessage("");
        } catch (error: any) {
            console.error("Lỗi khi gửi yêu cầu ký lại:", error);
            message.error(error.response?.data?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
        } finally {
            setSendingResign(false);
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
            case 'Processing': return 'Đang chờ duyệt';
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
            <Spin spinning={uploadingContract} fullscreen tip="Đang tải lên hợp đồng..." />
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
                                loading={previewLoading}
                                onClick={handleSendQuote}
                            >
                                Xem trước & Gửi báo giá
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

                        {orderDetail.process_status === 'Accepted' && (
                            <>
                                {/* {orderDetail.is_check_contract === null && (
                                    <Tag color="warning" className="rounded-lg px-3 py-1 font-medium m-0 flex items-center gap-2 border-0 bg-amber-50 text-amber-700">
                                        <Spin size="small" />
                                        Đang chờ Quản Lý duyệt hợp đồng
                                    </Tag>
                                )} */}
                                { !orderDetail.printer_ready_file_path && (
                                    <>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            onClick={() => setIsProduceModalOpen(true)}
                                            className="bg-green-600 hover:bg-green-500 rounded-lg text-white border-0"
                                        >
                                            Đưa vào sản xuất
                                        </Button>
                                        <Modal
                                            title={<span className="font-semibold text-lg">Xác nhận đưa vào sản xuất</span>}
                                            open={isProduceModalOpen}
                                            onCancel={() => setIsProduceModalOpen(false)}
                                            footer={[
                                                <Button key="cancel" onClick={() => setIsProduceModalOpen(false)}>
                                                    Hủy
                                                </Button>,
                                                <Button
                                                    key="confirm"
                                                    type="primary"
                                                    loading={confirmingLayout}
                                                    onClick={handleConfirmLayout}
                                                    className="bg-blue-600 hover:bg-blue-500"
                                                >
                                                    Xác nhận
                                                </Button>
                                            ]}
                                        >
                                            <p className="text-base text-slate-700">Bạn có chắc chắn muốn đưa vào sản xuất cho yêu cầu <strong>#{orderDetail.request_id}</strong>?</p>
                                            <p className="text-red-500 font-medium mt-3 bg-red-50 p-3 rounded-md border border-red-100">
                                                Lưu ý: Khi nhấn xác nhận thì tất cả thông tin yêu cầu sẽ không được thay đổi và bạn sẽ chịu trách nhiệm nếu có vấn đề gì xảy ra.
                                            </p>
                                        </Modal>
                                    </>
                                )}
                            </>
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
                                        <Descriptions.Item label="Kích thước" span={1}><Text strong className="text-slate-800">{orderDetail.product_length_mm || 0} x {orderDetail.product_width_mm || 0} x {orderDetail.product_height_mm || 0} mm</Text></Descriptions.Item>
                                        <Descriptions.Item label="Số lượng" span={1}><Text strong className="text-slate-800 text-base">{orderDetail.quantity.toLocaleString("vi-VN")}</Text></Descriptions.Item>
                                        <Descriptions.Item label="Dự kiến" span={1}><Text strong className="text-slate-800">{dayjs(orderDetail.delevery_date).isValid() ? dayjs(orderDetail.delevery_date).format("DD/MM/YYYY") : "Chưa xác định"}</Text></Descriptions.Item>
                                        {orderDetail.delivery_date_change_reason && (
                                            <Descriptions.Item label="Lý do đổi ngày" span={2}>
                                                <Text strong className="text-amber-600 italic">{orderDetail.delivery_date_change_reason}</Text>
                                            </Descriptions.Item>
                                        )}
                                        {orderDetail.product_name && <Descriptions.Item label="Kiểu hộp" span={1}><Text strong className="text-slate-800">{orderDetail.product_name}</Text></Descriptions.Item>}
                                        {orderDetail.paper_name && <Descriptions.Item label="Loại giấy" span={1}><Text strong className="text-slate-800">{orderDetail.paper_name}</Text></Descriptions.Item>}
                                        {orderDetail.paper_alternative && <Descriptions.Item label="Giấy thay thế" span={1}><Text strong className="text-amber-600">{orderDetail.paper_alternative}</Text></Descriptions.Item>}
                                        {orderDetail.coating_type && orderDetail.coating_type !== "NONE" && <Descriptions.Item label="Loại phủ" span={1}><Text strong className="text-slate-800">{formatCoatingType(orderDetail.coating_type)}</Text></Descriptions.Item>}
                                        {orderDetail.wave_type && orderDetail.wave_type !== "NONE" && <Descriptions.Item label="Kiểu sóng" span={1}><Text strong className="text-slate-800">{orderDetail.wave_type}</Text></Descriptions.Item>}
                                        {orderDetail.wave_alternative && <Descriptions.Item label="Sóng thay thế" span={1}><Tag color="amber" className="text-amber-600 m-0 border-0 rounded px-2">{orderDetail.wave_alternative}</Tag></Descriptions.Item>}
                                        {orderDetail.number_of_plates > 0 && <Descriptions.Item label="Số kẽm" span={1}><Text strong className="text-slate-800">{orderDetail.number_of_plates}</Text></Descriptions.Item>}
                                        {orderDetail.ink_type_names && orderDetail.ink_type_names.length > 0 && (
                                            <Descriptions.Item label="Loại mực" span={2}>
                                                <Space wrap size={[4, 4]}>
                                                    {orderDetail.ink_type_names.map((ink, idx) => (
                                                        <Tag key={idx} color="blue" className="m-0 border-0 rounded px-2">{ink}</Tag>
                                                    ))}
                                                </Space>
                                            </Descriptions.Item>
                                        )}
                                        {orderDetail.glue_tab_mm > 0 && <Descriptions.Item label="Lề dán" span={1}><Text strong className="text-slate-800">{orderDetail.glue_tab_mm} mm</Text></Descriptions.Item>}
                                        {orderDetail.bleed_mm > 0 && <Descriptions.Item label="Tràn lề" span={1}><Text strong className="text-slate-800">{orderDetail.bleed_mm} mm</Text></Descriptions.Item>}
                                        {orderDetail.print_width_mm > 0 && orderDetail.print_length_mm > 0 && <Descriptions.Item label="Kích thước in" span={1}><Text strong className="text-slate-800">{orderDetail.print_width_mm} x {orderDetail.print_length_mm} mm</Text></Descriptions.Item>}
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
                                                        {orderDetail.design_file_path ? (
                                                            `${orderDetail.design_file_path.split(',').length} file thiết kế`
                                                        ) : "Chưa tải lên"}
                                                    </div>
                                                </div>
                                            </div>
                                            {orderDetail.design_file_path && !pendingDesignFile ? (
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
                                                    beforeUpload={(file) => {
                                                        setPendingDesignFile(file);
                                                        return false;
                                                    }}
                                                >
                                                    <Button size="small" icon={<UploadOutlined />}>
                                                        Chọn file
                                                    </Button>
                                                </Upload>
                                            )}
                                        </div>
                                        {/* NEW: DISPLAY THE PENDING DESIGN FILE HERE */}
                                        {pendingDesignFile && (
                                            <div className="mt-1 flex items-center justify-between p-1.5 bg-white border border-gray-200 rounded text-xs">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <FileTextOutlined className="text-blue-400" style={{ fontSize: "12px" }} />
                                                    <span
                                                        className="truncate text-blue-700 cursor-pointer hover:underline font-medium"
                                                        onClick={() => {
                                                            const url = URL.createObjectURL(pendingDesignFile);
                                                            window.open(url, '_blank');
                                                        }}
                                                        title="Click để xem file cục bộ"
                                                    >
                                                        {pendingDesignFile.name}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="text"
                                                    danger
                                                    size="small"
                                                    style={{ padding: 0, height: "auto" }}
                                                    onClick={() => setPendingDesignFile(null)}
                                                >
                                                    Hủy
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* File in (Bản in) - Shown only when Accepted */}
                                    {orderDetail.process_status === 'Accepted' && (
                                        <div className="flex flex-col gap-2 p-2 bg-blue-50/50 border border-blue-100 rounded">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <PrinterOutlined className="text-blue-500 text-sm" />
                                                    <div>
                                                        <div className="font-medium text-sm">File in (Printer Ready)</div>
                                                        <div className="text-xs text-gray-500">
                                                            {orderDetail.printer_ready_file_path || pendingPrintFile ? (
                                                                <span className="text-green-600 font-medium">Đã có file in</span>
                                                            ) : (
                                                                <span className="text-gray-500">Chưa có file in</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {orderDetail.printer_ready_file_path ? (
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<DownloadOutlined />}
                                                            onClick={() => window.open(orderDetail.printer_ready_file_path, "_blank")}
                                                            className="bg-green-600 hover:bg-green-500"
                                                        >
                                                            Xem
                                                        </Button>
                                                    ) : (
                                                        <Upload
                                                            showUploadList={false}
                                                            beforeUpload={(file) => {
                                                                setPendingPrintFile(file);
                                                                return false;
                                                            }}
                                                        >
                                                            <Button
                                                                size="small"
                                                                type={pendingPrintFile ? "default" : "primary"}
                                                                icon={<UploadOutlined />}
                                                            >
                                                                {pendingPrintFile ? "Thay đổi file" : ""}
                                                            </Button>
                                                        </Upload>
                                                    )}
                                                </div>
                                            </div>

                                            {/* NEW: DISPLAY THE PENDING PRINT FILE HERE */}
                                            {pendingPrintFile && (
                                                <div className="mt-1 flex items-center justify-between p-1.5 bg-white border border-blue-200 rounded text-xs">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <FileTextOutlined className="text-blue-400" style={{ fontSize: "12px" }} />
                                                        <span
                                                            className="truncate text-blue-700 cursor-pointer hover:underline font-medium"
                                                            onClick={() => {
                                                                const url = URL.createObjectURL(pendingPrintFile);
                                                                window.open(url, '_blank');
                                                            }}
                                                            title="Click để xem file cục bộ"
                                                        >
                                                            {pendingPrintFile.name}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="text"
                                                        danger
                                                        size="small"
                                                        style={{ padding: 0, height: "auto" }}
                                                        onClick={() => setPendingPrintFile(null)}
                                                    >
                                                        Hủy
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}


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
                                        {orderDetail.cost_estimate.filter(x => x.is_active).sort((a, b) => a.estimate_id - b.estimate_id).map((estimate, index) => {
                                            const hasNote = orderDetail.reason?.includes(`Báo giá ${index + 1}:`);
                                            return (
                                                <div key={estimate.estimate_id} className={`p-4 rounded-xl border ${hasNote ? 'bg-yellow-50 border-yellow-300' : 'bg-slate-50 border-slate-100'}`}>

                                                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                                                        <Tag className={`m-0 border-0 font-medium px-2 rounded ${hasNote ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-50 text-blue-600'}`}>Báo giá #{index + 1}</Tag>
                                                        {orderDetail.process_status === 'Accepted' && (
                                                            <Button size="small" type="dashed" onClick={() => handleOpenAlternativeModal(estimate)}>
                                                                Đổi vật tư
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm font-medium">Tổng chi phí:</span>
                                                        <span className="font-bold text-lg text-accent-dark">{formatCurrency(estimate.final_total_cost)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm">Đặt cọc:</span>
                                                        <Tag color="orange" className="font-medium text-slate-800 text-sm">{formatCurrency(estimate.deposit_amount)}</Tag>
                                                    </div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm">Loại giấy:</span>
                                                        <Tag color="blue" className="font-medium text-slate-800 text-sm">{estimate.paper_name || "Chưa xác định"}</Tag>
                                                    </div>
                                                    {estimate.paper_alternative && (
                                                        <>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-slate-500 text-sm">Giấy thay thế:</span>
                                                                <span className="font-medium text-amber-600 text-sm">{estimate.paper_alternative}</span>
                                                            </div>
                                                            {estimate.alternative_material_reason && estimate.alternative_material_reason.includes('Giấy:') && (
                                                                <div className="mb-2 text-xs text-slate-400 italic">
                                                                    Lý do: {estimate.alternative_material_reason.split('; ').find(p => p.startsWith('Giấy:'))?.replace('Giấy: ', '')}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {estimate.wave_type && estimate.wave_type !== "NONE" && (
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-slate-500 text-sm">Kiểu sóng:</span>
                                                            <span className="font-medium text-slate-800 text-sm">{estimate.wave_type}</span>
                                                        </div>
                                                    )}
                                                    {estimate.wave_alternative && (
                                                        <>
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-slate-500 text-sm">Sóng thay thế:</span>
                                                                <span className="font-medium text-amber-600 text-sm">{estimate.wave_alternative}</span>
                                                            </div>
                                                            {estimate.alternative_material_reason && estimate.alternative_material_reason.includes('Sóng:') && (
                                                                <div className="mb-2 text-xs text-slate-400 italic">
                                                                    Lý do: {estimate.alternative_material_reason.split('; ').find(p => p.startsWith('Sóng:'))?.replace('Sóng: ', '')}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-slate-500 text-sm">Loại phủ:</span>
                                                        <Tag color="blue" className="font-medium text-slate-800 text-sm">{formatCoatingType(estimate.coating_type)}</Tag>
                                                    </div>



                                                    {estimate.ink_type_names && estimate.ink_type_names.length > 0 && (
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className="text-slate-500 text-sm">Loại mực:</span>
                                                            <Space wrap size={[4, 4]} style={{ justifyContent: 'flex-end', maxWidth: '70%' }}>
                                                                {estimate.ink_type_names.map((ink: string, idx: number) => (
                                                                    <Tag key={idx} color="blue" className="m-0 border-0 rounded px-2 text-xs">{ink}</Tag>
                                                                ))}
                                                            </Space>
                                                        </div>
                                                    )}

                                                    {/* <div className="flex justify-between items-center mb-3">
                                                        <span className="text-slate-500 text-sm font-medium">Tổng chi phí:</span>
                                                        <span className="font-bold text-lg text-accent-dark">{formatCurrency(estimate.final_total_cost)}</span>
                                                    </div> */}

                                                    {/* Hợp đồng của báo giá */}
                                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                                        {orderDetail.process_status === 'Accepted' ? (
                                                            orderDetail.is_check_contract === false ? (
                                                                <div className="flex items-center gap-2 py-2 text-red-600 font-semibold bg-red-50/50 rounded-lg px-3 border border-red-100">
                                                                    <InfoCircleOutlined />
                                                                    <span>Hợp đồng bị từ chối</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 py-2 text-green-600 font-semibold bg-green-50/50 rounded-lg px-3 border border-green-100">
                                                                    <CheckCircleOutlined />
                                                                    <span>Hợp đồng đã được ký</span>
                                                                </div>
                                                            )
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <FileTextOutlined className="text-blue-500" />
                                                                        <span className="text-sm font-medium text-slate-800">Hợp đồng</span>
                                                                    </div>
                                                                    <Upload
                                                                        showUploadList={false}
                                                                        customRequest={async (options) => {
                                                                            const { file, onSuccess, onError } = options;
                                                                            setUploadingContract(true);
                                                                            try {
                                                                                await estimatesApi.uploadConsultantContract({
                                                                                    request_id: Number(requestId),
                                                                                    estimate_id: estimate.estimate_id,
                                                                                    file: file as File
                                                                                });
                                                                                message.success("Tải hợp đồng thành công");
                                                                                fetchOrderDetail(false);
                                                                                if (onSuccess) onSuccess("ok");
                                                                            } catch (error) {
                                                                                message.error("Tải hợp đồng thất bại");
                                                                                if (onError) onError(error as any);
                                                                            } finally {
                                                                                setUploadingContract(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Button
                                                                            size="small"
                                                                            icon={<UploadOutlined />}
                                                                        >
                                                                            {estimate.consultant_contract_path ? "Đổi file" : "Tải lên"}
                                                                        </Button>
                                                                    </Upload>
                                                                </div>
                                                                {estimate.customer_signed_contract_path && (
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-slate-500 text-xs">Hợp đồng đã ký:</span>
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            className="p-0 h-auto text-xs font-semibold text-green-600"
                                                                            onClick={() => estimate.customer_signed_contract_path && window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(estimate.customer_signed_contract_path)}&embedded=true`, "_blank")}
                                                                        >
                                                                            Xem bản cứng
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                {estimate.consultant_contract_path && !estimate.customer_signed_contract_path && (
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-slate-500 text-xs">File hợp đồng (chưa ký):</span>
                                                                        <Button
                                                                            type="link"
                                                                            size="small"
                                                                            className="p-0 h-auto text-xs font-semibold"
                                                                            onClick={() => estimate.consultant_contract_path && window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(estimate.consultant_contract_path)}&embedded=true`, "_blank")}
                                                                        >
                                                                            Xem file
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                                {estimate.contract_uploaded_at && (
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-slate-500 text-xs">Ngày tải lên:</span>
                                                                        <span className="text-slate-800 text-xs font-medium">
                                                                            {dayjs(estimate.contract_uploaded_at).format("DD/MM/YYYY HH:mm")}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
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

                                    {/* Hợp đồng bị từ chối */}
                                    {orderDetail.is_check_contract === false && (
                                        <Card className="mt-6 border-red-200 bg-red-50/30 shadow-sm border-t-4 border-t-red-500">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-red-800 mb-4 flex items-center gap-2">
                                                            <FileTextOutlined className="text-red-500" />
                                                            Hợp đồng bị từ chối
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-slate-700 text-sm leading-relaxed bg-white border border-red-200 rounded-lg p-3 space-y-4">
                                                    <div className="flex gap-2">
                                                        <span className="text-red-500 mt-0.5">•</span>
                                                        <span className="font-medium text-slate-800">
                                                            Lý do: <span className="text-red-600 font-bold">{orderDetail.contract_check_note || "Không có lý do cụ thể"}</span>
                                                        </span>
                                                    </div>
                                                    <Button
                                                        type="primary"
                                                        danger
                                                        icon={<SendOutlined />}
                                                        className="w-full h-10 font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
                                                        onClick={() => {
                                                            setResignMessage(`Chào Quý khách,\n\nHợp đồng cho yêu cầu #${orderDetail.request_id} cần được ký lại do một số điều chỉnh. Rất xin lỗi sự bất tiện này.\n\nLý do: ${orderDetail.contract_check_note || "Cần điều chỉnh nội dung"}\n\nVui lòng xem lại và ký lại hợp đồng mới. Trân trọng!`);
                                                            setIsResignModalOpen(true);
                                                        }}
                                                    >
                                                        Gửi yêu cầu ký lại cho KH
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Lời nhắn từ Quản lý */}
                                    {orderDetail.note && (
                                        <Card className="mt-6 border-green-200 bg-green-50/30">
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-green-800 mb-4 flex items-center gap-2">
                                                            <FileTextOutlined className="text-green-500" />
                                                            Lời nhắn từ Quản lý
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="text-slate-700 text-sm leading-relaxed bg-white border border-green-200 rounded-lg p-3 whitespace-pre-wrap">
                                                    {orderDetail.note}
                                                </div>
                                            </div>
                                        </Card>
                                    )}

                                    {/* Lời nhắn cho khách hàng */}
                                    {orderDetail.process_status === 'Verified' && (
                                        <Card className=" rounded-2xl border border-emerald-100 shadow-sm border-t-4 border-t-emerald-400 bg-emerald-50/20">
                                            <div >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-sm uppercase tracking-wider font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                                            <SendOutlined className="text-emerald-500" />
                                                            Lời nhắn cho khách hàng
                                                        </h3>
                                                    </div>
                                                </div>
                                                <div className="gap-2">
                                                    <Space direction="vertical" className="w-full"  >
                                                        <Input.TextArea
                                                            rows={2}
                                                            placeholder="Nhập lời nhắn hoặc ghi chú gửi cho khách hàng..."
                                                            value={customerMessage}
                                                            onChange={(e) => setCustomerMessage(e.target.value)}
                                                            className="rounded-xl border-emerald-100 focus:border-emerald-300 focus:ring-emerald-200"
                                                        />
                                                        {/* <Button
                                                        type="primary"
                                                        icon={<SendOutlined />}
                                                        onClick={handleSendMessageToCustomer}
                                                        loading={sendingMessage}
                                                        className="bg-emerald-600 hover:bg-emerald-500 border-none rounded-lg w-full h-10 font-semibold"
                                                    >
                                                        Gửi lời nhắn
                                                    </Button> */}
                                                    </Space>
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alternative Materials Modal */}
                <Modal
                    title={<span className="font-bold text-lg"><EditOutlined className="mr-2 text-amber-600" />Thay đổi vật tư</span>}
                    open={alternativeModalOpen}
                    onCancel={() => setAlternativeModalOpen(false)}
                    footer={null}
                    centered
                    destroyOnClose
                >
                    <Form
                        form={alternativeForm}
                        layout="vertical"
                        onFinish={handleAlternativeSubmit}
                        className="mt-4"
                    >
                        <Form.Item
                            name="paper_alternative"
                            label={<span className="font-medium text-slate-700">Giấy thay thế (tên giấy)</span>}
                            help="Chọn giấy để thay thế cho loại giấy cũ, để trống nếu không đổi"
                        >
                            <Select
                                placeholder="Chọn giấy thay thế..."
                                className="rounded-lg"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                                options={paperOptions}
                            />
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.paper_alternative !== currentValues.paper_alternative}
                        >
                            {({ getFieldValue }) => getFieldValue('paper_alternative') ? (
                                <Form.Item
                                    name="paper_alternative_reason"
                                    label={<span className="font-medium text-slate-700 italic">Lý do thay đổi giấy</span>}
                                    rules={[{ required: true, message: 'Vui lòng nhập lý do thay đổi loại giấy' }]}
                                    className="ml-4 border-l-2 border-amber-100 pl-4"
                                >
                                    <Input.TextArea placeholder="Nhập lý do..." rows={2} className="rounded-lg" />
                                </Form.Item>
                            ) : null}
                        </Form.Item>

                        <Form.Item
                            name="wave_alternative"
                            label={<span className="font-medium text-slate-700">Sóng thay thế</span>}
                            help="Chọn loại sóng để thay thế cho sóng cũ, để trống nếu không đổi"
                        >
                            <Select
                                placeholder="Chọn sóng thay thế..."
                                className="rounded-lg"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                                options={waveOptions}
                            />
                        </Form.Item>

                        <Form.Item
                            noStyle
                            shouldUpdate={(prevValues, currentValues) => prevValues.wave_alternative !== currentValues.wave_alternative}
                        >
                            {({ getFieldValue }) => getFieldValue('wave_alternative') ? (
                                <Form.Item
                                    name="wave_alternative_reason"
                                    label={<span className="font-medium text-slate-700 italic">Lý do thay đổi sóng</span>}
                                    rules={[{ required: true, message: 'Vui lòng nhập lý do thay đổi loại sóng' }]}
                                    className="ml-4 border-l-2 border-amber-100 pl-4"
                                >
                                    <Input.TextArea placeholder="Nhập lý do..." rows={2} className="rounded-lg" />
                                </Form.Item>
                            ) : null}
                        </Form.Item>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <Button onClick={() => setAlternativeModalOpen(false)} className="rounded-lg">
                                Hủy
                            </Button>
                            <Button type="primary" htmlType="submit" loading={submittingAlternative} className="rounded-lg bg-amber-600 hover:bg-amber-500 border-none">
                                Xác nhận
                            </Button>
                        </div>
                    </Form>
                </Modal>

                {/* Quote Preview Modal */}
                <Modal
                    title={null}
                    open={isPreviewModalOpen}
                    onCancel={() => setIsPreviewModalOpen(false)}
                    footer={null}
                    width={previewData && previewData.quotes.length > 1 ? 1300 : 700}
                    centered
                    destroyOnClose
                    className="quote-preview-modal"
                    bodyStyle={{ padding: 0, backgroundColor: '#f8fafc' }}
                >
                    <div
                        className="max-h-[90vh] overflow-y-auto p-4 md:p-8"
                    >
                        <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col">
                                <h2 className="text-xl font-bold text-slate-800 m-0">Xem trước Báo giá</h2>
                                {user && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Tag color="cyan" icon={<UserOutlined />} className="m-0 px-2 py-0.5 rounded-md font-medium border-0">
                                            Tư vấn viên: {user.full_name}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button onClick={() => setIsPreviewModalOpen(false)} className="rounded-lg">
                                    Đóng
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    className={`bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-200 rounded-lg ${(!isContractCommitted || !isAllContractsReviewed || !hasContract) ? 'opacity-50 grayscale' : ''}`}
                                    loading={sending}
                                    disabled={!isContractCommitted || !isAllContractsReviewed || !hasContract}
                                    onClick={handleSendQuote}
                                >
                                    Xác nhận và Gửi cho khách
                                </Button>
                            </div>
                        </div>

                        {customerMessage.trim() && (
                            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                    <SendOutlined />
                                    Lời nhắn cho khách hàng
                                </h3>
                                <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                    {customerMessage}
                                </div>
                            </div>
                        )}

                        <div className={`grid grid-cols-1 ${previewData && previewData.quotes.length > 1 ? "xl:grid-cols-2" : ""} gap-8 w-full`}>
                            {(previewData?.quotes || []).sort((a, b) => a.estimate_id - b.estimate_id).map((quote, index) => {
                                const requestDateText = quote.request_date_text || (quote.order_request_date ? dayjs(quote.order_request_date).format("DD/MM/YYYY") : "---");
                                const deliveryText = quote.delivery_text || (quote.delivery_date ? dayjs(quote.delivery_date).format("DD/MM/YYYY") : "---");
                                const designTypeText = quote.design_type_text || (quote.is_send_design ? "Khách gửi file" : "Thuê thiết kế");
                                const finalTotalValue = quote.final_total || 0;

                                return (
                                    <div key={quote.estimate_id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col mx-auto w-full border border-slate-100">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-blue-200 text-[10px] font-bold tracking-widest uppercase">
                                                        MES SYSTEM - PREVIEW
                                                    </div>
                                                    <div className="text-white text-lg font-extrabold mt-0.5">
                                                        BÁO GIÁ {previewData?.quotes && previewData.quotes.length > 1 ? index + 1 : ""}
                                                    </div>
                                                </div>
                                                <div className="bg-white/15 text-white px-2 py-1 rounded text-xs font-bold">
                                                    AM{quote.order_request_id.toString().padStart(6, '0')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex-1 flex flex-col gap-6">
                                                {/* Row 1: Thông tin & Chi phí */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Left: Thông tin đơn hàng */}
                                                    <div>
                                                        <h3 className="text-[11px] font-bold uppercase pb-1 mb-2 border-b-2 border-blue-500 text-blue-600 tracking-wide">
                                                            Thông tin đơn hàng
                                                        </h3>
                                                        <div className="space-y-1">
                                                            {[
                                                                { label: "Ngày yêu cầu", value: requestDateText },
                                                                { label: "Người yêu cầu", value: quote.customer_name, uppercase: true },
                                                                { label: "Số điện thoại", value: quote.customer_phone },
                                                                { label: "Email", value: quote.customer_email, blue: true }
                                                            ].map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500 text-[11px]">{item.label}</span>
                                                                    <span className={`text-slate-800 font-semibold text-[11px] ${item.uppercase ? 'uppercase' : ''} ${item.blue ? 'text-blue-600 break-all' : ''}`}>
                                                                        {item.value}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Right: Bảng kê chi phí */}
                                                    <div>
                                                        <h3 className="text-[11px] font-bold uppercase pb-1 mb-2 border-b-2 border-orange-500 text-orange-600 tracking-wide">
                                                            Bảng kê chi phí
                                                        </h3>
                                                        <div className="space-y-1">
                                                            {!!quote.material_cost && (
                                                                <div className="flex justify-between items-center py-1">
                                                                    <span className="text-slate-600 text-[11px]">Nguyên vật liệu</span>
                                                                    <span className="text-slate-800 font-bold text-[11px]">{formatCurrency(quote.material_cost)}</span>
                                                                </div>
                                                            )}
                                                            {!!quote.labor_cost && (
                                                                <div className="flex justify-between items-center py-1">
                                                                    <span className="text-slate-600 text-[11px]">Chi phí nhân công</span>
                                                                    <span className="text-slate-800 font-bold text-[11px]">{formatCurrency(quote.labor_cost)}</span>
                                                                </div>
                                                            )}
                                                            {!!quote.other_fees && (
                                                                <div className="flex justify-between items-center py-1">
                                                                    <span className="text-slate-600 text-[11px]">Chi phí khác</span>
                                                                    <span className="text-slate-800 font-bold text-[11px]">{formatCurrency(quote.other_fees)}</span>
                                                                </div>
                                                            )}
                                                            {!!quote.rush_amount && (
                                                                <div className="flex justify-between items-center py-1">
                                                                    <span className="text-slate-600 text-[11px]">Phụ thu giao gấp</span>
                                                                    <span className="text-slate-800 font-bold text-[11px]">{formatCurrency(quote.rush_amount)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Row 2: Sản phẩm & Tổng thanh toán */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                    {/* Left: Chi tiết sản phẩm */}
                                                    <div>
                                                        <h3 className="text-[11px] font-bold uppercase pb-1 mb-2 border-b-2 border-blue-500 text-blue-600 tracking-wide">
                                                            Chi tiết sản phẩm
                                                        </h3>
                                                        <div className="space-y-1">
                                                            {[
                                                                { label: "Sản phẩm", value: quote.product_name },
                                                                { label: "Số lượng", value: quote.quantity.toLocaleString('vi-VN') },
                                                                { label: "Loại giấy", value: quote.paper_name || "---" },
                                                                { label: "Thiết kế", value: designTypeText },
                                                                { label: "Giao dự kiến", value: deliveryText }
                                                            ].map((item, idx) => (
                                                                <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500 text-[11px]">{item.label}</span>
                                                                    <span className="text-slate-800 font-semibold text-[11px]">{item.value}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* {(quote.consultant_contract_path || quote.customer_signed_contract_path) && (
                                                            <div className="mt-4">
                                                                <h3 className="text-[11px] font-bold uppercase pb-1 mb-2 border-b-2 border-indigo-500 text-indigo-600 tracking-wide">
                                                                    Hợp đồng
                                                                </h3>
                                                                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                                                    <span className="text-slate-500 text-[11px]">Tệp đính kèm</span>
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        className="p-0 h-auto text-[11px] font-semibold text-indigo-600"
                                                                        onClick={() => window.open(quote.customer_signed_contract_path || quote.consultant_contract_path, "_blank")}
                                                                    >
                                                                        Xem hợp đồng
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )} */}
                                                    </div>

                                                    {/* Right: Tổng thanh toán */}
                                                    <div>
                                                        <h3 className="text-[11px] font-bold uppercase pb-1 mb-2 border-b-2 border-green-500 text-green-600 tracking-wide">
                                                            Tổng thanh toán
                                                        </h3>
                                                        <div className="space-y-1">
                                                            <div className={`flex justify-between items-center py-1 ${!quote.discount_amount ? "border-b border-dashed border-slate-200" : ""}`}>
                                                                <span className="text-slate-500 text-[11px]">Tạm tính</span>
                                                                <span className="text-slate-800 font-semibold text-[11px]">{formatCurrency(quote.subtotal || 0)}</span>
                                                            </div>
                                                            {!!quote.discount_amount && (
                                                                <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-200">
                                                                    <span className="text-slate-500 text-[11px]">Giảm giá ({quote.discount_percent || 0}%)</span>
                                                                    <span className="text-red-500 font-semibold text-[11px]">- {formatCurrency(quote.discount_amount)}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center pt-2">
                                                                <span className="text-slate-800 font-bold text-[13px]">THÀNH TIỀN</span>
                                                                <span className="text-blue-700 font-extrabold text-base">{formatCurrency(finalTotalValue)}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-red-500 text-[9px]">(Đã bao gồm VAT)</span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-green-800 font-bold text-[11px]">Cần đặt cọc/Thanh toán:</span>
                                                                <span className="text-green-700 font-extrabold text-sm">{formatCurrency(quote.deposit || 0)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bản xem trước Hợp đồng */}
                                            <div className="mt-8 pt-6 border-t border-slate-100 px-6 pb-6 bg-slate-50 flex-1">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-bold uppercase text-slate-800 flex items-center gap-2 m-0 tracking-wide">
                                                        <FileTextOutlined className="text-blue-600" />
                                                        Bản Hợp đồng {previewData?.quotes && previewData.quotes.length > 1 ? index + 1 : ""}
                                                    </h3>
                                                    <div className="flex items-center gap-2">
                                                        {reviewedContracts.has(quote.estimate_id) ? (
                                                            <Tag color="success" className="m-0 border-0 rounded px-2 font-medium">
                                                                Đã xác nhận
                                                            </Tag>
                                                        ) : (
                                                            <Tag color="default" className="m-0 border-0 rounded px-2 font-medium">
                                                                Chưa xác nhận
                                                            </Tag>
                                                        )}
                                                    </div>
                                                </div>

                                                <div
                                                    className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-inner relative flex flex-col"
                                                >
                                                    {(quote.consultant_contract_path || quote.customer_signed_contract_path) ? (
                                                        <div className="flex flex-col">
                                                            {/* Hợp đồng Web Viewer - Cloudinary/Iframe */}
                                                            <div
                                                                className="w-full h-[600px] overflow-y-auto bg-slate-100 rounded-t-lg relative"
                                                                onScroll={(e) => {
                                                                    const el = e.currentTarget;
                                                                    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50) {
                                                                        setReviewedContracts(prev => new Set([...prev, quote.estimate_id]));
                                                                    }
                                                                }}
                                                            >
                                                                <iframe
                                                                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(quote.customer_signed_contract_path || quote.consultant_contract_path)}&embedded=true`}
                                                                    className="w-full border-0 rounded-t-lg shadow-sm"
                                                                    style={{ height: '800px' }}
                                                                    title={`Hợp đồng #${index + 1}`}
                                                                />
                                                            </div>

                                                            {/* Bản sao lưu HTML để đảm bảo scroll tracking (hoặc nội dung đi kèm) */}
                                                            {quote.email_html && (
                                                                <div className="p-8 border-t border-slate-100 bg-white">
                                                                    <div className="mb-6 flex items-center gap-2 text-indigo-800 font-bold text-xs uppercase tracking-widest border-b border-indigo-100 pb-2">
                                                                        <InfoCircleOutlined className="text-indigo-500" />
                                                                        Nội dung chi tiết (Scrollable)
                                                                    </div>
                                                                    <div
                                                                        className="contract-content prose prose-sm max-w-none text-slate-700 leading-relaxed font-serif"
                                                                        dangerouslySetInnerHTML={{ __html: quote.email_html }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Nút xác nhận cho từng hợp đồng đã được thay thế bằng scroll qua toàn bộ modal */}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 text-slate-400 font-sans h-[400px]">
                                                            <FileTextOutlined style={{ fontSize: 64 }} className="mb-4 opacity-10" />
                                                            <p className="m-0 text-base font-medium">Đang chuẩn bị file Hợp đồng...</p>
                                                            <p className="m-0 text-sm opacity-60">Dữ liệu hợp đồng chưa được Cloudinary xử lý xong</p>
                                                        </div>
                                                    )}

                                                </div>

                                                <div className={`mb-6 bg-amber-50 border ${isAllContractsReviewed ? 'border-amber-200' : 'border-slate-200 opacity-60'} rounded-xl p-4 flex items-center justify-between gap-3`}>
                                                    <Checkbox
                                                        checked={isContractCommitted}
                                                        onChange={(e) => setIsContractCommitted(e.target.checked)}
                                                        className="text-amber-800 font-medium"
                                                        disabled={!isAllContractsReviewed}
                                                    >
                                                        <span className="text-sm">
                                                            Xác nhận đã cam kết chuẩn bị hợp đồng đúng với báo giá nếu có sai sót thì sẽ chịu toàn bộ trách nhiệm
                                                        </span>
                                                    </Checkbox>
                                                    {!isAllContractsReviewed && (
                                                        <Tag color="warning" className="m-0 pulse-animation">
                                                            Vui lòng lướt hết để có thể xác nhận
                                                        </Tag>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                    </div>
                </Modal>

                {/* Resign Contract Modal */}
                <Modal
                    title={
                        <div className="flex items-center gap-2 text-red-600">
                            <SendOutlined />
                            <span>Yêu cầu khách hàng ký lại hợp đồng</span>
                        </div>
                    }
                    open={isResignModalOpen}
                    onCancel={() => setIsResignModalOpen(false)}
                    footer={[
                        <Button key="back" onClick={() => setIsResignModalOpen(false)}>
                            Hủy
                        </Button>,
                        <Button
                            key="submit"
                            type="primary"
                            danger
                            loading={sendingResign}
                            onClick={handleSendResignRequest}
                            className="bg-red-600 hover:bg-red-500"
                        >
                            Gửi yêu cầu
                        </Button>,
                    ]}
                    centered
                >
                    <div className="py-4">
                        <p className="font-medium mb-2">Lời nhắn gửi khách hàng:</p>
                        <Input.TextArea
                            rows={6}
                            value={resignMessage}
                            onChange={(e) => setResignMessage(e.target.value)}
                            placeholder="Nhập lời nhắn gửi khách hàng về việc ký lại hợp đồng..."
                            className="rounded-lg"
                        />
                        <div className="mt-2 text-xs text-slate-400 italic">
                            * Khách hàng sẽ nhận được email thông báo và liên kết để xem/ký lại hợp đồng.
                        </div>
                    </div>
                </Modal>
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

                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                    .pulse-animation {
                        animation: pulse 2s infinite ease-in-out;
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