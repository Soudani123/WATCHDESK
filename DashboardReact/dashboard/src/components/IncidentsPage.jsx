import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePolling } from '../hooks/usePolling';

const severityColors = {
    'Élevée': { bg: 'var(--status-critical-bg)', text: 'var(--status-critical)', border: 'var(--border)' },
    'ÉLEVÉE': { bg: 'var(--status-critical-bg)', text: 'var(--status-critical)', border: 'var(--border)' },
    'Moyenne': { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)', border: 'var(--border)' },
    'MOYENNE': { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)', border: 'var(--border)' },
    'Faible': { bg: 'var(--status-healthy-bg)', text: 'var(--status-healthy)', border: 'var(--border)' },
    'FAIBLE': { bg: 'var(--status-healthy-bg)', text: 'var(--status-healthy)', border: 'var(--border)' },
};

const statusColors = {
    'Nouveau': { bg: 'var(--accent-muted)', text: 'var(--accent)' },
    'OUVERT': { bg: 'var(--status-critical-bg)', text: 'var(--status-critical)' },
    'En cours': { bg: 'var(--status-warning-bg)', text: 'var(--status-warning)' },
    'Résolu': { bg: 'var(--status-healthy-bg)', text: 'var(--status-healthy)' },
    'RÉSOLU': { bg: 'var(--status-healthy-bg)', text: 'var(--status-healthy)' },
};

const sourceMeta = {
    MATERIEL: { label: 'Matériel', bg: 'var(--bg-canvas)', color: 'var(--text-secondary)', border: 'var(--border)' },
    SYSTEME: { label: 'Système', bg: 'var(--accent-muted)', color: 'var(--accent)', border: 'var(--border)' },
    APPLICATION: { label: 'Application', bg: 'var(--status-healthy-bg)', color: 'var(--status-healthy)', border: 'var(--border)' },
    SECURITE: { label: 'Sécurité', bg: 'var(--status-critical-bg)', color: 'var(--status-critical)', border: 'var(--border)' },
    IA: { label: 'Agent IA', bg: 'var(--accent-muted)', color: 'var(--accent)', border: 'var(--border)' },
};

const isOpenStatus = (status) => {
    const s = (status || 'OUVERT').toUpperCase();
    return s === 'OUVERT' || s === 'NOUVEAU' || s === 'EN COURS';
};

const getSourceKey = (inc) => {
    const desc = (inc.description || inc.desc || '').toLowerCase();
    if (desc.includes('surcharge ram') || desc.includes('ram critique') || desc.includes('cpu critique')) return 'MATERIEL';
    const raw = (inc.source || '').toUpperCase();
    if (sourceMeta[raw]) return raw;
    if (desc.includes('ticket ia')) return 'IA';
    return 'MATERIEL';
};

export default function IncidentsPage({ theme, readOnly = false, focusIncidentId }) {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("OPEN");

    usePolling(async (signal) => {
        try {
            const res = await api("/api/incidents", { signal });
            const data = await res.json();
            setIncidents(Array.isArray(data) ? data : []);
        } catch (err) {
            if (err?.name !== "AbortError") console.error("Erreur API Incidents:", err);
        } finally {
            setLoading(false);
        }
    }, 10000);

    useEffect(() => {
        if (focusIncidentId == null) return;
        setFilter("ALL");
        const t = setTimeout(() => {
            document.getElementById(`incident-row-${focusIncidentId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 250);
        return () => clearTimeout(t);
    }, [focusIncidentId, incidents]);

    const updateStatus = async (id, status) => {
        try {
            await api(`/api/incidents/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
            setIncidents(prev => prev.map(i => i.id === id ? { ...i, status } : i));
        } catch (err) {
            console.error(err);
        }
    };

    const isLogIncident = (inc) => ['SYSTEME', 'APPLICATION', 'SECURITE'].includes(getSourceKey(inc));

    const cleanDescription = (desc) => {
        if (!desc) return "";
        return desc.replace(/^Ticket IA\s*:\s*/i, "");
    };

    const filteredIncidents = incidents.filter(inc => {
        const source = getSourceKey(inc);
        const open = isOpenStatus(inc.status || inc.statut);
        if (filter === "OPEN") return open;
        if (filter === "HISTORY") return !open;
        if (filter === "IA") return source === "IA" && open;
        if (filter === "MATERIEL") return source === "MATERIEL" && open;
        if (filter === "LOGS") return isLogIncident(inc) && open;
        return true;
    });

    const openCount = incidents.filter(i => isOpenStatus(i.status || i.statut)).length;
    const materielCount = incidents.filter(i => getSourceKey(i) === "MATERIEL" && isOpenStatus(i.status)).length;
    const logsCount = incidents.filter(i => isLogIncident(i) && isOpenStatus(i.status)).length;
    const iaCount = incidents.filter(i => getSourceKey(i) === "IA" && isOpenStatus(i.status)).length;

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? dateStr : date.toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div style={{ padding: "0", maxWidth: "100%", overflow: "hidden" }}>
            <div className="wd-page-header">
                <div>
                    <h1 className="wd-page-title">
                        Liste des Incidents
                    </h1>
                    <p className="wd-page-sub">
                        Alertes à traiter — un problème unique par machine
                    </p>
                </div>
            <span className="wd-badge">{openCount} ouverts / {incidents.length} au total</span>
            </div>

            <div style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                borderBottom: `1px solid ${theme?.border || 'var(--border)'}`,
                marginBottom: '20px'
            }}>
                {[
                    { key: "OPEN", label: "Ouverts", count: openCount },
                    { key: "MATERIEL", label: "Matériel", count: materielCount },
                    { key: "LOGS", label: "Logs Windows", count: logsCount },
                    { key: "IA", label: "Tickets IA", count: iaCount },
                    { key: "HISTORY", label: "Historique", count: incidents.length - openCount }
                ].map(tab => {
                    const active = filter === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '10px 4px 14px',
                                fontSize: '14px',
                                fontWeight: active ? '700' : '500',
                                color: active ? 'var(--accent)' : theme?.subtext || 'var(--text-secondary)',
                                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {tab.label}
                            <span style={{
                                fontSize: '11px',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                background: active ? 'var(--accent-muted)' : (theme?.bg || 'var(--bg-muted)'),
                                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                fontWeight: '600'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="wd-card" style={{ padding: 0, overflow: "auto", maxWidth: "100%" }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{
                            background: theme?.bg || 'var(--bg-muted)',
                            borderBottom: `1px solid ${theme?.border || 'var(--border)'}`,
                            fontSize: '11px',
                            fontWeight: '700',
                            color: theme?.subtext || 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            <th style={{ padding: '14px 16px', width: '140px' }}>Date</th>
                            <th style={{ padding: '14px 16px', width: '150px' }}>Machine</th>
                            <th style={{ padding: '14px 16px', width: '120px' }}>Source</th>
                            <th style={{ padding: '14px 16px', width: '100px' }}>Sévérité</th>
                            <th style={{ padding: '14px 16px' }}>Description</th>
                            <th style={{ padding: '14px 16px', width: '160px', textAlign: 'right' }}>Statut</th>
                        </tr>
                    </thead>
                    <tbody style={{ fontSize: '13px' }}>
                        {filteredIncidents.map((inc, index) => {
                            const sevKey = inc.severity || inc.severite || 'Élevée';
                            const statKey = inc.status || inc.statut || 'OUVERT';
                            const sourceKey = getSourceKey(inc);
                            const sourceStyle = sourceMeta[sourceKey] || sourceMeta.MATERIEL;

                            const sevStyle = severityColors[sevKey] || severityColors['Élevée'];
                            const statStyle = statusColors[statKey] || statusColors['OUVERT'];

                            return (
                                <tr
                                    key={inc.id || index}
                                    id={inc.id ? `incident-row-${inc.id}` : undefined}
                                    style={{
                                        borderBottom: index !== filteredIncidents.length - 1 ? `1px solid ${theme?.border || 'var(--bg-muted)'}` : 'none',
                                        background: String(inc.id) === String(focusIncidentId) ? (theme?.bg || 'var(--accent-muted)') : 'transparent'
                                    }}
                                >
                                    <td style={{ padding: '14px 16px', color: theme?.subtext || 'var(--text-secondary)', whiteSpace: 'nowrap', fontSize: '12px', verticalAlign: 'top' }}>
                                        {formatDate(inc.createdAt || inc.date)}
                                    </td>

                                    <td
                                        style={{ padding: '14px 16px', fontWeight: '600', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'top', cursor: 'pointer' }}
                                        onClick={() => window.dispatchEvent(new CustomEvent('watchdeskOpenComputer', { detail: { name: inc.pcName || inc.pc } }))}
                                        title="Voir la machine"
                                    >
                                        {inc.pcName || inc.pc || inc.machine || "Non défini"}
                                    </td>

                                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                                        <span style={{
                                            display: 'inline-block',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            background: sourceStyle.bg,
                                            color: sourceStyle.color,
                                            border: `1px solid ${sourceStyle.border}`
                                        }}>
                                            {sourceStyle.label}
                                        </span>
                                    </td>

                                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                                        <span style={{
                                            background: sevStyle.bg,
                                            color: sevStyle.text,
                                            border: `1px solid ${sevStyle.border}`,
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: '700'
                                        }}>
                                            {sevKey.toUpperCase()}
                                        </span>
                                    </td>

                                    <td style={{ padding: '14px 16px', color: theme?.text || 'var(--text-secondary)', verticalAlign: 'top', overflow: 'hidden' }}>
                                        <span style={{ lineHeight: '1.5', fontSize: '13px' }}>
                                            {cleanDescription(inc.description || inc.desc)}
                                        </span>
                                    </td>

                                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right', verticalAlign: 'top' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                background: statStyle.bg,
                                                color: statStyle.text,
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: '700'
                                            }}>
                                                {statKey.toUpperCase()}
                                            </span>
                                            {isOpenStatus(statKey) && !readOnly && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button
                                                        onClick={() => updateStatus(inc.id, 'En cours')}
                                                        style={{ fontSize: '10px', border: '1px solid var(--border)', background: 'var(--status-warning-bg)', color: 'var(--status-warning)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                                                    >
                                                        En cours
                                                    </button>
                                                    <button
                                                        onClick={() => updateStatus(inc.id, 'RÉSOLU')}
                                                        style={{ fontSize: '10px', border: '1px solid var(--border)', background: 'var(--status-healthy-bg)', color: 'var(--status-healthy)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                                                    >
                                                        Résoudre
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {loading && <div style={{ padding: '30px', textAlign: 'center', color: theme?.subtext, fontSize: '13px' }}>Chargement...</div>}
                {!loading && filteredIncidents.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: theme?.subtext, fontSize: '13px' }}>Aucun incident dans cette catégorie</div>}
            </div>
        </div>
    );
}
