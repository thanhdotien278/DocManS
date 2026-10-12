"use client";

import { useRef, useState } from "react";
import { CvPortraitCropper } from "./cv-portrait-cropper";
import { CvRowTable } from "./cv-row-table";
import type { ResearcherCatalogItem, ScientificCurriculumVitaeLanguage } from "@/lib/researcher-profiles-api";

export type CvGeneralDraft = {
  avatarUrl: string;
  fullName: string;
  gender: "Nam" | "Nữ" | "Khác" | "";
  birthDate: string;
  birthPlace: string;
  nationality: string;
  idNumber: string;
  idIssueDate: string;
  idIssuePlace: string;
  externalAffiliation: string;
  position: string;
  militaryRank: string;
  title: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  organization: string;
  username: string;
  academicRankCatalogItemId: string;
  academicDegreeCatalogItemId: string;
  englishAcademicTitle: string;
  researchFieldIds: string[];
  expertiseKeywords: string[];
  keywordInput: string;
  languages: ScientificCurriculumVitaeLanguage[];
  bankAccount: string;
  bankName: string;
  bankBranch: string;
  smartCaSerial: string;
  shareDataAgreement: boolean;
  note: string;
};

type CvGeneralTabProps = {
  draft: CvGeneralDraft;
  catalogs: { organizationUnits: string[]; researchFields: ResearcherCatalogItem[]; academicRanks: ResearcherCatalogItem[]; academicDegrees: ResearcherCatalogItem[] };
  editable: boolean;
  owner: boolean;
  profileType: "INTERNAL" | "EXTERNAL";
  hasAccount: boolean;
  usernameEditable: boolean;
  errors: Record<string, string>;
  onChange: <K extends keyof CvGeneralDraft>(key: K, value: CvGeneralDraft[K]) => void;
};

// Only same-origin paths and inline images: an external URL would let its host see every viewer's IP.
export const PORTRAIT_PREVIEW = /^(\/(?!\/)|data:image\/(jpeg|png|webp);base64,)/;
const PORTRAIT_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Same comparison key as the API's normalizeResearcherKey (unique per profile), so near-duplicates never reach the server.
const keywordKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();

// Commits comma-separated text as keywords, ignoring blanks and duplicates (case/diacritic-insensitive).
export function mergeKeywords(keywords: string[], text: string) {
  const result = [...keywords];
  for (const raw of text.split(",")) {
    const keyword = raw.trim();
    if (keyword && !result.some((item) => keywordKey(item) === keywordKey(keyword))) result.push(keyword);
  }
  return result;
}

function FieldError({ field, errors }: { field: string; errors: Record<string, string> }) {
  return errors[field] ? <small id={`cv-${field}-error`} className="field-error" role="alert">{errors[field]}</small> : null;
}

export function CvGeneralTab({ draft, catalogs, editable, owner, profileType, hasAccount, usernameEditable, errors, onChange }: CvGeneralTabProps) {
  const [researchFieldQuery, setResearchFieldQuery] = useState("");
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitError, setPortraitError] = useState("");
  const portraitInput = useRef<HTMLInputElement>(null);
  const [researchFieldOpen, setResearchFieldOpen] = useState(false);
  const selectedResearchFields = catalogs.researchFields.filter((item) => draft.researchFieldIds.includes(item.id));
  const visibleResearchFields = catalogs.researchFields.filter((item) => item.name.toLowerCase().includes(researchFieldQuery.trim().toLowerCase()));

  function toggleResearchField(id: string) {
    onChange("researchFieldIds", draft.researchFieldIds.includes(id) ? draft.researchFieldIds.filter((value) => value !== id) : [...draft.researchFieldIds, id]);
  }

  function pickPortrait(file: File | undefined) {
    if (portraitInput.current) portraitInput.current.value = "";
    if (!file) return;
    if (!PORTRAIT_TYPES.includes(file.type) || file.size > 5 * 1024 * 1024) {
      setPortraitError("Chỉ nhận ảnh JPEG, PNG hoặc WebP tối đa 5 MB.");
      return;
    }
    setPortraitError("");
    setPortraitFile(file);
  }

  function typeKeywords(value: string) {
    if (!value.includes(",")) return onChange("keywordInput", value);
    const parts = value.split(",");
    onChange("expertiseKeywords", mergeKeywords(draft.expertiseKeywords, parts.slice(0, -1).join(",")));
    onChange("keywordInput", parts.at(-1) ?? "");
  }

  function updateLanguage(index: number, key: keyof ScientificCurriculumVitaeLanguage & string, value: string | number | null) {
    onChange("languages", draft.languages.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: value === null ? null : String(value) } : row));
  }

  return <div className="cv-general-tab">
    <section className="section-card">
      <h3>A. Loại nhà khoa học &amp; Ảnh đại diện (3x4)</h3>
      <div className="form-grid">
        <div className="cv-portrait-field">
          <div className="cv-portrait-box" aria-label="Khung xem trước ảnh chân dung 3x4">{PORTRAIT_PREVIEW.test(draft.avatarUrl) ? <img src={draft.avatarUrl} alt="Ảnh chân dung 3x4" /> : <span>3 × 4</span>}</div>
          <div>
            <strong>Ảnh chân dung nhà khoa học (Khung chuẩn 3x4)</strong><small className="field-hint">Hiển thị trên hồ sơ nghiên cứu khoa học và trang in Lý lịch khoa học BM-06</small>
            <input ref={portraitInput} id="cv-avatar-file" type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => pickPortrait(event.target.files?.[0])} />
            <div className="button-row">
              <button type="button" className="button" disabled={!editable} onClick={() => portraitInput.current?.click()} aria-describedby={portraitError || errors.avatarUrl ? "cv-avatar-error" : undefined}>Tải ảnh lên</button>
              {draft.avatarUrl ? <button type="button" className="button" disabled={!editable} onClick={() => { if (window.confirm("Xóa ảnh đại diện?")) onChange("avatarUrl", ""); }}>Xóa ảnh</button> : null}
            </div>
            {portraitError || errors.avatarUrl ? <small id="cv-avatar-error" className="field-error" role="alert">{portraitError || errors.avatarUrl}</small> : null}
          </div>
        </div>
        <div className="field">
          <span>Loại nhà khoa học</span>
          <strong>{profileType === "EXTERNAL" ? "Nhà khoa học ngoài Học viện" : "Nhà khoa học trong Học viện"}</strong>
          <small className="field-hint">Do Phòng QLKH xác định theo loại tài khoản</small>
        </div>
      </div>
      {portraitFile ? <CvPortraitCropper file={portraitFile} onCancel={() => setPortraitFile(null)} onApply={(dataUrl) => { setPortraitFile(null); onChange("avatarUrl", dataUrl); }} /> : null}
    </section>

    <section className="section-card">
      <h3>B. Thông tin cơ bản &amp; Công tác</h3>
      <div className="form-grid two">
        <label className="field" htmlFor="cv-full-name"><span>Họ và tên *</span><input id="cv-full-name" required maxLength={240} value={draft.fullName} disabled={!editable} aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "cv-fullName-error" : undefined} onChange={(event) => onChange("fullName", event.target.value)} /><FieldError field="fullName" errors={errors} /></label>
        <label className="field" htmlFor="cv-gender"><span>Giới tính *</span><select id="cv-gender" required value={draft.gender} disabled={!editable} aria-invalid={!!errors.gender} aria-describedby={errors.gender ? "cv-gender-error" : undefined} onChange={(event) => onChange("gender", event.target.value as CvGeneralDraft["gender"])}><option value="">Chọn giới tính</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option></select><FieldError field="gender" errors={errors} /></label>
        <label className="field" htmlFor="cv-birth-date"><span>Ngày sinh</span><input id="cv-birth-date" type="date" value={draft.birthDate} disabled={!editable} onChange={(event) => onChange("birthDate", event.target.value)} /><FieldError field="birthDate" errors={errors} /></label>
        <label className="field" htmlFor="cv-birth-place"><span>Nơi sinh</span><input id="cv-birth-place" value={draft.birthPlace} disabled={!editable} onChange={(event) => onChange("birthPlace", event.target.value)} /><FieldError field="birthPlace" errors={errors} /></label>
        <label className="field" htmlFor="cv-nationality"><span>Quốc gia/Quốc tịch</span><input id="cv-nationality" value={draft.nationality} disabled={!editable} onChange={(event) => onChange("nationality", event.target.value)} /><FieldError field="nationality" errors={errors} /></label>
        <label className="field" htmlFor="cv-id-number"><span>Mã định danh cá nhân (Số CCCD / Hộ chiếu) *</span><input id="cv-id-number" required value={draft.idNumber} disabled={!editable} aria-invalid={!!errors.idNumber} aria-describedby={errors.idNumber ? "cv-idNumber-error" : undefined} onChange={(event) => onChange("idNumber", event.target.value)} /><FieldError field="idNumber" errors={errors} /></label>
        <label className="field" htmlFor="cv-id-issue-date"><span>Ngày cấp</span><input id="cv-id-issue-date" type="date" value={draft.idIssueDate} disabled={!editable} onChange={(event) => onChange("idIssueDate", event.target.value)} /><FieldError field="idIssueDate" errors={errors} /></label>
        <label className="field" htmlFor="cv-id-issue-place"><span>Nơi cấp</span><input id="cv-id-issue-place" value={draft.idIssuePlace} disabled={!editable} onChange={(event) => onChange("idIssuePlace", event.target.value)} /><FieldError field="idIssuePlace" errors={errors} /></label>
        <label className="field" htmlFor="cv-external-affiliation"><span>Cơ quan / Đơn vị công tác cụ thể (theo lý lịch khoa học)</span><input id="cv-external-affiliation" value={draft.externalAffiliation} disabled={!editable} onChange={(event) => onChange("externalAffiliation", event.target.value)} /><FieldError field="externalAffiliation" errors={errors} /></label>
        <label className="field" htmlFor="cv-position"><span>Chức vụ hiện tại</span><input id="cv-position" value={draft.position} disabled={!editable} onChange={(event) => onChange("position", event.target.value)} /><FieldError field="position" errors={errors} /></label>
        <label className="field" htmlFor="cv-military-rank"><span>Quân hàm (HVQY)</span><input id="cv-military-rank" value={draft.militaryRank} disabled={!editable} onChange={(event) => onChange("militaryRank", event.target.value)} /><FieldError field="militaryRank" errors={errors} /></label>
        <label className="field" htmlFor="cv-title"><span>Chức danh khoa học khác</span><input id="cv-title" value={draft.title} disabled={!editable} onChange={(event) => onChange("title", event.target.value)} /><FieldError field="title" errors={errors} /></label>
        <label className="field" htmlFor="cv-contact-phone"><span>Điện thoại di động</span><input id="cv-contact-phone" type="tel" value={draft.contactPhone} disabled={!editable} onChange={(event) => onChange("contactPhone", event.target.value)} /><FieldError field="contactPhone" errors={errors} /></label>
        <label className="field" htmlFor="cv-contact-email"><span>Email đăng nhập / liên hệ *</span><input id="cv-contact-email" type="email" required value={draft.contactEmail} disabled={!editable} aria-invalid={!!errors.contactEmail} aria-describedby={errors.contactEmail ? "cv-contactEmail-error" : undefined} onChange={(event) => onChange("contactEmail", event.target.value)} /><FieldError field="contactEmail" errors={errors} /></label>
        <label className="field" htmlFor="cv-contact-address"><span>Địa chỉ liên hệ</span><input id="cv-contact-address" value={draft.contactAddress} disabled={!editable} onChange={(event) => onChange("contactAddress", event.target.value)} /><FieldError field="contactAddress" errors={errors} /></label>
        <label className="field" htmlFor="cv-organization"><span>Đơn vị quản lý / Đơn vị công tác *</span><input id="cv-organization" list="cv-organization-options" required value={draft.organization} disabled={!editable} aria-invalid={!!errors.organization} aria-describedby={errors.organization ? "cv-organization-error" : undefined} onChange={(event) => onChange("organization", event.target.value)} /><datalist id="cv-organization-options">{catalogs.organizationUnits.map((name) => <option key={name} value={name} />)}</datalist><small className="field-hint">Chọn gợi ý theo cơ cấu tổ chức Học viện Quân y hoặc tự nhập tên đơn vị theo lý lịch khoa học.</small><FieldError field="organization" errors={errors} /></label>
        {owner || (hasAccount && !usernameEditable) ? <label className="field" htmlFor="cv-username"><span>Tên đăng nhập</span><input id="cv-username" value={draft.username || "Chưa cấp"} readOnly disabled /><small className="field-hint">Do quản trị/Phòng QLKH cấp</small></label> : null}
        {usernameEditable ? <label className="field" htmlFor="cv-username"><span>Tên đăng nhập</span><input id="cv-username" value={draft.username} maxLength={80} autoComplete="off" disabled={!editable} aria-invalid={!!errors.username} aria-describedby={errors.username ? "cv-username-error" : undefined} onChange={(event) => onChange("username", event.target.value)} /><FieldError field="username" errors={errors} /></label> : null}
      </div>
    </section>

    <section className="section-card">
      <h3>C. Học hàm, học vị &amp; Lĩnh vực nghiên cứu</h3>
      <div className="form-grid two">
        <label className="field" htmlFor="cv-academic-rank"><span>Học hàm (Tiếng Việt)</span><select id="cv-academic-rank" value={draft.academicRankCatalogItemId} disabled={!editable} onChange={(event) => onChange("academicRankCatalogItemId", event.target.value)}><option value="">Chưa chọn</option>{catalogs.academicRanks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError field="academicRankCatalogItemId" errors={errors} /></label>
        <label className="field" htmlFor="cv-academic-degree"><span>Học vị (Tiếng Việt)</span><select id="cv-academic-degree" value={draft.academicDegreeCatalogItemId} disabled={!editable} onChange={(event) => onChange("academicDegreeCatalogItemId", event.target.value)}><option value="">Chưa chọn</option>{catalogs.academicDegrees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><FieldError field="academicDegreeCatalogItemId" errors={errors} /></label>
        <label className="field" htmlFor="cv-english-academic-title"><span>Học hàm, học vị (Tiếng Anh)</span><input id="cv-english-academic-title" placeholder="Prof. Dr., Assoc. Prof. PhD, MD, etc." value={draft.englishAcademicTitle} disabled={!editable} onChange={(event) => onChange("englishAcademicTitle", event.target.value)} /><FieldError field="englishAcademicTitle" errors={errors} /></label>
      </div>
      <div className="field researcher-field-picker">
        <span id="cv-research-fields-label">Ngành / Lĩnh vực nghiên cứu chính *</span>
        <div className="multi-select-control" role="group" aria-labelledby="cv-research-fields-label">
          {selectedResearchFields.length ? <div className="multi-select-chips" aria-label="Lĩnh vực đã chọn">{selectedResearchFields.map((item) => <button key={item.id} type="button" className="multi-select-chip" disabled={!editable} onClick={() => toggleResearchField(item.id)} aria-label={`Bỏ ${item.name}`}>{item.name}<span aria-hidden="true">×</span></button>)}</div> : null}
          <input type="search" value={researchFieldQuery} placeholder={selectedResearchFields.length ? "Tìm lĩnh vực" : "Chưa chọn"} disabled={!editable} onFocus={() => setResearchFieldOpen(true)} onChange={(event) => { setResearchFieldQuery(event.target.value); setResearchFieldOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") setResearchFieldOpen(false); }} aria-controls="cv-research-fields-options" aria-expanded={researchFieldOpen} aria-labelledby="cv-research-fields-label" aria-invalid={!!errors.researchFieldIds} aria-describedby={errors.researchFieldIds ? "cv-researchFieldIds-error" : undefined} />
          <button type="button" className="multi-select-toggle" disabled={!editable} onClick={() => setResearchFieldOpen((value) => !value)} aria-expanded={researchFieldOpen} aria-controls="cv-research-fields-options">Chọn</button>
        </div>
        {researchFieldOpen ? <div id="cv-research-fields-options" className="multi-select-menu" role="group" aria-label="Chọn lĩnh vực nghiên cứu">{visibleResearchFields.length ? visibleResearchFields.map((item) => <label key={item.id} className="multi-select-option"><input type="checkbox" checked={draft.researchFieldIds.includes(item.id)} disabled={!editable} onChange={() => toggleResearchField(item.id)} />{item.name}</label>) : <p className="field-hint">Không có lĩnh vực phù hợp.</p>}</div> : null}
        <small className="field-hint">Chọn một hoặc nhiều lĩnh vực chuyên môn của nhà khoa học.</small><FieldError field="researchFieldIds" errors={errors} />
      </div>
      <div className="field">
        <label htmlFor="cv-expertise-keywords">Từ khóa tương ứng với hướng nghiên cứu chính, chuyên môn hoạt động</label>
        <div className="multi-select-control">
          {draft.expertiseKeywords.length ? <div className="multi-select-chips" aria-label="Từ khóa đã nhập">{draft.expertiseKeywords.map((keyword) => <button key={keyword} type="button" className="multi-select-chip" disabled={!editable} onClick={() => onChange("expertiseKeywords", draft.expertiseKeywords.filter((item) => item !== keyword))} aria-label={`Bỏ từ khóa ${keyword}`}>#{keyword}<span aria-hidden="true">×</span></button>)}</div> : null}
          <input id="cv-expertise-keywords" value={draft.keywordInput} disabled={!editable} placeholder="Nhập từ khóa rồi nhấn Enter hoặc dấu phẩy" aria-describedby={errors.expertiseKeywords ? "cv-expertiseKeywords-error" : undefined}
            onChange={(event) => typeKeywords(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (!event.nativeEvent.isComposing) { onChange("expertiseKeywords", mergeKeywords(draft.expertiseKeywords, draft.keywordInput)); onChange("keywordInput", ""); }
              } else if (event.key === "Backspace" && !draft.keywordInput && draft.expertiseKeywords.length) onChange("expertiseKeywords", draft.expertiseKeywords.slice(0, -1));
            }} />
        </div>
        <FieldError field="expertiseKeywords" errors={errors} />
      </div>
    </section>

    <section className="section-card">
      <h3>D. Ngoại ngữ sử dụng</h3>
      <p className="field-hint">Kê khai các ngoại ngữ sử dụng trong nghiên cứu khoa học và giảng dạy</p>
      <CvRowTable name="languages" rows={draft.languages} columns={[{ key: "language", label: "Ngoại ngữ *" }, { key: "proficiency", label: "Mức độ", options: [{ value: "Tốt", label: "Tốt" }, { value: "Khá", label: "Khá" }, { value: "Trung bình", label: "Trung bình" }] }, { key: "certificate", label: "Chứng chỉ" }]} disabled={!editable} onChange={updateLanguage} onAdd={() => onChange("languages", [...draft.languages, { language: "", proficiency: "", certificate: "" }])} onRemove={(index) => onChange("languages", draft.languages.filter((_, rowIndex) => rowIndex !== index))} addLabel="+ Thêm ngoại ngữ" />
      <FieldError field="languages" errors={errors} />
    </section>

    <section className="section-card">
      <h3>E. Tài khoản ngân hàng, Chữ ký số SmartCA &amp; Chia sẻ dữ liệu</h3>
      <div className="form-grid two">
        <label className="field" htmlFor="cv-bank-account"><span>Số tài khoản ngân hàng</span><input id="cv-bank-account" value={draft.bankAccount} disabled={!editable} onChange={(event) => onChange("bankAccount", event.target.value)} /><FieldError field="bankAccount" errors={errors} /></label>
        <label className="field" htmlFor="cv-bank-name"><span>Tên ngân hàng</span><input id="cv-bank-name" value={draft.bankName} disabled={!editable} onChange={(event) => onChange("bankName", event.target.value)} /><FieldError field="bankName" errors={errors} /></label>
        <label className="field" htmlFor="cv-bank-branch"><span>Chi nhánh ngân hàng</span><input id="cv-bank-branch" value={draft.bankBranch} disabled={!editable} onChange={(event) => onChange("bankBranch", event.target.value)} /><FieldError field="bankBranch" errors={errors} /></label>
        <label className="field" htmlFor="cv-smartca"><span>Tài khoản SmartCA / Serial chứng thư số</span><input id="cv-smartca" value={draft.smartCaSerial} disabled={!editable} onChange={(event) => onChange("smartCaSerial", event.target.value)} /><FieldError field="smartCaSerial" errors={errors} /></label>
      </div>
      <fieldset className="field" disabled={!editable}>
        <legend>Bạn có đồng ý chia sẻ dữ liệu? *</legend>
        <small className="field-hint">Cho phép liên thông dữ liệu nghiên cứu khoa học với Cổng thông tin Khoa học &amp; Công nghệ Quốc gia (STM - Bộ KH&amp;CN).</small>
        <div className="cv-radio-group">
          <label><input type="radio" name="cv-share-data" checked={draft.shareDataAgreement} onChange={() => onChange("shareDataAgreement", true)} /> Đồng ý</label>
          <label><input type="radio" name="cv-share-data" checked={!draft.shareDataAgreement} onChange={() => onChange("shareDataAgreement", false)} /> Không đồng ý</label>
        </div>
        <FieldError field="shareDataAgreement" errors={errors} />
      </fieldset>
      <label className="field" htmlFor="cv-note"><span>Ghi chú hồ sơ</span><textarea id="cv-note" rows={4} maxLength={4000} value={draft.note} disabled={!editable} onChange={(event) => onChange("note", event.target.value)} /><FieldError field="note" errors={errors} /></label>
    </section>
  </div>;
}
