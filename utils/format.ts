import { RangePickerProps } from "antd/es/date-picker";
import dayjs from "dayjs";

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const disabledDate: RangePickerProps["disabledDate"] = (current) => {
  // Can not select days before today and today
  return current && current < dayjs().endOf("day");
};

export const createDisabledDate = (etaDate?: string | Date): RangePickerProps["disabledDate"] => {
  return (current) => {
    if (!current) return false;
    
    const today = dayjs();
    const minDate = today.endOf("day");
    
    // Nếu có eta_date, không cho chọn trước eta_date
    if (etaDate) {
      const etaDay = dayjs(etaDate);
      return current < minDate || current < etaDay.startOf("day");
    }
    
    // Mặc định: không cho chọn trước hôm nay
    return current < minDate;
  };
};

