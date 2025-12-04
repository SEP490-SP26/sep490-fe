'use client';

import { useProduction } from '@/context/ProductionContext';
import {
  CalculatorOutlined,
  ClockCircleOutlined,
  CodeSandboxOutlined,
  ExperimentOutlined, // Icon cho lấy màu
  BgColorsOutlined,   // Icon cho chấm màu
  InboxOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ThunderboltFilled,
  UserOutlined,
  FileImageOutlined
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
  Space, Tag, Typography,
  Upload,
  Image as AntImage,
  Tooltip,
  List
} from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

// --- UTILS: HÀM XỬ LÝ MÀU TỪ ẢNH (CANVAS API) ---
const getDominantColors = (imageSrc: string, count: number = 5): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject("Canvas context error");

            canvas.width = 100;
            canvas.height = 100 * (img.height / img.width);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colorCounts: { [key: string]: number } = {};
            
            for (let i = 0; i < imageData.length; i += 4 * 5) {
                const r = imageData[i];
                const g = imageData[i + 1];
                const b = imageData[i + 2];
                const alpha = imageData[i + 3];
                if (alpha < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;

                const rRound = Math.round(r / 20) * 20;
                const gRound = Math.round(g / 20) * 20;
                const bRound = Math.round(b / 20) * 20;
                
                const rgb = `rgb(${rRound},${gRound},${bRound})`;
                colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
            }

            const sortedColors = Object.entries(colorCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, count)
                .map(([color]) => {
                    const [r, g, b] = color.match(/\d+/g)!.map(Number);
                    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                });
            
            resolve(sortedColors);
        };
        img.onerror = (e) => reject(e);
    });
};

// --- DỮ LIỆU MẪU ---
const PAPER_TYPES = [
  { label: 'Giấy Duplex 250 (Khổ 650)', value: 'VT00008', stock: 30437 },
  { label: 'Giấy Ivory 300 (Khổ 79x109)', value: 'VT00012', stock: 1200 },
  { label: 'Giấy Couche 150', value: 'VT00020', stock: 5000 },
  { label: 'Giấy Kraft', value: 'VT00030', stock: 0 }, 
];

const PROCESSING_OPTS = [
  { label: 'Cán màng (Bóng/Mờ)', value: 'can_mang' },
  { label: 'Phủ UV/Varnish', value: 'phu_uv' },
  { label: 'Bế (Die-cut)', value: 'be' },
  { label: 'Dán máy', value: 'dan_may' },
  { label: 'Bồi sóng', value: 'boi_song' },
];

const PRODUCT_SUGGESTIONS = [
  "Hộp bánh trung thu cao cấp", "Hộp thuốc tây", "Tờ rơi A4", "Catalogue 32 trang", "Hộp carton sóng E"
];

const RUSH_FEE_LOW = 500000;
const RUSH_FEE_HIGH = 2000000;

// --- COMPONENT CHÍNH ---
function ConsultantForm() {
  const [form] = Form.useForm();
  const { addOrder, updateOrder, orders, isBusy } = useProduction(); 
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderId = searchParams.get('orderId'); 
  const [loading, setLoading] = useState(false);
  
  // State quản lý danh sách file
  const [fileList, setFileList] = useState<UploadFile[]>([]); 
  
  // State ảnh đang được chọn để phân tích màu
  const [previewImage, setPreviewImage] = useState<string>('');

  const [estimate, setEstimate] = useState<{
    baseCost: number;
    rushFee: number;
    daysEarly: number;
    finalCost: number;
    systemDate: string;
    caseType: 1 | 2 | 3;
  } | null>(null);

  // --- 1. TỰ ĐỘNG ĐIỀN DỮ LIỆU ---
  useEffect(() => {
    if (orderId) {
      const existingOrder = orders.find(o => o.id === orderId);
      if (existingOrder) {
        form.setFieldsValue({
          customerName: existingOrder.customer_name,
          phone: existingOrder.customer_phone,
          productName: existingOrder.product_name ? [existingOrder.product_name] : [],
          quantity: existingOrder.quantity,
          desiredDate: existingOrder.delivery_date ? dayjs(existingOrder.delivery_date) : null,
          notes: existingOrder.note,
          length: existingOrder.specs?.width || 0,
          width: existingOrder.specs?.height || 0,
          height: existingOrder.specs?.length || 0,
          paperType: existingOrder.specs?.paper_id,
          colors: existingOrder.specs?.colors,
          processing: existingOrder.specs?.processing,
        });

        // Xử lý File cũ (Giả sử DB lưu chuỗi các URL phân cách bằng dấu phẩy)
        if (existingOrder.design_file_url) {
            const urls = existingOrder.design_file_url.split(',');
            const initialFiles = urls.map((url, index) => ({
                uid: `-${index}`,
                name: `File thiết kế ${index + 1}`,
                status: 'done',
                url: url.trim(),
            })) as UploadFile[];
            
            setFileList(initialFiles);
            // Mặc định chọn file đầu tiên để preview nếu có
            if (initialFiles.length > 0 && initialFiles[0].url) {
                setPreviewImage(initialFiles[0].url);
            }
        }

        handleCalculate(
          { quantity: existingOrder.quantity }, 
          { 
            quantity: existingOrder.quantity, 
            desiredDate: existingOrder.delivery_date ? dayjs(existingOrder.delivery_date) : null,
            paperType: existingOrder.specs?.paper_id
          }
        );
      }
    }
  }, [orderId, orders, form]);

  // Xử lý thay đổi file
  const handleFileChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    
    // Nếu vừa upload file mới và chưa có preview nào, set luôn
    const lastFile = newFileList[newFileList.length - 1];
    if (lastFile && lastFile.originFileObj && !previewImage) {
         // Create blob URL
         const objectUrl = URL.createObjectURL(lastFile.originFileObj);
         setPreviewImage(objectUrl);
    }
  };

  // Hàm xử lý khi bấm vào nút "Xem/Phân tích" của một file
  const handleSelectPreview = async (file: UploadFile) => {
      if (!file.url && !file.preview) {
        file.preview = await getBase64(file.originFileObj as File);
      }
      setPreviewImage(file.url || (file.preview as string));
  };

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });


  // --- TÍNH NĂNG MÀU SẮC ---
  const handleAutoExtractColors = async () => {
    if (!previewImage) return message.warning("Vui lòng chọn một ảnh để phân tích!");
    try {
        message.loading({ content: "Đang phân tích ảnh...", key: 'extracting' });
        const colors = await getDominantColors(previewImage);
        
        // Logic: Giữ màu cũ, thêm màu mới (không trùng)
        const currentColors = form.getFieldValue('colors') || [];
        const newColors = [...new Set([...currentColors, ...colors])].slice(0, 8); // Giới hạn max 8 màu
        
        form.setFieldValue('colors', newColors);
        message.success({ content: `Đã trích xuất thêm ${colors.length} màu!`, key: 'extracting' });
    } catch (error) {
        console.error(error);
        message.error({ content: "Lỗi phân tích ảnh (định dạng không hỗ trợ).", key: 'extracting' });
    }
  };

  const handleEyeDropper = async () => {
    if (!window.EyeDropper) {
        return message.error("Trình duyệt không hỗ trợ EyeDropper (Dùng Chrome/Edge).");
    }
    try {
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        const hexColor = result.sRGBHex;

        const currentColors = form.getFieldValue('colors') || [];
        if (!currentColors.includes(hexColor)) {
            form.setFieldValue('colors', [...currentColors, hexColor]);
            message.success(`Đã thêm màu: ${hexColor}`);
        }
    } catch (e) {
        // User hủy bỏ
    }
  };


  // --- LOGIC TÍNH TOÁN & SUBMIT (Giữ nguyên logic cũ) ---
  const handleCalculate = (changedValues: any, allValues: any) => {
    const { quantity, paperType, desiredDate } = allValues;

    if (!quantity) return;
    const baseCost = (quantity * 2500) + 3000000; 
    const productionDays = Math.ceil(quantity / 2000) + 2; 
    const today = dayjs();
    const systemDateObj = today.add(productionDays, 'day');
    const systemDateStr = systemDateObj.format('YYYY-MM-DD');

    if (!orderId && 'quantity' in changedValues && !desiredDate) {
        form.setFieldValue('desiredDate', systemDateObj);
    }

    const currentDesiredDate = desiredDate || systemDateObj;
    let rushFee = 0;
    let daysEarly = 0;
    let caseType: 1 | 2 | 3 = 1;

    if (currentDesiredDate.isBefore(systemDateObj, 'day')) {
      daysEarly = systemDateObj.diff(currentDesiredDate, 'day');
      if (!isBusy) {
        rushFee = daysEarly * RUSH_FEE_LOW;
        caseType = 2;
      } else {
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
    
    const colors = values.colors?.map((c: any) => typeof c === 'string' ? c : c?.toHexString()) || [];
    
    // Xử lý nhiều file: Nối URL thành chuỗi (vì Backend hiện tại dùng string)
    // Trong thực tế nên sửa backend thành mảng string[]
    const fileUrls = fileList
        .map(f => f.url || 'new-file-url-placeholder')
        .join(',');

    const orderData = {
      product_name: Array.isArray(values.productName) ? values.productName[0] : values.productName,
      quantity: values.quantity,
      delivery_date: values.desiredDate.format('YYYY-MM-DD'),
      system_delivery_date: estimate?.systemDate,
      customer_name: values.customerName,
      customer_phone: values.phone,
      process_status: 'consultant_verified' as const, 
      final_price: estimate?.finalCost,
      rush_fee: estimate?.rushFee,
      design_file_url: fileUrls, // Lưu chuỗi nối
      specs: {
          width: values.width, height: values.height, length: values.length,
          paper_id: values.paperType,
          colors: colors,
          processing: values.processing
      },
      note: values.notes
    };

    setTimeout(() => {
      if (orderId) {
        updateOrder(orderId, orderData);
        message.success('Đã cập nhật đơn hàng!');
      } else {
        addOrder({
            product_id: 'custom-prod',
            ...orderData
        });
        message.success('Đã tạo đơn mới!');
      }
      
      setLoading(false);
      router.push('/consultant/orders'); 
    }, 1000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center bg-white p-4 rounded shadow-sm">
          <div>
            <h1 className="text-xl font-bold m-0 uppercase">
              {orderId ? `Xử Lý Đơn Hàng #${orderId.split('-')[1] || orderId}` : 'Tạo Đơn Hàng Mới'}
            </h1>
            <span className="text-gray-500 text-sm">
              {orderId ? 'Kiểm tra thông tin khách gửi và chốt phương án' : 'Nhập thông tin yêu cầu sản xuất'}
            </span>
          </div>
          <Tag color={isBusy ? "red" : "green"} className="text-base py-1 px-4">
            {isBusy ? "🔥 Xưởng Bận (High Load)" : "✅ Xưởng Rảnh (Low Load)"}
          </Tag>
        </div>

        <Row gutter={24}>
          <Col span={15}>
            <Card title={<><CodeSandboxOutlined /> Thông Tin Đơn Hàng</>} className="shadow-sm">
              <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={handleCalculate}>
                
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

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="productName" label="Tên Sản Phẩm" rules={[{ required: true }]}>
                      <Select
                        showSearch
                        placeholder="Chọn hoặc nhập mới"
                        options={PRODUCT_SUGGESTIONS.map(name => ({ label: name, value: name }))}
                        mode="tags"
                        maxCount={1}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Kích thước (D - R - C)" required>
                      <Space.Compact block>
                        <Form.Item name="length" noStyle><InputNumber style={{ width: '33%', textAlign: 'right' }} placeholder="D" /></Form.Item>
                        <Form.Item name="width" noStyle><InputNumber style={{ width: '33%', textAlign: 'right' }} placeholder="R" /></Form.Item>
                        <Form.Item name="height" noStyle><InputNumber style={{ width: '34%', textAlign: 'right' }} placeholder="C" /></Form.Item>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="paperType" label="Loại Giấy" rules={[{ required: true }]}>
                      <Select options={PAPER_TYPES} placeholder="Chọn giấy" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="quantity" label="Số Lượng" rules={[{ required: true }]}>
                      <InputNumber className="w-full" style={{ textAlign: 'right' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                    </Form.Item>
                  </Col>
                </Row>

                 {/* --- KHU VỰC QUẢN LÝ NHIỀU FILE & MÀU SẮC --- */}
                 <div className="mb-4 p-4 border border-dashed rounded bg-gray-50">
                    <Row gutter={16}>
                        {/* Cột trái: Upload nhiều file */}
                        <Col span={10} className="border-r">
                             <div className="font-semibold mb-2 flex items-center gap-2">
                                <FileImageOutlined /> Danh sách File
                             </div>
                             <Upload 
                                listType="picture"
                                fileList={fileList} 
                                onChange={handleFileChange}
                                beforeUpload={() => false} 
                                multiple // Cho phép chọn nhiều file
                                className="upload-list-inline"
                                onPreview={handleSelectPreview} // Bấm vào mắt/ảnh để chọn phân tích
                             >
                                <Button icon={<InboxOutlined />} block>Tải file lên</Button>
                             </Upload>
                             <div className="text-gray-400 text-xs mt-2 italic">
                                * Gợi ý: Bấm vào tên file hoặc ảnh để chọn phân tích màu.
                             </div>
                        </Col>

                        {/* Cột phải: Preview ảnh đang chọn & Công cụ */}
                        <Col span={14}>
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <div className="font-semibold mb-2 flex justify-between items-center">
                                        <span>Phân tích màu</span>
                                        <Space>
                                            <Tooltip title="Tự động tìm 5 màu chủ đạo trong ảnh này">
                                                <Button size="small" type="primary" ghost icon={<ExperimentOutlined />} onClick={handleAutoExtractColors} disabled={!previewImage}>
                                                    Auto
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Chấm màu thủ công">
                                                <Button size="small" icon={<BgColorsOutlined />} onClick={handleEyeDropper}>
                                                    Chấm màu
                                                </Button>
                                            </Tooltip>
                                        </Space>
                                    </div>
                                    
                                    <div className="flex justify-center items-center bg-gray-200 rounded h-40 overflow-hidden relative border">
                                        {previewImage ? (
                                            <AntImage 
                                                src={previewImage} 
                                                height="100%" 
                                                className="object-contain"
                                                alt="Preview Analysis"
                                            />
                                        ) : (
                                            <span className="text-gray-400 text-xs">Chưa chọn ảnh nào để soi</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                 </div>

                {/* Màu sắc */}
                <Form.Item label="Màu sắc">
                  <Form.List name="colors" initialValue={['#1677ff']}>
                    {(fields, { add, remove }) => (
                      <div className="flex flex-wrap gap-2">
                        {fields.map((field) => (
                          <Space key={field.key} className="bg-white p-1 rounded border shadow-sm">
                            <Form.Item {...field} noStyle>
                              <ColorPicker showText size="small" />
                            </Form.Item>
                            {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(field.name)} className="text-red-500 cursor-pointer" />}
                          </Space>
                        ))}
                        <Button type="dashed" size="small" onClick={() => add()} icon={<PlusOutlined />}>Thêm</Button>
                      </div>
                    )}
                  </Form.List>
                </Form.Item>

                {/* Gia công */}
                <Form.Item name="processing" label="Gia công">
                  <Checkbox.Group options={PROCESSING_OPTS} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="notes" label="Ghi Chú"><Input.TextArea rows={1} /></Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      name="desiredDate" 
                      label="Ngày Giao Dự Kiến" 
                      rules={[{ required: true }]}
                      help={estimate ? <span className="text-blue-500 text-xs">Hệ thống tính: {dayjs(estimate.systemDate).format('DD/MM/YYYY')}</span> : ""}
                    >
                      <DatePicker className="w-full" format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                </Row>

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
                    {estimate?.caseType === 3 ? "CHỐT DEAL GIÁ & GỬI DUYỆT" : 
                     estimate?.caseType === 2 ? "XÁC NHẬN ƯU TIÊN & GỬI DUYỆT" : 
                     "XÁC NHẬN & GỬI DUYỆT"}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* CỘT PHẢI: LOGIC (Giữ nguyên) */}
          <Col span={9}>
            <div className="sticky top-6 space-y-4">
              <Card title={<><ClockCircleOutlined /> Phân tích tiến độ</>} className="shadow-sm border-blue-100">
                {!estimate ? <div className="text-gray-400 text-center py-4">Nhập liệu để phân tích</div> : (
                  <div className="flex flex-col gap-3">
                    {estimate.caseType === 1 && <Alert message="Case 1: Hợp Lý" description="Tiến độ chuẩn." type="success" showIcon />}
                    {estimate.caseType === 2 && <Alert message="Case 2: Gấp - Xưởng Rảnh" description={`Sớm ${estimate.daysEarly} ngày. Xưởng trống.`} type="warning" showIcon />}
                    {estimate.caseType === 3 && <Alert message="Case 3: Gấp - Xưởng Bận" description={`Sớm ${estimate.daysEarly} ngày khi quá tải. Cần thương lượng kĩ với khách hàng.`} type="error" showIcon />}
                  </div>
                )}
              </Card>

              <Card title={<><CalculatorOutlined /> Chi Phí</>} className="shadow-sm">
                {estimate && (
                  <div className="space-y-4">
                    <div className="flex justify-between"><span>Giá gốc:</span> <b>{estimate.baseCost.toLocaleString()} ₫</b></div>
                    {estimate.rushFee > 0 && (
                      <div className="flex justify-between text-red-600 bg-red-50 p-2 rounded">
                        <span><ThunderboltFilled /> Phí gấp:</span> <b>+{estimate.rushFee.toLocaleString()} ₫</b>
                      </div>
                    )}
                    <Divider className="my-2" />
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-700">{estimate.finalCost.toLocaleString()} ₫</div>
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

declare global {
    interface Window {
        EyeDropper: any;
    }
}

export default function ConsultantPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConsultantForm />
    </Suspense>
  );
}