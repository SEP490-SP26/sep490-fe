import http from "@/lib/httpAxios";

export const paymentApi = {
    getPaymentQR: (request_id: string) => http.get(`/api/Requests/payos-deposit/${request_id}`)
}