import { Loading3QuartersOutlined } from "@ant-design/icons";
import React from "react";

export default function Loading() {
  return (
    <div>
      {/* <LoadingOutlined /> */}
      <div className="flex space-x-2 justify-center items-center bg-white h-screen dark:invert">
        <span className="sr-only">Loading...</span>

        <Loading3QuartersOutlined/>
      </div>
    </div>
  );
}
