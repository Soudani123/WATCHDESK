import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api } from '../lib/api';

// Icônes SVG pour les boutons
const PdfIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
    </svg>
);

const ExcelIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="M8 13l3 3 3-3" />
        <path d="M12 10v6" />
    </svg>
);

const RapportsPage = ({ theme, onViewIncidents, onViewComputers }) => {
    const [exporting, setExporting] = useState(false);
    const [computers, setComputers] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const resComp = await api("/api/computers");
            if (resComp.ok) {
                const listComp = await resComp.json();
                setComputers(listComp);
            }

            const resInc = await api("/api/incidents");
            if (resInc.ok) {
                const listInc = await resInc.json();
                setIncidents(listInc);
            }
        } catch (err) {
            console.error("Erreur lors de la récupération des rapports:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ============================================
    // 📊 CALCUL DES MÉTRIQUES DYNAMIQUES
    // ============================================
    const isOpenIncident = (i) => {
        const st = (i.status || i.statut || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return st === 'NOUVEAU' || st === 'EN COURS' || st === 'OUVERT' || st === 'OPEN';
    };
    const isHighSeverity = (i) => {
        const sev = (i.severity || i.severite || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return sev.includes('ELEV') || sev.includes('CRIT') || sev === 'HIGH';
    };
    const isResolved = (i) => {
        const st = (i.status || i.statut || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return st === 'RESOLU' || st === 'RESOLVED';
    };
    const fleetOf = (c) => {
        if (c.fleetStatus) return c.fleetStatus;
        if (!c.lastSeen) return 'offline';
        const mins = (Date.now() - new Date(c.lastSeen).getTime()) / 60000;
        if (Number.isNaN(mins) || mins >= 3) return 'offline';
        if ((c.openIncidentCount || 0) > 0) return 'warning';
        return 'online';
    };

    const totalMachines = computers.length;
    const machinesOnline = computers.filter(c => fleetOf(c) === 'online').length;
    const machinesWarning = computers.filter(c => fleetOf(c) === 'warning').length;
    const machinesOffline = computers.filter(c => fleetOf(c) === 'offline').length;
    const availabilityRate = totalMachines > 0
        ? ((machinesOnline / totalMachines) * 100).toFixed(1)
        : "100";

    const activeIncidents = incidents.filter(isOpenIncident);
    const criticalIncidentsCount = activeIncidents.filter(isHighSeverity).length;
    const resolvedIncidentsCount = incidents.filter(isResolved).length;

    const getMostUnstableMachine = () => {
        if (activeIncidents.length === 0) return { name: "Aucune", count: 0 };
        const counts = {};
        activeIncidents.forEach(i => {
            const pcName = i.pcName || i.pc_name || i.machine || i.pc;
            if (pcName) counts[pcName] = (counts[pcName] || 0) + 1;
        });
        let mostInstable = "Aucune";
        let maxCount = 0;
        for (const pc in counts) {
            if (counts[pc] > maxCount) {
                maxCount = counts[pc];
                mostInstable = pc;
            }
        }
        return { name: mostInstable, count: maxCount };
    };

    const unstableMachine = getMostUnstableMachine();
    const healthOk = criticalIncidentsCount === 0 && machinesOffline === 0;

    // ============================================
    // 📄 EXP. PDF
    // ============================================
    const exportToPDF = () => {
        setExporting(true);
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        
        doc.setFillColor(30, 41, 59); 
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('WATCHDESK - RAPPORT D\'AUDIT', 15, 18);
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 15, 28);

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(13);
        doc.setFont('Helvetica', 'bold');
        doc.text('1. Indicateurs Globaux de Performance', 15, 52);

        const summaryData = [
            ['Taux de Disponibilité Globale (SLA)', `${availabilityRate}%`, `${machinesOnline} en ligne / ${totalMachines} machines`],
            ['Incidents Actifs non résolus', `${activeIncidents.length}`, `dont ${criticalIncidentsCount} critiques`],
            ['Incidents Clôturés', `${resolvedIncidentsCount}`, 'Statut Résolu en Base'],
            ['Machine la plus instable', unstableMachine.count > 0 ? `${unstableMachine.name} (${unstableMachine.count} alertes)` : 'Aucune', 'Cumul d\'alertes reçues']
        ];

        autoTable(doc, {
            startY: 57,
            head: [['Métrique d\'Audit', 'Valeur Actuelle', 'Détails / Contexte']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }, 
            margin: { left: 15, right: 15 }
        });

        const currentY = doc.lastAutoTable.finalY + 12;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('2. État Détaillé du Parc Informatique', 15, currentY);

        const computerRows = computers.map(c => [
            c.name || 'N/A', 
            c.ip || 'N/A', 
            c.username || 'Aucun', 
            c.fleetStatus || c.status || 'UNKNOWN',
            c.cpuUsage || c.cpu_usage || '0%'
        ]);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Nom du PC', 'Adresse IP', 'Utilisateur', 'Statut', 'Usage CPU']],
            body: computerRows,
            theme: 'grid',
            headStyles: { fillColor: [71, 85, 105] }, 
            margin: { left: 15, right: 15 }
        });

        doc.save(`WatchDesk_Rapport_${new Date().toISOString().slice(0,10)}.pdf`);
        setExporting(false);
    };

    // ============================================
    // 📊 EXP. EXCEL
    // ============================================
    const exportToExcel = () => {
        setExporting(true);

        const compData = computers.map(c => ({
            'Nom de la Machine': c.name,
            'Adresse IP': c.ip,
            'Utilisateur Assigné': c.username,
            'Statut parc': c.fleetStatus || c.status,
            'Charge CPU': c.cpuUsage || c.cpu_usage || '0%',
            'RAM Utilisée (Mo)': c.ramUsedMB || c.ram_used_mb || 0,
            'RAM Totale (Mo)': c.ramTotalMB || c.ram_total_mb || 0,
            'Vu': c.lastSeen || ''
        }));
        const wsComputers = XLSX.utils.json_to_sheet(compData);

        const incData = incidents.map(i => ({
            'ID Incident': i.id,
            'Machine impactée': i.pcName || i.pc_name || i.machine || i.pc,
            'Gravité': i.severity || i.severite,
            'Description de la Panne': i.description || i.desc,
            'État de Résolution': i.status || i.statut
        }));
        const wsIncidents = XLSX.utils.json_to_sheet(incData);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsComputers, "Parc Ordinateurs");
        XLSX.utils.book_append_sheet(wb, wsIncidents, "Journal des Incidents");

        XLSX.writeFile(wb, `WatchDesk_Export_Data_${new Date().toISOString().slice(0,10)}.xlsx`);
        setExporting(false);
    };

    if (loading) {
        return (
            <div style={{ padding: "100px 32px", textAlign: "center", color: theme?.subtext || 'var(--text-secondary)' }}>
                Chargement et consolidation des données du parc...
            </div>
        );
    }

    return (
        <div>
            <div className="wd-page-header">
                <div>
                    <h1 className="wd-page-title">Rapports & Audit</h1>
                    <p className="wd-page-sub">
                        Synthèse analytique et exportation des indicateurs de performance
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button 
                        onClick={exportToPDF}
                        disabled={exporting}
                        className="wd-btn"
                    >
                        <PdfIcon /> {exporting ? 'Génération...' : 'Télécharger PDF'}
                    </button>
                    <button 
                        onClick={exportToExcel}
                        disabled={exporting}
                        className="wd-btn wd-btn-primary"
                    >
                        <ExcelIcon /> {exporting ? 'Génération...' : 'Exporter Excel/CSV'}
                    </button>
                </div>
            </div>

            {/* Cartes KPI */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
                    <div
                        onClick={onViewComputers}
                        style={{ 
                    background: theme?.card || '#ffffff', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: `1px solid ${theme?.border || 'var(--border)'}`,
                    cursor: onViewComputers ? 'pointer' : 'default'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: theme?.subtext || 'var(--text-secondary)' }}>
                        SLA & Disponibilité Globale
                    </h3>
                    <div style={{ fontSize: '32px', fontWeight: '600', color: Number(availabilityRate) >= 80 ? 'var(--status-healthy)' : 'var(--status-warning)', letterSpacing: '-0.02em' }}>
                        {availabilityRate}%
                    </div>
                    <p style={{ fontSize: '13px', color: theme?.subtext || 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                        {machinesOnline} en ligne · {machinesWarning} alerte · {machinesOffline} hors ligne
                    </p>
                </div>

                <div
                    onClick={onViewIncidents}
                    style={{ 
                    background: theme?.card || '#ffffff', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: `1px solid ${theme?.border || 'var(--border)'}`,
                    cursor: onViewIncidents ? 'pointer' : 'default'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: theme?.subtext || 'var(--text-secondary)' }}>
                        Volume d'Incidents Actifs
                    </h3>
                    <div className="wd-metric" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                        {activeIncidents.length}
                    </div>
                    <p style={{ fontSize: '13px', color: theme?.subtext || 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                        dont <span style={{ color: 'var(--status-critical)', fontWeight: '700' }}>{criticalIncidentsCount} critiques ouverts</span>
                    </p>
                </div>

                <div
                    onClick={() => {
                        if (unstableMachine.name && unstableMachine.name !== 'Aucune') {
                            window.dispatchEvent(new CustomEvent('watchdeskOpenComputer', { detail: { name: unstableMachine.name } }));
                        } else if (onViewComputers) onViewComputers();
                    }}
                    style={{ 
                    background: theme?.card || '#ffffff', 
                    padding: '20px', 
                    borderRadius: '16px', 
                    border: `1px solid ${theme?.border || 'var(--border)'}`,
                    cursor: 'pointer'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: theme?.subtext || 'var(--text-secondary)' }}>
                        Machine la plus instable
                    </h3>
                    <div style={{ 
                        fontSize: '20px', 
                        fontWeight: '600', 
                        color: 'var(--status-critical)', 
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {unstableMachine.name}
                    </div>
                    <p style={{ fontSize: '13px', color: theme?.subtext || 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                        {unstableMachine.count > 0 ? `${unstableMachine.count} incident(s) ouvert(s)` : "Aucun incident ouvert"}
                    </p>
                </div>
            </div>

            {/* Tableau synthétique */}
            <div style={{ 
                background: theme?.card || '#ffffff', 
                borderRadius: '8px', 
                border: `1px solid ${theme?.border || 'var(--border)'}`, 
                padding: '20px',
            }}>
                <h3 style={{ margin: '0 0 18px 0', fontSize: '16px', fontWeight: '700', color: theme?.text || 'var(--text-primary)' }}>
                    Résumé global de l'état du parc
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${theme?.border || 'var(--border)'}`, color: theme?.subtext || 'var(--text-secondary)' }}>
                            <th style={{ padding: '12px', fontWeight: '600' }}>Indicateur</th>
                            <th style={{ padding: '12px', fontWeight: '600' }}>Valeur Actuelle</th>
                            <th style={{ padding: '12px', fontWeight: '600' }}>Seuil Attendu</th>
                            <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: `1px solid ${theme?.border || 'var(--bg-muted)'}` }}>
                            <td style={{ padding: '14px 12px', fontWeight: '500' }}>Incidents ouverts</td>
                            <td style={{ padding: '14px 12px', fontWeight: '700' }}>{activeIncidents.length} (dont {criticalIncidentsCount} critiques)</td>
                            <td style={{ padding: '14px 12px', color: theme?.subtext || 'var(--text-secondary)' }}>0 critique</td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent)', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                    Information
                                </span>
                            </td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${theme?.border || 'var(--bg-muted)'}` }}>
                            <td style={{ padding: '14px 12px', fontWeight: '500' }}>Alertes clôturées / résolues</td>
                            <td style={{ padding: '14px 12px', color: 'var(--status-healthy)', fontWeight: '700' }}>{resolvedIncidentsCount}</td>
                            <td style={{ padding: '14px 12px', color: theme?.subtext || 'var(--text-secondary)' }}>Maximum</td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-healthy)', padding: '4px 12px', borderRadius: '12px', fontWeight: '600' }}>
                                    En progression
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '14px 12px', fontWeight: '500' }}>Santé globale du Parc</td>
                            <td style={{ padding: '14px 12px', fontWeight: '700' }}>
                                {healthOk ? "Stable" : criticalIncidentsCount > 0 ? "Alerte élevée" : "Surveillance"}
                            </td>
                            <td style={{ padding: '14px 12px', color: theme?.subtext || 'var(--text-secondary)' }}>Aucune alerte critique ouverte</td>
                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                <span style={{ 
                                    background: healthOk ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                    color: healthOk ? 'var(--status-healthy)' : 'var(--status-critical)', 
                                    padding: '4px 12px', 
                                    borderRadius: '12px', 
                                    fontWeight: '600' 
                                }}>
                                    {healthOk ? "Conforme" : "Intervention requise"}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RapportsPage;