import { useCallback, useState } from "react";
import { api, API_BASE_URL, getToken } from "../lib/api";
import { usePolling } from "../hooks/usePolling";

const ACTION_LABELS = {
  AGENT_RESTART: "Redémarrage PC",
  AGENT_SHUTDOWN: "Arrêt PC",
  AGENT_UPDATE_WITH_REBOOT: "MAJ + reboot",
  AGENT_UPDATE_WITHOUT_REBOOT: "MAJ sans reboot",
  AGENT_SCHEDULE_UPDATE: "Planif. MAJ",
  AGENT_UPDATE: "MAJ agent",
  INCIDENT_STATUS: "Statut incident",
  INCIDENT_CREATE: "Création incident",
  USER_CREATE: "Création compte",
  USER_UPDATE: "Modif. compte",
  USER_DELETE: "Suppression compte",
  CONFIG_UPDATE: "Config. système",
  CONFIG_TEST_EMAIL: "Test e-mail",
  CHAT_ASK: "Question IA",
  RULE_CREATE: "Création règle",
  RULE_UPDATE: "Modif. règle",
  RULE_DELETE: "Suppression règle",
  RULE_TOGGLE: "Activation règle",
  RULE_FIRE: "Règle déclenchée",
};

function labelOf(action) {
  if (!action) return "—";
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith("AGENT_")) return action.replace("AGENT_", "Action ");
  return action;
}

function formatWhen(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function buildParams({ action, actor, q, from, to, page = "0", size = "100" }) {
  const params = new URLSearchParams({ page, size });
  if (action) params.set("action", action);
  if (actor) params.set("actor", actor);
  if (q) params.set("q", q);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return params;
}

function getUserHeaderValue() {
  try {
    const saved = localStorage.getItem("watchdesk_user");
    if (!saved) return null;
    const u = JSON.parse(saved);
    const payload = JSON.stringify({
      email: u.email || "",
      fullName: u.fullName || u.name || "",
      role: u.role || "ADMIN",
    });
    return btoa(unescape(encodeURIComponent(payload)));
  } catch {
    return null;
  }
}

export default function AuditPage({ theme }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [total, setTotal] = useState(0);

  const load = useCallback(async (signal) => {
    try {
      const params = buildParams({ action, actor, q, from, to, size: "150" });
      const res = await api(`/api/audit?${params}`, { signal });
      if (!res.ok) return;
      const data = await res.json();
      setRows(Array.isArray(data.content) ? data.content : []);
      setTotal(data.totalElements || 0);
    } catch (err) {
      if (err?.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  }, [action, actor, q, from, to]);

  usePolling(load, 15000);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params = buildParams({ action, actor, q, from, to });
      const headers = {};
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
      const userHeader = getUserHeaderValue();
      if (userHeader) headers["X-WatchDesk-User"] = userHeader;

      const res = await fetch(`${API_BASE_URL}/api/audit/export.csv?${params}`, { headers });
      if (!res.ok) throw new Error("Export échoué");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watchdesk-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Impossible d’exporter le CSV.");
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setAction("");
    setActor("");
    setQ("");
    setFrom("");
    setTo("");
  };

  const border = theme?.border || "var(--border)";
  const text = theme?.text || "var(--text-primary)";
  const muted = theme?.subtext || "var(--text-secondary)";
  const card = theme?.card || "#fff";
  const bg = theme?.bg || "var(--bg-canvas)";

  const inputStyle = {
    padding: "9px 12px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: bg,
    color: text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };

  const fieldLabel = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
  };

  return (
    <div style={{ padding: "24px 8px 40px", maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: text }}>
            Journal d’audit
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: muted }}>
            Qui a fait quoi — filtrable par période, utilisateur et type d’action ({total} entrées).
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: exporting ? "var(--text-tertiary)" : "var(--text-secondary)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: exporting ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {exporting ? "Export…" : "Exporter CSV"}
        </button>
      </header>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
        marginBottom: 16,
        padding: 16,
        background: card,
        border: `1px solid ${border}`,
        borderRadius: 12,
      }}>
        <label>
          <span style={fieldLabel}>Du</span>
          <input type="date" style={{ ...inputStyle, width: "100%" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          <span style={fieldLabel}>Au</span>
          <input type="date" style={{ ...inputStyle, width: "100%" }} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label>
          <span style={fieldLabel}>Utilisateur</span>
          <input
            style={{ ...inputStyle, width: "100%" }}
            placeholder="Nom ou e-mail"
            value={actor}
            onChange={(e) => setActor(e.target.value)}
          />
        </label>
        <label>
          <span style={fieldLabel}>Type d’action</span>
          <select style={{ ...inputStyle, width: "100%" }} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Toutes</option>
            {Object.keys(ACTION_LABELS).map((k) => (
              <option key={k} value={k}>{ACTION_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label style={{ gridColumn: "span 1" }}>
          <span style={fieldLabel}>Recherche</span>
          <input
            style={{ ...inputStyle, width: "100%" }}
            placeholder="Cible, détails…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={() => load()}
            style={{
              padding: "9px 14px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Filtrer
          </button>
          <button
            type="button"
            onClick={resetFilters}
            style={{
              padding: "9px 14px", borderRadius: 8, border: `1px solid ${border}`,
              background: bg, color: text, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading && rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: muted }}>Chargement du journal…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: muted }}>
            Aucune entrée pour ces filtres.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: bg, textAlign: "left", color: muted, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Date</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Utilisateur</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Action</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Cible</th>
                  <th style={{ padding: "12px 14px", fontWeight: 700 }}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${border}` }}>
                    <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: muted }}>{formatWhen(r.createdAt)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 600, color: text }}>{r.actorName || r.actorEmail}</div>
                      <div style={{ fontSize: 11, color: muted }}>{r.actorRole} · {r.actorEmail}</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 8px", borderRadius: 6,
                        background: "var(--accent-muted)", color: "var(--accent)", fontWeight: 600, fontSize: 12,
                      }}>
                        {labelOf(r.action)}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", color: text }}>
                      {r.targetLabel || r.targetId || "—"}
                      {r.targetType && (
                        <div style={{ fontSize: 11, color: muted }}>{r.targetType}</div>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", color: muted, maxWidth: 320 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.details}>
                        {r.details || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
