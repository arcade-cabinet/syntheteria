#!/usr/bin/env bash
# Run Maestro E2E: native (iOS) and/or web.
# All settings from config or env — no hardcoded ports or devices.
# See config/README.md and config/e2e.example.json.

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# Load E2E config: config/e2e.json (gitignored) or env. Env overrides config.
load_e2e_config() {
	if [ -f "config/e2e.json" ]; then
		# Node is available in the project
		cfg_web_url="$(node -e "
			try {
				const c = require('./config/e2e.json');
				if (c.webUrl) console.log(c.webUrl);
			} catch (_) {}
		" 2>/dev/null)"
		cfg_ios_device="$(node -e "
			try {
				const c = require('./config/e2e.json');
				if (c.iosDevice) console.log(c.iosDevice);
			} catch (_) {}
		" 2>/dev/null)"
		[ -n "$cfg_web_url" ] && export MAESTRO_WEB_URL="${MAESTRO_WEB_URL:-$cfg_web_url}"
		[ -n "$cfg_ios_device" ] && export E2E_IOS_DEVICE="${E2E_IOS_DEVICE:-$cfg_ios_device}"
	fi
}
load_e2e_config

RUN_NATIVE=false
RUN_WEB=false
while [[ $# -gt 0 ]]; do
  case $1 in
    --native) RUN_NATIVE=true; shift ;;
    --web)    RUN_WEB=true; shift ;;
    --all)    RUN_NATIVE=true; RUN_WEB=true; shift ;;
    *)        echo "Usage: $0 [--native|--web|--all]"; exit 1 ;;
  esac
done

if ! $RUN_NATIVE && ! $RUN_WEB; then
  echo "Choose: --native, --web, or --all"
  exit 1
fi

if $RUN_NATIVE; then
  echo "=== Maestro native (iOS) ==="
  maestro test --platform ios maestro/
fi

if $RUN_WEB; then
  if [ -z "${MAESTRO_WEB_URL:-}" ]; then
    echo "Set MAESTRO_WEB_URL or create config/e2e.json with webUrl (see config/e2e.example.json)."
    exit 1
  fi
  echo "=== Maestro web (MAESTRO_WEB_URL=$MAESTRO_WEB_URL) ==="
  echo "Ensure the app is serving at $MAESTRO_WEB_URL (e.g. pnpm dev)"
  maestro test maestro/flows/title-web.yaml
fi
