"use client";

import { useState } from "react";
import { BsClipboardCheck, BsX, BsChevronLeft, BsChevronRight } from "react-icons/bs";

export interface ScanLogItem {
  scanned_at?: string;
  log_time?: string;
  qty_good: number;
  report_image_urls?: string[];
  comment?: string;
  reason?: string;
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function LogImageThumbnails({
  images,
  onPreview,
}: {
  images: string[];
  onPreview: (index: number) => void;
}) {
  if (images.length === 0) {
    return <span className="text-gray-400 text-xs">—</span>;
  }

  return (
    <div className="flex justify-center gap-2 flex-wrap max-w-[140px] mx-auto">
      {images.slice(0, 2).map((url, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onPreview(idx)}
          className="w-10 h-10 rounded-lg border border-gray-200 overflow-hidden hover:scale-105 hover:shadow-md transition shrink-0"
        >
          <img
            src={url}
            alt={`report-${idx}`}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
      {images.length > 2 && (
        <button
          type="button"
          onClick={() => onPreview(2)}
          className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 hover:bg-gray-200 transition shrink-0"
        >
          +{images.length - 2}
        </button>
      )}
    </div>
  );
}

function ImagePreviewModal({
  images,
  index,
  onClose,
  onChangeIndex,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
}) {
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-2 -right-2 sm:top-0 sm:right-0 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg transition"
        >
          <BsX className="w-5 h-5" />
        </button>

        <div className="relative w-full flex items-center justify-center">
          {hasPrev && (
            <button
              type="button"
              onClick={() => onChangeIndex(index - 1)}
              className="absolute left-0 sm:-left-12 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg transition"
            >
              <BsChevronLeft className="w-5 h-5" />
            </button>
          )}

          <img
            src={images[index]}
            alt={`preview-${index}`}
            className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl bg-black/20"
          />

          {hasNext && (
            <button
              type="button"
              onClick={() => onChangeIndex(index + 1)}
              className="absolute right-0 sm:-right-12 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 flex items-center justify-center shadow-lg transition"
            >
              <BsChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="mt-3 text-sm text-white/90">
          {index + 1} / {images.length}
        </p>
      </div>
    </div>
  );
}

export default function StageScanLogs({ logs }: { logs: ScanLogItem[] }) {
  const [preview, setPreview] = useState<{ images: string[]; index: number } | null>(null);

  if (!logs || logs.length === 0) return null;

  return (
    <>
      <div>
        <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm text-gray-700">
          <BsClipboardCheck className="w-4 h-4 text-purple-500" />
          Lịch sử scan
        </h4>

        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-purple-600">
                  Thời gian
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-purple-600">
                  Số lượng thành phẩm
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-purple-600">
                  Ghi chú
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-purple-600">
                  Hình ảnh
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const images = log.report_image_urls ?? [];
                const note = log.comment || log.reason;

                return (
                  <tr key={i} className="border-t hover:bg-gray-50 transition">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatDateTime(log.log_time || log.scanned_at)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-green-600 font-bold whitespace-nowrap">
                      {Number(log.qty_good || 0).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[240px] break-words">
                      {note ? (
                        <div className="line-clamp-3" title={note}>
                          {note}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <LogImageThumbnails
                        images={images}
                        onPreview={(idx) =>
                          setPreview({ images, index: idx })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <ImagePreviewModal
          images={preview.images}
          index={preview.index}
          onClose={() => setPreview(null)}
          onChangeIndex={(index) =>
            setPreview((prev) => (prev ? { ...prev, index } : null))
          }
        />
      )}
    </>
  );
}
