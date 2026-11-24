import { redirect } from "next/navigation";

// Phiếu phản biện được giao nằm chung trang "Được mời phản biện"; giữ đường dẫn cũ cho liên kết đã gửi.
export default function MyReviewsPage() {
  redirect("/invitation-to-review");
}
