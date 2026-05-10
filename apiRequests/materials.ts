import { Material } from "@/lib/estimation.types";
import http from "@/lib/httpAxios";

interface PaperType {
    stockQty: number;
    name: string;
    code: string;
}

export const materialsApi = {
    getAll: () =>
        http.get<Material[]>("/api/Materials/get-all-materials"),

    getById: (id: number) =>
        http.get<Material>(`/api/Materials/get-material-by-${id}`),

    getAllPaperTypes: () =>
        http.get<PaperType[]>("/api/Materials/get-all-paper-type"),

    getAllFormTypes: () =>
        http.get<string[]>("/api/Materials/get-all-form-type"),

    // GET /api/Materials/get-material-by-type-song - Lấy tất cả loại sóng (bồi)
    getSongTypes: () =>
        http.get<Material[]>("/api/Materials/get-material-by-type-song"),

    getListMissingMaterial: (page: number = 1, pageSize: number = 100) =>
        http.get<Material[]>(
            `/api/MissingMaterials/paged?page=${page}&pageSize=${pageSize}`
        ),

    importFromExcel: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return http.post<any>("/api/Materials/import-material-from-excel", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
    },
};
