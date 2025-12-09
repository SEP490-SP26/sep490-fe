"use client";
import { useProduction } from "@/context/ProductionContext";
import { useParams, useRouter } from "next/navigation";
import {
  BiBook,
  BiCheckCircle,
  BiNetworkChart,
  BiPackage,
  BiSolidZap,
  BiWorld,
} from "react-icons/bi";
import {
  BsArrowLeft,
  BsClock,
  BsLayers,
  BsPrinter,
  BsScissors,
} from "react-icons/bs";

export default function ProductionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const {
    orders,
    products,
    materials,
    productionSchedules,
    getProductionStages,
    getStageMaterialsInfo,
    checkStageMaterials,
    updateProductionStage,
  } = useProduction();

  const order = orders.find((o) => o.id === id);
  const schedule = productionSchedules.find((s) => s.order_id === id);
  const product = products.find((p) => p.id === order?.product_id);
  const stages = getProductionStages(id as string);

  if (!order) {
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

  // Dữ liệu dựa trên phiếu lệnh sản xuất
  const productionProcess = [
    {
      id: "ralo",
      name: "Ralo",
      code: "25-557", // Mã công đoạn
      inputMaterials: [
        { name: "Giấy Duplex 350", quantity: 320, unit: "tờ", code: "VT00798" },
      ],
      outputMaterial: "Giấy đã ralo (300x90x230)mm",
      outputQuantity: 320,
      outputUnit: "tờ",
      note: "Khổ 1000, chặt 440",
    },
    {
      id: "cut",
      name: "Cắt",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã ralo", quantity: 320, unit: "tờ" }],
      outputMaterial: "Giấy đã cắt (300x90x230)mm",
      outputQuantity: 320,
      outputUnit: "tờ",
      note: "Cắt hớt 2 chiều 440 về 435",
    },
    {
      id: "print",
      name: "In",
      code: "25-557",
      inputMaterials: [
        { name: "Giấy đã cắt", quantity: 70, unit: "tờ" },
        { name: "Kẽm in", quantity: 4, unit: "bản", code: "VT007" },
        { name: "Mực các loại", quantity: 0.1, unit: "kg", code: "VT00433" },
      ],
      outputMaterial: "Giấy đã in (300x90x230)mm",
      outputQuantity: 70,
      outputUnit: "tờ",
    },
    {
      id: "laminate",
      name: "Cán màng",
      code: "25-557",
      inputMaterials: [
        { name: "Giấy đã in", quantity: 60, unit: "tờ" },
        {
          name: "Màng BÓNG nhiệt 1205",
          quantity: 0.42,
          unit: "kg",
          code: "VT00684",
          note: "mix khổ 480",
        },
      ],
      outputMaterial: "Giấy đã cán màng (300x90x230)mm",
      outputQuantity: 60,
      outputUnit: "tờ",
      note: "Màng Bóng",
    },
    {
      id: "corrugate",
      name: "Bồi sóng",
      code: "25-557",
      inputMaterials: [
        { name: "Giấy đã cán màng", quantity: 50, unit: "tờ" },
        { name: "Kéo phù bài", quantity: 0.08, unit: "kg", code: "VT00434" },
        {
          name: "Sóng E nâu",
          quantity: 60,
          unit: "tờ",
          code: "VTHT00106",
          note: "khổ 430 x dài 815mm",
        },
      ],
      outputMaterial: "Giấy đã bồi sóng (300x90x230)mm",
      outputQuantity: 50,
      outputUnit: "tờ",
      note: "Sóng mẫu HT",
    },
    {
      id: "crease",
      name: "Bể",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã bồi sóng", quantity: 40, unit: "tờ" }],
      outputMaterial: "Giấy đã bể (300x90x230)mm",
      outputQuantity: 40,
      outputUnit: "tờ",
    },
    {
      id: "diecut",
      name: "Dứt",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã bể", quantity: 40, unit: "tờ" }],
      outputMaterial: "Giấy đã dứt (300x90x230)mm",
      outputQuantity: 40,
      outputUnit: "tờ",
    },
    {
      id: "glue",
      name: "Dán",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã dứt", quantity: 30, unit: "tờ" }],
      outputMaterial: "Thành phẩm hoàn chỉnh",
      outputQuantity: 30,
      outputUnit: "chiếc",
      finalProduct: true,
    },
  ];

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
      id: "print",
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
      id: "diecut",
      name: "Dứt",
      icon: BsScissors,
      color: "bg-pink-100 text-pink-700",
    },
    {
      id: "glue",
      name: "Dán",
      icon: BiBook,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];

  const handleUpdateStage = (stageId: string) => {
    if (schedule) {
      updateProductionStage(schedule.id, stageId);
    }
  };

  const getStageStatus = (stageId: string) => {
    const stage = stages.find((s) => s.id === stageId);
    return stage?.status || "pending";
  };

  const getProcessInfo = (stageId: string) => {
    return productionProcess.find((p) => p.id === stageId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-blue-600 text-white p-3 rounded-lg">
                <svg
                  className="w-8 h-8"
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
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">
                    LỆNH SẢN XUẤT
                  </h1>
                  {/* Status badge */}
                  <div
                    className={`px-2 py-1 rounded-lg text-sm font-semibold  inline-block ${
                      order.status === "completed"
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : order.status === "in_production"
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        : order.status === "scheduled"
                        ? "bg-blue-100 text-blue-700 border border-blue-200"
                        : "bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    {order.status === "completed"
                      ? " ĐÃ HOÀN THÀNH"
                      : order.status === "in_production"
                      ? " ĐANG SẢN XUẤT"
                      : order.status === "scheduled"
                      ? " ĐÃ LÊN LỊCH"
                      : " CHỜ XỬ LÝ"}
                  </div>
                </div>
                <div className="text-gray-600">
                  <span className="font-medium">Mã:</span> LSX-{order.id}
                </div>
              </div>
            </div>

            {/* Order details in cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">KHÁCH HÀNG</div>
                <div className="font-medium text-gray-900 truncate">
                  {order.customer_name}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">SẢN PHẨM</div>
                <div className="font-medium text-gray-900">{product?.name}</div>
                <div className="text-xs text-gray-500 mt-1">Mã: 2025NL0052</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">SỐ LƯỢNG</div>
                <div className="font-medium text-gray-900">
                  {order.quantity} chiếc
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">NGÀY GIAO</div>
                <div className="font-medium text-gray-900">
                  {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                </div>
              </div>
              {/* Schedule info */}
              {schedule && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
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
                      {new Date(schedule.start_date).toLocaleDateString(
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
                      {new Date(schedule.end_date).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Specifications */}
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                <span className="font-medium">Quy cách:</span> 300x90x230mm
              </div>

              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                <span className="font-medium">Chất liệu:</span> Giấy Duplex 350
              </div>
              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                <span className="font-medium"></span> Người tạo: Quản lý sản
                xuất
              </div>
              <div className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                <span className="font-medium"></span> Ngày tạo:{" "}
                {new Date(order.created_at).toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tiến trình sản xuất chi tiết */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <BsClock className="w-5 h-5 text-blue-500" />
          QUY TRÌNH SẢN XUẤT CHI TIẾT
        </h2>

        <div className="space-y-8">
          {productionProcess.map((process, index) => {
            const stageStatus = getStageStatus(process.id);
            const stageInfo = productionStages.find((s) => s.id === process.id);
            const StageIcon = stageInfo?.icon || BsScissors;
            const isCurrentStage = schedule?.current_stage === process.id;
            const isCompleted = stageStatus === "completed";
            const isInProgress = stageStatus === "in_progress";

            return (
              <div
                key={process.id}
                className="border-l-4 border-blue-200 pl-6 ml-4 relative"
              >
                {/* Timeline dot */}
                <div
                  className={`absolute -left-3 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white ${
                    isCompleted
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
                        {process.name} {process.code}
                      </h3>
                      <p
                        className={`text-sm ${
                          isCompleted
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

                  {process.note && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {process.note}
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
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        {process.inputMaterials.map((material, matIndex) => (
                          <tr key={matIndex} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {material.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {"code" in material ? material.code ?? "-" : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                              {material.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {material.unit}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {"note" in material ? material.note ?? "-" : "-"}
                            </td>
                          </tr>
                        ))}
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-blue-600">
                        Tên thành phẩm
                      </div>
                      <div className="font-medium">
                        {process.outputMaterial}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600">Số lượng</div>
                      <div className="font-medium">
                        {process.outputQuantity}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600">Đơn vị</div>
                      <div className="font-medium">{process.outputUnit}</div>
                    </div>
                    <div>
                      <div className="text-sm text-blue-600">Mã công đoạn</div>
                      <div className="font-medium">{process.code}</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!process.finalProduct && (
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    {isInProgress ? (
                      <div>
                        <div className="text-sm text-green-600 flex items-center gap-2">
                          <BsClock className="w-4 h-4" />
                          <span>Đang gia công</span>
                        </div>
                      </div>
                    ) : (
                      stageStatus === "pending" && (
                        <div className="text-sm text-yellow-600 flex items-center gap-2">
                          <BsClock className="w-4 h-4" />
                          <span>Đang chờ xử lý</span>
                        </div>
                      )
                    )}

                    {stageStatus === "completed" && (
                      <div className="text-sm text-green-600 flex items-center gap-2">
                        <BiCheckCircle className="w-4 h-4" />
                        Đã hoàn thành
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
