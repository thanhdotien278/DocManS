"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/auth/session-provider";
import { getResearcherProfile, loadResearcherProfileCatalogs, ProfileRequestError, updateResearcherProfile, type ResearcherProfile, type ResearcherProfileInput, type ScientificCurriculumVitae } from "@/lib/researcher-profiles-api";
import { CvGeneralTab, mergeKeywords, type CvGeneralDraft } from "./cv-general-tab";
import { CvEducationTab, CvWorkTab, type CvHistoryDraft } from "./cv-history-tabs";
import { CvResearchTab, type CvResearchDraft } from "./cv-research-tab";
import { CvPrintTab } from "./cv-print-tab";
import { CvHistoryDrawer } from "./cv-history";
import { withScheme } from "./cv-row-table";

type CvDraft = CvGeneralDraft & CvHistoryDraft & CvResearchDraft;
type CvTab = "general" | "education" | "work" | "research" | "print";
type CvCatalogs = Awaited<ReturnType<typeof loadResearcherProfileCatalogs>>;

function text(value: string | null | undefined) {
  return value ?? "";
}

function draftFromProfile(profile: ResearcherProfile): CvDraft {
  const personal = profile.curriculumVitae?.personalInfo;
  return {
    avatarUrl: text(personal?.avatarUrl),
    fullName: profile.fullName,
    gender: personal?.gender ?? "",
    birthDate: text(personal?.birthDate),
    birthPlace: text(personal?.birthPlace),
    nationality: text(personal?.nationality) || "Việt Nam",
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
    otherResearchFields: [...(personal?.otherResearchFields ?? [])],
    expertiseKeywords: [...profile.expertiseKeywords],
    keywordInput: "",
    languages: personal?.languages ? personal.languages.map((language) => ({ ...language })) : [],
    bankAccount: text(personal?.bankAccount),
    bankName: text(personal?.bankName),
    bankBranch: text(personal?.bankBranch),
    smartCaSerial: text(personal?.smartCaSerial),
    shareDataAgreement: personal?.shareDataAgreement ?? true,
    note: text(profile.curriculumVitae?.note),
    educationHistory: (profile.curriculumVitae?.educationHistory ?? []).map((row) => ({ ...row })),
    workSummary: text(profile.curriculumVitae?.workHistory?.summary),
    workItems: (profile.curriculumVitae?.workHistory?.items ?? []).map((row) => ({ ...row })),
    publications: profile.publications.filter((row) => row.status !== "INACTIVE").map((row) => ({ ...row })),
    intellectualProperty: (profile.curriculumVitae?.researchExperience?.intellectualProperty ?? []).map((row) => ({ ...row })),
    awards: (profile.curriculumVitae?.researchExperience?.awards ?? []).map((row) => ({ ...row })),
    projects: (profile.curriculumVitae?.researchExperience?.projects ?? []).map((row) => ({ ...row }))
  };
}

// Trims strings, adds https:// to scheme-less proofUrl, and drops empty optional values so rows match the API contract.
function compactRow<Row extends object>(row: Row): Row {
  const entries = Object.entries(row).map(([key, value]) => [key, typeof value === "string" ? (key === "proofUrl" ? withScheme(value) : value.trim()) : value] as const);
  return Object.fromEntries(entries.filter(([, value]) => value !== "" && value !== null && value !== undefined)) as Row;
}

// Typing into an empty optional field and clearing it leaves "" where the saved row had no value; that is not an edit.
function draftKey(draft: CvDraft) {
  return JSON.stringify(draft, (_key, value) => value === "" || value === null ? undefined : value);
}

function cvFromDraft(profile: ResearcherProfile, draft: CvDraft): ScientificCurriculumVitae {
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
  delete personalInfo.scientistType; // legacy key; the type is derived from profileType
  if (draft.languages.length || Object.prototype.hasOwnProperty.call(previousPersonalInfo, "languages")) personalInfo.languages = draft.languages;
  else delete personalInfo.languages;
  const otherResearchFields = draft.otherResearchFields;
  if (otherResearchFields.length || Object.prototype.hasOwnProperty.call(previousPersonalInfo, "otherResearchFields")) personalInfo.otherResearchFields = otherResearchFields;
  else delete personalInfo.otherResearchFields;
  const next: ScientificCurriculumVitae = { ...existing, cvSchemaVersion: 1 };
  if (draft.note.trim()) next.note = draft.note.trim();
  else if (Object.prototype.hasOwnProperty.call(existing, "note")) next.note = null;
  else delete next.note;
  const hadEducation = Object.prototype.hasOwnProperty.call(existing, "educationHistory");
  if (draft.educationHistory.length || hadEducation) next.educationHistory = draft.educationHistory.map(compactRow);
  const workSummary = draft.workSummary.trim();
  if (workSummary || draft.workItems.length || Object.prototype.hasOwnProperty.call(existing, "workHistory")) {
    next.workHistory = { ...(workSummary ? { summary: workSummary } : {}), items: draft.workItems.map(compactRow) };
  }
  const researchExperience = { ...(existing.researchExperience ?? {}) };
  for (const section of ["intellectualProperty", "awards", "projects"] as const) {
    if (draft[section].length || Object.prototype.hasOwnProperty.call(existing.researchExperience ?? {}, section)) {
      Object.assign(researchExperience, { [section]: draft[section].map(compactRow) });
    } else delete researchExperience[section];
  }
  if (Object.keys(researchExperience).length || Object.prototype.hasOwnProperty.call(existing, "researchExperience")) next.researchExperience = researchExperience;
  else delete next.researchExperience;
  return {
    ...next,
    personalInfo: {
      ...personalInfo,
      gender: draft.gender as "Nam" | "Nữ" | "Khác",
      idNumber: draft.idNumber.trim(),
      organization: draft.organization.trim(),
      shareDataAgreement: draft.shareDataAgreement
    } as ScientificCurriculumVitae["personalInfo"]
  };
}

function apiField(field: string) {
  if (field === "publications" || field.startsWith("publications.")) return "publications";
  for (const section of ["intellectualProperty", "awards", "projects"] as const) {
    if (field === `curriculumVitae.researchExperience.${section}` || field.startsWith(`curriculumVitae.researchExperience.${section}.`)) return section;
  }
  if (field === "curriculumVitae.note") return "note";
  if (field === "curriculumVitae.personalInfo.gender") return "gender";
  if (field === "curriculumVitae.personalInfo.idNumber") return "idNumber";
  if (field === "curriculumVitae.personalInfo.organization") return "organization";
  if (field.startsWith("curriculumVitae.personalInfo.languages")) return "languages";
  if (field.startsWith("curriculumVitae.personalInfo.")) return field.slice("curriculumVitae.personalInfo.".length);
  if (field.startsWith("curriculumVitae.educationHistory")) return "educationHistory";
  if (field.startsWith("curriculumVitae.workHistory")) return "workItems";
  if (field.startsWith("researchFieldIds")) return "researchFieldIds";
  return field;
}

const tabLabels: Partial<Record<CvTab, string>> = { general: "1. Thông tin chung", education: "2. Quá trình đào tạo", work: "3. Quá trình công tác & Kinh nghiệm chuyên môn", research: "4. Kinh nghiệm & Thành tích nghiên cứu" };

function errorTabsOf(errors: Record<string, string>): CvTab[] {
  const tabs: CvTab[] = [];
  if (Object.keys(errors).some((key) => !["educationHistory", "workItems", "publications", "intellectualProperty", "awards", "projects"].includes(key))) tabs.push("general");
  if (errors.educationHistory) tabs.push("education");
  if (errors.workItems) tabs.push("work");
  if (errors.publications || errors.intellectualProperty || errors.awards || errors.projects) tabs.push("research");
  return tabs;
}

type ScientificCvWorkspaceProps = { target: string; onSaved?: (profile: ResearcherProfile) => void };

export function ScientificCvWorkspace({ target, onSaved }: ScientificCvWorkspaceProps) {
  const owner = target === "my-profile";
  const { refreshCurrentUser } = useSession();
  const [profile, setProfile] = useState<ResearcherProfile | null>(null);
  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [catalogs, setCatalogs] = useState<CvCatalogs>({ organizationUnits: [], researchFields: [], academicRanks: [], academicDegrees: [] });
  const [tab, setTab] = useState<CvTab>("general");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [conflict, setConflict] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const loadVersion = useRef(0);
  const [errorTabs, setErrorTabs] = useState<CvTab[]>([]);
  const focusFieldError = useRef(false);

  const allowed = (action: string) => profile?.viewerAuthorization.allowedActions.some((value) => value === action) ?? false;
  const editable = allowed("researcher-profile.cv.update") && allowed(owner ? "researcher-profile.self.update" : "researcher-profile.update");
  // The API only lets managers rename linked researcher accounts (never their own or other roles).
  const usernameEditable = !owner && ["RESEARCHER_INTERNAL_USER", "EXTERNAL_RESEARCHER_USER"].includes(profile?.account?.systemRole ?? "");

  async function loadProfile() {
    const version = ++loadVersion.current;
    setLoading(true);
    setProfile(null);
    setDraft(null);
    setHistoryOpen(false);
    setError("");
    setMessage("");
    setFieldErrors({});
    setErrorTabs([]);
    try {
      const [result, nextCatalogs] = await Promise.all([getResearcherProfile(target), loadResearcherProfileCatalogs()]);
      if (version !== loadVersion.current) return;
      setProfile(result.profile);
      setDraft(draftFromProfile(result.profile));
      setCatalogs(nextCatalogs);
      setConflict(false);
    } catch (cause) {
      if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : "Không thể tải lý lịch khoa học.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => { void loadProfile(); return () => { loadVersion.current++; }; }, [target]);

  useEffect(() => {
    if (!focusFieldError.current || busy) return;
    focusFieldError.current = false;
    const firstError = document.querySelector("[role=tabpanel] .field-error");
    const field = firstError?.closest(".field, .section-card")?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled), .table-wrap");
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }, [fieldErrors, tab, busy]);

  // Loosely typed so both tab components (each owning a slice of CvDraft) can pass their own typed onChange.
  function changeDraft(key: keyof CvDraft, value: unknown) {
    setMessage("");
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
    if (!draft.fullName.trim()) errors.fullName = "Cần nhập Họ và tên.";
    if (!draft.gender) errors.gender = "Cần chọn Giới tính.";
    if (!draft.idNumber.trim()) errors.idNumber = "Cần nhập Mã định danh.";
    if (!draft.contactEmail.trim()) errors.contactEmail = "Cần nhập Email.";
    if (!draft.organization.trim()) errors.organization = "Cần nhập Đơn vị quản lý / Đơn vị công tác.";
    if (draft.researchFieldIds.length === 0) errors.researchFieldIds = "Cần chọn ít nhất một Ngành/Lĩnh vực chính từ danh sách gợi ý.";
    if (draft.languages.some((row) => !row.language.trim())) errors.languages = "Cần nhập Ngoại ngữ cho mọi dòng.";
    if (draft.educationHistory.some((row) => !row.degreeLevel.trim() || !row.major.trim() || !row.institution.trim())) errors.educationHistory = "Cần nhập Bậc đào tạo, Ngành đào tạo và Cơ sở đào tạo cho mọi dòng.";
    else if (draft.educationHistory.some((row) => row.startYear != null && row.graduationYear != null && row.startYear > row.graduationYear)) errors.educationHistory = "Năm bắt đầu không được sau Năm tốt nghiệp.";
    if (draft.workItems.some((row) => !row.period.trim() || !row.organization.trim())) errors.workItems = "Cần nhập Thời gian và Cơ quan / Đơn vị cho mọi dòng.";
    if (draft.publications.some((row) => !row.title.trim())) errors.publications = "Cần nhập Tên công bố cho mọi dòng.";
    if (draft.intellectualProperty.some((row) => !row.title.trim())) errors.intellectualProperty = "Cần nhập Tên văn bằng / Sáng chế cho mọi dòng.";
    if (draft.awards.some((row) => !row.name.trim())) errors.awards = "Cần nhập Tên giải thưởng / Danh hiệu cho mọi dòng.";
    else if (draft.awards.some((row) => row.awardYear != null && row.endYear != null && row.endYear < row.awardYear)) errors.awards = "Đến năm không được trước Năm.";
    if (draft.projects.some((row) => !row.projectTitle.trim() || !row.role.trim())) errors.projects = "Cần nhập Tên nhiệm vụ, Chương trình và Vai trò cho mọi dòng.";
    focusFieldError.current = Object.keys(errors).length > 0;
    setFieldErrors(errors);
    return blockSave(errors);
  }

  // Keeps the user on the current tab and says plainly that nothing was saved and where to fix it.
  function blockSave(errors: Record<string, string>) {
    const tabs = errorTabsOf(errors);
    setErrorTabs(tabs);
    if (tabs.length === 0) return true;
    focusFieldError.current = tabs.includes(tab);
    setError(`Chưa lưu lý lịch khoa học. Cần bổ sung hoặc sửa thông tin ở: ${tabs.map((item) => tabLabels[item]).join("; ")}.`);
    return false;
  }

  async function save() {
    if (busy || !editable || !profile || !draft) return;
    if (!validate()) return;
    const version = loadVersion.current;
    setBusy(true);
    setError("");
    setMessage("");
    setConflict(false);
    setErrorTabs([]);
    try {
      const previous = draftFromProfile(profile);
      const expertiseKeywords = mergeKeywords(draft.expertiseKeywords, draft.keywordInput);
      const previousKeywords = previous.expertiseKeywords;
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
      if (usernameEditable && draft.username.trim() !== previous.username) input.username = draft.username.trim() || null;
      if (JSON.stringify(draft.publications) !== JSON.stringify(previous.publications)) {
        input.publications = [...draft.publications.map(compactRow), ...profile.publications.filter((row) => row.status === "INACTIVE")];
      }
      const result = await updateResearcherProfile(target, input);
      if (version !== loadVersion.current) return;
      setProfile(result.profile);
      setDraft(draftFromProfile(result.profile));
      setMessage("Đã lưu lý lịch khoa học.");
      if (owner) { window.dispatchEvent(new Event("researcher-avatar-updated")); void refreshCurrentUser(); }
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
          setFieldErrors(nextErrors);
          if (cause.errors.length === 0 || blockSave(nextErrors)) setError(cause.message);
        }
      } else setError(cause instanceof Error ? cause.message : "Không thể lưu lý lịch khoa học.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p role="status">Đang tải lý lịch khoa học…</p>;
  if (!profile || !draft) return <div className="state-message error" role="alert">{error || "Không tìm thấy lý lịch khoa học."}</div>;

  const educationCount = draft.educationHistory.length;
  const workCount = draft.workItems.length;
  const researchCount = draft.publications.length + draft.intellectualProperty.length + draft.awards.length + draft.projects.length;
  const tabs: Array<{ id: CvTab; label: string; count?: number }> = [
    { id: "general", label: "1. Thông tin chung" },
    { id: "education", label: "2. Quá trình đào tạo", count: educationCount },
    { id: "work", label: "3. Quá trình công tác & Kinh nghiệm chuyên môn", count: workCount },
    { id: "research", label: "4. Kinh nghiệm & Thành tích nghiên cứu", count: researchCount },
    { id: "print", label: "5. Xem & In Lý lịch khoa học" }
  ];

  return <div className="grid cv-workspace">
    <section className="section-card">
      <div className="section-header"><div><h2>{owner ? "Lý lịch khoa học của tôi" : profile.fullName}</h2><p className="record-meta">Chuẩn hóa theo Cổng thông tin Khoa học &amp; Công nghệ Quốc gia (STM - Bộ KH&amp;CN) &amp; Học viện Quân y</p></div><div className="button-row">{allowed("researcher-profile.history.read") ? <button type="button" className="button" onClick={() => setHistoryOpen(true)}>Lịch sử thay đổi</button> : null}<button type="button" className="button" onClick={() => setTab("print")}>Xem &amp; In Lý lịch khoa học</button></div></div>
      <div className="cv-tabs" role="tablist" aria-label="Các phần lý lịch khoa học">
        {tabs.map((item, index) => <button id={`cv-tab-${item.id}`} key={item.id} type="button" role="tab" className={`button ${tab === item.id ? "primary" : ""}`} aria-selected={tab === item.id} aria-controls={tab === item.id ? `cv-panel-${item.id}` : undefined} tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => { if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return; const nextIndex = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; setTab(tabs[nextIndex].id); document.getElementById(`cv-tab-${tabs[nextIndex].id}`)?.focus(); }}>{item.label}{item.count !== undefined ? <span className="cv-tab-badge" aria-label={`${item.count} dòng`}>{item.count}</span> : null}</button>)}
      </div>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div id={`cv-panel-${tab}`} role="tabpanel" aria-labelledby={`cv-tab-${tab}`}>
          {tab === "general" ? <CvGeneralTab draft={draft} catalogs={catalogs} editable={editable && !busy} owner={owner} profileType={profile.profileType ?? "INTERNAL"} hasAccount={!!profile.account} usernameEditable={usernameEditable} errors={fieldErrors} onChange={changeDraft} /> : null}
          {tab === "education" ? <CvEducationTab draft={draft} editable={editable && !busy} errors={fieldErrors} onChange={changeDraft} /> : null}
          {tab === "work" ? <CvWorkTab draft={draft} editable={editable && !busy} errors={fieldErrors} onChange={changeDraft} /> : null}
          {tab === "research" ? <CvResearchTab draft={draft} participations={profile.participations} editable={editable && !busy} errors={fieldErrors} onChange={changeDraft} /> : null}
          {tab === "print" ? <CvPrintTab profile={profile} dirty={draftKey(draft) !== draftKey(draftFromProfile(profile))} /> : null}
        </div>
        {error ? <p className="state-message error" role="alert">{error}{errorTabs.filter((item) => item !== tab).map((item) => <button key={item} type="button" className="button" onClick={() => { focusFieldError.current = true; setTab(item); }}>Đi tới {tabLabels[item]}</button>)}</p> : null}
        {message ? <p className="state-message success" role="status">{message}</p> : null}
        {conflict ? <p className="state-message warning" role="alert"><button type="button" className="button" onClick={() => void loadProfile()}>Tải lại hồ sơ</button></p> : null}
        <div className="button-row"><button className="button primary" type="submit" disabled={busy || !editable}>{busy ? "Đang lưu…" : "Lưu lý lịch khoa học"}</button>{!editable ? <span className="record-meta">Bạn chỉ có quyền xem lý lịch khoa học.</span> : null}</div>
      </form>
    </section>
    {historyOpen ? <CvHistoryDrawer profileId={profile.id} onClose={() => setHistoryOpen(false)} /> : null}
  </div>;
}
