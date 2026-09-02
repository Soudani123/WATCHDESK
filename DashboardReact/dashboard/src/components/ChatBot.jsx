import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../lib/api";

const SUGGESTIONS = [
  "Affiche les PC hors ligne",
  "PC sans la dernière mise à jour Windows",
  "Résume l'incident ouvert le plus critique",
];

export default function ChatBot() {
  const [messages, setMessages] = useState([
    { text: "Bonjour ! Je suis WatchDesk AI. Posez une question sur le parc, les incidents ou une CVE.", isBot: true }
  ]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async (text) => {
    const currentInput = (text || "").trim();
    if (!currentInput || loadingRef.current) return;

    loadingRef.current = true;
    const userMsg = { text: currentInput, isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api("/api/chat/ask", {
        method: "POST",
        body: JSON.stringify({ message: currentInput })
      });

      const data = await res.json();
      setMessages((prev) => [...prev, {
        text: data.reply || "Pas de réponse.",
        isBot: true,
        data: data.data || null,
      }]);

      window.dispatchEvent(new Event("incidentCreated"));
    } catch (err) {
      setMessages((prev) => [...prev, { text: "Impossible de contacter l'IA du serveur.", isBot: true }]);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    await sendText(input);
  };

  useEffect(() => {
    const onAskAi = (event) => {
      const message = event.detail?.message;
      if (!message) return;
      setIsOpen(true);
      sendText(message);
    };
    window.addEventListener("watchdeskAskAi", onAskAi);
    return () => window.removeEventListener("watchdeskAskAi", onAskAi);
  }, []);

  return (
    <div className="wd-chat">
      {isOpen && (
        <div className="wd-chat-panel" style={{ marginBottom: 12 }}>
          <div className="wd-chat-head">
            <span>Assistant Intelligent WatchDesk</span>
            <button type="button" className="wd-icon-btn" onClick={() => setIsOpen(false)} aria-label="Fermer">
              ×
            </button>
          </div>
          <div className="wd-chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`wd-chat-bubble${m.isBot ? " is-bot" : " is-user"}`}>
                {m.isBot ? (
                  <>
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p style={{ margin: "8px 0" }} {...props} />,
                        ul: ({ node, ...props }) => <ul style={{ margin: "8px 0", paddingLeft: 20 }} {...props} />,
                        ol: ({ node, ...props }) => <ol style={{ margin: "8px 0", paddingLeft: 20 }} {...props} />,
                        li: ({ node, ...props }) => <li style={{ margin: "4px 0" }} {...props} />,
                        code: ({ node, ...props }) => <code className="wd-mono" style={{ background: "var(--bg-canvas)", padding: "2px 5px", borderRadius: 4 }} {...props} />,
                      }}
                    >
                      {m.text}
                    </ReactMarkdown>
                    {m.data?.rows?.length > 0 && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border-subtle)", fontSize: 11 }}>
                        {m.data.title && (
                          <div style={{ padding: "6px 8px", background: "var(--bg-canvas)", fontWeight: 600, color: "var(--text-secondary)" }}>
                            {m.data.title} ({m.data.rows.length})
                          </div>
                        )}
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            {m.data.rows.slice(0, 12).map((row, ri) => (
                              <tr key={ri} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                <td style={{ padding: "5px 8px", fontWeight: 600 }}>{row.name}</td>
                                <td style={{ padding: "5px 8px", color: "var(--text-secondary)" }}>{row.ip}</td>
                                <td style={{ padding: "5px 8px", color: "var(--text-secondary)" }}>{row.detail}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  m.text
                )}
              </div>
            ))}
            {loading && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>L'IA réfléchit...</div>}
            <div ref={scrollRef} />
          </div>

          {!loading && messages.length <= 2 && (
            <div style={{ padding: "0 12px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => sendText(s)}
                  className="wd-btn"
                  style={{ height: "auto", padding: "6px 10px", fontSize: 11, textAlign: "left" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: 12, borderTop: "1px solid var(--border-subtle)", display: "flex", gap: 8 }}>
            <input
              className="wd-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ex: PC hors ligne, résumé #12…"
              disabled={loading}
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading}
              className="wd-btn wd-btn-primary"
              aria-label="Envoyer"
            >
              {loading ? "..." : "Envoyer"}
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="wd-chat-fab"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Fermer l'assistant" : "Ouvrir l'assistant"}
      >
        {isOpen ? "×" : "💬"}
      </button>
    </div>
  );
}
