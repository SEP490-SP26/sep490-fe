import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody } from "../schemaValidations/common.schema";

export const requestOrderApi = {
  getList: () => http.get<CommonResType>("/api/requests/paged"),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/requests", body),

  getDetail: (id: string) => http.get<CommonResType>(`/api/requests/${id}`),

  updateRequest: (id: string, body: Partial<CreateRequestBody>) =>
    http.put<CommonResType>(`/api/requests/${id}`, body),

  deleteRequest: (id: string) =>
    http.delete<CommonResType>(`/api/requests/${id}`),
};
