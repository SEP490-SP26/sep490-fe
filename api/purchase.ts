import http from "@/lib/httpAxios";
import {
  CommonResType,
  CreateRequestBody,
} from "../schemaValidations/common.schema";

export const purchasesApi = {
  getList: (page: number = 1, pageSize: number = 10) =>
    http.get<CommonResType>(
      `/api/Purchases/orders?page=${page}&pageSize=${pageSize}`
    ),

  getDetail: (id: string) =>
    http.get<CommonResType>(`/api/Purchases/detail/${id}`),

  createPO: (body: any) =>
    http.post<CommonResType>("/api/Purchases/orders", body),

  receiveInventory: (purchaseId: number, body: any) =>
    http.put<CommonResType>(
      `/api/Purchases/orders/receive-all/?purchaseId=${purchaseId}`,
      body
    ),
};

export const supplierApi = {
  getList: (page: number = 1, pageSize: number = 10) =>
    http.get<CommonResType>(
      `/api/Suppliers/paged?page=${page}&pageSize=${pageSize}`
    ),

  getDetail: (id: string) =>
    http.get<CommonResType>(`/api/Suppliers/detail/${id}`),
};

