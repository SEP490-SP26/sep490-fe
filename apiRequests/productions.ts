import http from "@/lib/httpAxios";
import { NearestDeliveryResponse } from "@/schemaValidations/common.schema";

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

export interface MaterialCheck {
  material_id: number;
  material_code: string;
  material_name: string;
  unit: string;
  required_qty: number;
  available_qty: number;
  missing_qty: number;
  is_enough: boolean;
  status: 'Enough' | 'Missing' | string;
}

export interface MachineCheck {
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
  status: 'Available' | 'Busy' | string;
}

export interface ProductionReadiness {
  order_id: number;
  production_id: number;
  product_type_id: number;
  order_quantity: number;
  
  // Trạng thái tổng quát
  is_production_ready: boolean;
  has_enough_material: boolean;
  has_free_machine: boolean;
  
  // Thông số kỹ thuật in
  request_print_width_mm: number;
  request_print_length_mm: number;

  // Logic sử dụng NVL và Bán thành phẩm
  can_use_nvl: boolean;
  can_use_sub: boolean;
  can_use_both: boolean;
  nvl_qty: number;
  need_manager_approval: boolean;

  // Thông tin bán thành phẩm (Sub-product)
  has_matched_sub_product: boolean;
  sub_product_message: string;
  selected_sub_product_id: number | null;
  sub_product_used_qty: number;
  matched_sub_product: any | null;

  // Ghi chú quản lý
  gm_note: string | null;
  mgr_note: string | null;
  production_method?: string | null;
  gm_proposed_method?: string | null;
  proposed_production_method?: string | null;

  // Danh sách chi tiết
  materials: MaterialCheck[];
  remaining_materials_for_both: any[];
  machines: MachineCheck[];
}

export type ProductionMethod = "NVL" | "SUB" | "BOTH";

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

  /** GET /api/Productions/start-ready/{orderId} — chỉ kiểm tra phương án sản xuất */
  startReady: (orderId: number) =>
    http.get<ProductionReadiness>(`/api/Productions/start-ready/${orderId}`),

  /** PUT /api/Productions/start-ready/{orderId} — GM xác nhận đưa vào sản xuất (kèm gm_note & production_method) */
  updateProduction: (orderId: number, body: { is_production_ready: boolean; gm_note?: string;  gm_proposed_method: ProductionMethod;   proposed_production_method: ProductionMethod }) =>
    http.put(`/api/Productions/start-ready/${orderId}`, body),
  //thêm 

  generateImportReceive: (body: { order_id: number }) =>
    http.post(`/api/Productions/generate-import-receive`, body),

  /** POST /api/Productions/production-method — Manager chọn phương thức NVL / SUB / BOTH */
  productionMethod: (body: {
    order_id: number;
    production_method: ProductionMethod;
    is_full_process: boolean | null;
    sub_id: number | null;
    mgr_note?: string;
  }) =>
    http.post(`/api/Productions/production-method`, body),

  /** GET /api/GroupProductions/{prodId}/detail — Lấy chi tiết đơn ghép */
  getGroupProductionDetail: (prodId: number) =>
    http.get(`/api/GroupProductions/${prodId}/detail`),

  /** POST /api/GroupProductions/{prodId}/start — Bắt đầu sản xuất đơn ghép */
  startGroupProduction: (prodId: number) =>
    http.post(`/api/GroupProductions/${prodId}/start`, {}),
};
