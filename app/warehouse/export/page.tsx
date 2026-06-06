"use client";

import { productionsApi, IProductionProgressItem } from "@/apiRequests/productions";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BsEye, BsSearch } from "react-icons/bs";
import Loading from "@/app/manager/loading";

export default function ExportPage() {
  const [searchKeyword, setSearchKeyword] = useState("");

  const { data: productionResponse, isLoading } = useQuery({
    queryKey: ["all-productions-export"],
    queryFn: async () => {
      return productionsApi.getAllProduction();
    },
  });

  const productions: IProductionProgressItem[] = productionResponse?.data || [];

  const exportItems = useMemo(() => {
    // Lọc ra các lệnh có order_id, có phiếu xuất kho và loại bỏ các phiếu trùng lặp (vd: lệnh ghép và lệnh con chung 1 phiếu)
    const allItemsWithFile = productions.filter(
      (p) => p.order_id && (p.sub_product_issue_file || p.issue_file)
    );

    const deduped = allItemsWithFile.reduce((acc, current) => {
      const fileUrl = current.sub_product_issue_file || current.issue_file;
      const existingIndex = acc.findIndex(
        (item) => (item.sub_product_issue_file || item.issue_file) === fileUrl
      );

      if (existingIndex === -1) {
        acc.push(current);
      } else {
        // Ưu tiên hiển thị Lệnh Ghép (Group) nếu nhiều lệnh share chung 1 file
        if (current.is_group_production && !acc[existingIndex].is_group_production) {
          acc[existingIndex] = current;
        }
      }
      return acc;
    }, [] as IProductionProgressItem[]);

    const kw = searchKeyword.trim().toLowerCase();
    const filtered = kw
      ? deduped.filter((item) => {
          const orderId = String(item.order_id ?? "").toLowerCase();
          const code = String(item.code ?? "").toLowerCase();
          return orderId.includes(kw) || code.includes(kw);
        })
      : deduped;

    return filtered.sort((a, b) => (b.order_id ?? 0) - (a.order_id ?? 0));
  }, [productions, searchKeyword]);

  if (isLoading) return <Loading text="Đang tải dữ liệu..." />;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Danh sách Phiếu Xuất Kho</h1>
            <p className="text-sm text-gray-500">
              Danh sách các lệnh sản xuất đã có phiếu xuất kho.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <BsSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã đơn hàng..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
              <th className="px-6 py-4 font-semibold text-gray-700">Mã đơn hànghàng</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Mã Lệnh SX</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Tên Sản Phẩm</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Số Lượng</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Phiếu Xuất Kho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exportItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {searchKeyword.trim()
                      ? "Không tìm thấy đơn hàng phù hợp."
                      : "Không có phiếu xuất kho nào."}
                  </td>
                </tr>
              ) : (
                exportItems.map((item) => {
                  const fileUrl = item.sub_product_issue_file || item.issue_file;
                  return (
                    <tr key={item.production_id || item.prod_id || item.order_id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {item.order_id || item.code || "—"}
                        {item.is_group_production && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                            Ghép
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {item.prod_id || item.code || "—"}
                        {item.is_group_production && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-800">
                            Ghép
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {item.is_group_production ? "Sản phẩm ghép" : (item.product_name || "—")}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-700">
                        {(item.quantity || item.group_total_qty || 0).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {fileUrl ? (
                          <button
                            onClick={() => window.open(fileUrl, "_blank")}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition font-medium text-xs"
                          >
                            <BsEye className="w-3.5 h-3.5" /> Xem phiếu
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Không có</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}