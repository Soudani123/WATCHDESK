export default function Banner({ dark, colors }) {
  return (
    <div style={{
      background: dark ? "#1E293B" : "#EFF6FF",
      padding: "16px 24px",
      borderRadius: "12px",
      marginBottom: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between"
    }}>
      <div>
        <span style={{ fontWeight: "bold", color: dark ? "#F1F5F9" : "#1E293B" }}>
          Mode Super Administrateur - accès complet.
        </span>
      </div>
      <span style={{
        background: dark ? "#3B82F6" : "#2563EB",
        color: "white",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: 12
      }}>Admin</span>
    </div>
  );
}