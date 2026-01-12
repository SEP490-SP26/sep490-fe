import http from "@/lib/httpAxios";
import { CommonResType, ProductType } from "@/schemaValidations/common.schema";

export const productTypesApi = {
  getAll: () =>
    http.get<ProductType[]>("/api/ProductTypes/Get-All-Product-Types"),

  getById: (id: number) => http.get<ProductType>(`/api/ProductTypes/${id}`),

  // Lấy danh sách loại sản phẩm chung: KHAY, THE_MAU, KHAC, VO_HOP_GACH, HOP_MAU
  getAllTypeGeneral: () =>
    http.get<string[]>("/api/ProductTypes/get-all-type-general"),

  // Lấy danh sách form type của Hộp màu
  getAllFormTypeOfHopMau: () =>
    http.get<string[]>("/api/ProductTypes/get-all-form-type-of-hop-mau"),

  // Lấy danh sách loại gạch
  getAllTypeOfGach: () =>
    http.get<string[]>("/api/ProductTypes/get-all-type-of-gach"),

  getProductTemplete: (id: number) =>
    http.get<CommonResType>(`/api/ProductTemplates/by-product-type/${id}`),
};
