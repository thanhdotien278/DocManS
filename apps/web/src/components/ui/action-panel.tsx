export type ActionPanelItem = {
  label: string;
  tone?: "default" | "primary" | "danger";
  icon?: React.ReactNode;
};

export function ActionPanel({
  actions,
  note
}: {
  actions: ActionPanelItem[];
  note?: string;
}) {
  return (
    <div className="action-panel">
      <div className="button-row">
        {actions.map((action) => (
          <button
            className={`button ${action.tone === "primary" ? "primary" : action.tone === "danger" ? "danger" : ""}`}
            key={action.label}
            type="button"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
      {note ? <p className="action-panel-note">{note}</p> : null}
    </div>
  );
}
