import { BsBoxes } from "react-icons/bs";
import { TbBuildingFactory, TbLayoutDashboard, TbPackageImport, TbShoppingCart } from "react-icons/tb";


interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Navigation({
  currentPage,
  onNavigate,
}: NavigationProps) {
  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: TbLayoutDashboard,
    },
    { id: "orders", label: "Tạo Đơn Hàng", icon: TbShoppingCart },
    {
      id: "procurement",
      label: "Quản Lý Mua Hàng",
      icon: TbPackageImport,
    },
    { id: "production", label: "Lập Lịch SX", icon: TbBuildingFactory },
    { id: "inventory", label: "Quản Lý Kho", icon: BsBoxes },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
           
            <h1 className="text-xl font-semibold uppercase text-blue-600">
                Công Ty Cổ Phần IN Ấn
            </h1>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentPage === item.id
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}