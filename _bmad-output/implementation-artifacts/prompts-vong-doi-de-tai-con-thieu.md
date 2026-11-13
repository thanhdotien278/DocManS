# Prompt cho các phần còn thiếu của vòng đời đề tài 9 bước

Ngày 13/11/2026. Mỗi prompt chạy trong một phiên mới, trên repo `/Users/Super/DocManS`. Thứ tự nên làm: 1 → 2 → các story 3–6 theo kết quả của prompt 1.

---

## Prompt 1 — Rà vòng đời bước 1–7 (chỉ đọc, chưa sửa code)

```
Rà vòng đời đề tài bước 1–7 của RTMS: Đợt tiếp nhận → Hồ sơ đề xuất → Kiểm tra đầy đủ (bổ sung, nộp lại) → Thẩm định/hội đồng → Phê duyệt, kinh phí → Lập đề tài → Thực hiện (tiến độ, báo cáo, giải ngân).

Bối cảnh: bước 8 (Nghiệm thu, Story 6.9, PR #33) và bước 9 (Thanh lý) đã kiểm thử. Trong _bmad-output/implementation-artifacts/sprint-status.yaml, 6-1…6-5 và 6-10 đang in-progress; 6-6/6-7/6-8/6-11/6-12/6-13-* đang review. Chưa ai xác định đó là thiếu chức năng thật hay chỉ chưa cập nhật trạng thái.

Việc cần làm:
1. Với từng bước, tìm các chỗ đổi trạng thái (trạng thái hồ sơ đề xuất; PROJECT_STATUSES trong apps/api/src/approved-projects/project-capability-v1.ts) và màn hình tương ứng trong apps/web. Dùng subagent Explore cho phần quét rộng.
2. Với mỗi story Epic 4/5/6 chưa done: đối chiếu AC trong spec (_bmad-output/implementation-artifacts/) với code và test. Ghi rõ AC nào đã có, AC nào thiếu, AC nào đã hoãn sang deferred-work.md.
3. Tìm chỗ đứt mạch giữa các bước: trạng thái không có đường đi tiếp, nút/hành động không có giao diện, thông báo không dẫn tới đúng trang.
4. Không sửa code. Kết quả: bảng theo bước (Đủ / Thiếu / Lỗi nghi ngờ, kèm file:dòng) và danh sách story đề xuất đổi trạng thái trong sprint-status.yaml. Hỏi tôi trước khi sửa sprint-status.

Báo cáo theo chuẩn ADREP tiếng Việt.
```

---

## Prompt 2 — Hoàn tất kiểm thử Story 6.9 (G1, G2, G3, G4, G7)

```
Hoàn tất kiểm thử giao diện Story 6.9 trên nhánh feat/6-9-quyet-dinh-nghiem-thu (HEAD có commit 65b3591 sửa G6).

Còn thiếu từ Codex vòng 3:
- G2: Codex báo focus rời hộp thoại ký (Hủy → Ký → BODY → Hủy). Giả thuyết: đây là hành vi gốc của <dialog>.showModal() (focus ra thanh trình duyệt), không phải lỗi. Tái hiện bằng một trang HTML tĩnh có <dialog> + 2 nút trong scratchpad, so sánh chuỗi focus. Nếu khác với apps/web/src/components/ui/dialog.tsx thì mới coi là lỗi. Kiểm đủ 5 hộp thoại của trang hội đồng.
- G1: đối chiếu 375px/1280px cho đủ 10 tổ hợp trạng thái × vai trò; chữ bị cắt, nút chồng nhau.
- G3: đi trọn hành trình mời → nhận lời → trình → ký → ghi kết quả chỉ bằng bàn phím.
- G4: quét console/network mọi trạng thái, vai trò; chỉ chấp nhận 4xx cố ý.
- G7: đối chiếu ảnh với docs/ux-design-guidelines.md.

Chuẩn bị: DB riêng docmans_xxx trong container docmans-postgres-1 (prisma:deploy + prisma:seed), cổng riêng qua .claude/launch.json. Đề tài mẫu đặt đơn vị chủ trì org-khti. Không dùng DB dev chung docmansystem; xóa DB tạm khi xong. Prompt gốc tham khảo: _bmad-output/implementation-artifacts/codex-test-prompt-6-9-vong3.md.

Nếu tìm ra lỗi: dùng superpowers:systematic-debugging, viết test fail trước rồi sửa. Báo cáo ADREP tiếng Việt.
```

---

## Prompt 3 — Story mới: yêu cầu bổ sung hồ sơ nghiệm thu đã nộp

```
Dùng bmad-build làm story mới: Phòng KHQS yêu cầu bổ sung hồ sơ nghiệm thu đã nộp (submitted → supplement_requested → nộp lại).

Nguồn: AC này tách khỏi Story 6.9, ghi trong _bmad-output/implementation-artifacts/deferred-work.md (mục có source_spec là spec 6.9). Xem cả mục hoãn "báo cáo supplement_requested không chặn nộp hồ sơ nghiệm thu". Tham khảo cách làm bổ sung ở hồ sơ đề xuất (bước 3) để dùng lại mẫu sẵn có.

Cập nhật docs/permission-matrix.md và sprint-status.yaml trong cùng change set.
```

---

## Prompt 4 — Story mới: thay Chủ tịch hội đồng nghiệm thu sau khi đã thành lập

```
Dùng bmad-build làm story mới: thay Chủ tịch (và thành viên khác nếu cần) sau khi hội đồng nghiệm thu đã ký thành lập, để đề tài không kẹt ở pending_acceptance.

Nguồn: spec-6-9-hoi-dong-va-ket-qua-nghiem-thu.md, Review Triage Log mục #4 và #5 (đổi memberCount khi tờ trình đang chờ thì ký bị chặn tới khi TB/TP trả lại). Code chính: apps/api/src/approved-projects/acceptance-council.service.ts.

Hỏi tôi về quy trình nghiệp vụ trước khi viết spec: thay người có cần trình ký lại không, ai được thay, lý do có bắt buộc không.
```

---

## Prompt 5 — Story 3-7: vòng đời 9 bước và timeline xuyên hồ sơ

```
Dùng bmad-build làm Story 3-7 "vòng đời 9 bước và timeline xuyên hồ sơ" (đang backlog trong sprint-status.yaml).

Nguồn: _bmad-output/epics.md và _bmad-output/planning-artifacts/sprint-change-proposal-2026-10-24.md. Dữ liệu có sẵn: lịch sử hồ sơ đề xuất, projectHistory, approvalSubmission steps. Nên làm sau Prompt 1 để biết bước nào đã đủ.
```

---

## Prompt 6 (tùy chọn) — Bỏ 403 tờ trình cho PI ở trang chi tiết đề tài

```
Trang chi tiết đề tài (apps/web/src/components/projects/project-detail.tsx:138) gọi GET /approval-submissions/subject cho mọi người đọc đề tài, PI nhận 403 rồi khối bị ẩn. Story 6.9 đã sửa cùng lỗi ở trang hội đồng (commit 65b3591) bằng cờ readsApproval dựa trên canViewApproval. Làm tương tự cho trang chi tiết đề tài (và trang hồ sơ đề xuất nếu cùng lỗi). Viết test fail trước. Báo cáo ADREP tiếng Việt.
```
