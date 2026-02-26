import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody, CreateRequestBodyForConsultant, RejectDealRequest, RequestDetailResponse, UpdateRequestBody } from "../schemaValidations/common.schema";

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

export interface VerifiedRequestReponse {
  request_id: number;
  customer_name: string;
  customer_phone: string;
  email: string;
  request_date: string; // ISO Date
  delevery_date: string; // ISO Date (Lưu ý typo 'delevery')
  
  // Thông tin sản phẩm
  product_name: string;
  product_type: string; // VD: "HOP_MAU"
  quantity: number;
  process_status: 'Declined' | 'Waiting' | 'Verified' | string;
  reason: string | null; // Lý do từ chối (nếu có)
  
  // File thiết kế (Dạng chuỗi ngăn cách bằng dấu phẩy)
  design_file_path: string; 
  detail_address: string;
  description: string;

  // Thông số kỹ thuật chung
  number_of_plates: number;
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  
  // Các trường technical có thể null khi chưa duyệt
  production_processes: string | null;
  coating_type: string | null;
  paper_code: string | null;
  paper_name: string | null;
  wave_type: string | null;
  glue_tab_mm: number | null;
  bleed_mm: number | null;
  is_one_side_box: boolean | null;
  print_width_mm: number | null;
  print_height_mm: number | null;

  // Danh sách các bản dự toán đã thực hiện
  cost_estimate: DetailedEstimate[];
}

export const requestOrderApi = {
  getList: (page: number = 1, pageSize: number = 5) =>
    http.get<CommonResType>(`/api/Requests/paged?page=${page}&pageSize=${pageSize}`),

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

  getRequestDetailbyConsultant: (request_id: string) => http.get<VerifiedRequestReponse>(`/api/Requests/full-data-by-request_id/${request_id}`),

  createRequestOrderByConsultant: (body: CreateRequestBodyForConsultant) =>
    http.post<CommonResType>("/api/Requests/create-request-by-consultant", body),

  submitEstimateForApproval: (body: { request_id: number }) =>
    http.put<CommonResType>('/api/Requests/submit-estimate-for-approval', body),

  approval: (body: { request_id: number, note: string, status: string }) =>
    http.put<CommonResType>('/api/Requests/approval', body),
};
