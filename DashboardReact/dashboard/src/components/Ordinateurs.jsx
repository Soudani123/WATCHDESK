import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { usePolling } from '../hooks/usePolling';

const formatRam = (pc) => {
    const used = Number(pc.ramUsedMB);
    const total = Number(pc.ramTotalMB);
    if (!total || Number.isNaN(total)) return 'N/A';
    return `${(used / 1024).toFixed(1)} / ${(total / 1024).toFixed(1)} Go`;
};

const formatLastSeen = (value) => {
    if (!value) return 'Jamais';
    const past = new Date(value);
    if (isNaN(past.getTime())) return '—';
    const diffMin = Math.floor((Date.now() - past.getTime()) / 60000);
    if (diffMin < 1) return 'En direct';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)} h`;
    return past.toLocaleDateString('fr-FR');
};

const fleetStyle = (status) => {
    if (status === 'offline') return { cls: 'is-critical', label: 'Hors ligne' };
    if (status === 'warning') return { cls: 'is-warning', label: 'Alerte' };
    return { cls: 'is-healthy', label: 'En ligne' };
};

const ComputersPage = ({ focusPcName, readOnly = false }) => {
    const [computers, setComputers] = useState([]);
    const [openIncidents, setOpenIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIps, setSelectedIps] = useState([]);
    const [selectedPc, setSelectedPc] = useState(null);
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);

    const fetchData = useCallback(async (signal) => {
        try {
            const [pcsRes, incidentsRes] = await Promise.all([
                api("/api/computers", { signal }),
                api("/api/incidents/open", { signal })
            ]);
            const pcs = await pcsRes.json();
            const incidents = incidentsRes.ok ? await incidentsRes.json() : [];
            const list = Array.isArray(pcs) ? pcs : [];
            setComputers(list);
            setOpenIncidents(Array.isArray(incidents) ? incidents : []);
            setSelectedPc(prevSelected => {
                if (focusPcName) {
                    const focused = list.find(c => c.name === focusPcName);
                    if (focused) return focused;
                }
                if (list.length > 0 && !prevSelected) return list[0];
                if (prevSelected) return list.find(c => c.ip === prevSelected.ip) || prevSelected;
                return prevSelected;
            });
        } catch (err) {
            if (err?.name !== "AbortError") console.error("Erreur API:", err);
        } finally {
            setLoading(false);
        }
    }, [focusPcName]);

    usePolling(fetchData, 10000);

    useEffect(() => {
        if (!focusPcName || computers.length === 0) return;
        const focused = computers.find(c => c.name === focusPcName);
        if (focused) setSelectedPc(focused);
    }, [focusPcName, computers]);

    const pcIncidents = (pc) => openIncidents.filter(i => i.pcName === pc?.name);

    const toggleSelectAll = (e) => {
        setSelectedIps(e.target.checked ? computers.map(pc => pc.ip) : []);
    };

    const toggleSelectPc = (ip) => {
        setSelectedIps(selectedIps.includes(ip) ? selectedIps.filter(item => item !== ip) : [...selectedIps, ip]);
    };

    const executeBulkAction = async (action, actionLabel) => {
        if (selectedIps.length === 0) return;
        setShowActionsDropdown(false);
        try {
            await Promise.all(selectedIps.map(ip =>
                api(`/api/agent/trigger-action/${ip}`, {
                    method: 'POST',
                    body: JSON.stringify({ action, message: `Ordre ${actionLabel}` })
                })
            ));
            alert(`Ordre '${actionLabel}' transmis à ${selectedIps.length} machine(s).`);
            setSelectedIps([]);
        } catch (err) {
            alert("Erreur de communication avec les agents.");
        }
    };

    const getLogContent = (pc) => {
        const parts = [
            pc.systemLogs,
            pc.appLogs,
            pc.securityLogs,
        ].filter((t) => t && String(t).trim());
        return parts.length > 0 ? parts.join("\n\n") : "Aucun log disponible.";
    };

    const alertCount = computers.filter(pc => pc.fleetStatus === 'warning' || pc.fleetStatus === 'offline').length;

    return (
        <div style={{ padding: "0 0 8px", maxWidth: "100%", overflow: "hidden" }}>
            <div className="wd-page-header">
                <div>
                    <h1 className="wd-page-title">Parc ordinateurs</h1>
                    <p className="wd-page-sub">
                        État des machines : connexion, ressources, incidents ouverts et actions à distance
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <span className={`wd-badge${alertCount > 0 ? " is-critical" : ""}`}>{alertCount} en alerte</span>
                    <span className="wd-badge">{computers.length} machines</span>
                </div>
            </div>

            <div className="wd-split">
                <div className="wd-split-main">
                    <table className="wd-table" style={{ tableLayout: "fixed" }}>
                        <thead>
                            <tr>
                                <th style={{ width: 36, textAlign: "center" }}>
                                    {!readOnly && <input type="checkbox" onChange={toggleSelectAll} checked={computers.length > 0 && selectedIps.length === computers.length} />}
                                </th>
                                <th style={{ width: "18%" }}>Nom du PC</th>
                                <th style={{ width: "14%" }}>IP</th>
                                <th style={{ width: "12%" }}>Statut</th>
                                <th style={{ width: "16%" }}>CPU / RAM</th>
                                <th style={{ width: "14%" }}>Dernière vue</th>
                                <th>Incidents ouverts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {computers.map((pc) => {
                                const isSelected = selectedIps.includes(pc.ip);
                                const isActive = selectedPc?.id === pc.id || selectedPc?.ip === pc.ip;
                                const status = fleetStyle(pc.fleetStatus);
                                const openCount = pc.openIncidentCount || 0;

                                return (
                                    <tr
                                        key={pc.id || pc.ip}
                                        className={isActive ? "is-active" : ""}
                                        onClick={() => { setSelectedPc(pc); setActiveLogTab("system"); }}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                                            {!readOnly && <input type="checkbox" checked={isSelected} onChange={() => toggleSelectPc(pc.ip)} />}
                                        </td>
                                        <td style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {pc.name || "PC inconnu"}
                                        </td>
                                        <td className="wd-mono" style={{ color: "var(--text-secondary)" }}>{pc.ip || "N/A"}</td>
                                        <td>
                                            <span className={`wd-badge ${status.cls}`}>{status.label}</span>
                                        </td>
                                        <td className="wd-mono" style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {pc.cpuUsage || "N/A"} · {formatRam(pc)}
                                        </td>
                                        <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{formatLastSeen(pc.lastSeen)}</td>
                                        <td>
                                            <span className={`wd-badge${openCount > 0 ? " is-critical" : " is-healthy"}`}>{openCount}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {loading && <div className="wd-empty">Chargement des données...</div>}
                    {!loading && computers.length === 0 && (
                        <div className="wd-empty">
                            Aucun ordinateur enregistré. Démarrez l'agent Windows pour voir cette machine.
                        </div>
                    )}
                </div>

                {selectedPc && (
                    <div className="wd-detail">
                        <div>
                            <span className={`wd-badge ${fleetStyle(selectedPc.fleetStatus).cls}`}>
                                {fleetStyle(selectedPc.fleetStatus).label}
                            </span>
                            <h3 style={{ margin: "8px 0 2px", fontSize: 16, fontWeight: 600 }}>{selectedPc.name || "Machine"}</h3>
                        </div>

                        <div className="wd-detail-meta">
                            <div style={{ display: "flex", justifyContent: "space-between" }}><strong>IP</strong><span>{selectedPc.ip}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Utilisateur</strong><span>{selectedPc.username || "Inconnu"}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><strong>CPU</strong><span>{selectedPc.cpuUsage || "N/A"}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><strong>RAM</strong><span>{formatRam(selectedPc)}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Vu</strong><span>{formatLastSeen(selectedPc.lastSeen)}</span></div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <strong>Vulnérabilités</strong>
                                <span style={{ color: (selectedPc.vulnCount || 0) > 0 ? "var(--status-critical)" : "var(--status-healthy)" }}>
                                    {selectedPc.vulnCount || 0} CVE · {selectedPc.patchCount || 0} patchs
                                </span>
                            </div>
                        </div>

                        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                            <strong className="wd-label" style={{ marginBottom: 8 }}>Incidents ouverts</strong>
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                                {pcIncidents(selectedPc).length === 0 && (
                                    <span style={{ fontSize: 12, color: "var(--status-healthy)" }}>Aucun incident ouvert</span>
                                )}
                                {pcIncidents(selectedPc).slice(0, 5).map((inc) => (
                                    <div key={inc.id} className="wd-card" style={{ padding: 8, fontSize: 11 }}>
                                        {inc.description}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                className="wd-btn wd-btn-primary"
                                onClick={() => window.dispatchEvent(new CustomEvent("watchdeskAskAi", {
                                    detail: { message: `Analyse l'état du PC ${selectedPc.name} (${selectedPc.ip}). CPU ${selectedPc.cpuUsage}, RAM ${formatRam(selectedPc)}, ${pcIncidents(selectedPc).length} incident(s) ouvert(s). Que faut-il faire ?` }
                                }))}
                                style={{ marginTop: 10, width: "100%" }}
                            >
                                Expliquer avec l'IA
                            </button>
                        </div>

                        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                            <div className="wd-log">
                                {getLogContent(selectedPc)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="wd-footer-bar">
                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    {readOnly
                      ? "Mode lecture — consultation du parc uniquement"
                      : <><strong style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{selectedIps.length}</strong> ordinateur(s) sélectionné(s)</>}
                </div>
                {!readOnly && (
                <div style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                        disabled={selectedIps.length === 0}
                        className={selectedIps.length > 0 ? "wd-btn wd-btn-primary" : "wd-btn"}
                    >
                        ACTIONS ∨
                    </button>
                    {showActionsDropdown && (
                        <div className="wd-menu">
                            <button type="button" onClick={() => executeBulkAction("UPDATE_WITH_REBOOT", "Mise à jour avec redémarrage")}>Mise à jour avec redémarrage</button>
                            <button type="button" onClick={() => executeBulkAction("UPDATE_WITHOUT_REBOOT", "Mise à jour sans redémarrage")}>Mise à jour sans redémarrage</button>
                            <button type="button" className="is-warning" onClick={() => executeBulkAction("RESTART", "Redémarrage PC")}>Redémarrer</button>
                            <button type="button" className="is-critical" onClick={() => executeBulkAction("SHUTDOWN", "Arrêt du PC")}>Éteindre</button>
                        </div>
                    )}
                </div>
                )}
            </div>
        </div>
    );
};

export default ComputersPage;
