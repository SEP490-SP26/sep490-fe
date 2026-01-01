import http from "@/lib/httpAxios";
import { Material } from "@/schemaValidations/common.schema";

export const materialsApi = {
    getAll: () =>
        http.get<Material[]>("/api/Materials/get-all-materials"),

    getById: (id: number) =>
        http.get<Material>(`/api/Materials/get-material-by-${id}`),

    getAllPaperTypes: () =>
        http.get<string[]>("/api/Materials/get-all-paper-type"),

    getAllFormTypes: () =>
        http.get<string[]>("/api/Materials/get-all-form-type"),

    // GET /api/Materials/get-material-by-type-song - Lấy tất cả loại sóng (bồi)
    getSongTypes: () =>
        http.get<Material[]>("/api/Materials/get-material-by-type-song"),

      getListMissingMaterial: (page: number = 1, pageSize: number = 10) =>
    http.get<Material>(
      `/api/Orders/missing-materials?page=${page}&pageSize=${pageSize}`
    ),

};

export const config = {
  runtime: 'edge',
}
