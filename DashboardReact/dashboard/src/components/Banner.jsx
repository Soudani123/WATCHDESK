export default function Banner({ theme, dark }) {
  return (
    <div style={{ 
      background: dark ? "#1E3A5F" : "#EFF6FF", 
      border: `1px solid ${dark ? "#2563EB44" : "#BFDBFE"}`, 
      borderRadius: 10, padding: "12px 18px", marginBottom: 24, 
      display: "flex", alignItems: "center", gap: 10 
    }}>
      <span style={{ color: "#2563EB", fontSize: 18 }}>☆</span>
      <span style={{ color: "#2563EB", fontSize: 14 }}>
        Mode Super Administrateur — accès complet à tous les groupes, administrateurs et paramètres globaux.
      </span>
    </div>
  );
}