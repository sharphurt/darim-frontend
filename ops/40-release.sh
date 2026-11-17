#!/bin/sh
set -eu
# Coolify provides SOURCE_COMMIT at runtime. It is public version metadata.
commit=${SOURCE_COMMIT:-unknown}
if ! printf '%s' "$commit" | grep -Eq '^[a-f0-9]{40}$'; then commit=unknown; fi
printf '{"commit":"%s"}\n' "$commit" > /usr/share/nginx/html/frontend-release.json
