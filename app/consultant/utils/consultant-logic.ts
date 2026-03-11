import dayjs from "dayjs";
import { Order } from "@/context/ProductionContext";
import { DetailedProductionEstimation, ProcessCostItem } from "@/lib/estimation.types";
import { EstimateCostResponse, EstimatePaperResponse } from "@/schemaValidations/common.schema";

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
  paperTypes: { value: string; stock: number }[],
  isWorkshopFull: boolean,
  daysUntilFree: number,
  deliveryDate: dayjs.Dayjs | null,
  isBusy: boolean,
  calculatedPaperNeeded?: number
) => {
  // 1. Basic Cost
  const baseCost = quantity * 2500 + 3000000;

  // 2. Paper Needed
  const paperNeeded = calculatedPaperNeeded ?? Math.ceil((quantity / 4) * 1.05);
  const selectedPaper = paperTypes.find((p) => p.value === paperCode);
  const isStockEnough = selectedPaper
    ? Number(selectedPaper.stock) >= Number(paperNeeded)
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

export const mapToOrderEstimationResult = (
  costEstimate: EstimateCostResponse,
  paperEstimate: EstimatePaperResponse,
  orderId: string | number,
  deliveryDate: any, // dayjs or Date
  discountPercent?: number,
  discountAmount?: number,
  additionalSpecs?: Partial<DetailedProductionEstimation>
): DetailedProductionEstimation => {
  const currentOrderId = typeof orderId === 'string' ? parseInt(orderId) : orderId;

  // Map Process Costs
  const mappedProcessCosts: ProcessCostItem[] = costEstimate.process_cost.details.map((d: any) => ({
    process_code: d.process_code || d.process || "",
    process_name: d.process_name || d.process || "",
    quantity: d.quantity,
    unit: d.unit,
    unit_price: d.unit_price,
    total_cost: d.total_cost,
    note: d.note || ""
  }));

  return {
    order_request_id: currentOrderId,

    // Paper
    paper_cost: costEstimate.cost.paper_cost || 0,
    paper_sheets_used: costEstimate.cost.paper_sheets_used || 0,
    paper_unit_price: costEstimate.cost.paper_unit_price || 0,
    paper_code: additionalSpecs?.paper_code || costEstimate.cost.material_cost_details?.find((m: any) => m.material_name.includes("Giấy"))?.note || paperEstimate.paper_code || "",
    paper_name: additionalSpecs?.paper_name || "",
    wave_type: additionalSpecs?.wave_type || "",

    // Ink
    ink_cost: costEstimate.cost.ink_cost || 0,
    ink_weight_kg: costEstimate.cost.ink_weight_kg || 0,
    ink_rate_per_m2: costEstimate.cost.ink_rate_per_m2 || 0,

    // Coating
    coating_glue_cost: costEstimate.cost.coating_glue_cost || 0,
    coating_glue_weight_kg: costEstimate.cost.coating_glue_weight_kg || 0,
    coating_glue_rate_per_m2: costEstimate.cost.coating_glue_rate_per_m2 || 0,
    coating_type: costEstimate.cost.coating_type || "",

    // Mounting
    mounting_glue_cost: costEstimate.cost.mounting_glue_cost || 0,
    mounting_glue_weight_kg: costEstimate.cost.mounting_glue_weight_kg || 0,
    mounting_glue_rate_per_m2: costEstimate.cost.mounting_glue_rate_per_m2 || 0,

    // Lamination
    lamination_cost: costEstimate.cost.lamination_cost || 0,
    lamination_weight_kg: costEstimate.cost.lamination_weight_kg || 0,
    lamination_rate_per_m2: costEstimate.cost.lamination_rate_per_m2 || 0,

    // Totals
    material_cost: costEstimate.cost.material_cost || 0,
    design_cost: costEstimate.cost.design_cost || 0,
    base_cost: costEstimate.cost.base_cost || 0,

    // Rush
    is_rush: costEstimate.cost.is_rush || false,
    rush_percent: costEstimate.cost.rush_percent || 0,
    rush_amount: costEstimate.cost.rush_amount || 0,
    days_early: costEstimate.cost.days_early || 0,

    // Final
    subtotal: costEstimate.cost.subtotal || 0,
    discount_percent: discountPercent !== undefined ? discountPercent : (costEstimate.cost.discount_percent || 0),
    discount_amount: discountAmount !== undefined ? discountAmount : (costEstimate.cost.discount_amount || 0),
    final_total_cost: costEstimate.cost.final_total_cost || 0,
    cost_note: additionalSpecs?.cost_note || "",

    // Time
    estimated_finish_date: costEstimate.cost.estimated_finish_date || new Date().toISOString(),
    desired_delivery_date: deliveryDate ? (typeof deliveryDate.toISOString === 'function' ? deliveryDate.toISOString() : new Date(deliveryDate).toISOString()) : new Date().toISOString(),
    created_at: new Date().toISOString(),

    // Specs
    production_processes: additionalSpecs?.production_processes || "",
    sheets_required: paperEstimate.sheets_base || 0,
    sheets_waste: paperEstimate.total_waste || 0,
    sheets_total: paperEstimate.sheets_with_waste || 0,
    n_up: paperEstimate.n_up || 1,
    total_area_m2: costEstimate.cost.total_area_m2 || 0,
    bleed_mm: additionalSpecs?.bleed_mm || 0,
    glue_tab_mm: additionalSpecs?.glue_tab_mm || 0,
    is_one_side_box: additionalSpecs?.is_one_side_box || false,
    print_height_mm: additionalSpecs?.print_height_mm || (paperEstimate as any).print_height_mm || 0,
    print_width_mm: additionalSpecs?.print_width_mm || (paperEstimate as any).print_width_mm || 0,

    process_costs: mappedProcessCosts,
  };
};
