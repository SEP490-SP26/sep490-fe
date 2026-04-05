// hooks/useEstimationCalculator.ts
import {
  getProductTypeCode,
  calculatePrintSize,
  calculateBaseSheets,
  calculateTotalWaste,
  calculateProductionDays,
  calculateRushFee,
  calculateEstimateForSave,
  calculateInkCost,
  normalizeProcessCode
} from '@/lib/estimationUtils';
import { EstimationConfig, EstimationInputs, EstimationResult, UseEstimationCalculator } from '@/lib/estimation.types';

export const useEstimationCalculator = (): UseEstimationCalculator => {
  const calculateAll = (
    inputs: EstimationInputs,
    config?: Partial<EstimationConfig>
  ): EstimationResult => {
    const {
      paper_code,
      sheet_width_mm,
      sheet_length_mm,
      quantity,
      length_mm,
      width_mm,
      height_mm,
      glue_tab_mm = 15,
      bleed_mm,
      product_type,
      form_product,
      is_one_side_box,
      production_processes,
      coating_type = 'KEO_NUOC',
      wave_type,
      number_of_plates = 0,
      wasteRules,
      processCosts,
      designConfig,
      materials,
      machines,
      desired_delivery_date,
      discount_percent = 0,
      is_send_design = false,
      has_design_file = false
    } = inputs;

    const productTypeCode = getProductTypeCode(product_type, form_product);

    const printSize = calculatePrintSize(
      length_mm,
      width_mm,
      height_mm,
      glue_tab_mm,
      bleed_mm,
      is_one_side_box,
      productTypeCode
    );

    const processes = (production_processes || '')
      .split(',')
      .map(normalizeProcessCode)
      .filter(Boolean);

    const nUp = Math.max(
      0,
      Math.floor(sheet_width_mm / printSize.print_width_mm) *
        Math.floor(sheet_length_mm / printSize.print_length_mm),
      Math.floor(sheet_width_mm / printSize.print_length_mm) *
        Math.floor(sheet_length_mm / printSize.print_width_mm)
    );

    const sheetsBase = calculateBaseSheets(quantity, nUp);

    const wasteResult = calculateTotalWaste(
      {
        baseSheets: sheetsBase,
        nUp,
        productTypeCode,
        numberOfPlates: number_of_plates,
        processes,
        coatingType: coating_type,
        quantity
      },
      wasteRules || undefined
    );

    const waveMaterial = wave_type
      ? materials?.find(m => m.code === wave_type)
      : undefined;

    const inkMeta = calculateInkCost(productTypeCode, 1, config);
    const defaultDesignCost = designConfig?.default_design_cost || 200000;

    const draft = calculateEstimateForSave({
      quantity,
      paper_code,
      wave_type,
      coating_type,
      design_file_path: has_design_file ? 'HAS_FILE' : null,
      is_send_design,
      sheet_width_mm,
      sheet_length_mm,
      wave_sheet_width_mm: waveMaterial?.sheet_width_mm || 0,
      wave_sheet_length_mm: waveMaterial?.sheet_length_mm || 0,
      print_width_mm: printSize.print_width_mm,
      print_length_mm: printSize.print_length_mm,
      processesCsv: production_processes || '',
      processCosts: processCosts as any,
      materials,
      ink_rate_per_m2: inkMeta.rate,
      ink_price_per_kg: inkMeta.unitPrice,
      coating_glue_price_per_kg:
        coating_type === 'KEO_NUOC'
          ? (config?.materialPrices?.coating_glue_keo_nuoc_per_kg || 70000)
          : (config?.materialPrices?.coating_glue_keo_dau_per_kg || 80000),
      mounting_glue_price_per_kg: config?.materialPrices?.mounting_glue_per_kg || 60000,
      lamination_price_per_kg: config?.materialPrices?.lamination_per_kg || 200000,
      default_design_cost: defaultDesignCost,
      waste_printing: wasteResult.wastes.printing,
      waste_die_cutting: wasteResult.wastes.dieCutting,
      waste_mounting: wasteResult.wastes.mounting,
      waste_coating: wasteResult.wastes.coating,
      waste_lamination: wasteResult.wastes.lamination,
      rush_amount: 0,
      discount_percent
    });

    const productionDays = calculateProductionDays(
      draft.sheets_total,
      quantity,
      processes,
      machines
    );

    const rushResult = calculateRushFee(
      productionDays,
      desired_delivery_date,
      draft.base_cost,
      config
    );

    const calc = calculateEstimateForSave({
      quantity,
      paper_code,
      wave_type,
      coating_type,
      design_file_path: has_design_file ? 'HAS_FILE' : null,
      is_send_design,
      sheet_width_mm,
      sheet_length_mm,
      wave_sheet_width_mm: waveMaterial?.sheet_width_mm || 0,
      wave_sheet_length_mm: waveMaterial?.sheet_length_mm || 0,
      print_width_mm: printSize.print_width_mm,
      print_length_mm: printSize.print_length_mm,
      processesCsv: production_processes || '',
      processCosts: processCosts as any,
      materials,
      ink_rate_per_m2: inkMeta.rate,
      ink_price_per_kg: inkMeta.unitPrice,
      coating_glue_price_per_kg:
        coating_type === 'KEO_NUOC'
          ? (config?.materialPrices?.coating_glue_keo_nuoc_per_kg || 70000)
          : (config?.materialPrices?.coating_glue_keo_dau_per_kg || 80000),
      mounting_glue_price_per_kg: config?.materialPrices?.mounting_glue_per_kg || 60000,
      lamination_price_per_kg: config?.materialPrices?.lamination_per_kg || 200000,
      default_design_cost: defaultDesignCost,
      waste_printing: wasteResult.wastes.printing,
      waste_die_cutting: wasteResult.wastes.dieCutting,
      waste_mounting: wasteResult.wastes.mounting,
      waste_coating: wasteResult.wastes.coating,
      waste_lamination: wasteResult.wastes.lamination,
      rush_amount: rushResult.rushAmount,
      discount_percent
    });

    return {
      productTypeCode,
      printSize,
      nUp: calc.n_up,
      sheetsBase: calc.sheets_required,
      waste: {
        wastes: {
          printing: wasteResult.wastes.printing,
          dieCutting: wasteResult.wastes.dieCutting,
          mounting: wasteResult.wastes.mounting,
          coating: wasteResult.wastes.coating,
          lamination: wasteResult.wastes.lamination,
          gluing: calc.sheets_waste - (
            wasteResult.wastes.printing +
            wasteResult.wastes.dieCutting +
            wasteResult.wastes.mounting +
            wasteResult.wastes.coating +
            wasteResult.wastes.lamination
          )
        },
        totalWaste: calc.sheets_waste,
        sheetsWithWaste: calc.sheets_total,
        wastePercent: calc.sheets_required > 0
          ? (calc.sheets_waste / calc.sheets_required) * 100
          : 0
      },
      printArea: {
        perUnit: (printSize.print_width_mm / 1000) * (printSize.print_length_mm / 1000),
        total: Number(calc.total_area_m2)
      },
      costs: {
        material: {
          paper: Number(calc.paper_cost),
          ink: {
            cost: Number(calc.ink_cost),
            weight: Number(calc.ink_weight_kg),
            rate: Number(calc.ink_rate_per_m2),
            unitPrice: inkMeta.unitPrice
          },
          coatingGlue: {
            cost: Number(calc.coating_glue_cost),
            weight: Number(calc.coating_glue_weight_kg),
            rate: Number(calc.coating_glue_rate_per_m2),
            unitPrice:
              coating_type === 'KEO_NUOC'
                ? (config?.materialPrices?.coating_glue_keo_nuoc_per_kg || 70000)
                : (config?.materialPrices?.coating_glue_keo_dau_per_kg || 80000)
          },
          mountingGlue: {
            cost: Number(calc.mounting_glue_cost),
            weight: Number(calc.mounting_glue_weight_kg),
            rate: Number(calc.mounting_glue_rate_per_m2),
            unitPrice: config?.materialPrices?.mounting_glue_per_kg || 60000
          },
          lamination: {
            cost: Number(calc.lamination_cost),
            weight: Number(calc.lamination_weight_kg),
            rate: Number(calc.lamination_rate_per_m2),
            unitPrice: config?.materialPrices?.lamination_per_kg || 200000
          },
          total: Number(calc.material_cost)
        },
        overhead: 0,
        base: Number(calc.base_cost),
        process: Number(calc.total_process_cost),
        processDetails: calc.process_costs.map(p => ({ ...p, process: p.process_code, note: p.note || '' })),
        design: Number(calc.design_cost)
      },
      production: {
        days: productionDays,
        rush: rushResult
      },
      discount: {
        percent: discount_percent,
        amount: Number(calc.discount_amount)
      },
      totals: {
        subtotal: Number(calc.subtotal),
        finalTotalBase: Number(calc.subtotal - calc.discount_amount),
        finalTotalCost: Number(calc.final_total_cost)
      },
      debug: {
        processes,
        materialInfo: materials?.find(m => m.code === paper_code),
        configUsed: config
      }
    };
  };

  return {
    calculateAll,
    getProductTypeCode,
    calculatePrintSize,
    calculateNUp: (sheetWidth, sheetHeight, printWidth, printHeight) =>
      Math.max(
        Math.floor(sheetWidth / printWidth) * Math.floor(sheetHeight / printHeight),
        Math.floor(sheetWidth / printHeight) * Math.floor(sheetHeight / printWidth)
      ),
    calculateBaseSheets
  };
};