import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { QRCodeSVG } from "qrcode.react";
import { api, saveSession } from "../lib/api";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const persist = (data) => {
    saveSession(data);
    onLoginSuccess(data);
  };

  // Un mot de passe (ou un jeton Google) valide ne donne pas de session :
  // le serveur renvoie un challenge, la session arrive après le code à 6 chiffres.
  const handleAuthResponse = (data) => {
    if (data?.token) {
      persist(data);
      return;
    }
    setCode("");
    setChallenge(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Une erreur est survenue.");
      }
      handleAuthResponse(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setBusy(true);
    try {
      const res = await api("/api/auth/google", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ idToken: credentialResponse.credential })
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Échec de l'authentification Google.");
      }
      handleAuthResponse(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api("/api/auth/2fa/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ challengeId: challenge.challengeId, code })
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Code incorrect.");
      }
      persist(await res.json());
    } catch (err) {
      setError(err.message);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const cancelTwoFactor = () => {
    setChallenge(null);
    setCode("");
    setError("");
    setPassword("");
  };

  if (challenge) {
    const setup = challenge.setupRequired;
    return (
      <div className="wd-login">
        <div className={`wd-login-card${setup ? " is-wide" : ""}`}>
          <h1>{setup ? "Activer la double authentification" : "Vérification en deux étapes"}</h1>
          <p>
            {setup
              ? "Scannez ce QR code avec Google Authenticator ou Microsoft Authenticator, puis saisissez le code affiché."
              : `Saisissez le code à 6 chiffres de votre application d'authentification pour ${challenge.email}.`}
          </p>

          {error && <div className="wd-alert is-critical">{error}</div>}

          {setup && (
            <div className="wd-2fa-qr">
              <QRCodeSVG value={challenge.otpauthUri} size={190} level="M" includeMargin />
              <div className="wd-2fa-secret">
                <span className="wd-label">Clé manuelle</span>
                <code>{challenge.secret}</code>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: 20 }}>
              <label className="wd-label">Code à 6 chiffres</label>
              <input
                className="wd-input wd-2fa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              className="wd-btn wd-btn-primary"
              style={{ width: "100%", height: 40 }}
              disabled={busy || code.length !== 6}
            >
              {setup ? "Activer et se connecter" : "Vérifier"}
            </button>
          </form>

          <button type="button" className="wd-btn wd-btn-ghost wd-2fa-back" onClick={cancelTwoFactor}>
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wd-login">
      <div className="wd-login-card">
        <h1>WatchDesk</h1>
        <p>Connexion réservée aux comptes créés par le Super Admin.</p>

        {error && <div className="wd-alert is-critical">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="wd-label">Email</label>
            <input
              className="wd-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label className="wd-label">Mot de passe</label>
            <input
              className="wd-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="wd-btn wd-btn-primary"
            style={{ width: "100%", height: 40 }}
            disabled={busy}
          >
            Se connecter
          </button>
        </form>

        <div className="wd-divider">OU</div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Échec de la connexion Google")}
          />
        </div>
      </div>
    </div>
  );
}
