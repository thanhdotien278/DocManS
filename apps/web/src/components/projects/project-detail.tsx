"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { canItem, canProject, getProject, historyActionLabel, memberStatusLabel, milestoneStatusLabel, participationRoleLabel, projectStatusLabel, reportStatusLabel, requestStatusLabel, listProjectFiles, projectAction, projectCapability, projectDenial, projectFileUrl, projectOfficerCandidates, uploadProjectFile, type ProjectRecord } from "@/lib/projects-api";

function day(value?: string | null) { return value?.slice(0, 10) ?? ""; }
function date(value?: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(new Date(value)) : "Chưa có"; }
function message(error: unknown) { return error instanceof Error ? error.message : "Không thể hoàn tất thao tác."; }

export function ProjectDetail({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [candidates, setCandidates] = useState<Array<{ id: string; displayName: string; username: string }>>([]);
  const [files, setFiles] = useState<Array<{ id: string; fileName: string; uploadedById: string }>>([]);
  const [officerUserId, setOfficerUserId] = useState("");
  const [setupTitle, setSetupTitle] = useState("");
  const [setupDate, setSetupDate] = useState("");
  const [setupResponsibleId, setSetupResponsibleId] = useState("");
  const emptyReport = { checkpointId: "", progressResults: "", issuesRecommendations: "", reportingPeriodStart: "", reportingPeriodEnd: "" };
  const [report, setReport] = useState(emptyReport);
  // Evidence picked per report/request id, so a file chosen for one item is never submitted with another.
  const [evidence, setEvidence] = useState<Record<string, string[]>>({});
  const [revokeReason, setRevokeReason] = useState("");
  // Corrections reuse the PI's proposal unless the adjustment form was edited since the last save.
  const [adjustmentDirty, setAdjustmentDirty] = useState(false);
  const [reviewReason, setReviewReason] = useState("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [extensionDate, setExtensionDate] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [adjustmentKind, setAdjustmentKind] = useState("scope");
  const [adjustmentTitle, setAdjustmentTitle] = useState("");
  const [adjustmentSummary, setAdjustmentSummary] = useState("");
  const [milestoneId, setMilestoneId] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [memberAction, setMemberAction] = useState("add");
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("TOPIC_MEMBER");

  async function refresh() {
    setLoading(true);
    try { const record = await getProject(id); setProject(record); setFiles(await listProjectFiles(id).catch(() => [])); setNotice(""); }
    catch (error) { setNotice(message(error)); setProject(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [id]);
  const openDraft = project?.reports.find((item) => item.status === "draft" && canItem(item, "project.report.draft"));
  useEffect(() => {
    setReport(openDraft ? { checkpointId: openDraft.checkpointId ?? "", progressResults: openDraft.progressResults ?? "", issuesRecommendations: openDraft.issuesRecommendations ?? "", reportingPeriodStart: day(openDraft.reportingPeriodStart), reportingPeriodEnd: day(openDraft.reportingPeriodEnd) } : emptyReport);
  }, [openDraft?.id]);
  useEffect(() => {
    if (project && canProject(project, "project.officer.assign")) void projectOfficerCandidates(id).then(setCandidates).catch(() => setCandidates([]));
  }, [project?.id, project?.officer?.officerUserId]);

  async function run(path: string, body: Record<string, unknown> = {}, confirmText?: string, method = "POST") {
    if (!project) return;
    if (confirmText && !window.confirm(confirmText)) return;
    const contextVersion = projectCapability(project)?.contextVersion;
    if (!contextVersion) { setNotice("Ngữ cảnh quyền không hợp lệ. Vui lòng tải lại."); return; }
    setBusy(true); setNotice("");
    try {
      await projectAction(id, path, { ...body, contextVersion }, method);
      if (path.endsWith("/submit")) { const target = path.split("/").at(-2) ?? ""; setEvidence(({ [target]: _, ...rest }) => rest); }
      if (path.startsWith("requests/adjustment")) setAdjustmentDirty(false);
      if (path === "officer/revoke") setRevokeReason("");
      await refresh();
    }
    catch (error) { setNotice(message(error)); }
    finally { setBusy(false); }
  }

  async function upload(file?: File, purpose = "PROJECT_EVIDENCE", targetId?: string) {
    if (!project || !file) return;
    setBusy(true); setNotice("");
    try { const saved = await uploadProjectFile(project, file, purpose); if (targetId) setEvidence((current) => ({ ...current, [targetId]: [...(current[targetId] ?? []), saved.id] })); setFiles(await listProjectFiles(id)); setNotice(`Đã tải minh chứng: ${saved.fileName}`); }
    catch (error) { setNotice(message(error)); }
    finally { setBusy(false); }
  }

  function adjustmentValues() {
    if (adjustmentKind === "scope") return { scope: { ...(adjustmentTitle.trim() ? { title: adjustmentTitle.trim() } : {}), ...(adjustmentSummary.trim() ? { summary: adjustmentSummary.trim() } : {}) } };
    if (adjustmentKind === "milestone") return { milestoneChanges: [{ id: milestoneId, dueDate: milestoneDate }] };
    if (memberAction === "add") return { membershipChanges: [{ action: "add", userId: memberId, name: memberName, participationRole: memberRole }] };
    return { membershipChanges: [{ action: "end", memberId }] };
  }

  if (loading && !project) return <p>Đang tải đề tài…</p>;
  if (!project) return <div><p role="alert">{notice || "Không có quyền xem đề tài này."}</p><button className="button" onClick={() => void refresh()}>Thử lại</button></div>;
  const capability = projectCapability(project);
  const allowed = (action: Parameters<typeof canProject>[1]) => canProject(project, action);
  const disabled = (action: Parameters<typeof canProject>[1]) => busy || !allowed(action);
  const title = (action: Parameters<typeof canProject>[1]) => allowed(action) ? undefined : projectDenial(project, action);
  function evidencePicker(targetId: string) {
    const picked = evidence[targetId] ?? [];
    return <><label className="field"><span>Tải minh chứng cho lần nộp</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file, "PROJECT_EVIDENCE", targetId); }} /></label>{files.map((file) => <label className="field" key={file.id}><span><input type="checkbox" disabled={busy} checked={picked.includes(file.id)} onChange={(event) => setEvidence((current) => ({ ...current, [targetId]: event.target.checked ? [...picked, file.id] : picked.filter((fileId) => fileId !== file.id) }))} /> {file.fileName}</span></label>)}</>;
  }
  const requestAction = (item: ProjectRecord["requests"][number], verb: string) => canItem(item, `project.${item.requestType}.${verb}` as Parameters<typeof canProject>[1]);
  function withdraw(item: ProjectRecord["requests"][number]) {
    const reason = window.prompt("Lý do rút yêu cầu:")?.trim();
    if (!reason) { setNotice("Cần nhập lý do rút yêu cầu."); return; }
    void run(`requests/${item.requestType}/${item.id}/withdraw`, { reason }, "Rút yêu cầu này? Yêu cầu sẽ kết thúc và không thể tiếp tục xử lý.");
  }

  return <div className="form-section-inline">
    {notice ? <p role="status" className="form-error">{notice}</p> : null}
    {!capability ? <p role="alert">Không thể xác minh quyền thao tác. Vui lòng tải lại.</p> : null}
    <div className="button-row"><button className="button" type="button" onClick={() => void refresh()} disabled={busy}>Tải lại đề tài</button></div>
    <SectionCard title={project.title} subtitle={`Trạng thái: ${projectStatusLabel(project.status)}`}>
      <p>Đề xuất nguồn: {project.proposalId}</p><p>Đơn vị chủ trì: {project.hostOrganizationUnit?.name ?? "Chưa có"}</p>
      <p>Thời gian: {date(project.startDate)} – {date(project.endDate)}. Hạn gần nhất: {date(project.nearestDeadline)} {project.overdue ? "(quá hạn)" : project.approaching ? "(sắp đến hạn)" : ""}</p>
      <p>Chuyên viên phụ trách: {project.officer ? project.officer.displayName ?? "Đã phân công" : "Chưa phân công"}</p>
      <h3>Phạm vi đã duyệt</h3><p>{String(project.scope?.summary ?? "Chưa có tóm tắt")}</p>
      <h3>Thành viên</h3><ul>{project.members.map((item) => <li key={item.id}>{item.name} · {participationRoleLabel(item.participationRole)} · {memberStatusLabel(item.status)}</li>)}</ul>
    </SectionCard>

    {(allowed("project.officer.assign") || allowed("project.officer.revoke")) ? <SectionCard title="Phân công chuyên viên đề tài"><div className="form-grid two"><label className="field"><span>Chuyên viên thuộc phạm vi</span><select value={officerUserId} onChange={(event) => setOfficerUserId(event.target.value)}><option value="">Chọn chuyên viên</option>{candidates.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.username})</option>)}</select></label></div><div className="button-row"><button className="button primary" disabled={disabled("project.officer.assign") || !officerUserId} title={title("project.officer.assign")} onClick={() => void run("officer", { officerUserId }, "Phân công chuyên viên này cho đề tài?")}>Phân công / thay thế</button></div>{allowed("project.officer.revoke") && project.officer ? <div className="form-grid two"><label className="field"><span>Lý do thu hồi</span><input value={revokeReason} onChange={(event) => setRevokeReason(event.target.value)} /></label><button className="button" disabled={disabled("project.officer.revoke") || !revokeReason.trim()} title={title("project.officer.revoke")} onClick={() => void run("officer/revoke", { reason: revokeReason.trim() }, "Thu hồi phân công hiện hành?")}>Thu hồi</button></div> : null}</SectionCard> : null}

    {project.status === "preparing" ? <SectionCard title="Thiết lập và kích hoạt"><p>Mốc và điểm báo cáo được ghi nhận trước khi bắt đầu thực hiện.</p>{allowed("project.setup.configure") && !project.milestones.length && !project.checkpoints.length ? <div className="form-grid two"><label className="field"><span>Tên mốc quan trọng</span><input value={setupTitle} onChange={(event) => setSetupTitle(event.target.value)} /></label><label className="field"><span>Ngày đến hạn</span><input type="date" value={setupDate} onChange={(event) => setSetupDate(event.target.value)} /></label><label className="field"><span>Thành viên phụ trách</span><select value={setupResponsibleId} onChange={(event) => setSetupResponsibleId(event.target.value)}><option value="">Chưa phân công</option>{project.members.filter((item) => item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="button" disabled={busy || !setupTitle.trim() || !setupDate} onClick={() => void run("setup", { milestones: [{ title: setupTitle, dueDate: setupDate, isImportant: true, ...(setupResponsibleId ? { responsibleMemberId: setupResponsibleId } : {}) }], checkpoints: [{ title: `Báo cáo ${setupTitle}`, dueDate: setupDate, milestonePosition: 0 }] }, "Lưu mốc và điểm báo cáo này cho đề tài?")}>Lưu mốc triển khai</button></div> : null}<button className="button primary" disabled={disabled("project.setup.confirm")} title={title("project.setup.confirm")} onClick={() => void run("setup/confirm", {}, "Xác nhận thiết lập và bắt đầu thực hiện đề tài?")}>Xác nhận bắt đầu thực hiện</button></SectionCard> : null}

    <SectionCard title="Mốc và lịch báo cáo"><ul>{project.milestones.map((item) => <li key={item.id}>{item.title} · {date(item.dueDate)} · {milestoneStatusLabel(item.status)}{item.isImportant ? " · Mốc quan trọng" : ""}</li>)}{project.checkpoints.map((item) => <li key={item.id}>{item.title} · {date(item.dueDate)} · {milestoneStatusLabel(item.status)}</li>)}</ul>{!project.milestones.length && !project.checkpoints.length ? <p>Chưa thiết lập mốc.</p> : null}</SectionCard>

    {allowed("project.evidence.contribute") && !allowed("project.report.draft") ? <SectionCard title="Đóng góp minh chứng"><p>Chỉ tệp của thành viên phụ trách mốc được hiển thị tại đây. PI quyết định tệp nào được nộp cùng báo cáo.</p><label className="field"><span>Tải tệp đóng góp</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file, "PROJECT_CONTRIBUTION"); }} /></label><ul>{files.map((file) => <li key={file.id}><a href={projectFileUrl(file.id)}>{file.fileName}</a></li>)}</ul></SectionCard> : null}
    {allowed("project.report.draft") ? <SectionCard title="Báo cáo tiến độ"><label className="field"><span>Điểm báo cáo</span><select value={report.checkpointId} onChange={(event) => setReport({ ...report, checkpointId: event.target.value })}><option value="">Báo cáo chung</option>{project.checkpoints.map((item) => <option key={item.id} value={item.id}>{item.title} · {date(item.dueDate)}</option>)}</select></label><div className="form-grid two"><label className="field"><span>Đầu kỳ</span><input type="date" value={report.reportingPeriodStart} onChange={(event) => setReport({ ...report, reportingPeriodStart: event.target.value })} /></label><label className="field"><span>Cuối kỳ</span><input type="date" value={report.reportingPeriodEnd} onChange={(event) => setReport({ ...report, reportingPeriodEnd: event.target.value })} /></label></div><label className="field"><span>Kết quả và tiến độ</span><textarea value={report.progressResults} onChange={(event) => setReport({ ...report, progressResults: event.target.value })} /></label><label className="field"><span>Khó khăn / kiến nghị</span><textarea value={report.issuesRecommendations} onChange={(event) => setReport({ ...report, issuesRecommendations: event.target.value })} /></label><button className="button primary" disabled={busy || !report.progressResults.trim() || !report.reportingPeriodStart || !report.reportingPeriodEnd} onClick={() => void (openDraft ? run(`reports/${openDraft.id}`, { ...report, checkpointId: report.checkpointId || null }, undefined, "PATCH") : run("reports", { ...report, checkpointId: report.checkpointId || undefined }))}>{openDraft ? `Cập nhật bản nháp (phiên bản ${openDraft.revision})` : "Lưu bản nháp báo cáo"}</button>{openDraft ? <button className="button" disabled={busy || !report.progressResults.trim() || !report.reportingPeriodStart || !report.reportingPeriodEnd} onClick={() => void run("reports", { ...report, checkpointId: report.checkpointId || undefined })}>Lưu thành báo cáo mới</button> : null}</SectionCard> : null}

    <SectionCard title="Các phiên bản báo cáo">{!project.reports.length ? <p>Chưa có báo cáo.</p> : <div className="project-list">{project.reports.map((item) => <article className="list-card" key={item.id}><h3>Phiên bản {item.revision} · {reportStatusLabel(item.status)}</h3>{item.progressResults ? <p>{item.progressResults}</p> : null}{item.reviewReason ? <p>{item.responseDeadline ? `Yêu cầu bổ sung: ${item.reviewReason} (hạn ${date(item.responseDeadline)})` : `Ghi chú xem xét: ${item.reviewReason}`}</p> : null}<ul>{item.evidence?.map((file) => <li key={file.id}><a href={projectFileUrl(file.fileRecordId)}>{file.file?.originalFileName ?? "Minh chứng"}</a></li>)}</ul>{canItem(item, "project.report.submit") ? <div className="form-section-inline">{evidencePicker(item.id)}<button className="button primary" disabled={busy} onClick={() => void run(`reports/${item.id}/submit`, { evidenceFileIds: evidence[item.id] ?? [] }, "Nộp báo cáo và khóa phiên bản này?")}>Nộp báo cáo</button></div> : null}{item.status === "supplement_requested" && canItem(item, "project.report.draft") ? <button className="button" disabled={busy} onClick={() => void run(`reports/${item.id}`, { progressResults: item.progressResults ?? "", issuesRecommendations: item.issuesRecommendations ?? undefined }, undefined, "PATCH")}>Tạo bản sửa theo yêu cầu</button> : null}{canItem(item, "project.report.review") || canItem(item, "project.report.request-supplement") || canItem(item, "project.report.accept") ? <div className="button-row">{canItem(item, "project.report.review") ? <button className="button" disabled={busy} onClick={() => void run(`reports/${item.id}/review`, {}, "Bắt đầu xem xét báo cáo này?")}>Bắt đầu xem xét</button> : null}{canItem(item, "project.report.request-supplement") ? <button className="button" disabled={busy || !reviewReason || !responseDeadline} onClick={() => void run(`reports/${item.id}/supplement`, { reason: reviewReason, responseDeadline }, "Yêu cầu PI bổ sung báo cáo?")}>Yêu cầu bổ sung</button> : null}{canItem(item, "project.report.accept") ? <button className="button primary" disabled={busy} onClick={() => void run(`reports/${item.id}/accept`, { reason: reviewReason }, "Chấp nhận báo cáo hành chính này?")}>Chấp nhận báo cáo</button> : null}</div> : null}</article>)}</div>}</SectionCard>

    {(allowed("project.adjustment.create") || allowed("project.extension.create")) ? <SectionCard title="Yêu cầu thay đổi có kiểm soát"><label className="field"><span>Lý do</span><textarea value={requestReason} onChange={(event) => setRequestReason(event.target.value)} /></label><div className="form-grid two"><label className="field"><span>Ngày kết thúc đề nghị gia hạn</span><input type="date" min={day(project.endDate)} value={extensionDate} onChange={(event) => setExtensionDate(event.target.value)} /></label><button className="button" disabled={busy || !requestReason.trim() || !extensionDate || !allowed("project.extension.create")} onClick={() => void run("requests/extension", { proposedValues: { requestedEndDate: extensionDate }, reason: requestReason })}>Lưu nháp gia hạn</button></div><h3>Điều chỉnh</h3><label className="field"><span>Loại điều chỉnh</span><select value={adjustmentKind} onChange={(event) => { setAdjustmentDirty(true); setAdjustmentKind(event.target.value); }}><option value="scope">Phạm vi được duyệt</option><option value="milestone">Mốc quan trọng</option><option value="membership">Thành viên</option></select></label>{adjustmentKind === "scope" ? <div className="form-grid two"><label className="field"><span>Tên đề tài mới</span><input value={adjustmentTitle} onChange={(event) => { setAdjustmentDirty(true); setAdjustmentTitle(event.target.value); }} /></label><label className="field"><span>Tóm tắt mới</span><textarea value={adjustmentSummary} onChange={(event) => { setAdjustmentDirty(true); setAdjustmentSummary(event.target.value); }} /></label></div> : adjustmentKind === "milestone" ? <div className="form-grid two"><label className="field"><span>Mốc quan trọng</span><select value={milestoneId} onChange={(event) => { setAdjustmentDirty(true); setMilestoneId(event.target.value); }}><option value="">Chọn mốc</option>{project.milestones.filter((item) => item.isImportant).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="field"><span>Ngày đến hạn mới</span><input type="date" value={milestoneDate} onChange={(event) => { setAdjustmentDirty(true); setMilestoneDate(event.target.value); }} /></label></div> : <div className="form-grid two"><label className="field"><span>Thao tác</span><select value={memberAction} onChange={(event) => { setAdjustmentDirty(true); setMemberAction(event.target.value); }}><option value="add">Bổ sung</option><option value="end">Kết thúc</option></select></label>{memberAction === "end" ? <label className="field"><span>Thành viên</span><select value={memberId} onChange={(event) => { setAdjustmentDirty(true); setMemberId(event.target.value); }}><option value="">Chọn thành viên</option>{project.members.filter((item) => item.participationRole !== "TOPIC_PI" && item.status === "ACTIVE").map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <><label className="field"><span>ID tài khoản thành viên</span><input value={memberId} onChange={(event) => { setAdjustmentDirty(true); setMemberId(event.target.value); }} /></label><label className="field"><span>Họ tên</span><input value={memberName} onChange={(event) => { setAdjustmentDirty(true); setMemberName(event.target.value); }} /></label><label className="field"><span>Vai trò</span><select value={memberRole} onChange={(event) => { setAdjustmentDirty(true); setMemberRole(event.target.value); }}><option value="TOPIC_MEMBER">Thành viên</option><option value="TOPIC_SECRETARY">Thư ký</option></select></label></>}</div>}<button className="button" disabled={busy || !requestReason.trim() || !allowed("project.adjustment.create") || (adjustmentKind === "scope" && !adjustmentTitle.trim() && !adjustmentSummary.trim()) || (adjustmentKind === "milestone" && (!milestoneId || !milestoneDate)) || (adjustmentKind === "membership" && (!memberId || (memberAction === "add" && !memberName.trim())))} onClick={() => void run("requests/adjustment", { proposedValues: adjustmentValues(), reason: requestReason })}>Lưu nháp điều chỉnh</button></SectionCard> : null}

    {(allowed("project.report.review") || allowed("project.adjustment.review") || allowed("project.extension.approve")) ? <SectionCard title="Ghi chú xem xét"><label className="field"><span>Lý do / ghi chú</span><textarea value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} /></label><label className="field"><span>Hạn bổ sung</span><input type="date" value={responseDeadline} onChange={(event) => setResponseDeadline(event.target.value)} /></label></SectionCard> : null}

    <SectionCard title="Yêu cầu điều chỉnh và gia hạn">{!project.requests.length ? <p>Chưa có yêu cầu.</p> : <div className="project-list">{project.requests.map((item) => <article className="list-card" key={item.id}><h3>{item.requestType === "extension" ? "Gia hạn" : "Điều chỉnh"} · {requestStatusLabel(item.status)} · phiên bản {item.revision ?? "—"}</h3>{item.reason ? <p>{item.reason}</p> : null}{item.decisionNote ? <p>Phản hồi: {item.decisionNote}{item.status === "supplement_requested" && item.responseDeadline ? ` · Hạn bổ sung: ${date(item.responseDeadline)}` : ""}</p> : null}<ul>{item.evidence?.map((file) => <li key={file.id}><a href={projectFileUrl(file.fileRecordId)}>{file.file?.originalFileName ?? "Minh chứng"}</a></li>)}</ul>{requestAction(item, "submit") ? <div>{evidencePicker(item.id)}<button className="button primary" disabled={busy} onClick={() => void run(`requests/${item.requestType}/${item.id}/submit`, { evidenceFileIds: evidence[item.id] ?? [] }, "Nộp yêu cầu và khóa phiên bản này?")}>Nộp yêu cầu</button></div> : null}{item.status === "supplement_requested" && requestAction(item, "edit-draft") ? <button className="button" disabled={busy} onClick={() => void run(`requests/${item.requestType}/${item.id}`, { proposedValues: item.requestType === "extension" ? { requestedEndDate: extensionDate || day(String(item.proposedValues?.requestedEndDate ?? "")) } : adjustmentDirty ? adjustmentValues() : item.proposedValues, reason: requestReason || item.reason }, undefined, "PATCH")}>Tạo bản sửa theo yêu cầu</button> : null}{requestAction(item, "review") ? <button className="button" disabled={busy} onClick={() => void run(`requests/adjustment/${item.id}/review`, { reason: reviewReason }, "Bắt đầu xem xét yêu cầu điều chỉnh này?")}>Bắt đầu xem xét</button> : null}{requestAction(item, "validate") ? <button className="button" disabled={busy} onClick={() => void run(`requests/extension/${item.id}/validate`, { reason: reviewReason }, "Kiểm tra hành chính yêu cầu gia hạn này?")}>Kiểm tra hành chính</button> : null}{requestAction(item, "prepare") ? <button className="button" disabled={busy} onClick={() => void run(`requests/extension/${item.id}/prepare`, { note: reviewReason }, "Trình hồ sơ gia hạn lên Trưởng phòng quyết định?")}>Trình Trưởng phòng</button> : null}{requestAction(item, "request-supplement") ? <button className="button" disabled={busy || !reviewReason || !responseDeadline} onClick={() => void run(`requests/${item.requestType}/${item.id}/supplement`, { reason: reviewReason, responseDeadline }, "Yêu cầu PI bổ sung hồ sơ?")}>Yêu cầu bổ sung</button> : null}{requestAction(item, "approve") || requestAction(item, "reject") ? <div className="button-row">{requestAction(item, "approve") ? <button className="button primary" disabled={busy} onClick={() => void run(`requests/${item.requestType}/${item.id}/approve`, { reason: reviewReason }, "Phê duyệt và áp dụng thay đổi này?")}>Phê duyệt</button> : null}{requestAction(item, "reject") ? <button className="button danger" disabled={busy || !reviewReason} onClick={() => void run(`requests/${item.requestType}/${item.id}/reject`, { reason: reviewReason }, "Từ chối yêu cầu này?")}>Từ chối</button> : null}</div> : null}{requestAction(item, "withdraw") ? <button className="button danger" disabled={busy} onClick={() => withdraw(item)}>Rút yêu cầu</button> : null}</article>)}</div>}</SectionCard>
    <SectionCard title="Lịch sử đề tài">{!project.history.length ? <p>Chưa có sự kiện.</p> : <ul>{project.history.map((item) => <li key={item.id}>{date(item.createdAt)} · {historyActionLabel(item.action)}{item.reason ? ` · ${item.reason}` : ""}</li>)}</ul>}</SectionCard>
  </div>;
}
