"use client";

import { GroupableOrder, groupProductionsApi, ISuggestionGroup, IPreview } from "@/apiRequests/groupProductions";
import { productTypesApi } from "@/apiRequests/producttypes";
import { InfoCircleOutlined, PlayCircleOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, DatePicker, Input, message, Select, Table, Tag, Typography, Modal, Descriptions, Divider, Tabs } from "antd";
import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { ProductTemplate } from "@/apiRequests/producttypes";
import { disabledDate as vietnamHolidaysDisabledDate } from "@/utils/vietnamHolidays";

const { Title, Text } = Typography;

const ALLOWED_PROCESS_CODES = [
  { label: "Phủ (PHU)", value: "PHU" },
  { label: "Cán (CAN)", value: "CAN" },
  { label: "Bồi (BOI)", value: "BOI" },
];

export default function GroupProductionPage() {
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[80vh] p-6">
      <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <Title level={3} className="!mb-1 text-gray-800">Tạo lệnh sản xuất ghép</Title>
          <Text type="secondary">Chọn loại sản phẩm và các công đoạn để lọc danh sách đơn hàng tiềm năng.</Text>
        </div>
      </div>

      <Card className="mb-6 shadow-sm border-blue-100 bg-blue-50/30">
        <div className="w-full md:w-1/2">
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
      </Card>

      <Tabs
        defaultActiveKey="suggestions"
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
                <div className="mb-6">
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
