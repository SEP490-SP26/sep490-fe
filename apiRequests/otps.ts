import http from "@/lib/httpAxios";
import { OtpResponse, SendOtpRequest, SendOtpSMSRequest, VerifyOtpRequest, VerifyOtpSMSRequest } from "@/schemaValidations/common.schema";

export const otpsApi = {
    sendOtp: (data: SendOtpRequest) =>
        http.post<OtpResponse>("/api/Otps/send-otp", data),

    verifyOtp: (data: VerifyOtpRequest) =>
        http.post<OtpResponse>("/api/Otps/verify-otp", data),

    sendOtpSMS: (data: SendOtpSMSRequest) =>
        http.post<OtpResponse>("/api/Otps/sms/send", data),

    verifyOtpSMS: (data: VerifyOtpSMSRequest) =>
        http.post<OtpResponse>("/api/Otps/sms/verify", data),
};
