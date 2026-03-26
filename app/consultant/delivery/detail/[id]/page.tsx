"use client";

import {
  ArrowLeftOutlined,
  BankOutlined,
  BoxPlotOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MailOutlined,
  PhoneOutlined,
  PrinterOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Divider, Image, Spin, Tag, Tooltip } from "antd";
import dayjs from "dayjs";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const API_BASE = "https://amms-juaa.onrender.com/api/Orders/detail";

interface QuoteFields {
  request_date: string;
  paper_name: string;
  coating_type: string;
  wave_type: string;
  design_type: string;
  production_process: string;
  material_cost: number;
  labor_cost: number;
  other_fees: number;
  rush_amount: number;
  sub_total: number;
  discount_percent: number;
  discount_amount: number;
}

interface OrderDetail {
  order_id: number;
  code: string;
  status: string;
  payment_status: string;
  order_date: string;
  delivery_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;
  product_name: string;
  quantity: number;
  production_id: number | null;
  production_start_date: string | null;
  production_end_date: string | null;
  approver_name: string | null;
  specification: string | null;
  note: string;
  final_total_cost: number;
  deposit_amount: number;
  rush_amount: number;
  file_url: string | null;
  contract_file: string | null;
  quote_fields: QuoteFields | null;
  layout_confirmed: boolean;
}

const fmt = (n: number) =>
  n?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

const fmtDate = (d: string | null) =>
  d ? dayjs(d).format("DD/MM/YYYY HH:mm") : "—";

const statusMap: Record<string, { label: string; color: string; bg: string }> =
  {
    Finished: { label: "Hoàn thành", color: "#16a34a", bg: "#dcfce7" },
    Delivery: { label: "Đang giao", color: "#2563eb", bg: "#dbeafe" },
    InProcessing: { label: "Đang sản xuất", color: "#d97706", bg: "#fef3c7" },
    Scheduled: { label: "Đã lên lịch", color: "#7c3aed", bg: "#ede9fe" },
    Completed: { label: "Đã nghiệm thu", color: "#0891b2", bg: "#cffafe" },
  };

const paymentMap: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  Deposited: { label: "Đã cọc", color: "#d97706", bg: "#fef3c7" },
  Paid: { label: "Thanh toán đủ", color: "#16a34a", bg: "#dcfce7" },
  Unpaid: { label: "Chưa thanh toán", color: "#dc2626", bg: "#fee2e2" },
};

function StatusBadge({ value, map }: { value: string; map: typeof statusMap }) {
  const s = map[value] ?? {
    label: value,
    color: "#6b7280",
    bg: "#f3f4f6",
  };
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
      <span className="text-gray-400 text-xs w-32 flex-shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-gray-800 text-sm flex-1 ${mono ? "font-mono text-xs" : "font-medium"}`}
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
      <span
        className={`${bold ? "font-semibold text-gray-800 text-sm" : "text-gray-500 text-xs"}`}
      >
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/${orderId}`, {
        headers: { accept: "*/*" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OrderDetail = await res.json();
      setOrder(data);
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

  const remaining = order.final_total_cost - order.deposit_amount;
  const depositPct =
    order.final_total_cost > 0
      ? Math.round((order.deposit_amount / order.final_total_cost) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-12">
      {/* Top header bar */}
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
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-gray-400">{order.code}</span>
            <StatusBadge value={order.status} map={statusMap} />
            <StatusBadge value={order.payment_status} map={paymentMap} />
            {order.layout_confirmed && (
              <Tooltip title="Layout đã xác nhận">
                <span
                  style={{
                    background: "#dcfce7",
                    color: "#16a34a",
                    padding: "3px 10px",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <CheckCircleOutlined /> Layout OK
                </span>
              </Tooltip>
            )}
          </div>
        </div>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          In đơn
        </Button>
      </div>

      {/* Page title */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Chi Tiết Đơn Hàng
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Tạo lúc {fmtDate(order.order_date)}
          {order.approver_name && (
            <> &nbsp;·&nbsp; Duyệt bởi <strong>{order.approver_name}</strong></>
          )}
        </p>
      </div>

      {/* Main grid */}
      <div className="px-6 grid grid-cols-12 gap-4">
        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* Customer */}
          <Section title="Thông Tin Khách Hàng" icon={<UserOutlined />} accent="#3b82f6">
            <InfoRow icon={<UserOutlined />} label="Họ tên" value={order.customer_name} />
            <InfoRow icon={<PhoneOutlined />} label="Điện thoại" value={order.customer_phone} mono />
            <InfoRow icon={<MailOutlined />} label="Email" value={order.customer_email} mono />
            <InfoRow
              icon={<EnvironmentOutlined />}
              label="Địa chỉ giao"
              value={order.detail_address}
            />
          </Section>

          {/* Product */}
          <Section title="Thông Tin Sản Phẩm" icon={<BoxPlotOutlined />} accent="#f59e0b">
            <InfoRow icon={<BoxPlotOutlined />} label="Sản phẩm" value={order.product_name} />
            <InfoRow
              icon={<span className="text-xs font-bold">#</span>}
              label="Số lượng"
              value={
                <span className="text-blue-600 font-bold">
                  {order.quantity.toLocaleString("vi-VN")} SP
                </span>
              }
            />
            {order.quote_fields && (
              <>
                <InfoRow
                  icon={<FileTextOutlined />}
                  label="Loại giấy"
                  value={order.quote_fields.paper_name}
                />
                <InfoRow
                  icon={<FileTextOutlined />}
                  label="Tráng phủ"
                  value={order.quote_fields.coating_type}
                />
                <InfoRow
                  icon={<FileTextOutlined />}
                  label="Sóng"
                  value={order.quote_fields.wave_type}
                />
                <InfoRow
                  icon={<PrinterOutlined />}
                  label="Quy trình"
                  value={order.quote_fields.production_process}
                />
                <InfoRow
                  icon={<FileTextOutlined />}
                  label="Thiết kế"
                  value={order.quote_fields.design_type}
                />
              </>
            )}
            {order.specification && (
              <InfoRow
                icon={<FileTextOutlined />}
                label="Thông số"
                value={order.specification}
              />
            )}
            {order.note && (
              <InfoRow icon={<FileTextOutlined />} label="Ghi chú" value={order.note} />
            )}
          </Section>

          {/* Production timeline */}
          <Section
            title="Tiến Độ Sản Xuất"
            icon={<PrinterOutlined />}
            accent="#8b5cf6"
          >
            <InfoRow
              icon={<CalendarOutlined />}
              label="Ngày đặt"
              value={fmtDate(order.order_date)}
            />
            <InfoRow
              icon={<CalendarOutlined />}
              label="Bắt đầu SX"
              value={fmtDate(order.production_start_date)}
            />
            <InfoRow
              icon={<CalendarOutlined />}
              label="Kết thúc SX"
              value={fmtDate(order.production_end_date)}
            />
            <InfoRow
              icon={<CalendarOutlined />}
              label="Ngày giao"
              value={
                <span
                  className={
                    order.delivery_date &&
                    dayjs(order.delivery_date).isBefore(dayjs(), "day")
                      ? "text-red-500 font-semibold"
                      : "text-gray-800"
                  }
                >
                  {fmtDate(order.delivery_date)}
                </span>
              }
            />
            {order.production_id && (
              <InfoRow
                icon={<span className="text-xs font-bold">#</span>}
                label="Mã SX"
                value={`#${order.production_id}`}
                mono
              />
            )}

            {/* Visual timeline bar */}
            {order.production_start_date &&
              order.production_end_date &&
              order.delivery_date && (
                <div className="mt-4 pt-3 border-t border-gray-50">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Bắt đầu SX</span>
                    <span>Kết thúc SX</span>
                    <span>Giao hàng</span>
                  </div>
                  <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        width: "66%",
                        background:
                          "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                    <span>{dayjs(order.production_start_date).format("DD/MM")}</span>
                    <span>{dayjs(order.production_end_date).format("DD/MM")}</span>
                    <span>{dayjs(order.delivery_date).format("DD/MM")}</span>
                  </div>
                </div>
              )}
          </Section>

          {/* Design file */}
          {order.file_url && (
            <Section title="File Thiết Kế" icon={<FileTextOutlined />} accent="#ec4899">
              <div className="flex gap-4 items-start pt-1">
                <Image
                  src={order.file_url}
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
                    href={order.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 text-xs underline break-all"
                  >
                    Xem file gốc
                  </a>
                  {order.layout_confirmed && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircleOutlined /> Layout đã được xác nhận
                    </span>
                  )}
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Cost summary */}
          <Section title="Chi Phí" icon={<DollarOutlined />} accent="#16a34a">
            {order.quote_fields && (
              <>
                <CostRow
                  label="Chi phí vật liệu"
                  value={order.quote_fields.material_cost}
                />
                <CostRow
                  label="Chi phí nhân công"
                  value={order.quote_fields.labor_cost}
                />
                {order.quote_fields.other_fees > 0 && (
                  <CostRow
                    label="Phí khác"
                    value={order.quote_fields.other_fees}
                  />
                )}
                {order.rush_amount > 0 && (
                  <CostRow label="Phí gấp" value={order.rush_amount} />
                )}
                {order.quote_fields.discount_amount > 0 && (
                  <CostRow
                    label={`Giảm giá (${order.quote_fields.discount_percent}%)`}
                    value={-order.quote_fields.discount_amount}
                  />
                )}
                <div className="my-1" />
              </>
            )}
            <CostRow label="Tổng cộng" value={order.final_total_cost} bold />

            {/* Deposit progress */}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Đã cọc ({depositPct}%)</span>
                <span className="font-medium text-amber-600">
                  {fmt(order.deposit_amount)}
                </span>
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
                <span className="font-semibold text-red-500">
                  {fmt(remaining)}
                </span>
              </div>
            </div>
          </Section>

          {/* Quote fields summary */}
          {order.quote_fields && (
            <Section
              title="Thông Tin Báo Giá"
              icon={<BankOutlined />}
              accent="#0891b2"
            >
              <InfoRow
                icon={<CalendarOutlined />}
                label="Ngày yêu cầu"
                value={order.quote_fields.request_date}
              />
              <InfoRow
                icon={<FileTextOutlined />}
                label="Loại giấy"
                value={order.quote_fields.paper_name}
              />
              <InfoRow
                icon={<FileTextOutlined />}
                label="Tráng phủ"
                value={order.quote_fields.coating_type}
              />
              <InfoRow
                icon={<PrinterOutlined />}
                label="Quy trình"
                value={order.quote_fields.production_process}
              />
            </Section>
          )}

          {/* Contract */}
          {order.contract_file && (
            <Section
              title="Hợp Đồng"
              icon={<FileTextOutlined />}
              accent="#6366f1"
            >
              <a
                href={order.contract_file}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-500 text-sm underline"
              >
                Xem hợp đồng
              </a>
            </Section>
          )}

          {/* Quick info card */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)",
              color: "#fff",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-3">
              Tóm tắt đơn
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Mã đơn</span>
                <span className="font-mono font-semibold">{order.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Sản phẩm</span>
                <span className="font-medium text-right text-xs max-w-[60%]">
                  {order.product_name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Số lượng</span>
                <span className="font-bold">
                  {order.quantity.toLocaleString("vi-VN")} SP
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="opacity-70">Ngày giao</span>
                <span className="font-medium">
                  {order.delivery_date
                    ? dayjs(order.delivery_date).format("DD/MM/YYYY")
                    : "—"}
                </span>
              </div>
              <div
                className="flex justify-between text-sm pt-2 mt-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.15)" }}
              >
                <span className="opacity-70">Tổng tiền</span>
                <span className="font-bold text-yellow-300 text-base">
                  {fmt(order.final_total_cost)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}