"use client";
import Masonry from "@/components/Bits/Masonry";
import { Button, Space } from "antd";
import { useRouter } from "next/navigation";
import { BiCalendar, BiShoppingBag } from "react-icons/bi";

const data = [
  {
    id: 1,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "In ấn cho sự kiện",
    height: 300,
  },
  {
    id: 2,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "In nhanh gia công",
    height: 300,
  },
  {
    id: 3,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Thiệp cưới",
    height: 300,
  },
  { id: 4, image: "/assets/images/ky-thuat-in-an.jpg", label: "Danh thiếp", height: 300 },

  {
    id: 5,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Thiệp mời",
    height: 300,
  },
  {
    id: 6,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Catalogue",
    height: 300,
  },
  {
    id: 7,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Tờ rơi",
    height: 300,
  },
  { id: 8, image: "/assets/images/ky-thuat-in-an.jpg", label: "Poster", height: 300 },
  { id: 9, image: "/assets/images/ky-thuat-in-an.jpg", label: "Nhãn mác", height: 300 },
  {
    id: 10,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Bao bì sản phẩm",
    height: 300,
  },
  {
    id: 11,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Decal dán",
    height: 300,
  },
  {
    id: 12,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Menu quán ăn",
    height: 300,
  },
  { id: 13, image: "/assets/images/ky-thuat-in-an.jpg", label: "Sách báo", height: 300 },
  {
    id: 14,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Văn phòng phẩm",
    height: 300,
  },
  { id: 15, image: "/assets/images/ky-thuat-in-an.jpg", label: "Lịch Tết", height: 300 },
  {
    id: 16,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Bao lì xì",
    height: 300,
  },
  {
    id: 17,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "túi giấy",
    height: 300,
  },
  {
    id: 18,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Hóa đơn, phiếu thu",
    height: 300,
  },
  {
    id: 19,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Giấy khen, bằng cấp",
    height: 300,
  },
  {
    id: 20,
    image: "/assets/images/ky-thuat-in-an.jpg",
    label: "Voucher quà tặng",
    height: 300,
  },
];

export default function HomePage() {
  const router = useRouter();
  return (
    <div className="bg-gray-100 ">
      <section className="relative  min-h-[600px] md:min-h-auto bg-linear-to-b from-gray-900 to-gray-100 py-20 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-white mb-4 uppercase">
            Công ty cổ phần In Ấn  
          </h2>
          <p className="text-lg text-gray-200 max-w-2xl mx-auto">
            Chúng tôi cung cấp dịch vụ in ấn chuyên nghiệp với công nghệ hiện
            đại, đáp ứng mọi nhu cầu in ấn của bạn từ cá nhân đến doanh nghiệp.
            Đảm bảo mang đến cho bạn những sản phẩm in ấn sắc nét, bền đẹp và
            đúng tiến độ.
          </p>

          <div className="pt-8">
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

          {/* <div className="pb-8">
            <HotDeal category="Sản phẩm mới về" />
          </div> */}
        </div>
      </main>
    </div>
  );
}
