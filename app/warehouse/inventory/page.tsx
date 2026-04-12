"use client";
import { materialsApi } from "@/apiRequests/materials";
import { purchasesApi } from "@/apiRequests/purchase";
import { requestOrderApi } from "@/apiRequests/request";
import Loading from "@/app/(overview)/loading";
import { useProduction } from "@/context/ProductionContext";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";
import { useQuery } from "@tanstack/react-query";
import { Pagination, Spin, Tabs } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BiPackage, BiTrendingDown, BiTrendingUp } from "react-icons/bi";
import { BsTruck } from "react-icons/bs";
import { FiAlertTriangle } from "react-icons/fi";

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

  if (isInvPending) {
    return <Loading />;
  }

  const getPurchaseOrdersByStatus = (status: "Ordered" | "Delivered") => {
    if (isPending || error || !purchaseRequests) return [];
    return purchaseRequests.filter((po: any) => po.status === status);
  };



  // ===== Pagination computed data =====
  const orderedPOs = getPurchaseOrdersByStatus("Ordered");
  const paginatedPOs = orderedPOs.slice(
    (poPage - 1) * ITEMS_PER_PAGE,
    poPage * ITEMS_PER_PAGE
  );

  const importingRequests = finishedGoodsRequests?.filter((req: any) => req.process_status === "Importing") || [];
  const paginatedImportingRequests = importingRequests.slice(
    (finishedGoodPage - 1) * ITEMS_PER_PAGE,
    finishedGoodPage * ITEMS_PER_PAGE
  );

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

  const tabItems = [
    {
      key: "1",
      label: (
        <span className="flex items-center gap-2 px-4 py-1 text-base font-medium">
          <BsTruck className="w-5 h-5 text-blue-500" />
          Chờ nhập kho
        </span>
      ),
      children: (
        <div className="pt-2">
          <div className="space-y-4 w-full overflow-y-auto">
            {paginatedPOs.map((po: any) => (
              <div
                key={po.purchaseId}
                className="border border-blue-200 bg-blue-50 rounded-lg p-4"
              >
                <div className="mb-3">
                  {po.items.map((item: any) => (
                    <div
                      key={item.material_id}
                      className="flex mb-1 justify-between items-center"
                    >
                      <div className="text-gray-900">
                        {item.materialName}
                      </div>
                      <div className="text-gray-500 text-sm">
                        SL: {item.qtyOrdered} {item.unit}
                      </div>
                    </div>
                  ))}
                  <div className="text-gray-500 text-sm">
                    Nhà cung cấp: {po.supplierName}
                  </div>
                  <div className="text-gray-500 text-sm">
                    Dự kiến:{" "}
                    {new Date(
                      po.etaDate
                        ? po.etaDate
                        : new Date(new Date(po.createdAt).setDate(
                            new Date(po.createdAt).getDate() + 3
                          ))
                    ).toLocaleDateString("vi-VN")}
                  </div>
                </div>

                <button
                  onClick={() => handleReceive(po.purchaseId)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <BiPackage className="w-4 h-4" />
                  Nhập kho
                </button>
              </div>
            ))}

            {orderedPOs.length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Không có đơn hàng chờ nhập
              </div>
            )}
          </div>

          {/* ===== Pagination Ant Design (1 2 3 4 5 …) ===== */}
          {orderedPOs.length > ITEMS_PER_PAGE && (
            <div className="mt-4 flex justify-center">
              <Pagination
                current={poPage}
                pageSize={ITEMS_PER_PAGE}
                total={orderedPOs.length}
                onChange={(page) => setPoPage(page)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span className="flex items-center gap-2 px-4 py-1 text-base font-medium">
          <BiPackage className="w-5 h-5 text-green-500" />
          Nhập kho thành phẩm
        </span>
      ),
      children: (
        <div className="pt-2">
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
                      <div className="text-gray-900 font-medium">#{req.order_request_id} - {req.product_name || "Chưa có tên SP"}</div>
                      <div className="text-gray-500 text-sm">SL: {req.quantity || 0}</div>
                    </div>
                    <div className="text-gray-500 text-sm">Khách hàng: {req.customer_name}</div>
                    <div className="text-gray-500 text-sm">SĐT: {req.customer_phone}</div>
                    {(req.order_request_date || req.delivery_date) && (
                      <div className="text-gray-500 text-sm">
                        {req.order_request_date && `Ngày tạo: ${new Date(req.order_request_date).toLocaleDateString("vi-VN")}`}
                        {req.order_request_date && req.delivery_date && " - "}
                        {req.delivery_date && `Ngày giao: ${new Date(req.delivery_date).toLocaleDateString("vi-VN")}`}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmImporting(req.order_id);
                    }}
                    disabled={isConfirmingId === req.order_id}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BiPackage className="w-4 h-4" />
                    {isConfirmingId === req.order_id ? "Đang xử lý..." : "Nhập kho"}
                  </button>
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
      key: "3",
      label: (
        <span className="flex items-center gap-2 px-4 py-1 text-base font-medium">
          <BiPackage className="w-5 h-5 text-purple-500" />
          Tồn kho Nguyên vật liệu
        </span>
      ),
      children: (
        <div className="pt-2">
          <div className="overflow-x-auto rounded-lg border border-gray-100 shadow-sm">
            <Spin spinning={isRefetching} tip="Đang làm mới dữ liệu...">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Nguyên vật liệu</th>
                    <th className="text-end py-3 px-4">Tồn kho</th>
                    <th className="text-left py-3 px-4">Đơn vị</th>
                    <th className="text-center py-3 px-4">Mô tả</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv: any) => {
                    const isEditing = editingMaterial === inv.material_id;

                    return (
                      <tr
                        key={inv.material_id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-3 px-4">
                          <div>{inv.name}</div>
                          <div className="text-sm text-gray-500">
                            Mã: {inv.code}
                          </div>
                        </td>
                        <td className="text-end py-3 px-4">
                            {inv.stock_qty}
                        </td>
                        <td className="py-3 px-4">{inv.unit}</td>
                        <td className="text-center py-3 px-4">
                          {inv.description}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Spin>
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
