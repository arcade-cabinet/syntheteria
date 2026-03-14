# Maestro E2E tests

Flows live in `flows/*.yaml`. Run with Maestro CLI.

## Install Maestro CLI

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

See [Maestro docs](https://maestro.mobile.dev/docs/getting-started).

## Run flows

From repo root:

```bash
maestro test maestro/
```

Or from this directory:

```bash
maestro test .
```

Flows will be added in PRD stories 1.1 (title), 1.2 (onboarding), 1.3 (ai-playtest).
