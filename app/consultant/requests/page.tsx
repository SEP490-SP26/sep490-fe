"use client";

import axios from "@/apiRequests/axios";
import { requestOrderApi } from "@/apiRequests/request";
import { getHubConnection } from "@/hooks/useNotifications";
import { OrderRequest } from "@/schemaValidations/common.schema";
import {
  CaretDownOutlined,
  CaretUpOutlined,
  CopyOutlined,
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
  Modal,
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
  | "assigned_consultant_name"
  | null;
type SortOrder = "asc" | "desc";

export default function ConsultantOrdersPage() {
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [allOrders, setAllOrders] = useState<OrderRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Sorting state - mặc định theo Ngày Giao gần nhất
  const [sortField, setSortField] = useState<SortField>("order_request_id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Fetch ALL orders with single API call
  const fetchAllOrders = useCallback(async () => {
    setLoading(true);
    try {
      //const {data: response} = await axios.get("https://localhost:7109/api/Requests/paged?page=1&pageSize=500");
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
  }, [])

  useEffect(() => {
    fetchAllOrders();
  }, [fetchAllOrders]);

  // Lắng nghe SignalR để tự động cập nhật UI khi có thông báo mới
  useEffect(() => {
    let unmounted = false;
    let removeListener: (() => void) | null = null;

    const initSignalR = async () => {
      try {
        const hubUrl = "https://amms-juaa.onrender.com/hubs/realtime"; 
        const conn = await getHubConnection(hubUrl);
        
        const handleServerEvent = () => {
          if (!unmounted) {
            fetchAllOrders();
          }
        };

        // Lắng nghe event "pending"
        conn.on("pending", handleServerEvent);
        // Bạn có thể thêm các method khác ở đây
        // conn.on("accepted", handleServerEvent);

        removeListener = () => {
          conn.off("pending", handleServerEvent);
        };
      } catch (err) {
        console.error("SignalR init error in requests page:", err);
      }
    };

    initSignalR();

    return () => {
      unmounted = true;
      if (removeListener) removeListener();
    };
  }, [fetchAllOrders]);  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => requestOrderApi.cancelRequest({ id, reason }),
    onSuccess: (data) => {
      message.success(data.data?.message || "Xóa yêu cầu thành công");
      closeCancelModal();
      fetchAllOrders();
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi xóa");
    },
  });

  // Send Deal mutation
  const sendDealMutation = useMutation({
    mutationFn: ({ request_id }: { request_id: number }) => requestOrderApi.sendDeal({ request_id }),
    onSuccess: () => {
      message.success("Đã gửi báo giá thành công");
      fetchAllOrders();
    },
    onError: (error: any) => {
      console.error("Send deal error:", error);
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi gửi báo giá");
    },
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: ({ request_id }: { request_id: number }) => requestOrderApi.cloneRequest({ request_id }),
    onSuccess: (data) => {
      message.success(data.data?.message || "Nhân bản yêu cầu thành công");
      fetchAllOrders();
    },
    onError: (error: any) => {
      console.error("Clone error:", error);
      message.error(error.response?.data?.message || "Có lỗi xảy ra khi nhân bản yêu cầu");
    },
  });

  // Modal logic
  const [cancelModal, setCancelModal] = useState<{ open: boolean; orderId: number | null; reason: string }>({
    open: false,
    orderId: null,
    reason: "",
  });

  const openCancelModal = (orderId: number) => {
    setCancelModal({ open: true, orderId, reason: "" });
  };

  const closeCancelModal = () => {
    setCancelModal((prev) => ({ ...prev, open: false }));
  };

  const handleConfirmCancel = () => {
    if (cancelModal.orderId) {
      if (!cancelModal.reason.trim()) {
        message.error("Vui lòng nhập lý do đóng yêu cầu");
        return;
      }
      cancelMutation.mutate({ id: cancelModal.orderId, reason: cancelModal.reason });
    }
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
        // Tìm theo tên tư vấn viên
        if (order.assigned_consultant_name?.toLowerCase().includes(search)) return true;

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

  const declinedOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter((o) => o.process_status?.toLowerCase() === "declined")
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );

  const processingOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter((o) => o.process_status?.toLowerCase() === "processing")
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );

  const verifiedOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter((o) => o.process_status?.toLowerCase() === "verified")
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
            (o) => o.process_status?.toLowerCase() === "accepted" && o.is_check_contract !== false
          )
        )
      ),
    [allOrders, sortOrders, filterBySearch]
  );

  const rejectedContractOrders = useMemo(
    () =>
      sortOrders(
        filterBySearch(
          allOrders.filter(
            (o) => o.process_status?.toLowerCase() === "accepted" && o.is_check_contract === false
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
                Tiếp nhận
              </Button>
            </Link>

            <Button
              size="small"
              style={{
                color: "red",
                border: "1px solid red",
                backgroundColor: "transparent",
              }}
              icon={<DeleteOutlined />}
              onClick={() => openCancelModal(record.order_request_id)}
              disabled={cancelMutation.isPending && cancelModal.orderId === record.order_request_id}
            >
            </Button>

          </Space>

        );
      case "declined":
        return (
          <Space size="small" >
            <Link
              href={`/consultant?orderId=${record.order_request_id}&mode=negotiate`}
            >
              <Button type="primary" size="small" icon={<EditOutlined />} className="bg-orange-500 hover:bg-orange-600">
                Chỉnh sửa lại
              </Button>
            </Link>
          </Space>
        );
      case "processing":
        return (
          <Space size="small">
            <Link
              href={`/consultant/request-detail/${record.order_request_id}`}
            >
              <Button size="small" icon={<EyeOutlined />}>
                Chi Tiết
              </Button>
            </Link>
          </Space>
        );
      case "verified":
        return (
          <Space size="small">
            <Popconfirm
              title={<span className="text-lg font-medium">Xác nhận gửi báo giá</span>}
              description={`Bạn có chắc muốn gửi báo giá cho đơn #${record.order_request_id}?`}
              onConfirm={(e) => {
                e?.stopPropagation();
                sendDealMutation.mutate({ request_id: record.order_request_id });
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Gửi"
              cancelText="Hủy"
            >
              {/* <Button
                type="primary"
                size="small"
                icon={<MailOutlined />}
                className="bg-green-600 hover:bg-green-700"
                onClick={(e) => e.stopPropagation()}
                loading={sendDealMutation.isPending && sendDealMutation.variables?.request_id === record.order_request_id}
              >
                Gửi báo giá
              </Button> */}
            </Popconfirm>
            <Link
              href={`/consultant/request-detail/${record.order_request_id}`}
            >
              <Button size="small" icon={<EyeOutlined />}>
                Chi Tiết
              </Button>
            </Link>
          </Space>
        );
      case "waiting":
        return (
          <Space size="small">

            <Link
              href={`/consultant/request-detail/${record.order_request_id}`}
            >
              <Button size="small" icon={<EyeOutlined />}>
                Chi Tiết
              </Button>
            </Link>

            <Button
              size="small"
              style={{
                color: "red",
                border: "1px solid red",
                backgroundColor: "transparent",
              }}
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                openCancelModal(record.order_request_id);
              }}
              disabled={cancelMutation.isPending && cancelModal.orderId === record.order_request_id}
            >

            </Button>
            <Popconfirm
              title={<span className="text-lg font-medium">Xác nhận nhân bản</span>}
              description={`Bạn có chắc muốn nhân bản yêu cầu #${record.order_request_id}?`}
              onConfirm={(e) => {
                e?.stopPropagation();
                cloneMutation.mutate({ request_id: record.order_request_id });
              }}
              onCancel={(e) => e?.stopPropagation()}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button
                size="small"
                style={{
                  color: "blue",
                  border: "1px solid blue",
                  backgroundColor: "transparent",
                }}
                icon={<CopyOutlined />}
                onClick={(e) => e.stopPropagation()}
                loading={cloneMutation.isPending && cloneMutation.variables?.request_id === record.order_request_id}
              >
              </Button>
            </Popconfirm>
          </Space>
        );
      case "pending_order_creation":
      case "accepted":
        return (
          <Space size="small">
            <Link
              href={`/consultant/request-detail/${record.order_request_id}`}
            >
              <Button size="small" icon={<EyeOutlined />}>
                Chi Tiết
              </Button>
            </Link>
          </Space>
        );
      default:
        return (
          <Link href={`/consultant/request-detail/${record.order_request_id}`}>
            <Button size="small" icon={<EyeOutlined />}>
              Chi Tiết
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
      title: <SortableHeader field="assigned_consultant_name" title="Tư vấn viên" />,
      dataIndex: "assigned_consultant_name",
      key: "assigned_consultant_name",
      render: (name: string) => (
        <span className="text-gray-600">{name || <span className="text-gray-400 italic">Chưa phân công</span>}</span>
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
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn hàng mới" /> }}
          bordered
          size="middle"
        />
      ),
    },
    {
      key: "processing",
      label: (
        <span>
          Chờ duyệt
          {processingOrders.length > 0 && (
            <Tag color="cyan" className="ml-2">
              {processingOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
          dataSource={processingOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn đang xử lý" /> }}
          bordered
          size="middle"
          onRow={(record) => ({
            onClick: () => router.push(`/consultant/request-detail/${record.order_request_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
        />
      ),
    },
    {
      key: "verified",
      label: (
        <span>
          Đã được duyệt
          {verifiedOrders.length > 0 && (
            <Tag color="purple" className="ml-2">
              {verifiedOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
          dataSource={verifiedOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn đã xác minh" /> }}
          bordered
          size="middle"
          onRow={(record) => ({
            onClick: () => router.push(`/consultant/request-detail/${record.order_request_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
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
          columns={columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
          dataSource={waitingConfirmOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{
            emptyText: <Empty description="Không có đơn chờ xác nhận" />,
          }}
          onRow={(record) => ({
            onClick: () => router.push(`/consultant/request-detail/${record.order_request_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
          bordered
          size="middle"
        />
      ),
    },
    {
      key: "declined",
      label: (
        <span>
          Yêu cầu chỉnh sửa
          {declinedOrders.length > 0 && (
            <Tag color="orange" className="ml-2">
              {declinedOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
          dataSource={declinedOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn yêu cầu chỉnh sửa" /> }}
          bordered
          size="middle"
          onRow={(record) => ({
            onClick: () => router.push(`/consultant?orderId=${record.order_request_id}&mode=negotiate`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
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
          columns={columns}
          dataSource={acceptedOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có đơn chờ tạo" /> }}
          bordered
          size="middle"
        />
      ),
    },
    {
      key: "rejected_contract",
      label: (
        <span>
          Hợp đồng bị từ chối
          {rejectedContractOrders.length > 0 && (
            <Tag color="red" className="ml-2">
              {rejectedContractOrders.length}
            </Tag>
          )}
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={rejectedContractOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
            showTotal: (total) => `Tổng ${total} đơn`,
          }}
          locale={{ emptyText: <Empty description="Không có hợp đồng bị từ chối" /> }}
          bordered
          size="middle"
          onRow={(record) => ({
            onClick: () => router.push(`/consultant/request-detail/${record.order_request_id}`),
            className: 'cursor-pointer hover:bg-slate-50 transition-colors',
          })}
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
          columns={columns.filter((col) => col.key !== "deposit_amount" && col.key !== "final_cost")}
          dataSource={rejectedOrders}
          rowKey="order_request_id"
          pagination={{
            pageSize: 5,
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
            Quản Lý yêu cầu
          </Title>
          <p className="text-gray-500">
            Xử lý yêu cầu từ khách hàng - Báo giá & Tạo đơn
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
      {/* {sortField && (
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
      )} */}

      {/* Cancel Modal */}
      <Modal
        title={
          <Space>
            <DeleteOutlined className="text-red-500" />
            <span>Đóng yêu cầu #{cancelModal.orderId}</span>
          </Space>
        }
        open={cancelModal.open}
        onCancel={closeCancelModal}
        footer={[
          <Button key="back" onClick={closeCancelModal} disabled={cancelMutation.isPending}>
            Hủy
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={cancelMutation.isPending}
            onClick={handleConfirmCancel}
          >
            Đóng yêu cầu
          </Button>,
        ]}
      >
        <div className="py-4">
          <p className="mb-2 font-medium">Lý do đóng yêu cầu <span className="text-red-500">*</span>:</p>
          <Input.TextArea
            rows={4}
            value={cancelModal.reason}
            onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
            placeholder="Nhập lý do đóng yêu cầu..."
            status={!cancelModal.reason && cancelMutation.isError ? "error" : ""}
          />
        </div>
      </Modal>
    </div>
  );
}
