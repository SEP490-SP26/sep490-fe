"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { tasksApi, ISubTask } from "@/apiRequests/tasks";
import { Table, Tag, Input, Select, Button } from "antd";
import Title from "antd/es/typography/Title";
import { BsCheckCircleFill, BsPlayCircleFill, BsExclamationCircleFill } from "react-icons/bs";
import dayjs from "dayjs";
import { BiSearch } from "react-icons/bi";

const { Option } = Select;

export default function TasksOverviewPage() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [machineFilter, setMachineFilter] = useState("");

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ["all-tasks"],
    queryFn: () => tasksApi.getAllTask(),
  });

  const tasks: ISubTask[] = useMemo(() => {
    // Handling both cases where the response is directly the array or wrapped in a data object
    const data = tasksResponse?.data ?? tasksResponse;
    return Array.isArray(data) ? data : [];
  }, [tasksResponse]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        task.prod_id?.toString().includes(searchText) ||
        task.task_id?.toString().includes(searchText);

      const matchStatus = statusFilter === "ALL" || task.status === statusFilter;
      const matchMachine = machineFilter === "" || task.machine?.toLowerCase().includes(machineFilter.toLowerCase());

      return matchSearch && matchStatus && matchMachine;
    });
  }, [tasks, searchText, statusFilter, machineFilter]);

  const columns = [
    {
      title: "Mã Task",
      dataIndex: "task_id",
      key: "task_id",
      sorter: (a: ISubTask, b: ISubTask) => a.task_id - b.task_id,
      render: (text: number) => <span className="font-semibold text-blue-600">#{text}</span>,
    },
    {
      title: "Tên công đoạn",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>,
    },
    {
      title: "Lệnh SX",
      dataIndex: "prod_id",
      key: "prod_id",
      render: (text: number) => <span className="text-gray-600">LSX-{text}</span>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        if (status === "Finished") return <Tag color="success" icon={<BsCheckCircleFill className="mr-1 inline" />}>Đã hoàn thành</Tag>;
        if (status === "InProcessing") return <Tag color="processing" icon={<BsPlayCircleFill className="mr-1 inline" />}>Đang chạy</Tag>;
        if (status === "Unassigned") return <Tag color="default">Chưa phân công</Tag>;
        if (status === "Ready") return <Tag color="warning" icon={<BsExclamationCircleFill className="mr-1 inline" />}>Sẵn sàng</Tag>;
        return <Tag color="blue">{status || "N/A"}</Tag>;
      },
    },
    {
      title: "Máy",
      dataIndex: "machine",
      key: "machine",
      render: (machine: string) => machine ? <span className="font-medium text-indigo-600">{machine}</span> : <span className="text-gray-400">-</span>,
    },
    {
      title: "Bắt đầu dự kiến",
      dataIndex: "planned_start_time",
      key: "planned_start_time",
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
    {
      title: "Kết thúc dự kiến",
      dataIndex: "planned_end_time",
      key: "planned_end_time",
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
    {
      title: "Bắt đầu thực tế",
      dataIndex: "start_time",
      key: "start_time",
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
    {
      title: "Kết thúc thực tế",
      dataIndex: "end_time",
      key: "end_time",
      render: (date: string) => (date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "-"),
    },
  ];

  return (
    <div className="bg-transparent min-h-screen">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
        <div className="flex flex-col">
          <Title level={3} className="!m-0 text-gray-800">Tổng quan các Task</Title>
          <p className="text-gray-500 text-sm mt-1">Theo dõi tiến độ, trạng thái của các task trong quá trình sản xuất.</p>
        </div>
        
        <div className="flex flex-wrap gap-4 items-end mt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tìm kiếm</label>
            <Input 
              placeholder="Tên task, mã task, mã LSX..." 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              prefix={<BiSearch className="text-gray-400" />}
              className="w-64 py-1.5 rounded-lg border-gray-300"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</label>
            <Select 
              value={statusFilter} 
              onChange={setStatusFilter}
              className="w-40 h-9"
            >
              <Option value="ALL">Tất cả</Option>
              <Option value="Unassigned">Chưa phân công</Option>
              <Option value="Ready">Sẵn sàng</Option>
              <Option value="InProcessing">Đang chạy</Option>
              <Option value="Finished">Đã hoàn thành</Option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Máy móc</label>
            <Input 
              placeholder="Tên máy..." 
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="w-40 py-1.5 rounded-lg border-gray-300"
            />
          </div>
          <Button 
            onClick={() => {
              setSearchText("");
              setStatusFilter("ALL");
              setMachineFilter("");
            }}
            className="h-9 px-5 rounded-lg border border-gray-300 text-gray-600 font-medium hover:bg-gray-50"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <Table 
          columns={columns} 
          dataSource={filteredTasks} 
          rowKey="task_id"
          loading={isLoading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} task`
          }}
          className="overflow-x-auto custom-table"
        />
      </div>
    </div>
  );
}
