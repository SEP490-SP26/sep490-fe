"use client";

import { productionsApi } from "@/apiRequests/productions";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BiArrowBack, BiCube, BiUser, BiCalendar, BiPackage, BiTransferAlt, BiCheckCircle, BiTimeFive, BiRightArrowAlt } from "react-icons/bi";
import { FiPrinter, FiDroplet, FiSettings } from "react-icons/fi";
import { Spin } from "antd";
import { useState } from "react";
import { requestOrderApi } from "@/apiRequests/request";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";

export default function ProductionDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isConfirming, setIsConfirming] = useState(false);

  const { data: detailData, isPending, error } = useQuery({
    queryKey: ["production-detail", id],
    queryFn: async () => {
      try {
        const response: any = await productionsApi.getProdyctionByOrderId(id);
        return response.data || response;
      } catch (err) {
        console.error("Error fetching detail:", err);
        throw err;
      }
    },
    enabled: !!id,
  });

  if (isPending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" tip="Đang tải thông tin chi tiết..." />
      </div>
    );
  }

  if (error || !detailData) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 flex flex-col items-center justify-center">
          <FiSettings className="w-12 h-12 mb-4 animate-spin-slow" />
          <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
          <p>Không thể tải thông tin chi tiết (Mã đơn: {id})</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg font-medium transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const renderStatus = (status: string) => {
    switch(status) {
      case "InProcessing":
      case "In Processing":
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Đang sản xuất</span>;
      case "Finished":
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Hoàn thành</span>;
      case "Pending":
        return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">Chờ xử lý</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">{status}</span>;
    }
  };

  const renderStageStatus = (status: string) => {
    switch(status) {
      case "Finished":
        return <span className="text-green-600 flex items-center gap-1 text-xs font-semibold"><BiCheckCircle /> Hoàn thành</span>;
      case "Ready":
        return <span className="text-blue-600 flex items-center gap-1 text-xs font-semibold"><BiTimeFive /> Sẵn sàng</span>;
      case "Unassigned":
      case "Pending":
        return <span className="text-gray-500 flex items-center gap-1 text-xs font-semibold"><BiTimeFive /> Chờ TT</span>;
      case "InProcess":
      case "In Process":
        return <span className="text-purple-600 flex items-center gap-1 text-xs font-semibold"><FiSettings className="animate-spin" /> Đang chạy</span>;
      default:
        return <span className="text-gray-500 text-xs">{status}</span>;
    }
  };

  const handleConfirmImporting = async () => {
    try {
      setIsConfirming(true);
      await requestOrderApi.confirmImporting(Number(id));
      showSuccessToast("Nhập thành phẩm thành công!");
      router.push("/warehouse/inventory");
    } catch (error) {
      console.error("Error confirming importing:", error);
      showErrorToast("Có lỗi xảy ra khi nhập kho thành phẩm");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors self-start mt-1"
        >
          <BiArrowBack className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              Chi tiết thành phẩm
            </h1>
            <p className="text-gray-500">Mã đơn hàng: {detailData.order_code} • Mã SX: {detailData.production_code}</p>
          </div>
          <button
            onClick={handleConfirmImporting}
            disabled={isConfirming}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed w-fit"
          >
            <BiPackage className="w-5 h-5" />
            {isConfirming ? "Đang xử lý..." : "Nhập kho"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* General Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:col-span-2">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BiPackage className="w-5 h-5 text-indigo-500" />
            Thông Tin Sản Phẩm
          </h2>
          
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <div className="text-sm text-gray-500 mb-1">Tên sản phẩm</div>
              <div className="font-medium text-gray-900 text-lg">{detailData.product_name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Khách hàng</div>
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <BiUser className="text-gray-400" /> {detailData.customer_name}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Số lượng</div>
              <div className="font-bold text-indigo-600 text-xl">{detailData.quantity?.toLocaleString()} <span className="text-sm font-normal text-gray-500">sp</span></div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">Kích thước (D x R x C)</div>
              <div className="font-medium text-gray-900 flex items-center gap-2">
                <BiCube className="text-gray-400" /> {detailData.length_mm} x {detailData.width_mm} x {detailData.height_mm} mm
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-500 mb-1">Loại mực in</div>
              <div className="flex flex-wrap gap-2 mt-1">
                {detailData.ink_type_names?.split(",").map((ink: string, i: number) => (
                  <span key={i} className="bg-pink-50 text-pink-700 px-3 py-1 rounded-md text-xs font-medium border border-pink-100 flex items-center gap-1">
                    <FiDroplet /> {ink.trim()}
                  </span>
                ))}
              </div>
            </div>
            {detailData.ready_print_file && (
              <div className="col-span-2">
                <div className="text-sm text-gray-500 mb-2">File In Kỹ Thuật (Preview)</div>
                <a href={detailData.ready_print_file} target="_blank" rel="noreferrer" className="inline-block group relative">
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden group-hover:border-indigo-400 transition-colors">
                    {/* Assuming image */}
                    {detailData.ready_print_file.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                      <img src={detailData.ready_print_file} alt="Print ready" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <FiPrinter className="w-8 h-8 mb-2" />
                        <span className="text-xs">Xem File</span>
                      </div>
                    )}
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BiCalendar className="w-5 h-5 text-emerald-500" />
            Tiến độ đơn hàng
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-gray-500 text-sm">Ngày tạo đơn</span>
              <span className="font-medium">{new Date(detailData.created_at).toLocaleDateString("vi-VN")}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-500 text-sm">Bắt đầu sản xuất</span>
              <span className="font-medium text-emerald-600">
                {detailData.actual_start_date ? new Date(detailData.actual_start_date).toLocaleDateString("vi-VN") : "Chưa BĐ"}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-500 text-sm">Hạn giao hàng</span>
              <span className="font-medium text-rose-600 flex items-center gap-1">
                {new Date(detailData.delivery_date).toLocaleDateString("vi-VN")}
              </span>
            </div>
            
            <hr className="border-gray-100 border-dashed" />
            
            <div className="pt-2">
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.min(100, Math.round((detailData.stages?.filter((s: any) => s.status === 'Finished').length / (detailData.stages?.length || 1)) * 100))}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tiến độ quy trình</span>
                <span className="font-bold text-indigo-700">
                  {Math.round((detailData.stages?.filter((s: any) => s.status === 'Finished').length / (detailData.stages?.length || 1)) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Production Stages */}
      <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <BiTransferAlt className="w-6 h-6 text-purple-500" />
        Quy Trình Sản Xuất ({detailData.stages?.length || 0} Giai đoạn)
      </h2>

      <div className="space-y-4">
        {detailData.stages?.sort((a: any, b: any) => a.seq_num - b.seq_num).map((stage: any, index: number) => (
          <div key={stage.process_id} className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 transition-colors shadow-sm relative">
            {/* Status Line Indicator */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${stage.status === 'Finished' ? 'bg-green-500' : stage.status === 'Ready' ? 'bg-blue-500' : 'bg-gray-200'}`}></div>
            
            <div className="p-5 pl-6 flex flex-col lg:flex-row gap-6">
              
              <div className="lg:w-1/4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center">
                      {stage.seq_num}
                    </span>
                    <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">{stage.process_name}</h3>
                  </div>
                  <div className="text-xs text-gray-500 ml-8 mb-2">Mã máy: {stage.machine}</div>
                </div>
                <div className="ml-8">
                  {renderStageStatus(stage.status)}
                </div>
              </div>

              {/* Input Materials */}
              <div className="lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Nguyên liệu đầu vào</h4>
                {stage.input_materials?.length > 0 ? (
                  <ul className="space-y-2">
                    {stage.input_materials.map((mat: any, idx: number) => (
                      <li key={idx} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-700 truncate max-w-[200px]" title={mat.name}>{mat.name}</span>
                        <span className="font-medium text-gray-900 whitespace-nowrap">{mat.quantity} <span className="text-gray-500 font-normal">{mat.unit}</span></span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-400 italic">Không có nguyên liệu đầu vào</div>
                )}
              </div>

              {/* Arrow separator on Desktop */}
              <div className="hidden lg:flex flex-col justify-center items-center px-2">
                <BiRightArrowAlt className="w-8 h-8 text-gray-300" />
              </div>

              {/* Output Product */}
              <div className="lg:w-1/3 border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thành phẩm</h4>
                {stage.output_product ? (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="text-sm font-bold text-indigo-900 truncate max-w-[200px]" title={stage.output_product.name}>{stage.output_product.name}</div>
                      <div className="text-xs text-indigo-500">Mã: {stage.output_product.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-indigo-700">
                        {stage.actual_output_quantity !== null ? stage.actual_output_quantity : stage.estimated_output_quantity}
                      </div>
                      <div className="text-xs text-indigo-500">{stage.output_product.unit}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">Không có cấu hình đầu ra</div>
                )}
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
