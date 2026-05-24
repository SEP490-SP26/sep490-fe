"use client";

import React, { useMemo, useState, Suspense } from "react";
import {
  Table,
  Button,
  Spin,
  message,
  Modal,
  Space,
  Input
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined, CheckCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { subProductsApi, SubProduct } from "@/apiRequests/subproducts";
import { useQuery, useMutation } from "@tanstack/react-query";

function SubProductsImportContent() {
  const [keyword, setKeyword] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);

  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ["subproducts", "import-list"],
    queryFn: async () => {
      try {
        const response = await subProductsApi.getPaged(1, 1000, false, false);
        return response.data || [];
      } catch (error) {
        console.error("Error fetching subproducts:", error);
        return [];
      }
    },
  });

  const generateImportMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      return await subProductsApi.generateImportReceipts(ids);
    },
    onSuccess: (response: any) => {
      message.success("Tạo phiếu nhập kho thành công!");
      
      const paths = response?.data || response; // Assuming it returns array of strings or object with array
      if (Array.isArray(paths) && paths.length > 0) {
        // If it returns multiple PDFs or a single zip/pdf
        const urls = typeof paths[0] === 'string' ? paths : paths.map((p: any) => p.import_recieve_path || p.path).filter(Boolean);
        if (urls.length > 0) {
          setPdfUrls(urls);
          setIsModalVisible(true);
        }
      } else if (response?.data?.import_recieve_path || response?.import_recieve_path) {
        setPdfUrls([response?.data?.import_recieve_path || response?.import_recieve_path]);
        setIsModalVisible(true);
      } else if (typeof response?.data === 'string') {
        setPdfUrls([response?.data]);
        setIsModalVisible(true);
      }

      setSelectedRowKeys([]);
      refetch();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || "Có lỗi xảy ra khi tạo phiếu nhập kho.");
    }
  });

  const filteredData = useMemo(() => {
    return (apiData || []).filter((item: SubProduct) => {
      if (item.import_file !== null) return false;
      return keyword
        ? item.product_type_name?.toLowerCase().includes(keyword.toLowerCase()) ||
          item.id.toString().includes(keyword)
        : true;
    });
  }, [apiData, keyword]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const columns: ColumnsType<SubProduct> = [
    {
      title: "Mã ID",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (text) => <span className="font-semibold text-blue-600">#{text}</span>,
    },
    {
      title: "Tên bán thành phẩm",
      dataIndex: "product_type_name",
      key: "product_type_name",
    },
    {
      title: "Kích thước",
      key: "size",
      render: (_, record) => `${record.width} x ${record.length}`,
    },
    {
      title: "Công đoạn",
      dataIndex: "product_process",
      key: "product_process",
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: "right",
      render: (val: number) => <span className="font-medium text-amber-600">{val?.toLocaleString("vi-VN")}</span>,
    },
  ];

  const handleGenerateReceipts = () => {
    if (selectedRowKeys.length === 0) return;
    generateImportMutation.mutate(selectedRowKeys as number[]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Bán Thành Phẩm Cần Nhập Kho</h1>
        <div className="flex gap-3">
          <Button
            type="primary"
            onClick={handleGenerateReceipts}
            disabled={selectedRowKeys.length === 0}
            loading={generateImportMutation.isPending}
            className="bg-amber-900 hover:bg-amber-800"
            icon={<CheckCircleOutlined />}
          >
            Tạo phiếu nhập kho
          </Button>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 shadow-sm transition-colors font-medium"
          >
            <ReloadOutlined /> Làm mới
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Space wrap className="flex-1">
            <Input
              placeholder="Tìm ID hoặc tên bán thành phẩm..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="sm:w-[300px] shadow-sm"
              size="large"
              allowClear
            />
          </Space>
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 whitespace-nowrap">
            Tổng số: <span className="font-bold text-blue-700">{filteredData.length}</span> bán thành phẩm chờ nhập
          </div>
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns as any}
          dataSource={filteredData}
          rowKey={(record) => record.id}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
          size="middle"
          scroll={{ x: 800 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
        />
      </div>

      <Modal
        title={<span className="text-lg font-semibold text-gray-800">Phiếu Nhập Kho Bán Thành Phẩm</span>}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setPdfUrls([]);
        }}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => {
              setIsModalVisible(false);
              setPdfUrls([]);
            }}
            className="bg-amber-900 hover:bg-amber-800"
          >
            Đóng
          </Button>,
        ]}
        width={800}
        centered
        destroyOnClose
      >
        {pdfUrls.length > 0 ? (
          <div className="mt-4 flex flex-col gap-4">
            {pdfUrls.map((url, index) => (
              <div key={index} className="rounded-lg overflow-hidden border border-gray-200">
                <iframe
                  src={url}
                  className="w-full h-[60vh] border-0"
                  title={`Phiếu Nhập Kho ${index + 1}`}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[60vh]">
            <Spin size="large" />
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function SubProductsImportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[80vh]">
          <Spin size="large" />
        </div>
      }
    >
      <SubProductsImportContent />
    </Suspense>
  );
}
