import http from "@/lib/httpAxios";

interface PaymentResponse {
    order_code: string;
    checkout_url: string;
    expired_at: string;
}

export const paymentApi = {
    getPaymentQR: (request_id: string) => http.get<PaymentResponse>(`/api/Requests/payos-deposit/${request_id}`)
}