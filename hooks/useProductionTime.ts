// hooks tính thời gian sản xuất
import { EstimationConfig, Machine, RushFeeResult, UseProductionTime } from '@/lib/estimation.types';
import { useMemo } from 'react';


export const useProductionTime = (): UseProductionTime => {
    // Helper function để so khớp tên công đoạn
    const getProcessMatch = (processCode: string, machineName: string): boolean => {
        const machineNameUpper = machineName.toUpperCase();

        const mapping: { [key: string]: boolean } = {
            'IN': machineNameUpper.includes('IN'),
            'BE': machineNameUpper.includes('BẾ') || machineNameUpper.includes('BE'),
            'BOI': machineNameUpper.includes('BỒI') || machineNameUpper.includes('BOI'),
            'PHU': machineNameUpper.includes('PHỦ') || machineNameUpper.includes('PHU'),
            'CAN_MANG': machineNameUpper.includes('CÁN') || machineNameUpper.includes('CAN'),
            'DAN': machineNameUpper.includes('DÁN') || machineNameUpper.includes('DAN'),
            'DUT': machineNameUpper.includes('DỨT') || machineNameUpper.includes('DUT'),
            'RALO': machineNameUpper.includes('RALO'),
            'CAT': machineNameUpper.includes('CẮT') || machineNameUpper.includes('CAT'),
            'DOT': machineNameUpper.includes('ĐỘT') || machineNameUpper.includes('DOT')
        };

        return mapping[processCode] || false;
    };

    // Tính số ngày sản xuất
    const calculateProductionDays = (
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
            if (['IN', 'PHU', 'CAN_MANG', 'BOI', 'BE', 'RALO', 'CAT'].includes(normalizedCode)) {
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

    // Tính phí gấp
    const calculateRushFee = (
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

        const rushThreshold = config?.rush_threshold_days || 1;
        if (daysEarly < rushThreshold) {
            return {
                isRush: false,
                daysEarly,
                rushPercent: 0,
                rushAmount: 0
            };
        }

        let rushPercent: number;
        const rushRules = config?.rush_percent_by_days_early || {
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

    return {
        calculateProductionDays,
        calculateRushFee
    };
};