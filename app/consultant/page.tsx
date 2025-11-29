'use client';
import { useProduction } from "@/context/ProductionContext";
import { useState } from "react";

export default function CreateOrderPage() {
  const {
    products,
    addOrder,
  } = useProduction();

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: "",
    delivery_date: "",
    customer_name: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.product_id ||
      !formData.quantity ||
      !formData.delivery_date ||
      !formData.customer_name
    ) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const orderId = addOrder({
      product_id: formData.product_id,
      quantity: parseInt(formData.quantity),
      delivery_date: formData.delivery_date,
      customer_name: formData.customer_name,
    });

    // Reset form
    setFormData({
      product_id: "",
      quantity: "",
      delivery_date: "",
      customer_name: "",
    });

    alert("Đơn hàng đã được tạo thành công!");
  };

  return (
    <div>
      <h1 className="mb-8">Tạo Đơn Hàng Mới</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
        <h2 className="mb-6">Thông tin đơn hàng</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Sản phẩm</label>
            <select
              value={formData.product_id}
              onChange={(e) =>
                setFormData({ ...formData, product_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Chọn sản phẩm</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Số lượng</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập số lượng"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Ngày giao hàng</label>
            <input
              type="date"
              value={formData.delivery_date}
              onChange={(e) =>
                setFormData({ ...formData, delivery_date: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">Tên khách hàng</label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập tên khách hàng"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tạo đơn hàng
          </button>
        </form>
      </div>
    </div>
  );
}