"use client";

import { Order, useProduction } from "@/context/ProductionContext";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Descriptions,
  Modal,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { BiCalendar, BiChevronDown, BiFilter, BiSearch } from "react-icons/bi";

const { Title, Text } = Typography;

export default function ConsultantOrdersPage() {
  const { orders, products } = useProduction();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({
    from: "",
    to: "",
  });

  // State quản lý Modal chi tiết
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      consultant_verified: "Chờ Duyệt",
      manager_approved: "Đang Sản Xuất",
      rejected: "Từ Chối",
      pending: "Chờ xử lý",
      scheduled: "Đã lên lịch",
      in_production: "Đang sản xuất",
      completed: "Hoàn thành",
    };
    return labels[status] || status;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Lọc đơn hàng
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.customer_name.toLowerCase().includes(term) ||
          order.order_id.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((order) => order.process_status === statusFilter);
    }

    // Product filter
    if (productFilter !== "all") {
      result = result.filter((order) => order.product_id === productFilter);
    }

    // Date filter
    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from);
      result = result.filter((order) => new Date(order.created_at) >= fromDate);
    }
    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((order) => new Date(order.created_at) <= toDate);
    }

    // Sorting by created_at desc
    result.sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime()
    );

    return result;
  }, [orders, searchTerm, statusFilter, productFilter, dateFilter]);

  // Hàm xem chi tiết
  const handleViewDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const renderStatus = (status: string) => {
    switch (status) {
      case "consultant_verified":
        return (
          <Tag icon={<ClockCircleOutlined />} color="orange">
            Chờ Duyệt
          </Tag>
        );
      case "manager_approved":
        return (
          <Tag icon={<CheckCircleOutlined />} color="green">
            Đang Sản Xuất
          </Tag>
        );
      case "rejected":
        return (
          <Tag icon={<CloseCircleOutlined />} color="red">
            Từ Chối
          </Tag>
        );
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: "Mã Đơn",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (text: string) => (
        <span className="font-mono text-gray-500">
          #{text?.split?.("-")?.[1] || ""}
        </span>
      ),
    },
    {
      title: "Khách Hàng",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (text: string, record: Order) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-400">{record.customer_phone}</div>
        </div>
      ),
    },
    {
      title: "Sản Phẩm",
      dataIndex: "product_name",
      key: "product_name",
      render: (text: string) => (
        <span className="font-semibold text-blue-600">{text}</span>
      ),
    },
    {
      title: "Số Lượng",
      dataIndex: "quantity",
      align: "right" as const,
      render: (val: number) => <b>{val.toLocaleString()}</b>,
    },
    {
      title: "Tổng Tiền",
      dataIndex: "final_price",
      align: "right" as const,
      render: (val: number) => (
        <span className="text-green-600 font-bold">
          {val?.toLocaleString()} ₫
        </span>
      ),
    },
    {
      title: "Ngày Giao",
      dataIndex: "delivery_date",
      render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
    },
    {
      title: "Trạng Thái",
      dataIndex: "process_status",
      render: (status: string) => renderStatus(status),
    },
    {
      title: "Hành Động",
      key: "action",
      render: (_: any, record: Order) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          className="text-blue-500"
          onClick={() => handleViewDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Title level={2} style={{ margin: 0 }}>
            Quản Lý Đơn Hàng
          </Title>
          <Text type="secondary">
            Tổng số: {orders.length} đơn hàng • Đang hiển thị:{" "}
            {filteredOrders.length} đơn
          </Text>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-6">
            {/* First Row: Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo khách hàng, mã đơn, sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Second Row: Main Filters */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <BiFilter className="w-4 h-4" />
                  Bộ lọc
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setProductFilter("all");
                      setDateFilter({ from: "", to: "" });
                    }}
                    className="text-sm text-red-600 hover:text-gray-900"
                  >
                    Xóa bộ lọc
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Trạng thái
                  </label>
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="consultant_verified">Chờ Duyệt</option>
                      <option value="manager_approved">Đang Sản Xuất</option>
                      <option value="rejected">Từ Chối</option>
                      <option value="pending">Chờ xử lý</option>
                      <option value="completed">Hoàn thành</option>
                    </select>
                    <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {/* Product Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Sản phẩm
                  </label>
                  <div className="relative">
                    <select
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white text-sm"
                    >
                      <option value="all">Tất cả sản phẩm</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.type}
                        </option>
                      ))}
                    </select>
                    <BiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                  </div>
                </div>

                {/* Date Range Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
                    Khoảng thời gian
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <BiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFilter.from}
                        onChange={(e) =>
                          setDateFilter({ ...dateFilter, from: e.target.value })
                        }
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="relative">
                      <BiCalendar className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFilter.to}
                        onChange={(e) =>
                          setDateFilter({ ...dateFilter, to: e.target.value })
                        }
                        className="w-full pl-8 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              {(statusFilter !== "all" ||
                productFilter !== "all" ||
                dateFilter.from ||
                dateFilter.to) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm text-gray-600">
                      Đang lọc theo:
                    </span>
                    {statusFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        Trạng thái: {getStatusLabel(statusFilter)}
                        <button
                          onClick={() => setStatusFilter("all")}
                          className="hover:text-blue-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {productFilter !== "all" && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        SP: {products.find((p) => p.id === productFilter)?.type}
                        <button
                          onClick={() => setProductFilter("all")}
                          className="hover:text-purple-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {dateFilter.from && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        Từ: {formatDate(dateFilter.from)}
                        <button
                          onClick={() =>
                            setDateFilter({ ...dateFilter, from: "" })
                          }
                          className="hover:text-orange-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {dateFilter.to && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        Đến: {formatDate(dateFilter.to)}
                        <button
                          onClick={() =>
                            setDateFilter({ ...dateFilter, to: "" })
                          }
                          className="hover:text-orange-900"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Card className="shadow-sm border-none">
          <Table
            columns={columns}
            dataSource={filteredOrders}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>

        {/* MODAL CHI TIẾT */}
        <Modal
          title={
            <span className="text-xl">
              Chi Tiết Đơn Hàng{" "}
              {/* {selectedOrder?.order_id
                ? `#${selectedOrder.order_id.split("-")[1]}`
                : ""} */}
            </span>
          }
          open={isDetailOpen}
          onCancel={() => setIsDetailOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsDetailOpen(false)}>
              Đóng
            </Button>,
          ]}
          width={800}
        >
          {selectedOrder && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div>
                  <div className="text-gray-500 text-xs uppercase">
                    Trạng thái
                  </div>
                  <div className="mt-1">
                    {renderStatus(selectedOrder.process_status)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-500 text-xs uppercase">
                    Ngày tạo
                  </div>
                  <div className="font-medium">
                    {dayjs(selectedOrder.created_at).format(
                      "HH:mm - DD/MM/YYYY"
                    )}
                  </div>
                </div>
              </div>

              <Descriptions title="Thông tin chi tiết" bordered column={2}>
                <Descriptions.Item label="Khách hàng">
                  {selectedOrder.customer_name}
                </Descriptions.Item>
                <Descriptions.Item label="SĐT">
                  {selectedOrder.customer_phone}
                </Descriptions.Item>
                <Descriptions.Item label="Sản phẩm" span={2}>
                  <b className="text-blue-600">{selectedOrder.product_name}</b>
                </Descriptions.Item>
                <Descriptions.Item label="Số lượng">
                  {selectedOrder.quantity.toLocaleString()}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày giao">
                  {dayjs(selectedOrder.delivery_date).format("DD/MM/YYYY")}
                </Descriptions.Item>

                <Descriptions.Item label="Quy cách" span={2}>
                  {selectedOrder.specs ? (
                    <div className="text-xs">
                      <p>
                        • Kích thước: {selectedOrder.specs.length}x
                        {selectedOrder.specs.width}x{selectedOrder.specs.height}{" "}
                        mm
                      </p>
                      <p>• Giấy: {selectedOrder.specs.paper_id}</p>
                      <p>
                        • Gia công:{" "}
                        {selectedOrder.specs.processing?.join(", ") || "Không"}
                      </p>
                      <p>
                        • Màu sắc:{" "}
                        {selectedOrder.specs.colors?.map((c) => (
                          <span
                            key={c}
                            style={{
                              background: c,
                              padding: "0 4px",
                              marginRight: 4,
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </p>
                    </div>
                  ) : (
                    "Chưa cập nhật"
                  )}
                </Descriptions.Item>

                <Descriptions.Item label="Tài chính" span={2}>
                  <div className="flex justify-between w-full">
                    <span>
                      Phí gấp: {selectedOrder.rush_fee?.toLocaleString()} ₫
                    </span>
                    <span className="font-bold text-lg text-blue-700">
                      Tổng: {selectedOrder.final_price?.toLocaleString()} ₫
                    </span>
                  </div>
                </Descriptions.Item>

                <Descriptions.Item label="Ghi chú" span={2}>
                  {selectedOrder.note || "Không có"}
                </Descriptions.Item>
                <Descriptions.Item label="Hợp đồng" span={2}>
                  {selectedOrder.contract_file ? (
                    <Button type="link" icon={<FileTextOutlined />}>
                      Tải hợp đồng ({selectedOrder.contract_file})
                    </Button>
                  ) : (
                    <span className="italic text-gray-400">
                      Chưa có hợp đồng
                    </span>
                  )}
                </Descriptions.Item>
              </Descriptions>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
