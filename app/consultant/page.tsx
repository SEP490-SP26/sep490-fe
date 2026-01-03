/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { estimatesApi } from "@/api/estimates";
import { machineApi } from "@/api/machine";
import { materialsApi } from "@/api/materials";
import { productionsApi } from "@/api/productions";
import { productTypesApi } from "@/api/producttypes";
import { requestOrderApi } from "@/api/request";
import { uploadApi } from "@/api/uploads";
import { Order, useProduction } from "@/context/ProductionContext";
import {
  CreateRequestBody,
  EstimateCostResponse,
  EstimatePaperResponse,
  FreeMachine,
  MachineCapacity,
  Material,
  ProcessCostBreakdownResponse,
  ProductType
} from "@/schemaValidations/common.schema";
import {
  CalculatorOutlined,
  CodeSandboxOutlined,
  DashboardOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  PlusOutlined,
  UploadOutlined,
  UserOutlined,
  WarningOutlined
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import type { UploadFile, UploadProps } from "antd";
import {
  Alert,
  Image as AntImage,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Progress,
  Row,
  Select,
  Steps,
  Tag,
  Upload
} from "antd";
import { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// --- UTILS: FORMAT SỐ VỚI DẤU CHẤM (TIẾNG VIỆT) ---
const formatNumber = (num: number): string => {
  return num.toLocaleString('vi-VN');
};

// --- UTILS: HÀM XỬ LÝ MÀU TỪ ẢNH (CANVAS API) ---
const getDominantColors = (
  imageSrc: string,
  count: number = 5
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context error");

      canvas.width = 100;
      canvas.height = 100 * (img.height / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      const colorCounts: { [key: string]: number } = {};

      for (let i = 0; i < imageData.length; i += 4 * 5) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const alpha = imageData[i + 3];
        if (
          alpha < 128 ||
          (r > 240 && g > 240 && b > 240) ||
          (r < 15 && g < 15 && b < 15)
        )
          continue;

        const rRound = Math.round(r / 20) * 20;
        const gRound = Math.round(g / 20) * 20;
        const bRound = Math.round(b / 20) * 20;

        const rgb = `rgb(${rRound},${gRound},${bRound})`;
        colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
      }

      const sortedColors = Object.entries(colorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, count)
        .map(([color]) => {
          const [r, g, b] = color.match(/\d+/g)!.map(Number);
          return (
            "#" +
            ((1 << 24) + (r << 16) + (g << 8) + b)
              .toString(16)
              .slice(1)
              .toUpperCase()
          );
        });

      resolve(sortedColors);
    };
    img.onerror = (e) => reject(e);
  });
};

// --- DỮ LIỆU MẪU ---
const PAPER_TYPES = [
  { label: "Giấy Duplex 250 (Khổ 650)", value: "VT00008", stock: 30437 },
  { label: "Giấy Ivory 300 (Khổ 79x109)", value: "VT00012", stock: 1200 },
  { label: "Giấy Couche 150", value: "VT00020", stock: 5000 },
  { label: "Giấy Kraft", value: "VT00030", stock: 0 },
];

// Mapping process type code to Vietnamese label
const PROCESS_TYPE_LABELS: Record<string, string> = {
  'IN': 'In',
  'RALO': 'Ra Lô',
  'CAT': 'Cắt',
  'BOI': 'Bồi',
  'PHU': 'Phủ',
  'CAN_MANG': 'Cán màng',
  'BE': 'Bế/Dứt',
  'DUT': 'Dứt',
  'DAN': 'Dán',
  'DOT': 'Đột',
};

const PRODUCT_SUGGESTIONS = [
  "Hộp bánh trung thu cao cấp",
  "Hộp thuốc tây",
  "Tờ rơi A4",
  "Catalogue 32 trang",
  "Hộp carton sóng E",
];

const RUSH_FEE_LOW = 500000;
const RUSH_FEE_HIGH = 2000000;
const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  // Can not select days before today and today
  return current && current < dayjs().endOf("day");
};

interface DesignItem {
  id: string;
  file: UploadFile | null;
  previewUrl: string;
  colors: string[];
}

// --- COMPONENT CHÍNH ---
function ConsultantForm() {
  const [form] = Form.useForm();
  const {
    addOrder,
    updateOrder,
    products,
    orders,
    isBusy,
    currentProductionLoad,
  } = useProduction();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const modeParam = searchParams.get("mode"); // 'negotiate' or 'create'
  const [loading, setLoading] = useState(false);

  // Determine mode based on URL param or order status
  const existingOrder = orderId ? orders.find((o) => o.order_id === orderId) : null;
  const isNegotiateMode =
    modeParam === "negotiate" ||
    existingOrder?.process_status === "pending_consultant" ||
    (!orderId && !modeParam); // New order = negotiate mode
  const isCreateMode =
    modeParam === "create" ||
    existingOrder?.process_status === "pending_order_creation";

  const [designItems, setDesignItems] = useState<DesignItem[]>([]);
  
  // State cho file thiết kế từ API
  const [designFilePath, setDesignFilePath] = useState<string | null>(null);

  // State cho danh sách loại giấy từ API Materials
  const [paperTypes, setPaperTypes] = useState<{code: string; name: string}[]>([]);
  const [loadingPaperTypes, setLoadingPaperTypes] = useState(false);

  // State cho danh sách loại sản phẩm từ API ProductTypes
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loadingProductTypes, setLoadingProductTypes] = useState(false);

  // State cho danh sách form type (hiển thị khi chọn Hộp màu hoặc Vỏ hộp gạch)
  const [formTypes, setFormTypes] = useState<string[]>([]);
  const [loadingFormTypes, setLoadingFormTypes] = useState(false);
  const [selectedProductTypeCode, setSelectedProductTypeCode] = useState<string>('');

  // State cho danh sách process types từ API
  const [processTypes, setProcessTypes] = useState<string[]>([]);
  const [loadingProcessTypes, setLoadingProcessTypes] = useState(false);
  
  // State cho process cost breakdown (hiển thị giá kế bên checkbox)
  const [processCostBreakdown, setProcessCostBreakdown] = useState<ProcessCostBreakdownResponse | null>(null);
  const [loadingProcessCost, setLoadingProcessCost] = useState(false);

  // State cho loại sóng (khi chọn BOI)
  const [songTypes, setSongTypes] = useState<Material[]>([]);

  // State cho Modal danh sách đơn hàng tại xưởng
  const [isFactoryModalOpen, setIsFactoryModalOpen] = useState(false);
  const [factoryOrders, setFactoryOrders] = useState<Order[]>([]);

  // State estimate
  const [estimate, setEstimate] = useState<{
    baseCost: number;
    rushFee: number;
    daysEarly: number;
    finalCost: number; // Giá hệ thống tính (để tham khảo)
    systemDate: string;
    caseType: 1 | 2 | 3;
    paperNeeded: number;
    isStockEnough: boolean;
    productionDays: number;
    effectiveDate: string;
  } | null>(null);

  // State cho kết quả tính toán giấy từ API
  const [paperEstimate, setPaperEstimate] =
    useState<EstimatePaperResponse | null>(null);
  const [loadingPaperEstimate, setLoadingPaperEstimate] = useState(false);

  // State cho kết quả tính toán chi phí từ API
  const [costEstimate, setCostEstimate] = useState<EstimateCostResponse | null>(
    null
  );
  const [loadingCostEstimate, setLoadingCostEstimate] = useState(false);
  
  // State cho giảm giá (tính trên FE)
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // State cho tiền đặt cọc từ API
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // State cho thông tin máy từ API
  const [machineCapacity, setMachineCapacity] =
    useState<MachineCapacity | null>(null);
  const [freeMachines, setFreeMachines] = useState<FreeMachine[]>([]);

  // Tính số máy đang chạy từ API
  const totalMachines = machineCapacity?.totalMachines || 8;
  const runningMachines = machineCapacity?.runningMachines || 0;
  const isWorkshopFull = runningMachines >= totalMachines * 0.9; // Đầy nếu >= 90%

  // Tính toán ngày dự kiến xưởng rảnh
  const getEstimatedFreeDate = () => {
    // Lấy các đơn đang sản xuất
    const activeOrders = orders.filter((o) => o.status === "in_production");
    if (activeOrders.length === 0)
      return { days: 0, date: dayjs().format("DD/MM/YYYY") };

    // Tìm ngày giao sớm nhất của các đơn đang chạy (giả sử đó là lúc máy rảnh)
    const sortedOrders = [...activeOrders].sort(
      (a, b) =>
        new Date(a.delivery_date).getTime() -
        new Date(b.delivery_date).getTime()
    );

    const nextFreeDateStr = sortedOrders[0]?.delivery_date;
    if (!nextFreeDateStr)
      return { days: 2, date: dayjs().add(2, "day").format("DD/MM/YYYY") };

    const nextFreeDate = dayjs(nextFreeDateStr);
    const diffDays = nextFreeDate.diff(dayjs(), "day");
    return {
      days: diffDays > 0 ? diffDays : 1,
      date: nextFreeDate.format("DD/MM/YYYY"),
    };
  };

  const workshopFreeInfo = getEstimatedFreeDate();
  const daysUntilFree = workshopFreeInfo.days;

  // data fetching
  const createRequestOrder = useMutation({
    mutationFn: async (form: CreateRequestBody) => {
      const res = await requestOrderApi.createRequestOrderByCustomer(form);
      console.log("data", res.data);
      return res.data;
    },
  });

  // --- FETCH PAPER TYPES & PRODUCT TYPES FROM API ---
  useEffect(() => {
    const fetchPaperTypes = async () => {
      setLoadingPaperTypes(true);
      try {
        const response = await materialsApi.getAllPaperTypes();
        // Response format: { paperTypes: [{code, name, stockQty}], mostStockPaperNames: string }
        if (response?.paperTypes && Array.isArray(response.paperTypes)) {
          // Lưu danh sách paper types với code và name
          setPaperTypes(response.paperTypes.map((pt: { code: string; name: string }) => ({
            code: pt.code,
            name: pt.name,
          })));
        }
      } catch (error) {
        console.error("Error fetching paper types:", error);
      } finally {
        setLoadingPaperTypes(false);
      }
    };

    const fetchProductTypes = async () => {
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
    };

    const fetchFormTypes = async () => {
      setLoadingFormTypes(true);
      try {
        // Fetch both HOP_MAU forms and GACH types from ProductTypes API
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
    };

    const fetchMachineData = async () => {
      try {
        const [capacityRes, freeRes] = await Promise.all([
          machineApi.getCapacity(),
          machineApi.getFreeMachines(),
        ]);
        if (capacityRes) {
          setMachineCapacity(capacityRes);
        }
        if (Array.isArray(freeRes)) {
          setFreeMachines(freeRes);
        }
      } catch (error) {
        console.error("Error fetching machine data:", error);
      }
    };

    const fetchProcessTypes = async () => {
      setLoadingProcessTypes(true);
      try {
        const response = await productionsApi.getAllProcessTypes();
        if (Array.isArray(response)) {
          setProcessTypes(response);
        }
      } catch (error) {
        console.error("Error fetching process types:", error);
      } finally {
        setLoadingProcessTypes(false);
      }
    };

    // Fetch danh sách loại sóng (cho BOI)
    const fetchSongTypes = async () => {
      try {
        const response = await materialsApi.getSongTypes();
        if (Array.isArray(response)) {
          setSongTypes(response);
        }
      } catch (error) {
        console.error("Error fetching song types:", error);
      }
    };

    fetchPaperTypes();
    fetchProductTypes();
    fetchFormTypes();
    fetchProcessTypes();
    fetchMachineData();
    fetchSongTypes();
  }, []);

  // --- Fetch process cost breakdown khi paperEstimate thay đổi ---
  // NOTE: Đã comment lại vì function đã được comment
  /*
  useEffect(() => {
    if (paperEstimate) {
      fetchProcessCostBreakdown();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperEstimate]);
  */

  // --- 1. TỰ ĐỘNG ĐIỀN DỮ LIỆU TỪ API ---
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
            product_name: orderData.product_name ? [orderData.product_name] : [],
            quantity: orderData.quantity,
            delivery_date: orderData.delivery_date
              ? dayjs(orderData.delivery_date)
              : null,
            detail_address: orderData.detail_address,
            description: orderData.description,
            // Fields từ Accepted order
            number_of_plates: orderData.number_of_plates || 1,
            coating_type: (orderData.coating_type && orderData.coating_type !== "NONE") 
              ? orderData.coating_type 
              : "KEO_NUOC",
          });

          // Lấy file thiết kế từ API
          if (orderData.design_file_path) {
            setDesignFilePath(orderData.design_file_path);
          }

          // Trigger calculation if we have quantity and date
          if (orderData.quantity) {
            handleCalculate(
              { quantity: orderData.quantity },
              {
                quantity: orderData.quantity,
                delivery_date: orderData.delivery_date
                  ? dayjs(orderData.delivery_date)
                  : null,
              }
            );
          }
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    fetchOrderDetails();
  }, [orderId, form]);

  // --- LOGIC XEM ĐƠN HÀNG TẠI XƯỞNG ---
  const handleOpenFactoryOrders = () => {
    const activeOrders = orders.filter(
      (o) => o.status === "in_production" || o.status === "scheduled"
    );
    setFactoryOrders(activeOrders);
    setIsFactoryModalOpen(true);
  };

  const handleUploadChange: UploadProps["onChange"] = ({
    fileList: newFileList,
  }) => {
    const latestFile = newFileList[newFileList.length - 1];
    if (!latestFile) return;

    const exists = designItems.some(
      (item) => item.file?.uid === latestFile.uid
    );
    if (!exists && latestFile.originFileObj) {
      const objectUrl = URL.createObjectURL(latestFile.originFileObj);
      const newItem: DesignItem = {
        id: `design-${Date.now()}`,
        file: latestFile,
        previewUrl: objectUrl,
        colors: ["#000000"],
      };
      setDesignItems((prev) => [...prev, newItem]);
    }
  };

  const removeDesignItem = (id: string) => {
    setDesignItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemColors = (id: string, newColors: string[]) => {
    setDesignItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, colors: newColors } : item
      )
    );
  };

  const handleAutoExtract = async (id: string, previewUrl: string) => {
    try {
      message.loading({ content: "Đang quét màu...", key: "extract" });
      const colors = await getDominantColors(previewUrl, 5);
      updateItemColors(id, colors);
      message.success({ content: "Đã lấy màu xong!", key: "extract" });
    } catch (e) {
      message.error("Lỗi khi đọc ảnh");
    }
  };

  const handleEyeDropper = async (id: string) => {
    if (!window.EyeDropper) return message.error("Trình duyệt không hỗ trợ!");
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      const hex = result.sRGBHex;

      const item = designItems.find((i) => i.id === id);
      if (item && !item.colors.includes(hex)) {
        updateItemColors(id, [...item.colors, hex]);
      }
    } catch (e) {}
  };

  // --- LOGIC TÍNH TOÁN & SUBMIT ---
  const handleCalculate = (changedValues: any, allValues: any) => {
    const { quantity, paper_code, delivery_date } = allValues;

    if ("final_price" in changedValues) return;

    if (!quantity) return;

    const baseCost = quantity * 2500 + 3000000;

    const paperNeeded = Math.ceil((quantity / 4) * 1.05);
    const selectedPaper = PAPER_TYPES.find((p) => p.value === paper_code);
    const isStockEnough = selectedPaper
      ? selectedPaper.stock >= paperNeeded
      : true;

    const waitingDays = isWorkshopFull ? daysUntilFree : 0;
    const productionDays = Math.ceil(quantity / 2000) + 2;
    const materialLeadTime = isStockEnough ? 0 : 4;
    const totalSystemDays = productionDays + materialLeadTime + waitingDays;

    const today = dayjs();
    const systemDateObj = today.add(totalSystemDays, "day");
    const systemDateStr = systemDateObj.format("YYYY-MM-DD");

    if (!orderId && "quantity" in changedValues && !delivery_date) {
      form.setFieldValue("delivery_date", systemDateObj);
    }

    const currentDesiredDate = delivery_date || systemDateObj;
    let rushFee = 0;
    let daysEarly = 0;
    let caseType: 1 | 2 | 3 = 1;

    if (currentDesiredDate.isBefore(systemDateObj, "day")) {
      daysEarly = systemDateObj.diff(currentDesiredDate, "day");
      if (!isStockEnough || isWorkshopFull) {
        rushFee = daysEarly * RUSH_FEE_HIGH * 1.5;
        caseType = 3;
      } else if (!isBusy) {
        rushFee = daysEarly * RUSH_FEE_LOW;
        caseType = 2;
      } else {
        rushFee = daysEarly * RUSH_FEE_HIGH;
        caseType = 3;
      }
    }

    const calculatedTotal = baseCost + rushFee;

    form.setFieldValue("final_price", calculatedTotal);

    setEstimate({
      baseCost,
      rushFee,
      daysEarly,
      finalCost: calculatedTotal,
      systemDate: systemDateStr,
      caseType,
      paperNeeded,
      isStockEnough,
      productionDays,
      effectiveDate: currentDesiredDate.format("YYYY-MM-DD"),
    });
  };

  // --- TÍNH TOÁN GIẤY TỪ API ---
  const calculatePaperEstimate = async () => {
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
    } = values;

    // Validate required fields
    if (
      !paper_code ||
      !quantity ||
      !length ||
      !width ||
      !height ||
      !product_type
    ) {
      return;
    }

    // Paper type is now the code directly from API
    const paperCode = paper_code as string;

    // Get product type code
    const selectedProductType = productTypes.find(
      (pt) => pt.product_type_id === product_type
    );
    const productTypeCode = selectedProductType?.code || "";

    // Convert processing array to comma-separated string (no space)
    const productionProcessesStr = Array.isArray(production_processes)
      ? production_processes.join(",")
      : "";

    setLoadingPaperEstimate(true);
    try {
      const formType = form.getFieldValue('form_product');
      const isOneSideBox = form.getFieldValue('is_one_side_box') ?? true;
      const glueTab = form.getFieldValue('glue_tab') ?? 10; // Default 10mm
      const waveType = form.getFieldValue('wave_type'); // Loại sóng khi có BOI
      
      const response = await estimatesApi.estimatePaper({
        paper_code: paperCode,
        quantity: quantity,
        length_mm: length,
        width_mm: width,
        height_mm: height,
        glue_tab_mm: glueTab,
        bleed_mm: 1, // Default value
        is_one_side_box: isOneSideBox,
        product_type: productTypeCode,
        form_product: formType || '',
        number_of_plates: number_of_plates || 1,
        production_processes: productionProcessesStr,
        coating_type: coating_type || "KEO_NUOC",
        // wave_type: có giá trị khi BOI, rỗng khi không có BOI
        wave_type: productionProcessesStr.includes('BOI') && waveType ? waveType : "",
      });

      if (response) {
        setPaperEstimate(response);
        // After getting paper estimate, calculate cost
        calculateCostEstimate(
          response,
          productTypeCode,
          productionProcessesStr,
          coating_type
        );
      }
    } catch (error) {
      console.error("Error calculating paper estimate:", error);
      // Silent fail for realtime - don't show error message for auto-calc
    } finally {
      setLoadingPaperEstimate(false);
    }
  };

  // --- TÍNH TOÁN CHI PHÍ TỪ API ---
  const calculateCostEstimate = async (
    paperData: EstimatePaperResponse,
    productTypeCode: string,
    productionProcesses: string,
    coatingType: string
  ) => {
    const values = form.getFieldsValue();
    const { delivery_date } = values;

    if (!orderId || !paperData) return;

    setLoadingCostEstimate(true);
    try {
      const formType = form.getFieldValue('form_product');
      const waveType = form.getFieldValue('wave_type'); // Loại sóng khi có BOI
      
      const response = await estimatesApi.estimateCost({
        order_request_id: parseInt(orderId),
        paper: paperData,
        desired_delivery_date: delivery_date
          ? delivery_date.toISOString()
          : new Date().toISOString(),
        product_type: productTypeCode,
        form_product: formType || '',
        production_processes: productionProcesses,
        coating_type: coatingType || "KEO_NUOC",
        discount_percent: 0,
        // wave_type: có giá trị khi BOI, rỗng khi không có BOI
        wave_type: productionProcesses.includes('BOI') && waveType ? waveType : "",
      });

      if (response) {
        setCostEstimate(response);
        // Set suggested price to form (access via response.cost)
        form.setFieldValue(
          "final_price",
          Math.round(response.cost.final_total_cost)
        );
        
        // Fetch deposit amount sau khi có cost estimate
        try {
          const depositResponse = await estimatesApi.getDeposit(parseInt(orderId));
          setDepositAmount(depositResponse.deposit_amount || 0);
        } catch (depositError) {
          console.error("Error fetching deposit:", depositError);
        }
      }
    } catch (error) {
      console.error("Error calculating cost estimate:", error);
    } finally {
      setLoadingCostEstimate(false);
    }
  };

  // --- FETCH PROCESS COST BREAKDOWN (Hiển thị giá kế bên checkbox Gia Công) ---
  // NOTE: Đã comment lại để tránh lỗi 404 - có thể bật lại khi API sẵn sàng
  /*
  const fetchProcessCostBreakdown = async () => {
    if (!paperEstimate) return;
    
    const productType = form.getFieldValue('productType');
    const selectedProductType = productTypes.find(
      (pt) => pt.product_type_id === productType
    );
    const productTypeCode = selectedProductType?.code || "";
    const formType = form.getFieldValue('formType');
    const coatingType = form.getFieldValue('coatingType');
    const desiredDate = form.getFieldValue('desiredDate');
    
    // Gửi TẤT CẢ process types để lấy giá tham khảo cho tất cả công đoạn
    const allProcesses = processTypes.join(",");
    
    setLoadingProcessCost(true);
    try {
      const response = await estimatesApi.processCostBreakdown({
        order_request_id: orderId ? parseInt(orderId) : 0,
        paper: paperEstimate,
        desired_delivery_date: desiredDate
          ? desiredDate.toISOString()
          : new Date().toISOString(),
        product_type: productTypeCode,
        form_product: formType || '',
        production_processes: allProcesses,
        coating_type: coatingType || "KEO_NUOC",
        has_lamination: form.getFieldValue('hasLamination') || false,
        discount_percent: 0,
      });
      
      if (response) {
        setProcessCostBreakdown(response);
      }
    } catch (error) {
      console.error("Error fetching process cost breakdown:", error);
    } finally {
      setLoadingProcessCost(false);
    }
  };
  */

  // --- REALTIME AUTO-CALCULATION với DEBOUNCE ---
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // Trigger handleCalculate for price estimation
    handleCalculate(changedValues, allValues);

    // Debounce paper estimate API call
    const relevantFields = [
      "paper_code",
      "quantity",
      "length",
      "width",
      "height",
      "product_type",
      "production_processes",
      "wave_type",
      "number_of_plates",
      "coating_type",
      "delivery_date",
    ];
    const hasRelevantChange = Object.keys(changedValues).some((key) =>
      relevantFields.includes(key)
    );

    if (hasRelevantChange) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer - call API after 800ms of no changes
      debounceTimerRef.current = setTimeout(() => {
        calculatePaperEstimate();
      }, 800);
    }
  };

  const onFinish = (values: any) => {
    setLoading(true);
    createRequestOrder.mutate(values);

    const allUniqueColors = Array.from(
      new Set(designItems.flatMap((i) => i.colors))
    );
    const colorDetailNote = designItems
      .map((item, idx) => `[Mẫu ${idx + 1}]: ${item.colors.join(", ")}`)
      .join("; ");
    const finalNote = values.description
      ? `${values.description}. Chi tiết màu: ${colorDetailNote}`
      : `Chi tiết màu: ${colorDetailNote}`;
    const fileUrls = designItems
      .map((i) => i.file?.url || "new-file")
      .join(",");

    const orderData = {
      product_id: values.paper_code,
      product_name: Array.isArray(values.product_name)
        ? values.product_name[0]
        : values.product_name,
      quantity: values.quantity,
      delivery_date: values.delivery_date.format("YYYY-MM-DD"),
      system_delivery_date: estimate?.systemDate,
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      process_status: "consultant_verified" as const,
      // Lấy giá chốt từ form input (giá người dùng có thể đã sửa)
      final_price: values.final_price,
      rush_fee: estimate?.rushFee,

      design_file_url: fileUrls,
      specs: {
        width: values.width,
        height: values.height,
        length: values.length,
        paper_id: values.paper_code,
        colors: allUniqueColors,
        processing: values.production_processes,
      },
      note: finalNote,
      contract_file: values.contract_file ? "contract.pdf" : undefined,
    };

    // Call sendDeal API for negotiate mode
    const handleSubmitOrder = async () => {
      try {
        if (orderId) {
          // Existing order
          if (isNegotiateMode) {
            // Lấy giá chốt từ form
            const finalPrice = form.getFieldValue('final_price');
            
            // Kiểm tra giá hợp lệ
            if (!finalPrice || finalPrice <= 0) {
              message.warning('Vui lòng nhập giá chốt hợp lệ trước khi gửi báo giá!');
              setLoading(false);
              return;
            }
            
            // Bước 1: Cập nhật giá chốt trước
            try {
              await estimatesApi.adjustCost(parseInt(orderId), finalPrice);
            } catch (adjustError) {
              console.error('Error adjusting cost:', adjustError);
              message.error('Có lỗi khi cập nhật giá. Vui lòng thử lại.');
              setLoading(false);
              return;
            }
            
            // Bước 2: Gửi báo giá cho khách hàng via API
            const response = await requestOrderApi.sendDeal(parseInt(orderId));
            
            if (response.message === "Sent deal email") {
              updateOrder(orderId, {
                ...orderData,
                process_status: "waiting_customer_confirm",
                contract_file: undefined,
              });
              message.success(
                "Đã gửi báo giá cho khách hàng! Chờ khách xác nhận qua email."
              );
            } else {
              // Handle error from API
              const errorMsg = response.detail || "Có lỗi khi gửi báo giá.";
              message.error(errorMsg);
              setLoading(false);
              return;
            }
          } else {
            // Create mode: send to manager
            updateOrder(orderId, {
              ...orderData,
              process_status: "consultant_verified",
            });
            message.success("Đã tạo đơn hàng và gửi cho Manager duyệt!");
          }
        } else if (estimate && estimate.isStockEnough) {
          // New order
          addOrder({
            ...orderData,
            order_id: orderId || '',
            code: `ORD-${orderId}`,
            can_fulfill: true,
            process_status: "waiting_customer_confirm",
            contract_file: undefined,
          });
          message.success("Đã tạo báo giá và gửi cho khách hàng!");
        } else {
          addOrder({
            ...orderData,
            order_id: orderId || '',
            code: `ORD-${orderId}`,
            can_fulfill: false,
            process_status: "waiting_customer_confirm",
            contract_file: undefined,
          });
          message.success("Đã tạo báo giá và gửi cho khách hàng!");
        }
        setLoading(false);
        router.push("/consultant/orders");
      } catch (error: any) {
        console.error("Error sending deal:", error);
        const errorDetail = error?.response?.data?.detail || "Có lỗi xảy ra. Vui lòng thử lại.";
        message.error(errorDetail);
        setLoading(false);
      }
    };

    handleSubmitOrder();
  };

  const renderStatusAlert = () => {
    if (!estimate) return null;
    if (isWorkshopFull) {
      return (
        <Alert
          message="⚠️ Xưởng đang quá tải!"
          description={
            <div className="space-y-2">
              <p>
                Công suất hiện tại:{" "}
                <b className="text-red-600">
                  {/* {machinesInUse}/{TOTAL_MACHINES} */}
                </b>{" "}
                máy đang chạy.
              </p>
              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="font-medium text-yellow-800 mb-1">
                  📅 Thông báo cho khách hàng:
                </p>
                <p className="text-yellow-700">
                  Xưởng sẽ bắt đầu rảnh trở lại vào ngày{" "}
                  <b className="text-yellow-900">{workshopFreeInfo.date}</b>{" "}
                  (còn <b>{daysUntilFree} ngày</b> nữa).
                </p>
                <p className="text-xs text-yellow-600 mt-1 italic">
                  Nếu khách hàng vẫn đồng ý, bạn có thể tiếp tục gửi đơn cho
                  Manager.
                </p>
              </div>
            </div>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          className="mb-4"
        />
      );
    }

    if (!estimate.isStockEnough) {
      return (
        <Alert
          title="Thiếu nguyên vật liệu"
          description="Kho không đủ giấy. Cần tạo phiếu Yêu Cầu Vật Tư sau khi tạo đơn."
          type="error"
          showIcon
          className="mb-4"
        />
      );
    }

    if (estimate.caseType === 3) {
      return (
        <Alert
          title="GẤP & QUÁ TẢI"
          description={`Khách cần sớm ${estimate.daysEarly} ngày. Xưởng đang bận. Đã tính phí gấp cao.`}
          type="error"
          showIcon
          className="mb-4"
        />
      );
    }

    if (estimate.caseType === 2) {
      return (
        <Alert
          title="Đơn hàng ưu tiên (Gấp)"
          description={`Khách cần sớm ${estimate.daysEarly} ngày. Đã tính phí ưu tiên.`}
          type="warning"
          showIcon
          className="mb-4"
        />
      );
    }

    return (
      <Alert
        title="Đủ điều kiện sản xuất"
        description="Kho đủ giấy & Tiến độ phù hợp."
        type="success"
        showIcon
        className="mb-4"
      />
    );
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
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
            {/* [MỚI] Hiển thị Công suất máy dạng thanh Progress */}
            <div className="flex flex-col items-end w-48">
              <div className="text-xs text-gray-500 flex gap-1 mb-1">
                <DashboardOutlined /> Công suất xưởng ({runningMachines}/
                {totalMachines})
              </div>
              <Progress
                percent={(runningMachines / totalMachines) * 100}
                size="small"
                // Đổi màu đỏ nếu đầy, xanh nếu còn chỗ
                status={isWorkshopFull ? "exception" : "active"}
                format={() => `${runningMachines} máy`}
                strokeColor={isWorkshopFull ? "#ff4d4f" : "#52c41a"}
              />
            </div>
          </div>
        </div>

        <Row gutter={16}>
          <Col span={16}>
            <Card
              title={
                <>
                  <CodeSandboxOutlined /> Thông Tin Đơn Hàng
                </>
              }
              className="shadow-sm"
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                onValuesChange={handleFormValuesChange}
              >
                {/* Thông tin khách - Sticky khi cuộn */}
                <div
                  className={`${
                    orderId
                      ? "sticky top-0 z-10 bg-white pb-2 border-b border-gray-100 -mx-6 px-6 pt-2"
                      : ""
                  }`}
                >
                  <Row gutter={12}>
                    <Col span={5}>
                      <Form.Item
                        name="customer_name"
                        label="Khách Hàng"
                        rules={[{ required: true }]}
                        className="mb-2"
                      >
                        <Input
                          prefix={<UserOutlined />}
                          placeholder="Tên khách..."
                          disabled={!!orderId}
                          className={orderId ? "bg-gray-50" : ""}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name="customer_phone" label="SĐT" className="mb-2">
                        <Input
                          placeholder="09..."
                          disabled={!!orderId}
                          className={orderId ? "bg-gray-50" : ""}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item name="customer_email" label="Email" className="mb-2">
                        <Input
                          placeholder="email@example.com"
                          disabled={!!orderId}
                          className={orderId ? "bg-gray-50" : ""}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item name="detail_address" label="Địa chỉ giao hàng" className="mb-2">
                        <Input
                          placeholder="Số nhà, đường, phường/xã, quận/huyện..."
                          disabled={!!orderId}
                          className={orderId ? "bg-gray-50" : ""}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </div>

                <Divider titlePlacement="left" className="!my-3">Thông Số Kỹ Thuật</Divider>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="product_name"
                      label="Tên sản phẩm"
                      rules={[{ required: true }]}
                    >
                      <Select
                        showSearch
                        placeholder="Chọn hoặc nhập mới"
                        options={PRODUCT_SUGGESTIONS.map((name) => ({
                          label: name,
                          value: name,
                        }))}
                        mode="tags"
                        maxCount={1}
                        disabled={!!orderId}
                        className={orderId ? "bg-gray-50" : ""}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="delivery_date"
                      label="Ngày Giao Mong Muốn"
                      rules={[{ required: true }]}
                      // help={
                      //   estimate ? (
                      //     <span className="text-blue-500 text-xs">
                      //       Hệ thống tính:{" "}
                      //       {dayjs(estimate.systemDate).format("DD/MM/YYYY")}
                      //     </span>
                      //   ) : (
                      //     ""
                      //   )
                      // }
                    >
<DatePicker
                          className="w-full"
                          format="DD-MM-YYYY"
                          disabledDate={disabledDate}
                          onChange={(date) => {
                            form.setFieldValue('desiredDate', date);
                            // Trigger form's onValuesChange manually
                            if (date) {
                              handleFormValuesChange({ desiredDate: date }, form.getFieldsValue());
                            }
                          }}
                        />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="product_type"
                      label="Loại Sản Phẩm"
                      rules={[
                        {
                          required: true,
                          message: "Vui lòng chọn loại sản phẩm",
                        },
                      ]}
                    >
                      <Select
                        showSearch
                        placeholder="Chọn loại sản phẩm"
                        loading={loadingProductTypes}
                        optionFilterProp="label"
                        options={productTypes.map((pt) => ({
                          label: `${pt.name} - ${pt.description}`,
                          value: pt.product_type_id,
                        }))}
                        onChange={(value) => {
                          const selected = productTypes.find(pt => pt.product_type_id === value);
                          setSelectedProductTypeCode(selected?.code || '');
                        }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="paper_code"
                      label="Loại Giấy"
                      rules={[
                        { required: true, message: "Vui lòng chọn loại giấy" },
                      ]}
                    >
                      <Select
                        showSearch
                        placeholder="Chọn loại giấy"
                        loading={loadingPaperTypes}
                        optionFilterProp="label"
                        options={paperTypes.map((paper) => ({
                          label: paper.name,
                          value: paper.code,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Hiển thị Form Type khi chọn Hộp màu hoặc Vỏ hộp gạch */}
                {(selectedProductTypeCode === 'HOP_MAU' || selectedProductTypeCode === 'VO_HOP_GACH') && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="form_product"
                        label="Loại Form"
                        rules={[
                          { required: true, message: "Vui lòng chọn loại form" },
                        ]}
                      >
                        <Select
                          showSearch
                          placeholder="Chọn loại form"
                          loading={loadingFormTypes}
                          optionFilterProp="label"
                          options={formTypes
                            .filter((ft) => {
                              if (selectedProductTypeCode === 'HOP_MAU') {
                                return ft.startsWith('HOP_MAU_');
                              } else if (selectedProductTypeCode === 'VO_HOP_GACH') {
                                return ft.startsWith('GACH_');
                              }
                              return true;
                            })
                            .map((ft) => ({
                              label: ft
                                .replace(/^HOP_MAU_/i, 'Hộp màu ')
                                .replace(/^GACH_/i, 'Gạch ')
                                .replace(/_/g, ' '),
                              value: ft,
                            }))}
                        />
                      </Form.Item>
                    </Col>
                    {/* Hiển thị toggle Hộp 1 mặt / 2 mặt + Táp dán chỉ khi chọn HOP_MAU */}
                    {selectedProductTypeCode === 'HOP_MAU' && (
                      <>
                        <Col span={6}>
                          <Form.Item
                            name="isOneSideBox"
                            label="Loại Hộp"
                            initialValue={true}
                          >
                            <Select
                              options={[
                                { label: '📦 Hộp 1 mặt', value: true },
                                { label: '📦 Hộp 2 mặt', value: false },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name="glueTab"
                            label="Táp dán (mm)"
                            initialValue={10}
                            tooltip="Chiều rộng táp dán, mặc định 10mm"
                          >
                            <InputNumber
                              min={0}
                              max={50}
                              placeholder="10"
                              style={{ width: '100%' }}
                              addonAfter="mm"
                            />
                          </Form.Item>
                        </Col>
                      </>
                    )}
                  </Row>
                )}

                <Row gutter={16}> 
                  <Col span={8}>
                    <Form.Item label="Kích thước D × R × C (mm)" required>
                      <div className="flex items-center gap-1">
                        <Form.Item name="length" noStyle>
                          <InputNumber
                            style={{ width: 60 }}
                            placeholder="D"
                            controls={false}
                            min={1}
                          />
                        </Form.Item>
                        <span className="text-gray-400">×</span>
                        <Form.Item name="width" noStyle>
                          <InputNumber
                            style={{ width: 60 }}
                            placeholder="R"
                            controls={false}
                            min={1}
                          />
                        </Form.Item>
                        <span className="text-gray-400">×</span>
                        <Form.Item name="height" noStyle>
                          <InputNumber
                            style={{ width: 60 }}
                            placeholder="C"
                            controls={false}
                            min={1}
                          />
                        </Form.Item>
                      </div>
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      name="quantity"
                      label="Số Lượng"
                      rules={[{ required: true, message: "Nhập số lượng" }]}
                    >
                      <InputNumber
                        className="w-full"
                        formatter={(value) =>
                          `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                        }
                        parser={(value) =>
                          Number(value?.replace(/\./g, "")) || 0
                        }
                        controls={false}
                        min={1}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item
                      name="number_of_plates"
                      label="Số Kẽm"
                      initialValue={1}
                    >
                      <InputNumber
                        className="w-full"
                        min={1}
                        controls={false}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      name="coating_type"
                      label="Loại Keo"
                      initialValue="KEO_NUOC"
                    >
                      <Select
                        options={[
                          { label: "Keo nước", value: "KEO_NUOC" },
                          { label: "Keo dầu", value: "KEO_DAU" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* File Thiết Kế - Dạng compact */}
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="File Thiết Kế" className="mb-2">
                      {designFilePath ? (
                        <div className="flex items-center gap-2">
                          <AntImage
                            src={designFilePath}
                            alt="File thiết kế"
                            width={60}
                            height={60}
                            className="rounded border object-cover"
                            preview={{
                              cover: <span className="text-xs">Xem</span>,
                            }}
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = designFilePath;
                                link.target = '_blank';
                                link.download = `design_${orderId}.png`;
                                link.click();
                              }}
                            >
                              Tải
                            </Button>
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => setDesignFilePath(null)}
                            >
                              Xóa
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Upload
                          showUploadList={false}
                          beforeUpload={async (file) => {
                            try {
                              message.loading({ content: 'Đang tải lên...', key: 'upload' });
                              const response = await uploadApi.uploadFile(file);
                              if (response?.url) {
                                setDesignFilePath(response.url);
                                message.success({ content: 'Tải file thành công!', key: 'upload' });
                              }
                            } catch (error) {
                              console.error('Upload error:', error);
                              message.error({ content: 'Tải file thất bại!', key: 'upload' });
                            }
                            return false;
                          }}
                          accept="image/*,.pdf"
                        >
                          <Button icon={<PlusOutlined />} size="small" type="dashed">
                            Thêm file
                          </Button>
                        </Upload>
                      )}
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="production_processes" label="Gia Công" className="mb-1">
                      <Checkbox.Group 
                        className="w-full"
                        onChange={(checkedValues) => {
                          if (checkedValues.includes('BOI') && !form.getFieldValue('wave_type')) {
                            form.setFieldValue('wave_type', 'SONG_B_NAU');
                          }
                          if (!checkedValues.includes('BOI')) {
                            form.setFieldValue('wave_type', '');
                          }
                        }}
                      >
                        <div className="grid grid-cols-3 gap-x-2 gap-y-0">
                          {loadingProcessTypes ? (
                            <span className="text-gray-400">Đang tải...</span>
                          ) : (
                            processTypes
                              .filter(pt => !['IN', 'DUT', 'DOT', 'CAT'].includes(pt))
                              .map((pt) => (
                                <Checkbox value={pt} key={pt}>
                                  {PROCESS_TYPE_LABELS[pt] || pt.replace(/_/g, ' ')}
                                </Checkbox>
                              ))
                          )}
                        </div>
                      </Checkbox.Group>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    {/* Dropdown chọn loại sóng khi BOI được tick */}
                    <Form.Item 
                      noStyle 
                      shouldUpdate={(prevValues, currentValues) => 
                        prevValues.production_processes !== currentValues.production_processes
                      }
                    >
                      {({ getFieldValue }) => {
                        const processingValues = getFieldValue('production_processes') || [];
                        const hasBOI = processingValues.includes('BOI');
                        
                        return hasBOI ? (
                          <Form.Item 
                            name="wave_type" 
                            label="Loại Sóng (Bồi)"
                            rules={[{ required: true, message: 'Chọn loại sóng!' }]}
                            className="mb-1"
                          >
                            <Select
                              placeholder="Chọn loại sóng..."
                              size="small"
                              options={songTypes.map(st => ({
                                value: st.code,
                                label: `${st.name}`,
                              }))}
                              allowClear
                            />
                          </Form.Item>
                        ) : null;
                      }}
                    </Form.Item>
                  </Col>
                </Row>
                
                {/* Tổng chi phí gia công */}
                {/* {processCostBreakdown && (
                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-purple-800 font-medium">
                        ⚙️ Tổng chi phí gia công:
                      </span>
                      <span className="font-bold text-lg text-purple-700">
                        {processCostBreakdown.total_cost.toLocaleString('vi-VN')} ₫
                        {loadingProcessCost && <span className="text-xs ml-2 animate-pulse">⏳</span>}
                      </span>
                    </div>
                  </div>
                )} */}

                <Row gutter={16}>
                  <Col span={isCreateMode ? 12 : 24}>
                    <Form.Item name="description" label="Ghi Chú" className="mb-2">
                      <Input.TextArea rows={1} placeholder="Ghi chú thêm..." />
                    </Form.Item>
                  </Col>
                  {/* Contract Upload - Only in Create Mode */}
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
                        rules={[
                          {
                            required: true,
                            message: "Vui lòng tải lên hợp đồng",
                          },
                        ]}
                      >
                        <Upload
                          name="contract"
                          action="/upload.do"
                          listType="text"
                          maxCount={1}
                          className="contract-upload-success"
                        >
                          <Button icon={<UploadOutlined />} size="small">
                            Tải lên PDF/DOCX
                          </Button>
                        </Upload>
                      </Form.Item>
                      <style jsx global>{`
                        .contract-upload-success .ant-upload-list-item-name {
                          color: #16a34a !important;
                        }
                        .contract-upload-success .ant-upload-list-item {
                          color: #16a34a !important;
                        }
                        .contract-upload-success
                          .ant-upload-list-item-actions
                          .anticon-delete {
                          color: #dc2626 !important;
                        }
                      `}</style>
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
                    className={`h-12 font-bold ${
                      isCreateMode
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
                      ? "GỬi BÁO GIÁ ƯU TIÊN"
                      : "GỬi BÁO GIÁ CHO KHÁCH HÀNG"}
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          {/* CỘT PHẢI: LOGIC TÍNH TOÁN & ƯỚC TÍNH */}
          <Col span={8}>
            <div className="sticky top-4">
              <Card
                title={
                  <>
                    <CalculatorOutlined /> Ước Tính & Tồn Kho
                  </>
                }
                className="shadow-sm border-blue-100"
              >
                {!estimate ? (
                  <div className="text-center py-8 text-gray-400">
                    Nhập thông số để xem ước tính
                  </div>
                ) : (
                  <div className="space-y-6">
                    {renderStatusAlert()}

                    {/* Paper Estimate from API */}
                    {paperEstimate && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm font-semibold text-green-800 mb-3">
                          TÍNH TOÁN SƠ BỘ:
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Khổ giấy:</div>
                          <div className="font-medium text-right">
                            {paperEstimate.sheet_width_mm} x{" "}
                            {paperEstimate.sheet_height_mm} mm
                          </div>

                          <div className="text-gray-600">Kích thước in:</div>
                          <div className="font-medium text-right">
                            {paperEstimate.print_width_mm} x{" "}
                            {paperEstimate.print_height_mm} mm
                          </div>

                          <div className="text-gray-600">Số SP/tờ:</div>
                          <div className="font-medium text-blue-600 text-right">
                            {paperEstimate.n_up}
                          </div>

                          <div className="text-gray-600">Số tờ cơ bản:</div>
                          <div className="font-medium text-right">
                            {paperEstimate.sheets_base.toLocaleString('vi-VN')}
                          </div>

                          {/* <div className="text-gray-600">Phế in:</div>
                          <div className="font-medium text-orange-600">{paperEstimate.waste_printing.toLocaleString('vi-VN')}</div> */}

                          {/* <div className="text-gray-600">Phế bồi:</div>
                          <div className="font-medium text-orange-600">{paperEstimate.waste_mounting.toLocaleString('vi-VN')}</div> */}

                          {/* <div className="text-gray-600">Phế dán:</div>
                          <div className="font-medium text-orange-600">{paperEstimate.waste_gluing.toLocaleString('vi-VN')}</div> */}

                          {/* <div className="text-gray-600 font-semibold">Tổng phế:</div>
                          <div className="font-bold text-red-600">{paperEstimate.total_waste.toLocaleString('vi-VN')}</div> */}

                          <div className="col-span-2 border-t pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-gray-700 font-semibold">
                                Tổng số tờ cần:
                              </span>
                              <span className="font-bold text-lg text-green-700">
                                {paperEstimate.sheets_with_waste.toLocaleString('vi-VN')}{" "}
                                tờ
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chi tiết Chi phí từ API */}
                    {costEstimate && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                           CHI TIẾT CHI PHÍ:
                          {loadingCostEstimate && (
                            <span className="text-xs text-blue-500 animate-pulse">
                              ⏳
                            </span>
                          )}
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chi phí giấy:</span>
                            <span className="font-medium">
                              {Math.round(costEstimate.cost.paper_cost).toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Chi phí mực:</span>
                            <span className="font-medium">
                              {(Math.round(costEstimate.cost.ink_cost / 10) * 10).toLocaleString('vi-VN')} ₫
                            </span>
                          </div>
                          
                          {/* Chi phí gia công từ process_cost.details */}
                          {costEstimate.process_cost?.details
                            ?.filter(detail => detail.total_cost > 0)
                            .map((detail) => (
                              <div key={detail.process} className="flex justify-between">
                                <span className="text-gray-600">
                                  {detail.process === 'IN' ? 'Công in' : 
                                   detail.process === 'BOI' ? 'Công bồi' :
                                   detail.process === 'DAN' ? 'Công dán' :
                                   detail.process === 'BE' ? 'Công bế' :
                                   detail.process === 'RALO' ? 'Ra lô' :
                                   detail.process === 'PHU' ? 'Công phủ' :
                                   detail.process === 'CAN_MANG' ? 'Cán màng' :
                                   detail.process === 'DUT' ? 'Đục' :
                                   detail.process === 'DOT' ? 'Đột' :
                                   detail.process === 'CAT' ? 'Cắt' :
                                   detail.process}:
                                </span>
                                <span className="font-medium">
                                  {Math.round(detail.total_cost).toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                            ))}
                          
                          {costEstimate.cost.mounting_glue_cost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Keo bồi:</span>
                              <span className="font-medium">
                                {Math.round(costEstimate.cost.mounting_glue_cost).toLocaleString('vi-VN')}{" "}
                                ₫
                              </span>
                            </div>
                          )}

                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between text-gray-700">
                              <span>Chi phí vật liệu:</span>
                              <span className="font-semibold">
                                {(Math.round(costEstimate.cost.material_cost / 10) * 10).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                            <div className="flex justify-between text-gray-700">
                              <span>Chi phí quản lý (10%):</span>
                              <span>
                                {(Math.round(costEstimate.cost.overhead_cost / 10) * 10).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between font-medium">
                            <span>Giá cơ bản:</span>
                            <span className="text-blue-700">
                              {(Math.round(costEstimate.cost.base_cost / 10) * 10).toLocaleString('vi-VN')} ₫
                            </span>
                          </div>

                          {costEstimate.cost.is_rush && (
                            <div className="bg-orange-100 p-2 rounded border border-orange-200">
                              <div className="flex justify-between text-orange-700">
                                <span>
                                  ⚡ Phí gấp ({costEstimate.cost.rush_percent}%):
                                </span>
                                <span className="font-semibold">
                                  +{Math.round(costEstimate.cost.rush_amount).toLocaleString('vi-VN')} ₫
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="border-t-2 border-blue-300 pt-3 mt-3">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-blue-900">
                                Tổng giá hệ thống:
                              </span>
                              <span className="font-bold text-xl text-blue-700">
                                {(Math.round(costEstimate.cost.final_total_cost / 10) * 10).toLocaleString('vi-VN')}{" "}
                                ₫
                              </span>
                            </div>
                            
                            {/* Phần giảm giá */}
                            <div className="bg-green-50 p-3 rounded-lg mt-3 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-green-800 font-medium">Giảm giá:</span>
                                <InputNumber
                                  min={0}
                                  max={100}
                                  value={discountPercent}
                                  onChange={(value) => setDiscountPercent(value || 0)}
                                  addonAfter="%"
                                  size="small"
                                  style={{ width: 100 }}
                                />
                              </div>
                              {discountPercent > 0 && (
                                <>
                                  <div className="flex justify-between text-green-700 text-sm">
                                    <span>Số tiền giảm:</span>
                                    <span className="font-medium">
                                      -{Math.round(costEstimate.cost.final_total_cost * discountPercent / 100).toLocaleString('vi-VN')} ₫
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-300">
                                    <span className="font-bold text-green-900">
                                       Giá sau giảm:
                                    </span>
                                    <span className="font-bold text-xl text-green-700">
                                      {Math.round(costEstimate.cost.final_total_cost * (100 - discountPercent) / 100).toLocaleString('vi-VN')} ₫
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {/* Tiền đặt cọc */}
                            {depositAmount > 0 && (
                              <div className="bg-purple-50 p-3 rounded-lg mt-3 border border-purple-200">
                                <div className="flex justify-between items-center">
                                  <span className="text-purple-800 font-medium">Tiền đặt cọc:</span>
                                  <span className="font-bold text-lg text-purple-700">
                                    {Math.round(depositAmount).toLocaleString('vi-VN')} ₫
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex justify-between mt-3 text-sm">
                              <span className="text-gray-600">
                                Ngày hoàn thành dự kiến:
                              </span>
                              <span className="font-medium text-green-700">
                                {dayjs(
                                  costEstimate.cost.estimated_finish_date
                                ).format("DD/MM/YYYY")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* <div className="bg-gray-50 p-4 rounded-lg">
                      <Statistic
                        title="Giấy in ước tính (đã bù hao)"
                        value={paperEstimate?.sheets_with_waste || estimate.paperNeeded}
                        suffix="tờ"
                        groupSeparator=","
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {paperEstimate ? "(Từ API Estimates)" : "(Bình trang giả định: 4 hộp/tờ + 5% hao hụt)"}
                      </div>
                    </div> */}

                    {/* Giá chốt với khách hàng */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                         Giá chốt với khách hàng:
                      </div>

                      {/* Input nhập giá chốt */}
                      <Form.Item name="finalPrice" noStyle>
                        <InputNumber
                          className="w-full text-2xl font-bold text-blue-700"
                          formatter={(value) =>
                            `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                          }
                          parser={(value) =>
                            value?.replace(
                              /\$\s?|(,*)/g,
                              ""
                            ) as unknown as number
                          }
                          addonAfter="₫"
                          size="large"
                        />
                      </Form.Item>
                      
                      {/* Nút xác nhận giá */}
                      <Button
                        type="primary"
                        className="w-full mt-3"
                        onClick={async () => {
                          const finalPrice = form.getFieldValue('finalPrice');
                          if (!finalPrice || finalPrice <= 0) {
                            message.warning('Vui lòng nhập giá chốt hợp lệ!');
                            return;
                          }
                          if (!orderId) {
                            message.error('Không tìm thấy mã đơn hàng!');
                            return;
                          }
                          try {
                            await estimatesApi.adjustCost(parseInt(orderId), finalPrice);
                            message.success('Đã cập nhật giá chốt thành công!');
                          } catch (error) {
                            console.error('Error adjusting cost:', error);
                            message.error('Có lỗi khi cập nhật giá. Vui lòng thử lại.');
                          }
                        }}
                      >
                        Xác nhận giá chốt
                      </Button>
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-700 mb-2">
                        Tiến độ dự kiến:
                      </h4>
                      <Steps
                        orientation="vertical"
                        size="small"
                        current={1}
                        items={[
                          { title: "Tạo đơn", description: "Hôm nay" },
                          {
                            title: "Chuẩn bị vật tư",
                            description: estimate.isStockEnough ? (
                              "Có sẵn tại kho"
                            ) : (
                              <span className="text-red-500">
                                Thiếu - Cần 3-5 ngày nhập
                              </span>
                            ),
                            status: estimate.isStockEnough ? "finish" : "error",
                          },
                          {
                            title: "Sản xuất",
                            description: `Khoảng ${estimate.productionDays} ngày`,
                          },
                          {
                            title: "Giao hàng",
                            description: `Hẹn giao: ${dayjs(
                              estimate.effectiveDate
                            ).format("DD/MM/YYYY")}`,
                          },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </Col>
        </Row>

        {/* MODAL DANH SÁCH ĐƠN HÀNG TẠI XƯỞNG */}
        <Modal
          title="Đơn Hàng Đang Sản Xuất Tại Xưởng"
          open={isFactoryModalOpen}
          onCancel={() => setIsFactoryModalOpen(false)}
          footer={null}
          width={700}
        >
          <List
            pagination={{ pageSize: 5 }}
            dataSource={factoryOrders}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                      <CodeSandboxOutlined />
                    </div>
                  }
                  description={
                    <div>
                      <div className="font-medium text-gray-800">
                        {item.customer_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        SL: {item.quantity.toLocaleString()} | Giao:{" "}
                        {dayjs(item.delivery_date).format("DD/MM/YYYY")}
                      </div>
                    </div>
                  }
                />
                <Tag
                  color={item.status === "in_production" ? "orange" : "blue"}
                >
                  {item.status === "in_production"
                    ? "Đang chạy máy"
                    : "Đã lên lịch"}
                </Tag>
              </List.Item>
            )}
            locale={{ emptyText: "Hiện xưởng đang trống việc" }}
          />
        </Modal>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    EyeDropper: any;
  }
}

export default function ConsultantPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConsultantForm />
    </Suspense>
  );
}
