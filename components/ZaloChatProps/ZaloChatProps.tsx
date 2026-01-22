"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import zaloIcon from "@/public/zalo-icon.png";

/* =====================
   CONFIG – chỉnh tại đây
   ===================== */
const ZALO_PHONE_NUMBER = "0373713955";
const BG_COLOR = "#0068ff"; // màu Zalo chuẩn

export default function ZaloChat() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const openZalo = () => {
    window.open(`https://zalo.me/${ZALO_PHONE_NUMBER}`, "_blank");
  };

  return (
    <button
      onClick={openZalo}
      aria-label="Chat Zalo"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",

        width: "56px",
        height: "56px",
        borderRadius: "50%",

        backgroundColor: BG_COLOR,
        border: "none",
        cursor: "pointer",
        zIndex: 1000,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        boxShadow: "0 6px 12px rgba(0,0,0,0.25)",

        transform: visible ? "scale(1)" : "scale(0)",
        opacity: visible ? 1 : 0,
        transition: "all 0.3s ease",
      }}
    >
      <Image
        src={zaloIcon}
        alt="Zalo"
        width={28}
        height={28}
        priority
      />
    </button>
  );
}
