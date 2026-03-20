# Maestro E2E tests

Flows live in `flows/*.yaml`. Run with Maestro CLI.

## Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

See [Maestro docs](https://maestro.mobile.dev/docs/getting-started).

## Configuration (no hardcoded ports or devices)

All E2E settings are configurable. **No ports or simulator names are hardcoded in flows or scripts.**

- **Config file:** Copy `config/e2e.example.json` to `config/e2e.json` (gitignored). Set `webUrl` to `http://localhost:5173` for web flows (Vite default); optionally `iosDevice` for Capacitor iOS when targeting a specific simulator.
- **Env overrides:** `MAESTRO_WEB_URL` overrides `webUrl`; `E2E_IOS_DEVICE` overrides `iosDevice`. See [config/README.md](../config/README.md).

## Prerequisites

**Native (iOS/Android):** Maestro launches the app by `appId` (`com.arcadecabinet.syntheteria`). You must have a **development build** installed on the target simulator or emulator:

- **iOS:** Build and run: `pnpm build && pnpm cap:sync && pnpm cap:ios`. To target a specific device, set `E2E_IOS_DEVICE` or `iosDevice` in `config/e2e.json`. Run Maestro with `maestro test --platform ios maestro/`.
- **Android:** `pnpm build && pnpm cap:sync && pnpm cap:android`, then `maestro test --platform android maestro/`.

**Helper script:** From repo root, `scripts/run-maestro-e2e.sh --web` (web only), `--native` (iOS only), or `--all`. The script loads `config/e2e.json` and exports `MAESTRO_WEB_URL` for web flows; for web you must have the app running at that URL (`pnpm dev` serves on 5173).

Verify on **both** platforms before release; do not rely on iOS-only (or Android-only) E2E runs.

**Web:** Web flows use `url: ${MAESTRO_WEB_URL}`. Set `MAESTRO_WEB_URL=http://localhost:5173` (or `webUrl` in `config/e2e.json`). Start the app with `pnpm dev` (Vite, port 5173), then run the script or `maestro test -e MAESTRO_WEB_URL=http://localhost:5173 maestro/flows/title-web.yaml`.

If no app is installed and you run `maestro test maestro/`, you will see:

```
[Failed] title (0s) (Unable to launch app com.arcadecabinet.syntheteria)
```

## Run flows

From repo root:

```bash
maestro test maestro/
```

Or from this directory:

```bash
maestro test .
```

**Test both iOS and Android:** Run flows on each platform so regressions are caught on both. Use `--platform` to target a specific device type when multiple are available:

```bash
# iOS: start simulator, install dev build, then:
maestro test --platform ios maestro/

# Android: start emulator, install dev build, then:
maestro test --platform android maestro/
```

If only one device/simulator is running, Maestro uses it; `--platform` is required when both iOS and Android are running. See [Maestro CLI options](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options).

**Long-running flow:** `ai-playtest.yaml` runs 100 turns. Use a longer timeout if needed:

```bash
maestro test --env TIMEOUT=600000 maestro/
```

## Flows

| Flow | Purpose | Ported from | Platform |
|------|---------|-------------|----------|
| `title.yaml` | Title screen, New Game, Settings, close | (historical Playwright E2E removed; use Vitest browser + Maestro) | Native (iOS + Android; use `--platform ios` / `--platform android`) |
| `title-web.yaml` | Same as title; URL from `MAESTRO_WEB_URL` / config | — | Web (`pnpm dev`, MAESTRO_WEB_URL=http://localhost:5173) |
| `onboarding.yaml` | New game → scene ready → radial → briefing → city site | (historical Playwright E2E removed) | Native (iOS + Android) |
| `onboarding-web.yaml` | Same as onboarding; URL from `MAESTRO_WEB_URL` / config | — | Web (same as title-web) |
| `ai-playtest.yaml` | 100× End Turn, assert no render error | (historical Playwright E2E removed) | Native (iOS + Android) |

**To run on web (no dev build):** Set `MAESTRO_WEB_URL=http://localhost:5173` or `config/e2e.json` (webUrl). Start the app with `pnpm dev`, then `scripts/run-maestro-e2e.sh --web` or `maestro test -e MAESTRO_WEB_URL=http://localhost:5173 maestro/flows/title-web.yaml`. Maestro Web support is in Beta.

## testIDs used by flows

Flows rely on these `testID` and text assertions; keep them in sync with UI:

- **Title:** `title-new_game`, `title-settings`, `settings-close`, text "SYNTHETERIA", "New Game", "Settings"
- **New game:** `new-game-confirm`, text "Campaign Initialization"
- **Game:** `game-scene-ready`, `end-turn-button` (End Turn)
- **Radial:** `radial-menu`, `radial-petal-label-move`, `radial-petal-label-survey`
- **Briefing:** `briefing-bubble-selected-unit`, `briefing-bubble-nearby-site`
- **City site:** `city-site-close`

See [Playwright → Maestro migration](docs/plans/PLAYWRIGHT_TO_MAESTRO_MIGRATION.md) for full mapping and CI options (EAS + Maestro Cloud).
