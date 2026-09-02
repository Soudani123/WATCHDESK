import { useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import Topbar from "../components/Topbar";
import Banner from "../components/Banner";
import KpiCard from "../components/KpiCard";
import HealthStatusCard from "../components/HealthStatusCard";
import IncidentsList from '../components/IncidentsList';
import AdminsList from '../components/AdminsList';
import ComputerList from "../components/ComputerList";
import { mockIncidents } from "../data/mockIncidents";
import { mockComputers } from "../data/mockComputers";
import { mockAdmins } from "../data/mockAdmins";

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [dark, setDark] = useState(false);

  const colors = {
    bg: dark ? "#0F172A" : "#F8FAFC",
    sidebar: dark ? "#1E293B" : "#FFFFFF",
    card: dark ? "#1E293B" : "#FFFFFF",
    text: dark ? "#F1F5F9" : "#1E293B",
    subtext: dark ? "#94A3B8" : "#64748B",
    border: dark ? "#334155" : "#E2E8F0",
  };

  const nav = [
    { label: "Dashboard", icon: "📊", badge: null, group: "PRINCIPAL" },
    { label: "Ordinateurs", icon: "💻", badge: 142, group: "PRINCIPAL" },
    { label: "Incidents", icon: "⚠️", badge: 7, group: "PRINCIPAL" },
    { label: "Rapports", icon: "📋", badge: null, group: "PRINCIPAL" },
    { label: "Administrateurs", icon: "👥", badge: null, group: "SUPER ADMIN" },
    { label: "Configuration", icon: "⚙️", badge: null, group: "SUPER ADMIN" },
    { label: "Agent Windows", icon: "🖥️", badge: null, group: "SUPER ADMIN" },
  ];

  const kpis = [
    { icon: "💻", label: "Total ordinateurs", value: "248", sub: "+12 ce mois", subColor: "#16A34A", iconBg: "#EFF6FF", iconColor: "#2563EB" },
    { icon: "✅", label: "En ligne", value: "203", sub: "+81.8%", subColor: "#16A34A", iconBg: "#F0FDF4", iconColor: "#16A34A" },
    { icon: "❌", label: "Hors ligne", value: "45", sub: "dont 8 prolongés", subColor: "#64748B", iconBg: "#F8FAFC", iconColor: "#94A3B8" },
    { icon: "⚠️", label: "Incidents actifs", value: "7", sub: "+3 critiques", subColor: "#DC2626", iconBg: "#FEF2F2", iconColor: "#EF4444" },
  ];

  const health = [
    { count: 186, label: "Postes sains", sub: "Aucune alerte", color: "#16A34A", bg: dark ? "#14532D22" : "#F0FDF4", border2: "#BBF7D0", dot: "#22C55E" },
    { count: 35, label: "Avertissements", sub: "Surveillance requise", color: "#D97706", bg: dark ? "#78350F22" : "#FFFBEB", border2: "#FDE68A", dot: "#F59E0B" },
    { count: 12, label: "Postes en erreur", sub: "Intervention urgente", color: "#DC2626", bg: dark ? "#7F1D1D22" : "#FEF2F2", border2: "#FECACA", dot: "#EF4444" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: colors.bg }}>
      <Sidebar nav={nav} activeNav={activeNav} setActiveNav={setActiveNav} colors={colors} />
      <main style={{ flex: 1, paddingBottom: 40, paddingRight: 24, paddingLeft: 24 }}>
        <Topbar dark={dark} setDark={setDark} colors={colors} />
        <Banner dark={dark} colors={colors} />

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 24 }}>
          {kpis.map((k, i) => <KpiCard key={i} k={k} colors={colors} />)}
        </div>

        {/* Health Status */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
          {health.map((s, i) => <HealthStatusCard key={i} s={s} colors={colors} />)}
        </div>

        {/* Bottom section - CORRIGÉ : plus d'espace vide */}
        <div style={{ 
  display: "flex", 
  gap: 24, 
  marginBottom: 24,
  alignItems: "stretch"
}}>
  <div style={{ flex: 1, display: "flex" }}>
    <IncidentsList incidents={mockIncidents} dark={dark} colors={colors} />
  </div>
  <div style={{ flex: 1, display: "flex" }}>
    <AdminsList admins={mockAdmins} dark={dark} colors={colors} />
  </div>
</div>

        {/* Computers */}
        <ComputerList computers={mockComputers} colors={colors} dark={dark} />
      </main>
    </div>
  );
}