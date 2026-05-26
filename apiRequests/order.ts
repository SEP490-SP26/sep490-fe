import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody } from "../schemaValidations/common.schema";

export interface QuoteField {
  request_date: string;
  paper_name: string;
  coating_type: string;
  wave_type: string;
  design_type: string;
  production_process: string;
  material_cost: number;
  labor_cost: number;
  other_fees: number;
  rush_amount: number;
  sub_total: number;
  discount_percent: number;
  discount_amount: number;
  ink_type_names?: string[];
}

export interface OrderDetailResponse {
  // Định danh đơn hàng
  order_id: number;
  code: string; // VD: "ORD-00045"
  status: 'InProcessing' | 'Scheduled' | 'Completed' | 'Cancelled' | string;
  payment_status: 'Deposited' | 'Unpaid' | 'FullPayment' | string;

  // Thời gian
  order_date: string;          // Ngày tạo đơn (ISO Date)
  delivery_date: string;       // Ngày hẹn giao khách (ISO Date)
  production_start_date: string; // Ngày bắt đầu đưa vào sản xuất
  production_end_date: string | null; // Ngày dự kiến xong hoặc thực tế xong

  // Thông tin khách hàng
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;

  // Thông tin sản phẩm & Sản xuất
  product_name: string;
  quantity: number;
  production_id: number;       // ID lệnh sản xuất
  approver_name: string;       // Người duyệt lệnh (VD: Manager)
  specification: string | null; // Thông số kỹ thuật bổ sung
  note: string;

  // Tài chính (VNĐ)
  final_total_cost: number;
  deposit_amount: number;
  rush_amount: number;

  // Tài liệu đính kèm
  file_url: string;            // Link file thiết kế
  contract_file: string | null; // Link file hợp đồng (nếu có)

  quote_fields: QuoteField;
}

// Các chuỗi JSON lồng trong Task Log (Cần parse sau khi nhận từ API)
export interface IMaterialUsage {
  unit: string;
  is_stock: boolean;
  material_id: number;
  material_code: string;
  material_name: string;
  quantity_left: number;
  quantity_used: number;
  quantity_waste: number;
  estimated_input_qty: number;
}

export interface IReferenceInput {
  unit: string;
  input_code: string;
  input_name: string;
  quantity_left: number;
  quantity_used: number;
}

export interface IOutputJson {
  unit: string;
  output_code: string;
  output_name: string;
  quantity_bad: number;
  quantity_good: number;
}

// Lịch sử cập nhật của từng công đoạn
export interface ITaskLog {
  log_id: number;
  task_id: number;
  scanned_code: string;
  action_type: 'Finished' | string;
  qty_good: number;
  log_time: string; // ISO Date String
  scanned_by_user_id: number;
  material_usage_json: string; // Có thể parse thành IMaterialUsage[]
  reason: string | null;
  report_image_url: string | null;
  reference_input_json: string | null; // Có thể parse thành IReferenceInput[]
  output_json: string | null; // Có thể parse thành IOutputJson[]
}

// Chi tiết từng công đoạn trong lệnh sản xuất
export interface ITask {
  task_id: number;
  prod_id: number;
  name: string;
  seq_num: number;
  status: 'Finished' | 'Unassigned' | string;
  machine: string;
  start_time: string | null;
  end_time: string | null;
  process_id: number;
  planned_start_time: string;
  planned_end_time: string;
  reason: string | null;
  is_taken_sub_product: boolean;
  input_mode: 'MANUAL' | 'ESTIMATE' | string;
  process_code: string;
  process_name: string;
  task_logs: ITaskLog[];
}

// Lệnh sản xuất (Production) liên quan đến đơn hàng
export interface IProduction {
  prod_id: number;
  code: string;
  order_id: number | null;
  manager_id: number;
  end_date: string;
  status: 'Importing' | 'Scheduled' | string;
  product_type_id: number;
  note: string | null;
  created_at: string;
  planned_start_date: string;
  actual_start_date: string | null;
  is_full_process: boolean | null;
  sub_product_used_qty: number;
  import_recieve_path: string | null;
  sub_product_id: number | null;
  nvl_qty: number;
  prod_method: 'GROUP' | 'SPLIT' | 'NVL' | string;
  gm_note: string | null;
  mgr_note: string | null;
  prod_kind: 'GROUP' | 'SPLIT' | 'SINGLE' | string;
  group_process_codes: string | null;
  group_total_qty: number;
  gm_proposed_method: any | null;
  tasks: ITask[];
}

// Đối tượng Đơn hàng (Order Item)
export interface IOrder {
  request_id: number;
  order_id: number;
  code: string;
  quote_id: number;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  status: 'LayoutPending' | 'InProcessing' | string;
  payment_status: 'Deposited' | string;
  production_id: number | null;
  is_enough: boolean;
  is_buy: boolean;
  layout_confirmed: boolean;
  is_production_ready: boolean;
  confirmed_delivery_at: string | null;
  productions: IProduction[];
}

// Interface bọc ngoài cùng đại diện cho Response từ API phân trang
export interface IOrderPaginationResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: IOrder[];
}

// Interface đại diện cho thông tin một lệnh sản xuất (Production)
export interface IOrderProduction {
  prod_id: number;
  code: string;
  order_id: number | null;
  manager_id: number;
  end_date: string; // Định dạng ISO Date String
  status: 'Importing' | 'Paid' | 'Delivery' | 'Finished' | string;
  product_type_id: number;
  note: string | null;
  created_at: string;
  planned_start_date: string;
  actual_start_date: string | null;
  is_full_process: boolean | null;
  sub_product_used_qty: number;
  import_recieve_path: string | null; // URL dẫn tới file PDF hoặc null
  sub_product_id: number | null;
  nvl_qty: number;
  production_approval_flow: any | null; // Cập nhật interface cụ thể nếu có data
  prod_method: 'NVL' | string;
  gm_note: string | null;
  mgr_note: string | null;
  prod_kind: 'GROUP' | 'SPLIT' | 'SINGLE' | string;
  group_process_codes: string | null; // Ví dụ: "PHU,CAN" hoặc "BE,DUT,DAN"
  group_total_qty: number;
  gm_proposed_method: string | null;
}

// Interface đại diện cho chi tiết một Đơn hàng (Order)
export interface IOrderSummary {
  order_id: string; // Lưu ý: Trong JSON trường này đang trả về dạng chuỗi "115"
  code: string;     // Ví dụ: "ORD-00115"
  customer_name: string;
  product_name: string;
  product_id: string;
  quantity: number;
  created_at: string;
  delivery_date: string;
  status: 'Finished' | 'Delivery' | string;
  can_fulfill: boolean;
  missing_materials: any | null;
  layout_confirmed: boolean;
  is_production_ready: boolean;
  is_full_process: boolean | null;
  production_method: string;
  sub_product_id: number | null;
  sub_product_used_qty: number;
  nvl_qty: number;
  import_recieve_path: string | null;
  production_id: number;
  production_approval_flow: any | null;
  production_ids: number[]; // Mảng chứa ID các production liên quan
  productions: IOrderProduction[];
}

// Interface bao ngoài cùng cho cấu trúc phân trang trả về từ API
export interface IOrderDashboardResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: IOrderSummary[];
}

export const orderApi = {
  getList: (page: number = 1, pageSize: number = 1000) =>
    http.get<IOrderDashboardResponse>(`/api/Orders/paged?page=${page}&pageSize=${pageSize}`),

  getListByStatus: (page: number = 1, pageSize: number = 10, status: string) =>
    http.get<CommonResType>(`/api/Orders/paged?page=${page}&pageSize=${pageSize}&status=${status}`),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/Orders", body),

  getDetail: (id: string) => http.get<OrderDetailResponse>(`/api/Orders/detail/${id}`),

  updateOrder: (id: string, body: Partial<CreateRequestBody>) =>
    http.put<CommonResType>(`/api/Orders/${id}`, body),

  deleteOrder: (id: string) =>
    http.delete<CommonResType>(`/api/Orders/${id}`),

  getListAllWithProductionTracking: (page: number = 1, pageSize: number = 100) =>
    http.get<IOrderPaginationResponse>(`/api/Orders/all-with-production-tracking?page=${page}&pageSize=${pageSize}`),
};
