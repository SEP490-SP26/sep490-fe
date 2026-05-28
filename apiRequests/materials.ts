import { Material } from "@/lib/estimation.types";
import envConfig from "@/lib/config";
import http from "@/lib/httpAxios";
import axios from "axios";

interface PaperType {
    stockQty: number;
    name: string;
    code: string;
}

// Interface đại diện cho thông tin chi tiết của từng nguyên vật liệu thiếu hụt/cần mua
export interface IMaterialMissingItem {
  miss_id: number;
  material_id: number;
  material_name: string; // Ví dụ: "Giấy C200", "Giấy C350"
  needed: number;        // Số lượng hệ thống/sản xuất cần
  available: number;     // Số lượng hiện có trong kho
  quantity: number;      // Số lượng quyết định mua
  unit: 'Tờ' | string;   // Đơn vị tính
  request_date: string;  // Định dạng ISO Date String (Z)
  total_price: number;   // Tổng chi phí mua sắm
  is_buy: boolean;
  file_purpose: string;  // URL link đến file đề xuất PDF trên Cloudinary
  is_active: boolean;
}

// Interface bọc ngoài cùng đại diện cho Response phân trang từ API
export interface IMaterialMissingPaginationResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: IMaterialMissingItem[];
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
        http.get<IMaterialMissingPaginationResponse>(
            `/api/MissingMaterials/paged?page=${page}&pageSize=${pageSize}`
        ),

    generatePurchasePDF: (miss_ids: number[]) =>
        http.post<any>("/api/MissingMaterials/generate-purchase-pdf", {
            miss_ids
        }),

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
