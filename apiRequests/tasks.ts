import http from "@/lib/httpAxios";
import {
    CommonResType,
    CreateQRBody,
} from "../schemaValidations/common.schema";

export interface FinishTaskBody {
    token: string;
    scanner_id: string;
    operator_id: number;
    qty_good: number;
    qty_bad: number;
}

export const tasksApi = {

    createQRByStageId: (body: CreateQRBody) =>
        http.post<CommonResType>(`/api/Tasks/qr`, body),

    finishTask: (body: FinishTaskBody) =>
        http.post<CommonResType>(`/api/Tasks/finish`, body),

};