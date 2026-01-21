// hooks tính chi phí
import { EstimationConfig, UseCostEstimation } from '@/lib/estimation.types';
import { useMemo } from 'react';


export const useCostEstimation = (): UseCostEstimation => {
    // Tính diện tích in
    const calculatePrintArea = (printWidth: number, printHeight: number): number => {
        return (printWidth / 1000) * (printHeight / 1000);
    };

    const calculateTotalPrintArea = (printArea: number, quantity: number): number => {
        return printArea * quantity;
    };

    // Tính chi phí giấy
    const calculatePaperCost = (sheetsWithWaste: number, paperUnitPrice: number): number => {
        return sheetsWithWaste * paperUnitPrice;
    };

    // Tính chi phí mực in
    const calculateInkCost = (
        productTypeCode: string,
        totalPrintArea: number,
        config?: Partial<EstimationConfig>
    ): number => {
        const inkRates = config?.ink_rates || {
            hop_mau: 0.02,
            gach_noi_dia: 0.015,
            gach_xk_don_gian: 0.018,
            gach_nhieu_mau: 0.025
        };

        const inkPrice = config?.ink_price_per_kg || 150000;

        let inkRate: number;

        // Xác định định mức mực theo loại sản phẩm
        if (productTypeCode === 'GACH_1MAU') {
            inkRate = inkRates.gach_noi_dia;
        } else if (productTypeCode === 'GACH_XUAT_KHAU_DON_GIAN') {
            inkRate = inkRates.gach_xk_don_gian;
        } else if (['GACH_XUAT_KHAU_TERACON', 'GACH_NOI_DIA_4SP', 'GACH_NOI_DIA_6SP'].includes(productTypeCode)) {
            inkRate = inkRates.gach_nhieu_mau;
        } else {
            inkRate = inkRates.hop_mau;
        }

        const inkWeight = totalPrintArea * inkRate;
        return inkWeight * inkPrice;
    };

    // Tính chi phí keo phủ
    const calculateCoatingGlueCost = (
        hasPhu: boolean,
        coatingType: 'KEO_NUOC' | 'KEO_DAU',
        totalPrintArea: number,
        config?: Partial<EstimationConfig>
    ): number => {
        if (!hasPhu) return 0;

        const rates = config?.coating_glue_rates || {
            keo_nuoc: 0.008,
            keo_dau: 0.012
        };

        const prices = config?.coating_glue_prices || {
            keo_nuoc: 80000,
            keo_dau: 120000
        };

        const rate = coatingType === 'KEO_NUOC' ? rates.keo_nuoc : rates.keo_dau;
        const price = coatingType === 'KEO_NUOC' ? prices.keo_nuoc : prices.keo_dau;

        const weight = totalPrintArea * rate;
        return weight * price;
    };

    // Tính chi phí keo bồi
    const calculateMountingGlueCost = (
        hasBoi: boolean,
        totalPrintArea: number,
        config?: Partial<EstimationConfig>
    ): number => {
        if (!hasBoi) return 0;

        const rate = config?.mounting_glue_rate || 0.01;
        const price = config?.mounting_glue_per_kg || 90000;

        const weight = totalPrintArea * rate;
        return weight * price;
    };

    // Tính chi phí màng cán
    const calculateLaminationCost = (
        hasCanMang: boolean,
        totalPrintArea: number,
        config?: Partial<EstimationConfig>
    ): number => {
        if (!hasCanMang) return 0;

        const rate = config?.lamination_rate_12mic || 0.015;
        const price = config?.lamination_per_kg || 150000;

        const weight = totalPrintArea * rate;
        return weight * price;
    };

    // Tính chi phí khấu hao
    const calculateOverheadCost = (materialCost: number, overheadPercent: number = 5): number => {
        return materialCost * (overheadPercent / 100);
    };

    return {
        calculatePrintArea,
        calculateTotalPrintArea,
        calculatePaperCost,
        calculateInkCost,
        calculateCoatingGlueCost,
        calculateMountingGlueCost,
        calculateLaminationCost,
        calculateOverheadCost
    };
};