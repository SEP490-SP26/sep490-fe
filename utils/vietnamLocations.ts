// Vietnam Provinces and Districts Data (2024)
// Source: https://danhmuchanhchinh.gso.gov.vn/

export interface District {
    code: string;
    name: string;
}

export interface Province {
    code: string;
    name: string;
    districts: District[];
}

export const VIETNAM_PROVINCES: Province[] = [
    {
        code: "HN",
        name: "Hà Nội",
        districts: [
            { code: "HN-001", name: "Quận Ba Đình" },
            { code: "HN-002", name: "Quận Hoàn Kiếm" },
            { code: "HN-003", name: "Quận Tây Hồ" },
            { code: "HN-004", name: "Quận Long Biên" },
            { code: "HN-005", name: "Quận Cầu Giấy" },
            { code: "HN-006", name: "Quận Đống Đa" },
            { code: "HN-007", name: "Quận Hai Bà Trưng" },
            { code: "HN-008", name: "Quận Hoàng Mai" },
            { code: "HN-009", name: "Quận Thanh Xuân" },
            { code: "HN-010", name: "Quận Nam Từ Liêm" },
            { code: "HN-011", name: "Quận Bắc Từ Liêm" },
            { code: "HN-012", name: "Quận Hà Đông" },
            { code: "HN-013", name: "Huyện Đông Anh" },
            { code: "HN-014", name: "Huyện Gia Lâm" },
            { code: "HN-015", name: "Huyện Thanh Trì" },
            { code: "HN-016", name: "Huyện Hoài Đức" },
            { code: "HN-017", name: "Thị xã Sơn Tây" },
        ],
    },
    {
        code: "HCM",
        name: "TP. Hồ Chí Minh",
        districts: [
            { code: "HCM-001", name: "Quận 1" },
            { code: "HCM-002", name: "Quận 3" },
            { code: "HCM-003", name: "Quận 4" },
            { code: "HCM-004", name: "Quận 5" },
            { code: "HCM-005", name: "Quận 6" },
            { code: "HCM-006", name: "Quận 7" },
            { code: "HCM-007", name: "Quận 8" },
            { code: "HCM-008", name: "Quận 10" },
            { code: "HCM-009", name: "Quận 11" },
            { code: "HCM-010", name: "Quận 12" },
            { code: "HCM-011", name: "Quận Bình Thạnh" },
            { code: "HCM-012", name: "Quận Tân Bình" },
            { code: "HCM-013", name: "Quận Tân Phú" },
            { code: "HCM-014", name: "Quận Phú Nhuận" },
            { code: "HCM-015", name: "Quận Gò Vấp" },
            { code: "HCM-016", name: "Quận Bình Tân" },
            { code: "HCM-017", name: "TP. Thủ Đức" },
            { code: "HCM-018", name: "Huyện Củ Chi" },
            { code: "HCM-019", name: "Huyện Hóc Môn" },
            { code: "HCM-020", name: "Huyện Bình Chánh" },
            { code: "HCM-021", name: "Huyện Nhà Bè" },
            { code: "HCM-022", name: "Huyện Cần Giờ" },
        ],
    },
    {
        code: "DN",
        name: "Đà Nẵng",
        districts: [
            { code: "DN-001", name: "Quận Hải Châu" },
            { code: "DN-002", name: "Quận Thanh Khê" },
            { code: "DN-003", name: "Quận Sơn Trà" },
            { code: "DN-004", name: "Quận Ngũ Hành Sơn" },
            { code: "DN-005", name: "Quận Liên Chiểu" },
            { code: "DN-006", name: "Quận Cẩm Lệ" },
            { code: "DN-007", name: "Huyện Hòa Vang" },
            { code: "DN-008", name: "Huyện Hoàng Sa" },
        ],
    },
    {
        code: "HP",
        name: "Hải Phòng",
        districts: [
            { code: "HP-001", name: "Quận Hồng Bàng" },
            { code: "HP-002", name: "Quận Ngô Quyền" },
            { code: "HP-003", name: "Quận Lê Chân" },
            { code: "HP-004", name: "Quận Hải An" },
            { code: "HP-005", name: "Quận Kiến An" },
            { code: "HP-006", name: "Quận Đồ Sơn" },
            { code: "HP-007", name: "Quận Dương Kinh" },
            { code: "HP-008", name: "Huyện Thủy Nguyên" },
            { code: "HP-009", name: "Huyện An Dương" },
            { code: "HP-010", name: "Huyện An Lão" },
        ],
    },
    {
        code: "CT",
        name: "Cần Thơ",
        districts: [
            { code: "CT-001", name: "Quận Ninh Kiều" },
            { code: "CT-002", name: "Quận Ô Môn" },
            { code: "CT-003", name: "Quận Bình Thủy" },
            { code: "CT-004", name: "Quận Cái Răng" },
            { code: "CT-005", name: "Quận Thốt Nốt" },
            { code: "CT-006", name: "Huyện Vĩnh Thạnh" },
            { code: "CT-007", name: "Huyện Cờ Đỏ" },
            { code: "CT-008", name: "Huyện Phong Điền" },
            { code: "CT-009", name: "Huyện Thới Lai" },
        ],
    },
    {
        code: "BD",
        name: "Bình Dương",
        districts: [
            { code: "BD-001", name: "TP. Thủ Dầu Một" },
            { code: "BD-002", name: "TP. Dĩ An" },
            { code: "BD-003", name: "TP. Thuận An" },
            { code: "BD-004", name: "TP. Tân Uyên" },
            { code: "BD-005", name: "TP. Bến Cát" },
            { code: "BD-006", name: "Huyện Bàu Bàng" },
            { code: "BD-007", name: "Huyện Dầu Tiếng" },
            { code: "BD-008", name: "Huyện Bắc Tân Uyên" },
            { code: "BD-009", name: "Huyện Phú Giáo" },
        ],
    },
    {
        code: "DN2",
        name: "Đồng Nai",
        districts: [
            { code: "DN2-001", name: "TP. Biên Hòa" },
            { code: "DN2-002", name: "TP. Long Khánh" },
            { code: "DN2-003", name: "Huyện Tân Phú" },
            { code: "DN2-004", name: "Huyện Vĩnh Cửu" },
            { code: "DN2-005", name: "Huyện Định Quán" },
            { code: "DN2-006", name: "Huyện Trảng Bom" },
            { code: "DN2-007", name: "Huyện Thống Nhất" },
            { code: "DN2-008", name: "Huyện Cẩm Mỹ" },
            { code: "DN2-009", name: "Huyện Long Thành" },
            { code: "DN2-010", name: "Huyện Xuân Lộc" },
            { code: "DN2-011", name: "Huyện Nhơn Trạch" },
        ],
    },
    {
        code: "TTH",
        name: "Thừa Thiên Huế",
        districts: [
            { code: "TTH-001", name: "TP. Huế" },
            { code: "TTH-002", name: "Huyện Phong Điền" },
            { code: "TTH-003", name: "Huyện Quảng Điền" },
            { code: "TTH-004", name: "Huyện Phú Vang" },
            { code: "TTH-005", name: "TX. Hương Thủy" },
            { code: "TTH-006", name: "TX. Hương Trà" },
            { code: "TTH-007", name: "Huyện A Lưới" },
            { code: "TTH-008", name: "Huyện Nam Đông" },
            { code: "TTH-009", name: "Huyện Phú Lộc" },
        ],
    },
    {
        code: "KH",
        name: "Khánh Hòa",
        districts: [
            { code: "KH-001", name: "TP. Nha Trang" },
            { code: "KH-002", name: "TP. Cam Ranh" },
            { code: "KH-003", name: "TX. Ninh Hòa" },
            { code: "KH-004", name: "Huyện Vạn Ninh" },
            { code: "KH-005", name: "Huyện Diên Khánh" },
            { code: "KH-006", name: "Huyện Khánh Vĩnh" },
            { code: "KH-007", name: "Huyện Khánh Sơn" },
            { code: "KH-008", name: "Huyện Cam Lâm" },
            { code: "KH-009", name: "Huyện Trường Sa" },
        ],
    },
    {
        code: "LA",
        name: "Long An",
        districts: [
            { code: "LA-001", name: "TP. Tân An" },
            { code: "LA-002", name: "TX. Kiến Tường" },
            { code: "LA-003", name: "Huyện Tân Hưng" },
            { code: "LA-004", name: "Huyện Vĩnh Hưng" },
            { code: "LA-005", name: "Huyện Mộc Hóa" },
            { code: "LA-006", name: "Huyện Tân Thạnh" },
            { code: "LA-007", name: "Huyện Thạnh Hóa" },
            { code: "LA-008", name: "Huyện Đức Huệ" },
            { code: "LA-009", name: "Huyện Đức Hòa" },
            { code: "LA-010", name: "Huyện Bến Lức" },
            { code: "LA-011", name: "Huyện Thủ Thừa" },
            { code: "LA-012", name: "Huyện Tân Trụ" },
            { code: "LA-013", name: "Huyện Cần Đước" },
            { code: "LA-014", name: "Huyện Cần Giuộc" },
            { code: "LA-015", name: "Huyện Châu Thành" },
        ],
    },
];

// Helper function to get districts by province code
export const getDistrictsByProvince = (provinceCode: string): District[] => {
    const province = VIETNAM_PROVINCES.find((p) => p.code === provinceCode);
    return province?.districts || [];
};

// Helper to get province by code
export const getProvinceByCode = (code: string): Province | undefined => {
    return VIETNAM_PROVINCES.find((p) => p.code === code);
};

// Helper to get district by code
export const getDistrictByCode = (
    provinceCode: string,
    districtCode: string
): District | undefined => {
    const province = VIETNAM_PROVINCES.find((p) => p.code === provinceCode);
    return province?.districts.find((d) => d.code === districtCode);
};
