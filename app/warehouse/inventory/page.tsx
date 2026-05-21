"use client";
import { materialsApi } from "@/apiRequests/materials";
import { purchasesApi } from "@/apiRequests/purchase";
import { requestOrderApi } from "@/apiRequests/request";
import Loading from "@/app/(overview)/loading";
import { useProduction } from "@/context/ProductionContext";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";
import { useQuery } from "@tanstack/react-query";
import { Pagination, Tabs } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BiPackage } from "react-icons/bi";
import { BsSearch, BsTruck, BsCloudUpload, BsFileEarmarkExcel, BsDownload } from "react-icons/bs";
import { subProductsApi, SubProduct } from "@/apiRequests/subproducts";
import { Table } from "antd";


export default function InventoryManagement() {
  const {
    materials,
    purchaseOrders,
    receiveInventory,
    updateInventory,
  } = useProduction();

  const router = useRouter();

  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    on_hand: 0,
    reserved: 0,
  });
  const [isRefetching, setIsRefetching] = useState(false);

  // ===== Pagination UI state =====
  const ITEMS_PER_PAGE = 3;
  const [poPage, setPoPage] = useState(1);
  const [finishedGoodPage, setFinishedGoodPage] = useState(1);
  const [isConfirmingId, setIsConfirmingId] = useState<number | null>(null);
  const [poSearch, setPoSearch] = useState("");
  const [finishedGoodSearch, setFinishedGoodSearch] = useState("");
  const [subProductPage, setSubProductPage] = useState(1);
  const [selectedExcel, setSelectedExcel] = useState<File | null>(null);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const {
    data: purchaseRequests,
    isPending,
    error,
    refetch: refetchSupplierData,
  } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      try {
        const response = await purchasesApi.getList(1, 100);
        return response.data;
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
    initialData: [],
  });

  const {
    data: inventory,
    isPending: isInvPending,
    error: invError,
    refetch: refetchInvData,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      try {
        const response = await materialsApi.getAll();
        return response;
      } catch (error) {
        console.error("Error fetching inventory:", error);
        return [];
      }
    },
  });

  const {
    data: finishedGoodsRequests,
    isPending: isFinishedGoodsPending,
    refetch: refetchFinishedGoods,
  } = useQuery({
    queryKey: ["finished-goods"],
    queryFn: async () => {
      try {
        const response = await requestOrderApi.getList(1, 500);
        return response.data;
      } catch (error) {
        console.error("Error fetching finished goods:", error);
        return [];
      }
    },
    initialData: [],
  });

  const {
    data: subProductsResponse,
    isPending: isSubProductsPending,
  } = useQuery({
    queryKey: ["subproducts"],
    queryFn: async () => {
      try {
        const response = await subProductsApi.getPaged(1, 500, true);
        return response;
      } catch (error) {
        console.error("Error fetching subproducts:", error);
        return { data: [], page: 1, pageSize: 500, hasNext: false };
      }
    },
  });

  if (isInvPending) {
    return <Loading />;
  }

  const getPurchaseOrdersByStatus = (status: "Ordered" | "Delivered") => {
    if (isPending || error || !purchaseRequests) return [];
    return purchaseRequests.filter((po: any) => po.status === status);
  };



  // ===== Pagination computed data =====
  const orderedPOs = getPurchaseOrdersByStatus("Ordered").filter((po: any) => {
    if (!poSearch) return true;
    const search = poSearch.toLowerCase();
    const supplierMatch = po.supplierName?.toLowerCase().includes(search);
    const itemMatch = po.items?.some((item: any) => item.materialName?.toLowerCase().includes(search));
    const idMatch = po.purchaseId?.toString().includes(search);
    return supplierMatch || itemMatch || idMatch;
  });
  const paginatedPOs = orderedPOs.slice(
    (poPage - 1) * ITEMS_PER_PAGE,
    poPage * ITEMS_PER_PAGE
  );

  const importingRequests = (finishedGoodsRequests?.filter((req: any) => req.process_status === "Importing") || []).filter((req: any) => {
    if (!finishedGoodSearch) return true;
    const search = finishedGoodSearch.toLowerCase();
    const idMatch = req.order_id?.toString().includes(search);
    const productMatch = req.product_name?.toLowerCase().includes(search);
    const customerMatch = req.customer_name?.toLowerCase().includes(search);
    return idMatch || productMatch || customerMatch;
  });
  const paginatedImportingRequests = importingRequests.slice(
    (finishedGoodPage - 1) * ITEMS_PER_PAGE,
    finishedGoodPage * ITEMS_PER_PAGE
  );

  const subProductsList: SubProduct[] = subProductsResponse?.data || [];
  
  const subProductsColumns = [
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
      title: 'Cập nhật lần cuối',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (text: string) => <span className="text-gray-500 text-sm">{new Date(text).toLocaleString("vi-VN")}</span>,
    },
  ];

  const handleConfirmImporting = async (order_id: number) => {
    try {
      setIsConfirmingId(order_id);
      await requestOrderApi.confirmImporting(order_id);
      showSuccessToast("Nhập thành phẩm thành công!");
      refetchFinishedGoods();
    } catch (error) {
      console.error("Error confirming importing:", error);
      showErrorToast("Có lỗi xảy ra khi nhập kho thành phẩm");
    } finally {
      setIsConfirmingId(null);
    }
  };

  const handleReceive = async (poId: number) => {
    try {
      await purchasesApi.receiveInventory(poId, { status: "Delivered" });
      showSuccessToast("Nhập kho thành công!");
      refetchSupplierData();
      refetchInvData();
    } catch (error) {
      console.error("Error receiving PO:", error);
      showErrorToast("Có lỗi xảy ra khi nhận hàng");
    } finally {
      setIsRefetching(false);
    }
  };

  const handleEditInventory = (materialId: string) => {
    const inv = inventory.find((i: any) => i.material_id === materialId);
    if (inv) {
      setEditingMaterial(materialId);
      setEditForm({
        on_hand: inv.on_hand,
        reserved: inv.reserved,
      });
    }
  };

  const handleSaveInventory = () => {
    if (editingMaterial) {
      updateInventory(editingMaterial, editForm.on_hand, editForm.reserved);
      setEditingMaterial(null);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await materialsApi.exportMissingMaterialsExcel(1, 200);
      showSuccessToast("Tải file Excel thành công!");
    } catch (error) {
      console.error("Error exporting excel:", error);
      showErrorToast("Có lỗi xảy ra khi tải file Excel");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExcelUpload = async () => {
    if (!selectedExcel) return;
    try {
      setIsUploadingExcel(true);
      await materialsApi.importStockFromExcel(selectedExcel);
      showSuccessToast("Nhập nguyên vật liệu từ Excel thành công!");
      setSelectedExcel(null);
      refetchInvData();
    } catch (error) {
      console.error("Error importing excel:", error);
      showErrorToast("Có lỗi xảy ra khi nhập file Excel");
    } finally {
      setIsUploadingExcel(false);
    }
  };

  const tabItems = [
    {
      key: "1",
      label: (
        <span className="flex items-center gap-2 px-4 py-1 text-base font-medium">
          <BiPackage className="w-5 h-5 text-green-500" />
          Nhập kho thành phẩm
        </span>
      ),
      children: (
        <div className="pt-4">
          <div className="mb-4">
            <div className="relative">
              <BsSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={finishedGoodSearch}
                onChange={(e) => { setFinishedGoodSearch(e.target.value); setFinishedGoodPage(1); }}
                placeholder="🔍 Tìm theo mã đơn, tên sản phẩm..."
                className="w-full border-2 border-green-200 bg-green-50/50 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 focus:bg-white transition placeholder:text-gray-400 shadow-sm"
              />
            </div>
          </div>
          {importingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                <BiPackage className="w-8 h-8" />
              </div>
              <h3 className="text-gray-900 font-medium text-lg mb-1">Chưa có dữ liệu nhập kho</h3>
              <p className="text-gray-500 max-w-sm">
                Không có đơn thành phẩm nào đang chờ nhập kho.
              </p>
            </div>
          ) : (
            <div className="space-y-4 w-full overflow-y-auto">
              {paginatedImportingRequests.map((req: any) => (
                <div
                  key={req.order_request_id}
                  className="border border-green-200 bg-green-50 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all hover:border-green-300"
                  onClick={() => router.push(`/warehouse/detail/${req.order_id}`)}
                >
                  <div className="mb-3">
                    <div className="flex mb-1 justify-between items-center">
                      <div className="text-gray-900 font-medium">Mã đơn hàng: {req.order_id} - {req.product_name || "Chưa có tên SP"}</div>
                      <div className="text-gray-500 text-sm">SL: {req.quantity || 0}</div>
                    </div>
                    {(req.delivery_date) && (
                      <div className="text-gray-500 text-sm">
                        {req.delivery_date && `Ngày giao dự kiến: ${new Date(req.delivery_date).toLocaleDateString("vi-VN")}`}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {importingRequests.length > ITEMS_PER_PAGE && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    current={finishedGoodPage}
                    pageSize={ITEMS_PER_PAGE}
                    total={importingRequests.length}
                    onChange={(page) => setFinishedGoodPage(page)}
                    showSizeChanger={false}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span className="flex items-center gap-2 px-4 py-1 text-base font-medium">
          <BsTruck className="w-5 h-5 text-blue-500" />
          Nhập kho nguyên vật liệu
        </span>
      ),
      children: (
        <div className="pt-4">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-blue-200 rounded-xl bg-blue-50/30">
            <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <BsFileEarmarkExcel className="w-10 h-10" />
            </div>
            <h3 className="text-gray-900 font-semibold text-lg mb-2">Nhập nguyên vật liệu từ file Excel</h3>
            <p className="text-gray-500 max-w-sm mb-6">
              Tải file Excel danh sách nguyên vật liệu thiếu, điền số lượng nhập kho rồi upload lại.
            </p>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className={`mb-4 cursor-pointer bg-white border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                isExportingExcel ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isExportingExcel ? (
                <>
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  Đang tải...
                </>
              ) : (
                <>
                  <BsDownload className="w-5 h-5" />
                  Tải file Excel
                </>
              )}
            </button>
            
            <input 
              type="file" 
              id="excel-upload" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setSelectedExcel(e.target.files[0]);
                }
              }} 
            />
            
            {!selectedExcel ? (
              <label 
                htmlFor="excel-upload" 
                className="cursor-pointer bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-700 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2"
              >
                <BsCloudUpload className="w-5 h-5" />
                Chọn file Excel
              </label>
            ) : (
              <div className="flex flex-col items-center w-full max-w-md">
                <div className="w-full bg-white border border-blue-200 rounded-lg p-3 flex justify-between items-center mb-4 shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <BsFileEarmarkExcel className="w-6 h-6 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700 truncate">{selectedExcel.name}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedExcel(null)}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <button 
                  onClick={handleExcelUpload} 
                  disabled={isUploadingExcel} 
                  className={`w-full text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all flex justify-center items-center gap-2 ${
                    isUploadingExcel ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                  }`}
                >
                  {isUploadingExcel ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <BsCloudUpload className="w-5 h-5" />
                      Xác nhận nhập kho
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "3",
      label: (
        <span className="flex items-center gap-2 px-4 py-1 text-base font-medium">
          <BsTruck className="w-5 h-5 text-purple-500" />
          Nhập kho bán thành phẩm
        </span>
      ),
      children: (
        <div className="pt-4">
          <div className="w-full overflow-y-auto">
            {subProductsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <BsTruck className="w-8 h-8" />
                </div>
                <h3 className="text-gray-900 font-medium text-lg mb-1">Chưa có dữ liệu</h3>
                <p className="text-gray-500 max-w-sm">
                  Không có dữ liệu bán thành phẩm.
                </p>
              </div>
            ) : (
              <Table
                columns={subProductsColumns}
                dataSource={subProductsList.map((item) => ({ ...item, key: item.id }))}
                pagination={{ pageSize: 5, showSizeChanger: false, current: subProductPage, onChange: setSubProductPage }}
                className="border border-gray-200 rounded-lg overflow-hidden [&_.ant-table-thead_th]:!bg-gray-50 [&_.ant-table-thead_th]:!font-semibold"
                rowClassName="hover:bg-purple-50/50 transition-colors"
              />
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-8 tracking-tight">Quản lý Kho & Cập nhật Trạng thái</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Tabs 
          defaultActiveKey="1" 
          items={tabItems} 
          size="large"
          className="custom-inventory-tabs"
          tabBarStyle={{ marginBottom: 0, padding: '0 16px', borderBottom: '1px solid #f3f4f6' }}
        />
      </div>
    </div>
  );
}
