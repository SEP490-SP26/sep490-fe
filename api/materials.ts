import http from "@/lib/httpAxios";
import { Material } from "@/schemaValidations/common.schema";

export const materialsApi = {
    getAll: () =>
        http.get<Material[]>("/api/Materials/get-all"),

    getById: (id: number) =>
        http.get<Material>(`/api/Materials/${id}`),
};
