
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { FloatingSelect } from "@/components/Input/FloatingSelect";
import { Material } from "@/schemaValidations/common.schema";
import { ALL_PROCESS_TYPES } from "@/utils/processConstants";
import { Checkbox, Col, Form, Row, Tooltip } from "antd";
import { useEffect } from "react";

interface ProductSpecsSectionProps {
  orderId: string | null;
  PRODUCT_SUGGESTIONS: any[];
  productTypes: any[];
  paperTypes: any[];
  formTypes: string[];
  selectedProductTypeCode: string;
  loadingProductTypes: boolean;
  loadingPaperTypes: boolean;
  loadingFormTypes: boolean;
  loadingProcessTypes: boolean;
  processTypes: string[];
  PROCESS_TYPE_LABELS: Record<string, string>;
  songTypes: Material[];
  glueTypes: Material[];
  inkTypes: Material[];
  laminationTypes?: Material[];
  handleFormValuesChange: (changedValues: any, allValues: any) => void;
  form: any;
  disabledSharedFields?: boolean;
  highlightFields?: Record<string, string>;
  isDeclined?: boolean;
  /** Key of the currently active tab — used to reset prev-refs on tab switch */
  activeTabKey?: string;
}

import { useRef } from "react";

const FORM_TYPE_LABELS: Record<string, string> = {
  "HOP_MAU_1LUOT_DON_GIAN": "Hộp màu 1 lượt đơn giản",
  "HOP_MAU_1LUOT_THUONG": "Hộp màu 1 lượt thường",
  "HOP_MAU_1LUOT_KHO": "Hộp màu 1 lượt khó",
  "HOP_MAU_AQUA_DOI": "Hộp màu Aqua đôi",
  "HOP_MAU_2LUOT": "Hộp màu 2 lượt",
};

export default function ProductSpecsSection({
  orderId,
  PRODUCT_SUGGESTIONS,
  productTypes,
  paperTypes,
  formTypes,
  selectedProductTypeCode,
  loadingProductTypes,
  loadingPaperTypes,
  loadingFormTypes,
  loadingProcessTypes,
  processTypes,
  PROCESS_TYPE_LABELS,
  songTypes,
  glueTypes,
  inkTypes,
  laminationTypes = [],
  handleFormValuesChange,
  form,
  disabledSharedFields = false,
  highlightFields = {},
  isDeclined = false,
  activeTabKey,
}: ProductSpecsSectionProps) {
  const currentProductTypeId = Form.useWatch("product_type", form);
  const currentPaperCode = Form.useWatch("paper_code", form);
  const currentProcesses = Form.useWatch("production_processes", form) || [];
  const currentInkTypes = Form.useWatch("ink_type_names", form) || [];
  const currentCoatingType = Form.useWatch("coating_type", form);
  const hasPHU = currentProcesses.includes("PHU");
  const hasBOI = currentProcesses.includes("BOI");
  const hasCAN = currentProcesses.includes("CAN");

  const prevHasPHURef = useRef(hasPHU);
  const prevHasBOIRef = useRef(hasBOI);
  const prevHasCANRef = useRef(hasCAN);
  const prevProductTypeCodeRef = useRef(selectedProductTypeCode);

  // ── PER-PRODUCT-TYPE PROCESS RULES ──────────────────────────────────────
  // Returns an object: { forbidden: string[], mandatoryExtra: string[], warnings: Record<string,string> }
  const getProductTypeRules = (code: string): { forbidden: string[]; alwaysDisabled: string[]; warnings: Record<string, string> } => {
    switch (code) {
      case "KHAY":
        return {
          forbidden: ["CAN", "DAN"],
          alwaysDisabled: [],
          warnings: {},
        };
      case "VO_HOP_GACH":
        return {
          forbidden: ["PHU", "CAN", "DAN"],
          alwaysDisabled: [],
          warnings: {},
        };
      case "THE_MAU":
        return {
          forbidden: ["BOI", "DAN"],
          alwaysDisabled: [],
          warnings: {},
        };
      case "HOP_MAU":
        return {
          forbidden: [],
          alwaysDisabled: [],
          warnings: {},
        };
      default:
        return {
          forbidden: [],
          alwaysDisabled: [],
          warnings: {},
        };
    }
  };

  const productTypeRules = getProductTypeRules(selectedProductTypeCode);
  // Track the previous tab key to detect tab switches
  const prevTabKeyRef = useRef(activeTabKey);

  const selectedProductType = productTypes?.find((pt) => pt.product_type_id === currentProductTypeId);
  const selectedPaper = paperTypes?.find((paper) => paper.code === currentPaperCode);

  // Determine the active product type for compatibility checks
  const activeProductType = selectedProductType || productTypes?.find((pt) => pt.code === selectedProductTypeCode);

  const checkPaperCompatibility = (paper: any, prodType: any) => {
    if (!paper || !paper.material_class || !prodType) return true;
    const validClasses = paper.material_class.split(",").map((s: string) => s.trim().toLowerCase());
    const productNameLower = prodType.name?.trim().toLowerCase();
    const productCodeLower = prodType.code?.trim().toLowerCase();

    if (validClasses.length === 0) return true;

    return (productNameLower && validClasses.includes(productNameLower)) ||
      (productCodeLower && validClasses.includes(productCodeLower));
  };

  const isCurrentPaperIncompatible = selectedPaper && !checkPaperCompatibility(selectedPaper, activeProductType);
  const paperWarningMsg = isCurrentPaperIncompatible ? `Loại giấy ${selectedPaper.name} có thể không phù hợp với loại sản phẩm ${activeProductType?.name}.` : "";

  useEffect(() => {
    if (selectedProductTypeCode === "HOP_MAU" || selectedProductTypeCode === "VO_HOP_GACH") {
      const filteredFormTypes = formTypes.filter((ft) => {
        if (selectedProductTypeCode === "HOP_MAU") {
          return ft.startsWith("HOP_MAU_");
        } else if (selectedProductTypeCode === "VO_HOP_GACH") {
          return ft.startsWith("GACH_");
        }
        return true;
      });

      if (filteredFormTypes.length > 0) {
        const currentFormProduct = form.getFieldValue("form_product");
        if (!currentFormProduct || !filteredFormTypes.includes(currentFormProduct)) {
          form.setFieldValue("form_product", filteredFormTypes[0]);
          handleFormValuesChange({ form_product: filteredFormTypes[0] }, form.getFieldsValue());
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductTypeCode, formTypes, form]);

  useEffect(() => {
    const processes = form.getFieldValue("production_processes") || [];
    const currentWave = form.getFieldValue("wave_type");

    // Ensure wave_type is initialized if BOI is present but wave_type is missing
    if (Array.isArray(processes) && processes.includes("BOI") && !currentWave) {
      form.setFieldValue("wave_type", "SONG_B_NAU");
    }
  }, [form]);

  // When the active tab changes, immediately sync the prev-refs to the NEW values
  // so the clear-effect below doesn't falsely fire a "removal" on tab switch.
  if (prevTabKeyRef.current !== activeTabKey) {
    prevTabKeyRef.current = activeTabKey;
    prevHasPHURef.current = hasPHU;
    prevHasBOIRef.current = hasBOI;
    prevHasCANRef.current = hasCAN;
    prevProductTypeCodeRef.current = selectedProductTypeCode;
  }

  // Handle clearing dependent fields ONLY when the user explicitly unchecks a process
  // (not when switching tabs — guarded by the ref-sync above)
  useEffect(() => {
    if (prevHasPHURef.current && !hasPHU) {
      const currentCoating = form.getFieldValue("coating_type");
      if (currentCoating) {
        form.setFieldValue("coating_type", undefined);
      }
    }
    
    if (prevHasBOIRef.current && !hasBOI) {
      const currentWave = form.getFieldValue("wave_type");
      if (currentWave) {
        form.setFieldValue("wave_type", undefined);
      }
    }

    if (prevHasCANRef.current && !hasCAN) {
      const currentLamination = form.getFieldValue("lamination_material");
      if (currentLamination) {
        form.setFieldValue("lamination_material", undefined);
      }
    }

    prevHasPHURef.current = hasPHU;
    prevHasBOIRef.current = hasBOI;
    prevHasCANRef.current = hasCAN;
  }, [hasPHU, hasBOI, hasCAN, form]);

  // Khi chuyển loại sản phẩm, xóa CAN và coating_type nếu CAN bị cấm trong loại mới
  // Đồng thời đảm bảo coating_type bị xóa nếu không còn PHU
  useEffect(() => {
    if (prevProductTypeCodeRef.current === selectedProductTypeCode) return;
    prevProductTypeCodeRef.current = selectedProductTypeCode;

    const rules = getProductTypeRules(selectedProductTypeCode);
    const currentProcesses: string[] = form.getFieldValue("production_processes") || [];

    // Lọc bỏ các công đoạn bị cấm theo loại sản phẩm mới
    const filteredProcesses = currentProcesses.filter(p => !rules.forbidden.includes(p));
    const hadCAN = currentProcesses.includes("CAN");
    const stillHasCAN = filteredProcesses.includes("CAN");
    const stillHasPHU = filteredProcesses.includes("PHU");

    if (hadCAN && !stillHasCAN) {
      // CAN bị loại bỏ do forbidden — cập nhật lại processes
      form.setFieldValue("production_processes", filteredProcesses);
      handleFormValuesChange({ production_processes: filteredProcesses }, { ...form.getFieldsValue(), production_processes: filteredProcesses });
    }

    if (!stillHasCAN) {
      const currentLamination = form.getFieldValue("lamination_material");
      if (currentLamination) {
        form.setFieldValue("lamination_material", undefined);
      }
    }

    // Nếu PHU không còn trong processes (do bị forbidden hoặc đã bị xóa), clear coating_type
    if (!stillHasPHU) {
      const currentCoating = form.getFieldValue("coating_type");
      if (currentCoating) {
        form.setFieldValue("coating_type", undefined);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductTypeCode]);

  // Tự động cập nhật số kẽm dựa trên số loại mực được chọn
  useEffect(() => {
    const inkCount = Array.isArray(currentInkTypes) ? currentInkTypes.length : 0;
    if (inkCount > 0) {
      form.setFieldValue("number_of_plates", inkCount);
      handleFormValuesChange(
        { number_of_plates: inkCount },
        { ...form.getFieldsValue(), number_of_plates: inkCount }
      );
    }
  }, [currentInkTypes, form]);

  return (
    <>
      <Form.Item name="ink_type_names" hidden preserve={true}>
        <input type="hidden" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={10}>
          <Form.Item
            name="product_name"
            rules={[{ required: true }]}
          >
            <FloatingSelect
              label="Tên sản phẩm"
              showSearch
              options={PRODUCT_SUGGESTIONS}
              disabled={disabledSharedFields || (isDeclined && !highlightFields['product_name'])}
              className={(orderId || disabledSharedFields) ? "bg-gray-50" : ""}
              required
            />
          </Form.Item>
        </Col>
        <Col span={14}>
          <Form.Item
            name="product_type"
            rules={[{ required: true, message: "Vui lòng chọn loại sản phẩm" }]}
          >
            <FloatingSelect
              label="Loại sản phẩm"
              showSearch
              placeholder="Chọn loại sản phẩm"
              loading={loadingProductTypes}
              optionFilterProp="label"
              options={productTypes.map((pt) => ({
                label: `${pt.name} - ${pt.description}`,
                value: pt.product_type_id,
              }))}
              disabled={disabledSharedFields || (isDeclined && !highlightFields['product_type'])}
              className={disabledSharedFields ? "bg-gray-50" : ""}
              required
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>

        <Col span={12}>
          <Tooltip title={isCurrentPaperIncompatible ? paperWarningMsg : (highlightFields['paper_code'] || "")} color={isCurrentPaperIncompatible ? "volcano" : "orange"} placement="topLeft" trigger={['hover', 'focus']}>
            <div className="w-full">
              <Form.Item
                name="paper_code"
                rules={[{ required: true, message: "Vui lòng chọn loại giấy" }]}
                validateStatus={isCurrentPaperIncompatible ? "warning" : undefined}
                className="mb-0"
              >
                <FloatingSelect
                  label="Loại giấy"
                  showSearch
                  placeholder="Chọn loại giấy..."
                  loading={loadingPaperTypes}
                  optionFilterProp="label"
                  options={paperTypes.map((paper) => {
                    const isOptionCompatible = checkPaperCompatibility(paper, activeProductType);
                    return {
                      label: <div className="flex justify-between gap-2 items-center">
                        <div className="flex items-center gap-1">
                          <span>{paper.name}</span>
                          {!isOptionCompatible && (
                            <Tooltip title={`Có thể không phù hợp với ${activeProductType?.name}`}>
                            </Tooltip>
                          )}
                        </div>
                        <span className="text-gray-500 text-[11px]">(SL: {paper.stock ?? 0})</span>
                      </div>,
                      value: paper.code,
                      stockQty: paper.stock,
                    };
                  })}
                  className={highlightFields['paper_code'] ? "!border-2 !border-yellow-400 rounded ring-2 ring-yellow-200" : ""}
                  disabled={isDeclined && !highlightFields['paper_code']}
                />
              </Form.Item>
            </div>
          </Tooltip>
        </Col>

        <Col span={6}>
          <Form.Item
            name="quantity"
            rules={[{ required: true, message: "Nhập số lượng" }]}
          >
            <FloatingInputAntd
              label="Số lượng"
              valueType="number"
              className={`w-full text-end ${disabledSharedFields ? "bg-gray-50" : ""}`}
              formatter={(value: any) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(value: any) =>
                Number(value?.replace(/\./g, "")) || 0
              }
              controls={!disabledSharedFields && !(isDeclined && !highlightFields['quantity'])}
              disabled={disabledSharedFields || (isDeclined && !highlightFields['quantity'])}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="number_of_plates">
            <FloatingInputAntd
              label="Số kẽm"
              valueType="number"
              className={`w-full ${disabledSharedFields ? 'bg-gray-50' : ''}`}
              min={1}
              controls={!disabledSharedFields && !(isDeclined && !highlightFields['number_of_plates'])}
              disabled={disabledSharedFields || (isDeclined && !highlightFields['number_of_plates'])}
              tooltip="Bao gồm số bản kẽm cơ bản và kẽm hao phí ralo"
            />
          </Form.Item>
        </Col>
      </Row>

      {(hasPHU || hasCAN) && (
        <Row gutter={16}>
          {hasPHU && (() => {
            const isKeoDauWarning = selectedProductTypeCode === "THE_MAU" && currentCoatingType === "KEO_DAU";
            const tooltipTitle = isKeoDauWarning
              ? "Cảnh báo: Phủ keo dầu có thể gây sai lệch màu in thực tế."
              : highlightFields['coating_type'] || "";
              
            return (
              <Col span={12}>
                <Tooltip 
                  title={tooltipTitle} 
                  color={isKeoDauWarning ? "volcano" : "orange"} 
                  placement="topLeft" 
                  trigger={['hover', 'focus']}
                >
                  <div className="w-full">
                    <Form.Item name="coating_type" validateStatus={isKeoDauWarning ? "warning" : undefined}>
                      <FloatingSelect
                        label="Loại keo phủ"
                        options={glueTypes.map((gt) => ({
                          label: gt.name,
                          value: gt.code,
                        }))}
                        className={highlightFields['coating_type'] ? "!border-2 !border-yellow-400 rounded ring-2 ring-yellow-200" : ""}
                        disabled={isDeclined && !highlightFields['coating_type']}
                      />
                    </Form.Item>
                  </div>
                </Tooltip>
              </Col>
            );
          })()}

          {hasCAN && (() => {
            const tooltipTitle = highlightFields['lamination_material'] || "";
              
            return (
              <Col span={12}>
                <Tooltip 
                  title={tooltipTitle} 
                  color="orange" 
                  placement="topLeft" 
                  trigger={['hover', 'focus']}
                >
                  <div className="w-full">
                    <Form.Item name="lamination_material" rules={[{ required: true, message: "Vui lòng chọn màng" }]}>
                      <FloatingSelect
                        label="Loại màng"
                        options={laminationTypes.map((lt) => ({
                          label: lt.name,
                          value: lt.code,
                        }))}
                        className={highlightFields['lamination_material'] ? "!border-2 !border-yellow-400 rounded ring-2 ring-yellow-200" : ""}
                        disabled={isDeclined && !highlightFields['lamination_material']}
                      />
                    </Form.Item>
                  </div>
                </Tooltip>
              </Col>
            );
          })()}
        </Row>
      )}

      {(selectedProductTypeCode === "HOP_MAU" ||
        selectedProductTypeCode === "VO_HOP_GACH") && (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="form_product"
                rules={[{ required: true, message: "Vui lòng chọn loại form" }]}
              >
                <FloatingSelect
                  label="Loại Form"
                  showSearch
                  placeholder="Chọn loại form"
                  loading={loadingFormTypes}
                  optionFilterProp="label"
                  options={formTypes
                    .filter((ft) => {
                      if (selectedProductTypeCode === "HOP_MAU") {
                        return ft.startsWith("HOP_MAU_");
                      } else if (selectedProductTypeCode === "VO_HOP_GACH") {
                        return ft.startsWith("GACH_");
                      }
                      return true;
                    })
                    .map((ft) => ({
                      label: FORM_TYPE_LABELS[ft] || ft
                        .replace(/^HOP_MAU_/i, "Hộp màu ")
                        .replace(/^GACH_/i, "Gạch ")
                        .replace(/_/g, " "),
                      value: ft,
                    }))}
                  disabled={isDeclined && !highlightFields['form_product']}
                />
              </Form.Item>
            </Col>
            {selectedProductTypeCode === "HOP_MAU" && (
              <>
                <Col span={6}>
                  <Form.Item
                    name="isOneSideBox"
                  >
                    <FloatingSelect
                      label="Loại Hộp"
                      options={[
                        { label: "Hộp 1 mặt", value: true },
                        { label: "Hộp 2 mặt", value: false },
                      ]}
                      disabled={isDeclined && !highlightFields['isOneSideBox']}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="glueTab"
                    tooltip="Chiều rộng táp dán, mặc định 10mm"
                  >
                    <FloatingInputAntd
                      label="Táp dán (mm)"
                      valueType="number"
                      min={0}
                      max={50}
                      placeholder="10"
                      style={{ width: "100%" }}
                      className={disabledSharedFields ? 'bg-gray-50' : ''}
                      disabled={disabledSharedFields || (isDeclined && !highlightFields['glueTab'])}
                    />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>
        )}

      <Row gutter={16}>
        <Col span={16}>
          <Form.Item required>
            <div className="flex items-center gap-1">
              Kích thước
              <Form.Item name="length" noStyle>
                <FloatingInputAntd
                  label="Dài"
                  valueType="number"
                  style={{ width: 70 }}
                  placeholder=" "
                  controls={false}
                  min={100}
                  className={`text-end ${disabledSharedFields ? "bg-gray-50" : ""}`}
                  disabled={disabledSharedFields || (isDeclined && !highlightFields['dimensions'])}
                />
              </Form.Item>
              <span className="text-gray-400">×</span>
              <Form.Item name="width" noStyle>
                <FloatingInputAntd
                  label="Rộng"
                  valueType="number"
                  style={{ width: 70 }}
                  placeholder=" "
                  controls={false}
                  min={1}
                  className={disabledSharedFields ? "bg-gray-50" : ""}
                  disabled={disabledSharedFields || (isDeclined && !highlightFields['dimensions'])}
                />
              </Form.Item>
              <span className="text-gray-400">×</span>
              <Form.Item name="height" noStyle>
                <FloatingInputAntd
                  label="Cao"
                  valueType="number"
                  style={{ width: 70 }}
                  placeholder=" "
                  controls={false}
                  min={0}
                  className={`text-end ${disabledSharedFields ? "bg-gray-50" : ""}`}
                  disabled={disabledSharedFields || (isDeclined && !highlightFields['dimensions'])}
                />
              </Form.Item>
              <h1>(mm)</h1>
            </div>
          </Form.Item>
        </Col>
        <Col span={8}>
          {/* Wave Type Select */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.production_processes !==
              currentValues.production_processes
            }
          >
            {({ getFieldValue }) => {
              const processingValues =
                getFieldValue("production_processes") || [];
              const hasBOI = processingValues.includes("BOI");

              return hasBOI ? (
                <Form.Item
                  name="wave_type"
                  // label="Loại Sóng (Bồi)"
                  rules={[{ required: true, message: "Chọn loại sóng!" }]}
                  className="mb-1"
                >
                  <FloatingSelect
                    label="Loại Sóng (Bồi)"
                    placeholder="Chọn loại sóng..."
                    options={songTypes.map((st) => ({
                      value: st.code,
                      label: `${st.name}`,
                    }))}
                    allowClear
                    disabled={isDeclined && !highlightFields['wave_type']}
                  />
                </Form.Item>
              ) : null;
            }}
          </Form.Item>
        </Col>

      </Row>

       <Row gutter={16} hidden>
        <Col span={24}>
          <Form.Item
            name="ink_type_names"
            // rules={[{ required: true, message: "Vui lòng chọn ít nhất một loại mực" }]}
          >
            <FloatingSelect
              label="Loại mực (chọn nhiều)"
              mode="multiple"
              placeholder="Chọn loại mực..."
              showSearch
              optionFilterProp="label"
              options={inkTypes.map((ink) => ({
                label: ink.name,
                value: ink.name,
              }))}
              disabled={isDeclined && !highlightFields['ink_type_names']}
              className={highlightFields['ink_type_names'] ? "!border-2 !border-yellow-400 rounded ring-2 ring-yellow-200" : ""}
              allowClear
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="production_processes"
            label="Gia Công"
            className="mb-1"
            normalize={(value) => {
              let updatedValues: string[] = [];
              if (Array.isArray(value)) {
                updatedValues = value.map(v => typeof v === 'string' ? v.trim().toUpperCase() : v).filter(v => v);
              } else if (typeof value === "string") {
                updatedValues = value.split(",").map(v => v.trim().toUpperCase()).filter(v => v);
              }

              // Đảm bảo các công đoạn bắt buộc theo loại sản phẩm
              const rules = getProductTypeRules(selectedProductTypeCode);
              
              // 1. Thêm các công đoạn luôn phải có (alwaysDisabled)
              rules.alwaysDisabled.forEach(pt => {
                if (!updatedValues.includes(pt)) {
                  updatedValues.push(pt);
                }
              });

              // 3. Xóa các công đoạn bị cấm
              updatedValues = updatedValues.filter(v => !rules.forbidden.includes(v));

              // Sắp xếp đúng theo trình tự gia công chuẩn
              const STANDARD_ORDER = ALL_PROCESS_TYPES;
              updatedValues.sort((a, b) => {
                const idxA = (STANDARD_ORDER as readonly string[]).indexOf(a);
                const idxB = (STANDARD_ORDER as readonly string[]).indexOf(b);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
              });

              return updatedValues;
            }}
          >
            <Checkbox.Group
              className="w-full"
              disabled={isDeclined && !highlightFields['production_processes']}
              onChange={(checkedValues) => {
                if (
                  checkedValues.includes("BOI") &&
                  !form.getFieldValue("wave_type")
                ) {
                  form.setFieldValue("wave_type", "SONG_B_NAU");
                }
                if (!checkedValues.includes("BOI")) {
                  form.setFieldValue("wave_type", undefined);
                }
                if (!checkedValues.includes("PHU")) {
                  form.setFieldValue("coating_type", undefined);
                }
                if (!checkedValues.includes("CAN")) {
                  form.setFieldValue("lamination_material", undefined);
                }

                // Trigger form re-calculation manually if needed because some hidden constraints updated
                // We use setTimeout to ensure form has updated with normalized value
                setTimeout(() => {
                  handleFormValuesChange({ production_processes: form.getFieldValue("production_processes") }, form.getFieldsValue());
                }, 0);
              }}
            >
              <div className="flex flex-wrap gap-x-2">
                {loadingProcessTypes ? (
                  <span className="text-gray-400 text-xs">Đang tải...</span>
                ) : (
                  ALL_PROCESS_TYPES.map((pt) => {
                    const rules = productTypeRules;
                    const isForbidden = rules.forbidden.includes(pt);
                    const isAlwaysDisabled = rules.alwaysDisabled.includes(pt);
                    const isDisabled = isAlwaysDisabled || isForbidden;
                    const warningMsg = rules.warnings[pt];

                    // Tooltip explanation
                    let tooltipTitle: string | undefined;
                    if (isForbidden) {
                      tooltipTitle = warningMsg || `Không được phép sử dụng công đoạn ${PROCESS_TYPE_LABELS[pt] || pt} cho loại sản phẩm này`;
                    } else if (warningMsg) {
                      tooltipTitle = warningMsg;
                    }

                    const labelColor = isForbidden
                      ? "text-red-300 line-through"
                      : isAlwaysDisabled
                      ? "text-gray-400"
                      : warningMsg
                      ? "text-amber-600"
                      : "text-gray-700";

                    return (
                      <Tooltip key={pt} title={tooltipTitle} placement="top">
                        <Checkbox
                          value={pt}
                          disabled={isDisabled || (isDeclined && !highlightFields['production_processes'])}
                          className="!flex items-center m-0"
                        >
                          <span className={`text-[13px] leading-tight ${labelColor}`}>
                            {PROCESS_TYPE_LABELS[pt] || pt}
                            {warningMsg && !isForbidden && (
                              <span className="ml-0.5 text-amber-500 text-[10px]">⚠</span>
                            )}
                            {/* {isForbidden && (
                              <span className="ml-0.5 text-red-400 text-[10px]">✕</span>
                            )} */}
                          </span>
                        </Checkbox>
                      </Tooltip>
                    );
                  })
                )}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Col>

      </Row>
    </>
  );
}
