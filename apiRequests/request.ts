import http from "@/lib/httpAxios";
import { VerifiedRequestReponse } from "@/lib/request.types";
import { CommonResType, CreateRequestBody, CreateRequestBodyForConsultant, RejectDealRequest, RequestDetailResponse, UpdateRequestBody } from "../schemaValidations/common.schema";

interface CancelRequestBody {
  id: number;
  reason: string;
}
export const requestOrderApi = {
  getList: (page: number = 1, pageSize: number = 5) =>
    http.get<CommonResType>(`/api/requests/paged?page=${page}&pageSize=${pageSize}`),

  getListByStatus: (page: number = 1, pageSize: number = 5, status: string) =>
    http.get<CommonResType>(`/api/requests/paged?page=${page}&pageSize=${pageSize}&status=${status}`),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/requests", body),

  getDetail: (id: string) => http.get<RequestDetailResponse>(`/api/requests/${id}`),

  updateRequest: (id: string, body: Partial<UpdateRequestBody>) =>
    http.put<CommonResType>(`/api/requests/${id}`, body),

  cancelRequest: (body: CancelRequestBody) =>
    http.put<CommonResType>(`/api/Requests/cancel-request`, body),

  // Gửi báo giá cho khách hàng
  sendDeal: (requestId: number) =>
    http.post<{ message: string; detail?: string; orderRequestId: number }>(
      '/api/Requests/send-deal',
      { requestId }
    ),

  rejectDeal: (body: RejectDealRequest) =>
    http.post<CommonResType>(
      '/api/Requests/reject', body
    ),

  getRequestDetailbyConsultant: (request_id: string) => http.get<VerifiedRequestReponse>(`/api/Requests/full-data-by-request_id/${request_id}`),

  createRequestOrderByConsultant: (body: CreateRequestBodyForConsultant) =>
    http.post<CommonResType>("/api/Requests/create-request-by-consultant", body),
};
