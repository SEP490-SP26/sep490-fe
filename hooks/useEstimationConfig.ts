import { useState, useEffect, useCallback } from 'react';
import { UseEstimationConfig, WasteRules, ProcessCosts, DesignConfig, Material, Machine, EstimationConfig, PlatePriceConfig } from '@/lib/estimation.types';
import { estimatesApi } from '@/apiRequests/estimates';
import { materialsApi } from '@/apiRequests/materials';
import { machineApi } from '@/apiRequests/machine';

export const useEstimationConfig = (): UseEstimationConfig => {
    const [wasteRules, setWasteRules] = useState<WasteRules | null>(null);
    const [processCosts, setProcessCosts] = useState<ProcessCosts | null>(null);
    const [designConfig, setDesignConfig] = useState<DesignConfig | null>(null);
    const [systemParameters, setSystemParameters] = useState<any | null>(null);
    const [platePrices, setPlatePrices] = useState<PlatePriceConfig | null>(null);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [machines, setMachines] = useState<Machine[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            // Gọi API để lấy config
            const [baseConfigRes, materialsRes, machinesRes] = await Promise.all([
                estimatesApi.getBaseConfig(),
                materialsApi.getAll(),
                machineApi.getAllMachine()
            ]);

            // Xử lý base config (Waste Rules & Design Config)
            // estimatesApi.getBaseConfig trả về EstimationConfig hoặc payload chứa nó.
            // Giả sử apiRequests trả về data trực tiếp (theo httpAxios)
            const baseConfig = baseConfigRes as unknown as EstimationConfig; // Cast để đảm bảo type

            if (baseConfig) {
                setWasteRules(baseConfig.wasteRules || null);

                // Construct DesignConfig from system parameters if available
                if (baseConfig.design && baseConfig.systemParameters) {
                    setDesignConfig({
                        default_design_cost: baseConfig.design.default_design_cost,
                        rush_percent_by_days_early: baseConfig.systemParameters.rush_percent_by_days_early
                    });
                } else if (baseConfig.design) {
                    // Fallback for rush percent
                    setDesignConfig({
                        default_design_cost: baseConfig.design.default_design_cost,
                        rush_percent_by_days_early: {
                            '1': 5,
                            '2-3': 20,
                            '>=4': 40
                        }
                    });
                } else {
                    // Fallback hardcoded if missing
                    setDesignConfig({
                        default_design_cost: 200000,
                        rush_percent_by_days_early: {
                            '1': 5,
                            '2-3': 20,
                            '>=4': 40
                        }
                    });
                }

                // Nếu baseConfig có chứa processCosts, ưu tiên sử dụng nó, 
                // nhưng logic cũ tách biệt nên ta xem xét processCostsRes

                // Get system parameters
                if (baseConfig.systemParameters) {
                    setSystemParameters(baseConfig.systemParameters);
                }
            }

            // Xử lý Process Costs
            let costsMap: ProcessCosts = {};
            if (baseConfig?.processCosts?.by_process) {
                const byProcess = baseConfig.processCosts.by_process;
                Object.keys(byProcess).forEach(code => {
                    costsMap[code] = {
                        process_code: code,
                        process_name: code,
                        unit_price: byProcess[code].unit_price,
                        unit: byProcess[code].unit,
                        note: byProcess[code].note || ''
                    };
                });
            }
            setProcessCosts(costsMap);

            if (baseConfig?.platePrices) {
                setPlatePrices(baseConfig.platePrices);
            }

            // Materials & Machines
            // materialsRes (any[] or object with data property?)
            // httpAxios typically returns the data. 
            // materialsApi.getAll() -> Material[]
            const matList = Array.isArray(materialsRes) ? materialsRes : (materialsRes as any)?.data || [];
            setMaterials(matList);

            const macList = Array.isArray(machinesRes) ? machinesRes : (machinesRes as any)?.data || [];
            setMachines(macList);

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
            setSystemParameters(null);
            setPlatePrices(null);
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
        return materials.find(m => m.id === materialId || m.material_id === materialId);
    }, [materials]);

    const getMaterialByCode = useCallback((paperCode: string): Material | undefined => {
        return materials.find(m => m.code === paperCode);
    }, [materials]);

    return {
        wasteRules,
        processCosts,
        designConfig,
        systemParameters,
        platePrices,
        materials,
        machines,
        loading,
        error,
        getMaterialById,
        getMaterialByCode,
        refreshConfig: fetchConfig
    };
};
