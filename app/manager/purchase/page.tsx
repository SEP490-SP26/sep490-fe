"use client";
import { materialsApi } from "@/apiRequests/materials";
import { purchasesApi } from "@/apiRequests/purchase";
import { supplierApi } from "@/apiRequests/supplier";
import Loading from "@/app/(overview)/loading";
import SupplierQuoteCard from "@/components/Card/SupplierQuoteCard ";
import { PurchaseOrder, useProduction } from "@/context/ProductionContext";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/utils/toastService";
import { useQuery } from "@tanstack/react-query";
import { Rate, Spin } from "antd";
import { useState, useEffect } from "react";
import { BiEnvelope, BiPlus, BiSearch, BiTime } from "react-icons/bi";
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

interface SelectedMaterial {
  material_id: string;
  quantity: number;
}

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState<
    "pending" | "ordered" | "received"
  >("pending");
  const [showDirectPO, setShowDirectPO] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { materials } = useProduction();

  const [showSupplierPopup, setShowSupplierPopup] = useState(false);
  const [showSupplierByItemPopup, setShowSupplierByItemPopup] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [quotePopupMaterial, setQuotePopupMaterial] = useState<{
    material_id: string | number;
    material_name: string;
    quantity: number;
    unit: string;
  } | null>(null);

  const [selectedMaterials, setSelectedMaterials] = useState<
    SelectedMaterial[]
  >([]);
  const [supplier, setSupplier] = useState("Chọn nhà cung cấp");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [materialQuantities, setMaterialQuantities] = useState<
    Record<string, number>
  >({});
  const [selectedSuppliers, setSelectedSuppliers] = useState<
    Record<string | number, any>
  >({});

  const handleSelectSupplier = (supplier: any) => {
    if (!quotePopupMaterial) return;

    // Lưu supplier đã chọn
    setSelectedSuppliers((prev) => ({
      ...prev,
      [quotePopupMaterial.material_id]: supplier,
    }));

    // Cập nhật selectedMaterials nếu material đó đang được chọn
    setSelectedMaterials((prev) =>
      prev.map((item) =>
        item.material_id === quotePopupMaterial.material_id
          ? {
              ...item,
              supplier_id: supplier.id,
              supplier_name: supplier.name,
              price: supplier.price,
              total_price: supplier.price * quotePopupMaterial.quantity,
            }
          : item
      )
    );

    // Hiển thị thông báo
    alert(
      `Đã chọn nhà cung cấp ${supplier.name} cho ${quotePopupMaterial.material_name}`
    );

    // Đóng popup
    handleClosePopup();
  };

  const {
    isPending,
    error,
    data: suppliersData,
  } = useQuery({
    queryKey: ["supplier"],
    queryFn: async () => {
      try {
        const response = await supplierApi.getList(1, 100);
        // console.log("Response supplier data:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching orders:", error);
        return { orders: [], products: [], materials: [] };
      }
    },
    initialData: [],
    // staleTime: 5 * 60 * 1000,
  });

  // Lấy danh sách đơn đặt hàng
  const { isPending: poLoading, data: poData } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      try {
        const response = await purchasesApi.getList(1, 100);
        // console.log("Response po data:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
  });
  // console.log("poData", poData);

  // Lấy danh sách vật tư cần đặt hàng
  const { data: missing_materials, isPending: materialLoading } = useQuery({
    queryKey: ["missing-materials"],
    queryFn: async () => {
      try {
        const response = await materialsApi.getListMissingMaterial(1, 100);
        // console.log("Response miss data:", response.data);
        return response.data;
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
  });

  // Lấy nhà cung cấp theo material id khi mở popup khảo giá
  const {
    data: suppliers = [],
    isLoading: loadingSuppliers,
    error: supplierError,
    refetch,
  } = useQuery({
    queryKey: ["supplier-by-id", quotePopupMaterial?.material_id],
    queryFn: async () => {
      try {
        if (!quotePopupMaterial?.material_id) {
          return [];
        }

        const response = await supplierApi.getByMaterialId(
          quotePopupMaterial.material_id.toString()
        );
        console.log("Response suppliers by material id:", response);

        // Đảm bảo luôn có return
        return response || [];
      } catch (error: any) {
        console.error("Error fetching suppliers:", error);
        return []; // Luôn return mảng rỗng thay vì undefined
      }
    },
    // enabled: !!quotePopupMaterial,
    // staleTime: 5 * 60 * 1000,
  });

  console.log("supplier by material", suppliers);

  if (materialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // console.log("missing data", missing_materials);

  // Xử lý tạo đơn hàng với nhiều vật tư
  const handleCreateBulkPO = async () => {
    if (selectedMaterials.length === 0) {
      showWarningToast("Vui lòng chọn ít nhất một vật tư để đặt hàng");
      return;
    }

    if (!supplierId || !deliveryDate) {
      showWarningToast("Vui lòng chọn nhà cung cấp và ngày giao hàng");
      return;
    }

    // Chuẩn bị request body
    const requestBody = {
      supplierId: supplierId,
      etaDate: new Date(deliveryDate).toISOString(),
      items: selectedMaterials.map((item: SelectedMaterial) => ({
        materialId: item.material_id,
        quantity: item.quantity,
      })),
    };

    // console.log("Request body:", requestBody);

    try {
      const response = await purchasesApi.createPO(requestBody);
      // console.log("Create PO response:", response);

      if (
        response?.success === true ||
        response?.data?.success === true ||
        response?.status === 200 ||
        response?.status === 201
      ) {
        showSuccessToast("Tạo đơn đặt hàng thành công!");

        // Reset form
        setSelectedMaterials([]);
        setMaterialQuantities({});
        // setSupplierId("");
        setDeliveryDate("");

        // Có thể refetch data nếu cần
        // refetchMissingMaterials();
      } else {
        showErrorToast(response.message || "Tạo đơn đặt hàng thành công!");
      }
    } catch (error) {
      console.error("Error creating PO:", error);
      showErrorToast("Đã xảy ra lỗi khi tạo đơn hàng");
    }
  };

  // Reset khi thành công
  const resetForm = () => {
    setSelectedMaterials([]);
    setSupplierId(null);
    // setSupplierName("");
    setDeliveryDate("");
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

  // Lấy danh sách đơn hàng theo trạng thái
  const getPurchaseOrdersByStatus = (status: "Ordered" | "Delivered") => {
    if (poLoading || !poData) {
      return [];
    }
    return poData.filter((po: any) => po.status === status);
  };

  // Mở popup khảo giá
  const handleOpenQuotePopup = (pr: any, currentQuantity: number) => {
    setQuotePopupMaterial({
      material_id: pr.material_id,
      material_name: pr.material_name,
      quantity: currentQuantity,
      unit: pr.unit,
    });
  };

  const handleClosePopup = () => {
    setQuotePopupMaterial(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 ">
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
            Chờ đặt hàng ({missing_materials.length})
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
            Đang chờ giao ({getPurchaseOrdersByStatus("Ordered").length})
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
            Đã nhận hàng ({getPurchaseOrdersByStatus("Delivered").length})
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
                Vật tư cần mua ({missing_materials.length})
              </h2>

              {/* Table */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          checked={
                            selectedMaterials.length ===
                              missing_materials.length &&
                            missing_materials.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Select all với quantity hiện tại hoặc default
                              const allMaterials = missing_materials.map(
                                (pr: any) => ({
                                  material_id: pr.material_id,
                                  quantity:
                                    materialQuantities[pr.material_id] ||
                                    pr.needed,
                                })
                              );
                              setSelectedMaterials(allMaterials);
                            } else {
                              setSelectedMaterials([]);
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-50">
                        Tên NVL
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-end">
                        SL cần mua
                      </th>
                      <th className="px-4 py-3  text-xs font-medium text-gray-500 uppercase tracking-wider text-end">
                        Tồn Kho
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-37.5">
                        Đơn vị
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày yêu cầu
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {missing_materials.map((pr: any) => {
                      const currentQuantity =
                        materialQuantities[pr.material_id] || pr.needed;

                      return (
                        <tr
                          key={pr.material_id}
                          className={`hover:bg-gray-50 ${
                            selectedMaterials.includes(pr.material_id)
                              ? "bg-blue-50"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedMaterials.some(
                                (m) => m.material_id === pr.material_id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  const quantityToUse =
                                    materialQuantities[pr.material_id] ||
                                    pr.needed;
                                  setSelectedMaterials([
                                    ...selectedMaterials,
                                    {
                                      material_id: pr.material_id,
                                      quantity: quantityToUse,
                                    },
                                  ]);
                                } else {
                                  setSelectedMaterials(
                                    selectedMaterials.filter(
                                      (item) =>
                                        item.material_id !== pr.material_id
                                    )
                                  );
                                }
                              }}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900">
                                {pr.material_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Mã: {pr.material_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-end">
                              <input
                                type="number"
                                value={currentQuantity.toFixed(1)}
                                onChange={(e) => {
                                  const newValue =
                                    parseFloat(e.target.value) || 0;

                                  // Cập nhật quantity trong state
                                  setMaterialQuantities((prev) => ({
                                    ...prev,
                                    [pr.material_id]: newValue,
                                  }));

                                  // Nếu material đã được chọn, cập nhật quantity trong selectedMaterials
                                  setSelectedMaterials((prev) =>
                                    prev.map((item) =>
                                      item.material_id === pr.material_id
                                        ? { ...item, quantity: newValue }
                                        : item
                                    )
                                  );
                                }}
                                min="0"
                                step="0.1"
                                className="text-end w-30"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-end">
                              {pr.available}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {pr.unit}
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
                            {new Date(pr.request_date).toLocaleDateString(
                              "vi-VN"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenQuotePopup(pr, currentQuantity)
                              }
                              className="mt-2 bg-accent px-2 py-1 rounded-md text-primary"
                            >
                              Khảo giá
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Supplier Selection by item id Popup */}
                {quotePopupMaterial && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
                      {/* Header */}
                      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Khảo giá: {quotePopupMaterial.material_name}
                            </h3>
                            Mã vật tư:{" "}
                            <span className="font-medium">
                              {quotePopupMaterial.material_id}
                            </span>
                          </div>

                          {/* <div className="text-sm text-gray-600 mt-1"> */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              Số lượng:{" "}
                              <span className="font-medium">
                                {quotePopupMaterial.quantity}{" "}
                                {quotePopupMaterial.unit}
                              </span>
                            </div>
                          </div>
                          {/* </div> */}

                          <button
                            onClick={handleClosePopup}
                            className="text-gray-400 hover:text-gray-600 text-xl"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 overflow-y-auto max-h-[60vh]">
                        {loadingSuppliers ? (
                          <div className="flex justify-center items-center py-12">
                            <Spin size="large" />
                            <span className="ml-3 text-gray-600">
                              Đang tải danh sách nhà cung cấp...
                            </span>
                          </div>
                        ) : supplierError ? (
                          <div className="text-center py-12">
                            <div className="text-red-500 mb-2">
                              Không thể tải danh sách nhà cung cấp
                            </div>
                            <button
                              onClick={() => refetch()}
                              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Thử lại
                            </button>
                          </div>
                        ) : suppliers.length === 0 ? (
                          <div className="text-center py-12 text-gray-400">
                            <p>
                              Không tìm thấy nhà cung cấp nào cho vật tư này
                            </p>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-medium text-gray-900 mb-4">
                              Có {suppliers.length} nhà cung cấp có thể cung cấp
                            </h4>
                            <div className="space-y-4">
                              {suppliers.map((supplier: any) => (
                                <SupplierQuoteCard
                                  key={supplier.id}
                                  supplier={supplier}
                                  material={quotePopupMaterial}
                                  onSelect={() =>
                                    handleSelectSupplier(supplier)
                                  }
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {missing_materials.length === 0 && (
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
                                {suppliersData
                                  .filter(
                                    (s: any) =>
                                      s.name
                                        .toLowerCase()
                                        .includes(
                                          supplierSearch.toLowerCase()
                                        ) || supplierSearch === ""
                                  )
                                  .map((s: any) => (
                                    <div
                                      key={s.supplierId}
                                      onClick={() => {
                                        setSupplierId(s.supplierId);
                                        setSupplier(s.name);
                                        setShowSupplierPopup(false);
                                      }}
                                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                        supplier === s.name
                                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                                      }`}
                                    >
                                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className=" font-semibold text-gray-900">
                                              {s.name}
                                              {s.mainMaterialType && (
                                                <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs mr-2">
                                                  {s.mainMaterialType}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              <span className="text-gray-400">
                                                •
                                              </span>
                                              <span className="ml-2">
                                                {s.contactPerson} - {s.phone}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600 mt-3">
                                            <div className="flex items-center gap-2">
                                              <div className="flex items-center">
                                                <Rate
                                                  disabled
                                                  allowHalf
                                                  defaultValue={s.rating || 0}
                                                  className="text-sm"
                                                />
                                                <span className="ml-2 font-medium">
                                                  {s.rating?.toFixed(1) ||
                                                    "0.0"}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <BiTime className="w-4 h-4" />
                                              <span>
                                                Thời gian giao:{" "}
                                                {s.deliveryTime || "Liên hệ"}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                              <BiEnvelope className="w-4 h-4" />
                                              <span className="truncate">
                                                {s.email || "Chưa có email"}
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {/* <div className="flex-shrink-0 space-y-2">
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-full"
            onClick={() => onSelect(supplier)}
          >
            <BiCheck className="w-4 h-4" />
            Chọn nhà cung cấp
          </button>

          <button
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm w-full"
            onClick={() => (window.location.href = `tel:${supplier.phone}`)}
          >
            <BiPhone className="w-4 h-4" />
            Gọi điện liên hệ
          </button>
        </div> */}
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
            {getPurchaseOrdersByStatus("Ordered").map((orderGroup: any) => (
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
                        {new Date(orderGroup.etaDate).toLocaleDateString(
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
                    {orderGroup.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.materialName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {item.qtyOrdered} {item.unit}
                          </div>
                          {/* <div className="text-xs text-gray-500">
                            Mã: {item.pr?.material_id}
                          </div> */}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-gray-50 border-t border-gray-100 p-4">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Người đặt:</span>{" "}
                      {orderGroup.createdByName}
                    </div>
                    <div>
                      Đặt ngày:{" "}
                      {new Date(orderGroup.createdAt).toLocaleDateString(
                        "vi-VN"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {getPurchaseOrdersByStatus("Ordered").length === 0 && (
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
            {poData
              .filter((po: any) => po.status === "Delivered")
              .map((po: any) => (
                <div
                  key={po.purchaseId}
                  className="bg-white rounded-lg border border-green-500 shadow-md overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="bg-green-50 border-b border-green-100 p-4">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                      <div>
                        <div className="font-semibold text-green-700">
                          {po.supplierName}
                        </div>
                        <div className="text-sm text-green-600">
                          Đã giao:{" "}
                          {new Date(po.etaDate).toLocaleDateString("vi-VN")}
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
                      {po.items.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.materialName}
                            </div>
                            {/* <div className="text-sm text-gray-500">
                              Cho đơn: {item.materialName}
                            </div> */}
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900">
                              {item.qtyOrdered} {item.unit}
                            </div>
                            {/* <div className="text-xs text-gray-500">
                              Mã: {item.pr?.material_id}
                            </div> */}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="bg-green-50 border-t border-green-100 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Người đặt:</span> Quản lý
                        A
                      </div>
                      <div>
                        <span className="font-medium">Ngày đặt:</span>{" "}
                        {new Date(po.items[0]?.created_at).toLocaleDateString(
                          "vi-VN"
                        )}
                      </div>
                      <div>
                        <span className="font-medium">Người nhận:</span> Quản
                        kho B
                      </div>

                      <div>
                        <span className="font-medium">Ngày nhận:</span>{" "}
                        {new Date(po.deliveryDate).toLocaleDateString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            {getPurchaseOrdersByStatus("Delivered").length === 0 && (
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
                      {suppliersData.map((supplier: any) => (
                        <option key={supplier.supplierId} value={supplier}>
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
