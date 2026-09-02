import { useState } from "react";

const mockIncidents = [
  { id: 1, severity: "Élevée", pc: "PC-COMPTA-04", desc: "Disque critique", time: "09:14", status: "Nouveau" },
  { id: 2, severity: "Élevée", pc: "SRV-DEV-01", desc: "CPU 98 %", time: "08:52", status: "En cours" },
  { id: 3, severity: "Moyenne", pc: "PC-RH-12", desc: "RAM insuffisante", time: "08:30", status: "En cours" },
  { id: 4, severity: "Moyenne", pc: "PC-MKT-07", desc: "Mise à jour échouée", time: "07:45", status: "Nouveau" },
  { id: 5, severity: "Faible", pc: "PC-DIR-02", desc: "Antivirus expiré", time: "Hier", status: "Résolu" },
];

const mockComputers = [
  { name: "PC-COMPTA-01", ip: "192.168.1.21", user: "m.ben_salah", lastSeen: "Il y a 2 min", status: "online" },
  { name: "PC-DIR-05", ip: "192.168.1.45", user: "a.trabelsi", lastSeen: "Il y a 5 min", status: "online" },
  { name: "PC-RH-12", ip: "192.168.1.87", user: "s.mansouri", lastSeen: "Il y a 8 min", status: "warning" },
  { name: "SRV-DEV-01", ip: "192.168.2.10", user: "k.hamdi", lastSeen: "Il y a 11 min", status: "online" },
  { name: "PC-MKT-07", ip: "192.168.1.103", user: "i.chaabane", lastSeen: "Il y a 22 min", status: "offline" },
];

const mockAdmins = [
  { name: "Ahmed Ben Ali", role: "Admin", initials: "AB" },
  { name: "Sara Mrad", role: "Admin", initials: "SM" },
  { name: "Karim Dridi", role: "Admin", initials: "KD" },
  { name: "Ines Zouari", role: "Lecture", initials: "IZ" },
];

const severityColors = {
  Élevée: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
  Moyenne: { bg: "#FEF9C3", text: "#D97706", border: "#FDE68A" },
  Faible: { bg: "#F0FDF4", text: "#16A34A", border: "#BBF7D0" },
};

const statusColors = {
  Nouveau: { bg: "#EFF6FF", text: "#2563EB" },
  "En cours": { bg: "#FFF7ED", text: "#EA580C" },
  Résolu: { bg: "#F0FDF4", text: "#16A34A" },
};

const statusDot = {
  online: "#22C55E",
  warning: "#F59E0B",
  offline: "#EF4444",
};

export default function WatchDeskDashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [dark, setDark] = useState(false);

  const nav = [
    { label: "Dashboard", icon: "⊞", badge: null, group: "PRINCIPAL" },
    { label: "Ordinateurs", icon: "🖥", badge: 142, group: "PRINCIPAL" },
    { label: "Incidents", icon: "△", badge: 7, group: "PRINCIPAL" },
    { label: "Rapports", icon: "📄", badge: null, group: "PRINCIPAL" },
    { label: "Administrateurs", icon: "👤", badge: null, group: "SUPER ADMIN" },
    { label: "Configuration", icon: "⚙", badge: null, group: "SUPER ADMIN" },
    { label: "Agent Windows", icon: "↑", badge: null, group: "SUPER ADMIN" },
  ];

  const bg = dark ? "#0F172A" : "#F8FAFC";
  const sidebar = dark ? "#1E293B" : "#FFFFFF";
  const card = dark ? "#1E293B" : "#FFFFFF";
  const text = dark ? "#F1F5F9" : "#1E293B";
  const subtext = dark ? "#94A3B8" : "#64748B";
  const border = dark ? "#334155" : "#E2E8F0";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: text }}>
      {/* Sidebar */}
      <aside style={{ width: 260, background: sidebar, borderRight: `1px solid ${border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #2563EB, #1D4ED8)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>W</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: text }}>WatchDesk</div>
              <div style={{ fontSize: 12, color: subtext }}>Console Admin</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 12px", overflowY: "auto" }}>
          {["PRINCIPAL", "SUPER ADMIN"].map(group => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: subtext, letterSpacing: "0.08em", padding: "8px 8px 4px", textTransform: "uppercase" }}>{group}</div>
              {nav.filter(n => n.group === group).map(n => (
                <button key={n.label} onClick={() => setActiveNav(n.label)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", cursor: "pointer", marginBottom: 2,
                    background: activeNav === n.label ? "#EFF6FF" : "transparent",
                    color: activeNav === n.label ? "#2563EB" : text,
                    fontWeight: activeNav === n.label ? 600 : 400,
                    fontSize: 14, textAlign: "left",
                  }}>
                  <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{n.icon}</span>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {n.badge && (
                    <span style={{ background: n.label === "Incidents" ? "#EF4444" : "#2563EB", color: "#fff", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>{n.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: "16px 20px", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #2563EB, #7C3AED)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 13 }}>SA</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: text }}>Super Admin</div>
            <div style={{ fontSize: 11, color: "#2563EB", fontWeight: 500 }}>Super Administrateur</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 260, flex: 1, padding: "0 0 40px" }}>
        {/* Topbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: card, borderBottom: `1px solid ${border}`, position: "sticky", top: 0, zIndex: 9 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: text, margin: 0 }}>Dashboard</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 14, color: subtext }}>Mardi 31 mars 2026</span>
            <button onClick={() => setDark(!dark)} style={{ background: dark ? "#334155" : "#F1F5F9", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, color: text }}>{dark ? "☀️ Clair" : "🌙 Sombre"}</button>
            <div style={{ width: 36, height: 36, background: card, border: `1px solid ${border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18, position: "relative" }}>
              🔔
              <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, background: "#EF4444", borderRadius: "50%", border: "2px solid white" }}></span>
            </div>
            <div style={{ width: 36, height: 36, background: card, border: `1px solid ${border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>❓</div>
            <div style={{ width: 36, height: 36, background: "#2563EB", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>
              <span style={{ color: "#fff" }}>→</span>
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 32px" }}>
          {/* Banner */}
          <div style={{ background: dark ? "#1E3A5F" : "#EFF6FF", border: `1px solid ${dark ? "#2563EB44" : "#BFDBFE"}`, borderRadius: 10, padding: "12px 18px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#2563EB", fontSize: 18 }}>☆</span>
            <span style={{ color: "#2563EB", fontSize: 14 }}>Mode Super Administrateur — accès complet à tous les groupes, administrateurs et paramètres globaux.</span>
          </div>

          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { icon: "🖥", label: "Total ordinateurs", value: "248", sub: "+12 ce mois", subColor: "#16A34A", iconBg: "#EFF6FF", iconColor: "#2563EB" },
              { icon: "⏱", label: "En ligne", value: "203", sub: "81.8 %", subColor: "#16A34A", iconBg: "#F0FDF4", iconColor: "#16A34A" },
              { icon: "🚫", label: "Hors ligne", value: "45", sub: "dont 8 prolongés", subColor: "#64748B", iconBg: "#F8FAFC", iconColor: "#94A3B8" },
              { icon: "△", label: "Incidents actifs", value: "7", sub: "3 critiques", subColor: "#DC2626", iconBg: "#FEF2F2", iconColor: "#EF4444" },
            ].map((k, i) => (
              <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "20px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, background: k.iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    <span style={{ color: k.iconColor }}>{k.icon}</span>
                  </div>
                  <span style={{ fontSize: 13, color: subtext }}>{k.label}</span>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, color: text, lineHeight: 1.1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: k.subColor, marginTop: 4, fontWeight: 500 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Health Status */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { count: 186, label: "Postes sains", sub: "Aucune alerte", color: "#16A34A", bg: dark ? "#14532D22" : "#F0FDF4", border2: "#BBF7D0", dot: "#22C55E" },
              { count: 35, label: "Avertissements", sub: "Surveillance requise", color: "#D97706", bg: dark ? "#78350F22" : "#FFFBEB", border2: "#FDE68A", dot: "#F59E0B" },
              { count: 12, label: "Postes en erreur", sub: "Intervention urgente", color: "#DC2626", bg: dark ? "#7F1D1D22" : "#FEF2F2", border2: "#FECACA", dot: "#EF4444" },
            ].map((s, i) => (
              <div key={i} style={{ background: s.bg, border: `1.5px solid ${s.border2}`, borderRadius: 12, padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot }}></div>
                  <span style={{ fontSize: 13, color: s.color, fontWeight: 600 }}>{s.label}</span>
                </div>
                <div style={{ fontSize: 38, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 12, color: s.color, opacity: 0.8 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Recent incidents */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text }}>Incidents récents</h3>
                <button style={{ background: "none", border: "none", color: "#2563EB", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Voir tout</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {mockIncidents.map(inc => (
                  <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: dark ? "#0F172A" : "#F8FAFC" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: severityColors[inc.severity].bg, color: severityColors[inc.severity].text, border: `1px solid ${severityColors[inc.severity].border}`, whiteSpace: "nowrap" }}>{inc.severity}</span>
                    <span style={{ flex: 1, fontSize: 13, color: text, fontWeight: 500 }}>{inc.pc} — {inc.desc}</span>
                    <span style={{ fontSize: 12, color: subtext, whiteSpace: "nowrap" }}>{inc.time}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: statusColors[inc.status].bg, color: statusColors[inc.status].text, whiteSpace: "nowrap" }}>{inc.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Admins */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text }}>Gestion Administrateurs</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: subtext, padding: "6px 8px" }}>Nom</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: subtext, padding: "6px 8px" }}>Rôle</span>
              </div>
              {mockAdmins.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", alignItems: "center", padding: "8px 8px", borderRadius: 8, background: i % 2 === 0 ? (dark ? "#0F172A" : "#F8FAFC") : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #2563EB, #7C3AED)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{a.initials}</div>
                    <span style={{ fontSize: 13, color: text }}>{a.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: a.role === "Lecture" ? "#D97706" : "#2563EB", fontWeight: 500 }}>{a.role}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}`, fontSize: 12, color: subtext }}>4 administrateurs</div>
            </div>
          </div>

          {/* Last active computers */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text }}>Derniers ordinateurs actifs</h3>
              <button style={{ background: "none", border: "none", color: "#2563EB", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Voir tout</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr", gap: 0 }}>
              {["Nom", "IP", "Utilisateur", "Dernière activité"].map(h => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, color: subtext, padding: "6px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
              ))}
              {mockComputers.map((c, i) => (
                <>
                  <div key={`n-${i}`} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 8px", borderTop: `1px solid ${border}` }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusDot[c.status], flexShrink: 0 }}></div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: text }}>{c.name}</span>
                  </div>
                  <div key={`ip-${i}`} style={{ padding: "10px 8px", fontSize: 13, color: subtext, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center" }}>{c.ip}</div>
                  <div key={`u-${i}`} style={{ padding: "10px 8px", fontSize: 13, color: text, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center" }}>{c.user}</div>
                  <div key={`t-${i}`} style={{ padding: "10px 8px", fontSize: 12, color: subtext, borderTop: `1px solid ${border}`, display: "flex", alignItems: "center" }}>{c.lastSeen}</div>
                </>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
