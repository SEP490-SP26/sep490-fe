export const ALL_PROCESS_TYPES = [
  "RALO",
  "CAT",
  "IN",
  "PHU",
  "CAN",
  "BOI",
  "BE",
  "DUT",
  "DAN",
] as const;

export type ProcessTypeCode = (typeof ALL_PROCESS_TYPES)[number];

export const PROCESS_TYPE_LABELS: Record<string, string> = {
  RALO: "Ralo",
  CAT: "Cắt",
  IN: "In",
  PHU: "Phủ",
  CAN: "Cán",
  BOI: "Bồi",
  BE: "Bế",
  DUT: "Dứt",
  DAN: "Dán",
};
