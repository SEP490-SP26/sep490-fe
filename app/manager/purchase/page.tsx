"use client";
import { purchasesApi } from "@/api/purchase";
import { supplierApi } from "@/api/supplier";
import { useProduction } from "@/context/ProductionContext";
import { disabledDate } from "@/utils/format";
import {
  showErrorToast,
  showSuccessToast,
  showWarningToast,
} from "@/utils/toastService";
import { useQuery } from "@tanstack/react-query";
import { DatePicker, Rate, Spin } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { BiPlus, BiSearch } from "react-icons/bi";
import { BsCheckCircle, BsClock, BsTruck, BsX } from "react-icons/bs";

export default function PurchaseManagement() {
  const [activeTab, setActiveTab] = useState<
    "pending" | "ordered" | "received"
  >("pending");
  const [showDirectPO, setShowDirectPO] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { materials, orders } = useProduction();

  const [showSupplierPopup, setShowSupplierPopup] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplier, setSupplier] = useState("Chọn nhà Cung Cấp");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    isPending,
    error,
    data: suppliersData,
  } = useQuery({
    queryKey: ["supplier"],
    queryFn: async () => {
      try {
        const response = await supplierApi.getList(1, 100);
        console.log("API Response:", response);
        console.log("Response data:", response.data);

        return response.data;
      } catch (error) {
        console.error("Error fetching orders:", error);
        return { orders: [], products: [], materials: [] };
      }
    },
  });

  const {
    isPending: poPending,
    error: poError,
    data: poData,
  } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const response = await purchasesApi.getList(1, 100);
      console.log("API po Response:", response);
      console.log("Response po data:", response.data);

      return response.data;
    },
  });

  const { groupedArray, selectedGroups } = (() => {
    if (!poData || poData.length === 0) {
      return { groupedArray: [], selectedGroups: [] };
    }

    const groupedItems = poData
      .filter((pr: { status: string }) => pr.status === "Pending")
      .flatMap((pr: { eta_date: any; items: any[] }) =>
        pr.items.map((item: any) => ({
          ...item,
          eta_date: pr.eta_date,
        }))
      )
      .reduce((groups: any, item: any) => {
        const key = item.material_code;

        if (!groups[key]) {
          groups[key] = {
            material_code: item.material_code,
            material_id: item.material_id, // Thêm material_id cho API
            material_name: item.material_name,
            unit: item.unit,
            price: item.price,
            total_qty: 0,
            items: [],
            eta_dates: new Set(),
            item_ids: [],
          };
        }

        groups[key].total_qty += item.qty_ordered;
        groups[key].items.push(item);
        groups[key].eta_dates.add(
          new Date(item.eta_date).toLocaleDateString("vi-VN")
        );
        groups[key].item_ids.push(item.id);

        return groups;
      }, {});

    const groupedArray = Object.values(groupedItems).map((group: any) => ({
      ...group,
      eta_dates: Array.from(group.eta_dates),
    }));

    const selectedGroups = groupedArray.filter((group: any) =>
      group.item_ids.some((id: number) => selectedMaterials.includes(id))
    );

    return { groupedArray, selectedGroups };
  })();

  const handleCreateBulkPO = async () => {
    if (selectedMaterials.length === 0) {
      showWarningToast("Vui lòng chọn ít nhất một vật tư để đặt hàng");
      return;
    }

    if (!supplier || !deliveryDate) {
      showWarningToast("Vui lòng chọn nhà cung cấp và ngày giao hàng");
      return;
    }

    // // Tìm supplier ID từ tên
    // const selectedSupplier = suppliersData?.find(
    //   (s: any) => s.name === supplier
    // );
    // if (!selectedSupplier) {
    //   showErrorToast("Không tìm thấy thông tin nhà cung cấp");
    //   return;
    // }

    // Chuẩn bị request body
    const requestBody = {
      supplierId: supplierId,
      etaDate: new Date(deliveryDate).toISOString(),
      items: selectedGroups.map((group: any) => ({
        materialId: group.material_id,
        quantity: group.total_qty,
        price: group.price,
      })),
    };

    console.log("Request body:", requestBody);

    setIsCreatingPO(true);
    setCreateError(null);

    try {
      // Gọi API trực tiếp - KHÔNG DÙNG MUTATION HOOK
      // Giả sử bạn có API endpoint để tạo purchase order
      // const response = await fetch('/api/purchase-orders', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(requestBody),
      // });

      // Hoặc nếu dùng api service của bạn:
      const response = await purchasesApi.createPO(requestBody);

      console.log('mess', response)

      // Tạm thời dùng setTimeout để mô phỏng API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Giả lập response thành công
      const mockResponse = {
        id: Math.floor(Math.random() * 1000),
        code: `PO${Date.now().toString().slice(-6)}`,
        ...requestBody,
        status: "ordered",
      };

      console.log("Tạo đơn hàng thành công:", mockResponse);

      // Hiển thị thông báo thành công
      showSuccessToast(`Đã tạo đơn hàng ${mockResponse.code} thành công!`);

      // Reset form
      setSelectedMaterials([]);
      setSupplier("Công ty TNHH Giấy Sài Gòn");
      setDeliveryDate("");
      setCreateError(null);

      // Set lại delivery date mặc định
      const today = new Date();
      const defaultDate = new Date(today);
      defaultDate.setDate(today.getDate() + 2);
      setDeliveryDate(defaultDate.toISOString().split("T")[0]);

      // Nếu muốn refetch data, có thể gọi lại query thủ công
      // queryClient.invalidateQueries({ queryKey: ['purchases'] });
    } catch (error: any) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      setCreateError(error.message || "Có lỗi xảy ra khi tạo đơn hàng");
      showErrorToast(error.message || "Có lỗi xảy ra khi tạo đơn hàng");
    } finally {
      setIsCreatingPO(false);
    }
  };

  const handleDateChange = (
    date: dayjs.Dayjs | null,
    dateString: string | string[]
  ) => {
    if (date) {
      setDeliveryDate(date.format("YYYY-MM-DD"));
    } else {
      setDeliveryDate("");
    }
  };

  if (poPending) {
    return (
      <div>
        {" "}
        <div className="flex space-x-2 justify-center items-center bg-white h-screen">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (poError) {
    return <div>Error loading purchases</div>;
  }

  console.log("pr", poData);

  // Xử lý tạo đơn hàng với nhiều vật tư
  // const handleCreateBulkPO = () => {
  //   if (selectedMaterials.length === 0) {
  //     showWarningToast("Vui lòng chọn ít nhất một vật tư để đặt hàng");
  //     return;
  //   }

  //   if (!supplier || !deliveryDate) {
  //     showWarningToast("Vui lòng chọn nhà cung cấp và ngày giao hàng");
  //     return;
  //   }

  //   console.log("tạo đơn hàng thành công");

  //   // Reset form
  //   setSelectedMaterials([]);
  //   setSupplier("Công ty TNHH Giấy Sài Gòn");

  //   // Set lại delivery date mặc định
  //   const today = new Date();
  //   const defaultDate = new Date(today);
  //   defaultDate.setDate(today.getDate() + 2);
  //   setDeliveryDate(defaultDate.toISOString().split("T")[0]);
  // };

  // Lấy danh sách đơn hàng theo trạng thái
  const getPurchaseOrdersByStatus = (status: "ordered" | "delivered") => {
    const pos = poData.filter((po: any) => po.status === status);

    // Nhóm các PO theo supplier và delivery date
    const groupedOrders: Record<string, any[]> = {};

    pos.forEach((po: any) => {
      const pr = poData.find((p: any) => p.id === po.pr_id);
      const material = materials.find((m) => m.id === pr?.material_id);
      const order = orders.find((o) => o.order_id === pr?.order_id);

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
            Chờ đặt hàng
            {/* ({poData.length}) */}
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
              <h2 className="text-lg font-semibold mb-4">Vật tư cần mua</h2>

              {/* Table layout */}
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-50">
                        Tên NVL
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số lượng
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày yêu cầu
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {groupedArray.map((group: any, index: number) => (
                      <tr
                        key={`group-${group.material_code}-${index}`}
                        className={`hover:bg-gray-50 ${
                          group.item_ids.some((id: number) =>
                            selectedMaterials.includes(id)
                          )
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={group.item_ids.every((id: number) =>
                              selectedMaterials.includes(id)
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterials((prev: number[]) => [
                                  ...new Set([...prev, ...group.item_ids]),
                                ]);
                              } else {
                                setSelectedMaterials((prev: number[]) =>
                                  prev.filter(
                                    (id) => !group.item_ids.includes(id)
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
                              {group.material_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              <div>Mã: {group.material_code}</div>
                              <div className="text-xs text-gray-400 mt-1">
                                Có trong {group.items.length} đơn hàng
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {group.total_qty} {group.unit}
                          </div>
                          <div className="text-sm text-gray-500 space-y-1">
                            <div>
                              Đơn giá:{" "}
                              {new Intl.NumberFormat("vi-VN").format(
                                group.price
                              )}{" "}
                              đ
                            </div>
                            <div className="font-medium">
                              Tổng tiền:{" "}
                              {new Intl.NumberFormat("vi-VN").format(
                                group.total_qty * group.price
                              )}{" "}
                              đ
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="space-y-1">
                            {group.eta_dates.map((date: string, i: number) => (
                              <div key={i}>{date}</div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <button
                            type="button"
                            className="mt-2 bg-accent px-2 py-1 rounded-md text-primary"
                          >
                            Khảo giá ({group.items.length})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {poData.length === 0 && (
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
                                        // setSupplier(s.name);
                                        setSupplierId(s.supplierId)
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
                                              <div> Đánh giá:</div>
                                              <div>
                                                <span className="inline-flex  items-center">
                                                  <Rate
                                                    disabled
                                                    allowHalf
                                                    size="small"
                                                    defaultValue={s.rating}
                                                  />
                                                  <span className="ml-1 text-sm font-medium text-gray-700">
                                                    {s.rating.toFixed(1)}
                                                  </span>
                                                </span>
                                              </div>
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

                    <div>
                      <label className="block text-gray-700 mb-2">
                        Ngày giao dự kiến
                      </label>
                      <DatePicker
                        format="DD/MM/YYYY"
                        value={deliveryDate ? dayjs(deliveryDate) : null}
                        placeholder="Chọn ngày"
                        onChange={handleDateChange}
                        disabledDate={disabledDate}
                        className="h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleCreateBulkPO}
                      disabled={!supplier || !deliveryDate || isCreatingPO}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium flex items-center gap-2"
                    >
                      {isCreatingPO ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Đang tạo...
                        </>
                      ) : (
                        "Tạo đơn hàng"
                      )}
                    </button>
                  </div>
                </div>

                {/* Hiển thị lỗi nếu có */}
                {createError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    Lỗi: {createError}
                  </div>
                )}
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
                      {suppliersData.map((supplier: any) => (
                        <option key={supplier.id} value={supplier}>
                          {supplier.name}
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
