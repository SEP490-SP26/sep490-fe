/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { materialsApi } from "@/apiRequests/materials";
import { otpsApi } from "@/apiRequests/otps";
import { productsApi } from "@/apiRequests/products";
import { productTypesApi } from "@/apiRequests/producttypes";
import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import AddressMapPicker, { AddressResult } from "@/components/AddressMapPicker";
import {
  CheckCircleOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  PlusOutlined,
  UploadOutlined
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
  message,
  Modal,
  Popconfirm,
  Result,
  Row,
  Select,
  Space,
  Typography,
  Upload,
  Radio
} from "antd";
import Holidays from "date-holidays";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";

import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { useCustomer } from "@/context/CustomerContext";
import { formatVietnameseNumber } from "@/utils/format";
import { disabledDate } from "@/utils/vietnamHolidays";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "@/apiRequests/axios";

const { Title, Text } = Typography;






// Khởi tạo Vietnamese Holidays
const hd = new Holidays("VN");

const quantityOptions = [
  { value: 500, label: "Gói 500" },
  { value: 1000, label: "Từ 500 đến 1.000" },
  { value: 2000, label: "Từ 1.000 đến 2.000" },
  { value: 3000, label: "Từ 2.000 đến 3.000" },
  { value: 5000, label: "Từ 3.000 đến 5.000" },
  { value: 10000, label: "Từ 5.000 đến 10.000" },
  { value: 20000, label: "Từ 10.000 đến 20.000" },
];

const getQuantityLabel = (val: number) => {
  const option = quantityOptions.find((opt) => opt.value === val);
  return option ? option.label : formatVietnameseNumber(val);
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
  const { customer, isLoggedIn } = useCustomer();
  const [form] = Form.useForm();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState<any>(null);

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

  const [designOption, setDesignOption] = useState<number>(1);

  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [unitValue, setUnitValue] = useState<number>(0);

  const [productsList, setProductsList] = useState<any[]>([]);
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [paperTypes, setPaperTypes] = useState<any[]>([]);

  const productNameField = Form.useWatch("productName", form);
  const quantityField = Form.useWatch("quantity", form);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!productNameField || productsList.length === 0) return;

      const selectedProduct = productsList.find(p => p.name === productNameField);
      if (selectedProduct && selectedProduct.product_type_id) {
        try {
          const templRes = await productTypesApi.getProductTemplete(selectedProduct.product_type_id);
          const templates = Array.isArray(templRes) ? templRes : (templRes as any)?.data;

          if (templates && templates.length > 0) {
            const profile = templates[0];
            const currentValues = form.getFieldsValue();

            form.setFieldsValue({
              length: currentValues.length || profile.product_length_mm || 0,
              width: currentValues.width || profile.product_width_mm || 0,
              height: currentValues.height || profile.product_height_mm || 0,
            });

            if (profile.unit_value) {
              setUnitValue(profile.unit_value);
            } else {
              setUnitValue(0);
            }
          } else {
            setUnitValue(0);
          }
        } catch (error) {
          console.error("Failed to fetch product template:", error);
          setUnitValue(0);
        }
      } else {
        setUnitValue(0);
      }
    };
    fetchTemplate();
  }, [productNameField, productsList, form]);

  useEffect(() => {
    const qty = Number(quantityField?.toString().replace(/\./g, ""));
    if (unitValue > 0 && quantityField && qty > 0) {
      setEstimatedPrice(unitValue * qty);
    } else {
      setEstimatedPrice(null);
    }
  }, [unitValue, quantityField]);

  // Handle verified email from Home Page / Logged In Customer
  useEffect(() => {
    const emailParam = searchParams.get("email");
    const verifiedParam = searchParams.get("verified");

    if (isLoggedIn && customer) {
      form.setFieldsValue({
        customerName: customer.name,
        phone: customer.phone,
        email: customer.email,
      });
      setIsVerified(true);
      setIsOtpSent(false);

      if (customer.addresses && customer.addresses.length > 0) {
        const defaultAddr = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
        const addressStr = defaultAddr.formattedAddress || `${defaultAddr.streetAddress}, ${defaultAddr.districtName}, ${defaultAddr.provinceName}`;

        form.setFieldValue("shippingAddress", addressStr);
        setSelectedAddress({
          formattedAddress: addressStr,
          lat: defaultAddr.lat || 0,
          lng: defaultAddr.lng || 0,
        } as any);
      }
    } else if (emailParam && verifiedParam === "true") {
      form.setFieldValue("email", emailParam);
      setIsVerified(true);
      setIsOtpSent(false); // No need to send OTP if already verified
    }
  }, [searchParams, form, isLoggedIn, customer]);

  // Fetch product suggestions and paper types
  useEffect(() => {
    const fetchRefData = async () => {
      try {
        const [productsRes, papersRes] = await Promise.all([
          productsApi.getAllProducts(),
          materialsApi.getAllPaperTypes()
        ]);

        if (Array.isArray(productsRes)) {
          setProductsList(productsRes);
          setProductSuggestions(productsRes.map((p: any) => p.name));
        } else if ((productsRes as any)?.data && Array.isArray((productsRes as any).data)) {
          setProductsList((productsRes as any).data);
          setProductSuggestions((productsRes as any).data.map((p: any) => p.name));
        }

        if (Array.isArray(papersRes)) {
          setPaperTypes(papersRes);
        } else if ((papersRes as any)?.data) {
          setPaperTypes((papersRes as any).data);
        } else if ((papersRes as any)?.paperTypes) {
          setPaperTypes((papersRes as any).paperTypes);
        }

      } catch (error) {
        console.error("Failed to fetch reference data:", error);
      }
    };
    fetchRefData();
  }, []);

  const onSendOtp = async () => {
    const email = form.getFieldValue("email");
    if (!email) {
      message.error("Vui lòng nhập email!");
      return;
    }

    setLoadingOtp(true);
    try {
      const response = await otpsApi.sendOtp({ email });
      if (response) {
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
      if (response) {
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

  // Validation Kích thước
  const validateDimension = () => ({
    validator(_: any, value: any) {
      if (!value) return Promise.resolve();
      if (value > 3000) {
        return Promise.reject(new Error("Tối đa 3000mm"));
      }

      const length = Number(form.getFieldValue("length")) || 0;
      const width = Number(form.getFieldValue("width")) || 0;
      const height = Number(form.getFieldValue("height")) || 0;

      if (length > 0 && width > 0) {
        if (length < width) {
          return Promise.reject(new Error("Dài phải ≥ Rộng"));
        }
        if (length > width * 20) {
          return Promise.reject(new Error("Dài không quá 20 lần Rộng"));
        }
      }

      if (width > 0 && height > 0) {
        if (width > height * 20) {
          return Promise.reject(new Error("Rộng không quá 20 lần Cao"));
        }
      }

      if (length > 0 && height > 0) {
        if (length > height * 30) {
          return Promise.reject(new Error("Dài không quá 30 lần Cao"));
        }
      }

      return Promise.resolve();
    }
  });

  const onFinish = async (values: any) => {
    // Check if any file is still uploading
    const isUploading = fileList.some((file) => file.status === "uploading");
    if (isUploading) {
      message.warning("Vui lòng đợi quá trình tải lên hoàn tất!");
      return;
    }

    // Get design file paths from uploaded files
    const designFilePath = fileList
      .map((file) => file.url)
      .filter((url) => !!url) // Filter out undefined/null/empty
      .join(",");

    // Build request body according to API schema
    const requestBody = {
      customer_name: values.customerName,
      customer_phone: values.phone,
      customer_email: values.email || "",
      delivery_date:
        values.desiredDate?.toISOString() || new Date().toISOString(),
      product_name: values.productName,
      quantity: Number(values.quantity?.toString().replace(/\./g, "")) || 1,
      description: values.note || "",
      product_length_mm: values.length ? values.length : 0,
      product_width_mm: values.width ? values.width : 0,
      product_height_mm: values.height ? values.height : 0,
      paper_name: values.paperName || "",
      design_file_path: designFilePath,
      order_request_date: new Date().toISOString(),
      // Address from map picker
      province: "",
      district: "",
      detail_address:
        selectedAddress?.formattedAddress || values.shippingAddress || "",
      is_send_design: designOption === 1,
      preliminary_estimated_price: estimatedPrice || 0
    };

    setFormDataToSubmit(requestBody);
    setIsReviewModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!formDataToSubmit) return;

    setIsSubmitting(true);
    try {
      await requestOrderApi.createRequestOrderByCustomer(formDataToSubmit);
      //await axios.post("https://localhost:7109/api/Requests",formDataToSubmit);
      message.success("Gửi yêu cầu thành công!");
      setIsSuccess(true);
      setIsReviewModalOpen(false);
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
      <div className="flex justify-center bg-primary-dark items-center min-h-screen bg-gray-50 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-gray-200 rounded-full opacity-30 animate-pulse" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-slate-200 rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-10 w-40 h-40 bg-zinc-200 rounded-full opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <Card className="w-full max-w-2xl shadow-md">
          <Result
            status="success"
            title="Gửi yêu cầu thành công!"
            subTitle="Cảm ơn bạn đã gửi yêu cầu.Trong vòng 24h tới, nhân viên tư vấn sẽ liên hệ trực tiếp với bạn qua số điện thoại hoặc email đã cung cấp để trao đổi chi tiết về yêu cầu này."
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
              <Link href="/look-up" key="lock-up">
                <Button size="large">Tra cứu</Button>
              </Link>,
            ]}
          />
        </Card>
      </div>
    );
  }

  const labelStyle = "font-semibold text-gray-700";

  return (
    <div className="min-h-screen bg-primary-dark relative overflow-hidden py-4 px-4">
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
              style={{ color: "#FFBF00", textTransform: "uppercase", marginBottom: "8px" }}
            >
              Đặt In Nhanh
            </Title>
            <div className="mb-6">
              <Text className="text-slate-100 font-medium italic opacity-85">
                Giải pháp in ấn toàn diện - Nâng tầm giá trị thương hiệu
              </Text>
            </div>
            <Text type="secondary" style={{ color: "#ffffff" }}>
              Điền thông tin để nhận báo giá từ đội ngũ tư vấn
            </Text>
            <div className="mt-2">
              <Text type="secondary" style={{ color: "#ffffff" }}>
                Đã có tài khoản?{" "}
                <Link href="/login" className="font-medium " style={{ color: "#FFBF00" }}>
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
              requiredMark={false}
              size="middle"
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
                        label={<span className={labelStyle}>Họ và tên <span className="text-red-500">*</span></span>}
                        rules={[{ required: true, message: "Nhập họ tên" }]}
                        className="w-full"
                      >
                        <Input placeholder="Nguyễn Văn A" disabled={isLoggedIn} />
                      </Form.Item>

                      {/* SĐT - simple field without OTP */}
                      <Form.Item
                        name="phone"
                        label={<span className={labelStyle}>SĐT <span className="text-red-500">*</span></span>}
                        rules={[
                          { required: true, message: "Nhập SĐT" },
                          { pattern: /^0\d{9}$/, message: "SĐT không hợp lệ" },
                        ]}
                        className="w-full"
                      >
                        <Input placeholder="0912345678" disabled={isLoggedIn} />
                      </Form.Item>
                    </div>

                    {/* Email + OTP verification */}
                    <div className="mb-3">
                      {/* Email row */}
                      <div className={`${labelStyle} mb-1`}>
                        Email <span className="text-red-500">*</span>
                      </div>
                      <div className="flex gap-2 items-start mb-3">
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
                                <span className="text-green-600 text-sm flex items-center">
                                  <CheckCircleOutlined className="mr-1" /> Đã xác minh
                                </span>
                              ) : null
                            }
                          />
                        </Form.Item>

                        {!isVerified && !isOtpSent && (
                          <Button
                            type="primary"
                            onClick={onSendOtp}
                            loading={loadingOtp}
                          >
                            Gửi OTP
                          </Button>
                        )}
                      </div>

                      {/* OTP row - chỉ hiển thị khi đã gửi OTP */}
                      {!isVerified && isOtpSent && (
                        <div className="mt-3">
                          <div className="mb-1 text-sm text-gray-600">
                            Mã xác minh (OTP) đã được gửi đến email
                          </div>
                          <div className="flex gap-2 items-start">
                            <div className="flex-1">
                              <Input.OTP
                                length={6}
                                value={otp}
                                onChange={setOtp}
                                style={{ width: '100%' }}
                                className="justify-start"
                              />
                            </div>
                            <div className="flex gap-1">
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
                          </div>
                        </div>
                      )}

                      {/* Verification status */}
                      {/* {isVerified && (
                        <div className="mt-2">
                          <span className="text-green-600 text-sm flex items-center">
                            <CheckCircleOutlined className="mr-1" /> Đã xác minh
                          </span>
                        </div>
                      )} */}
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
                      <Form.Item
                        name="shippingAddress"
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng chọn địa chỉ giao hàng!",
                          },
                        ]}
                      >
                        <Input style={{ display: "none" }} />
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
                        Vui lòng xác thực email bằng OTP trước khi tiếp tục
                      </div>
                    )}
                    <Title level={4} className="text-blue-700 mb-6">
                      <PlusOutlined className="mr-2" />
                      Yêu cầu in ấn
                    </Title>

                    <Row gutter={16}>
                      <Col xs={24} md={14}>
                        <Form.Item
                          name="productName"
                          label={
                            <span className={labelStyle}>
                              Tên sản phẩm cần in <span className="text-red-500">*</span>
                            </span>
                          }
                          rules={[
                            { required: true, message: "Nhập tên sản phẩm" },
                          ]}
                        >
                          <AutoComplete
                            options={productSuggestions.map((name) => ({
                              label: name,
                              value: name,
                            }))}
                            placeholder="Chọn hoặc nhập tên sản phẩm"
                            style={{ width: "100%" }}
                            filterOption={(inputValue, option) =>
                              (option?.value as string)
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
                      </Col>

                      <Col xs={24} md={10}>
                        <Form.Item
                          name="quantity"
                          label={<span className={labelStyle}>Số lượng <span className="text-red-500">*</span></span>}
                          rules={[
                            { required: true, message: "Vui lòng chọn số lượng" },
                          ]}
                        >
                          <Select
                            options={quantityOptions}
                            placeholder="Chọn số lượng"
                            style={{ width: "100%" }}
                            onChange={(value) => {
                              form.setFieldsValue({ quantity: value });
                            }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16} className="mt-4">
                      {/* Dimensions Group */}
                      <Col xs={24} md={14}>
                        <div className={`${labelStyle} mb-2`}>Kích thước (Dài x Rộng x Cao) (mm)</div>
                        <Row gutter={8}>
                          <Col span={8}>
                            <Form.Item name="length" dependencies={['width', 'height']} rules={[validateDimension]}>
                              <FloatingInputAntd className="text-right" placeholder="Dài" style={{ width: "100%" }} min={0} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="width" dependencies={['length', 'height']} rules={[validateDimension]}>
                              <FloatingInputAntd className="text-right" placeholder="Rộng" style={{ width: "100%" }} min={0} />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item name="height" dependencies={['length', 'width']} rules={[validateDimension]}>
                              <FloatingInputAntd className="text-right" placeholder="Cao" style={{ width: "100%", }} min={0} />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Col>

                      <Col xs={24} md={10}>
                        <Form.Item
                          name="desiredDate"
                          label={
                            <span className={labelStyle}>
                              Thời gian dự kiến <span className="text-red-500">*</span>
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
                      </Col>



                      {/* Paper Type */}
                      {/* <Col xs={24} md={12}>
                        <div className={`${labelStyle} mb-2`}>Loại giấy (Không bắt buộc)</div>
                        <Form.Item name="paperName" className="mb-0">
                          <Select
                            showSearch
                            placeholder="Chọn loại giấy"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={paperTypes.map(p => ({
                              value: p.name,
                              label: p.name
                            }))}
                            allowClear
                          />
                        </Form.Item>
                      </Col> */}
                    </Row>

                    {/* Estimated Price */}
                    <Form.Item
                      name="estimatedPrice"
                      label={<span className={labelStyle}>Giá chỉ từ</span>}
                    >
                      {estimatedPrice !== null && estimatedPrice > 0 && (
                        <Col xs={24} md={12} className="mt-4 md:mt-0">
                          <div className="bg-orange-50 border border-orange-200 text-orange-600 font-bold px-2 py-[4px] rounded-lg text-lg text-right">
                            {formatVietnameseNumber(estimatedPrice)} VNĐ
                          </div>
                        </Col>
                      )}
                    </Form.Item>

                    <Form.Item
                      name="note"
                      label={<span className={labelStyle}>Mô tả thêm</span>}
                    >
                      <Input.TextArea
                        rows={2}
                        placeholder="Kích thước, chất liệu, yêu cầu đặc biệt..."
                      />
                    </Form.Item>

                    <Form.Item label={<span className={labelStyle}>Tùy chọn file thiết kế</span>}>
                      <Radio.Group
                        onChange={(e) => setDesignOption(e.target.value)}
                        value={designOption}
                        className="flex flex-col gap-3"
                      >
                        <Radio value={1} className="text-gray-700">
                          <span className="font-medium">Đã có file thiết kế (File thiết kế là chuẩn vector, PDF, PSD)</span>


                          {designOption === 1 && (
                            <div className="mt-2 ml-6">
                              <Form.Item
                                name="designFile"
                                valuePropName="fileList"
                                getValueFromEvent={normFile}
                                className="mb-0"
                              >
                                <Upload
                                  name="files"
                                  customRequest={async (options) => {
                                    const { file, onSuccess, onError } = options;
                                    try {
                                      const response: any = await uploadApi.uploadFile([file as any]);
                                      console.log("Upload response:", response);

                                      let uploadedUrl = "";
                                      if (Array.isArray(response) && response[0]?.url) {
                                        uploadedUrl = response[0].url;
                                      } else if (response?.url) {
                                        uploadedUrl = response.url;
                                      }

                                      if (uploadedUrl) {
                                        onSuccess?.(uploadedUrl);
                                      } else {
                                        console.error("No URL found in response:", response);
                                        throw new Error("No URL returned");
                                      }
                                    } catch (err) {
                                      console.error("Upload error details:", err);
                                      onError?.(err as Error);
                                      message.error(`${(file as any).name} tải lên thất bại.`);
                                    }
                                  }}
                                  listType="picture"
                                  maxCount={5}
                                  multiple
                                  fileList={fileList}
                                  onChange={({ fileList: newFileList }) => {
                                    const updatedList = newFileList.map((file) => {
                                      if (file.status === 'done' && file.response) {
                                        return { ...file, url: file.response as string };
                                      }
                                      return file;
                                    });
                                    setFileList(updatedList);
                                  }}
                                  onPreview={handlePreview}
                                  className="bg-white design-upload-success"
                                  showUploadList={{
                                    showPreviewIcon: true,
                                    previewIcon: <EyeOutlined className="text-blue-500" />,
                                  }}
                                >
                                  <Button icon={<UploadOutlined />}>Tải lên file </Button>
                                </Upload>

                              </Form.Item>
                            </div>
                          )}
                        </Radio>

                        <Radio value={2} className="text-gray-700">
                          <span className="font-medium">Cần thiết kế File</span>
                          <span className="ml-2 font-bold text-orange-600">200,000 ₫</span>
                        </Radio>
                      </Radio.Group>
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

        {/* Review Order Modal */}
        <Modal
          title={<Title level={3} className="text-center text-primary-dark">Xác nhận thông tin yêu cầu</Title>}
          open={isReviewModalOpen}
          onCancel={() => setIsReviewModalOpen(false)}
          footer={[
            <Button key="back" size="large" onClick={() => setIsReviewModalOpen(false)}>
              Chỉnh sửa
            </Button>,
            <Button
              key="submit"
              type="primary"
              size="large"
              loading={isSubmitting}
              onClick={handleConfirmSubmit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Xác nhận & Gửi
            </Button>,
          ]}
          width={700}
          centered
        >
          {formDataToSubmit && (
            <div className="py-4 space-y-6">

              {/* Customer Info Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3 text-blue-600 border-b pb-2 border-gray-200">
                  <EnvironmentOutlined />
                  <span className="font-semibold text-base">Thông tin liên hệ</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                  <div>

                    <span className="text-gray-500 text-sm block">Khách hàng: <span className="font-medium text-gray-800">{formDataToSubmit.customer_name}</span></span>

                  </div>
                  <div>
                    <span className="text-gray-500 text-sm block">Số điện thoại: <span className="font-medium text-gray-800">{formDataToSubmit.customer_phone}</span></span>

                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-gray-500 text-sm block">Email: <span className="font-medium text-gray-800">{formDataToSubmit.customer_email}</span></span>

                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-gray-500 text-sm block">Địa chỉ giao hàng: <span className="font-medium text-gray-800">{formDataToSubmit.detail_address}</span></span>
                  </div>
                </div>
              </div>

              {/* Product Info Section */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-3 text-blue-600 border-b pb-2 border-gray-200">
                  <PlusOutlined />
                  <span className="font-semibold text-base">Chi tiết đơn hàng</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-gray-500 text-sm block">Sản phẩm: <span className="font-medium text-gray-800 text-lg text-end">{formDataToSubmit.product_name}</span></span>

                  </div>

                  <div>
                    <span className="text-gray-500 text-sm block">Số lượng: <span className="font-medium text-gray-800 text-end">{getQuantityLabel(formDataToSubmit.quantity)}</span></span>

                  </div>

                  <div>
                    <span className="text-gray-500 text-sm block">Thời gian nhận hàng: <span className="font-medium text-gray-800">
                      {dayjs(formDataToSubmit.delivery_date).format("DD/MM/YYYY")}
                    </span></span>
                  </div>

                  <div className="col-span-1 md:col-span-2">
                    <span className="text-gray-500 text-sm block">Kích thước (Không bắt buộc): <span className="font-medium text-gray-800">
                      {formDataToSubmit.product_length_mm} x {formDataToSubmit.product_width_mm} x {formDataToSubmit.product_height_mm} (mm)
                    </span></span>

                  </div>

                  {formDataToSubmit.paper_name && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 text-sm block">Loại giấy:</span>
                      <span className="font-medium text-gray-800">{formDataToSubmit.paper_name}</span>
                    </div>
                  )}

                  {formDataToSubmit.description && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 text-sm block">Ghi chú:</span>
                      <span className="font-medium text-gray-800 italic">{formDataToSubmit.description}</span>
                    </div>
                  )}

                  {!formDataToSubmit.is_send_design && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 text-sm block">Yêu cầu thiết kế:</span>
                      <span className="font-medium text-gray-800">Cần thiết kế File mới (200,000 ₫)</span>
                    </div>
                  )}

                  {formDataToSubmit.is_send_design && fileList.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-gray-500 text-sm block">File thiết kế ({fileList.length}):</span>
                      <ul className="list-disc pl-5 text-sm text-blue-600">
                        {fileList.map((f, index) => (
                          <li
                            key={index}
                            className="truncate max-w-xs cursor-pointer hover:underline hover:text-blue-700"
                            onClick={() => handlePreview(f)}
                          >
                            {f.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {formDataToSubmit.preliminary_estimated_price !== null && formDataToSubmit.preliminary_estimated_price > 0 && (
                <div className="col-span-1 md:col-span-2 pt-2 mt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Giá chỉ từ (ước tính):</span>
                    <span className="text-orange-600 font-bold text-xl">
                      {formatVietnameseNumber(formDataToSubmit.preliminary_estimated_price)} VNĐ
                    </span>
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-gray-500 italic mt-4 col-span-1 md:col-span-2">
                * Vui lòng kiểm tra kỹ thông tin trước khi gửi. Tư vấn viên sẽ liên hệ với bạn trong thời gian sớm nhất.
              </div>

            </div>
          )}
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
          /* Do not set margin-bottom here blindly; or just make standard form tight */
          /* margin-bottom: 12px; */
        }
        .compact-form .ant-form-item-explain-error {
          font-size: 12px;
          line-height: 1.2;
        }
        .compact-form .ant-form-item-label {
          padding-bottom: 4px;
        }
      `}</style>
      </div>
    </div >
  );
}
