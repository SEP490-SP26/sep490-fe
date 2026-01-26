"use client";
import { materialsApi } from "@/apiRequests/materials";
import { purchasesApi } from "@/apiRequests/purchase";
import { supplierApi } from "@/apiRequests/supplier";
import SupplierQuoteCard from "@/components/Card/SupplierQuoteCard ";
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { useProduction } from "@/context/ProductionContext";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/utils/toastService";
import { disabledDate } from "@/utils/vietnamHolidays";
import { useQuery } from "@tanstack/react-query";
import { Rate, Spin, Modal, DatePicker } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { BiEnvelope, BiPlus, BiSearch, BiTime } from "react-icons/bi";
import { BsCheckCircle, BsClock, BsTruck, BsX } from "react-icons/bs";

interface SelectedMaterial {
  material_id: string;
  ui_id: string;
  quantity: number;
  price: number;
}

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState<
    "pending" | "ordered" | "received"
  >("pending");
  const [directMaterialId, setDirectMaterialId] = useState<string | null>(null);
  const [directQuantity, setDirectQuantity] = useState<number | null>(null);
  const [directSupplierId, setDirectSupplierId] = useState<number | null>(null);
  //=====
  const [showDirectPO, setShowDirectPO] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { materials } = useProduction();

  const [showSupplierPopup, setShowSupplierPopup] = useState(false);
  // const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [quotePopupMaterial, setQuotePopupMaterial] = useState<{
    material_id: string | number;
    ui_id: string; // Added ui_id
    material_name: string;
    quantity: number;
    unit: string;
  } | null>(null);

  const [selectedMaterials, setSelectedMaterials] = useState<
    SelectedMaterial[]
  >([]);
  const [supplier, setSupplier] = useState("Chọn nhà cung cấp");
  // const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null);
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
      [quotePopupMaterial.material_id]: supplier, // Keep using material_id for supplier cache? Or ui_id?
      // If we authorize different suppliers for split lines of same material, we should use ui_id?
      // But selectedSuppliers seems to be a cache map.
      // Let's keep material_id for general cache, but for selectedMaterials update we MUST use ui_id.
    }));

    // Cập nhật selectedMaterials nếu material đó đang được chọn
    setSelectedMaterials((prev) =>
      prev.map((item) =>
        item.ui_id === quotePopupMaterial.ui_id // Match by UI ID
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
  const { isPending: poLoading, data: poData, refetch: refetchPO } = useQuery({
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
  const { data: missing_materials = [], isPending: materialLoading, refetch: refetchMissingMaterials } = useQuery({
    queryKey: ["missing-materials"],
    queryFn: async () => {
      try {
        const response = await materialsApi.getListMissingMaterial(1, 100);
        // console.log("Response miss data:", response.data);
        //Chì lấy is_buy = false
        return response.data.filter((m: any) => m.is_buy === false);
      } catch (error) {
        console.error("Error fetching purchase orders:", error);
        return [];
      }
    },
  });

  const [displayMaterials, setDisplayMaterials] = useState<any[]>([]);
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  // Sync missing_materials to displayMaterials
  useEffect(() => {
    if (missing_materials && missing_materials.length > 0 && !isDataInitialized) {
      // Initialize with unique IDs
      const initialized = missing_materials.map((m: any, index: number) => ({
        ...m,
        ui_id: `${m.material_id}-${Date.now()}-${index}`, // Simple unique ID
        quantity: m.needed, // Initialize quantity
        originalNeeded: m.needed // Track original if needed for logic, though splitting changes this context
      }));
      setDisplayMaterials(initialized);
      setIsDataInitialized(true);
    }
  }, [missing_materials, isDataInitialized]);

  // Also handle refetch if needed (reset). For now, assume single load.

  const handleQuantityBlur = (ui_id: string, newQuantity: number) => {
    // Valid Implementation outside setState
    const currentItem = displayMaterials.find((item) => item.ui_id === ui_id);
    if (!currentItem) return;

    // Check condition
    if (newQuantity < currentItem.needed && newQuantity > 0) {
      Modal.confirm({
        title: "Xác nhận tách dòng",
        content: (
          <div>
            <p>Bạn có muốn tách nguyên vật liệu này thành 2 yêu cầu mua hàng không?</p>
            {/* <ul className="mt-2 list-disc list-inside">
              <li>
                Dòng 1: <b>{newQuantity}</b> {currentItem.unit}
              </li>
              <li>
                Dòng 2: <b>{(currentItem.needed - newQuantity).toFixed(1)}</b>{" "}
                {currentItem.unit}
              </li>
            </ul> */}
          </div>
        ),
        okText: "Đồng ý",
        cancelText: "Không",
        onOk() {
          setDisplayMaterials((prev) => {
            const idx = prev.findIndex((item) => item.ui_id === ui_id);
            if (idx === -1) return prev;

            const item = prev[idx];
            const remainder = item.needed - newQuantity;

            // Update Current Item
            const updatedItem = {
              ...item,
              quantity: newQuantity,
              needed: newQuantity, // Update needed to match the new split reality
            };

            // Create New Item
            const newItem = {
              ...item,
              ui_id: `${item.material_id}-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}`,
              quantity: remainder,
              needed: remainder,
            };

            const newArr = [...prev];
            newArr[idx] = updatedItem;
            newArr.splice(idx + 1, 0, newItem); // Insert after

            return newArr;
          });
        },
        onCancel() {
          // User denied split.
          // Just update the quantity but allow it to be less than needed
          setDisplayMaterials((prev) =>
            prev.map((item) =>
              item.ui_id === ui_id ? { ...item, quantity: newQuantity } : item
            )
          );
        },
      });
    } else {
      // Just update quantity
      setDisplayMaterials((prev) =>
        prev.map((item) =>
          item.ui_id === ui_id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

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

    // if (!supplierId || !deliveryDate) {
    //   showWarningToast("Vui lòng chọn nhà cung cấp và ngày giao hàng");
    //   return;
    // }


    const requestBody = {
      supplier_id: supplierId,
      // etaDate: deliveryDate?.toISOString(),
      items: selectedMaterials.map((item: SelectedMaterial) => ({
        material_id: item.material_id,
        quantity: item.quantity,
        supplier_id: supplierId,
        price: 0,
      })),
    };

    console.log("Request body:", requestBody);

    try {
      const response = await purchasesApi.createPO(requestBody);
      // console.log("Create PO response:", response);

      if (
        response
      ) {
        showSuccessToast("Tạo đơn đặt hàng thành công!");

        // Reset form
        setSelectedMaterials([]);
        setMaterialQuantities({});
        // setSupplierId("");
        // setDeliveryDate(null);

        // Chuyển tab và refetch
        setActiveTab("ordered");
        refetchPO();
        setIsDataInitialized(false);
        refetchMissingMaterials();

        // Có thể refetch data nếu cần
        // refetchMissingMaterials();
      } else {
        showErrorToast(response.message || "Tạo đơn hàng thất bại!");
      }
    } catch (error) {
      console.error("Error creating PO:", error);
      showErrorToast("Đã xảy ra lỗi khi tạo đơn hàng");
    }
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
      ui_id: pr.ui_id,
      material_name: pr.material_name,
      quantity: currentQuantity,
      unit: pr.unit,
    });
  };

  const handleClosePopup = () => {
    setQuotePopupMaterial(null);
  };

  // Hàm disabledDate để disable ngày lễ
  // const disabledDate = (current: dayjs.Dayjs) => {
  //   if (!current) return false;

  //   // Ngày trong quá khứ
  //   if (current.isBefore(dayjs(), "day")) {
  //     return true;
  //   }

  //   // Quá 30 ngày
  //   if (current.isAfter(dayjs().add(60, "day"), "day")) {
  //     return true;
  //   }

  //   // Ngày lễ
  //   return isVietnamHoliday(current);
  // };

  // const handleDateChange = (date: dayjs.Dayjs | null) => {
  //   setDeliveryDate(date);
  // };

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
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "pending"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <BsClock className="w-4 h-4" />
            Chờ đặt hàng ({missing_materials.length})
          </button>
          <button
            onClick={() => setActiveTab("ordered")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "ordered"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <BsTruck className="w-4 h-4" />
            Đang chờ giao ({getPurchaseOrdersByStatus("Ordered").length})
          </button>
          <button
            onClick={() => setActiveTab("received")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "received"
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
                    {displayMaterials.map((pr: any) => {
                      const currentQuantity = Math.round(parseFloat(pr.quantity) || 0);
                      // const displayValue = currentQuantity.toFixed(0);

                      return (
                        <tr
                          key={pr.ui_id}
                          className={`hover:bg-gray-50 ${selectedMaterials.some(
                            (m) => m.ui_id === pr.ui_id
                          )
                            ? "bg-blue-50"
                            : ""
                            }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedMaterials.some(
                                (m) => m.ui_id === pr.ui_id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMaterials([
                                    ...selectedMaterials,
                                    {
                                      material_id: pr.material_id,
                                      ui_id: pr.ui_id,
                                      quantity: currentQuantity,
                                      price: 0,
                                    },
                                  ]);
                                } else {
                                  setSelectedMaterials(
                                    selectedMaterials.filter(
                                      (item) =>
                                        item.ui_id !== pr.ui_id
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
                              {currentQuantity}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-end">
                              {pr.available.toFixed(0)}
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
                          className="w-full px-4 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer flex items-center justify-between hover:bg-gray-50"
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
                                      className={`p-4 border rounded-lg cursor-pointer transition-all ${supplier === s.name
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
                            <div className="px-6 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
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
                    {/* <div>
                      <label className="block text-gray-700 mb-2">
                        Ngày giao dự kiến
                      </label>
                      <DatePicker
                        value={deliveryDate}
                        onChange={handleDateChange}
                        disabledDate={disabledDate}
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày giao hàng"
                        style={{ width: "100%" }}
                        className="w-full"
                        allowClear
                      />
                     
                    </div> */}
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
                      disabled={!supplier}
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
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nhà cung cấp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người đặt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày đặt
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dự kiến giao
                    </th> */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sản phẩm
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th> */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getPurchaseOrdersByStatus("Ordered").map(
                    (orderGroup: any, index: number) => (
                      <tr key={orderGroup.purchaseId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {orderGroup.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {orderGroup.supplierName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {orderGroup.createdByName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(orderGroup.createdAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(orderGroup.etaDate).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td> */}
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <ul className="list-disc list-inside">
                            {orderGroup.items.map((item: any) => (
                              <li key={item.id} className="truncate max-w-xs">
                                {item.materialName} ({item.qtyOrdered}{" "}
                                {item.unit})
                              </li>
                            ))}
                          </ul>
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Đang vận chuyển
                          </span>
                        </td> */}
                      </tr>
                    )
                  )}
                  {getPurchaseOrdersByStatus("Ordered").length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <BsTruck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>Không có đơn hàng nào đang chờ giao</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Đã nhận hàng */}
        {activeTab === "received" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nhà cung cấp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày đặt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nhận
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Người nhận
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sản phẩm
                    </th>
                    {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th> */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {poData
                    .filter((po: any) => po.status === "Delivered")
                    .map((po: any, index: number) => (
                      <tr key={po.purchaseId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {po.supplierName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(
                            po.createdAt
                          ).toLocaleDateString("vi-VN")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(po.receivedAt).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Quản kho B
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <ul className="list-disc list-inside">
                            {po.items.map((item: any) => (
                              <li key={item.id} className="truncate max-w-xs">
                                {item.materialName} ({item.qtyOrdered}{" "}
                                {item.unit})
                              </li>
                            ))}
                          </ul>
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Đã nhập kho
                          </span>
                        </td> */}
                      </tr>
                    ))}
                  {poData.filter((po: any) => po.status === "Delivered")
                    .length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          <BsCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p>Chưa có đơn hàng nào đã nhận</p>
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Direct Purchase Order Modal */}
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
              value={directMaterialId ?? ""}
              onChange={(e) => setDirectMaterialId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
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
              <FloatingInputAntd
                className="h-[40px]"
                label="Số lượng"
                value={directQuantity}
                valueType="integer"
                required
                min={1}
                onChange={(e: any) => setDirectQuantity(e.target.value)}
              />
            </div>
            {/*
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
            */}

            {/* Nhà cung cấp (phiên bản đang dùng) */}
            <div>
              <select
                value={directSupplierId ?? ""}
                onChange={(e) =>
                  setDirectSupplierId(Number(e.target.value))
                }
                className="w-full h-[40px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chọn nhà cung cấp</option>
                {suppliersData.map((s: any) => (
                  <option key={s.supplierId} value={s.supplierId}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                if (!directMaterialId || !directQuantity || !directSupplierId) {
                  showWarningToast("Vui lòng nhập đầy đủ thông tin");
                  return;
                }

                console.log("Direct PO:", {
                  material_id: directMaterialId,
                  quantity: directQuantity,
                  supplier_id: directSupplierId,
                });

                // TODO: call API create direct PO
                showSuccessToast("Tạo đơn đặt hàng trực tiếp thành công");
                setShowDirectPO(false);
              }}
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
    </div>
  );
}