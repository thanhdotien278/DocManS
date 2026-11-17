"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { History, KeyRound, RefreshCw, ShieldAlert, UserCheck, UserPlus } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { RankedBars, dateTime, fullDate, number } from "@/components/ui/ops-dash";
import { loadAdminDashboard, type AdminDashboardOverview } from "@/lib/admin-api";

const accountStatuses = [
  { key: "active", label: "Đang hoạt động", tone: "active" },
  { key: "pending_approval", label: "Chờ duyệt đăng ký", tone: "pending" },
  { key: "pending_email_verification", label: "Chờ xác thực email", tone: "waiting" },
  { key: "pending_activation", label: "Chờ kích hoạt", tone: "dormant" },
  { key: "locked", label: "Đã khóa", tone: "blocked" },
  { key: "disabled", label: "Vô hiệu hóa", tone: "blocked" }
] as const;

const pendingNextStep: Record<string, { label: string; href?: string }> = {
  pending_approval: { label: "Duyệt yêu cầu", href: "/registration-requests" },
  pending_email_verification: { label: "Chờ người đăng ký xác thực email" },
  pending_activation: { label: "Chờ chủ tài khoản kích hoạt", href: "/researcher-profiles" }
};

const catalogLabels: Record<string, string> = {
  "research-field": "Lĩnh vực nghiên cứu",
  "proposal-type": "Loại hồ sơ",
  "proposal-nature": "Tính chất đề tài",
  priority: "Mức ưu tiên",
  "report-type": "Loại báo cáo",
  "scoring-criterion": "Tiêu chí chấm điểm",
  "academic-degree": "Học vị",
  "academic-rank": "Học hàm"
};

function daysSince(iso: string, now: string) {
  return Math.max(0, Math.floor((Date.parse(now) - Date.parse(iso)) / 86_400_000));
}

type AdminChange = AdminDashboardOverview["recentAdminActions"][number] & { count: number; firstAt: string };

/** Gộp các thao tác liên tiếp cùng loại, cùng người thực hiện thành một dòng. */
function groupChanges(entries: AdminDashboardOverview["recentAdminActions"], limit: number) {
  const groups: AdminChange[] = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.action === entry.action && last.actor === entry.actor) {
      last.count++;
      last.firstAt = entry.timestamp;
    } else {
      if (groups.length === limit) break;
      groups.push({ ...entry, count: 1, firstAt: entry.timestamp });
    }
  }
  return groups;
}

function shortDay(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

export function AdminDashboardPanel() {
  const [data, setData] = useState<AdminDashboardOverview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setData(await loadAdminDashboard());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tải được số liệu quản trị.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <PageHeader
        eyebrow="Quản trị hệ thống"
        title="Dashboard quản trị hệ thống"
        description="Tình trạng tài khoản, an ninh đăng nhập và các thay đổi cấu hình, lấy trực tiếp từ dữ liệu hệ thống."
        actions={
          <>
            <button className="button" type="button" onClick={() => void refresh()} disabled={isLoading}>
              <RefreshCw size={16} aria-hidden="true" className={isLoading ? "spin" : undefined} />
              {isLoading ? "Đang tải" : "Làm mới"}
            </button>
            <Link className="button primary" href="/registration-requests">Duyệt tài khoản</Link>
            <Link className="button" href="/units">Quản lý đơn vị</Link>
            <Link className="button" href="/system-settings">Quyền lập hội đồng</Link>
          </>
        }
      />

      {error ? (
        <div className="ops-dash-error" role="alert">
          <p>{error}</p>
          <button className="button" type="button" onClick={() => void refresh()}>
            Thử lại
          </button>
        </div>
      ) : null}

      {!data && isLoading ? <p className="record-meta" role="status">Đang tải số liệu quản trị…</p> : null}

      {data ? <AdminDashboardBody data={data} /> : null}
    </>
  );
}

function AdminDashboardBody({ data }: { data: AdminDashboardOverview }) {
  const { accounts, logins, sessions, units } = data;
  const pendingTotal = (accounts.byStatus.pending_approval ?? 0) + (accounts.byStatus.pending_email_verification ?? 0) + (accounts.byStatus.pending_activation ?? 0);
  const knownStatuses = new Set<string>(accountStatuses.map((status) => status.key));
  const otherStatuses = Object.entries(accounts.byStatus).filter(([key, count]) => !knownStatuses.has(key) && count > 0);

  const integrityFlags = [
    accounts.roleIssues > 0 && { icon: ShieldAlert, title: `${accounts.roleIssues} tài khoản cần xác nhận vai trò sau chuyển đổi`, meta: "Vai trò cũ chưa được phân loại; chọn lại vai trò hệ thống tại Quản lý người dùng.", href: "/users" },
    accounts.mustChangePassword > 0 && { icon: KeyRound, title: `${accounts.mustChangePassword} tài khoản phải đổi mật khẩu ở lần đăng nhập tới`, meta: "Chủ tài khoản chưa đặt mật khẩu mới.", href: "/users" },
    units.noPrimaryUnit > 0 && { icon: UserCheck, title: `${units.noPrimaryUnit} tài khoản đang hoạt động chưa có đơn vị chính`, meta: "Phạm vi dữ liệu của các tài khoản này chưa xác định.", href: "/users" }
  ].filter(Boolean) as Array<{ icon: typeof ShieldAlert; title: string; meta: string; href: string }>;

  return (
    <div className="ops-dash">
      <p className="record-meta ops-dash-stamp">Số liệu lúc {dateTime.format(new Date(data.generatedAt)).slice(6)} ngày {fullDate.format(new Date(data.generatedAt))}.</p>

      <section className="section-card ops-dash-ledger" aria-label="Tình trạng tài khoản">
        <div className="ops-dash-ledger-main">
          <div className="ops-dash-figure">
            <span className="ops-dash-figure-value">{number.format(accounts.total)}</span>
            <span className="ops-dash-figure-label">tài khoản trong hệ thống</span>
          </div>
          <div className="ops-dash-status-bar" role="img" aria-label={accountStatuses.map((status) => `${status.label}: ${accounts.byStatus[status.key] ?? 0}`).join(", ")}>
            {accountStatuses.map((status) => {
              const count = accounts.byStatus[status.key] ?? 0;
              return count ? <span key={status.key} className={`tone-${status.tone}`} style={{ flexGrow: count }} title={`${status.label}: ${count}`} /> : null;
            })}
          </div>
          <ul className="ops-dash-legend">
            {accountStatuses.map((status) => {
              const count = accounts.byStatus[status.key] ?? 0;
              if (!count && status.tone === "blocked") return null;
              return (
                <li key={status.key} className={count ? undefined : "is-zero"}>
                  <span className={`ops-dash-swatch tone-${status.tone}`} aria-hidden="true" />
                  {status.label} <strong>{count}</strong>
                </li>
              );
            })}
            {otherStatuses.map(([key, count]) => (
              <li key={key}>
                <span className="ops-dash-swatch tone-blocked" aria-hidden="true" />
                {key} <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <dl className="ops-dash-facts">
          <div>
            <dt>Phiên đăng nhập hiệu lực</dt>
            <dd>{number.format(sessions.active)}</dd>
            <p>của {sessions.users} người dùng</p>
          </div>
          <div>
            <dt>Đăng nhập 24 giờ qua</dt>
            <dd>{number.format(logins.success24h)}</dd>
            <p className={logins.failure24h ? "is-alert" : undefined}>{logins.failure24h ? `${logins.failure24h} lượt thất bại` : "Không có lượt thất bại"}</p>
          </div>
          <div>
            <dt>Đơn vị có tài khoản</dt>
            <dd>
              {units.withAccounts}
              <small>/{units.active}</small>
            </dd>
            <p>đơn vị đang hoạt động</p>
          </div>
        </dl>
      </section>

      <div className="grid two-column">
        <SectionCard
          title="Tài khoản cần xử lý"
          subtitle={pendingTotal ? `${pendingTotal} tài khoản đang chờ, xếp theo thời gian chờ lâu nhất` : "Không có tài khoản nào đang chờ"}
          action={
            <Link className="button" href="/registration-requests">
              <UserPlus size={16} aria-hidden="true" />
              Yêu cầu đăng ký
            </Link>
          }
        >
          {integrityFlags.length ? (
            <ul className="ops-dash-flags">
              {integrityFlags.map((flag) => (
                <li key={flag.title}>
                  <flag.icon size={17} aria-hidden="true" />
                  <div>
                    <Link href={flag.href}>{flag.title}</Link>
                    <span className="record-meta">{flag.meta}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {data.pendingAccounts.length ? (
            <ol className="ops-dash-queue">
              {data.pendingAccounts.map((user) => {
                const waited = daysSince(user.createdAt, data.generatedAt);
                const next = pendingNextStep[user.status];
                const status = accountStatuses.find((item) => item.key === user.status);
                return (
                  <li key={user.id}>
                    <div className="ops-dash-queue-who">
                      <span className="record-title">{user.displayName}</span>
                      <span className="record-meta">
                        {user.username ? `@${user.username}` : "Chưa có tên đăng nhập"} · {user.roleLabel ?? "Chưa gán vai trò"}
                        {user.unit ? ` · ${user.unit}` : ""}
                      </span>
                    </div>
                    <div className="ops-dash-queue-state">
                      <span className={`ops-dash-pill tone-${status?.tone ?? "waiting"}`}>{status?.label ?? user.status}</span>
                      <span className={waited >= 7 ? "ops-dash-wait is-late" : "ops-dash-wait"}>{waited === 0 ? "Hôm nay" : `Chờ ${waited} ngày`}</span>
                    </div>
                    <div className="ops-dash-queue-next">
                      {next?.href ? <Link href={next.href}>{next.label}</Link> : <span className="record-meta">{next?.label ?? "Theo dõi"}</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : !integrityFlags.length ? (
            <EmptyState title="Không có việc tồn đọng" message="Mọi tài khoản đã được duyệt, kích hoạt và gán vai trò hợp lệ." />
          ) : null}
        </SectionCard>

        <LoginActivity logins={logins} />
      </div>

      <div className="grid two-column">
        <SectionCard title="Phân bổ tài khoản đang hoạt động" subtitle="Theo vai trò hệ thống và theo đơn vị chính">
          <div className="ops-dash-split">
            <RankedBars title="Theo vai trò" rows={[...data.roles].sort((left, right) => right.active - left.active).map((role) => ({ key: role.code, label: role.label, value: role.active }))} />
            <RankedBars
              title="Đơn vị nhiều tài khoản nhất"
              rows={units.top.map((unit) => ({ key: unit.id, label: unit.name, value: unit.active }))}
              footer={units.withAccounts > units.top.length ? `và ${units.withAccounts - units.top.length} đơn vị khác` : undefined}
            />
          </div>
          {data.catalogs.length ? (
            <div className="ops-dash-catalogs">
              <h3>
                Danh mục đang dùng <Link href="/catalogs">Mở danh mục</Link>
              </h3>
              <ul>
                {data.catalogs.map((catalog) => (
                  <li key={catalog.type}>
                    {catalogLabels[catalog.type] ?? catalog.type} <strong>{catalog.active}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Thay đổi quản trị gần đây" subtitle="Tài khoản, đơn vị, danh mục và cấu hình">
          {data.recentAdminActions.length ? (
            <ol className="ops-dash-changes">
              {groupChanges(data.recentAdminActions, 8).map((entry) => (
                <li key={entry.id}>
                  <time dateTime={entry.timestamp}>{dateTime.format(new Date(entry.timestamp))}</time>
                  <div>
                    <span className="record-title">
                      {entry.label}
                      {entry.count > 1 ? <span className="ops-dash-count"> ×{entry.count}</span> : null}
                    </span>
                    <span className="record-meta">
                      {entry.actor}
                      {entry.count > 1 ? ` · từ ${dateTime.format(new Date(entry.firstAt))}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Chưa có thay đổi" message="Các thao tác quản trị sẽ được ghi tại đây khi phát sinh." />
          )}
          <Link className="ops-dash-more" href="/system-settings">
            <History size={15} aria-hidden="true" />
            Mở cấu hình hệ thống
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}

function LoginActivity({ logins }: { logins: AdminDashboardOverview["logins"] }) {
  const peak = Math.max(1, ...logins.days.map((day) => day.success + day.failure));
  const totals = logins.days.reduce((sum, day) => ({ success: sum.success + day.success, failure: sum.failure + day.failure }), { success: 0, failure: 0 });
  const peakDay = logins.days.reduce((best, day) => (day.success + day.failure > best.success + best.failure ? day : best), logins.days[0]);

  return (
    <SectionCard title="An ninh đăng nhập" subtitle={`14 ngày: ${number.format(totals.success)} lượt thành công, ${number.format(totals.failure)} lượt thất bại`}>
      <ul className="ops-dash-legend compact" aria-hidden="true">
        <li>
          <span className="ops-dash-swatch tone-active" />
          Thành công
        </li>
        <li>
          <span className="ops-dash-swatch tone-blocked" />
          Thất bại
        </li>
      </ul>
      <div className="ops-dash-columns" role="group" aria-label="Lượt đăng nhập theo ngày, 14 ngày gần nhất">
        {logins.days.map((day) => {
          const total = day.success + day.failure;
          const label = `${shortDay(day.date)}: ${day.success} thành công, ${day.failure} thất bại`;
          return (
            <div className="ops-dash-column" key={day.date} tabIndex={0} aria-label={label}>
              <span className="ops-dash-tip" aria-hidden="true">
                <strong>{shortDay(day.date)}</strong>
                {day.success} thành công · {day.failure} thất bại
              </span>
              <div className="ops-dash-stack" style={{ height: `${(total / peak) * 100}%` }}>
                {day.failure ? <span className="tone-blocked" style={{ flexGrow: day.failure }} /> : null}
                {day.success ? <span className="tone-active" style={{ flexGrow: day.success }} /> : null}
              </div>
              {day === peakDay && total ? <span className="ops-dash-peak">{total}</span> : null}
              <span className="ops-dash-day">{day.date.slice(8, 10)}</span>
            </div>
          );
        })}
      </div>
      <details className="ops-dash-table-toggle">
        <summary>Xem dạng bảng</summary>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Bảng lượt đăng nhập theo ngày">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Thành công</th>
                <th>Thất bại</th>
              </tr>
            </thead>
            <tbody>
              {logins.days.map((day) => (
                <tr key={day.date}>
                  <td>{shortDay(day.date)}</td>
                  <td>{day.success}</td>
                  <td>{day.failure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <h3 className="ops-dash-subhead">Đăng nhập thất bại trong 24 giờ</h3>
      {logins.failedAccounts.length || logins.unknownAccountFailures ? (
        <ul className="ops-dash-failures">
          {logins.failedAccounts.map((entry) => (
            <li key={entry.username ?? entry.displayName}>
              <span>
                <span className="record-title">{entry.displayName}</span>
                <span className="record-meta">
                  @{entry.username} · lần cuối {dateTime.format(new Date(entry.lastAt))}
                </span>
              </span>
              <strong className={entry.failures >= 3 ? "is-alert" : undefined}>{entry.failures} lần</strong>
            </li>
          ))}
          {logins.unknownAccountFailures ? (
            <li>
              <span>
                <span className="record-title">Không khớp tài khoản nào</span>
                <span className="record-meta">Không hiển thị nội dung đã nhập để tránh lộ mật khẩu gõ nhầm.</span>
              </span>
              <strong>{logins.unknownAccountFailures} lần</strong>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="record-meta">Không có lượt đăng nhập thất bại.</p>
      )}
    </SectionCard>
  );
}
