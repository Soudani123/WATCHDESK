export default function KpiCard({ k, colors }) {
  return (
    <div style={{
      background: colors.card,
      padding: "20px",
      borderRadius: "16px",
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          background: k.iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20
        }}>{k.icon}</div>
        <span style={{ fontSize: 28, fontWeight: "bold", color: colors.text }}>{k.value}</span>
      </div>
      <div style={{ color: colors.text, fontWeight: 500, marginBottom: 4 }}>{k.label}</div>
      <div style={{ fontSize: 13, color: k.subColor }}>{k.sub}</div>
    </div>
  );
}