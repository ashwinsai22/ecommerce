#!/bin/sh
set -e

# ==============================================================================
# Runtime Environment Variable Injection for SPA (Vite / React)
# Overwrites /usr/share/nginx/html/env-config.js with active container environment variables.
# ==============================================================================

TARGET_FILE="/usr/share/nginx/html/env-config.js"

echo "==> [Runtime Config] Writing environment variables to ${TARGET_FILE}..."

cat <<EOF > "${TARGET_FILE}"
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL:-}"
};
EOF

echo "==> [Runtime Config] Successfully injected VITE_API_URL='${VITE_API_URL:-}'"
