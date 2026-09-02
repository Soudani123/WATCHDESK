export default function Topbar({ dark, setDark, colors }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 32px", background: colors.card }}>
      <h1 style={{ color: colors.text }}>Dashboard</h1>
      <div style={{ display: "flex", gap: 12 }}>
        <span style={{ color: colors.subtext }}>Mardi 31 mars 2026</span>
        <button onClick={() => setDark(!dark)}>{dark ? "Clair" : "Sombre"}</button>
      </div>
    </div>
  );
}
