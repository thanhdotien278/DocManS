import Image from "next/image";

// Thanh đầu trang xanh dùng chung cho các trang công khai, cùng nhận diện với topbar sau đăng nhập.
export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="brand-mark"><Image src="/logo.png" alt="Học viện Quân y" width={42} height={43} priority /></div>
      <div>
        <strong>HỆ THỐNG QUẢN LÝ NGHIÊN CỨU KHOA HỌC, CÔNG NGHỆ VÀ ĐỔI MỚI SÁNG TẠO</strong>
        <span>Học viện Quân y</span>
      </div>
    </header>
  );
}
