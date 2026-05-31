"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Table, Input, Tag, Modal, Spin, message, Radio, Select, Alert } from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { orderApi } from "@/apiRequests/order";
import { productionsApi, ProductionReadiness, ProductionMethod } from "@/apiRequests/productions";
import { subProductsApi, SubProduct } from "@/apiRequests/subproducts";
import { useSearchParams } from "next/navigation";

function ProductionMethodContent() {
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [method, setMethod] = useState<ProductionMethod>("NVL");
  const [mgrNote, setMgrNote] = useState("");
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);

  // ── Danh sách đơn chờ manager duyệt (is_production_ready = false, đã có gm_note) ─
  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ["orders", "manager-method-list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 100);
        return Array.isArray(response.data) ? response.data : [];
      } catch {
        return [];
      }
    },
  });

  // ── GET start-ready để hiển thị thông tin phương án ─────────────────────────
  const { data: statusData, isLoading: isChecking } = useQuery<ProductionReadiness | null>({
    queryKey: ["production-start-ready-mgr", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      try {
        const res = await productionsApi.startReady(selectedOrderId);
        return res?.data ?? (res as any);
      } catch (err) {
        console.error("Lỗi khi lấy phương án:", err);
        return null;
      }
    },
    enabled: !!selectedOrderId && isModalVisible,
  });

  const { data: subProductsData } = useQuery({
    queryKey: ["sub-products"],
    queryFn: async () => {
      try {
        const res = await subProductsApi.getPaged(1, 500, true, false);
        return res?.data?.data || [];
      } catch {
        return [];
      }
    },
    enabled: isModalVisible,
  });

  const gmRecommendedMethod = statusData?.gm_proposed_method || statusData?.proposed_production_method || statusData?.production_method || null;

  useEffect(() => {
    if (gmRecommendedMethod) {
      if (gmRecommendedMethod === "NVL" && statusData?.can_use_nvl) {
        setMethod("NVL");
      } else if (gmRecommendedMethod === "SUB" && statusData?.can_use_sub) {
        setMethod("SUB");
      } else if (gmRecommendedMethod === "BOTH" && statusData?.can_use_both) {
        setMethod("BOTH");
      }
    }

    if (statusData) {
      const defaultSubId = statusData.selected_sub_product_id ?? statusData.matched_sub_product?.sub_product_id ?? statusData.matched_sub_product?.id ?? null;
      if (defaultSubId && !selectedSubId) {
        setSelectedSubId(defaultSubId);
      }
    }
  }, [gmRecommendedMethod, statusData]);

  // ── POST production-method ───────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrderId || !statusData) throw new Error("Thiếu dữ liệu");

      if ((method === "SUB" || method === "BOTH") && !selectedSubId) {
        throw new Error("Vui lòng chọn Bán thành phẩm (sub_id).");
      }

      const is_full_process: boolean | null =
        method === "NVL" ? true :
          method === "SUB" ? false :
            null; // BOTH

      return productionsApi.productionMethod({
        order_id: selectedOrderId,
        production_method: method,
        is_full_process,
        sub_id: method === "NVL" ? null : selectedSubId,
        mgr_note: mgrNote,
      });
    },
    onSuccess: (res) => {
      message.success("Đã duyệt phương thức sản xuất thành công!");

      const responseData = res?.data as any;
      if (responseData && method === "BOTH") {
        Modal.success({
          title: 'Thông tin sản xuất (BOTH)',
          content: (
            <div>
              <p>Số lượng BTP đã dùng: <strong>{responseData.sub_product_used_qty?.toLocaleString("vi-VN")}</strong></p>
              <p>Số lượng sản xuất từ NVL: <strong>{responseData.nvl_qty?.toLocaleString("vi-VN")}</strong></p>
            </div>
          )
        });
      }

      setIsModalVisible(false);
      setMgrNote("");
      setSelectedSubId(null);
      refetch();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.message || error.message;
      if (errorMsg && errorMsg.includes("Số lượng bán thành phẩm đã đủ. Vui lòng chọn SUB thay vì BOTH")) {
        Modal.confirm({
          title: "Gợi ý chuyển phương thức",
          content: "Số lượng bán thành phẩm đã đủ cho đơn hàng này. Bạn có muốn tự động chuyển sang phương thức SUB không?",
          okText: "Đồng ý (Chuyển sang SUB)",
          cancelText: "Hủy",
          onOk: () => {
            setMethod("SUB");
          }
        });
      } else {
        message.error(errorMsg || "Có lỗi xảy ra khi duyệt phương thức sản xuất.");
      }
    },
  });

  // Lọc đơn: Chỉ hiện những order có status là Scheduled, gm_proposed_method !== null và production_method === null
  const filteredOrders = (apiData || []).filter((order: any) => {
    const isValidOrder = order.status === "Scheduled" && order.production_method === null && order.gm_proposed_method !== null;
    const searchMatch =
      order.customer_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchText.toLowerCase());
    return isValidOrder && searchMatch;
  });

  const handleOpen = (orderId: number) => {
    setSelectedOrderId(orderId);
    setMethod("NVL");
    setMgrNote("");
    setIsModalVisible(true);
  };

  const handleClose = () => {
    setIsModalVisible(false);
    setSelectedOrderId(null);
    setMgrNote("");
  };

  const canNvl = !!statusData?.can_use_nvl;
  const canSub = !!statusData?.can_use_sub;
  const canBoth = !!statusData?.can_use_both;

  const selectedOrder = (apiData || []).find((o: any) => o.order_id === selectedOrderId || o._id === selectedOrderId);
  const isOrderDisabled = selectedOrder
    ? ["InProcessing", "Importing", "Delivery", "Delivered", "Completed", "Finished"].includes(selectedOrder.status)
    : false;

  const orderQuantity = statusData?.order_quantity || 0;
  const productTypeId = statusData?.product_type_id;

  const filteredSubProducts = (subProductsData || [])
    .filter((sp: SubProduct) => sp.product_type_id === productTypeId && sp.quantity > 0)
    .sort((a: SubProduct, b: SubProduct) => {
      if (method === "SUB") {
        const aEnough = a.quantity >= orderQuantity ? 1 : 0;
        const bEnough = b.quantity >= orderQuantity ? 1 : 0;
        if (aEnough !== bEnough) return bEnough - aEnough;
      }
      return b.quantity - a.quantity;
    });

  const selectedSubProduct = filteredSubProducts.find((sp: SubProduct) => sp.id === selectedSubId)
    || statusData?.matched_sub_product;

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
      render: (t: string) => <span className="font-semibold text-blue-600">{t}</span>,
    },
    { title: "Khách hàng", dataIndex: "customer_name", key: "customer_name" },
    { title: "Sản phẩm", dataIndex: "product_name", key: "product_name" },
    {
      title: "Số lượng", dataIndex: "quantity", key: "quantity", align: "right" as const,
      render: (val: number) => <span className="font-medium">{val?.toLocaleString("vi-VN")}</span>,
    },

    {
      title: "Trạng thái", dataIndex: "status", key: "status",
      render: (s: string) => getStatusTag(s),
    },
    {
      title: "Ngày giao", dataIndex: "delivery_date", key: "delivery_date",
      render: (d: string) => d ? new Date(d).toLocaleDateString("vi-VN") : "N/A",
    },
    {
      title: "Thao tác", key: "action", width: 200, align: "center" as const,
      render: (_: any, record: any) => (
        <button
          onClick={() => handleOpen(record.order_id || record._id)}
          className="px-3 py-1 text-sm font-medium border border-blue-800 text-blue-800 rounded hover:bg-blue-50 transition-colors"
        >
          Chọn phương thức SX
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

  /* ── Material table columns ────────────────────────────────────────────────── */
  const materialCols = [
    { title: "Mã VT", dataIndex: "material_code", key: "material_code", width: 110 },
    { title: "Tên vật tư", dataIndex: "material_name", key: "material_name" },
    { title: "ĐV", dataIndex: "unit", key: "unit", width: 60, align: "center" as const },
    { title: "Yêu cầu", dataIndex: "required_qty", key: "required_qty", align: "right" as const, render: (v: number) => <span className="font-semibold">{v?.toLocaleString("vi-VN")}</span> },
    { title: "Hiện có", dataIndex: "available_qty", key: "available_qty", align: "right" as const, render: (v: number) => v?.toLocaleString("vi-VN") },
    { title: "Còn thiếu", dataIndex: "missing_qty", key: "missing_qty", align: "right" as const, render: (v: number) => v > 0 ? <span className="text-red-500 font-bold">{v?.toLocaleString("vi-VN")}</span> : "-" },
    { title: "Tình trạng", key: "st", align: "center" as const, width: 120, render: (_: any, r: any) => r.is_enough ? <Tag color="success" className="mr-0">Đủ cấp</Tag> : <Tag color="error" className="mr-0">Chờ nhập kho</Tag> },
  ];

  /* ── Method description helper ─────────────────────────────────────────────── */
  const methodDescriptions: Record<ProductionMethod, { color: string; title: string; desc: string }> = {
    NVL: {
      color: "green",
      title: "NVL – Sản xuất toàn bộ từ nguyên vật liệu",
      desc: `Toàn bộ ${statusData?.nvl_qty?.toLocaleString("vi-VN") ?? "–"} sản phẩm được sản xuất từ đầu.`,
    },
    SUB: {
      color: "blue",
      title: "SUB – Dùng bán thành phẩm (đủ số lượng)",
      desc: "Bán thành phẩm đã đủ; các công đoạn trước product_process sẽ được đánh dấu Finished.",
    },
    BOTH: {
      color: "purple",
      title: "BOTH – Kết hợp bán thành phẩm + NVL",
      desc: "Dùng bán thành phẩm trước, phần thiếu sản xuất thêm bằng NVL. Công đoạn ≤ product_process chỉ chạy theo tỷ lệ nvl_qty / order_quantity. is_full_process = null.",
    },
  };

  const currentDesc = method ? methodDescriptions[method] : null;

  /* ── Render ────────────────────────────────────────────────────────────────── */
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Duyệt phương thức sản xuất</h1>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 shadow-sm transition-colors font-medium"
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
            Tổng số: <span className="font-bold text-blue-700">{filteredOrders.length}</span> đơn (Đã được GM trình duyệt)
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
          scroll={{ x: 1000 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
        />
      </div>

      {/* Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-blue-600" />
            <span>Chọn phương thức sản xuất</span>
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
              disabled={approveMutation.isPending || isOrderDisabled}
              onClick={() => approveMutation.mutate()}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium shadow-sm transition-colors ${!approveMutation.isPending && !isOrderDisabled
                ? "bg-blue-800 hover:bg-blue-900"
                : "bg-gray-400 cursor-not-allowed opacity-80"
                }`}
            >
              {approveMutation.isPending && <Spin size="small" />}
              Xác nhận phương thức {method}
            </button>
          </div>
        }
      >
        <div className="py-4">
          {isOrderDisabled && (
            <Alert
              message="Không thể thay đổi phương thức"
              description="Đơn hàng đang hoặc đã trong quá trình sản xuất (InProcessing, Importing, Delivery, Completed, v.v.). UI thay đổi phương thức đã bị vô hiệu hóa."
              type="warning"
              showIcon
              className="mb-6"
            />
          )}

          {isChecking ? (
            <div className="flex flex-col items-center justify-center p-10 space-y-4">
              <Spin size="large" />
              <div className="text-gray-500">Đang tải thông tin phương án...</div>
            </div>
          ) : statusData ? (
            <div className="space-y-6">

              {/* ── 1. Chọn phương thức ── */}
              <div className={isOrderDisabled ? "opacity-60 pointer-events-none" : ""}>
                <h3 className="text-base font-bold text-gray-800 mb-3 border-l-4 border-blue-500 pl-2">
                  Phương thức sản xuất
                </h3>
                <Radio.Group
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full"
                  disabled={isOrderDisabled}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    {/* NVL */}
                    <label
                      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${method === "NVL"
                        ? "border-green-500 bg-green-50/70 shadow-sm"
                        : gmRecommendedMethod === "NVL"
                          ? "border-amber-400 bg-amber-50/30 hover:border-green-400"
                          : canNvl
                            ? "border-gray-200 hover:border-green-300"
                            : "border-gray-100 bg-gray-50 opacity-40 pointer-events-none"
                        } ${gmRecommendedMethod === "NVL" ? "ring-2 ring-amber-400/20" : ""}`}
                    >
                      <Radio value="NVL" disabled={!canNvl} className="mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                          <span>NVL – Sản xuất toàn bộ từ nguyên vật liệu</span>
                          {!canNvl && <Tag color="default" className="text-xs mr-0">Không khả dụng</Tag>}
                          {gmRecommendedMethod === "NVL" && (
                            <Tag color="warning" className="text-xs font-semibold px-2 py-0.5 mr-0">
                              ★ GM Đề Xuất
                            </Tag>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          Sản xuất sản phẩm từ đầu.
                        </div>
                        {statusData.nvl_estimated_total_cost != null && (
                          <div className="text-sm font-medium text-green-700 mt-1 bg-green-50/50 p-1 px-2 rounded border border-green-200 inline-block">
                            Tổng tiền: {statusData.nvl_estimated_total_cost.toLocaleString("vi-VN")} VNĐ
                          </div>
                        )}
                      </div>
                    </label>

                    {/* SUB */}
                    <label
                      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${method === "SUB"
                        ? "border-blue-500 bg-blue-50/70 shadow-sm"
                        : gmRecommendedMethod === "SUB"
                          ? "border-amber-400 bg-amber-50/30 hover:border-blue-400"
                          : canSub
                            ? "border-gray-200 hover:border-blue-300"
                            : "border-gray-100 bg-gray-50 opacity-40 pointer-events-none"
                        } ${gmRecommendedMethod === "SUB" ? "ring-2 ring-amber-400/20" : ""}`}
                    >
                      <Radio value="SUB" disabled={!canSub} className="mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                          <span>SUB – Dùng bán thành phẩm (đủ số lượng)</span>
                          {!canSub && <Tag color="default" className="text-xs mr-0">Không khả dụng</Tag>}
                          {gmRecommendedMethod === "SUB" && (
                            <Tag color="warning" className="text-xs font-semibold px-2 py-0.5 mr-0">
                              ★ GM Đề Xuất
                            </Tag>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          Bán thành phẩm đủ số lượng.{" "}
                        </div>
                        {statusData.sub_estimated_total_cost != null && (
                          <div className="text-sm font-medium text-blue-700 mt-1 mb-1 bg-blue-50/50 p-1 px-2 rounded border border-blue-200 inline-block">
                            Tổng tiền: {statusData.sub_estimated_total_cost.toLocaleString("vi-VN")} VNĐ
                          </div>
                        )}
                        {statusData.has_matched_sub_product && statusData.matched_sub_product && (
                          <div className="text-xs text-blue-600 mt-1">
                            Sub ID: <strong>{statusData.selected_sub_product_id ?? statusData.matched_sub_product?.sub_product_id ?? statusData.matched_sub_product?.id}</strong> —{" "}
                            {statusData.matched_sub_product.product_type_name} <br />
                            Yêu cầu: <strong>{statusData.order_quantity?.toLocaleString("vi-VN")}</strong> / Hiện có: <strong>{statusData.matched_sub_product.quantity?.toLocaleString("vi-VN")}</strong>
                          </div>
                        )}
                      </div>
                    </label>

                    {/* BOTH */}
                    <label
                      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${method === "BOTH"
                        ? "border-purple-500 bg-purple-50/70 shadow-sm"
                        : gmRecommendedMethod === "BOTH"
                          ? "border-amber-400 bg-amber-50/30 hover:border-purple-400"
                          : canBoth
                            ? "border-gray-200 hover:border-purple-300"
                            : "border-gray-100 bg-gray-50 opacity-40 pointer-events-none"
                        } ${gmRecommendedMethod === "BOTH" ? "ring-2 ring-amber-400/20" : ""}`}
                    >
                      <Radio value="BOTH" disabled={!canBoth} className="mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800 flex items-center gap-2 flex-wrap">
                          <span>BOTH – Kết hợp bán thành phẩm + NVL</span>
                          {!canBoth && <Tag color="default" className="text-xs mr-0">Không khả dụng</Tag>}
                          {gmRecommendedMethod === "BOTH" && (
                            <Tag color="warning" className="text-xs font-semibold px-2 py-0.5 mr-0">
                              ★ GM Đề Xuất
                            </Tag>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-0.5">
                          Dùng bán thành phẩm trước, sản xuất thêm phần thiếu bằng NVL.
                        </div>
                        {statusData.both_estimated_total_cost != null && (
                          <div className="text-sm font-medium text-purple-700 mt-1 mb-1 bg-purple-50/50 p-1 px-2 rounded border border-purple-200 inline-block">
                            Tổng tiền: {statusData.both_estimated_total_cost.toLocaleString("vi-VN")} VNĐ
                          </div>
                        )}
                        {statusData.has_matched_sub_product && statusData.matched_sub_product && (
                          <div className="text-xs text-purple-600 mt-1">
                            Sub ID: <strong>{statusData.selected_sub_product_id ?? statusData.matched_sub_product?.sub_product_id ?? statusData.matched_sub_product?.id}</strong> —{" "}
                            {statusData.matched_sub_product.product_type_name} <br />
                            Yêu cầu: <strong>{statusData.order_quantity?.toLocaleString("vi-VN")}</strong> / Hiện có: <strong>{statusData.matched_sub_product.quantity?.toLocaleString("vi-VN")}</strong>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </Radio.Group>
              </div>

              {/* ── 2. Chọn Bán thành phẩm ── */}
              {(method === "SUB" || method === "BOTH") && (
                <div className={isOrderDisabled ? "opacity-60 pointer-events-none" : ""}>
                  <h3 className="text-base font-bold text-gray-800 mb-3 border-l-4 border-blue-400 pl-2">
                    Chọn Bán thành phẩm
                  </h3>
                  <Select
                    value={selectedSubId}
                    onChange={(val) => setSelectedSubId(val)}
                    placeholder="Chọn bán thành phẩm"
                    className="w-full mb-4"
                    disabled={isOrderDisabled}
                    options={filteredSubProducts.map((sp: SubProduct) => ({
                      value: sp.id,
                      label: `ID: ${sp.id} - ${sp.product_type_name} (Có sẵn: ${sp.quantity?.toLocaleString("vi-VN")} cái) - Kích thước: ${sp.width}x${sp.length}mm`,
                    }))}
                    showSearch
                    optionFilterProp="label"
                  />

                  {selectedSubProduct && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Loại sản phẩm", value: selectedSubProduct.product_type_name },
                        { label: "Số lượng hiện có", value: (selectedSubProduct.quantity || 0).toLocaleString("vi-VN") },
                        { label: "Kích thước (Rộng × Dài)", value: `${selectedSubProduct.width} × ${selectedSubProduct.length} mm` },
                        { label: "Công đoạn đã hoàn thành", value: selectedSubProduct.product_process },
                      ].map((item) => (
                        <div key={item.label} className="flex flex-col gap-1 p-3 bg-gray-50 rounded border border-gray-200">
                          <span className="text-gray-500 text-xs">{item.label}</span>
                          <span className="font-semibold text-gray-800 text-sm">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── 3. Vật tư NVL ── */}
              {(method === "NVL" || method === "BOTH") && (statusData.materials || []).length > 0 && (
                <div>
                  <h3 className="text-base font-bold text-gray-800 mb-3 border-l-4 border-green-400 pl-2">
                    {method === "BOTH" ? "Vật tư phần NVL cần thêm (BOTH)" : "Bảng phân bổ nguyên vật liệu (NVL)"}
                  </h3>
                  <Table
                    dataSource={
                      method === "BOTH"
                        ? (statusData.remaining_materials_for_both || statusData.materials)
                        : statusData.materials
                    }
                    rowKey="material_code"
                    pagination={false}
                    size="small"
                    bordered
                    columns={materialCols}
                  />
                </div>
              )}

              {/* ── 4. Ghi chú của GM ── */}
              {statusData && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                  <div className="font-semibold text-amber-800 mb-1">
                    <InfoCircleOutlined className="mr-1" /> Ghi chú từ General Manager:
                  </div>
                  <div className="text-gray-700 italic">
                    {statusData.gm_note || "Không có ghi chú."}
                  </div>
                </div>
              )}

              {/* ── 5. Ghi chú Manager ── */}
              <div className={isOrderDisabled ? "opacity-60 pointer-events-none" : ""}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Ghi chú của Manager (mgr_note)
                </label>
                <textarea
                  rows={3}
                  value={mgrNote}
                  onChange={(e) => setMgrNote(e.target.value)}
                  disabled={isOrderDisabled}
                  placeholder={
                    method === "NVL" ? "Ví dụ: Duyệt sản xuất bằng NVL." :
                      method === "SUB" ? "Ví dụ: Duyệt dùng bán thành phẩm." :
                        "Ví dụ: Duyệt kết hợp sub_product và NVL."
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

            </div>
          ) : (
            <div className="text-center text-red-500 p-8 font-bold border border-red-200 bg-red-50 rounded-xl">
              Không thể tải thông tin phương án sản xuất. Vui lòng thử lại.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function ProductionMethodPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[80vh]">
          <Spin size="large" />
        </div>
      }
    >
      <ProductionMethodContent />
    </Suspense>
  );
}
