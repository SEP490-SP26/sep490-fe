export interface ProcessCostItem {
  process_cost_id: number;
  process_code: string;
  cost: number;
}

export interface CostEstimate {
  estimate_id: number;
  final_total_cost: number;
  deposit_amount: number;
  process_cost: ProcessCostItem[];
}

export interface VerifiedRequestReponse {
  request_id: number;
  
  // Thông tin liên hệ
  customer_name: string;
  customer_phone: string;
  email: string;
  detail_address: string;

  // Trạng thái & Thời gian
  process_status: 'Waiting' | 'Verified' | 'Accepted' | string;
  delevery_date: string; // ISO Date (Giữ nguyên typo 'delevery' theo API)

  // Thông tin sản phẩm
  product_name: string;
  product_type: string; // VD: "HOP_MAU"
  quantity: number;
  description: string;
  design_file_path: string;

  // Thông số kỹ thuật sản xuất
  number_of_plates: number;
  production_processes: string; // VD: "RALO,PHU,BOI,BE,DAN,CAN_MANG"
  coating_type: string;
  paper_code: string;
  paper_name: string;
  wave_type: string;
  
  // Kích thước kỹ thuật (mm)
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;

  // Mảng chứa các bản dự toán chi phí
  cost_estimate: CostEstimate[];
}

// --- PHẦN 1: CÁC INTERFACE CON ---

export interface OrderSummary {
  order_id: number;
  code: string;
  order_date: string; // ISO Date
  delivery_date: string; // ISO Date
  status: 'Scheduled' | 'Pending' | 'Completed' | string;
  payment_status: 'Deposited' | 'Unpaid' | 'Full' | string;
  quote_id?: number; // Optional vì có thể không có quote cho đơn trực tiếp
  total_amount: number;
}

export interface RequestSummary {
  request_id: number;
  customer_name: string;
  phone: string;
  email: string;
  delivery_date: string; // ISO Date
  request_date?: string; // Một số record có trường này
  product_name: string;
  quantity: number;
  status: 'Waiting' | 'Pending' | 'Accepted' | 'Cancel' | string;
}

export interface PaginationWrapper<T> {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: T[];
}

// --- PHẦN 2: INTERFACE CHÍNH ---

export interface DashboardDataResponse {
  orders: PaginationWrapper<OrderSummary>;
  requests: PaginationWrapper<RequestSummary>;
}