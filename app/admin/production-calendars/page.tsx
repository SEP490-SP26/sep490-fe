"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FiCalendar, FiPlus, FiEdit2, FiTrash2, FiX, FiCheckCircle,
  FiAlertCircle, FiSearch, FiChevronLeft, FiChevronRight,
} from "react-icons/fi";
import {
  productionCalendarApi,
  ProductionCalendarItem,
  CreateCalendarBody,
} from "@/apiRequests/productionCalendars";

/* ══════════════════════════════════
   Constants & Helpers
══════════════════════════════════ */
const HOLIDAY_TYPE_OPTIONS = [
  "LỄ VIỆT NAM",
  "Tự phát",
  "Bảo trì",
  "Khác",
];

const HOLIDAY_TYPE_COLORS: Record<string, string> = {
  "LỄ VIỆT NAM": "bg-red-100 text-red-700",
  "Tự phát": "bg-amber-100 text-amber-700",
  "Bảo trì": "bg-blue-100 text-blue-700",
  "Khác": "bg-gray-100 text-gray-600",
};

function getTypeColor(type: string) {
  const normalized = type.toUpperCase();
  for (const [key, val] of Object.entries(HOLIDAY_TYPE_COLORS)) {
    if (key.toUpperCase() === normalized) return val;
  }
  return "bg-gray-100 text-gray-600";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toInputDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDeleteParam(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];

const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const PAGE_SIZE = 8;

/* ══════════════════════════════════
   Empty form state
══════════════════════════════════ */
const EMPTY_FORM: CreateCalendarBody = {
  calendar_date: new Date().toISOString(),
  holiday_name: "",
  holiday_type: "Tự phát",
  is_non_working_day: true,
  is_manual_override: true,
  note: "",
};

/* ══════════════════════════════════
   MAIN PAGE
══════════════════════════════════ */
export default function ProductionCalendarsPage() {
  const [holidays, setHolidays] = useState<ProductionCalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  /* Calendar view */
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  /* Modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<CreateCalendarBody>({ ...EMPTY_FORM });
  const [editOriginal, setEditOriginal] = useState<ProductionCalendarItem | null>(null);

  /* Delete confirm */
  const [deleteTarget, setDeleteTarget] = useState<ProductionCalendarItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Toast */
  const [toast, setToast] = useState<{ show: boolean; type: "success" | "error"; message: string }>({
    show: false, type: "success", message: "",
  });
  const showToast = (type: "success" | "error", message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 4000);
  };

  /* ─── Fetch ─── */
  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    try {
      const data = await productionCalendarApi.getAll();
      setHolidays(Array.isArray(data) ? data : []);
    } catch {
      showToast("error", "Không thể tải danh sách ngày nghỉ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);

  /* ─── Calendar holidays map ─── */
  const holidayMap = useMemo(() => {
    const map: Record<string, ProductionCalendarItem> = {};
    holidays.forEach((h) => {
      const key = toInputDate(h.calendar_date);
      map[key] = h;
    });
    return map;
  }, [holidays]);

  /* ─── Calendar grid ─── */
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];

    for (let i = 0; i < firstDay; i++) cells.push({ day: null, dateKey: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(calMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      cells.push({ day: d, dateKey: `${calYear}-${mm}-${dd}` });
    }
    return cells;
  }, [calYear, calMonth]);

  /* ─── Filtered list ─── */
  const filtered = useMemo(() => {
    const sorted = [...holidays].sort(
      (a, b) => new Date(a.calendar_date).getTime() - new Date(b.calendar_date).getTime()
    );
    if (!keyword.trim()) return sorted;
    const kw = keyword.toLowerCase();
    return sorted.filter(
      (h) =>
        h.holiday_name.toLowerCase().includes(kw) ||
        h.holiday_type.toLowerCase().includes(kw) ||
        h.note.toLowerCase().includes(kw) ||
        formatDate(h.calendar_date).toLowerCase().includes(kw)
    );
  }, [holidays, keyword]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => { setPage(1); }, [keyword]);

  /* ─── Open modals ─── */
  const openCreate = (prefillDate?: string) => {
    setForm({
      ...EMPTY_FORM,
      calendar_date: prefillDate ? new Date(prefillDate).toISOString() : new Date().toISOString(),
    });
    setEditOriginal(null);
    setModalMode("create");
    setModalOpen(true);
  };

  const openEdit = (item: ProductionCalendarItem) => {
    setForm({
      calendar_date: item.calendar_date,
      holiday_name: item.holiday_name,
      holiday_type: item.holiday_type,
      is_non_working_day: item.is_non_working_day,
      is_manual_override: item.is_manual_override,
      note: item.note,
    });
    setEditOriginal(item);
    setModalMode("edit");
    setModalOpen(true);
  };

  /* ─── Save (create / update) ─── */
  const handleSave = async () => {
    if (!form.holiday_name.trim()) {
      showToast("error", "Vui lòng nhập tên ngày nghỉ.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "create") {
        await productionCalendarApi.create(form);
        showToast("success", "Thêm ngày nghỉ thành công!");
      } else {
        await productionCalendarApi.update({
          ...form,
          created_at: editOriginal?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        showToast("success", "Cập nhật ngày nghỉ thành công!");
      }
      setModalOpen(false);
      fetchHolidays();
    } catch {
      showToast("error", modalMode === "create" ? "Thêm ngày nghỉ thất bại." : "Cập nhật thất bại.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const dateParam = toDeleteParam(deleteTarget.calendar_date);
      await productionCalendarApi.delete(dateParam);
      showToast("success", "Xoá ngày nghỉ thành công!");
      setDeleteTarget(null);
      fetchHolidays();
    } catch {
      showToast("error", "Xoá thất bại. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  };

  /* ─── Calendar nav ─── */
  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };
  const goToday = () => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); };

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <>
      {/* Toast */}
      <div
        className={`fixed top-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border transition-all duration-500
          ${toast.show ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"}
          ${toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}
        `}
      >
        {toast.type === "success" ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
        <span className="text-sm font-medium">{toast.message}</span>
      </div>

      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FiCalendar className="text-orange-500" />
              Cấu hình ngày nghỉ
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Quản lý ngày lễ, ngày nghỉ bảo trì và ngày nghỉ đặc biệt cho lịch sản xuất
            </p>
          </div>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium
                       hover:bg-blue-700 active:scale-[0.97] transition-all shadow-sm"
          >
            <FiPlus size={16} />
            Thêm ngày nghỉ
          </button>
        </div>

        {/* ═══ Calendar View ═══ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <FiChevronLeft size={18} />
              </button>
              <h2 className="text-base font-semibold text-gray-800 min-w-[160px] text-center">
                {MONTH_NAMES[calMonth]} {calYear}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <FiChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Hôm nay
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAY_NAMES.map((d) => (
              <div key={d} className={`py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${d === "CN" ? "text-red-500" : "text-gray-500"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cell, idx) => {
              if (!cell.day || !cell.dateKey) {
                return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />;
              }
              const holiday = holidayMap[cell.dateKey];
              const isToday =
                cell.day === today.getDate() &&
                calMonth === today.getMonth() &&
                calYear === today.getFullYear();
              const isSunday = new Date(cell.dateKey).getDay() === 0;

              return (
                <div
                  key={cell.dateKey}
                  onClick={() => {
                    if (holiday) openEdit(holiday);
                    else openCreate(cell.dateKey!);
                  }}
                  className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors hover:bg-blue-50/40
                    ${holiday ? "bg-red-50/60" : ""}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium
                        ${isToday ? "bg-blue-600 text-white" : ""}
                        ${isSunday && !isToday ? "text-red-500" : ""}
                        ${!isToday && !isSunday ? "text-gray-700" : ""}
                      `}
                    >
                      {cell.day}
                    </span>
                    {holiday && (
                      <span className="w-2 h-2 rounded-full bg-red-400 mt-1 mr-1 flex-shrink-0" />
                    )}
                  </div>
                  {holiday && (
                    <div className="mt-0.5">
                      <p className="text-[10px] font-medium text-red-600 leading-tight truncate" title={holiday.holiday_name}>
                        {holiday.holiday_name}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Hôm nay
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              Ngày nghỉ
            </div>
            <div className="text-xs text-gray-400">
              Click vào ô để thêm / sửa ngày nghỉ
            </div>
          </div>
        </div>

        {/* ═══ Holiday List ═══ */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-semibold text-gray-800">
              Danh sách ngày nghỉ ({filtered.length})
            </h2>
            <div className="relative w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm tên, loại, ghi chú..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <FiCalendar className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-500 text-sm">Chưa có ngày nghỉ nào được cấu hình.</p>
              <button
                onClick={() => openCreate()}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Thêm ngày nghỉ
              </button>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ngày</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên ngày nghỉ</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Loại</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ghi chú</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((h) => (
                    <tr key={h.calendar_date} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-gray-800">{formatDateShort(h.calendar_date)}</div>
                        <div className="text-[11px] text-gray-400">{formatDate(h.calendar_date).split(",")[0]}</div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 font-medium">{h.holiday_name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(h.holiday_type)}`}>
                          {h.holiday_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium 
                          ${h.is_non_working_day ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {h.is_non_working_day ? "Nghỉ" : "Làm việc"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-[200px] truncate" title={h.note}>
                        {h.note || "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(h)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(h)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xoá"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center px-5 py-3 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Trang {page} / {totalPages}</span>
                  <div className="flex gap-1.5">
                    <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                      Trước
                    </button>
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button key={i} onClick={() => setPage(i + 1)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${page === i + 1 ? "bg-blue-600 text-white" : "border hover:bg-gray-50"}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════
         Modal Create / Edit
      ════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FiCalendar className="text-orange-500" size={18} />
                {modalMode === "create" ? "Thêm ngày nghỉ" : "Chỉnh sửa ngày nghỉ"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
                <FiX size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ngày <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={toInputDate(form.calendar_date)}
                  onChange={(e) => setForm({ ...form, calendar_date: new Date(e.target.value).toISOString() })}
                  disabled={modalMode === "edit"}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white
                             disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Holiday name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Tên ngày nghỉ <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.holiday_name}
                  onChange={(e) => setForm({ ...form, holiday_name: e.target.value })}
                  placeholder="VD: Lễ 30/4, Bảo trì máy móc..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                />
              </div>

              {/* Holiday type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Loại ngày nghỉ</label>
                <select
                  value={form.holiday_type}
                  onChange={(e) => setForm({ ...form, holiday_type: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                >
                  {HOLIDAY_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Toggle row */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_non_working_day}
                    onChange={(e) => setForm({ ...form, is_non_working_day: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ngày không làm việc</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_manual_override}
                    onChange={(e) => setForm({ ...form, is_manual_override: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Ghi đè thủ công</span>
                </label>
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Ghi chú</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={3}
                  placeholder="Ghi chú thêm (không bắt buộc)..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 resize-none
                             focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                           hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <FiCheckCircle size={15} />
                    {modalMode === "create" ? "Thêm" : "Cập nhật"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════
         Modal Delete Confirm
      ════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <FiTrash2 className="text-red-600" size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Xoá ngày nghỉ</h3>
                <p className="text-sm text-gray-500">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-5">
              <p className="text-sm text-red-700">
                Bạn có chắc muốn xoá ngày nghỉ <strong>{deleteTarget.holiday_name}</strong> (
                {formatDateShort(deleteTarget.calendar_date)}) không?
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
                           hover:bg-red-700 active:scale-[0.97] transition-all disabled:opacity-60"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <FiTrash2 size={14} />
                    Xoá
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
