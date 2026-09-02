import { useEffect, useState } from "react";
import { api } from "../lib/api";

const roleLabel = (role) => {
  const r = (role || "").toUpperCase().replace(" ", "_");
  if (r === "SUPER_ADMIN") return "Super Admin";
  if (r === "LECTURE") return "Lecture";
  return "Admin";
};

const roleColor = (role) => {
  const r = (role || "").toUpperCase().replace(" ", "_");
  if (r === "SUPER_ADMIN") return "var(--accent)";
  if (r === "LECTURE") return "var(--status-warning)";
  return "var(--accent)";
};

const initialsOf = (name, email) => {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const formatLogin = (value) => {
  if (!value) return "Jamais connecté";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Jamais connecté";
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

export default function AdminsList({ theme, currentEmail }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "ADMIN" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setUsers(Array.isArray(list) ? list : []))
      .catch(() => setError("Impossible de charger les comptes."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await api("/api/users", {
        method: "POST",
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Création impossible.");
        return;
      }
      setForm({ fullName: "", email: "", password: "", role: "ADMIN" });
      setShowForm(false);
      load();
    } catch {
      setError("Backend injoignable.");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (user, role) => {
    const res = await api(`/api/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Changement de rôle refusé.");
    }
  };

  const toggleEnabled = async (user) => {
    const res = await api(`/api/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: String(!user.enabled) })
    });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Action refusée.");
    }
  };

  const removeUser = async (user) => {
    if (user.email && currentEmail && user.email.toLowerCase() === currentEmail.toLowerCase()) {
      setError("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    if (!window.confirm(`Supprimer le compte ${user.fullName || user.email} ?`)) return;
    const res = await api(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) load();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Suppression refusée.");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
    background: "transparent",
    color: theme.text,
    fontSize: 14,
    boxSizing: "border-box"
  };

  return (
    <div style={{ padding: "28px 4px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: theme.text }}>Gestion des accès</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.subtext }}>
            Comptes WatchDesk : Super Admin (tout), Admin (parc), Lecture (consultation).
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((v) => !v); setError(""); }}
          className="wd-btn wd-btn-primary"
        >
          {showForm ? "Annuler" : "+ Nouvel administrateur"}
        </button>
      </div>

      {error && (
        <div style={{ background: "var(--status-critical-bg)", color: "var(--status-critical)", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={createUser} style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Nom complet</label>
            <input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>E-mail</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Mot de passe</label>
            <input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Rôle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={{ ...inputStyle, background: theme.card }}>
              <option value="ADMIN">Admin — parc, incidents, rapports</option>
              <option value="LECTURE">Lecture — consultation seulement</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" disabled={saving} className="wd-btn wd-btn-primary">
              {saving ? "Création…" : "Créer le compte"}
            </button>
          </div>
        </form>
      )}

      <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 160px", gap: 8, marginBottom: 6, padding: "0 8px" }}>
          {["Nom", "Rôle", "Dernière connexion", "Actions"].map((h) => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: theme.subtext, textTransform: "uppercase" }}>{h}</span>
          ))}
        </div>
        {loading && <div style={{ padding: 24, color: theme.subtext, fontSize: 13 }}>Chargement…</div>}
        {!loading && users.length === 0 && (
          <div style={{ padding: 24, color: theme.subtext, fontSize: 13 }}>Aucun compte. Créez le premier administrateur.</div>
        )}
        {users.map((u, i) => {
          const locked = !!u.superAdmin;
          return (
            <div
              key={u.id || u.email}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1fr 160px",
                gap: 8,
                alignItems: "center",
                padding: "12px 8px",
                borderRadius: 8,
                borderBottom: i === users.length - 1 ? "none" : "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-primary)",
                opacity: u.enabled === false ? 0.55 : 1
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div className="wd-avatar">
                  {initialsOf(u.fullName, u.email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{u.fullName || "Sans nom"}</div>
                  <div style={{ fontSize: 12, color: theme.subtext, overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</div>
                </div>
              </div>
              <div>
                {locked ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: roleColor(u.role) }}>{roleLabel(u.role)}</span>
                ) : (
                  <select
                    value={(u.role || "ADMIN").toUpperCase().replace(" ", "_") === "LECTURE" ? "LECTURE" : "ADMIN"}
                    onChange={(e) => changeRole(u, e.target.value)}
                    style={{ fontSize: 12, fontWeight: 600, color: roleColor(u.role), border: "1px solid var(--border)", background: "var(--bg-surface)", borderRadius: 6, padding: "4px 8px" }}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="LECTURE">Lecture</option>
                  </select>
                )}
              </div>
              <span style={{ fontSize: 12, color: theme.subtext }}>{formatLogin(u.lastLoginAt)}</span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {!locked && (
                  <>
                    <button type="button" onClick={() => toggleEnabled(u)} style={{ fontSize: 11, fontWeight: 600, border: `1px solid ${theme.border}`, background: "transparent", color: theme.text, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
                      {u.enabled === false ? "Activer" : "Désactiver"}
                    </button>
                    <button type="button" onClick={() => removeUser(u)} className="wd-btn wd-btn-danger" style={{ height: 28, fontSize: 11 }}>
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.border}`, fontSize: 12, color: theme.subtext }}>
          {users.length} compte{users.length > 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
