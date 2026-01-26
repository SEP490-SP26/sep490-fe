import http from "@/lib/httpAxios";

export interface PaymentResponse {
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

export const paymentApi = {
    getPaymentQR: (request_id: string) => http.get<PaymentResponse>(`/api/Requests/payos-deposit/${request_id}`)
}