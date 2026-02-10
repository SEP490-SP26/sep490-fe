import http from "@/lib/httpAxios";
import { VerifiedRequestReponse } from "@/lib/request.types";
import { CommonResType, CreateRequestBody, CreateRequestBodyForConsultant, RejectDealRequest, RequestDetailResponse, UpdateRequestBody } from "../schemaValidations/common.schema";

interface CancelRequestBody {
  id: number;
  reason: string;
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
