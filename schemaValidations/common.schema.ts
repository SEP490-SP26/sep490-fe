import { ProcessCostDetail } from '@/lib/estimation.types'
import Stream from 'node:stream'
import z from 'zod'

export const MessageRes = z
  .object({
    message: z.string()
  })
  .strict()

export type MessageResType = z.TypeOf<typeof MessageRes>

export const IsSucceedRes = z.object({
  isSucceed: z.boolean()
}).strict()

export const CommonRes = z
  .object({
    status: z.any(),
    message: z.string(),
    data: z.any()
  })
  .strict()
export type CommonResType = z.TypeOf<typeof CommonRes>

export const PagingBody = z
  .object({
    paging: z.object({
      pageNum: z.number().optional(),
      pageSize: z.number().optional(),
    })
  })
  .strict()
export type PagingBodyType = z.TypeOf<typeof PagingBody>
export const PagingRes = z
  .object({
    paging: z.object({
      pageNum: z.number(),
      pageSize: z.number(),
      pageCount: z.number(),
    })
  })
  .strict()
export type PagingResType = z.TypeOf<typeof PagingRes>

export interface CreateRequestBodyForConsultant {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  detail_address: string;
}

export interface CreateRequestBody {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  delivery_date: string;
  product_name: string;
  quantity: number;
  description?: string;
  design_file_path?: string;
  order_request_date?: string;
  province?: string;
  district?: string;
  detail_address?: string;
  product_length_mm?: number;
  product_width_mm?: number;
  product_height_mm?: number;
  paper_name?: string;
  preliminary_estimated_price?: number;
}

export interface RejectDealRequest {
  order_request_id: number;
  // token: string;
  reason: string;
  phone: string;
  otp: string;
}

export interface UpdateRequestBody {
  // Thông tin khách hàng
  customer_name: string;
  customer_phone: string;
  customer_email: string;

  // Thông tin chung về đơn hàng
  order_request_date: string; // ISO Date string
  delivery_date: string;      // ISO Date string
  processing_status: string;
  description: string;
  delivery_date_change_reason?: string;

  // Thông tin sản phẩm
  product_name: string;
  product_type: string;
  quantity: number;
  design_file_path: string;
  is_send_design: boolean;

  // Thông tin địa chỉ giao hàng
  province: string;
  district: string;
  detail_address: string;

  // Thông số kỹ thuật sản xuất
  number_of_plates: number;
  paper_code: string;
  paper_name: string;
  coating_type: string;
  wave_type: string;

  // Kích thước kỹ thuật (mm)
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;
  glue_tab_mm: number;      // Mép dán
  bleed_mm: number;         // Tràn lề

  // Thông số in ấn
  is_one_side_box: boolean;
  print_width_mm: number;
  print_length_mm: number;

  // Quy trình sản xuất (có thể là chuỗi JSON hoặc danh sách các bước)
  production_processes: string;
  ink_type_names?: string[];
}

export interface UploadResponse {
  url: string;
}

// OTP Interfaces
export interface SendOtpRequest {
  email: string;
}

export interface SendOtpSMSRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpSMSRequest {
  phone: string;
  otp: string;
}

export interface OtpResponse {
  message: string;
}

export interface EstimatePaperRequest {
  order_request_id?: number;
  paper_code: string;
  quantity: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  glue_tab_mm?: number;
  bleed_mm?: number;
  is_one_side_box?: boolean;
  product_type?: string;
  form_product?: string;
  number_of_plates?: number;
  production_processes?: string;
  ink_type_names?: string[];
  coating_type?: string;
  wave_type?: string;
}

export interface EstimatePaperResponse {
  paper_code: string;
  sheet_width_mm: number;
  sheet_length_mm: number;
  print_width_mm: number;
  print_length_mm: number;
  n_up: number;
  quantity: number;
  sheets_base: number;
  waste_printing: number;
  waste_die_cutting: number;
  waste_mounting: number;
  waste_coating: number;
  waste_lamination: number;
  waste_gluing: number;
  total_waste: number;
  sheets_with_waste: number;
  waste_percent: number;
  warning_message?: string;
}

export interface EstimateCostRequest {
  order_request_id: number;
  paper: EstimatePaperResponse;
  desired_delivery_date: string;
  product_type?: string;
  form_product?: string;
  production_processes?: string;
  ink_type_names?: string[];
  coating_type?: string;
  discount_percent?: number;
  wave_type?: string;
  is_send_design?: boolean;
}

export interface AdjustFinalCostRequest {
  order_request_id: number;
  final_total_cost: number;
}

export interface MaterialCostDetail {
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  note: string;
}



// Cost data within EstimateCostResponse
export interface EstimateCostData {
  // Paper costs
  paper_cost: number;
  paper_sheets_used: number;
  paper_unit_price: number;

  // Ink costs
  ink_cost: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  ink_unit_price: number;

  // Coating glue costs
  coating_glue_cost: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  coating_glue_unit_price: number;
  coating_type: string;

  // Mounting glue costs
  mounting_glue_cost: number;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  mounting_glue_unit_price: number;

  // Lamination costs
  lamination_cost: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;
  lamination_unit_price: number;

  // Summary costs
  material_cost: number;
  overhead_percent: number;
  overhead_cost: number;
  base_cost: number;

  // Rush fee
  is_rush: boolean;
  rush_percent: number;
  rush_amount: number;
  days_early: number;

  // Discount
  subtotal: number;
  discount_percent: number;
  discount_amount: number;

  // Final
  final_total_cost: number;
  estimated_finish_date: string;
  total_area_m2: number;
  design_cost: number;

  // New calculation output fields
  waste_gluing_boxes?: number;
  wave_sheets_required?: number;
  wave_n_up?: number;
  sheet_area_m2?: number;
  wave_sheet_area_m2?: number;
  print_sheets_used?: number;
  coating_sheets_used?: number;
  lamination_sheets_used?: number;
  total_coating_area_m2?: number;
  total_mounting_area_m2?: number;
  total_lamination_area_m2?: number;
  wave_unit_price?: number;
  wave_cost?: number;
  total_process_cost?: number;

  // Material details
  material_cost_details: MaterialCostDetail[];

  // Potential new calculation fields
  wave_sheets_used?: number;
  paper_alternative?: string;
  wave_alternative?: string;
}

// New response structure with cost and process_cost
export interface EstimateCostResponse {
  cost: EstimateCostData;
  process_cost: ProcessCostBreakdownResponse;
}

export interface AdjustFinalCostRequest {
  manual_adjust_cost: number;
  cost_note?: string;
}

// Process Cost Breakdown
// export interface ProcessCostDetail {
//   process: string;
//   unit_price: number;
//   quantity: number;
//   unit: string;
//   total_cost: number;
//   note: string;
// }

export interface ProcessCostBreakdownResponse {
  order_request_id: number;
  total_cost: number;
  details: ProcessCostDetail[];
}

export interface NearestDeliveryResponse {
  nearest_delivery_date: string;
  days_until_free: number;
}

export interface OrderRequest {
  order_request_id: number;
  order_id?: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  delivery_date: string;
  product_name: string;
  quantity: number;
  description: string;
  design_file_path: string;
  order_request_date: string;
  province: string;
  district: string;
  detail_address: string;
  process_status: string;
  number_of_plates: number;
  coating_type: string;
  has_lamination: boolean;
  is_check_contract?: boolean;
  contract_check_note?: string;
  assign_name?: string | null;
  print_ready_file?: string | null;
}


export interface Material {
  material_id: number;
  code: string;
  name: string;
  unit: string;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
  description?: string;
  sheet_width_mm?: number;
  sheet_length_mm?: number;
  boms: any[];
  purchase_items: any[];
  stock_moves: any[];
}

export interface ProductType {
  product_type_id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  order_items: any[];
  product_type_processes: any[];
  productions: any[];
}

export interface MachineCapacity {
  totalMachines: number;
  activeMachines: number;
  runningMachines: number;
}

export interface FreeMachine {
  processName: string;
  totalMachines: number;
  busyMachines: number;
  freeMachines: number;
}

// Public Orders API types
export interface OrderHistoryItem {
  order_id: number;
  code: string;
  order_date: string;
  delivery_date: string;
  status: string;
  payment_status: string;
  quote_id: number;
}

export interface RequestHistoryItem {

}

export interface OrderHistoryResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: OrderHistoryItem[];
}

export interface RequestHistoryResponse {
  page: number;
  pageSize: number;
  otp: string;
  phone: string;
}

// Order Detail Response for GET /api/Orders/{id}
export interface OrderDetailResponse {
  order_id: number;
  code: string;
  status: string;
  payment_status: string;
  order_date: string;
  delivery_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;
  product_name: string;
  quantity: number;
  approver_name: string;
  note: string;
  final_total_cost: number;
  deposit_amount: number;
  rush_amount: number;
  file_url: string;
}

export interface OrderPayment {
  payment_id: number;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export interface RequestDetailResponse {
  // Định danh đơn hàng & Báo giá
  order_id: number;
  order_request_id: number;
  quote_id: number;
  process_status: 'Accepted' | 'Pending' | 'InProduction' | string;

  // Thông tin khách hàng
  customer_name: string;
  customer_email: string;
  customer_phone: string;

  // Chi tiết sản phẩm & Kỹ thuật
  product_name: string;
  product_type: 'HOP_MAU' | 'GACH' | string;
  quantity: number;
  description: string;

  // Thông số vật tư
  paper_code: string;
  paper_name: string;
  coating_type: 'KEO_NUOC' | 'KEO_DAU' | 'UV' | string;
  wave_type: string; // VD: SÓNG B NÂU 900G/M2
  number_of_plates: number; // Số bản kẽm

  // Kích thước (mm)
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;

  // Quy trình sản xuất & Thiết kế
  production_processes: string; // VD: "RALO,PHU,BOI,BE,DAN,CAN_MANG"
  ink_type_names?: string[];
  design_file_path: string;
  is_send_design: boolean;

  // Giao hàng & Địa chỉ
  delivery_date: string; // ISO Date
  detail_address: string;
  order_request_date: string;

  reason: string;
  final_total_cost: number;
  deposit_amount: number;
  rush_amount: number;
  file_url: string;

  // Thông tin thanh toán
  payments: OrderPayment[];
}



export interface CreateQRBody {
  task_id: number;
  ttl_minutes: number;
  qty_good: number;
  materials?: any[];
}

export interface CreateQRResponse {
  task_id: number;
  token: string;
  expires_at_unix: number;
}

// Deposit Response for GET /api/Estimates/deposit/by-request/{requestId}
export interface DepositResponse {
  order_request_id: number;
  deposit_amount: number;
}