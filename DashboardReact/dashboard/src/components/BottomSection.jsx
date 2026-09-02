import IncidentsList from "./IncidentsList";
import AdminsList from "./AdminsList";

export default function BottomSection({ theme, dark, data, onViewIncidents }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
      <IncidentsList theme={theme} dark={dark} incidents={data?.incidents} onViewAll={onViewIncidents} />
      <AdminsList theme={theme} dark={dark} />
    </div>
  );
}