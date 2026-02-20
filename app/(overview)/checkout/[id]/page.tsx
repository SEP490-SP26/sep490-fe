"use client";

import { paymentApi, PaymentResponse } from "@/apiRequests/payment";
import { requestOrderApi } from "@/apiRequests/request";
import { estimatesApi } from "@/apiRequests/estimates";
import { uploadApi } from "@/apiRequests/uploads";
import DesignFileDisplay from "@/app/consultant/components/DesignFileDisplay";
import {
  CreditCardOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import type { UploadFile, UploadProps } from "antd";
import {
  Button,
  message,
  Skeleton,
} from "antd";
import dayjs from "dayjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useState } from "react";

// Interface dựa trên response từ GET /api/Requests/{id}
// Cập nhật thêm các trường chi phí để map với UI mới (nếu API có trả về hoặc để mặc định)
interface OrderDetail {
  order_request_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string;
  product_name: string;
  quantity: number;
  description: string;
  design_file_path: string;
  order_request_date?: string;
  detail_address: string;
  process_status?: string;

  // New fields from previous implementation & template requirements
  product_type?: string;
  paper_code?: string;
  paper_name?: string;
  coating_type?: string;
  wave_type?: string;
  number_of_plates?: number;
  product_length_mm?: number;
  product_width_mm?: number;
  product_height_mm?: number;
  production_processes?: string;
  is_send_design?: boolean;
  payments?: any[];

  // Cost fields for template (Optional as they might not be in initial GET detail)
  material_cost?: number;
  labor_cost?: number;
  other_fees?: number;
  rush_amount?: number;
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  final_total_cost?: number;
  deposit?: number;
}

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = params.id as string;
  let rawQuoteId = searchParams.get('eId') || searchParams.get('quoteId');
  let rawEstimateId = searchParams.get('estimate_id') || searchParams.get('estimateId');

  if (!rawQuoteId && rawEstimateId && rawEstimateId.includes('"')) {
    const parts = rawEstimateId.split('"');
    rawEstimateId = parts[0];
    // Check if second part looks like eId=...
    const secondPart = parts[1];
    if (secondPart.startsWith('eId=')) {
      rawQuoteId = secondPart.split('=')[1];
    }
  }

  const quoteId = Number(rawQuoteId);
  const estimateId = Number(rawEstimateId);

  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [designFiles, setDesignFiles] = useState<UploadFile[]>([]); // Keep state for upload logic logic
  const [uploading, setUploading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentResponse | null>(null);

  // Fetch order detail từ API emailPreview
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!quoteId) return; // Need quoteId for this new API

      setLoading(true);
      try {
        const response = await estimatesApi.emailPreview(quoteId);

        // Handle response mapping
        const data: any = (response as any).data || response;

        if (data) {
          const mappedData: OrderDetail = {
            order_request_id: data.order_request_id,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_email: data.customer_email,
            delivery_date: data.delivery_date,
            product_name: data.product_name,
            quantity: data.quantity,
            description: "", // QuoteDetail might not have description, leave empty or check
            design_file_path: "", // QuoteDetail missing this in interface, but maybe available in data?
            order_request_date: data.order_request_date,
            detail_address: data.detail_address,
            process_status: "", // Not in QuoteDetail?

            // Mapping specific fields
            product_type: "", // Not explicitly in QuoteDetail interface shown?
            paper_code: "",
            paper_name: data.paper_name,
            coating_type: data.coating_type,
            wave_type: data.wave_type,
            number_of_plates: 0,
            product_length_mm: 0,
            product_width_mm: 0,
            product_height_mm: 0,
            production_processes: data.production_process_text,
            is_send_design: data.is_send_design,
            payments: [],

            // Costs
            material_cost: data.material_cost,
            labor_cost: data.labor_cost,
            other_fees: data.other_fees,
            rush_amount: data.rush_amount,
            subtotal: data.subtotal,
            discount_percent: data.discount_percent,
            discount_amount: data.discount_amount,
            final_total_cost: data.final_total,
            deposit: data.deposit,
          };
          setOrderDetail(mappedData);
          if (mappedData.design_file_path) {
            // Logic if path was found
          }
        }
      } catch (error) {
        console.error("Error fetching order detail:", error);
        message.error("Không thể tải thông tin báo giá");
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [quoteId]);

  useEffect(() => {
    const fetchPaymentQR = async () => {
      if (!requestId) return;
      try {
        const res = await paymentApi.getPaymentQR(requestId, quoteId, estimateId);
        const data = (res as any).data || res;
        if (data) {
          setPaymentInfo(data);
        }
      } catch (error) {
        console.error("Error fetching payment QR:", error);
      }
    };

    fetchPaymentQR();
  }, [requestId, quoteId, estimateId]);

  // Polling check payment status
  useEffect(() => {
    if (!requestId) return;

    const checkPaymentStatus = async () => {
      try {
        const response = await paymentApi.getStatusPayment(requestId);
        const data = (response as any).data || response;

        if (data && data.status === 'PAID') {
          message.success('Thanh toán thành công!');
          router.push(`/request-detail/${requestId}`);
        }
      } catch (error) {
        // console.error("Error checking payment status:", error);
      }
    };

    const intervalId = setInterval(checkPaymentStatus, 2000);

    return () => clearInterval(intervalId);
  }, [requestId, router]);

  // Handle design file upload logic (reserved if needed, though template doesn't explicitly show upload button)
  const handleUpload: UploadProps["customRequest"] = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    try {
      const response = await uploadApi.updateDesignFile(
        parseInt(requestId),
        file as File
      );
      if (response?.url) {
        setOrderDetail((prev) => prev ? { ...prev, design_file_path: response.url } : prev);
        message.success("Tải file thiết kế thành công!");
        onSuccess?.(response);
      }
    } catch (error) {
      message.error("Tải file thiết kế thất bại!");
      onError?.(error as Error);
    } finally {
      setUploading(false);
    }
  };


  // Helper function to format currency
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount).replace('₫', 'đ');
  };

  // Expiry note component
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

  if (!orderDetail) {
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

  // Derived values for template
  const requestDateText = dayjs(orderDetail.order_request_date).format("DD/MM/YYYY");
  const deliveryText = dayjs(orderDetail.delivery_date).format("DD/MM/YYYY");
  const designTypeText = orderDetail.is_send_design ? "Khách gửi file" : "Thuê thiết kế";
  // Values for cost - prioritize paymentInfo amount for final total if orderDetail doesn't have it
  const finalTotalValue = orderDetail.final_total_cost || paymentInfo?.amount || 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 grid grid grid-cols-2 md:grid-cols-2 gap-8">

      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-blue-200 text-xs font-bold tracking-widest uppercase">
                MES SYSTEM
              </div>
              <div className="text-white text-2xl font-extrabold mt-1">
                BÁO GIÁ ĐƠN HÀNG
              </div>
            </div>
            <div className="bg-white/15 text-white px-3 py-1.5 rounded text-sm font-bold">
              AM{orderDetail.order_request_id.toString().padStart(6, '0')}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Greeting */}
          <div className="mb-8">
            <p className="text-[15px] m-0">
              Chào <b>{orderDetail.customer_name}</b>,
            </p>
            <p className="text-slate-500 text-sm mt-1 mb-0">
              Dưới đây là chi tiết báo giá cho yêu cầu in ấn của bạn:
            </p>
          </div>

          {/* Main Grid */}
          <div className="">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-8">
              {/* Left Column - Order Info */}
              <div>
                {/* Order Information */}
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
                      <span className="text-slate-800 font-semibold text-[13px] uppercase">{orderDetail.customer_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-[13px]">Số điện thoại</span>
                      <span className="text-slate-800 font-semibold text-[13px]">{orderDetail.customer_phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-[13px]">Email</span>
                      <span className="text-blue-600 font-semibold text-[13px] break-all">{orderDetail.customer_email}</span>
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div>
                  <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-blue-500 text-blue-600 tracking-wide">
                    Chi tiết sản phẩm
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-[13px]">Sản phẩm</span>
                      <span className="text-slate-800 font-semibold text-[13px]">{orderDetail.product_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-[13px]">Số lượng</span>
                      <span className="text-slate-800 font-semibold text-[13px]">{orderDetail.quantity.toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-slate-500 text-[13px]">Loại giấy</span>
                      <span className="text-slate-800 font-semibold text-[13px]">{orderDetail.paper_name || orderDetail.paper_code || "---"}</span>
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

              {/* Right Column - Cost Info */}
              <div>
                {/* Cost Breakdown */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-orange-500 text-orange-600 tracking-wide">
                    Bảng kê chi phí
                  </h3>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-600 text-[13px]">Nguyên vật liệu</span>
                        <span className="text-slate-800 font-bold text-[13px]">{formatVND(orderDetail.material_cost || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-600 text-[13px]">Chi phí nhân công</span>
                        <span className="text-slate-800 font-bold text-[13px]">{formatVND(orderDetail.labor_cost || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-600 text-[13px]">Chi phí khác</span>
                        <span className="text-slate-800 font-bold text-[13px]">{formatVND(orderDetail.other_fees || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1.5">
                        <span className="text-slate-600 text-[13px]">Phụ thu giao gấp</span>
                        <span className="text-slate-800 font-bold text-[13px]">{formatVND(orderDetail.rush_amount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div>
                  <h3 className="text-sm font-bold uppercase pb-2 mb-4 border-b-2 border-green-500 text-green-600 tracking-wide">
                    Tổng thanh toán
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 text-[13px]">Tạm tính</span>
                      <span className="text-slate-800 font-semibold text-[13px]">{formatVND(orderDetail.subtotal || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-dashed border-slate-300">
                      <span className="text-slate-500 text-[13px]">Giảm giá ({orderDetail.discount_percent || 0}%)</span>
                      <span className="text-red-500 font-semibold text-[13px]">- {formatVND(orderDetail.discount_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3">
                      <span className="text-slate-800 font-bold text-[15px]">THÀNH TIỀN</span>
                      <span className="text-blue-700 font-extrabold text-lg">{formatVND(finalTotalValue)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-red-500 text-[11px]">(Đã bao gồm VAT)</span>
                    </div>
                  </div>

                  {/* Deposit Box */}
                  <div className="mt-5 bg-green-50 border border-green-300 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-green-800 font-bold text-[13px]">Cần đặt cọc/Thanh toán:</span>
                      <span className="text-green-700 font-extrabold text-base">{paymentInfo ? formatVND(paymentInfo.amount) : formatVND(orderDetail.deposit || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>

          {/* Footer */}
          <div className="bg-slate-100 mt-8 px-4 py-3 text-center text-slate-500 text-xs rounded-lg">
            Email này được gửi tự động từ hệ thống MES.
          </div>



        </div>
      </div>
      <div className=" gap-8">
        {/* Action Block - Payment QR */}
        <div className="mt-8 border-t border-slate-200 pt-8">
          {paymentInfo ? (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 m-0">QUÉT MÃ THANH TOÁN</h3>
                <p className="text-slate-500 text-sm mt-1">Vui lòng quét mã bên dưới để hoàn tất đặt cọc</p>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
                  <QRCodeCanvas
                    value={paymentInfo.qr_code}
                    size={200}
                    level={"H"}
                    includeMargin={true}
                  />
                </div>

                <div className="w-full max-w-sm space-y-3 p-4 bg-white rounded-xl border border-slate-200 text-sm shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Ngân hàng</span>
                    <span className="font-semibold text-slate-700">{paymentInfo.bin}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Số tài khoản</span>
                    <span className="font-semibold text-slate-700">{paymentInfo.account_number}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Chủ tài khoản</span>
                    <span className="font-semibold text-slate-700 uppercase">{paymentInfo.account_name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Số tiền</span>
                    <span className="font-bold text-emerald-600 text-base">{formatVND(paymentInfo.amount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Nội dung CK</span>
                    <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">{paymentInfo.order_code}</span>
                  </div>
                </div>

                <div className="w-full max-w-sm flex gap-3">
                  <Button
                    type="primary"
                    href={paymentInfo.check_out_url}
                    target="_blank"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-10 rounded-xl font-semibold shadow-emerald-200 shadow-lg"
                    icon={<CreditCardOutlined />}
                  >
                    Thanh toán ngay
                  </Button>
                  <Button
                    danger
                    onClick={() => router.push(`/reject-deal/${requestId}`)}
                    className="h-10 rounded-xl"
                  >
                    Từ chối
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-slate-500">Đang tải thông tin thanh toán...</p>
            </div>
          )}

          <ExpiryNote />
        </div>
        {/* Design File Display for Reference */}

        {/* <div className="mt-8 pt-8 border-t border-slate-200">
          <DesignFileDisplay designFilePath={orderDetail.design_file_path} requestId={orderDetail.order_request_id} />
        </div> */}

      </div>
    </div>
  );
}
