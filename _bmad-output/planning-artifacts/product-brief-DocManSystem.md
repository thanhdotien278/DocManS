---
title: "Product Brief: DocManSystem"
status: "complete"
created: "2026-04-27T22:09:54+0700"
updated: "2026-04-27T22:15:41+0700"
inputs:
  - "/Users/Super/DocManS/requirements.md"
  - "/Users/Super/DocManS/docs/ux-design-guidelines.md"
---

# Product Brief: Research Topic Management System (RTMS)

## Executive Summary

Phòng Khoa học quân sự của Học viện Quân y hiện quản lý đề tài nghiên cứu bằng tập hợp rời rạc của Excel, email, file đính kèm và trao đổi thủ công. Cách làm này khiến hồ sơ dễ thiếu sót, trạng thái xử lý thiếu minh bạch, các mốc công việc khó kiểm soát và việc tổng hợp báo cáo điều hành mất nhiều thời gian. Khi số lượng đề tài, hồ sơ và bên liên quan tăng lên, chi phí vận hành của mô hình thủ công tăng nhanh, trong khi rủi ro chậm xử lý và bỏ sót trách nhiệm cũng tăng theo.

RTMS là hệ thống quản lý đề tài nghiên cứu cấp trường được xây mới để số hóa toàn bộ vòng đời đề tài trên một nền tảng thống nhất. Phiên bản đầu tập trung vào ba nhóm người dùng chính của MVP: chuyên viên quản lý khoa học, lãnh đạo và chủ nhiệm đề tài, đồng thời hỗ trợ trực tiếp reviewer hoặc hội đồng trong luồng đánh giá. Hệ thống giúp chuẩn hóa tiếp nhận và phê duyệt hồ sơ, theo dõi tiến độ đề tài sau khi được duyệt, quản lý công việc phát sinh và cung cấp dashboard điều hành theo vai trò.

RTMS đáng làm ngay bây giờ vì nhu cầu vận hành nội bộ đã vượt khả năng của quy trình thủ công và nhu cầu báo cáo điều hành ngày càng cấp thiết. Giai đoạn 1 sẽ được đánh giá thành công nếu hệ thống giúp giảm tỷ lệ hồ sơ thiếu sót và tăng rõ rệt khả năng nhìn thấy việc quá hạn, hồ sơ chờ xử lý và đề tài rủi ro.

## The Problem

Quy trình hiện tại phân tán trên nhiều công cụ không được thiết kế cho quản trị vòng đời đề tài. Chủ nhiệm đề tài khó biết hồ sơ của mình đang ở đâu và còn thiếu gì. Chuyên viên phải theo dõi thủ công đợt tiếp nhận, kiểm tra hồ sơ, phân công reviewer, nhắc bổ sung, tổng hợp kết quả và đôn đốc báo cáo định kỳ. Lãnh đạo chỉ nhìn thấy tình hình qua báo cáo tổng hợp chậm, thiếu trạng thái thời gian thực và khó khoanh vùng việc cần xử lý ngay.

Hệ quả của hiện trạng là hồ sơ thiếu giấy tờ hoặc nộp sai biểu mẫu, các bước đánh giá bị kéo dài vì thiếu nhắc việc và thiếu truy vết, đề tài chậm tiến độ không được phát hiện sớm, và báo cáo quản trị tốn công tổng hợp. Vấn đề không chỉ là bất tiện thao tác; đó là rủi ro vận hành, rủi ro trách nhiệm và giảm chất lượng điều hành nghiên cứu của học viện.

## The Solution

RTMS số hóa quy trình quản lý đề tài cấp trường từ đầu đến cuối trên một hệ thống nội bộ thống nhất. Trong MVP, hệ thống gồm bốn khối chính:

- Quản lý đề tài: quản lý đợt tiếp nhận, nộp hồ sơ, kiểm tra, yêu cầu bổ sung, đánh giá và phê duyệt.
- Theo dõi đề tài: quản lý tiến độ sau duyệt, báo cáo định kỳ, điều chỉnh, gia hạn, sản phẩm nghiên cứu và nghiệm thu.
- Quản lý giao việc: tạo, giao, nhắc và theo dõi công việc gắn với đề tài hoặc điều hành nội bộ.
- Dashboard điều hành: hiển thị việc cần xử lý, hồ sơ chờ duyệt, đề tài rủi ro, công việc quá hạn và các chỉ số tổng hợp theo vai trò.

Giải pháp này không chỉ lưu hồ sơ điện tử mà còn đưa trạng thái nghiệp vụ, trách nhiệm và lịch sử xử lý lên bề mặt để người dùng biết cần làm gì tiếp theo. Với chuyên viên, RTMS giảm gánh nặng đôn đốc và tổng hợp thủ công. Với lãnh đạo, RTMS biến dữ liệu phân tán thành khả năng giám sát và ra quyết định. Với chủ nhiệm đề tài, RTMS tạo một cửa sổ minh bạch để nộp hồ sơ, theo dõi phản hồi và cập nhật tiến độ.

## What Makes This Different

Điểm khác biệt của RTMS không nằm ở công nghệ nền tảng mà ở mức độ phù hợp với bối cảnh vận hành của Học viện Quân y. Hệ thống được định hướng như một nền tảng quản trị học thuật nội bộ, ưu tiên dữ liệu dày, quy trình rõ trạng thái, truy vết đầy đủ và dashboard theo vai trò thay vì trải nghiệm kiểu cổng công khai hoặc SaaS chung chung.

RTMS cũng có lợi thế từ việc được thiết kế ngay từ đầu quanh các nút đau thực tế của đơn vị triển khai đầu tiên: hồ sơ thiếu sót, việc quá hạn khó thấy, và báo cáo điều hành chậm. Nếu được triển khai đúng, giá trị ban đầu sẽ đến từ việc giảm sai sót và tăng khả năng kiểm soát, trước khi mở rộng sang tích hợp sâu hơn hay tự động hóa phức tạp hơn.

## Who This Serves

Người dùng chính trong MVP là:

- Chuyên viên quản lý khoa học: cần một hệ thống để điều phối tiếp nhận, đánh giá, theo dõi và tổng hợp báo cáo mà không phụ thuộc vào file rời rạc.
- Lãnh đạo đơn vị và ban quản lý: cần nhìn thấy việc chờ xử lý, đề tài rủi ro, các nút thắt tiến độ và số liệu điều hành theo phạm vi trách nhiệm.
- Chủ nhiệm đề tài: cần nộp hồ sơ đúng mẫu, biết hồ sơ đang ở trạng thái nào, nhận yêu cầu bổ sung kịp thời và theo dõi mốc báo cáo, điều chỉnh, nghiệm thu.
- Reviewer hoặc thành viên hội đồng: cần nhận phân công, truy cập đúng hồ sơ, nhập nhận xét và điểm chấm, và theo dõi đúng phần việc đánh giá của mình mà không phải trao đổi qua nhiều kênh.

Người dùng phụ nhưng quan trọng cho giai đoạn sau hoặc phạm vi hỗ trợ gồm thành viên đề tài và quản trị hệ thống.

## Success Criteria

Giai đoạn 1 được coi là thành công nếu RTMS tạo ra cải thiện vận hành đo được cho Phòng Khoa học quân sự của Học viện Quân y. Các KPI vận hành mục tiêu cho giai đoạn đầu gồm:

- Giảm ít nhất 30 phần trăm tỷ lệ hồ sơ bị trả lại do thiếu thành phần hoặc sai biểu mẫu trong 6 tháng đầu sau triển khai.
- Bảo đảm 100 phần trăm hồ sơ chờ xử lý, việc quá hạn và đề tài chậm tiến độ xuất hiện trên dashboard theo đúng phạm vi quyền của người dùng.
- Giảm ít nhất 50 phần trăm thời gian tổng hợp báo cáo điều hành định kỳ cho chuyên viên quản lý khoa học.
- Tăng tỷ lệ công việc và báo cáo được xử lý đúng hạn lên mức tối thiểu 90 phần trăm trong phạm vi các luồng đã số hóa.
- Bảo đảm 100 phần trăm các thao tác nghiệp vụ quan trọng có nhật ký và lịch sử xử lý đủ để truy vết.

Với lãnh đạo, dashboard MVP cần ưu tiên 5 chỉ số và danh sách hành động đầu tiên:

- Hồ sơ chờ kiểm tra hoặc chờ phê duyệt.
- Đề tài sắp đến hạn báo cáo hoặc chậm tiến độ.
- Công việc quá hạn hoặc sắp quá hạn.
- Tỷ lệ hoàn thành theo đơn vị hoặc lĩnh vực.
- Danh sách việc cần lãnh đạo phê duyệt hoặc cho ý kiến ngay.

## Scope

Phiên bản đầu của RTMS bao gồm:

- Quy trình tiếp nhận và duyệt hồ sơ đề tài cấp trường.
- Theo dõi thực hiện đề tài sau khi được duyệt, gồm tiến độ, báo cáo, điều chỉnh, gia hạn và nghiệm thu.
- Quản lý giao việc gắn với điều hành đề tài.
- Dashboard điều hành và báo cáo xuất Excel/PDF cho các nhu cầu chính.
- Quản lý tệp đính kèm, thông báo trong hệ thống và email cho các sự kiện quan trọng.
- Phân quyền theo vai trò, đơn vị, phạm vi dữ liệu và nhật ký thao tác quan trọng.

Ngoài phạm vi MVP:

- Cổng ngoài cho tổ chức hoặc cá nhân đăng ký từ internet công cộng.
- Ký số, SSO/LDAP, SMS và tích hợp với hệ thống ngoài trường.
- Tích hợp tài chính sâu hoặc theo dõi giải ngân ở mức nghiệp vụ kế toán chi tiết.
- Workflow engine cấu hình động cho nhiều biến thể quy trình.
- Thiết kế mobile-first cho các tác vụ nghiệp vụ phức tạp, dù giao diện vẫn phải responsive cho tra cứu và thao tác quan trọng.

## Vision

Trong 2 đến 3 năm, RTMS trước hết nên trở thành nền tảng chuẩn hóa vận hành cho đầu mối quản lý nghiên cứu của Học viện Quân y, thay vì cố gắng mở rộng quá nhanh thành một nền tảng toàn diện cho mọi nhu cầu ngay từ đầu. Khi dữ liệu, quy trình và thói quen sử dụng đã ổn định ở đơn vị triển khai đầu tiên, hệ thống mới nên mở rộng theo từng lớp giá trị tiếp theo.

Hướng mở rộng hợp lý sau giai đoạn đầu gồm tích hợp danh tính, báo cáo nâng cao, ký duyệt điện tử, cảnh báo rủi ro chủ động và các bộ chỉ số nghiên cứu theo đơn vị hoặc lĩnh vực. Nếu triển khai thành công tại Phòng Khoa học quân sự, RTMS có thể trở thành mô hình chuẩn để nhân rộng sang các đầu mối quản lý nghiên cứu khác trong học viện. Giá trị dài hạn là tạo ra một nguồn dữ liệu đáng tin cậy cho quản trị nghiên cứu, giúp học viện chuyển từ điều hành phản ứng sang điều hành chủ động.
