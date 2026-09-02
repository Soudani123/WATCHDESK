export default function UserInfo({ colors }) {
  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: "20px",
      borderTop: `1px solid ${colors.border}`,
      marginTop: "auto"
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: colors.bg === "#0F172A" ? "#3B82F6" : "#EFF6FF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
        fontWeight: "bold",
        color: colors.bg === "#0F172A" ? "#FFFFFF" : "#2563EB"
      }}>SA</div>
      <div style={{ fontWeight: "bold", color: colors.text }}>Super Admin</div>
      <div style={{ fontSize: 12, color: colors.subtext }}>Super Administrateur</div>
    </div>
  );
}