import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import {
  EstimateCostResponse,
  EstimatePaperResponse,
} from "@/schemaValidations/common.schema";
import { SystemParameters } from "@/lib/estimation.types";
import { formatVietnameseNumber } from "@/utils/format";
import { CalculatorOutlined, LoadingOutlined, WarningOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Form, Row } from "antd";
import dayjs from "dayjs";
import { useEffect } from "react";

interface EstimatesCardProps {
  estimate: {
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
  } | null;
  paperEstimate: EstimatePaperResponse | null;
  costEstimate: EstimateCostResponse | null;
  loadingCostEstimate: boolean;
  loadingPaperEstimate: boolean;
  onCalculate: () => void;
  workshopFreeInfo: { days: number; date: string };
  isWorkshopFull: boolean;
  runningMachines: number;
  totalMachines: number;
  discountPercent: number;
  setDiscountPercent: (val: number) => void;
  depositAmount: number;
  form: any;
  isCreateMode: boolean;
  handleAdjustPrice: () => void;
  orderId: string | null;
  isSavingCost?: boolean;
  systemParameters: SystemParameters | null;
}

export default function EstimatesCard({
  estimate,
  paperEstimate,
  costEstimate,
  loadingCostEstimate,
  loadingPaperEstimate,
  onCalculate,
  workshopFreeInfo,
  isWorkshopFull,
  runningMachines,
  totalMachines,
  discountPercent,
  setDiscountPercent,
  depositAmount,
  form,
  isCreateMode,
  handleAdjustPrice,
  orderId,
  isSavingCost = false,
  systemParameters,
}: EstimatesCardProps) {
  const daysUntilFree = workshopFreeInfo.days;

  // Auto-update final_price when discount changes
  useEffect(() => {
    if (costEstimate?.cost?.final_total_cost) {
      const price = costEstimate.cost.final_total_cost;
      const roundedPrice = Math.round(price / 1000) * 1000;

      form.setFieldValue("final_price", roundedPrice);
    }
  }, [discountPercent, costEstimate, form]);

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
                  Thông báo cho khách hàng:
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
          message="Thiếu nguyên vật liệu"
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
          message="GẤP & QUÁ TẢI"
          description={`Khách cần sớm ${estimate.daysEarly} ngày.Xưởng đang bận.Đã tính phí gấp cao.`}
          type="error"
          showIcon
          className="mb-4"
        />
      );
    }

    if (estimate.caseType === 2) {
      return (
        <Alert
          title={`Đơn hàng ưu tiên (Gấp) - Khách cần sớm ${estimate.daysEarly} ngày.Đã tính phí ưu tiên.`}
          type="warning"
          showIcon
          className="mb-4"
        />
      );
    }

    return (
      <Alert
        message="Đủ điều kiện sản xuất"
        description="Kho đủ giấy & Tiến độ phù hợp."
        type="success"
        showIcon
        className="mb-4"
      />
    );
  };

  return (
    <div className="sticky top-4">
      <Card
        title={
          <>
            <CalculatorOutlined /> Ước Tính & Tồn Kho
          </>
        }
        extra={
          <Button
            type="primary"
            size="small"
            onClick={onCalculate}
            loading={loadingPaperEstimate || loadingCostEstimate}
          >
            Tính Toán
          </Button>
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
            <Row gutter={12}>
              <Col span={12}>
                {/* Paper Estimate from API */}
                {paperEstimate && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-2">
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
                        {paperEstimate.sheets_base.toLocaleString("vi-VN")}
                      </div>

                      <div className="col-span-2 border-t pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700 font-semibold">
                            Tổng số tờ cần:
                          </span>
                          <span className="font-bold text-lg text-green-700">
                            {paperEstimate.sheets_with_waste.toLocaleString(
                              "vi-VN"
                            )}{" "}
                            tờ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Giá chốt với khách hàng */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    Giá chốt với khách hàng: (đ)
                  </div>

                  {/* Input nhập giá chốt */}
                  <Form.Item
                    name="final_price"
                    className="flex justify-end"
                  >
                    <FloatingInputAntd
                      type="number"
                      className="w-full text-end font-bold text-lg"
                      min={costEstimate?.cost?.base_cost || 0}
                      formatter={(value: any) => value ? formatVietnameseNumber(value) : ''}
                      parser={(value: any) => {
                        return (value ? value.replace(/\./g, '') : '') as any;
                      }}
                      placeholder="Nhập giá chốt"
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prevValues, currentValues) => prevValues.final_price !== currentValues.final_price}
                  >
                    {({ getFieldValue }) => {
                      const currentFinalPrice = getFieldValue("final_price") || costEstimate?.cost?.final_total_cost || 0;
                      const calculatedDeposit = Math.round((currentFinalPrice * 0.3) / 1000) * 1000;

                      return (
                        <div className="flex justify-between items-center text-blue-900 mt-2 p-2 bg-blue-100/50 rounded-md border border-blue-100">
                          <span className="font-medium text-sm">Tiền cọc (30%):</span>
                          <span className="font-bold text-lg">
                            {formatVietnameseNumber(calculatedDeposit)} ₫
                          </span>
                        </div>
                      );
                    }}
                  </Form.Item>

                  {/* Nút xác nhận giá */}
                  {/* <Button
                    type="primary"
                    className="w-full "
                    onClick={handleAdjustPrice}
                    loading={isSavingCost}
                  // disabled={!orderId}
                  >
                    Tạo báo giá
                  </Button> */}
                </div>

              </Col>
              <Col span={12}>
                {/* Chi tiết Chi phí từ API */}
                {costEstimate && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-2">
                    <div className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      CHI TIẾT CHI PHÍ:
                      {loadingCostEstimate && (
                        <span className="text-xs text-blue-500 animate-pulse">
                          <LoadingOutlined />
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Chi phí giấy:</span>
                        <span className="font-medium">
                          {Math.round(costEstimate.cost.paper_cost).toLocaleString(
                            "vi-VN"
                          )}{" "}
                          ₫
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Chi phí mực:</span>
                        <span className="font-medium">
                          {(
                            Math.round(costEstimate.cost.ink_cost / 10) * 10
                          ).toLocaleString("vi-VN")}{" "}
                          ₫
                        </span>
                      </div>

                      {costEstimate.cost.design_cost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Phí thiết kế:</span>
                          <span className="font-medium">
                            {Math.round(costEstimate.cost.design_cost).toLocaleString(
                              "vi-VN"
                            )}{" "}
                            ₫
                          </span>
                        </div>
                      )}

                      {/* Chi phí gia công từ process_cost.details */}
                      {costEstimate.process_cost?.details
                        ?.filter((detail) => detail.total_cost > 0)
                        .map((detail) => (
                          <div
                            key={detail.process}
                            className="flex justify-between"
                          >
                            <span className="text-gray-600">
                              {detail.process === "IN"
                                ? "Công in"
                                : detail.process === "BOI"
                                  ? "Công bồi"
                                  : detail.process === "DAN"
                                    ? "Công dán"
                                    : detail.process === "BE"
                                      ? "Công bế"
                                      : detail.process === "RALO"
                                        ? "Ra lô"
                                        : detail.process === "PHU"
                                          ? "Công phủ"
                                          : detail.process === "CAN"
                                            ? "Cán màng"
                                            : detail.process === "DUT"
                                              ? "Đục"
                                              : detail.process === "DOT"
                                                ? "Đột"
                                                : detail.process === "CAT"
                                                  ? "Cắt"
                                                  : detail.process}
                              :
                            </span>
                            <span className="font-medium">
                              {Math.round(detail.total_cost).toLocaleString(
                                "vi-VN"
                              )}{" "}
                              ₫
                            </span>
                          </div>
                        ))}

                      {costEstimate.cost.mounting_glue_cost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Keo bồi:</span>
                          <span className="font-medium">
                            {Math.round(
                              costEstimate.cost.mounting_glue_cost
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </span>
                        </div>
                      )}

                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between text-gray-700">
                          <span>Chi phí vật liệu:</span>
                          <span className="font-semibold">
                            {(
                              Math.round(costEstimate.cost.material_cost / 10) * 10
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </span>
                        </div>

                      </div>

                      {/* <div className="flex justify-between font-medium">
                        <span>Giá cơ bản:</span>
                        <span className="text-blue-700">
                          {(
                            Math.round(costEstimate.cost.base_cost / 10) * 10
                          ).toLocaleString("vi-VN")}{" "}
                          ₫
                        </span>
                      </div> */}

                      {costEstimate.cost.is_rush && (
                        <div className="bg-orange-100 p-2 rounded border border-orange-200">
                          <div className="flex justify-between text-orange-700">
                            <span>
                              Phí gấp ({costEstimate.cost.rush_percent}
                              %):
                            </span>
                            <span className="font-semibold">
                              +
                              {Math.round(
                                costEstimate.cost.rush_amount
                              ).toLocaleString("vi-VN")}{" "}
                              ₫
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="border-t-2 border-blue-300 pt-3 mt-3">
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="font-medium">
                            Tổng tiền hàng:
                          </span>
                          <span className="font-bold text-lg">
                            {(
                              Math.round((costEstimate.cost.subtotal || costEstimate.cost.base_cost) / 10) *
                              10
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </span>
                        </div>

                        {/* Phần giảm giá */}
                        <div className="bg-green-50 p-3 rounded-lg mt-3 border border-green-200">
                          <div className="flex items-center justify-between gap-1 ">
                            <span className="text-green-800 font-medium w-100">
                              Chiết khấu (%):
                            </span>
                            <FloatingInputAntd
                              className=" text-end"
                              valueType="number"
                              min={0}
                              max={100}
                              // defaultValue={discountPercent}
                              style={{ width: "100%" }}
                              value={discountPercent}
                              onChange={(e: any) => setDiscountPercent(Number(e.target.value) || 0)}
                              size="small"
                            />
                          </div>
                          {discountPercent > 0 && (
                            <>
                              <div className="flex justify-between text-green-700 text-sm mt-2">
                                <span>Số tiền giảm:</span>
                                <span className="font-medium">
                                  -
                                  {Math.round(
                                    costEstimate.cost.discount_amount
                                  ).toLocaleString("vi-VN")}{" "}
                                  ₫
                                </span>
                              </div>
                              <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-300">
                                <span className="font-bold text-green-900">
                                  Sau chiết khấu:
                                </span>
                                <span className="font-bold text-xl text-green-700">
                                  {Math.round(
                                    (costEstimate.cost.subtotal || 0) - (costEstimate.cost.discount_amount || 0)
                                  ).toLocaleString("vi-VN")}{" "}
                                  ₫
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* VAT (New Location) */}
                        <div className="flex justify-between items-center mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                          <span className="text-gray-700 font-medium">VAT ({systemParameters?.vat_percent || 0}%):</span>
                          <span className="font-bold text-gray-800">
                            {(
                              Math.round(costEstimate.cost.overhead_cost / 10) * 10
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </span>
                        </div>

                        {/* Final Total */}
                        <div className="flex justify-between items-center mt-3 p-3 bg-blue-100 rounded border border-blue-200">
                          <span className="font-medium text-blue-900 ">
                            Thanh toán:
                          </span>
                          <span className="font-bold  text-lg text-blue-700">
                            {(
                              Math.round(costEstimate.cost.final_total_cost / 10) *
                              10
                            ).toLocaleString("vi-VN")}{" "}
                            ₫
                          </span>
                        </div>

                        {/* Tiền đặt cọc (30%) - Đã chuyển lên trên phần Giá chốt */}
                        {/* <div className="bg-purple-50 p-3 rounded-lg mt-3 border border-purple-200">
                          <div className="flex justify-between items-center">
                            <span className="text-purple-800 font-medium">
                              Tiền cọc (30%):
                            </span>
                            <span className="font-bold text-lg text-purple-700">
                              {(() => {
                                const finalPrice = form?.getFieldValue("final_price") || costEstimate.cost.final_total_cost;
                                const deposit = Math.round((finalPrice * 0.3) / 1000) * 1000;
                                return deposit.toLocaleString("vi-VN");
                              })()}{" "}
                              ₫
                            </span>
                          </div>
                        </div> */}

                        <div className="flex justify-between mt-3 text-sm">
                          <span className="text-gray-600">
                            Hoàn thành dự kiến:
                          </span>
                          <span className="font-medium text-green-700">
                            {dayjs(costEstimate.cost.estimated_finish_date).format(
                              "DD/MM/YYYY"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Col>
            </Row>
            {/* <div className="border-t pt-4">
              <h4 className="font-semibold text-gray-700 mb-2">
                Tiến độ dự kiến:
              </h4>
              <Steps
                direction="horizontal"
                size="small"
                current={0}
                items={[
                  // { title: "Tạo đơn", description: "Hôm nay" },
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
                    description: `Khoảng ${ estimate.productionDays } ngày`,
                  },
                  {
                    title: "Giao hàng",
                    description: `Hẹn giao: ${
  dayjs(
    estimate.effectiveDate
  ).format("DD/MM/YYYY")
} `,
                  },
                ]}
              />
            </div> */}
          </div>
        )}
      </Card>
    </div>
  );
}
