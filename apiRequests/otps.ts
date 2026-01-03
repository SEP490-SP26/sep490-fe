import http from "@/lib/httpAxios";
import { OtpResponse, SendOtpRequest, VerifyOtpRequest } from "@/schemaValidations/common.schema";

export const otpsApi = {
    sendOtp: (data: SendOtpRequest) =>
        http.post<OtpResponse>("/api/Otps/send-otp", data),

    verifyOtp: (data: VerifyOtpRequest) =>
        http.post<OtpResponse>("/api/Otps/verify-otp", data),
};
