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

    // POST /api/GroupProductions/{id}/start
    startGroupProduction: (id: number) =>
        http.post(`/api/GroupProductions/${id}/start`, {}),
}