/**
 * Movement system: interpolates unit worldPosition along navigation paths.
 * Runs per-frame in useFrame, not per sim tick.
 */
import { movingUnits } from "../ecs/world"
import { getFragment, tileToWorld } from "../ecs/fragments"

export function movementSystem(delta: number, gameSpeed: number) {
  for (const entity of movingUnits) {
    const nav = entity.navigation
    if (!nav.moving || nav.pathIndex >= nav.path.length) {
      nav.moving = false
      continue
    }

    const fragment = getFragment(entity.mapFragment.fragmentId)
    if (!fragment) continue

    const target = nav.path[nav.pathIndex]
    const [targetCx, targetCy] = target.chunkId.split(",").map(Number)
    const targetWorld = tileToWorld(targetCx, targetCy, target.x, target.y, fragment)

    const wp = entity.worldPosition
    const step = entity.unit.speed * delta * gameSpeed

    const dx = targetWorld.x - wp.x
    const dz = targetWorld.z - wp.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist <= step) {
      // Reached waypoint
      wp.x = targetWorld.x
      wp.z = targetWorld.z
      entity.position = { chunkId: target.chunkId, x: target.x, y: target.y }
      nav.pathIndex++
      if (nav.pathIndex >= nav.path.length) {
        nav.moving = false
      }
    } else {
      wp.x += (dx / dist) * step
      wp.z += (dz / dist) * step
    }
  }
}
