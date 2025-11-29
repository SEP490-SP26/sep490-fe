'use client';
import { useProduction } from "@/context/ProductionContext";
import { useState } from "react";
import { BiCheckCircle, BiPackage, BiXCircle } from "react-icons/bi";
import { FiAlertCircle } from "react-icons/fi";

export default function OrderListPage() {
  const {
    products,
    materials,
    orders,
    checkOrderFulfillment,
    createPurchaseRequest,
  } = useProduction();

  const [checkingOrder, setCheckingOrder] = useState<string | null>(null);

  const handleCheckFulfillment = (orderId: string) => {
    setCheckingOrder(orderId);
    const canFulfill = checkOrderFulfillment(orderId);

    setTimeout(() => {
      setCheckingOrder(null);
    }, 500);
  };

  const handleCreatePR = (orderId: string) => {
    console.log("order id: ", orderId);
    createPurchaseRequest(orderId);
    alert(`Đã tạo yêu cầu mua hàng cho nguyên vật liệu thiếu ${orderId}`);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      scheduled: "bg-blue-100 text-blue-700",
      in_production: "bg-yellow-100 text-yellow-700",
      completed: "bg-green-100 text-green-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Chờ xử lý",
      scheduled: "Đã lên lịch",
      in_production: "Đang sản xuất",
      completed: "Hoàn thành",
    };
    return labels[status] || status;
  };

  return (
    <div>
      <h1 className="mb-8">Danh Sách Đơn Hàng</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2>Tất cả đơn hàng</h2>
          <span className="text-gray-500">
            Tổng số: {orders.length} đơn hàng
          </span>
        </div>

        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {orders.length > 0 ? (
            [...orders].reverse().map((order) => {
              const product = products.find((p) => p.id === order.product_id);

              return (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-gray-900 font-medium">
                          {order.customer_name}
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {order.id}
                        </div>
                      </div>
                      <div className="text-gray-600 text-sm">
                        <div>Sản phẩm: {product?.name}</div>
                        <div>Số lượng: {order.quantity}</div>
                        <div>
                          Ngày giao:{" "}
                          {new Date(order.delivery_date).toLocaleDateString(
                            "vi-VN"
                          )}
                        </div>
                        <div>
                          Ngày tạo:{" "}
                          {new Date(order.created_at).toLocaleDateString(
                            "vi-VN"
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {order.status === "pending" &&
                    order.can_fulfill === undefined && (
                      <button
                        onClick={() => handleCheckFulfillment(order.id)}
                        disabled={checkingOrder === order.id}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
                      >
                        <BiPackage className="w-4 h-4" />
                        {checkingOrder === order.id
                          ? "Đang kiểm tra..."
                          : "Kiểm tra khả năng đáp ứng"}
                      </button>
                    )}

                  {order.can_fulfill === true && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <BiCheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">
                        Có thể sản xuất
                      </span>
                    </div>
                  )}

                  {order.can_fulfill === false && order.missing_materials && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <BiXCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-red-700 font-medium mb-2">
                            Thiếu nguyên vật liệu:
                          </div>
                          <div className="space-y-1">
                            {order.missing_materials.map((mm) => {
                              const material = materials.find(
                                (m) => m.id === mm.material_id
                              );
                              return (
                                <div
                                  key={mm.material_id}
                                  className="text-red-600 text-sm"
                                >
                                  • {material?.name}: Cần {mm.needed}{" "}
                                  {material?.unit}, Hiện có {mm.available}{" "}
                                  {material?.unit}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCreatePR(order.id)}
                        className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiAlertCircle className="w-4 h-4" />
                        Tạo yêu cầu mua hàng
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">
                Chưa có đơn hàng nào
              </div>
              <div className="text-gray-500 text-sm">
                Hãy tạo đơn hàng đầu tiên của bạn
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}