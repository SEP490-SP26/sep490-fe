"use client";

import { requestOrderApi } from "@/apiRequests/request";
import { OrderRequest } from "@/schemaValidations/common.schema";
import {
  CaretDownOutlined,
  CaretUpOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  LoadingOutlined,
  MailOutlined,
  ReloadOutlined,
  SearchOutlined
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const { Title } = Typography;

// Sort types
type SortField =
  | "order_request_id"
  | "customer_name"
  | "product_name"
  | "quantity"
  | "delivery_date"
  | null;
type SortOrder = "asc" | "desc";

export default function ConsultantOrdersPage() {
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [allOrders, setAllOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Sorting state - mặc định theo Ngày Giao gần nhất
  const [sortField, setSortField] = useState<SortField>("order_request_id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch ALL orders with single API call
  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      // Get all orders with large pageSize
      const response = await requestOrderApi.getList(1, 500);
      if (response?.data && Array.isArray(response.data)) {
        setAllOrders(response.data);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      message.error("Không thể tải danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => requestOrderApi.deleteRequest(id),
    onSuccess: (data) => {
      message.success(data.data?.message || "Xóa yêu cầu thành công");
      fetchAllOrders();
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi xóa");
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Sorting function
  const sortOrders = useMemo(
    () => (orders: OrderRequest[]) => {
      if (!sortField) return orders;

      return [...orders].sort((a, b) => {
        let aVal: any = a[sortField as keyof OrderRequest];
        let bVal: any = b[sortField as keyof OrderRequest];

        // Handle null/undefined
        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";

        // Number comparison
        if (sortField === "order_request_id" || sortField === "quantity") {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        }

        // Date comparison
        if (sortField === "delivery_date") {
          aVal = new Date(aVal).getTime() || 0;
          bVal = new Date(bVal).getTime() || 0;
        }

        // String comparison
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }

        if (sortOrder === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      });
    },
    [sortField, sortOrder]
  );

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // New field, start with asc
      // setSortField(field);
      // setSortOrder("asc");
    }
  };

  // Sortable column header component
  const SortableHeader = ({
    field,
    title,
  }: {
    field: SortField;
    title: string;
  }) => (
    <div
      className="flex items-center gap-1 cursor-pointer select-none hover:text-blue-600"
      onClick={() => handleSort(field)}
    >
      <span>{title}</span>
      <span className="flex flex-col text-xs leading-none">
        <CaretUpOutlined
          className={
            sortField === field && sortOrder === "asc"
              ? "text-blue-600"
              : "text-gray-300"
          }
        />
        <CaretDownOutlined
          className={
            sortField === field && sortOrder === "desc"
              ? "text-blue-600"
              : "text-gray-300"
          }
          style={{ marginTop: -4 }}
        />
      </span>
    </div>
  );

  // Filter by search text - tìm theo nhiều fields
  const filterBySearch = useMemo(
    () => (orderList: OrderRequest[]) => {
      const search = searchText.toLowerCase().trim();
      if (!search) return orderList;

      return orderList.filter((order) => {
        // Tìm theo tên khách hàng
        if (order.customer_name?.toLowerCase().includes(search)) return true;
        // Tìm theo tên sản phẩm
        if (order.product_name?.toLowerCase().includes(search)) return true;
        // Tìm theo mã đơn hàng
        if (order.order_request_id?.toString().includes(search)) return true;
        // Tìm theo số điện thoại
        if (order.customer_phone?.includes(search)) return true;
        // Tìm theo email
        if (order.customer_email?.toLowerCase().includes(search)) return true;
        // Tìm theo ngày giao (DD/MM/YYYY)
        if (order.delivery_date) {
          const formattedDate = dayjs(order.delivery_date).format("DD/MM/YYYY");
          if (formattedDate.includes(search)) return true;
        }
        // Tìm theo số lượng
        if (order.quantity?.toString().includes(search)) return true;

        return false;
      });
    },
    [searchText]
  );

  // Memoized filtered & sorted orders by status
  const pendingOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter((o) => o.process_status?.toLowerCase() === "pending")
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );

  const waitingConfirmOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter((o) => o.process_status?.toLowerCase() === "waiting")
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );

  const acceptedOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter(
            (o) => o.process_status?.toLowerCase() === "accepted"
          )
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );

  const rejectedOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter(
            (o) => o.process_status?.toLowerCase() === "rejected" || o.process_status?.toLowerCase() === "cancel"
          )
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );



  // Get action button based on status
  const getActionButton = (record: OrderRequest) => {
    const statusLower = record.process_status?.toLowerCase();
    switch (statusLower) {
      case "pending":
        return (
          <Space size="small" >
            <Link
              href={`/consultant?orderId=${record.order_request_id}&mode=negotiate`}
            >
              <Button type="primary" size="small" icon={<EditOutlined />}>
                Tiếp nhận & Báo giá
              </Button>
            </Link>
            <Popconfirm
              title="Đóng yêu cầu"
              description="Bạn có chắc chắn muốn đóng yêu cầu này không?"
              onConfirm={() => handleDelete(String(record.order_request_id))}
              okText="Đóng"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
              disabled={deleteMutation.isPending}
            >
              <Button
                size="small"
                style={{
                  color: "red",
                  border: "1px solid red",
                  backgroundColor: "transparent",
                }}
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              >

              </Button>
            </Popconfirm>
          </Space>

        );
      case "waiting":
        return (
          <Space size="small">
            <Popconfirm
              title="Đóng yêu cầu"
              description="Bạn có chắc chắn muốn đóng yêu cầu này không?"
              onConfirm={() => handleDelete(String(record.order_request_id))}
              okText="Đóng"
              cancelText="Hủy"
              okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
              disabled={deleteMutation.isPending}
            >
              <Button
                size="small"
                style={{
                  color: "red",
                  border: "1px solid red",
                  backgroundColor: "transparent",
                }}
                icon={<DeleteOutlined />}
                loading={deleteMutation.isPending}
              >

              </Button>
            </Popconfirm>
          </Space>
        );
      case "pending_order_creation":
      case "accepted":
        return (
          <Link
            href={`/consultant?orderId=${record.order_request_id}&mode=create`}
          >
            <Button
              type="primary"
              size="small"
              icon={<FileTextOutlined />}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Tạo đơn hàng
            </Button>
          </Link>
        );
      default:
        return (
          <Link href={`/consultant?orderId=${record.order_request_id}`}>
            <Button size="small" icon={<EyeOutlined />}>
              Xem
            </Button>
          </Link>
        );
    }
  };

  const columns = [
    {
      title: <SortableHeader field="order_request_id" title="Mã Đơn" />,
      dataIndex: "order_request_id",
      key: "order_request_id",
      width: 100,
      render: (id: number) => (
        <span className="font-mono text-gray-500 text-xs">#{id}</span>
      ),
    },
    {
      title: <SortableHeader field="customer_name" title="Khách Hàng" />,
      dataIndex: "customer_name",
      key: "customer_name",
      render: (text: string, record: OrderRequest) => (
        <div>
          <div className="font-medium text-gray-900">{text}</div>
          {record.customer_phone && (
            <div className="text-xs text-gray-500">{record.customer_phone}</div>
          )}
          {record.customer_email && (
            <div className="text-xs text-gray-400">{record.customer_email}</div>
          )}
        </div>
      ),
    },
    {
      title: <SortableHeader field="product_name" title="Sản Phẩm Yêu Cầu" />,
      dataIndex: "product_name",
      key: "product_name",
      render: (text: string) => (
        <span className="font-medium">{text || "Sản phẩm tùy chỉnh"}</span>
      ),
    },
    {
      title: <SortableHeader field="quantity" title="Số Lượng" />,
      dataIndex: "quantity",
      key: "quantity",
      align: "right" as const,
      render: (val: number) => (
        <b className="text-blue-600">{val?.toLocaleString()}</b>
      ),
    },
    {
      title: <SortableHeader field="delivery_date" title="Ngày Giao" />,
      dataIndex: "delivery_date",
      key: "delivery_date",
      align: "right" as const,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-"),
    },
    {
      title: "Giá Báo (₫)",
      dataIndex: "final_cost",
      key: "final_cost",
      align: "right" as const,
      render: (val: number) =>
        val ? (
          <b className="text-green-600">{val.toLocaleString()}</b>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    // {
    //   title: "Trạng Thái",
    //   dataIndex: "process_status",
    //   key: "process_status",
    //   align: "center" as const,
    //   render: (status: string) => getStatusTag(status),
    // },

    { title: 'Tiền cọc', dataIndex: 'deposit_amount', key: 'deposit_amount', align: 'right' as const, render: (val: number) => val ? <b className="text-green-600">{val.toLocaleString()}</b> : <span className="text-gray-400">-</span> },
    {
      // title: "Hành Động",
      key: "action",
      align: "center" as const,
      render: (_: any, record: OrderRequest) => getActionButton(record),
    },
  ];

  const tabItems = [
    {
      key: "pending",
      label: (
        <span>
          Đơn mới
          {pendingOrders.length > 0 && (
            <Tag color="blue" className="ml-2">
              {pendingOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
          dataSource={pendingOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn hàng mới" /> }}
          bordered
          size="middle"
        />
      ),
    },
    {
      key: "waiting",
      label: (
        <span>
          Chờ KH xác nhận
          {waitingConfirmOrders.length > 0 && (
            <Tag color="orange" className="ml-2">
              {waitingConfirmOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={waitingConfirmOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{
            emptyText: <Empty description="Không có đơn chờ xác nhận" />,
          }}
          bordered
          size="middle"
        />
      ),
    },
    {
      key: "creation",
      label: (
        <span>
          Đã xác nhận
          {acceptedOrders.length > 0 && (
            <Tag color="green" className="ml-2">
              {acceptedOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns.filter((col) => col.key !== "action")}
          dataSource={acceptedOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn chờ tạo" /> }}
          bordered
          size="middle"
        />
      ),
    },
    {
      key: "rejected",
      label: (
        <span>
          Đã hủy
          {rejectedOrders.length > 0 && (
            <Tag color="red" className="ml-2">
              {rejectedOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns.filter((col) => col.key !== "action")}
          dataSource={rejectedOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn chờ tạo" /> }}
          bordered
          size="middle"
        />
      ),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Quản Lý Đơn Hàng
          </Title>
          <p className="text-gray-500">
            Xử lý đơn hàng từ khách hàng - Báo giá & Tạo đơn
          </p>
        </div>
        <div className="w-1/3">
          <Input
            placeholder="Tìm tên khách, sản phẩm, mã đơn..."
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            size="large"
            suffix={
              <Button
                type="text"
                icon={<ReloadOutlined spin={loading} />}
                onClick={() => fetchAllOrders()}
                title="Tải lại"
              />
            }
          />

        </div>
      </div>

      <Card className="shadow-sm border-none">
        <Spin spinning={loading} indicator={<LoadingOutlined />}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
          />
        </Spin>
      </Card>

      {/* Sort info */}
      {sortField && (
        <div className="mt-3 text-sm text-gray-500">
          Đang sắp xếp theo:{" "}
          <b>
            {sortField === "order_request_id"
              ? "Mã đơn"
              : sortField === "delivery_date"
                ? "Ngày giao"
                : sortField === "customer_name"
                  ? "Khách hàng"
                  : sortField === "product_name"
                    ? "Sản phẩm"
                    : sortField === "quantity"
                      ? "Số lượng"
                      : sortField}
          </b>{" "}
          ({sortOrder === "asc" ? "Tăng dần" : "Giảm dần"})
          <Button type="link" size="small" onClick={() => setSortField(null)}>
            Khôi phục
          </Button>
        </div>
      )}
    </div>
  );
}
