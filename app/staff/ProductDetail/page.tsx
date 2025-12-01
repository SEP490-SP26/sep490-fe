'use client';
import { useProduction } from "@/context/ProductionContext";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  Scissors,
  Printer,
  Layers,
  Zap,
  Glue,
} from "lucide-react";

export default function ProductionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const {
    orders,
    products,
    materials,
    productionSchedules,
    getProductionStages,
    getStageMaterialsInfo,
    checkStageMaterials,
    updateProductionStage,
  } = useProduction();

  const order = orders.find(o => o.id === id);
  const schedule = productionSchedules.find(s => s.order_id === id);
  const product = products.find(p => p.id === order?.product_id);
  const stages = getProductionStages(id as string);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy đơn hàng</h1>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const productionStages = [
    { id: 'ralo', name: 'Ralo', icon: Scissors, color: 'bg-blue-100 text-blue-700' },
    { id: 'cut', name: 'Cắt', icon: Scissors, color: 'bg-purple-100 text-purple-700' },
    { id: 'print', name: 'In', icon: Printer, color: 'bg-green-100 text-green-700' },
    { id: 'laminate', name: 'Cán màng', icon: Layers, color: 'bg-yellow-100 text-yellow-700' },
    { id: 'corrugate', name: 'Bồi sóng', icon: Package, color: 'bg-orange-100 text-orange-700' },
    { id: 'crease', name: 'Bể', icon: Zap, color: 'bg-red-100 text-red-700' },
    { id: 'diecut', name: 'Dứt', icon: Scissors, color: 'bg-pink-100 text-pink-700' },
    { id: 'glue', name: 'Dán', icon: Glue, color: 'bg-indigo-100 text-indigo-700' },
  ];

  const handleUpdateStage = (stageId: string) => {
    if (schedule) {
      updateProductionStage(schedule.id, stageId);
    }
  };

  const getStageStatus = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.status || 'pending';
  };

  const isStageAvailable = (stageId: string) => {
    const currentStageIndex = productionStages.findIndex(stage => stage.id === schedule?.current_stage);
    const targetStageIndex = productionStages.findIndex(stage => stage.id === stageId);
    
    // Cho phép chuyển đến stage tiếp theo
    return targetStageIndex <= currentStageIndex + 1;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Quay lại
          </button>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Chi tiết sản xuất - {order.customer_name}
                </h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Sản phẩm:</span> {product?.name}
                  </div>
                  <div>
                    <span className="font-medium">Số lượng:</span> {order.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Ngày giao:</span>{" "}
                    {new Date(order.delivery_date).toLocaleDateString("vi-VN")}
                  </div>
                  <div>
                    <span className="font-medium">Mã đơn hàng:</span> {order.id}
                  </div>
                  <div>
                    <span className="font-medium">Trạng thái:</span>{" "}
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'in_production' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {order.status === 'completed' ? 'Hoàn thành' :
                       order.status === 'in_production' ? 'Đang sản xuất' :
                       order.status === 'scheduled' ? 'Đã lên lịch' : 'Chờ xử lý'}
                    </span>
                  </div>
                  {schedule && (
                    <div>
                      <span className="font-medium">Lịch sản xuất:</span>{" "}
                      {new Date(schedule.start_date).toLocaleDateString("vi-VN")} →{" "}
                      {new Date(schedule.end_date).toLocaleDateString("vi-VN")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Production Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Stages List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Tiến độ sản xuất
              </h2>

              <div className="space-y-4">
                {productionStages.map((stage, index) => {
                  const stageStatus = getStageStatus(stage.id);
                  const stageMaterials = getStageMaterialsInfo(order.id, stage.id);
                  const hasEnoughMaterials = checkStageMaterials(order.id, stage.id);
                  const isCurrentStage = schedule?.current_stage === stage.id;
                  const isAvailable = isStageAvailable(stage.id);
                  const StageIcon = stage.icon;

                  return (
                    <div
                      key={stage.id}
                      className={`border rounded-lg p-4 ${
                        isCurrentStage ? 'border-blue-300 bg-blue-50' :
                        stageStatus === 'completed' ? 'border-green-300 bg-green-50' :
                        stageStatus === 'in_progress' ? 'border-yellow-300 bg-yellow-50' :
                        'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            stageStatus === 'completed' ? 'bg-green-100 text-green-600' :
                            stageStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-400'
                          }`}>
                            <StageIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{stage.name}</h3>
                            <p className={`text-sm ${
                              stageStatus === 'completed' ? 'text-green-600' :
                              stageStatus === 'in_progress' ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>
                              {stageStatus === 'completed' ? 'Đã hoàn thành' :
                               stageStatus === 'in_progress' ? 'Đang thực hiện' :
                               'Chờ xử lý'}
                            </p>
                          </div>
                        </div>
                        
                        {stageStatus === 'in_progress' && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            Hiện tại
                          </span>
                        )}
                      </div>

                      {/* Materials Section */}
                      {stageMaterials.length > 0 && (
                        <div className="mt-4 p-3 bg-white rounded-lg border">
                          <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Vật tư cần thiết
                          </h4>
                          <div className="space-y-2">
                            {stageMaterials.map((material, matIndex) => (
                              <div
                                key={matIndex}
                                className="flex justify-between items-center text-sm"
                              >
                                <span className="text-gray-600">{material.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${
                                    material.hasEnough ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {material.quantity} {material.unit}
                                  </span>
                                  {!material.hasEnough && (
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className={`mt-3 p-2 rounded text-sm ${
                            hasEnoughMaterials 
                              ? 'bg-green-50 text-green-700 border border-green-200' 
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            <div className="flex items-center gap-2">
                              {hasEnoughMaterials ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <AlertTriangle className="w-4 h-4" />
                              )}
                              {hasEnoughMaterials 
                                ? 'Đủ vật tư cho công đoạn này' 
                                : 'Thiếu vật tư, không thể thực hiện'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Button */}
                      {isAvailable && stageStatus === 'pending' && hasEnoughMaterials && (
                        <button
                          onClick={() => handleUpdateStage(stage.id)}
                          className="w-full mt-3 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Bắt đầu công đoạn
                        </button>
                      )}

                      {isAvailable && stageStatus === 'pending' && !hasEnoughMaterials && (
                        <button
                          disabled
                          className="w-full mt-3 bg-gray-400 text-white py-2 px-4 rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          Thiếu vật tư
                        </button>
                      )}

                      {/* Stage Timeline */}
                      {stageStatus !== 'pending' && (
                        <div className="mt-3 text-xs text-gray-500">
                          {stageStatus === 'completed' && (
                            <div>
                              ✅ Hoàn thành: {stages.find(s => s.id === stage.id)?.end_date 
                                ? new Date(stages.find(s => s.id === stage.id)!.end_date!).toLocaleDateString('vi-VN')
                                : 'N/A'}
                            </div>
                          )}
                          {stageStatus === 'in_progress' && (
                            <div>
                              🟡 Bắt đầu: {stages.find(s => s.id === stage.id)?.start_date 
                                ? new Date(stages.find(s => s.id === stage.id)!.start_date!).toLocaleDateString('vi-VN')
                                : 'N/A'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold mb-4">Tổng quan</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Tiến độ tổng thể</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${(stages.filter(s => s.status === 'completed').length / productionStages.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {stages.filter(s => s.status === 'completed').length} / {productionStages.length} công đoạn
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Đã hoàn thành:</span>
                    <span className="text-green-600 font-medium">
                      {stages.filter(s => s.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Đang thực hiện:</span>
                    <span className="text-yellow-600 font-medium">
                      {stages.filter(s => s.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Chờ xử lý:</span>
                    <span className="text-gray-600 font-medium">
                      {stages.filter(s => s.status === 'pending').length}
                    </span>
                  </div>
                </div>

                {schedule?.current_stage && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-700 mb-1">
                      Công đoạn hiện tại
                    </div>
                    <div className="text-lg font-bold text-blue-800">
                      {productionStages.find(s => s.id === schedule.current_stage)?.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}