/**
 * Mobile-first top-down camera with touch pan/zoom and keyboard/mouse support.
 * No rotation — always looking straight down.
 */
import { useRef, useEffect } from "react"
import { useThree, useFrame } from "@react-three/fiber"
import * as THREE from "three"

const MIN_ZOOM = 10
const MAX_ZOOM = 80
const PAN_SPEED = 0.5
const MOMENTUM_DECAY = 0.92

export function TopDownCamera() {
  const { camera, gl } = useThree()
  const target = useRef(new THREE.Vector3(8, 0, 8))
  const zoom = useRef(30)
  const velocity = useRef({ x: 0, z: 0 })
  const keys = useRef(new Set<string>())

  // Touch state
  const touchState = useRef<{
    lastTouch: { x: number; y: number } | null
    lastPinchDist: number | null
    lastMoveTime: number
  }>({ lastTouch: null, lastPinchDist: null, lastMoveTime: 0 })

  // Initialize camera
  useEffect(() => {
    camera.position.set(target.current.x, zoom.current, target.current.z + zoom.current * 0.6)
    camera.lookAt(target.current)
  }, [camera])

  // Keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => keys.current.add(e.key.toLowerCase())
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  // Mouse wheel zoom
  useEffect(() => {
    const canvas = gl.domElement
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.current + e.deltaY * 0.05))
    }
    canvas.addEventListener("wheel", onWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", onWheel)
  }, [gl])

  // Touch events for pan and pinch zoom
  useEffect(() => {
    const canvas = gl.domElement
    const ts = touchState.current

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        ts.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        velocity.current = { x: 0, z: 0 }
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        ts.lastPinchDist = Math.sqrt(dx * dx + dy * dy)
        ts.lastTouch = null
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && ts.lastTouch) {
        const dx = e.touches[0].clientX - ts.lastTouch.x
        const dy = e.touches[0].clientY - ts.lastTouch.y
        const scale = zoom.current * 0.003
        velocity.current.x = -dx * scale
        velocity.current.z = -dy * scale
        target.current.x += velocity.current.x
        target.current.z += velocity.current.z
        ts.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        ts.lastMoveTime = performance.now()
      } else if (e.touches.length === 2 && ts.lastPinchDist !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const delta = ts.lastPinchDist - dist
        zoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.current + delta * 0.1))
        ts.lastPinchDist = dist
      }
    }

    const onTouchEnd = () => {
      ts.lastTouch = null
      ts.lastPinchDist = null
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: false })
    canvas.addEventListener("touchmove", onTouchMove, { passive: false })
    canvas.addEventListener("touchend", onTouchEnd)
    return () => {
      canvas.removeEventListener("touchstart", onTouchStart)
      canvas.removeEventListener("touchmove", onTouchMove)
      canvas.removeEventListener("touchend", onTouchEnd)
    }
  }, [gl])

  useFrame((_, delta) => {
    const k = keys.current
    const panAmount = PAN_SPEED * zoom.current * delta

    // Keyboard pan
    if (k.has("w") || k.has("arrowup")) target.current.z -= panAmount
    if (k.has("s") || k.has("arrowdown")) target.current.z += panAmount
    if (k.has("a") || k.has("arrowleft")) target.current.x -= panAmount
    if (k.has("d") || k.has("arrowright")) target.current.x += panAmount

    // Touch momentum
    velocity.current.x *= MOMENTUM_DECAY
    velocity.current.z *= MOMENTUM_DECAY
    if (Math.abs(velocity.current.x) > 0.001 || Math.abs(velocity.current.z) > 0.001) {
      if (!touchState.current.lastTouch) {
        target.current.x += velocity.current.x
        target.current.z += velocity.current.z
      }
    }

    // Update camera position (always top-down)
    camera.position.set(
      target.current.x,
      zoom.current,
      target.current.z + zoom.current * 0.6
    )
    camera.lookAt(target.current)
  })

  return null
}
