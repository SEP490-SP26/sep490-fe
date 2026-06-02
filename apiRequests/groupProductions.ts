import http from "@/lib/httpAxios";

interface GroupProductions {
    "order_ids": number[],
    "process_codes": string[],
    "planned_start_date": string,
    "note": string
}

export interface GroupableOrder {
    /** ID đơn hàng hệ thống */
    order_id: number;

    /** Mã đơn hàng (VD: "ORD-00044") */
    order_code: string;

    /** ID sản phẩm đơn lẻ trong lệnh sản xuất */
    single_prod_id: number;

    /** ID loại sản phẩm (1: Hộp màu, ...) */
    product_type_id: number;

    /** Tên loại sản phẩm */
    product_type_name: string;

    /** Tên sản phẩm cụ thể khách đặt */
    product_name: string;

    /** Số lượng đặt hàng */
    quantity: number;

    /** Chuỗi quy trình sản xuất (VD: "RALO,CAT,IN,PHU...") */
    production_process: string;

    /** Khóa phân loại quy trình (Dùng để so sánh các đơn hàng có cùng bước gia công) */
    process_key: string;

    /** Ngày hẹn giao hàng (ISO Date) */
    delivery_date: string;

    /** Trạng thái có thể gom nhóm hay không */
    can_group: boolean;

    /** Lý do không thể gom nhóm (nếu có) */
    reason: string | null;
}

/** Kiểu dữ liệu mảng các đơn hàng có thể gom nhóm */
export type GroupableOrderList = GroupableOrder[];

// Interface đại diện cho cấu trúc của từng công đoạn (Stage) xuất hiện trong preview
export interface IStage {
  dept_code: string;
  dept_name: string;
  stage_type: 'SINGLE_PRIVATE' | 'GROUP' | 'SPLIT' | string; // Định nghĩa sẵn các type hoặc string chung
  process_codes: string[];
  order_ids: number[];
  group_prod_id: number | null;
  split_prod_id: number | null;
  planned_start_date: string; // Định dạng ISO Date String
  planned_end_date: string;   // Định dạng ISO Date String
  duration_days: number;
  note: string;
}

// Interface cho object "preview"
export interface IPreview {
  order_ids: number[];
  selected_process_codes: string[];
  common_delivery_deadline: string;
  suggested_planned_start_date: string;
  estimated_finish_date: string;
  total_duration_days: number;
  dept1_private_stage: IStage;
  group_stages: IStage[];
  split_stages: IStage[];
  timeline: IStage[];
  can_meet_common_deadline: boolean;
  days_late_if_any: number;
  notes: string[];
}

// Interface cho từng item trong mảng "auto_split_productions"
export interface IAutoSplitProduction {
  order_id: number;
  order_code: string;
  single_prod_id: number;
  department_code: string;
  department_name: string;
  process_codes: string[];
  reason: string;
}

// Interface chính cho object lớn nhất ở ngoài cùng
export interface ISuggestionGroup {
  suggestion_type: string;
  suggest_order: number[];
  suggest_process: string[];
  department_code: string;
  department_name: string;
  material_key: string | null;
  reason: string;
  product_type_id: number;
  product_type_name: string;
  note: string;
  suggested_planned_start_date: string;
  common_delivery_deadline: string;
  estimated_finish_date: string;
  estimated_total_days: number;
  preview: IPreview;
  auto_split_productions: IAutoSplitProduction[];
  warnings: any[]; // Bạn có thể đổi sang string[] nếu mảng này chỉ chứa text cảnh báo
}

// Chi tiết kế hoạch thời gian của từng công đoạn nhỏ trong một mẻ sản xuất
export interface ISuggestedTask {
  process_code: 'RALO' | 'CAT' | 'IN' | 'PHU' | 'CAN' | 'BE' | 'DUT' | 'DAN' | string;
  process_name: string;
  department_code: 'DEPT_1' | 'DEPT_2' | 'DEPT_3' | string;
  department_name: string;
  machine: string;
  seq_num: number;
  planned_start_time: string; // ISO Date String
  planned_end_time: string;   // ISO Date String
}

// Chi tiết một lô/mẻ sản xuất (Batch) trong phương án đề xuất
export interface ISuggestedBatch {
  batch_type: 'SINGLE' | 'GROUP' | 'SPLIT' | string;
  prod_kind: 'SINGLE' | 'GROUP' | 'SPLIT' | string;
  department_code: 'FULL_PATH' | string;
  department_name: string;
  order_ids: number[];
  order_codes: string[];
  process_codes: string[];
  planned_start_date: string; // ISO Date String
  planned_end_date: string;   // ISO Date String
  duration_days: number;
  tasks: ISuggestedTask[];
  note: string | null;
}

// Thông tin sơ lược của các đơn hàng nằm trong danh sách đề xuất này
export interface ISuggestedOrder {
  order_id: number;
  order_code: string;
  single_prod_id: number;
  product_type_id: number;
  product_type_name: string;
  product_name: string;
  quantity: number;
  production_process: string; // Chuỗi các công đoạn nối nhau bằng dấu phẩy, ví dụ: "RALO,CAT,IN..."
  production_method: 'NVL' | string;
  delivery_date: string;     // ISO Date String
}

// Đối tượng chính - Chi tiết một Phương án đề xuất sản xuất (Object con trong mảng gốc)
export interface IProductionSuggestion {
  suggestion_key: string;      // Định dạng: "TYPE:ID:METHOD" (Ví dụ: "SINGLE:23:NVL")
  suggestion_type: 'SINGLE_PREVIEW' | 'GROUP_PREVIEW' | string;
  can_group: boolean;
  create_group_allowed: boolean;
  suggest_order: number[];     // Mảng các ID đơn hàng được đề xuất xử lý chung
  suggest_process: string[];   // Mảng các mã công đoạn dự kiến chạy
  product_type_id: number;
  product_type_name: string;   // Ví dụ: "Hộp màu"
  production_method: 'NVL' | string;
  department_code: 'FULL_PATH' | string;
  department_name: string;
  material_key: string | null;
  order_count: number;
  order_codes: string[];
  orders: ISuggestedOrder[];
  batches: ISuggestedBatch[];
  suggested_planned_start_date: string; // ISO Date String
  schedule_planned_start_date: string;  // ISO Date String
  common_delivery_deadline: string;     // Hạn giao hàng chung tính theo đơn sớm nhất
  estimated_finish_date: string;        // Ngày dự kiến hoàn thành sản xuất
  schedule_planned_end_date: string;
  estimated_total_days: number;
  preview: any | null;                  // Cập nhật kiểu cụ thể nếu có dữ liệu preview
  preview_error: any | null;
  auto_split_productions: any[];
  warnings: string[];
  reason: string | null;                // Lý do hệ thống đưa ra đề xuất này
  note: string | null;                  // Ghi chú quan trọng (Ví dụ: "Đơn cần lên lịch gấp...")
}

export const groupProductionsApi = {
    getGroupableOrders: (productTypeId?: number, processCodes?: string) => {
        const queryParams: string[] = [];
        if (productTypeId !== undefined && productTypeId !== null) {
            queryParams.push(`productTypeId=${productTypeId}`);
        }
        if (processCodes) {
            queryParams.push(`processCodes=${processCodes}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        return http.get<GroupableOrderList>(`/api/GroupProductions/candidates${queryString}`);
    },

    // POST /api/GroupProductions
    confirmProduceOrder: (body: GroupProductions) =>
        http.post(`/api/GroupProductions`, body),

    // GET /api/GroupProductions/suggestions
    getSuggestions: (productTypeId?: number, processCodes?: string, orderIds?: string) => {
        const queryParams: string[] = [];
        if (productTypeId !== undefined && productTypeId !== null) {
            queryParams.push(`productTypeId=${productTypeId}`);
        }
        if (processCodes) {
            queryParams.push(`processCodes=${processCodes}`);
        }
        if (orderIds) {
            queryParams.push(`orderIds=${orderIds}`);
        }
        const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
        return http.get<IProductionSuggestion[]>(`/api/GroupProductions/suggestions${queryString}`);
    },

    // POST /api/GroupProductions/{id}/start
    startGroupProduction: (id: number) =>
        http.post(`/api/GroupProductions/${id}/start`, {}),

    // POST /api/GroupProductions/preview
    getPreview: (body: GroupProductions) =>
        http.post<IPreview>(`/api/GroupProductions/preview`, body),
}