"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Plus, Save, Search } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { ParticipationBadge } from "@/components/ui/participation-badge";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadProposalIntakePeriods, type ProposalIntakePeriod } from "@/lib/proposal-intake-periods-api";
import { formatVndNumber, parseVndNumber } from "@/lib/vietnamese-currency";
import {
  createResearchProposalDraft,
  loadResearchProposals,
  type ProposalDraftInput,
  type ResearchProposal
} from "@/lib/research-proposals-api";

type LoadState = "loading" | "ready" | "error";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN").format(new Date(value)) : "Chưa có";
}

function todayInput(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function defaultForm(hostOrganizationUnitId = ""): ProposalDraftInput {
  return {
    intakePeriodId: "",
    title: "",
    hostOrganizationUnitId,
    researchFieldCode: "biomedical-tech",
    proposalTypeCode: "academy-level",
    startDate: todayInput(30),
    endDate: todayInput(210),
    objectives: "",
    summary: "",
    budgetMetadata: { currency: "VND" },
    members: [{ name: "", role: "Chủ nhiệm", organization: "" }]
  };
}

export function ResearchProposalsPanel({ allowCreate }: { allowCreate: boolean }) {
  const { account } = useSession();
  const initialHostScope = account?.organizationScopes?.[0]?.id ?? "";
  const [state, setState] = useState<LoadState>("loading");
  const [proposals, setProposals] = useState<ResearchProposal[]>([]);
  const [intakes, setIntakes] = useState<ProposalIntakePeriod[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState<ProposalDraftInput>(() => defaultForm(initialHostScope));
  const [formError, setFormError] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    setState("loading");
    try {
      const [proposalData, intakeData] = await Promise.all([loadResearchProposals(), loadProposalIntakePeriods()]);
      setProposals(proposalData);
      setIntakes(intakeData.filter((intake) => intake.status === "open"));
      setState("ready");
      setForm((current) => ({
        ...current,
        intakePeriodId: current.intakePeriodId || intakeData.find((intake) => intake.status === "open")?.id || "",
        hostOrganizationUnitId: current.hostOrganizationUnitId || initialHostScope
      }));
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [initialHostScope]);

  const filteredProposals = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return proposals.filter((proposal) => {
      const matchesKeyword =
        !normalizedKeyword ||
        proposal.title.toLowerCase().includes(normalizedKeyword) ||
        proposal.code.toLowerCase().includes(normalizedKeyword);
      const matchesStatus = !statusFilter || proposal.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, proposals, statusFilter]);

  function updateMember(field: "name" | "role" | "organization" | "username", value: string) {
    setForm((current) => ({
      ...current,
      members: [{ name: "", role: "Chủ nhiệm", organization: "", ...(current.members?.[0] ?? {}), [field]: value }]
    }));
  }

  function validateForm() {
    const errors: Record<string, string> = {};
    if (!form.intakePeriodId) {
      errors.intakePeriodId = "Chọn đợt tiếp nhận đang mở.";
    }
    if (!form.title?.trim()) {
      errors.title = "Nhập tên đề tài.";
    }
    if (!form.hostOrganizationUnitId?.trim()) {
      errors.hostOrganizationUnitId = "Nhập mã đơn vị chủ trì.";
    }
    if (form.startDate && form.endDate && new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()) {
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
    }
    setFormError(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ProposalDraftInput = {
        ...form,
        budgetMetadata: {
          amount: Number(form.budgetMetadata?.amount ?? 0),
          currency: form.budgetMetadata?.currency || "VND"
        },
        members: form.members?.filter((member) => member.name.trim() && member.role.trim() && member.organization.trim())
      };
      const result = await createResearchProposalDraft(payload);
      setMessage("Đã lưu hồ sơ nháp.");
      setProposals((current) => [result.proposal, ...current]);
      setForm(defaultForm(initialHostScope));
    } catch (error) {
      setMessage("");
      setFormError({ submit: error instanceof Error ? error.message : "Không thể tạo hồ sơ nháp." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid two-column">
      <SectionCard title="Danh sách hồ sơ" subtitle="Theo dõi hồ sơ theo đợt tiếp nhận và trạng thái">
        <div className="filter-bar">
          <label className="filter-field">
            <span>Từ khóa</span>
            <span className="field-input plain">
              <Search size={16} aria-hidden="true" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tên đề tài hoặc mã hồ sơ" />
            </span>
          </label>
          <label className="filter-field">
            <span>Trạng thái</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="draft">Nháp</option>
              <option value="submitted">Đã nộp</option>
              <option value="supplement_requested">Chờ bổ sung</option>
              <option value="resubmitted">Đã nộp lại</option>
              <option value="under_review">Đang đánh giá</option>
              <option value="ready_for_approval">Chờ phê duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </label>
        </div>

        {state === "loading" ? <p className="state-message">Đang tải hồ sơ...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải danh sách hồ sơ.</p> : null}
        {state === "ready" && filteredProposals.length === 0 ? (
          <EmptyState title="Chưa có hồ sơ phù hợp" message="Tạo hồ sơ nháp hoặc đổi điều kiện lọc để tiếp tục." />
        ) : null}
        {state === "ready" && filteredProposals.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hồ sơ</th>
                    <th>Vai trò của tôi</th>
                    <th>Đợt</th>
                    <th>Thời gian</th>
                    <th>Kinh phí</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td>
                        <Link className="record-title" href={`/proposals/${proposal.id}`}>
                          {proposal.title}
                        </Link>
                        <span className="record-meta">{proposal.code || proposal.id}</span>
                      </td>
                      <td>
                        <ParticipationBadge
                          role={proposal.viewerParticipation?.role}
                          label={proposal.viewerParticipation?.label}
                        />
                      </td>
                      <td>{intakes.find((intake) => intake.id === proposal.intakePeriodId)?.title ?? proposal.intakePeriodId}</td>
                      <td>
                        {formatDate(proposal.startDate)} - {formatDate(proposal.endDate)}
                      </td>
                      <td>
                        {Number(proposal.budgetMetadata?.amount ?? 0).toLocaleString("vi-VN")} {proposal.budgetMetadata?.currency ?? "VND"}
                      </td>
                      <td>
                        <StatusBadge status={proposal.status} />
                      </td>
                      <td>
                        <Link className="button" href={`/proposals/${proposal.id}`}>
                          <Eye size={16} aria-hidden="true" />
                          Xem
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-list">
              {filteredProposals.map((proposal) => (
                <article className="list-card" key={proposal.id}>
                  <div className="list-card-header">
                    <div>
                      <Link className="record-title" href={`/proposals/${proposal.id}`}>
                        {proposal.title}
                      </Link>
                      <span className="record-meta">{proposal.code || proposal.id}</span>
                    </div>
                    <StatusBadge status={proposal.status} />
                  </div>
                  <ParticipationBadge role={proposal.viewerParticipation?.role} label={proposal.viewerParticipation?.label} />
                  <span className="record-meta">
                    {formatDate(proposal.startDate)} - {formatDate(proposal.endDate)}
                  </span>
                  <Link className="button" href={`/proposals/${proposal.id}`}>
                    <Eye size={16} aria-hidden="true" />
                    Xem chi tiết
                  </Link>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      {allowCreate ? (
        <SectionCard title="Tạo hồ sơ nháp" subtitle="Lưu nhiều lần, sau đó hoàn thiện tài liệu và readiness ở màn hình chi tiết">
          <form className="admin-form" onSubmit={(event) => void handleCreateDraft(event)}>
            <div className="form-section-inline">
              <div className="section-mini-heading">
                <FileText size={16} aria-hidden="true" />
                Thông tin chung
              </div>
              <label className="field">
                <span>Đợt tiếp nhận</span>
                <select value={form.intakePeriodId ?? ""} onChange={(event) => setForm({ ...form, intakePeriodId: event.target.value })}>
                  <option value="">Chọn đợt đang mở</option>
                  {intakes.map((intake) => (
                    <option key={intake.id} value={intake.id}>
                      {intake.title}
                    </option>
                  ))}
                </select>
                {formError.intakePeriodId ? <span className="field-error">{formError.intakePeriodId}</span> : null}
              </label>
              <label className="field">
                <span>Tên đề tài</span>
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                {formError.title ? <span className="field-error">{formError.title}</span> : null}
              </label>
            </div>

            <div className="form-section-inline">
              <div className="section-mini-heading">Lĩnh vực và đơn vị</div>
              <div className="form-grid two">
                <label className="field">
                  <span>Lĩnh vực</span>
                  <input value={form.researchFieldCode} onChange={(event) => setForm({ ...form, researchFieldCode: event.target.value })} />
                </label>
                <label className="field">
                  <span>Loại đề tài</span>
                  <input value={form.proposalTypeCode} onChange={(event) => setForm({ ...form, proposalTypeCode: event.target.value })} />
                </label>
              </div>
              <label className="field">
                <span>Mã đơn vị chủ trì</span>
                <input
                  value={form.hostOrganizationUnitId}
                  onChange={(event) => setForm({ ...form, hostOrganizationUnitId: event.target.value })}
                  placeholder={account?.organizationScopes?.[0]?.id ?? "org-khti"}
                />
                {formError.hostOrganizationUnitId ? <span className="field-error">{formError.hostOrganizationUnitId}</span> : null}
              </label>
            </div>

            <div className="form-section-inline">
              <div className="section-mini-heading">Chủ nhiệm và thời gian</div>
              <div className="form-grid two">
                <label className="field">
                  <span>Chủ nhiệm/thành viên</span>
                  <input value={form.members?.[0]?.name ?? ""} onChange={(event) => updateMember("name", event.target.value)} />
                </label>
                <label className="field">
                  <span>Đơn vị thành viên</span>
                  <input value={form.members?.[0]?.organization ?? ""} onChange={(event) => updateMember("organization", event.target.value)} />
                </label>
                <label className="field">
                  <span>Tài khoản hệ thống (nếu có)</span>
                  <input
                    value={form.members?.[0]?.username ?? ""}
                    onChange={(event) => updateMember("username", event.target.value)}
                    placeholder="Tên đăng nhập, để trống nếu là người ngoài hệ thống"
                  />
                </label>
                <label className="field">
                  <span>Bắt đầu</span>
                  <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </label>
                <label className="field">
                  <span>Kết thúc</span>
                  <input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
                  {formError.endDate ? <span className="field-error">{formError.endDate}</span> : null}
                </label>
              </div>
            </div>

            <div className="form-section-inline">
              <div className="section-mini-heading">Mục tiêu, tóm tắt và kinh phí</div>
              <label className="field">
                <span>Mục tiêu</span>
                <textarea rows={3} value={form.objectives} onChange={(event) => setForm({ ...form, objectives: event.target.value })} />
              </label>
              <label className="field">
                <span>Tóm tắt</span>
                <textarea rows={4} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
              </label>
              <label className="field">
                <span>Kinh phí dự kiến</span>
                <input
                  inputMode="numeric"
                  value={formatVndNumber(form.budgetMetadata?.amount)}
                  onChange={(event) => {
                    const amount = parseVndNumber(event.target.value);
                    setForm({ ...form, budgetMetadata: { ...form.budgetMetadata, amount, currency: "VND" } });
                  }}
                />
              </label>
            </div>

            {formError.submit ? <p className="form-error">{formError.submit}</p> : null}
            {message ? <p className="state-message success">{message}</p> : null}
            <button className="button primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {isSubmitting ? "Đang lưu" : "Lưu hồ sơ nháp"}
            </button>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Phạm vi thao tác" subtitle="Quyền chỉnh sửa nội dung hồ sơ thuộc PI/chủ sở hữu">
          <p className="section-copy">
            Danh sách này hiển thị hồ sơ trong phạm vi xử lý. Các thao tác nộp chính thức và sửa nội dung được backend kiểm soát theo vai trò,
            chủ sở hữu và trạng thái hồ sơ.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
