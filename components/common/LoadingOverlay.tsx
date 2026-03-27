"use client";

import React from "react";
import { Spin } from "antd";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingOverlayProps {
  isLoading: boolean;
  tip?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  tip = "Đang xử lý...",
}) => {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]"
        >
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/20">
            <Spin size="large" />
            <span className="text-gray-700 font-medium text-lg tracking-wide">
              {tip}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
