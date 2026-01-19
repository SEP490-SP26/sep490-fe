
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { FloatingSelect } from "@/components/Input/FloatingSelect";
import { Material } from "@/schemaValidations/common.schema";
import { Checkbox, Col, Form, InputNumber, Row, Select } from "antd";

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
  handleFormValuesChange: (changedValues: any, allValues: any) => void;
  form: any;
}


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
  handleFormValuesChange,
  form,
}: ProductSpecsSectionProps) {
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
              // disabled={!!orderId}
              className={orderId ? "bg-gray-50" : ""}
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
              required
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>

        <Col span={9}>
          <Form.Item
            name="paper_code"
            rules={[{ required: true, message: "Vui lòng chọn loại giấy" }]}
          >
            <FloatingSelect
              label="Loại giấy"
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

        <Col span={5}>
          <Form.Item
            name="quantity"
            rules={[{ required: true, message: "Nhập số lượng" }]}
          >
            <FloatingInputAntd
              label="Số lượng"
              valueType="number"
              className="w-full text-end"
              formatter={(value: any) =>
                `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
              }
              parser={(value: any) =>
                Number(value?.replace(/\./g, "")) || 0
              }
              controls={true}
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item name="number_of_plates" initialValue={1}>
            <FloatingInputAntd
              label="Số kẽm"
              valueType="number"
              className="w-full"
              min={1}
              controls={false}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="coating_type" initialValue="KEO_NUOC">
            <FloatingSelect
              label="Loại keo"
              options={[
                { label: "Keo nước", value: "KEO_NUOC" },
                { label: "Keo dầu", value: "KEO_DAU" },
              ]}
            />
          </Form.Item>
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
                      label: ft
                        .replace(/^HOP_MAU_/i, "Hộp màu ")
                        .replace(/^GACH_/i, "Gạch ")
                        .replace(/_/g, " "),
                      value: ft,
                    }))}
                />
              </Form.Item>
            </Col>
            {selectedProductTypeCode === "HOP_MAU" && (
              <>
                <Col span={6}>
                  <Form.Item
                    name="isOneSideBox"

                    initialValue={true}
                  >
                    <FloatingSelect
                      label="Loại Hộp"
                      options={[
                        { label: "Hộp 1 mặt", value: true },
                        { label: "Hộp 2 mặt", value: false },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="glueTab"

                    initialValue={10}
                    tooltip="Chiều rộng táp dán, mặc định 10mm"
                  >
                    <FloatingInputAntd
                      label="Táp dán (mm)"
                      valueType="number"
                      min={0}
                      max={50}
                      placeholder="10"
                      style={{ width: "100%" }}
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
                  className="text-end"
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
                  className="text-end"
                />
              </Form.Item>
              <h1>(mm)</h1>
            </div>
          </Form.Item>
        </Col>


      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="production_processes"
            label="Gia Công"
            className="mb-1"
          >
            <Checkbox.Group
              className="w-full"
              onChange={(checkedValues) => {
                if (
                  checkedValues.includes("BOI") &&
                  !form.getFieldValue("wave_type")
                ) {
                  form.setFieldValue("wave_type", "SONG_B_NAU");
                }
                if (!checkedValues.includes("BOI")) {
                  form.setFieldValue("wave_type", "");
                }
              }}
            >
              <div className="grid grid-cols-4 xl:grid-cols-6 gap-y-1">
                {loadingProcessTypes ? (
                  <span className="text-gray-400 text-xs">Đang tải...</span>
                ) : (
                  processTypes
                    .filter((pt) => !["IN", "DUT", "DOT", "CAT"].includes(pt))
                    .map((pt) => (
                      <Checkbox
                        value={pt}
                        key={pt}
                        className="!flex items-center m-0"
                      >
                        <span className="text-[13px] leading-tight">
                          {PROCESS_TYPE_LABELS[pt] || pt.replace(/_/g, " ")}
                        </span>
                      </Checkbox>
                    ))
                )}
              </div>
            </Checkbox.Group>
          </Form.Item>
        </Col>
        <Col span={6}>
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
                  label="Loại Sóng (Bồi)"
                  rules={[{ required: true, message: "Chọn loại sóng!" }]}
                  className="mb-1"
                >
                  <Select
                    placeholder="Chọn loại sóng..."
                    size="small"
                    options={songTypes.map((st) => ({
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
    </>
  );
}
