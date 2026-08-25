"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { createResearcherProfile, loadResearcherProfileCatalogs, loadResearcherProfiles, setResearcherProfileStatus, updateResearcherProfile, type ResearcherCatalogItem, type ResearcherProfile, type ResearcherProfileInput, type ResearcherOrganization } from "@/lib/researcher-profiles-api";

const emptyForm: ResearcherProfileInput = { fullName: "", managementOrganizationUnitId: "", researchFieldIds: [], expertiseKeywords: [] };

export function ResearcherProfilesPanel() {
  const [profiles, setProfiles] = useState<ResearcherProfile[]>([]);
  const [organizations, setOrganizations] = useState<ResearcherOrganization[]>([]);
  const [researchFields, setResearchFields] = useState<ResearcherCatalogItem[]>([]);
  const [academicRanks, setAcademicRanks] = useState<ResearcherCatalogItem[]>([]);
  const [academicDegrees, setAcademicDegrees] = useState<ResearcherCatalogItem[]>([]);
  const [form, setForm] = useState<ResearcherProfileInput>(emptyForm);
  const [editing, setEditing] = useState<ResearcherProfile | null>(null);
  const [keywordInput, setKeywordInput] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<Array<{ id: string; fullName: string; managementOrganization: ResearcherOrganization }>>([]);

  async function load() {
    setLoading(true);
    try {
      const [profileData, catalogs] = await Promise.all([loadResearcherProfiles(search), loadResearcherProfileCatalogs()]);
      setProfiles(profileData.profiles);
      setOrganizations(profileData.organizationOptions);
      setResearchFields(catalogs.researchFields);
      setAcademicRanks(catalogs.academicRanks);
      setAcademicDegrees(catalogs.academicDegrees);
      setForm((current) => ({ ...current, managementOrganizationUnitId: current.managementOrganizationUnitId || profileData.organizationOptions[0]?.id || "" }));
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Không thể tải danh sách hồ sơ." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [search]);

  function startCreate() {
    setEditing(null);
    setForm({ ...emptyForm, managementOrganizationUnitId: organizations[0]?.id ?? "" });
    setKeywordInput("");
    setMessage(null);
    setDuplicateCandidates([]);
  }

  function startEdit(profile: ResearcherProfile) {
    setEditing(profile);
    setForm({ fullName: profile.fullName, managementOrganizationUnitId: profile.managementOrganization.id, externalAffiliation: profile.externalAffiliation ?? "", academicRankCatalogItemId: profile.academicRank?.id, academicDegreeCatalogItemId: profile.academicDegree?.id, title: profile.title ?? "", contactEmail: profile.contactEmail ?? "", contactPhone: profile.contactPhone ?? "", contactNote: profile.contactNote ?? "", researchFieldIds: profile.researchFields.map((field) => field.id), expertiseKeywords: profile.expertiseKeywords });
    setKeywordInput(profile.expertiseKeywords.join(", "));
    setMessage(null);
    setDuplicateCandidates([]);
  }

  function updateField(field: keyof ResearcherProfileInput, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(confirmDuplicate = false) {
    setSaving(true);
    setMessage(null);
    try {
      const input = { ...form, expertiseKeywords: keywordInput.split(",").map((item) => item.trim()).filter(Boolean), confirmDuplicate };
      if (editing) {
        await updateResearcherProfile(editing.id, { ...input, contextVersion: editing.viewerAuthorization.contextVersion });
        setMessage({ tone: "success", text: "Đã cập nhật hồ sơ nhà khoa học." });
      } else {
        const result = await createResearcherProfile(input);
        if (result.requiresConfirmation) {
          setDuplicateCandidates(result.duplicateCandidates);
          setMessage({ tone: "warning", text: `Có ${result.duplicateCandidates.length} hồ sơ có dấu hiệu trùng. Kiểm tra danh sách rồi bấm xác nhận lưu lần nữa.` });
          return;
        }
        setDuplicateCandidates([]);
        setMessage({ tone: "success", text: "Đã tạo hồ sơ nhà khoa học." });
      }
      await load();
      if (!editing) startCreate();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(profile: ResearcherProfile) {
    try {
      await setResearcherProfileStatus(profile.id, profile.status === "ACTIVE" ? "INACTIVE" : "ACTIVE", profile.viewerAuthorization.contextVersion);
      setMessage({ tone: "success", text: profile.status === "ACTIVE" ? "Đã ngừng hoạt động hồ sơ." : "Đã kích hoạt hồ sơ." });
      await load();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Không thể đổi trạng thái hồ sơ." });
    }
  }

  function can(profile: ResearcherProfile, action: "researcher-profile.update" | "researcher-profile.activate" | "researcher-profile.deactivate") {
    return profile.viewerAuthorization.allowedActions.includes(action);
  }

  return <div className="grid two-column">
    <section className="section-card">
      <div className="section-header"><div><h2 className="section-title">Danh sách hồ sơ</h2><p className="section-subtitle">Chỉ hiển thị hồ sơ trong phạm vi tổ chức hiện hành.</p></div><button className="button primary" type="button" onClick={startCreate}>Tạo hồ sơ</button></div>
      <div className="filter-bar compact"><div className="filter-field"><label htmlFor="researcher-search">Tìm theo tên hoặc chuyên môn</label><input id="researcher-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nhập từ khóa" /></div></div>
      {message ? <p className={`state-message ${message.tone}`} role="status">{message.text}</p> : null}
      {duplicateCandidates.length > 0 ? <div className="state-message warning"><strong>Ứng viên trùng trong phạm vi được phép xem</strong><ul>{duplicateCandidates.map((candidate) => <li key={candidate.id}>{candidate.fullName} — {candidate.managementOrganization.name}</li>)}</ul></div> : null}
      {loading ? <p className="state-message" role="status">Đang tải danh sách hồ sơ...</p> : profiles.length === 0 ? <EmptyState title="Chưa có hồ sơ" message="Tạo hồ sơ độc lập với tài khoản đăng nhập để bắt đầu." /> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Nhà khoa học</th><th>Đơn vị quản lý</th><th>Lĩnh vực</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{profiles.map((profile) => <tr key={profile.id}><td><span className="record-title">{profile.fullName}</span><span className="record-meta">{profile.title || "Chưa có chức danh"}</span></td><td>{profile.managementOrganization.name}</td><td>{profile.researchFields.map((field) => field.name).join(", ") || "—"}</td><td><StatusBadge status={profile.status === "ACTIVE" ? "approved" : "blocked"} /></td><td><div className="row-actions"><button className="button" type="button" disabled={!can(profile, "researcher-profile.update")} onClick={() => startEdit(profile)}>Sửa</button><button className="button" type="button" disabled={!can(profile, profile.status === "ACTIVE" ? "researcher-profile.deactivate" : "researcher-profile.activate")} onClick={() => void changeStatus(profile)}>{profile.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}</button></div></td></tr>)}</tbody></table></div>}
      <div className="mobile-list">{profiles.map((profile) => <article className="list-card" key={profile.id}><div className="list-card-header"><div><strong>{profile.fullName}</strong><span className="record-meta">{profile.managementOrganization.name}</span></div><StatusBadge status={profile.status === "ACTIVE" ? "approved" : "blocked"} /></div><div className="row-actions"><button className="button" type="button" disabled={!can(profile, "researcher-profile.update")} onClick={() => startEdit(profile)}>Sửa</button><button className="button" type="button" disabled={!can(profile, profile.status === "ACTIVE" ? "researcher-profile.deactivate" : "researcher-profile.activate")} onClick={() => void changeStatus(profile)}>{profile.status === "ACTIVE" ? "Ngừng hoạt động" : "Kích hoạt"}</button></div></article>)}</div>
    </section>
    <section className="section-card"><div className="section-header"><div><h2 className="section-title">{editing ? "Cập nhật hồ sơ" : "Tạo hồ sơ độc lập"}</h2><p className="section-subtitle">Không tự tạo hoặc thay đổi tài khoản đăng nhập.</p></div></div><div className="form-grid two"><label className="field"><span>Họ và tên *</span><input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} /></label><label className="field"><span>Đơn vị quản lý *</span><select value={form.managementOrganizationUnitId} onChange={(event) => updateField("managementOrganizationUnitId", event.target.value)} disabled={Boolean(editing)}><option value="">Chọn đơn vị</option>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label><label className="field"><span>Học hàm</span><select value={form.academicRankCatalogItemId ?? ""} onChange={(event) => updateField("academicRankCatalogItemId", event.target.value)}><option value="">Chưa chọn</option>{academicRanks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Học vị</span><select value={form.academicDegreeCatalogItemId ?? ""} onChange={(event) => updateField("academicDegreeCatalogItemId", event.target.value)}><option value="">Chưa chọn</option>{academicDegrees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Chức danh</span><input value={form.title ?? ""} onChange={(event) => updateField("title", event.target.value)} /></label><label className="field"><span>Đơn vị công tác ngoài</span><input value={form.externalAffiliation ?? ""} onChange={(event) => updateField("externalAffiliation", event.target.value)} /></label><label className="field"><span>Email liên hệ</span><input type="email" value={form.contactEmail ?? ""} onChange={(event) => updateField("contactEmail", event.target.value)} /></label><label className="field"><span>Điện thoại</span><input value={form.contactPhone ?? ""} onChange={(event) => updateField("contactPhone", event.target.value)} /></label></div><label className="field"><span>Lĩnh vực nghiên cứu *</span><select multiple size={Math.min(Math.max(researchFields.length, 3), 6)} value={form.researchFieldIds} onChange={(event) => setForm((current) => ({ ...current, researchFieldIds: Array.from(event.target.selectedOptions, (option) => option.value) }))}>{researchFields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}</select><small className="field-hint">Giữ Ctrl/Cmd để chọn nhiều lĩnh vực.</small></label><label className="field"><span>Từ khóa chuyên môn</span><input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="Ví dụ: y học quân sự, công nghệ y sinh" /></label><label className="field"><span>Ghi chú liên hệ</span><textarea rows={3} value={form.contactNote ?? ""} onChange={(event) => updateField("contactNote", event.target.value)} /></label><div className="button-row"><button className="button" type="button" onClick={startCreate}>Làm mới</button><button className="button primary" type="button" disabled={saving} onClick={() => void save(false)}>{saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Lưu hồ sơ"}</button></div>{!editing && message?.tone === "warning" ? <div className="state-message warning"><p>Hệ thống chỉ hiển thị ứng viên trùng trong phạm vi bạn được xem.</p><button className="button primary" type="button" disabled={saving} onClick={() => void save(true)}>Xác nhận vẫn lưu</button></div> : null}</section>
  </div>;
}
