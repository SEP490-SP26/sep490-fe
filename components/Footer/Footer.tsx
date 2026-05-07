import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-neutral-primary-soft rounded-base shadow-xs  border-default">
      <div className="w-full max-w-screen-xl mx-auto p-4 ">
        {/* <div className="sm:flex sm:items-center sm:justify-between">
          <a href="/" className="flex items-center  sm:mb-0  rtl:space-x-reverse">
            <img src="/assets/images/logo_removed.png" className="h-16" alt="Logo" />
            <span className="text-heading self-center text-2xl font-semibold whitespace-nowrap">Đại Phúc Hải</span>
          </a>
          <ul className="flex flex-wrap items-center mb-2 text-sm font-medium text-body sm:mb-0">
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">About</a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">Privacy Policy</a>
            </li>
            <li>
              <a href="#" className="hover:underline me-4 md:me-6">Licensing</a>
            </li>
            <li>
              <a href="#" className="hover:underline">Contact</a>
            </li>
          </ul>
        </div> */}
        <hr className=" border-default sm:mx-auto lg:my-2" />
        <span className="block text-sm text-body sm:text-center">© 2026 <a href="/" className="hover:underline">Đại Phúc Hải™</a>. All Rights Reserved.</span>
      </div>
    </footer>


  );
}
