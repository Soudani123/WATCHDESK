export default function HealthStatusCard({ s, colors }) {
  return (
    <div style={{
      background: s.bg,
      padding: "20px",
      borderRadius: "16px",
      borderLeft: `4px solid ${s.color}`,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 32, fontWeight: "bold", color: s.color }}>{s.count}</div>
      <div style={{ fontWeight: 500, color: s.color, marginBottom: 4 }}>{s.label}</div>
      <div style={{ fontSize: 13, color: s.subColor || colors.subtext }}>{s.sub}</div>
    </div>
  );
}