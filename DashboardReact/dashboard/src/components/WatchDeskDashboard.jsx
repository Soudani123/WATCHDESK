import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import DashboardContent from "./DashboardContent";
import IncidentsPage from "./IncidentsPage";
import ComputersPage from "./Ordinateurs";
import ChatBot from "./ChatBot";

import RapportsPage from "./RapportsPage";
import ConfigurationPage from "./ConfigurationPage";
import AgentWindowsPage from "./AgentWindowsPage";
import AdminsList from "./AdminsList";
import VulnerabilitiesPage from "./VulnerabilitiesPage";
import AuditPage from "./AuditPage";
import RulesPage from "./RulesPage";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";
import { applyTheme, cssTheme, readStoredTheme } from "../lib/theme";

export default function WatchDeskDashboard({ user, onLogout }) {
  const [activeNav, setActiveNav] = useState("Aperçu");
  const [dark, setDark] = useState(readStoredTheme);
  const [computersCount, setComputersCount] = useState(0);
  const [incidentsCount, setIncidentsCount] = useState(0);
  const [vulnCount, setVulnCount] = useState(0);
  const [focusPcName, setFocusPcName] = useState(null);
  const [focusIncidentId, setFocusIncidentId] = useState(null);
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  const theme = cssTheme;

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  const allNavItems = [
    { label: "Aperçu", icon: "overview", badge: null, group: "PRINCIPAL" },
    { label: "Ordinateurs", icon: "computers", badge: computersCount, group: "PRINCIPAL" },
    { label: "Incidents", icon: "incidents", badge: incidentsCount, group: "PRINCIPAL" },
    { label: "Vulnérabilités", icon: "vulns", badge: vulnCount, group: "PRINCIPAL" },
    { label: "Rapports", icon: "reports", badge: null, group: "PRINCIPAL" },
    { label: "Journal d'audit", icon: "audit", badge: null, group: "PRINCIPAL", adminOnly: true },
    { label: "Administrateurs", icon: "admins", badge: null, group: "SUPER ADMIN", superAdminOnly: true },
    { label: "Règles d'alertes", icon: "rules", badge: null, group: "SUPER ADMIN", superAdminOnly: true },
    { label: "Configuration", icon: "config", badge: null, group: "SUPER ADMIN", superAdminOnly: true },
    { label: "Agent Windows", icon: "agent", badge: null, group: "SUPER ADMIN", superAdminOnly: true },
  ];

  const userRole = (user?.role || "ADMIN").toUpperCase().replace(" ", "_");
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isLecture = userRole === "LECTURE" || userRole === "READ" || userRole === "VIEWER";
  const isAdmin = isSuperAdmin || userRole === "ADMIN";
  const readOnly = isLecture;

  const navItems = allNavItems.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  const fetchAllData = async (signal) => {
    try {
      const resComp = await api("/api/computers", { signal });
      if (resComp.ok) {
        const listComp = await resComp.json();
        const alerts = listComp.filter(c => c.fleetStatus === "warning" || c.fleetStatus === "offline").length;
        setComputersCount(alerts);
      }

      const resInc = await api("/api/incidents/open", { signal });
      if (resInc.ok) {
        const listInc = await resInc.json();
        setIncidentsCount(listInc.length);
      }

      const resVuln = await api("/api/vulnerabilities", { signal });
      if (resVuln.ok) {
        const vuln = await resVuln.json();
        setVulnCount(vuln?.summary?.cveCount || 0);
      }

      const resCfg = await api("/api/configuration", { signal });
      if (resCfg.ok) {
        const cfg = await resCfg.json();
        setMaintenanceOn(!!cfg.maintenanceMode);
      }
    } catch (err) {
      if (err?.name === "AbortError") return;
      console.error("Erreur de chargement des données:", err);
    }
  };

  usePolling(fetchAllData, 10000);

  useEffect(() => {
    const handleIncidentCreated = () => fetchAllData();
    window.addEventListener("incidentCreated", handleIncidentCreated);

    const handleOpenComputer = (event) => {
      setFocusPcName(event.detail?.name || null);
      setActiveNav("Ordinateurs");
    };
    window.addEventListener("watchdeskOpenComputer", handleOpenComputer);

    const handleOpenIncident = (event) => {
      setFocusIncidentId(event.detail?.id || null);
      setActiveNav("Incidents");
    };
    window.addEventListener("watchdeskOpenIncident", handleOpenIncident);

    return () => {
      window.removeEventListener("incidentCreated", handleIncidentCreated);
      window.removeEventListener("watchdeskOpenComputer", handleOpenComputer);
      window.removeEventListener("watchdeskOpenIncident", handleOpenIncident);
    };
  }, []);

  const overview = (
    <DashboardContent
      theme={theme}
      dark={dark}
      onViewIncidents={() => setActiveNav("Incidents")}
      onViewComputers={() => setActiveNav("Ordinateurs")}
      onViewVulns={() => setActiveNav("Vulnérabilités")}
    />
  );

  const renderContent = () => {
    switch (activeNav) {
      case "Ordinateurs":
        return <ComputersPage theme={theme} focusPcName={focusPcName} readOnly={readOnly} />;
      case "Incidents":
        return <IncidentsPage theme={theme} readOnly={readOnly} focusIncidentId={focusIncidentId} />;
      case "Vulnérabilités":
        return <VulnerabilitiesPage theme={theme} dark={dark} />;
      case "Rapports":
        return (
          <RapportsPage
            theme={theme}
            onViewIncidents={() => setActiveNav("Incidents")}
            onViewComputers={() => setActiveNav("Ordinateurs")}
          />
        );
      case "Journal d'audit":
        return isAdmin ? <AuditPage theme={theme} /> : overview;
      case "Règles d'alertes":
        return isSuperAdmin ? <RulesPage theme={theme} /> : overview;
      case "Configuration":
        return isSuperAdmin ? <ConfigurationPage theme={theme} /> : overview;
      case "Agent Windows":
        return isSuperAdmin ? <AgentWindowsPage theme={theme} /> : overview;
      case "Administrateurs":
        return isSuperAdmin ? <AdminsList theme={theme} dark={dark} currentEmail={user?.email} /> : overview;
      case "Aperçu":
      case "Dashboard":
      default:
        return overview;
    }
  };

  return (
    <div className="wd-app">
      <Sidebar navItems={navItems} activeNav={activeNav} setActiveNav={setActiveNav} user={user} />
      <main className="wd-main">
        <Topbar dark={dark} setDark={setDark} onLogout={onLogout} />
        {maintenanceOn && (
          <div className="wd-banner is-warning">
            Mode maintenance actif — aucune nouvelle alerte n’est créée. Pensez à le désactiver dans Configuration.
          </div>
        )}
        <div className="wd-content">{renderContent()}</div>
      </main>
      {!readOnly && <ChatBot />}
    </div>
  );
}
