import http from "@/lib/httpAxios";
// import { ProductResponse } from "@/schemaValidations/product.schema";
export interface Product {
    product_id: number;

    /** ID phân loại (1: HOP_MAU, 2: KHAY, 3: VO_HOP_GACH, 4: THE_MAU) */
    product_type_id: number;

    /** Mã nhóm sản phẩm (Ví dụ: "HOP_MAU", "KHAY", "THE_MAU") */
    code: string;

    /** Tên sản phẩm chi tiết */
    name: string;

    /** Mô tả đặc tính kỹ thuật hoặc ứng dụng */
    description: string;

    /** Trạng thái kinh doanh */
    is_active: boolean;

    /** Thời gian tạo (ISO Date) */
    created_at: string;

    /** Thời gian cập nhật gần nhất */
    updated_at: string | null;

    /** Thông tin mở rộng về loại sản phẩm (nếu có join bảng) */
    product_type: any | null;
}

/** Kiểu dữ liệu cho mảng danh sách sản phẩm */
export type ProductList = Product[];
export const productsApi = {
    getAllProducts: () => http.get<ProductList>("/api/Products/get-all-products"),
}