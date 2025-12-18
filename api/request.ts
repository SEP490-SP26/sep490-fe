import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody } from "../schemaValidations/common.schema";

export const requestOrderApi = {
  getList: (page: number = 1, pageSize: number = 5) =>
    http.get<CommonResType>(`/api/requests/paged?page=${page}&pageSize=${pageSize}`),

  getListByStatus: (page: number = 1, pageSize: number = 5, status: string) =>
    http.get<CommonResType>(`/api/requests/paged?page=${page}&pageSize=${pageSize}&status=${status}`),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/requests", body),

  getDetail: (id: string) => http.get<CommonResType>(`/api/requests/${id}`),

  updateRequest: (id: string, body: Partial<CreateRequestBody>) =>
    http.put<CommonResType>(`/api/requests/${id}`, body),

  deleteRequest: (id: string) =>
    http.delete<CommonResType>(`/api/requests/${id}`),
};
