"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FileImageOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ShoppingOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Image as AntImage,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  message,
  Row,
  Skeleton,
  Tag,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;

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
  order_request_date: string;
  detail_address: string;
  process_status?: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [designFiles, setDesignFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Fetch order detail từ API
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!orderId) return;

      setLoading(true);
      try {
        const response = await requestOrderApi.getDetail(orderId);
        const orderData = response?.data || response;

        if (orderData) {
          setOrderDetail({
            order_request_id: orderData.order_request_id,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email,
            delivery_date: orderData.delivery_date,
            product_name: orderData.product_name,
            quantity: orderData.quantity,
            description: orderData.description || "",
            design_file_path: orderData.design_file_path || "",
            order_request_date: orderData.order_request_date,
            detail_address: orderData.detail_address || "",
            process_status: orderData.process_status,
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
  }, [orderId]);

  // Handle design file upload - Sử dụng API update-design-file
  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);

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
        setOrderDetail((prev) =>
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

  const getStatusTag = (status: string) => {
    const statusMap: { [key: string]: { color: string; text: string } } = {
      PENDING: { color: "orange", text: "Chờ xử lý" },
      PROCESSING: { color: "blue", text: "Đang xử lý" },
      CONFIRMED: { color: "green", text: "Đã xác nhận" },
      COMPLETED: { color: "cyan", text: "Hoàn thành" },
      CANCELLED: { color: "red", text: "Đã hủy" },
    };
    const config = statusMap[status] || { color: "default", text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg rounded-2xl">
            <Skeleton active paragraph={{ rows: 10 }} />
          </Card>
        </div>
      </div>
    );
  }

  if (!orderDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center">
        <Card className="shadow-lg rounded-2xl">
          <Empty description="Không tìm thấy đơn hàng" />
          <div className="text-center mt-4">
            <Button type="primary" onClick={() => router.back()}>
              Quay lại
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          {/* <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            className="mb-4"
          >
            Quay lại
          </Button> */}
          <div className="flex items-center justify-between">
            <div>
              <Title level={2} className="!mb-1">
                Chi tiết đơn hàng #{orderDetail.order_request_id}
              </Title>
              <Text type="secondary">
                Ngày đặt:{" "}
                {dayjs(orderDetail.order_request_date).format(
                  "DD/MM/YYYY HH:mm"
                )}
              </Text>
            </div>
            {orderDetail.process_status &&
              getStatusTag(orderDetail.process_status)}
          </div>
        </div>

        <Row gutter={[24, 24]}>
          {/* Thông tin đơn hàng */}
          <Col xs={24} lg={14}>
            <Card
              className="shadow-lg rounded-2xl h-full"
              title={
                <span className="flex items-center gap-2 text-lg font-semibold">
                  <ShoppingOutlined className="text-blue-500" />
                  Thông tin đơn hàng
                </span>
              }
            >
              <Descriptions column={1} labelStyle={{ fontWeight: 500 }}>
                <Descriptions.Item
                  label={
                    <span className="flex items-center gap-2">
                      <UserOutlined /> Khách hàng
                    </span>
                  }
                >
                  <Text strong>{orderDetail.customer_name}</Text>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <span className="flex items-center gap-2">
                      <PhoneOutlined /> Số điện thoại
                    </span>
                  }
                >
                  <a
                    href={`tel:${orderDetail.customer_phone}`}
                    className="text-blue-600"
                  >
                    {orderDetail.customer_phone}
                  </a>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <span className="flex items-center gap-2">
                      <MailOutlined /> Email
                    </span>
                  }
                >
                  <a
                    href={`mailto:${orderDetail.customer_email}`}
                    className="text-blue-600"
                  >
                    {orderDetail.customer_email}
                  </a>
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <span className="flex items-center gap-2">
                      <EnvironmentOutlined /> Địa chỉ giao hàng
                    </span>
                  }
                >
                  {orderDetail.detail_address || (
                    <Text type="secondary" italic>
                      Chưa có địa chỉ
                    </Text>
                  )}
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Descriptions column={1} labelStyle={{ fontWeight: 500 }}>
                <Descriptions.Item label="Tên sản phẩm">
                  <Text strong className="text-lg">
                    {orderDetail.product_name}
                  </Text>
                </Descriptions.Item>

                <Descriptions.Item label="Số lượng">
                  <Tag color="blue" className="text-base px-3 py-1">
                    {orderDetail.quantity.toLocaleString("vi-VN")} sản phẩm
                  </Tag>
                </Descriptions.Item>

                <Descriptions.Item label="Mô tả">
                  {orderDetail.description || (
                    <Text type="secondary" italic>
                      Không có mô tả
                    </Text>
                  )}
                </Descriptions.Item>

                <Descriptions.Item
                  label={
                    <span className="flex items-center gap-2">
                      <CalendarOutlined /> Ngày giao dự kiến
                    </span>
                  }
                >
                  <Tag color="green" className="text-base px-3 py-1">
                    {dayjs(orderDetail.delivery_date).format("DD/MM/YYYY")}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          {/* Upload file thiết kế */}
          <Col xs={24} lg={10}>
            <Card
              className="shadow-lg rounded-2xl h-full"
              title={
                <span className="flex items-center gap-2 text-lg font-semibold">
                  <FileImageOutlined className="text-purple-500" />
                  File thiết kế
                </span>
              }
            >
              {/* Hiển thị file đã có */}
              {orderDetail.design_file_path && (
                <div className="mb-4">
                  <Text type="secondary" className="block mb-2">
                    File thiết kế hiện tại:
                  </Text>
                  <AntImage
                    src={orderDetail.design_file_path}
                    alt="Design file"
                    className="rounded-lg border"
                    style={{ maxHeight: 200, objectFit: "contain" }}
                    placeholder={
                      <div className="flex items-center justify-center h-32 bg-gray-100">
                        <Text type="secondary">Đang tải...</Text>
                      </div>
                    }
                  />
                </div>
              )}

              {/* Hiển thị files đã upload */}
              {designFiles.length > 0 && (
                <div className="mb-4">
                  <Text type="secondary" className="block mb-2">
                    Files mới tải lên:
                  </Text>
                  <div className="grid grid-cols-2 gap-2">
                    {designFiles.map((file) => (
                      <div
                        key={file.uid}
                        className="relative group rounded-lg overflow-hidden border"
                      >
                        <AntImage
                          src={file.url}
                          alt={file.name}
                          className="w-full h-24 object-cover"
                        />
                        <Button
                          size="small"
                          danger
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveFile(file)}
                        >
                          Xóa
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload area */}
              {orderDetail.design_file_path === '' && (
                <div>
                  <Upload
                    customRequest={handleUpload}
                    showUploadList={false}
                    accept="image/*,.pdf"
                    disabled={uploading}
                  >
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        {uploading ? (
                          <>
                            <UploadOutlined className="text-3xl text-blue-500 animate-pulse" />
                            <Text>Đang tải lên...</Text>
                          </>
                        ) : (
                          <>
                            <PlusOutlined className="text-3xl text-gray-400" />
                            <Text type="secondary">
                              Nhấn để tải file thiết kế
                            </Text>
                            <Text type="secondary" className="text-xs">
                              Hỗ trợ: JPG, PNG, PDF
                            </Text>
                          </>
                        )}
                      </div>
                    </div>
                  </Upload>

                  {/* Ghi chú */}
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <Text type="warning" className="text-sm">
                      💡 <strong>Lưu ý:</strong> Vui lòng tải lên file thiết kế
                      rõ ràng, độ phân giải cao để đảm bảo chất lượng in ấn tốt
                      nhất.
                    </Text>
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* Action buttons */}
        <div className="mt-6 flex justify-center gap-4">
          <Button size="large" onClick={() => router.push('/')}>
            Quay lại trang chủ 
          </Button>
        </div>
      </div>
    </div>
  );
}
