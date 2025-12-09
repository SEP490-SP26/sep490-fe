"use client";
import { useProduction } from "@/context/ProductionContext";
import { showWarningToast } from "@/utils/toastService";
import { useState, useEffect } from "react";
import { BiPlus, BiSearch } from "react-icons/bi";
import { BsCheckCircle, BsClock, BsTruck, BsX } from "react-icons/bs";

// Thêm vào đầu component
const suppliersWithRating = [
  {
    id: 1,
    name: "Công ty TNHH Giấy Sài Gòn",
    rating: 4.8,
    reviewCount: 245,
    deliveryTime: "1-2 ngày",
    reliability: "Rất cao",
  },
  {
    id: 2,
    name: "Nhà máy Giấy Long An",
    rating: 4.5,
    reviewCount: 189,
    deliveryTime: "2-3 ngày",
    reliability: "Cao",
  },
  {
    id: 3,
    name: "Công ty CP Mực in Đông Dương",
    rating: 4.9,
    reviewCount: 312,
    deliveryTime: "1 ngày",
    reliability: "Rất cao",
  },
  {
    id: 4,
    name: "Công ty TNHH Vật tư In ấn Hà Nội",
    rating: 4.2,
    reviewCount: 156,
    deliveryTime: "3-4 ngày",
    reliability: "Trung bình",
  },
  {
    id: 5,
    name: "Tập đoàn Giấy Việt Nam",
    rating: 4.7,
    reviewCount: 421,
    deliveryTime: "2-3 ngày",
    reliability: "Cao",
  },
];

// Hàm render rating stars
const renderRatingStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <span className="inline-flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <svg
          key={`full-${i}`}
          className="w-4 h-4 text-yellow-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}

      {halfStar && (
        <svg
          className="w-4 h-4 text-yellow-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 1a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L10 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L1.821 6.13a.75.75 0 01.416-1.28l4.21-.611L9.327 1.42A.75.75 0 0110 1zm0 2.445L8.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L10 3.445v.001z" />
        </svg>
      )}

      {[...Array(emptyStars)].map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="w-4 h-4 text-gray-300"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}

      <span className="ml-1 text-sm font-medium text-gray-700">
        {rating.toFixed(1)}
      </span>
    </span>
  );
};

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState<
    "pending" | "ordered" | "received"
  >("pending");
  const [showDirectPO, setShowDirectPO] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    materials,
    orders,
    purchaseRequests,
    purchaseOrders,
    createPurchaseOrder,
  } = useProduction();

  const [showSupplierPopup, setShowSupplierPopup] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
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
    setDeliveryDate(defaultDate.toISOString().split("T")[0]);
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
    return today.toISOString().split("T")[0];
  };

  // Tính max date (30 ngày sau)
  const getMaxDate = () => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    return maxDate.toISOString().split("T")[0];
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
        {/* Tab 1: Chờ đặt hàng - TABLE LAYOUT */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">
                Vật tư cần mua ({pendingMaterials.length})
              </h2>

              {/* Table layout cho các item trên 1 hàng */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedMaterials.length ===
                              pendingMaterials.length &&
                            pendingMaterials.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMaterials(
                                pendingMaterials.map((p) => p.id)
                              );
                            } else {
                              setSelectedMaterials([]);
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                        Tên NVL
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng
                      </th>
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                Đơn hàng
              </th> */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày yêu cầu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingMaterials.map((pr) => (
                      <tr
                        key={pr.id}
                        className={`hover:bg-gray-50 ${
                          selectedMaterials.includes(pr.id) ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedMaterials.includes(pr.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterials([
                                  ...selectedMaterials,
                                  pr.id,
                                ]);
                              } else {
                                setSelectedMaterials(
                                  selectedMaterials.filter((id) => id !== pr.id)
                                );
                              }
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-gray-900">
                              {pr.material?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Mã: {pr.material_id}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {pr.quantity_needed} {pr.material?.unit}
                          </div>
                        </td>
                        {/* <td className="px-4 py-3">
                  {pr.order ? (
                    <>
                      <div className="font-medium text-gray-900 truncate max-w-[140px]">
                        {pr.order.customer_name}
                      </div>
                      <div className="text-sm text-gray-500">SL: {pr.order.quantity}</div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td> */}
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(pr.created_at).toLocaleDateString("vi-VN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pendingMaterials.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <BsClock className="w-12 h-12 mx-auto mb-3" />
                    <p>Không có vật tư nào cần đặt hàng</p>
                  </div>
                )}
              </div>
            </div>

            {/* Form tạo đơn hàng */}
            {selectedMaterials.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                    <div>
                      <label className="block text-gray-700 mb-2">
                        Nhà cung cấp
                      </label>

                      {/* Input để mở popup */}
                      <div className="relative">
                        <div
                          onClick={() => setShowSupplierPopup(true)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer flex items-center justify-between hover:bg-gray-50"
                        >
                          <span
                            className={
                              supplier ? "text-gray-900" : "text-gray-500"
                            }
                          >
                            {supplier || "Chọn nhà cung cấp"}
                          </span>
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>

                      {/* Hiển thị thông tin NCC được chọn */}
                      {/* {supplier && (
                        <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          {(() => {
                            const selectedSupplier = suppliersWithRating.find(
                              (s) => s.name === supplier
                            );
                            if (!selectedSupplier) return null;

                            return (
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-blue-700">
                                    {selectedSupplier.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="flex items-center gap-1">
                                      {renderRatingStars(
                                        selectedSupplier.rating
                                      )}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Đánh giá: {selectedSupplier.reviewCount}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      Giao hàng: {selectedSupplier.deliveryTime}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setShowSupplierPopup(true)}
                                  className="text-sm text-blue-600 hover:text-blue-800"
                                >
                                  Thay đổi
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      )} */}

                      {/* Supplier Selection Popup */}
                      {showSupplierPopup && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
                            {/* Popup Header */}
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  Chọn nhà cung cấp
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Chọn nhà cung cấp phù hợp nhất
                                </p>
                              </div>
                              <button
                                onClick={() => setShowSupplierPopup(false)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <svg
                                  className="w-6 h-6"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>

                            {/* Popup Content */}
                            <div className="p-6 overflow-y-auto max-h-[60vh]">
                              {/* Search Bar */}
                              <div className="mb-6">
                                <div className="relative">
                                  <svg
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                  </svg>
                                  <input
                                    type="text"
                                    placeholder="Tìm kiếm nhà cung cấp..."
                                    value={supplierSearch}
                                    onChange={(e) =>
                                      setSupplierSearch(e.target.value)
                                    }
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                              </div>

                              {/* Supplier List */}
                              <div className="space-y-3">
                                {suppliersWithRating
                                  .filter(
                                    (s) =>
                                      s.name
                                        .toLowerCase()
                                        .includes(
                                          supplierSearch.toLowerCase()
                                        ) || supplierSearch === ""
                                  )
                                  .map((s) => (
                                    <div
                                      key={s.id}
                                      onClick={() => {
                                        setSupplier(s.name);
                                        setShowSupplierPopup(false);
                                      }}
                                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                        supplier === s.name
                                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <div className="font-semibold text-gray-900">
                                              {s.name}
                                            </div>
                                            <div
                                              className={`px-2 py-1 rounded text-xs font-medium ${
                                                s.reliability === "Rất cao"
                                                  ? "bg-green-100 text-green-700"
                                                  : s.reliability === "Cao"
                                                  ? "bg-blue-100 text-blue-700"
                                                  : "bg-yellow-100 text-yellow-700"
                                              }`}
                                            >
                                              {s.reliability}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                              {renderRatingStars(s.rating)}
                                             
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                              </svg>
                                              <span>
                                                Giao hàng: {s.deliveryTime}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <svg
                                                className="w-4 h-4 text-gray-400"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                              </svg>
                                              <span>Tỷ lệ đúng hạn: 95%</span>
                                            </div>
                                          </div>

                                          {/* Additional Info */}
                                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                                        
                                            <div className="flex items-center gap-1">
                                              <svg
                                                className="w-3 h-3"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                              <span>Chất lượng: Ổn định</span>
                                            </div>
                                          </div>
                                        </div>

                                       
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Popup Footer */}
                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
                              <div className="text-sm text-gray-600">
                                Đã chọn:{" "}
                                <span className="font-semibold">
                                  {supplier || "Chưa chọn"}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setShowSupplierPopup(false)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={() => {
                                    if (supplier) {
                                      setShowSupplierPopup(false);
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                                  disabled={!supplier}
                                >
                                  Xác nhận
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  {/* pick time */}
                    <div>
                      <label className="block text-gray-700 mb-2">
                        Ngày giao dự kiến
                      </label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={getMinDate()}
                        max={getMaxDate()}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Chọn ngày từ{" "}
                        {new Date(getMinDate()).toLocaleDateString("vi-VN")} đến{" "}
                        {new Date(getMaxDate()).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-700">
                      Đã chọn{" "}
                      <span className="text-blue-600">
                        {selectedMaterials.length}
                      </span>{" "}
                      vật tư
                    </div>
                    <button
                      onClick={handleCreateBulkPO}
                      disabled={!supplier || !deliveryDate}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
                    >
                      Tạo đơn hàng
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Đang chờ giao */}
        {activeTab === "ordered" && (
          <div className="space-y-6">
            {getPurchaseOrdersByStatus("ordered").map((orderGroup) => (
              <div
                key={orderGroup.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-blue-50 border-b border-blue-100 p-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                      <div className="font-semibold text-blue-700">
                        {orderGroup.supplier}
                      </div>
                      <div className="text-sm text-blue-600">
                        Dự kiến giao:{" "}
                        {new Date(orderGroup.deliveryDate).toLocaleDateString(
                          "vi-VN"
                        )}
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
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.material?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Cho đơn: {item.customer_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {item.pr?.quantity_needed} {item.material?.unit}
                          </div>
                          <div className="text-xs text-gray-500">
                            Mã: {item.pr?.material_id}
                          </div>
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
                      Đặt ngày:{" "}
                      {new Date(
                        orderGroup.items[0]?.created_at
                      ).toLocaleDateString("vi-VN")}
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
              <div
                key={orderGroup.id}
                className="bg-white rounded-lg border border-green-100 overflow-hidden"
              >
                {/* Card Header */}
                <div className="bg-green-50 border-b border-green-100 p-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div>
                      <div className="font-semibold text-green-700">
                        {orderGroup.supplier}
                      </div>
                      <div className="text-sm text-green-600">
                        Đã giao:{" "}
                        {new Date(orderGroup.deliveryDate).toLocaleDateString(
                          "vi-VN"
                        )}
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
                      <div
                        key={index}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.material?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Cho đơn: {item.customer_name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {item.pr?.quantity_needed} {item.material?.unit}
                          </div>
                          <div className="text-xs text-gray-500">
                            Mã: {item.pr?.material_id}
                          </div>
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
                      <span className="font-medium">Người nhận:</span> Quản kho
                      B
                    </div>
                    <div>
                      <span className="font-medium">Ngày đặt:</span>{" "}
                      {new Date(
                        orderGroup.items[0]?.created_at
                      ).toLocaleDateString("vi-VN")}
                    </div>
                    <div>
                      <span className="font-medium">Ngày nhận:</span>{" "}
                      {new Date(orderGroup.deliveryDate).toLocaleDateString(
                        "vi-VN"
                      )}
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
                  <label className="block text-gray-700 mb-2">
                    Vật tư cần mua
                  </label>
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
                    <label className="block text-gray-700 mb-2">
                      Nhà cung cấp
                    </label>
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
