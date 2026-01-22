import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody, OrderDetailResponse } from "../schemaValidations/common.schema";

export const orderApi = {
  getList: (page: number = 1, pageSize: number = 10) =>
    http.get<CommonResType>(`/api/Orders/paged?page=${page}&pageSize=${pageSize}`),

  getListByStatus: (page: number = 1, pageSize: number = 10, status: string) =>
    http.get<CommonResType>(`/api/Orders/paged?page=${page}&pageSize=${pageSize}&status=${status}`),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/Orders", body),

  getDetail: (id: string) => http.get<CommonResType>(`/api/Orders/detail/${id}`),

  // GET /api/Orders/{id} - Lấy chi tiết đơn hàng theo order_id
  getOrderById: (id: number) => http.get<OrderDetailResponse>(`/api/Orders/${id}`),

  updateOrder: (id: string, body: Partial<CreateRequestBody>) =>
    http.put<CommonResType>(`/api/Orders/${id}`, body),

  deleteOrder: (id: string) =>
    http.delete<CommonResType>(`/api/Orders/${id}`),
};
