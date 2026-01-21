// Hook lấy và quản lý config
import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosResponse } from 'axios';
import { UseEstimationConfig, WasteRules, ProcessCosts, DesignConfig, Material, Machine } from '@/lib/estimation.types';


interface ApiResponse<T> {
    data: T;
    status: number;
    message?: string;
}

export const useEstimationConfig = (): UseEstimationConfig => {
    const [wasteRules, setWasteRules] = useState<WasteRules | null>(null);
    const [processCosts, setProcessCosts] = useState<ProcessCosts | null>(null);
    const [designConfig, setDesignConfig] = useState<DesignConfig | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            // Gọi API để lấy config
            const [wasteResponse, processCostResponse, materialsResponse, machinesResponse] = await Promise.all<
                [
                    Promise<AxiosResponse<ApiResponse<WasteRules>>>,
                    Promise<AxiosResponse<ApiResponse<ProcessCosts>>>,
                    Promise<AxiosResponse<ApiResponse<Material[]>>>,
                    Promise<AxiosResponse<ApiResponse<Machine[]>>>
                ]
            >([
                axios.get<ApiResponse<WasteRules>>('/api/estimate/base-config'),
                axios.get<ApiResponse<ProcessCosts>>('/api/ProcessCostRules/get-all-process-cost-rules'),
                axios.get<ApiResponse<Material[]>>('/api/Materials/get-all-material'),
                axios.get<ApiResponse<Machine[]>>('/api/machines') // Cần tạo API này
            ]);

            const defaultDesignConfig: DesignConfig = {
                default_design_cost: 200000,
                rush_percent_by_days_early: {
                    '1': 5,
                    '2-3': 20,
                    '>=4': 40
                }
            };

            setWasteRules(wasteResponse.data.data);
            setProcessCosts(processCostResponse.data.data);
            setDesignConfig(defaultDesignConfig);
            setMaterials(materialsResponse.data.data || []);
            setMachines(machinesResponse.data.data || []);
            setLoading(false);
        } catch (error: any) {
            console.error('Error fetching estimation config:', error);

            // Set default values in case of error
            const defaultWasteRules: WasteRules = {
                Printing: {
                    default: 200,
                    per_plate: 10
                },
                DieCutting: {
                    '<5000': 20,
                    '5000-20000': 30,
                    '>=20000': 40
                },
                Mounting: {
                    '<5000': 20,
                    '5000-20000': 30,
                    '>=20000': 40
                },
                Coating: {
                    '<10000': 20,
                    '>=10000': 30
                },
                Lamination: {
                    '<10000': 20,
                    '>=10000': 30
                },
                Gluing: {
                    '<100': 10,
                    '100-500': 15,
                    '500-2000': 20,
                    '>=2000': 25
                }
            };

            setWasteRules(defaultWasteRules);
            setProcessCosts({});
            setDesignConfig({
                default_design_cost: 200000,
                rush_percent_by_days_early: {
                    '1': 5,
                    '2-3': 20,
                    '>=4': 40
                }
            });
            setMaterials([]);
            setMachines([]);
            setError(error.message || 'Failed to load configuration');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const getMaterialById = useCallback((materialId: string | number): Material | undefined => {
        return materials.find(m => m.id === materialId);
    }, [materials]);

    const getMaterialByCode = useCallback((paperCode: string): Material | undefined => {
        return materials.find(m => m.code === paperCode);
    }, [materials]);

    return {
        wasteRules,
        processCosts,
        designConfig,
        materials,
        machines,
        loading,
        error,
        getMaterialById,
        getMaterialByCode,
        refreshConfig: fetchConfig
    };
};