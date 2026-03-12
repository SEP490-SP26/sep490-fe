export interface ProcessCostDetail {
  process_cost_id: number;
  process_code: string; // VD: "RALO", "IN", "PHU", "CAN", "BOI", "BE", "DAN"
  cost: number;
}

export interface DetailedEstimate {
  estimate_id: number;
  previous_estimate_id: number | null;
  final_total_cost: number;
  deposit_amount: number;
  is_active: boolean;

  // Vật tư & Quy trình
  paper_code: string;
  paper_name: string;
  coating_type: string;
  wave_type: string;
  production_processes: string;
  cost_note: string;

  // Định mức tiêu hao kỹ thuật
  paper_sheets_used: number;
  paper_unit_price: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;

  // Chi tiết giá thành (VNĐ)
  paper_cost: number;
  ink_cost: number;
  coating_glue_cost: number;
  mounting_glue_cost: number;
  lamination_cost: number;
  material_cost: number;
  design_cost: number;
  base_cost: number;
  subtotal: number;

  // Thuế & Chiết khấu
  discount_percent: number;
  discount_amount: number;
  vat_percent: number;
  vat_amount: number;

  // Chi tiết chi phí từng công đoạn gia công
  process_cost: ProcessCostDetail[];
}

export interface RequestDetailResponse {
  request_id: number;
  customer_name: string;
  customer_phone: string;
  email: string;
  request_date: string; // ISO Date
  delevery_date: string; // ISO Date (Lưu ý typo 'delevery')
  consultant_note: string;
  quote_expires_at: string;
  verified_at: string;
  
  // Trạng thái & Lý do
  process_status: 'Rejected' | 'Declined' | string;
  reason: string; // VD: "Từ chối deal do quá hạn 24h"
  
  // Thông tin sản phẩm & Quy cách
  product_name: string;
  product_type: string;
  quantity: number;
  description: string;
  design_file_path: string; // URL Cloudinary
  detail_address: string;
  note: string;

  // Thông số kỹ thuật chung
  number_of_plates: number;
  production_processes: string;
  coating_type: string;
  paper_code: string;
  paper_name: string;
  wave_type: string;
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  glue_tab_mm: number;
  bleed_mm: number;
  is_one_side_box: boolean;
  print_width_mm: number;
  print_height_mm: number;

  // Danh sách các phương án báo giá đi kèm
  cost_estimate: DetailedEstimate[];
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

export interface HistoryDataResponse {
  orders: PaginationWrapper<OrderSummary>;
  requests: PaginationWrapper<RequestSummary>;
}