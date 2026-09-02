export const THEME_KEY = "watchdesk_theme";

/** CSS-variable theme object so existing inline styles follow tokens. */
export const cssTheme = {
  bg: "var(--bg-canvas)",
  sidebar: "var(--bg-sidebar)",
  card: "var(--bg-surface)",
  text: "var(--text-primary)",
  subtext: "var(--text-secondary)",
  border: "var(--border-subtle)",
};

export const statusColor = {
  critical: "var(--status-critical)",
  warning: "var(--status-warning)",
  healthy: "var(--status-healthy)",
  muted: "var(--text-tertiary)",
};

export function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}

export function applyTheme(dark) {
  const value = dark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", value);
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}
