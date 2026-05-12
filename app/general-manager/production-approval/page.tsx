"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Table, Input, Tag, Modal, Spin, message, Tabs } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { orderApi } from "@/apiRequests/order";
import { productionsApi, ProductionReadiness } from "@/apiRequests/productions";
import { useSearchParams } from "next/navigation";

function ProductionApprovalContent() {
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
      productionMethod: string | null;
    }) =>
      productionsApi.updateProduction(orderId, {
        is_production_ready: true,
        gm_note: note,
        production_method: productionMethod,
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

  // ── Lọc đơn: LayoutPending / Scheduled và chưa is_production_ready ──────────
  const filteredOrders = (apiData || []).filter((order: any) => {
    const statusMatch =
      (order.status === "LayoutPending" || order.status === "Scheduled") &&
      order.is_production_ready === false;
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
      case "Scheduled":      return <Tag color="orange">Đã lên lịch</Tag>;
      case "LayoutPending":  return <Tag color="orange">Chờ duyệt layout</Tag>;
      case "InProcessing":   return <Tag color="blue">Đang sản xuất</Tag>;
      case "Finished":       return <Tag color="green">Hoàn thành</Tag>;
      case "Delivered":      return <Tag color="cyan">Đã giao</Tag>;
      case "Cancelled":      return <Tag color="red">Đã hủy</Tag>;
      default:               return <Tag>{status || "Mới"}</Tag>;
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
    { title: "Sản phẩm",   dataIndex: "product_name",  key: "product_name"  },
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
    {
      title: "Thao tác", key: "action", width: 180, align: "center" as const,
      render: (_: any, record: any) => (
        <button
          onClick={() => handleOpen(record.order_id || record._id)}
          disabled={record.status === "Finished" || record.status === "Delivered"}
          className="px-3 py-1 text-sm font-medium border border-amber-900 text-amber-900 rounded hover:bg-amber-50 disabled:opacity-50 disabled:border-gray-300 disabled:text-gray-400 transition-colors"
        >
          Trình duyệt SX
        </button>
      ),
    },
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
    onClick,
  }: {
    available: boolean;
    selected: boolean;
    label: string;
    desc: string;
    onClick?: () => void;
  }) => (
    <div
      onClick={available ? onClick : undefined}
      className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
        available
          ? selected
            ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/30 cursor-pointer scale-[1.01] shadow-sm"
            : "border-gray-200 bg-white hover:border-amber-400 hover:bg-amber-50/10 cursor-pointer"
          : "border-gray-150 bg-gray-50 opacity-45 cursor-not-allowed"
      }`}
    >
      <span
        className={`mt-0.5 text-lg transition-colors ${
          available ? (selected ? "text-amber-600 font-bold" : "text-gray-400") : "text-gray-300"
        }`}
      >
        {selected ? <CheckCircleOutlined /> : <InfoCircleOutlined />}
      </span>
      <div className="flex-1">
        <div
          className={`font-bold transition-colors ${
            available ? (selected ? "text-amber-800" : "text-gray-700") : "text-gray-400"
          }`}
        >
          {label}
        </div>
        <div className="text-sm text-gray-500 mt-0.5">{desc}</div>
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
    { title: "Mã VT",     dataIndex: "material_code", key: "material_code", width: 110 },
    { title: "Tên vật tư",dataIndex: "material_name", key: "material_name" },
    { title: "ĐV",        dataIndex: "unit",          key: "unit", width: 60, align: "center" as const },
    { title: "Yêu cầu",  dataIndex: "required_qty",  key: "required_qty",  align: "right" as const, render: (v: number) => <span className="font-semibold">{v?.toLocaleString("vi-VN")}</span> },
    { title: "Hiện có",  dataIndex: "available_qty",  key: "available_qty", align: "right" as const, render: (v: number) => v?.toLocaleString("vi-VN") },
    { title: "Còn thiếu",dataIndex: "missing_qty",    key: "missing_qty",   align: "right" as const, render: (v: number) => v > 0 ? <span className="text-red-500 font-bold">{v?.toLocaleString("vi-VN")}</span> : "-" },
    { title: "Trạng thái", key: "status", align: "center" as const, width: 120, render: (_: any, r: any) => r.is_enough ? <Tag color="success" className="mr-0">Đủ cấp</Tag> : <Tag color="error" className="mr-0">Chờ nhập kho</Tag> },
  ];

  const machineColumns = [
    { title: "Bước", dataIndex: "seq_num", key: "seq_num", width: 60, align: "center" as const, render: (v: number) => <span className="font-bold text-gray-500">{v}</span> },
    { title: "Quy trình", dataIndex: "process_name", key: "process_name" },
    { title: "Mã máy",   dataIndex: "machine_code",  key: "machine_code",  render: (v: string) => v ? <Tag color="blue" className="font-mono text-sm mr-0">{v}</Tag> : <span className="italic text-gray-400">Không tìm thấy</span> },
    { title: "Năng lực (rảnh/tổng)", key: "capacity", align: "center" as const, render: (_: any, r: any) => r.machine_found ? <span><span className={r.free_quantity > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{r.free_quantity}</span><span className="text-gray-300 mx-1">/</span><span className="font-medium">{r.total_quantity}</span></span> : "-" },
    { title: "Đánh giá", key: "avail", align: "center" as const, width: 160, render: (_: any, r: any) => !r.machine_found ? <Tag color="error" className="mr-0">Lỗi cấu hình</Tag> : !r.is_available ? <Tag color="warning" className="mr-0">Quá tải</Tag> : <Tag color="success" className="mr-0">Sẵn sàng</Tag> },
  ];

  /* ── Render ────────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Duyệt lệnh sản xuất</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-amber-900 text-white rounded-lg hover:bg-amber-800 shadow-sm transition-colors font-medium"
        >
          <ReloadOutlined /> Làm mới
        </button>
      </div>

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
              disabled={!anyOption || approveMutation.isPending}
              onClick={() =>
                selectedOrderId &&
                approveMutation.mutate({
                  orderId: selectedOrderId,
                  note: gmNote,
                  productionMethod: selectedMethod,
                })
              }
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-colors ${
                anyOption && !approveMutation.isPending
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
                    onClick={() => handleSelectMethod("NVL")}
                  />
                  <OptionBadge
                    available={canSub}
                    selected={selectedMethod === "SUB"}
                    label="SUB – Dùng bán thành phẩm"
                    desc={`Dùng bán thành phẩm có sẵn.`}
                    onClick={() => handleSelectMethod("SUB")}
                  />
                  <OptionBadge
                    available={canBoth}
                    selected={selectedMethod === "BOTH"}
                    label="BOTH – Kết hợp SUB + NVL"
                    desc="Dùng bán thành phẩm trước, sản xuất thêm phần còn thiếu."
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
                                      { label: "Loại sản phẩm",          value: statusData.matched_sub_product.product_type_name },
                                      { label: "Số lượng hiện có",        value: (statusData.matched_sub_product.quantity || 0).toLocaleString("vi-VN") },
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

export default function ProductionApprovalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[80vh]">
          <Spin size="large" />
        </div>
      }
    >
      <ProductionApprovalContent />
    </Suspense>
  );
}