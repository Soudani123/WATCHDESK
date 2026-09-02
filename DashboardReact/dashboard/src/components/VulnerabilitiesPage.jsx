import { useState } from "react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";

const sevStyle = (sev) => {
  const s = (sev || "").toUpperCase();
  if (s.includes("CRIT") || s.includes("ÉLEV") || s.includes("ELEV")) {
    return { bg: "var(--status-critical-bg)", color: "var(--status-critical)", border: "var(--border)" };
  }
  if (s.includes("MOY")) {
    return { bg: "var(--status-warning-bg)", color: "var(--status-warning)", border: "var(--border)" };
  }
  return { bg: "var(--status-healthy-bg)", color: "var(--status-healthy)", border: "var(--border)" };
};

const emptyData = { summary: {}, cves: [], software: [], patches: [], inventory: [] };

export default function VulnerabilitiesPage({ theme, dark }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("CVE");
  const [busy, setBusy] = useState(false);

  usePolling(async (signal) => {
    try {
      const r = await api("/api/vulnerabilities", { signal });
      const json = r.ok ? await r.json() : emptyData;
      setData(json && json.summary ? json : emptyData);
    } catch (err) {
      if (err?.name !== "AbortError") console.error(err);
    } finally {
      setLoading(false);
    }
  }, 15000);

  const summary = data.summary || {};
  const kpis = [
    { label: "CVE critiques / élevées", value: summary.criticalCves || 0, color: "var(--status-critical)" },
    { label: "Logiciels obsolètes", value: summary.outdatedApps || 0, color: "var(--status-warning)" },
    { label: "Applications inventoriées", value: summary.inventoryCount || 0, color: "var(--text-primary)" },
    { label: "Correctifs Windows (KB)", value: (summary.pendingPatches || 0) + (summary.installedPatches || 0), color: "var(--text-primary)" },
  ];

  const applyPatches = async (pcs, label) => {
    const targets = (pcs || []).filter((p) => p.ip);
    if (targets.length === 0) {
      alert("Aucune IP agent pour lancer le correctif.");
      return;
    }
    setBusy(true);
    try {
      await Promise.all(targets.map((p) =>
        api(`/api/agent/trigger-action/${p.ip}`, {
          method: "POST",
          body: JSON.stringify({
            action: "UPDATE_WITHOUT_REBOOT",
            message: `Correctif WatchDesk : ${label}`,
          }),
        })
      ));
      alert(`Mise à jour lancée sur ${targets.length} machine(s).`);
    } catch {
      alert("Impossible de contacter les agents.");
    } finally {
      setBusy(false);
    }
  };

  const card = {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
  };

  if (loading) {
    return <div style={{ padding: 48, color: theme.subtext, textAlign: "center" }}>Analyse des vulnérabilités…</div>;
  }

  const rows = tab === "CVE" ? data.cves : tab === "LOGICIELS" ? data.software : tab === "INVENTAIRE" ? data.inventory : data.patches;

  return (
    <div style={{ padding: "8px 0 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: theme.text }}>Vulnérabilités & patchs</h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: theme.subtext }}>
          Détection des logiciels obsolètes, CVE et correctifs Windows sur le parc
          {summary.affectedPcs ? ` — ${summary.affectedPcs} poste(s) concerné(s)` : ""}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ ...card, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, color: theme.subtext }}>{k.label}</div>
            <div className="wd-metric" style={{ fontSize: 28, color: k.color, marginTop: 6 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { id: "CVE", label: `CVE (${(data.cves || []).length})` },
          { id: "LOGICIELS", label: `Logiciels obsolètes (${(data.software || []).length})` },
          { id: "INVENTAIRE", label: `Inventaire (${(data.inventory || []).length})` },
          { id: "PATCHS", label: `Patchs Windows (${(data.patches || []).length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              border: `1px solid ${tab === t.id ? "var(--accent)" : theme.border}`,
              background: tab === t.id ? (dark ? "var(--accent-muted)" : "var(--accent-muted)") : theme.card,
              color: tab === t.id ? "var(--accent)" : theme.text,
              borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ ...card, overflow: "hidden" }}>
        {(!rows || rows.length === 0) ? (
          <div style={{ padding: 36, textAlign: "center", color: theme.subtext, fontSize: 14 }}>
            {tab === "PATCHS"
              ? "Aucun correctif Windows recensé sur les agents."
              : tab === "LOGICIELS"
                ? "Aucun logiciel obsolète détecté sur l’inventaire actuel."
                : tab === "INVENTAIRE"
                  ? "Inventaire vide : l’agent n’a pas encore envoyé la liste des applications."
                : "Aucune CVE détectée sur l’inventaire actuel."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: theme.subtext, fontSize: 11, letterSpacing: "0.04em" }}>
                  {tab === "CVE" && <th style={th}>CVE</th>}
                  {tab === "CVE" && <th style={th}>Produit</th>}
                  {(tab === "LOGICIELS" || tab === "INVENTAIRE") && <th style={th}>Application</th>}
                  {tab === "PATCHS" && <th style={th}>Correctif</th>}
                  <th style={th}>Gravité</th>
                  <th style={th}>{tab === "PATCHS" ? "KB" : "Version"}</th>
                  <th style={th}>Postes</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const sev = sevStyle(row.severity);
                  const key = row.cve || row.kb || row.name || idx;
                  const title = row.title || row.name || "";
                  return (
                    <tr key={key} style={{ borderTop: `1px solid ${theme.border}` }}>
                      {tab === "CVE" && (
                        <td style={td}>
                          <div style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{row.cve}</div>
                          <div style={{ fontSize: 12, color: theme.subtext, marginTop: 4 }}>{title}</div>
                        </td>
                      )}
                      {tab === "CVE" && <td style={td}>{row.product}</td>}
                      {(tab === "LOGICIELS" || tab === "INVENTAIRE") && (
                        <td style={td}>
                          <div style={{ fontWeight: 600 }}>{row.name}</div>
                          <div style={{ fontSize: 12, color: theme.subtext }}>{row.cve}</div>
                        </td>
                      )}
                      {tab === "PATCHS" && (
                        <td style={{ ...td, maxWidth: 420 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</div>
                        </td>
                      )}
                      <td style={td}>
                        <span style={{
                          background: dark ? "transparent" : sev.bg, color: sev.color,
                          border: `1px solid ${sev.border}`, borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700
                        }}>{row.severity}</span>
                      </td>
                      <td style={td}>
                        {tab === "PATCHS" ? (row.kb || "—") : (
                          <span>{row.installedVersion || "—"}{row.minSafeVersion ? ` → ${row.minSafeVersion}` : ""}</span>
                        )}
                      </td>
                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => {
                            const name = row.pcs?.[0]?.name;
                            if (name) window.dispatchEvent(new CustomEvent("watchdeskOpenComputer", { detail: { name } }));
                          }}
                          style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontWeight: 700, padding: 0 }}
                        >
                          {row.affectedCount || row.pcs?.length || 0}
                        </button>
                        <div style={{ fontSize: 11, color: theme.subtext }}>
                          {(row.pcs || []).map((p) => p.name).slice(0, 2).join(", ")}
                          {(row.pcs || []).length > 2 ? "…" : ""}
                        </div>
                      </td>
                      <td style={td}>
                        {tab !== "INVENTAIRE" && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {row.cve && String(row.cve).startsWith("CVE-") && (
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent("watchdeskAskAi", {
                                detail: { message: `Explique ${row.cve} (${row.product || row.name || ""}). Gravité, impact, postes concernés et correctif recommandé.` }
                              }))}
                              style={btn(theme)}
                            >
                              Expliquer IA
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => applyPatches(row.pcs, row.cve || row.kb || row.name || "patch")}
                            style={btn(theme)}
                          >
                            Patcher
                          </button>
                        </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const th = { padding: "12px 14px", fontWeight: 700 };
const td = { padding: "12px 14px", verticalAlign: "top" };
const btn = (theme) => ({
  background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text,
  borderRadius: 6, padding: "5px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer",
});
