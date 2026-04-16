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

interface ProductionStatusResponse {
  order_id: number;
  is_production_ready: boolean;
  has_enough_material: boolean;
  has_free_machine: boolean;
  materials: [
    {
      material_id: number;
      material_code: string;
      material_name: string;
      unit: string;
      required_qty: number;
      available_qty: number;
      missing_qty: number;
      is_enough: boolean;
      status: string;
    }
  ],
  machines: [
    {
      process_id: number;
      seq_num: number;
      process_code: string;
      process_name: string;
      machine_code: string;
      machine_found: boolean;
      is_available: boolean;
      total_quantity: number;
      busy_quantity: number;
      free_quantity: number;
      status: string;
    }
  ]
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

  startReady: (orderId: number) =>
    http.get<ProductionStatusResponse>(`/api/Productions/start-ready/${orderId}`),

  updateProduction: (orderId: number, body: { is_production_ready: boolean }) =>
    http.put(`/api/Productions/start-ready/${orderId}`, body),
};
