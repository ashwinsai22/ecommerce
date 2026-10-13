/**
 * Central API Configuration with Runtime & Build-time resolution.
 *
 * Priority order:
 * 1. window.__ENV__.VITE_API_URL (Runtime injected via Kubernetes/Docker container)
 * 2. import.meta.env.VITE_API_URL (Local development via client/.env)
 * 3. "" (Relative URL fallback, e.g. /api/...)
 */
export const getApiUrl = () => {
  if (typeof window !== "undefined" && window.__ENV__ && window.__ENV__.VITE_API_URL) {
    return window.__ENV__.VITE_API_URL.replace(/\/$/, "");
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, "");
  }
  return "";
};

export const API_BASE_URL = getApiUrl();
