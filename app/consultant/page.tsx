"use client";
import { useProduction } from "@/context/ProductionContext";
import React, { useState } from "react";

export default function Page() {
  const { products } = useProduction();

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
    // Reset form
    setFormData({
      product_id: "",
      quantity: "",
      delivery_date: "",
      customer_name: "",
    });
  };

  return (
    <div className="bg-white mx-auto rounded-lg border border-gray-200 p-6">
      <div className="flex flex-col items-center w-300 mx-auto px-2 py-4  min-h-screen">
        <h2 className="mb-6">Tạo đơn hàng mới</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">Sản phẩm</label>
            <select
              value={formData.product_id}
              onChange={(e) =>
                setFormData({ ...formData, product_id: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
