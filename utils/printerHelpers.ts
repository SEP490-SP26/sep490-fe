export interface Printer {
  id: string;
  name: string;
  type: "offset" | "digital" | "flexo" | "screen"; // Loại máy in
  status: "available" | "busy" | "maintenance" | "offline";
  max_print_size: string;
  color_support: "cmyk" | "spot_color" | "pantone" | "full_color";
  daily_capacity: number;
  current_job?: string;
  assigned_orders: string[];
  location: string;
  last_maintenance: string;
  next_maintenance: string;
}

export const getPrinterStatusColor = (status: Printer['status']) => {
  const colors: Record<Printer['status'], string> = {
    available: 'bg-green-100 text-green-700',
    busy: 'bg-yellow-100 text-yellow-700',
    maintenance: 'bg-red-100 text-red-700',
    offline: 'bg-gray-100 text-gray-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export const getPrinterStatusLabel = (status: Printer['status']) => {
  const labels: Record<Printer['status'], string> = {
    available: 'Sẵn sàng',
    busy: 'Đang chạy',
    maintenance: 'Bảo trì',
    offline: 'Ngừng hoạt động',
  };
  return labels[status] || status;
};

export const getPrinterTypeLabel = (type: Printer['type']) => {
  const labels: Record<Printer['type'], string> = {
    offset: 'Offset',
    digital: 'Digital',
    flexo: 'Flexo',
    screen: 'Screen',
  };
  return labels[type] || type;
};

export const getPrinterTypeColor = (type: Printer['type']) => {
  const colors: Record<Printer['type'], string> = {
    offset: 'bg-blue-100 text-blue-700',
    digital: 'bg-purple-100 text-purple-700',
    flexo: 'bg-orange-100 text-orange-700',
    screen: 'bg-green-100 text-green-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};