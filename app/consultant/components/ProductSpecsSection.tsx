
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { FloatingSelect } from "@/components/Input/FloatingSelect";
import { Material } from "@/schemaValidations/common.schema";
import { Checkbox, Col, Form, InputNumber, Row, Select, Tooltip } from "antd";
import { useEffect } from "react";

interface ProductSpecsSectionProps {
  orderId: string | null;
  PRODUCT_SUGGESTIONS: string[];
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
  handleFormValuesChange: (changedValues: any, allValues: any) => void;
  form: any;
  disabledSharedFields?: boolean;
  highlightFields?: Record<string, string>;
  isDeclined?: boolean;
  /** Key of the currently active tab — used to reset prev-refs on tab switch */
  activeTabKey?: string;
}

import React, { useRef } from "react";

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
  const hasPHU = currentProcesses.includes("PHU");
  const hasCAN = currentProcesses.includes("CAN");
  const hasBOI = currentProcesses.includes("BOI");

  const prevHasPHURef = useRef(hasPHU);
  const prevHasBOIRef = useRef(hasBOI);

  // ── PER-PRODUCT-TYPE PROCESS RULES ──────────────────────────────────────
  // Returns an object: { forbidden: string[], mandatoryExtra: string[], warnings: Record<string,string> }
  const getProductTypeRules = (code: string): { forbidden: string[]; alwaysDisabled: string[]; warnings: Record<string, string> } => {
    switch (code) {
      case "KHAY":
        // Full process except DAN
        return {
          forbidden: ["DAN"],
          alwaysDisabled: ["RALO", "CAT", "IN", "BE", "DUT"],
          warnings: { DAN: "Khay không cần công đoạn Dán (khay xếp gài với nhau)" },
        };
      case "VO_HOP_GACH":
        // Mandatory: RALO,CAT,IN,BOI,BE,DUT,DAN; PHU/CAN optional (PHU preferred over CAN)
        return {
          forbidden: [],
          alwaysDisabled: ["RALO", "CAT", "IN", "BOI", "BE", "DUT", "DAN"],
          warnings: {
            CAN: "Vỏ hộp gạch hiếm khi cần Cán màng. Nên dùng Phủ (keo nước) thay thế nếu cần.",
          },
        };
      case "THE_MAU":
        // Max: RALO,CAT,IN,PHU,BE. Forbidden: BOI, DAN. CAN warning.
        return {
          forbidden: ["BOI", "DAN"],
          alwaysDisabled: ["RALO", "CAT", "IN", "BE"],
          warnings: {
            BOI: "Thẻ màu không cần Bồi (tấm giấy phẳng, không có khối lượng thể tích)",
            DAN: "Thẻ màu không cần Dán (không tạo hình không gian 3D)",
            CAN: "Thẻ màu: Cán màng nilon có thể làm sai lệch sắc độ màu in. Khuyến nghị dùng Phủ thay thế.",
          },
        };
      case "HOP_MAU":
        // Max: RALO,CAT,IN,PHU/CAN,BE,DUT,DAN. Forbidden: BOI.
        return {
          forbidden: ["BOI"],
          alwaysDisabled: ["RALO", "CAT", "IN", "BE", "DUT"],
          warnings: {
            BOI: "Hộp màu không cần Bồi (giấy Ivory/Duplex đã đủ độ cứng, Bồi làm tăng chi phí và độ dày không cần thiết)",
          },
        };
      default:
        return {
          forbidden: [],
          alwaysDisabled: ["RALO", "CAT", "IN", "BE", "DUT"],
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
  }

  // Handle clearing dependent fields ONLY when the user explicitly unchecks a process
  // (not when switching tabs — guarded by the ref-sync above)
  useEffect(() => {
    if (prevHasPHURef.current && !hasPHU) {
      const currentCoating = form.getFieldValue("coating_type");
      if (currentCoating && currentCoating !== "NONE") {
        form.setFieldValue("coating_type", "NONE");
      }
    }
    
    if (prevHasBOIRef.current && !hasBOI) {
      const currentWave = form.getFieldValue("wave_type");
      if (currentWave && currentWave !== "NONE") {
        form.setFieldValue("wave_type", "NONE");
      }
    }

    prevHasPHURef.current = hasPHU;
    prevHasBOIRef.current = hasBOI;
  }, [hasPHU, hasBOI, form]);

  return (
    <>
      <Row gutter={16}>
        <Col span={10}>
          <Form.Item
            name="product_name"
            rules={[{ required: true }]}
          >
            <FloatingSelect
              label="Tên sản phẩm"
              showSearch
              options={PRODUCT_SUGGESTIONS.map((name) => ({
                label: name,
                value: name,
              }))}
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

        <Col span={9}>
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

        <Col span={5}>
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
        <Col span={4}>
          <Form.Item name="number_of_plates">
            <FloatingInputAntd
              label="Số kẽm"
              valueType="number"
              className={`w-full ${disabledSharedFields ? 'bg-gray-50' : ''}`}
              min={1}
              controls={!disabledSharedFields && !(isDeclined && !highlightFields['number_of_plates'])}
              disabled={disabledSharedFields || (isDeclined && !highlightFields['number_of_plates'])}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          {hasPHU && (
            <Tooltip title={highlightFields['coating_type'] || ""} color="orange" placement="topLeft" trigger={['hover', 'focus']}>
              <div className="w-full">
                <Form.Item name="coating_type" className="mb-0">
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
          )}
        </Col>
      </Row>

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

      <Row gutter={16}>
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
              } else {
                updatedValues = ["RALO", "CAT", "IN", "BE", "DUT"];
              }

              // Luôn bắt buộc các công đoạn cơ bản
              if (!updatedValues.includes("RALO")) updatedValues.push("RALO");
              if (!updatedValues.includes("CAT")) updatedValues.push("CAT");
              if (!updatedValues.includes("IN")) updatedValues.push("IN");
              if (!updatedValues.includes("BE")) updatedValues.push("BE");

              // VO_HOP_GACH: bắt buộc thêm BOI, DUT, DAN
              if (selectedProductTypeCode === "VO_HOP_GACH") {
                if (!updatedValues.includes("BOI")) updatedValues.push("BOI");
                if (!updatedValues.includes("DUT")) updatedValues.push("DUT");
                if (!updatedValues.includes("DAN")) updatedValues.push("DAN");
              } else {
                if (!updatedValues.includes("DUT")) updatedValues.push("DUT");
              }

              // Xóa các công đoạn bị cấm theo loại sản phẩm
              const rules = getProductTypeRules(selectedProductTypeCode);
              updatedValues = updatedValues.filter(v => !rules.forbidden.includes(v));

              // PHU và CAN loại trừ nhau: nếu có cả hai, ưu tiên giữ cái mới chọn
              // (logic này chỉ là fallback – UI đã disable cái kia)
              if (updatedValues.includes("PHU") && updatedValues.includes("CAN")) {
                // Giữ PHU, bỏ CAN
                updatedValues = updatedValues.filter(v => v !== "CAN");
              }

              // Sắp xếp đúng theo trình tự gia công chuẩn
              const STANDARD_ORDER = ["RALO", "CAT", "IN", "PHU", "CAN", "BOI", "BE", "DUT", "DAN"];
              updatedValues.sort((a, b) => {
                const idxA = STANDARD_ORDER.indexOf(a);
                const idxB = STANDARD_ORDER.indexOf(b);
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
                  form.setFieldValue("wave_type", "NONE");
                }
                if (!checkedValues.includes("PHU")) {
                  form.setFieldValue("coating_type", "NONE");
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
                  ["RALO", "CAT", "IN", "PHU", "CAN", "BOI", "BE", "DUT", "DAN"].map((pt) => {
                    const rules = productTypeRules;
                    const isForbidden = rules.forbidden.includes(pt);
                    const isAlwaysDisabled = rules.alwaysDisabled.includes(pt);
                    // PHU/CAN mutual exclusion
                    const isPHUCANConflict =
                      (pt === "PHU" && hasCAN) || (pt === "CAN" && hasPHU);
                    const isDisabled = isAlwaysDisabled || isForbidden || isPHUCANConflict;
                    const warningMsg = rules.warnings[pt];

                    // Tooltip explanation
                    let tooltipTitle: string | undefined;
                    if (isForbidden) {
                      tooltipTitle = warningMsg || `Không được phép sử dụng công đoạn ${PROCESS_TYPE_LABELS[pt] || pt} cho loại sản phẩm này`;
                    } else if (isPHUCANConflict) {
                      tooltipTitle =
                        pt === "CAN"
                          ? "Đã chọn Phủ — không thể chọn thêm Cán (hai công đoạn loại trừ nhau)"
                          : "Đã chọn Cán — không thể chọn thêm Phủ (hai công đoạn loại trừ nhau)";
                    } else if (warningMsg) {
                      tooltipTitle = warningMsg;
                    }

                    const labelColor = isForbidden
                      ? "text-red-300 line-through"
                      : isPHUCANConflict
                      ? "text-gray-400"
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
                            {warningMsg && !isForbidden && !isPHUCANConflict && (
                              <span className="ml-0.5 text-amber-500 text-[10px]">⚠</span>
                            )}
                            {isForbidden && (
                              <span className="ml-0.5 text-red-400 text-[10px]">✕</span>
                            )}
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
