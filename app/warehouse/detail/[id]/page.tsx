"use client";

import { productionsApi } from "@/apiRequests/productions";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BiArrowBack, BiCube, BiUser, BiCalendar, BiPackage, BiTransferAlt, BiCheckCircle, BiTimeFive, BiRightArrowAlt } from "react-icons/bi";
import { FiPrinter, FiDroplet, FiSettings, FiFileText } from "react-icons/fi";
import { Spin, Modal } from "antd";
import { useState } from "react";
import { requestOrderApi } from "@/apiRequests/request";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";

export default function ProductionDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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
    switch (status) {
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
    switch (status) {
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

  const getPreviewUrl = (url: string) => {
    if (!url) return "";
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx') || lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.xlsx')) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return url;
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
              Chi tiết
            </h1>
            <p className="text-gray-500">Mã đơn hàng: {detailData.order_code} • Mã SX: {detailData.production_code}</p>
          </div>
          <button
            onClick={handleConfirmImporting}
            disabled={isConfirming || !detailData?.import_recieve_path}
            className="
              bg-green-600 text-white px-6 py-2.5 rounded-lg
              hover:bg-green-700
              disabled:bg-gray-400 disabled:hover:bg-gray-400
              disabled:text-gray-200
              transition-colors font-medium flex items-center gap-2 shadow-sm
              disabled:cursor-not-allowed w-fit
            "
          >
            <BiPackage className="w-5 h-5" />
            {isConfirming ? "Đang xử lý..." : "Xác nhận nhập kho"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 auto-rows-fr">
        {/* General Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <BiPackage className="w-5 h-5 text-indigo-500" />
              Thông Tin Nhập Kho
            </h2>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <div className="text-sm text-gray-500 mb-1">Tên sản phẩm</div>
                <div className="font-medium text-gray-900 text-lg">{detailData.product_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Quy cách đóng gói</div>
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  {detailData.packaging_standard}
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
            </div>
          </div>
        </div>

        {/* Preview Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-full">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FiFileText className="w-5 h-5 text-indigo-500" />
            Phiếu nhập kho
          </h2>
          {detailData.import_recieve_path ? (
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden flex flex-col items-center justify-center relative group min-h-[250px]">
              <iframe
                src={getPreviewUrl(detailData.import_recieve_path)}
                className="w-full h-full min-h-[250px] object-contain"
                title="Phiếu nhập kho"
              />
              <button
                onClick={() => setIsPreviewModalOpen(true)}
                className="absolute inset-0 w-full h-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer border-none"
              >
                <span className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm shadow-sm pointer-events-none">
                  Xem chi tiết
                </span>
              </button>
            </div>
          ) : (
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center p-6 text-center">
              <FiFileText className="w-8 h-8 text-gray-300 mb-2" />
              <span className="text-gray-500 text-sm">Chưa có phiếu nhập kho</span>
            </div>
          )}
        </div>

        {/* 1. Static Workflow/Stepper */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Quy trình nhập kho tiêu chuẩn</h3>
          <div className="flex-1 flex items-center justify-center w-full">
            <div className="flex items-center justify-between w-full relative">
              {/* Đường line chạy ngang nền */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-100 z-0"></div>

              {/* Step 1 */}
              <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border-4 border-white shadow-sm">
                  <FiSettings className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-600">Sản xuất</span>
              </div>

              {/* Step 2 */}
              <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center border-4 border-white shadow-sm">
                  <FiFileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium text-gray-600">Tạo phiếu</span>
              </div>

              {/* Step 3 */}
              <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center border-4 border-white shadow-sm">
                  <BiCheckCircle className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-600">Kiểm tra</span>
              </div>

              {/* Step 4 */}
              <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
                <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center border-4 border-white shadow-sm">
                  <BiPackage className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-gray-600">Lưu kho</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Static Notes / Guidelines */}
        <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-6 flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FiDroplet className="w-5 h-5" /> {/* Có thể thay bằng icon khác phù hợp hơn nếu có */}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">Hướng dẫn nhập kho</h3>
              <ul className="text-xs text-gray-600 space-y-2 mt-3">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Kiểm tra kỹ số lượng thực tế với phiếu.
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Đảm bảo bao bì (Quy cách) không móp méo.
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                  Xác nhận lưu kho sau khi sắp xếp lên kệ.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      {/* --- KẾT THÚC PHẦN TRANG TRÍ --- */}
      <Modal
        title="Xem trước phiếu nhập kho"
        open={isPreviewModalOpen}
        onCancel={() => setIsPreviewModalOpen(false)}
        footer={null}
        width={1000}
        centered
        destroyOnClose
      >
        <div className="w-full h-[75vh] mt-4">
          <iframe
            src={getPreviewUrl(detailData?.import_recieve_path)}
            className="w-full h-full border-0 rounded-lg bg-gray-50"
            title="Phiếu nhập kho chi tiết"
          />
        </div>
      </Modal>
    </div>
  );
}
