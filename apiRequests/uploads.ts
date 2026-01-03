import http from "@/lib/httpAxios";
import { UploadResponse } from "@/schemaValidations/common.schema";

export const uploadApi = {
    uploadFile: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append("file", file);

        return http.post<UploadResponse>("/api/Uploads/upload", formData);
    },

    uploadMultiple: async (files: File[]): Promise<UploadResponse[]> => {
        const uploadPromises = files.map((file) => uploadApi.uploadFile(file));
        return Promise.all(uploadPromises);
    },
};
