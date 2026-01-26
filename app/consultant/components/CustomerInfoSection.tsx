import { Col, Form, Row, DatePicker, Button, message } from "antd";
import { FloatingInputAntd } from "@/components/Input/FloatingInput";
import { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";
import { FloatingDatePicker } from "@/components/Input/FloatingDatePicker";

interface CustomerInfoSectionProps {
  orderId: string | null;
  form: any;
  handleFormValuesChange: (changedValues: any, allValues: any) => void;
  onConfirmCreate?: (values: any) => void;
  loading?: boolean;
}

const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  return current && current < dayjs().endOf("day");
};

export default function CustomerInfoSection({
  orderId,
  form,
  handleFormValuesChange,
  onConfirmCreate,
  loading,
}: CustomerInfoSectionProps) {


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
            <div className="mb-2">
              <Button
                type="primary"
                htmlType="button"
                className="w-full h-10"
                onClick={async () => {
                  try {
                    const values = await form.validateFields([
                      "customer_name",
                      "customer_phone",
                      "customer_email",
                      "detail_address"
                    ]);
                    onConfirmCreate?.(values);
                  } catch (e) {
                    // validation failed
                  }
                }}
                loading={loading}
              >
                Xác nhận
              </Button>
            </div>
          ) : (
            <Form.Item
              name="delivery_date"
              rules={[{ required: true }]}
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
          )}
        </Col>
      </Row>
    </div>
  );
}
