import http from "@/lib/httpAxios";
import { CommonResType, ProductType } from "@/schemaValidations/common.schema";

export interface ProductTemplate {
  /** ID định danh mẫu thiết kế */
  design_profile_id: number;

  /** ID loại sản phẩm (Hộp màu, Khay, Thẻ màu...) */
  product_type_id: number;

  /** Mã mẫu thiết kế (Ví dụ: "TEMPLATE_HOP_A_D") */
  template_code: string;

  /** Tên gọi mẫu (Ví dụ: "Hộp âm dương tiêu chuẩn") */
  template_name: string;

  /** Mô tả chi tiết về quy cách mẫu */
  description: string;

  // --- Kích thước thành phẩm (mm) ---
  product_length_mm: number;
  product_width_mm: number;
  product_height_mm: number;

  // --- Thông số kỹ thuật bao bì ---
  /** Độ rộng mép dán (mm) */
  glue_tab_mm: number;

  /** Độ tràn lề cắt (mm) */
  bleed_mm: number;

  /** Có phải là hộp in 1 mặt không? */
  is_one_side_box: boolean;

  /** Số bản kẽm mặc định */
  number_of_plates: number;

  // --- Cấu hình vật tư mặc định ---
  coating_type: string;
  paper_code: string;
  paper_name: string;
  wave_type: string;
  lamination: string;

  // --- Kích thước khổ in (mm) ---
  print_width_mm: number;
  print_length_mm: number;

  /** Chuỗi quy trình sản xuất mặc định (VD: "IN,PHU,BE,DAN") */
  production_processes: string;

  /** Số lượng đặt hàng gợi ý */
  default_quantity: number;

  /** Trạng thái mẫu (Đang sử dụng/Ngừng dùng) */
  is_active: boolean;

  /** Ngày tạo mẫu */
  created_at: string; // ISO Date

  /** Giá trị đơn vị (nếu có) */
  unit_value: number;
}

/** Kiểu dữ liệu mảng danh sách mẫu thiết kế */
export type ProductTemplateList = ProductTemplate[];

export const productTypesApi = {
  getAll: () =>
    http.get<ProductType[]>("/api/ProductTypes/Get-All-Product-Types"),

  getById: (id: number) => http.get<ProductType>(`/api/ProductTypes/${id}`),

  // Lấy danh sách loại sản phẩm chung: KHAY, THE_MAU, KHAC, VO_HOP_GACH, HOP_MAU
  getAllTypeGeneral: () =>
    http.get<string[]>("/api/ProductTypes/get-all-type-general"),

  getProductTemplete: (id: number) =>
    http.get<ProductTemplateList>(`/api/ProductTemplates/by-product-type/${id}`),
};
