import http from "@/lib/httpAxios";
import {
  CommonResType,
  CreateRequestBody,
} from "../schemaValidations/common.schema";

export const supplierApi = {
  getList: (page: number = 1, pageSize: number = 10) =>
    http.get<CommonResType>(
      `/api/Suppliers/paged?page=${page}&pageSize=${pageSize}`
    ),

  getDetail: (id: string) =>
    http.get<CommonResType>(`/api/Suppliers/detail/${id}`),

  getByMaterialId: (materialId: string) =>
    http.get<CommonResType>(`/api/Suppliers/suppliers-by-material-id?id=${materialId}`),
};
