import http from "@/lib/httpAxios";
import { HistoryDataResponse } from "@/lib/request.types";
import { OrderHistoryResponse } from "@/schemaValidations/common.schema";

export const lookupsApi = {
    // POST /api/Lookups/send-otp - Gửi OTP qua email
    sendOtp: (phone: string) =>
        http.post<{ message: string }>('/api/Lookups/send-otp', { phone }),

    // POST /api/Lookups/order-history - Lấy lịch sử đơn hàng sau khi xác thực OTP
    getHistory: (phone: string, otp: string, page: number = 1, pageSize: number = 15) =>
        http.post<HistoryDataResponse>('/api/Lookups/history', {
            phone,
            otp,
            page,
            pageSize,
        }),
};
