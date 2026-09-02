/**
 * Messager unique WatchDesk — une seule adresse serveur, token JWT joint automatiquement.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";

export function getToken() {
  const direct = localStorage.getItem("watchdesk_token");
  if (direct) return direct;
  try {
    const saved = localStorage.getItem("watchdesk_user");
    if (!saved) return null;
    return JSON.parse(saved)?.token || null;
  } catch {
    return null;
  }
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
    // Base64 pour éviter les problèmes d'encodage dans les headers HTTP
    return btoa(unescape(encodeURIComponent(payload)));
  } catch {
    return null;
  }
}

export function saveSession(data) {
  if (data?.token) {
    localStorage.setItem("watchdesk_token", data.token);
  }
  localStorage.setItem("watchdesk_user", JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem("watchdesk_token");
  localStorage.removeItem("watchdesk_user");
}

/**
 * @param {string} path - ex. "/api/computers" ou URL absolue
 * @param {RequestInit & { skipAuth?: boolean }} [options]
 * @returns {Promise<Response>}
 */
export async function api(path, options = {}) {
  const { skipAuth = false, headers: customHeaders = {}, ...rest } = options;

  const headers = { ...customHeaders };

  const hasBody = rest.body != null && !(rest.body instanceof FormData);
  if (hasBody && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const userHeader = getUserHeaderValue();
    if (userHeader) {
      headers["X-WatchDesk-User"] = userHeader;
    }
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, { ...rest, headers });

  // Badge expiré / non autorisé → retour login (sauf appels auth)
  if (res.status === 401 && !skipAuth) {
    clearSession();
    window.location.reload();
  }

  return res;
}
