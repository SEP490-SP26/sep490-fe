'use client';

import { useProduction } from '@/context/ProductionContext';
import {
  CalculatorOutlined,
  ClockCircleOutlined,
  CodeSandboxOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ThunderboltFilled,
  UserOutlined
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card, Checkbox,
  Col,
  ColorPicker,
  DatePicker,
  Divider,
  Form, Input, InputNumber,
  message,
  Row,
  Select,
  Space, Tag, Typography
} from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

const { Text } = Typography;

// --- DỮ LIỆU MẪU ---
const PAPER_TYPES = [
  { label: 'Giấy Duplex 250 (Khổ 650)', value: 'VT00008', stock: 30437 },
  { label: 'Giấy Ivory 300 (Khổ 79x109)', value: 'VT00012', stock: 1200 },
  { label: 'Giấy Couche 150', value: 'VT00020', stock: 5000 },
];

const PROCESSING_OPTS = [
  { label: 'Cán màng', value: 'can_mang' },
  { label: 'Phủ UV', value: 'phu_uv' },
  { label: 'Bế', value: 'be' },
  { label: 'Dán', value: 'dan_may' },
];

const PRODUCT_SUGGESTIONS = [
  "Hộp bánh trung thu cao cấp", "Hộp thuốc tây", "Tờ rơi A4", "Catalogue 32 trang", "Hộp carton sóng E"
];

// --- CẤU HÌNH PHÍ GẤP ---
const RUSH_FEE_LOW = 500000;   // Xưởng Rảnh
const RUSH_FEE_HIGH = 2000000; // Xưởng Bận

export default function ConsultantPage() {
  const [form] = Form.useForm();
  const { addOrder, isBusy } = useProduction(); 
  const [loading, setLoading] = useState(false);
  
  // State tính toán
  const [estimate, setEstimate] = useState<{
    baseCost: number;
    rushFee: number;
    daysEarly: number;
    finalCost: number;
    systemDate: string;
    caseType: 1 | 2 | 3;
  } | null>(null);

  // --- LOGIC TÍNH TOÁN (CORE) ---
  const handleCalculate = (changedValues: any, allValues: any) => {
    const { quantity, desiredDate } = allValues;

    if (!quantity) return;

    // 1. Tính giá cơ bản
    const baseCost = (quantity * 2500) + 3000000; 

    // 2. Tính ngày hệ thống đề xuất (2000sp/ngày + 2 ngày setup)
    const productionDays = Math.ceil(quantity / 2000) + 2;
    const today = dayjs();
    const systemDateObj = today.add(productionDays, 'day');
    const systemDateStr = systemDateObj.format('YYYY-MM-DD');

    // **TÍNH NĂNG MỚI**: Nếu thay đổi số lượng, tự động cập nhật ngày gợi ý vào ô DatePicker
    // Chỉ cập nhật nếu người dùng chưa chọn ngày, hoặc đang thao tác trên trường 'quantity'
    if ('quantity' in changedValues) {
        form.setFieldValue('desiredDate', systemDateObj);
    }

    // 3. Logic 3 Case (Dựa trên ngày hiện tại trong ô DatePicker)
    // Lấy ngày thực tế đang chọn (có thể là systemDateObj vừa set, hoặc ngày user tự sửa)
    const currentDesiredDate = desiredDate || systemDateObj; 

    let rushFee = 0;
    let daysEarly = 0;
    let caseType: 1 | 2 | 3 = 1;

    if (currentDesiredDate.isBefore(systemDateObj, 'day')) {
      // Khách muốn sớm hơn hệ thống tính
      daysEarly = systemDateObj.diff(currentDesiredDate, 'day');
      
      if (!isBusy) {
        // Case 2: Gấp - Xưởng Rảnh
        rushFee = daysEarly * RUSH_FEE_LOW;
        caseType = 2;
      } else {
        // Case 3: Gấp - Xưởng Bận (Deal giá)
        rushFee = daysEarly * RUSH_FEE_HIGH;
        caseType = 3;
      }
    }

    setEstimate({
      baseCost, rushFee, daysEarly,
      finalCost: baseCost + rushFee,
      systemDate: systemDateStr,
      caseType
    });
  };

  const onFinish = (values: any) => {
    setLoading(true);
    
    // Lấy danh sách màu (HEX string)
    const colors = values.colors?.map((c: any) => 
      typeof c === 'string' ? c : c?.toHexString()
    ) || [];

    setTimeout(() => {
      addOrder({
        product_id: 'custom-prod',
        product_name: values.productName,
        quantity: values.quantity,
        delivery_date: values.desiredDate.format('YYYY-MM-DD'),
        system_delivery_date: estimate?.systemDate,
        customer_name: values.customerName,
        process_status: 'consultant_verified',
        final_price: estimate?.finalCost,
        rush_fee: estimate?.rushFee,
        specs: {
            width: values.width, height: values.height, length: values.length,
            paper_id: values.paperType,
            colors: colors, 
            processing: values.processing
        },
        note: values.notes
      });
      
      message.success('Đã gửi đơn hàng cho Manager duyệt!');
      setLoading(false);
      form.resetFields();
      setEstimate(null);
    }, 1000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center bg-white p-4 rounded shadow-sm">
          <h1 className="text-xl font-bold m-0 uppercase">Tạo Đơn Hàng</h1>
          <Tag color={isBusy ? "red" : "green"} className="text-base py-1 px-4">
            {isBusy ? "🔥 Xưởng Bận (High Load)" : "✅ Xưởng Rảnh (Low Load)"}
          </Tag>
        </div>

        <Row gutter={24}>
          {/* CỘT TRÁI: FORM */}
          <Col span={15}>
            <Card title={<><CodeSandboxOutlined /> Thông Tin Đơn Hàng</>} className="shadow-sm">
              <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleCalculate}>
                
                {/* Khách hàng */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="customerName" label="Khách Hàng" rules={[{ required: true }]}>
                      <Input prefix={<UserOutlined />} placeholder="Tên khách..." />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="SĐT">
                      <Input style={{ textAlign: 'right' }} placeholder="09..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider titlePlacement="left">Thông Số Kỹ Thuật</Divider>

                {/* Sản phẩm & Kích thước (Layout mới: Tên dài, Kích thước gọn) */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="productName" label="Tên Sản Phẩm" rules={[{ required: true }]}>
                      <Select
                        showSearch
                        placeholder="Chọn hoặc nhập mới"
                        optionFilterProp="children"
                        options={PRODUCT_SUGGESTIONS.map(name => ({ label: name, value: name }))}
                        mode="tags"
                        maxCount={1}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Kích thước (Dài - Rộng - Cao)" required tooltip="Đơn vị: mm">
                      <Space.Compact block>
                        <Form.Item name="length" noStyle><InputNumber style={{ width: '33%', textAlign: 'right' }} placeholder="D" min={0} /></Form.Item>
                        <Form.Item name="width" noStyle><InputNumber style={{ width: '33%', textAlign: 'right' }} placeholder="R" min={0} /></Form.Item>
                        <Form.Item name="height" noStyle><InputNumber style={{ width: '34%', textAlign: 'right' }} placeholder="C" min={0} /></Form.Item>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Giấy & Số lượng (Số canh phải) */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="paperType" label="Loại Giấy" rules={[{ required: true }]}>
                      <Select showSearch options={PAPER_TYPES} placeholder="Chọn giấy" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="quantity" label="Số Lượng" rules={[{ required: true }]}>
                      <InputNumber className="w-full" style={{ textAlign: 'right' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>
                  </Col>
                </Row>

                {/* --- CHỌN MÀU (Color Picker & Add More) --- */}
                <Form.Item label="Màu sắc">
                  <Form.List name="colors" initialValue={['#1677ff']}>
                    {(fields, { add, remove }) => (
                      <div className="flex flex-wrap gap-2">
                        {fields.map((field) => (
                          <Space key={field.key} className="bg-gray-50 p-1 rounded border">
                            <Form.Item {...field} noStyle>
                              <ColorPicker showText />
                            </Form.Item>
                            {fields.length > 1 && (
                                <MinusCircleOutlined onClick={() => remove(field.name)} className="text-red-500 cursor-pointer" />
                            )}
                          </Space>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>Thêm màu</Button>
                      </div>
                    )}
                  </Form.List>
                </Form.Item>

                {/* Gia công */}
                <Form.Item name="processing" label="Gia Công">
                  <Checkbox.Group options={PROCESSING_OPTS} />
                </Form.Item>

                {/* Ghi chú */}
                <Form.Item name="notes" label="Ghi Chú"><Input.TextArea rows={1} /></Form.Item>

                {/* Ngày giao (Xuống cuối) */}
                <Form.Item 
                    name="desiredDate" 
                    label="Ngày Giao Hàng Dự Kiến" 
                    rules={[{ required: true }]}
                    help={estimate ? <span className="text-blue-600 font-medium">Hệ thống đề xuất: {dayjs(estimate.systemDate).format('DD/MM/YYYY')}</span> : ""}
                >
                    <DatePicker className="w-full" format="DD/MM/YYYY" placeholder="Chọn ngày giao" />
                </Form.Item>

                {/* Nút Submit (Thay đổi theo Case) */}
                <Form.Item className="mt-4">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    size="large" 
                    loading={loading} 
                    block 
                    className={`h-12 font-bold ${
                      estimate?.caseType === 3 ? 'bg-red-600 hover:bg-red-700' : 
                      estimate?.caseType === 2 ? 'bg-orange-500 hover:bg-orange-600' : 
                      'bg-blue-600'
                    }`}
                  >
                    {estimate?.caseType === 3 ? "CHỐT GIÁ & GỬI DUYỆT" : 
                     estimate?.caseType === 2 ? "XÁC NHẬN & GỬI DUYỆT" : 
                     "XÁC NHẬN & GỬI DUYỆT"}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* CỘT PHẢI: LOGIC PHÂN TÍCH */}
          <Col span={9}>
            <div className="sticky top-6 space-y-4">
              <Card title={<><ClockCircleOutlined /> Phân Tích & Hành Động</>} className="shadow-sm border-blue-100">
                {!estimate ? <div className="text-gray-400 text-center py-4">Nhập liệu để phân tích</div> : (
                  <div className="flex flex-col gap-3">
                    {estimate.caseType === 1 && (
                      <Alert title="Case 1: Hợp lý" description="Yêu cầu phù hợp với năng lực. Gọi xác nhận với khách hàng và gửi manager." type="success" showIcon />
                    )}
                    {estimate.caseType === 2 && (
                      <Alert title="Case 2: In gấp (xưởng rảnh)" description={`Khách cần sớm ${estimate.daysEarly} ngày. Xưởng trống nên có thể nhận.`} type="warning" showIcon />
                    )}
                    {estimate.caseType === 3 && (
                      <Alert title="Case 3: In gấp (xưởng bận)" description={`Khách cần sớm ${estimate.daysEarly} ngày khi quá tải. Cần thương lượng lại với khách hàng.`} type="error" showIcon />
                    )}
                  </div>
                )}
              </Card>

              <Card title={<><CalculatorOutlined /> Chi Phí</>} className="shadow-sm">
                {estimate && (
                  <div className="space-y-4">
                    <div className="flex justify-between"><span>Giá gốc:</span> <b>{estimate.baseCost.toLocaleString()} ₫</b></div>
                    {estimate.rushFee > 0 && (
                      <div className="flex justify-between text-red-600 bg-red-50 p-2 rounded">
                        <span><ThunderboltFilled /> Phí in gấp ({estimate.daysEarly} ngày):</span> <b>+{estimate.rushFee.toLocaleString()} ₫</b>
                      </div>
                    )}
                    <Divider className="my-2" />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-700">{estimate.finalCost.toLocaleString()} ₫</div>
                      {estimate.rushFee > 0 && <div className="text-xs text-red-500">(Đã gồm phí ưu tiên)</div>}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}