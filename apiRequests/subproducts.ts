import http from "@/lib/httpAxios";

export interface SubProduct {
  id: number;
  product_type_id: number;
  product_type_name: string;
  width: number;
  length: number;
  product_process: string;
  quantity: number;
  is_active: boolean;
  description: string;
  updated_at: string;
}

export interface PagedSubProductsResponse {
  page: number;
  pageSize: number;
  hasNext: boolean;
  data: SubProduct[];
}

export const subProductsApi = {
  getPaged: (page: number = 1, pageSize: number = 500, isActive: boolean = true) =>
    http.get<PagedSubProductsResponse>(
      `/api/SubProducts/paged?page=${page}&pageSize=${pageSize}&isActive=${isActive}`
    ),
    importPending: (ids: number[]) => {
      const params = new URLSearchParams();
      ids.forEach(id => params.append("ids", id.toString()));
      return http.put<any>(`/api/SubProducts/import-pending?${params.toString()}`, "");
    },
};
