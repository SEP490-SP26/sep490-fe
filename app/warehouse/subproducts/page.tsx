"use client";
import { subProductsApi, SubProduct } from "@/apiRequests/subproducts";
import Loading from "@/app/(overview)/loading";
import { useQuery } from "@tanstack/react-query";
import { Table } from "antd";
import { BsEye, BsTruck } from "react-icons/bs";

export default function SubProductsInventory() {


  const {
    data: subProductsResponse,
    isPending,
  } = useQuery({
    queryKey: ["subproducts"],
    queryFn: async () => {
      try {
        const response = await subProductsApi.getPaged(1, 500, true, true);
        // The API returns { page, pageSize, data: [...] }
        return response;
      } catch (error) {
        console.error("Error fetching subproducts:", error);
        return { data: [], page: 1, pageSize: 500, hasNext: false };
      }
    },
  });

  if (isPending) {
    return <Loading />;
  }

  const subProductsList: SubProduct[] = subProductsResponse?.data || [];
  const columns = [
    {
      title: 'Mã ID',
      dataIndex: 'id',
      key: 'id',
      render: (text: string) => <span className="font-medium text-gray-500">#{text}</span>,
    },
    {
      title: 'Tên bán thành phẩm',
      dataIndex: 'product_type_name',
      key: 'product_type_name',
      render: (text: string) => <span className="font-semibold text-gray-900">{text || "Bán thành phẩm"}</span>,
    },
    {
      title: 'Kích thước',
      key: 'size',
      render: (_: any, record: SubProduct) => (
        <span>{record.width} x {record.length}</span>
      ),
    },
    {
      title: 'Công đoạn',
      dataIndex: 'product_process',
      key: 'product_process',
      render: (text: string) => (
        <span className="font-medium text-purple-700 bg-purple-100 rounded-md px-2 py-0.5 border border-purple-200">{text}</span>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (text: number) => (
        <span className="font-bold text-purple-600">{text || 0}</span>
      ),
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
  title: 'Phiếu nhập kho',
  dataIndex: 'import_file',
  key: 'import_file',
  render: (url: string) =>
    url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline border border-blue-200 rounded-lg px-2.5 py-1 bg-blue-50"
      >
        <BsEye className="w-3.5 h-3.5" />
        Xem phiếu
      </a>
    ) : (
      <span className="text-gray-400 text-xs">Chưa có</span>
    ),  
},
    {
      title: 'Cập nhật lần cuối',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text: string) => <span className="text-gray-500 text-sm">{new Date(text).toLocaleString("vi-VN")}</span>,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-8 tracking-tight flex items-center gap-2">
        <BsTruck className="w-6 h-6 text-purple-600" />
        Tồn Kho Bán Thành Phẩm
      </h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
        {subProductsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <BsTruck className="w-8 h-8" />
            </div>
            <h3 className="text-gray-900 font-medium text-lg mb-1">Chưa có dữ liệu</h3>
            <p className="text-gray-500 max-w-sm">
              Không có dữ liệu tồn kho bán thành phẩm.
            </p>
          </div>
        ) : (
          <div className="w-full">
            <Table
              columns={columns}
              dataSource={subProductsList.map((item) => ({ ...item, key: item.id }))}
              pagination={{ pageSize: 5, showSizeChanger: false }}
              className="border border-gray-200 rounded-lg overflow-hidden [&_.ant-table-thead_th]:!bg-gray-50 [&_.ant-table-thead_th]:!font-semibold"
              rowClassName="hover:bg-purple-50/50 transition-colors"
            />
          </div>
        )}
      </div>
    </div>
  );
}
