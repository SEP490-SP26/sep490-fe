"use client";
import { productionsApi } from "@/apiRequests/productions";
import { FinishTaskBody, tasksApi } from "@/apiRequests/tasks";
import Loading from "@/app/manager/loading";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/utils/toastService";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { BiBook, BiCheckCircle, BiPackage, BiSolidZap } from "react-icons/bi";
import {
  BsArrowLeft,
  BsClock,
  BsDownload,
  BsLayers,
  BsPrinter,
  BsScissors,
  BsX,
} from "react-icons/bs";

export interface Material {
  name: string;
  quantity: number;
  unit: string;
}

export interface OutputProduct {
  name: string;
  code: string;
  quantity: number;
  unit: string;
}

export interface ProductionLog {
  log_id: number;
  task_id: number;
  action_type: string;
  qty_good: number;
  qty_bad: number;
  operator_id: number;
  log_time: string; // ISO Date string
  scanner_id: string;
  scanned_code: string;
}

export interface ProductionStage {
  process_id: number;
  seq_num: number;
  process_name: string;
  process_code: string;
  machine: string;
  task_id: number;
  task_name: string;
  status: 'Finished' | 'InProcessing' | 'Ready' | string;
  start_time?: string; // ISO Date string
  end_time?: string;   // ISO Date string
  last_scan_time?: string;
  qty_good: number;
  qty_bad: number;
  waste_percent: number;
  logs: ProductionLog[];
  input_materials: Material[];
  output_product: OutputProduct;
}

export interface ProductionResponse {
  prod_id: number;
  production_code: string;
  production_status: 'InProcessing' | 'Finished' | 'Pending' | string;
  start_date: string; // ISO Date string
  order_id: number;
  order_code: string;
  delivery_date: string; // ISO Date string
  customer_name: string;
  product_name: string;
  quantity: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  stages: ProductionStage[];
}



export default function ProductionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const [showQRPopup, setShowQRPopup] = useState(false);
  const [qrToken, setQrToken] = useState<string>("");
  // State for Create QR Input Modal
  const [showCreateQRInputModal, setShowCreateQRInputModal] = useState(false);
  const [qtyGoodInput, setQtyGoodInput] = useState<number | "">("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // State for Finish Task Modal
  const [showFinishModal, setShowFinishModal] = useState(false);




  const [selectedTaskName, setSelectedTaskName] = useState<string>("");

  const handleOpencreateQRModal = (taskId: number, taskName: string) => {
    setSelectedTaskId(taskId);
    setSelectedTaskName(taskName);
    setQtyGoodInput(""); // Reset input
    setShowCreateQRInputModal(true);
  };

  const handleCreateQR = async () => {
    if (!selectedTaskId || qtyGoodInput === "" || Number(qtyGoodInput) < 0) {
      showErrorToast("Vui lòng nhập số lượng hợp lệ");
      return;
    }

    try {
      console.log('taskId ', selectedTaskId);
      const response = await tasksApi.createQRByStageId({
        task_id: selectedTaskId,
        ttl_minutes: 120,
        qty_good: Number(qtyGoodInput),
      });
      console.log('response ', response);
      console.log('response.token ', response.token);
      if (response && response.token) {
        // Response có token ngay ở top level
        setQrToken(response.token);
        setShowCreateQRInputModal(false); // Close input modal
        setShowQRPopup(true);
      }
    } catch (error) {
      console.error("Failed to create QR code:", error);
      showErrorToast("Không thể tạo mã QR. Vui lòng thử lại.");
    }
  };

  // Scanner Logic
  const barcodeBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;

      // If time difference is too large (manual typing), reset buffer
      // Scanners usually type very fast (< 50ms per char)
      if (timeDiff > 100 && barcodeBuffer.current.length > 0) {
        barcodeBuffer.current = "";
      }

      lastKeyTime.current = currentTime;

      if (e.key === "Enter") {
        // Process the buffer
        const token = barcodeBuffer.current;
        if (token.length > 10) { // Simple validation for minimum length
          try {
            console.log("Scanned Token:", token);
            showInfoToast("Đang xử lý mã quét...");
            const response = await tasksApi.finishTask({ token });
            if (response) {
              showSuccessToast("Hoàn thành công đoạn thành công!");
              window.location.reload();
            }
          } catch (error) {
            console.error("Auto scan error:", error);
            showErrorToast("Lỗi khi xử lý mã quét. Vui lòng thử lại.");
          }
        }
        barcodeBuffer.current = ""; // Reset after Enter
      } else if (e.key.length === 1) {
        // Only append printable characters
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleDownloadQR = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${selectedTaskName || "task"}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handlePrintQR = () => {
    const canvas = document.getElementById("qr-code-canvas") as HTMLCanvasElement;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      const windowContent = `
         <!DOCTYPE html>
         <html>
           <head>
             <title>In QR Code</title>
             <style>
               body {
                 display: flex;
                 flex-direction: column;
                 align-items: center;
                 justify-content: center;
                 height: 100vh;
                 margin: 0;
               }
               h2 { margin-bottom: 20px; font-family: sans-serif; }
               img { max-width: 100%; height: auto; }
             </style>
           </head>
           <body>
             <h2>${selectedTaskName}</h2>
             <img src="${dataUrl}" />
             <script>
               window.onload = function() {
                 window.print();
                 window.onafterprint = function() { window.close(); }
               }
             </script>
           </body>
         </html>
       `;
      const printWindow = window.open("", "", "width=600,height=600");
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(windowContent);
        printWindow.document.close();
      }
    }
  };


  const { data: productionSchedules, isLoading } = useQuery<ProductionResponse>({
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
    enabled: !!id,
  });


  console.log("production", productionSchedules);

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
            {/* Order details in cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">Lệnh sản xuất</div>
                <div className="font-medium text-gray-900 truncate">
                  Mã {productionSchedules?.order_code || "Khách lẻ"}
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">KHÁCH HÀNG</div>
                <div className="font-medium text-gray-900 truncate">
                  {productionSchedules?.customer_name || "Khách lẻ"}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">SẢN PHẨM</div>
                <div className="font-medium text-gray-900">{productionSchedules?.product_name}</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">SỐ LƯỢNG</div>
                <div className="font-medium text-gray-900">
                  {productionSchedules?.quantity} chiếc
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">NGÀY GIAO</div>
                <div className="font-medium text-gray-900">
                  {productionSchedules?.delivery_date
                    ? new Date(
                      productionSchedules.delivery_date
                    ).toLocaleDateString("vi-VN")
                    : "-"}
                </div>
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
          {productionSchedules?.stages.map((stage: any) => {
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
                            ? " Sẵn sàng"
                            : " Chờ xử lý"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {stage.task_id && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        {stage.task_name}
                      </span>
                    )}
                    {isInProgress && (
                      <div className="flex items-center gap-2">
                        <button
                          className="bg-accent py-1 px-2 rounded-md hover:bg-black/80 transition-colors text-white"
                          onClick={() => handleOpencreateQRModal(stage.task_id, stage.task_name || stage.process_name)}
                        >
                          Tạo QR
                        </button>
                      </div>
                    )}
                  </div>
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
                      <div className="text-sm text-blue-600">Mã công đoạn</div>
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

      {showQRPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Mã QR cho Task
              </h3>
              <button
                onClick={() => setShowQRPopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <BsX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="p-4 bg-white border-2 border-dashed border-gray-200 rounded-lg">
                <QRCodeCanvas
                  id="qr-code-canvas"
                  value={qrToken}
                  size={200}
                  level={"H"}
                  includeMargin={true}
                />
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Task</p>
                <p className="font-medium text-gray-900">{selectedTaskName}</p>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handlePrintQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  <BsPrinter className="w-4 h-4" />
                  In QR
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <BsDownload className="w-4 h-4" />
                  Tải về
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Qty Good để tạo QR */}
      {showCreateQRInputModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                Tạo QR Code
              </h3>
              <button
                onClick={() => setShowCreateQRInputModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <BsX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số lượng thành phẩm (Good Quantity)
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={qtyGoodInput}
                  onChange={(e) => setQtyGoodInput(Number(e.target.value))}
                  placeholder="Nhập số lượng..."
                  min="0"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateQRInputModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateQR}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Tạo mã QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
