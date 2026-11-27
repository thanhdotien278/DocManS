"use client";

import { useEffect, useState } from "react";
import { useAskReason, useConfirm, useNotice } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { formatIntakeDate } from "@/lib/intake-dates";
import {
  INVITATION_KIND_LABELS,
  listMyConferences,
  PAPER_KIND_LABELS,
  PAPER_STATUS_LABELS,
  paperDownloadUrl,
  respondToInvitation,
  submitPaper,
  withdrawPaper,
  type MyConference,
  type MyPaper,
  type PaperAuthor,
  type PaperKind
} from "@/lib/conferences-api";
import { ConferenceInfoCard } from "./conference-detail";
import { ProceedingsLink, PublishedProgramView } from "./program-view";

export function MyConferences() {
  const [items, setItems] = useState<MyConference[] | null>(null);
  const [error, setError] = useState("");
  async function refresh() {
    try { setItems(await listMyConferences()); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được danh sách."); }
  }
  useEffect(() => { void refresh(); }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!items) return <p>Đang tải…</p>;
  if (!items.length) return <EmptyState title="Chưa có lời mời" message="Thư mời tham dự hội nghị gửi tới bạn sẽ hiện ở đây." />;
  return <div className="form-section-inline">{items.map((item) => <MyConferenceCard key={item.invitation.id} item={item} onChanged={refresh} />)}</div>;
}

function MyConferenceCard({ item, onChanged }: { item: MyConference; onChanged: () => Promise<void> }) {
  const notice = useNotice();
  const askReason = useAskReason();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const { invitation, conference, paper, program, proceedings } = item;

  async function run(work: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try { await work(); await onChanged(); if (success) await notice(success); }
    catch (cause) { await notice(cause instanceof Error ? cause.message : "Không thực hiện được thao tác."); }
    finally { setBusy(false); }
  }

  async function decline() {
    const reason = await askReason("Từ chối lời mời này?", { title: "Từ chối lời mời", confirmLabel: "Từ chối", optional: true, tone: "danger" });
    if (reason !== null) await run(() => respondToInvitation(invitation.id, { decision: "decline", reason: reason || undefined }));
  }

  return <div className="form-section-inline">
    <ConferenceInfoCard conference={{ ...conference, hostOrganizationUnit: conference.hostOrganizationUnit }} action={<span className="status-badge info">{INVITATION_KIND_LABELS[invitation.kind]}</span>} />
    {invitation.status === "sent" ? <SectionCard title="Trả lời thư mời" subtitle={invitation.kind === "speaker" ? "Nhận lời để nộp tóm tắt và toàn văn báo cáo tham luận." : "Nhận lời để nhận chương trình và kỷ yếu hội nghị."}>
      {invitation.canRespond ? <div className="button-row">
        <button className="button primary" type="button" disabled={busy} onClick={() => void (async () => { if (await confirm("Nhận lời tham dự hội nghị?", { confirmLabel: "Nhận lời" })) await run(() => respondToInvitation(invitation.id, { decision: "accept" })); })()}>Nhận lời</button>
        <button className="button" type="button" disabled={busy} onClick={() => void decline()}>Từ chối</button>
      </div> : <p>Hội nghị đã kết thúc hoặc đã huỷ.</p>}
    </SectionCard> : null}
    {paper ? <PaperWorkspace paper={paper} busy={busy} run={run} /> : null}
    {program || proceedings ? <SectionCard title="Chương trình và kỷ yếu">
      {program ? <PublishedProgramView program={program} /> : <p>Chương trình chi tiết sẽ có sau khi các tiểu ban sắp xếp xong.</p>}
      {proceedings ? <ProceedingsLink conferenceId={conference.id} proceedings={proceedings} /> : null}
    </SectionCard> : null}
  </div>;
}

function PaperWorkspace({ paper, busy, run }: { paper: MyPaper; busy: boolean; run: (work: () => Promise<unknown>, success?: string) => Promise<void> }) {
  const askReason = useAskReason();
  const viewer = paper.viewer;
  const lastAbstract = paper.versions.find((version) => version.kind === "abstract");
  const [open, setOpen] = useState<PaperKind | null>(null);
  const [title, setTitle] = useState(paper.title ?? "");
  const [abstractText, setAbstractText] = useState(lastAbstract?.abstractText ?? "");
  const [authors, setAuthors] = useState<PaperAuthor[]>(paper.authors?.length ? paper.authors : [{ fullName: "", organization: "", corresponding: true }]);
  const [file, setFile] = useState<File | null>(null);

  function start(kind: PaperKind) {
    setOpen(kind); setFile(null);
    setTitle(paper.title ?? ""); setAbstractText(lastAbstract?.abstractText ?? "");
  }

  async function submit() {
    if (!open) return;
    const kind = open;
    const cleanAuthors = authors.filter((author) => author.fullName.trim()).map((author) => ({ fullName: author.fullName.trim(), organization: author.organization?.trim() || undefined, corresponding: !!author.corresponding }));
    await run(async () => {
      await submitPaper(paper.id, { version: paper.version, kind, title: title.trim() || undefined, abstractText: kind === "abstract" ? abstractText.trim() : undefined, authors: cleanAuthors.length ? cleanAuthors : undefined }, file);
      setOpen(null);
    }, `Đã nộp ${PAPER_KIND_LABELS[kind].toLowerCase()}.`);
  }

  async function withdraw() {
    const reason = await askReason("Rút báo cáo? Sau khi rút không nộp tiếp được.", { title: "Rút báo cáo", confirmLabel: "Rút báo cáo", optional: true, tone: "danger" });
    if (reason !== null) await run(() => withdrawPaper(paper.id, { version: paper.version, reason: reason || undefined }));
  }

  const ready = open === "abstract" ? title.trim() && abstractText.trim() : !!file;
  return <SectionCard title={paper.title ?? "Báo cáo tham luận"} subtitle={PAPER_STATUS_LABELS[paper.status] ?? paper.status}>
    {paper.withdrawReason ? <p>Lý do rút: {paper.withdrawReason}</p> : null}
    {paper.openRevisions.map((request) => <p key={request.id} role="status"><span className="status-badge warning">Yêu cầu sửa {PAPER_KIND_LABELS[request.kind].toLowerCase()}</span> {request.reason} (hạn {formatIntakeDate(request.dueAt)})</p>)}
    {viewer ? <div className="button-row">
      <button className="button primary" type="button" disabled={busy || !viewer.canSubmitAbstract} title={viewer.abstractBlockReason ?? undefined} onClick={() => start("abstract")}>{lastAbstract ? "Nộp lại tóm tắt" : "Nộp tóm tắt"}</button>
      <button className="button primary" type="button" disabled={busy || !viewer.canSubmitFullPaper} title={viewer.fullPaperBlockReason ?? undefined} onClick={() => start("full_paper")}>{paper.versions.some((version) => version.kind === "full_paper") ? "Nộp lại toàn văn" : "Nộp toàn văn"}</button>
      {viewer.canWithdraw ? <button className="button" type="button" disabled={busy} onClick={() => void withdraw()}>Rút báo cáo</button> : null}
    </div> : null}
    {viewer && !viewer.canSubmitAbstract && !viewer.canSubmitFullPaper && paper.status !== "withdrawn" ? <p className="field-hint">{viewer.fullPaperBlockReason ?? viewer.abstractBlockReason}</p> : null}

    {open ? <div className="form-section-inline">
      <h3>{open === "abstract" ? "Nộp tóm tắt" : "Nộp toàn văn"}</h3>
      <label className="field"><span>Tên báo cáo</span><input value={title} maxLength={500} onChange={(event) => setTitle(event.target.value)} /></label>
      {open === "abstract" ? <label className="field"><span>Nội dung tóm tắt</span><textarea rows={8} maxLength={10000} value={abstractText} onChange={(event) => setAbstractText(event.target.value)} /></label> : null}
      <fieldset className="form-section-inline"><legend>Tác giả (theo thứ tự)</legend>
        {authors.map((author, index) => <div className="form-grid two" key={index}>
          <label className="field"><span>Họ tên</span><input value={author.fullName} maxLength={200} onChange={(event) => setAuthors(authors.map((item, i) => (i === index ? { ...item, fullName: event.target.value } : item)))} /></label>
          <label className="field"><span>Đơn vị</span><input value={author.organization ?? ""} maxLength={300} onChange={(event) => setAuthors(authors.map((item, i) => (i === index ? { ...item, organization: event.target.value } : item)))} /></label>
          <label className="field"><span><input type="checkbox" checked={!!author.corresponding} onChange={(event) => setAuthors(authors.map((item, i) => (i === index ? { ...item, corresponding: event.target.checked } : item)))} /> Tác giả liên hệ</span></label>
          {authors.length > 1 ? <div className="button-row"><button className="button" type="button" onClick={() => setAuthors(authors.filter((_, i) => i !== index))}>Bỏ tác giả</button></div> : null}
        </div>)}
        {authors.length < 50 ? <div className="button-row"><button className="button" type="button" onClick={() => setAuthors([...authors, { fullName: "", organization: "" }])}>Thêm tác giả</button></div> : null}
      </fieldset>
      <label className="field"><span>{open === "abstract" ? "Tệp tóm tắt (tuỳ chọn, .pdf hoặc .docx)" : "Tệp toàn văn (.pdf hoặc .docx)"}</span><input type="file" accept=".pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      <div className="button-row"><button className="button primary" type="button" disabled={busy || !ready} onClick={() => void submit()}>Nộp</button><button className="button" type="button" onClick={() => setOpen(null)}>Đóng</button></div>
    </div> : null}

    {paper.versions.length ? <>
      <h3>Các lần nộp</h3>
      <ul>{paper.versions.map((version) => <li key={version.id}>
        {PAPER_KIND_LABELS[version.kind]} lần {version.versionNumber} · {formatIntakeDate(version.submittedAt)}
        {version.file ? <> · <a href={paperDownloadUrl(paper.id, version.id)}>{version.file.originalFileName}</a></> : null}
      </li>)}</ul>
    </> : null}
  </SectionCard>;
}
