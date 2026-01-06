import { Loading3QuartersOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import React from "react";

export default function Loading() {
  return (
    <div>
      {/* <LoadingOutlined /> */}
      <div className="flex space-x-2 justify-center items-center bg-white h-screen">
        <span className="sr-only">Loading...</span>
        <Spin />
      </div>
    </div>
  );
}
