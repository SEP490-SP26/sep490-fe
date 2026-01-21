'use client'
import { otpsApi } from "@/apiRequests/otps";
import { requestOrderApi } from "@/apiRequests/request";
import { Input, Select, Space } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ConfirmRejectPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;
    const [reason, setReason] = useState("");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingOtp, setLoadingOtp] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    // const fetchDetail = async () => {
    //     try {
    //         setLoading(true);
    //         setError("");
    //         const response = await requestOrderApi.getDetail(orderId);
    //         console.log(response);
    //     } catch (err: any) {
    //         setError(err.response?.data?.message || "Lấy thông tin thất bại");
    //     } finally {
    //         setLoading(false);
    //     }
    // };


    const handleSendOtp = async () => {
        try {
            setLoadingOtp(true);
            setError("");
            await otpsApi.sendOtpSMS({ phone });
            setOtpSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || "Gửi OTP thất bại");
        } finally {
            setLoadingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        try {
            setLoadingOtp(true);
            setError("");
            await otpsApi.verifyOtpSMS({ phone, otp });
            setOtpSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || "Xác thực OTP thất bại");
        } finally {
            setLoadingOtp(false);
        }
    };

    const handleRejectDeal = async () => {
        try {
            setLoading(true);
            setError("");
            const bodyResquest = {
                orderRequestId: Number(orderId),
                token: "",
                reason,
                phone,
                otp
            }
            await requestOrderApi.rejectDeal(bodyResquest);
            router.push("/manager");
        } catch (err: any) {
            setError(err.response?.data?.message || "Từ chối thất bại");
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-xl space-y-8 rounded-xl bg-white p-8 shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">Xác nhận từ chối</h1>
                    <p className="mt-2 text-gray-600">
                        Bạn có chắc chắn muốn từ chối đơn hàng này?
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-700">
                            Mã đơn hàng: <span className="font-bold text-gray-900">{orderId}</span>
                        </p>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Số điện thoại <span className="text-red-500">*</span>
                        </label>
                        {/* check số điện thoại nhập có trùng với số điện thoại trong đơn hàng không */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1`}
                            />
                            <button
                                onClick={handleSendOtp}
                                className="whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/80 disabled:opacity-50"
                                disabled={loadingOtp}
                            >
                                Nhận mã OTP
                            </button>
                        </div>
                    </div>

                    {otpSent && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Mã OTP <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <Input.OTP length={6} onChange={(value) => setOtp(value)} />
                                <button className="rounded-lg bg-primary px-2 py-2 text-sm font-medium text-white hover:bg-primary/80" disabled={loadingOtp} onClick={handleVerifyOtp}>
                                    Gửi OTP
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Lý do từ chối <span className="text-red-500">*</span>
                        </label>
                        <Space direction="vertical" className="w-full">
                            <Select
                                value={reason}
                                disabled={!otpSent}
                                onChange={(e) => setReason(e)}
                                placeholder="Nhập lý do từ chối..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                            >
                                <Select.Option value="Ngày giao quá gấp">Ngày giao quá gấp</Select.Option>
                                <Select.Option value="Giá không hợp lý">Giá không hợp lý</Select.Option>
                                <Select.Option value="Thay đổi kích thước, số lượng">Thay đổi kích thước, số lượng</Select.Option>
                                <Select.Option value="Lý do khác">Lý do khác</Select.Option>

                            </Select>
                            {reason === "Lý do khác" && (
                                <Input.TextArea
                                    value={reason}
                                    defaultValue={" "}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Nhập lý do từ chối..."
                                    className="w-full rounded-lg border border-gray-300  px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                                />
                            )}
                        </Space>

                    </div>



                </div>

                <div className="flex gap-3">
                    <button
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => router.push("/")}
                    >
                        Hủy
                    </button>

                    <button
                        className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
                        disabled={!otpSent}
                        onClick={handleRejectDeal}
                    >
                        Xác nhận từ chối
                    </button>
                </div>
            </div>
        </div>
    );
}