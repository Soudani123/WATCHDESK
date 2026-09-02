const kpiConfig = [
  { key: "total", icon: "🖥", label: "Total ordinateurs", iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { key: "online", icon: "⏱", label: "En ligne", iconBg: "#F0FDF4", iconColor: "#16A34A" },
  { key: "offline", icon: "🚫", label: "Hors ligne", iconBg: "#F8FAFC", iconColor: "#94A3B8" },
  { key: "incidents", icon: "△", label: "Incidents ouverts", iconBg: "#FEF2F2", iconColor: "#EF4444" },
];

export default function KPICards({ theme, data }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
      {kpiConfig.map((k, i) => (
        <div key={i} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, background: k.iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
              <span style={{ color: k.iconColor }}>{k.icon}</span>
            </div>
            <span style={{ fontSize: 13, color: theme.subtext }}>{k.label}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: theme.text, lineHeight: 1.1 }}>
            {data?.[k.key] || "0"}
          </div>
        </div>
      ))}
    </div>
  );
}