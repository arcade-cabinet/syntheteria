# Product Context: Syntheteria

## Why This Product Exists

Syntheteria exists to deliver a novel 4X experience where the player IS the machine consciousness, not a human commanding one. Most 4X games assume a human general, emperor, or CEO presiding over units and territory from an omniscient camera. Syntheteria inverts that: you awaken fragmented, earn perception through reconnection, and grow from intimate local awareness into distributed strategic dominance.

The game should feel like it **grows into** strategic scale rather than starting as a fully legible empire board.

## Problems It Solves

### For the 4X genre
- **Intimidation barrier:** Most 4X games front-load complexity. Syntheteria's awakening phase is intimate — 5 robots, one dark pocket of a dead world. Strategic scale is earned, not dumped.
- **Desktop-only assumption:** Traditional 4X demands mouse + keyboard + large screen. Syntheteria is touch-first, playable on phone and tablet, without sacrificing depth.
- **Stale premises:** The genre is saturated with space empires and fantasy civilizations. A storm-bound machine-consciousness on a ruined ecumenopolis is genuinely novel.

### For the player
- **Agency and identity:** You don't roleplay a character — you ARE the consciousness. Your perception grows as your network grows. Fog of war isn't just a mechanic, it's your literal sensory limitation.
- **Meaningful environment:** The world isn't a terrain grid decorated with resources. Every wall, pipe, terminal, and beam IS a resource deposit. The dead civilization is the resource base.
- **Pacing:** Quiet logistics windows are fast-forwardable. Combat and hacking tolerate pause and slow-motion. The game respects the player's time and attention.

## UX Goals

### Interaction Model
- **Radial context menu** for ALL contextual actions — replaces toolbars, bottom sheets, and selection panels
- Right-click on desktop, long-press on mobile
- Context-sensitive: different actions for terrain, structures, bots, enemies
- Defined in `radialMenu.json`, executed through `radialMenu.ts` and `radialProviders.ts`

### Visual Language
- **Machine perception layer** aesthetic — the UI should feel like you're perceiving the world through machine sensors and command relays
- Not fantasy parchment, not consumer-mobile chrome, not generic blue cyber
- Dark industrial base with layered depth, borders, glow rails, scan motifs
- **Cyan/mint** = accent, selection, active state
- **Amber** = infrastructure, power, fabrication
- **Red** = genuine threat or failure only
- Panels feel projected and engineered, not thickly beveled mobile game cards
- Motion is intentional, sparse, and readable

### Responsiveness
- Resource strip adapts to phone / tablet / desktop widths
- Touch targets are finger-safe on all form factors
- Critical actions never depend on hover-only reveal
- Text contrast remains readable over complex 3D scenes
- Button states distinguishable beyond color alone

### Information Architecture
- Player starts knowing almost nothing — information is earned through exploration
- UI reveals complexity as the player's network grows
- No omniscient overview at game start
- Minimap and strategic views are earned capabilities

## Target Experience by Phase

### Awakening (minutes 0-15)
Intimate, quiet, slightly disorienting. You reconnect a few machines. Perception snaps together. The world is dark and small. Every discovery feels significant.

### Expansion (minutes 15-60)
The fog lifts in patches. You find harvestable structures. Resources start flowing. Your first fabrication feels powerful. The ecumenopolis reveals itself as vast and reclaimable.

### Competition (hours 1-3)
Rival consciousnesses contest your expansion. Cultist pressure escalates. You automate logistics, specialize bots, and make strategic choices about territory and doctrine.

### Resolution (hours 3-6)
Full strategic scale. Multiple sectors under control. The choice between dominance, technical supremacy, and wormhole transcendence becomes real. The endgame is about what machine civilization does next, not restoring the old world.

## What Syntheteria Is NOT

- Not a generic sci-fi strategy game
- Not a city builder with a 4X skin
- Not a desktop-only experience ported to mobile as an afterthought
- Not a fantasy or space 4X with different art
- Not a game where the player is a human commander
- Not a game with artificial map boundaries
