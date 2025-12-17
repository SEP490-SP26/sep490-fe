import { ProductionSchedule } from "@/context/ProductionContext";
import { productionStagesMock, stageMaterialsMock, stageStatusMock, stageTimelineMock } from "@/lib/data";
import { BiPackage } from "react-icons/bi";



export const getStageStatus = (
  stageId: string, 
  schedule?: ProductionSchedule
): 'pending' | 'in_progress' | 'completed' => {
  // Nếu có data thật từ context, dùng data thật
  if (schedule?.stages) {
    const stage = schedule.stages.find(s => s.id === stageId);
    return stage?.status || 'pending';
  }
  
  // Fallback dùng mock data
  return (stageStatusMock[stageId as keyof typeof stageStatusMock] || 'pending') as 'pending' | 'in_progress' | 'completed';
};

export const getStageMaterialsInfo = (orderId: string, stageId: string) => {
  // Mock data - thực tế sẽ query từ BOM và inventory
  return stageMaterialsMock[stageId as keyof typeof stageMaterialsMock] || [];
};

export const checkStageMaterials = (orderId: string, stageId: string): boolean => {
  const materials = getStageMaterialsInfo(orderId, stageId);
  if (materials.length === 0) return true; // Không cần vật tư
  
  return materials.every(material => material.hasEnough);
};

export const isStageAvailable = (
  stageId: string, 
  schedule?: ProductionSchedule
): boolean => {
  // Kiểm tra stage có thể thực hiện chưa (stage trước đã hoàn thành)
  const stageIndex = productionStagesMock.findIndex(stage => stage.id === stageId);
  if (stageIndex === 0) return true; // Stage đầu tiên
  
  const prevStageId = productionStagesMock[stageIndex - 1]?.id;
  return getStageStatus(prevStageId, schedule) === 'completed';
};

export const getStageIcon = (stageId: string) => {
  const stage = productionStagesMock.find(s => s.id === stageId);
  return stage?.icon || BiPackage; // Default icon
};

export const getStageTimelineInfo = (stageId: string) => {
  return stageTimelineMock[stageId as keyof typeof stageTimelineMock] || {};
};

// Tính % hoàn thành overall
export const calculateOverallProgress = (
  schedule?: ProductionSchedule
): number => {
  if (!schedule?.stages) return 0;
  
  const completedStages = schedule.stages.filter(
    stage => stage.status === 'completed'
  ).length;
  
  return Math.round((completedStages / schedule.stages.length) * 100);
};

// Lấy stages đang available để thực hiện
export const getAvailableStages = (
  schedule?: ProductionSchedule
): string[] => {
  return productionStagesMock
    .filter(stage => isStageAvailable(stage.id, schedule))
    .map(stage => stage.id);
};