# Mobile 4X Viewport Design — Syntheteria

## The Problem

On a 375×812 phone (iPhone SE/14 class), the current HUD layout consumes roughly:
- **TopBar**: ~160-200px height (title badge + stat chips row + resources row)
- **BuildToolbar**: 160px wide on the right
- **Minimap**: 140×140px bottom-right
- **SelectedInfo**: full-width bottom panel when anything is selected

That leaves a *window* into the game world of roughly 215×450px — barely more than a quarter of the screen. For a 4X where spatial awareness IS the game, this is the Civ VI mobile trap.

## Research: What Works

### Polytopia (The Gold Standard for Mobile 4X)
- Map owns **100% of screen** at rest
- HUD is a thin bottom bar (~48px) showing turn counter and end-turn button
- Resource counts shown in a **collapsible top strip** (~32px, transparent over map)
- Unit/city details appear as **bottom sheets** on tap, dismissed by tapping map
- Playable in portrait with one thumb — "you can play a serious 4X game in portrait mode with just one thumb"
- Key quote from Midjiwan: "In a strategy game, it's important to be able to decode the map — you should instantly see what's going on"

### CivRev2 (Best Desktop-to-Mobile Balance)
- Purpose-built for mobile, not ported
- Tiles are cartoonish but large and readable on phone
- Touch: tap to select, double-tap to move
- Cities are 3D objects IN the world, not just icons
- Weakness: camera was hard to move, couldn't zoom out enough
- Shows ~5-7 tiles across at default zoom

### Civ VI Mobile (The Anti-Pattern)
- Desktop port with shrunken UI
- Persistent panels on all edges eat 40%+ of screen
- Tiles become unreadable without constant pinch-zoom
- Players describe it as "playing through a keyhole"

### Northgard Mobile (Cautionary Tale)
- UI scaling options but still cluttered on phones
- "Suits tablets much better" — reviewers
- Strategy games with hex/territory grids need ~7-9 tiles visible minimum

## Design Principles for Syntheteria

### 1. The Map IS the Screen

At rest (nothing selected, no panel open), the game world should fill **100% of the viewport**. HUD elements float as transparent overlays occupying ≤15% of screen area total.

**Persistent elements on phone** (always visible):
- **Resource strip** — single horizontal row at top, transparent bg, ~36px tall
- **Minimap toggle** — small radar icon bottom-right (~36×36px), tapping expands minimap as a bottom sheet
- **Menu dot** — top-right corner, opens sim controls / settings

**Everything else is contextual** — appears on interaction, dismissed by tapping the map.

### 2. Default Zoom: The "7-Tile Rule"

At default zoom on a phone in portrait, the player should see approximately **7 tiles across** the screen width. This is the sweet spot from both Polytopia and CivRev2:
- Enough tiles for local tactical context (your city + 2-3 tiles of surroundings)
- Each tile large enough to show its terrain type, any unit/building on it, and its ownership color
- Not so zoomed out that individual units become undifferentiated dots

For Syntheteria's coordinate system:
- Current world uses 3D units where terrain tiles are roughly 2 units wide
- A 375px phone showing 7 tiles means each tile renders at ~53px — readable for a hex/square with a small icon
- Min zoom (zoomed out): ~12 tiles across — strategic overview, unit dots
- Max zoom (zoomed in): ~4 tiles across — individual unit detail, city interior-level

### 3. Zoom Level Tiers (Not Continuous)

Instead of smooth continuous zoom (which leads to awkward "between" states), use **snap-to zoom tiers** with smooth animation between them:

| Tier | Name | Tiles Across (Phone) | What's Visible |
|------|------|---------------------|----------------|
| 1 | Tactical | 4-5 | Unit models, building details, terrain features |
| 2 | **Default** | 7-8 | Units as icons, buildings as silhouettes, terrain colors |
| 3 | Strategic | 11-13 | Ownership colors, city icons, unit group indicators |
| 4 | World | 20+ | Full map overview (like minimap but interactive) |

Pinch zoom snaps to nearest tier. Double-tap cycles to next tier. This prevents the "unrecognizable muddle" problem — at every tier, the visual language is designed for THAT distance.

### 4. Contextual HUD — Bottom Sheet Pattern

When the player taps a unit, building, or tile, information appears as a **bottom sheet** that slides up from the bottom covering ~40% of screen height. The map scrolls up to keep the tapped element visible above the sheet.

Bottom sheet content:
- Unit stats, components, orders
- Building status, fabrication queue
- Tile resources, POI information

Dismissed by: swiping down, tapping the map, or tapping the X.

This is the Polytopia pattern and it works because:
- The map (the thing you're making decisions about) stays visible
- Your thumb is already near the bottom of the screen
- Complex info (fabrication recipes, repair options) gets room to breathe

### 5. Resource Strip (Top Edge)

Replace the current multi-row TopBar with a **single-row resource strip**:

```
┌─────────────────────────────────────────────┐
│ ⚡32  🔩14  ♻️8  ⛈️78%  ≡                 │
│                                             │
│                                             │
│              G A M E  W O R L D             │
│                                             │
│                                             │
│                                       [◎]   │
└─────────────────────────────────────────────┘
```

- Icons + numbers only, no labels (labels visible on long-press)
- Semi-transparent background (~70% opacity dark)
- ≡ hamburger opens Sim Control panel as a bottom sheet
- [◎] is the minimap toggle
- Total height: 36-40px including safe area padding
- On desktop/tablet: expand to full TopBar with labels

### 6. Tile Atlas Scaling

When extracting tiles from the terrain atlas for rendering:
- Each tile at the **default zoom tier** should resolve to approximately **48-56dp** on phone
- At this size, a 2-color hex (terrain base + ownership tint) is readable
- Center-placed models (buildings, units) should be **~60% of tile width** — large enough to identify type but not overflowing
- City icons at strategic zoom should be **recognizable silhouettes** at ~20-24dp

On tablet, tiles naturally get more pixels, so the same 7-tile rule gives ~90dp tiles — room for more detail.

### 7. Phone vs Tablet vs Desktop Summary

| Surface | Phone Portrait | Tablet | Desktop |
|---------|---------------|--------|---------|
| Resource bar | Icons only, 36px tall | Icons + short labels, 44px | Full TopBar with labels + sim controls |
| Minimap | Hidden, toggle icon | Always visible, corner | Always visible, larger |
| Selected info | Bottom sheet, 40% height | Side panel, 320px wide | Side panel, 358px wide |
| Build toolbar | Bottom sheet, grid of icons | Right rail, compact | Right rail, full |
| Sim controls | In hamburger menu | Top-right panel | Top-right panel, always visible |
| Default zoom | 7 tiles across | 9-10 tiles across | 12-14 tiles across |

## Implementation Priority

1. **Resource strip** — replace TopBar on phone with compact single-row
2. **Bottom sheet pattern** — move SelectedInfo, BuildToolbar, LocationPanel into bottom sheets on phone
3. **Zoom tier system** — snap-to tiers with appropriate visual language per tier
4. **Minimap toggle** — hidden by default on phone, expandable
5. **Contextual sim controls** — behind hamburger on phone

## Reference Games to Study Visually

- **The Battle of Polytopia** — App Store, free. Study portrait mode HUD layout.
- **Civilization Revolution 2** — App Store. Study tile presentation and zoom.
- **Northgard** (mobile) — Study what NOT to do with hex territory on small screens.
- **Hexonia** — Polytopia-inspired, good mobile hex presentation.
- **Unciv** — Open source Civ V on mobile, studies in making complex 4X work on phone.

## Sources

- [Maximising Minimalism — Midjiwan/Polytopia Design Philosophy](https://mobidictum.com/christian-lovstedt-midjiwan-polytopia-minimalism/)
- [How Polytopia Approaches Mobile vs PC & Switch](https://www.rewinder.co.uk/how-the-battle-of-polytopia-approaches-mobile-vs-pc-switch/)
- [UI Strategy Game Design Dos and Don'ts](https://www.gamedeveloper.com/design/ui-strategy-game-design-dos-and-don-ts)
- [Game UI Database — HUD Screenshots](https://gameuidatabase.com/index.php?scrn=904&set=1&tag=6)
- [Interface In Game — Strategy Game UI Collection](https://interfaceingame.com/)
- [Mastering Game HUD Design](https://polydin.com/game-hud-design/)
- [CivRev2 Review — GameSpot](https://www.gamespot.com/articles/civilization-revolution-2-is-a-good-mobile-game-bu/1100-6420914/)
- [Mobile Game Scaling for Multiple Screen Sizes](https://medium.com/@martindrapeau/scaling-your-mobile-game-to-any-device-size-4d12dd79cad6)
