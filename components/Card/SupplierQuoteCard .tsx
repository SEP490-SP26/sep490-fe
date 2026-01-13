import { Rate } from "antd";
import { BiPhone, BiEnvelope, BiTime, BiCheck } from "react-icons/bi";

interface SupplierQuoteCardProps {
  supplier: any;
  material: any;
  onSelect: (supplier: any) => void;
}

const SupplierQuoteCard: React.FC<SupplierQuoteCardProps> = ({
  supplier,
  material,
  onSelect,
}) => {
  const totalPrice = supplier.price * material.quantity;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold text-gray-900">{supplier.name}</div>
              <div className="text-sm text-gray-500">
                {supplier.mainMaterialType && (
                  <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs mr-2">
                    {supplier.mainMaterialType}
                  </span>
                )}
                <span className="text-gray-400">•</span>
                <span className="ml-2">
                  {supplier.contactPerson} - {supplier.phone}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                {new Intl.NumberFormat("vi-VN").format(supplier.price)} đ/
                {material.unit}
              </div>
              <div className="text-sm text-gray-500">
                Tổng: {new Intl.NumberFormat("vi-VN").format(totalPrice)} đ
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600 mt-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <Rate
                  disabled
                  allowHalf
                  defaultValue={supplier.rating || 0}
                  className="text-sm"
                />
                <span className="ml-2 font-medium">
                  {supplier.rating?.toFixed(1) || "0.0"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <BiTime className="w-4 h-4" />
              <span>Thời gian giao: {supplier.deliveryTime || "Liên hệ"}</span>
            </div>

            <div className="flex items-center gap-2">
              <BiEnvelope className="w-4 h-4" />
              <span className="truncate">
                {supplier.email || "Chưa có email"}
              </span>
            </div>
          </div>

          {supplier.minOrder && (
            <div className="mt-3 text-xs text-gray-500">
              Đơn hàng tối thiểu: {supplier.minOrder} {material.unit}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 space-y-2">
          {/* <button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm w-full"
            onClick={() => onSelect(supplier)}
          >

            Chọn nhà cung cấp
          </button> */}

          {/* <button
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm w-full"
            onClick={() => (window.location.href = `tel:${supplier.phone}`)}
          >
            <BiPhone className="w-4 h-4" />
            Gọi điện liên hệ
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default SupplierQuoteCard;
