import React, { useState, useEffect, useRef } from "react";
import { Moon, Sun, Bell, CircleHelp, LogOut } from "lucide-react";
import { api } from "../lib/api";
import { usePolling } from "../hooks/usePolling";

export default function Topbar({ dark, setDark, onLogout }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const READ_KEY = "watchdesk_notif_read";
  const loadReadIds = () => {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || "[]"); } catch { return []; }
  };
  const saveReadIds = (ids) => localStorage.setItem(READ_KEY, JSON.stringify(ids));

  usePolling(async (signal) => {
    try {
      const res = await api("/api/incidents", { signal });
      const data = await res.json();
      let readIds = [];
      try { readIds = JSON.parse(localStorage.getItem(READ_KEY) || "[]"); } catch { readIds = []; }
      const formatted = (Array.isArray(data) ? data : []).slice(0, 12).map((inc, i) => ({
        id: inc.id || i,
        title: inc.pcName || inc.pc || inc.machine || "Système",
        desc: (inc.description || inc.desc || "").replace(/^Ticket IA\s*:\s*/i, ""),
        isIa: (inc.description || inc.desc || "").toLowerCase().includes("ticket ia"),
        time: inc.createdAt || inc.date,
        read: readIds.includes(inc.id)
      }));
      setNotifications(formatted);
    } catch (err) {
      if (err?.name !== "AbortError") console.error("Erreur chargement notifs:", err);
    }
  }, 15000);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    saveReadIds([...new Set([...loadReadIds(), ...notifications.map((n) => n.id)])]);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id) => {
    saveReadIds([...new Set([...loadReadIds(), id])]);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const openNotif = (n) => {
    markRead(n.id);
    setShowNotifs(false);
    window.dispatchEvent(new CustomEvent("watchdeskOpenIncident", { detail: { id: n.id } }));
  };

  const formattedDate = currentDateTime.toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  const formattedTime = currentDateTime.toLocaleTimeString("fr-FR");
  const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  return (
    <div className="wd-topbar">
      <div className="wd-topbar-actions">
        <span className="wd-topbar-clock">
          {capitalizedDate} à {formattedTime}
        </span>

        <button
          type="button"
          className="wd-icon-btn wd-theme-btn"
          onClick={() => setDark(!dark)}
        >
          {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
          <span>{dark ? "Clair" : "Sombre"}</span>
        </button>

        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            type="button"
            className={`wd-icon-btn${showNotifs ? " is-active" : ""}`}
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={1.75} />
            {unreadCount > 0 && <span className="wd-dot" />}
          </button>

          {showNotifs && (
            <div className="wd-popover">
              <div className="wd-popover-head">
                <span className="wd-popover-title">
                  Notifications {unreadCount > 0 && `(${unreadCount})`}
                </span>
                {unreadCount > 0 && (
                  <button type="button" className="wd-btn-link" onClick={markAllRead}>
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="wd-popover-body">
                {notifications.length === 0 ? (
                  <div className="wd-empty">Aucune notification récente</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`wd-notif${n.read ? " is-read" : " is-unread"}`}
                      onClick={() => openNotif(n)}
                    >
                      <span className="wd-notif-dot" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {n.title}
                          </span>
                          <span className={`wd-badge${n.isIa ? " is-accent" : ""}`}>
                            {n.isIa ? "IA" : "SYS"}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {n.desc}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button type="button" className="wd-icon-btn" aria-label="Aide">
          <CircleHelp size={16} strokeWidth={1.75} />
        </button>

        <button
          type="button"
          className="wd-icon-btn wd-icon-btn-logout"
          onClick={onLogout}
          title="Se déconnecter"
          aria-label="Se déconnecter"
        >
          <LogOut size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
