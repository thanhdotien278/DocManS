"use client";

import type { ProposalMember } from "@/lib/research-proposals-api";

export function ProposalMembersEditor({ members, disabled = false, onChange }: { members: ProposalMember[]; disabled?: boolean; onChange: (members: ProposalMember[]) => void }) {
  function update(index: number, field: "name" | "role" | "organization" | "username", value: string) {
    onChange(members.map((member, i) => i !== index ? member : { ...member, [field]: value, ...(field === "username" ? { userId: undefined } : {}), ...(field === "role" ? { participationRole: undefined } : {}) }));
  }
  return <fieldset disabled={disabled} style={{ border: 0, padding: 0, minWidth: 0, gridColumn: "1 / -1" }}><legend>Chủ nhiệm và thành viên</legend>
    {members.map((member, index) => <div className="form-grid two" key={member.id ?? index}>
      <label className="field"><span>Họ tên {index + 1}</span><input value={member.name} onChange={(e) => update(index, "name", e.target.value)} /></label>
      <label className="field"><span>Vai trò</span><select value={member.role} onChange={(e) => update(index, "role", e.target.value)}><option value="Chủ nhiệm">Chủ nhiệm</option><option value="Thành viên">Thành viên</option><option value="Đồng chủ nhiệm">Đồng chủ nhiệm</option></select></label>
      <label className="field"><span>Đơn vị</span><input value={member.organization} onChange={(e) => update(index, "organization", e.target.value)} /></label>
      <label className="field"><span>Tài khoản (nếu có)</span><input value={member.username ?? ""} placeholder={member.userId ? "Đã liên kết tài khoản" : "Tên đăng nhập"} onChange={(e) => update(index, "username", e.target.value)} /></label>
      <button className="button" type="button" onClick={() => onChange(members.filter((_, i) => i !== index))}>Bỏ thành viên {index + 1}</button>
    </div>)}
    <button className="button" type="button" onClick={() => onChange([...members, { name: "", role: "Thành viên", organization: "", username: "" }])}>Thêm thành viên</button>
  </fieldset>;
}
