
import { EstimationConfig, Machine, RushFeeResult, WasteRules, WasteResult, PrintSize, MaterialCostDetail } from '@/lib/estimation.types';

// ==========================================
// 1. PRODUCT STANDARDIZATION
// ==========================================

export const getProductTypeCode = (productType: string, formProduct?: string): string => {
    if (productType === 'HOP_MAU' || productType === 'VO_HOP_GACH') {
        return formProduct || productType;
    }
    return productType;
};

export const calculatePrintSize = (
    length_mm: number,
    width_mm: number,
    height_mm: number,
    glue_tab_mm: number = 20,
    bleed_mm: number,
    is_one_side_box: boolean,
    productTypeCode: string
): PrintSize => {
    let print_width_mm: number, print_height_mm: number;

    // Kiểm tra và gán giá trị mặc định
    const effectiveGlueTab = glue_tab_mm <= 0 ? 20 : glue_tab_mm;

    // Dòng gạch
    if (productTypeCode?.startsWith('GACH_')) {
        print_width_mm = length_mm + 2 * height_mm + 2 * bleed_mm;
        print_height_mm = width_mm + 2 * height_mm + 2 * bleed_mm;
    }
    // Hộp carton
    else if (productTypeCode?.startsWith('HOP_MAU')) {
        print_width_mm = 2 * (length_mm + width_mm) + effectiveGlueTab + 2 * bleed_mm;

        if (is_one_side_box) {
            print_height_mm = width_mm + height_mm + 2 * bleed_mm;
        } else {
            print_height_mm = (2 * width_mm + height_mm) + 2 * bleed_mm;
        }
    }
    // Trường hợp khác
    else {
        print_width_mm = 2 * (length_mm + width_mm) + effectiveGlueTab + 2 * bleed_mm;
        print_height_mm = (2 * width_mm + height_mm) + 2 * bleed_mm;
    }

    return { print_width_mm, print_height_mm };
};

// ==========================================
// 2. PAPER ESTIMATION
// ==========================================

export const calculateNUp = (
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
        // Return 0 instead of throwing error to prevent crash
        return 0;
    }

    return nUp;
};

export const calculateBaseSheets = (quantity: number, nUp: number): number => {
    if (!quantity || !nUp || nUp <= 0) return 0;
    return Math.ceil(quantity / nUp);
};

// Internal helper for waste calculation
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

export const calculateTotalWaste = (
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

// ==========================================
// 3. COST ESTIMATION
// ==========================================

export const calculatePrintArea = (printWidth: number, printHeight: number): number => {
    return (printWidth / 1000) * (printHeight / 1000);
};

export const calculateTotalPrintArea = (printArea: number, quantity: number): number => {
    return printArea * quantity;
};

export const calculatePaperCost = (sheetsWithWaste: number, paperUnitPrice: number): number => {
    return sheetsWithWaste * paperUnitPrice;
};

export const calculateInkCost = (
    productTypeCode: string,
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
): MaterialCostDetail => {
    const inkRates = config?.materialRates || {
        ink_rate_gach_noi_dia: 0.02,
        ink_rate_gach_xk_don_gian: 0.015,
        ink_rate_hop_mau: 0.018,
        ink_rate_gach_nhieu_mau: 0.025
    };

    const inkPrice = config?.materialPrices?.ink_price_per_kg || 150000;

    let inkRate: number;

    // Xác định định mức mực theo loại sản phẩm
    if (productTypeCode === 'GACH_1MAU') {
        inkRate = inkRates.ink_rate_gach_noi_dia;
    } else if (productTypeCode === 'GACH_XUAT_KHAU_DON_GIAN') {
        inkRate = inkRates.ink_rate_gach_xk_don_gian;
    } else if (['GACH_XUAT_KHAU_TERACON', 'GACH_NOI_DIA_4SP', 'GACH_NOI_DIA_6SP'].includes(productTypeCode)) {
        inkRate = inkRates.ink_rate_gach_nhieu_mau;
    } else {
        inkRate = inkRates.ink_rate_hop_mau;
    }

    const inkWeight = totalPrintArea * inkRate;
    return {
        cost: inkWeight * inkPrice,
        weight: inkWeight,
        rate: inkRate,
        unitPrice: inkPrice
    };
};

export const calculateCoatingGlueCost = (
    hasPhu: boolean,
    coatingType: 'KEO_NUOC' | 'KEO_DAU',
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
): MaterialCostDetail => {
    if (!hasPhu) return { cost: 0, weight: 0, rate: 0, unitPrice: 0 };

    const rates = config?.materialRates || {
        coating_glue_rate_keo_nuoc: 0.008,
        coating_glue_rate_keo_dau: 0.012
    };

    const prices = config?.materialPrices || {
        coating_glue_keo_nuoc_per_kg: 80000,
        coating_glue_keo_dau_per_kg: 120000
    };

    const rate = coatingType === 'KEO_NUOC' ? rates.coating_glue_rate_keo_nuoc : rates.coating_glue_rate_keo_dau;
    const price = coatingType === 'KEO_NUOC' ? prices.coating_glue_keo_nuoc_per_kg : prices.coating_glue_keo_dau_per_kg;

    const weight = totalPrintArea * rate;
    return {
        cost: weight * price,
        weight,
        rate,
        unitPrice: price
    };
};

export const calculateMountingGlueCost = (
    hasBoi: boolean,
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
): MaterialCostDetail => {
    if (!hasBoi) return { cost: 0, weight: 0, rate: 0, unitPrice: 0 };

    const rate = config?.materialRates?.mounting_glue_rate || 0.01;
    const price = config?.materialPrices?.mounting_glue_per_kg || 90000;

    const weight = totalPrintArea * rate;
    return {
        cost: weight * price,
        weight,
        rate,
        unitPrice: price
    };
};

export const calculateLaminationCost = (
    hasCanMang: boolean,
    totalPrintArea: number,
    config?: Partial<EstimationConfig>
): MaterialCostDetail => {
    if (!hasCanMang) return { cost: 0, weight: 0, rate: 0, unitPrice: 0 };

    const rate = config?.materialRates?.lamination_rate_12mic || 0.015;
    const price = config?.materialPrices?.lamination_per_kg || 150000;

    const weight = totalPrintArea * rate;
    return {
        cost: weight * price,
        weight,
        rate,
        unitPrice: price
    };
};

export const calculateOverheadCost = (materialCost: number, overheadPercent: number = 5): number => {
    return materialCost * (overheadPercent / 100);
};

// ==========================================
// 4. PRODUCTION TIME
// ==========================================

const getProcessMatch = (processCode: string, machineName: string): boolean => {
    const machineNameUpper = machineName.toUpperCase();

    const mapping: { [key: string]: boolean } = {
        'IN': machineNameUpper.includes('IN'),
        'BE': machineNameUpper.includes('BẾ') || machineNameUpper.includes('BE'),
        'BOI': machineNameUpper.includes('BỒI') || machineNameUpper.includes('BOI'),
        'PHU': machineNameUpper.includes('PHỦ') || machineNameUpper.includes('PHU'),
        'CAN': machineNameUpper.includes('CÁN') || machineNameUpper.includes('CAN'),
        'DAN': machineNameUpper.includes('DÁN') || machineNameUpper.includes('DAN'),
        'DUT': machineNameUpper.includes('DỨT') || machineNameUpper.includes('DUT'),
        'RALO': machineNameUpper.includes('RALO'),
        'CAT': machineNameUpper.includes('CẮT') || machineNameUpper.includes('CAT'),
        'DOT': machineNameUpper.includes('ĐỘT') || machineNameUpper.includes('DOT')
    };

    return mapping[processCode] || false;
};

export const calculateProductionDays = (
    sheetsWithWaste: number,
    quantity: number,
    processes: string[],
    machines?: Machine[]
): number => {
    if (!processes || !machines || machines.length === 0) return 5; // Mặc định 5 ngày

    const processDays: { [key: string]: number } = {};

    processes.forEach(processCode => {
        const normalizedCode = processCode.trim().toUpperCase();
        const processMachines = machines.filter(machine =>
            machine.is_active &&
            machine.process_name &&
            getProcessMatch(normalizedCode, machine.process_name)
        );

        if (processMachines.length === 0) return;

        const totalDailyCapacity = processMachines.reduce((sum, machine) =>
            sum + (machine.daily_capacity || 0), 0
        );

        if (totalDailyCapacity === 0) return;

        // Xác định số lượng cần xử lý
        let requiredQty: number;
        if (['IN', 'PHU', 'CAN', 'BOI', 'BE', 'RALO', 'CAT'].includes(normalizedCode)) {
            requiredQty = sheetsWithWaste;
        } else if (['DUT', 'DAN', 'DOT'].includes(normalizedCode)) {
            requiredQty = quantity;
        } else {
            return;
        }

        const daysNeeded = Math.max(1, Math.ceil(requiredQty / totalDailyCapacity));
        processDays[normalizedCode] = daysNeeded;
    });

    // Tìm bottleneck
    const bottleneckDays = Object.values(processDays).length > 0
        ? Math.max(...Object.values(processDays))
        : 5;

    // Thêm buffer 30%
    let totalDays = Math.ceil(bottleneckDays * 1.3);

    // Giới hạn
    if (totalDays < 2) totalDays = 2;
    if (totalDays > 30) totalDays = 30;

    return totalDays;
};

export const calculateRushFee = (
    totalDays: number,
    desiredDeliveryDate: Date,
    baseCost: number,
    config?: Partial<EstimationConfig>
): RushFeeResult => {
    const now = new Date();
    const estimatedFinishDate = new Date(now);
    estimatedFinishDate.setDate(estimatedFinishDate.getDate() + totalDays);

    if (desiredDeliveryDate >= estimatedFinishDate) {
        return {
            isRush: false,
            daysEarly: 0,
            rushPercent: 0,
            rushAmount: 0
        };
    }

    const timeDiff = estimatedFinishDate.getTime() - desiredDeliveryDate.getTime();
    const daysEarly = Math.max(0, Math.floor(timeDiff / (1000 * 3600 * 24)));

    const rushThreshold = config?.systemParameters?.rush_threshold_days || 1;
    if (daysEarly < rushThreshold) {
        return {
            isRush: false,
            daysEarly,
            rushPercent: 0,
            rushAmount: 0
        };
    }

    let rushPercent: number;
    const rushRules = config?.systemParameters?.rush_percent_by_days_early || {
        '1': 5,
        '2-3': 20,
        '>=4': 40
    };

    if (daysEarly === 1) {
        rushPercent = rushRules['1'] || 5;
    } else if (daysEarly === 2 || daysEarly === 3) {
        rushPercent = rushRules['2-3'] || 20;
    } else {
        rushPercent = rushRules['>=4'] || 40;
    }

    const rushAmount = baseCost * (rushPercent / 100);

    return {
        isRush: true,
        daysEarly,
        rushPercent,
        rushAmount
    };
};

export const roundToThousands = (num: number): number => {
    return Math.round(num / 1000) * 1000;
};
