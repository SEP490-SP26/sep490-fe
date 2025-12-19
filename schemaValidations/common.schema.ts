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
}

export interface UploadResponse {
  url: string;
}

export interface EstimatePaperRequest {
  paper_code: string;
  quantity: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  allowance_mm?: number;
  bleed_mm?: number;
  product_type?: string;
  number_of_plates?: number;
  production_processes?: string;
  coating_type?: string;
}

export interface EstimatePaperResponse {
  paper_code: string;
  sheet_width_mm: number;
  sheet_height_mm: number;
  sheet_length_mm: number;
  print_width_mm: number;
  print_height_mm: number;
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
}

export interface EstimateCostRequest {
  order_request_id: number;
  paper: EstimatePaperResponse;
  desired_delivery_date: string;
  product_type?: string;
  production_processes?: string;
  coating_type?: string;
  has_lamination?: boolean;
}

export interface EstimateCostResponse {
  paper_cost: number;
  ink_cost: number;
  coating_glue_cost: number;
  mounting_glue_cost: number;
  lamination_cost: number;
  material_cost: number;
  overhead_cost: number;
  base_cost: number;
  is_rush: boolean;
  rush_percent: number;
  rush_amount: number;
  system_total_cost: number;
  estimated_finish_date: string;
}

export interface AdjustFinalCostRequest {
  manual_adjust_cost: number;
  cost_note?: string;
}

export interface NearestDeliveryResponse {
  nearest_delivery_date: string;
  days_until_free: number;
}

export interface OrderRequest {
  order_request_id: number;
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
}

export interface Material {
  material_id: number;
  code: string;
  name: string;
  unit: string;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
  sheet_width_mm?: number;
  sheet_height_mm?: number;
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