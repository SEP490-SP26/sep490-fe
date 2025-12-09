'use client';

import { useProduction } from '@/context/ProductionContext';
import { InboxOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, InputNumber, Result, Typography, Upload } from 'antd';
import Link from 'next/link';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function CustomerOrderPage() {
  const [form] = Form.useForm();
  const { addOrder } = useProduction();
  const [isSuccess, setIsSuccess] = useState(false);

  const normFile = (e: any) => {
    if (Array.isArray(e)) return e;
    return e?.fileList;
  };

  const onFinish = (values: any) => {
    // Giả lập link file
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
              <Button type="primary" size="large" key="back" onClick={() => { setIsSuccess(false); form.resetFields(); }}>
                Đặt đơn khác
              </Button>, 
              <Link href="/consultant/orders" key="home">
                <Button size="large">Về trang chủ</Button>
              </Link>
            ]}
          />
        </Card>
      </div>
    );
  }

  // Style chung cho các ô input để viền đậm và to hơn
  const inputStyle = "border-2 border-gray-300 focus:border-blue-500 rounded-lg hover:border-blue-400 text-base py-2";
  const labelStyle = "font-bold text-gray-800 text-base";

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      {/* Tăng độ rộng form lên max-w-5xl */}
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <Title level={2} style={{ color: '#1677ff', textTransform: 'uppercase', fontWeight: 'bold' }}>
            Đặt In Online
          </Title>
          <Text type="secondary" className="text-lg">
            Điền thông tin sơ bộ để chúng tôi tư vấn giải pháp tốt nhất
          </Text>
        </div>
        
        <Card className="shadow-xl rounded-2xl border-t-8 border-blue-600">
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={onFinish} 
            size="large"
            requiredMark="optional"
          >
            
            {/* 1. Thông tin liên hệ */}
            <Card type="inner" title={<span className="text-lg font-bold text-blue-800">1. THÔNG TIN LIÊN HỆ</span>} className="mb-8 bg-gray-50 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item 
                    name="customerName" 
                    label={<span className={labelStyle}>Họ và tên / Công ty</span>} 
                    rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
                >
                  <Input placeholder="VD: Nguyễn Văn A" className={inputStyle} />
                </Form.Item>
                <Form.Item 
                    name="phone" 
                    label={<span className={labelStyle}>Số điện thoại (Zalo)</span>} 
                    rules={[{ required: true, message: 'Cần SĐT để liên hệ lại' }]}
                >
                  <Input placeholder="09xxxxxxx" className={inputStyle} />
                </Form.Item>
                <Form.Item 
                    name="email" 
                    label={<span className={labelStyle}>Email (Nhận báo giá)</span>} 
                    className="md:col-span-2"
                >
                  <Input placeholder="example@email.com" className={inputStyle} />
                </Form.Item>
              </div>
            </Card>

            {/* 2. Yêu cầu sản phẩm */}
            <Card type="inner" title={<span className="text-lg font-bold text-blue-800">2. YÊU CẦU IN ẤN</span>} className="mb-8 bg-gray-50 border-gray-200">
              <Form.Item 
                name="productName" 
                label={<span className={labelStyle}>Tên sản phẩm cần in</span>} 
                rules={[{ required: true, message: 'Vui lòng nhập tên SP' }]}
              >
                <Input placeholder="VD: Hộp bánh trung thu, Catalogue, Tờ rơi..." className={inputStyle} />
              </Form.Item>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Form.Item 
                    name="quantity" 
                    label={<span className={labelStyle}>Số lượng dự kiến</span>} 
                    rules={[{ required: true, message: 'Nhập số lượng' }]}
                >
                  <InputNumber 
                    className={`w-full ${inputStyle}`}
                    min={1} 
                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    placeholder="VD: 1,000"
                  />
                </Form.Item>
                <Form.Item 
                    name="desiredDate" 
                    label={<span className={labelStyle}>Ngày mong muốn nhận hàng</span>} 
                    rules={[{ required: true, message: 'Chọn ngày' }]}
                >
                  <DatePicker className={`w-full ${inputStyle}`} format="DD/MM/YYYY" placeholder="Chọn ngày" />
                </Form.Item>
              </div>

              <Form.Item name="note" label={<span className={labelStyle}>Mô tả thêm (Kích thước, chất liệu...)</span>}>
                <Input.TextArea rows={4} placeholder="VD: Kích thước 20x20cm, giấy dày, cán bóng..." className={`!border-2 !border-gray-300 !rounded-lg hover:!border-blue-400`} />
              </Form.Item>

              <Form.Item 
                label={<span className={labelStyle}>File thiết kế mẫu (nếu có)</span>} 
                name="designFile" 
                valuePropName="fileList" 
                getValueFromEvent={normFile}
              >
                <Upload.Dragger 
                  name="files" 
                  action="https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188" 
                  listType="picture"
                  maxCount={1}
                  className="bg-white !border-2 !border-dashed !border-blue-300 hover:!border-blue-600 rounded-xl"
                >
                  <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1677ff', fontSize: '32px' }} /></p>
                  <p className="ant-upload-text font-medium text-gray-600">Kéo thả file hoặc click để tải lên</p>
                  <p className="ant-upload-hint text-gray-400">Hỗ trợ PDF, AI, PSD, ZIP (Max 10MB)</p>
                </Upload.Dragger>
              </Form.Item>
            </Card>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" block size="large" className="h-14 text-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-lg rounded-xl uppercase tracking-wide">
                GỬI YÊU CẦU BÁO GIÁ
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
} 