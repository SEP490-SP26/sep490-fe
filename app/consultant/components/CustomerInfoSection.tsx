import { Col, Form, Row, DatePicker, Button, message } from "antd";
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";
import { FloatingDatePicker } from "@/components/Input/FloatingDatePicker";
import { isVietnamHoliday } from "@/utils/vietnamHolidays";

interface CustomerInfoSectionProps {
  orderId: string | null;
  form: any;
  handleFormValuesChange: (changedValues: any, allValues: any) => void;
  onConfirmCreate?: (values: any) => void;
  loading?: boolean;
  requestDate?: string;
  initialDeliveryDate?: string;
}

const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  return (current && current < dayjs().startOf("day")) || isVietnamHoliday(current);
};

export default function CustomerInfoSection({
  orderId,
  form,
  handleFormValuesChange,
  onConfirmCreate,
  loading,
  requestDate,
  initialDeliveryDate,
}: CustomerInfoSectionProps) {

  const deliveryDate = form.getFieldValue("delivery_date");
  const isDateChanged = initialDeliveryDate && deliveryDate && !dayjs(deliveryDate).isSame(dayjs(initialDeliveryDate), 'day');

  return (
    <div
      className={`${orderId
        ? "sticky top-0 z-10 bg-white pb-2 border-b border-gray-100 -mx-6 px-6 pt-2"
        : ""
        }`}
    >
      <Row gutter={12}>
        <Col span={8}>
          <Form.Item
            name="customer_name"
            rules={[{ required: true, message: "Vui lòng nhập tên khách hàng" }]}
            className="mb-2"
          >
            <FloatingInputAntd
              label="Khách Hàng"
              placeholder="Tên khách..."
              disabled={!!orderId}
              className={orderId ? "bg-gray-50" : ""}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item name="customer_phone" className="mb-2" rules={[{ required: true, message: "SĐT bắt buộc" }]}>
            <FloatingInputAntd
              placeholder="09..."
              label="SĐT"
              disabled={!!orderId}
              className={orderId ? "bg-gray-50 text-end" : "text-end"}
            />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item name="customer_email" className="mb-2">
            <FloatingInputAntd
              label="Email"
              placeholder="email@example.com"
              disabled={!!orderId}
            />
          </Form.Item>
        </Col>
        
        <Col span={18}>
          <Form.Item name="detail_address" className="mb-2">
            <FloatingInputAntd
              label="Địa chỉ giao hàng"
              placeholder="Số nhà, đường, phường/xã, quận/huyện..."
              disabled={!!orderId}
            />
          </Form.Item>
        </Col>
        <Col span={6}>
          {!orderId ? (
            // Create Mode: Delivery Date here
            <Form.Item
              name="delivery_date"
              rules={[{ required: true, message: "Vui lòng chọn ngày giao" }]}
              className="mb-2"
            >
              <FloatingDatePicker
                label="Ngày giao hàng"
                className="w-full"
                format="DD-MM-YYYY"
                placeholder="Ngày giao hàng mong muốn"
                disabledDate={disabledDate}
                onChange={(date) => {
                  form.setFieldValue("desiredDate", date);
                  if (date) {
                    handleFormValuesChange(
                      { desiredDate: date },
                      form.getFieldsValue()
                    );
                  }
                }}
              />
            </Form.Item>
          ) : (
            // Negotiate Mode: Request Date here (disabled)
            <div className="mb-2">
               <FloatingDatePicker 
                label="Ngày yêu cầu"
                value={requestDate ? dayjs(requestDate) : null}
                disabled
                format="DD-MM-YYYY"
                className="w-full bg-gray-50 bg-opacity-50"
              />
            </div>
          )}
        </Col>
      </Row>

      {orderId && (
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item
              name="delivery_date"
              rules={[{ required: true, message: "Vui lòng chọn ngày giao" }]}
              className="mb-2"
            >
              <FloatingDatePicker
                label="Ngày giao hàng"
                className="w-full"
                format="DD-MM-YYYY"
                placeholder="Ngày giao hàng mong muốn"
                disabledDate={disabledDate}
                onChange={(date) => {
                  form.setFieldValue("desiredDate", date);
                  if (date) {
                    handleFormValuesChange(
                      { desiredDate: date },
                      form.getFieldsValue()
                    );
                  }
                }}
              />
            </Form.Item>
          </Col>
          {isDateChanged && (
            <Col span={18}>
              <Form.Item
                name="date_change_reason"
                rules={[{ required: true, message: "Vui lòng nhập lí do thay đổi ngày" }]}
                className="mb-2 animate-fade-in"
              >
                <FloatingInputAntd
                  label="Lí do thay đổi ngày"
                  placeholder="Nhập lí do thay đổi ngày giao hàng..."
                  className="bg-yellow-50/50"
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      )}
    </div>
  );
}
