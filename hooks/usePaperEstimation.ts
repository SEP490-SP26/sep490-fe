//hooks tính giấy và hao hụt
import { UsePaperEstimation, WasteResult, WasteRules } from '@/lib/estimation.types';
import { useMemo } from 'react';


export const usePaperEstimation = (): UsePaperEstimation => {
  // Tính số sản phẩm trên 1 tờ giấy
  const calculateNUp = (
    sheetWidth: number,
    sheetHeight: number,
    printWidth: number,
    printHeight: number
  ): number => {
    if (!sheetWidth || !sheetHeight || !printWidth || !printHeight) return 0;

    const n1 = Math.floor(sheetWidth / printWidth) * Math.floor(sheetHeight / printHeight);
    const n2 = Math.floor(sheetWidth / printHeight) * Math.floor(sheetHeight / printWidth);
    
    const nUp = Math.max(n1, n2);
    
    if (nUp <= 0) {
      throw new Error('Kích thước in không lọt khổ giấy');
    }
    
    return nUp;
  };

  // Tính số tờ cơ bản
  const calculateBaseSheets = (quantity: number, nUp: number): number => {
    if (!quantity || !nUp || nUp <= 0) return 0;
    return Math.ceil(quantity / nUp);
  };

  // Tính hao hụt in
  const calculatePrintingWaste = (
    productTypeCode: string, 
    numberOfPlates: number, 
    wasteRules?: WasteRules
  ): number => {
    const baseWaste = wasteRules?.Printing?.[productTypeCode] || wasteRules?.Printing?.default || 200;
    
    let additionalWaste = 0;
    if (productTypeCode?.startsWith('HOP_MAU') && numberOfPlates > 0) {
      additionalWaste = numberOfPlates * (wasteRules?.Printing?.per_plate || 10);
    }
    
    return baseWaste + additionalWaste;
  };

  // Tính hao hụt bế
  const calculateDieCuttingWaste = (
    hasBe: boolean, 
    baseSheets: number, 
    wasteRules?: WasteRules
  ): number => {
    if (!hasBe || !baseSheets) return 0;
    
    const rules = wasteRules?.DieCutting || {};
    
    if (baseSheets < 5000) return rules['<5000'] || 20;
    if (baseSheets < 20000) return rules['5000-20000'] || 30;
    return rules['>=20000'] || 40;
  };

  // Tính hao hụt bồi (giống bế)
  const calculateMountingWaste = (
    hasBoi: boolean, 
    baseSheets: number, 
    wasteRules?: WasteRules
  ): number => {
    if (!hasBoi || !baseSheets) return 0;
    
    const rules = wasteRules?.Mounting || {};
    
    if (baseSheets < 5000) return rules['<5000'] || 20;
    if (baseSheets < 20000) return rules['5000-20000'] || 30;
    return rules['>=20000'] || 40;
  };

  // Tính hao hụt phủ
  const calculateCoatingWaste = (
    hasPhu: boolean, 
    coatingType: 'KEO_NUOC' | 'KEO_DAU', 
    baseSheets: number, 
    wasteRules?: WasteRules
  ): number => {
    if (!hasPhu || coatingType === 'KEO_NUOC' || !baseSheets) return 0;
    
    const rules = wasteRules?.Coating || {};
    
    if (baseSheets < 10000) return rules['<10000'] || 20;
    return rules['>=10000'] || 30;
  };

  // Tính hao hụt cán
  const calculateLaminationWaste = (
    hasCanMang: boolean, 
    baseSheets: number, 
    wasteRules?: WasteRules
  ): number => {
    if (!hasCanMang || !baseSheets) return 0;
    
    const rules = wasteRules?.Lamination || {};
    
    if (baseSheets < 10000) return rules['<10000'] || 20;
    return rules['>=10000'] || 30;
  };

  // Tính hao hụt dán
  const calculateGluingWaste = (
    hasDan: boolean, 
    quantity: number, 
    wasteRules?: WasteRules
  ): number => {
    if (!hasDan || !quantity) return 0;
    
    const rules = wasteRules?.Gluing || {};
    
    if (quantity < 100) return rules['<100'] || 10;
    if (quantity < 500) return rules['100-500'] || 15;
    if (quantity < 2000) return rules['500-2000'] || 20;
    return rules['>=2000'] || 25;
  };

  // Tính tổng hao hụt
  const calculateTotalWaste = (
    params: {
      baseSheets: number;
      productTypeCode: string;
      numberOfPlates: number;
      processes: string[];
      coatingType: 'KEO_NUOC' | 'KEO_DAU';
      quantity: number;
    },
    wasteRules?: WasteRules
  ): WasteResult => {
    const {
      baseSheets,
      productTypeCode,
      numberOfPlates,
      processes,
      coatingType,
      quantity
    } = params;

    const processSet = new Set(processes?.map(p => p.trim().toUpperCase()) || []);

    const wastes = {
      printing: calculatePrintingWaste(productTypeCode, numberOfPlates, wasteRules),
      dieCutting: calculateDieCuttingWaste(processSet.has('BE'), baseSheets, wasteRules),
      mounting: calculateMountingWaste(processSet.has('BOI'), baseSheets, wasteRules),
      coating: calculateCoatingWaste(processSet.has('PHU'), coatingType, baseSheets, wasteRules),
      lamination: calculateLaminationWaste(processSet.has('CAN_MANG'), baseSheets, wasteRules),
      gluing: calculateGluingWaste(processSet.has('DAN'), quantity, wasteRules)
    };

    const totalWaste = Object.values(wastes).reduce((sum, waste) => sum + waste, 0);
    const sheetsWithWaste = baseSheets + totalWaste;
    const wastePercent = baseSheets > 0 ? (totalWaste / baseSheets) * 100 : 0;

    return {
      wastes,
      totalWaste,
      sheetsWithWaste,
      wastePercent
    };
  };

  return {
    calculateNUp,
    calculateBaseSheets,
    calculateTotalWaste
  };
};