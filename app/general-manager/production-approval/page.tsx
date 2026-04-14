"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Input, Button, Tag, Modal, Spin, message } from "antd";
import { SearchOutlined, ReloadOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { orderApi } from "@/apiRequests/order";
import { productionsApi } from "@/apiRequests/productions";

export default function ProductionApprovalPage() {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Lấy danh sách đơn hàng
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

  // Lấy thông tin kiểm tra điều kiện SX
  const { data: statusData, isLoading: isChecking, refetch: refetchStatus } = useQuery({
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

  // Mutation duyệt đơn
  const approveMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await productionsApi.updateProduction(orderId, { is_production_ready: true });
    },
    onSuccess: () => {
      message.success("Đã duyệt đơn đưa vào sản xuất thành công!");
      setIsModalVisible(false);
      refetch(); // Cập nhật lại danh sách
    },
    onError: () => {
      message.error("Có lỗi xảy ra khi duyệt đơn.");
    }
  });

  // Lọc hiển thị đơn hàng (chỉ hiện những order có status LayoutPending hoặc Scheduled VÀ đã sẵn sàng sản xuất)
  const filteredOrders = (apiData || []).filter((order: any) => {
    const statusMatch = (order.status === "LayoutPending" || order.status === "Scheduled") && order.is_production_ready === true;
    
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
    {
      title: "Khách hàng",
      dataIndex: "customer_name",
      key: "customer_name",
    },
    {
      title: "Sản phẩm",
      dataIndex: "product_name",
      key: "product_name",
    },
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

      {/* Modal Kiểm tra & Duyệt */}
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
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>
            Hủy bỏ
          </Button>,
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
              <div className="text-gray-500">Đang kiểm tra hệ thống máy móc và vật tư...</div>
            </div>
          ) : statusData ? (
            <div className="space-y-4 text-base">
               <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center whitespace-nowrap">
                    <span className="text-gray-600">Nguyên vật liệu:</span>
                    {statusData.has_enough_material ? (
                      <Tag color="success" className="mr-0 text-sm py-1 px-3">Đã đủ NVL</Tag>
                    ) : (
                      <Tag color="error" className="mr-0 text-sm py-1 px-3">Thiếu NVL</Tag>
                    )}
                  </div>
                  <div className="flex justify-between items-center whitespace-nowrap">
                    <span className="text-gray-600">Máy móc thiết bị:</span>
                    {statusData.has_free_machine ? (
                      <Tag color="success" className="mr-0 text-sm py-1 px-3">Có máy sẵn sàng</Tag>
                    ) : (
                      <Tag color="error" className="mr-0 text-sm py-1 px-3">Máy đang bận</Tag>
                    )}
                  </div>
                  <div className="border-t border-gray-200 my-2 pt-3 flex justify-between items-center font-semibold text-lg">
                    <span>Kết luận:</span>
                    {(statusData.has_enough_material && statusData.has_free_machine) ? (
                      <span className="text-green-600">ĐỦ ĐIỀU KIỆN SẢN XUẤT</span>
                    ) : (
                      <span className="text-red-500">CHƯA ĐỦ ĐIỀU KIỆN</span>
                    )}
                  </div>
               </div>
               
               {!(statusData.has_enough_material && statusData.has_free_machine) && (
                 <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                    Lưu ý: Không thể duyệt sản xuất khi chưa đáp ứng đủ các điều kiện. Vui lòng bổ sung vật tư hoặc chờ máy rảnh.
                 </div>
               )}
            </div>
          ) : (
            <div className="text-center text-red-500 p-4">
               Không thể lấy thông tin trạng thái sản xuất cho đơn hàng này.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
