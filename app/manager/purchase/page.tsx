'use client';
import { useProduction } from "@/context/ProductionContext";
import { useState } from "react";
import { BiX } from "react-icons/bi";
import { BsCheckCircle, BsClock, BsTruck } from "react-icons/bs";


export default function PurchaseManagement() {
  const [showCreatePR, setShowCreatePR] = useState(false);
  const {
    materials,
    orders,
    purchaseRequests,
    purchaseOrders,
    createPurchaseOrder,
  } = useProduction();

  const [selectedPR, setSelectedPR] = useState<string | null>(
    null,
  );
  const [poForm, setPOForm] = useState({
    supplier: "",
    delivery_date: "",
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
      alert("Vui lòng chọn nhà cung cấp và ngày giao hàng");
      return;
    }

    createPurchaseOrder(
      prId,
      poForm.supplier,
      poForm.delivery_date,
    );

    // Reset form
    setSelectedPR(null);
    setPOForm({ supplier: "", delivery_date: "" });
  };

  const getPRsByStatus = (
    status: "pending" | "ordered" | "received",
  ) => {
    return purchaseRequests.filter(
      (pr) => pr.status === status,
    );
  };

  const getPOByPRId = (prId: string) => {
    return purchaseOrders.find((po) => po.pr_id === prId);
  };

  const getOrderByPRId = (prId: string) => {
    const pr = purchaseRequests.find((p) => p.id === prId);
    return pr ? orders.find((o) => o.id === pr.order_id) : null;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1>Quản lý Đặt hàng</h1>
        {/* <button
          onClick={() => setShowCreatePR(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tạo Đơn đặt hàng 
        </button> */}
      </div>

    

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yêu cầu mua hàng chờ xử lý */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsClock className="w-5 h-5 text-orange-500" />
            Chờ đặt hàng ({getPRsByStatus("pending").length})
          </h2>

          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {getPRsByStatus("pending").map((pr) => {
              const material = materials.find(
                (m) => m.id === pr.material_id,
              );
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
                    <div className="text-gray-900">
                      {material?.name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr.quantity_needed}{" "}
                      {material?.unit}
                    </div>
                  </div>
                  {/* <div className="text-xs text-gray-500">
                    Người Đặt: Quản Lý A
                  </div> */}
                  {/* <div className="text-xs text-gray-500 mb-3">
                    Cho đơn: {order?.customer_name}
                  </div> */}

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
                          <option value="">
                            Chọn nhà cung cấp
                          </option>
                          {suppliers.map((supplier) => (
                            <option
                              key={supplier}
                              value={supplier}
                            >
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
              const material = materials.find(
                (m) => m.id === pr.material_id,
              );
              const po = getPOByPRId(pr.id);
              const order = getOrderByPRId(pr.id);

              return (
                <div
                  key={pr.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="mb-2">
                    <div className="text-gray-900">
                      {material?.name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr.quantity_needed}{" "}
                      {material?.unit}
                    </div>
                  </div>

                  {po && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-gray-500">
                        Nhà cung cấp: {po.supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        Giao dự kiến:{" "}
                        {new Date(
                          po.expected_delivery_date,
                        ).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="text-xs text-gray-500">
                        Người Đặt: Quản Lý A
                      </div>
                      {/* <div className="text-xs text-gray-500">
                        Cho đơn: {order?.customer_name}
                      </div> */}
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
              const material = materials.find(
                (m) => m.id === pr.material_id,
              );
              const po = getPOByPRId(pr.id);
              const order = getOrderByPRId(pr.id);

              return (
                <div
                  key={pr.id}
                  className="border border-green-200 bg-green-50 rounded-lg p-4"
                >
                  <div className="mb-2">
                    <div className="text-gray-900">
                      {material?.name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Số lượng: {pr.quantity_needed}{" "}
                      {material?.unit}
                    </div>
                  </div>

                  {po && (
                    <div className="space-y-1 mb-3">
                      <div className="text-xs text-gray-500">
                        Nhà cung cấp: {po.supplier}
                      </div>
                      <div className="text-xs text-gray-500">
                        Người Đặt: Quản Lý A
                      </div>
                      <div className="text-xs text-gray-500">
                        Người Nhận: Quản Kho B
                      </div>
                      {/* <div className="text-xs text-gray-500">
                        Cho đơn: {order?.customer_name}
                      </div> */}
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