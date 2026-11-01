"use client";

import { useEffect, useId, useState } from "react";
import { searchProposalMemberCandidates, type ProposalMember, type ProposalMemberCandidate } from "@/lib/research-proposals-api";

function candidateLabel(candidate: ProposalMemberCandidate) {
  const titles = [candidate.academicRank, candidate.academicDegree].filter(Boolean).join(" ");
  return `${titles ? `${titles} ` : ""}${candidate.fullName}${candidate.organization ? ` — ${candidate.organization}` : ""}`;
}

function MemberSearch({ index, onSelect, onManual }: { index: number; onSelect: (candidate: ProposalMemberCandidate) => void; onManual: () => void }) {
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ProposalMemberCandidate[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setItems([]);
      setStatus("idle");
      return;
    }
    let stale = false;
    setStatus("loading");
    const timer = setTimeout(() => {
      searchProposalMemberCandidates(keyword)
        .then((result) => { if (!stale) { setItems(result); setActive(-1); setStatus("idle"); } })
        .catch(() => { if (!stale) { setItems([]); setStatus("error"); } });
    }, 300);
    return () => { stale = true; clearTimeout(timer); };
  }, [query]);

  const expanded = open && items.length > 0;
  function choose(candidate: ProposalMemberCandidate) {
    setOpen(false);
    onSelect(candidate);
  }
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current <= 0 ? items.length - 1 : current - 1));
    } else if (event.key === "Enter") {
      // Never let Enter in the search box submit the enclosing proposal form.
      event.preventDefault();
      if (expanded && active >= 0) choose(items[active]!);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const hint = query.trim().length < 2
    ? "Gõ ít nhất 2 ký tự của họ tên."
    : status === "loading" ? "Đang tìm…" : status === "error" ? "Không tra cứu được danh mục. Thử lại hoặc nhập thủ công." : items.length ? "" : "Không có kết quả phù hợp.";

  return <div className="field" style={{ gridColumn: "1 / -1", position: "relative" }}>
    <label htmlFor={`${listboxId}-input`}>Tìm nhà khoa học (thành viên {index + 1})</label>
    <input
      id={`${listboxId}-input`}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={expanded}
      aria-controls={listboxId}
      aria-activedescendant={expanded && active >= 0 ? `${listboxId}-${active}` : undefined}
      autoComplete="off"
      value={query}
      onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={onKeyDown}
    />
    <ul id={listboxId} role="listbox" aria-label="Nhà khoa học phù hợp" hidden={!expanded}
      style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, margin: 0, padding: 4, listStyle: "none", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
      {items.map((candidate, i) => <li
        key={candidate.id}
        id={`${listboxId}-${i}`}
        role="option"
        aria-selected={i === active}
        onMouseDown={(event) => { event.preventDefault(); choose(candidate); }}
        onMouseEnter={() => setActive(i)}
        style={{ padding: "6px 8px", borderRadius: 6, cursor: "pointer", background: i === active ? "var(--primary-soft)" : undefined }}
      >{candidateLabel(candidate)}</li>)}
    </ul>
    <span className="field-hint" aria-live="polite">{hint}</span>
    <div><button className="button" type="button" onClick={onManual}>Nhập thủ công (ngoài danh mục)</button></div>
  </div>;
}

export function ProposalMembersEditor({ members, disabled = false, onChange }: { members: ProposalMember[]; disabled?: boolean; onChange: (members: ProposalMember[]) => void }) {
  function patch(index: number, value: Partial<ProposalMember>) {
    onChange(members.map((member, i) => i !== index ? member : { ...member, ...value }));
  }
  const cleared: Partial<ProposalMember> = { researcherProfileId: undefined, userId: undefined, username: undefined, isAccountLinked: undefined, manual: undefined, name: "", organization: "" };

  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0, gridColumn: "1 / -1" }}><legend>Thư ký và thành viên team</legend>
    {members.map((member, index) => {
      // Catalog rows and legacy rows with a linked account keep their identity; only "Đổi người" clears it.
      const linked = Boolean(member.researcherProfileId || member.userId);
      const manual = !linked && Boolean(member.manual || member.name || member.organization);
      return <div className="form-grid two" key={member.id ?? index}>
        {linked ? <>
          <label className="field"><span>Họ tên {index + 1}</span><input value={member.name} readOnly /></label>
          <label className="field"><span>Đơn vị</span><input value={member.organization} readOnly /></label>
          <div className="field">
            <span className={`status-badge ${member.isAccountLinked || member.userId ? "success" : "warning"}`}>{member.isAccountLinked || member.userId ? "Đã có tài khoản" : "Chưa có tài khoản"}</span>
            <div><button className="button" type="button" onClick={() => patch(index, cleared)}>Đổi người</button></div>
          </div>
        </> : manual ? <>
          <label className="field"><span>Họ tên {index + 1}</span><input value={member.name} onChange={(e) => patch(index, { name: e.target.value })} /></label>
          <label className="field"><span>Đơn vị</span><input value={member.organization} onChange={(e) => patch(index, { organization: e.target.value })} /></label>
          <div className="field">
            <span className="status-badge neutral">Ngoài danh mục</span>
            <div><button className="button" type="button" onClick={() => patch(index, cleared)}>Tìm trong danh mục</button></div>
          </div>
        </> : <MemberSearch
          index={index}
          onSelect={(candidate) => patch(index, { researcherProfileId: candidate.id, name: candidate.fullName, organization: candidate.organization, isAccountLinked: candidate.hasAccount, userId: undefined, username: undefined, manual: undefined })}
          onManual={() => patch(index, { manual: true })}
        />}
        <label className="field"><span>Vai trò team</span><select value={member.role} onChange={(e) => patch(index, { role: e.target.value as ProposalMember["role"], participationRole: undefined })}><option value="TOPIC_MEMBER">Thành viên</option><option value="TOPIC_SECRETARY">Thư ký</option></select></label>
        <button className="button" type="button" onClick={() => onChange(members.filter((_, i) => i !== index))}>Bỏ thành viên {index + 1}</button>
      </div>;
    })}
    <button className="button" type="button" onClick={() => onChange([...members, { name: "", role: "TOPIC_MEMBER", organization: "" }])}>Thêm thành viên</button>
  </fieldset>;
}
