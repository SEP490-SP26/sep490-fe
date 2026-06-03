import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody, CreateRequestBodyForConsultant, RejectDealRequest, UpdateRequestBody } from "../schemaValidations/common.schema";
import { RequestDetailResponse } from "@/lib/request.types";

interface CancelRequestBody {
  id: number;
  reason: string;
}

export interface ProcessCost {
  process_cost_id: number;
  process_code: string; // VD: "IN", "PHU", "CAN", "BE"...
  cost: number;
}

export interface DetailedEstimate {
  estimate_id: number;
  paper_code: string;
  paper_name: string;
  coating_type: string;
  wave_type: string | null;
  final_total_cost: number;
  deposit_amount: number;
  is_active: boolean; // Trạng thái của bản dự toán này
  process_cost: ProcessCost[];
}

export interface OrderRequestDetailItem {
  // --- Định danh và Quản lý ---
  order_request_id: number;
  order_id: number | null;
  quote_id: number | null;
  estimate_id: number;
  accepted_estimate_id: number | null;
  previous_estimate_id: number | null;
  assigned_consultant: number | null;
  assign_name: string | null;
  actual_consultant_user_id: number | null;

  // --- Thông tin Khách hàng ---
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  detail_address: string;

  // --- Thông tin Sản phẩm & Trạng thái ---
  product_name: string;
  product_type: 'HOP_MAU' | string;
  quantity: number;
  process_status: 'Completed' | 'Accepted' | 'Waiting' | string;
  order_request_date: string; // ISO Date
  verified_at: string | null;
  assigned_at: string | null;
  description: string;
  note: string;
  consultant_note: string | null;
  message_to_customer: string | null;
  

  // --- Quy cách Kỹ thuật & Bình bản ---
  number_of_plates: number;
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  print_width_mm: number;
  print_length_mm: number;
  glue_tab_mm: number;
  bleed_mm: number;
  n_up: number;
  is_one_side_box: boolean;
  is_send_design: boolean;
  production_processes: string; // VD: "RALO,CAT,IN,PHU,CAN,BE,DUT,DAN"

  // --- Thông số Vật tư ---
  paper_code: string;
  paper_name: string;
  paper_unit_price: number;
  paper_alternative: string | null;
  coating_type: string;
  wave_type: string;
  wave_alternative: string | null;

  // --- Chi tiết Chi phí Dự toán (VNĐ) ---
  paper_cost: number;
  ink_cost: number;
  coating_glue_cost: number;
  mounting_glue_cost: number;
  lamination_cost: number;
  material_cost: number;
  design_cost: number;
  base_cost: number;
  subtotal: number;
  final_total_cost: number;
  deposit_amount: number;
  discount_percent: number;
  discount_amount: number;
  rush_amount: number;
  rush_percent: number;
  preliminary_estimated_price: number | null;

  // --- Định mức tiêu hao & Bù hao ---
  paper_sheets_used: number;
  sheets_required: number;
  sheets_waste: number;
  sheets_total: number;
  total_area_m2: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;
  wave_sheets_used: number;

  // --- Thời gian & Hạn định ---
  delivery_date: string;
  delivery_date_change_reason: string | null;
  desired_delivery_date: string;
  estimate_finish_date: string;
  estimated_finish_date: string;
  estimate_created_at: string;
  quote_expire_at: string;
  days_early: number;

  // --- File đính kèm & Hợp đồng ---
  design_file_path: string;
  print_ready_file: string | null;
  consultant_contract_path: string | null;
  customer_signed_contract_path: string | null;
  is_check_contract: boolean | null;
  contract_check_note: string | null;
  delivery_note: string | null;
  is_active: boolean;
  deposit_receipt_path: string | null;
  remaining_receipt_path: string | null;
}

export interface OrderRequestPaginationResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: OrderRequestDetailItem[];
}

export interface OrderRequestEstimate {
  estimate_id: number | null;
  estimate_order_request_id: number | null;
  paper_cost: number | null;
  paper_sheets_used: number | null;
  paper_unit_price: number | null;
  ink_cost: number | null;
  ink_weight_kg: number | null;
  ink_rate_per_m2: number | null;
  coating_glue_cost: number | null;
  coating_glue_weight_kg: number | null;
  coating_glue_rate_per_m2: number | null;
  coating_type: string | null;
  mounting_glue_cost: number | null;
  mounting_glue_weight_kg: number | null;
  mounting_glue_rate_per_m2: number | null;
  lamination_cost: number | null;
  lamination_weight_kg: number | null;
  lamination_rate_per_m2: number | null;
  material_cost: number | null;
  base_cost: number | null;
  is_rush: boolean | null;
  rush_percent: number | null;
  rush_amount: number | null;
  days_early: number | null;
  subtotal: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  final_total_cost: number | null;
  estimated_finish_date: string | null;
  desired_delivery_date: string | null;
  estimate_created_at: string | null;
  sheets_required: number | null;
  sheets_waste: number | null;
  sheets_total: number | null;
  n_up: number | null;
  total_area_m2: number | null;
  design_cost: number | null;
  cost_note: string | null;
  is_active: boolean | null;
  paper_code: string | null;
  paper_name: string | null;
  wave_type: string | null;
  paper_alternative: string | null;
  wave_alternative: string | null;
  wave_sheets_used: number | null;
  production_processes: string | null;
  deposit_amount: number | null;
  previous_estimate_id: number | null;
  consultant_contract_path: string | null;
  customer_signed_contract_path: string | null;
  waste_gluing_boxes: number | null;
  sheet_area_m2: number | null;
  print_sheets_used: number | null;
  total_coating_area_m2: number | null;
  total_lamination_area_m2: number | null;
  coating_sheets_used: number | null;
  lamination_sheets_used: number | null;
  wave_sheet_area_m2: number | null;
  wave_n_up: number | null;
  wave_sheets_required: number | null;
  total_mounting_area_m2: number | null;
  wave_unit_price: number | null;
  wave_cost: number | null;
  total_process_cost: number | null;
  ink_type_names: string | null;
  alternative_material_reason: string | null;
  lamination_material_id: number | null;
  lamination_material_code: string | null;
  lamination_material_name: string | null;
}

export interface OrderRequest extends OrderRequestEstimate {
  request_id: number;
  customer_name: string;
  phone: string;
  email: string | null;
  delivery_date: string;
  product_name: string;
  quantity: number;
  description: string;
  design_file_path: string;
  print_ready_file: string | null;
  request_date: string;
  detail_address: string | null;
  status: 'Pending' | 'Verified' | 'Accepted' | 'Paid' | 'Processing' | string;
  product_type: string | null;
  number_of_plates: number;
  order_id: number | null;
  quote_id: number | null;
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  glue_tab_mm: number | null;
  bleed_mm: number | null;
  is_one_side_box: boolean | null;
  print_width_mm: number | null;
  print_length_mm: number | null;
  is_send_design: boolean;
  note: string | null;
  reason: string | null;
  accepted_estimate_id: number | null;
  consultant_note: string | null;
  verified_at: string | null;
  quote_expires_at: string | null;
  message_to_customer: string | null;
  preliminary_estimated_price: number | null;
  assigned_consultant: number | null;
  assigned_at: string | null;
  delivery_note: string | null;
  actual_consultant_user_id: number | null;
  delivery_date_change_reason: string | null;
  estimate_finish_date: string | null;
  assign_name: string | null;
}

export interface Order {
  order_id: number;
  code: string;
  quote_id: number;
  order_date: string;
  delivery_date: string;
  total_amount: number;
  status: 'Scheduled' | 'Paid' | 'Delivery' | 'Completed' | 'Finished' | string;
  is_enough: boolean;
  is_buy: boolean;
  payment_status: 'Deposited' | 'Paid' | string;
  production_id: number | null;
  layout_confirmed: boolean;
  is_production_ready: boolean;
  confirmed_delivery_at: string | null;
  import_recieve_path: string | null;
}

export interface PaginatedResponse<T> {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: T[];
}

export interface OrderManagementData {
  requests: PaginatedResponse<OrderRequest>;
  orders: PaginatedResponse<Order>;
}


export const requestOrderApi = {
  getList: (page: number = 1, pageSize: number = 5) =>
    http.get<OrderRequestPaginationResponse>(`/api/Requests/paged?page=${page}&pageSize=${pageSize}`),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/Requests", body),

  getDetail: (id: string) => http.get<RequestDetailResponse>(`/api/Requests/${id}`),

  updateRequest: (id: string, body: Partial<UpdateRequestBody>) =>
    http.put<CommonResType>(`/api/Requests/${id}`, body),

  cancelRequest: (body: CancelRequestBody) =>
    http.put<CommonResType>(`/api/Requests/cancel-request`, body),

  // Gửi báo giá cho khách hàng
  sendDeal: (body: { request_id: number }) =>
    http.post<{ message: string; detail?: string; orderRequestId: number }>(
      '/api/Requests/send-deal',
      body
    ),

  rejectDeal: (body: RejectDealRequest) =>
    http.post<CommonResType>(
      '/api/Requests/reject', body
    ),

  getRequestDetailbyConsultant: (request_id: string) => http.get<RequestDetailResponse>(`/api/Requests/full-data-by-request_id/${request_id}`),

  createRequestOrderByConsultant: (body: CreateRequestBodyForConsultant) =>
    http.post<CommonResType>("/api/Requests/create-request-by-consultant", body),

  submitEstimateForApproval: (body: { request_id: number, consultant_note?: string }) =>
    http.put<CommonResType>('/api/Requests/submit-estimate-for-approval', body),

  approval: (body: { request_id: number, note: string, status: string }) =>
    http.put<CommonResType>('/api/Requests/approval', body),

  cloneRequest: (body: { request_id: number }) =>
    http.post<CommonResType>('/api/Requests/clone-request', body),

  consultantMessageToCustomer: (body: { request_id: number, message: string }) =>
    http.put<CommonResType>('/api/Requests/consultant-message-to-customer', body),

  designerConfirmLayout: (body: { request_id: number }) =>
    http.put<CommonResType>('/api/Requests/designer-confirm-layout', body),

  uploadPrintReadyFile: (requestId: number, body: { estimate_id: number, file: File }) => {
    const formData = new FormData();
    formData.append("estimate_id", body.estimate_id.toString());
    formData.append("file", body.file);
    return http.post<CommonResType>(`/api/Requests/upload-print-ready-file/${requestId}`, formData);
  },

  confirmImporting: (order_id: number) =>
    http.put<CommonResType>('/api/Requests/confirm-importing', order_id),

  contractCheckStatus: (body: { request_id: number, is_check_contract: boolean, note?: string }) =>
    http.put<CommonResType>(`/api/Requests/contract-check-status`, body),

  emailRequestResignContract: (body: { request_id: number, custom_message: string }) =>
    http.post<CommonResType>(`/api/Requests/email-request-resign-contract`, body),

  customerReceive: (request_id: number) =>
    http.put<CommonResType>(`/api/Requests/customer-receive?request_id=${request_id}`, {}),

  getRequestbyConsultant: (page: number, pageSize: number) => http.get<OrderManagementData>(`/api/Requests/get-requests-and-order-by-login?page=${page}&pageSize=${pageSize}`),

  getRequestByOrderId: (orderId: number) => http.get<RequestDetailResponse>(`/api/Requests/get-by-order-id/${orderId}`),
};
