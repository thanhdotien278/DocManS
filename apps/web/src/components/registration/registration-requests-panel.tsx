"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { approveRegistrationRequest, listRegistrationRequests, rejectRegistrationRequest, type AccountType, type RegistrationRequest, type RegistrationUnit } from "@/lib/registration-api";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = { INTERNAL: "Trong học viện", EXTERNAL: "Ngoài học viện" };

export function RegistrationRequestsPanel() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [units, setUnits] = useState<RegistrationUnit[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<RegistrationRequest | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { const data = await listRegistrationRequests(); setRequests(data.requests); setUnits(data.organizationUnits); setState("ready"); } catch (cause) { setError(cause instanceof Error ? cause.message : ""); setState("error"); }
  }
  useEffect(() => { void refresh(); }, []);

  async function decide(action: () => Promise<unknown>, success: string) {
    setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); setSelected(null); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu."); } finally { setBusy(false); await refresh(); }
  }

  if (state === "loading") return <p className="record-meta">Đang tải...</p>;
  if (state === "error") return <p className="form-error" role="alert">{error || "Không thể tải danh sách yêu cầu đăng ký."}</p>;

  return <div className="grid two-column">
    <SectionCard title="Chờ duyệt" subtitle={`${requests.length} yêu cầu đã xác minh email`}>
      {message ? <p role="status">{message}</p> : null}
      {requests.length === 0 ? <EmptyState title="Không có yêu cầu" message="Chưa có yêu cầu đăng ký nào chờ duyệt." /> :
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách yêu cầu đăng ký">
          <table className="data-table">
            <thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Email</th><th>Đối tượng</th><th>Ngày đăng ký</th><th /></tr></thead>
            <tbody>{requests.map((request) => <tr key={request.id}>
              <td>{request.fullName}</td><td>{request.username}</td><td>{request.email}</td><td>{ACCOUNT_TYPE_LABELS[request.accountType]}</td>
              <td>{new Date(request.createdAt).toLocaleDateString("vi-VN")}</td>
              <td><button className="button" type="button" onClick={() => { setSelected(request); setError(""); setMessage(""); }}>Xử lý</button></td>
            </tr>)}</tbody>
          </table>
        </div>}
    </SectionCard>
    {selected ? <SectionCard title={selected.fullName} subtitle={`${selected.username} · ${selected.email}`}>
      <form className="admin-form" key={selected.id} onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const accountType = String(form.get("accountType")) as AccountType;
        const organizationUnitId = String(form.get("organizationUnitId") ?? "");
        if (!organizationUnitId) return setError("Vui lòng chọn đơn vị quản lý.");
        void decide(() => approveRegistrationRequest(selected.id, { organizationUnitId, accountType, externalAffiliation: String(form.get("externalAffiliation") ?? "").trim() || undefined }), `Đã duyệt tài khoản ${selected.username}.`);
      }}>
        <label className="field"><span>Đối tượng</span><select name="accountType" defaultValue={selected.accountType}>
          <option value="INTERNAL">Trong học viện (NCV)</option><option value="EXTERNAL">Ngoài học viện (NNB)</option>
        </select></label>
        <label className="field"><span>Đơn vị quản lý</span><select name="organizationUnitId" defaultValue="">
          <option value="" disabled>Chọn đơn vị</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
        </select></label>
        <label className="field"><span>Đơn vị công tác bên ngoài (chỉ với NNB)</span><input name="externalAffiliation" maxLength={240} /></label>
        <button className="button primary" disabled={busy} type="submit">Duyệt</button>
      </form>
      <form className="admin-form" onSubmit={(event) => {
        event.preventDefault();
        const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
        if (!reason) return setError("Lý do từ chối là bắt buộc.");
        void decide(() => rejectRegistrationRequest(selected.id, reason), `Đã từ chối yêu cầu của ${selected.username}.`);
      }}>
        <label className="field"><span>Lý do từ chối</span><textarea name="reason" maxLength={500} rows={3} /></label>
        <button className="button" disabled={busy} type="submit">Từ chối</button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </SectionCard> : null}
  </div>;
}
