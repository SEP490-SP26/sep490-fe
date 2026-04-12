"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { BiArrowBack, BiCheckShield, BiCube, BiUser, BiCreditCard, BiFile, BiMap, BiCalendarCheck } from "react-icons/bi";
import { Spin } from "antd";
import { FiSettings } from "react-icons/fi";
import { showErrorToast, showSuccessToast } from "@/utils/toastService";
import { useState } from "react";

export default function CustomerReceiveOrder() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [isReceiving, setIsReceiving] = useState(false);

  const { data: requestData, isPending, error } = useQuery({
    queryKey: ["request-detail", id],
    queryFn: async () => {
      try {
        const response: any = await requestOrderApi.getDetail(id);
        return response.data || response;
      } catch (err) {
        console.error("Error fetching detail:", err);
        throw err;
      }
    },
    enabled: !!id,
  });

  const handleReceiveOrder = async () => {
    setIsReceiving(true);
    try {
      await requestOrderApi.customerReceive(Number(id));
      showSuccessToast("Đã xác nhận nhận hàng thành công!");
      router.push("/"); // Or whichever path is relevant later
    } catch (err: any) {
      console.error("Error confirming receiving:", err);
      showErrorToast(err.response?.data?.message || "Có lỗi xảy ra khi xác nhận nhận hàng!");
    } finally {
      setIsReceiving(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" tip="Đang tải thông tin đơn hàng..." />
      </div>
    );
  }

  if (error || !requestData) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 flex flex-col items-center justify-center">
          <FiSettings className="w-12 h-12 mb-4 animate-spin-slow" />
          <h2 className="text-xl font-bold mb-2">Đã xảy ra lỗi</h2>
          <p>Không thể tải thông tin yêu cầu (Mã đơn: {id})</p>
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

  return (
    <div className="max-w-5xl mx-auto pb-16 pt-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors self-start mt-1"
        >
          <BiArrowBack className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              Xác Nhận Nhận Hàng
            </h1>
            <p className="text-gray-500 mt-1">Mã Yêu Cầu: #{requestData.order_request_id} • Trạng thái: {requestData.process_status}</p>
          </div>
          <button
            onClick={handleReceiveOrder}
            disabled={isReceiving}
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 transition-all font-bold flex items-center gap-2 shadow-md shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed w-fit hover:scale-105 active:scale-95"
          >
            <BiCheckShield className="w-6 h-6" />
            {isReceiving ? "Đang xử lý..." : "Xác Nhận Nhận Hàng"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
            <BiUser className="w-5 h-5 text-blue-500" />
            Thông Tin Khách Hàng
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Họ và Tên</span>
              <span className="font-semibold text-gray-900">{requestData.customer_name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Số điện thoại</span>
              <span className="font-semibold text-gray-900">{requestData.customer_phone}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Email</span>
              <span className="font-semibold text-gray-900">{requestData.customer_email}</span>
            </div>
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-gray-500 text-sm flex items-center gap-1"><BiMap /> Địa chỉ giao hàng</span>
              <span className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg">{requestData.detail_address || "Chưa cập nhật"}</span>
            </div>
          </div>
        </div>

        {/* Product Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
            <BiCube className="w-5 h-5 text-purple-500" />
            Thông Tin Sản Phẩm
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
              <span className="font-bold text-purple-900 text-lg">{requestData.product_name}</span>
              <span className="bg-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">
                {requestData.product_type}
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Số lượng đặt</span>
              <span className="font-bold text-lg text-gray-900">{requestData.quantity?.toLocaleString()} <span className="text-sm font-normal text-gray-500">hộp</span></span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-50 pb-2">
              <span className="text-gray-500 text-sm">Kích thước (D x R x C)</span>
              <span className="font-medium text-gray-900">
                {requestData.product_length_mm} x {requestData.product_width_mm} x {requestData.product_height_mm} mm
              </span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-gray-500 text-sm flex items-center gap-1"><BiCalendarCheck /> Ngày giao hàng cam kết</span>
              <span className="font-bold text-emerald-600">
                {new Date(requestData.delivery_date).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-sm border border-indigo-100 p-6 md:col-span-2">
          <h2 className="text-lg font-bold text-indigo-900 mb-6 flex items-center gap-2 border-b border-indigo-200/50 pb-4">
            <BiCreditCard className="w-5 h-5 text-indigo-600" />
            Thông Tin Thanh Toán
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                <span className="text-indigo-800 text-sm font-medium">Tổng giá trị đơn hàng</span>
                <span className="font-bold text-indigo-900 text-lg">
                  {requestData.final_total_cost?.toLocaleString('vi-VN')} <span className="text-sm underline">đ</span>
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                <span className="text-indigo-800 text-sm font-medium">Đã đặt cọc</span>
                <span className="font-bold text-emerald-700 text-lg">
                  {requestData.deposit_amount?.toLocaleString('vi-VN')} <span className="text-sm underline">đ</span>
                </span>
              </div>
              <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                <span className="text-indigo-900 font-bold">Số tiền còn lại đã thanh toán</span>
                <span className="font-bold text-rose-600 text-2xl">
                  {((requestData.final_total_cost || 0) - (requestData.deposit_amount || 0)).toLocaleString('vi-VN')} <span className="text-base underline">đ</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-3 bg-white/60 p-4 rounded-xl border border-white">
              <h3 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-2"><BiFile /> Tệp tin đính kèm</h3>
              {requestData.design_file_path && (
                <a href={requestData.design_file_path} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-3 rounded-lg hover:shadow transition-shadow">
                  <span className="text-sm font-medium text-gray-700 truncate">Bản thiết kế</span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">Xem</span>
                </a>
              )}
              {requestData.customer_signed_contract_path && (
                <a href={requestData.customer_signed_contract_path} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-3 rounded-lg hover:shadow transition-shadow">
                  <span className="text-sm font-medium text-gray-700 truncate">Hợp đồng</span>
                  <span className="text-xs bg-emerald-100 px-2 py-1 rounded text-emerald-700">Đã ký</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
