'use client';

import {
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    DollarOutlined,
    EnvironmentOutlined,
    PhoneOutlined,
    ShoppingOutlined,
    UserOutlined
} from '@ant-design/icons';
import {
    Button,
    Card,
    Descriptions,
    Divider,
    Input,
    message,
    Modal,
    Result,
    Tag,
    Typography
} from 'antd';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Mock data - sẽ được thay bằng API call sau
const getMockOrderData = (requestId: string) => ({
  requestId: parseInt(requestId),
  customerInfo: {
    name: 'Nguyễn Văn A',
    phone: '0912345678',
    address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
  },
  orderInfo: {
    productName: 'Hộp carton in màu offset',
    quantity: 500,
    deliveryDate: '2026-01-02',
    estimatedTotal: 10634481,
  },
});

export default function OrderDealPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  
  const [loading, setLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [rejected, setRejected] = useState(false);

  // TODO: Replace with API call
  const orderData = getMockOrderData(requestId);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // TODO: Call API to confirm deal
      // await api.confirmDeal(requestId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setConfirmed(true);
      message.success('Xác nhận báo giá thành công!');
      
      // Redirect to home after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      message.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    
    setLoading(true);
    try {
      // TODO: Call API to reject deal with reason
      // await api.rejectDeal(requestId, rejectReason);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setRejectModalOpen(false);
      setRejected(true);
      message.success('Đã gửi phản hồi từ chối');
    } catch (error) {
      message.error('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // Show success result after confirmation
  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Result
          status="success"
          title="Xác nhận báo giá thành công!"
          subTitle="Cảm ơn bạn đã xác nhận đơn hàng. Chúng tôi sẽ liên hệ với bạn sớm nhất."
          extra={[
            <Button type="primary" key="home" onClick={() => router.push('/')}>
              Về trang chủ
            </Button>,
          ]}
        />
      </div>
    );
  }

  // Show rejected result
  if (rejected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Result
          status="info"
          title="Đã gửi phản hồi"
          subTitle="Cảm ơn bạn đã phản hồi. Chúng tôi sẽ liên hệ lại với bạn để thảo luận thêm."
          extra={[
            <Button type="primary" key="home" onClick={() => router.push('/')}>
              Về trang chủ
            </Button>,
          ]}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <ShoppingOutlined className="text-3xl text-white" />
          </div>
          <Title level={2} className="!mb-1">BÁO GIÁ ĐƠN HÀNG IN ẤN</Title>
          <Text type="secondary">AMMS System - Báo giá chi tiết</Text>
          <div className="mt-2">
            <Tag color="blue">Mã đơn: #{requestId}</Tag>
          </div>
        </div>

        {/* Customer Info Card */}
        <Card 
          className="mb-4 shadow-md"
          title={
            <span className="flex items-center gap-2">
              <UserOutlined className="text-blue-600" />
              Thông tin khách hàng
            </span>
          }
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item 
              label={<span className="flex items-center gap-1"><UserOutlined /> Họ tên</span>}
            >
              <Text strong>{orderData.customerInfo.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="flex items-center gap-1"><PhoneOutlined /> Số điện thoại</span>}
            >
              <Text>{orderData.customerInfo.phone}</Text>
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="flex items-center gap-1"><EnvironmentOutlined /> Địa chỉ</span>}
            >
              <Text>{orderData.customerInfo.address}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Order Info Card */}
        <Card 
          className="mb-4 shadow-md"
          title={
            <span className="flex items-center gap-2">
              <ShoppingOutlined className="text-green-600" />
              Thông tin đơn hàng
            </span>
          }
        >
          <Descriptions column={1} size="small">
            <Descriptions.Item 
              label={<span className="flex items-center gap-1"><ShoppingOutlined /> Sản phẩm</span>}
            >
              <Text strong>{orderData.orderInfo.productName}</Text>
            </Descriptions.Item>
            <Descriptions.Item 
              label="Số lượng"
            >
              <Text>{orderData.orderInfo.quantity.toLocaleString()} sản phẩm</Text>
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span className="flex items-center gap-1"><CalendarOutlined /> Giao hàng dự kiến</span>}
            >
              <Tag color="blue">
                {dayjs(orderData.orderInfo.deliveryDate).format('DD/MM/YYYY')}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
          
          <Divider className="my-3" />
          
          {/* Total Price */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-gray-700">
                <DollarOutlined className="text-xl text-blue-600" />
                <Text strong>TỔNG THANH TOÁN</Text>
              </span>
              <Text className="text-2xl font-bold text-blue-600">
                {orderData.orderInfo.estimatedTotal.toLocaleString()} ₫
              </Text>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleConfirm}
            loading={loading}
            className="!bg-green-600 hover:!bg-green-700 !h-12 !px-8 !text-base !font-semibold"
          >
            ĐỒNG Ý BÁO GIÁ
          </Button>
          <Button
            danger
            size="large"
            icon={<CloseCircleOutlined />}
            onClick={() => setRejectModalOpen(true)}
            className="!h-12 !px-8 !text-base !font-semibold"
          >
            TỪ CHỐI
          </Button>
        </div>

        {/* Footer note */}
        <div className="text-center mt-6 text-gray-500 text-sm">
          Nếu cần chỉnh sửa hoặc tư vấn thêm, vui lòng phản hồi email này.
        </div>

        {/* Reject Modal */}
        <Modal
          title={
            <span className="flex items-center gap-2 text-red-600">
              <CloseCircleOutlined />
              Từ chối báo giá
            </span>
          }
          open={rejectModalOpen}
          onCancel={() => setRejectModalOpen(false)}
          footer={[
            <Button key="cancel" onClick={() => setRejectModalOpen(false)}>
              Hủy
            </Button>,
            <Button 
              key="submit" 
              danger 
              type="primary" 
              onClick={handleReject}
              loading={loading}
            >
              Gửi phản hồi
            </Button>,
          ]}
        >
          <div className="py-4">
            <Text className="block mb-2">
              Vui lòng cho chúng tôi biết lý do bạn từ chối báo giá này:
            </Text>
            <TextArea
              rows={4}
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
}
