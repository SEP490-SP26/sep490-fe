"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Table,
  Input,
  Tag,
  Modal,
  Spin,
  message,
  Tabs,
  Button,
  Card,
  DatePicker,
  Select,
  Typography,
  Descriptions,
  Divider,
  Badge,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { BiChevronRight } from "react-icons/bi";
import ProductionDetailReadOnly from "../components/ProductionDetailReadOnly";

import { orderApi } from "@/apiRequests/order";
import { productionsApi, ProductionReadiness } from "@/apiRequests/productions";
import {
  groupProductionsApi,
  IProductionSuggestion,
  ISuggestedOrder,
} from "@/apiRequests/groupProductions";

const { Title, Text } = Typography;

const ALLOWED_PROCESS_CODES = [
  { label: "Phủ (PHU)", value: "PHU" },
  { label: "Cán (CAN)", value: "CAN" },
  { label: "Bồi (BOI)", value: "BOI" },
];

function ProductionApprovalContent({ mode = "pending" }: { mode?: "pending" | "waiting_manager" | "approved" }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchText, setSearchText] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [gmNote, setGmNote] = useState("");
  const [activeTab, setActiveTab] = useState("1");
  const [selectedMethod, setSelectedMethod] = useState<"NVL" | "SUB" | "BOTH" | null>(null);

  const handleSelectMethod = (method: "NVL" | "SUB" | "BOTH") => {
    setSelectedMethod(method);
  };

  // ── Danh sách đơn hàng ──────────────────────────────────────────────────────
  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ["orders", "gm-approval-list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 100);
        return Array.isArray(response.data) ? response.data : [];
      } catch {
        return [];
      }
    },
  });

  // ── GET start-ready: chỉ kiểm tra phương án ─────────────────────────────────
  const { data: statusData, isLoading: isChecking } = useQuery<ProductionReadiness | null>({
    queryKey: ["production-start-ready", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      try {
        const res = await productionsApi.startReady(selectedOrderId);
        return res?.data ?? (res as any);
      } catch (err) {
        console.error("Lỗi khi kiểm tra start-ready:", err);
        return null;
      }
    },
    enabled: !!selectedOrderId && isModalVisible,
  });

  // ── PUT start-ready: GM trình duyệt ─────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async ({
      orderId,
      note,
      productionMethod,
    }: {
      orderId: number;
      note: string;
      productionMethod: "NVL" | "SUB" | "BOTH";
    }) =>
      productionsApi.updateProduction(orderId, {
        is_production_ready: true,
        gm_note: note,
        gm_proposed_method: productionMethod,
        proposed_production_method: productionMethod,
      }),
    onSuccess: (_, { orderId }) => {
      // Phân biệt kết quả dựa vào statusData tại thời điểm gửi
      if (onlyNvl) {
        message.success("Đã xác nhận – Hệ thống sẽ tự tạo lệnh sản xuất từ NVL!");
      } else {
        message.success("Đã gửi yêu cầu cho Manager duyệt phương thức sản xuất!");
      }

      setIsModalVisible(false);
      setGmNote("");
      refetch();
    },
    onError: () => message.error("Có lỗi xảy ra. Vui lòng thử lại."),
  });

  // ── Lọc đơn ──────────
  const filteredOrders = (apiData || []).filter((order: any) => {
    let statusMatch = false;

    if (mode === "pending") {
      statusMatch = (order.status === "Pending") && order.is_production_ready === false;
    } else if (mode === "waiting_manager") {
      statusMatch = order.gm_proposed_method != null && order.production_method == null && order.status === "Pending";
    } else {
      // mode === "approved"
      statusMatch = (order.status === "Scheduled") &&
        (order.production_approval_flow === "AUTO_SINGLE_OPTION" || order.production_approval_flow === "MANUAL_MANAGER");
    }

    const searchMatch =
      order.customer_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchText.toLowerCase());
    return statusMatch && searchMatch;
  });

  const handleOpen = (orderId: number) => {
    setSelectedOrderId(orderId);
    setGmNote("");
    setSelectedMethod(null);
    setActiveTab("1");
    setIsModalVisible(true);
  };

  const handleClose = () => {
    setIsModalVisible(false);
    setSelectedOrderId(null);
    setGmNote("");
    setSelectedMethod(null);
  };

  // Phân tích options khả dụng
  const canNvl = !!statusData?.can_use_nvl;
  const canSub = !!statusData?.can_use_sub;
  const canBoth = !!statusData?.can_use_both;
  const needManager = !!statusData?.need_manager_approval;
  // Chỉ có 1 option duy nhất là NVL → hệ thống tự confirm
  const onlyNvl = canNvl && !canSub && !canBoth;
  const anyOption = canNvl || canSub || canBoth;

  const getStatusTag = (status: string) => {
    switch (status) {
      case "Pending": return <Tag color="orange">Chờ duyệt phương thức sản xuất</Tag>;
      case "Scheduled": return <Tag color="orange">Đã lên lịch</Tag>;
      case "LayoutPending": return <Tag color="orange">Chờ duyệt layout</Tag>;
      case "InProcessing": return <Tag color="blue">Đang sản xuất</Tag>;
      case "Importing": return <Tag color="blue">Đã sản xuất xong</Tag>;
      case "Finished": return <Tag color="green">Hoàn thành</Tag>;
      case "Delivered": return <Tag color="cyan">Đã giao</Tag>;
      case "Cancelled": return <Tag color="red">Đã hủy</Tag>;
      default: return <Tag>{status || "Mới"}</Tag>;
    }
  };

  const columns = [
    {
      title: "STT", key: "stt", width: 60, align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Mã đơn", dataIndex: "code", key: "code", width: 120,
      render: (text: string) => <span className="font-semibold text-blue-600">{text}</span>,
    },
    { title: "Khách hàng", dataIndex: "customer_name", key: "customer_name" },
    { title: "Sản phẩm", dataIndex: "product_name", key: "product_name" },
    {
      title: "Số lượng", dataIndex: "quantity", key: "quantity", align: "right" as const,
      render: (val: number) => <span className="font-medium">{val?.toLocaleString("vi-VN")}</span>,
    },
    {
      title: "Trạng thái", dataIndex: "status", key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "Ngày giao dự kiến", dataIndex: "delivery_date", key: "delivery_date",
      render: (date: string) => date ? new Date(date).toLocaleDateString("vi-VN") : "N/A",
    },
    ...(mode === "approved"
      ? [
        {
          title: "Người duyệt",
          key: "approval_source",
          align: "center" as const,
          render: (_: any, record: any) => {
            if (record.production_approval_flow === "AUTO_SINGLE_OPTION") {
              return <Tag color="green">Hệ thống tự duyệt</Tag>;
            }
            if (record.production_approval_flow === "MANUAL_MANAGER") {
              return <Tag color="blue">Manager duyệt</Tag>;
            }
            return <Tag>{record.production_approval_flow}</Tag>;
          },
        },
      ]
      : []),
    ...(mode === "pending"
      ? [
        {
          title: "Thao tác", key: "action", width: 180, align: "center" as const,
          render: (_: any, record: any) => {
            if (record.proposed_production_method != null) {
              return null;
            }
            return (
              <div className="flex ">
              <button
                onClick={() => handleOpen(record.order_id || record._id)}
                disabled={record.status === "Importing" || record.status === "Delivered" || record.gm_proposed_method != null}
                className="px-3 py-1 text-sm font-medium border border-amber-900 text-amber-900 rounded hover:bg-amber-50 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400 transition-colors"
              >
                Trình duyệt SX
              </button>
              <button
                onClick={() => router.push(`/general-manager/orders/${record.order_id}`)}
                className="px-3 py-1 ml-2 text-sm font-medium text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Xem chi tiết
              </button>
              </div>
            );
          },
        },
      ]
      : []),
  ];

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId) {
      setSelectedOrderId(Number(orderId));
      setIsModalVisible(true);
    }
  }, [searchParams]);

  /* ── Option badges ─────────────────────────────────────────────────────────── */
  const OptionBadge = ({
    available,
    selected,
    label,
    desc,
    cost,
    subQty,
    onClick,
  }: {
    available: boolean;
    selected: boolean;
    label: string;
    desc: string;
    cost?: number;
    subQty?: number;
    onClick?: () => void;
  }) => (
    <div
      onClick={available ? onClick : undefined}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${available
        ? selected
          ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 cursor-pointer scale-[1.01] shadow-sm"
          : "border-gray-200 bg-white hover:border-amber-400 hover:bg-amber-50/10 cursor-pointer"
        : "border-gray-150 bg-gray-50 opacity-45 cursor-not-allowed"
        }`}
    >
      <span
        className={`mt-0.5 text-lg transition-colors ${available ? (selected ? "text-amber-600 font-bold" : "text-gray-400") : "text-gray-300"
          }`}
      >
        {selected ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
      </span>
      <div className="flex-1">
        <div
          className={`font-bold transition-colors ${available ? (selected ? "text-amber-800" : "text-gray-700") : "text-gray-400"
            }`}
        >
          {label}
        </div>
        <div className="text-sm text-gray-500 mt-0.5 mb-1">{desc}</div>
        {available && cost !== undefined && (
          <div className="text-sm text-gray-700">
            Chi phí: <span className="font-semibold text-amber-600">{cost.toLocaleString("vi-VN")} đ</span>
          </div>
        )}
        {available && subQty !== undefined && (
          <div className="text-sm text-gray-700">
            SL có sẵn: <span className="font-semibold text-blue-600">{subQty.toLocaleString("vi-VN")}</span>
          </div>
        )}
        {available && selected && (
          <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
            Đề xuất được chọn
          </span>
        )}
      </div>
    </div>
  );

  /* ── Material table columns ────────────────────────────────────────────────── */
  const materialColumns = [
    { title: "Mã VT", dataIndex: "material_code", key: "material_code", width: 110 },
    { title: "Tên vật tư", dataIndex: "material_name", key: "material_name" },
    { title: "ĐV", dataIndex: "unit", key: "unit", width: 60, align: "center" as const },
    { title: "Yêu cầu", dataIndex: "required_qty", key: "required_qty", align: "right" as const, render: (v: number) => <span className="font-semibold">{v?.toLocaleString("vi-VN")}</span> },
    { title: "Hiện có", dataIndex: "available_qty", key: "available_qty", align: "right" as const, render: (v: number) => v?.toLocaleString("vi-VN") },
    { title: "Còn thiếu", dataIndex: "missing_qty", key: "missing_qty", align: "right" as const, render: (v: number) => v > 0 ? <span className="text-red-500 font-bold">{v?.toLocaleString("vi-VN")}</span> : "-" },
    { title: "Trạng thái", key: "status", align: "center" as const, width: 120, render: (_: any, r: any) => r.is_enough ? <Tag color="success" className="mr-0">Đủ cấp</Tag> : <Tag color="error" className="mr-0">Chờ nhập kho</Tag> },
  ];

  const machineColumns = [
    { title: "Bước", dataIndex: "seq_num", key: "seq_num", width: 60, align: "center" as const, render: (v: number) => <span className="font-bold text-gray-500">{v}</span> },
    { title: "Quy trình", dataIndex: "process_name", key: "process_name" },
    { title: "Mã máy", dataIndex: "machine_code", key: "machine_code", render: (v: string) => v ? <Tag color="blue" className="font-mono text-sm mr-0">{v}</Tag> : <span className="italic text-gray-400">Không tìm thấy</span> },
    { title: "Năng lực (rảnh/tổng)", key: "capacity", align: "center" as const, render: (_: any, r: any) => r.machine_found ? <span><span className={r.free_quantity > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{r.free_quantity}</span><span className="text-gray-300 mx-1">/</span><span className="font-medium">{r.total_quantity}</span></span> : "-" },
    { title: "Đánh giá", key: "avail", align: "center" as const, width: 160, render: (_: any, r: any) => !r.machine_found ? <Tag color="error" className="mr-0">Lỗi cấu hình</Tag> : !r.is_available ? <Tag color="warning" className="mr-0">Quá tải</Tag> : <Tag color="success" className="mr-0">Sẵn sàng</Tag> },
  ];

  /* ── Render ────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative min-h-[60vh]">
      {/* Loading Overlay */}
      {approveMutation.isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <Spin size="large" tip="Đang xử lý..." />
            <div className="mt-4 text-gray-700 font-semibold animate-pulse">
              Hệ thống đang xử lý lệnh sản xuất...
            </div>
            <div className="text-gray-400 text-sm mt-1">
              Vui lòng không đóng trình duyệt
            </div>
          </div>
        </div>
      )}

      {/* Header */}


      {/* Table */}
      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Input
            placeholder="Tìm theo mã đơn, khách hàng hoặc tên sản phẩm..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="sm:max-w-md w-full shadow-sm"
            size="large"
            allowClear
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            Tổng số: <span className="font-bold text-blue-700">{filteredOrders.length}</span> đơn hàng
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey={(record) => record.order_id || record._id || record.code}
          loading={isLoading}
          pagination={{ pageSize: 12, showSizeChanger: true }}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
        />
      </div>

      {/* Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-amber-600" />
            <span>Kiểm tra &amp; Trình duyệt sản xuất</span>
          </div>
        }
        open={isModalVisible}
        onCancel={handleClose}
        width={1000}
        style={{ top: 20 }}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={!anyOption || approveMutation.isPending || (!onlyNvl && !selectedMethod)}
              onClick={() => {
                if (!selectedOrderId) return;
                const methodToSubmit = onlyNvl ? "NVL" : selectedMethod;
                if (!methodToSubmit) {
                  message.error("Vui lòng chọn phương án sản xuất");
                  return;
                }
                approveMutation.mutate({
                  orderId: selectedOrderId,
                  note: gmNote,
                  productionMethod: methodToSubmit as "NVL" | "SUB" | "BOTH",
                });
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-colors ${anyOption && !approveMutation.isPending
                ? onlyNvl
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-amber-700 hover:bg-amber-800"
                : "bg-gray-400 cursor-not-allowed opacity-80"
                }`}
            >
              {approveMutation.isPending && <Spin size="small" />}
              {onlyNvl ? "Xác nhận sản xuất từ NVL" : "Trình Manager duyệt phương thức"}
            </button>
          </div>
        }
      >
        <div className="py-4">
          {isChecking ? (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
              <Spin size="large" />
              <div className="text-gray-500">Đang kiểm tra phương án sản xuất...</div>
            </div>
          ) : statusData ? (
            <div className="space-y-6">

              {/* ── 1. Tóm tắt phương án ── */}
              <div>
                <h3 className="text-base font-bold text-gray-800 mb-3 border-l-4 border-amber-500 pl-2">
                  Phương án khả dụng
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <OptionBadge
                    available={canNvl}
                    selected={selectedMethod === "NVL"}
                    label="NVL – Sản xuất từ đầu"
                    desc={`Sản xuất sản phẩm từ nguyên vật liệu.`}
                    cost={statusData.nvl_estimated_total_cost}
                    onClick={() => handleSelectMethod("NVL")}
                  />
                  <OptionBadge
                    available={canSub}
                    selected={selectedMethod === "SUB"}
                    label="SUB – Dùng bán thành phẩm"
                    desc={`Dùng bán thành phẩm có sẵn.`}
                    cost={statusData.sub_estimated_total_cost}
                    subQty={statusData.matched_sub_product?.quantity}
                    onClick={() => handleSelectMethod("SUB")}
                  />
                  <OptionBadge
                    available={canBoth}
                    selected={selectedMethod === "BOTH"}
                    label="BOTH – Kết hợp SUB + NVL"
                    desc="Dùng bán thành phẩm trước, sản xuất thêm phần còn thiếu."
                    cost={statusData.both_estimated_total_cost}
                    onClick={() => handleSelectMethod("BOTH")}
                  />
                </div>

                {/* Cảnh báo cần manager */}
                {needManager && (
                  <div className="mt-3 flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-800">
                    <InfoCircleOutlined className="mt-0.5 text-lg" />
                    <div>
                      Có nhiều phương án khả dụng. Sau khi GM trình duyệt, hệ thống sẽ chờ{" "}
                      <strong>Manager chọn phương thức sản xuất</strong> cụ thể.
                    </div>
                  </div>
                )}
                {onlyNvl && (
                  <div className="mt-3 flex items-start gap-3 p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800">
                    <CheckCircleOutlined className="mt-0.5 text-lg" />
                    <div>
                      Chỉ có phương án NVL khả dụng. Hệ thống sẽ <strong>tự xác nhận và tạo lệnh sản xuất ngay</strong>.
                    </div>
                  </div>
                )}
                {!anyOption && (
                  <div className="mt-3 flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
                    <WarningOutlined className="mt-0.5 text-lg" />
                    <div>
                      Hiện chưa có phương án nào khả dụng. Vui lòng chờ bổ sung vật tư / bán thành phẩm.
                    </div>
                  </div>
                )}
              </div>

              {/* ── 2. Chi tiết tabs ── */}
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: "1",
                    label: "Nguyên vật liệu (NVL)",
                    children: (
                      <div className="space-y-4 text-sm mt-2">
                        <Table
                          dataSource={statusData.materials || []}
                          rowKey="material_code"
                          pagination={false}
                          size="small"
                          bordered
                          columns={materialColumns}
                        />
                      </div>
                    ),
                  },
                  {
                    key: "2",
                    label: "Máy móc",
                    children: (
                      <div className="space-y-4 text-sm mt-2">
                        <Table
                          dataSource={statusData.machines || []}
                          rowKey={(r) => `${r.process_id}-${r.seq_num}`}
                          pagination={false}
                          size="small"
                          bordered
                          columns={machineColumns}
                        />
                      </div>
                    ),
                  },
                  ...(canSub || canBoth
                    ? [
                      {
                        key: "3",
                        label: "Bán thành phẩm",
                        children: (
                          <div className="space-y-4 text-sm mt-2">
                            {statusData.has_matched_sub_product && statusData.matched_sub_product ? (
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-2 gap-4">
                                  {[
                                    { label: "Loại sản phẩm", value: statusData.matched_sub_product.product_type_name },
                                    { label: "Số lượng hiện có", value: (statusData.matched_sub_product.quantity || 0).toLocaleString("vi-VN") },
                                    { label: "Kích thước (Rộng × Dài)", value: `${statusData.matched_sub_product.width} × ${statusData.matched_sub_product.length} mm` },
                                    { label: "Công đoạn đã hoàn thành", value: statusData.matched_sub_product.product_process },
                                  ].map((item) => (
                                    <div key={item.label} className="flex flex-col gap-1 p-3 bg-white rounded shadow-sm border border-gray-100">
                                      <span className="text-gray-500 text-xs">{item.label}</span>
                                      <span className="font-semibold text-gray-800">{item.value}</span>
                                    </div>
                                  ))}
                                  {statusData.matched_sub_product.description && (
                                    <div className="flex flex-col gap-1 p-3 bg-white rounded shadow-sm border border-gray-100 col-span-2">
                                      <span className="text-gray-500 text-xs">Mô tả thêm</span>
                                      <span className="text-gray-800">{statusData.matched_sub_product.description}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                                <div className="text-gray-500">{statusData.sub_product_message || "Không có bán thành phẩm phù hợp."}</div>
                              </div>
                            )}

                            {/* Vật tư cho BOTH */}
                            {canBoth && (statusData.remaining_materials_for_both || []).length > 0 && (
                              <>
                                <h4 className="font-bold text-gray-700 mt-4">Vật tư cần thêm (phần NVL trong BOTH)</h4>
                                <Table
                                  dataSource={statusData.remaining_materials_for_both}
                                  rowKey="material_code"
                                  pagination={false}
                                  size="small"
                                  bordered
                                  columns={materialColumns}
                                />
                              </>
                            )}
                          </div>
                        ),
                      },
                    ]
                    : []),
                ]}
              />

              {/* ── 3. Ghi chú GM ── */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Ghi chú của quản lý tổng hợp
                </label>
                <textarea
                  rows={3}
                  value={gmNote}
                  onChange={(e) => setGmNote(e.target.value)}
                  placeholder="Ví dụ: Đề xuất chọn phương án BOTH vì sub_product thiếu nhưng NVL đủ phần còn lại."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

            </div>
          ) : (
            <div className="text-center text-red-500 p-8 font-bold border border-red-200 bg-red-50 rounded-xl">
              Không thể lấy thông tin phương án sản xuất. Vui lòng thử lại.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function GroupProductionTab() {
  const [searchText, setSearchText] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [createPayload, setCreatePayload] = useState<any>(null);

  const [selectedManualOrders, setSelectedManualOrders] = useState<any[]>([]);
  const [manualProcessCodes, setManualProcessCodes] = useState<string[]>([]);
  const [manualStartDate, setManualStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [manualNote, setManualNote] = useState("");
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const { data: suggestions, isLoading: isSuggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ["group-suggestions"],
    queryFn: async () => {
      const res = await groupProductionsApi.getSuggestions();
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      return list as IProductionSuggestion[];
    },
  });

  const handlePreviewSuggestion = (suggestion: IProductionSuggestion) => {
    if (suggestion.preview_error) {
      message.error("Đề xuất này có lỗi preview, không thể xem trước.");
      return;
    }
    setPreviewData(suggestion.preview);
    setCreatePayload({
      order_ids: suggestion.suggest_order,
      process_codes: suggestion.suggest_process,
      planned_start_date: suggestion.schedule_planned_start_date || suggestion.suggested_planned_start_date,
      note: suggestion.note || "",
      is_group: suggestion.can_group,
      single_prod_id: suggestion.orders?.[0]?.single_prod_id,
    });
    setIsReviewModalOpen(true);
  };

  const suggestionColumns = [
    // {
    //   title: "STT",
    //   dataIndex: "suggestion_type",
    //   key: "suggestion_type",
    //   render: (t: string) => {
    //     const canGroup = t === "GROUP_PREVIEW";
    //     return <Tag color={canGroup ? "green" : "blue"}>{canGroup ? "Ghép đơn" : "Đơn lẻ"}</Tag>;
    //   }
    // },
    {
      title: "Loại đề xuất",
      dataIndex: "suggestion_type",
      key: "suggestion_type",
      render: (t: string, record: IProductionSuggestion) => {
        const canGroup = record.can_group;
        return <Tag color={canGroup ? "green" : "blue"}>{canGroup ? "Ghép đơn" : "Đơn lẻ"}</Tag>;
      }
    },
    // {
    //   title: "STT",
    //   dataIndex: "suggestion_type",
    //   key: "suggestion_type",
    //   render: (t: string) => {
    //     const canGroup = t === "GROUP_PREVIEW";
    //     return <Tag color={canGroup ? "green" : "blue"}>{canGroup ? "Ghép đơn" : "Đơn lẻ"}</Tag>;
    //   }
    // },
    {
      title: "Sản phẩm",
      dataIndex: "product_type_name",
      key: "product_type_name"
    },
    {
      title: "Đơn hàng",
      dataIndex: "order_codes",
      key: "order_codes",
      render: (codes: string[]) => (
        <div className="flex flex-wrap gap-1">
          {codes?.map(code => <Tag key={code} color="purple" className="font-mono">{code}</Tag>)}
        </div>
      )
    },
    {
      title: "Tiến trình (Các lô)",
      key: "batches",
      width: 300,
      render: (_: any, record: IProductionSuggestion) => {
        if (!record.batches || record.batches.length === 0) {
          return (
            <div className="flex flex-wrap gap-1">
              {record.suggest_process?.map(p => <Tag key={p} color="orange">{p}</Tag>)}
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-2">
            {record.batches.map((batch, idx) => {
              const isGroup = batch.batch_type === 'GROUP';
              const isSplit = batch.batch_type === 'SPLIT';
              const color = isGroup ? 'green' : isSplit ? 'blue' : 'orange';
              const label = isGroup ? 'Ghép chung' : isSplit ? 'Tách đơn' : 'Chạy riêng';
              const dotClass = isGroup ? 'bg-green-500' : isSplit ? 'bg-blue-500' : 'bg-orange-500';
              return (
                <div key={idx} className="flex flex-col gap-1 p-1.5 border border-gray-200 bg-white rounded shadow-sm">
                  {/* <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
                      {label}
                   </div> */}
                  <div className="flex flex-wrap gap-1">
                    {idx + 1} {batch.process_codes?.map(p => <> <Tag key={p} color={color} className="m-0">{p}</Tag></>)}
                  </div>
                </div>
              );
            })}
          </div>
        );
      }
    },

    {
      title: "Bắt đầu dự kiến",
      dataIndex: "schedule_planned_start_date",
      key: "schedule_planned_start_date",
      render: (d: string) => d ? dayjs(d).format("DD/MM/YYYY") : "N/A"
    },
    {
      title: "Tiêu chí",
      dataIndex: "note",
      key: "note",
      render: (t: string) => <span className="font-medium text-gray-600">{t}</span>
    },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: IProductionSuggestion) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handlePreviewSuggestion(record)}
          className="bg-blue-600"
        // disabled={!record.preview}
        >
          {record.preview ? "Xem & Tạo lệnh" : "Lỗi xem trước"}
        </Button>
      )
    }
  ];

  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    if (!searchText.trim()) return suggestions;

    const term = searchText.toLowerCase().trim();
    return suggestions.filter(
      (s) =>
        s.order_codes?.some(code => code.toLowerCase().includes(term)) ||
        s.product_type_name?.toLowerCase().includes(term) ||
        s.reason?.toLowerCase().includes(term)
    );
  }, [suggestions, searchText]);



  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createPayload) throw new Error("Không có dữ liệu tạo lệnh.");
      if (createPayload.is_group === false) {
        if (!createPayload.single_prod_id) throw new Error("Không tìm thấy mã lệnh sản xuất của đơn lẻ.");
        await productionsApi.confirmSchedule(createPayload.single_prod_id);
      } else {
        await groupProductionsApi.confirmProduceOrder({
          order_ids: createPayload.order_ids,
          process_codes: createPayload.process_codes,
          planned_start_date: createPayload.planned_start_date,
          note: createPayload.note,
        });
      }
    },
    onSuccess: () => {
      message.success("Đã tạo lệnh sản xuất thành công!");
      setIsReviewModalOpen(false);
      setPreviewData(null);
      setCreatePayload(null);
      setSelectedManualOrders([]);
      setManualNote("");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error.message || "Có lỗi xảy ra.");
    }
  });

  const manualCandidates = useMemo(() => {
    if (!suggestions) return [];
    let flatList: any[] = [];
    let groupIndex = 0;
    suggestions.forEach((s, sIndex) => {
      // Only include suggestions that have more than 1 order
      if (s.orders && s.orders.length > 1) {
        s.orders.forEach((o, oIndex) => {
          flatList.push({
            ...o,
            suggestion_id: s.suggestion_key || `sug_${sIndex}`,
            suggestion_reason: s.note || s.reason || `Nhóm đề xuất ${groupIndex + 1}`,
            is_first: oIndex === 0,
            is_last: oIndex === (s.orders!.length - 1),
            unique_key: `${s.suggestion_key || sIndex}_${o.order_id}`,
            group_index: groupIndex,
          });
        });
        groupIndex++;
      }
    });

    if (searchText.trim()) {
      const term = searchText.toLowerCase().trim();
      const matchingSuggestionIds = new Set();
      flatList.forEach(item => {
        if (item.order_code?.toLowerCase().includes(term) || item.product_name?.toLowerCase().includes(term)) {
          matchingSuggestionIds.add(item.suggestion_id);
        }
      });
      flatList = flatList.filter(item => matchingSuggestionIds.has(item.suggestion_id));
    }
    return flatList;
  }, [suggestions, searchText]);

  const maxAllowedStartDate = useMemo(() => {
    if (selectedManualOrders.length === 0) return null;
    const validDates = selectedManualOrders
      .map(o => dayjs(o.delivery_date))
      .filter(d => d.isValid());
    if (validDates.length === 0) return null;
    const nearest = validDates.reduce((min, current) => current.isBefore(min) ? current : min);

    let calc = nearest.subtract(7, "day");
    if (calc.isBefore(dayjs().startOf("day"))) {
      calc = dayjs().add(1, "day").startOf("day");
    }
    return calc;
  }, [selectedManualOrders]);

  useEffect(() => {
    if (maxAllowedStartDate) {
      setManualStartDate(maxAllowedStartDate);
    }
  }, [maxAllowedStartDate]);

  const handlePreviewManual = async () => {
    try {
      setIsPreviewLoading(true);
      const payload = {
        order_ids: selectedManualOrders.map(o => o.order_id),
        process_codes: manualProcessCodes,
        planned_start_date: manualStartDate!.format("YYYY-MM-DD"),
        note: manualNote,
      };
      const res = await groupProductionsApi.getPreview(payload);
      const data = (res as any).data || res;
      setPreviewData(data);
      setCreatePayload({ ...payload, is_group: true });
      setIsReviewModalOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.message || error.message || "Lỗi khi lấy thông tin preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const selectedSuggestionId = selectedManualOrders.length > 0 ? selectedManualOrders[0].suggestion_id : null;

  const rowSelection = {
    selectedRowKeys: selectedManualOrders.map(o => o.unique_key),
    onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
      setSelectedManualOrders(selectedRows);
    },
    getCheckboxProps: (record: any) => ({
      disabled: selectedSuggestionId ? record.suggestion_id !== selectedSuggestionId : false,
    }),
  };

  const manualColumns = [

    {
      title: "Mã đơn",
      dataIndex: "order_code",
      key: "order_code",
      render: (t: string) => <span className="font-semibold text-blue-600">{t}</span>
    },
    { title: "Tên sản phẩm", dataIndex: "product_name", key: "product_name" },
    { title: "Số lượng", dataIndex: "quantity", key: "quantity", align: "right" as const, render: (v: number) => v?.toLocaleString("vi-VN") },
    { title: "Ngày giao", dataIndex: "delivery_date", key: "delivery_date", render: (d: string) => d ? new Date(d).toLocaleDateString("vi-VN") : "N/A" },
    {
      title: "Công đoạn", dataIndex: "production_process", key: "production_process", render: (p: string) => (
        <div className="flex flex-wrap gap-1">
          {p?.split(",").map((code: string) => (
            <Tag key={code} color="default">
              {code}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: "Nhóm đề xuất",
      dataIndex: "suggestion_reason",
      key: "suggestion_reason",
      width: 250,
      render: (value: any, record: any) => {
        const obj = {
          children: <div className="text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-100">{value}</div>,
          props: {} as any,
        };
        if (record.is_first) {
          const count = manualCandidates.filter(c => c.suggestion_id === record.suggestion_id).length;
          obj.props.rowSpan = count;
        } else {
          obj.props.rowSpan = 0;
        }
        return obj;
      }
    },
  ];

  return (
    <div className="relative min-h-[60vh]">
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: "1",
            label: "Danh sách đề xuất",
            children: (
              <div className="space-y-6 mt-4">
                <div className="text-gray-600 mb-2">
                  Danh sách các đề xuất sản xuất (đơn lẻ hoặc ghép đơn) từ hệ thống. Bạn có thể xem trước chi tiết lộ trình và xác nhận tạo lệnh sản xuất.
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="w-full sm:max-w-md">
                      <Input
                        placeholder="Tìm theo mã đơn, sản phẩm..."
                        prefix={<SearchOutlined className="text-gray-400" />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                        size="large"
                      />
                    </div>
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      onClick={() => refetchSuggestions()}
                      className="bg-blue-600 self-start sm:self-auto"
                    >
                      Tải lại danh sách
                    </Button>
                  </div>
                  <Table
                    columns={suggestionColumns}
                    dataSource={filteredSuggestions}
                    rowKey="suggestion_key"
                    loading={isSuggestionsLoading}
                    pagination={{ pageSize: 15 }}
                    bordered
                    locale={{ emptyText: "Không có đề xuất sản xuất nào." }}
                    scroll={{ x: 1000 }}
                  />
                </div>
              </div>
            ),
          },
          {
            key: "2",
            label: "Tự chọn đơn hàng & Ghép thủ công",
            children: (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm mt-4">
                <div className="mb-4">
                  <Title level={4} className="!mb-0 text-gray-800">Tự chọn đơn hàng & Ghép thủ công</Title>
                  <div className="text-gray-500 text-sm mt-1">Danh sách dưới đây là toàn bộ các đơn hàng có trong các đề xuất ở trên. Bạn có thể tự chọn ra một số đơn hàng để ghép thay vì dùng mặc định theo đề xuất.</div>
                </div>

                <Table
                  rowSelection={rowSelection}
                  columns={manualColumns}
                  dataSource={manualCandidates}
                  rowKey="unique_key"
                  pagination={{ pageSize: 100 }}
                  bordered
                  rowClassName={(record: any) => record.group_index % 2 === 0 ? "bg-white" : "bg-blue-50/20"}
                  locale={{ emptyText: "Không có đơn hàng nào." }}
                  className="mb-6 shadow-sm"
                />

                <Card className="border-blue-100 bg-blue-50/30 shadow-sm">
                  <Title level={4} className="!mb-4 text-blue-800">Xác nhận tạo lệnh ghép</Title>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Công đoạn ghép (Bắt buộc)</label>
                      <Select
                        mode="multiple"
                        className="w-full"
                        placeholder="VD: PHU, CAN..."
                        value={manualProcessCodes}
                        onChange={setManualProcessCodes}
                        options={ALLOWED_PROCESS_CODES}
                        allowClear
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày dự kiến sản xuất</label>
                      <DatePicker
                        className="w-full"
                        value={manualStartDate}
                        onChange={setManualStartDate}
                        format="DD/MM/YYYY"
                        disabledDate={(current) => {
                          if (current && current.isBefore(dayjs().startOf("day"), "day")) {
                            return true;
                          }
                          if (maxAllowedStartDate && current && current.isAfter(maxAllowedStartDate, "day")) {
                            return true;
                          }
                          return false;
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
                      <Input.TextArea
                        rows={1}
                        placeholder="Nhập ghi chú cho lệnh ghép (nếu có)"
                        value={manualNote}
                        onChange={e => setManualNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-blue-200 pt-4 mt-2">
                    <div className="text-blue-800">
                      Đã chọn <span className="font-bold text-lg">{selectedManualOrders.length}</span> đơn hàng.
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={handlePreviewManual}
                      loading={isPreviewLoading}
                      disabled={selectedManualOrders.length < 1 || !manualStartDate || manualProcessCodes.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 border-none px-8"
                    >
                      Xem trước & Tạo
                    </Button>
                  </div>
                </Card>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={<Title level={4}>Xác nhận Tạo Lệnh Sản Xuất</Title>}
        open={isReviewModalOpen}
        onOk={() => createMutation.mutate()}
        onCancel={() => {
          setIsReviewModalOpen(false);
          setPreviewData(null);
          setCreatePayload(null);
        }}
        confirmLoading={createMutation.isPending}
        okText="Xác nhận Tạo"
        cancelText="Hủy"
        width={900}
        okButtonProps={{ className: "bg-green-600 hover:bg-green-700" }}
      >
        {previewData && (
          <div className="py-2 max-h-[70vh] overflow-y-auto pr-2">
            <Descriptions title="Thông tin tổng quan" bordered column={{ xs: 1, sm: 2 }} size="small" className="mb-6">
              <Descriptions.Item label="Ngày bắt đầu">{dayjs(previewData.suggested_planned_start_date).format("DD/MM/YYYY")}</Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc dự kiến">{dayjs(previewData.estimated_finish_date).format("DD/MM/YYYY")}</Descriptions.Item>
              {/* <Descriptions.Item label="Hạn giao hàng chung">{dayjs(previewData.common_delivery_deadline).format("DD/MM/YYYY")}</Descriptions.Item> */}
              <Descriptions.Item label="Tổng thời gian">{previewData.total_duration_days} ngày</Descriptions.Item>
              {/* <Descriptions.Item label="Đạt tiến độ?">
                {previewData.can_meet_common_deadline ? (
                  <Tag color="green">Đạt</Tag>
                ) : (
                  <Tag color="red">Trễ {previewData.days_late_if_any} ngày</Tag>
                )}
              </Descriptions.Item> */}
              <Descriptions.Item label="Công đoạn ghép">
                <div className="flex flex-wrap gap-1">
                  {previewData.selected_process_codes.map((code: any) => (
                    <Tag key={code} color="blue">{code}</Tag>
                  ))}
                </div>
              </Descriptions.Item>
            </Descriptions>

            {/* <Divider>Danh sách đơn hàng ({previewData.order_ids.length})</Divider>
            <div className="flex flex-wrap gap-2 mb-6">
              {previewData.order_ids.map(id => <Tag key={id} color="purple">ID: {id}</Tag>)}
            </div> */}

            <Divider>Tiến trình dự kiến</Divider>
            <Table
              dataSource={previewData.timeline}
              pagination={false}
              size="small"
              rowKey={(r: any, i: any) => `${r.dept_code}-${i}`}
              columns={[
                {
                  title: "Giai đoạn", dataIndex: "stage_type", key: "stage_type", render: (t: any) => {
                    const label = t === 'SINGLE_PRIVATE' ? 'Chạy riêng (trước)' : t === 'GROUP' ? <p className="font-bold ">Ghép</p> : t === 'SPLIT' ? 'Chạy riêng (sau)' : t;
                    const color = t === 'SINGLE_PRIVATE' ? 'orange' : t === 'GROUP' ? 'green' : 'blue';
                    return <Tag color={color}>{label}</Tag>;
                  }
                },
                { title: "Công đoạn", dataIndex: "process_codes", key: "process_codes", render: (codes: string[]) => codes?.join(", ") },
                { title: "Phòng ban", dataIndex: "dept_name", key: "dept_name" },
                { title: "Bắt đầu", dataIndex: "planned_start_date", key: "planned_start_date", render: (d) => dayjs(d).format("DD/MM/YYYY") },
                { title: "Kết thúc", dataIndex: "planned_end_date", key: "planned_end_date", render: (d) => dayjs(d).format("DD/MM/YYYY") },
                { title: "Thời gian", dataIndex: "duration_days", key: "duration_days", render: (d) => `${d} ngày` },
              ]}
              className="mb-6"
            />

            {previewData.notes && previewData.notes.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
                <div className="text-blue-800 flex items-start gap-2">
                  <InfoCircleOutlined className="mt-1" />
                  <div>
                    <p className="font-semibold mb-1">Ghi chú hệ thống:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {previewData.notes.map((note: any, index: any) => (
                        <li key={index}>{note}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function TrackOrdersTab({ mode }: { mode: "InProcessing" | "Importing" }) {
  const [searchText, setSearchText] = useState("");
  const [currentPageOrders, setCurrentPageOrders] = useState(1);
  const pageSizeOrders = 12;

  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedProdDetail, setSelectedProdDetail] = useState<any>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const handleViewDetail = async (prodId: string) => {
    setIsDetailModalVisible(true);
    setIsDetailLoading(true);
    try {
      const res = await productionsApi.getProductionByProdId(prodId);
      setSelectedProdDetail(res?.data || res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleViewOrderDetail = async (orderId: string) => {
    setIsDetailModalVisible(true);
    setIsDetailLoading(true);
    try {
      const res = await productionsApi.getProdyctionByOrderId(orderId);
      setSelectedProdDetail(res?.data || res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["orders", "gm-approval-list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 100);
        return Array.isArray(response.data) ? response.data : [];
      } catch {
        return [];
      }
    },
  });

  const getDeliveryColor = (date: string) => {
    if (!date) return "bg-gray-100 text-gray-500 border-gray-200";
    const today = new Date();
    const delivery = new Date(date);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "bg-red-100 text-red-700 border-red-300 animate-pulse";
    if (diffDays <= 3) return "bg-red-100 text-red-700 border-red-300";
    if (diffDays <= 7) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-green-100 text-green-700 border-green-300";
  };

  const getRemainingDaysText = (date: string) => {
    if (!date) return "N/A";
    const today = new Date();
    const delivery = new Date(date);
    const diffDays = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Trễ ${Math.abs(diffDays)} ngày`;
    if (diffDays === 0) return "Hôm nay giao";
    return `Còn ${diffDays} ngày`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const filteredOrders = useMemo(() => {
    return (ordersData || [])
      .filter((o: any) => {
        const matchesSearch =
          (o.code || "").toLowerCase().includes(searchText.toLowerCase()) ||
          (o.customer_name || "").toLowerCase().includes(searchText.toLowerCase()) ||
          (o.product_name || "").toLowerCase().includes(searchText.toLowerCase());

        return matchesSearch && o.status === mode;
      })
      .sort((a: any, b: any) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime());
  }, [ordersData, searchText, mode]);

  const orderColumns: any = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (text: string) => <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-1 rounded border border-amber-200">{text}</span>,
    },
    {
      title: 'Sản phẩm & Khách hàng',
      key: 'product',
      width: 250,
      render: (_: any, record: any) => (
        <div>
          <div className="font-bold text-gray-900 text-xs line-clamp-1">{record.product_name}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">{record.customer_name}</div>
        </div>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      align: 'right',
      render: (val: number) => <span className="font-bold text-gray-800">{val?.toLocaleString("vi-VN")}</span>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 150,
      render: (_: any, record: any) => {
        const isProcessing = record.status === "InProcessing";
        return (
          <div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isProcessing ? "bg-amber-100 text-amber-900" : "bg-green-100 text-green-900"}`}>
              {isProcessing ? "Đang sản xuất" : "Đã hoàn thành"}
            </span>
          </div>
        );
      }
    },
    {
      title: 'Lệnh sản xuất',
      key: 'productions',
      width: 200,
      render: (_: any, record: any) => {
        const orderProds = record.productions || [];
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {orderProds.map((p: any) => {
              const statusText = p.status === "InProcessing" ? "Đang SX" : p.status === "Importing" ? "Xong" : "Lịch";
              const statusColor = p.status === "InProcessing" ? "bg-amber-100 text-amber-800 border-amber-200" : p.status === "Importing" ? "bg-green-100 text-green-800 border-green-200" : "bg-blue-100 text-blue-800 border-blue-200";
              return (
                <span
                  key={p.prod_id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetail(p.prod_id.toString());
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors border ${statusColor} hover:opacity-80 flex items-center gap-1`}
                  title={`Xem chi tiết lệnh #${p.code}`}
                >
                  #{p.code}
                  <span className="text-[8px] opacity-75 hidden xl:inline-block">({statusText})</span>
                </span>
              );
            })}
            {orderProds.length === 0 && <span className="text-[10px] text-gray-400 italic">Chưa có lệnh</span>}
          </div>
        );
      }
    },
    {
      title: 'Hạn giao',
      key: 'delivery',
      width: 140,
      render: (_: any, record: any) => (
        <div className="flex flex-col gap-1">
          <span className="text-gray-700 text-xs font-medium">{formatDate(record.delivery_date)}</span>
          <span className={`w-fit px-1.5 py-0.5 rounded font-bold border text-[9px] ${getDeliveryColor(record.delivery_date)}`}>
            {getRemainingDaysText(record.delivery_date)}
          </span>
        </div>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_: any, record: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleViewOrderDetail((record.order_id || record._id).toString());
          }}
          className="text-amber-800 hover:text-amber-955 font-bold flex items-center gap-0.5 transition-colors text-[11px] bg-amber-50 px-2.5 py-1.5 rounded border border-amber-200 hover:bg-amber-100 mx-auto"
        >
          Chi tiết <BiChevronRight className="w-3.5 h-3.5" />
        </button>
      )
    }
  ];

  return (
    <div className="relative min-h-[60vh]">
      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Input
            placeholder="Tìm theo mã đơn, khách hàng hoặc tên sản phẩm..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="sm:max-w-md w-full shadow-sm"
            size="large"
            allowClear
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            Tổng số: <span className="font-bold text-blue-700">{filteredOrders.length}</span> đơn hàng
          </div>
        </div>

        <Table
          columns={orderColumns}
          dataSource={filteredOrders}
          rowKey={(record) => record.order_id || record._id || record.code}
          loading={isLoading}
          pagination={{
            current: currentPageOrders,
            pageSize: pageSizeOrders,
            onChange: (page) => setCurrentPageOrders(page),
            showSizeChanger: true
          }}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
        />

        <Modal
          title={
            <div className="flex items-center gap-2 text-amber-900 font-bold">
              <InfoCircleOutlined className="w-5 h-5" />
              Chi Tiết Lệnh Sản Xuất {selectedProdDetail?.prod_id ? `#${selectedProdDetail.prod_id}` : ""}
            </div>
          }
          open={isDetailModalVisible}
          onCancel={() => setIsDetailModalVisible(false)}
          footer={
            <button
              onClick={() => setIsDetailModalVisible(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Đóng
            </button>
          }
          width={1000}
        >
          {isDetailLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" />
            </div>
          ) : selectedProdDetail ? (
            <ProductionDetailReadOnly production={selectedProdDetail} />
          ) : (
            <div className="text-center py-8 text-red-500 font-medium">
              Không tìm thấy thông tin lệnh sản xuất.
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}

export default function ProductionApprovalPage() {
  const [activeTab, setActiveTab] = useState("approval");

  const { data: apiData } = useQuery({
    queryKey: ["orders", "gm-approval-list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 100);
        return Array.isArray(response.data) ? response.data : [];
      } catch {
        return [];
      }
    },
  });

  const pendingCount = (apiData || []).filter(
    (order: any) => order.status === "Pending" && order.is_production_ready === false
  ).length;

  const waitingManagerCount = (apiData || []).filter(
    (order: any) =>
      order.gm_proposed_method != null &&
      order.production_method == null &&
      order.status === "Pending"
  ).length;

  const approvedCount = (apiData || []).filter(
    (order: any) =>
      order.status === "Scheduled" &&
      (order.production_approval_flow === "AUTO_SINGLE_OPTION" ||
        order.production_approval_flow === "MANUAL_MANAGER")
  ).length;

  const inProcessingCount = (apiData || []).filter(
    (order: any) => order.status === "InProcessing"
  ).length;

  const finishedCount = (apiData || []).filter(
    (order: any) => order.status === "Importing"
  ).length;

  const { data: suggestionsData } = useQuery({
    queryKey: ["group-suggestions", "all"],
    queryFn: async () => {
      try {
        const res = await groupProductionsApi.getSuggestions();
        const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
        return list;
      } catch {
        return [];
      }
    },
  });



  const suggestionsCount = suggestionsData?.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[80vh] p-6">
      <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-4">
        <div>
          <Title level={3} className="!mb-1 text-gray-800">Quản lý sản xuất</Title>
          <Text type="secondary">Duyệt lệnh và quản lý ghép đơn sản xuất</Text>
        </div>
        <div className="flex gap-4">
          <div
            className={`px-4 py-2 rounded-lg border flex items-center gap-3 transition-colors ${suggestionsCount > 0
              ? "bg-green-50 border-green-200 cursor-pointer hover:bg-green-100"
              : "bg-gray-50 border-gray-200"
              }`}
            onClick={() => {
              if (suggestionsCount > 0) setActiveTab("pending_schedule");
            }}
          >
            <div className="bg-white p-2 rounded-full shadow-sm">
              <InfoCircleOutlined className={suggestionsCount > 0 ? "text-green-600 text-lg" : "text-gray-400 text-lg"} />
            </div>
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wider ${suggestionsCount > 0 ? "text-green-600" : "text-gray-500"}`}>
                Chờ lên lịch
              </div>
              <div className={`text-sm font-medium ${suggestionsCount > 0 ? "text-green-800" : "text-gray-600"}`}>
                <span className="text-lg font-bold mr-1">{suggestionsCount}</span>
                gợi ý cần xử lý
              </div>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "approval",
            label: (
              <span className="flex items-center gap-2">
                Duyệt sản xuất
                <Badge count={pendingCount} showZero={false} size="small" />
              </span>
            ),
            children: (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center py-10">
                    <Spin size="large" />
                  </div>
                }
              >
                <ProductionApprovalContent mode="pending" />
              </Suspense>
            ),
          },
          {
            key: "waiting_manager",
            label: (
              <span className="flex items-center gap-2">
                Chờ quản lý duyệt
                <Badge count={waitingManagerCount} showZero={false} size="small" color="orange" />
              </span>
            ),
            children: (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center py-10">
                    <Spin size="large" />
                  </div>
                }
              >
                <ProductionApprovalContent mode="waiting_manager" />
              </Suspense>
            ),
          },

          {
            key: "pending_schedule",
            label: (
              <span className="flex items-center gap-2">
                Chờ lên lịch
                <Badge count={suggestionsCount} showZero={false} size="small" color="green" />
              </span>
            ),
            children: <GroupProductionTab />,
          },
          {
            key: "Scheduled",
            label: (
              <span className="flex items-center gap-2">
                Đã lên lịch
                <Badge count={approvedCount} showZero={false} size="small" color="blue" />
              </span>
            ),
            children: (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center py-10">
                    <Spin size="large" />
                  </div>
                }
              >
                <ProductionApprovalContent mode="approved" />
              </Suspense>
            ),
          },
          {
            key: "InProcessing",
            label: (
              <span className="flex items-center gap-2">
                Đang sản xuất
                <Badge count={inProcessingCount} showZero={false} size="small" color="purple" />
              </span>
            ),
            children: (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center py-10">
                    <Spin size="large" />
                  </div>
                }
              >
                <TrackOrdersTab mode="InProcessing" />
              </Suspense>
            ),
          },
          {
            key: "Importing",
            label: (
              <span className="flex items-center gap-2">
                Đã hoàn thành
                <Badge count={finishedCount} showZero={false} size="small" color="green" />
              </span>
            ),
            children: (
              <Suspense
                fallback={
                  <div className="flex justify-center items-center py-10">
                    <Spin size="large" />
                  </div>
                }
              >
                <TrackOrdersTab mode="Importing" />
              </Suspense>
            ),
          },
        ]}
      />
    </div>
  );
}
