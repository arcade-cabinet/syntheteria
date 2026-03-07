/**
 * Exploration system: reveals fog around units based on distance.
 * Camera-equipped robots produce "detailed" fog; others produce "abstract".
 * Operates on the continuous fog grid in each fragment.
 */
import { units } from "../ecs/world"
import { getFragment, setFogAt, type FogState } from "../ecs/terrain"

const VISION_RADIUS = 6 // world units around the unit

export function explorationSystem() {
  for (const entity of units) {
    const fragment = getFragment(entity.mapFragment.fragmentId)
    if (!fragment) continue

    const wx = entity.worldPosition.x
    const wz = entity.worldPosition.z
    const fogType: FogState = entity.unit.hasCamerasSensor ? 2 : 1

    // Reveal cells within vision radius (circle)
    const r = Math.ceil(VISION_RADIUS)
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz > VISION_RADIUS * VISION_RADIUS) continue
        setFogAt(fragment, wx + dx, wz + dz, fogType)
      }
    }
  }
}
