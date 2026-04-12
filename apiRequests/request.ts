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
