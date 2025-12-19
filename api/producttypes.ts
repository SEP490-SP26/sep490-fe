import http from "@/lib/httpAxios";
import { ProductType } from "@/schemaValidations/common.schema";

export const productTypesApi = {
    getAll: () =>
        http.get<ProductType[]>("/api/ProductTypes"),

    getById: (id: number) =>
        http.get<ProductType>(`/api/ProductTypes/${id}`),
};
