"use client";
import { materialsApi } from "@/apiRequests/materials";
import { purchasesApi } from "@/apiRequests/purchase";
import Loading from "@/app/(overview)/loading";
import { useProduction } from "@/context/ProductionContext";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";
import { useQuery } from "@tanstack/react-query";
import { Pagination, Spin } from "antd";
import { useState } from "react";
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

  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    on_hand: 0,
    reserved: 0,
  });
  const [isRefetching, setIsRefetching] = useState(false);

  // ===== Pagination UI state =====
  const ITEMS_PER_PAGE = 3;
  const [poPage, setPoPage] = useState(1);

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

  return (
    <div>
      <h1 className="mb-8">Quản lý Kho & Cập nhật Trạng thái</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* ===== Đơn hàng chờ nhập kho ===== */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2">
            <BsTruck className="w-5 h-5 text-blue-500" />
            Chờ nhập kho ({orderedPOs.length})
          </h2>

          <div className="space-y-3 w-full overflow-y-auto">
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
                    {new Date(po.etaDate).toLocaleDateString("vi-VN")}
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

        {/* ===== Tồn kho hiện tại ===== */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2">
            <BiPackage className="w-5 h-5 text-purple-500" />
            Tồn kho Nguyên vật liệu
          </h2>

          <div className="overflow-x-auto">
            <Spin spinning={isRefetching} tip="Đang làm mới dữ liệu...">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Nguyên vật liệu</th>
                    <th className="text-left py-3 px-4">Loại sản phẩm</th>
                    <th className="text-end py-3 px-4">Tồn kho</th>
                    <th className="text-left py-3 px-4">Đơn vị</th>
                    <th className="text-center py-3 px-4">Thao tác</th>
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
                        <td className="py-3 px-4">
                          {inv.main_material_type}
                        </td>
                        <td className="text-end py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editForm.reserved}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  reserved: Number(e.target.value) || 0,
                                })
                              }
                              className="w-20 border rounded px-2 py-1"
                            />
                          ) : (
                            inv.stock_qty
                          )}
                        </td>
                        <td className="py-3 px-4">{inv.unit}</td>
                        <td className="text-center py-3 px-4">
                          {isEditing ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={handleSaveInventory}
                                className="text-green-600"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingMaterial(null)}
                                className="text-gray-600"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                handleEditInventory(inv.material_id)
                              }
                              className="text-blue-600"
                            >
                              Sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Spin>
          </div>
        </div>
      </div>
    </div>
  );
}
