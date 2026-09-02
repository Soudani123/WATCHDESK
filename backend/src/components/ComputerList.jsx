import { statusDot } from "../data/colors";

export default function ComputerList({ computers, colors, dark }) {
  const getStatusColor = (status) => {
    return statusDot[status] || statusDot.offline;
  };
  
  const getStatusText = (status) => {
    if (status === "online") return "En ligne";
    if (status === "warning") return "Avertissement";
    return "Hors ligne";
  };
  
  return (
    <div style={{
      background: colors.card,
      borderRadius: "16px",
      border: `1px solid ${colors.border}`,
      padding: "20px"
    }}>
      <h3 style={{ color: colors.text, marginBottom: 16 }}>Ordinateurs</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              <th style={{ textAlign: "left", padding: "12px", color: colors.subtext }}>Nom</th>
              <th style={{ textAlign: "left", padding: "12px", color: colors.subtext }}>IP</th>
              <th style={{ textAlign: "left", padding: "12px", color: colors.subtext }}>Utilisateur</th>
              <th style={{ textAlign: "left", padding: "12px", color: colors.subtext }}>Statut</th>
              <th style={{ textAlign: "left", padding: "12px", color: colors.subtext }}>Dernière vue</th>
            </tr>
          </thead>
          <tbody>
            {computers.map((computer, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: "12px", color: colors.text }}>{computer.name}</td>
                <td style={{ padding: "12px", color: colors.subtext }}>{computer.ip}</td>
                <td style={{ padding: "12px", color: colors.subtext }}>{computer.user}</td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: getStatusColor(computer.status),
                    marginRight: 8
                  }}></span>
                  <span style={{ color: colors.text }}>
                    {getStatusText(computer.status)}
                  </span>
                </td>
                <td style={{ padding: "12px", color: colors.subtext }}>{computer.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}