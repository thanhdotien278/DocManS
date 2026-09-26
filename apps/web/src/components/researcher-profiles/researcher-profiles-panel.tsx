"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { createResearcherProfile, getResearcherProfile, loadResearcherProfileCatalogs, loadResearcherProfiles, profileRequest, setResearcherProfileStatus, updateResearcherProfile, type Participation, type ProfileHistory, type Publication, type ResearcherProfile, type ResearcherProfileInput, type ResearcherProfileSummary, type ResearcherOrganization } from "@/lib/researcher-profiles-api";

const emptyForm: ResearcherProfileInput = { fullName: "", profileType: "INTERNAL", managementOrganizationUnitId: "", researchFieldIds: [], expertiseKeywords: [], publications: [], participations: [] };
const levels = { ACADEMY_INSTITUTIONAL: "Cấp Học viện / cơ sở", MINISTRY: "Cấp Bộ", OTHER: "Cấp khác" };
const historyActions: Record<string, string> = { CREATE: "Tạo hồ sơ", UPDATE: "Cập nhật hồ sơ", SELF_UPDATE: "Nhà nghiên cứu cập nhật", ACTIVATE: "Kích hoạt", DEACTIVATE: "Ngừng hoạt động", ACCOUNT_CREATED: "Tạo và liên kết tài khoản", ACCOUNT_LINKED: "Liên kết tài khoản", ACCOUNT_UNLINKED: "Hủy liên kết", ACCOUNT_RESET: "Gửi lại email kích hoạt" };
type ProfileTab = "profile" | "account" | "history" | "preview";

export function ResearcherProfilesPanel({ self = false }: { self?: boolean }) {
  const [profiles, setProfiles] = useState<ResearcherProfileSummary[]>([]);
  const [organizations, setOrganizations] = useState<ResearcherOrganization[]>([]);
  const [catalogs, setCatalogs] = useState<Awaited<ReturnType<typeof loadResearcherProfileCatalogs>>>({ researchFields: [], academicRanks: [], academicDegrees: [] });
  const [editing, setEditing] = useState<ResearcherProfile | null>(null);
  const [form, setForm] = useState<ResearcherProfileInput>(emptyForm);
  const [researchFieldQuery, setResearchFieldQuery] = useState("");
  const [researchFieldOpen, setResearchFieldOpen] = useState(false);
  const [keywords, setKeywords] = useState("");
  const [filters, setFilters] = useState({ keyword: "", profileType: "", status: "", organizationUnitId: "", researchFieldId: "", page: "1" });
  const [total, setTotal] = useState(0);
  const [canCreate, setCanCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<Array<{ id: string; fullName: string }>>([]);
  const [history, setHistory] = useState<ProfileHistory[] | null>(null);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [accountQuery, setAccountQuery] = useState("");
  const [accounts, setAccounts] = useState<Array<{ id: string; username: string; displayName: string }>>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");
  const loadVersion = useRef(0);

  const allowed = (action: string) => editing?.viewerAuthorization.allowedActions.some((value) => value === action) ?? false;
  const editable = editing ? allowed(self ? "researcher-profile.self.update" : "researcher-profile.update") : canCreate;
  const selectedResearchFields = catalogs.researchFields.filter((item) => form.researchFieldIds.includes(item.id));
  const visibleResearchFields = catalogs.researchFields.filter((item) => item.name.toLowerCase().includes(researchFieldQuery.trim().toLowerCase()));
  const accountProvisionOnCreate = !editing && !self && ((form.profileType ?? "INTERNAL") === "INTERNAL" || form.provisionAccount === true);

  function select(profile: ResearcherProfile) {
    setProfileTab("profile");
    setEditing(profile);
    setForm({ fullName: profile.fullName, profileType: profile.profileType, managementOrganizationUnitId: profile.managementOrganization.id,
      externalAffiliation: profile.externalAffiliation, academicRankCatalogItemId: profile.academicRank?.id ?? "", academicDegreeCatalogItemId: profile.academicDegree?.id ?? "",
      title: profile.title, position: profile.position, militaryRank: profile.militaryRank, contactEmail: profile.contactEmail, contactPhone: profile.contactPhone, contactNote: profile.contactNote,
      researchFieldIds: profile.researchFields.map((field) => field.id), publications: profile.publications,
      participations: profile.participations.filter((item) => item.status !== "SUPERSEDED").map(({ id, projectTitle, participationRole, level, startsOn, endsOn, status, notes }) => ({ id, projectTitle, participationRole, level, startsOn, endsOn, status, notes })), username: profile.account?.username ?? "" });
    setKeywords(profile.expertiseKeywords.join(", "));
    setResearchFieldQuery(""); setResearchFieldOpen(false);
    setEmail(profile.credentialDelivery?.recipientEmail ?? profile.account?.email ?? profile.contactEmail ?? "");
    setReason(""); setAccounts([]); setSelectedAccount(""); setHistory(null); setDuplicates([]);
  }

  async function load() {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      if (self) {
        const result = await getResearcherProfile("my-profile");
        const nextCatalogs = await loadResearcherProfileCatalogs();
        if (version !== loadVersion.current) return;
        select(result.profile); setCatalogs(nextCatalogs);
      } else {
        const [data, nextCatalogs] = await Promise.all([loadResearcherProfiles(filters), loadResearcherProfileCatalogs()]);
        if (version !== loadVersion.current) return;
        setProfiles(data.profiles); setOrganizations(data.organizationOptions); setCatalogs(nextCatalogs); setTotal(data.total); setCanCreate(data.canCreate);
        setForm((current) => ({ ...current, managementOrganizationUnitId: current.managementOrganizationUnitId || data.organizationOptions[0]?.id || "" }));
      }
    } catch (cause) { if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ."); }
    finally { if (version === loadVersion.current) setLoading(false); }
  }
  useEffect(() => { void load(); return () => { loadVersion.current++; }; }, [self, filters]);

  function startCreate() { setProfileTab("profile"); setEditing(null); setForm({ ...emptyForm, managementOrganizationUnitId: organizations[0]?.id ?? "", provisionAccount: false }); setKeywords(""); setResearchFieldQuery(""); setResearchFieldOpen(false); setDuplicates([]); setHistory(null); setMessage(""); setError(""); }
  function field(key: keyof ResearcherProfileInput, value: string) { setForm((current) => ({ ...current, [key]: value })); }
  function filter(key: keyof typeof filters, value: string) { setFilters((current) => ({ ...current, [key]: value, ...(key === "page" ? {} : { page: "1" }) })); }
  async function perform(work: () => Promise<void>) { setBusy(true); setError(""); setMessage(""); try { await work(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thực hiện thao tác."); } finally { setBusy(false); } }
  function toggleResearchField(id: string) {
    setForm((current) => ({ ...current, researchFieldIds: current.researchFieldIds.includes(id) ? current.researchFieldIds.filter((value) => value !== id) : [...current.researchFieldIds, id] }));
  }

  async function save(confirmDuplicate = false) {
    if (form.researchFieldIds.length === 0) { setError("Cần chọn ít nhất một lĩnh vực nghiên cứu."); return; }
    await perform(async () => {
      const { managementOrganizationUnitId, profileType, provisionAccount, username: nextUsername, ...personal } = form;
      const input = { ...personal, expertiseKeywords: keywords.split(",").map((value) => value.trim()).filter(Boolean) };
      if (editing) {
        const result = await updateResearcherProfile(self ? "my-profile" : editing.id, { ...input, ...(self ? { username: nextUsername } : { profileType }), contextVersion: editing.viewerAuthorization.contextVersion });
        select(result.profile);
      } else {
        const result = await createResearcherProfile({ ...input, managementOrganizationUnitId, profileType, provisionAccount, confirmDuplicate });
        if (result.requiresConfirmation) { setDuplicates(result.duplicateCandidates); return; }
        if (result.profile) select(result.profile);
      }
      setMessage("Đã lưu hồ sơ.");
      if (!self) await load();
    });
  }

  async function accountAction(action: "" | "/link" | "/unlink" | "/resend-activation") {
    if (!editing) return;
    await perform(async () => {
      const result = await profileRequest<{ delivery?: { status: string; expiresAt?: string } }>(`/${editing.id}/account${action}`, { method: "POST", body: JSON.stringify({ contextVersion: editing.viewerAuthorization.contextVersion, ...(action === "" || action === "/resend-activation" ? { email } : {}), ...(action === "/link" ? { userId: selectedAccount } : {}), reason: reason || undefined }) });
      select((await getResearcherProfile(editing.id)).profile);
      setMessage(result.delivery ? result.delivery.status === "ACCEPTED" ? "Máy chủ email đã nhận thư kích hoạt." : "Chưa xác nhận gửi email. Có thể gửi lại email kích hoạt." : "Đã cập nhật liên kết tài khoản.");
      await load();
    });
  }

  function publicationField(index: number, key: keyof Publication, value: string | number | null) { setForm((current) => ({ ...current, publications: current.publications?.map((item, i) => i === index ? { ...item, [key]: value } : item) })); }
  function participationField(index: number, key: keyof Participation, value: string) { setForm((current) => ({ ...current, participations: current.participations?.map((item, i) => i === index ? { ...item, [key]: value } : item) })); }

  const profileTabs: Array<{ id: ProfileTab; label: string }> = [
    { id: "profile", label: "Thông tin & nghiên cứu" },
    ...(!self ? [{ id: "account" as const, label: "Tài khoản" }] : []),
    { id: "history", label: "Lịch sử" },
    { id: "preview", label: "Bản in" }
  ];

  return <div className="grid">
    {error ? <p className="state-message error" role="alert">{error}</p> : null}
    {message ? <p className="state-message success" role="status">{message}</p> : null}
    {loading ? <p role="status">Đang tải hồ sơ…</p> : null}
    {!self ? <section className="section-card">
      <div className="section-header"><h2>Hồ sơ nhà khoa học</h2><button className="button primary" disabled={!canCreate || busy} onClick={startCreate}>Tạo hồ sơ</button></div>
      <div className="form-grid two">
        <label className="field"><span>Tìm tên, email hoặc chuyên môn</span><input value={filters.keyword} onChange={(event) => filter("keyword", event.target.value)} /></label>
        <label className="field"><span>Loại nhà nghiên cứu</span><select value={filters.profileType} onChange={(event) => filter("profileType", event.target.value)}><option value="">Tất cả</option><option value="INTERNAL">Nội bộ</option><option value="EXTERNAL">Bên ngoài</option></select></label>
        <label className="field"><span>Trạng thái hồ sơ</span><select value={filters.status} onChange={(event) => filter("status", event.target.value)}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></select></label>
        <label className="field"><span>Đơn vị quản lý</span><select value={filters.organizationUnitId} onChange={(event) => filter("organizationUnitId", event.target.value)}><option value="">Tất cả đơn vị được cấp</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field"><span>Lĩnh vực</span><select value={filters.researchFieldId} onChange={(event) => filter("researchFieldId", event.target.value)}><option value="">Tất cả</option>{catalogs.researchFields.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {!profiles.length && !loading ? <EmptyState title="Không có hồ sơ phù hợp" message="Thay đổi bộ lọc hoặc tạo hồ sơ trong phạm vi được cấp." /> : <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách hồ sơ nhà khoa học"><table className="data-table"><thead><tr><th>Họ tên</th><th>Loại / đơn vị</th><th>Trạng thái</th><th>Tài khoản</th><th>Thao tác</th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id}><td>{profile.fullName}</td><td>{profile.profileType === "EXTERNAL" ? "Bên ngoài" : "Nội bộ"}<br />{profile.managementOrganization.name}</td><td>{profile.status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"}</td><td>{accountLabel(profile.account)}</td><td><button className="button" disabled={busy} onClick={() => void perform(async () => select((await getResearcherProfile(profile.id)).profile))}>Xem / sửa</button></td></tr>)}</tbody></table></div>}
      <div className="mobile-list">{profiles.map((profile) => <article className="list-card" key={profile.id}><h3>{profile.fullName}</h3><p>{profile.profileType === "EXTERNAL" ? "Bên ngoài" : "Nội bộ"} · {profile.managementOrganization.name}</p><p>{profile.status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"} · {accountLabel(profile.account)}</p><button className="button" disabled={busy} onClick={() => void perform(async () => select((await getResearcherProfile(profile.id)).profile))}>Xem / sửa</button></article>)}</div>
      <div className="button-row"><button className="button" disabled={Number(filters.page) <= 1 || loading} onClick={() => filter("page", String(Number(filters.page) - 1))}>Trang trước</button><span>Trang {filters.page} · {total} hồ sơ</span><button className="button" disabled={Number(filters.page) * 20 >= total || loading} onClick={() => filter("page", String(Number(filters.page) + 1))}>Trang sau</button></div>
    </section> : null}
    {editing ? <div className="profile-tabs" role="tablist" aria-label="Các phần hồ sơ nhà khoa học">
      {profileTabs.map((tab, index) => <button id={`profile-tab-${tab.id}`} key={tab.id} className={`button ${profileTab === tab.id ? "primary" : ""}`} type="button" role="tab" aria-selected={profileTab === tab.id} aria-controls={profileTab === tab.id ? `profile-panel-${tab.id}` : undefined} tabIndex={profileTab === tab.id ? 0 : -1} onClick={() => setProfileTab(tab.id)} onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + profileTabs.length) % profileTabs.length;
        setProfileTab(profileTabs[nextIndex].id);
        document.getElementById(`profile-tab-${profileTabs[nextIndex].id}`)?.focus();
      }}>{tab.label}</button>)}
    </div> : null}
    {self && !editing ? (!loading ? <EmptyState title="Chưa có hồ sơ được liên kết" message="Liên hệ cán bộ quản lý khoa học để kiểm tra liên kết tài khoản." /> : null) : (!editing || profileTab === "profile") ? <section className="section-card" id="profile-panel-profile" role={editing ? "tabpanel" : undefined} aria-labelledby={editing ? "profile-tab-profile" : undefined}>
      <h2>{self ? "Hồ sơ của tôi" : editing ? editing.fullName : "Tạo hồ sơ độc lập"}</h2>
      <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <fieldset disabled={busy || !editable} style={{ border: 0, padding: 0, minWidth: 0 }}>
          <div className="form-grid two">
            <label className="field"><span>Họ và tên *</span><input required maxLength={240} value={form.fullName} onChange={(event) => field("fullName", event.target.value)} /></label>
            {!self ? <><label className="field"><span>Loại nhà nghiên cứu *</span><select value={form.profileType} disabled={!!editing?.account} onChange={(event) => setForm((current) => ({ ...current, profileType: event.target.value as "INTERNAL" | "EXTERNAL", provisionAccount: event.target.value === "EXTERNAL" ? false : current.provisionAccount }))}><option value="INTERNAL">Nội bộ</option><option value="EXTERNAL">Bên ngoài</option></select></label><label className="field"><span>Đơn vị quản lý *</span><select required value={form.managementOrganizationUnitId} disabled={!!editing} onChange={(event) => field("managementOrganizationUnitId", event.target.value)}><option value="">Chọn đơn vị</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></> : <p>Đơn vị quản lý: {editing?.managementOrganization.name}</p>}
            {([['academicRankCatalogItemId', 'Học hàm', catalogs.academicRanks], ['academicDegreeCatalogItemId', 'Học vị', catalogs.academicDegrees]] as const).map(([key, label, options]) => <label className="field" key={key}><span>{label}</span><select value={form[key] ?? ""} onChange={(event) => field(key, event.target.value)}><option value="">Chưa chọn</option>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>)}
            {self ? <label className="field"><span>Tên đăng nhập</span><input value={form.username ?? ""} onChange={(event) => field("username", event.target.value)} /></label> : null}
            {([['title', 'Chức danh'], ['position', 'Chức vụ / vị trí công tác'], ['militaryRank', 'Quân hàm'], ['externalAffiliation', 'Đơn vị công tác / tổ chức'], ['contactEmail', accountProvisionOnCreate ? 'Email *' : 'Email liên hệ'], ['contactPhone', 'Điện thoại']] as const).map(([key, label]) => <label key={key} className="field"><span>{label}</span><input required={key === "contactEmail" && accountProvisionOnCreate} type={key === "contactEmail" ? "email" : key === "contactPhone" ? "tel" : "text"} value={form[key] ?? ""} onChange={(event) => field(key, event.target.value)} /></label>)}
          </div>
          {!editing && !self && form.profileType === "INTERNAL" ? <p className="record-meta">Tài khoản truy cập sẽ được tạo và email kích hoạt sẽ được gửi sau khi lưu.</p> : null}
          {!editing && !self && form.profileType === "EXTERNAL" ? <label className="field"><span><input type="checkbox" checked={form.provisionAccount === true} onChange={(event) => setForm((current) => ({ ...current, provisionAccount: event.target.checked }))} /> Tạo tài khoản truy cập hệ thống</span></label> : null}
          <div className="field researcher-field-picker">
            <span id="research-fields-label">Lĩnh vực nghiên cứu *</span>
            <div className="multi-select-control" role="group" aria-labelledby="research-fields-label">
              {selectedResearchFields.length ? <div className="multi-select-chips" aria-label="Lĩnh vực đã chọn">{selectedResearchFields.map((item) => <button key={item.id} type="button" className="multi-select-chip" onClick={() => toggleResearchField(item.id)} aria-label={`Bỏ ${item.name}`}>{item.name}<span aria-hidden="true">×</span></button>)}</div> : null}
              <input type="search" value={researchFieldQuery} placeholder={selectedResearchFields.length ? "Tìm lĩnh vực" : "Chưa chọn"} onFocus={() => setResearchFieldOpen(true)} onChange={(event) => { setResearchFieldQuery(event.target.value); setResearchFieldOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") setResearchFieldOpen(false); }} aria-controls="research-fields-options" aria-expanded={researchFieldOpen} aria-labelledby="research-fields-label" />
              <button type="button" className="multi-select-toggle" onClick={() => setResearchFieldOpen((value) => !value)} aria-expanded={researchFieldOpen} aria-controls="research-fields-options">Chọn</button>
            </div>
            {researchFieldOpen ? <div id="research-fields-options" className="multi-select-menu" role="group" aria-label="Chọn lĩnh vực nghiên cứu">
              {visibleResearchFields.length ? visibleResearchFields.map((item) => <label key={item.id} className="multi-select-option"><input type="checkbox" checked={form.researchFieldIds.includes(item.id)} onChange={() => toggleResearchField(item.id)} />{item.name}</label>) : <p className="field-hint">Không có lĩnh vực phù hợp.</p>}
            </div> : null}
            <small className="field-hint">Có thể tìm và chọn nhiều lĩnh vực.</small>
          </div>
          <label className="field"><span>Chuyên môn / từ khóa</span><input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Phân cách bằng dấu phẩy" /></label>
          <label className="field"><span>Ghi chú</span><textarea value={form.contactNote ?? ""} onChange={(event) => field("contactNote", event.target.value)} /></label>
          <h3>Danh sách công bố</h3>
          {form.publications?.map((item, index) => <fieldset key={item.id ?? `new-${index}`} className="section-card"><legend>Công bố {index + 1}</legend><div className="form-grid two">
            <label className="field"><span>Tên công bố *</span><input required value={item.title} onChange={(event) => publicationField(index, "title", event.target.value)} /></label>
            <label className="field"><span>Tạp chí / nơi công bố</span><input value={item.venue ?? ""} onChange={(event) => publicationField(index, "venue", event.target.value)} /></label>
            <label className="field"><span>Năm công bố</span><input type="number" min={1800} max={2200} value={item.publicationYear ?? ""} onChange={(event) => publicationField(index, "publicationYear", event.target.value ? Number(event.target.value) : null)} /></label>
            <label className="field"><span>DOI</span><input value={item.doi ?? ""} onChange={(event) => publicationField(index, "doi", event.target.value)} /></label>
            <label className="field"><span>Tác giả</span><input value={item.authors ?? ""} onChange={(event) => publicationField(index, "authors", event.target.value)} /></label>
            <label className="field"><span>Trạng thái công bố</span><select value={item.status ?? "ACTIVE"} onChange={(event) => publicationField(index, "status", event.target.value)}><option value="ACTIVE">Hiển thị</option><option value="INACTIVE">Lưu lịch sử</option></select></label>
            <label className="field"><span>Ghi chú công bố</span><textarea value={item.notes ?? ""} onChange={(event) => publicationField(index, "notes", event.target.value)} /></label>
          </div>{!item.id ? <button type="button" className="button" onClick={() => setForm((current) => ({ ...current, publications: current.publications?.filter((_, i) => i !== index) }))}>Bỏ mục chưa lưu</button> : null}</fieldset>)}
          <button type="button" className="button" onClick={() => setForm((current) => ({ ...current, publications: [...(current.publications ?? []), { title: "", status: "ACTIVE" }] }))}>Thêm công bố</button>
          <h3>Quá trình tham gia nghiên cứu</h3><p className="record-meta">Thông tin tự khai, không cấp quyền trên đề tài. Các phiên bản trước được giữ trong lịch sử.</p>
          {form.participations?.map((item, index) => <fieldset key={item.id ?? `new-${index}`} className="section-card"><legend>Tham gia {index + 1}</legend><div className="form-grid two">
            <label className="field"><span>Tên đề tài / dự án *</span><input required value={item.projectTitle} onChange={(event) => participationField(index, "projectTitle", event.target.value)} /></label>
            <label className="field"><span>Vai trò *</span><input required value={item.participationRole} onChange={(event) => participationField(index, "participationRole", event.target.value)} /></label>
            <label className="field"><span>Cấp đề tài *</span><select value={item.level} onChange={(event) => participationField(index, "level", event.target.value)}>{Object.entries(levels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="field"><span>Trạng thái tham gia</span><select value={item.status ?? "ACTIVE"} onChange={(event) => participationField(index, "status", event.target.value)}><option value="ACTIVE">Đang tham gia</option><option value="INACTIVE">Đã kết thúc</option></select></label>
            <label className="field"><span>Ngày bắt đầu</span><input type="date" value={item.startsOn ?? ""} onChange={(event) => participationField(index, "startsOn", event.target.value)} /></label>
            <label className="field"><span>Ngày kết thúc</span><input type="date" value={item.endsOn ?? ""} min={item.startsOn ?? undefined} onChange={(event) => participationField(index, "endsOn", event.target.value)} /></label>
            <label className="field"><span>Ghi chú tham gia</span><textarea value={item.notes ?? ""} onChange={(event) => participationField(index, "notes", event.target.value)} /></label>
          </div>{!item.id ? <button type="button" className="button" onClick={() => setForm((current) => ({ ...current, participations: current.participations?.filter((_, i) => i !== index) }))}>Bỏ mục chưa lưu</button> : null}</fieldset>)}
          <button type="button" className="button" onClick={() => setForm((current) => ({ ...current, participations: [...(current.participations ?? []), { projectTitle: "", participationRole: "", level: "ACADEMY_INSTITUTIONAL", status: "ACTIVE" }] }))}>Thêm quá trình tham gia</button>
          <div className="button-row"><button className="button primary" type="submit">{busy ? "Đang lưu…" : "Lưu hồ sơ"}</button></div>
        </fieldset>
      </form>
      {duplicates.length ? <div className="state-message warning"><p>Có hồ sơ có thể trùng:</p><ul>{duplicates.map((item) => <li key={item.id}>{item.fullName}</li>)}</ul><button className="button" disabled={busy} onClick={() => void save(true)}>Xác nhận vẫn tạo hồ sơ</button></div> : null}
      {editing && !self ? <div className="button-row"><button className="button" disabled={busy || !allowed(editing.status === "ACTIVE" ? "researcher-profile.deactivate" : "researcher-profile.activate")} onClick={() => void perform(async () => { select((await setResearcherProfileStatus(editing.id, editing.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", editing.viewerAuthorization.contextVersion)).profile); await load(); })}>{editing.status === "ACTIVE" ? "Ngừng hoạt động hồ sơ" : "Kích hoạt hồ sơ"}</button></div> : null}
    </section> : null}
    {editing && !self && profileTab === "account" ? <section className="section-card" id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account"><h2>Tài khoản hệ thống / Quyền truy cập</h2>
      <p>{editing.account ? `${editing.account.email ?? "Chưa có email"} — ${accountStatusLabel(editing.account.status)}${editing.account.username ? ` · ${editing.account.username}` : ""}` : "Nhà khoa học này chưa có quyền truy cập DocManS."}</p>
      {editing.credentialDelivery ? <p>Gửi email gần nhất: {editing.credentialDelivery.status === "ACCEPTED" ? "Máy chủ email đã nhận thư" : "Chưa xác nhận gửi"}{editing.credentialDelivery.expiresAt ? ` · Hết hạn ${new Date(editing.credentialDelivery.expiresAt).toLocaleString("vi-VN")}` : ""}</p> : null}
      <div className="form-grid two">
        <label className="field"><span>Email kích hoạt *</span><input type="email" value={email} disabled={busy || !!editing.account} onChange={(event) => setEmail(event.target.value)} /><small>Xác nhận địa chỉ của nhà nghiên cứu trước khi tạo hoặc gửi lại kích hoạt.</small></label>
        {editing.account ? <label className="field"><span>Lý do hủy liên kết</span><input value={reason} disabled={busy} onChange={(event) => setReason(event.target.value)} /></label> : null}
      </div>
      <div className="button-row"><button className="button primary" disabled={busy || !email || !allowed("researcher-profile.account.create")} onClick={() => void accountAction("")}>Tạo tài khoản và gửi email kích hoạt</button><button className="button" disabled={busy || !email || !allowed("researcher-profile.account.reset")} onClick={() => void accountAction("/resend-activation")}>Gửi lại email kích hoạt</button><button className="button" disabled={busy || !reason || !allowed("researcher-profile.account.unlink")} onClick={() => void accountAction("/unlink")}>Hủy liên kết</button></div>
      {!editing.account && allowed("researcher-profile.account.link") ? <div><h3>Liên kết tài khoản đã có</h3><label className="field"><span>Tìm tài khoản chưa liên kết</span><input value={accountQuery} onChange={(event) => setAccountQuery(event.target.value)} /></label><button className="button" disabled={busy} onClick={() => void perform(async () => { setAccounts((await profileRequest<{ accounts: typeof accounts }>(`/${editing.id}/account-candidates?keyword=${encodeURIComponent(accountQuery)}`)).accounts); setSelectedAccount(""); })}>Tìm tài khoản</button><label className="field"><span>Tài khoản phù hợp</span><select value={selectedAccount} onChange={(event) => setSelectedAccount(event.target.value)}><option value="">Chọn tài khoản</option>{accounts.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.username})</option>)}</select></label><button className="button" disabled={busy || !selectedAccount} onClick={() => void accountAction("/link")}>Liên kết tài khoản</button></div> : null}
    </section> : null}
    {editing && profileTab === "history" ? <section className="section-card" id="profile-panel-history" role="tabpanel" aria-labelledby="profile-tab-history"><h2>Lịch sử hồ sơ</h2>
      {editing.participations.filter((item) => item.status === "SUPERSEDED").map((item) => <details key={item.id}><summary>{item.projectTitle} — phiên bản trước</summary><p>{item.participationRole} · {levels[item.level]} · {item.startsOn || "—"} – {item.endsOn || "—"}</p><p>{item.notes}</p></details>)}
      <button className="button" disabled={busy || !allowed("researcher-profile.history.read")} onClick={() => void perform(async () => setHistory((await profileRequest<{ history: ProfileHistory[] }>(`/${editing.id}/history`)).history))}>Xem lịch sử thay đổi</button>
      {history?.map((item) => <details key={item.id}><summary>{new Date(item.createdAt).toLocaleString("vi-VN")} · {historyActions[item.action] ?? item.action}</summary><p>{item.reason}</p><HistoryFacts label="Trước" facts={item.beforeFacts} /><HistoryFacts label="Sau" facts={item.afterFacts} /></details>)}
      {history?.length === 0 ? <p>Chưa có lịch sử thay đổi.</p> : null}
    </section> : null}
    {editing && profileTab === "preview" ? <section className="section-card profile-print-preview" id="profile-panel-preview" role="tabpanel" aria-labelledby="profile-tab-preview">
      <div className="section-header"><div><h2>Tóm tắt lý lịch khoa học</h2><p className="record-meta">Bản trình bày được tạo từ dữ liệu DocManS hiện có; không bổ sung trường nghiệp vụ mới.</p></div><button className="button" type="button" onClick={() => window.print()}>In hồ sơ</button></div>
      <dl className="summary-grid">
        <div><dt>Họ và tên</dt><dd>{form.fullName || "—"}</dd></div>
        <div><dt>Đơn vị</dt><dd>{editing.managementOrganization.name}</dd></div>
        <div><dt>Học hàm / học vị</dt><dd>{[editing.academicRank?.name, editing.academicDegree?.name].filter(Boolean).join(" · ") || "—"}</dd></div>
        <div><dt>Chức vụ / vị trí</dt><dd>{form.position || form.title || "—"}</dd></div>
        <div><dt>Email</dt><dd>{form.contactEmail || "—"}</dd></div>
        <div><dt>Điện thoại</dt><dd>{form.contactPhone || "—"}</dd></div>
        <div><dt>Lĩnh vực nghiên cứu</dt><dd>{selectedResearchFields.map((item) => item.name).join(", ") || "—"}</dd></div>
        <div><dt>Chuyên môn / từ khóa</dt><dd>{keywords || "—"}</dd></div>
      </dl>
      <h3>Công bố</h3>
      {form.publications?.filter((item) => item.status !== "INACTIVE").length ? <ol>{form.publications.filter((item) => item.status !== "INACTIVE").map((item, index) => <li key={item.id ?? index}>{item.title}{item.authors ? ` — ${item.authors}` : ""}{item.venue ? `, ${item.venue}` : ""}{item.publicationYear ? ` (${item.publicationYear})` : ""}</li>)}</ol> : <p>Chưa có công bố.</p>}
      <h3>Quá trình tham gia nghiên cứu</h3>
      {form.participations?.length ? <ul>{form.participations.map((item, index) => <li key={item.id ?? index}><strong>{item.projectTitle}</strong> — {item.participationRole}, {levels[item.level]}</li>)}</ul> : <p>Chưa có quá trình tham gia.</p>}
    </section> : null}
  </div>;
}

function accountLabel(account: ResearcherProfile["account"]) {
  return account ? account.username || account.email || "Đã liên kết tài khoản" : "Chưa có tài khoản";
}

function accountStatusLabel(status: string) {
  return status === "active" ? "Đang hoạt động" : status === "pending_activation" ? "Chờ kích hoạt" : "Đã khóa";
}

function HistoryFacts({ label, facts }: { label: string; facts?: Record<string, unknown> }) {
  if (!facts) return null;
  const names: Record<string, string> = { fullName: "Họ tên", title: "Chức danh", position: "Chức vụ", militaryRank: "Quân hàm", contactEmail: "Email", contactPhone: "Điện thoại", contactNote: "Ghi chú", externalAffiliation: "Đơn vị công tác", linkedUserId: "Tài khoản liên kết", status: "Trạng thái", profileType: "Loại hồ sơ" };
  return <div><strong>{label}</strong><dl>{Object.entries(names).filter(([key]) => facts[key] != null).map(([key, name]) => <div key={key}><dt>{name}</dt><dd>{String(facts[key])}</dd></div>)}</dl>{Array.isArray(facts.publications) ? <ul>{(facts.publications as Publication[]).map((item, i) => <li key={i}>{item.title} · {item.venue} · {item.publicationYear} · {item.authors} · {item.doi} · {item.status} · {item.notes}</li>)}</ul> : null}{Array.isArray(facts.participations) ? <ul>{(facts.participations as Participation[]).map((item, i) => <li key={i}>{item.projectTitle} · {item.participationRole} · {levels[item.level]} · {item.startsOn?.slice(0, 10)} – {item.endsOn?.slice(0, 10)} · {item.status} · {item.notes}</li>)}</ul> : null}</div>;
}
