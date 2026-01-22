import { ProcessCostRules, ProcessCosts } from "@/lib/estimation.types";
import http from "@/lib/httpAxios";

export const processCostRulesApi = {
    getAll: () => http.get<ProcessCosts[]>("/api/ProcessCostRules/get-all-process-cost-rules"),
}
