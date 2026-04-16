import http from "@/lib/httpAxios";
import axios from "axios";
import envConfig from "@/lib/config";

export interface PaymentResponse {
    quote_id: number;
    estimate_id: number;
    order_code: number;
    description: string;
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
    getPaymentQR: (request_id: string, quote_id: number, estimate_id: number) => http.get<PaymentResponse>(`/api/Requests/payos-deposit/${request_id}?quote_id=${quote_id}&estimate_id=${estimate_id}`),

    getStatusPayment: (request_id: string, quote_id: number, estimate_id: number) => http.get<PaymentResponse>(`/api/Requests/payos/status-by-request-id?request_id=${request_id}&estimate_id=${estimate_id}&quote_id=${quote_id}`),

    getPaymentReceipt: (orderCode: string) => 
        axios.get(`${envConfig.NEXT_API_ENDPOINT}/api/Payments/payment-receipt-docx/${orderCode}`, {
            responseType: 'blob',
            // headers: {
            //     Authorization: `Bearer ${localStorage.getItem("token")}`
            // }
        })
}

