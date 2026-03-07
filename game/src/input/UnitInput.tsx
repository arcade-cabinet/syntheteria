/**
 * Handles unit selection (tap/click) and move commands (right-click / long-press).
 * Uses navmesh pathfinding for free 3D movement.
 *
 * Selection works in display space (accounts for fragment offsets).
 * Move commands convert display-space targets back to real-world positions.
 */
import { useRef, useCallback } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { units } from "../ecs/world"
import { findPath } from "../systems/pathfinding"
import { getFragment } from "../ecs/terrain"
import type { Entity } from "../ecs/types"

const GROUND_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

function getWorldPointFromEvent(
  clientX: number,
  clientY: number,
  camera: THREE.Camera,
  domElement: HTMLCanvasElement
): THREE.Vector3 | null {
  const rect = domElement.getBoundingClientRect()
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const intersection = new THREE.Vector3()
  const hit = raycaster.ray.intersectPlane(GROUND_PLANE, intersection)
  return hit ? intersection : null
}

/** Find unit closest to a display-space point (accounts for fragment offsets). */
function findUnitAtPoint(point: THREE.Vector3, threshold: number = 1.0): Entity | null {
  let closest: Entity | null = null
  let closestDist = threshold

  for (const entity of units) {
    const frag = getFragment(entity.mapFragment.fragmentId)
    const ox = frag?.displayOffset.x ?? 0
    const oz = frag?.displayOffset.z ?? 0

    // Compare against displayed position
    const dx = (entity.worldPosition.x + ox) - point.x
    const dz = (entity.worldPosition.z + oz) - point.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < closestDist) {
      closest = entity
      closestDist = dist
    }
  }
  return closest
}

/** Issue a move command. Converts display-space target to real-world position. */
function issueMoveTo(entity: Entity, displayX: number, displayZ: number) {
  const frag = getFragment(entity.mapFragment.fragmentId)
  const ox = frag?.displayOffset.x ?? 0
  const oz = frag?.displayOffset.z ?? 0

  // Convert display-space click to real-world target
  const realX = displayX - ox
  const realZ = displayZ - oz

  const path = findPath(entity.worldPosition, { x: realX, y: 0, z: realZ })

  if (path.length > 0) {
    ;(entity as any).navigation = {
      path,
      pathIndex: 0,
      moving: true,
    }
  }
}

export function UnitInput() {
  const { camera, gl } = useThree()
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)

  const handleSelect = useCallback(
    (clientX: number, clientY: number) => {
      const point = getWorldPointFromEvent(clientX, clientY, camera, gl.domElement)
      if (!point) return

      const unit = findUnitAtPoint(point)

      for (const u of units) {
        u.unit.selected = false
      }

      if (unit) {
        unit.unit.selected = true
      }
    },
    [camera, gl]
  )

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      const point = getWorldPointFromEvent(clientX, clientY, camera, gl.domElement)
      if (!point) return

      for (const entity of units) {
        if (entity.unit.selected) {
          issueMoveTo(entity, point.x, point.z)
        }
      }
    },
    [camera, gl]
  )

  const onPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button === 0) {
        handleSelect(e.clientX, e.clientY)
      } else if (e.button === 2) {
        handleMove(e.clientX, e.clientY)
      }
    },
    [handleSelect, handleMove]
  )

  const onContextMenu = useCallback((e: Event) => {
    e.preventDefault()
  }, [])

  const onTouchStartInput = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: performance.now(),
      }
      longPressTimer.current = setTimeout(() => {
        if (touchStart.current) {
          handleMove(touchStart.current.x, touchStart.current.y)
          touchStart.current = null
        }
      }, 500)
    },
    [handleMove]
  )

  const onTouchEndInput = useCallback(
    (_e: TouchEvent) => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      if (touchStart.current) {
        const elapsed = performance.now() - touchStart.current.time
        if (elapsed < 300) {
          handleSelect(touchStart.current.x, touchStart.current.y)
        }
        touchStart.current = null
      }
    },
    [handleSelect]
  )

  const attachedRef = useRef(false)
  if (!attachedRef.current) {
    attachedRef.current = true
    const canvas = gl.domElement
    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("contextmenu", onContextMenu)
    canvas.addEventListener("touchstart", onTouchStartInput, { passive: true })
    canvas.addEventListener("touchend", onTouchEndInput)
  }

  return null
}
