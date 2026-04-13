"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, Input, Button, Tag, Tooltip } from "antd";
import { SearchOutlined, ReloadOutlined, ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { machineApi, MachineLaneStatus } from "@/apiRequests/machine";
import { Machine } from "@/lib/estimation.types";
import dayjs from "dayjs";
import "dayjs/locale/vi";

dayjs.locale("vi");

function formatDatetime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = dayjs(iso);
  if (!d.isValid()) return "—";
  return d.format("HH:mm DD/MM/YYYY");
}

export default function MachinesManagementPage() {
  const [searchText, setSearchText] = useState("");

  const { data: machines, isLoading: loadingMachines, refetch: refetchMachines } = useQuery({
    queryKey: ["machines-all"],
    queryFn: async () => {
      try {
        const res: any = await machineApi.getAllMachine();
        const data = res?.data ?? res ?? [];
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Failed to fetch machines:", error);
        return [];
      }
    },
  });

  const { data: snapshot, isLoading: loadingSnapshot, refetch: refetchSnapshot } = useQuery({
    queryKey: ["machines-availability-snapshot"],
    queryFn: async () => {
      try {
        const res: any = await machineApi.getAvailabilitySnapshot();
        return res?.data ?? res ?? null;
      } catch (error) {
        console.error("Failed to fetch availability snapshot:", error);
        return null;
      }
    },
  });

  // Build a lookup map from process_code -> MachineLaneStatus
  const availabilityMap = React.useMemo(() => {
    const map: Record<string, MachineLaneStatus> = {};
    if (snapshot?.machines && Array.isArray(snapshot.machines)) {
      for (const lane of snapshot.machines as MachineLaneStatus[]) {
        if (lane.process_code) {
          map[lane.process_code] = lane;
        }
      }
    }
    return map;
  }, [snapshot]);

  const isLoading = loadingMachines || loadingSnapshot;

  const handleRefetch = () => {
    refetchMachines();
    refetchSnapshot();
  };

  // Filter based on search
  const filteredMachines = (machines || []).filter((m: Machine) => {
    return (
      m.process_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      m.process_code?.toLowerCase().includes(searchText.toLowerCase())
    );
  });

  const columns = [
    {
      title: "Mã máy",
      dataIndex: "process_code",
      key: "process_code",
      width: 120,
      render: (text: string) => <Tag color="geekblue" className="font-medium px-2 py-1">{text || "N/A"}</Tag>,
    },
    {
      title: "Tên máy",
      dataIndex: "process_name",
      key: "process_name",
      render: (text: string) => <span className="font-semibold text-gray-800">{text}</span>,
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 110,
      align: "center" as const,
      sorter: (a: Machine, b: Machine) => (a.quantity || 0) - (b.quantity || 0),
      render: (val: number) => <span className="font-medium">{val ?? 1}</span>,
    },
    {
      title: "Công suất / Ngày",
      dataIndex: "daily_capacity",
      key: "daily_capacity",
      width: 160,
      align: "right" as const,
      render: (val: number) => (
        <span className="font-medium text-blue-700">
          {val ? val.toLocaleString("vi-VN") : "0"}
        </span>
      ),
      sorter: (a: Machine, b: Machine) => (a.daily_capacity || 0) - (b.daily_capacity || 0),
    },
    {
      title: (
        <Tooltip title="Thời điểm sớm nhất có ít nhất 1 máy rảnh">
          <span><ClockCircleOutlined className="mr-1 text-orange-500" />Rảnh sớm nhất</span>
        </Tooltip>
      ),
      key: "earliest_free",
      width: 200,
      render: (_: any, record: Machine) => {
        const lane = availabilityMap[record.process_code || ""];
        if (!lane) return <span className="text-gray-400">—</span>;
        const dt = formatDatetime(lane.earliest_any_lane_free_at);
        const freeNow = lane.free_now > 0;
        return (
          <span className={freeNow ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
            {freeNow ? `Đang rảnh (${lane.free_now}/${lane.quantity})` : dt}
          </span>
        );
      },
    },
    {
      title: (
        <Tooltip title="Thời điểm tất cả các máy cùng loại đều rảnh">
          <span><CheckCircleOutlined className="mr-1 text-green-500" />Tất cả máy rảnh</span>
        </Tooltip>
      ),
      key: "all_free",
      width: 200,
      render: (_: any, record: Machine) => {
        const lane = availabilityMap[record.process_code || ""];
        if (!lane) return <span className="text-gray-400">—</span>;
        const allFree = lane.free_now === lane.quantity;
        const dt = formatDatetime(lane.all_lanes_free_at);
        return (
          <span className={allFree ? "text-green-600 font-medium" : "text-gray-700"}>
            {allFree ? "Tất cả đang rảnh" : dt}
          </span>
        );
      },
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 min-h-[80vh]">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý máy móc thiết bị</h1>
        <div className="flex items-center gap-3">
          {snapshot?.generated_at && (
            <span className="text-xs text-gray-400">
              Cập nhật: {formatDatetime(snapshot.generated_at)}
            </span>
          )}
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={handleRefetch}
            loading={isLoading}
            className="bg-blue-600 shadow-sm"
          >
            Làm mới
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Input
            placeholder="Tìm theo mã hoặc tên máy..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="sm:max-w-md w-full shadow-sm hover:border-blue-400 focus:border-blue-500"
            size="large"
            allowClear
          />
          <div className="text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            Tổng số: <span className="font-bold text-blue-700 text-base">{filteredMachines.length}</span> máy / dây chuyền
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredMachines}
          rowKey={(record) => record.machine_id || record.process_code}
          loading={isLoading}
          pagination={{ pageSize: 12, showSizeChanger: true, pageSizeOptions: ["12", "24", "50"] }}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          className="shadow-sm rounded-lg overflow-hidden border border-gray-200"
          rowClassName="hover:bg-blue-50/50 transition-colors cursor-pointer"
        />
      </div>
    </div>
  );
}
