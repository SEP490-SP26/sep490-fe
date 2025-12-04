'use client';

import { useProduction } from '@/context/ProductionContext';
import { InboxOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, InputNumber, Result, Typography, Upload } from 'antd';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function CustomerOrderPage() {
  const [form] = Form.useForm();
  const { addOrder } = useProduction();
  const [isSuccess, setIsSuccess] = useState(false);

  // Xử lý giá trị upload để lấy file list
  const normFile = (e: any) => {
    if (Array.isArray(e)) return e;
    return e?.fileList;
  };

  const onFinish = (values: any) => {

    const fakeFileUrl = values.designFile?.[0] ? `https://storage.cloud.com/${values.designFile[0].name}` : '';

    addOrder({
      product_id: 'custom',
      product_name: values.productName,
      customer_name: values.customerName,
      customer_phone: values.phone,
      customer_email: values.email,
      quantity: values.quantity,
      delivery_date: values.desiredDate ? values.desiredDate.format('YYYY-MM-DD') : '',
      design_file_url: fakeFileUrl,
      note: values.note,
      specs: { width: 0, height: 0, length: 0, paper_id: '', colors: [], processing: [] }
    });

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-2xl shadow-md">
          <Result
            status="success"
            title="Gửi Yêu Cầu Thành Công!"
            subTitle="Chúng tôi đã nhận được thông tin. Nhân viên tư vấn sẽ liên hệ lại với bạn để chốt giá và quy cách chi tiết."
            extra={[
              <Button type="primary" key="back" onClick={() => { setIsSuccess(false); form.resetFields(); }}>
                Đặt đơn khác
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Title level={2} style={{ color: '#1677ff', textTransform: 'uppercase' }}>Đặt In Online</Title>
          <Text type="secondary">Điền thông tin sơ bộ để chúng tôi tư vấn giải pháp tốt nhất</Text>
        </div>
        
        <Card className="shadow-lg rounded-xl border-t-4 border-blue-600">
          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            
            {/* 1. Thông tin liên hệ */}
            <Card type="inner" title="1. Thông tin liên hệ" className="mb-6 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="customerName" label="Họ và tên / Công ty" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                  <Input placeholder="VD: Nguyễn Văn A" />
                </Form.Item>
                <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, message: 'Cần SĐT để liên hệ lại' }]}>
                  <Input placeholder="09xxxxxxx" />
                </Form.Item>
                <Form.Item name="email" label="Email (Nhận báo giá)">
                  <Input placeholder="example@email.com" />
                </Form.Item>
              </div>
            </Card>

            {/* 2. Yêu cầu sản phẩm */}
            <Card type="inner" title="2. Yêu cầu in ấn" className="mb-6 bg-gray-50">
              <Form.Item name="productName" label="Tên sản phẩm cần in" rules={[{ required: true, message: 'Vui lòng nhập tên SP' }]}>
                <Input placeholder="VD: Hộp bánh trung thu, Catalogue, Tờ rơi..." />
              </Form.Item>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="quantity" label="Số lượng dự kiến" rules={[{ required: true, message: 'Nhập số lượng' }]}>
                  <InputNumber 
                    className="w-full" 
                    min={1} 
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    placeholder="VD: 1,000"
                  />
                </Form.Item>
                <Form.Item name="desiredDate" label="Ngày mong muốn nhận hàng" rules={[{ required: true, message: 'Chọn ngày' }]}>
                  <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày" />
                </Form.Item>
              </div>

              <Form.Item name="note" label="Mô tả thêm (Kích thước, chất liệu mong muốn...)">
                <Input.TextArea rows={3} placeholder="VD: Kích thước 20x20cm, giấy dày, cán bóng..." />
              </Form.Item>

              <Form.Item label="File thiết kế mẫu (nếu có)" name="designFile" valuePropName="fileList" getValueFromEvent={normFile}>
                <Upload.Dragger 
                  name="files" 
                  action="https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188" 
                  listType="picture"
                  maxCount={1}
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                  <p className="ant-upload-text">Kéo thả file hoặc click để tải lên</p>
                  <p className="ant-upload-hint">Hỗ trợ PDF, AI, PSD, ZIP (Max 10MB)</p>
                </Upload.Dragger>
              </Form.Item>
            </Card>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" block size="large" className="h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700">
                GỬI YÊU CẦU BÁO GIÁ
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}