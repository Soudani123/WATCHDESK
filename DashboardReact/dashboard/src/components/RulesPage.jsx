import { useCallback, useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";

const CONDITION_TYPES = [
  { value: "CPU_ABOVE", label: "CPU au-dessus de (%)", hasDuration: true, hasThreshold: true, unit: "%" },
  { value: "RAM_ABOVE", label: "RAM au-dessus de (%)", hasDuration: true, hasThreshold: true, unit: "%" },
  { value: "OFFLINE_MINUTES", label: "Hors ligne depuis (min)", hasDuration: false, hasThreshold: true, unit: "min" },
  { value: "FAILED_LOGINS", label: "Échecs de connexion (≥)", hasDuration: false, hasThreshold: true, unit: "" },
  { value: "LOG_EVENT_ID", label: "Event ID Windows présent", hasDuration: false, hasThreshold: false, unit: "" },
];

const emptyCondition = () => ({
  type: "CPU_ABOVE",
  threshold: 90,
  durationMinutes: 15,
  eventId: "",
});

const EXAMPLE = {
  name: "CPU critique + échecs login",
  severity: "CRITIQUE",
  logic: "AND",
  cooldownMinutes: 30,
  description: "CPU > 90% pendant 15 min ET au moins 3 échecs de connexion",
  conditions: [
    { type: "CPU_ABOVE", threshold: 90, durationMinutes: 15 },
    { type: "FAILED_LOGINS", threshold: 3 },
  ],
};

export default function RulesPage({ theme }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    severity: "ÉLEVÉE",
    logic: "AND",
    cooldownMinutes: 30,
    description: "",
    conditions: [emptyCondition()],
  });

  const border = theme?.border || "var(--border)";
  const text = theme?.text || "var(--text-primary)";
  const muted = theme?.subtext || "var(--text-secondary)";
  const card = theme?.card || "#fff";
  const bg = theme?.bg || "var(--bg-canvas)";

  const load = useCallback(async (signal) => {
    try {
      const res = await api("/api/rules", { signal });
      if (!res.ok) return;
      const list = await res.json();
      setRules(Array.isArray(list) ? list : []);
    } catch (err) {
      if (err?.name !== "AbortError") setError("Impossible de charger les règles.");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 20000);

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: bg,
    color: text,
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
  };

  const resetForm = () => {
    setForm({
      name: "",
      severity: "ÉLEVÉE",
      logic: "AND",
      cooldownMinutes: 30,
      description: "",
      conditions: [emptyCondition()],
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api("/api/rules", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          enabled: true,
          conditions: form.conditions.map((c) => {
            const out = { type: c.type };
            if (c.type === "LOG_EVENT_ID") out.eventId = c.eventId;
            else out.threshold = Number(c.threshold) || 0;
            if (c.type === "CPU_ABOVE" || c.type === "RAM_ABOVE") {
              out.durationMinutes = Number(c.durationMinutes) || 0;
            }
            return out;
          }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Création impossible.");
        return;
      }
      setShowForm(false);
      resetForm();
      load();
    } catch {
      setError("Backend injoignable.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (rule) => {
    await api(`/api/rules/${rule.id}/enabled`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !rule.enabled }),
    });
    load();
  };

  const remove = async (rule) => {
    if (!window.confirm(`Supprimer la règle « ${rule.name} » ?`)) return;
    await api(`/api/rules/${rule.id}`, { method: "DELETE" });
    load();
  };

  const condLabel = (c) => {
    const meta = CONDITION_TYPES.find((t) => t.value === c.type);
    if (c.type === "LOG_EVENT_ID") return `Event ID ${c.eventId || "?"}`;
    if (c.type === "CPU_ABOVE" || c.type === "RAM_ABOVE") {
      return `${meta?.label?.split(" ")[0] || c.type} ≥ ${c.threshold}% pendant ${c.durationMinutes || 0} min`;
    }
    return `${meta?.label || c.type} ${c.threshold ?? ""}`;
  };

  return (
    <div style={{ padding: "24px 8px 40px", maxWidth: 960, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: text }}>
            Règles d’alertes
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: muted, maxWidth: 520 }}>
            Corrélations personnalisées : conditions CPU, RAM, logs, échecs login… (Super Admin).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => { setForm({ ...EXAMPLE }); setShowForm(true); }}
            style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${border}`,
              background: bg, color: text, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Exemple CPU + login
          </button>
          <button
            type="button"
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              padding: "10px 14px", borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}
          >
            Nouvelle règle
          </button>
        </div>
      </header>

      {error && (
        <div style={{
          marginBottom: 14, padding: "10px 14px", borderRadius: 8,
          background: "var(--status-critical-bg)", color: "var(--status-critical)", border: "1px solid var(--border)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={save} style={{
          marginBottom: 20, padding: 20, background: card, border: `1px solid ${border}`, borderRadius: 12,
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 12 }}>
            <label>
              <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Nom</span>
              <input required style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Sévérité</span>
              <select style={inputStyle} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                <option value="CRITIQUE">Critique</option>
                <option value="ÉLEVÉE">Élevée</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="FAIBLE">Faible</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Logique</span>
              <select style={inputStyle} value={form.logic} onChange={(e) => setForm({ ...form, logic: e.target.value })}>
                <option value="AND">ET (toutes)</option>
                <option value="OR">OU (au moins une)</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Cooldownoldown (min)</span>
              <input type="number" min="0" style={inputStyle} value={form.cooldownMinutes}
                onChange={(e) => setForm({ ...form, cooldownMinutes: e.target.value })} />
            </label>
          </div>

          <label>
            <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Description</span>
            <input style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Corrélation charge CPU et attaques brute-force" />
          </label>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase" }}>Conditions</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, conditions: [...form.conditions, emptyCondition()] })}
                style={{ fontSize: 12, fontWeight: 600, border: "none", background: "transparent", color: "var(--accent)", cursor: "pointer" }}
              >
                + Ajouter
              </button>
            </div>
            {form.conditions.map((c, idx) => {
              const meta = CONDITION_TYPES.find((t) => t.value === c.type) || CONDITION_TYPES[0];
              return (
                <div key={idx} style={{
                  display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "end",
                }}>
                  <select
                    style={inputStyle}
                    value={c.type}
                    onChange={(e) => {
                      const next = [...form.conditions];
                      next[idx] = { ...emptyCondition(), type: e.target.value };
                      setForm({ ...form, conditions: next });
                    }}
                  >
                    {CONDITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {c.type === "LOG_EVENT_ID" ? (
                    <input
                      style={inputStyle}
                      placeholder="Event ID (ex: 4625)"
                      value={c.eventId || ""}
                      onChange={(e) => {
                        const next = [...form.conditions];
                        next[idx] = { ...c, eventId: e.target.value };
                        setForm({ ...form, conditions: next });
                      }}
                    />
                  ) : (
                    <input
                      type="number"
                      style={inputStyle}
                      value={c.threshold}
                      onChange={(e) => {
                        const next = [...form.conditions];
                        next[idx] = { ...c, threshold: e.target.value };
                        setForm({ ...form, conditions: next });
                      }}
                    />
                  )}
                  {meta.hasDuration ? (
                    <input
                      type="number"
                      style={inputStyle}
                      placeholder="Durée (min)"
                      value={c.durationMinutes}
                      onChange={(e) => {
                        const next = [...form.conditions];
                        next[idx] = { ...c, durationMinutes: e.target.value };
                        setForm({ ...form, conditions: next });
                      }}
                    />
                  ) : <div />}
                  <button
                    type="button"
                    disabled={form.conditions.length <= 1}
                    onClick={() => setForm({ ...form, conditions: form.conditions.filter((_, i) => i !== idx) })}
                    style={{
                      padding: "10px 12px", borderRadius: 8, border: `1px solid ${border}`,
                      background: bg, color: muted, cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={() => setShowForm(false)} style={{
              padding: "10px 14px", borderRadius: 8, border: `1px solid ${border}`, background: bg, color: text, fontWeight: 600, cursor: "pointer",
            }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} style={{
              padding: "10px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1,
            }}>
              {saving ? "Enregistrement…" : "Créer la règle"}
            </button>
          </div>
        </form>
      )}

      <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading && rules.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: muted }}>Chargement…</div>
        ) : rules.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: muted }}>
            Aucune règle. Créez-en une ou chargez l’exemple « CPU + login ».
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: bg, textAlign: "left", color: muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                <th style={{ padding: "12px 14px" }}>Règle</th>
                <th style={{ padding: "12px 14px" }}>Conditions</th>
                <th style={{ padding: "12px 14px" }}>Sévérité</th>
                <th style={{ padding: "12px 14px" }}>État</th>
                <th style={{ padding: "12px 14px" }} />
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${border}` }}>
                  <td style={{ padding: "14px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 700, color: text }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{r.description || "—"}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 4 }}>
                      {r.logic} · cooldown {r.cooldownMinutes} min
                      {r.lastFiredAt ? ` · dernier feu ${new Date(r.lastFiredAt).toLocaleString("fr-FR")}` : ""}
                    </div>
                  </td>
                  <td style={{ padding: "14px", verticalAlign: "top", color: muted }}>
                    {(r.conditions || []).map((c, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>• {condLabel(c)}</div>
                    ))}
                  </td>
                  <td style={{ padding: "14px", verticalAlign: "top" }}>
                    <span style={{
                      padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11,
                      background: "var(--status-critical-bg)", color: "var(--status-critical)",
                    }}>{r.severity}</span>
                  </td>
                  <td style={{ padding: "14px", verticalAlign: "top" }}>
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      style={{
                        border: "none", borderRadius: 99, padding: "4px 10px", cursor: "pointer",
                        fontWeight: 700, fontSize: 11,
                        background: r.enabled ? "var(--status-healthy-bg)" : "var(--bg-muted)",
                        color: r.enabled ? "var(--status-healthy)" : muted,
                      }}
                    >
                      {r.enabled ? "Active" : "Off"}
                    </button>
                  </td>
                  <td style={{ padding: "14px", verticalAlign: "top" }}>
                    <button type="button" onClick={() => remove(r)} style={{
                      border: "none", background: "transparent", color: "var(--status-critical)", fontWeight: 600, fontSize: 12, cursor: "pointer",
                    }}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
