"use client";

import { paymentApi, PaymentResponse } from "@/apiRequests/payment";
import { requestOrderApi } from "@/apiRequests/request";
import { estimatesApi, QuoteOption } from "@/apiRequests/estimates";
import { uploadApi } from "@/apiRequests/uploads";
import DesignFileDisplay from "@/app/consultant/components/DesignFileDisplay";
import {
  CreditCardOutlined,
  DownloadOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  QrcodeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Button,
  message,
  Skeleton,
  Modal,
  Upload,
  Popconfirm,
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";



export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteOption | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentResponse | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [fullRequestDetail, setFullRequestDetail] = useState<any>(null);

  useEffect(() => {
    const fetchFullDetail = async () => {
      if (!requestId) return;
      try {
        const res = await requestOrderApi.getDetail(requestId);
        setFullRequestDetail(res?.data || res);
      } catch (error) {
        console.error("Error fetching full request detail:", error);
      }
    };
    fetchFullDetail();
  }, [requestId]);

  useEffect(() => {
    const fetchQuotes = async () => {
      if (!requestId) return;

      setLoading(true);
      try {
        const response = await estimatesApi.emailPreview(Number(requestId));
        const data: any = (response as any).data || response;

        if (data && data.quotes) {
          setQuotes(data.quotes);
        }
      } catch (error) {
        console.error("Error fetching order detail:", error);
        message.error("Không thể tải thông tin báo giá");
      } finally {
        setLoading(false);
      }
    };

    fetchQuotes();
  }, [requestId]);

  const handlePayClick = (quote: QuoteOption) => {
    setSelectedQuote(quote);
    setIsConfirmModalVisible(true);
  };

  const proceedToPayment = async () => {
    if (!selectedQuote) return;

    setIsConfirmModalVisible(false);
    setIsPaymentModalVisible(true);
    setLoadingQR(true);
    setPaymentInfo(null);
    try {
      const res = await paymentApi.getPaymentQR(String(selectedQuote.order_request_id), selectedQuote.quote_id, selectedQuote.estimate_id);
      const data = (res as any).data || res;
      if (data) {
        setPaymentInfo(data);
      }
    } catch (error) {
      console.error("Error fetching payment QR:", error);
      message.error("Lỗi khi lấy thông tin thanh toán");
      setIsPaymentModalVisible(false);
    } finally {
      setLoadingQR(false);
    }
  };

  useEffect(() => {
    if (!requestId || !selectedQuote) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await paymentApi.getStatusPayment(requestId, selectedQuote.quote_id, selectedQuote.estimate_id);
        const data = (response as any).data || response;

        if (data && data.status === 'PAID') {
          // message.success('Thanh toán thành công!');
          router.push(`/request-detail/${requestId}`);
        }
      } catch (error) {
        // console.error("Error checking payment status:", error);
      }
    };

    const intervalId = setInterval(checkPaymentStatus, 2000);

    return () => clearInterval(intervalId);
  }, [requestId, router, selectedQuote]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount).replace('₫', 'đ');
  };

  const ExpiryNote = () => (
    <p className="mt-6 text-sm text-slate-500 italic leading-relaxed border-t border-slate-200 pt-4">
      (*) Báo giá có hiệu lực đến <b>{paymentInfo?.expired_at ? dayjs(paymentInfo.expired_at).format("HH:mm DD/MM/YYYY") : "..."}</b>. Sau thời gian này, mọi thông tin về đơn giá và chi phí có thể thay đổi.
      Mọi thao tác thanh toán sau thời gian này đều sẽ không được ghi nhận, mọi thắc mắc vui lòng liên hệ lại với chúng tôi để được hỗ trợ.
    </p>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex justify-center items-center">
        <Skeleton active paragraph={{ rows: 10 }} className="max-w-2xl w-full" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-slate-500 font-medium">Không tìm thấy yêu cầu</p>
          <Button type="primary" onClick={() => router.back()} className="mt-4">
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  bg-slate-50 py-8 px-4 flex flex-col items-center">
      <div className={`grid grid-cols-1 ${quotes.length > 1 ? "xl:grid-cols-2" : ""} gap-12 w-full max-w-7xl`}>
        {quotes.map((quote, index) => {
          const requestDateText = quote.request_date_text || dayjs(quote.order_request_date).format("DD/MM/YYYY");
          const deliveryText = quote.delivery_text || dayjs(quote.delivery_date).format("DD/MM/YYYY");
          const designTypeText = quote.design_type_text || (quote.is_send_design ? "Khách gửi file" : "Thuê thiết kế");
          const finalTotalValue = quote.final_total || 0;

          return (
            <div key={quote.quote_id} className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col mx-auto w-full max-w-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-blue-200 text-xs font-bold tracking-widest uppercase">
                      MES SYSTEM
                    </div>
                    <div className="text-white text-2xl font-extrabold mt-1">
                      BÁO GIÁ {quotes.length > 1 ? index + 1 : ""}
                    </div>
                  </div>
                  <div className="bg-white/15 text-white px-3 py-1.5 rounded text-sm font-bold">
                    AM{quote.order_request_id.toString().padStart(6, '0')}
                  </div>
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <div className="mb-6">
                  <p className="text-[15px] m-0">
                    Chào <b>{quote.customer_name}</b>,
                  </p>
                  <p className="text-slate-500 text-sm mt-1 mb-0">
                    Dưới đây là chi tiết báo giá cho yêu cầu in ấn của bạn:
                  </p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-6">
                      <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-blue-500 text-blue-600 tracking-wide">
                        Thông tin đơn hàng
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Ngày yêu cầu</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{requestDateText}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Người yêu cầu</span>
                          <span className="text-slate-800 font-semibold text-[13px] uppercase">{quote.customer_name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Số điện thoại</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{quote.customer_phone}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Email</span>
                          <span className="text-blue-600 font-semibold text-[13px] break-all">{quote.customer_email}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-blue-500 text-blue-600 tracking-wide">
                        Chi tiết sản phẩm
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Sản phẩm</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{quote.product_name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Số lượng</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{quote.quantity.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Loại giấy</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{quote.paper_name || "---"}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                          <span className="text-slate-500 text-[13px]">Thiết kế</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{designTypeText}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-slate-500 text-[13px]">Giao dự kiến</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{deliveryText}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-6">
                      <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-orange-500 text-orange-600 tracking-wide">
                        Bảng kê chi phí
                      </h3>
                      <div className="rounded-lg p-2">
                        <div className="space-y-2 min-h-[154px]">
                          {!!quote.material_cost && (
                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-slate-600 text-[13px]">Nguyên vật liệu</span>
                              <span className="text-slate-800 font-bold text-[13px]">{formatVND(quote.material_cost)}</span>
                            </div>
                          )}
                          {!!quote.labor_cost && (
                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-slate-600 text-[13px]">Chi phí nhân công</span>
                              <span className="text-slate-800 font-bold text-[13px]">{formatVND(quote.labor_cost)}</span>
                            </div>
                          )}
                          {!!quote.other_fees && (
                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-slate-600 text-[13px]">Chi phí khác</span>
                              <span className="text-slate-800 font-bold text-[13px]">{formatVND(quote.other_fees)}</span>
                            </div>
                          )}
                          {!!quote.rush_amount && (
                            <div className="flex justify-between items-center py-1.5">
                              <span className="text-slate-600 text-[13px]">Phụ thu giao gấp</span>
                              <span className="text-slate-800 font-bold text-[13px]">{formatVND(quote.rush_amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-green-500 text-green-600 tracking-wide">
                        Tổng thanh toán
                      </h3>
                      <div className="space-y-2">
                        <div className={`flex justify-between items-center py-2 ${!quote.discount_amount ? "border-b border-dashed border-slate-300" : ""}`}>
                          <span className="text-slate-500 text-[13px]">Tạm tính</span>
                          <span className="text-slate-800 font-semibold text-[13px]">{formatVND(quote.subtotal || 0)}</span>
                        </div>
                        {!!quote.discount_amount && (
                          <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-300">
                            <span className="text-slate-500 text-[13px]">Giảm giá ({quote.discount_percent || 0}%)</span>
                            <span className="text-red-500 font-semibold text-[13px]">- {formatVND(quote.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-3">
                          <span className="text-slate-800 font-bold text-[15px]">THÀNH TIỀN</span>
                          <span className="text-blue-700 font-extrabold text-lg">{formatVND(finalTotalValue)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-red-500 text-[11px]">(Đã bao gồm VAT)</span>
                        </div>
                      </div>

                      <div className="mt-5 bg-green-50 border border-green-300 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-green-800 font-bold text-[13px]">Cần đặt cọc/Thanh toán:</span>
                          <span className="text-green-700 font-extrabold text-base">{formatVND(quote.deposit || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3 flex-wrap">
                  <Button
                    type="primary"
                    className="h-10 px-8 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-200 w-full sm:w-auto mt-2 sm:mt-0"
                    onClick={() => handlePayClick(quote)}
                  >
                    Thanh toán
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end gap-3 flex-wrap">
        <button
          onClick={() => router.push(`/reject-deal/${requestId}`)}
          className="h-10 px-8 rounded-lg font-medium w-full sm:w-auto mt-2 sm:mt-0 bg-red-500 text-white hover:bg-red-600 hover:text-white"
        >
          Từ chối yêu cầu báo giá
        </button>
      </div>

      {/* Confirmation Modal */}
      <Modal
        title={<div className="text-lg font-bold text-slate-800">Xác nhận hợp đồng & thanh toán</div>}
        open={isConfirmModalVisible}
        onCancel={() => setIsConfirmModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsConfirmModalVisible(false)} className="rounded-lg">
            Hủy
          </Button>,
          <Popconfirm
            title="Xác nhận thanh toán"
            description="Khi đã chọn xác nhận thanh toán này thì đồng nghĩa với việc báo giá còn lại sẽ bị hủy. Bạn có chắc chắn muốn thanh toán?"
            onConfirm={proceedToPayment}
            onCancel={() => setIsConfirmModalVisible(false)}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button
              key="submit"
              type="primary"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 border-none"
            >
              Xác nhận & Thanh toán
            </Button>
          </Popconfirm>

        ]}
        width={600}
        centered
      >
        <div className="py-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
            <h4 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
              <InfoCircleOutlined className="text-blue-500" />
              Điều khoản hợp đồng
            </h4>
            <p className="text-blue-700 text-sm m-0">
              Vui lòng xem kỹ file hợp đồng và các thông tin báo giá trước khi tiến hành thanh toán đặt cọc.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                    <FileTextOutlined className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">File Hợp đồng</div>
                    <div className="text-xs text-slate-500">
                      {selectedQuote?.contract_file_path || fullRequestDetail?.contract_file ? "Sẵn sàng để xem" : "Đang chờ cập nhật"}
                    </div>
                  </div>
                </div>
                {selectedQuote?.contract_file_path || fullRequestDetail?.contract_file ? (
                  <div className="flex gap-2">
                    <Button
                      type="primary"
                      ghost
                      icon={<DownloadOutlined />}
                      onClick={() => window.open(selectedQuote?.contract_file_path || fullRequestDetail?.contract_file, '_blank')}
                      className="rounded-lg"
                    >
                      Tải / Xem hợp đồng
                    </Button>
                    <Upload
                      showUploadList={false}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      customRequest={async (options) => {
                        const { file, onSuccess, onError } = options;
                        const hide = message.loading("Đang tải hợp đồng lên...", 0);
                        try {
                          await uploadApi.uploadContract({
                            requestId: Number(requestId),
                            estimate_id: selectedQuote?.estimate_id || 0,
                            file: file as File
                          });
                          message.success("Tải bản hợp đồng đã ký thành công!");
                          if (onSuccess) onSuccess("ok");
                        } catch (error) {
                          message.error("Tải hợp đồng thất bại");
                          if (onError) onError(error as any);
                        } finally {
                          hide();
                        }
                      }}
                    >
                      <Button icon={<UploadOutlined />} className="rounded-lg">
                        Gửi lại bản đã ký
                      </Button>
                    </Upload>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-sm">Chưa có file</span>
                )}
              </div>
              <p className="text-xs text-red-500 italic m-0 px-1">
                * Lưu ý: Sau 3 ngày phải ký hợp đồng nếu không đơn hàng sẽ bị hoãn. Quý khách có thể gửi hợp đồng trong phần Tra cứu đơn hàng. Khi đã thanh toán xem như đã đồng ý với các điều khoản trong hợp đồng.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-amber-800 font-medium">Số tiền cần thanh toán:</span>
                <span className="text-amber-700 font-extrabold text-lg">
                  {selectedQuote ? formatVND(selectedQuote.deposit) : "0 đ"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Payment QR Modal */}
      <Modal
        title={null}
        open={isPaymentModalVisible}
        onCancel={() => { setIsPaymentModalVisible(false); setPaymentInfo(null); }}
        footer={null}
        width={500}
        centered
        destroyOnClose
      >
        {loadingQR ? (
          <div className="py-12 flex justify-center items-center">
            <Skeleton active />
          </div>
        ) : (
          paymentInfo && selectedQuote ? (
            <div className="bg-white rounded-xl">
              <div className="text-center mb-6 pt-4">
                <h3 className="text-xl font-bold text-slate-800 m-0">QUÉT MÃ THANH TOÁN</h3>
                <p className="text-slate-500 text-sm mt-1">Vui lòng quét mã bên dưới để hoàn tất đặt cọc cho Báo giá</p>
              </div>

              <div className="flex flex-col items-center gap-6 px-2">
                <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
                  <QRCodeCanvas
                    value={paymentInfo.qr_code}
                    size={220}
                    level={"H"}
                    includeMargin={true}
                  />
                </div>

                <div className="w-full space-y-3 p-5 bg-slate-50 rounded-xl border border-slate-200 text-sm shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                    <span className="text-slate-500">Ngân hàng</span>
                    <span className="font-semibold text-slate-700">{paymentInfo.bin}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                    <span className="text-slate-500">Số tài khoản</span>
                    <span className="font-semibold text-slate-700">{paymentInfo.account_number}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                    <span className="text-slate-500">Chủ tài khoản</span>
                    <span className="font-semibold text-slate-700 uppercase">{paymentInfo.account_name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                    <span className="text-slate-500">Số tiền</span>
                    <span className="font-bold text-emerald-600 text-base">{formatVND(paymentInfo.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Nội dung CK</span>
                    <span className="font-mono font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{paymentInfo.order_code}</span>
                  </div>
                </div>

                <div className="w-full">
                  <Button
                    type="primary"
                    href={paymentInfo.check_out_url}
                    target="_blank"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 h-10 lg:h-12 rounded-xl font-semibold shadow-emerald-200 shadow-lg text-sm lg:text-base flex items-center justify-center p-0"
                    icon={<CreditCardOutlined />}
                  >
                    Chuyển đến trang thanh toán
                  </Button>
                </div>
              </div>

              <div className="px-2">
                <ExpiryNote />
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">Không tải được thông tin thanh toán.</p>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}
