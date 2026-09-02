import { severityColors, statusColors } from "../data/colors";

export default function IncidentsList({ incidents, dark, colors }) {
  return (
<div style={{
  background: colors.card,
  borderRadius: "16px",
  border: `1px solid ${colors.border}`,
  padding: "20px",
  width: "100%",      // AJOUTER
  height: "100%",     // GARDER
  display: "flex",
  flexDirection: "column"
}}>
      <h3 style={{ color: colors.text, marginBottom: 16, marginTop: 0 }}>Incidents récents</h3>
      <div style={{ flex: 1 }}>
        {incidents && incidents.slice(0, 4).map((incident, i) => {
          const severity = severityColors[incident.severity] || severityColors.Moyenne;
          const status = statusColors[incident.status] || statusColors["En cours"];
          
          return (
            <div key={incident.id || i} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: i < Math.min(incidents.length, 4) - 1 ? `1px solid ${colors.border}` : "none"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: severity.text,
                  display: "inline-block",
                  flexShrink: 0
                }}></span>
                <div>
                  <div style={{ fontWeight: "bold", color: colors.text }}>
                    {incident.pc} - {incident.desc}
                  </div>
                  <div style={{ fontSize: 11, color: colors.subtext }}>{incident.time}</div>
                </div>
              </div>
              <span style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: "20px",
                background: status.bg,
                color: status.text,
                flexShrink: 0
              }}>{incident.status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}