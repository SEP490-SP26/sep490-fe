"use client";

import axios from "@/apiRequests/axios";
import { requestOrderApi } from "@/apiRequests/request";
import { getSignalRConnection } from "@/lib/signalr";
import { OrderRequest } from "@/schemaValidations/common.schema";
import {
  CaretDownOutlined,
  CaretUpOutlined,
  EyeOutlined,
  LoadingOutlined,
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
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography
} from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const { Title } = Typography;

// Sort types
type SortField =
  | "order_request_id"
  | "customer_name"
  | "product_name"
  | "quantity"
  | "delivery_date"
  | "order_request_date"
  | null;
type SortOrder = "asc" | "desc";

export default function ManagerOrdersPage() {
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("processing");
  const [allOrders, setAllOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("order_request_id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch ALL orders
  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    try {
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
  }, []);

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // SignalR for real-time updates
  useEffect(() => {
    let conn: Awaited<ReturnType<typeof getSignalRConnection>>;

    getSignalRConnection().then((c) => {
      conn = c;
      conn.invoke("JoinRequestsAll").catch(console.error);

      conn.on("request.changed", (evt: {
        request_id: number;
        old_status: string | null;
        new_status: string;
        action: string;
      }) => {
        if (evt.action === "created") {
          fetchAllOrders();
          message.info(`🆕 Đơn hàng mới #${evt.request_id} vừa được tạo`);
        } else {
          fetchAllOrders();
        }
      });
    });

    return () => {
      conn?.off("request.changed");
      conn?.invoke("LeaveRequestsAll").catch(() => { });
    };
  }, [fetchAllOrders]);

  // Sorting function
  const sortOrders = useMemo(
    () => (orders: OrderRequest[]) => {
      if (!sortField) return orders;

      return [...orders].sort((a, b) => {
        let aVal: any = a[sortField as keyof OrderRequest];
        let bVal: any = b[sortField as keyof OrderRequest];

        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";

        if (sortField === "order_request_id" || sortField === "quantity") {
          aVal = Number(aVal) || 0;
          bVal = Number(bVal) || 0;
        }

        if (sortField === "delivery_date") {
          aVal = new Date(aVal).getTime() || 0;
          bVal = new Date(bVal).getTime() || 0;
        }

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

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

  const filterBySearch = useMemo(
    () => (orderList: OrderRequest[]) => {
      const search = searchText.toLowerCase().trim();
      if (!search) return orderList;

      return orderList.filter((order) => {
        if (order.customer_name?.toLowerCase().includes(search)) return true;
        if (order.product_name?.toLowerCase().includes(search)) return true;
        if (order.order_request_id?.toString().includes(search)) return true;
        if (order.customer_phone?.includes(search)) return true;
        if (order.customer_email?.toLowerCase().includes(search)) return true;
        if (order.delivery_date) {
          const formattedDate = dayjs(order.delivery_date).format("DD/MM/YYYY");
          if (formattedDate.includes(search)) return true;
        }
        if (order.quantity?.toString().includes(search)) return true;
        return false;
      });
    },
    [searchText]
  );

  // Filtered lists by status
  const pendingOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "pending"))), [allOrders, sortOrders, filterBySearch]);
  const declinedOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "declined"))), [allOrders, sortOrders, filterBySearch]);
  const processingOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "processing"))), [allOrders, sortOrders, filterBySearch]);
  const verifiedOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "verified"))), [allOrders, sortOrders, filterBySearch]);
  const waitingConfirmOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "waiting"))), [allOrders, sortOrders, filterBySearch]);
  const acceptedOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "accepted"))), [allOrders, sortOrders, filterBySearch]);
  const rejectedOrders = useMemo(() => sortOrders(filterBySearch(allOrders.filter((o) => o.process_status?.toLowerCase() === "rejected" || o.process_status?.toLowerCase() === "cancel"))), [allOrders, sortOrders, filterBySearch]);

  const columns = [
    {
      title: <SortableHeader field="order_request_id" title="Mã Đơn" />,
      dataIndex: "order_request_id",
      key: "order_request_id",
      width: 100,
      render: (id: number) => (
        <span className="font-mono text-gray-500 text-xs text-nowrap">#{id}</span>
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
        <b className="text-blue-600">{val?.toLocaleString()} SP</b>
      ),
    },
    {
      title: <SortableHeader field="order_request_date" title="Ngày tạo yêu cầu" />,
      dataIndex: "order_request_date",
      key: "order_request_date",
      align: "right" as const,
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY") : "-")
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
          <b className="text-green-600 font-mono">{val.toLocaleString()}</b>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: 'Tiền cọc',
      dataIndex: 'deposit_amount',
      key: 'deposit_amount',
      align: 'right' as const,
      render: (val: number) => val ? <b className="text-green-600 font-mono">{val.toLocaleString()}</b> : <span className="text-gray-400">-</span>
    },
    {
      key: "action",
      align: "center" as const,
      render: (_: any, record: OrderRequest) => (
        <Link href={`/manager/request-detail/${record.order_request_id}`}>
          <Button size="small" icon={<EyeOutlined />}>
            Chi Tiết
          </Button>
        </Link>
      ),
    },
  ];

  const genericTable = (data: OrderRequest[], emptyMsg: string, showHiddenCols: boolean = false) => (
    <Table
      columns={showHiddenCols ? columns : columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
      dataSource={data}
      rowKey="order_request_id"
      pagination={{
        pageSize: 10,
        showTotal: (total) => `Tổng ${total} đơn`,
      }}
      locale={{ emptyText: <Empty description={emptyMsg} /> }}
      bordered
      size="middle"
      onRow={(record) => ({
        onClick: () => router.push(`/manager/request-detail/${record.order_request_id}`),
        className: 'cursor-pointer hover:bg-slate-50 transition-colors',
      })}
    />
  );

  const tabItems = [
    {
      key: "processing",
      label: (
        <span>
          Chờ duyệt
          {processingOrders.length > 0 && (
            <Tag color="cyan" className="ml-2">{processingOrders.length}</Tag>
          )}
        </span>
      ),
      children: genericTable(processingOrders, "Không có đơn đang xử lý"),
    },
    {
      key: "verified",
      label: (
        <span>
          Đã được duyệt
          {verifiedOrders.length > 0 && (
            <Tag color="purple" className="ml-2">{verifiedOrders.length}</Tag>
          )}
        </span>
      ),
      children: genericTable(verifiedOrders, "Không có đơn đã xác minh"),
    },
    {
      key: "waiting",
      label: (
        <span>
          Chờ KH xác nhận
          {waitingConfirmOrders.length > 0 && (
            <Tag color="orange" className="ml-2">{waitingConfirmOrders.length}</Tag>
          )}
        </span>
      ),
      children: genericTable(waitingConfirmOrders, "Không có đơn chờ xác nhận"),
    },
    {
      key: "accepted",
      label: (
        <span>
          Đã xác nhận
          {acceptedOrders.length > 0 && (
            <Tag color="green" className="ml-2">{acceptedOrders.length}</Tag>
          )}
        </span>
      ),
      children: genericTable(acceptedOrders, "Không có đơn đã xác nhận", true),
    },
    {
      key: "rejected",
      label: (
        <span>
          Đã hủy
          {rejectedOrders.length > 0 && (
            <Tag color="red" className="ml-2">{rejectedOrders.length}</Tag>
          )}
        </span>
      ),
      children: genericTable(rejectedOrders, "Không có đơn đã hủy"),
    },
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Theo Dõi Yêu Cầu
          </Title>
          <p className="text-gray-500">
            Giám sát trạng thái và tiến độ xử lý yêu cầu báo giá
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
    </div>
  );
}
