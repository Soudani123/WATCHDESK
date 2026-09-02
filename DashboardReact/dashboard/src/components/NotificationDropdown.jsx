import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';

export default function NotificationDropdown({ theme, dark }) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Charger les incidents récents comme notifications
    useEffect(() => {
        fetchNotifications();
    }, []);

    // Fermer le dropdown quand on clique à l'extérieur
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = () => {
        setLoading(true);
        api("/api/incidents")
            .then(res => res.json())
            .then(data => {
                // Ne garder que les notifications non lues ou récentes (ex: les 10 derniers)
                const formatted = data.slice(0, 10).map(inc => ({
                    id: inc.id,
                    title: inc.pcName || inc.pc || "Système",
                    message: (inc.description || inc.desc || "").replace(/^Ticket IA\s*:\s*/i, ""),
                    isIa: (inc.description || inc.desc || "").toLowerCase().includes("ticket ia"),
                    severity: inc.severity || inc.severite || "ÉLEVÉE",
                    date: inc.createdAt || inc.date,
                    read: false
                }));
                setNotifications(formatted);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erreur notifications:", err);
                setLoading(false);
            });
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
            {/* Bouton Cloche avec indicateur */}
            <button
                onClick={() => setOpen(!open)}
                style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border: `1px solid ${theme?.border || '#E2E8F0'}`,
                    background: theme?.card || '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s'
                }}
            >
                {/* Icône Cloche SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme?.text || '#1E293B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>

                {/* Badge Rouge (nombre non lus) */}
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: '#EF4444',
                        border: `2px solid ${theme?.card || '#FFFFFF'}`
                    }} />
                )}
            </button>

            {/* Panneau Déroulant */}
            {open && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: 360,
                    maxHeight: 450,
                    background: theme?.card || '#FFFFFF',
                    border: `1px solid ${theme?.border || '#E2E8F0'}`,
                    borderRadius: 14,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Header de la fenêtre */}
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: `1px solid ${theme?.border || '#F1F5F9'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: dark ? '#0F172A' : '#FAFAFA'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: theme?.text || '#0F172A' }}>Notifications</span>
                            {unreadCount > 0 && (
                                <span style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    background: '#EFF6FF',
                                    color: '#2563EB',
                                    padding: '2px 8px',
                                    borderRadius: 10
                                }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#2563EB',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>

                    {/* Liste des notifications */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {loading && (
                            <div style={{ padding: 20, textAlign: 'center', color: theme?.subtext, fontSize: 13 }}>Chargement...</div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div style={{ padding: 30, textAlign: 'center', color: theme?.subtext, fontSize: 13 }}>
                                Aucune notification
                            </div>
                        )}

                        {!loading && notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => markAsRead(notif.id)}
                                style={{
                                    padding: '12px 16px',
                                    borderBottom: `1px solid ${theme?.border || '#F1F5F9'}`,
                                    background: notif.read ? 'transparent' : (dark ? 'rgba(37, 99, 235, 0.08)' : '#F8FAFC'),
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                    display: 'flex',
                                    gap: 12,
                                    alignItems: 'flex-start'
                                }}
                            >
                                {/* Puce d'état */}
                                <span style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    marginTop: 6,
                                    flexShrink: 0,
                                    background: notif.read ? 'transparent' : '#2563EB'
                                }} />

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: theme?.text || '#0F172A' }}>
                                                {notif.title}
                                            </span>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                padding: '1px 6px',
                                                borderRadius: 4,
                                                background: notif.isIa ? '#EEF2FF' : '#F1F5F9',
                                                color: notif.isIa ? '#4F46E5' : '#475569'
                                            }}>
                                                {notif.isIa ? 'IA' : 'SYS'}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 11, color: theme?.subtext || '#94A3B8' }}>
                                            {formatDate(notif.date)}
                                        </span>
                                    </div>
                                    <p style={{
                                        margin: 0,
                                        fontSize: 12,
                                        color: theme?.subtext || '#475569',
                                        lineHeight: '1.4',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {notif.message}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}