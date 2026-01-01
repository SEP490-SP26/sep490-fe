"use client";
import { useState } from "react";
import { BsTruck } from "react-icons/bs";
import { BiPackage, BiTrendingDown, BiTrendingUp } from "react-icons/bi";
import { FiAlertTriangle } from "react-icons/fi";
import { useProduction } from "@/context/ProductionContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { purchasesApi } from "@/api/purchase";
import { materialsApi } from "@/api/materials";
import Loading from "@/app/(overview)/loading";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";
import { Spin } from "antd";

export default function InventoryManagement() {
  const {
    materials,
    // inventory,
    purchaseOrders,
    // purchaseRequests,
    receiveInventory,
    updateInventory,
  } = useProduction();

  const [editingMaterial, setEditingMaterial] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    on_hand: 0,
    reserved: 0,
  });
  const [isRefetching, setIsRefetching] = useState(false);

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
        console.log("Response po data:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
    initialData: [],
  });
  console.log("poData", purchaseRequests);

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
        console.log("response", response);
        console.log("Response po data:", response.data);
        return response;
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
  });

  if (isInvPending) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  console.log("inv", inventory);

  const getPurchaseOrdersByStatus = (status: "Ordered" | "Delivered") => {
    if (isPending || error || !purchaseRequests) {
      return [];
    }
    return purchaseRequests.filter((po: any) => po.status === status);
  };

  const handleReceive = async (poId: number) => {
    try {
      // Hiển thị loading
      // setIsLoading(true);

      // Gọi API
      // const result = await purchasesApi.receiveInventory(poId);

      // Cập nhật UI sau khi thành công
      // console.log("Received successfully:", result);
      showSuccessToast("Nhập kho thành công!");

      // Có thể cần refetch data
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

  const getInventoryStatus = (inv: (typeof inventory)[0]) => {
    const available = inv.on_hand - inv.reserved;
    if (available < 50)
      return {
        color: "text-red-600",
        icon: FiAlertTriangle,
        label: "Rất thấp",
      };
    if (available < 100)
      return {
        color: "text-orange-600",
        icon: BiTrendingDown,
        label: "Thấp",
      };
    return {
      color: "text-green-600",
      icon: BiTrendingUp,
      label: "Ổn định",
    };
  };

  return (
    <div>
      <h1 className="mb-8">Quản lý Kho & Cập nhật Trạng thái</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Đơn hàng chờ nhập kho */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2">
            <BsTruck className="w-5 h-5 text-blue-500" />
            Chờ nhập kho ({getPurchaseOrdersByStatus("Ordered").length})
          </h2>

          <div className="space-y-3 w-full overflow-y-auto">
            {getPurchaseOrdersByStatus("Ordered").map((po: any) => {
              return (
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
                          {item?.materialName}
                        </div>
                        <div className="text-gray-500 text-sm">
                          SL: {item?.qtyOrdered} {item?.unit}
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
              );
            })}

            {isPending && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Đang tải đơn hàng...
              </div>
            )}

            {getPurchaseOrdersByStatus.length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Không có đơn hàng chờ nhập
              </div>
            )}
          </div>
        </div>

        {/* Tồn kho hiện tại */}
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
                    <th className="text-left py-3 px-4 text-gray-700">
                      Nguyên vật liệu
                    </th>
                    <th className="text-left py-3 px-4 text-gray-700">
                      Loại sản phẩm
                    </th>
                    <th className="text-end py-3 px-2 text-gray-700">
                      Tồn kho
                    </th>
                    <th className="text-left py-3 px-2 text-gray-700">
                      Đơn vị
                    </th>

                    {/* <th className="text-center py-3 px-4 text-gray-700">
                    Đã dự trữ
                  </th>
                  <th className="text-center py-3 px-4 text-gray-700">
                    Khả dụng
                  </th> */}
                    {/* <th className="text-center py-3 px-4 text-gray-700">
                    Trạng thái
                  </th> */}

                    <th className="text-center py-3 px-4 text-gray-700">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((inv: any) => {
                    // const material = materials.find(
                    //   (m) => m.id === inv.material_id
                    // );
                    // const available = inv.on_hand - inv.reserved;
                    // const status = getInventoryStatus(inv);
                    // const StatusIcon = status.icon;
                    const isEditing = editingMaterial === inv.material_id;

                    return (
                      <tr
                        key={inv.material_id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <Spin spinning={isRefetching}></Spin>
                        <td className="py-3 px-4">
                          <div className="text-gray-900">{inv.name}</div>
                          <div className="text-gray-500 text-sm">
                            Mã: {inv.code}
                          </div>
                        </td>
                        {/* <td className="text-center py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.on_hand}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                on_hand: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-900">{inv.on_hand}</span>
                        )}
                      </td> */}
                        <td className=" py-3 px-4">
                          <div className="text-gray-900">
                            {inv.main_material_type}
                          </div>
                        </td>
                        <td className="text-end py-3 px-4">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editForm.reserved}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  reserved: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                            />
                          ) : (
                            <span className="text-gray-600">
                              {inv.stock_qty}
                            </span>
                          )}
                        </td>
                        {/* <td className="text-center py-3 px-4">
                        <span className={status.color}>{available}</span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div
                          className={`flex items-center justify-center gap-1 text-sm ${status.color}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {status.label}
                        </div>
                      </td> */}
                        <td className="py-3 px-4">
                          <div className="text-gray-900">{inv.unit}</div>
                        </td>

                        <td className="text-center py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={handleSaveInventory}
                                className="text-green-600 hover:text-green-700 text-sm"
                              >
                                Lưu
                              </button>
                              <button
                                onClick={() => setEditingMaterial(null)}
                                className="text-gray-600 hover:text-gray-700 text-sm"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                handleEditInventory(inv.material_id)
                              }
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {isInvPending && (
                    <div className="text-gray-400 text-center py-8 text-sm">
                      Đang tải đơn hàng...
                    </div>
                  )}
                </tbody>
              </table>
            </Spin>
          </div>
        </div>
      </div>

      {/* Thống kê */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Tổng NVL</div>
            <BiPackage className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-gray-900">{materials.length}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Tồn kho thấp</div>
            <FiAlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-orange-600">
            {
              inventory.filter((inv: any) => inv.on_hand - inv.reserved < 100)
                .length
            }
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Chờ nhập kho</div>
            <BsTruck className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-blue-600">{pendingPOs.length}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Đã dự trữ</div>
            <BiTrendingDown className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-purple-600">
            {inventory.reduce((sum: any, inv: any) => sum + inv.reserved, 0)}
          </div>
        </div>
      </div> */}
    </div>
  );
}
