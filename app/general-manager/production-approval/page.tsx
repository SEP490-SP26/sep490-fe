"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Input, Button, Tag, Modal, Spin, message } from "antd";
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";
import { useSearchParams } from "next/navigation";

function ProductionApprovalContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [searchText, setSearchText] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { data: apiData, isLoading, refetch } = useQuery({
    queryKey: ["orders", "approval-list"],
    queryFn: async () => {
      try {
        const response = await orderApi.getList(1, 100);
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error("Error fetching orders:", error);
        return [];
      }
    },
  });

  const { data: statusData, isLoading: isChecking } = useQuery({
    queryKey: ["production-status", selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      try {
        const res = await productionsApi.startReady(selectedOrderId);
        return res?.data ?? res;
      } catch (error) {
        console.error("Lỗi khi kiểm tra điều kiện:", error);
        return null;
      }
    },
    enabled: !!selectedOrderId && isModalVisible,
  });

  const approveMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await productionsApi.updateProduction(orderId, { is_production_ready: true });
    },
    onSuccess: () => {
      message.success("Đã duyệt đơn đưa vào sản xuất thành công!");
      setIsModalVisible(false);
      refetch();
    },
    onError: () => {
      message.error("Có lỗi xảy ra khi duyệt đơn.");
    }
  });

  // Lọc hiển thị đơn hàng (chỉ hiện những order có status LayoutPending hoặc Scheduled VÀ đã sẵn sàng sản xuất)
  const filteredOrders = (apiData || []).filter((order: any) => {
    const statusMatch = (order.status === "LayoutPending" || order.status === "Scheduled") && order.is_production_ready === false;
    
    const searchMatch =
      order.customer_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.code?.toLowerCase().includes(searchText.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchText.toLowerCase());
    
    return statusMatch && searchMatch;
  });


  const handleCheckConditions = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case "Scheduled": return <Tag color="orange">Đã lên lịch</Tag>;
      case "LayoutPending": return <Tag color="orange">Đang chờ duyệt layout</Tag>;
      case "InProcessing": return <Tag color="blue">Đang sản xuất</Tag>;
      case "Finished": return <Tag color="green">Hoàn thành</Tag>;
      case "Delivered": return <Tag color="cyan">Đã giao</Tag>;
      case "Cancelled": return <Tag color="red">Đã hủy</Tag>;
      default: return <Tag>{status || "Mới"}</Tag>;
    }
  };

  const columns = [
    {
      title: "STT",
      key: "stt",
      width: 60,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: "Mã đơn",
      dataIndex: "code",
      key: "code",
      width: 120,
      render: (text: string) => <span className="font-semibold text-blue-600">{text}</span>,
    },
    { title: "Khách hàng", dataIndex: "customer_name", key: "customer_name" },
    { title: "Sản phẩm", dataIndex: "product_name", key: "product_name" },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      align: 'right' as const,
      render: (val: number) => <span className="font-medium">{val?.toLocaleString("vi-VN")}</span>
    },
    {
      title: "Trạng thái hiện tại",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "Ngày giao dự kiến",
      dataIndex: "delivery_date",
      key: "delivery_date",
      render: (date: string) => date ? new Date(date).toLocaleDateString("vi-VN") : "N/A",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 180,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button
          type="primary"
          ghost
          onClick={() => handleCheckConditions(record.order_id || record._id)}
          disabled={record.status === 'Finished' || record.status === 'Delivered'}
        >
          Trình duyệt SX
        </Button>
      ),
    },
  ];

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    if (orderId) {
      setSelectedOrderId(Number(orderId));
      setIsModalVisible(true);
    }
  }, [searchParams]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Duyệt lệnh sản xuất</h1>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          className="bg-blue-600 shadow-sm"
        >
          Làm mới
        </Button>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Input
            placeholder="Tìm theo mã đơn, khách hàng hoặc tên sản phẩm..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="sm:max-w-md w-full shadow-sm"
            size="large"
            allowClear
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            Tổng số: <span className="font-bold text-blue-700">{filteredOrders.length}</span> đơn hàng
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredOrders}
          rowKey={(record) => record.order_id || record._id || record.code}
          loading={isLoading}
          pagination={{ pageSize: 12, showSizeChanger: true }}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
        />
      </div>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-blue-600" />
            <span>Kiểm tra điều kiện sản xuất</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedOrderId(null);
        }}
        width={1000}
        style={{ top: 20 }}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>Hủy bỏ</Button>,
          <Button
            key="submit"
            type="primary"
            loading={approveMutation.isPending}
            onClick={() => selectedOrderId && approveMutation.mutate(selectedOrderId)}
            disabled={!(statusData?.has_enough_material && statusData?.has_free_machine)}
            className={(statusData?.has_enough_material && statusData?.has_free_machine) ? "bg-green-600 hover:bg-green-700" : ""}
          >
            Xác nhận đưa vào sản xuất
          </Button>,
        ]}
      >
        <div className="py-4">
          {isChecking ? (
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
              <Spin size="large" />
              <div className="text-gray-500">Đang kiểm tra dữ liệu hệ thống kho và máy móc...</div>
            </div>
          ) : statusData ? (
            <div className="space-y-6 text-base">
               {/* 1. Tổng quan */}
               <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center justify-between p-3 bg-white rounded shadow-sm border border-gray-100">
                      <span className="text-gray-600 font-medium">Trạng thái Nguyên vật liệu:</span>
                      {statusData.has_enough_material ? (
                        <Tag color="success" className="mr-0 text-base py-1 px-3 rounded-full">Đã Đủ Vật Tư</Tag>
                      ) : (
                        <Tag color="error" className="mr-0 text-base py-1 px-3 rounded-full">Thiếu Vật Tư</Tag>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded shadow-sm border border-gray-100">
                      <span className="text-gray-600 font-medium">Tính khả dụng Máy móc:</span>
                      {statusData.has_free_machine ? (
                        <Tag color="success" className="mr-0 text-base py-1 px-3 rounded-full">Sẵn Sàng Sản Xuất</Tag>
                      ) : (
                        <Tag color="error" className="mr-0 text-base py-1 px-3 rounded-full">Máy Chưa Sẵn Sàng</Tag>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 pt-3 flex justify-between items-center font-bold text-lg">
                    <span className="text-gray-700">Kết luận kiểm tra:</span>
                    {(statusData.has_enough_material && statusData.has_free_machine) ? (
                      <span className="text-green-600">ĐỦ ĐIỀU KIỆN ĐƯA VÀO SẢN XUẤT</span>
                    ) : (
                      <span className="text-red-500">CHƯA ĐỦ TÀI NGUYÊN ĐỂ SẢN XUẤT</span>
                    )}
                  </div>
               </div>

               {/* 2. Chi tiết vật tư */}
               <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-blue-500 pl-2">Bảng Phân bổ Nguyên Vật Liệu</h3>
                  <Table
                    dataSource={statusData.materials || []}
                    rowKey="material_code"
                    pagination={false}
                    size="small"
                    bordered
                    columns={[
                      { title: 'Mã VT', dataIndex: 'material_code', key: 'material_code', width: 100 },
                      { title: 'Tên vật tư', dataIndex: 'material_name', key: 'material_name' },
                      { title: 'ĐV', dataIndex: 'unit', key: 'unit', width: 60, align: 'center' },
                      { title: 'Yêu cầu', dataIndex: 'required_qty', key: 'required_qty', align: 'right', render: (v: number) => <span className="font-semibold">{v.toLocaleString('vi-VN')}</span> },
                      { title: 'Hiện có', dataIndex: 'available_qty', key: 'available_qty', align: 'right', render: (v: number) => v.toLocaleString('vi-VN') },
                      { 
                        title: 'Còn thiếu', 
                        dataIndex: 'missing_qty', 
                        key: 'missing_qty', 
                        align: 'right', 
                        render: (v: number) => v > 0 ? <span className="text-red-500 font-bold">{v.toLocaleString('vi-VN')}</span> : '-' 
                      },
                      { title: 'Trạng thái lệnh', key: 'status', align: 'center', width: 120, render: (_: any, r: any) => r.is_enough ? <Tag color="success" className="mr-0 font-medium">Đủ cấp</Tag> : <Tag color="error" className="mr-0 font-medium">Chờ nhập kho</Tag> }
                    ]}
                  />
               </div>

               {/* 3. Chi tiết máy móc */}
               <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 border-l-4 border-blue-500 pl-2">Lộ trình Máy Móc thiết bị</h3>
                  <Table
                    dataSource={statusData.machines || []}
                    rowKey={(r) => `${r.process_id}-${r.seq_num}`}
                    pagination={false}
                    size="small"
                    bordered
                    columns={[
                      { title: 'Bước', dataIndex: 'seq_num', key: 'seq_num', width: 60, align: 'center', render: (v: number) => <span className="font-bold text-gray-500">{v}</span> },
                      { title: 'Quy trình', dataIndex: 'process_name', key: 'process_name' },
                      { title: 'Mã máy gắn', dataIndex: 'machine_code', key: 'machine_code', render: (v: string) => v ? <Tag color="blue" className="font-mono text-sm mr-0">{v}</Tag> : <span className="italic text-gray-400">Không tìm thấy</span> },
                      { 
                        title: 'Tải công việc / Năng lực', 
                        key: 'capacity', 
                        align: 'center',
                        render: (_: any, r: any) => r.machine_found ? (
                          <span>
                            <span className={r.free_quantity > 0 ? "text-green-600 font-bold" : "text-red-500 font-bold"}>{r.free_quantity}</span>
                            <span className="text-gray-300 mx-2">/</span>
                            <span className="font-medium">{r.total_quantity}</span>
                          </span>
                        ) : '-'
                      },
                      { 
                        title: 'Đánh giá khả dụng', 
                        key: 'status', 
                        align: 'center',
                        width: 160,
                        render: (_: any, r: any) => {
                          if (!r.machine_found) return <Tag color="error" className="mr-0 w-full text-center">Lỗi cấu hình máy</Tag>;
                          if (!r.is_available) return <Tag color="warning" className="mr-0 w-full text-center">Quá tải (Bottleneck)</Tag>;
                          return <Tag color="success" className="mr-0 w-full text-center">Sẵn sàng nhận lệnh</Tag>;
                        }
                      }
                    ]}
                  />
               </div>
               
               {!(statusData.has_enough_material && statusData.has_free_machine) && (
                 <div className="text-sm text-orange-700 bg-orange-50 p-4 rounded-xl border border-orange-200 mt-2 flex items-start gap-3">
                    <CheckCircleOutlined className="mt-0.5 text-lg" />
                    <div>
                      <strong>Cảnh báo:</strong> Lệnh sản xuất này hiện tại chưa đủ điều kiện triển khai tối ưu. 
                      Hệ thống sẽ bị đình trệ nếu duyệt ngay. Đề nghị bổ sung thêm vật tư vào kho hoặc đợi dây chuyền máy hoàn tất lịch trình cũ trước khi đưa vào sản xuất.
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <div className="text-center text-red-500 p-8 font-bold border border-red-200 bg-red-50 rounded-xl">
               Đã xảy ra lỗi, Không thể lấy thông tin trạng thái sản xuất. Xin vui lòng thử lại sau.
            </div>

          )}
        </div>
      </Modal>
    </div>
  );
}

export default function ProductionApprovalPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[80vh]">
        <Spin size="large" />
      </div>
    }>
      <ProductionApprovalContent />
    </Suspense>
  );
}