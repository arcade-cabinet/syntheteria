# Paper Playtest — Full 3D Sphere

> Mental walkthrough of a complete game session on a 3D sphere surface.
> Every gap, broken assumption, and design opportunity identified.

---

## GAPS FOUND (Prioritized)

### CRITICAL — Must Solve or Game Breaks

1. **Wall visibility from surface level** — walls block camera view. Need: transparency/cut-away for walls between camera and selected unit. Or adjustable camera height.

2. **Multi-front management** — can only see one area at a time. Need: strategic globe view (zoom out), alert system for off-screen events, quick-jump to alert locations.

3. **Unit awareness** — can't see all units at once. Need: unit portrait panel (like RTS) showing all units with health/status, click to jump to location.

4. **~~Minimap replacement~~** — NO MINIMAP. The globe IS the minimap. Zoom out to see all discovered territory. Spin the globe to navigate. Zoom back in to play. The strategic zoom does double duty: overview AND navigation. Delete Minimap.tsx entirely.

5. **Scale proportions** — current TILE_SIZE_M=1.0 may not work at eye level. Need to test whether corridors are too narrow, walls too short, units too small.

### HIGH — Significant Design Work Needed

6. **Roof handling** — KayKit roofs face away from camera at surface level. Need: remove roofs, make transparent, or only render when zoomed above.

7. **Pathfinding visualization** — essential in 3D because you can't see the whole maze. Show path line through corridors when moving.

8. **Line of sight for ranged combat** — walls blocking shots is OBVIOUS in 3D. This is a game mechanic now, not optional. Need LOS checking in attack system.

9. **Territory visualization at surface level** — colored floor strips, faction flags, boundary lights instead of tile overlay.

10. **Building placement through walls** — need to highlight ALL valid tiles including ones behind walls. Through-wall indicators.

### MEDIUM — Polish Items

11. **Fog of war as actual fog** — volumetric/distance-based haze, not dark overlay. Structures materialize out of storm haze.

12. **Camera auto-tracking** — camera pans to keep selected unit in view after moves.

13. **Building preview ghost** — transparent model at placement position before confirming.

14. **Power conduit visualization** — visible connections between buildings at ground level.

15. **Turn summary MORE important** — player can't see everything at once, needs comprehensive "what happened" report.

### LOW — Nice to Have

16. **Cult glow at distance** — breach altar red glow visible down corridors.

17. **Research lab visual activity** — holographic displays, spinning elements.

18. **Idle animations for robots** — static units look dead at eye level.

19. **Walk/move animations** — unit movement should show locomotion.

20. **Polar geometry as game mechanic** — compressed terrain near wormhole is a natural difficulty ramp.

---

## DESIGN OPPORTUNITIES (Things That Are BETTER in 3D)

1. **Discovery moments** — "what's around that corner?" is a real question when walls block your view.

2. **Salvage props at eye level** — containers and machinery are physical objects, not icons.

3. **Cult mutations are scary** — Aberrant with pulsing glow coming around a corner.

4. **Wormhole eye overhead** — grows larger as you approach the pole. Dramatic.

5. **Labyrinth is tactical** — walls block shots, corridors are chokepoints, rooms are defensible positions.

6. **Sphere tension = game mechanic** — equator is easy, poles are hard. Natural difficulty gradient.

7. **Fog of war is immersive** — storm haze at edge of visibility, not dark tiles.

8. **Strategic zoom** — seamless from surface-level tactical to globe-level strategic. Supreme Commander-style.

---

## MODEL ASSESSMENT (Quick)

| Category | Count | Works in 3D? | Issues |
|----------|-------|-------------|--------|
| Robots | 9 | YES — designed as 3D models | Need scale check, would benefit from animations |
| Structures (walls) | 14 | YES — have Side A/B | Roofs need hiding at surface level |
| Structures (columns) | 4 | YES | Fine as-is |
| Structures (floors) | 8 | PARTIAL — face down | Less visible, but PBR texture on ground plane handles this |
| Structures (roofs) | 12 | NO — face away from camera | Need transparency or removal at surface zoom |
| Structures (details) | 26 | YES — add visual density | These become the atmospheric detail at eye level |
| Buildings | 25 | YES — proper 3D buildings | May need interior detail visible through windows |
| Props/Salvage | ~90 | YES — perfect for eye level | Scale may need adjustment |
| Infrastructure | ~48 | YES — create atmosphere | Pipes, supports, antennas are great at eye level |
| Defense | 15 | YES | Barriers become real obstacles at eye height |

---

## CAMERA APPROACH RECOMMENDATION

**Supreme Commander strategic zoom on a sphere:**
- Close (5-10m): Surface level, see 2-3 units, full detail, walls block view
- Medium (20-50m): Neighborhood, see a district, walls visible as structure
- Far (100-200m): Regional, see terrain curvature, structures as blocks
- Very far (500m+): Globe view, see whole planet, seamless transition to title-screen perspective

The zoom is SEAMLESS. No mode switching. Just scroll.

At close zoom, you need wall transparency/cut-away.
At medium zoom, you need floor texture visibility.
At far zoom, you need LOD reduction (structures → procedural shader).
At globe zoom, you need the title screen ecumenopolis shader.

This is Google Earth's approach applied to a game.
