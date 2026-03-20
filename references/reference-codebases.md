# Reference codebases (local clones)

Use these for **offline** review of upstream examples and docs. Clone **next to** this repo or under `~/src/reference-codebases/` — do not commit full clones into Syntheteria.

## Clone commands

```bash
mkdir -p ~/src/reference-codebases && cd ~/src/reference-codebases

git clone --depth 1 https://github.com/pmndrs/koota.git
git clone --depth 1 --branch v3.90.0 https://github.com/phaserjs/phaser.git phaser3
git clone --depth 1 https://github.com/mrdoob/three.js.git
```

Match **Phaser** shallow clone to `package.json` (`phaser@3.90.x`). Match **three** to the version **@enable3d/phaser-extension** resolves (check `pnpm why three`).

## What to read first

| Repo | Paths |
|------|--------|
| Koota | `examples/boids/src/view/`, `examples/boids/src/sim/`, `examples/n-body/src/view/`, `examples/react-120/src/` |
| Phaser | Official docs site + `phaser` repo `changelog` for breaking changes |
| three.js | `examples/` for lights, fog, `MeshStandardMaterial`, GLTFLoader patterns |

## Syntheteria mapping

See [COMPREHENSIVE_ENGINEERING_PLAN.md](COMPREHENSIVE_ENGINEERING_PLAN.md) §1–§2 for how these inform `src/views/` layout and Koota-style sim/view boundaries.
