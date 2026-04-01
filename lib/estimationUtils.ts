
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
    let print_width_mm: number, print_length_mm: number;

    // Kiểm tra và gán giá trị mặc định
    const effectiveGlueTab = glue_tab_mm <= 0 ? 20 : glue_tab_mm;

    // Dòng gạch
    if (productTypeCode?.startsWith('GACH_')) {
        print_width_mm = length_mm + 2 * height_mm + 2 * bleed_mm;
        print_length_mm = width_mm + 2 * height_mm + 2 * bleed_mm;
    }
    // Hộp carton
    else if (productTypeCode?.startsWith('HOP_MAU')) {
        print_width_mm = 2 * (length_mm + width_mm) + effectiveGlueTab + 2 * bleed_mm;

        if (is_one_side_box) {
            print_length_mm = width_mm + height_mm + 2 * bleed_mm;
        } else {
            print_length_mm = (2 * width_mm + height_mm) + 2 * bleed_mm;
        }
    }
    // Trường hợp khác
    else {
        print_width_mm = 2 * (length_mm + width_mm) + effectiveGlueTab + 2 * bleed_mm;
        print_length_mm = (2 * width_mm + height_mm) + 2 * bleed_mm;
    }

    return { print_width_mm, print_length_mm };
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

export const calculatePlateCost = (
    numberOfPlates: number,
    printWidthMm: number,
    printHeightMm: number,
    config?: Partial<EstimationConfig>
): { cost: number; pricePerPlate: number; sizeText: string } => {
    if (!numberOfPlates || numberOfPlates <= 0) return { cost: 0, pricePerPlate: 0, sizeText: '' };

    const printWidthCm = printWidthMm / 10;
    const printHeightCm = printHeightMm / 10;

    // Sort plate items by area to find the smallest fitting plate
    let rawItems = config?.platePrices?.items || [];
    if (rawItems.length === 0 && config?.platePrices) {
        rawItems = [
            ...(config.platePrices.small || []),
            ...(config.platePrices.medium || []),
            ...(config.platePrices.large || []),
            ...(config.platePrices.xlarge || [])
        ];
    }

    const plateItems = rawItems.length > 0 ? [...rawItems].sort((a, b) =>
        (a.width_cm * a.height_cm) - (b.width_cm * b.height_cm)
    ) : [];

    let selectedPlate = null;

    if (plateItems.length > 0) {
        for (const plate of plateItems) {
            // Check if print fits in plate (allow rotation)
            const fitsNormal = printWidthCm <= plate.width_cm && printHeightCm <= plate.height_cm;
            const fitsRotated = printHeightCm <= plate.width_cm && printWidthCm <= plate.height_cm;

            if (fitsNormal || fitsRotated) {
                selectedPlate = plate;
                break;
            }
        }

        // If no plate is large enough, fallback to the largest available
        if (!selectedPlate) {
            selectedPlate = plateItems[plateItems.length - 1];
        }
    } else {
        // Fallback hardcoded logic based on user's new pricing if API config is empty
        const plates = [
            { width: 37, height: 45, price: 40000, label: '37 x 45 cm' },
            { width: 40, height: 51, price: 45000, label: '40 x 51 cm' },
            { width: 45, height: 55, price: 55000, label: '45 x 55 cm' },
            { width: 55, height: 65, price: 75000, label: '55 x 65 cm' },
            { width: 60.5, height: 74.5, price: 90000, label: '60.5 x 74.5 cm' },
            { width: 79, height: 60, price: 95000, label: '79 x 60 cm' },
            { width: 79, height: 103, price: 160000, label: '79 x 103 cm' },
            { width: 80, height: 103, price: 165000, label: '80 x 103 cm' },
            { width: 114, height: 145, price: 320000, label: '114 x 145 cm' },
            { width: 132, height: 163, price: 450000, label: '132 x 163 cm' }
        ].sort((a, b) => (a.width * a.height) - (b.width * b.height));

        for (const plate of plates) {
            const fitsNormal = printWidthCm <= plate.width && printHeightCm <= plate.height;
            const fitsRotated = printHeightCm <= plate.width && printWidthCm <= plate.height;
            if (fitsNormal || fitsRotated) {
                selectedPlate = { price_per_plate: plate.price, size_text: plate.label };
                break;
            }
        }
        if (!selectedPlate) selectedPlate = { price_per_plate: plates[plates.length - 1].price, size_text: plates[plates.length - 1].label };
    }

    const pricePerPlate = selectedPlate.price_per_plate;
    return {
        cost: pricePerPlate * numberOfPlates,
        pricePerPlate,
        sizeText: selectedPlate.size_text
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

export const formatCoatingType = (coatingType: string | null | undefined): string => {
    switch (coatingType) {
        case 'KEO_NUOC':
            return 'Keo nước';
        case 'KEO_DAU':
            return 'Keo dầu';
        case 'NONE':
            return 'Không';
        default:
            return coatingType || 'Không';
    }
};

export const formatProcess = (processCode: string | null | undefined): string => {
    switch (processCode?.trim().toUpperCase()) {
        case 'IN': return 'In';
        case 'BE': return 'Bế';
        case 'BOI': return 'Bồi';
        case 'PHU': return 'Phủ';
        case 'CAN': return 'Cán';
        case 'DAN': return 'Dán';
        case 'DUT': return 'Dứt';
        case 'RALO': return 'Ralo';
        case 'CAT': return 'Cắt';
        case 'DOT': return 'Đột';
        case 'CAN_MANG': return 'Cán màng';
        case 'EP_KIM': return 'Ép kim';
        case 'PHU_UV': return 'Phủ UV';
        case 'BE_DEMI': return 'Bế demi';
        case 'THUC_NOI': return 'Thúc nổi';
        case 'DAN_MICA': return 'Dán mica';
        case 'DAN_HOP': return 'Dán hộp';
        case 'BE_NOI': return 'Bế nổi';
        case 'UV': return 'UV';
        default: return processCode || 'Không xác định';
    }
};

export type ProcessCostRule = {
    process_name?: string;
    unit?: string;
    unit_price?: number;
    note?: string;
};

export type CalculateInput = {
    quantity: number;
    paper_code: string;
    wave_type?: string | null;
    coating_type?: string | null;
    design_file_path?: string | null;
    is_send_design?: boolean;
    ink_type_names?: string[];

    sheet_width_mm: number;
    sheet_length_mm: number;

    wave_sheet_width_mm?: number;
    wave_sheet_length_mm?: number;

    print_width_mm: number;
    print_length_mm: number;

    processesCsv: string;
    processCosts?: Record<string, ProcessCostRule>;
    materials?: Array<{ code: string; name?: string; cost_price?: number; sheet_width_mm?: number; sheet_length_mm?: number }>;

    ink_rate_per_m2: number;
    ink_price_per_kg: number;
    coating_glue_price_per_kg: number;
    mounting_glue_price_per_kg: number;
    lamination_price_per_kg: number;
    default_design_cost: number;
    override_design_cost?: number;

    waste_printing: number;
    waste_die_cutting: number;
    waste_mounting: number;
    waste_coating: number;
    waste_lamination: number;

    rush_amount: number;
    discount_percent: number;
};

const normalizeProcessCode = (code?: string) => {
    const x = (code || "").trim().toUpperCase();
    return x === "CAN_MANG" ? "CAN" : x;
};

export const calculateEstimateForSave = (input: CalculateInput) => {
    const {
        quantity,
        paper_code,
        wave_type,
        coating_type,
        design_file_path,
        is_send_design,
        ink_type_names = [],

        sheet_width_mm,
        sheet_length_mm,
        wave_sheet_width_mm = 0,
        wave_sheet_length_mm = 0,

        print_width_mm,
        print_length_mm,

        processesCsv,
        processCosts,
        materials,

        ink_rate_per_m2,
        ink_price_per_kg,
        coating_glue_price_per_kg,
        mounting_glue_price_per_kg,
        lamination_price_per_kg,
        default_design_cost,
        override_design_cost,

        waste_printing,
        waste_die_cutting,
        waste_mounting,
        waste_coating,
        waste_lamination,

        rush_amount,
        discount_percent
    } = input;

    const processes = (processesCsv || "")
        .split(",")
        .map(normalizeProcessCode)
        .filter(Boolean);

    const hasPhu = processes.includes("PHU");
    const hasCan = processes.includes("CAN");
    const hasBoi = processes.includes("BOI");
    const hasDan = processes.includes("DAN");

    const sheet_area_m2 =
        (sheet_width_mm / 1000) * (sheet_length_mm / 1000);

    const n1 =
        Math.floor(sheet_width_mm / print_width_mm) *
        Math.floor(sheet_length_mm / print_length_mm);

    const n2 =
        Math.floor(sheet_width_mm / print_length_mm) *
        Math.floor(sheet_length_mm / print_width_mm);

    const n_up = Math.max(n1, n2);

    let warning_message = "";
    if (n_up <= 0) {
        warning_message = "Kích thước in không lọt khổ giấy";
    }

    const sheets_base = Math.ceil(quantity / (n_up || 1));

    const waste_gluing_boxes =
        !hasDan ? 0 :
            quantity < 100 ? 10 :
                quantity < 500 ? 15 :
                    quantity < 2000 ? 20 : 25;

    const waste_gluing = !hasDan
        ? 0
        : Math.max(
            0,
            Math.ceil((quantity + waste_gluing_boxes) / n_up) -
            Math.ceil(quantity / n_up)
        );

    const sheets_required = sheets_base;
    const sheets_waste =
        waste_printing +
        waste_die_cutting +
        waste_mounting +
        waste_coating +
        waste_lamination +
        waste_gluing;

    const sheets_total = sheets_required + sheets_waste;
    const paper_sheets_used = sheets_total;

    const print_sheets_used = sheets_base + waste_printing;
    const coating_sheets_used = hasPhu
        ? print_sheets_used + waste_coating
        : 0;
    const lamination_sheets_used = hasCan
        ? ((hasPhu ? coating_sheets_used : print_sheets_used) + waste_lamination)
        : 0;

    const total_print_area_m2 = sheet_area_m2 * print_sheets_used;
    const total_coating_area_m2 = sheet_area_m2 * coating_sheets_used;
    const total_lamination_area_m2 = sheet_area_m2 * lamination_sheets_used;

    let wave_n_up = 0;
    let wave_sheets_required = 0;
    let wave_sheets_used = 0;
    let wave_sheet_area_m2 = 0;
    let total_mounting_area_m2 = 0;

    if (hasBoi) {
        wave_sheet_area_m2 =
            (wave_sheet_width_mm / 1000) * (wave_sheet_length_mm / 1000);

        const wave_n1 =
            Math.floor(wave_sheet_width_mm / print_width_mm) *
            Math.floor(wave_sheet_length_mm / print_length_mm);

        const wave_n2 =
            Math.floor(wave_sheet_width_mm / print_length_mm) *
            Math.floor(wave_sheet_length_mm / print_width_mm);

        wave_n_up = Math.max(wave_n1, wave_n2);

        if (wave_n_up <= 0) {
            warning_message = warning_message ? `${warning_message} & Kích thước in không lọt khổ sóng` : "Kích thước in không lọt khổ sóng";
        }

        wave_sheets_required = Math.ceil(quantity / wave_n_up);
        wave_sheets_used = wave_sheets_required + waste_mounting;
        total_mounting_area_m2 = wave_sheet_area_m2 * wave_sheets_used;
    }

    const paperMaterial = materials?.find(x => x.code === paper_code);
    const waveMaterial = wave_type
        ? materials?.find(x => x.code === wave_type)
        : undefined;

    const paper_unit_price = paperMaterial?.cost_price || 0;
    const wave_unit_price = waveMaterial?.cost_price || 0;

    const coating_glue_rate_per_m2 = 0.004;
    const mounting_glue_rate_per_m2 = 0.004;
    const lamination_rate_per_m2 = 0.017;

    const ink_weight_kg = total_print_area_m2 * ink_rate_per_m2;
    const coating_glue_weight_kg = hasPhu
        ? total_coating_area_m2 * coating_glue_rate_per_m2
        : 0;
    const mounting_glue_weight_kg = hasBoi
        ? total_mounting_area_m2 * mounting_glue_rate_per_m2
        : 0;
    const lamination_weight_kg = hasCan
        ? total_lamination_area_m2 * lamination_rate_per_m2
        : 0;

    const paper_cost = paper_sheets_used * paper_unit_price;
    const wave_cost = wave_sheets_used * wave_unit_price;

    const ink_cost = ink_weight_kg * ink_price_per_kg;
    const coating_glue_cost = coating_glue_weight_kg * coating_glue_price_per_kg;
    const mounting_glue_cost = mounting_glue_weight_kg * mounting_glue_price_per_kg;
    const lamination_cost = lamination_weight_kg * lamination_price_per_kg;

    const material_cost =
        paper_cost +
        wave_cost +
        ink_cost +
        coating_glue_cost +
        mounting_glue_cost +
        lamination_cost;

    let totalProcessCost = 0;
    const processDetails: Array<{
        process_code: string;
        process_name: string;
        quantity: number;
        unit: string;
        unit_price: number;
        total_cost: number;
        note?: string;
    }> = [];

    for (const processCode of processes) {
        const cfg = processCosts?.[processCode];
        if (!cfg) continue;

        let qtyForProcess = 0;

        if (processCode === "IN") {
            qtyForProcess = total_print_area_m2;
        } else if (processCode === "PHU") {
            qtyForProcess = total_coating_area_m2;
        } else if (processCode === "CAN") {
            qtyForProcess = total_lamination_area_m2;
        } else if (["BE", "BOI", "RALO"].includes(processCode)) {
            qtyForProcess = sheets_total;
        } else if (["DAN"].includes(processCode)) {
            qtyForProcess = quantity;
        }

        if (qtyForProcess <= 0) continue;

        const total_cost = qtyForProcess * (cfg.unit_price || 0);

        totalProcessCost += total_cost;
        processDetails.push({
            process_code: processCode,
            process_name: cfg.process_name || processCode,
            quantity: qtyForProcess,
            unit: cfg.unit || "",
            unit_price: cfg.unit_price || 0,
            total_cost,
            note: cfg.note || ""
        });
    }

    const base_cost = material_cost;
    const subtotal = base_cost + rush_amount;
    const discount_amount = subtotal * (Math.max(0, Math.min(discount_percent, 100)) / 100);
    const final_total_base = subtotal - discount_amount;
    const design_cost =
        override_design_cost !== undefined
            ? override_design_cost
            : (!is_send_design || !design_file_path ? default_design_cost : 0);

    const final_total_cost = final_total_base + totalProcessCost + design_cost;

    return {
        paper_code,
        wave_type,
        coating_type,
        warning_message,

        print_width_mm,
        print_length_mm,

        n_up,
        sheets_required,
        sheets_waste,
        sheets_total,
        paper_sheets_used,

        waste_gluing_boxes,

        sheet_area_m2,
        print_sheets_used,
        coating_sheets_used,
        lamination_sheets_used,

        total_area_m2: total_print_area_m2,
        total_coating_area_m2,
        total_lamination_area_m2,

        wave_n_up,
        wave_sheets_required,
        wave_sheets_used,
        wave_sheet_area_m2,
        total_mounting_area_m2,

        paper_unit_price,
        wave_unit_price,

        paper_cost,
        wave_cost,
        ink_cost,
        coating_glue_cost,
        mounting_glue_cost,
        lamination_cost,

        ink_weight_kg,
        coating_glue_weight_kg,
        mounting_glue_weight_kg,
        lamination_weight_kg,

        ink_rate_per_m2,
        coating_glue_rate_per_m2,
        mounting_glue_rate_per_m2,
        lamination_rate_per_m2,

        material_cost,
        base_cost,

        total_process_cost: totalProcessCost,
        process_costs: processDetails,

        design_cost,
        subtotal,
        discount_percent,
        discount_amount,
        final_total_cost,

        production_processes: processes.join(",")
    };
};
