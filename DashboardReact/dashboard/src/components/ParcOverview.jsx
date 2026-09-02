import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./ParcOverview.css";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";

const ONLINE_MINUTES = 3;

const STATUS = {
  critical: "var(--chart-red)",
  warning: "var(--chart-orange)",
  healthy: "var(--chart-green)",
  muted: "var(--chart-gray)",
  accent: "var(--chart-blue)",
  blue: "var(--chart-blue)",
  teal: "var(--chart-teal)",
};

const DAYS_FR = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

const isOpenStatus = (status) => {
  const s = (status || "OUVERT").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s === "OUVERT" || s === "NOUVEAU" || s === "EN COURS";
};

const isResolved = (status) => {
  const s = (status || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s === "RESOLU" || s === "RESOLVED" || s === "CLOS" || s === "CLOSED";
};

const isInProgress = (status) => {
  const s = (status || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s === "EN COURS" || s === "IN PROGRESS";
};

const isHighSeverity = (sev) => {
  const s = (sev || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.includes("ELEV") || s.includes("CRIT") || s === "HIGH";
};

const isMediumSeverity = (sev) => {
  const s = (sev || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.includes("MOY") || s === "MEDIUM";
};

const parseCpu = (pc) => {
  const n = parseFloat(String(pc?.cpuUsage ?? "").replace("%", "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const ramPct = (pc) => {
  const used = Number(pc?.ramUsedMB);
  const total = Number(pc?.ramTotalMB);
  if (!total || Number.isNaN(total) || Number.isNaN(used)) return 0;
  return Math.round((used / total) * 100);
};

const minutesAgo = (lastSeen) => {
  if (!lastSeen) return null;
  const past = new Date(lastSeen);
  if (Number.isNaN(past.getTime())) return null;
  return Math.floor((Date.now() - past.getTime()) / 60000);
};

const fleetOf = (pc) => {
  if (pc.fleetStatus) return pc.fleetStatus;
  const mins = minutesAgo(pc.lastSeen);
  if (mins == null || mins >= ONLINE_MINUTES) return "offline";
  if ((pc.openIncidentCount || 0) > 0) return "warning";
  return "online";
};

const hasLog = (text) => {
  if (!text) return false;
  const t = String(text).trim();
  if (!t || t === "[]" || t === "null") return false;
  if (t.includes("ACCÈS REFUSÉ") || t.includes("ACCES REFUSE")) return t.length > 80;
  return t.length > 8;
};

const incidentSource = (inc) => {
  const desc = (inc.description || inc.desc || "").toLowerCase();
  if (desc.includes("surcharge ram") || desc.includes("ram critique")) return "RAM";
  if (desc.includes("cpu critique") || desc.includes("surcharge cpu")) return "CPU";
  const raw = (inc.source || "").toUpperCase();
  if (raw === "SECURITE") return "Sécurité";
  if (raw === "SYSTEME") return "Système";
  if (raw === "APPLICATION") return "Application";
  if (raw === "IA" || desc.includes("ticket ia")) return "Tickets IA";
  if (raw === "MATERIEL") return desc.includes("cpu") ? "CPU" : "RAM";
  return "Autre";
};

const cleanDesc = (desc) => (desc || "").replace(/^Ticket IA\s*:\s*/i, "").trim();

const loadColor = (n) => (n >= 85 ? STATUS.critical : n >= 70 ? STATUS.warning : STATUS.healthy);
const healthColor = (n) => (n >= 80 ? STATUS.healthy : n >= 50 ? STATUS.warning : STATUS.critical);

function Widget({ title, span, children, action }) {
  return (
    <div className={`parc-widget parc-span-${span}`}>
      <div className="parc-widget-head">
        <h3>{title}</h3>
        {action}
      </div>
      <div className="parc-widget-body">{children}</div>
    </div>
  );
}

const GAUGE_PAD = 16;
const GAUGE_SWEEP = 180 - GAUGE_PAD * 2;

function gaugeTheta(pct) {
  return ((180 - GAUGE_PAD) - (pct / 100) * GAUGE_SWEEP) * (Math.PI / 180);
}

function gaugePoint(cx, cy, r, pct) {
  const theta = gaugeTheta(pct);
  return {
    x: cx + r * Math.cos(theta),
    y: cy - r * Math.sin(theta),
  };
}

function gaugeArc(cx, cy, r, from = 0, to = 100) {
  const a = gaugePoint(cx, cy, r, from);
  const b = gaugePoint(cx, cy, r, to);
  const deg = ((to - from) / 100) * GAUGE_SWEEP;
  const large = deg > 180 ? 1 : 0;
  return `M ${a.x.toFixed(3)} ${a.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(3)} ${b.y.toFixed(3)}`;
}

function Gauge({ value, label, invert = false }) {
  const target = Math.min(100, Math.max(0, Number(value) || 0));
  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);

  useEffect(() => {
    const reduce = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      pctRef.current = target;
      setPct(target);
      return undefined;
    }
    const from = pctRef.current;
    const start = performance.now();
    const duration = 900;
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (target - from) * eased;
      pctRef.current = next;
      setPct(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const color = invert ? loadColor(pct) : healthColor(pct);
  const cx = 100;
  const cy = 108;
  const r = 78;
  const stroke = 12;
  const needleLen = r - stroke / 2 - 2;
  const tip = gaugePoint(cx, cy, needleLen, pct);
  const tail = gaugePoint(cx, cy, -11, pct);
  const cap = gaugePoint(cx, cy, r, pct);
  const nx = (tip.x - cx) / needleLen;
  const ny = (tip.y - cy) / needleLen;
  const px = -ny;
  const py = nx;

  const segs = invert
    ? [
        { start: 0, end: 70, color: STATUS.healthy },
        { start: 70, end: 85, color: STATUS.warning },
        { start: 85, end: 100, color: STATUS.critical },
      ]
    : [
        { start: 0, end: 50, color: STATUS.critical },
        { start: 50, end: 80, color: STATUS.warning },
        { start: 80, end: 100, color: STATUS.healthy },
      ];

  return (
    <div className="parc-gauge">
      <div className="parc-gauge-value" style={{ color }}>{Math.round(pct)}%</div>
      <div className="parc-gauge-stage">
        <svg className="parc-gauge-svg" viewBox="0 0 200 124" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <path d={gaugeArc(cx, cy, r)} fill="none" stroke="var(--bg-muted)" strokeWidth={stroke} strokeLinecap="round" />
          {segs.map((seg) => (
            <path
              key={seg.start}
              d={gaugeArc(cx, cy, r, Math.max(0, seg.start - 0.2), Math.min(100, seg.end + 0.2))}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeLinecap="butt"
            />
          ))}
          <polygon
            points={[
              `${(tip.x + px * 0.2).toFixed(2)},${(tip.y + py * 0.2).toFixed(2)}`,
              `${(cx + px * 2.4).toFixed(2)},${(cy + py * 2.4).toFixed(2)}`,
              `${tail.x.toFixed(2)},${tail.y.toFixed(2)}`,
              `${(cx - px * 2.4).toFixed(2)},${(cy - py * 2.4).toFixed(2)}`,
            ].join(" ")}
            fill="var(--text-primary)"
          />
          <circle cx={cap.x} cy={cap.y} r="4.5" fill={color} stroke="var(--bg-surface)" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="7.5" fill="var(--bg-surface)" stroke="var(--text-primary)" strokeWidth="2.25" />
          <circle cx={cx} cy={cy} r="2.75" fill="var(--text-primary)" />
        </svg>
        <div className="parc-gauge-label">{label}</div>
      </div>
    </div>
  );
}

function DonutChart({ segments, theme, centerSub, size = 148, thickness = 18 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - thickness / 2 - 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, height: "100%" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={theme.border} strokeWidth={thickness} />
        {total > 0 && segments.filter((s) => s.value > 0).map((seg) => {
          const len = (seg.value / total) * circ;
          const el = (
            <circle
              className="parc-donut-seg"
              key={seg.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--text-primary)" fontFamily="Inter, sans-serif">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="var(--text-tertiary)" fontFamily="Inter, sans-serif">{centerSub}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
        {segments.map((seg) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
            <span style={{ color: theme.subtext, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{seg.label}</span>
            <span className="parc-num">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ items, theme, empty = "Aucune donnée" }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return <div className="wd-empty" style={{ padding: "24px 0" }}>{empty}</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item) => (
        <div key={item.label} className="parc-hbar-row">
          <span style={{ fontSize: 12, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
          <div className="parc-track">
            <div className="parc-track-fill" style={{ width: `${(item.value / max) * 100}%`, background: item.color }} />
          </div>
          <span className="parc-num" style={{ fontSize: 12, textAlign: "right" }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function VerticalBars({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div>
      <div className="parc-vbars">
        {items.map((item) => (
          <div key={item.label} className="parc-vbar">
            <span className="parc-num" style={{ fontSize: 11 }}>{item.value}</span>
            <div className="parc-vbar-col">
              <div
                className="parc-vbar-fill"
                style={{ height: `${(item.value / max) * 100}%`, background: item.color }}
              />
            </div>
            <div className="parc-vbar-label">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComboChart({ series }) {
  const n = Math.max(series.length, 1);
  const vbW = 640;
  const vbH = 200;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 36;
  const chartW = vbW - padL - padR;
  const chartH = vbH - padT - padB;
  const groupW = chartW / n;
  const barW = Math.min(14, groupW / 3.2);

  return (
    <div>
      <svg className="parc-combo" viewBox={`0 0 ${vbW} ${vbH}`}>
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padT + chartH * (1 - tick / 100);
          return (
            <g key={tick}>
              <line x1={padL} y1={y} x2={vbW - padR} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
            </g>
          );
        })}
        {series.map((item, i) => {
          const x0 = padL + i * groupW + groupW / 2;
          const cpuH = (Math.min(100, item.cpu) / 100) * chartH;
          const ramH = (Math.min(100, item.ram) / 100) * chartH;
          return (
            <g key={item.label}>
              <rect
                x={x0 - barW - 2}
                y={padT + chartH - cpuH}
                width={barW}
                height={Math.max(cpuH, 1)}
                rx="2"
                fill={STATUS.accent}
              />
              <rect
                x={x0 + 2}
                y={padT + chartH - ramH}
                width={barW}
                height={Math.max(ramH, 1)}
                rx="2"
                fill={STATUS.teal}
              />
              <text
                x={x0}
                y={vbH - 10}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-tertiary)"
                fontFamily="Inter, sans-serif"
              >
                {item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label}
              </text>
            </g>
          );
        })}
        {series.length > 1 && (
          <polyline
            fill="none"
            stroke={STATUS.warning}
            strokeWidth="2"
            points={series.map((item, i) => {
              const x0 = padL + i * groupW + groupW / 2;
              const incH = (Math.min(100, item.incidents * 20) / 100) * chartH;
              const y = padT + chartH - incH;
              return `${x0},${y}`;
            }).join(" ")}
          />
        )}
        {series.map((item, i) => {
          const x0 = padL + i * groupW + groupW / 2;
          const incH = (Math.min(100, item.incidents * 20) / 100) * chartH;
          const y = padT + chartH - incH;
          return <circle key={`p-${item.label}`} cx={x0} cy={y} r="3" fill={STATUS.warning} />;
        })}
      </svg>
      <div className="parc-legend">
        <span><i style={{ background: STATUS.accent }} />CPU</span>
        <span><i style={{ background: STATUS.teal }} />RAM</span>
        <span><i style={{ background: STATUS.warning }} />Incidents ouverts</span>
      </div>
    </div>
  );
}

function RatioBlock({ left, right, pct, color }) {
  return (
    <div>
      <div className="parc-track" style={{ height: 10 }}>
        <div className="parc-track-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      <div className="parc-ratio-nums">
        <div>
          <span>{left.label}</span>
          <div className="wd-metric" style={{ fontSize: 28 }}>{left.value}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span>{right.label}</span>
          <div className="wd-metric" style={{ fontSize: 28, color }}>{right.value}</div>
        </div>
      </div>
    </div>
  );
}

function ProgressRows({ items }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {items.map((item) => (
        <div key={item.label}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
            <span style={{ color: "var(--text-primary)" }}>{item.label}</span>
            <span className="parc-num" style={{ color: "var(--text-secondary)" }}>{item.value}%</span>
          </div>
          <div className="parc-track">
            <div
              className="parc-track-fill"
              style={{
                width: `${Math.min(100, item.value)}%`,
                background: loadColor(item.value)
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StackedBars({ series, theme }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 150, padding: "0 8px" }}>
        {series.map((item) => {
          const total = item.ok + item.bad || 1;
          const okH = (item.ok / total) * 100;
          const badH = (item.bad / total) * 100;
          return (
            <div key={item.label} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <div style={{ height: `${badH}%`, background: STATUS.warning, borderRadius: okH === 0 ? "4px" : "4px 4px 0 0", minHeight: item.bad ? 4 : 0 }} />
                <div style={{ height: `${okH}%`, background: STATUS.healthy, borderRadius: badH === 0 ? "4px" : "0 0 4px 4px", minHeight: item.ok ? 4 : 0 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 18, padding: "8px 8px 0" }}>
        {series.map((item) => (
          <div key={item.label} style={{ flex: 1, textAlign: "center", fontSize: 11, color: theme.subtext }}>{item.label}</div>
        ))}
      </div>
      <div className="parc-legend">
        <span><i style={{ background: STATUS.healthy }} />Conforme</span>
        <span><i style={{ background: STATUS.warning }} />À traiter</span>
      </div>
    </div>
  );
}

export default function ParcOverview({ theme, onViewIncidents, onViewComputers, onViewVulns }) {
  const [computers, setComputers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vulns, setVulns] = useState({ cves: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const [pcsRes, incsRes, vulnRes] = await Promise.all([
        api("/api/computers", { signal }),
        api("/api/incidents", { signal }),
        api("/api/vulnerabilities", { signal }),
      ]);
      const pcs = pcsRes.ok ? await pcsRes.json() : [];
      const incs = incsRes.ok ? await incsRes.json() : [];
      const vuln = vulnRes.ok ? await vulnRes.json() : { cves: [], summary: {} };
      setComputers(Array.isArray(pcs) ? pcs : []);
      setIncidents(Array.isArray(incs) ? incs : []);
      setVulns(vuln && typeof vuln === "object" ? vuln : { cves: [], summary: {} });
      setUpdatedAt(new Date());
    } catch (err) {
      if (err?.name !== "AbortError") console.error("Aperçu parc:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, 10000);

  const stats = useMemo(() => {
    const open = incidents.filter((i) => isOpenStatus(i.status || i.statut));
    const resolved = incidents.filter((i) => isResolved(i.status || i.statut));
    const inProgress = incidents.filter((i) => isInProgress(i.status || i.statut));
    const errorPcs = computers.filter((c) => fleetOf(c) === "offline").length;
    const warnPcs = computers.filter((c) => fleetOf(c) === "warning").length;
    const onlinePcs = computers.filter((c) => fleetOf(c) === "online").length;
    const highInc = open.filter((i) => isHighSeverity(i.severity || i.severite)).length;
    const medInc = open.filter((i) => isMediumSeverity(i.severity || i.severite)).length;
    const lowInc = open.length - highInc - medInc;

    const cpuHot = computers.filter((c) => parseCpu(c) >= 80).length;
    const ramHot = computers.filter((c) => ramPct(c) >= 85).length;

    const bySource = {};
    open.forEach((inc) => {
      const key = incidentSource(inc);
      bySource[key] = (bySource[key] || 0) + 1;
    });

    const problemColors = {
      "Hors ligne": STATUS.critical,
      CPU: STATUS.blue,
      RAM: STATUS.warning,
      Sécurité: STATUS.critical,
      Système: STATUS.blue,
      Application: STATUS.teal,
      "Tickets IA": STATUS.accent,
      Autre: STATUS.muted,
    };

    const problems = [
      { label: "Ordinateurs hors ligne", key: "Hors ligne", value: errorPcs },
      { label: "Charge CPU ≥ 80 %", key: "CPU", value: cpuHot },
      { label: "Charge RAM ≥ 85 %", key: "RAM", value: ramHot },
      { label: "Incidents sécurité", key: "Sécurité", value: bySource["Sécurité"] || 0 },
      { label: "Incidents système", key: "Système", value: bySource["Système"] || 0 },
      { label: "Incidents application", key: "Application", value: bySource["Application"] || 0 },
      { label: "Tickets agent IA", key: "Tickets IA", value: bySource["Tickets IA"] || 0 },
    ]
      .filter((p) => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((p) => ({ ...p, color: problemColors[p.key] || STATUS.muted }));

    const buckets = { online: 0, day: 0, week: 0, old: 0, never: 0 };
    computers.forEach((pc) => {
      const mins = minutesAgo(pc.lastSeen);
      if (mins == null) buckets.never += 1;
      else if (mins < ONLINE_MINUTES) buckets.online += 1;
      else if (mins < 24 * 60) buckets.day += 1;
      else if (mins < 7 * 24 * 60) buckets.week += 1;
      else buckets.old += 1;
    });

    const impact = {};
    open.forEach((inc) => {
      const title = inc.eventId
        ? `${incidentSource(inc)} · Event ${inc.eventId}`
        : (cleanDesc(inc.description || inc.desc) || "Incident").slice(0, 72);
      if (!impact[title]) {
        impact[title] = {
          title,
          pcs: new Set(),
          severity: inc.severity || inc.severite || "Moyenne",
          status: inc.status || "OUVERT",
        };
      }
      impact[title].pcs.add(inc.pcName || inc.pc || inc.machine || "?");
    });
    const impactRows = Object.values(impact)
      .map((row) => ({ ...row, count: row.pcs.size, pcList: [...row.pcs] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const cveRows = (vulns.cves || []).slice(0, 6).map((row) => ({
      cve: row.cve,
      count: row.affectedCount || row.pcs?.length || 0,
      impact: Math.min(100, (row.affectedCount || row.pcs?.length || 1) * 20),
      title: row.title,
      pcs: (row.pcs || []).map((p) => p.name),
    }));

    const cpuVals = computers.map(parseCpu).filter((n) => n > 0);
    const ramVals = computers.map(ramPct).filter((n) => n > 0);
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0);

    const withLogs = computers.filter((c) => hasLog(c.systemLogs) || hasLog(c.appLogs) || hasLog(c.securityLogs)).length;
    const n = computers.length || 1;
    const availability = Math.round((onlinePcs / n) * 100);
    const avgCpu = avg(cpuVals);
    const avgRam = avg(ramVals);
    const cveCount = vulns?.summary?.cveCount || (vulns.cves || []).length || 0;

    const sourceOrder = ["Sécurité", "Système", "Application", "CPU", "RAM", "Tickets IA"];
    const sourceBars = sourceOrder.map((label) => ({
      label,
      value: bySource[label] || 0,
      color: problemColors[label] || STATUS.muted,
    }));

    const now = new Date();
    const weekBars = [...Array(7)].map((_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - idx));
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const value = incidents.filter((inc) => {
        const t = new Date(inc.createdAt || inc.date);
        return !Number.isNaN(t.getTime()) && t >= d && t < next;
      }).length;
      return {
        label: DAYS_FR[d.getDay()],
        value,
        color: value > 0 ? STATUS.blue : STATUS.muted,
      };
    });

    const topPcs = [...computers]
      .map((pc) => ({
        label: pc.name || pc.ip || "PC",
        value: pc.openIncidentCount || 0,
        color: (pc.openIncidentCount || 0) > 0 ? STATUS.critical : STATUS.muted,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .filter((p) => p.value > 0);

    const combo = [...computers]
      .map((pc) => ({
        label: pc.name || pc.ip || "PC",
        cpu: parseCpu(pc),
        ram: ramPct(pc),
        incidents: pc.openIncidentCount || 0,
      }))
      .sort((a, b) => (b.cpu + b.ram) - (a.cpu + a.ram))
      .slice(0, 8);

    return {
      errorPcs,
      warnPcs,
      onlinePcs,
      highInc,
      medInc,
      openCount: open.length,
      resolvedCount: resolved.length,
      totalIncidents: incidents.length,
      totalPcs: computers.length,
      availability,
      avgCpu,
      avgRam,
      cveCount,
      problems,
      topPcs,
      sourceBars,
      weekBars,
      combo,
      connection: [
        { label: "En ligne", value: buckets.online, color: STATUS.healthy },
        { label: "< 1 jour", value: buckets.day, color: STATUS.blue },
        { label: "1 – 7 jours", value: buckets.week, color: STATUS.warning },
        { label: "> 7 jours", value: buckets.old, color: STATUS.critical },
        { label: "Jamais vu", value: buckets.never, color: STATUS.muted },
      ],
      fleet: [
        { label: "Sain", value: onlinePcs, color: STATUS.healthy },
        { label: "Alerte", value: warnPcs, color: STATUS.warning },
        { label: "Hors ligne", value: errorPcs, color: STATUS.critical },
      ],
      incidentStatus: [
        { label: "Ouvert", value: open.length - inProgress.length, color: STATUS.critical },
        { label: "En cours", value: inProgress.length, color: STATUS.warning },
        { label: "Résolu", value: resolved.length, color: STATUS.healthy },
      ],
      severity: [
        { label: "Élevée", value: highInc, color: STATUS.critical },
        { label: "Moyenne", value: medInc, color: STATUS.warning },
        { label: "Faible", value: Math.max(0, lowInc), color: STATUS.healthy },
      ],
      impactRows,
      cveRows,
      loadRows: [
        { label: "CPU moyen du parc", value: avgCpu },
        { label: "RAM moyenne du parc", value: avgRam },
        { label: "Postes CPU critique", value: Math.round((cpuHot / n) * 100) },
        { label: "Postes RAM critique", value: Math.round((ramHot / n) * 100) },
      ],
      components: [
        { label: "Connexion", ok: buckets.online, bad: computers.length - buckets.online },
        { label: "CPU", ok: computers.length - cpuHot, bad: cpuHot },
        { label: "RAM", ok: computers.length - ramHot, bad: ramHot },
        { label: "Journaux", ok: withLogs, bad: computers.length - withLogs },
      ],
    };
  }, [computers, incidents, vulns]);

  const menuBtn = (
    <button type="button" onClick={load} title="Actualiser" className="wd-btn-ghost">⋮</button>
  );

  if (loading && computers.length === 0) {
    return (
      <div className="parc-overview wd-empty" style={{ padding: "80px 0" }}>
        Chargement de l’aperçu du parc…
      </div>
    );
  }

  return (
    <div className="parc-overview">
      <div className="wd-page-header">
        <div>
          <h1 className="wd-page-title">Aperçu général du parc</h1>
          <p className="wd-page-sub">
            Contrôle du parc — {computers.length} ordinateur{computers.length > 1 ? "s" : ""} · {stats.openCount} incident{stats.openCount > 1 ? "s" : ""} ouvert{stats.openCount > 1 ? "s" : ""}
          </p>
        </div>
        {updatedAt && (
          <span className="wd-page-meta">
            MAJ {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      <div className="parc-kpis">
        <div className="parc-kpi" onClick={onViewComputers} role="button" tabIndex={0}>
          <div className="parc-kpi-label">Postes</div>
          <div className="wd-metric">{stats.totalPcs}</div>
          <div className="parc-track"><div className="parc-track-fill" style={{ width: "100%", background: STATUS.muted }} /></div>
        </div>
        <div className="parc-kpi is-healthy" onClick={onViewComputers} role="button" tabIndex={0}>
          <div className="parc-kpi-label">En ligne</div>
          <div className="wd-metric">{stats.onlinePcs}</div>
          <div className="parc-track">
            <div className="parc-track-fill" style={{ width: `${stats.availability}%`, background: STATUS.healthy }} />
          </div>
        </div>
        <div className="parc-kpi is-critical" onClick={onViewComputers} role="button" tabIndex={0}>
          <div className="parc-kpi-label">Hors ligne</div>
          <div className="wd-metric">{stats.errorPcs}</div>
          <div className="parc-track">
            <div className="parc-track-fill" style={{ width: `${stats.totalPcs ? (stats.errorPcs / stats.totalPcs) * 100 : 0}%`, background: STATUS.critical }} />
          </div>
        </div>
        <div className="parc-kpi is-warning" onClick={onViewIncidents} role="button" tabIndex={0}>
          <div className="parc-kpi-label">Incidents ouverts</div>
          <div className="wd-metric">{stats.openCount}</div>
          <div className="parc-track">
            <div className="parc-track-fill" style={{ width: `${stats.totalIncidents ? (stats.openCount / stats.totalIncidents) * 100 : 0}%`, background: STATUS.warning }} />
          </div>
        </div>
        <div className="parc-kpi is-critical" onClick={onViewVulns} role="button" tabIndex={0}>
          <div className="parc-kpi-label">CVE</div>
          <div className="wd-metric">{stats.cveCount}</div>
          <div className="parc-track">
            <div className="parc-track-fill" style={{ width: `${Math.min(100, stats.cveCount * 10)}%`, background: STATUS.critical }} />
          </div>
        </div>
        <div className={`parc-kpi${stats.avgCpu >= 80 ? " is-critical" : stats.avgCpu >= 70 ? " is-warning" : ""}`} onClick={onViewComputers} role="button" tabIndex={0}>
          <div className="parc-kpi-label">CPU moyen</div>
          <div className="wd-metric">{stats.avgCpu}%</div>
          <div className="parc-track">
            <div className="parc-track-fill" style={{ width: `${stats.avgCpu}%`, background: loadColor(stats.avgCpu) }} />
          </div>
        </div>
      </div>

      <div className="parc-gauges">
        <div className="parc-widget parc-gauge-card">
          <div className="parc-widget-head"><h3>Santé du parc</h3></div>
          <div className="parc-widget-body">
            <Gauge value={stats.availability} label="Disponibilité (postes en ligne)" />
          </div>
        </div>
        <div className="parc-widget parc-gauge-card">
          <div className="parc-widget-head"><h3>Charge CPU</h3></div>
          <div className="parc-widget-body">
            <Gauge value={stats.avgCpu} invert label="Moyenne du parc" />
          </div>
        </div>
        <div className="parc-widget parc-gauge-card">
          <div className="parc-widget-head"><h3>Charge RAM</h3></div>
          <div className="parc-widget-body">
            <Gauge value={stats.avgRam} invert label="Moyenne du parc" />
          </div>
        </div>
      </div>

      <div className="parc-grid">
        <Widget title="État du parc" span={4}>
          <DonutChart segments={stats.fleet} theme={theme} centerSub="postes" size={132} />
        </Widget>

        <Widget title="État des incidents" span={4}>
          <DonutChart segments={stats.incidentStatus} theme={theme} centerSub="tickets" size={132} />
        </Widget>

        <Widget title="Gravité des incidents" span={4}>
          <DonutChart segments={stats.severity} theme={theme} centerSub="ouverts" size={132} />
        </Widget>

        <Widget title="Principaux problèmes du parc" span={6} action={menuBtn}>
          <HorizontalBars items={stats.problems} theme={theme} empty="Aucun problème détecté" />
        </Widget>

        <Widget title="Postes les plus impactés" span={6}>
          <HorizontalBars items={stats.topPcs} theme={theme} empty="Aucun poste en alerte" />
        </Widget>

        <Widget title="Incidents par source" span={6}>
          <VerticalBars items={stats.sourceBars} />
        </Widget>

        <Widget title="Incidents des 7 derniers jours" span={6}>
          <VerticalBars items={stats.weekBars} />
        </Widget>

        <Widget title="CPU et RAM par poste" span={8}>
          {stats.combo.length === 0 ? (
            <div className="wd-empty" style={{ padding: "20px 0" }}>Aucun poste à afficher</div>
          ) : (
            <ComboChart series={stats.combo} />
          )}
        </Widget>

        <Widget title="Disponibilité du parc" span={4}>
          <RatioBlock
            pct={stats.availability}
            color={healthColor(stats.availability)}
            left={{ label: "Postes", value: stats.totalPcs }}
            right={{ label: "En ligne", value: stats.onlinePcs }}
          />
        </Widget>

        <Widget title="État de la connexion" span={4}>
          <DonutChart segments={stats.connection} theme={theme} centerSub="postes" size={132} />
        </Widget>

        <Widget title="Charge matérielle" span={4}>
          <ProgressRows items={stats.loadRows} />
        </Widget>

        <Widget title="État des composants" span={4}>
          <StackedBars series={stats.components} theme={theme} />
        </Widget>

        <Widget title="Incidents actifs ayant le plus d’impact" span={6} action={
          <button type="button" onClick={onViewIncidents} className="wd-btn-link">Voir tout</button>
        }>
          {stats.impactRows.length === 0 ? (
            <div className="wd-empty" style={{ padding: "20px 0" }}>Aucun incident ouvert</div>
          ) : (
            <div>
              <div className="parc-table-head" style={{ gridTemplateColumns: "1fr 90px 80px" }}>
                <span>Incident</span>
                <span>Postes</span>
                <span>Statut</span>
              </div>
              {stats.impactRows.map((row) => (
                <div
                  key={row.title}
                  className="parc-table-row"
                  onClick={() => {
                    const name = row.pcList[0];
                    if (name && name !== "?") {
                      window.dispatchEvent(new CustomEvent("watchdeskOpenComputer", { detail: { name } }));
                    } else if (onViewIncidents) onViewIncidents();
                  }}
                  style={{ gridTemplateColumns: "1fr 90px 80px" }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</span>
                  <span className="parc-num">{row.count}</span>
                  <span className="wd-badge is-warning">Ouvert</span>
                </div>
              ))}
            </div>
          )}
        </Widget>

        <Widget title="Principales vulnérabilités (CVE)" span={6} action={
          <button type="button" onClick={onViewVulns} className="wd-btn-link">Voir tout</button>
        }>
          {stats.cveRows.length === 0 ? (
            <div className="wd-empty" style={{ padding: "20px 0" }}>
              Aucune CVE pour l’instant. Ouvrez Vulnérabilités après avoir relancé l’agent.
            </div>
          ) : (
            <div>
              <div className="parc-table-head" style={{ gridTemplateColumns: "1fr 88px 70px" }}>
                <span>CVE</span>
                <span>Postes</span>
                <span>Impact</span>
              </div>
              {stats.cveRows.map((row) => (
                <div
                  key={row.cve}
                  className="parc-table-row"
                  onClick={onViewVulns}
                  style={{ gridTemplateColumns: "1fr 88px 70px" }}
                >
                  <span className="wd-mono" style={{ fontSize: 12 }}>{row.cve}</span>
                  <span className="wd-badge is-critical">{row.count}</span>
                  <span className="parc-num" style={{ color: "var(--status-warning)" }}>{row.impact}%</span>
                </div>
              ))}
            </div>
          )}
        </Widget>
      </div>
    </div>
  );
}
