'use client'
import { createContext, ReactNode, useContext, useState } from 'react'

// Types
export interface Product {
  id: string
  name: string
  production_rate: number // số sản phẩm/ngày
}

export interface Material {
  id: string
  name: string
  unit: string
}

export interface BOMItem {
  product_id: string
  material_id: string
  quantity: number
}

export interface Order {
  id: string
  product_id: string
  product_name?: string
  quantity: number
  delivery_date: string
  system_delivery_date?: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  design_file_url?: string
  status: 'pending' | 'scheduled' | 'in_production' | 'completed'
  process_status:
    | 'pending_consultant'
    | 'consultant_verified'
    | 'manager_approved'
    | 'rejected'
  specs?: {
    width: number
    height: number
    length: number
    paper_id: string
    colors: string[]
    processing: string[]
  }
  can_fulfill?: boolean
  missing_materials?: {
    material_id: string
    needed: number
    available: number
  }[]
  base_price?: number
  rush_fee?: number
  final_price?: number
  note?: string
  created_at: string
  contract_file?: string | null
}

export interface Inventory {
  material_id: string
  on_hand: number
  reserved: number
}

export interface PurchaseRequest {
  id: string
  order_id: string
  material_id: string
  quantity_needed: number
  status: 'pending' | 'ordered' | 'received'
  created_at: string
}

export interface PurchaseOrder {
  id: string
  pr_id: string
  supplier: string
  expected_delivery_date: string
  status: 'ordered' | 'delivered'
  created_at: string
}

export interface ProductionStage {
  id: string
  name: string
  status: 'pending' | 'in_progress' | 'completed'
  start_date?: string
  end_date?: string
  materials_used?: { material_id: string; quantity: number }[]
}

export interface ProductionSchedule {
  id: string
  order_id: string
  start_date: string
  end_date: string
  status: 'scheduled' | 'in_progress' | 'completed'
  current_stage?: string
  stages?: ProductionStage[]
}

interface ProductionContextType {
  products: Product[]
  materials: Material[]
  bom: BOMItem[]
  orders: Order[]
  inventory: Inventory[]
  currentProductionLoad: number
  isBusy: boolean
  purchaseRequests: PurchaseRequest[]
  purchaseOrders: PurchaseOrder[]
  productionSchedules: ProductionSchedule[]
  updateOrder: (id: string, updates: Partial<Order>) => void
  addOrder: (
    order: Omit<Order, 'id' | 'status' | 'created_at' | 'process_status'> & {
      process_status?: Order['process_status']
    }
  ) => string
  checkOrderFulfillment: (orderId: string) => boolean
  createPurchaseRequest: (orderId: string) => void
  createPurchaseOrder: (
    prId: string,
    supplier: string,
    deliveryDate: string
  ) => void
  receiveInventory: (poId: string) => void
  scheduleProduction: (orderId: string) => void
  startProduction: (scheduleId: string) => void
  completeProduction: (scheduleId: string) => void
  updateInventory: (
    materialId: string,
    onHand: number,
    reserved: number
  ) => void
  updateProductionStage: (scheduleId: string, stage: string) => void
  getProductionStages: (orderId: string) => ProductionStage[]
  getStageMaterialsInfo: (
    orderId: string,
    stageId: string
  ) => Array<{
    material_id: string
    quantity: number
    unit: string
    name: string
    available: number
    hasEnough: boolean
  }>
  checkStageMaterials: (orderId: string, stageId: string) => boolean
}

const ProductionContext = createContext<ProductionContextType | undefined>(
  undefined
)

// Định nghĩa các công đoạn sản xuất theo phiếu lệnh
const productionStagesList = [
  { id: 'ralo', name: 'Ralo' },
  { id: 'cut', name: 'Cắt' },
  { id: 'print', name: 'In' },
  { id: 'laminate', name: 'Cán màng' },
  { id: 'corrugate', name: 'Bồi sóng' },
  { id: 'crease', name: 'Bể' },
  { id: 'diecut', name: 'Dứt' },
  { id: 'glue', name: 'Dán' },
]

// Initial data
const initialProducts: Product[] = [
  { id: 'p1', name: 'Catalog A4', production_rate: 5000 }, // 5000 tờ/ngày
  { id: 'p2', name: 'Brochure 3 gấp', production_rate: 8000 },
  { id: 'p3', name: 'Poster A2', production_rate: 3000 },
  { id: 'p4', name: 'Hộp giấy cao cấp', production_rate: 2000 },
  { id: 'p5', name: 'Danh thiếp 2 mặt', production_rate: 10000 },
]

const initialMaterials: Material[] = [
  { id: 'm1', name: 'Giấy couche 150gsm', unit: 'kg' },
  { id: 'm2', name: 'Giấy couche 250gsm', unit: 'kg' },
  { id: 'm3', name: 'Giấy ivory 300gsm', unit: 'kg' },
  { id: 'm4', name: 'Giấy kraft', unit: 'kg' },
  { id: 'm5', name: 'Mực in CMYK', unit: 'lít' },
  { id: 'm6', name: 'Mực in Pantone', unit: 'lít' },
  { id: 'm7', name: 'Màng phủ bóng', unit: 'cuộn' },
  { id: 'm8', name: 'Màng phủ mờ', unit: 'cuộn' },
  { id: 'm9', name: 'Keo dán', unit: 'kg' },
  { id: 'm10', name: 'UV spot', unit: 'lít' },
]

const initialBOM: BOMItem[] = [
  // Catalog A4
  { product_id: 'p1', material_id: 'm1', quantity: 0.08 }, // 80g cho 1 tờ
  { product_id: 'p1', material_id: 'm5', quantity: 0.002 },
  { product_id: 'p1', material_id: 'm7', quantity: 0.001 },

  // Brochure 3 gấp
  { product_id: 'p2', material_id: 'm2', quantity: 0.15 },
  { product_id: 'p2', material_id: 'm5', quantity: 0.003 },
  { product_id: 'p2', material_id: 'm8', quantity: 0.001 },
  { product_id: 'p2', material_id: 'm9', quantity: 0.005 },

  // Poster A2
  { product_id: 'p3', material_id: 'm2', quantity: 0.2 },
  { product_id: 'p3', material_id: 'm5', quantity: 0.005 },
  { product_id: 'p3', material_id: 'm6', quantity: 0.002 },
  { product_id: 'p3', material_id: 'm7', quantity: 0.002 },
  { product_id: 'p3', material_id: 'm10', quantity: 0.001 },

  // Hộp giấy cao cấp
  { product_id: 'p4', material_id: 'm3', quantity: 0.3 },
  { product_id: 'p4', material_id: 'm4', quantity: 0.2 },
  { product_id: 'p4', material_id: 'm5', quantity: 0.004 },
  { product_id: 'p4', material_id: 'm7', quantity: 0.002 },
  { product_id: 'p4', material_id: 'm9', quantity: 0.01 },

  // Danh thiếp 2 mặt
  { product_id: 'p5', material_id: 'm3', quantity: 0.02 },
  { product_id: 'p5', material_id: 'm5', quantity: 0.001 },
  { product_id: 'p5', material_id: 'm7', quantity: 0.0005 },
]

const initialInventory: Inventory[] = [
  { material_id: 'm1', on_hand: 500, reserved: 0 },
  { material_id: 'm2', on_hand: 1000, reserved: 0 },
  { material_id: 'm3', on_hand: 20, reserved: 0 },
  { material_id: 'm4', on_hand: 50, reserved: 0 },
  { material_id: 'm5', on_hand: 100, reserved: 0 },
  { material_id: 'm6', on_hand: 150, reserved: 0 },
  { material_id: 'm7', on_hand: 100, reserved: 0 },
  { material_id: 'm8', on_hand: 50, reserved: 0 },
  { material_id: 'm9', on_hand: 200, reserved: 0 },
  { material_id: 'm10', on_hand: 50, reserved: 0 },
]

// Initial sample data for demonstration
const getInitialOrders = (): Order[] => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const in3Days = new Date(now)
  in3Days.setDate(in3Days.getDate() + 3)

  const in5Days = new Date(now)
  in5Days.setDate(in5Days.getDate() + 5)

  const in7Days = new Date(now)
  in7Days.setDate(in7Days.getDate() + 7)

  const in10Days = new Date(now)
  in10Days.setDate(in10Days.getDate() + 10)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const addDays = (days: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  return [
    // --- 3 ĐƠN HÀNG DEMO CHO KHÁCH (SĐT: 0123456789) ---
    {
      id: 'ORD-DEMO-001',
      product_id: 'p4',
      product_name: 'Hộp giấy Kraft Vintage',
      quantity: 500,
      delivery_date: addDays(7),
      customer_name: 'Khách Hàng Demo',
      customer_phone: '0123456789', // Số điện thoại test
      status: 'pending',
      process_status: 'pending_consultant', // Trạng thái: Chờ tư vấn
      created_at: new Date().toISOString(), // Vừa đặt
      note: 'Gói hàng kỹ giúp mình nhé.',
      specs: {
        width: 15,
        height: 10,
        length: 5,
        paper_id: 'Giấy Kraft',
        colors: ['#8B4513'],
        processing: [],
      },
    },
    {
      id: 'ORD-DEMO-002',
      product_id: 'p1',
      product_name: 'Catalogue Giới Thiệu (A4)',
      quantity: 200,
      delivery_date: addDays(5),
      customer_name: 'Khách Hàng Demo',
      customer_phone: '0123456789',
      status: 'in_production',
      process_status: 'manager_approved', // Trạng thái: Đang in ấn
      created_at: addDays(-2), // Đặt cách đây 2 ngày
      final_price: 3500000, // Đã có giá
      specs: {
        width: 21,
        height: 29,
        length: 0,
        paper_id: 'Giấy Couche 150',
        colors: ['#000000', '#FF0000'],
        processing: ['Cán màng mờ', 'Đóng ghim giữa'],
      },
    },
    {
      id: 'ORD-DEMO-003',
      product_id: 'p5',
      product_name: 'Card Visit (5 hộp)',
      quantity: 500,
      delivery_date: addDays(-1),
      customer_name: 'Khách Hàng Demo',
      customer_phone: '0123456789',
      status: 'completed',
      process_status: 'manager_approved', // Trạng thái: Hoàn thành
      created_at: addDays(-10), // Đặt cách đây 10 ngày
      final_price: 450000,
      contract_file: 'HD-0123456789.pdf', // Có hợp đồng
      specs: {
        width: 9,
        height: 5,
        length: 0,
        paper_id: 'Giấy C300',
        colors: ['#0000FF'],
        processing: ['Cán màng bóng'],
      },
    },
    {
      id: 'ord-sample-1',
      product_id: 'p1',
      quantity: 10000,
      delivery_date: in7Days.toISOString().split('T')[0],
      customer_name: 'Công ty TNHH Bất động sản Vinhomes',
      status: 'in_production',
      process_status: 'manager_approved',
      can_fulfill: true,
      created_at: yesterday.toISOString(),
    },
    {
      id: 'ord-sample-2',
      product_id: 'p2',
      quantity: 5000,
      delivery_date: in10Days.toISOString().split('T')[0],
      customer_name: 'Tập đoàn FPT',
      status: 'scheduled',
      process_status: 'manager_approved',
      can_fulfill: true,
      created_at: yesterday.toISOString(),
    },
    {
      id: 'ord-sample-3',
      product_id: 'p3',
      quantity: 2000,
      delivery_date: in5Days.toISOString().split('T')[0],
      customer_name: 'Ngân hàng Vietcombank',
      status: 'pending',
      process_status: 'manager_approved',
      can_fulfill: false,
      missing_materials: [{ material_id: 'm2', needed: 400, available: 200 }],
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'ord-sample-4',
      product_id: 'p5',
      quantity: 5000,
      delivery_date: in3Days.toISOString().split('T')[0],
      customer_name: 'Công ty Luật TNHH Minh Khuê',
      status: 'completed',
      process_status: 'manager_approved',
      can_fulfill: true,
      created_at: new Date(
        now.getTime() - 5 * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
    {
      id: 'ord-sample-5',
      product_id: 'p4',
      quantity: 1500,
      delivery_date: in5Days.toISOString().split('T')[0],
      customer_name: 'Công ty CP Mỹ phẩm Cocoon',
      status: 'pending',
      process_status: 'manager_approved',
      can_fulfill: true,
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'ord-sample-6',
      product_id: 'p2',
      quantity: 3000,
      delivery_date: in7Days.toISOString().split('T')[0],
      customer_name: 'Khách sạn Sheraton Saigon',
      status: 'pending',
      process_status: 'manager_approved',
      can_fulfill: true,
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

const getInitialPurchaseRequests = (): PurchaseRequest[] => {
  const now = new Date()
  return [
    {
      id: 'pr-sample-1',
      order_id: 'ord-sample-3',
      material_id: 'm5',
      quantity_needed: 10,
      status: 'pending',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pr-sample-5',
      order_id: 'ord-sample-7',
      material_id: 'm6',
      quantity_needed: 10,
      status: 'pending',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pr-sample-6',
      order_id: 'ord-sample-7',
      material_id: 'm4',
      quantity_needed: 80,
      status: 'pending',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pr-sample-2',
      order_id: 'ord-sample-6',
      material_id: 'm4',
      quantity_needed: 80,
      status: 'ordered',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pr-sample-3',
      order_id: 'ord-sample-7',
      material_id: 'm5',
      quantity_needed: 150,
      status: 'ordered',
      created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pr-sample-4',
      order_id: 'ord-sample-8',
      material_id: 'm2',
      quantity_needed: 500,
      status: 'received',
      created_at: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

const getInitialPurchaseOrders = (): PurchaseOrder[] => {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const in2Days = new Date(now)
  in2Days.setDate(in2Days.getDate() + 2)

  return [
    {
      id: 'po-sample-0',
      pr_id: 'pr-sample-1',
      supplier: 'Công ty TNHH Giấy Sài Gòn',
      expected_delivery_date: tomorrow.toISOString().split('T')[0],
      status: 'ordered',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'po-sample-1',
      pr_id: 'pr-sample-2',
      supplier: 'Công ty TNHH Giấy Sài Gòn',
      expected_delivery_date: tomorrow.toISOString().split('T')[0],
      status: 'ordered',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'po-sample-2',
      pr_id: 'pr-sample-3',
      supplier: 'Công ty CP Mực in Đông Dương',
      expected_delivery_date: in2Days.toISOString().split('T')[0],
      status: 'ordered',
      created_at: new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'po-sample-3',
      pr_id: 'pr-sample-4',
      supplier: 'Nhà máy Giấy Long An',
      expected_delivery_date: new Date(now.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      status: 'delivered',
      created_at: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
    },
  ]
}

const getInitialProductionSchedules = (): ProductionSchedule[] => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const in3Days = new Date(now)
  in3Days.setDate(in3Days.getDate() + 3)

  const in5Days = new Date(now)
  in5Days.setDate(in5Days.getDate() + 5)

  const in8Days = new Date(now)
  in8Days.setDate(in8Days.getDate() + 8)

  return [
    {
      id: 'sch-sample-1',
      order_id: 'ord-sample-1',
      start_date: yesterday.toISOString().split('T')[0],
      end_date: in3Days.toISOString().split('T')[0],
      status: 'in_progress',
      stages: productionStagesList.map((stage) => ({
        id: stage.id,
        name: stage.name,
        status:
          stage.id === 'ralo' || stage.id === 'cut'
            ? 'completed'
            : stage.id === 'print'
            ? 'in_progress'
            : 'pending',
        start_date:
          stage.id === 'ralo'
            ? yesterday.toISOString().split('T')[0]
            : undefined,
        end_date: stage.id === 'ralo' ? today : undefined,
      })),
    },
    {
      id: 'sch-sample-2',
      order_id: 'ord-sample-2',
      start_date: tomorrow.toISOString().split('T')[0],
      end_date: in3Days.toISOString().split('T')[0],
      status: 'scheduled',
      current_stage: 'ralo',
      stages: productionStagesList.map((stage) => ({
        id: stage.id,
        name: stage.name,
        status: 'pending',
      })),
    },
  ]
}

const getInitialInventory = (): Inventory[] => {
  return [
    { material_id: 'm1', on_hand: 500, reserved: 300 },
    { material_id: 'm2', on_hand: 1000, reserved: 400 },
    { material_id: 'm3', on_hand: 20, reserved: 10 },
    { material_id: 'm4', on_hand: 50, reserved: 0 },
    { material_id: 'm5', on_hand: 100, reserved: 250 },
    { material_id: 'm6', on_hand: 150, reserved: 150 },
    { material_id: 'm7', on_hand: 100, reserved: 50 },
    { material_id: 'm8', on_hand: 50, reserved: 0 },
    { material_id: 'm9', on_hand: 200, reserved: 100 },
    { material_id: 'm10', on_hand: 50, reserved: 0 },
  ]
}

export function ProductionProvider({ children }: { children: ReactNode }) {
  const [products] = useState<Product[]>(initialProducts)
  const [materials] = useState<Material[]>(initialMaterials)
  const [bom] = useState<BOMItem[]>(initialBOM)
  const [orders, setOrders] = useState<Order[]>(getInitialOrders())
  const [inventory, setInventory] = useState<Inventory[]>(getInitialInventory())
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>(
    getInitialPurchaseRequests()
  )
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(
    getInitialPurchaseOrders()
  )
  const [productionSchedules, setProductionSchedules] = useState<
    ProductionSchedule[]
  >(getInitialProductionSchedules())
  const [currentProductionLoad] = useState<number>(90) //thay đổi chỗ này nếu muốn thử test case xưởng rảnh
  const isBusy = currentProductionLoad > 80 //Xưởng bận khi >80%

  const addOrder = (
    orderData: Omit<
      Order,
      'id' | 'status' | 'created_at' | 'process_status'
    > & { process_status?: Order['process_status'] }
  ): string => {
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      process_status: orderData.process_status || 'pending_consultant',
      created_at: new Date().toISOString(),
    }
    setOrders((prev) => [...prev, newOrder])
    return newOrder.id
  }

  const updateOrder = (id: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, ...updates } : order))
    )
  }

  const checkOrderFulfillment = (orderId: string): boolean => {
    const order = orders.find((o) => o.id === orderId)
    if (!order) return false

    // Bước 2: Phân rã BOM
    const bomItems = bom.filter((b) => b.product_id === order.product_id)
    const materialNeeds = bomItems.map((b) => ({
      material_id: b.material_id,
      needed: b.quantity * order.quantity,
    }))

    // Bước 3: Kiểm tra tồn kho
    const missingMaterials: {
      material_id: string
      needed: number
      available: number
    }[] = []
    let canFulfill = true

    materialNeeds.forEach((need) => {
      const inv = inventory.find((i) => i.material_id === need.material_id)
      const available = inv ? inv.on_hand - inv.reserved : 0

      if (available < need.needed) {
        canFulfill = false
        missingMaterials.push({
          material_id: need.material_id,
          needed: need.needed,
          available,
        })
      }
    })

    // Cập nhật trạng thái đơn hàng
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              can_fulfill: canFulfill,
              missing_materials: missingMaterials,
            }
          : o
      )
    )

    return canFulfill
  }

  const createPurchaseRequest = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (
      !order ||
      !order.missing_materials ||
      order.missing_materials.length === 0
    )
      return

    const newPRs = order.missing_materials.map((mm) => ({
      id: `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order_id: orderId,
      material_id: mm.material_id,
      quantity_needed: mm.needed - mm.available,
      status: 'pending' as const,
      created_at: new Date().toISOString(),
    }))

    setPurchaseRequests((prev) => [...prev, ...newPRs])
  }

  const createPurchaseOrder = (
    prId: string,
    supplier: string,
    deliveryDate: string
  ) => {
    const pr = purchaseRequests.find((p) => p.id === prId)
    if (!pr) return

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pr_id: prId,
      supplier,
      expected_delivery_date: deliveryDate,
      status: 'ordered',
      created_at: new Date().toISOString(),
    }

    setPurchaseOrders((prev) => [...prev, newPO])
    setPurchaseRequests((prev) =>
      prev.map((p) =>
        p.id === prId ? { ...p, status: 'ordered' as const } : p
      )
    )
  }

  const receiveInventory = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId)
    if (!po) return

    const pr = purchaseRequests.find((p) => p.id === po.pr_id)
    if (!pr) return

    // Cập nhật tồn kho
    setInventory((prev) =>
      prev.map((inv) =>
        inv.material_id === pr.material_id
          ? { ...inv, on_hand: inv.on_hand + pr.quantity_needed }
          : inv
      )
    )

    // Cập nhật trạng thái PO và PR
    setPurchaseOrders((prev) =>
      prev.map((p) =>
        p.id === poId ? { ...p, status: 'delivered' as const } : p
      )
    )
    setPurchaseRequests((prev) =>
      prev.map((p) =>
        p.id === po.pr_id ? { ...p, status: 'received' as const } : p
      )
    )
  }

  const updateProductionStage = (scheduleId: string, stage: string) => {
    setProductionSchedules((prev) =>
      prev.map((schedule) => {
        if (schedule.id === scheduleId) {
          const updatedStages = schedule.stages?.map((s) => {
            if (s.id === stage) {
              return {
                ...s,
                status: 'in_progress' as const,
                start_date: new Date().toISOString().split('T')[0],
              }
            } else if (s.id === schedule.current_stage) {
              return {
                ...s,
                status: 'completed' as const,
                end_date: new Date().toISOString().split('T')[0],
              }
            }
            return s
          })

          return {
            ...schedule,
            current_stage: stage,
            stages: updatedStages,
          }
        }
        return schedule
      })
    )
  }

  const getProductionStages = (orderId: string): ProductionStage[] => {
    const schedule = productionSchedules.find((s) => s.order_id === orderId)
    if (!schedule?.stages) {
      // Trả về stages mặc định nếu chưa có
      return productionStagesList.map((stage) => ({
        id: stage.id,
        name: stage.name,
        status: 'pending' as const,
      }))
    }
    return schedule.stages
  }

  const scheduleProduction = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || !order.can_fulfill) return

    const product = products.find((p) => p.id === order.product_id)
    if (!product) return

    // Tính toán thời gian sản xuất
    const productionDays = Math.ceil(order.quantity / product.production_rate)
    const deliveryDate = new Date(order.delivery_date)
    const startDate = new Date(deliveryDate)
    startDate.setDate(startDate.getDate() - productionDays - 1) // Buffer 1 ngày

    const newSchedule: ProductionSchedule = {
      id: `sch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order_id: orderId,
      start_date: startDate.toISOString().split('T')[0],
      end_date: new Date(deliveryDate.getTime() - 86400000)
        .toISOString()
        .split('T')[0], // 1 ngày trước giao
      status: 'scheduled',
    }

    setProductionSchedules((prev) => [...prev, newSchedule])
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: 'scheduled' as const } : o
      )
    )

    // Dự trữ nguyên vật liệu
    const bomItems = bom.filter((b) => b.product_id === order.product_id)
    bomItems.forEach((bomItem) => {
      const needed = bomItem.quantity * order.quantity
      setInventory((prev) =>
        prev.map((inv) =>
          inv.material_id === bomItem.material_id
            ? { ...inv, reserved: inv.reserved + needed }
            : inv
        )
      )
    })
  }

  const startProduction = (scheduleId: string) => {
    setProductionSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId ? { ...s, status: 'in_progress' as const } : s
      )
    )

    const schedule = productionSchedules.find((s) => s.id === scheduleId)
    if (schedule) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === schedule.order_id
            ? { ...o, status: 'in_production' as const }
            : o
        )
      )
    }
  }

  const completeProduction = (scheduleId: string) => {
    const schedule = productionSchedules.find((s) => s.id === scheduleId)
    if (!schedule) return

    const order = orders.find((o) => o.id === schedule.order_id)
    if (!order) return

    // Đánh dấu tất cả stages là completed
    setProductionSchedules((prev) =>
      prev.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              status: 'completed' as const,
              stages: s.stages?.map((stage) => ({
                ...stage,
                status: 'completed' as const,
                end_date:
                  stage.end_date || new Date().toISOString().split('T')[0],
              })),
            }
          : s
      )
    )

    // Trừ nguyên vật liệu đã dự trữ
    const bomItems = bom.filter((b) => b.product_id === order.product_id)
    bomItems.forEach((bomItem) => {
      const needed = bomItem.quantity * order.quantity
      setInventory((prev) =>
        prev.map((inv) =>
          inv.material_id === bomItem.material_id
            ? {
                ...inv,
                on_hand: inv.on_hand - needed,
                reserved: inv.reserved - needed,
              }
            : inv
        )
      )
    })

    setOrders((prev) =>
      prev.map((o) =>
        o.id === schedule.order_id ? { ...o, status: 'completed' as const } : o
      )
    )
  }

  const updateInventory = (
    materialId: string,
    onHand: number,
    reserved: number
  ) => {
    setInventory((prev) =>
      prev.map((inv) =>
        inv.material_id === materialId
          ? { ...inv, on_hand: onHand, reserved }
          : inv
      )
    )
  }

  const getStageMaterialsInfo = (orderId: string, stageId: string) => {
    // Trả về mảng rỗng hoặc dữ liệu mẫu
    return []
  }

  const checkStageMaterials = (orderId: string, stageId: string) => {
    // Trả về true/false giả lập
    return true
  }

  return (
    <ProductionContext.Provider
      value={{
        products,
        materials,
        bom,
        orders,
        inventory,
        purchaseRequests,
        purchaseOrders,
        productionSchedules,
        currentProductionLoad,
        isBusy,
        addOrder,
        checkOrderFulfillment,
        createPurchaseRequest,
        createPurchaseOrder,
        receiveInventory,
        scheduleProduction,
        startProduction,
        completeProduction,
        updateInventory,
        updateProductionStage,
        getProductionStages,
        getStageMaterialsInfo,
        checkStageMaterials,
        updateOrder,
      }}
    >
      {children}
    </ProductionContext.Provider>
  )
}

export function useProduction() {
  const context = useContext(ProductionContext)
  if (!context) {
    throw new Error('useProduction must be used within ProductionProvider')
  }
  return context
}
