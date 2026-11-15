// Mảnh dùng chung của các dashboard vận hành (QT, CV): định dạng giờ Việt Nam và thanh xếp hạng.
const vnParts = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
// "15/11 13:16": Intl vi-VN tự đặt giờ trước và dùng gạch ngang, nên ghép lại theo thứ tự quen dùng.
export const dateTime = {
  format(date: Date) {
    const part = Object.fromEntries(vnParts.formatToParts(date).map((item) => [item.type, item.value]));
    return `${part.day}/${part.month} ${part.hour}:${part.minute}`;
  }
};
export const fullDate = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
export const number = new Intl.NumberFormat("vi-VN");

export function RankedBars({ title, rows, footer }: { title: string; rows: Array<{ key: string; label: string; value: number }>; footer?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="ops-dash-ranked">
      <h3>{title}</h3>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <li key={row.key} className={row.value ? undefined : "is-zero"}>
              <span className="ops-dash-ranked-label">{row.label}</span>
              <span className="ops-dash-ranked-track" aria-hidden="true">
                <span style={{ width: `${(row.value / max) * 100}%` }} />
              </span>
              <strong>{row.value}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="record-meta">Chưa có dữ liệu.</p>
      )}
      {footer ? <p className="record-meta">{footer}</p> : null}
    </div>
  );
}
