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
}

export interface OrderRequestPaginationResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: OrderRequestDetailItem[];
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
};
