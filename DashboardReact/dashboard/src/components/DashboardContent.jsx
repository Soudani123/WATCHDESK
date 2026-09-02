import ParcOverview from "./ParcOverview";

export default function DashboardContent({ theme, dark, onViewIncidents, onViewComputers, onViewVulns }) {
  return (
    <ParcOverview
      theme={theme}
      dark={dark}
      onViewIncidents={onViewIncidents}
      onViewComputers={onViewComputers}
      onViewVulns={onViewVulns}
    />
  );
}
