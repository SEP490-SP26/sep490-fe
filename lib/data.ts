import { BiBook, BiCheckCircle, BiCog, BiCut, BiEdit, BiLayerPlus, BiPackage, BiPrinter, BiSolidZap, BiSun } from "react-icons/bi";
import {
  BsLayers,
  BsPrinter,
  BsScissors
} from "react-icons/bs";

export const productionStagesMock = [
  {
    id: "design",
    name: "Thiết kế & Prepress",
    icon: BiEdit,
    description: "Chuẩn bị file in, kiểm tra màu sắc, tách màu",
    duration: "1-2 ngày",
    requiredMaterials: ["Giấy mẫu", "File thiết kế", "Proof màu"]
  },
  {
    id: "preparation",
    name: "Chuẩn bị máy",
    icon: BiCog,
    description: "Cài đặt máy, chuẩn bị vật tư, test in",
    duration: "0.5-1 ngày",
    requiredMaterials: ["Mực in", "Bản kẽm", "Dung dịch làm ẩm"]
  },
  {
    id: "printing",
    name: "In ấn",
    icon: BiPrinter, 
    description: "In chính thức trên máy offset/digital",
    duration: "2-5 ngày",
    requiredMaterials: ["Giấy in", "Mực in CMYK", "Mực in Pantone", "Dung dịch"]
  },
  {
    id: "drying",
    name: "Sấy khô",
    icon: BiSun, 
    description: "Sấy khô mực, chuẩn bị cho công đoạn tiếp theo",
    duration: "0.5-1 ngày",
    requiredMaterials: []
  },
  {
    id: "lamination",
    name: "Cán màng",
    icon: BiLayerPlus, 
    description: "Cán màng bóng/mờ để bảo vệ bề mặt",
    duration: "1-2 ngày",
    requiredMaterials: ["Màng bóng/mờ", "Keo cán"]
  },
  {
    id: "cutting",
    name: "Cắt xén",
    icon: BiCut, 
    description: "Cắt thành phẩm theo kích thước yêu cầu",
    duration: "1-2 ngày",
    requiredMaterials: ["Dao cắt", "Khuôn dứt"]
  },
  {
    id: "finishing",
    name: "Gia công hoàn thiện",
    icon: BiPackage,
    description: "Bế, dán, gấp, đóng gáy",
    duration: "2-3 ngày",
    requiredMaterials: ["Keo dán", "Chỉ đóng", "Dây gáy"]
  },
  {
    id: "qc",
    name: "Kiểm tra chất lượng",
    icon: BiCheckCircle,
    description: "Kiểm tra màu sắc, kích thước, số lượng",
    duration: "0.5-1 ngày",
    requiredMaterials: []
  },
  {
    id: "packing",
    name: "Đóng gói & Giao hàng",
    icon: BiPackage,
    description: "Đóng gói và chuẩn bị giao hàng",
    duration: "1 ngày",
    requiredMaterials: ["Bao bì", "Băng keo", "Phiếu giao hàng"]
  }
];


export const stageStatusMock = {
  design: 'completed',
  preparation: 'completed',
  printing: 'in_progress',
  drying: 'pending',
  lamination: 'pending',
  cutting: 'pending',
  finishing: 'pending',
  qc: 'pending',
  packing: 'pending'
};

// Mock data cho stage materials
export const stageMaterialsMock = {
  printing: [
    { id: "mat-1", name: "Giấy Couche 150gsm", quantity: 500, unit: "tờ", hasEnough: true },
    { id: "mat-2", name: "Mực in CMYK", quantity: 2.5, unit: "lít", hasEnough: true },
    { id: "mat-3", name: "Mực Pantone 485C", quantity: 0.5, unit: "lít", hasEnough: false }
  ],
  lamination: [
    { id: "mat-4", name: "Màng bóng 25mic", quantity: 150, unit: "m²", hasEnough: true }
  ],
  cutting: [
    { id: "mat-5", name: "Dao cắt chuyên dụng", quantity: 1, unit: "bộ", hasEnough: true }
  ],
  finishing: [
    { id: "mat-6", name: "Keo dán sách", quantity: 2, unit: "kg", hasEnough: true },
    { id: "mat-7", name: "Chỉ đóng gáy", quantity: 5, unit: "cuộn", hasEnough: false }
  ]
};

// Mock data cho stage timeline
export const stageTimelineMock = {
  design: {
    start_date: "2024-01-15",
    end_date: "2024-01-16",
    assigned_worker: "Nguyễn Văn A"
  },
  preparation: {
    start_date: "2024-01-17",
    end_date: "2024-01-17",
    assigned_worker: "Trần Thị B"
  },
  printing: {
    start_date: "2024-01-18",
    end_date: null,
    assigned_worker: "Lê Văn C",
    machine: "Máy Offset Heidelberg SM74"
  }
};

// Dữ liệu dựa trên phiếu lệnh sản xuất
 export const productionProcess = [
    {
      id: "ralo",
      name: "Ralo",
      code: "25-557", 
      inputMaterials: [
        { name: "Giấy Duplex 350", quantity: 320, unit: "tờ", code: "VT00798" },
      ],
      outputMaterial: "Giấy đã ralo (300x90x230)mm",
      outputQuantity: 320,
      outputUnit: "tờ",
      note: "Khổ 1000, chặt 440",
    },
    {
      id: "cut",
      name: "Cắt",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã ralo", quantity: 320, unit: "tờ" }],
      outputMaterial: "Giấy đã cắt (300x90x230)mm",
      outputQuantity: 320,
      outputUnit: "tờ",
      note: "Cắt hớt 2 chiều 440 về 435",
    },
    {
      id: "print",
      name: "In",
      code: "25-557",
      inputMaterials: [
        { name: "Giấy đã cắt", quantity: 70, unit: "tờ" },
        { name: "Kẽm in", quantity: 4, unit: "bản", code: "VT007" },
        { name: "Mực các loại", quantity: 0.1, unit: "kg", code: "VT00433" },
      ],
      outputMaterial: "Giấy đã in (300x90x230)mm",
      outputQuantity: 70,
      outputUnit: "tờ",
    },
    {
      id: "laminate",
      name: "Cán màng",
      code: "25-557",
      inputMaterials: [
        { name: "Giấy đã in", quantity: 60, unit: "tờ" },
        {
          name: "Màng BÓNG nhiệt 1205",
          quantity: 0.42,
          unit: "kg",
          code: "VT00684",
          note: "mix khổ 480",
        },
      ],
      outputMaterial: "Giấy đã cán màng (300x90x230)mm",
      outputQuantity: 60,
      outputUnit: "tờ",
      note: "Màng Bóng",
    },
    {
      id: "corrugate",
      name: "Bồi sóng",
      code: "25-557",
      inputMaterials: [
        { name: "Giấy đã cán màng", quantity: 50, unit: "tờ" },
        { name: "Kéo phù bài", quantity: 0.08, unit: "kg", code: "VT00434" },
        {
          name: "Sóng E nâu",
          quantity: 60,
          unit: "tờ",
          code: "VTHT00106",
          note: "khổ 430 x dài 815mm",
        },
      ],
      outputMaterial: "Giấy đã bồi sóng (300x90x230)mm",
      outputQuantity: 50,
      outputUnit: "tờ",
      note: "Sóng mẫu HT",
    },
    {
      id: "crease",
      name: "Bể",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã bồi sóng", quantity: 40, unit: "tờ" }],
      outputMaterial: "Giấy đã bể (300x90x230)mm",
      outputQuantity: 40,
      outputUnit: "tờ",
    },
    {
      id: "diecut",
      name: "Dứt",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã bể", quantity: 40, unit: "tờ" }],
      outputMaterial: "Giấy đã dứt (300x90x230)mm",
      outputQuantity: 40,
      outputUnit: "tờ",
    },
    {
      id: "glue",
      name: "Dán",
      code: "25-557",
      inputMaterials: [{ name: "Giấy đã dứt", quantity: 30, unit: "tờ" }],
      outputMaterial: "Thành phẩm hoàn chỉnh",
      outputQuantity: 30,
      outputUnit: "chiếc",
      finalProduct: true,
    },
  ];

 export const productionStages = [
    {
      id: "ralo",
      name: "Ralo",
      icon: BsScissors,
      color: "bg-blue-100 text-blue-700",
    },
    {
      id: "cut",
      name: "Cắt",
      icon: BsScissors,
      color: "bg-purple-100 text-purple-700",
    },
    {
      id: "print",
      name: "In",
      icon: BsPrinter,
      color: "bg-green-100 text-green-700",
    },
    {
      id: "laminate",
      name: "Cán màng",
      icon: BsLayers,
      color: "bg-yellow-100 text-yellow-700",
    },
    {
      id: "corrugate",
      name: "Bồi sóng",
      icon: BiPackage,
      color: "bg-orange-100 text-orange-700",
    },
    {
      id: "crease",
      name: "Bể",
      icon: BiSolidZap,
      color: "bg-red-100 text-red-700",
    },
    {
      id: "diecut",
      name: "Dứt",
      icon: BsScissors,
      color: "bg-pink-100 text-pink-700",
    },
    {
      id: "glue",
      name: "Dán",
      icon: BiBook,
      color: "bg-indigo-100 text-indigo-700",
    },
  ];