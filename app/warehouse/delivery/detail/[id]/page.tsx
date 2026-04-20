"use client";

import {
  ArrowLeftOutlined,
  BoxPlotOutlined,
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  SendOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { Button, Divider, Spin, message, Typography } from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { productionsApi } from "@/apiRequests/productions";

const API_BASE = "https://mmes-sep490-84gr.onrender.com/api/Requests/get-by-order-id";

interface OrderRequest {
  order_request_id: number;
  order_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string;
  product_name: string;
  quantity: number;
  detail_address: string;
  process_status: string;
  delivery_note: string | null;
  note: string;
  order_request_date: string;
}

const fmtDate = (d: string | null) =>
  d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—";
const fmtDateShort = (d: string | null) =>
  d ? dayjs(d).format("DD/MM/YYYY") : "—";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  Finished: { label: "Sẵn sàng giao", color: "#16a34a", bg: "#dcfce7" },
  PendingPaid: { label: "Chờ thanh toán", color: "#7c3aed", bg: "#ede9fe" },
  Paid: { label: "Đã thanh toán", color: "#0891b2", bg: "#cffafe" },
  LayoutPending: { label: "Chờ duyệt layout", color: "#d97706", bg: "#fef3c7" },
  InProcessing: { label: "Đang sản xuất", color: "#2563eb", bg: "#dbeafe" },
};

function StatusBadge({ value }: { value: string }) {
  const normalizeStatus = (s: string) => {
    if (!s) return s;
    const upper = s.toUpperCase();
    if (upper === "FINISHED" || upper === "DONE") return "Finished";
    if (upper === "PENDINGPAID") return "PendingPaid";
    if (upper === "PAID") return "Paid";
    return s;
  };
  const norm = normalizeStatus(value);
  const s = statusMap[norm] ?? { label: norm, color: "#6b7280", bg: "#f3f4f6" };
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
      <span className="text-gray-400 text-xs w-36 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-gray-800 text-sm flex-1 ${mono ? "font-mono text-xs" : "font-medium"
          }`}
      >
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
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      style={{ borderTop: `3px solid ${accent ?? "#e5e7eb"}` }}
    >
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-50">
        {icon && (
          <span style={{ color: accent ?? "#6b7280" }} className="text-base">
            {icon}
          </span>
        )}
        <span className="font-semibold text-gray-700 text-sm tracking-wide uppercase">
          {title}
        </span>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

export default function WarehouseDeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const [messageApi, contextHolder] = message.useMessage();

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${orderId}`, {
        headers: { accept: "*/*" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OrderRequest = await res.json();
      setOrder(data);
    } catch (e) {
      console.error(e);
      setError("Không thể tải thông tin đơn hàng.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    if (phone.length <= 4) return phone;
    return "xxxx" + phone.slice(-4);
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email;
    const [name, domain] = parts;
    if (name.length <= 3) return `xxx@${domain}`;
    return `xxxx${name.slice(-3)}@${domain}`;
  };

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleTransfer = async () => {
    if (!order) return;
    setTransferring(true);
    try {
      await productionsApi.transferToShipping(Number(order.order_id));
      messageApi.success("Đã bàn giao cho đơn vị vận chuyển thành công!");
      await fetchOrder();
    } catch (err: any) {
      console.error(err);
      messageApi.error("Bàn giao thất bại.");
    } finally {
      setTransferring(false);
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
        <p className="text-red-500 font-medium">
          {error ?? "Không tìm thấy đơn hàng."}
        </p>
        <Button onClick={() => router.back()} icon={<ArrowLeftOutlined />}>
          Quay lại
        </Button>
      </div>
    );
  }

  const normalizeStatus = (s: string) => {
    if (!s) return s;
    const upper = s.toUpperCase();
    if (upper === "FINISHED" || upper === "DONE") return "Finished";
    if (upper === "PENDINGPAID") return "PendingPaid";
    if (upper === "PAID") return "Paid";
    return s;
  };

  const normStatus = normalizeStatus(order.process_status);
  const isPaid = normStatus === "Paid";
  const isFinished = normStatus === "Finished";
  const isPendingPaid = normStatus === "PendingPaid";

  let actionText = "Không khả dụng";
  if (isFinished) actionText = "Chờ tư vấn viên liên hệ với khách hàng";
  else if (isPendingPaid) actionText = "Chờ khách hàng thanh toán để vận chuyển";
  else if (isPaid) actionText = "Bàn giao cho đơn vị vận chuyển";

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
        <h1 className="text-2xl font-bold text-gray-800">Chi Tiết Giao Hàng</h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Tạo lúc {fmtDate(order.order_request_date)}
        </p>
      </div>

      {/* Main grid */}
      <div className="px-6 grid grid-cols-12 gap-4">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* Customer */}
          <Section
            title="Thông Tin Nhận Hàng"
            icon={<UserOutlined />}
            accent="#3b82f6"
          >
            <InfoRow
              icon={<UserOutlined />}
              label="Họ tên người nhận"
              value={order.customer_name}
            />
            <InfoRow
              icon={<PhoneOutlined />}
              label="Số điện thoại"
              value={maskPhone(order.customer_phone)}
              mono
            />
            <InfoRow
              icon={<MailOutlined />}
              label="Email"
              value={maskEmail(order.customer_email)}
              mono
            />
            <InfoRow
              icon={<EnvironmentOutlined />}
              label="Địa chỉ giao hàng"
              value={order.detail_address}
            />
          </Section>

          {/* Product */}
          <Section
            title="Danh Sách Sản Phẩm"
            icon={<BoxPlotOutlined />}
            accent="#f59e0b"
          >
            <InfoRow
              icon={<BoxPlotOutlined />}
              label="Sản phẩm"
              value={order.product_name}
            />
            <InfoRow
              icon={<span className="text-xs font-bold">#</span>}
              label="Số lượng"
              value={
                <span className="text-blue-600 font-bold">
                  {order.quantity.toLocaleString("vi-VN")} SP
                </span>
              }
            />
          </Section>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          <Section
            title="Trạng Thái & Thao Tác"
            icon={<CheckCircleOutlined />}
            accent="#10b981"
          >
            <div className="pb-3 border-b border-gray-50 mb-3">
              <span className="block text-xs font-semibold text-gray-400 uppercase mb-2">
                Thông tin giao hàng
              </span>
              <InfoRow
                icon={<FileTextOutlined />}
                label="Ngày giao dự kiến"
                value={<span className="font-semibold text-gray-800">{fmtDateShort(order.delivery_date)}</span>}
              />
              <InfoRow
                icon={<FileTextOutlined />}
                label="Ghi chú giao hàng"
                value={order.delivery_note || <span className="text-gray-400 italic">Không có ghi chú</span>}
              />
            </div>

            <Button
              type="primary"
              size="large"
              icon={<SendOutlined />}
              block
              disabled={!isPaid}
              loading={transferring}
              onClick={handleTransfer}
              style={{
                borderRadius: 8,
                background: isPaid ? "linear-gradient(135deg, #10b981, #059669)" : undefined,
                border: "none",
                fontWeight: 600,
                marginTop: 8,
              }}
            >
              {actionText}
            </Button>

            {!isPaid && (
              <p className="text-xs text-center text-gray-400 mt-3 px-2">
                Tính năng bàn giao chỉ khả dụng khi đơn hàng ở trạng thái <strong className="text-gray-500">Đã thanh toán</strong>.
              </p>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
