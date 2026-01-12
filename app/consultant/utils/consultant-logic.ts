import dayjs from "dayjs";
import { Order } from "@/context/ProductionContext";

export const RUSH_FEE_LOW = 500000;
export const RUSH_FEE_HIGH = 2000000;

export const formatNumber = (num: number): string => {
  return num.toLocaleString("vi-VN");
};

export const getDominantColors = (
  imageSrc: string,
  count: number = 5
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context error");

      canvas.width = 100;
      canvas.height = 100 * (img.height / img.width);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      ).data;
      const colorCounts: { [key: string]: number } = {};

      for (let i = 0; i < imageData.length; i += 4 * 5) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const alpha = imageData[i + 3];
        if (
          alpha < 128 ||
          (r > 240 && g > 240 && b > 240) ||
          (r < 15 && g < 15 && b < 15)
        )
          continue;

        const rRound = Math.round(r / 20) * 20;
        const gRound = Math.round(g / 20) * 20;
        const bRound = Math.round(b / 20) * 20;

        const rgb = `rgb(${rRound},${gRound},${bRound})`;
        colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
      }

      const sortedColors = Object.entries(colorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, count)
        .map(([color]) => {
          const [r, g, b] = color.match(/\d+/g)!.map(Number);
          return (
            "#" +
            ((1 << 24) + (r << 16) + (g << 8) + b)
              .toString(16)
              .slice(1)
              .toUpperCase()
          );
        });

      resolve(sortedColors);
    };
    img.onerror = (e) => reject(e);
  });
};

export const getEstimatedFreeDate = (orders: Order[]) => {
  // Lấy các đơn đang sản xuất
  const activeOrders = orders.filter((o) => o.status === "in_production");
  if (activeOrders.length === 0)
    return { days: 0, date: dayjs().format("DD/MM/YYYY") };

  // Tìm ngày giao sớm nhất của các đơn đang chạy (giả sử đó là lúc máy rảnh)
  const sortedOrders = [...activeOrders].sort(
    (a, b) =>
      new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime()
  );

  const nextFreeDateStr = sortedOrders[0]?.delivery_date;
  if (!nextFreeDateStr)
    return { days: 2, date: dayjs().add(2, "day").format("DD/MM/YYYY") };

  const nextFreeDate = dayjs(nextFreeDateStr);
  const diffDays = nextFreeDate.diff(dayjs(), "day");
  return {
    days: diffDays > 0 ? diffDays : 1,
    date: nextFreeDate.format("DD/MM/YYYY"),
  };
};

export const calculateProductionTime = (
    quantity: number,
    paperCode: string,
    paperTypes: {value: string; stock: number}[],
    isWorkshopFull: boolean,
    daysUntilFree: number,
    deliveryDate: dayjs.Dayjs | null,
    isBusy: boolean
) => {
    // 1. Basic Cost
    const baseCost = quantity * 2500 + 3000000;

    // 2. Paper Needed
    const paperNeeded = Math.ceil((quantity / 4) * 1.05);
    const selectedPaper = paperTypes.find((p) => p.value === paperCode);
    const isStockEnough = selectedPaper
      ? selectedPaper.stock >= paperNeeded
      : true;

    // 3. Time
    const waitingDays = isWorkshopFull ? daysUntilFree : 0;
    const productionDays = Math.ceil(quantity / 2000) + 2;
    const materialLeadTime = isStockEnough ? 0 : 4;
    const totalSystemDays = productionDays + materialLeadTime + waitingDays;

    const today = dayjs();
    const systemDateObj = today.add(totalSystemDays, "day");
    const systemDateStr = systemDateObj.format("YYYY-MM-DD");


    const currentDesiredDate = deliveryDate || systemDateObj;
    let rushFee = 0;
    let daysEarly = 0;
    let caseType: 1 | 2 | 3 = 1;

    if (currentDesiredDate.isBefore(systemDateObj, "day")) {
      daysEarly = systemDateObj.diff(currentDesiredDate, "day");
      if (!isStockEnough || isWorkshopFull) {
        rushFee = daysEarly * RUSH_FEE_HIGH * 1.5;
        caseType = 3;
      } else if (!isBusy) {
        rushFee = daysEarly * RUSH_FEE_LOW;
        caseType = 2;
      } else {
        rushFee = daysEarly * RUSH_FEE_HIGH;
        caseType = 3;
      }
    }

    const finalCost = baseCost + rushFee;

    return {
        baseCost,
        rushFee,
        daysEarly,
        finalCost,
        systemDate: systemDateStr,
        caseType,
        paperNeeded,
        isStockEnough,
        productionDays,
        effectiveDate: currentDesiredDate.format("YYYY-MM-DD"),
    };
}
