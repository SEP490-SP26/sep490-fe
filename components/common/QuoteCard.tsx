import React from "react";
import { QuoteOption } from "@/apiRequests/estimates";
import { InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Button, Tag } from "antd";

interface QuoteCardProps {
  quote: QuoteOption;
  index?: number;
  totalQuotes?: number;
  consultantNote?: string;
  estimateFinishDate?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  index,
  totalQuotes,
  consultantNote,
  estimateFinishDate,
  actions,
  compact = false,
  className = "",
}) => {
  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    })
      .format(amount)
      .replace("₫", "đ");
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

  const requestDateText =
    quote.request_date_text ||
    (quote.order_request_date
      ? dayjs(quote.order_request_date).format("DD/MM/YYYY")
      : "---");
  const deliveryText =
    quote.delivery_text ||
    (quote.delivery_date ? dayjs(quote.delivery_date).format("DD/MM/YYYY") : "---");
  const designTypeText =
    quote.design_type_text ||
    (quote.is_send_design ? "Khách gửi file" : "Thuê thiết kế");
  const finalTotalValue = quote.final_total || 0;

  // Header styles based on compact mode
  const headerPadding = compact ? "px-6 py-4" : "px-8 py-6";
  const headerTitleSize = compact ? "text-lg" : "text-2xl";
  const headerSubtitleSize = compact ? "text-[10px]" : "text-xs";

  // Content styles based on compact mode
  const contentPadding = compact ? "p-6" : "p-8";
  const labelSize = compact ? "text-[11px]" : "text-[13px]";
  const valueSize = compact ? "text-[11px]" : "text-[13px]";
  const sectionTitleSize = compact ? "text-[11px]" : "text-sm";
  const gapSize = compact ? "gap-6" : "gap-8";

  return (
    <div
      className={`bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden flex flex-col mx-auto w-full ${className}`}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r from-blue-600 to-blue-800 ${headerPadding}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className={`text-blue-200 ${headerSubtitleSize} font-bold tracking-widest uppercase`}>
              MES SYSTEM {compact && "- PREVIEW"}
            </div>
            <div className={`text-white ${headerTitleSize} font-extrabold mt-0.5`}>
              BÁO GIÁ {totalQuotes && totalQuotes > 1 ? (index !== undefined ? index + 1 : "") : ""}
            </div>
          </div>
          <div className="bg-white/15 text-white px-2 py-1 rounded text-xs font-bold">
            AM{quote.estimate_id.toString().padStart(6, "0")}
          </div>
        </div>
      </div>

      <div className={`${contentPadding} flex-1 flex flex-col`}>
        {!compact && (
          <div className="mb-6">
            <p className="text-[15px] m-0">
              Chào <b>{quote.customer_name}</b>,
            </p>
            {consultantNote && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-sm uppercase tracking-wide">
                  <InfoCircleOutlined className="text-blue-500 font-bold" />
                  Lời nhắn từ tư vấn viên
                </div>
                <div className="text-slate-700 text-sm m-0 leading-relaxed italic bg-white/50 p-3 rounded-lg border border-blue-100">
                  {`"${consultantNote}"`}
                </div>
              </div>
            )}
            <p className="text-slate-500 text-sm mt-4 mb-0">
              Dưới đây là chi tiết báo giá cho yêu cầu in ấn của bạn:
            </p>
          </div>
        )}

        <div className={`flex-1 flex flex-col ${gapSize}`}>
          {/* Information Rows */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Order Info */}
            <div>
              <h3 className={`${sectionTitleSize} font-bold uppercase pb-1 mb-2 border-b-2 border-blue-500 text-blue-600 tracking-wide`}>
                Thông tin đơn hàng
              </h3>
              <div className="space-y-1">
                {[
                  { label: "Ngày yêu cầu", value: requestDateText },
                  { label: "Người yêu cầu", value: quote.customer_name, uppercase: true },
                  { label: "Số điện thoại", value: compact ? maskPhone(quote.customer_phone) : quote.customer_phone },
                  { label: "Email", value: compact ? maskEmail(quote.customer_email) : quote.customer_email, blue: true },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className={`text-slate-500 ${labelSize}`}>{item.label}</span>
                    <span
                      className={`text-slate-800 font-semibold ${valueSize} ${item.uppercase ? "uppercase" : ""
                        } ${item.blue ? "text-blue-600 break-all" : ""}`}
                    >
                      {item.value || "---"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cost Breakdown */}
            <div>
              <h3 className={`${sectionTitleSize} font-bold uppercase pb-1 mb-2 border-b-2 border-orange-500 text-orange-600 tracking-wide`}>
                Bảng kê chi phí
              </h3>
              <div className="space-y-1">
                {!!quote.material_cost && quote.material_cost > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className={`text-slate-600 ${labelSize}`}>Nguyên vật liệu</span>
                    <span className={`text-slate-800 font-bold ${valueSize}`}>
                      {formatVND(quote.material_cost)}
                    </span>
                  </div>
                )}
                {!!quote.labor_cost && quote.labor_cost > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className={`text-slate-600 ${labelSize}`}>Chi phí nhân công</span>
                    <span className={`text-slate-800 font-bold ${valueSize}`}>
                      {formatVND(quote.labor_cost)}
                    </span>
                  </div>
                )}
                {!!quote.other_fees && quote.other_fees > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className={`text-slate-600 ${labelSize}`}>Chi phí khác</span>
                    <span className={`text-slate-800 font-bold ${valueSize}`}>
                      {formatVND(quote.other_fees)}
                    </span>
                  </div>
                )}
                {!!quote.rush_amount && quote.rush_amount > 0 && (
                  <div className="flex justify-between items-center py-1">
                    <span className={`text-slate-600 ${labelSize}`}>Phụ thu giao gấp</span>
                    <span className={`text-slate-800 font-bold ${valueSize}`}>
                      {formatVND(quote.rush_amount)}
                    </span>
                  </div>
                )}
                {!quote.material_cost && !quote.labor_cost && !quote.other_fees && !quote.rush_amount && (
                  <div className="text-slate-400 text-[11px] italic py-2">Liên hệ để biết thêm chi tiết</div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Product & Final Total */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left: Product Details */}
            <div>
              <h3 className={`${sectionTitleSize} font-bold uppercase pb-1 mb-2 border-b-2 border-blue-500 text-blue-600 tracking-wide`}>
                Chi tiết sản phẩm
              </h3>
              <div className="space-y-1">
                {[
                  { label: "Sản phẩm", value: quote.product_name },
                  { label: "Số lượng", value: quote.quantity.toLocaleString("vi-VN") },
                  { label: "Loại giấy", value: quote.paper_name || "---" },
                  { label: "Thiết kế", value: designTypeText },
                  { label: "Giao dự kiến", value: deliveryText },
                  estimateFinishDate ? { label: "Ngày hoàn thành dự kiến", value: estimateFinishDate } : null,
                ].filter(Boolean).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-50">
                    <span className={`text-slate-500 ${labelSize}`}>{item!.label}</span>
                    <span className={`text-slate-800 font-semibold ${valueSize}`}>
                      {item!.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Payment Total */}
            <div className="flex flex-col h-full">
              <h3 className={`${sectionTitleSize} font-bold uppercase pb-1 mb-2 border-b-2 border-green-500 text-green-600 tracking-wide`}>
                Tổng thanh toán
              </h3>
              <div className="space-y-1 flex-1">
                <div
                  className={`flex justify-between items-center py-1 ${!quote.discount_amount ? "border-b border-dashed border-slate-200" : ""
                    }`}
                >
                  <span className={`text-slate-500 ${labelSize}`}>Tạm tính</span>
                  <span className={`text-slate-800 font-semibold ${valueSize}`}>
                    {formatVND(quote.subtotal || 0)}
                  </span>
                </div>
                {!!quote.discount_amount && (
                  <div className="flex justify-between items-center py-1 border-b border-dashed border-slate-200">
                    <span className={`text-slate-500 ${labelSize}`}>
                      Giảm giá ({quote.discount_percent || 0}%)
                    </span>
                    <span className={`text-red-500 font-semibold ${valueSize}`}>
                      - {formatVND(quote.discount_amount)}
                    </span>
                  </div>
                )}
                <div className={`flex justify-between items-center ${compact ? 'pt-2' : 'pt-3'}`}>
                  <span className={`text-slate-800 font-bold ${compact ? 'text-[13px]' : 'text-[15px]'}`}>
                    THÀNH TIỀN
                  </span>
                  <span className={`text-blue-700 font-extrabold ${compact ? 'text-base' : 'text-lg'}`}>
                    {formatVND(finalTotalValue)}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`text-red-500 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                    (Đã bao gồm VAT)
                  </span>
                </div>
              </div>

              <div className={`mt-auto bg-green-50 border border-green-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-green-800 font-bold ${compact ? 'text-[11px]' : 'text-[13px]'}`}>
                    Đặt cọc/Thanh toán:
                  </span>
                  <span className={`text-green-700 font-extrabold ${compact ? 'text-sm' : 'text-base'}`}>
                    {formatVND(quote.deposit || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* {footer && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            {footer}
          </div>
        )} */}

        {actions && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteCard;
