import http from "@/lib/httpAxios";

/* ══════════════════════════════════
   GET /api/BaseConfigs – Response
══════════════════════════════════ */
export interface PlatePriceItemResponse {
  key: string;
  category: string;
  category_text: string;
  size_text: string;
  width_cm: number;
  height_cm: number;
  price_per_plate: number;
}

export interface BaseConfigResponse {
  materialPrices: {
    ink_price_per_kg: number;
    coating_glue_keo_nuoc_per_kg: number;
    coating_glue_keo_dau_per_kg: number;
    mounting_glue_per_kg: number;
    lamination_per_kg: number;
  };
  materialRates: {
    ink_rate_gach_noi_dia: number;
    ink_rate_gach_xk_don_gian: number;
    ink_rate_hop_mau: number;
    ink_rate_gach_nhieu_mau: number;
    coating_glue_rate_keo_nuoc: number;
    coating_glue_rate_keo_dau: number;
    mounting_glue_rate: number;
    lamination_rate_12mic: number;
  };
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
    items: PlatePriceItemResponse[];
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
  deliveryPayment: {
    require_remaining_before_delivery: boolean;
  };
}

/* ══════════════════════════════════
   PUT /api/BaseConfigs – Request
══════════════════════════════════ */
export interface ProcessCostItem {
  unit_price: number;
  unit: string;
}

export interface PlatePriceItem {
  price_per_plate: number;
  size_text: string;
}

export interface BaseConfigUpdateRequest {
  material_prices: {
    ink_price_per_kg: number;
    coating_glue_keo_nuoc_per_kg: number;
    coating_glue_keo_dau_per_kg: number;
    mounting_glue_per_kg: number;
    lamination_per_kg: number;
  };
  material_rates: {
    ink_rate_gach_noi_dia: number;
    ink_rate_gach_xk_don_gian: number;
    ink_rate_hop_mau: number;
    ink_rate_gach_nhieu_mau: number;
    coating_glue_rate_keo_nuoc: number;
    coating_glue_rate_keo_dau: number;
    mounting_glue_rate: number;
    lamination_rate_12mic: number;
  };
  waste_rules: {
    printing: {
      per_plate: number;
      default: number;
      by_product_type: {
        gacH_1MAU: number;
        gacH_XUAT_KHAU_DON_GIAN: number;
        gacH_XUAT_KHAU_TERACON: number;
        gacH_NOI_DIA_4SP: number;
        gacH_NOI_DIA_6SP: number;
        hoP_MAU_1LUOT_DON_GIAN: number;
        hoP_MAU_1LUOT_THUONG: number;
        hoP_MAU_1LUOT_KHO: number;
        hoP_MAU_AQUA_DOI: number;
        hoP_MAU_2LUOT: number;
      };
    };
    die_cutting: {
      lt_5000: number;
      lt_20000: number;
      ge_20000: number;
    };
    mounting: {
      lt_5000: number;
      lt_20000: number;
      ge_20000: number;
    };
    coating: {
      keo_nuoc: number;
      keo_dau_lt_10000: number;
      keo_dau_ge_10000: number;
    };
    lamination: {
      lt_10000: number;
      ge_10000: number;
    };
    gluing: {
      lt_100: number;
      lt_500: number;
      lt_2000: number;
      ge_2000: number;
    };
  };
  system_parameters: {
    default_production_days: number;
    rush_threshold_days: number;
    vat_percent: number;
    rush_percent_day_1: number;
    rush_percent_day_2: number;
    rush_percent_day_3: number;
    rush_percent_day_4: number;
  };
  process_costs: Record<string, ProcessCostItem>;
  design: {
    default_design_cost: number;
  };
  plate_prices: Record<string, PlatePriceItem>;
  payment_terms: {
    deposit_percent: number;
  };
  planning: {
    min_start_wait_hours: number;
    work_start_time: string;
    break_start_time: string;
    break_end_time: string;
    work_end_time: string;
  };
  delivery_payment: {
    require_remaining_before_delivery: boolean;
  };
}

/* ══════════════════════════════════
   Mapping keys: GET response → PUT request
══════════════════════════════════ */

/** Map product type keys from GET (UPPERCASE) to PUT (mixed case) */
const PRODUCT_TYPE_KEY_MAP: Record<string, string> = {
  GACH_1MAU: "gacH_1MAU",
  GACH_XUAT_KHAU_DON_GIAN: "gacH_XUAT_KHAU_DON_GIAN",
  GACH_XUAT_KHAU_TERACON: "gacH_XUAT_KHAU_TERACON",
  GACH_NOI_DIA_4SP: "gacH_NOI_DIA_4SP",
  GACH_NOI_DIA_6SP: "gacH_NOI_DIA_6SP",
  HOP_MAU_1LUOT_DON_GIAN: "hoP_MAU_1LUOT_DON_GIAN",
  HOP_MAU_1LUOT_THUONG: "hoP_MAU_1LUOT_THUONG",
  HOP_MAU_1LUOT_KHO: "hoP_MAU_1LUOT_KHO",
  HOP_MAU_AQUA_DOI: "hoP_MAU_AQUA_DOI",
  HOP_MAU_2LUOT: "hoP_MAU_2LUOT",
};

/** Map process codes from GET (UPPERCASE) to PUT (lowercase) */
const PROCESS_CODE_MAP: Record<string, string> = {
  BE: "be",
  BOI: "boi",
  CAN: "can",
  CAT: "cat",
  DAN: "dan",
  DUT: "dut",
  IN: "in",
  PHU: "phu",
  RALO: "ralo",
};

/** Map plate keys from GET (UPPERCASE) to PUT (mixed case) */
const PLATE_KEY_MAP: Record<string, string> = {
  SMALL_37X45: "smalL_37X45",
  SMALL_40X51: "smalL_40X51",
  SMALL_45X55: "smalL_45X55",
  MEDIUM_55X65: "mediuM_55X65",
  MEDIUM_60_5X74_5: "mediuM_60_5X74_5",
  MEDIUM_79X60: "mediuM_79X60",
  LARGE_79X103: "largE_79X103",
  LARGE_80X103: "largE_80X103",
  XLARGE_114X145: "xlargE_114X145",
  XLARGE_132X163: "xlargE_132X163",
};

/** Transform GET response to PUT request body */
export function toUpdateRequest(res: BaseConfigResponse): BaseConfigUpdateRequest {
  // Map by_product_type keys
  const byProductType: Record<string, number> = {};
  for (const [key, val] of Object.entries(res.wasteRules.printing.by_product_type)) {
    byProductType[PRODUCT_TYPE_KEY_MAP[key] || key] = val;
  }

  // Map process costs
  const processCosts: Record<string, ProcessCostItem> = {};
  for (const [code, proc] of Object.entries(res.processCosts.by_process)) {
    const mappedCode = PROCESS_CODE_MAP[code] || code.toLowerCase();
    processCosts[mappedCode] = {
      unit_price: proc.unit_price,
      unit: proc.unit,
    };
  }

  // Map plate prices
  const platePrices: Record<string, PlatePriceItem> = {};
  for (const plate of res.platePrices.items) {
    const mappedKey = PLATE_KEY_MAP[plate.key] || plate.key;
    platePrices[mappedKey] = {
      price_per_plate: plate.price_per_plate,
      size_text: plate.size_text,
    };
  }

  // Map rush percent
  const rushDays = res.systemParameters.rush_percent_by_days_early;

  return {
    material_prices: { ...res.materialPrices },
    material_rates: { ...res.materialRates },
    waste_rules: {
      printing: {
        per_plate: res.wasteRules.printing.per_plate,
        default: res.wasteRules.printing.default,
        by_product_type: byProductType as BaseConfigUpdateRequest["waste_rules"]["printing"]["by_product_type"],
      },
      die_cutting: res.wasteRules.dieCutting as BaseConfigUpdateRequest["waste_rules"]["die_cutting"],
      mounting: res.wasteRules.mounting as BaseConfigUpdateRequest["waste_rules"]["mounting"],
      coating: res.wasteRules.coating as BaseConfigUpdateRequest["waste_rules"]["coating"],
      lamination: res.wasteRules.lamination as BaseConfigUpdateRequest["waste_rules"]["lamination"],
      gluing: res.wasteRules.gluing as BaseConfigUpdateRequest["waste_rules"]["gluing"],
    },
    system_parameters: {
      default_production_days: res.systemParameters.default_production_days,
      rush_threshold_days: res.systemParameters.rush_threshold_days,
      vat_percent: res.systemParameters.vat_percent,
      rush_percent_day_1: rushDays["1"] ?? 0,
      rush_percent_day_2: rushDays["2"] ?? 0,
      rush_percent_day_3: rushDays["3"] ?? 0,
      rush_percent_day_4: rushDays["4"] ?? 0,
    },
    process_costs: processCosts,
    design: { ...res.design },
    plate_prices: platePrices,
    payment_terms: {
      deposit_percent: res.paymentTerms.deposit_percent,
    },
    planning: { ...res.planning },
    delivery_payment: { ...res.deliveryPayment },
  };
}

export const baseConfigApi = {
  getConfigs: () =>
    http.get<BaseConfigResponse>("/api/BaseConfigs"),

  updateConfigs: (data: BaseConfigResponse) =>
    http.put<{ message: string; note: string }>("/api/BaseConfigs", toUpdateRequest(data)),
};
