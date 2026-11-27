"use client";

import { useState } from "react";
import { intakeDateToIso, toIntakeDateInput } from "@/lib/intake-dates";
import { CONFERENCE_LEVEL_LABELS, type ConferenceInfo, type ConferenceLevel, type UnitOption } from "@/lib/conferences-api";

export type ConferenceFormState = {
  title: string; description: string; level: ConferenceLevel; hostOrganizationUnitId: string; location: string;
  startsAt: string; endsAt: string; responseDeadline: string; abstractDeadline: string; fullPaperDeadline: string;
};

export const EMPTY_CONFERENCE_FORM: ConferenceFormState = { title: "", description: "", level: "academy", hostOrganizationUnitId: "", location: "", startsAt: "", endsAt: "", responseDeadline: "", abstractDeadline: "", fullPaperDeadline: "" };

export function conferenceToForm(conference: ConferenceInfo): ConferenceFormState {
  return {
    title: conference.title, description: conference.description ?? "", level: conference.level, hostOrganizationUnitId: conference.hostOrganizationUnit.id, location: conference.location,
    startsAt: toIntakeDateInput(conference.startsAt), endsAt: toIntakeDateInput(conference.endsAt), responseDeadline: conference.responseDeadline ? toIntakeDateInput(conference.responseDeadline) : "",
    abstractDeadline: toIntakeDateInput(conference.abstractDeadline), fullPaperDeadline: toIntakeDateInput(conference.fullPaperDeadline)
  };
}

/** Ngày nhập theo lịch Việt Nam: bắt đầu tính từ 00:00, kết thúc và các hạn tính hết 23:59 ngày đó. */
export function formToPayload(form: ConferenceFormState) {
  return {
    title: form.title.trim(), description: form.description.trim() || null, level: form.level, hostOrganizationUnitId: form.hostOrganizationUnitId, location: form.location.trim(),
    startsAt: intakeDateToIso(form.startsAt), endsAt: intakeDateToIso(form.endsAt, true), responseDeadline: form.responseDeadline ? intakeDateToIso(form.responseDeadline, true) : null,
    abstractDeadline: intakeDateToIso(form.abstractDeadline, true), fullPaperDeadline: intakeDateToIso(form.fullPaperDeadline, true)
  };
}

export function conferenceFormProblem(form: ConferenceFormState) {
  if (!form.title.trim() || !form.location.trim() || !form.hostOrganizationUnitId) return "Cần tên hội nghị, đơn vị chủ trì và địa điểm.";
  if (!form.startsAt || !form.endsAt || !form.abstractDeadline || !form.fullPaperDeadline) return "Cần ngày tổ chức và hai hạn nộp.";
  if (form.endsAt < form.startsAt) return "Ngày kết thúc phải sau ngày bắt đầu.";
  if (form.fullPaperDeadline < form.abstractDeadline) return "Hạn nộp toàn văn phải sau hạn nộp tóm tắt.";
  if (form.fullPaperDeadline > form.endsAt) return "Hạn nộp toàn văn phải trước khi hội nghị kết thúc.";
  return null;
}

export function ConferenceFields({ form, onChange, units, unitLocked }: { form: ConferenceFormState; onChange: (next: ConferenceFormState) => void; units: UnitOption[]; unitLocked?: boolean }) {
  const set = (key: keyof ConferenceFormState) => (event: { target: { value: string } }) => onChange({ ...form, [key]: event.target.value });
  return <div className="form-grid two">
    <label className="field"><span>Tên hội nghị</span><input value={form.title} maxLength={500} onChange={set("title")} /></label>
    <label className="field"><span>Cấp hội nghị</span><select value={form.level} onChange={set("level")}>{(Object.keys(CONFERENCE_LEVEL_LABELS) as ConferenceLevel[]).map((level) => <option key={level} value={level}>{CONFERENCE_LEVEL_LABELS[level]}</option>)}</select></label>
    <label className="field"><span>Đơn vị chủ trì</span><select value={form.hostOrganizationUnitId} disabled={unitLocked} onChange={set("hostOrganizationUnitId")}><option value="">Chọn đơn vị</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
    <label className="field"><span>Địa điểm</span><input value={form.location} maxLength={500} onChange={set("location")} /></label>
    <label className="field"><span>Ngày bắt đầu</span><input type="date" value={form.startsAt} onChange={set("startsAt")} /></label>
    <label className="field"><span>Ngày kết thúc</span><input type="date" min={form.startsAt || undefined} value={form.endsAt} onChange={set("endsAt")} /></label>
    <label className="field"><span>Hạn nộp tóm tắt</span><input type="date" value={form.abstractDeadline} onChange={set("abstractDeadline")} /></label>
    <label className="field"><span>Hạn nộp toàn văn</span><input type="date" min={form.abstractDeadline || undefined} value={form.fullPaperDeadline} onChange={set("fullPaperDeadline")} /></label>
    <label className="field"><span>Hạn trả lời thư mời (tuỳ chọn)</span><input type="date" value={form.responseDeadline} onChange={set("responseDeadline")} /></label>
    <label className="field"><span>Mô tả (tuỳ chọn)</span><textarea rows={3} maxLength={5000} value={form.description} onChange={set("description")} /></label>
  </div>;
}

export function useConferenceForm(initial: ConferenceFormState) {
  const [form, setForm] = useState(initial);
  return { form, setForm, problem: conferenceFormProblem(form) };
}
