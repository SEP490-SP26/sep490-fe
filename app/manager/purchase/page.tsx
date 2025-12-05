"use client";
import { useProduction } from "@/context/ProductionContext";
import { showWarningToast } from "@/utils/toastService";
import { useState, useEffect } from "react";
import { BiPlus, BiSearch } from "react-icons/bi";
import { BsCheckCircle, BsClock, BsTruck, BsX } from "react-icons/bs";

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState<"pending" | "ordered" | "received">("pending");
  const [showDirectPO, setShowDirectPO] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    materials,
    orders,
    purchaseRequests,
    purchaseOrders,
    createPurchaseOrder,
  } = useProduction();

  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [supplier, setSupplier] = useState("Công ty TNHH Giấy Sài Gòn");
  const [deliveryDate, setDeliveryDate] = useState("");

  // Danh sách nhà cung cấp mẫu
  const suppliers = [
    "Công ty TNHH Giấy Sài Gòn",
    "Nhà máy Giấy Long An",
    "Công ty CP Mực in Đông Dương",
    "Công ty TNHH Vật tư In ấn Hà Nội",
    "Tập đoàn Giấy Việt Nam",
  ];

  // Tính ngày mặc định (2 ngày sau)
  useEffect(() => {
    const today = new Date();
    const defaultDate = new Date(today);
    defaultDate.setDate(today.getDate() + 2);
    // setDeliveryDate(defaultDate.toISOString().split('T')[0]);
  }, []);

  // Lấy danh sách vật tư cần mua (pending)
  const pendingMaterials = purchaseRequests
    .filter((pr) => pr.status === "pending")
    .map((pr) => {
      const material = materials.find((m) => m.id === pr.material_id);
      const order = orders.find((o) => o.id === pr.order_id);
      return {
        ...pr,
        material,
        order,
      };
    });

  // Xử lý tạo đơn hàng với nhiều vật tư
  const handleCreateBulkPO = () => {
    if (selectedMaterials.length === 0) {
      showWarningToast("Vui lòng chọn ít nhất một vật tư để đặt hàng");
      return;
    }

    if (!supplier || !deliveryDate) {
      showWarningToast("Vui lòng chọn nhà cung cấp và ngày giao hàng");
      return;
    }

    // Tạo đơn hàng cho từng vật tư đã chọn
    selectedMaterials.forEach((prId) => {
      createPurchaseOrder(prId, supplier, deliveryDate);
    });

    // Reset form
    setSelectedMaterials([]);
    setSupplier("Công ty TNHH Giấy Sài Gòn");
    
    // Set lại delivery date mặc định
    const today = new Date();
    const defaultDate = new Date(today);
    defaultDate.setDate(today.getDate() + 2);
    setDeliveryDate(defaultDate.toISOString().split('T')[0]);
  };

  // Lấy danh sách đơn hàng theo trạng thái
  const getPurchaseOrdersByStatus = (status: "ordered" | "delivered") => {
    const pos = purchaseOrders.filter((po) => po.status === status);
    
    // Nhóm các PO theo supplier và delivery date
    const groupedOrders: Record<string, any[]> = {};
    
    pos.forEach((po) => {
      const pr = purchaseRequests.find((p) => p.id === po.pr_id);
      const material = materials.find((m) => m.id === pr?.material_id);
      const order = orders.find((o) => o.id === pr?.order_id);
      
      const key = `${po.supplier}-${po.expected_delivery_date}`;
      
      if (!groupedOrders[key]) {
        groupedOrders[key] = [];
      }
      
      groupedOrders[key].push({
        ...po,
        pr,
        material,
        order,
        customer_name: order?.customer_name || "N/A",
      });
    });
    
    return Object.entries(groupedOrders).map(([key, items]) => ({
      id: key,
      supplier: items[0].supplier,
      deliveryDate: items[0].expected_delivery_date,
      items: items,
      status: items[0].status,
    }));
  };

  // Tính min date (hôm nay)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Tính max date (30 ngày sau)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header với Tab Bar và Search */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Đặt hàng</h1>
          
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm vật tư, nhà cung cấp, mã đơn hàng..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "pending"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BsClock className="w-4 h-4" />
            Chờ đặt hàng ({pendingMaterials.length})
          </button>
          <button
            onClick={() => setActiveTab("ordered")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "ordered"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BsTruck className="w-4 h-4" />
            Đang chờ giao ({getPurchaseOrdersByStatus("ordered").length})
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              activeTab === "received"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BsCheckCircle className="w-4 h-4" />
            Đã nhận hàng ({getPurchaseOrdersByStatus("delivered").length})
          </button>
        </div>
      </div>

      {/* Nội dung theo Tab */}
      <div className="mt-6">
        {/* Tab 1: Chờ đặt hàng */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">
                Vật tư cần mua ({pendingMaterials.length})
              </h2>
              
              {/* Danh sách vật tư với checkbox */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {pendingMaterials.map((pr) => (
                  <div
                    key={pr.id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedMaterials.includes(pr.id)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMaterials.includes(pr.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMaterials([...selectedMaterials, pr.id]);
                          } else {
                            setSelectedMaterials(
                              selectedMaterials.filter((id) => id !== pr.id)
                            );
                          }
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-gray-900">
                              {pr.material?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Số lượng: {pr.quantity_needed} {pr.material?.unit}
                            </div>
                          </div>
                          {pr.order && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                              Đơn: {pr.order.customer_name}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Mã NVL: {pr.material_id} • Yêu cầu từ: {new Date(pr.created_at).toLocaleDateString("vi-VN")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {pendingMaterials.length === 0 && (
                  <div className="text-gray-400 text-center py-12">
                    <BsClock className="w-12 h-12 mx-auto mb-3" />
                    <p>Không có vật tư nào cần đặt hàng</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form tạo đơn hàng */}
            {selectedMaterials.length > 0 && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-4">Tạo đơn đặt hàng ({selectedMaterials.length} vật tư)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-700 mb-2">Nhà cung cấp</label>
                    <div className="flex gap-2">
                      <select
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {suppliers.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {/* <button
                        onClick={() => setSupplier("")}
                        className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Tự nhập
                      </button> */}
                    </div>
                    {!supplier && (
                      <input
                        type="text"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="Nhập tên nhà cung cấp"
                        className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 mb-2">Ngày giao dự kiến</label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      min={getMinDate()}
                      max={getMaxDate()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Chọn ngày từ {new Date(getMinDate()).toLocaleDateString("vi-VN")} đến {new Date(getMaxDate()).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedMaterials([])}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy chọn
                  </button>
                  <button
                    onClick={handleCreateBulkPO}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Tạo đơn hàng ({selectedMaterials.length} vật tư)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Đang chờ giao */}
        {activeTab === "ordered" && (
          <div className="space-y-6">
            {getPurchaseOrdersByStatus("ordered").map((orderGroup) => (
              <div key={orderGroup.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Card Header */}
                <div className="bg-blue-50 border-b border-blue-100 p-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                      <div className="font-semibold text-blue-700">{orderGroup.supplier}</div>
                      <div className="text-sm text-blue-600">
                        Dự kiến giao: {new Date(orderGroup.deliveryDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BsTruck className="w-5 h-5 text-blue-500" />
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        Đang vận chuyển
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Card Body - Danh sách sản phẩm */}
                <div className="p-4">
                  <div className="space-y-3">
                    {orderGroup.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <div className="font-medium text-gray-900">{item.material?.name}</div>
                          <div className="text-sm text-gray-500">Cho đơn: {item.customer_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{item.pr?.quantity_needed} {item.material?.unit}</div>
                          <div className="text-xs text-gray-500">Mã: {item.pr?.material_id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Card Footer */}
                <div className="bg-gray-50 border-t border-gray-100 p-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Người đặt:</span> Quản lý A
                    </div>
                    <div>
                      Đặt ngày: {new Date(orderGroup.items[0]?.created_at).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {getPurchaseOrdersByStatus("ordered").length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <BsTruck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Không có đơn hàng đang chờ giao</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Đã nhận hàng */}
        {activeTab === "received" && (
          <div className="space-y-6">
            {getPurchaseOrdersByStatus("delivered").map((orderGroup) => (
              <div key={orderGroup.id} className="bg-white rounded-lg border border-green-100 overflow-hidden">
                {/* Card Header */}
                <div className="bg-green-50 border-b border-green-100 p-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                      <div className="font-semibold text-green-700">{orderGroup.supplier}</div>
                      <div className="text-sm text-green-600">
                        Đã giao: {new Date(orderGroup.deliveryDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BsCheckCircle className="w-5 h-5 text-green-500" />
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        Đã nhập kho
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Card Body - Danh sách sản phẩm */}
                <div className="p-4">
                  <div className="space-y-3">
                    {orderGroup.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <div className="font-medium text-gray-900">{item.material?.name}</div>
                          <div className="text-sm text-gray-500">Cho đơn: {item.customer_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{item.pr?.quantity_needed} {item.material?.unit}</div>
                          <div className="text-xs text-gray-500">Mã: {item.pr?.material_id}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Card Footer */}
                <div className="bg-green-50 border-t border-green-100 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Người đặt:</span> Quản lý A
                    </div>
                    <div>
                      <span className="font-medium">Người nhận:</span> Quản kho B
                    </div>
                    <div>
                      <span className="font-medium">Ngày đặt:</span> {new Date(orderGroup.items[0]?.created_at).toLocaleDateString("vi-VN")}
                    </div>
                    <div>
                      <span className="font-medium">Ngày nhận:</span> {new Date(orderGroup.deliveryDate).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {getPurchaseOrdersByStatus("delivered").length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <BsCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Chưa có đơn hàng nào đã nhận</p>
              </div>
            )}
          </div>
        )}
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
                  <label className="block text-gray-700 mb-2">Vật tư cần mua</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Chọn vật tư</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Số lượng</label>
                    <input
                      type="number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số lượng"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 mb-2">Nhà cung cấp</label>
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Chọn nhà cung cấp</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier} value={supplier}>
                          {supplier}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
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
    </div>
  );
}