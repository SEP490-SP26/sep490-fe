"use client";

import { estimatesApi } from "@/apiRequests/estimates";
import { machineApi } from "@/apiRequests/machine";
import { materialsApi } from "@/apiRequests/materials";
import { productionsApi } from "@/apiRequests/productions";
import { productTypesApi } from "@/apiRequests/producttypes";
import { requestOrderApi } from "@/apiRequests/request";
import { Order, ProductTemplate, useProduction } from "@/context/ProductionContext";
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
import { useEstimationCalculator } from "@/hooks/useEstimationCalculator";
import { useEstimationConfig } from "@/hooks/useEstimationConfig";
import { EstimationInputs, OrderEstimationResult } from "@/lib/estimation.types";
import {
  CodeSandboxOutlined,
  DashboardOutlined,
  FileTextOutlined,
  UploadOutlined,
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
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
import { isVietnamHoliday } from "@/utils/vietnamHolidays";
import { uploadApi } from "@/apiRequests/uploads";

const PRODUCT_SUGGESTIONS = [
  "Hộp bánh trung thu cao cấp",
  "Hộp thuốc tây",
  "Tờ rơi A4",
  "Catalogue 32 trang",
  "Hộp carton sóng E",
];

const PROCESS_TYPE_LABELS: Record<string, string> = {
  IN: "In",
  RALO: "Ra Lô",
  CAT: "Cắt",
  BOI: "Bồi",
  PHU: "Phủ",
  CAN_MANG: "Cán màng",
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
    };

    fetchData();
  }, []);

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
          });

          if (orderData.design_file_path) {
            setDesignFilePath(orderData.design_file_path);
          }
          if (orderData.is_send_design !== undefined) {
            setIsSendDesign(orderData.is_send_design);
          }

          if (orderData.quantity) {
            const values = form.getFieldsValue();
            handleCalculate(values, values);
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    fetchOrderDetails();
  }, [orderId, form]);

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

    form.setFieldValue("final_price", result.finalCost);
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
      const newValues = {
        paper_code: profile.paper_code,
        length: profile.product_length_mm,
        width: profile.product_width_mm,
        height: profile.product_height_mm,
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
        // ...(selectedProductTypeCode === "HOP_MAU" && {
        //   glueTab: profile.glue_tab_mm,
        //   isOneSideBox: profile.is_one_side_box,
        // }),
      };
      form.setFieldsValue(newValues);
      // setTimeout(() => calculatePaperEstimate(), 100);
    }
  }, [productTempalte, form, selectedProductTypeCode]);

  const calculateEstimates = () => {
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
        bleed_mm: 1,
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
          ink_cost: result.costs.material.ink,
          ink_weight_kg: 0,
          ink_rate_per_m2: 0,
          ink_unit_price: 0,

          // Coating
          coating_glue_cost: result.costs.material.coatingGlue,
          coating_glue_weight_kg: 0,
          coating_glue_rate_per_m2: 0,
          coating_glue_unit_price: 0,
          coating_type: inputs.coating_type || "KEO_NUOC",

          // Mounting
          mounting_glue_cost: result.costs.material.mountingGlue,
          mounting_glue_weight_kg: 0,
          mounting_glue_rate_per_m2: 0,
          mounting_glue_unit_price: 0,

          // Lamination
          lamination_cost: result.costs.material.lamination,
          lamination_weight_kg: 0,
          lamination_rate_per_m2: 0,
          lamination_unit_price: 0,

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
  };

  // Debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    handleCalculate(changedValues, allValues);

    const relevantFields = [
      "paper_code", "quantity", "length", "width", "height",
      "product_type", "production_processes", "wave_type",
      "number_of_plates", "coating_type", "delivery_date",
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

  const onFinish = async (values: any) => {
    setLoading(true);

    if (!orderId && !createdOrderId) {
      try {
        const payload: CreateRequestBodyForConsultant = {
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_email: values.customer_email,
          detail_address: values.detail_address,
        };

        const res: any = await requestOrderApi.createRequestOrderByConsultant(payload);
        const newId = res?.order_request_id || res?.data?.order_request_id;

        if (newId) {
          setCreatedOrderId(newId);
          await processOrderSubmission(newId.toString(), values);
        } else {
          throw new Error("Không thể tạo ID đơn hàng mới");
        }
      } catch (error) {
        console.error("Error creating new order:", error);
        message.error("Lỗi khi tạo đơn hàng mới");
        setLoading(false);
        return;
      }
    } else {
      await processOrderSubmission(orderId || createdOrderId?.toString() || "", values);
    }
  };

  // Hàm xử lý submit riêng
  const processOrderSubmission = async (currentOrderId: string, values: any) => {
    try {
      // 0. Upload các file mới (nếu có) trước khi gửi
      let finalDesignPath = designFilePath || "";

      const newFiles = fileList
        .map((f) => f.originFileObj || f)
        .filter((f) => f);

      if (newFiles.length > 0) {
        try {
          message.loading({ content: "Đang tải file lên...", key: "uploading" });
          const uploadRes: any = await uploadApi.uploadFile(newFiles);

          let newUrls: string[] = [];
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
          // Optional: return if upload is critical, otherwise continue
        }
      }

      const finalPrice = form.getFieldValue("final_price");
      const finalNote = values.description || "";

      const orderData = {
        product_id: values.paper_code,
        product_name: values.product_name,
        quantity: values.quantity,
        delivery_date: values.delivery_date.format("YYYY-MM-DD"),
        system_delivery_date: estimate?.systemDate,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        final_price: finalPrice,
        rush_fee: estimate?.rushFee,
        design_file_url: finalDesignPath, // Updated here
        specs: {
          width: values.width,
          height: values.height,
          length: values.length,
          paper_id: values.paper_code,
          colors: [],
          processing: values.production_processes,
        },
        is_send_design: isSendDesign,
        note: finalNote,
      };

      if (isNegotiateMode) {
        // Chế độ negotiate: CẬP NHẬT đơn hiện tại
        if (!finalPrice || finalPrice <= 0) {
          message.warning("Vui lòng nhập giá chốt hợp lệ!");
          setLoading(false);
          return;
        }

        // 1. Cập nhật thông tin request xuống BE
        const selectedProductType = productTypes.find(
          (pt) => pt.product_type_id === values.product_type
        );
        const productTypeCode = selectedProductType?.code || "";
        const paperName = paperTypes.find((p) => p.code === values.paper_code)?.name || "";

        const updateBody: Partial<UpdateRequestBody> = {
          customer_name: values.customer_name,
          customer_phone: values.customer_phone,
          customer_email: values.customer_email,
          delivery_date: values.delivery_date ? values.delivery_date.toISOString() : new Date().toISOString(),
          product_name: values.product_name,
          quantity: values.quantity,
          description: values.description || "",
          detail_address: values.detail_address || "",

          // Specs
          paper_code: values.paper_code,
          paper_name: paperName,
          product_type: productTypeCode,
          number_of_plates: values.number_of_plates,
          coating_type: values.coating_type,
          wave_type: values.wave_type,

          product_length_mm: values.length,
          product_width_mm: values.width,
          product_height_mm: values.height,
          glue_tab_mm: values.glue_tab,
          bleed_mm: values.bleed,

          is_one_side_box: values.is_one_side_box,
          print_width_mm: values.print_width,
          print_height_mm: values.print_height,

          production_processes: Array.isArray(values.production_processes)
            ? values.production_processes.join(",")
            : values.production_processes,

          is_send_design: isSendDesign,
          design_file_path: finalDesignPath, // Updated here
        };


        try {
          await requestOrderApi.updateRequest(currentOrderId, updateBody);
        } catch (updateError) {
          console.error("Error updating request details:", updateError);
          message.warning("Cập nhật thông tin chi tiết thất bại, nhưng sẽ tiếp tục cập nhật giá.");
        }

        // 2. Cập nhật giá
        // await estimatesApi.adjustCost(parseInt(currentOrderId), finalPrice);

        // 2.1 Lưu bảng tính chi tiết (Cost Save)
        // if (costEstimate && paperEstimate) {
        //   try {
        //     const estimationResult = mapToOrderEstimationResult(
        //       costEstimate,
        //       paperEstimate,
        //       currentOrderId,
        //       values.delivery_date
        //     );

        //     await estimatesApi.costSave(estimationResult);
        //   } catch (costError) {
        //     console.error("Error saving cost breakdown:", costError);
        //   }
        // }

        // 2. Gửi email báo giá
        const response = await requestOrderApi.sendDeal(parseInt(currentOrderId));

        // if (response.message === "Sent deal email") {
        //   // 3. Cập nhật trạng thái trong context/local
        //   if (existingOrder) {
        //     updateOrder(currentOrderId, {
        //       ...orderData,
        //       process_status: "waiting_customer_confirm",
        //       order_id: currentOrderId,
        //       code: `ORD-${currentOrderId}`,
        //     });
        //   } else {
        //     // Nếu không có trong context, thêm mới
        //     addOrder({
        //       ...orderData,
        //       order_id: currentOrderId,
        //       code: `ORD-${currentOrderId}`,
        //       process_status: "waiting_customer_confirm",
        //       can_fulfill: estimate?.isStockEnough || false,
        //     });
        //   }

        //   message.success("Đã gửi báo giá cho khách hàng!");
        // } else {
        //   throw new Error(response.detail || "Lỗi gửi email");
        // }
      } else {
        // Chế độ create: Tạo đơn mới
        // ... logic cho create mode
      }

      router.push("/consultant/requests");
    } catch (error: any) {
      console.error("Error processing order:", error);
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
            discountAmount
          );
          await estimatesApi.costSave(estimationResult);
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

                <ProductSpecsSection
                  orderId={orderId}
                  PRODUCT_SUGGESTIONS={PRODUCT_SUGGESTIONS}
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
                  >
                    {isCreateMode
                      ? "XÁC NHẬN & GỬI MANAGER DUYỆT"
                      : estimate?.caseType === 3
                        ? "CHỐT GIÁ & GỬi KHÁCH HÀNG"
                        : estimate?.caseType === 2
                          ? "GỬI BÁO GIÁ ƯU TIÊN"
                          : "GỬI BÁO GIÁ CHO KHÁCH HÀNG"}
                  </Button>
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
