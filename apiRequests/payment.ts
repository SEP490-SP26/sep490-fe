import http from "@/lib/httpAxios";

export interface PaymentResponse {
    quote_id: number;
    estimate_id: number;
    order_code: number;
    check_out_url: string; //dùng để chuyển sang trang thanh toán nếu qr gặp vấn đề
    expired_at: string; //thời gian hết hạn thanh toán
    status: string;
    qr_code: string; //mã thanh toán
    account_name: string;
    account_number: string;
    amount: number;
    bin: string; //tên ngân hàng
}

export interface PaymentStatusResponse {
    paid: boolean,
    status: string,
    order_request_id: number
}

export const paymentApi = {
    getPaymentQR: (request_id: string, quote_id: number, estimate_id: number) => http.get<PaymentResponse>(`/api/Requests/payos-deposit/${request_id}?estimateId=${estimate_id}&quoteId=${quote_id}`),

    getStatusPayment: (order_request_id: string) => http.get<PaymentResponse>(`/api/Requests/payos/status-by-request-id?order_request_id=${order_request_id}`)
}

