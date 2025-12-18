/* eslint-disable @typescript-eslint/no-explicit-any */
import http from "@/lib/httpAxios";
import { CommonResType } from "../schemaValidations/common.schema";

export const requestOrderApi = {
  getList: () => http.get<CommonResType>("/api/requests/paged"),
  createRequestOrderByCustomer: (body: any) =>
    http.post<CommonResType>("/api/requests", body),
  getDetail: (id: string) => http.get<CommonResType>(`/api/Order/${id}`),
};
