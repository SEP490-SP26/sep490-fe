import http from "@/lib/httpAxios";

export interface ProductionCalendarItem {
  calendar_date: string;
  holiday_name: string;
  holiday_type: string;
  is_non_working_day: boolean;
  is_manual_override: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCalendarBody {
  calendar_date: string;
  holiday_name: string;
  holiday_type: string;
  is_non_working_day: boolean;
  is_manual_override: boolean;
  note: string;
}

export interface UpdateCalendarBody {
  calendar_date: string;
  holiday_name: string;
  holiday_type: string;
  is_non_working_day: boolean;
  is_manual_override: boolean;
  note: string;
  created_at: string;
  updated_at: string;
}

export const productionCalendarApi = {
  getAll: () =>
    http.get<ProductionCalendarItem[]>("/api/ProductionCalendars/all-date"),

  create: (body: CreateCalendarBody) =>
    http.post<{ message: string; calendar_date: string }>("/api/ProductionCalendars", body),

  update: (body: UpdateCalendarBody) =>
    http.put<{ message: string; calendar_date: string }>("/api/ProductionCalendars", body),

  delete: (date: string) =>
    http.delete<{ message: string; calendar_date: string }>(`/api/ProductionCalendars?date=${date}`),
};
