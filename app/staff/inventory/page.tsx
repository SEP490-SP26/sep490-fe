'use client';
import { useState } from "react";
import { BsTruck } from "react-icons/bs";
import { BiPackage, BiTrendingDown, BiTrendingUp } from "react-icons/bi";
import { FiAlertTriangle } from "react-icons/fi";
import { useProduction } from "@/context/ProductionContext";

export default function InventoryManagement() {
  const {
    materials,
    inventory,
    purchaseOrders,
    purchaseRequests,
    receiveInventory,
    updateInventory,
  } = useProduction();

  const [editingMaterial, setEditingMaterial] = useState<
    string | null
  >(null);
  const [editForm, setEditForm] = useState({
    on_hand: 0,
    reserved: 0,
  });

  // Đơn hàng chờ nhập kho
  const pendingPOs = purchaseOrders.filter(
    (po) => po.status === "ordered",
  );

  const handleReceive = (poId: string) => {
    if (confirm("Xác nhận đã nhận hàng và nhập kho?")) {
      receiveInventory(poId);
    }
  };

  const handleEditInventory = (materialId: string) => {
    const inv = inventory.find(
      (i) => i.material_id === materialId,
    );
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
      updateInventory(
        editingMaterial,
        editForm.on_hand,
        editForm.reserved,
      );
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
      <h1 className="mb-8">
        Quản lý Kho & Cập nhật Trạng thái
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Đơn hàng chờ nhập kho */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2">
            <BsTruck className="w-5 h-5 text-blue-500" />
            Chờ nhập kho ({pendingPOs.length})
          </h2>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {pendingPOs.map((po) => {
              const pr = purchaseRequests.find(
                (p) => p.id === po.pr_id,
              );
              const material = pr
                ? materials.find((m) => m.id === pr.material_id)
                : null;

              return (
                <div
                  key={po.id}
                  className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                >
                  <div className="mb-3">
                    <div className="text-gray-900">
                      {material?.name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr?.quantity_needed}{" "}
                      {material?.unit}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Nhà cung cấp: {po.supplier}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Dự kiến:{" "}
                      {new Date(
                        po.expected_delivery_date,
                      ).toLocaleDateString("vi-VN")}
                    </div>
                  </div>

                  <button
                    onClick={() => handleReceive(po.id)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <BiPackage className="w-4 h-4" />
                    Nhập kho
                  </button>
                </div>
              );
            })}

            {pendingPOs.length === 0 && (
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-gray-700">
                    Nguyên vật liệu
                  </th>
                  <th className="text-center py-3 px-4 text-gray-700">
                    Tồn kho
                  </th>
                  <th className="text-center py-3 px-4 text-gray-700">
                    Đã dự trữ
                  </th>
                  <th className="text-center py-3 px-4 text-gray-700">
                    Khả dụng
                  </th>
                  <th className="text-center py-3 px-4 text-gray-700">
                    Trạng thái
                  </th>
                  <th className="text-center py-3 px-4 text-gray-700">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((inv) => {
                  const material = materials.find(
                    (m) => m.id === inv.material_id,
                  );
                  const available = inv.on_hand - inv.reserved;
                  const status = getInventoryStatus(inv);
                  const StatusIcon = status.icon;
                  const isEditing =
                    editingMaterial === inv.material_id;

                  return (
                    <tr
                      key={inv.material_id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="text-gray-900">
                          {material?.name}
                        </div>
                        <div className="text-gray-500 text-sm">
                          {material?.unit}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.on_hand}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                on_hand:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-900">
                            {inv.on_hand}
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editForm.reserved}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                reserved:
                                  parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {inv.reserved}
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={status.color}>
                          {available}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <div
                          className={`flex items-center justify-center gap-1 text-sm ${status.color}`}
                        >
                          <StatusIcon className="w-4 h-4" />
                          {status.label}
                        </div>
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
                              onClick={() =>
                                setEditingMaterial(null)
                              }
                              className="text-gray-600 hover:text-gray-700 text-sm"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              handleEditInventory(
                                inv.material_id,
                              )
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
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Tổng NVL</div>
            <BiPackage className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-gray-900">
            {materials.length}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Tồn kho thấp</div>
            <FiAlertTriangle className="w-5 h-5 text-orange-500" />
          </div>
          <div className="text-orange-600">
            {
              inventory.filter(
                (inv) => inv.on_hand - inv.reserved < 100,
              ).length
            }
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Chờ nhập kho</div>
            <BsTruck className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-blue-600">
            {pendingPOs.length}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-600">Đã dự trữ</div>
            <BiTrendingDown className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-purple-600">
            {inventory.reduce(
              (sum, inv) => sum + inv.reserved,
              0,
            )}
          </div>
        </div>
      </div>

      {/* Hướng dẫn */}
      {/* <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-green-900 mb-1">Hướng dẫn sử dụng</div>
            <div className="text-green-700 text-sm">
              1. Click "Nhập kho" để xác nhận đã nhận hàng từ nhà cung cấp
              <br />
              2. Tồn kho sẽ tự động được cập nhật
              <br />
              3. Click "Sửa" để điều chỉnh số lượng tồn kho thủ công nếu cần
              <br />
              4. Khi bắt đầu sản xuất, nguyên vật liệu sẽ được dự trữ tự động
              <br />
              5. Khi hoàn thành sản xuất, nguyên vật liệu đã dự trữ sẽ được trừ khỏi tồn kho
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}