import http from "@/lib/httpAxios";
import { NearestDeliveryResponse } from "@/schemaValidations/common.schema";
import { start } from "repl";

interface InventoryItem {
  /** Nhóm vật tư (Giấy, Mực, Keo, Màng...) */
  material_group: string;

  /** Mã định danh vật tư trong hệ thống */
  material_code: string;

  /** Tên hiển thị của vật tư */
  material_name: string;

  /** Đơn vị tính (tờ, kg, m2...) */
  unit: string;

  /** Số lượng cần xuất kho */
  quantity: number;
}

interface ProductionInformationResponse {
  /** ID đơn hàng */
  order_id: number;

  /** ID yêu cầu báo giá gốc */
  order_request_id: number;

  /** Mã đơn hàng (Ví dụ: ORD-00055) */
  order_code: string;

  /** Danh sách chi tiết vật tư cần xuất */
  items: InventoryItem[];
}

export const productionsApi = {
  getNearestDelivery: () =>
    http.get<NearestDeliveryResponse>("/api/productions/nearest-delivery"),

  getAllProduction: () => http.get("/api/productions/get-all-production?page=1&pageSize=500"),

  getProdyctionByOrderId: (id: string) =>
    http.get(`/api/Productions/detail/${id}`),

  startProduction: (orderId: string) =>
    http.post(`/api/Productions/start/${orderId}`, { orderId }),

  getProductionInformation: (orderId: string) =>
    http.get<ProductionInformationResponse>(`/api/Productions/information/${orderId}`),

  transferToShipping: (orderId: number) =>
    http.put(`/api/Productions/delivery/${orderId}`, {}),
};
