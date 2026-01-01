import http from "@/lib/httpAxios";
import {
    AdjustFinalCostRequest,
    DepositResponse,
    EstimateCostRequest,
    EstimateCostResponse,
    EstimatePaperRequest,
    EstimatePaperResponse,
    ProcessCostBreakdownResponse
} from "@/schemaValidations/common.schema";

export const estimatesApi = {
    // POST /api/Estimates/paper - Calculate paper parameters
    estimatePaper: (body: EstimatePaperRequest) =>
        http.post<EstimatePaperResponse>("/api/Estimates/paper", body),

    // POST /api/Estimates/cost - Calculate cost estimate
    estimateCost: (body: EstimateCostRequest) =>
        http.post<EstimateCostResponse>("/api/Estimates/cost", body),

    // POST /api/Estimates/process-cost-breakdown - Get process cost breakdown
    processCostBreakdown: (body: EstimateCostRequest) =>
        http.post<ProcessCostBreakdownResponse>("/api/Estimates/process-cost-breakdown", body),

    // PUT /api/Estimates/adjust-final-total-cost/{id} - Adjust final cost (old)
    adjustFinalCost: (id: number, body: AdjustFinalCostRequest) =>
        http.put<void>(`/api/Estimates/adjust-final-total-cost/${id}`, body),

    // PUT /api/Estimates/adjust-cost/{estimateId} - Điều chỉnh giá chốt với khách hàng
    adjustCost: (estimateId: number, finalCost: number) =>
        http.put<void>(`/api/Estimates/adjust-cost/${estimateId}`, { final_cost: finalCost }),

    // GET /api/Estimates/deposit/by-request/{requestId} - Lấy tiền đặt cọc theo đơn hàng
    getDeposit: (requestId: number) =>
        http.get<DepositResponse>(`/api/Estimates/deposit/by-request/${requestId}`),
};
