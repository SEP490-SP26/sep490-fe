"use client";
import Masonry from "@/components/Bits/Masonry";
import ZaloChat from "@/components/ZaloChatProps/ZaloChatProps";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal, Input, Button, message, Form } from "antd";
import { otpsApi } from "@/apiRequests/otps";
import { MailOutlined } from "@ant-design/icons";
import { useAuth } from "@/lib/auth-context";

const data = [
  {
    id: 1,
    image: "/assets/images/sk.jpg",
    label: "HỘP GIẤY CARTON CAO CẤP",
    height: 200,
  },

  {
    id: 3,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "HỘP NGÀNH HÀNG DƯỢC PHẨM",
    height: 200,
  },
  {
    id: 4,
    image: "/assets/images/danh-thiep.jpg",
    label: "HỘP NGÀNH HÀNG F&B",
    height: 200,
  },

  {
    id: 5,
    image: "/assets/images/thiep-cuoi.jpg",
    label: "HỘP NGÀNH HÀNG MỸ PHẨM CAO CẤP",
    height: 200,
  },
  {
    id: 6,
    image: "/assets/images/catalogue_2.jpg",
    label: "TÚI GIẤY - HỘP BÁNH TRUNG THU",
    height: 200,
  },
  {
    id: 7,
    image: "/assets/images/to-roi.jpg",
    label: "TÚI QUÀ TẶNG",
    height: 200,
  },
  // {
  //   id: 8,
  //   image: "/assets/images/poster.jpg",
  //   label: "Áp phích",
  //   height: 200,
  // },
  // {
  //   id: 9,
  //   image: "/assets/images/nhan-mac.png",
  //   label: "Nhãn mác",
  //   height: 200,
  // },
  // {
  //   id: 10,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Bao bì sản phẩm",
  //   height: 200,
  // },
  // {
  //   id: 11,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Decal dán",
  //   height: 200,
  // },
  // {
  //   id: 12,
  //   image: "/assets/images/menu.jpg",
  //   label: "Menu quán ăn",
  //   height: 200,
  // },
  // {
  //   id: 13,
  //   image: "/assets/images/tai-lieu.jpg",
  //   label: "Tài liệu",
  //   height: 200,
  // },
  // {
  //   id: 14,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Văn phòng phẩm",
  //   height: 200,
  // },
  // {
  //   id: 15,
  //   image: "/assets/images/lich.jpg",
  //   label: "Lịch Tết",
  //   height: 200,
  // },
  // {
  //   id: 16,
  //   image: "/assets/images/lixi.jpg",
  //   label: "Bao lì xì",
  //   height: 200,
  // },
  // {
  //   id: 17,
  //   image: "/assets/images/tui-giay-kraft.jpg",
  //   label: "Túi giấy",
  //   height: 200,
  // },
  // {
  //   id: 18,
  //   image: "/assets/images/hoa-don-ban-le.jpg",
  //   label: "Hóa đơn, phiếu thu",
  //   height: 200,
  // },
  // {
  //   id: 19,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Giấy khen, bằng cấp",
  //   height: 200,
  // },
  // {
  //   id: 20,
  //   image: "/assets/images/voucher.jpg",
  //   label: "Voucher quà tặng",
  //   height: 200,
  // },
  // {
  //   id: 2,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "In nhanh gia công",
  //   height: 200,
  // },
];

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [form] = Form.useForm();

  const showModal = () => {
    if (isAuthenticated) {
      router.push("/order");
    } else {
      setIsModalOpen(true);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setIsOtpSent(false);
    setOtp("");
    setEmail("");
  };

  const onSendOtp = async () => {
    try {
      const values = await form.validateFields(["email"]);
      const emailInput = values.email;

      setLoadingOtp(true);
      const response = await otpsApi.sendOtp({ email: emailInput });
      if (response) {
        setEmail(emailInput);
        setIsOtpSent(true);
        message.success("Mã OTP đã được gửi đến email của bạn!");
      }
    } catch (error) {
      console.error(error);
      message.error("Gửi OTP thất bại hoặc email không hợp lệ.");
    } finally {
      setLoadingOtp(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
      message.error("Vui lòng nhập đủ 6 số OTP!");
      return;
    }
    setLoadingOtp(true);
    try {
      const response = await otpsApi.verifyOtp({ email, otp });
      if (response) {
        message.success("Xác thực email thành công!");
        setIsModalOpen(false);
        // Navigate to order page with verified email
        router.push(`/order?email=${encodeURIComponent(email)}&verified=true`);
      }
    } catch (err) {
      console.error(err);
      message.error("Mã OTP không đúng!");
    } finally {
      setLoadingOtp(false);
    }
  };
  return (
    <div className="relative min-h-screen font-sans">
      {/* Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white [background:radial-gradient(125%_125%_at_50%_10%,#fff_50%,#eef2ff_100%)]"></div>

      <section className="relative min-h-[600px] md:min-h-auto py-20 text-center">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary mb-6 uppercase tracking-tight">
              Công Ty TNHH Thương Mại Và Dịch Vụ In & Bao Bì Đại Phúc Hải
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-8">
              Chúng tôi chuyên cung cấp giải pháp bao bì giấy trọn gói từ thiết kế, in ấn đến hoàn thiện sản phẩm theo tiêu chuẩn ISO và quốc tế. Với hơn 14 năm kinh nghiệm, nhà máy 3.000m² được trang bị dây chuyền hiện đại từ Đức, Nhật Bản, Đài Loan, Trung Quốc, HAFAS tự hào mang đến những bao bì sáng tạo, chất lượng cao, thân thiện với môi trường, giúp doanh nghiệp khẳng định thương hiệu và chinh phục thị trường trong nước lẫn quốc tế.
            </p>
            <div>
              <button
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-primary px-8 py-3 font-medium text-white shadow-md transition duration-300 ease-out hover:bg-primary-dark hover:shadow-xl hover:-translate-y-1"
                onClick={showModal}
              >
                <span className="absolute inset-0 h-full w-full bg-gradient-to-br from-blue-600 via-primary to-blue-400 opacity-0 transition duration-300 ease-out group-hover:opacity-100"></span>
                <span className="relative flex items-center gap-2">
                  Đặt In Nhanh
                  <svg
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </span>
              </button>
            </div>
          </div>

          {/* divider */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent my-12"></div>

          {/*   Sản phẩm của chúng tôi */}
          <div className="">
            <h2 className="text-2xl font-bold text-primary mb-8 uppercase tracking-wide">
              Sản phẩm của chúng tôi
            </h2>
            <Masonry data={data} />
          </div>
        </div>
      </section>
      <ZaloChat />

      {/* Email Verification Modal */}
      <Modal
        title="Xác thực Email để đặt hàng nhanh"
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        centered
      >
        <div className="py-4">
          <p className="mb-4 text-gray-600">
            Vui lòng nhập email để nhận mã OTP xác thực trước khi tạo đơn hàng.
          </p>

          <Form form={form} layout="vertical">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Vui lòng nhập email!" },
                { type: "email", message: "Email không hợp lệ!" }
              ]}
              className="mb-4"
            >
              <Input
                prefix={<MailOutlined className="text-gray-400" />}
                placeholder="Nhập email của bạn"
                size="large"
                disabled={isOtpSent}
              />
            </Form.Item>

            {!isOtpSent ? (
              <Button
                type="primary"
                block
                size="large"
                onClick={onSendOtp}
                loading={loadingOtp}
                className="bg-primary hover:bg-primary-dark"
              >
                Gửi mã OTP
              </Button>
            ) : (
              <div className="animate-fade-in">
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Nhập mã OTP</span>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => {
                        setIsOtpSent(false);
                        setOtp("");
                      }}
                      className="text-blue-500 p-0"
                    >
                      Đổi email
                    </Button>
                  </div>
                  <Input.OTP
                    length={6}
                    value={otp}
                    onChange={setOtp}
                    size="large"
                    className="w-full justify-center"
                  />
                </div>

                <Button
                  type="primary"
                  block
                  size="large"
                  onClick={onVerifyOtp}
                  loading={loadingOtp}
                  className="bg-green-600 hover:bg-green-700 mb-3"
                >
                  Xác thực & Tiếp tục
                </Button>

                <div className="text-center">
                  <span className="text-sm text-gray-500">Chưa nhận được mã? </span>
                  <Button
                    type="link"
                    size="small"
                    onClick={onSendOtp}
                    loading={loadingOtp}
                    className="p-0"
                  >
                    Gửi lại
                  </Button>
                </div>
              </div>
            )}
          </Form>
        </div>
      </Modal>
    </div>
  );
}
