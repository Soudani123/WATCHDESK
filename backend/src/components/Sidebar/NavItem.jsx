export default function NavItem({ item, activeNav, setActiveNav, colors }) {
  const isActive = activeNav === item.label;
  
  return (
    <div
      onClick={() => setActiveNav(item.label)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        margin: "4px 12px",
        borderRadius: "12px",
        background: isActive ? (colors.bg === "#0F172A" ? "#3B82F6" : "#EFF6FF") : "transparent",
        color: isActive ? (colors.bg === "#0F172A" ? "#FFFFFF" : "#2563EB") : colors.subtext,
        cursor: "pointer",
        transition: "all 0.2s"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 24 }}>{item.icon}</span>
        <span>{item.label}</span>
      </div>
      {item.badge && (
        <span style={{
          background: colors.bg === "#0F172A" ? "#3B82F6" : "#EFF6FF",
          color: colors.bg === "#0F172A" ? "#FFFFFF" : "#2563EB",
          padding: "2px 8px",
          borderRadius: "20px",
          fontSize: 12
        }}>{item.badge}</span>
      )}
    </div>
  );
}