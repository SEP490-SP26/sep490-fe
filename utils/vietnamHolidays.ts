import dayjs from "dayjs";

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  type: "solar" | "lunar";
}

// Tính Tết Âm lịch (simplified)
const getTetDates = (year: number): string[] => {
  // Đây là giá trị approximate, cần tính chính xác theo âm lịch
  const tetDates: Record<number, string[]> = {
    2024: ["2024-02-10", "2024-02-11", "2024-02-12"],
    2025: ["2025-01-29", "2025-01-30", "2025-01-31"],
    2026: ["2026-02-17", "2026-02-18", "2026-02-19"],
  };

  return tetDates[year] || [];
};

// Giỗ tổ Hùng Vương (10/3 âm lịch)
const getHungKingsDate = (year: number): string => {
  const hungKingsDates: Record<number, string> = {
    2024: "2024-04-18",
    2025: "2025-04-07",
    2026: "2026-04-26",
  };

  return hungKingsDates[year] || "";
};

// Lấy tất cả ngày lễ Việt Nam trong năm
export const getVietnamHolidays = (year: number): Holiday[] => {
  const holidays: Holiday[] = [
    // Dương lịch cố định
    { date: `${year}-01-01`, name: "Tết Dương lịch", type: "solar" },
    { date: `${year}-04-30`, name: "Ngày Giải phóng miền Nam", type: "solar" },
    { date: `${year}-05-01`, name: "Quốc tế Lao động", type: "solar" },
    { date: `${year}-09-02`, name: "Quốc khánh", type: "solar" },

    // Ngày lễ khác
    { date: `${year}-06-01`, name: "Quốc tế Thiếu nhi", type: "solar" },
    { date: `${year}-06-21`, name: "Ngày Báo chí Cách mạng", type: "solar" },
    { date: `${year}-07-27`, name: "Ngày Thương binh Liệt sĩ", type: "solar" },
    { date: `${year}-10-10`, name: "Ngày Giải phóng Thủ đô", type: "solar" },
    { date: `${year}-10-20`, name: "Ngày Phụ nữ Việt Nam", type: "solar" },
    { date: `${year}-11-20`, name: "Ngày Nhà giáo Việt Nam", type: "solar" },
    { date: `${year}-12-22`, name: "Ngày thành lập Quân đội", type: "solar" },
    { date: `${year}-12-25`, name: "Giáng sinh", type: "solar" },
  ];

  // Thêm Tết Âm lịch
  const tetDates = getTetDates(year);
  tetDates.forEach((date, index) => {
    holidays.push({
      date,
      name: index === 0 ? "Mùng 1 Tết" : `Mùng ${index + 1} Tết`,
      type: "lunar",
    });
  });

  // Thêm Giỗ tổ Hùng Vương
  const hungKingsDate = getHungKingsDate(year);
  if (hungKingsDate) {
    holidays.push({
      date: hungKingsDate,
      name: "Giỗ tổ Hùng Vương",
      type: "lunar",
    });
  }

  return holidays;
};

// Kiểm tra ngày có phải lễ không
export const isVietnamHoliday = (date: Date | dayjs.Dayjs): boolean => {
  const dateStr = dayjs(date).format("YYYY-MM-DD");
  const year = dayjs(date).year();
  const holidays = getVietnamHolidays(year);

  return holidays.some((holiday) => holiday.date === dateStr);
};

// Hook sử dụng
export const useVietnamHolidays = () => {
  const currentYear = dayjs().year();

  const getHolidaysForDatePicker = () => {
    const holidays = getVietnamHolidays(currentYear);

    // Tạo hàm disabledDate cho Ant Design DatePicker
    const disabledDate = (current: dayjs.Dayjs) => {
      if (!current) return false;

      const dateStr = current.format("YYYY-MM-DD");
      return holidays.some((holiday) => holiday.date === dateStr);
    };

    return { holidays, disabledDate };
  };

  return { getHolidaysForDatePicker };
};

// Hàm disabledDate để disable ngày lễ
export const disabledDate = (current: dayjs.Dayjs) => {
  if (!current) return false;

  // Ngày trong quá khứ
  if (current.isBefore(dayjs(), "day")) {
    return true;
  }

  // Quá 30 ngày
  // if (current.isAfter(dayjs().add(60, "day"), "day")) {
  //   return true;
  // }

  // Ngày lễ
  return isVietnamHoliday(current);
};
