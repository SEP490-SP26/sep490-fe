/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { otpsApi } from "@/apiRequests/otps";
import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import AddressMapPicker, { AddressResult } from "@/components/AddressMapPicker";
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  InboxOutlined,
  MailOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";
import {
  AutoComplete,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Result,
  Row,
  Space,
  Typography,
  Upload,
} from "antd";
import Holidays from "date-holidays";
import dayjs from "dayjs";

import { RangePickerProps } from "antd/es/date-picker";
import Link from "next/link";
import { useEffect, useState } from "react";
import { disabledDate } from "@/utils/vietnamHolidays";
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { formatVietnameseNumber } from "@/utils/format";

const { Title, Text } = Typography;

const PRODUCT_SUGGESTIONS = [
  "Bao lì xì",
  "Thiệp cưới",
  "Danh thiếp",
  "Catalogue",
  "Tờ rơi",
  "Poster",
  "Nhãn mác",
  "Bao bì sản phẩm",
  "Decal dán",
  "Menu quán ăn",
  "Sách báo",
  "Lịch Tết",
];

// Khởi tạo Vietnamese Holidays
const hd = new Holidays("VN");

// Lấy danh sách ngày nghỉ lễ cho năm hiện tại và năm sau
const getVietnameseHolidays = () => {
  const currentYear = dayjs().year();
  const holidays: { date: string; name: string }[] = [];

  // Lấy holidays cho năm hiện tại và năm sau
  [currentYear, currentYear + 1].forEach((year) => {
    const yearHolidays = hd.getHolidays(year);
    yearHolidays.forEach((h: any) => {
      holidays.push({
        date: dayjs(h.date).format("YYYY-MM-DD"),
        name: h.name,
      });
    });
  });

  return holidays;
};

const vietnameseHolidays = getVietnameseHolidays();

const range = (start: number, end: number) => {
  const result: number[] = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
};

// Kiểm tra ngày có phải ngày nghỉ lễ không
const isHoliday = (date: dayjs.Dayjs) => {
  const dateStr = date.format("YYYY-MM-DD");
  return vietnameseHolidays.find((h) => h.date === dateStr);
};

// const disabledDate: RangePickerProps["disabledDate"] = (current) => {
//   // Không thể chọn ngày trong quá khứ
//   if (current && current < dayjs().endOf("day")) {
//     return true;
//   }
//   // Không thể chọn ngày nghỉ lễ
//   if (current && isHoliday(current)) {
//     return true;
//   }
//   return false;
// };

export default function GuestOrderPage() {
  const [form] = Form.useForm();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP state
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [loadingOtp, setLoadingOtp] = useState(false);

  // File upload state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");

  // Address state
  const [selectedAddress, setSelectedAddress] = useState<
    AddressResult | undefined
  >(undefined);

  // Check if basic info is filled to enable other fields
  const [isBasicInfoFilled, setIsBasicInfoFilled] = useState(false);

  // Watch form values for basic info
  const customerName = Form.useWatch("customerName", form);
  const phone = Form.useWatch("phone", form);

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setSelectedDate(date);
  };
  useEffect(() => {
    const nameValid = customerName && customerName.trim().length >= 2;
    const phoneValid = phone && /^0\d{9}$/.test(phone);
    setIsBasicInfoFilled(nameValid && phoneValid);
  }, [customerName, phone]);

  const onSendOtp = async () => {
    const email = form.getFieldValue("email");
    if (!email) {
      message.error("Vui lòng nhập email!");
      return;
    }

    setLoadingOtp(true);
    try {
      const response = await otpsApi.sendOtp({ email });
      if (response?.message === "OTP sent") {
        setIsOtpSent(true);
        message.success("Mã OTP đã được gửi đến email của bạn!");
      }
    } catch (error) {
      console.error(error);
      message.error("Gửi OTP thất bại. Vui lòng thử lại.");
    } finally {
      setLoadingOtp(false);
    }
  };

  const onVerifyOtp = async () => {
    const email = form.getFieldValue("email");
    if (otp.length !== 6) {
      message.error("Vui lòng nhập đủ 6 số OTP!");
      return;
    }
    setLoadingOtp(true);
    try {
      const response = await otpsApi.verifyOtp({ email, otp });
      if (response?.message === "OTP verified") {
        setIsVerified(true);
        setIsOtpSent(false);
        message.success("Xác thực email thành công!");
      }
    } catch (err) {
      console.error(err);
      message.error("Mã OTP không đúng!");
    } finally {
      setLoadingOtp(false);
    }
  };

  // File handlers
  const normFile = (e: any) => {
    if (Array.isArray(e)) return e;
    return e?.fileList;
  };

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(file.url || (file.preview as string));
    setPreviewOpen(true);
    setPreviewTitle(file.name || "Preview");
  };

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const onFinish = async (values: any) => {
    setIsSubmitting(true);

    try {
      // Upload design file if exists
      let designFilePath = "";
      if (fileList.length > 0 && fileList[0].originFileObj) {
        try {
          const uploadResult = await uploadApi.uploadFile(
            fileList.map((file) => file.originFileObj as File)
          );
          designFilePath = uploadResult[0].url;
        } catch (uploadError) {
          console.error("Upload error:", uploadError);
          // Continue without file if upload fails
        }
      }

      // Build request body according to API schema
      const requestBody = {
        customer_name: values.customerName,
        customer_phone: values.phone,
        customer_email: values.email || "",
        delivery_date:
          values.desiredDate?.toISOString() || new Date().toISOString(),
        product_name: values.productName,
        quantity: values.quantity || 1,
        description: values.note || "",
        design_file_path: designFilePath,
        order_request_date: new Date().toISOString(),
        // Address from map picker
        province: "",
        district: "",
        detail_address:
          selectedAddress?.formattedAddress || values.shippingAddress || "",
      };

      await requestOrderApi.createRequestOrderByCustomer(requestBody);
      message.success("Đặt hàng thành công!");
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Create order error:", error);
      message.error(
        error?.message || "Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-2xl shadow-md">
          <Result
            status="success"
            title="Đặt Hàng Thành Công!"
            subTitle="Nhân viên tư vấn sẽ liên hệ lại với bạn sớm."
            extra={[
              <Button
                type="primary"
                size="large"
                key="back"
                onClick={() => {
                  setIsSuccess(false);
                  form.resetFields();
                  setIsVerified(false);
                  setIsOtpSent(false);
                  setOtp("");
                  setFileList([]);
                  setSelectedAddress(undefined);
                }}
              >
                Đặt đơn khác
              </Button>,
              <Link href="/history" key="history">
                <Button size="large">Tra cứu đơn hàng</Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    );
  }

  const labelStyle = "font-semibold text-gray-700";

  return (
    <div className="min-h-screen bg-primary-light relative overflow-hidden py-4 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-gray-200 rounded-full opacity-30 animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 left-10 w-40 h-40 bg-zinc-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10">
        <div id="recaptcha-container"></div>

        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <Title
              level={2}
              style={{ color: "#1677ff", textTransform: "uppercase" }}
            >
              Đặt In Nhanh
            </Title>
            <Text type="secondary">
              Điền thông tin để nhận báo giá từ đội ngũ tư vấn
            </Text>
            <div className="mt-2">
              <Text type="secondary">
                Đã có tài khoản?{" "}
                <Link href="/login" className="text-blue-600 font-medium">
                  Đăng nhập để đặt hàng nhanh hơn
                </Link>
              </Text>
            </div>
          </div>

          <Card className="shadow-xl rounded-2xl bg-white/80 backdrop-blur-md">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              size="middle"
              requiredMark="optional"
              className="compact-form"
            >
              <Row gutter={24}>
                {/* Left Column: Contact Info */}
                <Col xs={24} lg={12}>
                  <div className="lg:border-r border-gray-200 lg:pr-8">
                    <Title level={4} className="text-blue-700 mb-6">
                      <EnvironmentOutlined className="mr-2" />
                      Thông tin liên hệ & Giao hàng
                    </Title>
                    <div className="flex justify-between gap-4">
                      <Form.Item
                        name="customerName"
                        label={<span className={labelStyle}>Họ và tên</span>}
                        rules={[{ required: true, message: "Nhập họ tên" }]}
                        className="w-full"
                      >
                        <Input placeholder="Nguyễn Văn A" />
                      </Form.Item>

                      {/* SĐT - simple field without OTP */}
                      <Form.Item
                        name="phone"
                        label={<span className={labelStyle}>Số điện thoại</span>}
                        rules={[
                          { required: true, message: "Nhập SĐT" },
                          { pattern: /^0\d{9}$/, message: "SĐT không hợp lệ" },
                        ]}
                        className="w-full"
                      >
                        <Input placeholder="0912345678" />
                      </Form.Item>
                    </div>

                    {/* Email + OTP verification */}
                    <div className="mb-3">
                      <div className={`${labelStyle} mb-1`}>
                        Email <span className="text-red-500">*</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Form.Item
                          name="email"
                          className="flex-1 mb-0"
                          rules={[
                            { required: true, message: "Nhập email" },
                            { type: "email", message: "Email không hợp lệ" },
                          ]}
                        >
                          <Input
                            placeholder="email@example.com"
                            disabled={isOtpSent || isVerified}
                            suffix={
                              isVerified ? (
                                <CheckCircleOutlined className="text-green-500" />
                              ) : null
                            }
                          />
                        </Form.Item>

                        {/* OTP Button/Input */}
                        {!isVerified && (
                          <>
                            {!isOtpSent ? (
                              <Button
                                type="primary"
                                onClick={onSendOtp}
                                loading={loadingOtp}
                              >
                                Gửi OTP
                              </Button>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <Input.OTP length={6} value={otp} onChange={setOtp} />
                                <Button
                                  type="primary"
                                  size="small"
                                  onClick={onVerifyOtp}
                                  loading={loadingOtp}
                                >
                                  Xác nhận
                                </Button>
                                <Button
                                  type="link"
                                  size="small"
                                  danger
                                  onClick={() => {
                                    setIsOtpSent(false);
                                    setOtp("");
                                  }}
                                >
                                  Gửi lại
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                        {isVerified && (
                          <span className="text-green-600 text-sm flex items-center pt-1.5">
                            <CheckCircleOutlined className="mr-1" /> Đã xác minh
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shipping Address - Map Picker */}
                    <div
                      className={`pt-4 border-t ${!isVerified ? "opacity-50 pointer-events-none" : ""
                        }`}
                    >
                      <div className={`${labelStyle} mb-3`}>
                        Địa chỉ giao hàng <span className="text-red-500">*</span>
                      </div>
                      {/* {!isVerified && (
                        <div className="text-sm text-orange-500 mb-2">
                          Vui lòng xác thực email trước
                        </div>
                      )} */}
                      <AddressMapPicker
                        value={selectedAddress}
                        onChange={(address) => {
                          setSelectedAddress(address);
                          form.setFieldValue(
                            "shippingAddress",
                            address.formattedAddress
                          );
                        }}
                        showMap={false}
                        placeholder="Tìm kiếm địa chỉ tại Việt Nam..."
                      />
                      <Form.Item name="shippingAddress" hidden>
                        <Input />
                      </Form.Item>
                    </div>
                  </div>
                </Col>

                {/* Right Column: Order Info */}
                <Col xs={24} lg={12}>
                  <div
                    className={
                      !isVerified ? "opacity-50 pointer-events-none" : ""
                    }
                  >
                    {!isVerified && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-orange-700 text-sm">
                        Vui lòng xác thực email bằng OTP trước khi tiếp
                        tục
                      </div>
                    )}
                    <Title level={4} className="text-blue-700 mb-6">
                      <PlusOutlined className="mr-2" />
                      Yêu cầu in ấn
                    </Title>

                    <Row gutter={16}>
                      <Space>
                        <Form.Item
                          name="productName"
                          label={
                            <span className={labelStyle}>
                              Tên sản phẩm cần in
                            </span>
                          }
                          rules={[
                            { required: true, message: "Nhập tên sản phẩm" },
                          ]}
                        >
                          <AutoComplete
                            options={PRODUCT_SUGGESTIONS.map((name) => ({
                              label: name,
                              value: name,
                            }))}
                            placeholder="Chọn hoặc nhập tên sản phẩm"
                            filterOption={(inputValue, option) =>
                              option?.value
                                .toUpperCase()
                                .indexOf(inputValue.toUpperCase()) !== -1
                            }
                            // Cho phép nhập giá trị không có trong danh sách
                            onSelect={(value) => {
                              form.setFieldsValue({ productName: value });
                            }}
                            onChange={(value) => {
                              form.setFieldsValue({ productName: value });
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="quantity"
                          label={<span className={labelStyle}>Số lượng</span>}
                          rules={[{
                            required: true,
                            message: "Nhập số lượng"
                          }]}
                        >
                          <FloatingInputAntd
                            className="w-full text-right"
                            valueType="number"
                            style={{ width: 100 }}
                            min={100} // Đặt min là 100 để tránh nhập số quá nhỏ
                            formatter={(value: any) => formatVietnameseNumber(value)}
                            parser={(value: any) => {
                              if (!value) return 0;
                              return Number(value.toString().replace(/,/g, ''));
                            }}
                            placeholder="VD: 1,000"
                            onBlur={(e: any) => {
                              const value = e.target.value;
                              if (value) {
                                const numValue = Number(value.toString().replace(/,/g, ''));

                                // Chỉ làm tròn nếu số không chia hết cho 100
                                if (numValue % 100 !== 0) {
                                  const roundedValue = Math.round(numValue / 100) * 100;

                                  // Update giá trị trong form
                                  form.setFieldsValue({ quantity: roundedValue });

                                  // Hiển thị thông báo
                                  message.info(`Số lượng đã được làm tròn thành ${formatVietnameseNumber(roundedValue)}`);
                                }
                              }
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          name="desiredDate"
                          label={
                            <span className={labelStyle}>
                              Thời gian nhận hàng
                            </span>
                          }
                          rules={[{ required: true, message: "Chọn ngày" }]}
                        >
                          <DatePicker
                            value={selectedDate}
                            onChange={handleDateChange}
                            disabledDate={disabledDate}
                            format="DD/MM/YYYY"
                            placeholder="Chọn ngày giao hàng"
                            style={{ width: "100%" }}
                            className="w-full"
                            allowClear
                          />
                        </Form.Item>
                      </Space>
                    </Row>

                    <Form.Item
                      name="note"
                      label={<span className={labelStyle}>Mô tả thêm</span>}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Kích thước, chất liệu, yêu cầu đặc biệt..."
                      />
                    </Form.Item>

                    <Form.Item
                      label={
                        <span className={labelStyle}>File thiết kế mẫu</span>
                      }
                      name="designFile"
                      valuePropName="fileList"
                      getValueFromEvent={normFile}
                    >
                      <Upload.Dragger
                        name="files"
                        action="https://run.mocky.io/v3/435e224c-44fb-4773-9faf-380c5e6a2188"
                        listType="picture"
                        maxCount={5}
                        multiple
                        fileList={fileList}
                        onChange={({ fileList }) => setFileList(fileList)}
                        onPreview={handlePreview}
                        className="bg-white design-upload-success"
                        showUploadList={{
                          showPreviewIcon: true,
                          previewIcon: <EyeOutlined className="text-blue-500" />,
                        }}
                      >
                        <p className="ant-upload-drag-icon">
                          <InboxOutlined
                            style={{ color: "#1677ff", fontSize: "28px" }}
                          />
                        </p>
                        <p className="ant-upload-text text-sm">
                          Kéo thả hoặc click để tải lên
                        </p>
                        <p className="ant-upload-hint text-xs">
                          PDF, AI, JPG, PNG (Max 10MB)
                        </p>
                      </Upload.Dragger>
                    </Form.Item>
                  </div>
                </Col>
              </Row>

              <div className="mt-6 pt-6 border-t">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  disabled={!isVerified || isSubmitting}
                  loading={isSubmitting}
                  className={`h-14 text-xl font-bold ${!isVerified ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                    }`}
                >
                  {isSubmitting ? "Đang gửi..." : "GỬI YÊU CẦU BÁO GIÁ"}
                </Button>
                {!isVerified && (
                  <div className="text-center text-red-500 mt-2 text-sm">
                    Vui lòng xác thực email để gửi đơn
                  </div>
                )}
              </div>
            </Form>
          </Card>
        </div>

        {/* Preview Modal */}
        <Modal
          open={previewOpen}
          title={previewTitle}
          footer={null}
          onCancel={() => setPreviewOpen(false)}
        >
          <img alt="preview" style={{ width: "100%" }} src={previewImage} />
        </Modal>

        <style jsx global>{`
        .design-upload-success .ant-upload-list-item-name {
          color: #16a34a !important;
        }
        .design-upload-success .ant-upload-list-item {
          border-color: #bbf7d0 !important;
        }
        .design-upload-success .ant-upload-list-item::before {
          display: none;
        }
        .compact-form .ant-form-item {
          margin-bottom: 12px;
        }
        .compact-form .ant-form-item-label {
          padding-bottom: 4px;
        }
      `}</style>
      </div>
    </div>
  );
}
