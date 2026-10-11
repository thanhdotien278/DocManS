"use client";

import { useEffect, useRef, useState } from "react";
import { getResearcherProfile, loadResearcherProfileCatalogs, profileRequest, ProfileRequestError, updateResearcherProfile, type ProfileHistory, type ResearcherProfile, type ResearcherProfileInput, type ScientificCurriculumVitae } from "@/lib/researcher-profiles-api";
import { CvGeneralTab, type CvGeneralDraft } from "./cv-general-tab";
import { HistoryFacts, historyActions } from "./cv-history";

type CvTab = "general" | "education" | "work" | "research" | "print";
type CvCatalogs = Awaited<ReturnType<typeof loadResearcherProfileCatalogs>>;

function text(value: string | null | undefined) {
  return value ?? "";
}

function draftFromProfile(profile: ResearcherProfile): CvGeneralDraft {
  const personal = profile.curriculumVitae?.personalInfo;
  return {
    avatarUrl: text(personal?.avatarUrl),
    scientistType: personal?.scientistType ?? "",
    fullName: profile.fullName,
    gender: personal?.gender ?? "",
    birthDate: text(personal?.birthDate),
    birthPlace: text(personal?.birthPlace),
    nationality: text(personal?.nationality),
    idNumber: text(personal?.idNumber),
    idIssueDate: text(personal?.idIssueDate),
    idIssuePlace: text(personal?.idIssuePlace),
    externalAffiliation: text(profile.externalAffiliation),
    position: text(profile.position),
    militaryRank: text(profile.militaryRank),
    title: text(profile.title),
    contactPhone: text(profile.contactPhone),
    contactEmail: text(profile.contactEmail),
    contactAddress: text(personal?.contactAddress),
    organization: text(personal?.organization),
    username: text(profile.account?.username),
    academicRankCatalogItemId: text(profile.academicRank?.id),
    academicDegreeCatalogItemId: text(profile.academicDegree?.id),
    englishAcademicTitle: text(personal?.englishAcademicTitle),
    researchFieldIds: profile.researchFields.map((field) => field.id),
    expertiseKeywords: profile.expertiseKeywords.join(", "),
    languages: personal?.languages ? personal.languages.map((language) => ({ ...language })) : [],
    bankAccount: text(personal?.bankAccount),
    bankName: text(personal?.bankName),
    bankBranch: text(personal?.bankBranch),
    smartCaSerial: text(personal?.smartCaSerial),
    shareDataAgreement: personal?.shareDataAgreement ?? true,
    note: text(profile.curriculumVitae?.note)
  };
}

function cvFromDraft(profile: ResearcherProfile, draft: CvGeneralDraft): ScientificCurriculumVitae {
  const existing = profile.curriculumVitae ?? { cvSchemaVersion: 1 as const };
  const personalInfo = { ...(existing.personalInfo ?? {}) } as Record<string, unknown>;
  const previousPersonalInfo = (existing.personalInfo ?? {}) as Record<string, unknown>;
  const setOptional = (field: string, value: string) => {
    value = value.trim();
    if (value) personalInfo[field] = value;
    else if (Object.prototype.hasOwnProperty.call(previousPersonalInfo, field)) personalInfo[field] = null;
    else delete personalInfo[field];
  };
  setOptional("avatarUrl", draft.avatarUrl);
  setOptional("birthDate", draft.birthDate);
  setOptional("birthPlace", draft.birthPlace);
  setOptional("nationality", draft.nationality);
  setOptional("idIssueDate", draft.idIssueDate);
  setOptional("idIssuePlace", draft.idIssuePlace);
  setOptional("englishAcademicTitle", draft.englishAcademicTitle);
  setOptional("contactAddress", draft.contactAddress);
  setOptional("bankAccount", draft.bankAccount);
  setOptional("bankName", draft.bankName);
  setOptional("bankBranch", draft.bankBranch);
  setOptional("smartCaSerial", draft.smartCaSerial);
  if (draft.languages.length || Object.prototype.hasOwnProperty.call(previousPersonalInfo, "languages")) personalInfo.languages = draft.languages;
  else delete personalInfo.languages;
  const next: ScientificCurriculumVitae = { ...existing, cvSchemaVersion: 1 };
  if (draft.note.trim()) next.note = draft.note.trim();
  else if (Object.prototype.hasOwnProperty.call(existing, "note")) next.note = null;
  else delete next.note;
  return {
    ...next,
    personalInfo: {
      ...personalInfo,
      scientistType: draft.scientistType,
      gender: draft.gender as "Nam" | "Nữ" | "Khác",
      idNumber: draft.idNumber.trim(),
      organization: draft.organization.trim(),
      shareDataAgreement: draft.shareDataAgreement
    } as ScientificCurriculumVitae["personalInfo"]
  };
}

function apiField(field: string) {
  if (field === "curriculumVitae.note") return "note";
  if (field === "curriculumVitae.personalInfo.gender") return "gender";
  if (field === "curriculumVitae.personalInfo.idNumber") return "idNumber";
  if (field === "curriculumVitae.personalInfo.organization") return "organization";
  if (field === "curriculumVitae.personalInfo.scientistType") return "scientistType";
  if (field.startsWith("curriculumVitae.personalInfo.languages")) return "languages";
  if (field.startsWith("curriculumVitae.personalInfo.")) return field.slice("curriculumVitae.personalInfo.".length);
  if (field.startsWith("researchFieldIds")) return "researchFieldIds";
  return field;
}

function PlaceholderTab({ title, message }: { title: string; message: string }) {
  return <section className="section-card"><h3>{title}</h3><p className="record-meta">{message}</p></section>;
}

type ScientificCvWorkspaceProps = { target: string; onSaved?: (profile: ResearcherProfile) => void };

export function ScientificCvWorkspace({ target, onSaved }: ScientificCvWorkspaceProps) {
  const owner = target === "my-profile";
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [draft, setDraft] = useState<CvGeneralDraft | null>(null);
  const [catalogs, setCatalogs] = useState<CvCatalogs>({ researchFields: [], academicRanks: [], academicDegrees: [] });
  const [tab, setTab] = useState<CvTab>("general");
  const [history, setHistory] = useState<ProfileHistory[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const loadVersion = useRef(0);
  const focusFieldError = useRef(false);

  const allowed = (action: string) => profile?.viewerAuthorization.allowedActions.some((value) => value === action) ?? false;
  const editable = allowed("researcher-profile.cv.update") && allowed(owner ? "researcher-profile.self.update" : "researcher-profile.update");
  const scientistTypeLocked = !!profile?.account && !!profile.curriculumVitae?.personalInfo?.scientistType;

  async function loadProfile() {
    const version = ++loadVersion.current;
    setLoading(true);
    setProfile(null);
    setDraft(null);
    setError("");
    setMessage("");
    setFieldErrors({});
    try {
      const [result, nextCatalogs] = await Promise.all([getResearcherProfile(target), loadResearcherProfileCatalogs()]);
      if (version !== loadVersion.current) return;
      setProfile(result.profile);
      setDraft(draftFromProfile(result.profile));
      setCatalogs(nextCatalogs);
      setHistory(null);
      setConflict(false);
    } catch (cause) {
      if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : "Không thể tải lý lịch khoa học.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => { void loadProfile(); return () => { loadVersion.current++; }; }, [target]);

  useEffect(() => {
    if (!focusFieldError.current || tab !== "general" || busy) return;
    focusFieldError.current = false;
    const firstError = document.querySelector(".cv-general-tab .field-error");
    const field = firstError?.closest(".field, .section-card")?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled), .table-wrap");
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }, [fieldErrors, tab, busy]);

  function changeDraft<K extends keyof CvGeneralDraft>(key: K, value: CvGeneralDraft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function validate() {
    if (!draft) return false;
    const errors: Record<string, string> = {};
    if (!draft.scientistType) errors.scientistType = "Cần chọn Loại nhà khoa học.";
    if (!draft.fullName.trim()) errors.fullName = "Cần nhập Họ và tên.";
    if (!draft.gender) errors.gender = "Cần chọn Giới tính.";
    if (!draft.idNumber.trim()) errors.idNumber = "Cần nhập Mã định danh.";
    if (!draft.contactEmail.trim()) errors.contactEmail = "Cần nhập Email.";
    if (!draft.organization.trim()) errors.organization = "Cần nhập Đơn vị quản lý / Đơn vị công tác.";
    if (draft.researchFieldIds.length === 0) errors.researchFieldIds = "Cần chọn ít nhất một Ngành/Lĩnh vực chính.";
    if (draft.languages.some((row) => !row.language.trim())) errors.languages = "Cần nhập Ngoại ngữ cho mọi dòng.";
    focusFieldError.current = Object.keys(errors).length > 0;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) setTab("general");
    return Object.keys(errors).length === 0;
  }

  async function save() {
    if (busy || !editable || !profile || !draft) return;
    if (!validate()) return;
    const version = loadVersion.current;
    setBusy(true);
    setError("");
    setMessage("");
    setConflict(false);
    try {
      const previous = draftFromProfile(profile);
      const expertiseKeywords = draft.expertiseKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
      const previousKeywords = previous.expertiseKeywords.split(",").map((keyword) => keyword.trim()).filter(Boolean);
      const sameFields = draft.researchFieldIds.length === previous.researchFieldIds.length && draft.researchFieldIds.every((field, index) => field === previous.researchFieldIds[index]);
      const sameKeywords = expertiseKeywords.length === previousKeywords.length && expertiseKeywords.every((keyword, index) => keyword === previousKeywords[index]);
      const input: Partial<ResearcherProfileInput> & { contextVersion: ResearcherProfile["viewerAuthorization"]["contextVersion"] } = { curriculumVitae: cvFromDraft(profile, draft), contextVersion: profile.viewerAuthorization.contextVersion };
      if (draft.fullName.trim() !== previous.fullName) input.fullName = draft.fullName.trim();
      if (draft.externalAffiliation !== previous.externalAffiliation) input.externalAffiliation = draft.externalAffiliation.trim() || null;
      if (draft.academicRankCatalogItemId !== previous.academicRankCatalogItemId) input.academicRankCatalogItemId = draft.academicRankCatalogItemId.trim() || null;
      if (draft.academicDegreeCatalogItemId !== previous.academicDegreeCatalogItemId) input.academicDegreeCatalogItemId = draft.academicDegreeCatalogItemId.trim() || null;
      if (draft.title !== previous.title) input.title = draft.title.trim() || null;
      if (draft.position !== previous.position) input.position = draft.position.trim() || null;
      if (draft.militaryRank !== previous.militaryRank) input.militaryRank = draft.militaryRank.trim() || null;
      if (draft.contactEmail.trim() !== previous.contactEmail) input.contactEmail = draft.contactEmail.trim();
      if (draft.contactPhone !== previous.contactPhone) input.contactPhone = draft.contactPhone.trim() || null;
      if (!sameFields) input.researchFieldIds = draft.researchFieldIds;
      if (!sameKeywords) input.expertiseKeywords = expertiseKeywords;
      if (owner && draft.username !== previous.username) input.username = draft.username.trim() || null;
      const result = await updateResearcherProfile(target, input);
      if (version !== loadVersion.current) return;
      setProfile(result.profile);
      setDraft(draftFromProfile(result.profile));
      setHistory(null);
      setMessage("Đã lưu lý lịch khoa học.");
      setFieldErrors({});
      onSaved?.(result.profile);
    } catch (cause) {
      if (version !== loadVersion.current) return;
      if (cause instanceof ProfileRequestError) {
        if (cause.status === 409 && cause.code === "CONTEXT_VERSION_MISMATCH") {
          setConflict(true);
          setError("Dữ liệu hồ sơ đã thay đổi. Vui lòng tải lại hồ sơ trước khi thử lại.");
        } else {
          const nextErrors: Record<string, string> = {};
          for (const item of cause.errors) nextErrors[apiField(item.field)] = item.message;
          focusFieldError.current = Object.keys(nextErrors).length > 0;
          setFieldErrors(nextErrors);
          if (cause.errors.length > 0) setTab("general");
          setError(cause.message);
        }
      } else setError(cause instanceof Error ? cause.message : "Không thể lưu lý lịch khoa học.");
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    if (!profile || !allowed("researcher-profile.history.read")) return;
    const version = loadVersion.current;
    setBusy(true);
    setError("");
    try {
      const result = await profileRequest<{ history: ProfileHistory[] }>(`/${profile.id}/history`);
      if (version !== loadVersion.current) return;
      setHistory(result.history);
    } catch (cause) {
      if (version !== loadVersion.current) return;
      setError(cause instanceof Error ? cause.message : "Không thể tải lịch sử thay đổi.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status">Đang tải lý lịch khoa học…</p>;
  if (!profile || !draft) return <div className="state-message error" role="alert">{error || "Không tìm thấy lý lịch khoa học."}</div>;

  const educationCount = profile.curriculumVitae?.educationHistory?.length ?? 0;
  const workCount = profile.curriculumVitae?.workHistory?.items?.length ?? 0;
  const research = profile.curriculumVitae?.researchExperience;
  const researchCount = (research?.intellectualProperty?.length ?? 0) + (research?.awards?.length ?? 0) + (research?.projects?.length ?? 0) + profile.publications.filter((publication) => publication.status !== "INACTIVE").length;
  const tabs: Array<{ id: CvTab; label: string; count?: number }> = [
    { id: "general", label: "1. Thông tin chung" },
    { id: "education", label: "2. Quá trình đào tạo", count: educationCount },
    { id: "work", label: "3. Quá trình công tác & Kinh nghiệm chuyên môn", count: workCount },
    { id: "research", label: "4. Kinh nghiệm & Thành tích nghiên cứu", count: researchCount },
    { id: "print", label: "5. Xem & In Lý lịch khoa học" }
  ];

  return <div className="grid cv-workspace">
    {error ? <p className="state-message error" role="alert">{error}</p> : null}
    {message ? <p className="state-message success" role="status">{message}</p> : null}
    {conflict ? <p className="state-message warning" role="alert"><button type="button" className="button" onClick={() => void loadProfile()}>Tải lại hồ sơ</button></p> : null}
    <section className="section-card">
      <div className="section-header"><div><h2>{owner ? "Lý lịch khoa học của tôi" : profile.fullName}</h2><p className="record-meta">Chuẩn hóa theo Cổng thông tin Khoa học &amp; Công nghệ Quốc gia (STM - Bộ KH&amp;CN) &amp; Học viện Quân y</p></div><button type="button" className="button" onClick={() => setTab("print")}>Xem &amp; In Lý lịch khoa học</button></div>
      <div className="cv-tabs" role="tablist" aria-label="Các phần lý lịch khoa học">
        {tabs.map((item, index) => <button id={`cv-tab-${item.id}`} key={item.id} type="button" role="tab" className={`button ${tab === item.id ? "primary" : ""}`} aria-selected={tab === item.id} aria-controls={tab === item.id ? `cv-panel-${item.id}` : undefined} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[nextIndex].id); document.getElementById(`cv-tab-${tabs[nextIndex].id}`)?.focus(); }}>{item.label}{item.count !== undefined ? <span className="cv-tab-badge" aria-label={`${item.count} dòng`}>{item.count}</span> : null}</button>)}
      </div>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div id={`cv-panel-${tab}`} role="tabpanel" aria-labelledby={`cv-tab-${tab}`}>
          {tab === "general" ? <CvGeneralTab draft={draft} catalogs={catalogs} editable={editable && !busy} owner={owner} scientistTypeLocked={scientistTypeLocked} errors={fieldErrors} onChange={changeDraft} /> : null}
          {tab === "education" ? <PlaceholderTab title="2. Quá trình đào tạo" message="Nội dung quá trình đào tạo sẽ được bổ sung trong các phiên bản tiếp theo." /> : null}
          {tab === "work" ? <PlaceholderTab title="3. Quá trình công tác & Kinh nghiệm chuyên môn" message="Nội dung quá trình công tác sẽ được bổ sung trong các phiên bản tiếp theo." /> : null}
          {tab === "research" ? <PlaceholderTab title="4. Kinh nghiệm & Thành tích nghiên cứu" message="Nội dung kinh nghiệm và thành tích nghiên cứu sẽ được bổ sung trong các phiên bản tiếp theo." /> : null}
          {tab === "print" ? <PlaceholderTab title="5. Xem & In Lý lịch khoa học" message="Bản xem và in BM-06 sẽ được bổ sung trong các phiên bản tiếp theo." /> : null}
        </div>
        <div className="button-row"><button className="button primary" type="submit" disabled={busy || !editable}>{busy ? "Đang lưu…" : "Lưu lý lịch khoa học"}</button>{!editable ? <span className="record-meta">Bạn chỉ có quyền xem lý lịch khoa học.</span> : null}</div>
      </form>
    </section>
    <section className="section-card">
      <h2>Lịch sử thay đổi hồ sơ</h2>
      <button type="button" className="button" disabled={busy || !allowed("researcher-profile.history.read")} onClick={() => void loadHistory()}>Xem lịch sử thay đổi</button>
      {history?.map((item) => <details key={item.id}><summary>{new Date(item.createdAt).toLocaleString("vi-VN")} · {historyActions[item.action] ?? item.action}</summary><p>{item.reason}</p><HistoryFacts label="Trước" facts={item.beforeFacts} /><HistoryFacts label="Sau" facts={item.afterFacts} /></details>)}
      {history?.length === 0 ? <p>Chưa có lịch sử thay đổi.</p> : null}
    </section>
  </div>;
}
