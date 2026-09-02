import React from 'react';

const severityColors = {
    'Élevée': { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.2)' },
    'ÉLEVÉE': { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626', border: 'rgba(239, 68, 68, 0.2)' },
    'Moyenne': { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706', border: 'rgba(245, 158, 11, 0.2)' },
    'MOYENNE': { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706', border: 'rgba(245, 158, 11, 0.2)' },
    'Faible': { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: 'rgba(16, 185, 129, 0.2)' },
    'FAIBLE': { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', border: 'rgba(16, 185, 129, 0.2)' },
};

const statusColors = {
    'Nouveau': { bg: 'rgba(37, 99, 235, 0.1)', text: '#2563EB' },
    'OUVERT': { bg: 'rgba(239, 68, 68, 0.1)', text: '#DC2626' },
    'En cours': { bg: 'rgba(245, 158, 11, 0.1)', text: '#D97706' },
    'Résolu': { bg: 'rgba(34, 197, 94, 0.1)', text: '#16A34A' },
};

export default function IncidentsList({ theme, dark, incidents, onViewAll }) {
    const displayIncidents = incidents?.length > 0 ? incidents : [];

    const isIaTicket = (inc) => {
        const desc = inc.description || inc.desc || "";
        return desc.toLowerCase().includes("ticket ia");
    };

    const cleanDescription = (desc) => {
        if (!desc) return "";
        return desc.replace(/^Ticket IA\s*:\s*/i, "");
    };

    return (
        <div style={{ 
            background: theme?.card || '#ffffff', 
            border: `1px solid ${theme?.border || '#E2E8F0'}`, 
            borderRadius: 16, 
            padding: 20,
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: theme?.text || '#0F172A' }}>Incidents récents</h3>
                <button 
                    onClick={onViewAll}
                    style={{ background: "none", border: "none", color: "#2563EB", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                >
                    Voir tout
                </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displayIncidents.length === 0 && (
                    <div style={{ color: theme?.subtext || '#64748B', fontSize: 13, padding: 20, textAlign: "center" }}>
                        Aucun incident actif
                    </div>
                )}
                {displayIncidents.slice(0, 5).map((inc, index) => {
                    const sevKey = inc.severity || inc.severite || 'Élevée';
                    const statKey = inc.status || inc.statut || 'OUVERT';
                    const isIa = isIaTicket(inc);

                    const sevStyle = severityColors[sevKey] || severityColors['Élevée'];
                    const statStyle = statusColors[statKey] || statusColors['OUVERT'];

                    return (
                        <div 
                            key={inc.id || index} 
                            style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 10, 
                                padding: "10px 12px", 
                                borderRadius: 10, 
                                background: dark ? "#0F172A" : "#F8FAFC",
                                border: `1px solid ${theme?.border || '#F1F5F9'}`
                            }}
                        >
                            <span style={{ 
                                fontSize: 10, 
                                fontWeight: 700, 
                                padding: "3px 8px", 
                                borderRadius: 6, 
                                background: sevStyle.bg, 
                                color: sevStyle.text, 
                                border: `1px solid ${sevStyle.border}`, 
                                whiteSpace: "nowrap" 
                            }}>
                                {sevKey.toUpperCase()}
                            </span>

                            <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, color: theme?.text, fontWeight: 600, flexShrink: 0 }}>
                                    {inc.pcName || inc.pc || inc.machine}
                                </span>

                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: 6,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    background: isIa ? 'rgba(99, 102, 241, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                                    color: isIa ? '#4F46E5' : '#475569',
                                    border: `1px solid ${isIa ? 'rgba(99, 102, 241, 0.25)' : 'rgba(100, 116, 139, 0.25)'}`
                                }}>
                                    {isIa ? '🤖 Agent IA' : '⚡ Système'}
                                </span>

                                <span style={{ fontSize: 13, color: theme?.subtext || '#64748B', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    — {cleanDescription(inc.description || inc.desc)}
                                </span>
                            </div>

                            <span style={{ fontSize: 11, color: theme?.subtext || '#64748B', whiteSpace: "nowrap" }}>
                                {inc.time || inc.createdAt ? new Date(inc.createdAt || inc.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>

                            <span style={{ 
                                fontSize: 11, 
                                fontWeight: 700, 
                                padding: "3px 10px", 
                                borderRadius: 12, 
                                background: statStyle.bg, 
                                color: statStyle.text, 
                                whiteSpace: "nowrap" 
                            }}>
                                {statKey.toUpperCase()}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}