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
import QuoteCard from "@/components/common/QuoteCard";
import type { UploadFile, UploadProps } from "antd";
import {
  Button,
  Checkbox,
  message,
  Skeleton,
  Modal,
  Upload,
  Result,
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
  const [estimate_finish_date, setEstimateFinishDate] = useState<string>("---");
  const [selectedQuote, setSelectedQuote] = useState<QuoteOption | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentResponse | null>(null);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [fullRequestDetail, setFullRequestDetail] = useState<any>(null);
  const [hasDownloadedContract, setHasDownloadedContract] = useState(false);
  const [hasUploadedContract, setHasUploadedContract] = useState(false);
  const [hasConfirmedQuote, setHasConfirmedQuote] = useState(false);
  const [isPaid, setIsPaid] = useState(false);


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
          const sortedQuotes = [...data.quotes].sort((a: QuoteOption, b: QuoteOption) => a.estimate_id - b.estimate_id);
          setQuotes(sortedQuotes);
          if (data.estimate_finish_date) {
            const formattedDate = dayjs(data.estimate_finish_date).format("DD/MM/YYYY");
            setEstimateFinishDate(formattedDate !== "Invalid Date" ? formattedDate : data.estimate_finish_date);
          }
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
    setHasDownloadedContract(!!quote.customer_signed_contract_path);
    setHasUploadedContract(!!quote.customer_signed_contract_path);
    setHasConfirmedQuote(false);
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
    if (!requestId || !selectedQuote || isPaid) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await paymentApi.getStatusPayment(requestId, selectedQuote.quote_id, selectedQuote.estimate_id);
        const data = (response as any).data || response;

        if (data && data.status === 'PAID') {
          try {
            await fetch(
              `https://mmes-sep490-84gr.onrender.com/api/Requests/notify-customer-pay?request_id=${requestId}`,
              {
                method: 'GET',
              }
            );

            setIsPaid(true);
            setIsPaymentModalVisible(false);
          } catch (error) {
            console.error('Call API notify failed:', error);
          }
        }
      } catch (error) {
        // console.error("Error checking payment status:", error);
      }
    };

    const intervalId = setInterval(checkPaymentStatus, 2000);

    return () => clearInterval(intervalId);
  }, [requestId, router, selectedQuote, isPaid]);

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount).replace('₫', 'đ');
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    const p = phone.trim();
    if (p.length < 6) return p;
    return p.substring(0, 3) + "****" + p.substring(p.length - 3);
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [user, domain] = email.split("@");
    if (!domain) return email;
    if (user.length <= 2) return "*".repeat(user.length) + "@" + domain;
    return user[0] + "****" + user[user.length - 1] + "@" + domain;
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

  const selectedQuoteIndex = quotes.findIndex(q => q.quote_id === selectedQuote?.quote_id);

  if (isPaid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 animate-fade-in">
          <Result
            status="success"
            title={<span className="text-3xl font-bold text-slate-800">Thanh toán thành công!</span>}
            subTitle={
              <div className="space-y-4 mt-4">
                <p className="text-lg text-slate-600">
                  Yêu cầu <strong>AM{selectedQuote?.order_request_id.toString().padStart(6, '0')}</strong> đã hoàn tất đặt cọc.
                </p>
                <div className="inline-block px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full font-semibold border border-emerald-100">
                  Số tiền đã nhận: {formatVND(selectedQuote?.deposit || 0)}
                </div>
                <p className="text-slate-500">
                  Hệ thống đang xử lý đơn hàng của bạn. Bạn có thể theo dõi tiến độ chi tiết tại trang quản lý yêu cầu.
                </p>
              </div>
            }
            extra={[
              // <Button
              //   key="receipt"
              //   size="large"
              //   className="bg-blue-600 hover:bg-blue-500 border-none rounded-xl h-14 px-10 text-lg font-bold shadow-lg shadow-blue-200 text-white mb-3 w-full sm:w-auto mt-3"
              //   icon={<DownloadOutlined />}
              //   onClick={async () => {
              //     if (!paymentInfo?.order_code) {
              //       message.error("Không tìm thấy mã đơn hàng để tải phiếu thu");
              //       return;
              //     }
              //     const hide = message.loading("Đang tải phiếu thu...", 0);
              //     try {
              //       const res = await paymentApi.getPaymentReceipt(String(paymentInfo.order_code));

              //       // The server returns a docx file Blob
              //       const url = window.URL.createObjectURL(new Blob([res.data]));
              //       const link = document.createElement('a');
              //       link.href = url;
              //       link.setAttribute('download', `Phieu_Thu_${paymentInfo.order_code}.docx`);
              //       document.body.appendChild(link);
              //       link.click();
              //       link.parentNode?.removeChild(link);
              //       window.URL.revokeObjectURL(url);

              //       message.success("Tải phiếu thu thành công!");
              //     } catch (error) {
              //       console.error(error);
              //       message.error("Lỗi khi tải phiếu thu");
              //     } finally {
              //       hide();
              //     }
              //   }}
              // >
              //   Tải phiếu thu
              // </Button>,
              <Button
                type="primary"
                key="detail"
                size="large"
                className="bg-emerald-600 hover:bg-emerald-500 border-none rounded-xl h-14 px-10 text-lg font-bold shadow-lg shadow-emerald-200 mt-3"
                onClick={() => router.push(`/request-detail/${requestId}`)}
              >
                Xem chi tiết yêu cầu
              </Button>,
              <Button
                key="home"
                size="large"
                className="h-14 px-10 text-lg font-semibold rounded-xl border-slate-200 text-slate-600 hover:text-emerald-600 hover:border-emerald-600 mt-3"
                onClick={() => router.push('/')}
              >
                Về trang chủ
              </Button>
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  bg-slate-50 py-8 px-4 flex flex-col items-center">
      <div className={`grid grid-cols-1 ${quotes.length > 1 ? "xl:grid-cols-2" : ""} gap-12 w-full max-w-7xl`}>
        {quotes.map((quote, index) => (
          <QuoteCard
            key={quote.quote_id}
            quote={{
              ...quote,
              customer_phone: maskPhone(quote.customer_phone),
              customer_email: maskEmail(quote.customer_email),
            }}
            index={index}
            totalQuotes={quotes.length}
            consultantNote={fullRequestDetail?.consultant_note}
            estimateFinishDate={estimate_finish_date}
            actions={
              <Button
                type="primary"
                className="h-10 px-8 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 border-none shadow-md shadow-emerald-200 w-full sm:w-auto mt-2 sm:mt-0"
                onClick={() => handlePayClick(quote)}
              >
                Đồng ý
              </Button>
            }
          />
        ))}
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
        title={<div className="text-lg font-bold text-slate-800">Xác nhận hợp đồng & thanh toán {selectedQuote ? `- Báo giá ${selectedQuoteIndex + 1}` : ""}</div>}
        open={isConfirmModalVisible}
        onCancel={() => setIsConfirmModalVisible(false)}
        maskClosable={false}
        keyboard={false}
        footer={[
          <Button key="cancel" onClick={() => setIsConfirmModalVisible(false)} className="rounded-lg">
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            disabled={!hasUploadedContract || !hasConfirmedQuote}
            className={`rounded-lg ${(!hasUploadedContract || !hasConfirmedQuote) ? 'bg-slate-300 text-slate-500' : 'bg-emerald-600 hover:bg-emerald-500'} border-none`}
            onClick={proceedToPayment}
          >
            Thanh toán
          </Button>

        ]}
        width={600}
        centered
      >
        <div className="py-4">
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
            <h4 className="text-blue-800 font-bold mb-2 flex items-center gap-2">
              <InfoCircleOutlined className="text-blue-500" />
              Điều khoản hợp đồng {selectedQuote ? `- Báo giá ${selectedQuoteIndex + 1}` : ""}
            </h4>
            <p className="text-blue-700 text-sm m-0">
              Bạn đang chọn <strong className="text-blue-800">Báo giá {selectedQuote ? selectedQuoteIndex + 1 : ""}</strong>. Vui lòng kiểm tra lại thông tin và xem kỹ file hợp đồng đính kèm trước khi tiến hành thanh toán.
            </p>
          </div>

          {selectedQuote && (
            <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <h4 className="font-bold text-slate-800 m-0">Thông tin Báo giá</h4>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold tracking-wider">AM{selectedQuote.order_request_id.toString().padStart(6, '0')}</span>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">Sản phẩm:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[65%]">{selectedQuote.product_name}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">Số lượng:</span>
                  <span className="font-semibold text-slate-800">{selectedQuote.quantity.toLocaleString('vi-VN')}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">Loại giấy:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[65%]">{selectedQuote.paper_name || "---"}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">Thiết kế:</span>
                  <span className="font-semibold text-slate-800">{selectedQuote.design_type_text || (selectedQuote.is_send_design ? "Khách gửi file" : "Thuê thiết kế")}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">Ngày hoàn thành dự kiến:</span>
                  <span className="font-semibold text-slate-800">{estimate_finish_date}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">Giao hàng dự kiến:</span>
                  <span className="font-semibold text-slate-800">{selectedQuote.delivery_text || dayjs(selectedQuote.delivery_date).format("DD/MM/YYYY")}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-800 font-bold">Thành tiền (đã gồm VAT):</span>
                  <span className="font-bold text-blue-700 text-base">{formatVND(selectedQuote.final_total || 0)}</span>
                </div>
              </div>
            </div>
          )}

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
                      {selectedQuote?.consultant_contract_path || selectedQuote?.customer_signed_contract_path || fullRequestDetail?.contract_file ? "Sẵn sàng để xem" : "Đang chờ cập nhật"}
                    </div>
                  </div>
                </div>
                {selectedQuote?.consultant_contract_path || selectedQuote?.customer_signed_contract_path || fullRequestDetail?.contract_file ? (
                  <div className="flex gap-2">
                    <Button
                      type={hasDownloadedContract ? "default" : "primary"}
                      ghost={!hasDownloadedContract}
                      icon={<DownloadOutlined />}
                      onClick={() => {
                        window.open(selectedQuote?.customer_signed_contract_path || selectedQuote?.consultant_contract_path || fullRequestDetail?.contract_file, '_blank');
                        setHasDownloadedContract(true);
                      }}
                      className={`rounded-lg ${hasDownloadedContract ? 'border-emerald-500 text-emerald-600' : ''}`}
                    >
                      {hasDownloadedContract ? "Đã tải hợp đồng" : "Tải / Xem hợp đồng"}
                    </Button>
                    <Upload
                      showUploadList={false}
                      accept="image/*,.pdf"
                      beforeUpload={(file) => {
                        const isValidFormat = file.type === 'application/pdf' || file.type === 'image/jpeg' || file.type === 'image/png';
                        if (!isValidFormat) {
                          message.error(`${file.name} không phải là file PDF hoặc hình ảnh`);
                          return Upload.LIST_IGNORE;
                        }
                        return true;
                      }}
                      disabled={!hasDownloadedContract}
                      customRequest={async (options) => {
                        const { file, onSuccess, onError } = options;
                        const hide = message.loading("Đang tải hợp đồng lên...", 0);
                        try {
                          await estimatesApi.uploadCustomerSignedContract({
                            request_id: Number(requestId),
                            estimate_id: selectedQuote?.estimate_id || 0,
                            file: file as File
                          });
                          message.success("Tải bản hợp đồng đã ký thành công!");
                          setHasUploadedContract(true);
                          if (onSuccess) onSuccess("ok");
                        } catch (error: any) {
                          const errorMsg = error.response?.data?.message || error.message || "Tải hợp đồng không thành công, vui lòng kiểm tra lại";
                          message.error(errorMsg);
                          if (onError) onError(error as any);
                        } finally {
                          hide();
                        }
                      }}
                    >
                      <Button
                        icon={<UploadOutlined />}
                        className={`rounded-lg ${hasUploadedContract ? 'border-emerald-500 text-emerald-600' : ''}`}
                        disabled={!hasDownloadedContract}
                        type={hasUploadedContract ? "default" : (hasDownloadedContract ? "primary" : "default")}
                      >
                        {hasUploadedContract ? "Đã gửi hợp đồng" : "Gửi lại bản đã ký"}
                      </Button>
                    </Upload>
                  </div>
                ) : (
                  <span className="text-slate-400 italic text-sm">Chưa có file</span>
                )}
              </div>
              <p className="text-xs text-red-500 italic m-0 px-1">
                * Lưu ý: Quý khách cần tải hợp đồng xuống, ký và tải lên bản đã ký để có thể tiến hành thanh toán. Khi đã thanh toán xem như đã đồng ý với các điều khoản trong hợp đồng.
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex justify-between items-center">
                <span className="text-amber-800 font-medium">Số tiền đã cọc:</span>
                <span className="text-amber-700 font-extrabold text-lg">
                  {selectedQuote ? formatVND(selectedQuote.deposit) : "0 đ"}
                </span>
              </div>
            </div>

            {/* <p className="m-0 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
              <InfoCircleOutlined className="mr-1" />
              Lưu ý: Khi đã chọn xác nhận thanh toán này thì đồng nghĩa với việc các báo giá lựa chọn khác sẽ bị hủy.
            </p> */}

            <div
              onClick={() => setHasConfirmedQuote((prev) => !prev)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${hasConfirmedQuote
                ? "bg-emerald-50 border-emerald-400"
                : "bg-white border-slate-200 hover:border-blue-300"
                }`}
            >
              <Checkbox
                checked={hasConfirmedQuote}
                onChange={(e) => setHasConfirmedQuote(e.target.checked)}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5 flex-shrink-0"
              />
              <span className={`text-sm font-medium leading-relaxed ${hasConfirmedQuote ? "text-emerald-700" : "text-slate-700"
                }`}>
                Tôi đã đọc kỹ và đồng ý với toàn bộ thông tin trong{" "}
                <strong>Báo giá {selectedQuoteIndex + 1}</strong>, bao gồm chi phí, điều khoản và thời gian giao hàng.
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Payment QR Modal */}
      <Modal
        title={null}
        open={isPaymentModalVisible}
        onCancel={() => { setIsPaymentModalVisible(false); setPaymentInfo(null); }}
        maskClosable={false}
        keyboard={false}
        footer={null}
        width={500}
        centered
        destroyOnHidden={false}
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
                <p className="text-slate-500 text-sm mt-1">Vui lòng quét mã bên dưới để hoàn tất đặt cọc cho Báo giá {selectedQuoteIndex + 1}</p>
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
                    <span className="font-mono font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">{paymentInfo.description}</span>
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
