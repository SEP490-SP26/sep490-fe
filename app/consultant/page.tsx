/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useProduction } from "@/context/ProductionContext";
import { showSuccessToast } from "@/utils/toastService";
import {
  CalculatorOutlined,
  CodeSandboxOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
} from "antd";
import Link from "next/link";
import { useState } from "react";
import { BiPlus, BiRightArrow } from "react-icons/bi";

// --- 1. DATA GIẢ ĐỊNH ---
const PAPER_TYPES = [
  { label: "Giấy Duplex 250 (Khổ 650)", value: "VT00008", stock: 30437 },
  { label: "Giấy Ivory 300 (Khổ 79x109)", value: "VT00012", stock: 1200 },
  { label: "Giấy Couche 150", value: "VT00020", stock: 5000 },
  { label: "Giấy Kraft", value: "VT00030", stock: 0 },
];

const PROCESSING_OPTS = [
  { label: "Cán màng (Bóng/Mờ)", value: "can_mang" },
  { label: "Phủ UV/Varnish", value: "phu_uv" },
  { label: "Bế (Die-cut)", value: "be" },
  { label: "Dán máy", value: "dan_may" },
  { label: "Bồi sóng", value: "boi_song" },
];

export default function ConsultantPage() {
  const [form] = Form.useForm();
  const { products, addOrder } = useProduction();
  const [loading, setLoading] = useState(false);

  const [estimate, setEstimate] = useState<{
    paperNeeded: number;
    approxCost: number;
    isStockEnough: boolean;
  } | null>(null);

  const handleCalculate = () => {
    const values = form.getFieldsValue();
    const { quantity, paperType } = values;

    if (!quantity || !paperType) {
      message.warning("Vui lòng nhập số lượng và chọn loại giấy!");
      return;
    }

    // Logic tính toán giả định
    const itemsPerSheet = 4;
    const paperCount = Math.ceil((quantity / itemsPerSheet) * 1.05);

    const selectedPaper = PAPER_TYPES.find((p) => p.value === paperType);
    const isEnough = selectedPaper ? selectedPaper.stock >= paperCount : false;

    const cost = paperCount * 2000 + 5000000;

    setEstimate({
      paperNeeded: paperCount,
      approxCost: cost,
      isStockEnough: isEnough,
    });
  };

  const onFinish = (values: any) => {
    setLoading(true);
    setTimeout(() => {
      addOrder({
        product_id: values.paperType,
        quantity: values.quantity,
        delivery_date: values.deliveryDate.format("YYYY-MM-DD"),
        customer_name: values.customerName,
      });

      showSuccessToast(
        "Đã tạo đơn hàng thành công! Chuyển sang bộ phận Kế hoạch."
      );
      setLoading(false);
      form.resetFields();
      setEstimate(null);
    }, 1000);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 uppercase">
          Tạo đơn hàng mới
        </h1>
        <div className="flex gap-3">
          <Link
            href="/manager/orders"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            Chuyển đến Quản lý đơn hàng
            <BiRightArrow />
          </Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {/* <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 uppercase">
            Tạo đơn hàng mới
          </h1>
          <Link
            href="/consultant/orders"
            className="text-blue-600 hover:underline"
          >
            Xem danh sách đơn hàng đã tạo
          </Link>
        </div> */}

        <Row gutter={24}>
          {/* CỘT TRÁI: FORM NHẬP LIỆU */}
          <Col span={16}>
            <Card
              title={
                <>
                  <CodeSandboxOutlined /> Thông tin đơn hàng
                </>
              }
              className="shadow-sm"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ quantity: 1000, colors: 4 }}
              >
                {/* 1. Khách hàng */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="customerName"
                      label="Tên khách hàng"
                      rules={[{ required: true }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Ví dụ: Công ty Dược phẩm A"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="deliveryDate"
                      label="Ngày giao hàng (Dự kiến)"
                      rules={[{ required: true }]}
                    >
                      <DatePicker className="w-full" format="DD/MM/YYYY" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider
                  style={{ borderColor: "#d9d9d9" }}
                  titlePlacement="left"
                >
                  Thông số sản phẩm
                </Divider>

                {/* 2. Kích thước & Loại */}
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="productName"
                      label="Tên sản phẩm"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="VD: Hộp thuốc ho 100ml" />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item
                      label="Kích thước (Dài x Rộng x Cao) mm"
                      required
                    >
                      <Space.Compact block>
                        <Form.Item name="length" noStyle>
                          <InputNumber
                            style={{ width: "33%" }}
                            placeholder="Dài"
                          />
                        </Form.Item>
                        <Form.Item name="width" noStyle>
                          <InputNumber
                            style={{ width: "33%" }}
                            placeholder="Rộng"
                          />
                        </Form.Item>
                        <Form.Item name="height" noStyle>
                          <InputNumber
                            style={{ width: "34%" }}
                            placeholder="Cao"
                          />
                        </Form.Item>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                </Row>

                {/* 3. Chất liệu & In ấn */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="paperType"
                      // label="Loại giấy & Định lượng"
                      label="Loại sản phẩm"
                      rules={[{ required: true }]}
                    >
                      <Select
                        placeholder="Chọn sản phẩm"
                        options={products.map((prod) => ({
                          label: prod.name,
                          value: prod.id,
                        }))}
                        onChange={handleCalculate}
                      />
                      {/* <Select
                        placeholder="Chọn chất liệu giấy"
                        options={PAPER_TYPES}
                        onChange={handleCalculate}
                      /> */}
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name="quantity"
                      label="Số lượng đặt"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        onChange={() => setTimeout(handleCalculate, 500)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item name="colors" label="Số màu in">
                      <InputNumber
                        min={1}
                        max={8}
                        className="w-full"
                        suffix="Màu"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* 4. Gia công */}
                <Form.Item name="processing" label="Yêu cầu gia công sau in">
                  <Checkbox.Group options={PROCESSING_OPTS} />
                </Form.Item>

                <Form.Item name="notes" label="Ghi chú">
                  <Input.TextArea rows={2} />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    block
                    className="bg-blue-600"
                  >
                    Tạo đơn hàng
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* CỘT PHẢI: TÍNH TOÁN SƠ BỘ */}
          <Col span={8}>
            <Card
              title={
                <>
                  <CalculatorOutlined /> Ước tính & Tồn kho
                </>
              }
              className="shadow-sm sticky top-6"
              extra={
                <Button size="small" onClick={handleCalculate}>
                  Tính ngay
                </Button>
              }
            >
              {!estimate ? (
                <div className="text-center py-8 text-gray-400">
                  Nhập thông số để xem ước tính vật tư
                </div>
              ) : (
                <div className="space-y-6">
                  <Alert
                    title={
                      estimate.isStockEnough
                        ? "Đủ nguyên vật liệu"
                        : "Thiếu nguyên vật liệu"
                    }
                    description={
                      estimate.isStockEnough
                        ? "Kho hiện có đủ giấy để sản xuất đơn hàng này."
                        : "Cần tạo yêu cầu mua hàng để bổ sung giấy in còn thiếu."
                    }
                    type={estimate.isStockEnough ? "success" : "error"}
                    showIcon
                  />

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <Statistic
                      title="Giấy in ước tính (đã bù hao)"
                      value={estimate.paperNeeded}
                      suffix="tờ"
                      groupSeparator=","
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      (Bình trang giả định: 4 hộp/tờ + 5% hao hụt)
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <Statistic
                      title="Chi phí sản xuất sơ bộ"
                      value={estimate.approxCost}
                      suffix="₫"
                      precision={0}
                      styles={{
                        content: { color: "#108ee9", fontWeight: "bold" },
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      (Bao gồm Giấy + Kẽm + Công in + Gia công)
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">
                      Tiến độ dự kiến:
                    </h4>
                    <Steps
                      orientation="vertical"
                      size="small"
                      current={1}
                      items={[
                        // data giả định tính toán ngày giao hàng dự kiến sau này có thể xem xét thêm sau
                        { title: "Tạo đơn", content: "Hôm nay" },
                        {
                          title: "Chuẩn bị vật tư",
                          content: estimate.isStockEnough
                            ? "Có sẵn"
                            : "3-5 ngày (Đặt hàng)",
                        },
                        { title: "Sản xuất", content: "2 ngày" },
                        { title: "Giao hàng", content: "Dự kiến sau 3-7 ngày" },
                      ]}
                    />
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
