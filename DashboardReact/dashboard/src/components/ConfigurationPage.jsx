import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const SlidersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const WrenchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const SaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 99,
        border: 'none',
        padding: 2,
        cursor: 'pointer',
        background: checked ? 'var(--accent)' : 'var(--border)',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }}
      />
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export default function ConfigurationPage({ theme }) {
  const [cpuCritical, setCpuCritical] = useState(90);
  const [ramCritical, setRamCritical] = useState(95);
  const [cpuWarning, setCpuWarning] = useState(75);
  const [ramWarning, setRamWarning] = useState(80);
  const [diskCriticalGb, setDiskCriticalGb] = useState(10);
  const [offlineMinutes, setOfflineMinutes] = useState(3);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceDuration, setMaintenanceDuration] = useState("2");
  const [adminEmail, setAdminEmail] = useState("");
  const [enableEmail, setEnableEmail] = useState(true);
  const [heartbeatInterval, setHeartbeatInterval] = useState(30);
  const [preview, setPreview] = useState({ warn: 0, crit: 0, off: 0, total: 0 });
  const [testMsg, setTestMsg] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  useEffect(() => {
    api("/api/configuration")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Erreur de chargement");
      })
      .then(data => {
        if (data) {
          setCpuCritical(data.cpuCritical ?? 90);
          setRamCritical(data.ramCritical ?? 95);
          setCpuWarning(data.cpuWarning ?? 75);
          setRamWarning(data.ramWarning ?? 80);
          setDiskCriticalGb(data.diskCriticalGb ?? 10);
          setOfflineMinutes(data.offlineMinutes ?? 3);
          setMaintenanceMode(data.maintenanceMode ?? false);
          setMaintenanceDuration(data.maintenanceDuration ?? "2");
          setAdminEmail(data.adminEmail ?? "");
          setEnableEmail(data.enableEmail ?? true);
          setHeartbeatInterval(data.heartbeatInterval ?? 30);
        }
      })
      .catch(err => console.error("Impossible de charger la config:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const cw = parseInt(cpuWarning, 10) || 75;
    const cc = parseInt(cpuCritical, 10) || 90;
    const rw = parseInt(ramWarning, 10) || 80;
    const rc = parseInt(ramCritical, 10) || 95;
    const offMin = parseInt(offlineMinutes, 10) || 3;
    api("/api/computers")
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        if (!Array.isArray(list)) return;
        const parse = (v) => parseFloat(String(v || '').replace('%', '').replace(',', '.')) || 0;
        const now = Date.now();
        let warn = 0, crit = 0, off = 0;
        list.forEach(pc => {
          const mins = pc.lastSeen ? (now - new Date(pc.lastSeen).getTime()) / 60000 : 999;
          if (mins >= offMin) { off += 1; return; }
          const cpu = parse(pc.cpuUsage);
          const ram = pc.ramTotalMB ? (Number(pc.ramUsedMB) / Number(pc.ramTotalMB)) * 100 : 0;
          if (cpu >= cc || ram >= rc) crit += 1;
          else if (cpu >= cw || ram >= rw) warn += 1;
        });
        setPreview({ warn, crit, off, total: list.length });
      })
      .catch(() => {});
  }, [cpuWarning, cpuCritical, ramWarning, ramCritical, offlineMinutes]);

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);

    const configPayload = {
      cpuCritical: parseInt(cpuCritical) || 0,
      ramCritical: parseInt(ramCritical) || 0,
      cpuWarning: parseInt(cpuWarning) || 75,
      ramWarning: parseInt(ramWarning) || 80,
      diskCriticalGb: parseInt(diskCriticalGb) || 10,
      offlineMinutes: parseInt(offlineMinutes) || 3,
      maintenanceMode,
      maintenanceDuration: String(maintenanceDuration),
      adminEmail,
      enableEmail,
      // Slack retiré de l'UI — on force désactivé pour rester compatible backend
      slackWebhook: "",
      enableSlack: false,
      heartbeatInterval: parseInt(heartbeatInterval) || 30
    };

    try {
      const response = await api("/api/configuration", {
        method: "PUT",
        body: JSON.stringify(configPayload)
      });

      if (response.ok) {
        setNotificationMsg("Configuration sauvegardée avec succès.");
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 4000);
      } else {
        alert("Erreur lors de la sauvegarde backend");
      }
    } catch (error) {
      console.error("Erreur réseau :", error);
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTestMsg("Envoi du test…");
    try {
      const response = await api("/api/configuration/test-email", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      setTestMsg(data.message || (response.ok ? "E-mail de test envoyé." : "Échec du test."));
    } catch {
      setTestMsg("Impossible de joindre le backend.");
    }
  };

  const border = theme?.border || 'var(--border)';
  const text = theme?.text || 'var(--text-primary)';
  const muted = theme?.subtext || 'var(--text-secondary)';
  const card = theme?.card || '#ffffff';
  const bg = theme?.bg || 'var(--bg-canvas)';

  const cardStyle = {
    background: card,
    padding: '22px 24px',
    borderRadius: 14,
    border: `1px solid ${border}`,
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1px solid ${border}`,
    background: bg,
    color: text,
    fontSize: 14,
    marginTop: 8,
    boxSizing: 'border-box',
    outline: 'none',
  };

  const sectionTitle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
    color: text,
  };

  if (loading) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center", color: muted }}>
        Chargement de la configuration…
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 8px 40px', color: text, maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.03em', color: text }}>
          Configuration
        </h1>
        <p style={{ fontSize: 14, color: muted, margin: '8px 0 0', lineHeight: 1.5, maxWidth: 520 }}>
          Seuils d’alertes, collecte agent et notifications e-mail.
        </p>
      </header>

      {showNotification && (
        <div style={{
          background: 'var(--status-healthy-bg)',
          color: 'var(--status-healthy)',
          border: '1px solid var(--border)',
          padding: '12px 16px',
          borderRadius: 10,
          marginBottom: 20,
          fontWeight: 600,
          fontSize: 13,
        }}>
          {notificationMsg}
        </div>
      )}

      <form onSubmit={handleSaveAll} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Seuils */}
        <section style={cardStyle}>
          <h2 style={sectionTitle}><SlidersIcon /> Seuils d’anomalies</h2>
          <p style={{ fontSize: 13, color: muted, margin: '8px 0 18px', lineHeight: 1.45 }}>
            Déclenchement automatique des incidents selon CPU, RAM, disque et présence réseau.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <Field label="CPU avertissement (%)">
              <input type="number" min="1" max="100" value={cpuWarning} onChange={(e) => setCpuWarning(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="CPU critique (%)">
              <input type="number" min="1" max="100" value={cpuCritical} onChange={(e) => setCpuCritical(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Disque critique (Go libres)">
              <input type="number" min="1" max="500" value={diskCriticalGb} onChange={(e) => setDiskCriticalGb(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="RAM avertissement (%)">
              <input type="number" min="1" max="100" value={ramWarning} onChange={(e) => setRamWarning(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="RAM critique (%)">
              <input type="number" min="1" max="100" value={ramCritical} onChange={(e) => setRamCritical(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Hors ligne après (min)">
              <input type="number" min="1" max="120" value={offlineMinutes} onChange={(e) => setOfflineMinutes(e.target.value)} style={inputStyle} />
            </Field>
          </div>
          <div style={{
            marginTop: 18,
            padding: '10px 14px',
            borderRadius: 10,
            background: bg,
            border: `1px solid ${border}`,
            fontSize: 12,
            color: muted,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 18px',
          }}>
            <span>Parc actuel · <strong style={{ color: text }}>{preview.total}</strong> PC</span>
            <span style={{ color: 'var(--status-critical)' }}><strong>{preview.crit}</strong> critique(s)</span>
            <span style={{ color: 'var(--status-warning)' }}><strong>{preview.warn}</strong> avertissement(s)</span>
            <span><strong style={{ color: text }}>{preview.off}</strong> hors ligne</span>
          </div>
        </section>

        {/* Heartbeat + Email côte à côte */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 18 }}>
          <section style={cardStyle}>
            <h2 style={sectionTitle}><ClockIcon /> Collecte agent</h2>
            <p style={{ fontSize: 13, color: muted, margin: '8px 0 16px', lineHeight: 1.45 }}>
              Intervalle d’envoi des métriques (heartbeat).
            </p>
            <Field label="Fréquence">
              <select
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value={10}>10 secondes — temps réel</option>
                <option value={30}>30 secondes — standard</option>
                <option value={60}>1 minute — économie</option>
              </select>
            </Field>
          </section>

          <section style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h2 style={sectionTitle}><MailIcon /> Alertes e-mail</h2>
                <p style={{ fontSize: 13, color: muted, margin: '8px 0 0', lineHeight: 1.45 }}>
                  Destinataire des notifications d’incidents.
                </p>
              </div>
              <Toggle checked={enableEmail} onChange={setEnableEmail} label="Activer les e-mails" />
            </div>
            <div style={{ marginTop: 16, opacity: enableEmail ? 1 : 0.45, pointerEvents: enableEmail ? 'auto' : 'none' }}>
              <Field label="Adresse">
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  style={inputStyle}
                  placeholder="admin@entreprise.tn"
                />
              </Field>
              <button
                type="button"
                onClick={testEmail}
                style={{
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${border}`,
                  background: bg,
                  color: text,
                  borderRadius: 8,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
              >
                Envoyer un e-mail de test
              </button>
              {testMsg && (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: muted }}>{testMsg}</p>
              )}
            </div>
          </section>
        </div>

        {/* Maintenance */}
        <section style={{
          ...cardStyle,
          background: maintenanceMode ? 'var(--status-warning-bg)' : card,
          borderColor: maintenanceMode ? 'var(--border)' : border,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
            <div style={{ flex: 1 }}>
              <h2 style={sectionTitle}><WrenchIcon /> Mode maintenance</h2>
              <p style={{ fontSize: 13, color: muted, margin: '8px 0 0', lineHeight: 1.45 }}>
                Suspend la création de nouvelles alertes pendant les interventions.
              </p>
              {maintenanceMode && (
                <p style={{ fontSize: 12, color: 'var(--status-warning)', margin: '10px 0 0', fontWeight: 600 }}>
                  Aucun incident CPU / RAM / logs ne sera créé tant que ce mode est actif.
                </p>
              )}
              <div style={{ marginTop: 14, maxWidth: 220 }}>
                <Field label="Durée prévue">
                  <select
                    value={maintenanceDuration}
                    onChange={(e) => setMaintenanceDuration(e.target.value)}
                    style={{ ...inputStyle, cursor: 'pointer', background: maintenanceMode ? 'var(--status-warning-bg)' : bg }}
                  >
                    <option value="1">1 heure</option>
                    <option value="2">2 heures</option>
                    <option value="4">4 heures</option>
                    <option value="8">8 heures</option>
                  </select>
                </Field>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} label="Mode maintenance" />
              <div style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: maintenanceMode ? 'var(--status-warning)' : muted,
              }}>
                {maintenanceMode ? 'Actif' : 'Inactif'}
              </div>
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              padding: '12px 22px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: saving ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              opacity: saving ? 0.7 : 1,
            }}
          >
            <SaveIcon /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
