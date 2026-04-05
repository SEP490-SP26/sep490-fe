import { useState, useEffect, useCallback } from 'react';
import {
  UseEstimationConfig,
  WasteRules,
  ProcessCosts,
  DesignConfig,
  Material,
  Machine,
  EstimationConfig,
  PlatePriceConfig
} from '@/lib/estimation.types';
import { estimatesApi } from '@/apiRequests/estimates';
import { materialsApi } from '@/apiRequests/materials';
import { machineApi } from '@/apiRequests/machine';

const normalizeWasteRules = (apiRules: any): WasteRules => {
  return {
    Printing: {
      ...(apiRules?.printing?.by_product_type || {}),
      default: apiRules?.printing?.default ?? 200,
      per_plate: apiRules?.printing?.per_plate ?? 10
    },
    DieCutting: {
      '<5000': apiRules?.dieCutting?.lt_5000 ?? 20,
      '5000-20000': apiRules?.dieCutting?.lt_20000 ?? 30,
      '>=20000': apiRules?.dieCutting?.ge_20000 ?? 40
    },
    Mounting: {
      '<5000': apiRules?.mounting?.lt_5000 ?? 20,
      '5000-20000': apiRules?.mounting?.lt_20000 ?? 30,
      '>=20000': apiRules?.mounting?.ge_20000 ?? 40
    },
    Coating: {
      '<10000': apiRules?.coating?.keo_dau_lt_10000 ?? 20,
      '>=10000': apiRules?.coating?.keo_dau_ge_10000 ?? 30
    },
    Lamination: {
      '<10000': apiRules?.lamination?.lt_10000 ?? 20,
      '>=10000': apiRules?.lamination?.ge_10000 ?? 30
    },
    Gluing: {
      '<100': apiRules?.gluing?.lt_100 ?? 10,
      '100-500': apiRules?.gluing?.lt_500 ?? 15,
      '500-2000': apiRules?.gluing?.lt_2000 ?? 20,
      '>=2000': apiRules?.gluing?.ge_2000 ?? 25
    }
  };
};

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

      const [baseConfigRes, materialsRes, machinesRes] = await Promise.all([
        estimatesApi.getBaseConfig(),
        materialsApi.getAll(),
        machineApi.getAllMachine()
      ]);

      const baseConfig = baseConfigRes as unknown as EstimationConfig;

      if (baseConfig) {
        setWasteRules(normalizeWasteRules(baseConfig.wasteRules));

        if (baseConfig.design && baseConfig.systemParameters) {
          setDesignConfig({
            default_design_cost: baseConfig.design.default_design_cost,
            rush_percent_by_days_early: {
              '1': baseConfig.systemParameters.rush_percent_by_days_early?.['1'] ?? 5,
              '2-3':
                baseConfig.systemParameters.rush_percent_by_days_early?.['2'] ??
                baseConfig.systemParameters.rush_percent_by_days_early?.['3'] ??
                20,
              '>=4':
                baseConfig.systemParameters.rush_percent_by_days_early?.['4'] ??
                40
            }
          });
        }

        if (baseConfig.systemParameters) {
          setSystemParameters(baseConfig.systemParameters);
        }
      }

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

      setMaterials(Array.isArray(materialsRes) ? materialsRes : (materialsRes as any)?.data || []);
      setMachines(Array.isArray(machinesRes) ? machinesRes : (machinesRes as any)?.data || []);

      setLoading(false);
    } catch (error: any) {
      setError(error.message || 'Failed to load configuration');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const getMaterialById = useCallback((materialId: string | number): Material | undefined => {
    return materials.find(m => (m as any).id === materialId || m.material_id === materialId);
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
