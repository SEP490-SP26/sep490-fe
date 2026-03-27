"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { formatCoatingType } from "@/lib/estimationUtils";
import { RequestDetailResponse } from "@/lib/request.types";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  FileImageOutlined,
  ShoppingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Empty,
  message,
  Popconfirm,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Text } = Typography;

// Helper function to mask customer name
const maskName = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) {
    if (name.length <= 2) return name;
    return name.substring(0, 2) + "***";
  }
  // Keep first and last name, mask the middle
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  return `${firstName} *** ${lastName}`;
};

// Helper function to mask phone number
const maskPhone = (phone: string) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 6) return phone;
  // Keep first 3 and last 3 digits
  return cleaned.substring(0, 3) + "***" + cleaned.substring(cleaned.length - 3);
};

export default function DesignerRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<RequestDetailResponse | null>(null);
  const [confirming, setConfirming] = useState(false);

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

  const handleConfirmLayout = async () => {
    setConfirming(true);
    try {
      await requestOrderApi.designerConfirmLayout({ request_id: Number(requestId) });
      message.success("Đã xác nhận bố cục thành công!");
      fetchOrderDetail(); // Refresh data or redirect
    } catch (error: any) {
      console.error("Lỗi khi xác nhận bố cục:", error);
      message.error(error.response?.data?.message || "Không thể xác nhận bố cục. Vui lòng thử lại.");
    } finally {
      setConfirming(false);
    }
  };

  const downloadAllDesignFiles = () => {
    if (!orderDetail?.design_file_path) return;

    orderDetail.design_file_path.split(",").forEach((url) => {
      const trimmedUrl = url.trim();
      window.open(trimmedUrl, "_blank");
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-slate-50/50">
        <Skeleton active paragraph={{ rows: 10 }} className="bg-white p-6 rounded-2xl max-w-4xl mx-auto" />
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-slate-50/30">
        <Card className="shadow-sm border-slate-200 rounded-2xl max-w-md w-full text-center py-12">
          <Empty description="Không tìm thấy yêu cầu" />
          <Button type="primary" onClick={() => router.back()} className="mt-8">
            Quay lại danh sách
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 p-6 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold m-0 text-slate-800">
              Đơn hàng #{orderDetail.order_id}
            </h1>
            <Tag color={orderDetail.process_status?.toLowerCase() === "accepted" ? "green" : "blue"} className="rounded-full px-3 m-0">
              {orderDetail.process_status}
            </Tag>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => router.back()}>Quay lại</Button>
            
            <Popconfirm
              title={<span className="font-semibold text-lg">Xác nhận bố cục</span>}
              description={`Bạn có chắc chắn muốn xác nhận bố cục cho đơn hàng #${orderDetail.order_id}?`}
              onConfirm={handleConfirmLayout}
              okText="Xác nhận"
              cancelText="Hủy"
              okButtonProps={{ className: "bg-blue-600 hover:bg-blue-500" }}
            >
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={confirming}
                className="bg-green-600 hover:bg-green-500 rounded-lg"
              >
                Xác nhận bố cục
              </Button>
            </Popconfirm>
          </div>
        </div>

        <Card className="shadow-sm rounded-2xl mb-6">
          {/* Customer Info */}
          <div className="mb-6">
            <h3 className="text-sm uppercase tracking-wider font-bold text-blue-600 mb-4 flex items-center gap-2">
              <UserOutlined /> Thông tin khách hàng
            </h3>
            <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Họ tên"><Text strong>{maskName(orderDetail.customer_name)}</Text></Descriptions.Item>
              <Descriptions.Item label="Điện thoại"><Text strong>{maskPhone(orderDetail.customer_phone)}</Text></Descriptions.Item>
              <Descriptions.Item label="Email"><Text strong>{orderDetail.email}</Text></Descriptions.Item>
            </Descriptions>
          </div>

          <Divider />

          {/* Product Info */}
          <div className="mb-6">
            <h3 className="text-sm uppercase tracking-wider font-bold text-blue-600 mb-4 flex items-center gap-2">
              <ShoppingOutlined /> Chi tiết sản phẩm: {orderDetail.product_name}
            </h3>
            <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} className="bg-slate-50 p-4 rounded-xl">
              <Descriptions.Item label="Kích thước">
                <Text strong>{orderDetail.product_length_mm || 0} x {orderDetail.product_width_mm || 0} x {orderDetail.product_height_mm || 0} mm</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số lượng">
                <Text strong>{orderDetail.quantity.toLocaleString("vi-VN")}</Text>
              </Descriptions.Item>
              {orderDetail.paper_name && (
                <Descriptions.Item label="Loại giấy"><Text strong>{orderDetail.paper_name}</Text></Descriptions.Item>
              )}
              {orderDetail.coating_type && orderDetail.coating_type !== "NONE" && (
                <Descriptions.Item label="Loại phủ"><Text strong>{formatCoatingType(orderDetail.coating_type)}</Text></Descriptions.Item>
              )}
              {orderDetail.print_width_mm > 0 && orderDetail.print_height_mm > 0 && (
                <Descriptions.Item label="Kích thước in">
                  <Text strong>{orderDetail.print_width_mm} x {orderDetail.print_height_mm} mm</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {orderDetail.description && (
              <div className="mt-4">
                <Text type="secondary" className="block mb-1 text-xs uppercase font-semibold">Mô tả thiết kế</Text>
                <div className="text-sm bg-white border border-slate-200 rounded-lg p-3">
                  {orderDetail.description}
                </div>
              </div>
            )}
          </div>
          
          <Divider />

          {/* Design Files */}
          <div>
             <h3 className="text-sm uppercase tracking-wider font-bold text-blue-600 mb-4 flex items-center gap-2">
              <FileImageOutlined /> File đính kèm
            </h3>
            <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-200">
              <div>
                <div className="font-medium">File thiết kế</div>
                <div className="text-xs text-slate-500">
                  {orderDetail.design_file_path ? `${orderDetail.design_file_path.split(',').length} file` : "Chưa tải lên"}
                </div>
              </div>
              {orderDetail.design_file_path ? (
                <Button size="small" icon={<DownloadOutlined />} onClick={downloadAllDesignFiles}>
                  Tải tất cả
                </Button>
              ) : (
                <Text type="secondary" className="text-sm italic">Không có file đính kèm</Text>
              )}
            </div>
            
             {/* Other files */}
             {(orderDetail as any).other_files && (orderDetail as any).other_files.length > 0 && (
                <div className="mt-3">
                    <div className="text-xs font-medium text-gray-700 mb-2">
                        File khác ({(orderDetail as any).other_files.length}):
                    </div>
                    <div className="space-y-2">
                        {(orderDetail as any).other_files.map((file: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                                <span className="truncate max-w-[80%]">{file.name}</span>
                                <Button type="link" size="small" onClick={() => window.open(file.url, "_blank")}>
                                    Tải về
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
