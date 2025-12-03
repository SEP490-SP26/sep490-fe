"use client";
import { useProduction } from "@/context/ProductionContext";
import { showSuccessToast, showWarningToast } from "@/utils/toastService";
import { useState } from "react";
import { BiPlus } from "react-icons/bi";
import { BsCheckCircle, BsClock, BsTruck, BsX } from "react-icons/bs";

export default function PurchaseManagement() {
  const [showCreatePR, setShowCreatePR] = useState(false);
  const [showDirectPO, setShowDirectPO] = useState(false);
  const {
    materials,
    orders,
    purchaseRequests,
    purchaseOrders,
    inventory,
    createPurchaseOrder,
    createPurchaseRequest,
    updateInventory,
  } = useProduction();

  const [selectedPR, setSelectedPR] = useState<string | null>(null);
  const [poForm, setPOForm] = useState({
    supplier: "",
    delivery_date: "",
  });

  const [directPOForm, setDirectPOForm] = useState({
    material_id: "",
    quantity: "",
    supplier: "",
    delivery_date: "",
    reason: "",
  });

  // Danh sách nhà cung cấp mẫu
  const suppliers = [
    "Công ty TNHH Giấy Sài Gòn",
    "Nhà máy Giấy Long An",
    "Công ty CP Mực in Đông Dương",
    "Công ty TNHH Vật tư In ấn Hà Nội",
    "Tập đoàn Giấy Việt Nam",
  ];

  const handleCreatePO = (prId: string) => {
    if (!poForm.supplier || !poForm.delivery_date) {
      showWarningToast("Vui lòng chọn nhà cung cấp và ngày giao hàng");
      return;
    }

    createPurchaseOrder(prId, poForm.supplier, poForm.delivery_date);

    // Reset form
    setSelectedPR(null);
    setPOForm({ supplier: "", delivery_date: "" });
  };

  const handleCreateDirectPO = () => {
    if (
      !directPOForm.material_id ||
      !directPOForm.quantity ||
      !directPOForm.supplier ||
      !directPOForm.delivery_date ||
      !directPOForm.reason
    ) {
      showSuccessToast("Vui lòng điền đầy đủ thông tin");
      return;
    }

    // Tạo Purchase Order trực tiếp
    const newDirectPO = {
      id: `po-direct-${Date.now()}`,
      pr_id: `pr-direct-${Date.now()}`,
      material_id: directPOForm.material_id,
      quantity_needed: parseInt(directPOForm.quantity),
      supplier: directPOForm.supplier,
      expected_delivery_date: directPOForm.delivery_date,
      status: "ordered" as const,
      created_at: new Date().toISOString(),
      reason: directPOForm.reason,
      type: "direct" as const,
    };

    showSuccessToast(`Đã tạo đơn mua trực tiếp:
    Vật tư: ${materials.find((m) => m.id === directPOForm.material_id)?.name}
    Số lượng: ${directPOForm.quantity}
    Nhà cung cấp: ${directPOForm.supplier}
    Ngày giao: ${directPOForm.delivery_date}
    Lý do: ${directPOForm.reason}`);

    // Reset form
    setDirectPOForm({
      material_id: "",
      quantity: "",
      supplier: "",
      delivery_date: "",
      reason: "",
    });
    setShowDirectPO(false);
  };

  const getPRsByStatus = (status: "pending" | "ordered" | "received") => {
    return purchaseRequests.filter((pr) => pr.status === status);
  };

  const getPOByPRId = (prId: string) => {
    return purchaseOrders.find((po) => po.pr_id === prId);
  };

  const getOrderByPRId = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    return pr ? orders.find((o) => o.id === pr.order_id) : null;
  };

  const getAvailableQuantity = (materialId: string) => {
    const inv = inventory.find((i) => i.material_id === materialId);
    return inv ? inv.on_hand : 0;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tạo Đơn Nhập NVL</h1>

        <div className="flex gap-3">
          <button
            onClick={() => setShowDirectPO(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <BiPlus className="w-4 h-4" />
            Đặt hàng trực tiếp
          </button>
        </div>
      </div>

      {/* Direct Purchase Order Modal */}
      {showDirectPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Đặt hàng trực tiếp</h2>
                <button
                  onClick={() => setShowDirectPO(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <BsX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Vật tư cần mua
                  </label>
                  <select
                    value={directPOForm.material_id}
                    onChange={(e) =>
                      setDirectPOForm({
                        ...directPOForm,
                        material_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Chọn vật tư</option>
                    {materials.map((material) => {
                      const available = getAvailableQuantity(material.id);
                      return (
                        <option key={material.id} value={material.id}>
                          {material.name} (Hiện có: {available} {material.unit})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Số lượng</label>
                    <input
                      type="number"
                      value={directPOForm.quantity}
                      onChange={(e) =>
                        setDirectPOForm({
                          ...directPOForm,
                          quantity: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số lượng"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Đơn vị</label>
                    <input
                      type="text"
                      value={
                        materials.find((m) => m.id === directPOForm.material_id)
                          ?.unit || ""
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Nhà cung cấp
                  </label>
                  <select
                    value={directPOForm.supplier}
                    onChange={(e) =>
                      setDirectPOForm({
                        ...directPOForm,
                        supplier: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Chọn nhà cung cấp</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier} value={supplier}>
                        {supplier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Ngày giao hàng dự kiến
                  </label>
                  <input
                    type="date"
                    value={directPOForm.delivery_date}
                    onChange={(e) =>
                      setDirectPOForm({
                        ...directPOForm,
                        delivery_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Lý do mua hàng
                  </label>
                  <textarea
                    value={directPOForm.reason}
                    onChange={(e) =>
                      setDirectPOForm({
                        ...directPOForm,
                        reason: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Ví dụ: Bổ sung tồn kho, mua vật tư mới, thay thế hỏng hóc..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateDirectPO}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Tạo đơn đặt hàng
                  </button>
                  <button
                    onClick={() => setShowDirectPO(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Purchase Request Modal */}
      {showCreatePR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Tạo Yêu cầu mua hàng</h2>
                <button
                  onClick={() => setShowCreatePR(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <BsX className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 mb-2">
                    Chọn đơn hàng
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Chọn đơn hàng cần mua vật tư</option>
                    {orders
                      .filter(
                        (o) => o.status === "pending" && o.can_fulfill === false
                      )
                      .map((order) => {
                        return (
                          <option key={order.id} value={order.id}>
                            {order.customer_name} (Thiếu vật tư)
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2">
                    Vật tư cần mua
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Chọn vật tư từ danh sách thiếu</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreatePR(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yêu cầu mua hàng chờ xử lý */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsClock className="w-5 h-5 text-orange-500" />
            Chờ đặt hàng ({getPRsByStatus("pending").length})
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {getPRsByStatus("pending").map((pr) => {
              const material = materials.find((m) => m.id === pr.material_id);
              const order = getOrderByPRId(pr.id);
              const isSelected = selectedPR === pr.id;

              return (
                <div
                  key={pr.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedPR(pr.id)}
                >
                  <div className="mb-2">
                    <div className="text-gray-900">{material?.name}</div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr.quantity_needed} {material?.unit}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Cho đơn: {order?.customer_name}
                  </div>

                  {isSelected && (
                    <div className="space-y-3 pt-3 border-t border-gray-200">
                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Nhà cung cấp
                        </label>
                        <select
                          value={poForm.supplier}
                          onChange={(e) =>
                            setPOForm({
                              ...poForm,
                              supplier: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Chọn nhà cung cấp</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier} value={supplier}>
                              {supplier}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-700 text-sm mb-1">
                          Ngày giao dự kiến
                        </label>
                        <input
                          type="date"
                          value={poForm.delivery_date}
                          onChange={(e) =>
                            setPOForm({
                              ...poForm,
                              delivery_date: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreatePO(pr.id);
                        }}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Tạo đơn đặt hàng
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {getPRsByStatus("pending").length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Không có yêu cầu chờ xử lý
              </div>
            )}
          </div>
        </div>

        {/* Đơn đặt hàng đang chờ */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsTruck className="w-5 h-5 text-blue-500" />
            Đang chờ giao ({getPRsByStatus("ordered").length})
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {getPRsByStatus("ordered").map((pr) => {
              const material = materials.find((m) => m.id === pr.material_id);
              const po = getPOByPRId(pr.id);
              const order = getOrderByPRId(pr.id);

              return (
                <div
                  key={pr.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="mb-2">
                    <div className="text-gray-900">{material?.name}</div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr.quantity_needed} {material?.unit}
                    </div>
                  </div>

                  {po && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-gray-500">
                        Nhà cung cấp: {po.supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        Giao dự kiến:{" "}
                        {new Date(po.expected_delivery_date).toLocaleDateString(
                          "vi-VN"
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cho đơn: {order?.customer_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Người đặt hàng: Quản Lý A
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-blue-600">
                    <BsClock className="w-4 h-4" />
                    Đang vận chuyển
                  </div>
                </div>
              );
            })}

            {getPRsByStatus("ordered").length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Không có đơn hàng đang chờ
              </div>
            )}
          </div>
        </div>

        {/* Đơn hàng đã nhận */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsCheckCircle className="w-5 h-5 text-green-500" />
            Đã nhận hàng ({getPRsByStatus("received").length})
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {getPRsByStatus("received").map((pr) => {
              const material = materials.find((m) => m.id === pr.material_id);
              const po = getPOByPRId(pr.id);
              const order = getOrderByPRId(pr.id);

              return (
                <div
                  key={pr.id}
                  className="border border-green-200 bg-green-50 rounded-lg p-4"
                >
                  <div className="mb-2">
                    <div className="text-gray-900">{material?.name}</div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr.quantity_needed} {material?.unit}
                    </div>
                  </div>

                  {po && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-gray-500">
                        Nhà cung cấp: {po.supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        Cho đơn: {order?.customer_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Người đặt hàng: Quản Lý A
                      </div>
                      <div className="text-xs text-gray-500">
                        Người kiểm hàng: Quản Kho B
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-green-600">
                    <BsCheckCircle className="w-4 h-4" />
                    Đã nhập kho
                  </div>
                </div>
              );
            })}

            {getPRsByStatus("received").length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Chưa nhận hàng nào
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
