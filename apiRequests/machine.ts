import { Machine } from "@/lib/estimation.types";
import http from "@/lib/httpAxios";
import { FreeMachine, MachineCapacity } from "@/schemaValidations/common.schema";

export interface MachineLaneStatus {
  /** Mã định danh máy (VD: BE, IN, RALO) */
  machine_code: string;
  
  /** Mã công đoạn máy thực hiện */
  process_code: string;
  
  /** Tên hiển thị công đoạn */
  process_name: string;
  
  /** Tổng số lượng máy/dây chuyền hiện có */
  quantity: number;
  
  /** Số lượng máy hiện đang bận (đang chạy lệnh) */
  busy_now: number;
  
  /** Số lượng máy đang rảnh sẵn sàng nhận lệnh */
  free_now: number;
  
  /** Thời điểm dữ liệu được ghi nhận */
  generated_at: string; // ISO Date
  
  /** Thời điểm sớm nhất mà CÓ ÍT NHẤT một dây chuyền sẽ rảnh */
  earliest_any_lane_free_at: string;
  
  /** Thời điểm mà TẤT CẢ các dây chuyền của loại máy này đều rảnh */
  all_lanes_free_at: string;
  
  /** Danh sách thời điểm rảnh của từng dây chuyền (Lane) cụ thể */
  lane_free_times: string[];
}

export interface WorkshopCapacityResponse {
  /** Thời điểm tạo báo cáo trạng thái */
  generated_at: string;
  
  /** Thời điểm sớm nhất mà toàn bộ xưởng sẽ rảnh hoàn toàn */
  workshop_all_free_at: string;
  
  /** Thời điểm mà cả hai công đoạn Ralo và Cắt đều rảnh (phục vụ khâu chuẩn bị giấy) */
  ralo_cat_both_free_at: string;
  
  /** Chi tiết trạng thái từng loại máy */
  machines: MachineLaneStatus[];
}

export const machineApi = {
    getFreeMachines: () =>
        http.get<FreeMachine[]>("/api/Machine/free-machines"),

    getCapacity: () =>
        http.get<MachineCapacity>("/api/Machine/capacity"),

    getAllMachine: () =>
        http.get<Machine[]>("/api/Machine/get-all-machines"),

    getAvailabilitySnapshot: () =>
        http.get<WorkshopCapacityResponse>("/api/Machine/availability-snapshot"),
};
