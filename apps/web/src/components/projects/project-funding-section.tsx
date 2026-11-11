"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { FUNDING_KIND_LABELS, LIQUIDATION_STATUS_LABELS, getProjectFunding, projectAction, projectCapability, projectFileUrl, uploadProjectFile, vnd, type FundingView, type ProjectRecord } from "@/lib/projects-api";

type Props = { project: ProjectRecord; busy: boolean; setBusy: (value: boolean) => void; setNotice: (value: string) => void; onDone: () => Promise<void> };
const emptyForm = { kind: "DISBURSEMENT", amount: "", recordedOn: "", note: "", entryId: "" };

export function ProjectFundingSection({ project, busy, setBusy, setNotice, onDone }: Props) {
  const [funding, setFunding] = useState<FundingView | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [vouchers, setVouchers] = useState<Array<{ id: string; fileName: string }>>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [liqPicked, setLiqPicked] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [recovered, setRecovered] = useState("0");
  const [reason, setReason] = useState("");
  const liquidation = project.liquidation ?? null;
  const contextVersion = projectCapability(project)?.contextVersion;

  async function load() { try { setFunding(await getProjectFunding(project.id)); } catch { setFunding(null); } }
  useEffect(() => { void load(); }, [project.id, project.history.length]);

  async function call(path: string, body: Record<string, unknown>, confirmText?: string): Promise<boolean> {
    if (!contextVersion) { setNotice("Ngữ cảnh quyền không hợp lệ. Vui lòng tải lại."); return false; }
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true); setNotice("");
    try { await projectAction(project.id, path, { ...body, contextVersion }); await onDone(); await load(); return true; }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể hoàn tất thao tác."); return false; }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setNotice("");
    try { const saved = await uploadProjectFile(project, file, "FUNDING_VOUCHER"); setVouchers((current) => [...current, saved]); setPicked((current) => [...current, saved.id]); setNotice(`Đã tải chứng từ: ${saved.fileName}`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tải chứng từ."); }
    finally { setBusy(false); }
  }

  if (!funding || funding.restricted) return null;
  const totals = funding.totals ?? { GRANT: 0, DISBURSEMENT: 0, SETTLEMENT: 0 };
  const current = liquidation?.current ?? null;
  const recoveredNow = current && current.status !== "REJECTED" ? Number(current.recoveredAmount) : Number(recovered || 0);
  const gap = totals.DISBURSEMENT - totals.SETTLEMENT - recoveredNow;

  return <>
    <SectionCard title="Kinh phí" subtitle={`Được cấp ${vnd(totals.GRANT)} · Đã giải ngân ${vnd(totals.DISBURSEMENT)} · Đã quyết toán ${vnd(totals.SETTLEMENT)} · Còn lại ${vnd(totals.GRANT - totals.DISBURSEMENT)}`}>
      {!funding.records.length ? <p>Chưa có số liệu kinh phí.</p> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Loại</th><th>Số tiền</th><th>Ngày</th><th>Ghi chú</th><th>Chứng từ</th><th></th></tr></thead><tbody>
        {funding.records.map((row) => <tr key={row.entryId}><td>{FUNDING_KIND_LABELS[row.kind]}</td><td>{vnd(row.amount)}</td><td>{row.recordedOn ?? ""}</td><td>{row.note ?? ""}{row.version > 1 ? ` (phiên bản ${row.version})` : ""}</td><td>{row.fileRecordIds.map((fileId) => <a key={fileId} href={projectFileUrl(fileId)}>Tệp</a>)}</td><td>{funding.canWrite ? <button className="button" type="button" disabled={busy} onClick={() => { setForm({ kind: row.kind, amount: row.amount, recordedOn: row.recordedOn ?? "", note: row.note ?? "", entryId: row.entryId }); setPicked(row.fileRecordIds); }}>Sửa</button> : null}</td></tr>)}
      </tbody></table></div>}
      {funding.canWrite ? <div className="form-grid two">
        <label className="field"><span>Loại số liệu</span><select value={form.kind} disabled={!!form.entryId} onChange={(event) => setForm({ ...form, kind: event.target.value })}>{Object.entries(FUNDING_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>Số tiền (đồng)</span><input type="number" min={0} step={1} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
        <label className="field"><span>Ngày</span><input type="date" value={form.recordedOn} onChange={(event) => setForm({ ...form, recordedOn: event.target.value })} /></label>
        <label className="field"><span>Ghi chú</span><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        <label className="field"><span>Tải chứng từ</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} /></label>
        {[...vouchers, ...picked.filter((id) => !vouchers.some((file) => file.id === id)).map((id) => ({ id, fileName: "Chứng từ đã đính kèm" }))].map((file) => <label className="field" key={file.id}><span><input type="checkbox" checked={picked.includes(file.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, file.id] : picked.filter((id) => id !== file.id))} /> {file.fileName}</span></label>)}
        <div className="button-row">
          <button className="button primary" type="button" disabled={busy || !form.amount || !form.recordedOn} onClick={() => void call("funding", { kind: form.kind, amount: Number(form.amount), recordedOn: form.recordedOn, note: form.note || undefined, entryId: form.entryId || undefined, fileRecordIds: picked }).then((ok) => { if (ok) { setForm(emptyForm); setPicked([]); } })}>{form.entryId ? "Lưu phiên bản sửa" : "Ghi số liệu"}</button>
          {form.entryId ? <button className="button" type="button" disabled={busy} onClick={() => { setForm(emptyForm); setPicked([]); }}>Huỷ sửa</button> : null}
        </div>
      </div> : null}
    </SectionCard>

    {liquidation ? <SectionCard title="Thanh lý đề tài" subtitle={liquidation.current ? `Biên bản: ${LIQUIDATION_STATUS_LABELS[liquidation.current.status] ?? liquidation.current.status}${liquidation.current.liquidationNumber ? ` · Số ${liquidation.current.liquidationNumber}` : ""}` : liquidation.note ?? "Chưa có biên bản thanh lý"}>
      <div className="table-wrap"><table className="data-table"><tbody>
        <tr><td>Đã giải ngân</td><td>{vnd(liquidation.current?.totalDisbursed ?? totals.DISBURSEMENT)}</td></tr>
        <tr><td>Đã quyết toán</td><td>{vnd(liquidation.current?.totalSettled ?? totals.SETTLEMENT)}</td></tr>
        <tr><td>Thu hồi</td><td>{vnd(recoveredNow)}</td></tr>
        <tr><td>Chênh lệch</td><td>{liquidation.current?.status === "SIGNED" ? "0 đ (đã cân đối)" : vnd(gap)}</td></tr>
      </tbody></table></div>
      {liquidation.current ? <p>{liquidation.current.report}{liquidation.current.decisionNote ? ` — Phản hồi: ${liquidation.current.decisionNote}` : ""}</p> : null}
      {liquidation.canSubmit ? <div className="form-grid two">
        <label className="field"><span>Nội dung biên bản</span><textarea value={report} onChange={(event) => setReport(event.target.value)} /></label>
        <label className="field"><span>Số tiền thu hồi (đồng)</span><input type="number" min={0} step={1} value={recovered} onChange={(event) => setRecovered(event.target.value)} /></label>
        <button className="button primary" type="button" disabled={busy || report.trim().length < 10} onClick={() => void call("liquidation", { report, recoveredAmount: Number(recovered || 0), fileRecordIds: liqPicked }, "Trình biên bản thanh lý (Trưởng ban → Trưởng phòng → Giám đốc)?").then((ok) => { if (ok) { setReport(""); setRecovered("0"); setLiqPicked([]); } })}>Trình biên bản thanh lý</button>
      </div> : null}
      {liquidation.canSign && liquidation.current ? <div className="form-grid two">
        <label className="field"><span>Lý do (bắt buộc khi từ chối)</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="button-row">
          <button className="button primary" type="button" disabled={busy || gap !== 0} title={gap !== 0 ? "Chưa cân đối: quyết toán + thu hồi phải bằng đã giải ngân." : undefined} onClick={() => void call(`liquidation/${liquidation.current!.id}/approve`, { reason: reason || undefined }, "Ký biên bản thanh lý và đóng đề tài?")}>Ký biên bản</button>
          <button className="button danger" type="button" disabled={busy || !reason.trim()} onClick={() => void call(`liquidation/${liquidation.current!.id}/reject`, { reason }, "Từ chối biên bản thanh lý?")}>Từ chối</button>
        </div>
      </div> : null}
    </SectionCard> : null}
  </>;
}
