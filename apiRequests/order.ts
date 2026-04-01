import http from "@/lib/httpAxios";
import { CommonResType, CreateRequestBody } from "../schemaValidations/common.schema";

export interface QuoteField {
  request_date: string;
  paper_name: string;
  coating_type: string;
  wave_type: string;
  design_type: string;
  production_process: string;
  material_cost: number;
  labor_cost: number;
  other_fees: number;
  rush_amount: number;
  sub_total: number;
  discount_percent: number;
  discount_amount: number;
  ink_type_names?: string[];
}

export interface OrderDetailResponse {
  // Định danh đơn hàng
  order_id: number;
  code: string; // VD: "ORD-00045"
  status: 'InProcessing' | 'Scheduled' | 'Completed' | 'Cancelled' | string;
  payment_status: 'Deposited' | 'Unpaid' | 'FullPayment' | string;

  // Thời gian
  order_date: string;          // Ngày tạo đơn (ISO Date)
  delivery_date: string;       // Ngày hẹn giao khách (ISO Date)
  production_start_date: string; // Ngày bắt đầu đưa vào sản xuất
  production_end_date: string | null; // Ngày dự kiến xong hoặc thực tế xong

  // Thông tin khách hàng
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  detail_address: string;

  // Thông tin sản phẩm & Sản xuất
  product_name: string;
  quantity: number;
  production_id: number;       // ID lệnh sản xuất
  approver_name: string;       // Người duyệt lệnh (VD: Manager)
  specification: string | null; // Thông số kỹ thuật bổ sung
  note: string;

  // Tài chính (VNĐ)
  final_total_cost: number;
  deposit_amount: number;
  rush_amount: number;

  // Tài liệu đính kèm
  file_url: string;            // Link file thiết kế
  contract_file: string | null; // Link file hợp đồng (nếu có)

  quote_fields: QuoteField;
}

export const orderApi = {
  getList: (page: number = 1, pageSize: number = 10) =>
    http.get<CommonResType>(`/api/Orders/paged?page=${page}&pageSize=${pageSize}`),

  getListByStatus: (page: number = 1, pageSize: number = 10, status: string) =>
    http.get<CommonResType>(`/api/Orders/paged?page=${page}&pageSize=${pageSize}&status=${status}`),

  createRequestOrderByCustomer: (body: CreateRequestBody) =>
    http.post<CommonResType>("/api/Orders", body),

  getDetail: (id: string) => http.get<OrderDetailResponse>(`/api/Orders/detail/${id}`),

  updateOrder: (id: string, body: Partial<CreateRequestBody>) =>
    http.put<CommonResType>(`/api/Orders/${id}`, body),

  deleteOrder: (id: string) =>
    http.delete<CommonResType>(`/api/Orders/${id}`),
};
