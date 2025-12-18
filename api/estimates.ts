import http from "@/lib/httpAxios";
import {
    AdjustFinalCostRequest,
    EstimateCostRequest,
    EstimateCostResponse,
    EstimatePaperRequest,
    EstimatePaperResponse
} from "@/schemaValidations/common.schema";

export const estimatesApi = {
    // POST /api/Estimates/paper - Calculate paper parameters
    estimatePaper: (body: EstimatePaperRequest) =>
        http.post<EstimatePaperResponse>("/api/Estimates/paper", body),

    // POST /api/Estimates/cost - Calculate cost estimate
    estimateCost: (body: EstimateCostRequest) =>
        http.post<EstimateCostResponse>("/api/Estimates/cost", body),

    // PUT /api/Estimates/adjust-final-total-cost/{id} - Adjust final cost
    adjustFinalCost: (id: number, body: AdjustFinalCostRequest) =>
        http.put<void>(`/api/Estimates/adjust-final-total-cost/${id}`, body),
};
