import http from "@/lib/httpAxios";

export interface BaseConfigResponse {
  materialPrices: Record<string, number>;
  materialRates: Record<string, number>;
  wasteRules: {
    printing: {
      by_product_type: Record<string, number>;
      per_plate: number;
      default: number;
    };
    dieCutting: Record<string, number>;
    mounting: Record<string, number>;
    coating: Record<string, number>;
    lamination: Record<string, number>;
    gluing: Record<string, number>;
  };
  systemParameters: {
    default_production_days: number;
    rush_threshold_days: number;
    vat_percent: number;
    min_start_wait_hours: number;
    rush_percent_by_days_early: Record<string, number>;
  };
  processCosts: {
    by_process: Record<string, {
      unit_price: number;
      unit: string;
      note: string;
    }>;
  };
  design: {
    default_design_cost: number;
  };
  platePrices: {
    items: Array<{
      key: string;
      category: string;
      category_text: string;
      size_text: string;
      width_cm: number;
      height_cm: number;
      price_per_plate: number;
    }>;
    [key: string]: unknown;
  };
  paymentTerms: {
    deposit_percent: number;
    remaining_percent: number;
  };
  planning: {
    min_start_wait_hours: number;
    work_start_time: string;
    break_start_time: string;
    break_end_time: string;
    work_end_time: string;
  };
}

export const baseConfigApi = {
  getConfigs: () =>
    http.get<BaseConfigResponse>("/api/BaseConfigs"),

  updateConfigs: (body: BaseConfigResponse) =>
    http.put<{ message: string; note: string }>("/api/BaseConfigs", body),
};
