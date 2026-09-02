import React from "react";

const statusColors = {
  online: { bg: "rgba(34, 197, 94, 0.12)", text: "#22C55E", border: "rgba(34, 197, 94, 0.3)" },
  warning: { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.3)" },
  offline: { bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444", border: "rgba(239, 68, 68, 0.3)" }
};

// SVG Icônes intégrées
const MonitorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

function formatRelativeTime(dateString) {
  if (!dateString) return "À l'instant";
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((new Date() - past) / 1000);
  if (isNaN(diffInSeconds) || diffInSeconds < 10) return "En direct";
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  return diffInMinutes < 60 ? `${diffInMinutes}m` : `${Math.floor(diffInMinutes / 60)}h`;
}

export default function ComputersTable({ theme, data }) {
  const computers = data?.length > 0 ? data : [];

  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 16,
      padding: 24,
      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: theme.text }}>
            Postes sous surveillance
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: theme.subtext }}>État du parc (actions dans Ordinateurs)</p>
        </div>
        <span style={{
          background: "rgba(37, 99, 235, 0.1)",
          color: "#2563EB",
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600
        }}>
          {computers.length} Connectés
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {computers.map((c, i) => {
          const status = statusColors[c.status] || statusColors.online;

          return (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "2.2fr 1.5fr 1.5fr 1.2fr 1fr",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: 12,
              background: theme.bg,
              border: `1px solid ${theme.border}`
            }}>
              {/* Nom & Statut */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: status.bg,
                  border: `1px solid ${status.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: status.text
                }}>
                  <MonitorIcon />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{c.name || c.pcName}</div>
                  <div style={{ fontSize: 11, color: status.text, fontWeight: 500 }}>● {c.status || "En ligne"}</div>
                </div>
              </div>

              {/* IP */}
              <div style={{ fontSize: 13, color: theme.subtext, fontFamily: "monospace" }}>
                {c.ip}
              </div>

              {/* Utilisateur */}
              <div style={{ fontSize: 13, color: theme.text }}>
                {c.user || c.username || "Session active"}
              </div>

              {/* Ping / Temps */}
              <div style={{ fontSize: 12, color: theme.subtext }}>
                {c.lastSeen || formatRelativeTime(c.lastHeartbeat)}
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{
                  background: status.bg,
                  color: status.text,
                  border: `1px solid ${status.border}`,
                  padding: "3px 8px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {c.status || "online"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}