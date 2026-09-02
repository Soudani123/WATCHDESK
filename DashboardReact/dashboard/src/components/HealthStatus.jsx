const healthConfig = [
  { key: "healthy", label: "Postes sains", sub: "Aucune alerte", color: "#16A34A", bg: "#F0FDF4", border2: "#BBF7D0", dot: "#22C55E" },
  { key: "warning", label: "Avertissements", sub: "Surveillance requise", color: "#D97706", bg: "#FFFBEB", border2: "#FDE68A", dot: "#F59E0B" },
  { key: "error", label: "Postes en erreur", sub: "Intervention urgente", color: "#DC2626", bg: "#FEF2F2", border2: "#FECACA", dot: "#EF4444" },
];

export default function HealthStatus({ theme, dark, data }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
      {healthConfig.map((s, i) => (
        <div key={i} style={{ 
          background: dark ? s.bg.replace("F0FDF4", "14532D22").replace("FFFBEB", "78350F22").replace("FEF2F2", "7F1D1D22") : s.bg, 
          border: `1.5px solid ${s.border2}`, 
          borderRadius: 12, padding: "24px 20px", 
          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot }}></div>
            <span style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.label}</span>
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: s.color }}>
            {data?.[s.key] || 0}
          </div>
          <div style={{ fontSize: 12, color: s.color, opacity: 0.8 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}