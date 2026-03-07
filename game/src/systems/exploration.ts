/**
 * Exploration system: reveals chunks around moving units.
 * Camera-equipped robots produce "detailed" fog; others produce "abstract".
 */
import { units } from "../ecs/world"
import {
  getFragment,
  getOrCreateChunk,
  CHUNK_SIZE,
  type FogState,
} from "../ecs/fragments"

const VISION_RADIUS = 3 // tiles around the unit

export function explorationSystem() {
  for (const entity of units) {
    const fragment = getFragment(entity.mapFragment.fragmentId)
    if (!fragment) continue

    const [chunkCx, chunkCy] = entity.position.chunkId.split(",").map(Number)
    const tx = entity.position.x
    const ty = entity.position.y

    const fogType: FogState = entity.unit.hasCamerasSensor ? "detailed" : "abstract"

    // Reveal tiles within vision radius
    for (let dy = -VISION_RADIUS; dy <= VISION_RADIUS; dy++) {
      for (let dx = -VISION_RADIUS; dx <= VISION_RADIUS; dx++) {
        if (dx * dx + dy * dy > VISION_RADIUS * VISION_RADIUS) continue

        let tileX = tx + dx
        let tileY = ty + dy
        let cx = chunkCx
        let cy = chunkCy

        // Handle chunk boundary crossings
        while (tileX < 0) { cx--; tileX += CHUNK_SIZE }
        while (tileX >= CHUNK_SIZE) { cx++; tileX -= CHUNK_SIZE }
        while (tileY < 0) { cy--; tileY += CHUNK_SIZE }
        while (tileY >= CHUNK_SIZE) { cy++; tileY -= CHUNK_SIZE }

        const chunk = getOrCreateChunk(fragment, cx, cy)

        // Only upgrade fog, never downgrade (detailed > abstract > unexplored)
        const current = chunk.fog[tileY][tileX]
        if (current === "unexplored" || (current === "abstract" && fogType === "detailed")) {
          chunk.fog[tileY][tileX] = fogType
          chunk.hasRevealed = true
        }
      }
    }
  }
}
