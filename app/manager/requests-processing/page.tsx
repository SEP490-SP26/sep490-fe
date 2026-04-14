"use client";

import { requestOrderApi } from "@/apiRequests/request";

import { OrderRequest } from "@/schemaValidations/common.schema";
import {
    CaretDownOutlined,
    CaretUpOutlined,
    EyeOutlined,
    LoadingOutlined,
    ReloadOutlined,
    SearchOutlined
} from "@ant-design/icons";
import {
    Button,
    Card,
    Empty,
    Input,
    message,
    Space,
    Spin,
    Table,
    Tag,
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
    | "assigned_consultant_name"
    | null;
type SortOrder = "asc" | "desc";

export default function ManagerRequestsProcessingPage() {
    const [searchText, setSearchText] = useState("");
    const [allOrders, setAllOrders] = useState<OrderRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Sorting state - Default by Order ID descending (newest first)
    const [sortField, setSortField] = useState<SortField>("order_request_id");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // Fetch ALL orders
    const fetchAllOrders = async () => {
        setLoading(true);
        try {
            // Get all orders with large pageSize
            const response = await requestOrderApi.getList(1, 1000);
            if (response?.data && Array.isArray(response.data)) {
                setAllOrders(response.data);
            }
        } catch (error) {
            console.error("Error fetching orders:", error);
            message.error("Không thể tải danh sách yêu cầu");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllOrders();
    }, []);


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
            setSortField(field);
            setSortOrder("asc");
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

    // Filter by search text
    const filterBySearch = useMemo(
        () => (orderList: OrderRequest[]) => {
            const search = searchText.toLowerCase().trim();
            if (!search) return orderList;

            return orderList.filter((order) => {
                // Find by customer name
                if (order.customer_name?.toLowerCase().includes(search)) return true;
                // Find by product name
                if (order.product_name?.toLowerCase().includes(search)) return true;
                // Find by order ID
                if (order.order_request_id?.toString().includes(search)) return true;
                // Find by phone
                if (order.customer_phone?.includes(search)) return true;
                // Find by email
                if (order.customer_email?.toLowerCase().includes(search)) return true;
                // Find by date
                if (order.delivery_date) {
                    const formattedDate = dayjs(order.delivery_date).format("DD/MM/YYYY");
                    if (formattedDate.includes(search)) return true;
                }
                // Find by consultant name
                if (order.assigned_consultant_name?.toLowerCase().includes(search)) return true;
                return false;
            });
        },
        [searchText]
    );

    // Filter "Processing" requests
    const processingRequests = useMemo(
        () =>
            sortOrders(
                filterBySearch(
                    allOrders.filter((o) => {
                        const status = o.process_status?.toLowerCase();
                        // Check for "Processing" or related statuses 
                        // Note: Exact string "Processing" might differ based on backend
                        return status === "processing" || status === "inproduction" || status === "in_production";
                    })
                )
            ),
        [allOrders, sortOrders, filterBySearch]
    );

    // Columns definition
    const columns = [
        {
            title: <SortableHeader field="order_request_id" title="Mã Yêu Cầu" />,
            dataIndex: "order_request_id",
            key: "order_request_id",
            width: 120,
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
            title: <SortableHeader field="product_name" title="Sản Phẩm" />,
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
        // {
        //     title: "Trạng Thái",
        //     dataIndex: "process_status",
        //     key: "process_status",
        //     render: (status: string) => (
        //         <Tag color="processing">{status}</Tag>
        //     )
        // },
        {
            key: "action",
            align: "center" as const,
            render: (_: any, record: OrderRequest) => (
                <Link href={`/manager/request-detail/${record.order_request_id}`}>
                    <Button size="small" icon={<EyeOutlined />}>
                        Chi tiết
                    </Button>
                </Link>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        Yêu Cầu Cần Được Duyệt
                    </Title>
                    <p className="text-gray-500">
                        Danh sách các yêu cầu đang chờ được duyệt
                    </p>
                </div>
                <div className="w-1/3">
                    <Input
                        placeholder="Tìm theo tên, mã, email..."
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
                    <Table
                        columns={columns}
                        dataSource={processingRequests}
                        rowKey="order_request_id"
                        pagination={{
                            pageSize: 10,
                            showTotal: (total) => `Tổng ${total} yêu cầu`,
                            showSizeChanger: true,
                            pageSizeOptions: ['10', '20', '50']
                        }}
                        locale={{ emptyText: <Empty description="Không có yêu cầu nào đang xử lý" /> }}
                        bordered
                        size="middle"
                    />
                </Spin>
            </Card>

            {/* Sort info */}
            {sortField && (
                <div className="mt-3 text-sm text-gray-500">
                    Đang sắp xếp theo:{" "}
                    <b>
                        {sortField === "order_request_id"
                            ? "Mã yêu cầu"
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
                </div>
            )}
        </div>
    );
}