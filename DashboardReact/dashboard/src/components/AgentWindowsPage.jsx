import React, { useState } from 'react';
import { api, API_BASE_URL } from '../lib/api';
import { usePolling } from '../hooks/usePolling';

// --- ICÔNES SVG VECTORIELLES ---
const RocketIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71 1.1-1.18 1.1-1.18l-4.1-4.1s-.47.39-1.18 1.1z"/>
    <path d="M12 15l-3-3 7.35-7.35c.78-.78 2.05-.78 2.83 0l1.17 1.17c.78.78.78 2.05 0 2.83L12 15z"/>
    <path d="M5 19l2.5-2.5"/>
    <path d="M15 5l2 2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const MonitorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

export default function AgentWindowsPage({ theme }) {
  const [deployStatus, setDeployStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [agentsConnected, setAgentsConnected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverUrl] = useState(() => {
    try {
      const fromEnv = new URL(API_BASE_URL);
      if (fromEnv.hostname && fromEnv.hostname !== 'localhost') return API_BASE_URL;
    } catch { /* ignore */ }
    const host = window.location.hostname;
    return host && host !== 'localhost' ? `http://${host}:8080` : API_BASE_URL;
  });

  const cardStyle = {
    background: theme.card,
    padding: '24px',
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
    marginBottom: '20px'
  };

  usePolling(async (signal) => {
    try {
      const response = await api('/api/computers', { signal });
      if (response.ok) {
        const data = await response.json();
        setAgentsConnected(data);
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.error("Erreur récupération agents:", error);
    } finally {
      setLoading(false);
    }
  }, 30000);

  const downloadAgent = async () => {
    setDeployStatus('loading');
    setStatusMessage("Génération du ZIP en cours...");
    
    try {
      const response = await api(`/api/agent/download?serverUrl=${encodeURIComponent(serverUrl)}&apiKey=watchdesk-secret-key-2026`);
      
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || "Erreur lors de la génération du ZIP");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'WatchDeskAgent_Install.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setDeployStatus('success');
      setStatusMessage('ZIP téléchargé avec succès !');
    } catch (error) {
      setDeployStatus('error');
      setStatusMessage('Erreur: ' + error.message);
    }
  };

  return (
    <div style={{ padding: '30px', color: theme.text, maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <RocketIcon />
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: theme.text }}>
            Déploiement de l'Agent Windows
          </h1>
        </div>
        <p style={{ fontSize: '14px', color: theme.subtext, marginTop: '8px', margin: '8px 0 0 0' }}>
          Déployez l'agent sur les PCs du réseau. L'agent tourne en arrière-plan et envoie les données automatiquement.
        </p>
      </div>

      {/* Section 1 : Télécharger l'agent */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ padding: 10, background: 'var(--accent-muted)', borderRadius: 10, display: 'flex' }}>
            <MonitorIcon />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Télécharger l'Agent (pour distribution)</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: theme.subtext }}>
              Générez le ZIP d’installation à déployer sur les PCs du réseau.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: 12 }}>
          <button 
            onClick={downloadAgent} 
            disabled={deployStatus === 'loading'} 
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: deployStatus === 'loading' ? 0.7 : 1
            }}
          >
            <DownloadIcon />
            <span>{deployStatus === 'loading' ? 'Génération...' : 'Télécharger le ZIP'}</span>
          </button>
        </div>

        {deployStatus === 'success' && (
          <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', fontSize: '13px', color: 'var(--status-healthy)', fontWeight: 500 }}>
            ✓ {statusMessage}
          </div>
        )}
        {deployStatus === 'error' && (
          <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '13px', color: 'var(--status-critical)', fontWeight: 500 }}>
            ✕ {statusMessage}
          </div>
        )}

        <div style={{ marginTop: '16px', padding: '14px', background: 'var(--accent-muted)', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: '13px', color: theme.text, lineHeight: '1.6' }}>
            <strong style={{ color: 'var(--accent)' }}>Instructions pour l'utilisateur :</strong><br/>
            1. Téléchargez et extrayez le ZIP<br/>
            2. Clic droit sur <strong>install.bat</strong> → Exécuter en tant qu’administrateur<br/>
            3. L’agent redémarre au boot (service Windows)
          </p>
        </div>
      </div>

      {/* Section 2 : Agents Connectés */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Agents Connectés</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: theme.subtext }}>
              PCs surveillés actuellement sur le réseau.
            </p>
          </div>
          <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent)', fontWeight: 600 }}>
            {agentsConnected.length} machine(s)
          </span>
        </div>

        {loading ? (
          <p style={{ color: theme.subtext, fontSize: 13 }}>Chargement des données...</p>
        ) : agentsConnected.length === 0 ? (
          <p style={{ color: theme.subtext, fontSize: 13 }}>Aucun agent connecté.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.border}`, textAlign: 'left' }}>
                  <th style={{ padding: '12px 10px', color: theme.subtext, fontWeight: 600 }}>Machine</th>
                  <th style={{ padding: '12px 10px', color: theme.subtext, fontWeight: 600 }}>Utilisateur</th>
                  <th style={{ padding: '12px 10px', color: theme.subtext, fontWeight: 600 }}>CPU</th>
                  <th style={{ padding: '12px 10px', color: theme.subtext, fontWeight: 600 }}>RAM</th>
                  <th style={{ padding: '12px 10px', color: theme.subtext, fontWeight: 600 }}>Statut</th>
                  <th style={{ padding: '12px 10px', color: theme.subtext, fontWeight: 600 }}>Dernière connexion</th>
                </tr>
              </thead>
              <tbody>
                {agentsConnected.map((pc, index) => {
                  const status = pc.fleetStatus || pc.status?.toLowerCase() || 'offline';
                  const isOnline = status === 'online';
                  const isWarning = status === 'warning';

                  return (
                    <tr key={index} style={{ borderBottom: `1px solid ${theme.border}` }}>
                      <td style={{ padding: '12px 10px', fontWeight: 600 }}>{pc.name}</td>
                      <td style={{ padding: '12px 10px', color: theme.subtext }}>{pc.username || '—'}</td>
                      <td style={{ padding: '12px 10px' }}>{pc.cpuUsage ? `${pc.cpuUsage} %` : '—'}</td>
                      <td style={{ padding: '12px 10px' }}>
                        {pc.ramTotalMB ? `${pc.ramUsedMB} / ${pc.ramTotalMB} MB` : '—'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'lowercase',
                          background: isOnline ? 'rgba(16, 185, 129, 0.12)' : 
                                     isWarning ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: isOnline ? 'var(--status-healthy)' : 
                                 isWarning ? 'var(--status-warning)' : 'var(--status-critical)'
                        }}>
                          {pc.status || 'offline'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: theme.subtext }}>
                        {pc.lastSeen ? new Date(pc.lastSeen).toLocaleString('fr-FR') : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 4 : Informations */}
      <div style={{ ...cardStyle, background: 'transparent', border: `1px dashed ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <InfoIcon />
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: theme.text }}>Comment ça marche ?</h4>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: theme.subtext, lineHeight: '1.8' }}>
          <li><strong>Service Windows</strong> : L'agent démarre automatiquement au boot de la machine.</li>
          <li><strong>Installation simple</strong> : Double-clic sur <code style={{ background: theme.border, padding: '2px 6px', borderRadius: 4 }}>install.bat</code>, aucun mot de passe requis.</li>
          <li><strong>Auto-configuration</strong> : L'agent communique directement avec le serveur API.</li>
          <li><strong>File locale</strong> : Les métriques sont conservées localement si la connexion est interrompue.</li>
          <li><strong>Retry intelligent</strong> : Reconnexion automatique en cas de coupure réseau.</li>
        </ul>
      </div>

    </div>
  );
}