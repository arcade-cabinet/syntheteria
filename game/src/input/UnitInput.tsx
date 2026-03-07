/**
 * Handles unit selection and move commands.
 *
 * Mobile: Tap to select a unit. If a unit is already selected, tap empty ground
 * to move it there. Two-finger drag pans the camera (handled by TopDownCamera).
 *
 * Desktop: Click to select. Right-click to move selected unit.
 *
 * Selection works in display space (accounts for fragment offsets).
 * Move commands convert display-space targets back to real-world positions.
 */
import { useRef, useCallback, useEffect } from "react"
import { useThree } from "@react-three/fiber"
import * as THREE from "three"
import { units } from "../ecs/world"
import { findPath } from "../systems/pathfinding"
import { getFragment } from "../ecs/terrain"
import {
  getActivePlacement,
  updateGhostPosition,
  confirmPlacement,
  cancelPlacement,
} from "../systems/buildingPlacement"
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
function findUnitAtPoint(point: THREE.Vector3, threshold: number = 1.5): Entity | null {
  let closest: Entity | null = null
  let closestDist = threshold

  for (const entity of units) {
    const frag = getFragment(entity.mapFragment.fragmentId)
    const ox = frag?.displayOffset.x ?? 0
    const oz = frag?.displayOffset.z ?? 0

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

  const realX = displayX - ox
  const realZ = displayZ - oz

  const path = findPath(entity.worldPosition, { x: realX, y: 0, z: realZ })

  if (path.length > 0) {
    entity.navigation.path = path
    entity.navigation.pathIndex = 0
    entity.navigation.moving = true
  }
}

function getSelectedUnit(): Entity | null {
  for (const entity of units) {
    if (entity.unit.selected) return entity
  }
  return null
}

export function UnitInput() {
  const { camera, gl } = useThree()
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null)
  const wasPanning = useRef(false)

  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      const point = getWorldPointFromEvent(clientX, clientY, camera, gl.domElement)
      if (!point) return

      // Building placement mode
      if (getActivePlacement()) {
        updateGhostPosition(point.x, point.z)
        if (confirmPlacement()) {
          // Placed successfully
        }
        return
      }

      const unitAtPoint = findUnitAtPoint(point)
      const currentlySelected = getSelectedUnit()

      if (unitAtPoint) {
        // Tapped on a unit — select it (deselect others)
        for (const u of units) {
          u.unit.selected = false
        }
        unitAtPoint.unit.selected = true
      } else if (currentlySelected) {
        // Tapped empty ground with a unit selected — move there
        issueMoveTo(currentlySelected, point.x, point.z)
      }
    },
    [camera, gl]
  )

  const handleRightClick = useCallback(
    (clientX: number, clientY: number) => {
      const point = getWorldPointFromEvent(clientX, clientY, camera, gl.domElement)
      if (!point) return

      // Right-click always moves selected units
      for (const entity of units) {
        if (entity.unit.selected) {
          issueMoveTo(entity, point.x, point.z)
        }
      }
    },
    [camera, gl]
  )

  useEffect(() => {
    const canvas = gl.domElement

    // --- Desktop: mouse events ---
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return // handled by touch events
      if (e.button === 0) {
        handleTap(e.clientX, e.clientY)
      } else if (e.button === 2) {
        handleRightClick(e.clientX, e.clientY)
      }
    }

    const onContextMenu = (e: Event) => {
      e.preventDefault()
    }

    // --- Mobile: touch events ---
    // Single-finger tap = select or move. Multi-touch = camera pan (handled by TopDownCamera).
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        // Multi-touch started — mark as panning
        wasPanning.current = true
        touchStart.current = null
        return
      }
      wasPanning.current = false
      touchStart.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: performance.now(),
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStart.current) return
      // If finger moved more than a small threshold, it's a pan not a tap
      const dx = e.touches[0]?.clientX - touchStart.current.x
      const dy = e.touches[0]?.clientY - touchStart.current.y
      if (dx * dx + dy * dy > 100) {
        // 10px threshold squared
        wasPanning.current = true
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      // Only count as a tap if we weren't panning and touch was brief
      if (wasPanning.current || !touchStart.current) {
        touchStart.current = null
        // Reset panning flag when all fingers are lifted
        if (e.touches.length === 0) {
          wasPanning.current = false
        }
        return
      }

      const elapsed = performance.now() - touchStart.current.time
      if (elapsed < 300) {
        handleTap(touchStart.current.x, touchStart.current.y)
      }
      touchStart.current = null
    }

    // Mouse move for ghost building preview
    const onMouseMove = (e: MouseEvent) => {
      if (!getActivePlacement()) return
      const point = getWorldPointFromEvent(e.clientX, e.clientY, camera, gl.domElement)
      if (point) {
        updateGhostPosition(point.x, point.z)
      }
    }

    // Escape to cancel placement
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && getActivePlacement()) {
        cancelPlacement()
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown)
    canvas.addEventListener("contextmenu", onContextMenu)
    canvas.addEventListener("mousemove", onMouseMove)
    window.addEventListener("keydown", onKeyDown)
    canvas.addEventListener("touchstart", onTouchStart, { passive: true })
    canvas.addEventListener("touchmove", onTouchMove, { passive: true })
    canvas.addEventListener("touchend", onTouchEnd)

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown)
      canvas.removeEventListener("contextmenu", onContextMenu)
      canvas.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("keydown", onKeyDown)
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      canvas.removeEventListener("touchend", onTouchEnd)
    }
  }, [gl, handleTap, handleRightClick])

  return null
}
