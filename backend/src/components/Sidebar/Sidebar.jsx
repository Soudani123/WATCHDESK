import NavItem from "./NavItem";
import UserInfo from "./UserInfo";

export default function Sidebar({ nav, activeNav, setActiveNav, colors }) {
  return (
    <aside style={{ width: 260, background: colors.sidebar, borderRight: `1px solid ${colors.border}` }}>
      <div style={{ padding: "20px" }}>
        <h2 style={{ color: colors.text }}>WatchDesk</h2>
        <small style={{ color: colors.subtext }}>Console Admin</small>
      </div>
      {["PRINCIPAL", "SUPER ADMIN"].map(group => (
        <div key={group}>
          {nav.filter(n => n.group === group).map(n => (
            <NavItem key={n.label} item={n} activeNav={activeNav} setActiveNav={setActiveNav} colors={colors} />
          ))}
        </div>
      ))}
      <UserInfo colors={colors} />
    </aside>
  );
}
