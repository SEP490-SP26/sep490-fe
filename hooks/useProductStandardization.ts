// hooks chuẩn hóa sản phẩm
import { PrintSize, UseProductStandardization } from '@/lib/estimation.types';
import { useMemo } from 'react';

export const useProductStandardization = (): UseProductStandardization => {
    const getProductTypeCode = (productType: string, formProduct?: string): string => {
        if (productType === 'HOP_MAU' || productType === 'VO_HOP_GACH') {
            return formProduct || productType;
        }
        return productType;
    };

    const calculatePrintSize = (
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

    return {
        getProductTypeCode,
        calculatePrintSize
    };
};