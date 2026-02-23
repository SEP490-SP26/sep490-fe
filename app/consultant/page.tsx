"use client";

import { estimatesApi } from "@/apiRequests/estimates";
import { machineApi } from "@/apiRequests/machine";
import { materialsApi } from "@/apiRequests/materials";
import { productionsApi } from "@/apiRequests/productions";
import { Product, productsApi } from "@/apiRequests/products";
import { productTypesApi } from "@/apiRequests/producttypes";
import { requestOrderApi } from "@/apiRequests/request";
import { uploadApi } from "@/apiRequests/uploads";
import { Order, ProductTemplate, useProduction } from "@/context/ProductionContext";
import { useEstimationCalculator } from "@/hooks/useEstimationCalculator";
import { useEstimationConfig } from "@/hooks/useEstimationConfig";
import { EstimationInputs } from "@/lib/estimation.types";
import {
  CreateRequestBody,
  CreateRequestBodyForConsultant,
  EstimateCostResponse,
  EstimatePaperResponse,
  FreeMachine,
  MachineCapacity,
  Material,
  ProductType,
  UpdateRequestBody,
} from "@/schemaValidations/common.schema";
import {
  CodeSandboxOutlined,
  DashboardOutlined,
  FileTextOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  message,
  Progress,
  Row,
  Tabs,
  Upload,
  Modal,
} from "antd";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import CustomerInfoSection from "./components/CustomerInfoSection";
import DesignUploadSection from "./components/DesignUploadSection";
import EstimatesCard from "./components/EstimatesCard";
import FactoryOrdersModal from "./components/FactoryOrdersModal";
import ProductSpecsSection from "./components/ProductSpecsSection";
import {
  calculateProductionTime,
  getEstimatedFreeDate,
  mapToOrderEstimationResult,
} from "./utils/consultant-logic";



const PROCESS_TYPE_LABELS: Record<string, string> = {
  IN: "In",
  RALO: "Ra Lô",
  CAT: "Cắt",
  BOI: "Bồi",
  PHU: "Phủ",
  CAN: "Cán màng",
  BE: "Bế/Dứt",
  DUT: "Dứt",
  DAN: "Dán",
  DOT: "Đột",
};

function ConsultantForm() {
  const [form] = Form.useForm();
  const {
    orders,
    isBusy,
  } = useProduction();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const modeParam = searchParams.get("mode");
  const [loading, setLoading] = useState(false);

  const [isSavingCost, setIsSavingCost] = useState(false);

  const existingOrder = orderId
    ? orders.find((o) => o.order_id === orderId)
    : null;
  const isNegotiateMode =
    modeParam === "negotiate" ||
    existingOrder?.process_status === "pending_consultant" ||
    existingOrder?.process_status === "waiting_customer_confirm" ||
    (!orderId && !modeParam);
  const isCreateMode =
    modeParam === "create" ||
    existingOrder?.process_status === "pending_order_creation";

  // State
  const [designFilePath, setDesignFilePath] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]); // Store full product list
  const [productSuggestions, setProductSuggestions] = useState<string[]>([]);
  const [isSendDesign, setIsSendDesign] = useState<boolean>(true);
  const [paperTypes, setPaperTypes] = useState<
    { code: string; name: string; stock: number; value: string }[]
  >([]);
  const [loadingPaperTypes, setLoadingPaperTypes] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(false);
  const [formTypes, setFormTypes] = useState<string[]>([]);
  const [loadingFormTypes, setLoadingFormTypes] = useState(false);
  const [selectedProductTypeCode, setSelectedProductTypeCode] = useState<string>("");
  const [selectProductTypeId, setselectProductTypeId] = useState<number>();
  const [processTypes, setProcessTypes] = useState<string[]>([]);
  const [loadingProcessTypes, setLoadingProcessTypes] = useState(false);
  const [songTypes, setSongTypes] = useState<Material[]>([]);
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [factoryOrders, setFactoryOrders] = useState<Order[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

  const [estimate, setEstimate] = useState<{
    baseCost: number;
    rushFee: number;
    daysEarly: number;
    finalCost: number;
    systemDate: string;
    caseType: 1 | 2 | 3;
    paperNeeded: number;
    isStockEnough: boolean;
    productionDays: number;
    effectiveDate: string;
  } | null>(null);

  const [paperEstimate, setPaperEstimate] =
    useState<EstimatePaperResponse | null>(null);
  const [loadingPaperEstimate, setLoadingPaperEstimate] = useState(false);
  const [costEstimate, setCostEstimate] = useState<EstimateCostResponse | null>(null);
  const [loadingCostEstimate, setLoadingCostEstimate] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [machineCapacity, setMachineCapacity] = useState<MachineCapacity | null>(null);
  const [freeMachines, setFreeMachines] = useState<FreeMachine[]>([]);
  const [savedEstimateId, setSavedEstimateId] = useState<number | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [submitValues, setSubmitValues] = useState<any>(null);

  // --- MULTIPLE QUOTES TABS STATE ---
  interface QuoteTab {
    key: string;
    label: string;
    data: any;
    calculations?: {
      estimate: any;
      paperEstimate: any;
      costEstimate: any;
      discountPercent: number;
      estimate_id?: number | null;
    };
  }
  const [quoteTabs, setQuoteTabs] = useState<QuoteTab[]>([
    { key: "1", label: "Báo giá 1", data: {}, calculations: { estimate: null, paperEstimate: null, costEstimate: null, discountPercent: 0 } },
  ]);
  const [activeTabKey, setActiveTabKey] = useState<string>("1");

  // Fields that should be shared across all tabs (not reset/changed when switching)
  const SHARED_FIELDS = [
    "customer_name",
    "customer_phone",
    "customer_email",
    "detail_address",
    // "description", // Note might be specific? Let's keep it specific for now.
    "contract_file", // File upload state might be tricky, but contract is usually 1 per order.
  ];

  const handleTabEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: "add" | "remove"
  ) => {
    if (action === "add") {
      addTab();
    } else {
      removeTab(targetKey as string);
    }
  };

  const addTab = () => {
    // Clone current form values for the new tab
    const currentValues = form.getFieldsValue();
    const currentCalculations = {
      estimate,
      paperEstimate,
      costEstimate,
      discountPercent,
      estimate_id: savedEstimateId,
    };

    // Generate new key
    const newKey = (Date.now()).toString();
    const newLabel = `Báo giá ${quoteTabs.length + 1}`;

    // Save current tab state first
    setQuoteTabs((prev) =>
      prev.map((tab) =>
        tab.key === activeTabKey ? { ...tab, data: currentValues, calculations: currentCalculations } : tab
      )
    );

    const newTab: QuoteTab = {
      key: newKey,
      label: newLabel,
      data: { ...currentValues }, // Start with cloned values
      calculations: { ...currentCalculations }, // Start with cloned calculations
    };

    setQuoteTabs((prev) => [...prev, newTab]);
    setActiveTabKey(newKey);
    // Values are already in form, no need to set
  };

  const removeTab = (targetKey: string) => {
    // Don't remove if it's the last one
    if (quoteTabs.length === 1) {
      message.warning("Phải giữ ít nhất một báo giá!");
      return;
    }

    let newActiveKey = activeTabKey;
    let lastIndex = -1;
    quoteTabs.forEach((item, i) => {
      if (item.key === targetKey) {
        lastIndex = i - 1;
      }
    });

    const newTabs = quoteTabs.filter((item) => item.key !== targetKey);

    if (newTabs.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newTabs[lastIndex].key;
      } else {
        newActiveKey = newTabs[0].key;
      }
    }

    setQuoteTabs(newTabs);

    if (newActiveKey !== activeTabKey) {
      handleTabChange(newActiveKey, newTabs);
    }
  };

  const handleTabChange = (newKey: string, currentTabs = quoteTabs) => {
    // 1. Save current form values to OLD active tab
    const currentValues = form.getFieldsValue();
    const currentCalculations = {
      estimate,
      paperEstimate,
      costEstimate,
      discountPercent,
      estimate_id: savedEstimateId,
    };

    const updatedTabs = currentTabs.map((tab) => {
      if (tab.key === activeTabKey) {
        return { ...tab, data: currentValues, calculations: currentCalculations };
      }
      return tab;
    });

    setQuoteTabs(updatedTabs);
    setActiveTabKey(newKey);

    // 2. Load new values
    const targetTab = updatedTabs.find((t) => t.key === newKey);
    if (targetTab) {
      // Merge shared fields from CURRENT form state into target data
      // This ensures if I edited customer name in Tab 1, it stays in Tab 2
      const sharedValues = SHARED_FIELDS.reduce((acc, field) => {
        acc[field] = currentValues[field];
        return acc;
      }, {} as any);

      const nextValues = { ...targetTab.data, ...sharedValues };

      form.setFieldsValue(nextValues);

      // Restore calculations
      if (targetTab.calculations) {
        setEstimate(targetTab.calculations.estimate);
        setPaperEstimate(targetTab.calculations.paperEstimate);
        setCostEstimate(targetTab.calculations.costEstimate);
        setDiscountPercent(targetTab.calculations.discountPercent);
        setSavedEstimateId(targetTab.calculations.estimate_id || null);
      } else {
        setEstimate(null);
        setPaperEstimate(null);
        setCostEstimate(null);
        setDiscountPercent(0);
        setSavedEstimateId(null);

        // Force calculation if needed
        setTimeout(() => {
          calculateEstimates();
        }, 100);
      }

      // Trigger logic to update detailed states (like selectedProductTypeCode) based on new values
      // We manually call handleFormValuesChange-like logic or just wait for effects?
      // Effects like `syncProductTypeFromName` depend on form.getFieldValue or dependencies. 
      // We should manually trigger critical updates.

      // Update local states that control rendering (like isOneSideBox, glueTab visibilty etc)
      // These are usually derived from form values in render, but some might be state.

      // Force calculation
      setTimeout(() => {
        // Also ensure product type code state is synced
        const pType = nextValues.product_type;
        if (pType) {
          const selected = productTypes.find(pt => pt.product_type_id === pType);
          if (selected) {
            setSelectedProductTypeCode(selected.code);
            setselectProductTypeId(selected.product_type_id);
          }
        }
      }, 100);
    }
  };

  const totalMachines = machineCapacity?.totalMachines || 8;
  const runningMachines = machineCapacity?.runningMachines || 0;

  const isWorkshopFull = runningMachines >= totalMachines * 0.9;
  const workshopFreeInfo = getEstimatedFreeDate(orders);
  const daysUntilFree = workshopFreeInfo.days;

  // --- CLIENT SIDE CALCULATION HOOKS ---
  const { calculateAll } = useEstimationCalculator();
  const {
    wasteRules,
    processCosts,
    designConfig,
    systemParameters,
    materials,
    machines,
    loading: configLoading
  } = useEstimationConfig();

  const createRequestOrder = useMutation({
    mutationFn: async (form: CreateRequestBody) => {
      const res = await requestOrderApi.createRequestOrderByCustomer(form);
      return res.data;
    },
  });

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchData = async () => {
      // Paper Types
      setLoadingPaperTypes(true);
      try {
        const response = await materialsApi.getAllPaperTypes();
        if (response?.paperTypes && Array.isArray(response.paperTypes)) {
          setPaperTypes(
            response.paperTypes.map((pt: any) => ({
              code: pt.code,
              name: pt.name,
              stock: pt.stockQty || 0, // Ensure stock is mapped
              value: pt.code, // For easier finding
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching paper types:", error);
      } finally {
        setLoadingPaperTypes(false);
      }

      // Product Types
      setLoadingProductTypes(true);
      try {
        const response = await productTypesApi.getAll();
        if (Array.isArray(response)) {
          setProductTypes(response.filter((pt) => pt.is_active));
        }
      } catch (error) {
        console.error("Error fetching product types:", error);
      } finally {
        setLoadingProductTypes(false);
      }

      // Form Types
      setLoadingFormTypes(true);
      try {
        const [hopMauResponse, gachResponse] = await Promise.all([
          productTypesApi.getAllFormTypeOfHopMau(),
          productTypesApi.getAllTypeOfGach(),
        ]);
        const allFormTypes = [
          ...(Array.isArray(hopMauResponse) ? hopMauResponse : []),
          ...(Array.isArray(gachResponse) ? gachResponse : []),
        ];
        setFormTypes(allFormTypes);
      } catch (error) {
        console.error("Error fetching form types:", error);
      } finally {
        setLoadingFormTypes(false);
      }

      // Machine Data
      try {
        const [capacityRes, freeRes] = await Promise.all([
          machineApi.getCapacity(),
          machineApi.getFreeMachines(),
        ]);
        if (capacityRes) setMachineCapacity(capacityRes);
        if (Array.isArray(freeRes)) setFreeMachines(freeRes);
      } catch (error) {
        console.error("Error fetching machine data:", error);
      }

      // Process Types
      setLoadingProcessTypes(true);
      try {
        const response = await productionsApi.getAllProcessTypes();
        if (Array.isArray(response)) setProcessTypes(response);
      } catch (error) {
        console.error("Error fetching process types:", error);
      } finally {
        setLoadingProcessTypes(false);
      }

      // Song Types
      try {
        const response = await materialsApi.getSongTypes();
        if (Array.isArray(response)) setSongTypes(response);
      } catch (error) {
        console.error("Error fetching song types:", error);
      }

      // Product Suggestions
      try {
        const res: any = await productsApi.getAllProducts();
        if (Array.isArray(res)) {
          setProducts(res);
          setProductSuggestions(res.map((p: any) => p.name));
        } else if (res?.data && Array.isArray(res.data)) {
          setProducts(res.data);
          setProductSuggestions(res.data.map((p: any) => p.name));
        }
      } catch (error) {
        console.error("Error fetching product suggestions:", error);
      }
    };

    fetchData();
  }, []);

  // --- SYNC PRODUCT TYPE ---
  const syncProductTypeFromName = () => {
    const productName = form.getFieldValue("product_name");
    if (!productName || products.length === 0 || productTypes.length === 0) return;

    const currentTypeId = form.getFieldValue("product_type");
    // Find product by name
    const product = products.find((p) => p.name === productName);

    if (product && product.product_type_id) {
      // Only update if not already set or different (prioritize name match in negotiate/load)
      if (currentTypeId !== product.product_type_id) {
        form.setFieldValue("product_type", product.product_type_id);

        // Sync local state for type
        const selectedType = productTypes.find(pt => pt.product_type_id === product.product_type_id);
        if (selectedType) {
          setSelectedProductTypeCode(selectedType.code);
          setselectProductTypeId(selectedType.product_type_id);
        }
      }
    }
  };

  // Trigger sync when dependencies change (data loaded)
  useEffect(() => {
    syncProductTypeFromName();
  }, [products, productTypes]);

  // --- AUTO FILL DATA ---
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!orderId) return;

      try {
        const response = await requestOrderApi.getDetail(orderId);
        const orderData = response?.data || response;

        if (orderData) {
          form.setFieldsValue({
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_email: orderData.customer_email,
            product_name: orderData.product_name,
            quantity: orderData.quantity,
            delivery_date: orderData.delivery_date
              ? dayjs(orderData.delivery_date)
              : null,
            detail_address: orderData.detail_address,
            description: orderData.description,
            number_of_plates: orderData.number_of_plates || 1,
            coating_type:
              orderData.coating_type && orderData.coating_type !== "NONE"
                ? orderData.coating_type
                : "KEO_NUOC",
            // Add dimensions and paper code if available
            length: orderData.product_length_mm,
            width: orderData.product_width_mm,
            height: orderData.product_height_mm,
            paper_code: orderData.paper_code,
            paper_name: orderData.paper_name, // Store paper_name to detect if custom paper was requested
          });

          if (orderData.design_file_path) {
            setDesignFilePath(orderData.design_file_path);
          }
          if (orderData.is_send_design !== undefined) {
            setIsSendDesign(orderData.is_send_design);
          }

          const values = form.getFieldsValue();
          handleCalculate(values, values);
          setTimeout(() => calculateEstimates(), 500);
        }

        // Trigger sync after setting form values
        syncProductTypeFromName();
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    fetchOrderDetails();
  }, [orderId, form, products, productTypes, materials, configLoading]);



  // --- CALCULATION LOGIC ---
  const handleCalculate = (changedValues: any, allValues: any) => {
    const { quantity, paper_code, delivery_date } = allValues;

    if ("final_price" in changedValues) return;
    if (!quantity) return;

    const result = calculateProductionTime(
      quantity,
      paper_code,
      paperTypes,
      isWorkshopFull,
      daysUntilFree,
      delivery_date,
      isBusy
    );

    if (!orderId && "quantity" in changedValues && !delivery_date) {
      form.setFieldValue("delivery_date", dayjs(result.systemDate));
    }

    // Prevent overwriting the detailed 'final_price' with the basic cost placeholder
    // form.setFieldValue("final_price", result.finalCost);

    setEstimate(result);
  };

  const { data: productTempalte } = useQuery<ProductTemplate[]>({
    queryKey: ["product-tempalte", selectProductTypeId],
    queryFn: async () => {
      if (!selectProductTypeId) return null;
      return await productTypesApi.getProductTemplete(selectProductTypeId);
    },
    enabled: !!selectProductTypeId,
  });

  useEffect(() => {
    if (productTempalte && productTempalte.length > 0) {
      const profile = productTempalte[0];
      const currentValues = form.getFieldsValue(true); // Get current form values including hidden

      const newValues = {
        // Only set paper_code if NOT already set OR if paper_name is empty (meaning no custom paper)
        paper_code: (currentValues.paper_code || currentValues.paper_name) ? currentValues.paper_code : profile.paper_code,

        // Only set dimensions if NOT already set
        length: currentValues.length ? currentValues.length : profile.product_length_mm,
        width: currentValues.width ? currentValues.width : profile.product_width_mm,
        height: currentValues.height ? currentValues.height : profile.product_height_mm,
        number_of_plates: profile.number_of_plates,
        coating_type: profile.coating_type,
        wave_type: profile.wave_type,
        glue_tab: profile.glue_tab_mm,
        is_one_side_box: profile.is_one_side_box,
        print_width: profile.print_width_mm,
        print_height: profile.print_height_mm,
        production_processes: profile.production_processes ? profile.production_processes.split(",") : [],
        bleed: profile.bleed_mm,
        default_quantity: profile.default_quantity,
        // quantity: profile.default_quantity,
        ...(selectedProductTypeCode === "HOP_MAU" && {
          glueTab: profile.glue_tab_mm,
          isOneSideBox: profile.is_one_side_box,
        }),
      };
      form.setFieldsValue(newValues);
      setTimeout(() => calculateEstimates(), 500);
    }
  }, [productTempalte, form, selectedProductTypeCode]);

  // Sync selectedProductTypeCode when productTypes are loaded (in case product was selected before types loaded)
  useEffect(() => {
    const currentProductTypeId = form.getFieldValue("product_type");
    if (currentProductTypeId && productTypes.length > 0) {
      const selected = productTypes.find(pt => pt.product_type_id === currentProductTypeId);
      if (selected && selected.code !== selectedProductTypeCode) {
        setSelectedProductTypeCode(selected.code);
        setselectProductTypeId(selected.product_type_id);
      }
    }
  }, [productTypes]);


  function calculateEstimates() {
    const values = form.getFieldsValue();
    const {
      paper_code,
      quantity,
      length,
      width,
      height,
      product_type,
      production_processes,
      number_of_plates,
      coating_type,
      form_product,
      is_one_side_box,
      glue_tab,
      wave_type
    } = values;

    if (!paper_code || !quantity || !length || !width || !height || !product_type || configLoading) {
      return;
    }

    // const paperCode = paper_code as string;
    const selectedProductType = productTypes.find(
      (pt) => pt.product_type_id === product_type
    );
    const productTypeCode = selectedProductType?.code || "";

    // Find material for sheet size
    const selectedMaterial = materials.find(m => m.code === paper_code);
    if (!selectedMaterial) return;

    try {
      const inputs: EstimationInputs = {
        paper_code,
        sheet_width_mm: selectedMaterial.sheet_width_mm || 0,
        sheet_height_mm: selectedMaterial.sheet_height_mm || 0,
        quantity,
        length_mm: length,
        width_mm: width,
        height_mm: height,
        glue_tab_mm: glue_tab,
        bleed_mm: 5,
        product_type: productTypeCode,
        form_product: form_product || "",
        is_one_side_box,
        production_processes: Array.isArray(production_processes) ? production_processes.join(",") : (production_processes || ""),
        coating_type: coating_type || "KEO_NUOC",
        wave_type,
        number_of_plates: number_of_plates || 1,

        // Configs
        wasteRules: wasteRules || undefined,
        processCosts: processCosts || undefined,
        designConfig: designConfig || undefined,
        materials,
        machines,

        desired_delivery_date: values.delivery_date ? dayjs(values.delivery_date).toDate() : new Date(),
        discount_percent: discountPercent,
        is_send_design: isSendDesign,
        has_design_file: !!designFilePath
      };

      const result = calculateAll(inputs, {
        systemParameters: {
          overhead_percent: systemParameters?.overhead_percent || 10,
          default_production_days: systemParameters?.default_production_days || 5,
          vat_percent: systemParameters?.vat_percent || 10,
          rush_threshold_days: systemParameters?.rush_threshold_days || 1,
          rush_percent_by_days_early: systemParameters?.rush_percent_by_days_early || {}
        }
      });

      // Map Map result to PaperEstimate (EstimatePaperResponse)
      setPaperEstimate({
        paper_code: inputs.paper_code,
        sheet_width_mm: inputs.sheet_width_mm,
        sheet_height_mm: inputs.sheet_height_mm,
        print_width_mm: result.printSize.print_width_mm,
        print_height_mm: result.printSize.print_height_mm,
        n_up: result.nUp,
        quantity: inputs.quantity,
        sheets_base: result.sheetsBase,
        waste_printing: result.waste.wastes.printing,
        waste_die_cutting: result.waste.wastes.dieCutting,
        waste_mounting: result.waste.wastes.mounting,
        waste_coating: result.waste.wastes.coating,
        waste_lamination: result.waste.wastes.lamination,
        waste_gluing: result.waste.wastes.gluing,
        total_waste: result.waste.totalWaste,
        sheets_with_waste: result.waste.sheetsWithWaste,
        waste_percent: result.waste.wastePercent,
        warning_message: ""
      });

      // Map result to CostEstimate (EstimateCostResponse)
      setCostEstimate({
        cost: {
          // Paper
          paper_cost: result.costs.material.paper,
          paper_sheets_used: result.waste.sheetsWithWaste,
          paper_unit_price: selectedMaterial.cost_price || 0,

          // Ink
          ink_cost: result.costs.material.ink.cost,
          ink_weight_kg: result.costs.material.ink.weight,
          ink_rate_per_m2: result.costs.material.ink.rate,
          ink_unit_price: result.costs.material.ink.unitPrice,

          // Coating
          coating_glue_cost: result.costs.material.coatingGlue.cost,
          coating_glue_weight_kg: result.costs.material.coatingGlue.weight,
          coating_glue_rate_per_m2: result.costs.material.coatingGlue.rate,
          coating_glue_unit_price: result.costs.material.coatingGlue.unitPrice,
          coating_type: inputs.coating_type || "KEO_NUOC",

          // Mounting
          mounting_glue_cost: result.costs.material.mountingGlue.cost,
          mounting_glue_weight_kg: result.costs.material.mountingGlue.weight,
          mounting_glue_rate_per_m2: result.costs.material.mountingGlue.rate,
          mounting_glue_unit_price: result.costs.material.mountingGlue.unitPrice,

          // Lamination
          lamination_cost: result.costs.material.lamination.cost,
          lamination_weight_kg: result.costs.material.lamination.weight,
          lamination_rate_per_m2: result.costs.material.lamination.rate,
          lamination_unit_price: result.costs.material.lamination.unitPrice,

          // Totals
          material_cost: result.costs.material.total,
          overhead_percent: systemParameters?.vat_percent || 10,
          overhead_cost: result.costs.overhead,
          base_cost: result.costs.base,
          final_total_cost: result.totals.finalTotalCost,

          // Rush
          rush_amount: result.production.rush.rushAmount,
          rush_percent: result.production.rush.rushPercent,
          is_rush: result.production.rush.isRush,
          days_early: result.production.rush.daysEarly,

          // Discount
          subtotal: result.totals.subtotal,
          discount_percent: discountPercent,
          discount_amount: result.discount.amount,

          // Misc
          total_area_m2: result.printArea.total,
          design_cost: result.costs.design,
          material_cost_details: [],

          estimated_finish_date: (() => {
            const date = new Date();
            date.setDate(date.getDate() + result.production.days);
            return date.toISOString();
          })()
        },
        process_cost: {
          order_request_id: orderId ? parseInt(orderId) : 0,
          total_cost: result.costs.process,
          details: result.costs.processDetails
        }
      });

      form.setFieldValue("final_price", Math.round(result.totals.finalTotalCost));

    } catch (err) {
      console.error("Calculation error", err);
    }
  }

  // Debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    handleCalculate(changedValues, allValues);

    const relevantFields = [
      "paper_code", "quantity", "length", "width", "height",
      "product_type", "production_processes", "wave_type",
      "number_of_plates", "coating_type", "delivery_date",
      "form_product", "is_one_side_box", "glue_tab", "bleed"
    ];
    const hasRelevantChange = Object.keys(changedValues).some((key) =>
      relevantFields.includes(key)
    );

    if (hasRelevantChange) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        calculateEstimates();
      }, 800);
    }

    if (changedValues.product_name) {
      const selectedProduct = products.find(p => p.name === changedValues.product_name);
      if (selectedProduct && selectedProduct.product_type_id) {
        form.setFieldValue("product_type", selectedProduct.product_type_id);

        // Trigger logic for product_type change
        const selectedType = productTypes.find(pt => pt.product_type_id === selectedProduct.product_type_id);
        setSelectedProductTypeCode(selectedType?.code || "");
        setselectProductTypeId(selectedType?.product_type_id);
      }
    }

    if (changedValues.product_type) {
      const selected = productTypes.find(pt => pt.product_type_id === changedValues.product_type);
      setSelectedProductTypeCode(selected?.code || "");
      setselectProductTypeId(selected?.product_type_id);
    }
  };

  useEffect(() => {
    if (form.getFieldValue("paper_code") && form.getFieldValue("quantity")) {
      calculateEstimates();
    }
  }, [isSendDesign, configLoading, discountPercent]);

  // Reset saved ID when estimate changes
  useEffect(() => {
    setSavedEstimateId(null);
  }, [costEstimate, paperEstimate]);

  const onFinish = async (values: any) => {
    // 1. Update the CURRENT active tab with the latest values & calculations locally
    // (We don't need to force setQuoteTabs state update if we just want to submit current data)
    const currentCalculations = {
      estimate,
      paperEstimate,
      costEstimate,
      discountPercent,
    };

    // 2. Consolodate all data
    const allQuotes = quoteTabs.map((tab) => {
      if (tab.key === activeTabKey) {
        return {
          ...tab.data, // Form values (which is 'values' arg)
          ...values, // Ensure we have latest form values
          key: tab.key,
          label: tab.label,
          calculations: currentCalculations
        };
      }
      return {
        ...tab.data,
        key: tab.key,
        label: tab.label,
        calculations: {
          ...tab.calculations,
          estimate_id: tab.key === activeTabKey ? savedEstimateId : tab.calculations?.estimate_id
        }
      };
    });

    setSubmitValues(allQuotes);
    setIsReviewModalOpen(true);
  };

  const handleConfirmSend = async () => {
    const quotes = submitValues;
    if (!quotes || !Array.isArray(quotes) || quotes.length === 0) return;

    setIsReviewModalOpen(false);
    setLoading(true);

    // Pick the first quote as "Primary" for request-level info
    const primaryQuote = quotes[0];

    try {
      let currentOrderId = orderId || createdOrderId?.toString();

      // 1. CREATE REQUEST if doesn't exist
      if (!currentOrderId) {
        try {
          const payload: CreateRequestBodyForConsultant = {
            customer_name: primaryQuote.customer_name,
            customer_phone: primaryQuote.customer_phone,
            customer_email: primaryQuote.customer_email,
            detail_address: primaryQuote.detail_address,
          };

          const res: any = await requestOrderApi.createRequestOrderByConsultant(payload);
          const newId = res?.order_request_id || res?.data?.order_request_id; // Check both structures

          if (newId) {
            setCreatedOrderId(newId);
            currentOrderId = newId.toString();
          } else {
            throw new Error("Không thể tạo ID đơn hàng mới");
          }
        } catch (error) {
          console.error("Error creating new order:", error);
          message.error("Lỗi khi tạo đơn hàng mới");
          setLoading(false);
          return;
        }
      }

      // If we still don't have an ID, abort
      if (!currentOrderId) {
        setLoading(false);
        return;
      }

      // 2. UPLOAD FILES (Shared)
      let finalDesignPath = designFilePath || "";
      const newFiles = fileList
        .map((f) => f.originFileObj || f)
        .filter((f) => f);

      if (newFiles.length > 0) {
        try {
          message.loading({ content: "Đang tải file lên...", key: "uploading" });
          const uploadRes: any = await uploadApi.uploadFile(newFiles);
          let newUrls: string[] = [];

          // Handle various response data structures
          if (Array.isArray(uploadRes)) {
            newUrls = uploadRes.map((r: any) => r.url).filter((u: any) => u);
          } else if (uploadRes?.data && Array.isArray(uploadRes.data)) {
            newUrls = uploadRes.data.map((r: any) => r.url).filter((u: any) => u);
          } else if (uploadRes?.url) {
            newUrls = [uploadRes.url];
          }

          if (newUrls.length > 0) {
            const currentUrls = finalDesignPath ? finalDesignPath.split(",") : [];
            finalDesignPath = [...currentUrls, ...newUrls].join(",");
            message.success({ content: "Tải file thành công!", key: "uploading" });
          }
        } catch (uploadErr) {
          console.error("Upload failed", uploadErr);
          message.error({ content: "Lỗi tải file, đơn hàng sẽ được lưu không kèm file mới.", key: "uploading" });
        }
      }

      // 3. UPDATE REQUEST (Primary Info)
      // We update the request with details from the Primary Quote to ensure basic fields are filled
      if (isNegotiateMode) {
        try {
          const selectedProductType = productTypes.find((pt) => pt.product_type_id === primaryQuote.product_type);
          const updateBody: Partial<UpdateRequestBody> = {
            customer_name: primaryQuote.customer_name,
            customer_phone: primaryQuote.customer_phone,
            customer_email: primaryQuote.customer_email,
            detail_address: primaryQuote.detail_address,
            product_name: primaryQuote.product_name,
            quantity: primaryQuote.quantity, // Primary Quantity
            description: primaryQuote.description || "",
            delivery_date: primaryQuote.delivery_date ? dayjs(primaryQuote.delivery_date).toISOString() : new Date().toISOString(),

            product_type: selectedProductType?.code || "",
            is_send_design: isSendDesign,
            design_file_path: finalDesignPath,

            // Specs
            paper_code: primaryQuote.paper_code,
            paper_name: paperTypes.find((p) => p.code === primaryQuote.paper_code)?.name || "",
            coating_type: primaryQuote.coating_type,
            wave_type: primaryQuote.wave_type,
            number_of_plates: primaryQuote.number_of_plates,

            product_length_mm: primaryQuote.length,
            product_width_mm: primaryQuote.width,
            product_height_mm: primaryQuote.height,
            glue_tab_mm: primaryQuote.glue_tab,
            bleed_mm: primaryQuote.bleed,

            is_one_side_box: primaryQuote.is_one_side_box,
            print_width_mm: primaryQuote.print_width,
            print_height_mm: primaryQuote.print_height,

            production_processes: Array.isArray(primaryQuote.production_processes)
              ? primaryQuote.production_processes.join(",")
              : primaryQuote.production_processes,
          };

          await requestOrderApi.updateRequest(currentOrderId, updateBody);
        } catch (updateError) {
          console.error("Error updating request details:", updateError);
        }
      }

      // 4. SAVE ESTIMATES (Loop through ALL quotes)
      for (const quote of quotes) {
        const { calculations } = quote;
        if (calculations && calculations.costEstimate && calculations.paperEstimate) {
          try {
            // Check if estimate_id already exists (saved via Adjust Price)
            if (calculations.estimate_id) {
              console.log(`Skipping costSave for ${quote.label}, using existing estimate_id: ${calculations.estimate_id}`);
              continue;
            }

            const originalPrice = calculations.costEstimate.cost.final_total_cost;
            const discountAmt = Math.round((originalPrice * calculations.discountPercent) / 100);

            const estimationResult = mapToOrderEstimationResult(
              calculations.costEstimate,
              calculations.paperEstimate,
              currentOrderId,
              quote.delivery_date, // Use quote specific date if available
              calculations.discountPercent,
              discountAmt,
              {
                paper_name: quote.paper_name || paperTypes.find((p) => p.code === quote.paper_code)?.name || "",
              }
            );

            const calculatedTotal = Math.round(originalPrice);
            if (quote.final_price !== undefined && quote.final_price !== null && quote.final_price !== calculatedTotal) {
              estimationResult.final_total_cost = quote.final_price;
            }

            // Only save if it has valid data
            await estimatesApi.costSave(estimationResult);
          } catch (err) {
            console.error(`Error saving estimate for ${quote.label}:`, err);
            // Continue to next quote?
          }
        }
      }

      // 5. FINAL ACTION
      const isVerified = existingOrder?.process_status === "Verified" || existingOrder?.process_status === "verified";
      if (isVerified) {
        const response = await requestOrderApi.sendDeal({
          request_id: parseInt(currentOrderId),
        });
        if (response.message === "Sent deal email" || (response as any).data?.message === "Sent deal email") {
          message.success("Đã gửi báo giá cho khách hàng!");
        } else {
          // Fallback, sometimes success is returned differently
          message.success("Đã gửi báo giá (Kiểm tra lại nếu không thấy mail)");
        }
      } else {
        await requestOrderApi.submitEstimateForApproval({
          request_id: parseInt(currentOrderId)
        });
        message.success("Đã gửi yêu cầu duyệt giá cho Manager!");
      }

      router.push("/consultant/requests");

    } catch (error: any) {
      console.error("Error processing order group:", error);
      message.error(error?.response?.data?.detail || error.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPrice = async () => {
    const finalPrice = form.getFieldValue("final_price");
    if (!finalPrice || finalPrice <= 0) {
      message.warning("Vui lòng nhập giá chốt hợp lệ!");
      return;
    }
    if (!orderId) {
      message.error("Không tìm thấy mã đơn hàng!");
      return;
    }

    setIsSavingCost(true);
    try {

      if (costEstimate && paperEstimate) {
        try {
          const originalPrice = costEstimate.cost.final_total_cost;
          const discountAmount = Math.round((originalPrice * discountPercent) / 100);

          const estimationResult = mapToOrderEstimationResult(
            costEstimate,
            paperEstimate,
            orderId,
            form.getFieldValue("delivery_date"),
            discountPercent,
            discountAmount,
            {
              paper_name: form.getFieldValue("paper_name") || paperTypes.find((p) => p.code === form.getFieldValue("paper_code"))?.name || "",
            }
          );

          const calculatedTotal = Math.round(originalPrice);
          if (finalPrice !== undefined && finalPrice !== null && finalPrice !== calculatedTotal) {
            estimationResult.final_total_cost = finalPrice;
          }

          const res = await estimatesApi.costSave(estimationResult);

          if (res && (res as any).estimate_id) {
            setSavedEstimateId((res as any).estimate_id);
          } else if (res && (res as any).data && (res as any).data.estimate_id) {
            setSavedEstimateId((res as any).data.estimate_id);
          }

          console.log(res);
        } catch (costError) {
          console.error("Error saving cost breakdown in adjust price:", costError);
        }
      }

      await estimatesApi.adjustCost(parseInt(orderId), finalPrice);
      message.success("Đã cập nhật giá chốt thành công!");
    } catch (error) {
      console.error("Error adjusting cost:", error);
      message.error("Có lỗi khi cập nhật giá. Vui lòng thử lại.");
    } finally {
      setIsSavingCost(false);
    }
  }


  const handleManualCalculate = () => {
    const values = form.getFieldsValue();
    console.log(values);
    const { paper_code, quantity, length, width, height, product_type } = values;
    if (!paper_code || !quantity || !length || !width || !height || !product_type) {
      message.warning("Vui lòng nhập đầy đủ: Loại giấy, Số lượng, Kích thước, Loại sản phẩm.");
      return;
    }
    calculateEstimates();
  };

  const handleCreateCustomerInfo = async (values: any) => {
    setLoading(true);
    try {
      const payload: CreateRequestBodyForConsultant = {
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email,
        detail_address: values.detail_address,
      };
      // Explicitly typing response as any to access custom fields if needed or standard response
      const res: any = await requestOrderApi.createRequestOrderByConsultant(payload);

      // Check for order_request_id in known locations (root or data)
      const newId = res?.order_request_id || res?.data?.order_request_id;

      if (newId) {
        setCreatedOrderId(newId);
        message.success("Tạo thông tin khách hàng thành công!");
        router.push(`/consultant?orderId=${newId}&mode=negotiate`);
      } else {
        // Fallback checks or error handling if ID isn't found
        console.warn("No order_request_id found in response", res);
        message.warning("Đã tạo yêu cầu nhưng không lấy được ID đơn hàng.");
      }
    } catch (error) {
      console.error("Error creating customer info:", error);
      message.error("Lỗi khi tạo thông tin khách hàng");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-br from-primary-dark to-primary-light min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-4 flex justify-between items-center bg-white p-3 rounded shadow-sm">
          <div>
            <h1 className="text-xl font-bold m-0 uppercase">
              {orderId
                ? `Xử Lý Đơn Hàng #${orderId.split("-")[1] || orderId}`
                : "Tạo Đơn Hàng Mới"}
            </h1>
            <span className="text-gray-500 text-sm">
              {orderId
                ? "Kiểm tra thông tin khách gửi và chốt phương án"
                : "Nhập thông tin yêu cầu sản xuất"}
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex flex-col items-end w-48">
              <div className="text-xs text-gray-500 flex gap-1 mb-1">
                <DashboardOutlined /> Công suất xưởng ({runningMachines}/
                {totalMachines})
              </div>
              <Progress
                percent={(runningMachines / totalMachines) * 100}
                size="small"
                status={isWorkshopFull ? "exception" : "active"}
                format={() => `${runningMachines} máy`}
                strokeColor={isWorkshopFull ? "#ff4d4f" : "#52c41a"}
              />
            </div>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={handleFormValuesChange}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Card
                title={
                  <>
                    <CodeSandboxOutlined /> Thông Tin Đơn Hàng
                  </>
                }
                className="shadow-sm"
              >
                <CustomerInfoSection
                  orderId={orderId || (createdOrderId ? createdOrderId.toString() : null)}
                  form={form}
                  handleFormValuesChange={handleFormValuesChange}
                  onConfirmCreate={handleCreateCustomerInfo}
                  loading={loading}
                />

                <Divider titlePlacement="left" className="!my-3">
                  Thông Số Kỹ Thuật
                </Divider>

                <Tabs
                  type="editable-card"
                  onChange={(key) => handleTabChange(key)}
                  activeKey={activeTabKey}
                  onEdit={handleTabEdit}
                  items={quoteTabs.map((tab) => ({
                    label: tab.label,
                    key: tab.key,
                    children: (
                      <div className="pt-2">
                        <ProductSpecsSection
                          orderId={orderId}
                          PRODUCT_SUGGESTIONS={productSuggestions}
                          productTypes={productTypes}
                          paperTypes={paperTypes}
                          formTypes={formTypes}
                          selectedProductTypeCode={selectedProductTypeCode}
                          loadingProductTypes={loadingProductTypes}
                          loadingPaperTypes={loadingPaperTypes}
                          loadingFormTypes={loadingFormTypes}
                          loadingProcessTypes={loadingProcessTypes}
                          processTypes={processTypes}
                          PROCESS_TYPE_LABELS={PROCESS_TYPE_LABELS}
                          songTypes={songTypes}
                          handleFormValuesChange={handleFormValuesChange}
                          form={form}
                        />
                      </div>
                    ),
                  }))}
                />

                <DesignUploadSection
                  designFilePath={designFilePath}
                  // setDesignFilePath={setDesignFilePath} // Removed
                  // orderId={orderId}
                  isSendDesign={isSendDesign}
                  setIsSendDesign={(val) => {
                    setIsSendDesign(val);
                  }}
                  fileList={fileList}
                  setFileList={setFileList}
                />

                <Row gutter={16}>
                  {/* read only */}
                  <Col span={isCreateMode ? 12 : 24}>
                    <Form.Item name="description" label="Ghi Chú khách hàng" className="mb-2">
                      <Input.TextArea disabled rows={1} placeholder="Ghi chú thêm..." />
                    </Form.Item>
                  </Col>
                  {isCreateMode && (
                    <Col span={12}>
                      <Form.Item
                        name="contract_file"
                        label={
                          <span className="flex items-center gap-1 font-semibold text-blue-800">
                            <FileTextOutlined /> Upload hợp đồng
                          </span>
                        }
                        valuePropName="fileList"
                        getValueFromEvent={(e) =>
                          Array.isArray(e) ? e : e?.fileList
                        }
                        className="mb-2"
                        rules={[{ required: true, message: "Vui lòng tải lên hợp đồng" }]}
                      >
                        <Upload
                          name="contract"
                          action="/upload.do"
                          listType="text"
                          maxCount={1}
                        >
                          <Button icon={<UploadOutlined />} size="small">
                            Tải lên PDF/DOCX
                          </Button>
                        </Upload>
                      </Form.Item>
                    </Col>
                  )}
                </Row>

                <Form.Item className="mt-4">
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    block
                    className={`h-12 font-bold ${isCreateMode
                      ? "bg-green-600 hover:bg-green-700"
                      : estimate?.caseType === 3
                        ? "bg-red-600 hover:bg-red-700"
                        : estimate?.caseType === 2
                          ? "bg-orange-500 hover:bg-orange-600"
                          : "bg-blue-600"
                      }`}
                    disabled={(existingOrder?.process_status === "Processing" || existingOrder?.process_status === "processing")}
                  >
                    {isCreateMode
                      ? "GỬI MANAGER DUYỆT"
                      : (existingOrder?.process_status === "verified" || existingOrder?.process_status === "Verified")
                        ? "GỬI BÁO GIÁ CHO KHÁCH HÀNG"
                        : (existingOrder?.process_status === "Processing" || existingOrder?.process_status === "processing")
                          ? "ĐANG CHỜ DUYỆT"
                          : "GỬI MANAGER DUYỆT"}
                  </Button>
                  {/* <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    disabled={(existingOrder?.process_status !== "verified" && existingOrder?.process_status !== "Verified" && !isCreateMode && existingOrder?.process_status !== "pending_consultant")}
                    block
                    className={`h-12 font-bold ${isCreateMode
                      ? "bg-green-600 hover:bg-green-700"
                      : (existingOrder?.process_status === "verified" || existingOrder?.process_status === "Verified")
                        ? "bg-blue-600"
                        : "bg-orange-500 hover:bg-orange-600"
                      }`}
                  >
                     {(existingOrder?.process_status === "verified" || existingOrder?.process_status === "Verified")
                      ? "HOÀN TẤT BÁO GIÁ (ĐÃ DUYỆT)"
                      : "CHỜ DUYỆT / GỬI DUYỆT"}
                  </Button> */}
                </Form.Item>
              </Card>
            </Col>

            <Col span={12}>
              <EstimatesCard
                estimate={estimate}
                paperEstimate={paperEstimate}
                costEstimate={costEstimate}
                loadingCostEstimate={loadingCostEstimate}
                loadingPaperEstimate={loadingPaperEstimate}
                onCalculate={handleManualCalculate}
                workshopFreeInfo={workshopFreeInfo}
                isWorkshopFull={isWorkshopFull}
                runningMachines={runningMachines}
                totalMachines={totalMachines}
                discountPercent={discountPercent}
                setDiscountPercent={setDiscountPercent}
                depositAmount={depositAmount}
                form={form}
                isCreateMode={isCreateMode}
                handleAdjustPrice={handleAdjustPrice}
                orderId={orderId}
                isSavingCost={isSavingCost}
                systemParameters={systemParameters}
              />
            </Col>
          </Row>
        </Form>

        <FactoryOrdersModal
          isOpen={isFactoryModalOpen}
          onClose={() => setIsFactoryModalOpen(false)}
          factoryOrders={factoryOrders}
        />

        {/* REVIEW MODAL */}
        <Modal
          title={<div className="text-lg font-bold uppercase text-blue-800 border-b pb-2 mb-4">
            {(existingOrder?.process_status === 'Verified' || existingOrder?.process_status === 'verified')
              ? "Xác nhận gửi báo giá cho khách"
              : "Xác nhận gửi duyệt giá cho Manager"
            }
          </div>}
          open={isReviewModalOpen}
          onCancel={() => setIsReviewModalOpen(false)}
          footer={[
            <Button key="back" onClick={() => setIsReviewModalOpen(false)}>
              Hủy
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={loading}
              onClick={handleConfirmSend}
              className="bg-blue-600 font-bold"
            >
              Xác Nhận & Gửi ({submitValues?.length || 0} báo giá)
            </Button>,
          ]}
          width={750}
        >
          {submitValues && Array.isArray(submitValues) && (() => {
            // --- LOGIC TO EXTRACT COMMON SPECS ---
            const allQuotes = submitValues;
            if (allQuotes.length === 0) return null;

            // Define fields to check for commonality
            // Keys must match submitValues keys
            const specFields: { key: string; label: string; format?: (val: any) => string }[] = [
              { key: "product_name", label: "Sản phẩm" },
              { key: "product_type", label: "Loại sản phẩm", format: (v) => productTypes.find(pt => pt.code === v || pt.product_type_id === v)?.name || v },
              {
                key: "dimensions", // Virtual key for combined dimensions
                label: "Kích thước",
                format: (_) => "" // Handled manually below
              },
              { key: "paper_code", label: "Giấy/Chất liệu", format: (v) => paperTypes.find(p => p.code === v)?.name || v },
              { key: "coating_type", label: "Phủ/Tráng", format: (v) => v === "NONE" ? "Không" : v },
              { key: "wave_type", label: "Sóng", format: (v) => v },
              { key: "number_of_plates", label: "Số lượng kẽm", format: (v) => v },
              {
                key: "production_processes",
                label: "Công đoạn",
                format: (v) => {
                  if (!v) return "Không";
                  const arr = Array.isArray(v) ? v : (typeof v === 'string' ? v.split(',') : []);
                  return arr.map((p: string) => PROCESS_TYPE_LABELS[p] || p).join(", ");
                }
              },
              // { key: "print_width", label: "Khổ in (Rộng)", format: (v) => `${v} mm` },
              // { key: "print_height", label: "Khổ in (Cao)", format: (v) => `${v} mm` },
              // { key: "is_one_side_box", label: "Kiểu in", format: (v) => v ? "In 1 mặt" : "In 2 mặt" },
              // { key: "glue_tab", label: "Nắp dán", format: (v) => `${v} mm` }
            ];

            const commonSpecs: Record<string, any> = {};
            const uniqueSpecsMap: Record<number, Record<string, any>> = {};

            // Helper to get value
            const getVal = (quote: any, fieldKey: string) => {
              if (fieldKey === "dimensions") {
                return `${quote.length} x ${quote.width} x ${quote.height}`;
              }
              return quote[fieldKey];
            };

            // Check each field
            specFields.forEach(field => {
              const firstVal = getVal(allQuotes[0], field.key);
              const isCommon = allQuotes.every(q => getVal(q, field.key) === firstVal);

              if (isCommon && firstVal) {
                // If it's common (and not empty), add to commonSpecs
                // For dimensions, stick to the formatted string. For others, keep raw value but we might need formatted for display?
                // Let's store formatted if possible or raw?
                // Let's store raw and format on render
                commonSpecs[field.key] = firstVal;
              } else {
                // Not common, add to uniqueSpecs for each quote
                allQuotes.forEach((q, idx) => {
                  if (!uniqueSpecsMap[idx]) uniqueSpecsMap[idx] = {};
                  uniqueSpecsMap[idx][field.key] = getVal(q, field.key);
                });
              }
            });


            return (
              <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* 1. Customer Info - Ultra Compact */}
                <div className="bg-blue-50/50 px-4 py-2 rounded-md border border-blue-100 flex justify-between items-center text-sm">
                  <div className="flex gap-2 items-center">
                    <span className="text-blue-800 font-semibold"><UserOutlined /> {submitValues[0]?.customer_name || "Khách hàng"}</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-gray-600">{submitValues[0]?.customer_phone || "SĐT"}</span>
                  </div>
                  <div className="text-xs text-gray-500 italic">
                    {submitValues?.length} phương án báo giá
                  </div>
                </div>

                {/* 2. Common Technical Specs Card (Only if there are common specs) */}
                {Object.keys(commonSpecs).length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs">
                    <div className="font-bold text-gray-700 mb-2 uppercase border-b border-gray-200 pb-1">
                      Thông số kỹ thuật chung
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {specFields.map(field => {
                        if (Object.prototype.hasOwnProperty.call(commonSpecs, field.key)) {
                          let displayVal = commonSpecs[field.key];
                          if (field.key === "dimensions") {
                            displayVal = displayVal + " mm";
                          } else if (field.format) {
                            displayVal = field.format(displayVal);
                          }

                          // Hide empty values or "None" if desired? 
                          if (!displayVal || displayVal === "Không") return null;

                          return (
                            <div key={field.key} className="flex justify-between border-b border-dashed border-gray-200 pb-1">
                              <span className="text-gray-500">{field.label}:</span>
                              <span className="font-medium text-gray-800 text-right truncate pl-2 max-w-[200px]" title={displayVal.toString()}>
                                {displayVal}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Individual Quote Cards */}
                {submitValues.map((quote: any, index: number) => {
                  const calc = quote.calculations?.costEstimate?.cost;
                  // unique specs for this quote
                  const uniqueForThis = uniqueSpecsMap[index] || {};

                  // Derived Values
                  const subtotal = Math.round(calc?.subtotal || 0);
                  const discountAmt = Math.round((subtotal * discountPercent) / 100) || 0;
                  const finalTotal = Math.round(calc?.final_total_cost || 0);
                  const depositRequired = Math.round((finalTotal * 0.3) / 1000) * 1000;

                  // Calculate default rounded price (same logic as in EstimatesCard)
                  const defaultAutoPrice = Math.round(finalTotal / 1000) * 1000;
                  // Only show negotiated price if it differs from the default rounded value
                  const negotiatedPrice = quote.final_price && quote.final_price !== defaultAutoPrice ? quote.final_price : null;

                  return (
                    <div key={quote.key || index} className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-md transition-shadow duration-200">
                      {/* Header */}
                      <div className="bg-white px-4 py-2 flex justify-between items-center border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
                            {quote.label || `PA ${index + 1}`}
                          </span>
                          {/* If product name is unique, show it here? Or just show it in common? 
                              Usually product name is common. Use it here anyway for identity. */}
                          {/* <span className="font-bold text-gray-800 text-sm truncate" title={quote.product_name}>
                            {quote.product_name}
                          </span> */}
                        </div>
                        {/* <span className="text-blue-600 text-xs font-bold whitespace-nowrap bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          SL: {Number(quote.quantity)?.toLocaleString()}
                        </span> */}
                      </div>

                      {/* Content Grid */}
                      <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        {/* Left: Unique Specs */}
                        <div className="space-y-1">
                          {/* Always show Quantity first if needed, but it's in header. */}

                          {/* Render Unique Specs */}
                          {specFields.map(field => {
                            // Check if this field is in uniqueForThis
                            if (Object.prototype.hasOwnProperty.call(uniqueForThis, field.key)) {
                              let val = uniqueForThis[field.key];
                              if (field.key === "dimensions") {
                                val = val + " mm";
                              } else if (field.format) {
                                val = field.format(val);
                              }

                              if (!val || val === "Không") return null;

                              return (
                                <div key={field.key} className="flex justify-between border-b border-dashed border-gray-100 pb-1">
                                  <span className="text-gray-500">{field.label}:</span>
                                  <span className="font-medium text-gray-700 text-right">{val}</span>
                                </div>
                              );
                            }
                            return null;
                          })}

                          {/* If no unique specs, maybe show a message? or just empty */}
                          {Object.keys(uniqueForThis).length === 0 && (
                            <div className="text-gray-400 italic py-2">
                              (Thông số giống như trên)
                            </div>
                          )}
                        </div>

                        {/* Right: Financials */}
                        <div className="space-y-1 pl-2 border-l border-gray-100">
                          {calc ? (
                            <>
                              <div className="flex justify-between text-gray-500">
                                <span>Thành tiền:</span>
                                <span>{subtotal.toLocaleString()} đ</span>
                              </div>
                              {discountAmt > 0 && (
                                <div className="flex justify-between text-gray-500">
                                  <span>Chiết khấu ({discountPercent}%):</span>
                                  <span className="text-red-500">-{discountAmt.toLocaleString()} đ</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                                <span className="font-bold text-gray-700">Tổng cộng (Sau VAT):</span>
                                <span className={`font-bold text-base ${negotiatedPrice ? 'text-gray-400 line-through text-sm' : 'text-blue-600'}`}>
                                  {finalTotal.toLocaleString()} đ
                                </span>
                              </div>

                              {negotiatedPrice && (
                                <div className="flex justify-between items-center bg-yellow-50 px-2 py-1 rounded mt-1 border border-yellow-100">
                                  <span className="font-bold text-yellow-700">Giá chốt:</span>
                                  <span className="font-bold text-lg text-red-600">{Math.round(negotiatedPrice).toLocaleString()} đ</span>
                                </div>
                              )}

                              <div className="flex justify-between items-center text-xs text-orange-600 mt-1">
                                <span>Cọc (30%):</span>
                                <span className="font-semibold">{depositRequired.toLocaleString()} đ</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-red-400 italic text-center block py-2">Chưa có giá</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Modal>

      </div>
    </div>
  );
}

export default function ConsultantPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConsultantForm />
    </Suspense>
  );
}
