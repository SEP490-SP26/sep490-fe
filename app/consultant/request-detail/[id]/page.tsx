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
    Upload,
    Row,
    Col,
    Space,
    Select
} from "antd";
import { estimatesApi, OrderRequestWithQuotes, QuoteOption } from "@/apiRequests/estimates";
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

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<OrderRequestWithQuotes | null>(null);

    const [uploadingDesign, setUploadingDesign] = useState(false);
    const [uploadingContract, setUploadingContract] = useState(false);
    const [isUploadContractModalOpen, setIsUploadContractModalOpen] = useState(false);
    const [selectedUploadEstimateId, setSelectedUploadEstimateId] = useState<number | undefined>(undefined);
    const [tempContractFile, setTempContractFile] = useState<File | null>(null);

    const [customerMessage, setCustomerMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);

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

        // If not in preview modal, open preview first
        if (!isPreviewModalOpen) {
            setPreviewLoading(true);
            try {
                const response = await estimatesApi.emailPreview(Number(requestId));
                const data = (response as any).data || response;
                if (data && data.quotes && data.quotes.length > 0) {
                    setPreviewData(data);
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

    const handleUploadContract = async () => {
        if (!selectedUploadEstimateId || !tempContractFile || !orderDetail) {
            message.warning("Vui lòng chọn báo giá!");
            return;
        }

        setUploadingContract(true);
        try {
            await uploadApi.uploadContract({
                requestId: orderDetail.request_id,
                estimate_id: selectedUploadEstimateId,
                file: tempContractFile
            });
            message.success("Tải hợp đồng thành công");
            setIsUploadContractModalOpen(false);
            setTempContractFile(null);
            setSelectedUploadEstimateId(undefined);
            fetchOrderDetail();
        } catch (error) {
            message.error("Tải hợp đồng thất bại");
        } finally {
            setUploadingContract(false);
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

                        {/* Upload Contract Select Estimate Modal */}
                        <Modal
                            title={
                                <div className="flex items-center gap-2">
                                    <FileTextOutlined className="text-blue-600" />
                                    <span>Chọn báo giá cho hợp đồng</span>
                                </div>
                            }
                            open={isUploadContractModalOpen}
                            onCancel={() => {
                                setIsUploadContractModalOpen(false);
                                setTempContractFile(null);
                            }}
                            footer={[
                                <Button key="cancel" onClick={() => {
                                    setIsUploadContractModalOpen(false);
                                    setTempContractFile(null);
                                }}>
                                    Hủy
                                </Button>,
                                <Button
                                    key="submit"
                                    type="primary"
                                    className="bg-blue-600 hover:bg-blue-500"
                                    loading={uploadingContract}
                                    onClick={handleUploadContract}
                                    disabled={!selectedUploadEstimateId}
                                >
                                    Tải lên
                                </Button>
                            ]}
                        >
                            <div className="py-2">
                                <p className="mb-2 text-sm text-slate-600">Vui lòng chọn báo giá tương ứng cho hợp đồng này:</p>
                                <Select
                                    className="w-full"
                                    placeholder="Chọn báo giá"
                                    value={selectedUploadEstimateId}
                                    onChange={(value) => setSelectedUploadEstimateId(value)}
                                    options={orderDetail?.cost_estimate?.filter(e => e.is_active).map((est, index) => ({
                                        value: est.estimate_id,
                                        label: `Báo giá #${index + 1} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(est.final_total_cost)}`
                                    })) || []}
                                />
                                {tempContractFile && (
                                    <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-sm">
                                        <FileTextOutlined className="text-blue-500" />
                                        <span className="truncate">{tempContractFile.name}</span>
                                    </div>
                                )}
                            </div>
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
                                        {orderDetail.product_type && <Descriptions.Item label="Kiểu hộp" span={1}><Text strong className="text-slate-800">{orderDetail.product_type}</Text></Descriptions.Item>}
                                        {orderDetail.paper_name && <Descriptions.Item label="Loại giấy" span={1}><Text strong className="text-slate-800">{orderDetail.paper_name}</Text></Descriptions.Item>}
                                        {orderDetail.coating_type && orderDetail.coating_type !== "NONE" && <Descriptions.Item label="Loại phủ" span={1}><Text strong className="text-slate-800">{formatCoatingType(orderDetail.coating_type)}</Text></Descriptions.Item>}
                                        {orderDetail.wave_type && orderDetail.wave_type !== "NONE" && <Descriptions.Item label="Kiểu sóng" span={1}><Text strong className="text-slate-800">{orderDetail.wave_type}</Text></Descriptions.Item>}
                                        {orderDetail.number_of_plates > 0 && <Descriptions.Item label="Số kẽm" span={1}><Text strong className="text-slate-800">{orderDetail.number_of_plates}</Text></Descriptions.Item>}
                                        {/* {orderDetail.is_one_side_box !== undefined && orderDetail.is_one_side_box !== null && <Descriptions.Item label="In 1 mặt" span={1}><Text strong className="text-slate-800">{orderDetail.is_one_side_box ? "Có" : "Không"}</Text></Descriptions.Item>} */}
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
                                                beforeUpload={(file) => {
                                                    const activeEstimates = orderDetail?.cost_estimate?.filter(e => e.is_active) || [];
                                                    if (activeEstimates.length === 1) {
                                                        setSelectedUploadEstimateId(activeEstimates[0].estimate_id);
                                                    } else {
                                                        setSelectedUploadEstimateId(undefined);
                                                    }
                                                    setTempContractFile(file);
                                                    setIsUploadContractModalOpen(true);
                                                    return false; // Prevent auto upload
                                                }}
                                            >
                                                <Button size="small" icon={<UploadOutlined />}>
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
                                        {orderDetail.cost_estimate.filter(x => x.is_active).sort((a, b) => a.estimate_id - b.estimate_id).map((estimate, index) => {
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

                                                    {/* Hợp đồng của báo giá */}
                                                    {(estimate.contract_file_path || estimate.contract_uploaded_at) && (
                                                        <div className="mt-3 pt-3 border-t border-slate-200">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <FileTextOutlined className="text-blue-500" />
                                                                <span className="text-sm font-medium text-slate-800">Hợp đồng đính kèm</span>
                                                            </div>
                                                            {estimate.contract_file_path && (
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="text-slate-500 text-xs">File hợp đồng:</span>
                                                                    <Button
                                                                        type="link"
                                                                        size="small"
                                                                        className="p-0 h-auto text-xs font-semibold"
                                                                        onClick={() => window.open(estimate.contract_file_path, "_blank")}
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
                    <div className="max-h-[90vh] overflow-y-auto p-4 md:p-8">
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-800 m-0">Xem trước Báo giá</h2>
                            <div className="flex gap-3">
                                <Button onClick={() => setIsPreviewModalOpen(false)} className="rounded-lg">
                                    Đóng
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<SendOutlined />}
                                    className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-200 rounded-lg"
                                    loading={sending}
                                    onClick={handleSendQuote}
                                >
                                    Xác nhận và Gửi cho khách
                                </Button>
                            </div>
                        </div>

                        <div className={`grid grid-cols-1 ${previewData && previewData.quotes.length > 1 ? "xl:grid-cols-2" : ""} gap-8 w-full`}>
                            {previewData?.quotes.map((quote, index) => {
                                const requestDateText = quote.request_date_text || (quote.order_request_date ? dayjs(quote.order_request_date).format("DD/MM/YYYY") : "---");
                                const deliveryText = quote.delivery_text || (quote.delivery_date ? dayjs(quote.delivery_date).format("DD/MM/YYYY") : "---");
                                const designTypeText = quote.design_type_text || (quote.is_send_design ? "Khách gửi file" : "Thuê thiết kế");
                                const finalTotalValue = quote.final_total || 0;

                                return (
                                    <div key={quote.quote_id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col mx-auto w-full border border-slate-100">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="text-blue-200 text-[10px] font-bold tracking-widest uppercase">
                                                        MES SYSTEM - PREVIEW
                                                    </div>
                                                    <div className="text-white text-lg font-extrabold mt-0.5">
                                                        BÁO GIÁ {previewData.quotes.length > 1 ? index + 1 : ""}
                                                    </div>
                                                </div>
                                                <div className="bg-white/15 text-white px-2 py-1 rounded text-xs font-bold">
                                                    AM{quote.order_request_id.toString().padStart(6, '0')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col">
                                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Left Column: Info */}
                                                <div>
                                                    <div className="mb-4">
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
                                                    </div>
                                                </div>

                                                {/* Right Column: Costs */}
                                                <div>
                                                    <div className="mb-4">
                                                        <h3 className="text-[11px] font-bold uppercase pb-1 mb-2 border-b-2 border-orange-500 text-orange-600 tracking-wide">
                                                            Bảng kê chi phí
                                                        </h3>
                                                        <div className="space-y-1 min-h-[110px]">
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
                                        </div>
                                    </div>
                                );
                            })}
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