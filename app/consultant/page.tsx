"use client";

import { estimatesApi } from "@/apiRequests/estimates";
import { machineApi } from "@/apiRequests/machine";
import { materialsApi } from "@/apiRequests/materials";
import { productionsApi } from "@/apiRequests/productions";
import { productTypesApi } from "@/apiRequests/producttypes";
import { requestOrderApi } from "@/apiRequests/request";
import { Order, useProduction } from "@/context/ProductionContext";
import {
  CreateRequestBody,
  CreateRequestBodyForConsultant,
  EstimateCostResponse,
  EstimatePaperResponse,
  FreeMachine,
  MachineCapacity,
  Material,
  ProductType,
} from "@/schemaValidations/common.schema";
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
} from "./utils/consultant-logic";

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
    addOrder,
    updateOrder,
    orders,
    isBusy,
  } = useProduction();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = searchParams.get("orderId");
  const modeParam = searchParams.get("mode");
  const [loading, setLoading] = useState(false);

  const existingOrder = orderId
    ? orders.find((o) => o.order_id === orderId)
    : null;
  const isNegotiateMode =
    modeParam === "negotiate" ||
    existingOrder?.process_status === "pending_consultant" ||
    (!orderId && !modeParam);
  const isCreateMode =
    modeParam === "create" ||
    existingOrder?.process_status === "pending_order_creation";

  // State
  const [designFilePath, setDesignFilePath] = useState<string | null>(null);
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

    if (!paper_code || !quantity || !length || !width || !height || !product_type) {
      return;
    }

    const paperCode = paper_code as string;
    const selectedProductType = productTypes.find(
      (pt) => pt.product_type_id === product_type
    );
    const productTypeCode = selectedProductType?.code || "";
    const productionProcessesStr = Array.isArray(production_processes)
      ? production_processes.join(",")
      : "";

    setLoadingPaperEstimate(true);
    try {
      const formType = form.getFieldValue("form_product");
      const isOneSideBox = form.getFieldValue("is_one_side_box") ?? true;
      const glueTab = form.getFieldValue("glue_tab") ?? 10;
      const waveType = form.getFieldValue("wave_type");

      // if (!orderId) return; // Removed to allow calculation for new orders

      const payload = {
        order_request_id: orderId ? parseInt(orderId) : (createdOrderId || 0),
        paper_code: paperCode,
        quantity: quantity,
        length_mm: length,
        width_mm: width,
        height_mm: height,
        glue_tab_mm: glueTab,
        bleed_mm: 1,
        is_one_side_box: isOneSideBox,
        product_type: productTypeCode,
        form_product: formType || "",
        number_of_plates: number_of_plates || 1,
        production_processes: productionProcessesStr,
        coating_type: coating_type || "KEO_NUOC",
        wave_type: productionProcessesStr.includes("BOI") && waveType ? waveType : "",
      };

      console.log("Payload gửi đi (estimatePaper):", payload);

      const response = await estimatesApi.estimatePaper(payload);

      if (response) {
        setPaperEstimate(response);
        calculateCostEstimate(
          response,
          productTypeCode,
          productionProcessesStr,
          coating_type
        );
      }
    } catch (error) {
      console.error("Error calculating paper estimate:", error);
    } finally {
      setLoadingPaperEstimate(false);
    }
  };

  // Template Fetch
  const { data: productTempalte } = useQuery({
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
        quantity: profile.default_quantity,
        ...(selectedProductTypeCode === "HOP_MAU" && {
          glueTab: profile.glue_tab_mm,
          isOneSideBox: profile.is_one_side_box,
        }),
      };
      form.setFieldsValue(newValues);
      setTimeout(() => calculatePaperEstimate(), 100);
    }
  }, [productTempalte, form, selectedProductTypeCode]);


  // Cost Estimate
  const calculateCostEstimate = async (
    paperData: EstimatePaperResponse,
    productTypeCode: string,
    productionProcesses: string,
    coatingType: string
  ) => {
    const values = form.getFieldsValue();
    const { delivery_date } = values;

    if (!paperData) return;

    setLoadingCostEstimate(true);
    try {
      const formType = form.getFieldValue("form_product");
      const waveType = form.getFieldValue("wave_type");

      const response = await estimatesApi.estimateCost({
        order_request_id: orderId ? parseInt(orderId) : (createdOrderId || 0),
        paper: paperData,
        desired_delivery_date: delivery_date
          ? delivery_date.toISOString()
          : new Date().toISOString(),
        product_type: productTypeCode,
        form_product: formType || "",
        production_processes: productionProcesses,
        coating_type: coatingType || "KEO_NUOC",
        discount_percent: 0,
        wave_type: productionProcesses.includes("BOI") && waveType ? waveType : "", // wave_type: handled in paper estimate logic mostly or implicitly if needed here
      });

      if (response) {
        setCostEstimate(response);
        form.setFieldValue("final_price", Math.round(response.cost.final_total_cost));

        if (orderId) {
          try {
            const depositResponse = await estimatesApi.getDeposit(parseInt(orderId));
            setDepositAmount(depositResponse.deposit_amount || 0);
          } catch (depositError) {
            console.error("Error fetching deposit:", depositError);
          }
        }
      }
    } catch (error) {
      console.error("Error calculating cost estimate:", error);
    } finally {
      setLoadingCostEstimate(false);
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
        calculatePaperEstimate();
      }, 800);
    }

    if (changedValues.product_type) {
      const selected = productTypes.find(pt => pt.product_type_id === changedValues.product_type);
      setSelectedProductTypeCode(selected?.code || "");
      setselectProductTypeId(selected?.product_type_id);
    }
  };


  const onFinish = (values: any) => {
    setLoading(true);
    createRequestOrder.mutate(values);

    // Simplification: In a real refactor, `designItems` would be managed better.
    // Assuming `designFilePath` is enough for now or reusing existing logic if needed.
    // For this refactor, I'm sticking to single file path as per standard flow in `CustomerInfo` typically or logic.
    // If multiple colors needed from DesignUpload, state needs lifting.
    // For now assuming just URL from designFilePath.

    const finalNote = values.description || "";

    const orderData = {
      product_id: values.paper_code,
      product_name: values.product_name,
      quantity: values.quantity,
      delivery_date: values.delivery_date.format("YYYY-MM-DD"),
      system_delivery_date: estimate?.systemDate,
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      process_status: "consultant_verified" as const,
      final_price: values.final_price,
      rush_fee: estimate?.rushFee,
      design_file_url: designFilePath || "",
      specs: {
        width: values.width,
        height: values.height,
        length: values.length,
        paper_id: values.paper_code,
        colors: [], // Simplified for this file refactor level
        processing: values.production_processes,
      },
      note: finalNote,
      contract_file: values.contract_file ? "contract.pdf" : undefined,
    };

    const handleSubmitOrder = async () => {
      try {
        if (orderId) {
          if (isNegotiateMode) {
            const finalPrice = form.getFieldValue("final_price");
            if (!finalPrice || finalPrice <= 0) {
              message.warning("Vui lòng nhập giá chốt hợp lệ trước khi gửi báo giá!");
              setLoading(false);
              return;
            }

            try {
              await estimatesApi.adjustCost(parseInt(orderId), finalPrice);
            } catch (adjustError) {
              console.error("Error adjusting cost:", adjustError);
              message.error("Có lỗi khi cập nhật giá. Vui lòng thử lại.");
              setLoading(false);
              return;
            }

            const response = await requestOrderApi.sendDeal(parseInt(orderId));
            if (response.message === "Sent deal email") {
              updateOrder(orderId, {
                ...orderData,
                process_status: "waiting_customer_confirm",
                contract_file: undefined,
              });
              message.success("Đã gửi báo giá cho khách hàng! Chờ khách xác nhận qua email.");
            } else {
              message.error(response.detail || "Có lỗi khi gửi báo giá.");
              setLoading(false);
              return;
            }
          } else {
            updateOrder(orderId, {
              ...orderData,
              process_status: "consultant_verified",
            });
            message.success("Đã tạo đơn hàng và gửi cho Manager duyệt!");
          }
        } else if (estimate && estimate.isStockEnough) {
          addOrder({
            ...orderData,
            order_id: orderId || "",
            code: `ORD-${orderId}`,
            can_fulfill: true,
            process_status: "waiting_customer_confirm",
            contract_file: undefined,
          });
          message.success("Đã tạo báo giá và gửi cho khách hàng!");
        } else {
          addOrder({
            ...orderData,
            order_id: orderId || "",
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
        message.error(error?.response?.data?.detail || "Có lỗi xảy ra. Vui lòng thử lại.");
        setLoading(false);
      }
    };

    handleSubmitOrder();
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
    try {
      await estimatesApi.adjustCost(parseInt(orderId), finalPrice);
      message.success("Đã cập nhật giá chốt thành công!");
    } catch (error) {
      console.error("Error adjusting cost:", error);
      message.error("Có lỗi khi cập nhật giá. Vui lòng thử lại.");
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
    calculatePaperEstimate();
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
                  setDesignFilePath={setDesignFilePath}
                  orderId={orderId}
                />

                <Row gutter={16}>
                  <Col span={isCreateMode ? 12 : 24}>
                    <Form.Item name="description" label="Ghi Chú" className="mb-2">
                      <Input.TextArea rows={1} placeholder="Ghi chú thêm..." />
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
                          ? "GỬi BÁO GIÁ ƯU TIÊN"
                          : "GỬi BÁO GIÁ CHO KHÁCH HÀNG"}
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
