
// 1. Đơn giá vật tư (VND/kg)
export interface MaterialPrices {
  ink_price_per_kg: number;
  coating_glue_keo_nuoc_per_kg: number;
  coating_glue_keo_dau_per_kg: number;
  mounting_glue_per_kg: number;
  lamination_per_kg: number;
}

// 2. Định mức tiêu hao (Rate per m2)
export interface MaterialRates {
  ink_rate_gach_noi_dia: number;
  ink_rate_gach_xk_don_gian: number;
  ink_rate_hop_mau: number;
  ink_rate_gach_nhieu_mau: number;
  coating_glue_rate_keo_nuoc: number;
  coating_glue_rate_keo_dau: number;
  mounting_glue_rate: number;
  lamination_rate_12mic: number;
}

// 3. Quy tắc bù hao (Waste Rules)
// Moved to line 106
// 4. Giá bản kẽm theo khổ (Plate Prices)
export interface PlatePriceItem {
  key: string;
  category: 'small' | 'medium' | 'large' | 'xlarge' | string;
  category_text: string;
  size_text: string;
  width_cm: number;
  height_cm: number;
  price_per_plate: number;
}

export interface PlatePriceConfig {
  items: PlatePriceItem[];
  small: PlatePriceItem[];
  medium: PlatePriceItem[];
  large: PlatePriceItem[];
  xlarge: PlatePriceItem[];
}

// 5. Tham số hệ thống
export interface SystemParameters {
  default_production_days: number;
  rush_threshold_days: number;
  vat_percent: number;
  rush_percent_by_days_early: Record<string, number>;
}

// 6. Root Interface
export interface EstimationConfig {
  materialPrices: MaterialPrices;
  materialRates: MaterialRates;
  wasteRules: WasteRules;
  systemParameters: SystemParameters;
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
  platePrices: PlatePriceConfig;
}

// Cấu trúc dữ liệu cơ bản
export interface ProductDimensions {
  length_mm: number;
  width_mm: number;
  height_mm: number;
}

export interface PrintSize {
  print_width_mm: number;
  print_length_mm: number;
}

export interface ProductInfo {
  product_type: string;
  form_product?: string;
  productTypeCode?: string;
  is_one_side_box: boolean;
}

// Waste Rules Types
export interface WasteRules {
  Printing: {
    [key: string]: number | undefined; // productTypeCode -> waste sheets
    default: number;
    per_plate?: number;
  };
  DieCutting: {
    '<5000'?: number;
    '5000-20000'?: number;
    '>=20000'?: number;
  };
  Mounting: {
    '<5000'?: number;
    '5000-20000'?: number;
    '>=20000'?: number;
  };
  Coating: {
    '<10000'?: number;
    '>=10000'?: number;
  };
  Lamination: {
    '<10000'?: number;
    '>=10000'?: number;
  };
  Gluing: {
    '<100'?: number;
    '100-500'?: number;
    '500-2000'?: number;
    '>=2000'?: number;
  };
}

export interface ProcessCost {
  process_code?: string;
  process_name?: string;
  unit_price: number;
  unit: string;
  note?: string;
}

export interface ProcessCosts {
  [key: string]: ProcessCost; // process code -> cost config
}

export interface DesignConfig {
  default_design_cost: number;
  rush_percent_by_days_early: {
    [key: string]: number; // '1', '2-3', '>=4'
  };
}

export interface Material {
  material_id: number;
  code: string;
  name: string;
  unit: string;
  type: string;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
  description?: string;
  main_material_type: string;
  boms: [];
  purchase_items: [];
  stock_moves: [];
  supplier_materials: [];
  sheet_width_mm: number;
  sheet_thick_mm: number;
  sheet_length_mm?: number;
  material_class: string;
  [key: string]: any;
}

export interface Machine {
  machine_id: number;
  process_name: string;
  process_code: string;
  is_active: boolean;
  daily_capacity: number;
  capacity_per_hour?: number;
  quantity?: number;
  capacity_min?: number;
  capacity_max?: number;
  working_hours_per_day?: number;
  efficiency_percent: number;
}


// Input types
export interface EstimationInputs {
  // Basic inputs
  paper_code: string;
  sheet_width_mm: number;
  sheet_length_mm: number;
  quantity: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  glue_tab_mm?: number;
  bleed_mm: number;
  product_type: string;
  form_product?: string;
  is_one_side_box: boolean;
  production_processes?: string;
  coating_type?: 'KEO_NUOC' | 'KEO_DAU';
  wave_type?: string;
  number_of_plates?: number;

  // Additional data
  wasteRules?: WasteRules;
  processCosts?: ProcessCosts;
  designConfig?: DesignConfig;
  materials?: Material[];
  machines?: Machine[];

  // Order info
  desired_delivery_date: Date;
  discount_percent?: number;
  is_send_design?: boolean;
  has_design_file?: boolean;
}

// Result types
export interface WasteResult {
  wastes: {
    printing: number;
    dieCutting: number;
    mounting: number;
    coating: number;
    lamination: number;
    gluing: number;
  };
  totalWaste: number;
  sheetsWithWaste: number;
  wastePercent: number;
}

export interface PrintAreaResult {
  perUnit: number;
  total: number;
}

export interface MaterialCostDetail {
  cost: number;
  weight: number;
  rate: number;
  unitPrice: number;
}

export interface MaterialCosts {
  paper: number;
  ink: MaterialCostDetail;
  coatingGlue: MaterialCostDetail;
  mountingGlue: MaterialCostDetail;
  lamination: MaterialCostDetail;
  total: number;
}

export interface RushFeeResult {
  isRush: boolean;
  daysEarly: number;
  rushPercent: number;
  rushAmount: number;
}

export interface EstimationResult {
  // Basic info
  productTypeCode: string;
  printSize: PrintSize;
  nUp: number;
  sheetsBase: number;

  // Waste
  waste: WasteResult;

  // Print area
  printArea: PrintAreaResult;

  // Costs
  costs: {
    material: MaterialCosts;
    overhead: number;
    base: number;
    process: number;
    processDetails: ProcessCostDetail[];
    design: number;
  };

  // Production time
  production: {
    days: number;
    rush: RushFeeResult;
  };

  // Discount
  discount: {
    percent: number;
    amount: number;
  };

  // Totals
  totals: {
    subtotal: number;
    finalTotalBase: number;
    finalTotalCost: number;
  };

  // Debug info
  debug: {
    processes: string[];
    materialInfo?: Material;
    configUsed?: Partial<EstimationConfig>;
  };
}

// Hook return types
export interface UseProductStandardization {
  getProductTypeCode: (productType: string, formProduct?: string) => string;
  calculatePrintSize: (
    length_mm: number,
    width_mm: number,
    height_mm: number,
    glue_tab_mm: number,
    bleed_mm: number,
    is_one_side_box: boolean,
    productTypeCode: string
  ) => PrintSize;
}

export interface UsePaperEstimation {
  calculateNUp: (
    sheetWidth: number,
    sheetHeight: number,
    printWidth: number,
    printHeight: number
  ) => number;
  calculateBaseSheets: (quantity: number, nUp: number) => number;
  calculateTotalWaste: (
    params: {
      baseSheets: number;
      productTypeCode: string;
      numberOfPlates: number;
      processes: string[];
      coatingType: 'KEO_NUOC' | 'KEO_DAU';
      quantity: number;
    },
    wasteRules?: WasteRules
  ) => WasteResult;
}

export interface UseCostEstimation {
  calculatePrintArea: (printWidth: number, printHeight: number) => number;
  calculateTotalPrintArea: (printArea: number, quantity: number) => number;
  calculatePaperCost: (sheetsWithWaste: number, paperUnitPrice: number) => number;
  calculateInkCost: (
    productTypeCode: string,
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
  ) => number;
  calculateCoatingGlueCost: (
    hasPhu: boolean,
    coatingType: 'KEO_NUOC' | 'KEO_DAU',
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
  ) => number;
  calculateMountingGlueCost: (
    hasBoi: boolean,
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
  ) => number;
  calculateLaminationCost: (
    hasCanMang: boolean,
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
  ) => number;
  calculateOverheadCost: (materialCost: number, overheadPercent?: number) => number;
}

export interface UseProductionTime {
  calculateProductionDays: (
    sheetsWithWaste: number,
    quantity: number,
    processes: string[],
    machines?: Machine[]
  ) => number;
  calculateRushFee: (
    totalDays: number,
    desiredDeliveryDate: Date,
    baseCost: number,
    config?: Partial<EstimationConfig>
  ) => RushFeeResult;
}

export interface UseEstimationCalculator {
  calculateAll: (inputs: EstimationInputs, config?: Partial<EstimationConfig>) => EstimationResult;
  getProductTypeCode: (productType: string, formProduct?: string) => string;
  calculatePrintSize: (
    length_mm: number,
    width_mm: number,
    height_mm: number,
    glue_tab_mm: number,
    bleed_mm: number,
    is_one_side_box: boolean,
    productTypeCode: string
  ) => PrintSize;
  calculateNUp: (
    sheetWidth: number,
    sheetHeight: number,
    printWidth: number,
    printHeight: number
  ) => number;
  calculateBaseSheets: (quantity: number, nUp: number) => number;
}

export interface ProcessCostDetail {
  process: string;
  unit_price: number;
  quantity: number;
  unit: string;
  total_cost: number;
  note: string;
}

export interface UseEstimationConfig {
  wasteRules: WasteRules | null;
  processCosts: ProcessCosts | null;
  designConfig: DesignConfig | null;
  systemParameters: SystemParameters | null; // Added systemParameters
  platePrices: PlatePriceConfig | null;
  materials: Material[];
  machines: Machine[];
  loading: boolean;
  error: string | null;
  getMaterialById: (materialId: string | number) => Material | undefined;
  getMaterialByCode: (paperCode: string) => Material | undefined;
  refreshConfig: () => Promise<void>;
}



export interface ProcessCostRules {
  process_code: string;
  process_name: string;
  unit: 'm2' | 'tờ' | 'sp' | string;
  unit_price: number;
  note: string;
}

export interface ProcessCostDetail {
  process_code: string;
  process_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  note: string;
}

export interface ProcessCostItem {
  process_code: string;
  process_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  note: string;
}

export interface DetailedProductionEstimation {
  // --- Định danh & Lịch sử ---
  order_request_id: number;
  previous_estimate_id: number | null;
  created_at: string; // ISO Date

  // --- Thông số Giấy (Chính & Dự phòng) ---
  paper_code: string;
  paper_name: string;
  paper_alternative: string;
  paper_unit_price: number;
  paper_cost: number;
  paper_sheets_used: number; // Tổng số tờ giấy chính sử dụng
  sheet_area_m2: number;      // Diện tích 1 tờ giấy (m2)

  // --- Thông số Sóng (Wave - Dành cho bồi hộp) ---
  wave_type: string;
  wave_alternative: string;
  wave_unit_price: number;
  wave_cost: number;
  wave_sheets_required: number; // Số tờ sóng lý thuyết
  wave_sheets_used: number;     // Số tờ sóng thực tế (gồm bù hao)
  wave_sheet_area_m2: number;   // Diện tích 1 tờ sóng (m2)
  wave_n_up: number;            // Số con trên 1 tờ sóng

  // --- Định mức tiêu hao Mực in ---
  ink_cost: number;
  ink_weight_kg: number;
  ink_rate_per_m2: number;
  print_sheets_used: number;    // Số tờ đi qua máy in (có thể khác paper_sheets_used)
  ink_type_names: string;

  // --- Công đoạn Phủ (Coating) ---
  coating_type: string;
  coating_glue_cost: number;
  coating_glue_weight_kg: number;
  coating_glue_rate_per_m2: number;
  coating_sheets_used: number;      // Số tờ thực hiện phủ
  total_coating_area_m2: number;    // Tổng diện tích phủ (m2)

  // --- Công đoạn Cán màng (Lamination) ---
  lamination_cost: number;
  lamination_weight_kg: number;
  lamination_rate_per_m2: number;
  lamination_sheets_used: number;   // Số tờ thực hiện cán
  total_lamination_area_m2: number; // Tổng diện tích cán (m2)

  // --- Công đoạn Bồi (Mounting) ---
  mounting_glue_cost: number;
  mounting_glue_weight_kg: number;
  mounting_glue_rate_per_m2: number;
  total_mounting_area_m2: number;   // Tổng diện tích bồi (m2)

  // --- Công đoạn Dán (Gluing) ---
  waste_gluing_boxes: number;       // Số hộp bù hao khi dán máy

  // --- Tổng hợp chi phí & Tài chính ---
  material_cost: number;
  design_cost: number;
  total_process_cost: number; // Tổng chi phí từ các bước gia công
  base_cost: number;

  is_rush: boolean;
  rush_percent: number;
  rush_amount: number;
  days_early: number;

  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  final_total_cost: number;
  cost_note: string;

  // --- Thời gian & Giao hàng ---
  estimated_finish_date: string; // ISO Date
  desired_delivery_date: string; // ISO Date

  // --- Thông số Kỹ thuật & Bình bản ---
  production_processes: string; // VD: "RALO,IN,PHU,CAN,BOI,BE,DAN"
  sheets_required: number;      // Số tờ thành phẩm lý thuyết
  sheets_waste: number;         // Tổng số tờ bù hao
  sheets_total: number;         // Tổng số tờ giấy cần xuất (required + waste)
  n_up: number;                 // Số con trên 1 tờ in
  total_area_m2: number;        // Tổng diện tích in ấn (m2)

  bleed_mm: number;
  glue_tab_mm: number;
  is_one_side_box: boolean;
  print_length_mm: number;
  print_width_mm: number;

  // --- Pháp lý & Hợp đồng ---
  contract_file_path: string;
  contract_uploaded_at: string | null; // ISO Date

  // --- Chi tiết chi phí nhân công theo bảng giá ---
  process_costs: ProcessCostItem[];
}

// export type ProcessCostRulesList = ProcessCostRules[];
