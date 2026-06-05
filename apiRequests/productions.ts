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

  // Chi phí dự kiến
  nvl_estimated_unit_cost?: number;
  sub_estimated_unit_cost?: number;
  both_estimated_unit_cost?: number;
  nvl_estimated_total_cost?: number;
  sub_estimated_total_cost?: number;
  both_estimated_total_cost?: number;
}

// Chi tiết vật tư đầu vào của từng công đoạn
export interface IStageInputMaterial {
  name: string;
  code: string;
  quantity: number;
  estimated_quantity: number;
  actual_quantity: number | null;
  quantity_source: 'Estimated' | 'Actual' | string;
  unit: 'bản' | 'tờ' | 'kg' | 'sp' | string;
}

// Thông tin thành phẩm / bán thành phẩm đầu ra của công đoạn
export interface IStageOutputProduct {
  name: string;
  code: string;
  quantity: number;
  estimated_quantity: number;
  actual_quantity: number | null;
  quantity_source: 'Estimated' | 'Actual' | string;
  unit: 'bản' | 'tờ' | 'kg' | 'sp' | string;
}

// Nhật ký quét mã / báo cáo tiến độ trong một công đoạn
export interface IStageLog {
  log_id: number;
  task_id: number;
  action_type: 'Finished' | string;
  qty_good: number;
  log_time: string; // ISO Date String
  scanned_code: string;
  scanned_by_user_id: number;
  reason: string | null;
  comment: string | null;
  report_image_url: string | null;
  reference_input_json: string | null;
  output_json: string | null;
  report_image_urls: string[];
  reference_inputs: any[];
  outputs: any[];
  material_usages: any[];
}

// Chi tiết một công đoạn sản xuất (Stage)
export interface IProductionStage {
  process_id: number;
  seq_num: number;
  process_name: string;
  process_code: 'RALO' | 'CAT' | 'IN' | 'PHU' | 'CAN' | 'BE' | 'DUT' | 'DAN' | string;
  machine: string;
  n_up: number;
  task_id: number | null;
  task_name: string | null;
  status: 'Finished' | 'Unassigned' | null | string;
  is_taken_sub_product: boolean;
  assigned_to: number | null;
  assigned_to_name: string | null;
  start_time: string | null; // ISO Date String hoặc null nếu chưa chạy
  end_time: string | null;   // ISO Date String hoặc null nếu chưa chạy
  planned_start_time: string | null;
  planned_end_time: string | null;
  qty_good: number;
  waste_percent: number;
  last_scan_time: string | null;
  estimated_output_quantity: number;
  actual_output_quantity: number | null;
  logs: IStageLog[];
  input_materials: IStageInputMaterial[];
  output_product: IStageOutputProduct;
}

// Toàn bộ thông tin của Lệnh sản xuất (Object ngoài cùng)
export interface IProductionDetailResponse {
  prod_id: number;
  production_code: string;
  production_status: 'Importing' | 'Scheduled' | 'Finished' | string;
  start_date: string | null;
  end_date: string; // ISO Date String
  import_recieve_path: string | null;
  order_id: number;
  order_code: string;
  delivery_date: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  packaging_standard: string;
  product_type_id: number;
  is_full_process: boolean | null;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  ready_print_file: string | null; // URL file in sẵn sàng
  ink_type_names: string;          // Danh sách mực, cách nhau bằng dấu phẩy
  wave_type: string;
  paper_name: string;
  coating_type: string;
  paper_alternative: string | null;
  wave_alternative: string | null;
  n_up: number;
  created_at: string;
  planned_start_date: string;
  actual_start_date: string | null;
  lamination_material_id: number | null;
  lamination_material_code: string | null;
  lamination_material_name: string | null;
  production_method: 'NVL' | string;
  sub_product_id: number | null;
  sub_product_used_qty: number;
  nvl_qty: number;
  sub_product_process: any | null;
  production_approval_flow: any | null;
  all_tasks_finished: boolean;
  waiting_manual_importing: boolean;
  is_auto_production_approval: boolean;
  sub_product_issue_file: string | null;
  production_approval_label: string | null;
  stages: IProductionStage[];
}

export type ProductionMethod = "NVL" | "SUB" | "BOTH";

// Interface chi tiết trạng thái của từng công đoạn (Task/Process)
export interface IStageStatusDetail {
  task_id: number;
  process_id: number;
  seq_num: number;
  process_code: 'BE' | 'DUT' | 'DAN' | string; // Mã công đoạn (Bế, Dứt, Dán, v.v.)
  process_name: string;                         // Tên hiển thị công đoạn
  status: 'Unassigned' | 'InProcessing' | 'Finished' | string;
  start_time: string | null;                    // ISO Date String hoặc null
  end_time: string | null;                      // ISO Date String hoặc null
  planned_start_time: string;                   // ISO Date String
  planned_end_time: string;                     // ISO Date String
  is_current: boolean;                          // Xác định công đoạn hiện tại hệ thống đang xử lý
}

// Interface đại diện cho một bản ghi đơn hàng/lệnh sản xuất trong danh sách
export interface IProductionProgressItem {
  order_id: number;
  code: string;                                 // Mã đơn hàng (ví dụ: ORD-00122)
  customer_name: string;
  product_name: string;
  quantity: number;
  delivery_date: string;                        // ISO Date String
  progress_percent: number;                     // % Tiến độ sản xuất toàn đơn
  current_stage: string;                        // Tên công đoạn hiện tại (ví dụ: "Bế")
  status: 'Scheduled' | string;                 // Trạng thái chung
  production_status: 'Scheduled' | string;      // Trạng thái sản xuất
  stage_status: 'Unassigned' | string;         // Trạng thái công đoạn hiện tại
  planned_start_date: string;                   // ISO Date String
  actual_start_date: string | null;             // ISO Date String hoặc null
  is_production_ready: boolean;
  production_method: 'NVL' | string;
  is_full_process: boolean | null;
  sub_product_id: number | null;
  sub_product_used_qty: number;
  prod_kind: 'SPLIT' | 'GROUP' | 'SINGLE' | string;
  production_code: string;                      // Mã lệnh sản xuất (ví dụ: SPLD30528130922607)
  is_group_production: boolean;
  is_split_production: boolean;
  gm_note: string | null;
  mgr_note: string | null;
  nvl_qty: number;
  can_start: boolean;
  can_start_message: string;
  stage_statuses: IStageStatusDetail[];         // Mảng chi tiết tiến độ các bước nhỏ
  stages: string[];                             // Danh sách chuỗi tên các công đoạn (ví dụ: ["Bế", "Dứt", "Dán"])
  prod_id: number;
  group_status: 'Scheduled' | string;
  group_process_codes: string;                  // Danh sách mã công đoạn gộp (ví dụ: "BE,DUT,DAN")
  group_total_qty: number;
  production_id: number;
  created_at: string;                           // ISO Date String
  production_approval_flow: any | null;         // Luồng duyệt (nếu có)
  is_auto_production_approval: boolean;
  production_approval_label: string | null;
  start_date: string | null;
  end_date: string;                             // ISO Date String
  order_status: 'Scheduled' | string;
  sub_product_issue_file?: string | null;
  issue_file?: string | null;
}

// Interface bọc ngoài cùng đại diện cho Response phân trang trả về từ API
export interface IProductionProgressPaginationResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: IProductionProgressItem[];
}

export const productionsApi = {
  getNearestDelivery: () =>
    http.get<NearestDeliveryResponse>("/api/productions/nearest-delivery"),

  getAllProduction: () => http.get<IProductionProgressPaginationResponse>("/api/productions/get-all-production?page=1&pageSize=500"),

  getProdyctionByOrderId: (id: string) =>
    http.get<IProductionDetailResponse>(`/api/Productions/detail/${id}`),

  getProductionByProdId: (id: string) =>
    http.get(`/api/Productions/detail/production/${id}`),

  startProduction: (orderId: string) =>
    http.post(`/api/Productions/start/${orderId}`, { orderId }),

  startProductionByProdId: (prodId: string) =>
    http.post(`/api/Productions/start/${prodId}`, { prodId }),

  /** PUT /api/Productions/mark-importing/{prodId} */
  markImporting: (prodId: number) =>
    http.put(`/api/Productions/mark-importing/${prodId}`, {}),

  getProductionInformation: (orderId: string) =>
    http.get<ProductionInformationResponse>(`/api/Productions/information/${orderId}`),

  transferToShipping: (orderId: number) =>
    http.put(`/api/Productions/delivery/${orderId}`, {}),

  /** GET /api/Productions/start-ready/{orderId} — chỉ kiểm tra phương án sản xuất */
  startReady: (orderId: number) =>
    http.get<ProductionReadiness>(`/api/Productions/start-ready/${orderId}`),

  /** PUT /api/Productions/start-ready/{orderId} — GM xác nhận đưa vào sản xuất (kèm gm_note & production_method) */
  updateProduction: (orderId: number, body: { is_production_ready: boolean; gm_note?: string; gm_proposed_method: ProductionMethod; proposed_production_method: ProductionMethod }) =>
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

  /** PUT /api/Productions/confirm-schedule/{prodId} — Manager duyệt lại tiến độ/kế hoạch */
  confirmSchedule: (prodId: number) =>
    http.post(`/api/Productions/confirm-schedule/${prodId}`, {}),
};
