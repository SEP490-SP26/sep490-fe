import http from "@/lib/httpAxios";
import { OrderHistoryResponse } from "@/schemaValidations/common.schema";

export const lookupsApi = {
    // POST /api/Lookups/send-otp - Gửi OTP qua email
    sendOtp: (phone: string) =>
        http.post<{ message: string }>('/api/Lookups/send-otp', { phone }),

    // POST /api/Lookups/order-history - Lấy lịch sử đơn hàng sau khi xác thực OTP
    getOrderHistory: (phone: string, otp: string, page: number = 1, pageSize: number = 15) =>
        http.post<OrderHistoryResponse>('/api/Lookups/order-history', {
            phone,
            otp,
            page,
            pageSize,
        }),

    getRequestHistory: (phone: string, otp: string, page: number = 1, pageSize: number = 15) =>
        http.post<OrderHistoryResponse>('/api/Lookups/request-history', {
            phone,
            otp,
            page,
            pageSize,
        }),
};
