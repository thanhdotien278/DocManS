"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { formatIntakeDate } from "@/lib/intake-dates";
import { CONFERENCE_STATUS_TONES, createConference, listConferences, listHostUnits, type ConferenceStatus, type ConferenceSummary, type UnitOption } from "@/lib/conferences-api";
import { ConferenceFields, EMPTY_CONFERENCE_FORM, formToPayload, useConferenceForm } from "./conference-form";

export function ConferenceList() {
  const router = useRouter();
  const { account } = useSession();
  // Chỉ là gợi ý hiển thị; máy chủ kiểm tra lại quyền tạo.
  const canCreate = account?.systemRole === "RESEARCH_MANAGEMENT_HEAD" && !!account.organizationScopes?.length;
  const [conferences, setConferences] = useState<ConferenceSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ConferenceStatus>("");
  const { form, setForm, problem } = useConferenceForm(EMPTY_CONFERENCE_FORM);

  useEffect(() => {
    listConferences().then((items) => { setConferences(items); setState("ready"); }).catch((error) => { setMessage(error instanceof Error ? error.message : "Không tải được danh sách."); setState("error"); });
  }, []);
  useEffect(() => {
    if (!creating || units.length) return;
    void listHostUnits().then((items) => { setUnits(items); if (items.length === 1) setForm((current) => ({ ...current, hostOrganizationUnitId: items[0].id })); }).catch(() => setUnits([]));
  }, [creating]);

  async function submit() {
    setBusy(true); setMessage("");
    try {
      const created = await createConference(formToPayload(form));
      router.push(`/conferences/${created.conference.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không tạo được hội nghị."); }
    finally { setBusy(false); }
  }

  const term = keyword.trim().toLowerCase();
  const visible = conferences
    .filter((item) => !statusFilter || item.status === statusFilter)
    .filter((item) => !term || [item.code, item.title, item.location, item.officer?.displayName ?? ""].some((value) => value.toLowerCase().includes(term)));
  const statuses = [...new Map(conferences.map((item) => [item.status, item.statusLabel])).entries()];

  return <div className="form-section-inline">
    {canCreate ? <SectionCard title="Hội nghị mới" subtitle={creating ? "Sau khi tạo, giao chuyên viên phụ trách để bắt đầu mời khách và nhận bài." : undefined}>
      {!creating ? <div className="button-row"><button className="button primary" type="button" onClick={() => setCreating(true)}>Tạo hội nghị</button></div> : <div className="form-section-inline">
        <ConferenceFields form={form} onChange={setForm} units={units} />
        {problem && form.title ? <p className="field-hint">{problem}</p> : null}
        {message ? <p role="alert">{message}</p> : null}
        <div className="button-row"><button className="button primary" type="button" disabled={busy || !!problem} onClick={() => void submit()}>{busy ? "Đang lưu" : "Tạo hội nghị"}</button><button className="button" type="button" onClick={() => setCreating(false)}>Đóng</button></div>
      </div>}
    </SectionCard> : null}

    <SectionCard title="Hội nghị khoa học" subtitle="Hiển thị theo quyền: hội nghị trong phạm vi của bạn hoặc bạn được giao phụ trách">
      <div className="form-grid two">
        <label className="field"><span>Tìm kiếm</span><input value={keyword} placeholder="Mã, tên, địa điểm, chuyên viên…" onChange={(event) => setKeyword(event.target.value)} /></label>
        <label className="field"><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "" | ConferenceStatus)}><option value="">Tất cả</option>{statuses.map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
      </div>
      {state === "loading" ? <p>Đang tải…</p> : state === "error" ? <p role="alert">{message || "Không tải được danh sách."}</p> : !visible.length ? <EmptyState title={conferences.length ? "Không có hội nghị phù hợp" : "Chưa có hội nghị"} message="Hội nghị trong phạm vi của bạn sẽ hiện ở đây." /> : <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Mã</th><th>Tên hội nghị</th><th>Thời gian</th><th>Chuyên viên phụ trách</th><th>Khách mời</th><th>Bài nộp</th><th>Trạng thái</th><th /></tr></thead>
        <tbody>{visible.map((item) => <tr key={item.id}>
          <td>{item.code}</td><td>{item.title}<br /><small>{item.location}</small></td>
          <td>{formatIntakeDate(item.startsAt)}{formatIntakeDate(item.endsAt) !== formatIntakeDate(item.startsAt) ? ` – ${formatIntakeDate(item.endsAt)}` : ""}</td>
          <td>{item.officer?.displayName ?? <span className="status-badge warning">Chưa giao</span>}</td>
          <td>{item.counts ? `${item.counts.accepted}/${item.counts.invited} nhận lời` : "—"}</td>
          <td>{item.counts ? `${item.counts.abstracts} tóm tắt · ${item.counts.fullPapers} toàn văn` : "—"}</td>
          <td><span className={`status-badge ${CONFERENCE_STATUS_TONES[item.status] ?? "neutral"}`}>{item.statusLabel}</span></td>
          <td><Link className="button" href={`/conferences/${item.id}`}>Mở</Link></td>
        </tr>)}</tbody>
      </table></div>}
    </SectionCard>
  </div>;
}
