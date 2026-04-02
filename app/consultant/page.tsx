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
  Alert,
  Checkbox,
  Spin,
} from "antd";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import {
  calculateEstimateForSave,
  CalculateInput,
  calculateTotalWaste,
  calculateNUp,
  calculatePrintSize,
  calculateRushFee,
  calculateProductionDays
} from "@/lib/estimationUtils";
import axios from "@/apiRequests/axios";
import { log } from "console";



const PROCESS_TYPE_LABELS: Record<string, string> = {
  RALO: "Ralo",
  CAT: "Cắt",
  IN: "In",
  PHU: "Phủ",
  CAN: "Cán",
  BOI: "Bồi",
  BE: "Bế",
  DUT: "Dứt",
  DAN: "Dán",
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
  const [isFetchingOrder, setIsFetchingOrder] = useState(!!orderId);

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
  const [glueTypes, setGlueTypes] = useState<Material[]>([]);
  const [inkMaterials, setInkMaterials] = useState<Material[]>([]);
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [factoryOrders, setFactoryOrders] = useState<Order[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [managerNote, setManagerNote] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState<string | undefined>(undefined);
  const [initialDeliveryDate, setInitialDeliveryDate] = useState<string | undefined>(undefined);

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
  const [previousEstimateId, setPreviousEstimateId] = useState<number | null>(null);
  const lastCalculatedSpecsRef = useRef<string>("");

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [submitValues, setSubmitValues] = useState<any>(null);
  const [isCustomerContacted, setIsCustomerContacted] = useState(false);

  const highlightFieldsByTabIndex = useMemo(() => {
    if (!managerNote || orderStatus !== 'Declined') return {};

    // Parse note: "Báo giá 1: Loại giấy: Bristol 300, Đặt cọc: 5.000.000 đ; Báo giá 2: Loại phủ: Phủ keo nước"
    // Also parses new format separated by " | "
    const highlights: Record<number, Record<string, string>> = {};
    const parts = managerNote.split(';');

    parts.forEach(part => {
      const match = part.match(/Báo giá (\d+):(.*)/i);
      if (match) {
        const index = parseInt(match[1], 10) - 1; // 0-based index
        const details = match[2];
        const fields: Record<string, string> = {};

        // Parse new format using " | "
        const detailParts = details.split(' | ');
        detailParts.forEach(detail => {
          const lowerDetail = detail.toLowerCase();
          if (lowerDetail.includes('loại giấy:')) {
            fields['paper_code'] = detail.substring(lowerDetail.indexOf('loại giấy:') + 10).trim();
          } else if (lowerDetail.includes('loại phủ:')) {
            fields['coating_type'] = detail.substring(lowerDetail.indexOf('loại phủ:') + 9).trim();
          } else if (lowerDetail.includes('đặt cọc:')) {
            fields['depositAmount'] = detail.substring(lowerDetail.indexOf('đặt cọc:') + 8).trim();
          } else if (lowerDetail.includes('tổng chi phí:')) {
            fields['final_price'] = detail.substring(lowerDetail.indexOf('tổng chi phí:') + 13).trim();
          }
        });

        // Fallback for old format using ", "
        if (Object.keys(fields).length === 0) {
          const oldDetailParts = details.split(', ');
          oldDetailParts.forEach(detail => {
            const lowerDetail = detail.toLowerCase();
            if (lowerDetail.includes('loại giấy:')) {
              fields['paper_code'] = detail.substring(lowerDetail.indexOf('loại giấy:') + 10).trim();
            } else if (lowerDetail.includes('loại phủ:')) {
              fields['coating_type'] = detail.substring(lowerDetail.indexOf('loại phủ:') + 9).trim();
            } else if (lowerDetail.includes('đặt cọc:')) {
              fields['depositAmount'] = detail.substring(lowerDetail.indexOf('đặt cọc:') + 8).trim();
            } else if (lowerDetail.includes('tổng chi phí:')) {
              fields['final_price'] = detail.substring(lowerDetail.indexOf('tổng chi phí:') + 13).trim();
            }
          });
        }

        highlights[index] = fields;
      }
    });

    return highlights;
  }, [managerNote, orderStatus]);

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
      previous_estimate_id?: number | null;
    };
  }
  const [quoteTabs, setQuoteTabs] = useState<QuoteTab[]>([
    { key: "1", label: "Báo giá 1", data: {}, calculations: { estimate: null, paperEstimate: null, costEstimate: null, discountPercent: 0, previous_estimate_id: null } },
  ]);
  const [activeTabKey, setActiveTabKey] = useState<string>("1");

  // Fields that should be shared across all tabs (customer/product identity only)
  // NOTE: Technical specs (paper_code, production_processes, coating_type, wave_type,
  // number_of_plates, ink_type_names) are intentionally NOT shared - each tab is independent.
  const SHARED_FIELDS = [
    "customer_name",
    "customer_phone",
    "customer_email",
    "detail_address",
    "contract_file",
    "product_name",
    "product_type",
    "quantity",
    "length",
    "width",
    "height",
    "glueTab",
    "consultant_note",
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
    if (quoteTabs.length >= 2) {
      message.warning("Chỉ được phép tạo tối đa 2 báo giá!");
      return;
    }

    // Clone current form values for the new tab
    const currentValues = form.getFieldsValue();
    const currentCalculations = {
      estimate,
      paperEstimate,
      costEstimate,
      discountPercent,
      estimate_id: savedEstimateId,
      previous_estimate_id: previousEstimateId,
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

    // If removing active tab → switch to surviving tab and restore ITS data
    if (newActiveKey !== activeTabKey) {
      // Find the surviving tab's saved data and restore it
      const survivingTab = newTabs.find((t) => t.key === newActiveKey);
      if (survivingTab) {
        form.setFieldsValue(survivingTab.data);
        if (survivingTab.calculations?.estimate) {
          setEstimate(survivingTab.calculations.estimate);
          setPaperEstimate(survivingTab.calculations.paperEstimate);
          setCostEstimate(survivingTab.calculations.costEstimate);
          setDiscountPercent(survivingTab.calculations.discountPercent || 0);
          setSavedEstimateId(survivingTab.calculations.estimate_id || null);
          setPreviousEstimateId(survivingTab.calculations.previous_estimate_id || null);
        } else {
          setEstimate(null);
          setPaperEstimate(null);
          setCostEstimate(null);
          setDiscountPercent(0);
          setSavedEstimateId(null);
        }
        lastCalculatedSpecsRef.current = getSpecsSignature(survivingTab.data);
        const pType = survivingTab.data?.product_type;
        if (pType) {
          const selected = productTypes.find(pt => pt.product_type_id === pType);
          if (selected) {
            setSelectedProductTypeCode(selected.code);
            setselectProductTypeId(selected.product_type_id);
          }
        }
      }
      setActiveTabKey(newActiveKey);
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
      previous_estimate_id: previousEstimateId,
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
      if (targetTab.calculations && targetTab.calculations.estimate) {
        setEstimate(targetTab.calculations.estimate);
        setPaperEstimate(targetTab.calculations.paperEstimate);
        setCostEstimate(targetTab.calculations.costEstimate);
        setDiscountPercent(targetTab.calculations.discountPercent || 0);
        setSavedEstimateId(targetTab.calculations.estimate_id || null);
        setPreviousEstimateId(targetTab.calculations.previous_estimate_id || null);

        // Only set final_price if form doesn't have it already (manually edited)
        if (!nextValues.final_price) {
          form.setFieldValue("final_price", targetTab.calculations.costEstimate?.cost?.final_total_cost);
        }
      } else {
        // Calculate immediately using nextValues
        const result = calculateEstimateResult(nextValues);
        if (result) {
          setEstimate(result.estimate);
          setPaperEstimate(result.paperEstimate);
          setCostEstimate(result.costEstimate);
          setDiscountPercent(0);
          setSavedEstimateId(null);
          setPreviousEstimateId(targetTab.calculations?.previous_estimate_id || null);
          if (!nextValues.final_price) {
            form.setFieldValue("final_price", result.finalTotalCost);
          }

          // Optionally save back to tab if needed, but state handles UI
        } else {
          setEstimate(null);
          setPaperEstimate(null);
          setCostEstimate(null);
          setDiscountPercent(0);
          setSavedEstimateId(null);
        }
      }

      // Sync specs ref for the new tab
      lastCalculatedSpecsRef.current = getSpecsSignature(nextValues);

      // Trigger logic to update detailed states (like selectedProductTypeCode) based on new values
      const pType = nextValues.product_type;
      if (pType) {
        const selected = productTypes.find(pt => pt.product_type_id === pType);
        if (selected) {
          setSelectedProductTypeCode(selected.code);
          setselectProductTypeId(selected.product_type_id);
        }
      }
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
      // Materials (Paper, Song, Keo)
      setLoadingPaperTypes(true);
      try {
        const response: any = await materialsApi.getAll();
        const allMaterials = Array.isArray(response) ? response : (response?.data || []);

        if (Array.isArray(allMaterials)) {
          // 1. Filter Paper Types (type: GIẤY)
          const papers = allMaterials.filter((m: any) => m.type === "Giấy");
          setPaperTypes(
            papers.map((pt: any) => ({
              code: pt.code,
              name: pt.name,
              stock: pt.stock_qty || 0,
              value: pt.code,
              material_class: pt.material_class,
            }))
          );

          // 2. Filter Song Types (type: SÓNG)
          const songs = allMaterials.filter((m: any) => m.type === "Sóng");
          setSongTypes(songs);

          // 3. Filter Glue Types (type: KEO)
          const glues = allMaterials.filter((m: any) => m.type === "Keo phủ");
          setGlueTypes(glues);

          // 4. Filter Ink Types (type: MỨC)
          const inks = allMaterials.filter((m: any) => m.type === "Mực");
          setInkMaterials(inks);
        }
      } catch (error) {
        console.error("Error fetching materials:", error);
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

        // Update anchor to reflect the synced state
        lastCalculatedSpecsRef.current = getSpecsSignature(form.getFieldsValue());
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
      if (!orderId) {
        setIsFetchingOrder(false);
        return;
      }
      setIsFetchingOrder(true);

      try {
        const response: any = await requestOrderApi.getRequestDetailbyConsultant(orderId);
        const orderData = response?.data || response;

        if (orderData) {
          setOrderStatus(orderData.process_status || null);
          setManagerNote(orderData.reason || orderData.note || orderData.manager_note || null);
          setRequestDate(orderData.request_date);
          setInitialDeliveryDate(orderData.delevery_date || orderData.delivery_date);

          // Pick top 2 LATEST active estimates (or historical if none active), 
          // then sort ASC for stable labeling (Manager-style)
          let baseEstimates = orderData.cost_estimate
            ? orderData.cost_estimate.filter((e: any) => e.is_active)
            : [];

          if (baseEstimates.length === 0 && orderData.cost_estimate?.length > 0) {
            baseEstimates = orderData.cost_estimate;
          }

          const estimatesToLoad = [...baseEstimates]
            .sort((a: any, b: any) => b.estimate_id - a.estimate_id) // Latest first
            .slice(0, 2) // Take top 2
            .sort((a: any, b: any) => a.estimate_id - b.estimate_id); // ASC for display (Báo giá 1 < Báo giá 2)

          if (estimatesToLoad.length > 0 && isNegotiateMode) {
            // We have previous quotes to load
            const newTabs: QuoteTab[] = estimatesToLoad.map((est: any, index: number) => {
              const tabData = {
                customer_name: orderData.customer_name,
                customer_phone: orderData.customer_phone,
                customer_email: orderData.email || orderData.customer_email,
                product_name: orderData.product_name,
                quantity: orderData.quantity,
                delivery_date: orderData.delevery_date ? dayjs(orderData.delevery_date) : (orderData.delivery_date ? dayjs(orderData.delivery_date) : null),
                detail_address: orderData.detail_address,
                description: orderData.description,
                number_of_plates: est.number_of_plates || orderData.number_of_plates || 1,
                coating_type: est.coating_type && est.coating_type !== "NONE" ? est.coating_type : (orderData.coating_type && orderData.coating_type !== "NONE" ? orderData.coating_type : "NONE"),
                wave_type: est.wave_type && est.wave_type !== "NONE" ? est.wave_type : (orderData.wave_type && orderData.wave_type !== "NONE" ? orderData.wave_type : "NONE"),
                length: orderData.product_length_mm,
                width: orderData.product_width_mm,
                height: orderData.product_height_mm,
                paper_code: est.paper_code || orderData.paper_code,
                paper_name: est.paper_name || orderData.paper_name,
                final_price: est.final_total_cost || undefined,
                is_one_side_box: orderData.is_one_side_box,
                glue_tab: orderData.glue_tab_mm,
                bleed: orderData.bleed_mm,
                production_processes: est.process_cost && est.process_cost.length > 0
                  ? est.process_cost.map((pc: any) => (pc.process_code || "").trim())
                  : (orderData.production_processes ? orderData.production_processes.split(",").map((s: string) => s.trim()) : []),
                consultant_note: orderData.consultant_note || "",
                ink_type_names: est.ink_type_names || orderData.ink_type_names || [],
              };

              return {
                key: index === 0 ? "1" : Date.now().toString(),
                label: `Báo giá ${index + 1}`,
                data: tabData,
                calculations: {
                  estimate: null,
                  paperEstimate: null,
                  costEstimate: null,
                  discountPercent: 0,
                  estimate_id: (orderData.process_status === 'Declined' || orderData.process_status === 'declined') ? null : est.estimate_id,
                  previous_estimate_id: (orderData.process_status === 'Declined' || orderData.process_status === 'declined') ? est.estimate_id : null
                }
              };
            });

            setQuoteTabs(newTabs);

            // Set active to first tab
            setActiveTabKey("1");
            form.setFieldsValue(newTabs[0].data);
            setSavedEstimateId(newTabs[0].calculations?.estimate_id || null);
            setPreviousEstimateId(newTabs[0].calculations?.previous_estimate_id || null);

            // Initialize specs ref for the first tab
            lastCalculatedSpecsRef.current = getSpecsSignature(newTabs[0].data);

            if (orderData.design_file_path) {
              setDesignFilePath(orderData.design_file_path);
            }
            if (orderData.is_send_design !== undefined) {
              setIsSendDesign(orderData.is_send_design);
            }


            // Execute pre-calculation for all restored tabs to wake up computations
            for (let i = 0; i < newTabs.length; i++) {
              const tab = newTabs[i];
              const est = estimatesToLoad[i];
              try {
                // Ensure all necessary dependencies exist before calculating
                if (materials.length > 0 && productTypes.length > 0) {
                  const result = calculateEstimateResult(tab.data, {
                      isSendDesign: orderData.is_send_design,
                      designFilePath: orderData.design_file_path,
                      designCost: est?.design_cost
                  });
                  if (result) {
                    tab.calculations = {
                      ...tab.calculations,
                      estimate: result.estimate,
                      paperEstimate: result.paperEstimate,
                      costEstimate: result.costEstimate,
                      discountPercent: tab.calculations?.discountPercent || 0
                    };
                  }
                }
              } catch (err) {
                console.error("Failed to pre-calculate tab", i, err);
              }
            }

            // Sync product types
            setTimeout(() => {
              syncProductTypeFromName();

              // Only call calculateEstimates for the first tab IF materials/productTypes weren't loaded yet during the pre-calculation loop
              // Either way, it ensures at least the active tab is calculated.
              const est = estimatesToLoad[0];
              calculateEstimates({
                  isSendDesign: orderData.is_send_design,
                  designFilePath: orderData.design_file_path,
                  designCost: est?.design_cost
              });
            }, 500);

          } else {
            form.setFieldsValue({
              customer_name: orderData.customer_name,
              customer_phone: orderData.customer_phone,
              customer_email: orderData.email || orderData.customer_email,
              product_name: orderData.product_name,
              quantity: orderData.quantity,
              delivery_date: orderData.delevery_date
                ? dayjs(orderData.delevery_date)
                : orderData.delivery_date ? dayjs(orderData.delivery_date) : null,
              detail_address: orderData.detail_address,
              description: orderData.description,
              ...(orderData.number_of_plates && { number_of_plates: orderData.number_of_plates }),
              ...((orderData.coating_type && orderData.coating_type !== "NONE") && { coating_type: orderData.coating_type }),
              // Add dimensions and paper code if available
              ...(orderData.product_length_mm && { length: orderData.product_length_mm }),
              ...(orderData.product_width_mm && { width: orderData.product_width_mm }),
              ...(orderData.product_height_mm && { height: orderData.product_height_mm }),
              ...(orderData.paper_code && { paper_code: orderData.paper_code }),
              ...(orderData.paper_name && { paper_name: orderData.paper_name }),
              ...(orderData.production_processes && { production_processes: orderData.production_processes.split(",").map((s: string) => s.trim()) }),
              ...(orderData.ink_type_names && { ink_type_names: orderData.ink_type_names }),
              consultant_note: orderData.consultant_note || "",
            });

            if (orderData.design_file_path) {
              setDesignFilePath(orderData.design_file_path);
            }
            if (orderData.is_send_design !== undefined) {
              setIsSendDesign(orderData.is_send_design);
            }

            const values = form.getFieldsValue();
            handleCalculate(values, values);
            setTimeout(() => calculateEstimates({
              isSendDesign: orderData.is_send_design,
              designFilePath: orderData.design_file_path,
              designCost: orderData.cost_estimate?.[0]?.design_cost
            }), 500);
          }
        }

        // Trigger sync after setting form values
        if (!orderData?.cost_estimate || !orderData.cost_estimate.filter((e: any) => e.is_active).length || !isNegotiateMode) {
          syncProductTypeFromName();
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      } finally {
        setIsFetchingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [orderId, form, products, productTypes, materials, configLoading]);



  // --- CALCULATION LOGIC ---
  const handleCalculate = (changedValues: any, allValues: any, calculatedPaperNeeded?: number) => {
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
      isBusy,
      calculatedPaperNeeded ?? paperEstimate?.sheets_with_waste
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
      const currentValues = form.getFieldsValue(true);

      const newValues = {
        // Only set if not already present in form
        paper_code: (currentValues.paper_code || currentValues.paper_name) ? currentValues.paper_code : profile.paper_code,
        length: currentValues.length ? currentValues.length : profile.product_length_mm,
        width: currentValues.width ? currentValues.width : profile.product_width_mm,
        height: currentValues.height ? currentValues.height : profile.product_height_mm,

        // Use current if it exists, else follow profile
        number_of_plates: currentValues.number_of_plates !== undefined ? currentValues.number_of_plates : profile.number_of_plates,
        coating_type: (profile.production_processes && profile.production_processes.includes("PHU")) 
          ? ((currentValues.coating_type && currentValues.coating_type !== "NONE") ? currentValues.coating_type : profile.coating_type)
          : "NONE",
        wave_type: (currentValues.wave_type && currentValues.wave_type !== "NONE") ? currentValues.wave_type : profile.wave_type,
        glue_tab: currentValues.glue_tab !== undefined ? currentValues.glue_tab : profile.glue_tab_mm,
        is_one_side_box: currentValues.is_one_side_box !== undefined ? currentValues.is_one_side_box : profile.is_one_side_box,

        // Dimensions that might be specific
        print_width: currentValues.print_width || profile.print_width_mm,
        print_height: currentValues.print_height || profile.print_length_mm,
        bleed: currentValues.bleed !== undefined ? currentValues.bleed : profile.bleed_mm,

        // Processes: only if current is empty or array of length 0
        production_processes: (Array.isArray(currentValues.production_processes) && currentValues.production_processes.length > 0)
          ? currentValues.production_processes
          : (profile.production_processes ? profile.production_processes.split(",") : []),

        default_quantity: profile.default_quantity,
        ...(selectedProductTypeCode === "HOP_MAU" && {
          glueTab: currentValues.glueTab !== undefined ? currentValues.glueTab : profile.glue_tab_mm,
          isOneSideBox: currentValues.isOneSideBox !== undefined ? currentValues.isOneSideBox : profile.is_one_side_box,
        }),
      };

      form.setFieldsValue(newValues);

      // CRITICAL: Update the anchor ref immediately after setting values
      // This prevents calculateEstimates from thinking these are user-initiated changes
      lastCalculatedSpecsRef.current = getSpecsSignature({ ...currentValues, ...newValues });

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


  // Helper to calculate estimations without touching React state
  function calculateEstimateResult(values: any, explicitConfig?: { isSendDesign?: boolean, designFilePath?: string | null, designCost?: number }) {
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

    const effectiveWaveType = wave_type && wave_type !== "NONE" ? wave_type : "NONE";

    if (!paper_code || !quantity || !length || !width || !height || !product_type || configLoading) {
      return null;
    }

    const selectedProductType = productTypes.find(
      (pt) => pt.product_type_id === product_type
    );
    const productTypeCode = selectedProductType?.code || "";

    // Robust material lookup helper
    const findMaterialByIdentifier = (mats: Material[], identifier: string, fallbackType?: string) => {
      if (!identifier || identifier === "NONE" || identifier === "null") return undefined;

      const normalizedOriginal = identifier.trim().toUpperCase();

      // 1. Try exact code match
      const byCode = mats.find(m => m.code.toUpperCase() === normalizedOriginal);
      if (byCode) return byCode;

      // 2. Try exact name match
      const byName = mats.find(m => m.name.toUpperCase() === normalizedOriginal);
      if (byName) return byName;

      // 3. Try partial name overlap
      const byPartial = mats.find(m =>
        m.name.toUpperCase().includes(normalizedOriginal) ||
        normalizedOriginal.includes(m.name.toUpperCase())
      );
      if (byPartial) return byPartial;

      // 4. Default fallbacks for common wave types if BOI is present
      if (fallbackType === 'SÓNG' && normalizedOriginal.includes('SÓNG B')) {
        return mats.find(m => m.code === "SONG_B_NAU");
      }

      return undefined;
    };

    const selectedMaterial = findMaterialByIdentifier(materials, paper_code);
    const selectedWaveMaterial = findMaterialByIdentifier(materials, effectiveWaveType, 'SÓNG');

    if (!selectedMaterial) return null;

    try {
      const inputs: EstimationInputs = {
        paper_code,
        sheet_width_mm: selectedMaterial.sheet_width_mm || 0,
        sheet_length_mm: selectedMaterial.sheet_length_mm || 0,
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
        coating_type: (Array.isArray(production_processes) ? production_processes.includes("PHU") : (production_processes || "").includes("PHU")) ? (coating_type || "NONE") : "NONE",
        wave_type: effectiveWaveType,
        number_of_plates: number_of_plates || 1,

        // Configs
        wasteRules: wasteRules || undefined,
        processCosts: processCosts || undefined,
        designConfig: designConfig || undefined,
        materials,
        machines,

        desired_delivery_date: values.delivery_date ? dayjs(values.delivery_date).toDate() : new Date(),
        discount_percent: discountPercent,
        is_send_design: explicitConfig?.isSendDesign !== undefined ? explicitConfig.isSendDesign : isSendDesign,
        has_design_file: !!(explicitConfig?.designFilePath !== undefined ? explicitConfig.designFilePath : designFilePath)
      };

      // Calculate total waste using existing calculation first
      const wasteResult = calculateTotalWaste(
        {
          baseSheets: Math.ceil(quantity / calculateNUp(selectedMaterial.sheet_width_mm || 0, selectedMaterial.sheet_length_mm || 0, calculatePrintSize(length, width, height, glue_tab, 5, is_one_side_box, productTypeCode).print_width_mm, calculatePrintSize(length, width, height, glue_tab, 5, is_one_side_box, productTypeCode).print_length_mm)),
          productTypeCode,
          numberOfPlates: inputs.number_of_plates || 1,
          processes: Array.isArray(production_processes) ? production_processes : (production_processes || "").split(','),
          coatingType: inputs.coating_type as any,
          quantity
        },
        wasteRules || undefined
      );

      const printSizeResult = calculatePrintSize(length, width, height, glue_tab, 5, is_one_side_box, productTypeCode);

      // Now we construct the new Calculator payload
      let ink_rate = 0.018; // Default to HOP_MAU
      if (productTypeCode === 'GACH_1MAU') ink_rate = 0.02;
      else if (productTypeCode === 'GACH_XUAT_KHAU_DON_GIAN') ink_rate = 0.015;
      else if (['GACH_XUAT_KHAU_TERACON', 'GACH_NOI_DIA_4SP', 'GACH_NOI_DIA_6SP'].includes(productTypeCode)) ink_rate = 0.025;

      const calcInput: CalculateInput = {
        quantity: quantity,
        paper_code: paper_code,
        wave_type: effectiveWaveType,
        coating_type: (Array.isArray(production_processes) ? production_processes.includes("PHU") : (production_processes || "").includes("PHU")) ? (coating_type || "NONE") : "NONE",
        design_file_path: explicitConfig?.designFilePath !== undefined ? explicitConfig.designFilePath : designFilePath,
        is_send_design: explicitConfig?.isSendDesign !== undefined ? explicitConfig.isSendDesign : isSendDesign,
        ink_type_names: values.ink_type_names || [],

        sheet_width_mm: selectedMaterial.sheet_width_mm || 0,
        sheet_length_mm: selectedMaterial.sheet_length_mm || 0,

        wave_sheet_width_mm: selectedWaveMaterial?.sheet_width_mm || 0,
        wave_sheet_length_mm: selectedWaveMaterial?.sheet_length_mm || 0,

        print_width_mm: printSizeResult.print_width_mm,
        print_length_mm: printSizeResult.print_length_mm,

        processesCsv: inputs.production_processes || "",
        processCosts: processCosts as any,
        materials: materials,

        ink_rate_per_m2: ink_rate,
        ink_price_per_kg: 150000,
        coating_glue_price_per_kg: coating_type === 'Keo phủ nước' ? 80000 : 120000,
        mounting_glue_price_per_kg: 90000,
        lamination_price_per_kg: 150000,
        default_design_cost: designConfig?.default_design_cost || 0,
        override_design_cost: explicitConfig?.designCost,

        waste_printing: wasteResult.wastes.printing,
        waste_die_cutting: wasteResult.wastes.dieCutting,
        waste_mounting: wasteResult.wastes.mounting,
        waste_coating: wasteResult.wastes.coating,
        waste_lamination: wasteResult.wastes.lamination,

        rush_amount: 0, // Rush amount is computed similarly but injected directly if available
        discount_percent: discountPercent || 0,
      };

      // Execute new drop-in algorithm
      const partialEstimate = calculateEstimateForSave(calcInput);

      // Calculate rush logic independently to append
      const rushResult = calculateRushFee(
        calculateProductionDays(
          partialEstimate.sheets_total, quantity,
          partialEstimate.production_processes.split(","),
          machines
        ),
        inputs.desired_delivery_date,
        partialEstimate.base_cost,
        {
          systemParameters: {
            default_production_days: systemParameters?.default_production_days || 5,
            vat_percent: systemParameters?.vat_percent || 10,
            rush_threshold_days: systemParameters?.rush_threshold_days || 1,
            rush_percent_by_days_early: systemParameters?.rush_percent_by_days_early || {}
          }
        }
      );

      const rush_amount = rushResult.rushAmount;
      const subtotalWithRush = partialEstimate.base_cost + rush_amount;
      const discount_amount = subtotalWithRush * (discountPercent / 100);
      const final_total_cost = subtotalWithRush - discount_amount + partialEstimate.design_cost + partialEstimate.total_process_cost;

      const savedEstimate = {
        ...partialEstimate,
        rush_amount,
        subtotal: subtotalWithRush,
        discount_amount,
        final_total_cost
      };

      // Ensure backward compatibility with paperEstimateObj for UI state
      const paperEstimateObj = {
        ...savedEstimate,
        quantity: quantity,
        sheet_width_mm: calcInput.sheet_width_mm,
        sheet_length_mm: calcInput.sheet_length_mm,
        print_width_mm: savedEstimate.print_width_mm,
        print_length_mm: savedEstimate.print_length_mm,
        sheets_base: savedEstimate.sheets_required,
        total_waste: savedEstimate.sheets_waste,
        sheets_with_waste: savedEstimate.sheets_total,
        waste_printing: wasteResult.wastes.printing,
        waste_die_cutting: wasteResult.wastes.dieCutting,
        waste_mounting: wasteResult.wastes.mounting,
        waste_coating: wasteResult.wastes.coating,
        waste_lamination: wasteResult.wastes.lamination,
        waste_gluing: wasteResult.wastes.gluing,
        waste_percent: savedEstimate.sheets_required > 0 ? (savedEstimate.sheets_waste / savedEstimate.sheets_required) * 100 : 0,
        warning_message: savedEstimate.warning_message || ""
      };

      const costEstimateObj = {
        cost: {
          ...savedEstimate,
          coating_type: savedEstimate.coating_type || "NONE",
          ink_unit_price: 150000,
          coating_glue_unit_price: (calcInput.coating_type && calcInput.coating_type !== 'NONE') ? (calcInput.coating_type === 'Keo phủ nước' ? 80000 : 120000) : 0,
          mounting_glue_unit_price: 90000,
          lamination_unit_price: 150000,
          overhead_percent: systemParameters?.vat_percent || 10,
          overhead_cost: 0, // Not used strictly anymore since there's no overhead in the new calculation
          is_rush: rushResult.isRush,
          days_early: rushResult.daysEarly,
          rush_percent: rushResult.rushPercent,
          rush_amount: rushResult.rushAmount,
          material_cost_details: [],
          estimated_finish_date: (() => {
            const date = new Date();
            date.setDate(date.getDate() + calculateProductionDays(savedEstimate.sheets_total, quantity, savedEstimate.production_processes.split(","), machines));
            return date.toISOString();
          })()
        },
        process_cost: {
          order_request_id: orderId ? parseInt(orderId) : 0,
          total_cost: savedEstimate.total_process_cost,
          details: savedEstimate.process_costs.map(p => ({
            ...p,
            process: p.process_code,
            note: p.note || ''
          }))
        }
      };

      const basicEstimate = calculateProductionTime(
        quantity, paper_code, paperTypes, isWorkshopFull,
        daysUntilFree, values.delivery_date, isBusy,
        savedEstimate.sheets_total
      );

      return {
        estimate: basicEstimate,
        paperEstimate: paperEstimateObj,
        costEstimate: costEstimateObj,
        finalTotalCost: Math.round(savedEstimate.final_total_cost)
      };

    } catch (err) {
      console.error("Calculation error", err);
      const basicEstimate = calculateProductionTime(
        quantity, paper_code, paperTypes, isWorkshopFull,
        daysUntilFree, values.delivery_date, isBusy,
        quantity
      );
      return {
        estimate: basicEstimate,
        paperEstimate: {
          warning_message: "Lỗi hệ thống khi tính toán. Vui lòng kiểm tra lại kích thước hoặc loại giấy.",
          sheets_with_waste: 0,
          sheets_base: 0,
          n_up: 0,
          print_width_mm: 0,
          print_length_mm: 0,
          sheet_width_mm: 0,
          sheet_length_mm: 0
        } as any,
        costEstimate: null,
        finalTotalCost: 0
      };
    }
  }

  const getSpecsSignature = (values: any) => {
    return JSON.stringify({
      paper_code: values.paper_code || "",
      quantity: Number(values.quantity) || 0,
      length: Number(values.length) || 0,
      width: Number(values.width) || 0,
      height: Number(values.height) || 0,
      production_processes: Array.isArray(values.production_processes)
        ? [...values.production_processes]
          .sort((a, b) => {
            const order = ["RALO", "CAT", "IN", "PHU", "CAN", "BOI", "BE", "DUT", "DAN", "DOT"];
            const idxA = order.indexOf(a);
            const idxB = order.indexOf(b);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          })
          .join(",")
        : (values.production_processes || ""),
      coating_type: (values.production_processes && values.production_processes.includes("PHU")) ? (values.coating_type || "NONE") : "NONE",
      wave_type: (values.production_processes && values.production_processes.includes("BOI")) ? (values.wave_type || "NONE") : "NONE",
      is_one_side_box: !!values.is_one_side_box,
      glue_tab: Number(values.glue_tab) || 0,
      bleed: Number(values.bleed) || 0,
    });
  };

  function calculateEstimates(explicitConfig?: { isSendDesign?: boolean, designFilePath?: string | null, designCost?: number }) {
    const values = form.getFieldsValue();
    const result = calculateEstimateResult(values, explicitConfig);

    if (result) {
      setEstimate(result.estimate);
      setPaperEstimate(result.paperEstimate);
      setCostEstimate(result.costEstimate);

      // Only update final_price if specs have changed or it's currently empty
      const specsSignature = getSpecsSignature(values);

      const currentPrice = form.getFieldValue("final_price");
      if (!currentPrice || specsSignature !== lastCalculatedSpecsRef.current) {
        form.setFieldValue("final_price", result.finalTotalCost);
        lastCalculatedSpecsRef.current = specsSignature;
      }
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
  }, [isSendDesign, configLoading]);

  // Handle immediate recalculation specifically when discount changes manually
  useEffect(() => {
    calculateEstimates();
  }, [discountPercent]);

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
      estimate_id: savedEstimateId,
      previous_estimate_id: previousEstimateId,
    };

    const currentFormValues = form.getFieldsValue();
    const sharedValues = SHARED_FIELDS.reduce((acc, field) => {
      acc[field] = currentFormValues[field];
      return acc;
    }, {} as any);

    // 2. Consolodate all data
    const allQuotes = quoteTabs.map((tab) => {
      if (tab.key === activeTabKey) {
        return {
          ...tab.data,
          ...values,
          ...sharedValues,
          key: tab.key,
          label: tab.label,
          calculations: currentCalculations
        };
      }
      return {
        ...tab.data,
        ...sharedValues,
        key: tab.key,
        label: tab.label,
        calculations: {
          ...tab.calculations,
          estimate_id: tab.calculations?.estimate_id || null,
          previous_estimate_id: tab.calculations?.previous_estimate_id || null
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
          //const {data : res} : any = await axios.post("https://localhost:7109/api/Requests/create-request-by-consultant", payload);
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

      // 2.2 UPLOAD CONTRACT
      let finalContractPath = "";
      let contractUploadedAt: string | null = null;
      if (primaryQuote.contract_file && primaryQuote.contract_file.length > 0) {
        const contractFiles = primaryQuote.contract_file
          .map((f: any) => f.originFileObj || f)
          .filter((f: any) => f instanceof File || f instanceof Blob);

        if (contractFiles.length > 0) {
          try {
            const uploadRes: any = await uploadApi.uploadFile(contractFiles);
            if (uploadRes && uploadRes.data && uploadRes.data.length > 0) {
              finalContractPath = uploadRes.data[0];
              contractUploadedAt = new Date().toISOString();
            }
          } catch (uploadError) {
            console.error("Error uploading contract:", uploadError);
            message.warning("Không thể tải lên file hợp đồng. Tiến hành gửi báo giá không có file hợp đồng.");
          }
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
            delivery_date_change_reason: form.getFieldValue("date_change_reason") || undefined,

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
            print_length_mm: primaryQuote.print_height,

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
            const quoteDiscountPercent = calculations.discountPercent || 0;
            const discountAmt = Math.round((originalPrice * quoteDiscountPercent) / 100);

            const estimationResult = mapToOrderEstimationResult(
              calculations.costEstimate,
              calculations.paperEstimate,
              currentOrderId,
              quote.delivery_date, // Use quote specific date if available
              quoteDiscountPercent,
              discountAmt,
              {
                paper_name: paperTypes.find((p) => p.code === quote.paper_code)?.name || quote.paper_name || "",
                wave_type: quote.wave_type,
                production_processes: Array.isArray(quote.production_processes) ? quote.production_processes.join(",") : quote.production_processes,
                ink_type_names: quote.ink_type_names as any,
                bleed_mm: quote.bleed,
                glue_tab_mm: quote.glue_tab,
                is_one_side_box: quote.is_one_side_box,
                previous_estimate_id: calculations.previous_estimate_id || null,
                final_total_cost: quote.final_price,
                contract_file_path: finalContractPath,
                contract_uploaded_at: contractUploadedAt
              }
            );

            // 3.2.1 Handle specific cost values from calculation if needed (optional)
            // Note: mapToOrderEstimationResult now respects additionalSpecs.final_total_cost

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
        let finalConsultantNote = primaryQuote.consultant_note || "";
        const dateChangeReason = form.getFieldValue("date_change_reason");
        if (dateChangeReason) {
          finalConsultantNote = `${finalConsultantNote}\nLí do thay đổi ngày giao hàng: ${dateChangeReason}`.trim();
        }

        await requestOrderApi.submitEstimateForApproval({
          request_id: parseInt(currentOrderId),
          consultant_note: finalConsultantNote,
        });
        // await axios.put("https://localhost:7109/api/Requests/submit-estimate-for-approval",{
        //    request_id: parseInt(currentOrderId),
        //      consultant_note: primaryQuote.consultant_note,
        //    });
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
      // 1. UPLOAD CONTRACT IF PRESENT
      let finalContractPath = "";
      let contractUploadedAt: string | null = null;
      const contractFieldValue = form.getFieldValue("contract_file");
      if (contractFieldValue && contractFieldValue.length > 0) {
        const contractFiles = contractFieldValue
          .map((f: any) => f.originFileObj || f)
          .filter((f: any) => f instanceof File || f instanceof Blob);

        if (contractFiles.length > 0) {
          try {
            const uploadRes: any = await uploadApi.uploadFile(contractFiles);
            if (uploadRes && uploadRes.data && uploadRes.data.length > 0) {
              finalContractPath = uploadRes.data[0];
              contractUploadedAt = new Date().toISOString();
            }
          } catch (uploadError) {
            console.error("Error uploading contract in adjust price:", uploadError);
          }
        }
      }

      if (costEstimate && paperEstimate) {
        try {
          // Lấy chiết khấu của tab hiện tại đang active
          const activeTabQuote = quoteTabs.find(t => t.key === activeTabKey);
          const currentTabDiscountPercent = activeTabQuote?.calculations?.discountPercent || 0;

          const originalPrice = costEstimate.cost.final_total_cost;
          const discountAmount = Math.round((originalPrice * currentTabDiscountPercent) / 100);

          const estimationResult = mapToOrderEstimationResult(
            costEstimate,
            paperEstimate,
            orderId,
            form.getFieldValue("delivery_date"),
            currentTabDiscountPercent,
            discountAmount,
            {
              paper_name: paperTypes.find((p) => p.code === form.getFieldValue("paper_code"))?.name || form.getFieldValue("paper_name") || "",
              wave_type: form.getFieldValue("wave_type"),
              production_processes: Array.isArray(form.getFieldValue("production_processes")) ? form.getFieldValue("production_processes").join(",") : form.getFieldValue("production_processes"),
              ink_type_names: form.getFieldValue("ink_type_names") as any,
              bleed_mm: form.getFieldValue("bleed"),
              glue_tab_mm: form.getFieldValue("glue_tab"),
              is_one_side_box: form.getFieldValue("is_one_side_box"),
              previous_estimate_id: previousEstimateId || null,
              final_total_cost: finalPrice,
              contract_file_path: finalContractPath,
              contract_uploaded_at: contractUploadedAt
            }
          );

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

  const isSendToManagerAction = isCreateMode ||
    !(existingOrder?.process_status === "verified" || existingOrder?.process_status === "Verified" ||
      existingOrder?.process_status === "Processing" || existingOrder?.process_status === "processing");

  const isPageLoading = loadingPaperTypes || loadingProductTypes || loadingFormTypes || loadingProcessTypes || configLoading || isFetchingOrder || loading;

  return (
    <>
      <Spin spinning={isPageLoading} fullscreen tip="Đang xử lý dữ liệu..." />
      <div className="p-4  min-h-screen">
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

          {orderStatus === 'Declined' && managerNote && (
            <div className="mb-4 sticky top-4 z-50">
              <Alert
                // title={<span className="font-bold">Yêu cầu chỉnh sửa từ Quản lý</span>}
                description={<div className="whitespace-pre-wrap text-slate-700">Yêu cầu chỉnh sửa từ Quản lý: <span className="font-bold">{managerNote}</span></div>}
                type="warning"
                showIcon
                className="border border-yellow-300 shadow-sm bg-yellow-50/50"
              />
            </div>
          )}

          <Form
            form={form}
            layout="vertical"
            disabled={loading}
            onFinish={onFinish}
            onValuesChange={handleFormValuesChange}
            initialValues={{
              number_of_plates: 1,
              coating_type: "Keo phủ nước",
              isOneSideBox: true,
              glueTab: 10,
            }}
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
                    requestDate={requestDate}
                    initialDeliveryDate={initialDeliveryDate}
                  />

                  <Divider titlePlacement="left" className="!my-3">
                    Thông Số Kỹ Thuật
                  </Divider>

                  <Tabs
                    type="editable-card"
                    hideAdd={quoteTabs.length >= 2}
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
                            glueTypes={glueTypes}
                            inkTypes={inkMaterials}
                            handleFormValuesChange={handleCalculate}
                            form={form}
                            disabledSharedFields={activeTabKey !== "1"}
                            highlightFields={highlightFieldsByTabIndex[quoteTabs.findIndex(t => t.key === activeTabKey)] || {}}
                            isDeclined={orderStatus === 'Declined'}
                            activeTabKey={activeTabKey}
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
                    {/* consultant note */}
                    <Col span={24}>
                      <Form.Item name="consultant_note" label="Ghi chú của Consultant" className="mb-2">
                        <Input.TextArea rows={2} placeholder="Nhập ghi chú dành cho Manager..." />
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

                  {isSendToManagerAction && orderStatus !== 'Declined' && (
                    <div className="mb-2">
                      <Checkbox
                        checked={isCustomerContacted}
                        onChange={(e) => setIsCustomerContacted(e.target.checked)}
                        className="font-medium text-blue-700"
                      >
                        Tôi đã liên hệ với khách hàng và được sự thống nhất với khách
                      </Checkbox>
                    </div>
                  )}
                  <Form.Item className={isSendToManagerAction && orderStatus !== 'Declined' ? "mt-2" : "mt-4"}>
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
                      disabled={
                        (existingOrder?.process_status === "Processing" || existingOrder?.process_status === "processing") ||
                        (isSendToManagerAction && orderStatus !== 'Declined' && !isCustomerContacted)
                      }
                    >
                      {isCreateMode
                        ? "GỬI QUẢN LÝ DUYỆT"
                        : (existingOrder?.process_status === "verified" || existingOrder?.process_status === "Verified")
                          ? "GỬI BÁO GIÁ CHO KHÁCH HÀNG"
                          : (existingOrder?.process_status === "Processing" || existingOrder?.process_status === "processing")
                            ? "ĐANG CHỜ DUYỆT"
                            : "GỬI QUẢN LÝ DUYỆT"}
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
                  setDiscountPercent={(val) => {
                    setDiscountPercent(val);

                    // Cũng update value cho cái tab hiện hành ngay lập tức vào state QuoteTabs
                    setQuoteTabs((prev) =>
                      prev.map(tab => {
                        if (tab.key === activeTabKey) {
                          return {
                            ...tab,
                            calculations: {
                              estimate: tab.calculations?.estimate || null,
                              paperEstimate: tab.calculations?.paperEstimate || null,
                              costEstimate: tab.calculations?.costEstimate || null,
                              estimate_id: tab.calculations?.estimate_id,
                              discountPercent: val
                            }
                          }
                        }
                        return tab;
                      })
                    );
                  }}
                  depositAmount={depositAmount}
                  form={form}
                  isCreateMode={isCreateMode}
                  handleAdjustPrice={handleAdjustPrice}
                  orderId={orderId}
                  isSavingCost={isSavingCost}
                  systemParameters={systemParameters}
                  highlightFields={highlightFieldsByTabIndex[quoteTabs.findIndex(t => t.key === activeTabKey)] || {}}
                  isDeclined={orderStatus === 'Declined'}
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
                { key: "coating_type", label: "Phủ/Tráng", format: (v) => v === "NONE" ? "Không" : v === "Keo phủ nước" ? "Keo nước" : v === "KEO_DAN" ? "Keo dán" : v },
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
                <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
                  {/* 1. Customer Info - Ultra Compact */}
                  <div className="bg-blue-50/50 px-4 py-2 rounded-md border border-blue-100 flex justify-between items-center text-base">
                    <div className="flex gap-2 items-center">
                      <span className="text-blue-800 font-semibold"><UserOutlined /> {submitValues[0]?.customer_name || "Khách hàng"}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">{submitValues[0]?.customer_phone || "SĐT"}</span>
                    </div>
                    <div className="text-sm text-gray-500 italic">
                      {submitValues?.length} phương án báo giá
                    </div>
                  </div>

                  {/* 2. Common Technical Specs Card (Only if there are common specs) */}
                  {Object.keys(commonSpecs).length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
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
                    const quoteDiscountPercent = quote.calculations?.discountPercent || 0;
                    // unique specs for this quote
                    const uniqueForThis = uniqueSpecsMap[index] || {};

                    // Derived Values
                    const subtotal = Math.round(calc?.subtotal || 0);
                    const discountAmt = Math.round((subtotal * quoteDiscountPercent) / 100) || 0;
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
                            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
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
                        <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                                    <span>Chiết khấu ({quoteDiscountPercent}%):</span>
                                    <span className="text-red-500">-{discountAmt.toLocaleString()} đ</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                                  <span className="font-bold text-gray-700">Tổng cộng (Sau VAT):</span>
                                  <span className={`font-bold text-lg ${negotiatedPrice ? 'text-gray-400 line-through text-base' : 'text-blue-600'}`}>
                                    {finalTotal.toLocaleString()} đ
                                  </span>
                                </div>

                                {negotiatedPrice && (
                                  <div className="flex justify-between items-center bg-yellow-50 px-2 py-1 rounded mt-1 border border-yellow-100">
                                    <span className="font-bold text-yellow-700">Giá chốt:</span>
                                    <span className="font-bold text-xl text-red-600">{Math.round(negotiatedPrice).toLocaleString()} đ</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center text-sm text-orange-600 mt-1">
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

                  {/* 4. Consultant Note */}
                  {submitValues[0]?.consultant_note && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm mt-3">
                      <div className="font-bold text-yellow-800 mb-1 uppercase border-b border-yellow-200 pb-1">
                        Ghi chú
                      </div>
                      <div className="text-yellow-900 whitespace-pre-wrap mt-2">
                        {submitValues[0].consultant_note}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Modal>

        </div>
      </div>
    </>
  );
}

export default function ConsultantPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConsultantForm />
    </Suspense>
  );
}
