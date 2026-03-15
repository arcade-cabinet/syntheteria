# E2E configuration

E2E tests (Maestro) are fully configurable. No ports or device names are hardcoded in flows or scripts.

## Config file

- **`e2e.example.json`** — Example; copy to **`e2e.json`** (gitignored) and edit.
- **`e2e.json`** — Local overrides; not committed. Keys:
  - **`webUrl`** — Full URL for Maestro web flows (e.g. `http://localhost:5173` for Vite). Exported as `MAESTRO_WEB_URL`.
  - **`iosDevice`** — Optional. Device name or UDID for Capacitor iOS when targeting a specific simulator. Omit or `null` for default.

## Environment overrides

Env vars override config file values:

| Env var | Overrides | Used by |
|--------|-----------|--------|
| `MAESTRO_WEB_URL` | `webUrl` | Maestro web flows (`url` in YAML) |
| `E2E_IOS_DEVICE` | `iosDevice` | `scripts/run-maestro-e2e.sh` when starting iOS build |

## Usage

1. Copy `e2e.example.json` → `e2e.json`; default `webUrl` is `http://localhost:5173` (Vite).
2. For web: start the app with `pnpm dev`, then run Maestro web flows. The run script exports `MAESTRO_WEB_URL` from config or env.
3. For native: `pnpm build && pnpm cap:sync` then run on simulator/emulator; use `E2E_IOS_DEVICE` or `iosDevice` only if targeting a specific device.
