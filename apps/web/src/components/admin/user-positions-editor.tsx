"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { loadPositionCatalog, setAdminUserPositions, type AdminUser, type OrganizationUnit, type UnitTypeDefinition, type UserPosition } from "@/lib/admin-api";

/**
 * Chức danh của tài khoản tại các đơn vị (Giám đốc/Phó Giám đốc Viện, Trưởng/Phó phòng, Trưởng/Phó khoa, Chủ nhiệm/
 * Phó Chủ nhiệm Bộ môn). Chỉ để hiển thị cùng tài khoản, không cấp quyền. Được kiêm nhiệm ở nhiều đơn vị; máy chủ
 * kiểm tra loại đơn vị và số người tối đa của từng chức danh.
 */
export function UserPositionsEditor({ user, organizationUnits, onSaved }: { user: AdminUser; organizationUnits: OrganizationUnit[]; onSaved: (user: AdminUser) => void }) {
  const [catalog, setCatalog] = useState<UnitTypeDefinition[]>([]);
  const [positions, setPositions] = useState<UserPosition[]>(user.positions ?? []);
  const [unitId, setUnitId] = useState("");
  const [positionCode, setPositionCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPositionCatalog().then(setCatalog).catch(() => setError("Không tải được danh mục chức danh."));
  }, []);

  const eligibleUnits = useMemo(() => organizationUnits.filter((unit) => unit.unitType && unit.unitType !== "OTHER" && !positions.some((item) => item.organizationUnitId === unit.id)), [organizationUnits, positions]);
  const selectedUnit = organizationUnits.find((unit) => unit.id === unitId);
  const options = catalog.find((type) => type.code === selectedUnit?.unitType)?.positions ?? [];
  const labelOf = (item: UserPosition) => {
    const unit = organizationUnits.find((candidate) => candidate.id === item.organizationUnitId);
    const title = catalog.find((type) => type.code === unit?.unitType)?.positions.find((position) => position.code === item.positionCode)?.label;
    return title && unit ? `${title} – ${unit.name}` : item.label ?? item.positionCode;
  };

  async function save(next: UserPosition[]) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { user: updated } = await setAdminUserPositions(user.id, next);
      setPositions(updated.positions ?? []);
      setMessage("Đã lưu chức danh.");
      onSaved(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được chức danh.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-form" style={{ marginTop: "16px", borderTop: "1px dashed var(--border)", paddingTop: "14px" }}>
      <strong>Chức danh tại đơn vị</strong>
      <p className="record-meta" style={{ margin: 0 }}>Chỉ để hiển thị cùng tài khoản; không thay đổi quyền. Một người có thể kiêm nhiệm ở nhiều đơn vị.</p>
      {positions.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {positions.map((item) => (
            <span key={item.organizationUnitId} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#ecfdf5", color: "#065f46", borderRadius: "12px", padding: "3px 4px 3px 10px", fontSize: "12px", fontWeight: 600 }}>
              {labelOf(item)}
              <button type="button" aria-label={`Gỡ chức danh ${labelOf(item)}`} disabled={saving} onClick={() => void save(positions.filter((other) => other.organizationUnitId !== item.organizationUnitId))} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#065f46", display: "inline-flex", padding: "2px" }}>
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <span className="record-meta">Chưa có chức danh.</span>
      )}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="Đơn vị" value={unitId} disabled={saving} onChange={(event) => { setUnitId(event.target.value); setPositionCode(""); }}>
          <option value="">Chọn đơn vị (Viện, Phòng, Khoa, Bộ môn)</option>
          {eligibleUnits.map((unit) => (
            <option key={unit.id} value={unit.id}>{unit.unitTypeLabel ? `${unit.unitTypeLabel}: ` : ""}{unit.name}</option>
          ))}
        </select>
        <select aria-label="Chức danh" value={positionCode} disabled={saving || !selectedUnit} onChange={(event) => setPositionCode(event.target.value)}>
          <option value="">Chọn chức danh</option>
          {options.map((position) => (
            <option key={position.code} value={position.code}>{position.label} (tối đa {position.max})</option>
          ))}
        </select>
        <button type="button" className="button" disabled={saving || !unitId || !positionCode} onClick={() => void save([...positions, { organizationUnitId: unitId, positionCode }]).then(() => { setUnitId(""); setPositionCode(""); })} style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
          {saving ? <Save size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          Thêm chức danh
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {message ? <p className="state-message success">{message}</p> : null}
    </div>
  );
}
