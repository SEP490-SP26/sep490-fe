
import { Order } from "@/context/ProductionContext";
import { CodeSandboxOutlined } from "@ant-design/icons";
import { List, Modal, Tag } from "antd";
import dayjs from "dayjs";

interface FactoryOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  factoryOrders: Order[];
}

export default function FactoryOrdersModal({
  isOpen,
  onClose,
  factoryOrders,
}: FactoryOrdersModalProps) {
  return (
    <Modal
      title="Đơn Hàng Đang Sản Xuất Tại Xưởng"
      open={isOpen}
      onCancel={onClose}
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
            <Tag color={item.status === "in_production" ? "orange" : "blue"}>
              {item.status === "in_production"
                ? "Đang chạy máy"
                : "Đã lên lịch"}
            </Tag>
          </List.Item>
        )}
        locale={{ emptyText: "Hiện xưởng đang trống việc" }}
      />
    </Modal>
  );
}
