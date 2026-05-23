import { Material } from "@/lib/estimation.types";
import envConfig from "@/lib/config";
import http from "@/lib/httpAxios";
import axios from "axios";

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

    importStockFromExcel: (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return http.post<any>(
            "/api/MissingMaterials/import-stock-from-excel",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
    },

    exportMissingMaterialsExcel: async (
        page: number = 1,
        pageSize: number = 200
    ) => {
        const token =
            typeof window !== "undefined"
                ? localStorage.getItem("token")
                : null;

        const response = await axios.get(
            `${envConfig.NEXT_API_ENDPOINT}/api/MissingMaterials/export-excel`,
            {
                params: { page, pageSize },
                responseType: "blob",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
        );

        const disposition = response.headers["content-disposition"] as
            | string
            | undefined;
        const filenameMatch = disposition?.match(
            /filename\*=UTF-8''([^;]+)|filename=([^;]+)/i
        );
        const filename = filenameMatch
            ? decodeURIComponent(
                  (filenameMatch[1] || filenameMatch[2])
                      .trim()
                      .replace(/"/g, "")
              )
            : `missing-materials-${Date.now()}.xlsx`;

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    },
};
