"use client";

import { useProduction } from "@/context/ProductionContext";
import {
  BgColorsOutlined,
  CalculatorOutlined, // Icon cho tiến độ
  CodeSandboxOutlined,
  DeleteOutlined,
  ExperimentOutlined,
  FileImageOutlined,
  InboxOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ThunderboltFilled,
  UserOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Alert,
  Image as AntImage,
  Button,
  Card,
  Checkbox,
  Col,
  ColorPicker,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Statistic, // [MỚI] Thêm statistic
  Steps, // [MỚI] Thêm steps
  Tag,
  Tooltip,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

// --- UTILS: HÀM XỬ LÝ MÀU TỪ ẢNH (CANVAS API) ---
const getDominantColors = (
  imageSrc: string,
  count: number = 5
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context error");

      canvas.width = 100;
      canvas.height = 100 * (img.height / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      const colorCounts: { [key: string]: number } = {};

      for (let i = 0; i < imageData.length; i += 4 * 5) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const alpha = imageData[i + 3];
        if (
          alpha < 128 ||
          (r > 240 && g > 240 && b > 240) ||
          (r < 15 && g < 15 && b < 15)
        )
          continue;

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
          return (
            "#" +
            ((1 << 24) + (r << 16) + (g << 8) + b)
              .toString(16)
              .slice(1)
              .toUpperCase()
          );
        });

      resolve(sortedColors);
    };
    img.onerror = (e) => reject(e);
  });
};

// --- DỮ LIỆU MẪU ---
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

const PRODUCT_SUGGESTIONS = [
  "Hộp bánh trung thu cao cấp",
  "Hộp thuốc tây",
  "Tờ rơi A4",
  "Catalogue 32 trang",
  "Hộp carton sóng E",
];

const RUSH_FEE_LOW = 500000;
const RUSH_FEE_HIGH = 2000000;

interface DesignItem {
  id: string;
  file: UploadFile | null;
  previewUrl: string;
  colors: string[];
}

// --- COMPONENT CHÍNH ---
function ConsultantForm() {
  const [form] = Form.useForm();
  const { addOrder, updateOrder, products, orders, isBusy } = useProduction();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const [loading, setLoading] = useState(false);

  const [designItems, setDesignItems] = useState<DesignItem[]>([]);

  // [CẬP NHẬT] State estimate thêm các trường mới: paperNeeded, isStockEnough
  const [estimate, setEstimate] = useState<{
    baseCost: number;
    rushFee: number;
    daysEarly: number;
    finalCost: number;
    systemDate: string;
    caseType: 1 | 2 | 3;
    paperNeeded: number;
    isStockEnough: boolean;
    productionDays: number;
    effectiveDate: string;
  } | null>(null);

  // --- 1. TỰ ĐỘNG ĐIỀN DỮ LIỆU ---
  useEffect(() => {
    if (orderId) {
      const existingOrder = orders.find((o) => o.id === orderId);
      if (existingOrder) {
        form.setFieldsValue({
          customerName: existingOrder.customer_name,
          phone: existingOrder.customer_phone,
          productName: existingOrder.product_name
            ? [existingOrder.product_name]
            : [],
          quantity: existingOrder.quantity,
          desiredDate: existingOrder.delivery_date
            ? dayjs(existingOrder.delivery_date)
            : null,
          notes: existingOrder.note,
          length: existingOrder.specs?.width || 0,
          width: existingOrder.specs?.height || 0,
          height: existingOrder.specs?.length || 0,
          paperType: existingOrder.specs?.paper_id,
          processing: existingOrder.specs?.processing,
        });

        // Xử lý File cũ
        if (existingOrder.design_file_url) {
          const urls = existingOrder.design_file_url.split(",");
          const loadedItems: DesignItem[] = urls.map((url, idx) => ({
            id: `design-${idx}`,
            file: {
              uid: `-${idx}`,
              name: `File ${idx + 1}`,
              status: "done",
              url: url.trim(),
            } as UploadFile,
            previewUrl: url.trim(),
            colors: idx === 0 ? existingOrder.specs?.colors || [] : [],
          }));
          setDesignItems(loadedItems);
        }

        handleCalculate(
          { quantity: existingOrder.quantity },
          {
            quantity: existingOrder.quantity,
            desiredDate: existingOrder.delivery_date
              ? dayjs(existingOrder.delivery_date)
              : null,
            paperType: existingOrder.specs?.paper_id,
          }
        );
      }
    }
  }, [orderId, orders, form]);

  const handleUploadChange: UploadProps["onChange"] = ({
    fileList: newFileList,
  }) => {
    const latestFile = newFileList[newFileList.length - 1];
    if (!latestFile) return;

    const exists = designItems.some(
      (item) => item.file?.uid === latestFile.uid
    );
    if (!exists && latestFile.originFileObj) {
      const objectUrl = URL.createObjectURL(latestFile.originFileObj);
      const newItem: DesignItem = {
        id: `design-${Date.now()}`,
        file: latestFile,
        previewUrl: objectUrl,
        colors: ["#000000"],
      };
      setDesignItems((prev) => [...prev, newItem]);
    }
  };

  const removeDesignItem = (id: string) => {
    setDesignItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemColors = (id: string, newColors: string[]) => {
    setDesignItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, colors: newColors } : item
      )
    );
  };

  const handleAutoExtract = async (id: string, previewUrl: string) => {
    try {
      message.loading({ content: "Đang quét màu...", key: "extract" });
      const colors = await getDominantColors(previewUrl, 5);
      updateItemColors(id, colors);
      message.success({ content: "Đã lấy màu xong!", key: "extract" });
    } catch (e) {
      message.error("Lỗi khi đọc ảnh");
    }
  };

  const handleEyeDropper = async (id: string) => {
    if (!window.EyeDropper) return message.error("Trình duyệt không hỗ trợ!");
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;

      const item = designItems.find((i) => i.id === id);
      if (item && !item.colors.includes(hex)) {
        updateItemColors(id, [...item.colors, hex]);
      }
    } catch (e) {}
  };

  // --- LOGIC TÍNH TOÁN & SUBMIT ---
  // --- LOGIC TÍNH TOÁN & SUBMIT ---
  const handleCalculate = (changedValues: any, allValues: any) => {
    const { quantity, paperType, desiredDate } = allValues;

    if (!quantity) return;

    // 1. Tính chi phí cơ bản
    const baseCost = quantity * 2500 + 3000000;

    // 2. Kiểm tra tồn kho trước
    const paperNeeded = Math.ceil((quantity / 4) * 1.05); // Bình 4 + 5% hao hụt
    const selectedPaper = PAPER_TYPES.find((p) => p.value === paperType);
    // Mặc định là đủ nếu chưa chọn giấy
    const isStockEnough = selectedPaper
      ? selectedPaper.stock >= paperNeeded
      : true;

    // 3. Tính toán thời gian (Logic thông minh hơn)
    const productionDays = Math.ceil(quantity / 2000) + 2; // Thời gian sản xuất

    // [QUAN TRỌNG] Nếu thiếu giấy, cộng thêm 4 ngày nhập hàng
    const materialLeadTime = isStockEnough ? 0 : 4;

    const totalSystemDays = productionDays + materialLeadTime;

    const today = dayjs();
    const systemDateObj = today.add(totalSystemDays, "day");
    const systemDateStr = systemDateObj.format("YYYY-MM-DD");

    // Tự động điền ngày nếu chưa có
    if (!orderId && "quantity" in changedValues && !desiredDate) {
      form.setFieldValue("desiredDate", systemDateObj);
    }

    // 4. Logic độ gấp (Rush)
    const currentDesiredDate = desiredDate || systemDateObj;
    let rushFee = 0;
    let daysEarly = 0;
    let caseType: 1 | 2 | 3 = 1;

    // So sánh ngày khách chọn với (Ngày sản xuất + Ngày nhập giấy)
    if (currentDesiredDate.isBefore(systemDateObj, "day")) {
      daysEarly = systemDateObj.diff(currentDesiredDate, "day");

      // Nếu thiếu giấy mà khách muốn lấy sớm hơn thời gian nhập -> Chắc chắn là Case 3 (Rủi ro cao)
      if (!isStockEnough) {
        rushFee = daysEarly * RUSH_FEE_HIGH * 1.5; // Phạt nặng hơn vì phải giục NCC vật tư
        caseType = 3;
      } else if (!isBusy) {
        rushFee = daysEarly * RUSH_FEE_LOW;
        caseType = 2;
      } else {
        rushFee = daysEarly * RUSH_FEE_HIGH;
        caseType = 3;
      }
    }

    setEstimate({
      baseCost,
      rushFee,
      daysEarly,
      finalCost: baseCost + rushFee,
      systemDate: systemDateStr,
      caseType,
      paperNeeded,
      isStockEnough,
      productionDays,
      effectiveDate: currentDesiredDate.format("YYYY-MM-DD"),
    });
  };

  const onFinish = (values: any) => {
    setLoading(true);

    const allUniqueColors = Array.from(
      new Set(designItems.flatMap((i) => i.colors))
    );
    const colorDetailNote = designItems
      .map((item, idx) => `[Mẫu ${idx + 1}]: ${item.colors.join(", ")}`)
      .join("; ");
    const finalNote = values.notes
      ? `${values.notes}. Chi tiết màu: ${colorDetailNote}`
      : `Chi tiết màu: ${colorDetailNote}`;
    const fileUrls = designItems
      .map((i) => i.file?.url || "new-file")
      .join(",");

    const orderData = {
      product_id: values.paperType,
      product_name: Array.isArray(values.productName)
        ? values.productName[0]
        : values.productName,
      quantity: values.quantity,
      delivery_date: values.desiredDate.format("YYYY-MM-DD"),
      system_delivery_date: estimate?.systemDate,
      customer_name: values.customerName,
      customer_phone: values.phone,
      process_status: "consultant_verified" as const,
      final_price: estimate?.finalCost,
      rush_fee: estimate?.rushFee,

      design_file_url: fileUrls,
      specs: {
        width: values.width,
        height: values.height,
        length: values.length,
        paper_id: values.paperType,
        colors: allUniqueColors,
        processing: values.processing,
      },
      note: finalNote,
    };

    setTimeout(() => {
      if (orderId) {
        updateOrder(orderId, orderData);
        message.success("Đã cập nhật đơn hàng!");
      } else {
        addOrder({ ...orderData });
        message.success("Đã tạo đơn mới!");
      }
      setLoading(false);
      router.push("/consultant/orders");
    }, 1000);
  };

  // Hàm helper để render thông báo trạng thái
  const renderStatusAlert = () => {
    if (!estimate) return null;

    // Ưu tiên 1: Hết giấy
    if (!estimate.isStockEnough) {
      return (
        <Alert
          message="Thiếu nguyên vật liệu"
          description="Kho không đủ giấy. Cần tạo phiếu Yêu Cầu Vật Tư sau khi tạo đơn."
          type="error"
          showIcon
          className="mb-4"
        />
      );
    }

    // Ưu tiên 2: Đơn gấp + Xưởng bận
    if (estimate.caseType === 3) {
      return (
        <Alert
          message="GẤP & QUÁ TẢI"
          description={`Khách cần sớm ${estimate.daysEarly} ngày. Xưởng đang bận. Đã tính phí gấp cao.`}
          type="error"
          showIcon
          className="mb-4"
        />
      );
    }

    // Ưu tiên 3: Đơn gấp (Xưởng rảnh)
    if (estimate.caseType === 2) {
      return (
        <Alert
          title="Đơn hàng ưu tiên (Gấp)"
          description={`Khách cần sớm ${estimate.daysEarly} ngày. Đã tính phí ưu tiên.`}
          type="warning"
          showIcon
          className="mb-4"
        />
      );
    }

    // Mặc định: Bình thường
    return (
      <Alert
        title="Đủ điều kiện sản xuất"
        description="Kho đủ giấy & Tiến độ phù hợp."
        type="success"
        showIcon
        className="mb-4"
      />
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center bg-white p-4 rounded shadow-sm">
          <div>
            <h1 className="text-xl font-bold m-0 uppercase">
              {orderId
                ? `Xử Lý Đơn Hàng #${orderId.split("-")[1] || orderId}`
                : "Tạo Đơn Hàng Mới"}
            </h1>
            <span className="text-gray-500 text-sm">
              {orderId
                ? "Kiểm tra thông tin khách gửi và chốt phương án"
                : "Nhập thông tin yêu cầu sản xuất"}
            </span>
          </div>
          <Tag color={isBusy ? "red" : "green"} className="text-base py-1 px-4">
            {isBusy ? "🔥 Xưởng Bận (High Load)" : "✅ Xưởng Rảnh (Low Load)"}
          </Tag>
        </div>

        <Row gutter={24}>
          <Col span={15}>
            <Card
              title={
                <>
                  <CodeSandboxOutlined /> Thông Tin Đơn Hàng
                </>
              }
              className="shadow-sm"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={handleCalculate}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="customerName"
                      label="Khách Hàng"
                      rules={[{ required: true }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="Tên khách..."
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="phone" label="SĐT">
                      <Input
                        style={{ textAlign: "right" }}
                        placeholder="09..."
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider titlePlacement="left">Thông Số Kỹ Thuật</Divider>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="productName"
                      label="Tên Sản Phẩm"
                      rules={[{ required: true }]}
                    >
                      <Select
                        showSearch
                        placeholder="Chọn hoặc nhập mới"
                        options={PRODUCT_SUGGESTIONS.map((name) => ({
                          label: name,
                          value: name,
                        }))}
                        mode="tags"
                        maxCount={1}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Kích thước (D - R - C)" required>
                      <Space.Compact block>
                        <Form.Item name="length" noStyle>
                          <InputNumber
                            style={{ width: "33%", textAlign: "right" }}
                            placeholder="D"
                          />
                        </Form.Item>
                        <Form.Item name="width" noStyle>
                          <InputNumber
                            style={{ width: "33%", textAlign: "right" }}
                            placeholder="R"
                          />
                        </Form.Item>
                        <Form.Item name="height" noStyle>
                          <InputNumber
                            style={{ width: "34%", textAlign: "right" }}
                            placeholder="C"
                          />
                        </Form.Item>
                      </Space.Compact>
                    </Form.Item>
                  </Col>
                </Row>

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
                    </Form.Item>
                    {/* <Form.Item name="paperType" label="Loại Giấy" rules={[{ required: true }]}>
                      <Select options={PAPER_TYPES} placeholder="Chọn giấy" />
                    </Form.Item> */}
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="quantity"
                      label="Số Lượng"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        className="w-full"
                        style={{ textAlign: "right" }}
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider titlePlacement="left">
                  Quản Lý File & Màu Sắc (Theo từng mẫu)
                </Divider>

                <div className="bg-gray-50 p-4 rounded border mb-4">
                  <div className="mb-4 text-center">
                    <Upload
                      showUploadList={false}
                      beforeUpload={() => false}
                      onChange={handleUploadChange}
                      multiple
                    >
                      <Button
                        type="dashed"
                        icon={<InboxOutlined />}
                        size="large"
                        className="w-full"
                      >
                        + Thêm Mẫu Thiết Kế Mới (Upload Ảnh)
                      </Button>
                    </Upload>
                  </div>

                  <div className="space-y-4">
                    {designItems.length === 0 && (
                      <Empty
                        description="Chưa có mẫu nào. Hãy upload ảnh."
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}

                    {designItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-white p-3 rounded shadow-sm border flex gap-4 items-start relative hover:border-blue-400 transition-colors"
                      >
                        <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-br">
                          Mẫu #{index + 1}
                        </div>
                        <div className="absolute top-2 right-2">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => removeDesignItem(item.id)}
                          />
                        </div>

                        <div className="w-32 h-32 flex-shrink-0 border rounded bg-gray-100 flex items-center justify-center overflow-hidden mt-2">
                          {item.previewUrl ? (
                            <AntImage
                              src={item.previewUrl}
                              height="100%"
                              className="object-contain"
                            />
                          ) : (
                            <FileImageOutlined className="text-2xl text-gray-300" />
                          )}
                        </div>

                        <div className="flex-1 mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold text-gray-700">
                              Màu sắc in ấn cho mẫu này:
                            </span>
                            <Space size="small">
                              <Tooltip title="Tự động tìm màu trong ảnh này">
                                <Button
                                  size="small"
                                  type="primary"
                                  ghost
                                  icon={<ExperimentOutlined />}
                                  onClick={() =>
                                    handleAutoExtract(item.id, item.previewUrl)
                                  }
                                >
                                  Auto
                                </Button>
                              </Tooltip>
                              <Tooltip title="Chấm màu trên màn hình">
                                <Button
                                  size="small"
                                  icon={<BgColorsOutlined />}
                                  onClick={() => handleEyeDropper(item.id)}
                                >
                                  Chấm màu
                                </Button>
                              </Tooltip>
                            </Space>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {item.colors.map((color, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center bg-gray-50 border rounded pl-1 pr-2 py-1"
                              >
                                <div
                                  style={{
                                    width: 16,
                                    height: 16,
                                    backgroundColor: color,
                                    borderRadius: 4,
                                    marginRight: 8,
                                    border: "1px solid #ddd",
                                  }}
                                ></div>
                                <span className="text-xs font-mono">
                                  {color}
                                </span>
                                <MinusCircleOutlined
                                  className="ml-2 text-gray-400 hover:text-red-500 cursor-pointer"
                                  onClick={() => {
                                    const newColors = item.colors.filter(
                                      (_, i) => i !== cIdx
                                    );
                                    updateItemColors(item.id, newColors);
                                  }}
                                />
                              </div>
                            ))}
                            <ColorPicker
                              value="#1677ff"
                              onChangeComplete={(c) => {
                                if (!item.colors.includes(c.toHexString())) {
                                  updateItemColors(item.id, [
                                    ...item.colors,
                                    c.toHexString(),
                                  ]);
                                }
                              }}
                            >
                              <Button
                                size="small"
                                type="dashed"
                                icon={<PlusOutlined />}
                              >
                                Thêm
                              </Button>
                            </ColorPicker>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Form.Item name="processing" label="Gia Công">
                  <Checkbox.Group options={PROCESSING_OPTS} />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="notes" label="Ghi Chú">
                      <Input.TextArea rows={1} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="desiredDate"
                      label="Ngày Giao Dự Kiến"
                      rules={[{ required: true }]}
                      help={
                        estimate ? (
                          <span className="text-blue-500 text-xs">
                            Hệ thống tính:{" "}
                            {dayjs(estimate.systemDate).format("DD/MM/YYYY")}
                          </span>
                        ) : (
                          ""
                        )
                      }
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
                      estimate?.caseType === 3
                        ? "bg-red-600 hover:bg-red-700"
                        : estimate?.caseType === 2
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "bg-blue-600"
                    }`}
                  >
                    {estimate?.caseType === 3
                      ? "CHỐT DEAL GIÁ & GỬI DUYỆT"
                      : estimate?.caseType === 2
                      ? "XÁC NHẬN ƯU TIÊN & GỬI DUYỆT"
                      : "XÁC NHẬN & GỬI DUYỆT"}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* CỘT PHẢI: LOGIC TÍNH TOÁN & ƯỚC TÍNH (Đã cập nhật giao diện mới) */}
          <Col span={9}>
            <div className="sticky top-6">
              <Card
                title={
                  <>
                    <CalculatorOutlined /> Ước Tính & Tồn Kho
                  </>
                }
                className="shadow-sm border-blue-100"
              >
                {!estimate ? (
                  <div className="text-center py-8 text-gray-400">
                    Nhập thông số để xem ước tính
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* [MỚI] Hiển thị trạng thái (kết hợp Tồn kho + Gấp) */}
                    {renderStatusAlert()}

                    {/* [MỚI] Thống kê giấy in */}
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

                    {/* [MỚI] Chi phí sơ bộ */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <Statistic
                        title="Chi phí sản xuất sơ bộ"
                        value={estimate.finalCost}
                        suffix="₫"
                        precision={0}
                        valueStyle={{ color: "#108ee9", fontWeight: "bold" }}
                      />
                      {estimate.rushFee > 0 && (
                        <div className="text-xs text-red-500 mt-1 flex items-center">
                          <ThunderboltFilled className="mr-1" />
                          Đã bao gồm phụ phí gấp:{" "}
                          {estimate.rushFee.toLocaleString()} ₫
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        (Bao gồm Giấy + Kẽm + Công in + Gia công)
                      </div>
                    </div>

                    {/* [MỚI] Tiến độ (Steps) */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Tiến độ dự kiến:
                      </h4>
                      <Steps
                        orientation="vertical"
                        size="small"
                        current={1}
                        items={[
                          { title: "Tạo đơn", description: "Hôm nay" },
                          {
                            title: "Chuẩn bị vật tư",
                            description: estimate.isStockEnough ? (
                              "Có sẵn tại kho"
                            ) : (
                              <span className="text-red-500">
                                Thiếu - Cần 3-5 ngày nhập
                              </span>
                            ),
                            status: estimate.isStockEnough ? "finish" : "error",
                          },
                          {
                            title: "Sản xuất",
                            description: `Khoảng ${estimate.productionDays} ngày`,
                          },
                          {
                            title: "Giao hàng",
                            description: `Hẹn giao: ${dayjs(
                              estimate.effectiveDate
                            ).format("DD/MM/YYYY")}`,
                          },
                        ]}
                      />
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
