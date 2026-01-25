"use client";
import Masonry from "@/components/Bits/Masonry";
import ZaloChat from "@/components/ZaloChatProps/ZaloChatProps";
import { useRouter } from "next/navigation";

const data = [
  {
    id: 1,
    image: "/assets/images/sk.jpg",
    label: "HỘP GIẤY CARTON CAO CẤP",
    height: 200,
  },

  {
    id: 3,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "HỘP NGÀNH HÀNG DƯỢC PHẨM",
    height: 200,
  },
  {
    id: 4,
    image: "/assets/images/danh-thiep.jpg",
    label: "HỘP NGÀNH HÀNG F&B",
    height: 200,
  },

  {
    id: 5,
    image: "/assets/images/thiep-cuoi.jpg",
    label: "HỘP NGÀNH HÀNG MỸ PHẨM CAO CẤP",
    height: 200,
  },
  {
    id: 6,
    image: "/assets/images/catalogue_2.jpg",
    label: "TÚI GIẤY - HỘP BÁNH TRUNG THU",
    height: 200,
  },
  {
    id: 7,
    image: "/assets/images/to-roi.jpg",
    label: "TÚI QUÀ TẶNG",
    height: 200,
  },
  // {
  //   id: 8,
  //   image: "/assets/images/poster.jpg",
  //   label: "Áp phích",
  //   height: 200,
  // },
  // {
  //   id: 9,
  //   image: "/assets/images/nhan-mac.png",
  //   label: "Nhãn mác",
  //   height: 200,
  // },
  // {
  //   id: 10,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Bao bì sản phẩm",
  //   height: 200,
  // },
  // {
  //   id: 11,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Decal dán",
  //   height: 200,
  // },
  // {
  //   id: 12,
  //   image: "/assets/images/menu.jpg",
  //   label: "Menu quán ăn",
  //   height: 200,
  // },
  // {
  //   id: 13,
  //   image: "/assets/images/tai-lieu.jpg",
  //   label: "Tài liệu",
  //   height: 200,
  // },
  // {
  //   id: 14,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Văn phòng phẩm",
  //   height: 200,
  // },
  // {
  //   id: 15,
  //   image: "/assets/images/lich.jpg",
  //   label: "Lịch Tết",
  //   height: 200,
  // },
  // {
  //   id: 16,
  //   image: "/assets/images/lixi.jpg",
  //   label: "Bao lì xì",
  //   height: 200,
  // },
  // {
  //   id: 17,
  //   image: "/assets/images/tui-giay-kraft.jpg",
  //   label: "Túi giấy",
  //   height: 200,
  // },
  // {
  //   id: 18,
  //   image: "/assets/images/hoa-don-ban-le.jpg",
  //   label: "Hóa đơn, phiếu thu",
  //   height: 200,
  // },
  // {
  //   id: 19,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "Giấy khen, bằng cấp",
  //   height: 200,
  // },
  // {
  //   id: 20,
  //   image: "/assets/images/voucher.jpg",
  //   label: "Voucher quà tặng",
  //   height: 200,
  // },
  // {
  //   id: 2,
  //   image: "/assets/images/ky-thuat-in-an.jpg",
  //   label: "In nhanh gia công",
  //   height: 200,
  // },
];

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="bg-gray-100 ">
      <section className="relative  min-h-[600px] md:min-h-auto bg-linear-to-b from-gray-900 to-gray-100 py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-primary-light mb-4 uppercase">
            Công Ty TNHH Thương Mại Và Dịch Vụ In & Bao Bì Đại Phúc Hải
          </h2>
          <p className="text-lg text-gray-200 max-w-5xl mx-auto">
            Chúng tôi chuyên cung cấp giải pháp bao bì giấy trọn gói từ thiết kế, in ấn đến hoàn thiện sản phẩm theo tiêu chuẩn ISO và quốc tế. Với hơn 14 năm kinh nghiệm, nhà máy 3.000m² được trang bị dây chuyền hiện đại từ Đức, Nhật Bản, Đài Loan, Trung Quốc, HAFAS tự hào mang đến những bao bì sáng tạo, chất lượng cao, thân thiện với môi trường, giúp doanh nghiệp khẳng định thương hiệu và chinh phục thị trường trong nước lẫn quốc tế
          </p>
          <div>
            <button
              className="mt-2 bg-primary-light px-4 py-2 rounded-md text-secondary uppercase hover:bg-primary hover:text-accent border border-gray-200 transition-all"
              onClick={() => router.push("/order")}
            >
              Đặt In Nhanh{" "}
            </button>
          </div>

          {/* divider */}
          <div className="w-full h-[1px] bg-gray-200 my-8"></div>

          {/*   Sản phẩm của chúng tôi */}
          <div className="">
            <h2 className="text-2xl font-bold text-primary-light mb-4 uppercase">
              Sản phẩm của chúng tôi
            </h2>
            <Masonry data={data} />
          </div>


        </div>
        <div
          className="
      pointer-events-none
      absolute inset-0
      bg-[radial-gradient(#0000001a_1px,transparent_1px)]
      bg-size-[16px_16px]
      mask-[radial-gradient(circle_80%_at_50%_50%,#000_70%,transparent_110%)]
      z-0
    "
        />
      </section>
      <main className="">
        {/* <Banner /> */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 max-w-7xl 2xl:max-w-screen-2xl">
          <div className="py-8"> </div>
        </div>
      </main>
      <ZaloChat />
    </div>
  );
}
