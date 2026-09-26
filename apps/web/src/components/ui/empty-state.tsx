export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state" role="status">
      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    </div>
  );
}
