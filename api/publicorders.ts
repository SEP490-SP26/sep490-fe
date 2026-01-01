import http from "@/lib/httpAxios";
import { OrderHistoryResponse } from "@/schemaValidations/common.schema";

export const publicOrdersApi = {
    // POST /api/PublicOrders/send-otp - Gửi OTP qua email
    sendOtp: (phone: string) =>
        http.post<{ message: string }>('/api/PublicOrders/send-otp', { phone }),

    // POST /api/PublicOrders/history - Lấy lịch sử đơn hàng sau khi xác thực OTP
    getHistory: (phone: string, otp: string, page: number = 1, pageSize: number = 15) =>
        http.post<OrderHistoryResponse>('/api/PublicOrders/history', {
            phone,
            otp,
            page,
            pageSize,
        }),
};

export const config = {
  runtime: 'edge',
}