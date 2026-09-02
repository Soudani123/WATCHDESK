import React, { useState } from 'react';
import { api } from '../lib/api';

export default function ComputerActions({ targetIp, userRole = "SUPER_ADMIN" }) {
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState({ open: false, action: null, title: "", color: "" });
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState(null);

  if (userRole !== "SUPER_ADMIN") {
    return <p className="text-sm text-gray-500">Droits insuffisants pour contrôler cette machine.</p>;
  }

  const openConfirmation = (action, title, color) => {
    setReason("");
    setModalConfig({ open: true, action, title, color });
  };

  const executeAction = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const response = await api(`/api/agent/trigger-action/${targetIp}`, {
        method: "POST",
        body: JSON.stringify({
          action: modalConfig.action,
          message: reason || "Action exécutée par le Super Admin"
        })
      });

      if (response.ok) {
        setFeedback({ type: "success", text: `Ordre '${modalConfig.title}' envoyé avec succès !` });
      } else {
        setFeedback({ type: "error", text: "Erreur lors de l'envoi de l'ordre au serveur." });
      }
    } catch (err) {
      setFeedback({ type: "error", text: "Impossible de joindre le serveur API." });
    } finally {
      setLoading(false);
      setModalConfig({ open: false, action: null, title: "", color: "" });
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-md border border-gray-200">
      <h3 className="font-bold text-gray-800 mb-3">Actions Administrateur (IP: {targetIp})</h3>

      {feedback && (
        <div className={`p-3 rounded text-sm mb-3 ${feedback.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {feedback.text}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Bouton Mise à jour */}
        <button
          onClick={() => openConfirmation("SCHEDULE_UPDATE", "Mise à jour Windows", "bg-blue-600")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition"
        >
          🔄 Proposer Mise à jour
        </button>

        {/* Bouton Redémarrer */}
        <button
          onClick={() => openConfirmation("RESTART", "Redémarrage Forcé", "bg-amber-600")}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow-sm transition"
        >
          ⚠️ Redémarrer le PC
        </button>

        {/* Bouton Éteindre */}
        <button
          onClick={() => openConfirmation("SHUTDOWN", "Arrêt Forcé", "bg-red-600")}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition"
        >
          🛑 Éteindre le PC
        </button>
      </div>

      {/* Modal de confirmation */}
      {modalConfig.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Confirmer : {modalConfig.title}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Êtes-vous sûr de vouloir exécuter cette action à distance sur la machine <span className="font-semibold">{targetIp}</span> ?
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1">Raison de l'action (envoyée au PC) :</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Surchauffe processeur / Incident critique"
              className="w-full p-2 border border-gray-300 rounded-md text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setModalConfig({ open: false, action: null, title: "", color: "" })}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium"
              >
                Annuler
              </button>
              <button
                onClick={executeAction}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-md text-sm font-medium ${modalConfig.color} disabled:opacity-50`}
              >
                {loading ? "Envoi en cours..." : "Valider et Exécuter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
