import http from "@/lib/httpAxios";
import {
    CommonResType,
    CreateQRBody,
} from "../schemaValidations/common.schema";

export interface FinishTaskBody {
    token: string;
}

export const tasksApi = {

    createQRByStageId: (body: CreateQRBody) => {
        const formData = new FormData();
        if (body.task_id !== undefined) formData.append("task_id", body.task_id.toString());
        if (body.ttl_minutes !== undefined) formData.append("ttl_minutes", body.ttl_minutes.toString());
        if (body.qty_good !== undefined) formData.append("qty_good", body.qty_good.toString());
        if (body.materials) formData.append("materials_json", JSON.stringify(body.materials));
        formData.append("use_manual_input", "true");
        return http.post<CommonResType>(`/api/Tasks/qr`, formData);
    },

    qrPrepare: (taskId: number) =>
        http.get<any>(`/api/Tasks/qr-prepare/${taskId}`),

    finishTask: (body: FinishTaskBody) =>
        http.post<CommonResType>(`/api/Tasks/finish`, body),

    cancelFinish: (taskId: number, body: { reason: string }) =>
        http.post<CommonResType>(`/api/Tasks/cancel-finish/${taskId}`, body),

    readyTask: (body: { task_id: number }) =>
        http.put<CommonResType>(`/api/Tasks/ready`, body),
};