import Link from "next/link";
import { AlertList } from "@/components/ui/alert-list";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { KpiCard } from "@/components/ui/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getAccountById } from "@/fixtures/shell-context";
import { getDashboardSnapshot, type DashboardPanel } from "@/fixtures/showcase-data";
import { DEFAULT_SHELL_PROFILE_ID } from "@/lib/session";

function renderPanel(panel: DashboardPanel) {
  if (panel.variant === "chart") {
    return (
      <SectionCard key={panel.title} title={panel.title} subtitle={panel.subtitle}>
        <div className="chart-placeholder" aria-label={panel.title}>
          {panel.bars.map((bar) => (
            <div className="chart-bar" key={bar.label}>
              <span style={{ height: bar.height }} />
              <strong>{bar.label}</strong>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  }

  if (panel.variant === "list") {
    return (
      <SectionCard
        key={panel.title}
        title={panel.title}
        subtitle={panel.subtitle}
        action={
          panel.actionHref && panel.actionLabel ? (
            <Link className="button" href={panel.actionHref}>
              {panel.actionLabel}
            </Link>
          ) : undefined
        }
      >
        <AlertList items={panel.items} />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      key={panel.title}
      title={panel.title}
      subtitle={panel.subtitle}
      action={
        panel.actionHref && panel.actionLabel ? (
          <Link className="button" href={panel.actionHref}>
            {panel.actionLabel}
          </Link>
        ) : undefined
      }
    >
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã hồ sơ</th>
              <th>Tên đề tài</th>
              <th>Đơn vị</th>
              <th>Trạng thái</th>
              <th>Hạn xử lý</th>
            </tr>
          </thead>
          <tbody>
            {panel.rows.map((row) => (
              <tr key={row.code}>
                <td>
                  <Link className="record-title" href={row.href}>
                    {row.code}
                  </Link>
                </td>
                <td>
                  <span className="record-title">{row.title}</span>
                  <span className="record-meta">{row.meta}</span>
                </td>
                <td>{row.unit}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>{row.dueDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-list">
        {panel.rows.map((row) => (
          <article className="list-card" key={row.code}>
            <div className="list-card-header">
              <div>
                <Link className="record-title" href={row.href}>
                  {row.code}
                </Link>
                <span className="record-meta">{row.title}</span>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <span className="record-meta">
              {row.unit} - hạn {row.dueDate}
            </span>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

export default function DashboardPage() {
  const account = getAccountById(DEFAULT_SHELL_PROFILE_ID);
  const snapshot = getDashboardSnapshot(account?.role ?? "leadership");

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <PageHeader
        eyebrow={snapshot.eyebrow}
        title={snapshot.title}
        description={snapshot.description}
        actions={
          <Link className="button primary" href={snapshot.primaryActionHref}>
            {snapshot.primaryActionLabel}
          </Link>
        }
      />

      <div className="grid kpi-grid" style={{ marginBottom: 16 }}>
        {snapshot.kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} meta={kpi.meta} tone={kpi.tone} />
        ))}
      </div>

      <div className="grid two-column">
        {renderPanel(snapshot.panels[0])}
        {renderPanel(snapshot.panels[1])}
      </div>

      <div className="grid two-column" style={{ marginTop: 16 }}>
        {renderPanel(snapshot.panels[2])}
        {renderPanel(snapshot.panels[3])}
      </div>
    </>
  );
}
