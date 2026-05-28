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
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";

import { orderApi } from "@/apiRequests/order";
import { productionsApi, ProductionReadiness } from "@/apiRequests/productions";
import {
  GroupableOrder,
  groupProductionsApi,
  ISuggestionGroup,
  IPreview,
} from "@/apiRequests/groupProductions";
import { productTypesApi, ProductTemplate } from "@/apiRequests/producttypes";
import { disabledDate as vietnamHolidaysDisabledDate } from "@/utils/vietnamHolidays";

const { Title, Text } = Typography;

const ALLOWED_PROCESS_CODES = [
  { label: "Phủ (PHU)", value: "PHU" },
  { label: "Cán (CAN)", value: "CAN" },
  { label: "Bồi (BOI)", value: "BOI" },
];

function ProductionApprovalContent({ mode = "pending" }: { mode?: "pending" | "approved" }) {
  const searchParams = useSearchParams();

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
      statusMatch = (order.status === "Scheduled") && order.is_production_ready === false;
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
      case "Scheduled": return <Tag color="orange">Đã lên lịch</Tag>;
      case "LayoutPending": return <Tag color="orange">Chờ duyệt layout</Tag>;
      case "InProcessing": return <Tag color="blue">Đang sản xuất</Tag>;
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
              <button
                onClick={() => handleOpen(record.order_id || record._id)}
                disabled={record.status === "Finished" || record.status === "Delivered" || record.gm_proposed_method != null}
                className="px-3 py-1 text-sm font-medium border border-amber-900 text-amber-900 rounded hover:bg-amber-50 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400 transition-colors"
              >
                Trình duyệt SX
              </button >
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

function GroupProductionTab({ mode }: { mode: "suggestions" | "manual" }) {
  const [productTypeId, setProductTypeId] = useState<number | null>(null);
  const [selectedProcessCodes, setSelectedProcessCodes] = useState<string[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<GroupableOrder[]>([]);
  const [plannedStartDate, setPlannedStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [note, setNote] = useState("");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<IPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [createPayload, setCreatePayload] = useState<any>(null);

  const { data: productTypes } = useQuery({
    queryKey: ["product-types"],
    queryFn: async () => {
      const res = await productTypesApi.getAll();
      if (Array.isArray(res)) return res;
      if (Array.isArray((res as any)?.data)) return (res as any).data;
      return [];
    },
  });

  // Fetch templates to auto-fill process codes when a product type is selected
  const { data: templates } = useQuery({
    queryKey: ["product-templates", productTypeId],
    queryFn: async () => {
      if (!productTypeId) return [];
      const res = await productTypesApi.getProductTemplete(productTypeId);
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      return list as ProductTemplate[];
    },
    enabled: !!productTypeId,
  });

  // Auto-fill process codes when product type or templates change
  useEffect(() => {
    if (productTypeId && templates && templates.length > 0) {
      const defaultTemplate = templates[0];
      if (defaultTemplate.production_processes) {
        const codes = defaultTemplate.production_processes
          .split(",")
          .map((c: string) => c.trim())
          .filter((code: string) =>
            ALLOWED_PROCESS_CODES.some((allowed) => allowed.value === code)
          );

        setSelectedProcessCodes(codes);
      } else {
        setSelectedProcessCodes([]);
      }
    }
  }, [templates, productTypeId]);

  const { data: candidates, isLoading: isCandidatesLoading, refetch } = useQuery({
    queryKey: ["group-candidates", productTypeId, selectedProcessCodes],
    queryFn: async () => {
      const codes = selectedProcessCodes.length > 0 ? selectedProcessCodes.join(",") : undefined;
      const res = await groupProductionsApi.getGroupableOrders(productTypeId || undefined, codes);
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      return list.filter((o: any) => o.can_group);
    },
  });

  const { data: suggestions, isLoading: isSuggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ["group-suggestions", productTypeId, selectedProcessCodes, selectedOrders],
    queryFn: async () => {
      const processCodesStr = selectedProcessCodes.length > 0 ? selectedProcessCodes.join(",") : undefined;
      const orderIdsStr = selectedOrders.length > 0 ? selectedOrders.map(o => o.order_id).join(",") : undefined;
      const res = await groupProductionsApi.getSuggestions(productTypeId || undefined, processCodesStr, orderIdsStr);
      const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
      return list;
    },
  });

  const handlePreviewSuggestion = (suggestion: ISuggestionGroup) => {
    setPreviewData(suggestion.preview);
    setCreatePayload({
      order_ids: suggestion.suggest_order,
      process_codes: suggestion.suggest_process,
      planned_start_date: suggestion.suggested_planned_start_date,
      note: suggestion.note || "",
    });
    setIsReviewModalOpen(true);
  };

  const suggestionColumns = [
    { title: "Tiêu chí ghép", dataIndex: "reason", key: "reason", render: (t: string) => <span className="font-semibold text-green-600">{t}</span> },
    {
      title: "ID Đơn hàng",
      dataIndex: "suggest_order",
      key: "suggest_order",
      render: (orders: number[]) => (
        <div className="flex flex-wrap gap-1">
          {orders?.map(id => <Tag key={id} color="blue">{id}</Tag>)}
        </div>
      )
    },
    {
      title: "Công đoạn",
      dataIndex: "suggest_process",
      key: "suggest_process",
      render: (processes: string[]) => (
        <div className="flex flex-wrap gap-1">
          {processes?.map(p => <Tag key={p} color="purple">{p}</Tag>)}
        </div>
      )
    },
    { title: "Phòng ban", dataIndex: "department_name", key: "department_name" },
    // { title: "Mã vật tư", dataIndex: "material_key", key: "material_key", render: (t: string) => t ? <Tag>{t}</Tag> : <span className="text-gray-400">N/A</span> },
    {
      title: "Hành động",
      key: "action",
      render: (_: any, record: ISuggestionGroup) => (
        <Button type="primary" size="small" onClick={() => handlePreviewSuggestion(record)} className="bg-blue-600">
          Xem & Tạo lệnh
        </Button>
      )
    }
  ];

  const filteredAndSortedCandidates = useMemo(() => {
    if (!candidates) return [];

    let result = [...candidates];

    // Search filter: mã đơn hoặc tên sản phẩm
    if (searchText.trim()) {
      const term = searchText.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.order_code?.toLowerCase().includes(term) ||
          o.product_name?.toLowerCase().includes(term)
      );
    }

    // Sort logic
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return b.order_id - a.order_id;
      }
      if (sortBy === "oldest") {
        return a.order_id - b.order_id;
      }
      if (sortBy === "delivery_asc") {
        const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
        const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === "delivery_desc") {
        const dateA = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
        const dateB = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "qty_asc") {
        return (a.quantity || 0) - (b.quantity || 0);
      }
      if (sortBy === "qty_desc") {
        return (b.quantity || 0) - (a.quantity || 0);
      }
      return 0;
    });

    return result;
  }, [candidates, searchText, sortBy]);

  const maxAllowedStartDate = useMemo(() => {
    if (selectedOrders.length === 0) return null;

    const validDates = selectedOrders
      .map(o => dayjs(o.delivery_date))
      .filter(d => d.isValid());

    if (validDates.length === 0) return null;

    const nearest = validDates.reduce((min, current) =>
      current.isBefore(min) ? current : min
    );

    return nearest.subtract(7, "day");
  }, [selectedOrders]);

  useEffect(() => {
    if (plannedStartDate && maxAllowedStartDate) {
      if (plannedStartDate.isAfter(maxAllowedStartDate, "day")) {
        setPlannedStartDate(maxAllowedStartDate);
        message.info("Ngày dự kiến bắt đầu đã được tự động điều chỉnh để đảm bảo cách ngày giao hàng gần nhất ít nhất 7 ngày.");
      }
    }
  }, [maxAllowedStartDate, plannedStartDate]);

  const handlePreviewManual = async () => {
    try {
      setIsPreviewLoading(true);
      const payload = {
        order_ids: selectedOrders.map(o => o.order_id),
        process_codes: selectedProcessCodes,
        planned_start_date: plannedStartDate!.toISOString(),
        note: note,
      };
      const res = await groupProductionsApi.getPreview(payload);
      const data = (res as any).data || res;
      setPreviewData(data);
      setCreatePayload(payload);
      setIsReviewModalOpen(true);
    } catch (error: any) {
      message.error(error?.response?.data?.message || error.message || "Lỗi khi lấy thông tin preview.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!createPayload) throw new Error("Không có dữ liệu tạo lệnh.");
      await groupProductionsApi.confirmProduceOrder(createPayload);
    },
    onSuccess: () => {
      message.success("Đã tạo lệnh sản xuất ghép thành công!");
      setSelectedOrders([]);
      setNote("");
      setIsReviewModalOpen(false);
      setPreviewData(null);
      setCreatePayload(null);
      refetch();
      refetchSuggestions();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error.message || "Có lỗi xảy ra.");
    }
  });

  const rowSelection = {
    selectedRowKeys: selectedOrders.map(o => o.order_id),
    onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
      setSelectedOrders(selectedRows);
    },
    getCheckboxProps: (record: GroupableOrder) => ({
      disabled: !record.can_group,
    }),
  };

  const columns = [
    { title: "Mã đơn", dataIndex: "order_code", key: "order_code", render: (t: string) => <span className="font-semibold text-blue-600">{t}</span> },
    { title: "Tên sản phẩm", dataIndex: "product_name", key: "product_name" },
    { title: "Số lượng", dataIndex: "quantity", key: "quantity", align: "right" as const, render: (v: number) => v?.toLocaleString("vi-VN") },
    { title: "Ngày giao", dataIndex: "delivery_date", key: "delivery_date", render: (d: string) => d ? new Date(d).toLocaleDateString("vi-VN") : "N/A" },
    {
      title: "Công đoạn", dataIndex: "production_process", key: "production_process", render: (p: string) => (
        <div className="flex flex-wrap gap-1">
          {p?.split(",").map(code => (
            <Tag key={code} color={selectedProcessCodes.includes(code) ? "blue" : "default"}>
              {code}
            </Tag>
          ))}
        </div>
      )
    },
  ];

  return (
    <div className="relative min-h-[60vh]">
      <div className="mb-4 text-gray-600">Chọn loại sản phẩm và các công đoạn để xem {mode === "suggestions" ? "gợi ý ghép đơn" : "và chọn đơn hàng tiềm năng"}.</div>


      <Card className="mb-6 shadow-sm border-blue-100 bg-blue-50/30">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Loại sản phẩm (Bắt buộc)</label>
            <Select
              className="w-full"
              placeholder="Chọn loại sản phẩm"
              value={productTypeId}
              onChange={(val) => {
                setProductTypeId(val);
                setSelectedProcessCodes([]); // Reset stages while loading new defaults
                setSelectedOrders([]);
                setSearchText("");
              }}
              options={(productTypes || []).map((pt: any) => ({
                label: pt.name,
                value: pt.product_type_id
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Công đoạn ghép (Bắt buộc)</label>
            <Select
              mode="multiple"
              className="w-full"
              placeholder="Chọn các công đoạn ghép (VD: PHU, CAN...)"
              value={selectedProcessCodes}
              onChange={(val) => {
                setSelectedProcessCodes(val);
                setSelectedOrders([]);
                setSearchText("");
              }}
              options={ALLOWED_PROCESS_CODES}
              allowClear
            />
          </div>
        </div>
      </Card>

      <Tabs activeKey={mode} renderTabBar={() => <></>}
        className="mb-6"
        items={[
          {
            key: "suggestions",
            label: "Gợi ý ghép đơn",
            children: (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Title level={4} className="!mb-0 text-gray-800">Danh sách gợi ý ghép đơn</Title>
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
                  dataSource={suggestions}
                  rowKey={(record, index) => index?.toString() || ""}
                  loading={isSuggestionsLoading}
                  pagination={{ pageSize: 10 }}
                  bordered
                  locale={{ emptyText: "Không có gợi ý ghép đơn nào cho loại sản phẩm này." }}
                />
              </div>
            )
          },
          {
            key: "manual",
            label: "Tự tạo lệnh ghép",
            children: (
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">

                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Title level={4} className="!mb-0 text-gray-800">Danh sách đơn hàng tiềm năng</Title>
                  <Button
                    type="primary"
                    icon={<ReloadOutlined />}
                    onClick={() => refetch()}
                    className="bg-blue-600 self-start sm:self-auto"
                  >
                    Tải lại danh sách
                  </Button>
                </div>

                {/* Bộ lọc tìm kiếm và sắp xếp */}
                <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:flex-1">
                    <Input
                      placeholder="Tìm kiếm theo mã đơn hoặc tên sản phẩm..."
                      prefix={<SearchOutlined className="text-gray-400" />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                      className="w-full"
                      size="large"
                    />
                  </div>
                  <div className="w-full md:w-80 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 shrink-0">Sắp xếp:</span>
                    <Select
                      value={sortBy}
                      onChange={(val) => setSortBy(val)}
                      className="w-full"
                      size="large"
                      options={[
                        { label: "Mới nhất (Mã đơn giảm)", value: "newest" },
                        { label: "Cũ nhất (Mã đơn tăng)", value: "oldest" },
                        { label: "Ngày giao gần nhất", value: "delivery_asc" },
                        { label: "Ngày giao xa nhất", value: "delivery_desc" },
                        { label: "Số lượng tăng dần", value: "qty_asc" },
                        { label: "Số lượng giảm dần", value: "qty_desc" },
                      ]}
                    />
                  </div>
                </div>

                <Table
                  rowSelection={rowSelection}
                  columns={columns}
                  dataSource={filteredAndSortedCandidates}
                  rowKey="order_id"
                  loading={isCandidatesLoading}
                  pagination={{ pageSize: 10 }}
                  bordered
                  locale={{
                    emptyText: searchText
                      ? "Không tìm thấy đơn hàng nào khớp với từ khóa tìm kiếm."
                      : "Không có đơn hàng nào thỏa mãn điều kiện lọc (cần cùng Product Type và cùng chứa các công đoạn đã chọn)."
                  }}
                  className="mb-6 shadow-sm"
                />

                <Card className="border-green-100 bg-green-50/30 shadow-sm mt-6">
                  <Title level={4} className="!mb-4 text-green-800">Xác nhận tạo lệnh ghép</Title>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày dự kiến sản xuất</label>
                      <DatePicker
                        className="w-40 [&_input]:text-right"
                        value={plannedStartDate}
                        onChange={setPlannedStartDate}
                        format="DD/MM/YYYY"
                        disabledDate={(current) => {
                          if (maxAllowedStartDate && current && current.isAfter(maxAllowedStartDate, "day")) {
                            return true;
                          }
                          return vietnamHolidaysDisabledDate(current);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
                      <Input.TextArea
                        rows={1}
                        placeholder="Nhập ghi chú cho lệnh ghép (nếu có)"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-green-200 pt-4 mt-2">
                    <div className="text-green-800">
                      Đã chọn <span className="font-bold text-lg">{selectedOrders.length}</span> đơn hàng để ghép.
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={handlePreviewManual}
                      loading={isPreviewLoading}
                      disabled={selectedOrders.length < 2 || !plannedStartDate || selectedProcessCodes.length === 0}
                      className="bg-green-600 hover:bg-green-700 border-none px-8"
                    >
                      Xem trước & Tạo
                    </Button>
                  </div>
                </Card>
              </div>
            )
          }
        ]}
      />

      <Modal
        title={<Title level={4}>Xác nhận Tạo Lệnh Ghép</Title>}
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
                  {previewData.selected_process_codes.map(code => (
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
              rowKey={(r, i) => `${r.dept_code}-${i}`}
              columns={[
                {
                  title: "Giai đoạn", dataIndex: "stage_type", key: "stage_type", render: (t) => {
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
                      {previewData.notes.map((note, index) => (
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
    (order: any) => order.status === "Scheduled" && order.is_production_ready === false
  ).length;

  const approvedCount = (apiData || []).filter(
    (order: any) =>
      order.status === "Scheduled" &&
      (order.production_approval_flow === "AUTO_SINGLE_OPTION" ||
        order.production_approval_flow === "MANUAL_MANAGER")
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

  const { data: candidatesData } = useQuery({
    queryKey: ["group-candidates", "all"],
    queryFn: async () => {
      try {
        const res = await groupProductionsApi.getGroupableOrders();
        const list = Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
        return list.filter((o: any) => o.can_group);
      } catch {
        return [];
      }
    },
  });

  const suggestionsCount = suggestionsData?.length || 0;
  const candidatesCount = candidatesData?.length || 0;

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
              if (suggestionsCount > 0) setActiveTab("suggestions");
            }}
          >
            <div className="bg-white p-2 rounded-full shadow-sm">
              <InfoCircleOutlined className={suggestionsCount > 0 ? "text-green-600 text-lg" : "text-gray-400 text-lg"} />
            </div>
            <div>
              <div className={`text-xs font-semibold uppercase tracking-wider ${suggestionsCount > 0 ? "text-green-600" : "text-gray-500"}`}>
                Gợi ý ghép lệnh
              </div>
              <div className={`text-sm font-medium ${suggestionsCount > 0 ? "text-green-800" : "text-gray-600"}`}>
                <span className="text-lg font-bold mr-1">{suggestionsCount}</span>
                cần xử lý
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
            key: "approved",
            label: (
              <span className="flex items-center gap-2">
                Đã duyệt lệnh sản xuất
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
            key: "suggestions",
            label: (
              <span className="flex items-center gap-2">
                Gợi ý ghép đơn
                <Badge count={suggestionsCount} showZero={false} size="small" color="green" />
              </span>
            ),
            children: <GroupProductionTab mode="suggestions" />,
          },
          {
            key: "manual",
            label: (
              <span className="flex items-center gap-2">
                Tự tạo lệnh ghép
                <Badge count={candidatesCount} showZero={false} size="small" color="purple" />
              </span>
            ),
            children: <GroupProductionTab mode="manual" />,
          },
        ]}
      />
    </div>
  );
}
