"use client";
import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";
import { FileTextOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Descriptions } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { BiBook, BiCheckCircle, BiPackage, BiSolidZap } from "react-icons/bi";
import {
  BsArrowLeft,
  BsClock,
  BsLayers,
  BsPrinter,
  BsScissors,
} from "react-icons/bs";
import Loading from "@/app/(overview)/loading";

export default function ProductionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [activeTab, setActiveTab] = useState<"info" | "scheduled" | "material">("info");

  // const { orders, products, productionSchedules, getProductionStages } =
  //   useProduction();

  const {
    isPending,
    error,
    data: apiData,
  } = useQuery({
    queryKey: ["apiData", id],
    queryFn: async () => {
      if (!id) {
        throw new Error("Order ID is required");
      }
      const response = await orderApi.getDetail(id.toString());
      return response;
    },
    enabled: !!id,
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  const { data: productionSchedules } = useQuery({
    queryKey: ["productionSchedules"],
    queryFn: async () => {
      if (!id) {
        throw new Error("Order ID is required");
      }
      const response = await productionsApi.getProdyctionByOrderId(
        id.toString()
      );
      return response;
    },
  });

  const { data: productionInfo } = useQuery({
    queryKey: ["productionInfo", id],
    queryFn: async () => {
      if (!id) return null;
      return productionsApi.getProductionInformation(id.toString());
    },
    enabled: !!id,
  });


  // Xử lý loading state
  if (isPending) {
    return <Loading />;
  }


  if (!apiData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Không tìm thấy đơn hàng
          </h1>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }



  const productionStages = [
    {
      id: "ralo",
      name: "Ralo",
      icon: BsScissors,
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: "cut",
      name: "Cắt",
      icon: BsScissors,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: 3,
      name: "In",
      icon: BsPrinter,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "laminate",
      name: "Cán màng",
      icon: BsLayers,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "corrugate",
      name: "Bồi sóng",
      icon: BiPackage,
      color: "bg-orange-100 text-orange-700",
    },
    {
      id: "crease",
      name: "Bể",
      icon: BiSolidZap,
      color: "bg-red-100 text-red-700",
    },
    {
      id: 8,
      name: "Dứt",
      icon: BsScissors,
      color: "bg-pink-100 text-pink-700",
    },
    {
      id: 9,
      name: "Dán",
      icon: BiBook,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  // const getStageStatus = (stageId: string) => {
  //   const stage = stages.find((s) => s.id === stageId);
  //   return stage?.status || "pending";
  // };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };
  const remainingAmount = apiData.final_total_cost - apiData.deposit_amount;
  return (
    <div className="min-h-screen bg-gray-50 ">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
      >
        <BsArrowLeft className="w-5 h-5" />
        Quay lại
      </button>

      {/* Header với mã LSX */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Left side - Order info */}
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4 mb-4">
              {/* Phần bên trái: Tiêu đề và thông tin người duyệt */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Chi tiết đơn hàng: {apiData.code}
                  </h1>

                  {/* Status badge */}
                  <div
                    className={`px-1.5 py-0.5 rounded-lg text-sm font-semibold ${apiData.status === "completed"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : apiData.status === "in_production"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        : apiData.status === "scheduled"
                          ? "bg-blue-100 text-blue-700 border border-blue-200"
                          : "bg-gray-100 text-gray-700 border border-gray-200"
                      }`}
                  >
                    {apiData.status === "completed"
                      ? "ĐÃ HOÀN THÀNH"
                      : apiData.status === "in_production"
                        ? "ĐANG SẢN XUẤT"
                        : apiData.status === "scheduled"
                          ? "ĐÃ LÊN LỊCH"
                          : "CHỜ XỬ LÝ"}
                  </div>
                </div>
              </div>

              {/* Phần bên phải: Date badge */}
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm inline-block">
                  <span className="font-medium">Người duyệt:</span>{" "}
                  {apiData.approver_name}
                </div>
                <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap">
                  <span className="font-medium">Ngày tạo:</span>{" "}
                  {new Date(apiData.order_date).toLocaleDateString("vi-VN")}
                </div>
              </div>
            </div>

            {/* Order details in cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">KHÁCH HÀNG</div>
                <div className="font-medium text-gray-900 truncate">
                  {apiData.customer_name}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">SẢN PHẨM</div>
                <div className="font-medium text-gray-900">
                  {apiData?.product_name}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">SỐ LƯỢNG</div>
                <div className="font-medium text-gray-900">
                  {apiData.quantity} chiếc
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">NGÀY GIAO</div>
                <div className="font-medium text-gray-900">
                  {new Date(apiData.delivery_date).toLocaleDateString("vi-VN")}
                </div>
              </div>
              {/* Schedule info */}

              {/* <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-700 mb-1">
                  LỊCH SẢN XUẤT
                </div>
                <div className="text-xs text-blue-600">
                  <div className="flex items-center gap-1 mb-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Bắt đầu:{" "}
                    {new Date(apiData.production_start_date).toLocaleDateString(
                      "vi-VN"
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Kết thúc:{" "}
                    {new Date(apiData.production_end_date).toLocaleDateString(
                      "vi-VN"
                    )}
                  </div>
                </div>
              </div> */}
            </div>

            {/* Specifications */}
            {apiData.quote_fields && (
              <div className="mt-4 flex flex-wrap gap-2">
                {apiData.quote_fields.paper_name && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    <span className="font-medium">Giấy:</span> {apiData.quote_fields.paper_name}
                  </div>
                )}
                {apiData.quote_fields.coating_type && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    <span className="font-medium">Phủ:</span> {apiData.quote_fields.coating_type}
                  </div>
                )}
                {apiData.quote_fields.wave_type && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    <span className="font-medium">Sóng:</span> {apiData.quote_fields.wave_type}
                  </div>
                )}
                {/* {apiData.quote_fields.design_type && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    <span className="font-medium">Thiết kế:</span> {apiData.quote_fields.design_type}
                  </div>
                )} */}
                {apiData.quote_fields.production_process && (
                  <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    <span className="font-medium">Gia công:</span> {apiData.quote_fields.production_process}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "info"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <BsClock className="w-4 h-4" />
          Thông tin đơn hàng
        </button>
        {apiData.status !== "Pending" && (
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "scheduled"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
          >
            <BsPrinter className="w-4 h-4" />
            Lịch sản xuất
          </button>
        )}
        <button
          onClick={() => setActiveTab("material")}
          className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === "material"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <BiPackage className="w-4 h-4" />
          Nguyên vật liệu
        </button>
      </div>

      {/* Tab Content info */}
      {activeTab === "info" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4">
              {/* Cột 1: Thông tin khách hàng */}
              <div className="border border-gray-200 rounded-lg p-4">

                <div className="flex items-center gap-2 mb-3">
                  {/* <div className="p-1.5 bg-blue-50 rounded">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div> */}
                  <h3 className="font-semibold text-gray-900">
                    Thông tin khách hàng
                  </h3>
                </div>

                <div className="space-y-2">
                  {/* <div>
                  <div className="font-medium text-md text-gray-500 mb-1">
                    Email:{" "}
                    <span className="font-semibold text-md text-gray-900">
                      {apiData.customer_email}
                    </span>
                  </div>
                </div> */}

                  <div className="flex justify-between items-center ">
                    <div className="text-md text-gray-600">Email:</div>
                    <div className={`text-md font-medium`}>
                      {apiData.customer_email}
                    </div>
                  </div>

                  <div className="flex justify-between items-center ">
                    <div className="text-md text-gray-600">Số điện thoại:</div>
                    <div className={`text-md font-medium`}>
                      {apiData.customer_phone}
                    </div>
                  </div>

                  {/* <div>
                  <div className="text-md text-gray-500 mb-1">Địa chỉ</div>
                  <div className="font-medium text-sm">
                    {apiData.customer_address || "Chưa cập nhật"}
                  </div>
                </div> */}

                  <div className="flex justify-between items-center ">
                    <div className="text-md text-gray-600">Địa chỉ</div>
                    <div className={`text-md font-medium`}>
                      {apiData.customer_address || "Chưa cập nhật"}
                    </div>
                  </div>

                  <div className="flex justify-between items-center ">
                    <div className="text-md text-gray-600">
                      Trạng thái thanh toán
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${apiData.payment_status === "paid"
                        ? "bg-green-100 text-green-800"
                        : apiData.payment_status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-black-800"
                        }`}
                    >
                      {apiData.payment_status === "paid"
                        ? "Đã thanh toán"
                        : apiData.payment_status === "pending"
                          ? "Chờ thanh toán"
                          : "Đã đặt cọc"}
                    </div>
                  </div>
                </div>


              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-indigo-50 rounded">
                    <svg
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">File đính kèm</h3>
                </div>

                <div className="space-y-3">
                  {/* File mẫu */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <FileTextOutlined className="text-gray-400 text-sm" />
                      <div>
                        <div className="font-medium text-sm">Mẫu thiết kế</div>
                        <div className="text-xs text-gray-500">
                          Thiết kế sản phẩm
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      type={apiData.file_url ? "primary" : "default"}
                      disabled={!apiData.file_url}
                      onClick={() =>
                        apiData.file_url &&
                        window.open(apiData.file_url, "_blank")
                      }
                    >
                      {apiData.file_url ? "Tải" : "N/A"}
                    </Button>
                  </div>

                  {/* Hợp đồng */}
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div>
                        <div className="font-medium text-sm">Hợp đồng</div>
                        <div className="text-xs text-gray-500">
                          {apiData.contract_file || "Chưa tải lên"}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="small"
                      type={apiData.contract_file ? "primary" : "default"}
                      onClick={() =>
                        apiData.contract_file &&
                        window.open(apiData.contract_file, "_blank")
                      }
                    >
                      {apiData.contract_file ? "Xem" : "N/A"}
                    </Button>
                  </div>

                  {/* File khác */}
                  {apiData.other_files && apiData.other_files.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        File khác ({apiData.other_files.length}):
                      </div>
                      <div className="space-y-1">
                        {apiData.other_files
                          .slice(0, 2)
                          .map((file: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-1.5 bg-white border rounded text-xs"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <FileTextOutlined
                                  className="text-gray-400"
                                  style={{ fontSize: "12px" }}
                                />
                                <span className="truncate">{file.name}</span>
                              </div>
                              <Button
                                type="link"
                                size="small"
                                style={{ padding: 0, fontSize: "12px" }}
                                onClick={() => window.open(file.url, "_blank")}
                              >
                                Tải
                              </Button>
                            </div>
                          ))}
                        {apiData.other_files.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            + {apiData.other_files.length - 2} file khác
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cột 2: Chi phí */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-gray-900">
                  Chi phí đơn hàng
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-1">
                  <div className="text-sm text-gray-600">Chi phí sản xuất</div>
                  <div className="font-medium text-sm">
                    {(apiData.final_total_cost
                      || 0).toLocaleString()} ₫
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <div className="text-sm text-gray-600">Phí gấp</div>
                  <div
                    className={`text-sm font-medium ${apiData.rush_amount ? "text-orange-600" : "text-gray-600"
                      }`}
                  >
                    {apiData.rush_amount
                      ? `+${apiData.rush_amount.toLocaleString('vi-VN')} ₫`
                      : "0 ₫"}
                  </div>
                </div>

                {apiData.quote_fields && (
                  <>
                    <div className="flex justify-between items-center py-1 border-t border-dashed border-gray-200 mt-2 pt-2">
                      <div className="text-sm text-gray-600">Nguyên vật liệu</div>
                      <div className="font-medium text-sm">
                        {formatCurrency(apiData.quote_fields.material_cost)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div className="text-sm text-gray-600">Nhân công</div>
                      <div className="font-medium text-sm">
                        {formatCurrency(apiData.quote_fields.labor_cost)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div className="text-sm text-gray-600">Chi phí khác</div>
                      <div className="font-medium text-sm">
                        {formatCurrency(apiData.quote_fields.other_fees)}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <div className="text-sm text-gray-600">Giảm giá</div>
                      <div className="font-medium text-sm text-green-600">
                        -{formatCurrency(apiData.quote_fields.discount_amount)}
                      </div>
                    </div>
                  </>
                )}

                {/* <div className="flex justify-between items-center py-1">
                  <div className="text-sm text-gray-600">Thuế VAT</div>
                  <div className="font-medium text-sm">
                    {apiData.tax_amount
                      ? `${apiData.tax_amount.toLocaleString()} ₫`
                      : `${Math.round(
                          (apiData.estimate_total || 0) * 0.1
                        ).toLocaleString()} ₫`}
                  </div>
                </div> */}

                <div className="pt-2 mt-1 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="font-semibold text-gray-900">Tổng cộng</div>
                    <div className="text-lg font-bold text-blue-700">
                      {apiData.estimate_total?.toLocaleString()} ₫
                    </div>
                  </div>
                </div>

                {apiData.deposit_amount && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <div className="flex justify-between">
                      <span className="text-blue-600">Đã đặt cọc:</span>
                      <span className="font-medium">
                        {apiData.deposit_amount.toLocaleString()} ₫
                      </span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-blue-600">Còn lại:</span>
                      <span className="font-medium">
                        {remainingAmount.toLocaleString()}{" "}
                        ₫
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>


            {/* Cột 3: File đính kèm */}


            {/* Ghi chú (full width) */}
            <div className="border border-gray-200 rounded-lg p-4 lg:col-span-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-yellow-50 rounded">
                  <svg
                    className="w-4 h-4 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                    />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Ghi chú</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1.5">
                    Ghi chú khách hàng
                  </div>
                  <div
                    className={`p-3 rounded border text-sm min-h-[80px] ${apiData.note
                      ? "bg-gray-50 border-gray-200"
                      : "bg-gray-50 border-gray-200"
                      }`}
                  >
                    {apiData.note ? (
                      <div className="text-gray-700 whitespace-pre-line">
                        {apiData.note}
                      </div>
                    ) : (
                      <div className="text-gray-400 italic text-center">
                        Không có ghi chú
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1.5">
                    Ghi chú nội bộ
                  </div>
                  <div
                    className={`p-3 rounded border text-sm min-h-[80px] ${apiData.internal_note
                      ? "bg-red-50 border-red-100"
                      : "bg-gray-50 border-gray-200"
                      }`}
                  >
                    {apiData.internal_note ? (
                      <div className="text-red-700 whitespace-pre-line">
                        {apiData.internal_note}
                      </div>
                    ) : (
                      <div className="text-gray-400 italic text-center">
                        Không có ghi chú nội bộ
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Nút hành động compact */}
          {/* <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => window.print()}
            >
              In phiếu
            </Button>
            <Button size="small" type="primary" icon={<FileTextOutlined />}>
              Xuất PDF
            </Button>
            <Button size="small" icon={<FileTextOutlined />}>
              Chia sẻ
            </Button>
          </div> */}
        </div>
      )}

      {/* Tab Content Material */}
      {activeTab === "material" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BiPackage className="w-5 h-5 text-blue-500" />
            DANH SÁCH NGUYÊN VẬT LIỆU
          </h2>

          {productionInfo?.items ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nhóm vật tư
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mã vật tư
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên vật tư
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số lượng
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ĐVT
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productionInfo.items.map((item: any, index: number) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {item.material_group}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.material_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.material_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                        {item.quantity && item.quantity > 0
                          ? item.quantity.toLocaleString("vi-VN")
                          : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {productionInfo.items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Chưa có dữ liệu nguyên vật liệu
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Đang tải hoặc chưa có dữ liệu nguyên vật liệu...
            </div>
          )}
        </div>
      )}

      {/* Tiến trình sản xuất chi tiết */}
      {activeTab === "scheduled" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <BsClock className="w-5 h-5 text-blue-500" />
            QUY TRÌNH SẢN XUẤT CHI TIẾT
          </h2>
          <div className="space-y-8">
            {productionSchedules.stages.map((stage: any) => {
              const stageInfo = productionStages.find(
                (s) => s.id === stage.process_id
              );
              const StageIcon = stageInfo?.icon || BsScissors;
              const isCompleted = stage.status === "Finished";
              const isInProgress = stage.status === "Ready";
              const isUnassigned = stage.status === "Unassigned";
              return (
                <div
                  key={stage.process_id}
                  className="border-l-4 border-blue-200 pl-6 ml-4 relative"
                >
                  {/* Timeline dot */}
                  <div
                    className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white ${isCompleted
                      ? "bg-green-500"
                      : isInProgress
                        ? "bg-yellow-500"
                        : "bg-gray-300"
                      }`}
                  >
                    {isCompleted ? (
                      <BiCheckCircle className="w-4 h-4 text-white" />
                    ) : isInProgress ? (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${stageInfo?.color}`}>
                        <StageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">
                          {stage.process_name} {stage.machine}
                        </h3>
                        <p
                          className={`text-sm ${isCompleted
                            ? "text-green-600"
                            : isInProgress
                              ? "text-yellow-600"
                              : "text-gray-500"
                            }`}
                        >
                          {isCompleted
                            ? " Đã hoàn thành"
                            : isInProgress
                              ? " Đang thực hiện"
                              : " Chờ xử lý"}
                        </p>
                      </div>
                    </div>
                    {stage.task_name && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {stage.task_name}
                      </span>
                    )}
                  </div>

                  {/* Input Materials Table */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <BiPackage className="w-4 h-4" />
                      NGUYÊN VẬT LIỆU ĐẦU VÀO
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              TÊN NVL
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              MÃ NVL
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              SỐ LƯỢNG
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ĐVT
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              GHI CHÚ
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {stage.input_materials.map(
                            (material: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {material.name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {"code" in material
                                    ? material.code ?? "-"
                                    : "-"}
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium textright">
                                  {material.quantity}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {material.unit}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  {"note" in material
                                    ? material.note ?? "-"
                                    : "-"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Output Material */}
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                      <BiCheckCircle className="w-4 h-4" />
                      THÀNH PHẨM CÔNG ĐOẠN
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-sm text-blue-600">
                          Tên thành phẩm
                        </div>
                        <div className="font-medium">
                          {stage.output_product.name}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="text-sm text-blue-600">Số lượng</div>
                        <div className="font-medium">
                          {stage.output_product.quantity}
                        </div>
                      </div>
                      <div></div>
                      <div>
                        <div className="text-sm text-blue-600">Đơn vị</div>
                        <div className="font-medium">
                          {stage.output_product.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-blue-600">
                          Mã công đoạn
                        </div>
                        <div className="font-medium">
                          {stage.output_product.code}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        // <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        //   <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
        //     <BsClock className="w-5 h-5 text-blue-500" />
        //     QUY TRÌNH SẢN XUẤT CHI TIẾT
        //   </h2>

        //   <div className="space-y-8">
        //     {productionProcess.map((process, index) => {
        //       const stageStatus = getStageStatus(process.id);
        //       const stageInfo = productionStages.find(
        //         (s) => s.id === process.id
        //       );
        //       const StageIcon = stageInfo?.icon || BsScissors;
        //       const isCurrentStage = schedule?.current_stage === process.id;
        //       const isCompleted = stageStatus === "completed";
        //       const isInProgress = stageStatus === "in_progress";

        //       return (
        //         <div
        //           key={process.id}
        //           className="border-l-4 border-blue-200 pl-6 ml-4 relative"
        //         >
        //           {/* Timeline dot */}
        //           <div
        //             className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white ${
        //               isCompleted
        //                 ? "bg-green-500"
        //                 : isInProgress
        //                 ? "bg-yellow-500"
        //                 : "bg-gray-300"
        //             }`}
        //           >
        //             {isCompleted ? (
        //               <BiCheckCircle className="w-4 h-4 text-white" />
        //             ) : isInProgress ? (
        //               <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        //             ) : (
        //               <div className="w-2 h-2 bg-white rounded-full" />
        //             )}
        //           </div>

        //           {/* Stage header */}
        //           <div className="flex items-center justify-between mb-4">
        //             <div className="flex items-center gap-3">
        //               <div className={`p-2 rounded-lg ${stageInfo?.color}`}>
        //                 <StageIcon className="w-5 h-5" />
        //               </div>
        //               <div>
        //                 <h3 className="font-bold text-lg text-gray-900">
        //                   {process.name} {process.code}
        //                 </h3>
        //                 <p
        //                   className={`text-sm ${
        //                     isCompleted
        //                       ? "text-green-600"
        //                       : isInProgress
        //                       ? "text-yellow-600"
        //                       : "text-gray-500"
        //                   }`}
        //                 >
        //                   {isCompleted
        //                     ? " Đã hoàn thành"
        //                     : isInProgress
        //                     ? " Đang thực hiện"
        //                     : " Chờ xử lý"}
        //                 </p>
        //               </div>
        //             </div>

        //             {process.note && (
        //               <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
        //                 {process.note}
        //               </span>
        //             )}
        //           </div>

        //           {/* Input Materials Table */}
        //           <div className="mb-6">
        //             <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
        //               <BiPackage className="w-4 h-4" />
        //               NGUYÊN VẬT LIỆU ĐẦU VÀO
        //             </h4>
        //             <div className="overflow-x-auto">
        //               <table className="min-w-full divide-y divide-gray-200">
        //                 <thead className="bg-gray-50">
        //                   <tr>
        //                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        //                       TÊN NVL
        //                     </th>
        //                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        //                       MÃ NVL
        //                     </th>
        //                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        //                       SỐ LƯỢNG
        //                     </th>
        //                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        //                       ĐVT
        //                     </th>
        //                     <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        //                       GHI CHÚ
        //                     </th>
        //                   </tr>
        //                 </thead>
        //                 <tbody className="bg-white divide-y divide-gray-200">
        //                   {process.inputMaterials.map((material, matIndex) => (
        //                     <tr key={matIndex} className="hover:bg-gray-50">
        //                       <td className="px-4 py-3 text-sm text-gray-900">
        //                         {material.name}
        //                       </td>
        //                       <td className="px-4 py-3 text-sm text-gray-500">
        //                         {"code" in material
        //                           ? material.code ?? "-"
        //                           : "-"}
        //                       </td>
        //                       <td className="px-4 py-3 text-sm text-gray-900 font-medium">
        //                         {material.quantity}
        //                       </td>
        //                       <td className="px-4 py-3 text-sm text-gray-500">
        //                         {material.unit}
        //                       </td>
        //                       <td className="px-4 py-3 text-sm text-gray-500">
        //                         {"note" in material
        //                           ? material.note ?? "-"
        //                           : "-"}
        //                       </td>
        //                     </tr>
        //                   ))}
        //                 </tbody>
        //               </table>
        //             </div>
        //           </div>

        //           {/* Output Material */}
        //           <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
        //             <h4 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
        //               <BiCheckCircle className="w-4 h-4" />
        //               THÀNH PHẨM CÔNG ĐOẠN
        //             </h4>
        //             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        //               <div>
        //                 <div className="text-sm text-blue-600">
        //                   Tên thành phẩm
        //                 </div>
        //                 <div className="font-medium">
        //                   {process.outputMaterial}
        //                 </div>
        //               </div>
        //               <div>
        //                 <div className="text-sm text-blue-600">Số lượng</div>
        //                 <div className="font-medium">
        //                   {process.outputQuantity}
        //                 </div>
        //               </div>
        //               <div>
        //                 <div className="text-sm text-blue-600">Đơn vị</div>
        //                 <div className="font-medium">{process.outputUnit}</div>
        //               </div>
        //               <div>
        //                 <div className="text-sm text-blue-600">
        //                   Mã công đoạn
        //                 </div>
        //                 <div className="font-medium">{process.code}</div>
        //               </div>
        //             </div>
        //           </div>

        //           {/* Action Buttons */}
        //           {!process.finalProduct && (
        //             <div className="flex justify-between items-center pt-4 border-t border-gray-200">
        //               {isInProgress ? (
        //                 <div>
        //                   <div className="text-sm text-green-600 flex items-center gap-2">
        //                     <BsClock className="w-4 h-4" />
        //                     <span>Đang gia công</span>
        //                   </div>
        //                 </div>
        //               ) : (
        //                 stageStatus === "pending" && (
        //                   <div className="text-sm text-yellow-600 flex items-center gap-2">
        //                     <BsClock className="w-4 h-4" />
        //                     <span>Đang chờ xử lý</span>
        //                   </div>
        //                 )
        //               )}

        //               {stageStatus === "completed" && (
        //                 <div className="text-sm text-green-600 flex items-center gap-2">
        //                   <BiCheckCircle className="w-4 h-4" />
        //                   Đã hoàn thành
        //                 </div>
        //               )}
        //             </div>
        //           )}
        //         </div>
        //       );
        //     })}
        //   </div>
        // </div>
      )}


    </div>
  );
}
