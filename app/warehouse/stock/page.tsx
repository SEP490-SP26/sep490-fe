"use client";
import { materialsApi } from "@/apiRequests/materials";
import Loading from "@/app/(overview)/loading";
import { useQuery } from "@tanstack/react-query";
import { Spin } from "antd";
import { useState } from "react";
import { BiPackage } from "react-icons/bi";
import { FiSearch } from "react-icons/fi";

export default function StockPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: inventory,
    isPending: isInvPending,
    refetch: refetchInvData,
  } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      try {
        const response = await materialsApi.getAll();
        return response;
      } catch (error) {
        console.error("Error fetching inventory:", error);
        return [];
      }
    },
  });

  if (isInvPending) {
    return <Loading />;
  }

  const filteredInventory = (inventory || []).filter((inv: any) => {
    const term = searchTerm.toLowerCase();
    return (
      inv.name?.toLowerCase().includes(term) ||
      inv.code?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
          <BiPackage className="w-7 h-7 text-purple-500" />
          Tồn kho Nguyên vật liệu
        </h1>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 transition"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nguyên vật liệu
                </th>
                <th className="text-end py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tồn kho
                </th>
                <th className="text-left py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Đơn vị
                </th>
                <th className="text-center py-3.5 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-12 text-center text-gray-400 text-sm"
                  >
                    {searchTerm
                      ? "Không tìm thấy nguyên vật liệu phù hợp"
                      : "Không có dữ liệu tồn kho"}
                  </td>
                </tr>
              ) : (
                filteredInventory.map((inv: any) => (
                  <tr
                    key={inv.material_id}
                    className="border-b border-gray-100 hover:bg-purple-50/30 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-gray-900">
                        {inv.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Mã: {inv.code}
                      </div>
                    </td>
                    <td className="text-end py-3.5 px-5">
                      <span className="font-semibold text-gray-800">
                        {inv.stock_qty?.toLocaleString("vi-VN") ?? inv.stock_qty}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-gray-600">{inv.unit}</td>
                    <td className="text-center py-3.5 px-5 text-gray-500 text-sm">
                      {inv.description || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
