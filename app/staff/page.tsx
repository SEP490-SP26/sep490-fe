'use client';
import { useProduction } from "@/context/ProductionContext";
import { useState } from "react";
import { BiPackage } from "react-icons/bi";
import { BsBook, BsCalendar, BsCheckCircle, BsClock, BsLayers, BsPlay, BsPrinter, BsScissors } from "react-icons/bs";
import { FiZap } from "react-icons/fi";


export default function ProductionScheduling() {
  const {
    products,
    orders,
    productionSchedules,
    scheduleProduction,
    startProduction,
    completeProduction,
    updateProductionStage,
  } = useProduction();

  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // Các công đoạn sản xuất theo phiếu lệnh
  const productionStages = [
    { id: "ralo", name: "Ralo", icon: BsScissors, color: "bg-blue-100 text-blue-700" },
    { id: "cut", name: "Cắt", icon: BsScissors, color: "bg-purple-100 text-purple-700" },
    { id: "print", name: "In", icon: BsPrinter, color: "bg-green-100 text-green-700" },
    { id: "laminate", name: "Cán màng", icon: BsLayers, color: "bg-yellow-100 text-yellow-700" },
    { id: "corrugate", name: "Bồi sóng", icon: BiPackage, color: "bg-orange-100 text-orange-700" },
    { id: "crease", name: "Bể", icon: FiZap, color: "bg-red-100 text-red-700" },
    { id: "diecut", name: "Dứt", icon: BsScissors, color: "bg-pink-100 text-pink-700" },
    { id: "glue", name: "Dán", icon: BsBook, color: "bg-indigo-100 text-indigo-700" },
  ];

  // Đơn hàng sẵn sàng để lên lịch (có thể sản xuất và chưa được lên lịch)
  const readyOrders = orders.filter(
    (o) => o.can_fulfill === true && o.status === "pending",
  );

  // Đơn hàng đã lên lịch
  const scheduledOrders = orders
    .filter(
      (o) =>
        o.status === "scheduled" ||
        o.status === "in_production" ||
        o.status === "completed",
    )
    .map((order) => ({
      ...order,
      schedule: productionSchedules.find(
        (s) => s.order_id === order.id,
      ),
      product: products.find((p) => p.id === order.product_id),
    }));

  // Lấy danh sách tuần
  const getWeeks = () => {
    const weeks: { label: string; start: Date; end: Date }[] = [];
    const today = new Date();

    for (let i = -2; i <= 4; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      weeks.push({
        label: `Tuần ${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
        start: weekStart,
        end: weekEnd,
      });
    }

    return weeks;
  };

  const weeks = getWeeks();

  // Lọc lịch theo tuần
  const getSchedulesForWeek = (weekStart: Date, weekEnd: Date) => {
    return scheduledOrders.filter((order) => {
      if (!order.schedule) return false;

      const scheduleStart = new Date(order.schedule.start_date);
      const scheduleEnd = new Date(order.schedule.end_date);

      return (
        scheduleStart <= weekEnd && scheduleEnd >= weekStart
      );
    });
  };

  const handleSchedule = (orderId: string) => {
    scheduleProduction(orderId);
  };

  const handleStart = (scheduleId: string) => {
    if (confirm("Bắt đầu sản xuất?")) {
      startProduction(scheduleId);
    }
  };

  const handleComplete = (scheduleId: string) => {
    if (
      confirm(
        "Xác nhận hoàn thành sản xuất? Nguyên vật liệu sẽ được trừ khỏi kho.",
      )
    ) {
      completeProduction(scheduleId);
    }
  };

  const handleUpdateStage = (scheduleId: string, stage: string) => {
    if (confirm(`Chuyển sang công đoạn ${stage}?`)) {
      updateProductionStage(scheduleId, stage);
    }
  };

  const toggleOrderDetails = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-700 border-blue-200",
      in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
      completed: "bg-green-100 text-green-700 border-green-200",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-700 border-gray-200"
    );
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: "Đã lên lịch",
      in_progress: "Đang sản xuất",
      completed: "Hoàn thành",
    };
    return labels[status] || status;
  };

  type ProductionSchedule = {
    id: string;
    order_id: string;
    start_date: string;
    end_date: string;
    status: string;
    current_stage?: string;
    // Add other fields as needed
  };

  const getStageProgress = (schedule: ProductionSchedule | undefined) => {
    const currentStage = schedule?.current_stage || "ralo";
    const stageIndex = productionStages.findIndex(stage => stage.id === currentStage);
    return {
      currentStage,
      progress: ((stageIndex + 1) / productionStages.length) * 100,
      completedStages: productionStages.slice(0, stageIndex + 1),
      remainingStages: productionStages.slice(stageIndex + 1),
    };
  };

  // Render chi tiết vật tư theo công đoạn (dựa trên phiếu lệnh)
  const renderProductionDetails = (order: typeof scheduledOrders[0]) => {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-3">Chi tiết sản xuất:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium mb-2">Vật tư sử dụng:</div>
            <div className="space-y-1">
              <div>• Giấy Duplex 350 Khổ 1000: 320 tờ</div>
              <div>• Kẽm in: 4 bản</div>
              <div>• Mực in: 0.10 kg</div>
              <div>• Màng BÓNG nhiệt 1205: 0.42 kg</div>
              <div>• Sóng E nâu khổ 430: 60 tờ</div>
            </div>
          </div>
          <div>
            <div className="font-medium mb-2">Quy trình:</div>
            <div className="space-y-1">
              <div>1. Ralo - Cắt giấy</div>
              <div>2. In offset</div>
              <div>3. Cán màng bóng</div>
              <div>4. Bồi sóng E</div>
              <div>5. Bể, dứt</div>
              <div>6. Dán hoàn thiện</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h1 className="mb-8">Lập lịch Sản xuất</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Đơn hàng sẵn sàng */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsClock className="w-5 h-5 text-blue-500" />
            Sẵn sàng lên lịch ({readyOrders.length})
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {readyOrders.map((order) => {
              const product = products.find(
                (p) => p.id === order.product_id,
              );

              return (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="mb-3">
                    <div className="text-gray-900 font-medium">
                      {order.customer_name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {product?.name} • Số lượng: {order.quantity}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Giao: {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      LSX: {order.id}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSchedule(order.id)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <BsCalendar className="w-4 h-4" />
                    Lên lịch sản xuất
                  </button>
                </div>
              );
            })}

            {readyOrders.length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Không có đơn hàng sẵn sàng
              </div>
            )}
          </div>
        </div>

        {/* Đang sản xuất */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsPlay className="w-5 h-5 text-yellow-500" />
            Đang sản xuất
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {scheduledOrders
              .filter((o) => o.schedule?.status === "in_progress")
              .map((order) => {
                const progress = getStageProgress(order.schedule);
                
                return (
                  <div
                    key={order.id}
                    className="border border-yellow-200 bg-yellow-50 rounded-lg p-4"
                  >
                    <div className="mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-gray-900 font-medium">
                          {order.customer_name}
                        </div>
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          {progress.currentStage}
                        </span>
                      </div>
                      <div className="text-gray-500 text-sm">
                        {order.product?.name} • SL: {order.quantity}
                      </div>
                      <div className="text-gray-500 text-sm">
                        Giao: {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                      </div>
                      
                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Tiến độ</span>
                          <span>{Math.round(progress.progress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Current stage */}
                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-700 mb-2">
                          Công đoạn hiện tại:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {productionStages.map((stage, index) => {
                            const isCompleted = index <= progress.completedStages.length - 1;
                            const isCurrent = stage.id === progress.currentStage;
                            const StageIcon = stage.icon;
                            
                            return (
                              <div
                                key={stage.id}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                  isCurrent 
                                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                    : isCompleted
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                <StageIcon className="w-3 h-3" />
                                {stage.name}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {progress.remainingStages.length > 0 && (
                        <button
                          onClick={() => {
                            const nextStage = progress.remainingStages[0];
                            handleUpdateStage(order.schedule!.id, nextStage.id);
                          }}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <BsPlay className="w-4 h-4" />
                          Chuyển công đoạn tiếp theo
                        </button>
                      )}
                      
                      {progress.remainingStages.length === 0 && (
                        <button
                          onClick={() => handleComplete(order.schedule!.id)}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <BsCheckCircle className="w-4 h-4" />
                          Hoàn thành sản xuất
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => toggleOrderDetails(order.id)}
                      className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700"
                    >
                      {expandedOrders.has(order.id) ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                    </button>

                    {expandedOrders.has(order.id) && renderProductionDetails(order)}
                  </div>
                );
              })}

            {scheduledOrders.filter((o) => o.schedule?.status === "in_progress").length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Không có đơn đang sản xuất
              </div>
            )}
          </div>
        </div>

        {/* Đã lên lịch */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="mb-4 flex items-center gap-2">
            <BsCalendar className="w-5 h-5 text-blue-500" />
            Đã lên lịch
          </h2>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {scheduledOrders
              .filter((o) => o.schedule?.status === "scheduled")
              .map((order) => (
                <div
                  key={order.id}
                  className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                >
                  <div className="mb-3">
                    <div className="text-gray-900 font-medium">
                      {order.customer_name}
                    </div>
                    <div className="text-gray-500 text-sm">
                      {order.product?.name} • SL: {order.quantity}
                    </div>
                    <div className="text-gray-500 text-sm">
                      Giao: {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                    </div>
                    {order.schedule && (
                      <div className="text-gray-500 text-sm">
                        Kế hoạch: {new Date(order.schedule.start_date).toLocaleDateString("vi-VN")} → {new Date(order.schedule.end_date).toLocaleDateString("vi-VN")}
                      </div>
                    )}
                  </div>

                  {order.schedule && (
                    <button
                      onClick={() => handleStart(order.schedule!.id)}
                      className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <BsPlay className="w-4 h-4" />
                      Bắt đầu sản xuất
                    </button>
                  )}
                </div>
              ))}

            {scheduledOrders.filter((o) => o.schedule?.status === "scheduled").length === 0 && (
              <div className="text-gray-400 text-center py-8 text-sm">
                Chưa có lịch sản xuất
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bảng lịch trình theo tuần */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="mb-4">Lịch trình Sản xuất theo Tuần</h2>

        <div className="mb-4">
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tất cả các tuần</option>
            {weeks.map((week, index) => (
              <option key={index} value={index.toString()}>
                {week.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {weeks.map((week, index) => {
            if (selectedWeek && selectedWeek !== index.toString()) return null;

            const weekSchedules = getSchedulesForWeek(week.start, week.end);

            if (weekSchedules.length === 0 && selectedWeek) return null;

            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="mb-3">
                  <div className="text-gray-900 font-medium">{week.label}</div>
                  <div className="text-gray-500 text-sm">
                    {weekSchedules.length} đơn hàng
                  </div>
                </div>

                {weekSchedules.length > 0 ? (
                  <div className="space-y-2">
                    {weekSchedules.map((order) => (
                      <div
                        key={order.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          order.schedule ? getStatusColor(order.schedule.status) : ""
                        }`}
                      >
                        <div className="flex-1">
                          <div className="text-gray-900 font-medium">
                            {order.customer_name}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {order.product?.name} • Số lượng: {order.quantity}
                          </div>
                          {order.schedule && (
                            <div className="text-gray-500 text-sm">
                              {new Date(order.schedule.start_date).toLocaleDateString("vi-VN")} → {new Date(order.schedule.end_date).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                        {order.schedule && (
                          <span className="text-xs px-2 py-1 rounded-full bg-white">
                            {getStatusLabel(order.schedule.status)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-4 text-sm">
                    Không có lịch sản xuất
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}