export default function StatusBadge({ active, children }) {
  return (
    <span className={`status ${active ? "completed" : "on_hold"}`}>
      <i />
      {children}
    </span>
  );
}
