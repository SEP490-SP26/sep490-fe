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

    uploadContract: async (data: { requestId: number, estimate_id: number, file: File }) => {
        const formData = new FormData();
        formData.append("request_id", data.requestId.toString());
        formData.append("estimate_id", data.estimate_id.toString());
        formData.append("file", data.file);

        return http.post<void>(`/api/Estimates/upload-contract`, formData);
    },

    deleteFile: async (request_id: number): Promise<void> => {
        return http.delete<void>(`/api/Uploads/delete-design-file/${request_id}`);
    },
};
