import type { CreateQRBody } from "@/schemaValidations/common.schema";

/** Theo FE_Huong_Dan_API_Post_QR_FromForm.docx */
export type QrReportMode =
  | "GROUP_MANUAL"
  | "SINGLE_MANUAL_REQUIRED"
  | "SINGLE_MANUAL_OPTIONAL"
  | "SINGLE_ESTIMATE";

export interface QrPrepareData {
  task_id?: number;
  is_group_production?: boolean;
  allow_manual_input?: boolean;
  can_use_manual_input?: boolean;
  manual_input_optional?: boolean;
  suggested_qty?: number;
  max_allowed?: number;
  group_total_qty?: number;
  process_code?: string;
  process_name?: string;
  qty_unit?: string;
  production_output_unit?: string;
  consumable_materials?: any[];
  reference_inputs?: any[];
}

export function resolveQrMode(
  qr: QrPrepareData | null | undefined,
  userToggleManual: boolean
): QrReportMode {
  if (!qr) return "SINGLE_ESTIMATE";
  if (qr.is_group_production === true) return "GROUP_MANUAL";
  if (qr.allow_manual_input === true) return "SINGLE_MANUAL_REQUIRED";
  if (
    qr.can_use_manual_input === true &&
    qr.manual_input_optional === true &&
    userToggleManual
  ) {
    return "SINGLE_MANUAL_OPTIONAL";
  }
  return "SINGLE_ESTIMATE";
}

export function shouldSendManualJson(mode: QrReportMode): boolean {
  return (
    mode === "GROUP_MANUAL" ||
    mode === "SINGLE_MANUAL_REQUIRED" ||
    mode === "SINGLE_MANUAL_OPTIONAL"
  );
}

export function isManualInputMode(mode: QrReportMode): boolean {
  return shouldSendManualJson(mode);
}

export function canShowManualToggle(qr: QrPrepareData | null | undefined): boolean {
  return (
    qr?.is_group_production !== true &&
    qr?.can_use_manual_input === true &&
    qr?.manual_input_optional === true &&
    qr?.allow_manual_input !== true
  );
}

export function getMaterialsSectionTitle(mode: QrReportMode): string {
  return isManualInputMode(mode)
    ? "Nhập kho nguyên vật liệu"
    : "Nhập kho nguyên vật liệu";
}

export function parseReportQty(value: string | undefined): number {
  if (value === "" || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function resolveIsStock(quantityLeft: number): boolean {
  return quantityLeft > 0;
}

export function calcQuantityUsed(maxQty: number, quantityLeft: number): number {
  const max = Number.isFinite(maxQty) ? maxQty : 0;
  const left = Number.isFinite(quantityLeft) ? quantityLeft : 0;
  return Math.max(0, max - left);
}

export function syncQtyFromLeftInput(
  maxVal: number,
  leftValue: string
): { used: string; left: string; error: string } {
  if (leftValue === "") {
    return { used: "", left: "", error: "Vui lòng nhập lượng dư" };
  }
  const numLeft = Number(leftValue);
  if (!Number.isFinite(numLeft) || numLeft < 0 || numLeft > maxVal) {
    return { used: "", left: leftValue, error: `Từ 0 đến ${maxVal}` };
  }
  return {
    used: (maxVal - numLeft).toString(),
    left: leftValue,
    error: "",
  };
}

export function resolveQtyGoodMax(
  qr: QrPrepareData | null | undefined,
  fallbackMax: number
): number {
  if (!qr) return fallbackMax;
  const fromQr = Number(qr.max_allowed ?? qr.group_total_qty ?? 0);
  return fromQr > 0 ? fromQr : fallbackMax;
}

export function resolveFinalQtyGood(
  qtyInputValue: string,
  suggestedQty?: number
): number {
  const parsed = parseReportQty(qtyInputValue);
  if (parsed > 0) return parsed;
  return Number(suggestedQty || 0);
}

export interface MaterialReportPayload {
  material_id: number;
  quantity_used: number;
  quantity_left: number;
  is_stock: boolean;
}

export interface ReferenceInputReportPayload {
  input_code: string;
  input_name: string;
  unit: string;
  quantity_used: number;
  quantity_left: number;
  is_stock: boolean;
}

export interface OutputReportPayload {
  output_code: string;
  output_name: string;
  unit: string;
  quantity_good: number;
  quantity_bad: number;
}

export function buildMaterialsReportJson(
  consumableMaterials: any[] | undefined,
  materialQtys: Record<number, string>,
  materialUsed: Record<number, string>,
  mode: QrReportMode
): MaterialReportPayload[] {
  const isEstimate = mode === "SINGLE_ESTIMATE";

  return (
    consumableMaterials?.map((mat) => {
      if (mat._isPaperInPrint) {
        return {
          material_id: mat.material_id,
          quantity_used: 0,
          quantity_left: 0,
          is_stock: false,
        };
      }

      const maxVal = Number(mat.estimated_input_qty || 0);
      const qtyLeft = parseReportQty(materialQtys[mat.material_id]);

      if (isEstimate) {
        return {
          material_id: mat.material_id,
          quantity_used: 0,
          quantity_left: qtyLeft,
          is_stock: resolveIsStock(qtyLeft),
        };
      }

      const qtyUsed = parseReportQty(materialUsed[mat.material_id]);

      return {
        material_id: mat.material_id,
        quantity_used: qtyUsed,
        quantity_left: qtyLeft,
        is_stock: resolveIsStock(qtyLeft),
      };
    }) ?? []
  );
}

export function buildReferenceInputsReportJson(
  referenceInputs: any[] | undefined,
  refLeft: Record<string, string>,
  refUsed: Record<string, string>
): ReferenceInputReportPayload[] {
  return (
    referenceInputs?.map((x) => {
      const maxVal = Number(x.estimated_qty || 0);
      const rLeft = parseReportQty(refLeft[x.input_code]);
      const usedFromState = refUsed[x.input_code];
      const rUsed =
        usedFromState !== undefined && usedFromState !== ""
          ? parseReportQty(usedFromState)
          : calcQuantityUsed(maxVal, rLeft);

      return {
        input_code: x.input_code,
        input_name: x.input_name,
        unit: x.unit,
        quantity_used: rUsed,
        quantity_left: rLeft,
        is_stock: resolveIsStock(rLeft),
      };
    }) ?? []
  );
}

export function buildOutputsReportJson(
  qrPrepare: QrPrepareData | null | undefined,
  qtyGood: number,
  qtyBad: number,
  stageFallback?: {
    process_code?: string;
    process_name?: string;
    unit?: string;
  }
): OutputReportPayload[] {
  const processCode =
    qrPrepare?.process_code || stageFallback?.process_code || "";
  const processName =
    qrPrepare?.process_name || stageFallback?.process_name || "";
  const unit =
    qrPrepare?.production_output_unit ||
    qrPrepare?.qty_unit ||
    stageFallback?.unit ||
    "sp";

  return [
    {
      output_code: processCode,
      output_name: processName ? `BTP sau ${processName}` : "BTP sau công đoạn",
      unit,
      quantity_good: qtyGood,
      quantity_bad: Math.max(0, qtyBad),
    },
  ];
}

export interface ValidateQrReportParams {
  taskId: number;
  mode: QrReportMode;
  qrPrepare: QrPrepareData | null | undefined;
  qtyInputValue: string;
  maxQtyGood: number;
  materialQtys: Record<number, string>;
  materialUsed: Record<number, string>;
  refLeft: Record<string, string>;
}

export function validateQrReport(params: ValidateQrReportParams): string | null {
  const {
    taskId,
    mode,
    qrPrepare,
    qtyInputValue,
    maxQtyGood,
    materialQtys,
    materialUsed,
    refLeft,
  } = params;

  if (!taskId || taskId <= 0) {
    return "Task không hợp lệ";
  }

  const consumables = qrPrepare?.consumable_materials ?? [];
  const seenMaterialIds = new Set<number>();

  for (const mat of consumables) {
    if (mat._isPaperInPrint) continue;

    if (mat.is_mapped === false) {
      return `Vật tư "${mat.material_name}" chưa được map. Vui lòng liên hệ quản trị.`;
    }

    const materialId = Number(mat.material_id);
    if (!materialId || materialId <= 0) {
      return "material_id không hợp lệ";
    }
    if (seenMaterialIds.has(materialId)) {
      return `Trùng vật tư "${mat.material_name}"`;
    }
    seenMaterialIds.add(materialId);

    const maxVal = Number(mat.estimated_input_qty || 0);
    const leftVal = materialQtys[mat.material_id] ?? "";

    if (leftVal === "") {
      return `Vui lòng nhập lượng dư cho ${mat.material_name}`;
    }

    const numLeft = Number(leftVal);
    if (!Number.isFinite(numLeft) || numLeft < 0) {
      return `Lượng dư của ${mat.material_name} không được âm`;
    }

    if (isManualInputMode(mode)) {
      const numUsed = parseReportQty(materialUsed[mat.material_id]);
      if (numUsed < 0) {
        return `Lượng đã dùng của ${mat.material_name} không được âm`;
      }
    } else if (numLeft > maxVal) {
      return `Lượng dư của ${mat.material_name} phải từ 0 đến ${maxVal}`;
    }
  }

  if (isManualInputMode(mode) && qrPrepare?.reference_inputs?.length) {
    for (const ref of qrPrepare.reference_inputs) {
      const leftVal = refLeft[ref.input_code] ?? "";
      const maxVal = Number(ref.estimated_qty || 0);

      if (leftVal === "") {
        return `Vui lòng nhập lượng dư cho ${ref.input_name}`;
      }

      const numLeft = Number(leftVal);
      if (!Number.isFinite(numLeft) || numLeft < 0 || numLeft > maxVal) {
        return `Lượng dư của ${ref.input_name} phải từ 0 đến ${maxVal}`;
      }
    }
  }

  if (qtyInputValue !== "") {
    const goodVal = resolveFinalQtyGood(qtyInputValue, qrPrepare?.suggested_qty);
    if (goodVal <= 0) {
      return "Số lượng đạt phải lớn hơn 0";
    }
    if (goodVal > maxQtyGood) {
      return `Số lượng đạt phải từ 0 đến ${maxQtyGood.toLocaleString("vi-VN")}`;
    }
  }

  return null;
}

export interface AssembleQrReportParams {
  taskId: number;
  mode: QrReportMode;
  qrPrepare: QrPrepareData | null | undefined;
  qtyGood: number;
  materialQtys: Record<number, string>;
  materialUsed: Record<number, string>;
  refLeft: Record<string, string>;
  refUsed: Record<string, string>;
  qtyBad?: number;
  stageFallback?: {
    process_code?: string;
    process_name?: string;
    unit?: string;
  };
  reason?: string;
  images?: File[];
  ttlMinutes?: number;
}

export function assembleQrReportBody(params: AssembleQrReportParams): CreateQRBody {
  const manual = shouldSendManualJson(params.mode);
  const materials = buildMaterialsReportJson(
    params.qrPrepare?.consumable_materials,
    params.materialQtys,
    params.materialUsed,
    params.mode
  );

  const hasRefs =
    manual && (params.qrPrepare?.reference_inputs?.length ?? 0) > 0;

  return {
    task_id: params.taskId,
    ttl_minutes: params.ttlMinutes ?? 60,
    qty_good: params.qtyGood,
    use_manual_input: manual,
    materials_json: materials.length > 0 ? materials : undefined,
    reference_inputs_json: hasRefs
      ? buildReferenceInputsReportJson(
          params.qrPrepare?.reference_inputs,
          params.refLeft,
          params.refUsed
        )
      : undefined,
    outputs_json: manual
      ? buildOutputsReportJson(
          params.qrPrepare,
          params.qtyGood,
          params.qtyBad ?? 0,
          params.stageFallback
        )
      : undefined,
    reason: params.reason,
    images: params.images,
  };
}
