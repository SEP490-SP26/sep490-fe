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
}

export interface EstimateCostRequest {
  order_request_id: number;
  paper: {
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
    sheets_with_waste: number;
    waste_percent: number;
  };
  desired_delivery_date: string;
}

export interface NearestDeliveryResponse {
  nearest_delivery_date: string;
  days_until_free: number;
}