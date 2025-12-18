import http from "@/lib/httpAxios";
import {
    CommonResType,
    EstimateCostRequest,
    EstimatePaperRequest
} from "@/schemaValidations/common.schema";

export const estimatesApi = {
    estimatePaper: (body: EstimatePaperRequest) =>
        http.post<CommonResType>("/api/Estimates/paper", body),

    estimateCost: (body: EstimateCostRequest) =>
        http.post<CommonResType>("/api/Estimates/cost", body),
};
