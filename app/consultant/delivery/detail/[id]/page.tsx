"use client";

import {
  ArrowLeftOutlined,
  BoxPlotOutlined,
  CalendarOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MailOutlined,
  NumberOutlined,
  PhoneOutlined,
  PrinterOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Divider, Image, Input, Modal, Spin, message } from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API_BASE = "https://mmes-sep490.onrender.com/api/Requests/get-by-order-id";
const COST_ESTIMATE_API = "https://mmes-sep490.onrender.com/api/Requests/get-cost-estimate";
const DELIVERY_NOTE_API = "https://mmes-sep490.onrender.com/api/Requests";
const SEND_EMAIL_API = "https://mmes-sep490.onrender.com/api/Orders/send-remaining-payment-email";

interface OrderRequest {
  order_request_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string;
  product_name: string;
  quantity: number;
  description: string;
  design_file_path: string | null;
  order_request_date: string;
  detail_address: string;
  process_status: string;
  product_type: string;
  number_of_plates: number;
  order_id: number;
  quote_id: number;
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  glue_tab_mm: number;
  bleed_mm: number;
  is_one_side_box: boolean;
  print_width_mm: number;
  print_length_mm: number;
  is_send_design: boolean;
  reason: string | null;
  note: string;
  accepted_estimate_id: number;
  consultant_note: string;
  verified_at: string;
  quote_expire_at: string;
  message_to_customer: string;
  preliminary_estimated_price: number | null;
  assigned_consultant: number;
  assigned_at: string;
  delivery_note: string | null;
  print_ready_file: string | null;
  estimate_finish_date: string;
  estimate_id: number;
  base_cost: number;
  is_rush: boolean;
  rush_percent: number;
  rush_amount: number;
  estimated_finish_date: string;
  desired_delivery_date: string;
  estimate_created_at: string;
  paper_cost: number;
  ink_cost: number;
  coating_glue_cost: number;
  mounting_glue_cost: number;
  lamination_cost: number;
  material_cost: number;
  sheets_required: number;
  sheets_waste: number;
  sheets_total: number;
  total_area_m2: number;
  final_total_cost: number;
  cost_note: string;
  paper_sheets_used: number;
  paper_unit_price: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  coating_type: string;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;
  days_early: number;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  deposit_amount: number;
  design_cost: number;
  n_up: number;
  is_active: boolean;
  paper_code: string;
  paper_name: string;
  wave_type: string;
  production_processes: string;
  previous_estimate_id: number;
  consultant_contract_path: string | null;
  customer_signed_contract_path: string | null;
  wave_sheets_used: number;
  paper_alternative: string | null;
  wave_alternative: string | null;
}

interface CostEstimate {
  estimate_id: number;
  order_request_id: number;
  paper_cost: number;
  paper_sheets_used: number;
  paper_unit_price: number;
  ink_cost: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  coating_glue_cost: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  coating_type: string;
  mounting_glue_cost: number;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  lamination_cost: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;
  material_cost: number;
  base_cost: number;
  is_rush: boolean;
  rush_percent: number;
  rush_amount: number;
  days_early: number;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  final_total_cost: number;
  estimated_finish_date: string;
  desired_delivery_date: string;
  created_at: string;
  sheets_required: number;
  sheets_waste: number;
  sheets_total: number;
  n_up: number;
  total_area_m2: number;
  design_cost: number;
  cost_note: string;
  is_active: boolean;
  paper_code: string;
  paper_name: string;
  wave_type: string;
  paper_alternative: string | null;
  wave_alternative: string | null;
  wave_sheets_used: number;
  production_processes: string;
  deposit_amount: number;
  previous_estimate_id: number | null;
  consultant_contract_path: string | null;
  customer_signed_contract_path: string | null;
}

const fmt = (n: number) =>
  n?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const fmtDate = (d: string | null) =>
  d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—";

const fmtDateShort = (d: string | null) =>
  d ? dayjs(d).format("DD/MM/YYYY") : "—";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  Finished: { label: "Hoàn thành", color: "#16a34a", bg: "#dcfce7" },
  Delivery: { label: "Đang giao", color: "#2563eb", bg: "#dbeafe" },
  InProcessing: { label: "Đang sản xuất", color: "#d97706", bg: "#fef3c7" },
  Scheduled: { label: "Đã lên lịch", color: "#7c3aed", bg: "#ede9fe" },
  Completed: { label: "Đã nghiệm thu", color: "#0891b2", bg: "#cffafe" },
  PendingPaid: { label: "Chờ thanh toán", color: "#dc2626", bg: "#fee2e2" },
};

function StatusBadge({ value }: { value: string }) {
  const s = statusMap[value] ?? { label: value, color: "#6b7280", bg: "#f3f4f6" };
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.color}30`,
        padding: "3px 12px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {s.label}
    </span>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 mt-0.5 text-sm flex-shrink-0">{icon}</span>
      <span className="text-gray-400 text-xs w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className={`text-gray-800 text-sm flex-1 ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  accent,
  fullHeight,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
  fullHeight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${fullHeight ? "h-full flex flex-col" : ""}`}
      style={{ borderTop: `3px solid ${accent ?? "#e5e7eb"}` }}
    >
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-50 flex-shrink-0">
        {icon && (
          <span style={{ color: accent ?? "#6b7280" }} className="text-base">
            {icon}
          </span>
        )}
        <span className="font-semibold text-gray-700 text-sm tracking-wide uppercase">
          {title}
        </span>
      </div>
      <div className={`px-5 py-3 ${fullHeight ? "flex-1 flex flex-col justify-around" : ""}`}>{children}</div>
    </div>
  );
}

function CostRow({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center py-2 ${bold ? "border-t border-gray-100 mt-1 pt-3" : "border-b border-gray-50"}`}
    >
      <span className={`${bold ? "font-semibold text-gray-800 text-sm" : "text-gray-500 text-xs"}`}>
        {label}
      </span>
      <span
        className={`${bold ? "font-bold text-base" : "text-gray-700 text-sm font-medium"}`}
        style={accent ? { color: "#16a34a" } : bold ? { color: "#1e3a5f" } : {}}
      >
        {fmt(value)}
      </span>
    </div>
  );
}

// Email preview modal content
function EmailPreview({
  order,
  deliveryNote,
  remaining,
  depositAmt,
}: {
  order: OrderRequest;
  deliveryNote: string;
  remaining: number;
  depositAmt: number;
}) {
  const feBase = "https://daiphuchai.vercel.app";
  const paymentPageUrl = `${feBase}/payment/${order.order_id}`;

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        background: "#f8fafc",
        padding: "20px 0",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 12px" }}>
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",
            padding: "24px 26px",
            borderRadius: "18px 18px 0 0",
            color: "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            MES PAYMENT NOTICE
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>
            Đơn hàng đã hoàn thành
          </div>
          <div style={{ fontSize: 13, marginTop: 6, color: "#dbeafe" }}>
            Vui lòng thanh toán phần còn lại để chúng tôi chuyển đơn sang bộ phận vận chuyển.
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderTop: "none",
            borderRadius: "0 0 18px 18px",
            padding: "24px 24px 20px",
            boxShadow: "0 10px 28px rgba(15,23,42,0.06)",
          }}
        >
          <p style={{ margin: "0 0 14px 0", fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
            Kính gửi <b>{order.customer_name}</b>,
          </p>
          <p style={{ margin: "0 0 14px 0", fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
            Chúng tôi chân thành cảm ơn Quý khách đã tin tưởng sử dụng dịch vụ của doanh nghiệp.
            Đơn hàng của Quý khách hiện đã hoàn thành toàn bộ công đoạn sản xuất.
          </p>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#334155", lineHeight: 1.8 }}>
            Để chúng tôi tiếp tục chuyển đơn hàng sang bộ phận vận chuyển và tiến hành giao hàng,
            Quý khách vui lòng thanh toán <b>phần giá trị còn lại</b> của đơn hàng theo thông tin bên dưới.
          </p>

          {/* Order info table */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 14,
              padding: "16px 18px",
              margin: "14px 0 18px 0",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#334155",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              Thông tin đơn hàng
            </div>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Mã request", `AM${String(order.order_request_id).padStart(6, "0")}`],
                  ["Sản phẩm", order.product_name],
                  ["Số lượng", order.quantity.toLocaleString("vi-VN")],
                  ["Ngày giao dự kiến", fmtDateShort(order.delivery_date)],
                  ["Trạng thái sản xuất", statusMap[order.process_status]?.label ?? order.process_status],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td style={{ padding: "6px 0", fontSize: 13, color: "#64748b", width: "40%" }}>{label}</td>
                    <td style={{ padding: "6px 0", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{val}</td>
                  </tr>
                ))}
                {deliveryNote && (
                  <tr>
                    <td style={{ padding: "6px 0", fontSize: 13, color: "#64748b" }}>Ghi chú giao hàng</td>
                    <td style={{ padding: "6px 0", fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{deliveryNote}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment info */}
          <div
            style={{
              background: "linear-gradient(135deg,#fff7ed 0%,#fffbeb 100%)",
              border: "1px solid #fed7aa",
              borderRadius: 14,
              padding: "16px 18px",
              margin: "0 0 18px 0",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#9a3412",
                marginBottom: 10,
                textTransform: "uppercase",
              }}
            >
              Thông tin thanh toán
            </div>
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 0", fontSize: 13, color: "#7c2d12", width: "50%" }}>Tổng giá trị đơn hàng</td>
                  <td style={{ padding: "6px 0", fontSize: 13, color: "#7c2d12", fontWeight: 700, textAlign: "right" }}>{fmt(order.final_total_cost)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", fontSize: 13, color: "#7c2d12" }}>Đã thanh toán tiền cọc</td>
                  <td style={{ padding: "6px 0", fontSize: 13, color: "#7c2d12", fontWeight: 700, textAlign: "right" }}>{fmt(depositAmt)}</td>
                </tr>
                <tr>
                  <td
                    style={{
                      padding: "10px 0 6px 0",
                      fontSize: 14,
                      color: "#9a3412",
                      fontWeight: 900,
                      borderTop: "1px dashed #fdba74",
                    }}
                  >
                    Số tiền cần thanh toán còn lại
                  </td>
                  <td
                    style={{
                      padding: "10px 0 6px 0",
                      fontSize: 18,
                      color: "#b45309",
                      fontWeight: 900,
                      textAlign: "right",
                      borderTop: "1px dashed #fdba74",
                    }}
                  >
                    {fmt(remaining)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment link */}
          <div style={{ textAlign: "center", margin: "0 0 18px 0" }}>
            <p style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Hoặc truy cập bằng cách dán đường link này vào trình duyệt: <p style={{ color: "#3382f1" }}>{paymentPageUrl}</p>
            </p>
          </div>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: "14px 16px",
            }}
          >
            <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
              Sau khi hệ thống xác nhận thanh toán thành công, đơn hàng sẽ được chuyển sang bước giao hàng để gửi cho đơn vị vận chuyển.
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
              Nếu Quý khách cần hỗ trợ thêm về đơn hàng hoặc thanh toán, vui lòng phản hồi lại email này hoặc liên hệ bộ phận chăm sóc khách hàng của chúng tôi.
            </p>
          </div>

          <p style={{ margin: "18px 0 0 0", fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
            Xin chân thành cảm ơn Quý khách đã đồng hành cùng doanh nghiệp.
          </p>
        </div>

        <div style={{ padding: 14, textAlign: "center", fontSize: 12, color: "#64748b" }}>
          Email này được gửi tự động từ hệ thống MES.
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderRequest | null>(null);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deliveryNote, setDeliveryNote] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const [orderRes, estimateRes] = await Promise.all([
        fetch(`${API_BASE}/${orderId}`, { headers: { accept: "*/*" } }),
        fetch(`${COST_ESTIMATE_API}/${orderId}`, { headers: { accept: "text/plain" } }),
      ]);
      if (!orderRes.ok) throw new Error(`HTTP ${orderRes.status}`);
      const data: OrderRequest = await orderRes.json();
      setOrder(data);
      setDeliveryNote(data.delivery_note ?? "");

      if (estimateRes.ok) {
        const estData: CostEstimate = await estimateRes.json();
        setEstimate(estData);
      }
    } catch (e) {
      console.error(e);
      setError("Không thể tải thông tin đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleSendEmail = async () => {
    if (!order) return;
    setSending(true);
    setPreviewOpen(false);
    try {
      // Step 1: Save delivery note
      const noteRes = await fetch(`${DELIVERY_NOTE_API}/${orderId}/delivery-note`, {
        method: "PUT",
        headers: { accept: "*/*", "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_note: deliveryNote }),
      });
      if (!noteRes.ok) throw new Error(`Lưu ghi chú thất bại: HTTP ${noteRes.status}`);

      // Step 2: Send email
      const emailRes = await fetch(`${SEND_EMAIL_API}/${orderId}`, {
        method: "POST",
        headers: { accept: "*/*" },
        body: "",
      });
      if (!emailRes.ok) throw new Error(`Gửi email thất bại: HTTP ${emailRes.status}`);

      const result = await emailRes.json();
      messageApi.success(result.message ?? "Đã gửi email thành công!");
      await fetchOrder();
    } catch (e: any) {
      messageApi.error(e?.message ?? "Có lỗi xảy ra khi gửi email.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} />} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <p className="text-red-500 font-medium">{error ?? "Không tìm thấy đơn hàng."}</p>
        <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />}>
          Quay lại
        </Button>
      </div>
    );
  }

  const isFinished = order.process_status === "Finished";
  const finalTotal = estimate?.final_total_cost ?? order.final_total_cost;
  const depositAmt = estimate?.deposit_amount ?? order.deposit_amount;
  const remaining = finalTotal - depositAmt;
  const depositPct =
    finalTotal > 0 ? Math.round((depositAmt / finalTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-12">
      {contextHolder}

      {/* Top header */}
      <div
        className="sticky top-0 z-10 border-b border-gray-200 px-6 py-3 flex items-center justify-between"
        style={{ background: "#fff" }}
      >
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            type="text"
            className="text-gray-600"
          >
            Quay lại
          </Button>
          <Divider type="vertical" />
          <span className="font-mono text-sm text-gray-400">
            AM{String(order.order_request_id).padStart(6, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge value={order.process_status} />
        </div>
      </div>

      {/* Page title */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">Chi Tiết Đơn Hàng</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Tạo lúc {fmtDate(order.order_request_date)}
        </p>
      </div>

      {/* Top grid for Customer Info & Summary to ensure equal height */}
      <div className="px-6 grid grid-cols-12 gap-4 mb-4">
        <div className="col-span-12 lg:col-span-8">
          <Section title="Thông Tin Khách Hàng" icon={<UserOutlined />} accent="#3b82f6" fullHeight={true}>
            <InfoRow icon={<UserOutlined />} label="Họ tên" value={order.customer_name} />
            <InfoRow icon={<PhoneOutlined />} label="Điện thoại" value={order.customer_phone} mono />
            <InfoRow icon={<MailOutlined />} label="Email" value={order.customer_email} mono />
            <InfoRow icon={<EnvironmentOutlined />} label="Địa chỉ giao" value={order.detail_address} />
          </Section>
        </div>
        <div className="col-span-12 lg:col-span-4">
          {/* Quick summary card */}
          <div
            className="rounded-2xl p-4 sm:p-5 flex flex-col h-full"
            style={{
              background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)",
              color: "#fff",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-2 flex-shrink-0">
              Tóm tắt đơn
            </p>
            <div className="flex flex-col justify-between flex-1 gap-1">
              <div className="flex justify-between text-[13px]">
                <span className="opacity-70">Mã request</span>
                <span className="font-mono font-semibold">
                  AM{String(order.order_request_id).padStart(6, "0")}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="opacity-70 flex-shrink-0 mr-2">Sản phẩm</span>
                <span className="font-medium text-right text-xs max-w-[65%] leading-tight truncate">
                  {order.product_name}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="opacity-70">Số lượng</span>
                <span className="font-bold">{order.quantity.toLocaleString("vi-VN")} SP</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="opacity-70">Ngày giao</span>
                <span className="font-medium">{fmtDateShort(order.delivery_date)}</span>
              </div>
              <div
                className="flex justify-between text-[13px] pt-1.5 mt-0.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
              >
                <span className="opacity-70 mt-0.5">Tổng tiền</span>
                <span className="font-bold text-yellow-300 text-[15px]">
                  {fmt(finalTotal)}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="opacity-70">Đã cọc</span>
                <span className="font-bold text-green-400">{fmt(depositAmt)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="opacity-70">Còn lại</span>
                <span className="font-bold text-red-400">{fmt(remaining)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="px-6 grid grid-cols-12 gap-4">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* Product */}
          <Section title="Thông Tin Sản Phẩm" icon={<BoxPlotOutlined />} accent="#f59e0b">
            <InfoRow icon={<BoxPlotOutlined />} label="Sản phẩm" value={order.product_name} />
            <InfoRow
              icon={<NumberOutlined />}
              label="Số lượng"
              value={`${order.quantity.toLocaleString("vi-VN")} SP`}
            />
            <InfoRow icon={<FileTextOutlined />} label="Loại giấy" value={order.paper_name} />
            <InfoRow icon={<FileTextOutlined />} label="Tráng phủ" value={order.coating_type} />
            {order.wave_type && (
              <InfoRow icon={<FileTextOutlined />} label="Sóng" value={order.wave_type} />
            )}
            <InfoRow
              icon={<FileTextOutlined />}
              label="Kích thước"
              value={`${order.product_length_mm} × ${order.product_width_mm} × ${order.product_height_mm} mm`}
            />
            <InfoRow
              icon={<FileTextOutlined />}
              label="Kích thước in"
              value={`${order.print_width_mm} × ${order.print_length_mm} mm`}
            />
            {order.note && (
              <InfoRow icon={<FileTextOutlined />} label="Ghi chú" value={order.note} />
            )}
            {order.consultant_note && (
              <InfoRow icon={<FileTextOutlined />} label="Ghi chú tư vấn" value={order.consultant_note} />
            )}
          </Section>

          {/* Production timeline */}
          {/* <Section title="Tiến Độ Sản Xuất" icon={<PrinterOutlined />} accent="#8b5cf6">
            <InfoRow icon={<CalendarOutlined />} label="Ngày đặt" value={fmtDate(order.order_request_date)} />
            <InfoRow icon={<CalendarOutlined />} label="Ngày xác nhận" value={fmtDate(order.verified_at)} />
            <InfoRow icon={<CalendarOutlined />} label="Hoàn thành dự kiến" value={fmtDate(order.estimated_finish_date)} />
            <InfoRow
              icon={<CalendarOutlined />}
              label="Ngày giao"
              value={
                <span
                  className={
                    order.delivery_date && dayjs(order.delivery_date).isBefore(dayjs(), "day")
                      ? "text-red-500 font-semibold"
                      : "text-gray-800"
                  }
                >
                  {fmtDateShort(order.delivery_date)}
                </span>
              }
            />
            <InfoRow icon={<CalendarOutlined />} label="Mong muốn giao" value={fmtDateShort(order.desired_delivery_date)} />
          </Section> */}

          {/* Delivery Info */}
          {/*
          <Section title="Thông Tin Giao Hàng" icon={<SendOutlined />} accent="#ec4899">
            <InfoRow
              icon={<FileTextOutlined />}
              label="Ghi chú cho KH"
              value={order.message_to_customer || <span className="text-gray-300 italic text-xs">—</span>}
            />
            {order.delivery_note && (
              <InfoRow
                icon={<FileTextOutlined />}
                label="Ghi chú giao hàng"
                value={order.delivery_note}
              />
            )}
            {isFinished && (
              <div className="pt-3 border-t border-gray-50 mt-1">
                <label className="block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">
                  Ghi chú giao hàng
                </label>
                <Input.TextArea
                  rows={3}
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Nhập ghi chú giao hàng cho khách hàng..."
                  className="rounded-xl"
                  style={{ resize: "none", fontSize: 13 }}
                />
                <div className="flex gap-3 pt-3">
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => setPreviewOpen(true)}
                    loading={sending}
                    style={{
                      flex: 2,
                      borderRadius: 10,
                      height: 40,
                      background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)",
                      border: "none",
                      fontWeight: 600,
                    }}
                  >
                    Gửi email yêu cầu thanh toán
                  </Button>
                </div>
              </div>
            )}
          </Section>*/}
          {/* Contract files */}
          {/* {(estimate?.consultant_contract_path || estimate?.customer_signed_contract_path) && (
            <Section title="Hợp Đồng" icon={<FileTextOutlined />} accent="#6366f1">
              {estimate.consultant_contract_path && (
                <div className="py-2 border-b border-gray-50">
                  <p className="text-xs text-gray-400 mb-1">Hợp đồng từ tư vấn viên</p>
                  <a
                    href={estimate.consultant_contract_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-500 text-sm font-medium underline break-all"
                  >
                    Xem hợp đồng tư vấn
                  </a>
                </div>
              )}
              {estimate.customer_signed_contract_path && (
                <div className="py-2">
                  <p className="text-xs text-gray-400 mb-1">Hợp đồng khách hàng đã ký</p>
                  <a
                    href={estimate.customer_signed_contract_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-500 text-sm font-medium underline break-all"
                  >
                    Xem hợp đồng đã ký
                  </a>
                </div>
              )}
            </Section>
          )} */}
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Cost summary */}
          {/* <Section title="Chi Phí" icon={<DollarOutlined />} accent="#16a34a">
            <CostRow label="Chi phí vật liệu" value={estimate?.material_cost ?? order.material_cost} />
            <CostRow label="Chi phí giấy" value={estimate?.paper_cost ?? order.paper_cost} />
            <CostRow label="Chi phí mực" value={estimate?.ink_cost ?? order.ink_cost} />
            {(estimate?.coating_glue_cost ?? order.coating_glue_cost) > 0 && (
              <CostRow label="Keo tráng phủ" value={estimate?.coating_glue_cost ?? order.coating_glue_cost} />
            )}
            {(estimate?.lamination_cost ?? order.lamination_cost) > 0 && (
              <CostRow label="Chi phí cán màng" value={estimate?.lamination_cost ?? order.lamination_cost} />
            )}
            {(estimate?.design_cost ?? order.design_cost) > 0 && (
              <CostRow label="Chi phí thiết kế" value={estimate?.design_cost ?? order.design_cost} />
            )}
            {(estimate?.rush_amount ?? order.rush_amount) > 0 && (
              <CostRow label={`Phí gấp (${estimate?.rush_percent ?? order.rush_percent}%)`} value={estimate?.rush_amount ?? order.rush_amount} />
            )}
            {(estimate?.discount_amount ?? order.discount_amount) > 0 && (
              <CostRow label={`Giảm giá (${estimate?.discount_percent ?? order.discount_percent}%)`} value={-(estimate?.discount_amount ?? order.discount_amount)} />
            )}
            <div className="my-1" />
            <CostRow label="Tổng cộng" value={finalTotal} bold />

            {/* Deposit progress */}
          {/*
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Đã cọc ({depositPct}%)</span>
                <span className="font-medium text-amber-600">{fmt(depositAmt)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${depositPct}%`,
                    background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-gray-400">Còn lại</span>
                <span className="font-semibold text-red-500">{fmt(remaining)}</span>
              </div>
            </div>
           </Section> */}

          {/* Production material details */}
          {/* <Section title="Chi Tiết Vật Liệu" icon={<FileTextOutlined />} accent="#0891b2">
            <InfoRow
              icon={<FileTextOutlined />}
              label="Tờ yêu cầu"
              value={`${(estimate?.sheets_required ?? order.sheets_required).toLocaleString()} tờ`}
            />
            <InfoRow
              icon={<FileTextOutlined />}
              label="Tờ hao phí"
              value={`${(estimate?.sheets_waste ?? order.sheets_waste).toLocaleString()} tờ`}
            />
            <InfoRow
              icon={<FileTextOutlined />}
              label="Tổng tờ"
              value={`${(estimate?.sheets_total ?? order.sheets_total).toLocaleString()} tờ`}
            />
            <InfoRow
              icon={<FileTextOutlined />}
              label="Tổng diện tích"
              value={`${(estimate?.total_area_m2 ?? order.total_area_m2).toFixed(2)} m²`}
            />
            <InfoRow
              icon={<FileTextOutlined />}
              label="Mã giấy"
              value={estimate?.paper_code ?? order.paper_code}
              mono
            />
            <InfoRow
              icon={<FileTextOutlined />}
              label="Đơn giá giấy"
              value={fmt(estimate?.paper_unit_price ?? order.paper_unit_price)}
            />
            {estimate?.cost_note && (
              <InfoRow
                icon={<FileTextOutlined />}
                label="Ghi chú chi phí"
                value={estimate.cost_note}
              />
            )}
          </Section> */}

          {/* Design file */}
          {order.design_file_path && (
            <Section title="File Thiết Kế" icon={<FileTextOutlined />} accent="#14b8a6">
              <div className="flex gap-4 items-start pt-1">
                <Image
                  src={order.design_file_path}
                  alt="Design file"
                  width={140}
                  height={140}
                  style={{
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "1px solid #f0f0f0",
                  }}
                />
                <div className="flex flex-col gap-2 pt-1">
                  <p className="text-xs text-gray-400">File thiết kế đã upload</p>
                  <a
                    href={order.design_file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 text-xs underline break-all"
                  >
                    Xem file gốc
                  </a>
                </div>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      <Modal
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        width="85%"
        style={{ top: 20 }}
        title={
          <div className="flex items-center gap-2">
            <EyeOutlined className="text-blue-500" />
            <span>Xem trước email gửi đến: <b>{order.customer_email}</b></span>
          </div>
        }
        footer={
          <div className="flex justify-end gap-3 py-1">
            <Button onClick={() => setPreviewOpen(false)}>Hủy</Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sending}
              onClick={handleSendEmail}
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #1e3a8a)",
                border: "none",
                fontWeight: 600,
              }}
            >
              Xác nhận gửi email
            </Button>
          </div>
        }
      >
        <div
          style={{
            maxHeight: "70vh",
            overflowY: "auto",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            background: "#f8fafc",
          }}
        >
          <EmailPreview order={order} deliveryNote={deliveryNote} remaining={remaining} depositAmt={depositAmt} />
        </div>
      </Modal>
    </div>
  );
}