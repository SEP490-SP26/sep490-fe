import { DetailedProductionEstimation, EstimationConfig } from "@/lib/estimation.types";
import http from "@/lib/httpAxios";
import {
    DepositResponse,
    EstimateCostRequest,
    EstimateCostResponse,
    EstimatePaperRequest,
    EstimatePaperResponse,
    ProcessCostBreakdownResponse
} from "@/schemaValidations/common.schema";

interface EstimationResponse {
    estimate_id: number;
}

export interface RequestQuotationItem {
  // --- Nhóm ID và Định danh ---
  order_request_id: number;
  quote_id: number;
  estimate_id: number;
  estimate_order_request_id: number;
  order_id: number | null;
  accepted_estimate_id: number | null;

  // --- Thông tin Khách hàng ---
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  detail_address: string;

  // --- Thông tin Sản phẩm & Trạng thái ---
  product_name: string;
  product_type: 'THE_MAU' | 'HOP_MAU' | 'VO_HOP_GACH' | string;
  quantity: number;
  process_status: 'Waiting' | 'Pending' | 'Accepted' | string;
  order_request_date: string | null;
  created_at: string;
  description: string;
  note: string | null;
  reason: string | null;

  // --- Thông số Kỹ thuật ---
  number_of_plates: number;
  production_processes: string; // VD: "RALO,CAT,IN,PHU,CAN_MANG"
  coating_type: string;
  paper_code: string;
  paper_name: string;
  wave_type: string | null;
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  glue_tab_mm: number | null;
  bleed_mm: number | null;
  n_up: number;
  total_area_m2: number;
  is_one_side_box: boolean | null;
  is_send_design: boolean;
  design_file_path: string;

  // --- Chi tiết Chi phí Vật tư (Dự toán) ---
  paper_cost: number;
  paper_sheets_used: number;
  paper_unit_price: number;
  ink_cost: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  coating_glue_cost: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  estimate_coating_type: string;
  mounting_glue_cost: number;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  lamination_cost: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;
  material_cost: number;
  design_cost: number;
  
  // --- Chi phí Quản lý & Tổng cộng ---
  overhead_percent: number;
  overhead_cost: number;
  base_cost: number;
  subtotal: number;
  final_total_cost: number;
  deposit_amount: number;
  
  // --- Thông số Bù hao & Thời gian ---
  sheets_required: number;
  sheets_waste: number;
  sheets_total: number;
  is_rush: boolean;
  rush_percent: number;
  rush_amount: number;
  days_early: number;
  estimated_finish_date: string;
  desired_delivery_date: string;
  delivery_date: string;

  cost_note: string;
}

export interface QuoteOption {
  // Định danh báo giá
  quote_id: number;
  estimate_id: number;
  order_request_id: number;

  // Thông tin khách hàng & Địa chỉ
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;

  // Thông tin sản phẩm & Kỹ thuật
  product_name: string;
  quantity: number;
  paper_name: string; // VD: "Giấy C300" hoặc "N/A"
  coating_type: string;
  wave_type: string;
  is_send_design: boolean;
  design_type_text: string;
  production_process_text: string;

  // Chi phí chi tiết (VNĐ)
  material_cost: number;
  labor_cost: number;
  other_fees: number;
  rush_amount: number;
  subtotal: number;
  final_total: number;
  discount_percent: number;
  discount_amount: number;
  deposit: number;

  // Thời gian & Hiển thị
  order_request_date: string;
  request_date_text: string;
  delivery_date: string;
  delivery_text: string;
  quote_created_at: string;
  quote_expired_at: string;
  quote_expired_at_text: string;

  // Cấu hình hệ thống
  is_customer_copy: boolean;
  email_html: string | null;
  order_detail_url: string | null;
}

export interface OrderRequestWithQuotes {
  order_request_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;
  delivery_date: string;
  order_request_date: string;
  product_name: string;
  quantity: number;
  is_send_design: boolean;
  
  /** Danh sách các phương án báo giá cho yêu cầu này */
  quotes: QuoteOption[];
}

/** Kiểu dữ liệu mảng các báo giá yêu cầu */
export type RequestQuotationList = RequestQuotationItem[];

export const estimatesApi = {
    // POST /api/Estimates/paper - Calculate paper parameters
    estimatePaper: (body: EstimatePaperRequest) =>
        http.post<EstimatePaperResponse>("/api/Estimates/paper", body),

    // POST /api/Estimates/process-cost-breakdown - Get process cost breakdown
    processCostBreakdown: (body: EstimateCostRequest) =>
        http.post<ProcessCostBreakdownResponse>("/api/Estimates/process-cost-breakdown", body),

    // PUT /api/Estimates/adjust-final-total-cost/{id} - Adjust final cost (old)
    // adjustFinalCost: (id: number, body: AdjustFinalCostRequest) =>
    //     http.put<void>(`/api/Estimates/adjust-final-total-cost/${id}`, body),

    // PUT /api/Estimates/adjust-cost/{estimateId} - Điều chỉnh giá chốt với khách hàng
    adjustCost: (estimateId: number, finalCost: number) =>
        http.put<void>(`/api/Estimates/adjust-cost/${estimateId}`, { final_cost: finalCost }),

    // GET /api/Estimates/deposit/by-request/{requestId} - Lấy tiền đặt cọc theo đơn hàng
    getDeposit: (requestId: number) =>
        http.get<DepositResponse>(`/api/Estimates/deposit/by-request/${requestId}`),

    //GET /api/Estimates/base-config
    getBaseConfig: () => http.get<EstimationConfig>("/api/Estimates/base-config"),

    //POST /api/Estimates/cost-save 
    costSave: (body: DetailedProductionEstimation) =>
        http.post<EstimationResponse>("/api/Estimates/cost-save", body),

    getAllDeal: (requestId: number) => http.get<RequestQuotationList>(`/api/Estimates/all-deal-by-${requestId}`),

    emailPreview: (requestId: number) => http.get<OrderRequestWithQuotes>(`/api/Estimates/email-preview/${requestId}`),
};
