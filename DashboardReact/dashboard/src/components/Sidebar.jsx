import React from "react";
import {
  LayoutGrid,
  Monitor,
  TriangleAlert,
  ShieldAlert,
  FileText,
  ScrollText,
  Users,
  Zap,
  Settings,
  Upload,
} from "lucide-react";
import logoSvg from "./transparent-logo.svg";

const ICONS = {
  overview: LayoutGrid,
  computers: Monitor,
  incidents: TriangleAlert,
  vulns: ShieldAlert,
  reports: FileText,
  audit: ScrollText,
  admins: Users,
  rules: Zap,
  config: Settings,
  agent: Upload,
};

const initialsOf = (user) =>
  (user?.fullName || user?.email || "SA")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const roleLabel = (user) => {
  const role = (user?.role || "").toUpperCase().replace(" ", "_");
  if (role === "SUPER_ADMIN") return "Super Administrateur";
  if (role === "LECTURE") return "Lecture seule";
  return "Administrateur";
};

export default function Sidebar({ navItems, activeNav, setActiveNav, user }) {
  return (
    <aside className="wd-sidebar">
      <div className="wd-sidebar-brand">
        <div className="wd-sidebar-logo">
          <img src={logoSvg} alt="WatchDesk Logo" />
        </div>
        <span className="wd-sidebar-kicker">Console Admin</span>
      </div>

      <nav className="wd-sidebar-nav">
        {["PRINCIPAL", "SUPER ADMIN"].map((group) => {
          const items = navItems.filter((n) => n.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="wd-nav-group">
              <div className="wd-nav-label">{group}</div>
              {items.map((n) => {
                const Icon = ICONS[n.icon];
                const critical = n.label === "Incidents" || n.label === "Vulnérabilités";
                return (
                  <button
                    key={n.label}
                    type="button"
                    onClick={() => setActiveNav(n.label)}
                    className={`wd-nav-item${activeNav === n.label ? " is-active" : ""}`}
                  >
                    {Icon ? <Icon size={16} strokeWidth={1.75} /> : null}
                    <span>{n.label}</span>
                    {n.badge ? (
                      <span className={`wd-nav-badge${critical ? " is-critical" : ""}`}>
                        {n.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="wd-sidebar-user">
        <div className="wd-avatar">{initialsOf(user)}</div>
        <div>
          <div className="wd-sidebar-user-name">{user?.fullName || "WatchDesk"}</div>
          <div className="wd-sidebar-user-role">{roleLabel(user)}</div>
        </div>
      </div>
    </aside>
  );
}
