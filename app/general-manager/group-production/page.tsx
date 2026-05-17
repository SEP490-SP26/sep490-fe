"use client";

import { ISuggestionItem, groupProductionsApi } from "@/apiRequests/groupProductions";
import { productTypesApi } from "@/apiRequests/producttypes";
import { InfoCircleOutlined, PlayCircleOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, DatePicker, Input, message, Select, Table, Tag, Typography, Modal, Descriptions, Divider } from "antd";
import dayjs from "dayjs";
import React, { useState, useMemo, useEffect } from "react";
import { ProductTemplate } from "@/apiRequests/producttypes";
import { disabledDate as disablePastAndHolidays } from "@/utils/vietnamHolidays";

const { Title, Text } = Typography;

const ALLOWED_PROCESS_CODES = [
  { label: "Phủ (PHU)", value: "PHU" },
  { label: "Cán (CAN)", value: "CAN" },
  { label: "Bồi (BOI)", value: "BOI" },
  { label: "Bế (BE)", value: "BE" },
  { label: "Dứt (DUT)", value: "DUT" },
  { label: "Dán (DAN)", value: "DAN" },
];

export default function GroupProductionPage() {
  const [productTypeId, setProductTypeId] = useState<number | null>(null);
  const [selectedProcessCodes, setSelectedProcessCodes] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<ISuggestionItem | null>(null);
  const [plannedStartDate, setPlannedStartDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [note, setNote] = useState("");
  const [searchText, setSearchText] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

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

  const { data: suggestions, isLoading: isSuggestionsLoading, refetch } = useQuery({
    queryKey: ["group-suggestions", productTypeId],
    queryFn: async () => {
      if (!productTypeId) return [];
      const res = await groupProductionsApi.getSuggestions(productTypeId);
      return Array.isArray(res) ? res : (Array.isArray((res as any)?.data) ? (res as any).data : []);
    },
    enabled: !!productTypeId,
  });

  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];

    let result = [...suggestions];

    // Search filter: department name or reason
    if (searchText.trim()) {
      const term = searchText.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.department_name?.toLowerCase().includes(term) ||
          s.reason?.toLowerCase().includes(term)
      );
    }

    // Filter by selected process codes (suggestion must contain all selected codes)
    if (selectedProcessCodes.length > 0) {
      result = result.filter((s) =>
        selectedProcessCodes.every((code) => s.suggest_process.includes(code))
      );
    }

    // Sort by number of orders descending
    result.sort((a, b) => b.suggest_order.length - a.suggest_order.length);

    return result;
  }, [suggestions, searchText, selectedProcessCodes]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSuggestion) throw new Error("Vui lòng chọn một gợi ý để ghép.");
      if (!plannedStartDate) throw new Error("Vui lòng chọn ngày dự kiến bắt đầu.");

      await groupProductionsApi.confirmProduceOrder({
        order_ids: selectedSuggestion.suggest_order,
        process_codes: selectedSuggestion.suggest_process,
        planned_start_date: plannedStartDate.toISOString(),
        note: note,
      });
    },
    onSuccess: () => {
      message.success("Đã tạo lệnh sản xuất ghép thành công!");
      setSelectedSuggestion(null);
      setNote("");
      setIsReviewModalOpen(false);
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || error.message || "Có lỗi xảy ra.");
    }
  });

  const rowSelection = {
    type: 'radio' as const,
    selectedRowKeys: selectedSuggestion ? [selectedSuggestion.reason + selectedSuggestion.suggest_order.join(",")] : [],
    onChange: (selectedRowKeys: React.Key[], selectedRows: ISuggestionItem[]) => {
      setSelectedSuggestion(selectedRows[0]);
    },
  };

  const columns = [
    {
      title: "Danh sách Đơn hàng",
      dataIndex: "suggest_order",
      key: "suggest_order",
      render: (orders: number[]) => (
        <div className="flex flex-wrap gap-1">
          {orders.map(id => (
            <Tag key={id} color="cyan">#{id}</Tag>
          ))}
        </div>
      )
    },
    {
      title: "Công đoạn",
      dataIndex: "suggest_process",
      key: "suggest_process",
      render: (processes: string[]) => (
        <div className="flex flex-wrap gap-1">
          {processes.map(code => (
            <Tag key={code} color="blue">{code}</Tag>
          ))}
        </div>
      )
    },
    {
      title: "Phòng ban",
      dataIndex: "department_name",
      key: "department_name",
    },
    {
      title: "Lý do / Gợi ý",
      dataIndex: "reason",
      key: "reason",
      render: (text: string) => <span className="text-gray-600">{text}</span>
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[80vh] p-6">
      <div className="mb-6 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <Title level={3} className="!mb-1 text-gray-800">Tạo lệnh sản xuất ghép (Từ gợi ý)</Title>
          <Text type="secondary">Chọn loại sản phẩm để xem các gợi ý ghép đơn hàng tối ưu.</Text>
        </div>
      </div>

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
                setSelectedProcessCodes([]);
                setSelectedSuggestion(null);
                setSearchText("");
              }}
              options={(productTypes || []).map((pt: any) => ({
                label: pt.name,
                value: pt.product_type_id
              }))}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Lọc theo Công đoạn</label>
            <Select
              mode="multiple"
              className="w-full"
              placeholder="Lọc các gợi ý có chứa công đoạn này"
              value={selectedProcessCodes}
              onChange={(val) => {
                setSelectedProcessCodes(val);
                setSelectedSuggestion(null);
              }}
              options={ALLOWED_PROCESS_CODES}
              allowClear
            />
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Title level={4} className="!mb-0 text-gray-800">Danh sách gợi ý ghép đơn</Title>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          className="bg-blue-600 self-start sm:self-auto"
          disabled={!productTypeId}
        >
          Tải lại gợi ý
        </Button>
      </div>

      <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full">
          <Input
            placeholder="Tìm kiếm theo phòng ban hoặc lý do..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            className="w-full"
            size="large"
            disabled={!productTypeId}
          />
        </div>
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={filteredSuggestions}
        rowKey={(record) => record.reason + record.suggest_order.join(",")}
        loading={isSuggestionsLoading}
        pagination={{ pageSize: 10 }}
        bordered
        locale={{
          emptyText: !productTypeId 
            ? "Vui lòng chọn loại sản phẩm để xem gợi ý."
            : "Không tìm thấy gợi ý nào phù hợp."
        }}
        className="mb-6 shadow-sm"
      />

      <Card className="border-green-100 bg-green-50/30 shadow-sm">
        <Title level={4} className="!mb-4 text-green-800">Xác nhận tạo lệnh ghép</Title>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày dự kiến bắt đầu</label>
            <DatePicker
              className="w-full"
              value={plannedStartDate}
              onChange={setPlannedStartDate}
              format="DD/MM/YYYY"
              disabledDate={disablePastAndHolidays}
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
            {selectedSuggestion ? (
              <span>
                Đã chọn gợi ý gồm <span className="font-bold text-lg">{selectedSuggestion.suggest_order.length}</span> đơn hàng.
              </span>
            ) : (
              "Vui lòng chọn một gợi ý từ bảng."
            )}
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={() => setIsReviewModalOpen(true)}
            loading={createMutation.isPending}
            disabled={!selectedSuggestion || !plannedStartDate}
            className="bg-green-600 hover:bg-green-700 border-none px-8"
          >
            Tạo Lệnh Ghép
          </Button>
        </div>
      </Card>

      <Modal
        title={<Title level={4}>Xác nhận Tạo Lệnh Ghép</Title>}
        open={isReviewModalOpen}
        onOk={() => createMutation.mutate()}
        onCancel={() => setIsReviewModalOpen(false)}
        confirmLoading={createMutation.isPending}
        okText="Xác nhận Tạo"
        cancelText="Hủy"
        width={600}
        okButtonProps={{ className: "bg-green-600 hover:bg-green-700" }}
      >
        <div className="py-2">
          <Descriptions title="Thông tin chung" bordered column={1} size="small">
            <Descriptions.Item label="Sản phẩm">{productTypes?.find((pt: any) => pt.product_type_id === productTypeId)?.name || "N/A"}</Descriptions.Item>
            <Descriptions.Item label="Ngày bắt đầu">{plannedStartDate?.format("DD/MM/YYYY")}</Descriptions.Item>
            <Descriptions.Item label="Công đoạn ghép">
              {selectedSuggestion?.suggest_process.map(code => (
                <Tag key={code} color="blue">{code}</Tag>
              ))}
            </Descriptions.Item>
            <Descriptions.Item label="Phòng ban">{selectedSuggestion?.department_name}</Descriptions.Item>
            <Descriptions.Item label="Ghi chú">{note || "(Không có)"}</Descriptions.Item>
          </Descriptions>

          <Divider>Danh sách đơn hàng ({selectedSuggestion?.suggest_order.length})</Divider>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedSuggestion?.suggest_order.map(id => (
              <Tag key={id} color="cyan">Đơn #{id}</Tag>
            ))}
          </div>
          
          <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="text-blue-800 flex items-start gap-2">
              <InfoCircleOutlined className="mt-1" />
              <div>
                <p className="font-semibold mb-1">Kiểm tra kỹ trước khi xác nhận:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Lệnh ghép sẽ được tạo cho {selectedSuggestion?.suggest_order.length} đơn hàng đã chọn.</li>
                  <li>Các đơn hàng sẽ cùng trải qua các công đoạn: {selectedSuggestion?.suggest_process.join(", ")}.</li>
                  <li>Ngày dự kiến bắt đầu sản xuất là {plannedStartDate?.format("DD/MM/YYYY")}.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
