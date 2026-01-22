// hooks/useEstimationCalculator.ts
import {
  getProductTypeCode,
  calculatePrintSize,
  calculateNUp,
  calculateBaseSheets,
  calculateTotalWaste,
  calculatePrintArea,
  calculateTotalPrintArea,
  calculatePaperCost,
  calculateInkCost,
  calculateCoatingGlueCost,
  calculateMountingGlueCost,
  calculateLaminationCost,
  calculateOverheadCost,
  calculateProductionDays,
  calculateRushFee
} from '@/lib/estimationUtils';
import { EstimationConfig, EstimationInputs, EstimationResult, UseEstimationCalculator } from '@/lib/estimation.types';


export const useEstimationCalculator = (): UseEstimationCalculator => {


  // Hàm tính toán tổng hợp
  const calculateAll = (
    inputs: EstimationInputs,
    config?: Partial<EstimationConfig>
  ): EstimationResult => {
    const {
      // Input chính
      paper_code,
      sheet_width_mm,
      sheet_height_mm,
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

      // Config và dữ liệu bổ sung
      wasteRules,
      processCosts,
      designConfig,
      materials,
      machines,

      // Thông tin đơn hàng
      desired_delivery_date,
      discount_percent = 0,
      is_send_design = false,
      has_design_file = false
    } = inputs;

    // 1. Chuẩn hóa sản phẩm
    const productTypeCode = getProductTypeCode(product_type, form_product);

    // 2. Tính kích thước bản in
    const printSize = calculatePrintSize(
      length_mm,
      width_mm,
      height_mm,
      glue_tab_mm,
      bleed_mm,
      is_one_side_box,
      productTypeCode
    );

    // 3. Tính số con trên 1 tờ
    const nUp = calculateNUp(sheet_width_mm, sheet_height_mm, printSize.print_width_mm, printSize.print_height_mm);

    // 4. Tính số tờ cơ bản
    const sheetsBase = calculateBaseSheets(quantity, nUp);

    // 5. Phân tích công đoạn
    const processes = production_processes
      ? production_processes.split(',').map(p => p.trim().toUpperCase())
      : [];

    // 6. Tính hao hụt
    const wasteParams = {
      baseSheets: sheetsBase,
      productTypeCode,
      numberOfPlates: number_of_plates,
      processes,
      coatingType: coating_type,
      quantity
    };

    const wasteResult = calculateTotalWaste(wasteParams, wasteRules);

    // 7. Tính chi phí
    const printArea = calculatePrintArea(printSize.print_width_mm, printSize.print_height_mm);
    const totalPrintArea = calculateTotalPrintArea(printArea, quantity);

    // Tìm thông tin vật tư
    const material = materials?.find(m => m.code === paper_code);
    const paperUnitPrice = material?.cost_price || 0;

    // Tính các chi phí vật liệu
    const paperCost = calculatePaperCost(wasteResult.sheetsWithWaste, paperUnitPrice);
    const inkCost = calculateInkCost(productTypeCode, totalPrintArea, config);
    const coatingGlueCost = calculateCoatingGlueCost(
      processes.includes('PHU'),
      coating_type,
      totalPrintArea,
      config
    );
    const mountingGlueCost = calculateMountingGlueCost(
      processes.includes('BOI'),
      totalPrintArea,
      config
    );
    const laminationCost = calculateLaminationCost(
      processes.includes('CAN_MANG'),
      totalPrintArea,
      config
    );

    const materialCost = paperCost + inkCost + coatingGlueCost + mountingGlueCost + laminationCost;
    const overheadCost = calculateOverheadCost(materialCost, config?.systemParameters?.overhead_percent);
    const baseCost = materialCost + overheadCost;

    // 8. Tính thời gian sản xuất và phí gấp
    const productionDays = calculateProductionDays(
      wasteResult.sheetsWithWaste,
      quantity,
      processes,
      machines
    );

    const rushResult = calculateRushFee(
      productionDays,
      desired_delivery_date,
      baseCost,
      config
    );

    // 9. Tính chi phí công đoạn
    let totalProcessCost = 0;
    const processDetails: any[] = []; // Use any or ProcessCostDetail[] if imported


    if (processCosts && processes.length > 0) {
      processes.forEach(processCode => {
        const processConfig = processCosts[processCode];
        if (processConfig) {
          let qtyForProcess = 0;

          if (['IN', 'PHU', 'CAN_MANG'].includes(processCode)) {
            qtyForProcess = totalPrintArea;
          } else if (['BE', 'BOI', 'RALO'].includes(processCode)) {
            qtyForProcess = wasteResult.sheetsWithWaste;
          } else if (['DAN', 'DOT'].includes(processCode)) {
            qtyForProcess = quantity;
          }
          // DUT, CAT không tính tiền

          if (qtyForProcess > 0) {
            const cost = qtyForProcess * (processConfig.unit_price || 0);
            totalProcessCost += cost;
            processDetails.push({
              process: processCode,
              unit_price: processConfig.unit_price || 0,
              quantity: qtyForProcess,
              unit: processConfig.unit || '',
              total_cost: cost,
              note: processConfig.note || ''
            });
          }
        }
      });
    }

    // 10. Tính chi phí thiết kế
    const defaultDesignCost = designConfig?.default_design_cost || 200000;
    const designCost = (!is_send_design || !has_design_file)
      ? defaultDesignCost
      : 0;

    // 11. Tính tổng chi phí
    const subtotal = baseCost + rushResult.rushAmount;
    const validatedDiscount = Math.min(Math.max(discount_percent, 0), 100);
    const discountAmount = subtotal * validatedDiscount / 100;
    const finalTotalBase = subtotal - discountAmount;
    const finalTotalCost = finalTotalBase + totalProcessCost + designCost;

    return {
      // Thông tin cơ bản
      productTypeCode,
      printSize,
      nUp,
      sheetsBase,

      // Hao hụt
      waste: wasteResult,

      // Diện tích in
      printArea: {
        perUnit: printArea,
        total: totalPrintArea
      },

      // Chi phí
      costs: {
        material: {
          paper: paperCost,
          ink: inkCost,
          coatingGlue: coatingGlueCost,
          mountingGlue: mountingGlueCost,
          lamination: laminationCost,
          total: materialCost
        },
        overhead: overheadCost,
        base: baseCost,
        process: totalProcessCost,
        processDetails,
        design: designCost
      },

      // Thời gian sản xuất
      production: {
        days: productionDays,
        rush: rushResult
      },

      // Chiết khấu
      discount: {
        percent: discount_percent,
        amount: discountAmount
      },

      // Tổng
      totals: {
        subtotal,
        finalTotalBase,
        finalTotalCost
      },

      // Debug info
      debug: {
        processes,
        materialInfo: material,
        configUsed: config
      }
    };
  };

  return {
    calculateAll,
    // Export các hàm riêng lẻ nếu cần
    getProductTypeCode,
    calculatePrintSize,
    calculateNUp,
    calculateBaseSheets
  };
};