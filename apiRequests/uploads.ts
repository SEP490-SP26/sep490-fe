import http from "@/lib/httpAxios";
import { UploadResponse } from "@/schemaValidations/common.schema";

export const uploadApi = {
    uploadFile: async (files: File[]): Promise<UploadResponse[]> => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        return http.post<UploadResponse[]>("/api/Uploads/upload", formData);
    },

    // POST /api/Uploads/update-design-file/{orderRequestId}
    // Upload/cập nhật file thiết kế cho order request
    updateDesignFile: async (orderRequestId: number, file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        return http.post<UploadResponse>(
            `/api/Uploads/update-design-file/${orderRequestId}`,
            formData
        );
    },

    uploadContract: async (orderRequestId: number, file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        return http.post<UploadResponse>(
            `/api/Uploads/upload-contract/${orderRequestId}`,
            formData
        );
    },

    deleteFile: async (request_id: number): Promise<void> => {
        return http.delete<void>(`/api/Uploads/delete-design-file/${request_id}`);
    },
};
