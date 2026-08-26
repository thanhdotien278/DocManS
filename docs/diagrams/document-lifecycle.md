# Document lifecycle and state diagram

## Proposal

```mermaid
stateDiagram-v2
  state "Nháp" as Draft
  state "Đã nộp" as Submitted
  state "Đang thẩm định / đánh giá" as UnderReview
  state "Yêu cầu bổ sung" as SupplementRequested
  state "Đã nộp lại" as Resubmitted
  state "Chờ quyết định" as ReadyForApproval
  state "Đã phê duyệt" as Approved
  state "Không phê duyệt" as Rejected
  state "Đã rút" as Withdrawn
  state "Đóng / lưu trữ" as Archived

  [*] --> Draft
  Draft --> Submitted: PI nộp
  Submitted --> UnderReview: bắt đầu thẩm định / đánh giá
  UnderReview --> SupplementRequested: yêu cầu bổ sung
  SupplementRequested --> Resubmitted: PI bổ sung và nộp lại
  Resubmitted --> UnderReview: kiểm tra lại
  UnderReview --> ReadyForApproval: tổng hợp đủ
  ReadyForApproval --> Approved: lãnh đạo phê duyệt
  ReadyForApproval --> Rejected: lãnh đạo không phê duyệt
  Draft --> Withdrawn: PI rút bản nháp
  Submitted --> Withdrawn: yêu cầu rút được phê duyệt
  Approved --> Archived: đóng / lưu trữ
  Rejected --> Archived: đóng / lưu trữ
  Withdrawn --> Archived: đóng / lưu trữ
```

## Project

```mermaid
stateDiagram-v2
  state "Chuẩn bị triển khai" as Preparation
  state "Đang thực hiện" as InProgress
  state "Tạm dừng" as Suspended
  state "Chờ nghiệm thu" as AwaitingAcceptance
  state "Đã nghiệm thu" as Accepted
  state "Không đạt" as NotAchieved
  state "Đóng / lưu trữ" as Archived

  [*] --> Preparation
  Preparation --> InProgress: bắt đầu thực hiện
  InProgress --> Suspended: tạm dừng
  Suspended --> InProgress: tiếp tục
  InProgress --> AwaitingAcceptance: nộp kết quả cuối
  AwaitingAcceptance --> Accepted: nghiệm thu đạt
  AwaitingAcceptance --> NotAchieved: nghiệm thu không đạt
  Accepted --> Archived: đóng / lưu trữ
  NotAchieved --> Archived: đóng / lưu trữ
```

`Quá hạn` is a tracking/reminder flag, not a state transition. `Đã rút` is
documented as the result of the withdrawal exception; `Yêu cầu rút` is not a
document status.
