export default function AdminsList({ admins, dark, colors }) {
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
      <h3 style={{ color: colors.text, marginBottom: 16, marginTop: 0 }}>Administrateurs</h3>
      <div style={{ flex: 1 }}>
        {admins && admins.slice(0, 4).map((admin, i) => (
          <div key={i} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 0",
            borderBottom: i < Math.min(admins.length, 4) - 1 ? `1px solid ${colors.border}` : "none"
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: dark ? "#3B82F6" : "#EFF6FF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: 13,
              color: dark ? "#FFFFFF" : "#2563EB",
              flexShrink: 0
            }}>{admin.initials}</div>
            <div>
              <div style={{ fontWeight: "bold", color: colors.text }}>{admin.name}</div>
              <div style={{ fontSize: 12, color: colors.subtext }}>{admin.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}