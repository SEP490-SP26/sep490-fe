/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { requestOrderApi } from "@/api/request";
import { uploadApi } from "@/api/uploads";
import AddressMapPicker, { AddressResult } from "@/components/AddressMapPicker";
import { auth } from "@/utils/firebaseConfig";
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  InboxOutlined,
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
  Select,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";

import { RangePickerProps } from "antd/es/date-picker";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";

const { Title, Text } = Typography;

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

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


const range = (start: number, end: number) => {
  const result: number[] = [];
  for (let i = start; i < end; i++) {
    result.push(i);
  }
  return result;
};

const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  // Can not select days before today and today
  return current && current < dayjs().endOf("day");
};

const disabledDateTime = () => ({
  disabledHours: () => range(0, 24).splice(4, 20),
  disabledMinutes: () => range(30, 60),
  disabledSeconds: () => [55, 56],
});

export default function GuestOrderPage() {
  const [form] = Form.useForm();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP state
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
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

  useEffect(() => {
    const nameValid = customerName && customerName.trim().length >= 2;
    const phoneValid = phone && /^0\d{9}$/.test(phone);
    setIsBasicInfoFilled(nameValid && phoneValid);
  }, [customerName, phone]);

  // Setup reCAPTCHA
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
          "expired-callback": () => {},
        }
      );
    }

    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  // OTP handlers
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const onSendOtp = async () => {
    const phoneNumber = form.getFieldValue("phone");
    if (!phoneNumber) {
      message.error("Vui lòng nhập số điện thoại!");
      return;
    }

    const formatPh = "+84" + phoneNumber.replace(/^0/, "");
    setLoadingOtp(true);

    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formatPh,
        window.recaptchaVerifier
      );
      window.confirmationResult = confirmationResult;
      setIsOtpSent(true);
      message.success("Mã OTP đã được gửi!");
    } catch (error) {
      console.error(error);
      message.error("Gửi OTP thất bại. Vui lòng thử lại.");
    } finally {
      setLoadingOtp(false);
    }
  };

  const onVerifyOtp = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      message.error("Vui lòng nhập đủ 6 số OTP!");
      return;
    }
    setLoadingOtp(true);
    try {
      await window.confirmationResult.confirm(otpCode);
      setIsVerified(true);
      setIsOtpSent(false);
      message.success("Xác thực thành công!");
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
            fileList[0].originFileObj as File
          );
          designFilePath = uploadResult.url;
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
                  setOtp(["", "", "", "", "", ""]);
                  setFileList([]);
                  setSelectedAddress(undefined);
                }}
              >
                Đặt đơn khác
              </Button>,
              <Link href="/customer/history" key="history">
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
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div id="recaptcha-container"></div>

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
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

        <Card className="shadow-xl rounded-2xl">
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

                  <Form.Item
                    name="customerName"
                    label={<span className={labelStyle}>Họ và tên</span>}
                    rules={[{ required: true, message: "Nhập họ tên" }]}
                  >
                    <Input placeholder="Nguyễn Văn A" />
                  </Form.Item>

                  {/* SĐT + OTP cùng hàng */}
                  <div className="mb-3">
                    <div className={`${labelStyle} mb-1`}>
                      Số điện thoại <span className="text-red-500">*</span>
                    </div>
                    <div className="flex gap-2 items-start">
                      <Form.Item
                        name="phone"
                        className="flex-1 mb-0"
                        rules={[
                          { required: true, message: "Nhập SĐT" },
                          { pattern: /^0\d{9}$/, message: "SĐT không hợp lệ" },
                        ]}
                      >
                        <Input
                          placeholder="0912345678"
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
                              {otp.map((digit, index) => (
                                <input
                                  key={index}
                                  id={`otp-${index}`}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) =>
                                    handleOtpChange(
                                      index,
                                      e.target.value.replace(/\D/g, "")
                                    )
                                  }
                                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                  className="w-8 h-8 text-center text-sm font-bold border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                />
                              ))}
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
                                  setOtp(["", "", "", "", "", ""]);
                                }}
                              >
                                Gửi lại
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                      {isVerified && (
                        <span className="text-green-600 text-sm flex items-center">
                          <CheckCircleOutlined className="mr-1" /> Đã xác minh
                        </span>
                      )}
                    </div>
                  </div>

                  <Form.Item
                    name="email"
                    label={<span className={labelStyle}>Email</span>}
                    rules={[{ type: "email", message: "Email không hợp lệ" }]}
                  >
                    <Input
                      placeholder="email@example.com"
                      disabled={!isVerified}
                    />
                  </Form.Item>

                  {/* Shipping Address - Map Picker */}
                 <div className={`pt-4 border-t ${!isVerified ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className={`${labelStyle} mb-3`}>Địa chỉ giao hàng <span className='text-red-500'>*</span></div>
                    {!isVerified && (
                      <div className='text-sm text-orange-500 mb-2'>Vui lòng xác thực SĐT trước</div>
                    )}
                    <AddressMapPicker
                      value={selectedAddress}
                      onChange={(address) => {
                        setSelectedAddress(address)
                        form.setFieldValue('shippingAddress', address.formattedAddress)
                      }}
                      height={250}
                      placeholder='Tìm kiếm địa chỉ tại Việt Nam...'
                    />
                    <Form.Item name='shippingAddress' hidden>
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
                      Vui lòng xác thực Số điện thoại bằng OTP trước khi tiếp
                      tục
                    </div>
                  )}
                  <Title level={4} className="text-blue-700 mb-6">
                    <PlusOutlined className="mr-2" />
                    Yêu cầu in ấn
                  </Title>

                  <Form.Item
                    name="productName"
                    label={
                      <span className={labelStyle}>Tên sản phẩm cần in</span>
                    }
                    rules={[{ required: true, message: "Nhập tên sản phẩm" }]}
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
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="quantity"
                        label={
                          <span className={labelStyle}>Số lượng dự kiến</span>
                        }
                        rules={[{ required: true, message: "Nhập số lượng" }]}
                      >
                        <InputNumber
                          className="w-full"
                          min={1}
                          formatter={(value) =>
                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          }
                          placeholder="VD: 1,000"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="desiredDate"
                        label={
                          <span className={labelStyle}>
                            Ngày mong muốn nhận hàng
                          </span>
                        }
                        rules={[{ required: true, message: "Chọn ngày" }]}
                      >
                        <DatePicker
                          format="DD-MM-YYYY"
                          disabledDate={disabledDate}
                          // disabledTime={disabledDateTime}
                          // showTime={{
                          //   defaultOpenValue: dayjs(),
                          // }}
                        />
                      </Form.Item>
                    </Col>
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
                className={`h-14 text-xl font-bold ${
                  !isVerified ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? "Đang gửi..." : "GỬI YÊU CẦU BÁO GIÁ"}
              </Button>
              {!isVerified && (
                <div className="text-center text-red-500 mt-2 text-sm">
                  Vui lòng xác thực SĐT để gửi đơn
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
  );
}
