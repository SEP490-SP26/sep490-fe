import http from "@/lib/httpAxios";
import {
    CommonResType,
    CreateQRBody,
} from "../schemaValidations/common.schema";

export interface FinishTaskBody {
    token: string;
}

export interface ISubTask {
  task_id: number;
  prod_id: number;
  name: string;
  seq_num: number;
  status: 'Finished' | 'Unassigned' | string;
  machine: string;
  start_time: string | null; // ISO Date String hoặc null
  end_time: string | null;   // ISO Date String hoặc null
  planned_start_time: string;
  planned_end_time: string;
  process_id: number;
  reason: string | null;
  input_mode: 'ESTIMATE' | 'MANUAL' | string;
  process: any | null; // Hiện tại là null, có thể đổi thành interface cụ thể nếu backend cập nhật
  prod: any | null;    // Hiện tại là null, có thể đổi thành interface cụ thể nếu backend cập nhật
  is_taken_sub_product: boolean;
  task_logs: any[];    // Mảng chứa log, hiện tại đang rỗng []
}

export const tasksApi = {

    createQRByStageId: (body: CreateQRBody) => {
        const formData = new FormData();
        if (body.task_id !== undefined) formData.append("task_id", body.task_id.toString());
        if (body.ttl_minutes !== undefined) formData.append("ttl_minutes", body.ttl_minutes.toString());
        if (body.qty_good !== undefined) formData.append("qty_good", body.qty_good.toString());
        if (body.materials_json?.length) {
            formData.append("materials_json", JSON.stringify(body.materials_json));
        }
        if (body.reference_inputs_json?.length) {
            formData.append("reference_inputs_json", JSON.stringify(body.reference_inputs_json));
        }
        if (body.outputs_json?.length) {
            formData.append("outputs_json", JSON.stringify(body.outputs_json));
        }
        if (body.reason) formData.append("reason", body.reason);
        if (body.images && body.images.length > 0) {
            body.images.forEach((img) => formData.append("images", img));
        }
        formData.append("use_manual_input", body.use_manual_input ? "true" : "false");
        return http.post<CommonResType>(`/api/Tasks/qr`, formData);
    },

    decodeQr: async (body: { token: string }) => {
        const res = await http.post("api/Tasks/qr/decode", body);
        return res.data ?? res;
      },

    qrPrepare: (taskId: number) =>
        http.get<any>(`/api/Tasks/qr-prepare/${taskId}`),

    finishTask: (body: FinishTaskBody) =>
        http.post<CommonResType>(`/api/Tasks/finish`, body),

    cancelFinish: (taskId: number, body: { reason: string }) =>
        http.post<CommonResType>(`/api/Tasks/cancel-finish/${taskId}`, body),

    readyTask: (body: { task_id: number }) =>
        http.put<CommonResType>(`/api/Tasks/ready`, body),

    getAllTask: () => http.get<ISubTask[]>(`/api/Tasks/get-all-task`),
};