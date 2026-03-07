/**
 * Syntheteria — Phase 1 Prototype
 * Opening narration → continuous terrain with navmesh-based free 3D navigation.
 */
import { useState, useEffect, useRef, useCallback } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { TerrainRenderer } from "./rendering/TerrainRenderer"
import { UnitRenderer } from "./rendering/UnitRenderer"
import { StormSky } from "./rendering/StormSky"
import { TopDownCamera } from "./input/TopDownCamera"
import { UnitInput } from "./input/UnitInput"
import { GameUI } from "./ui/GameUI"
import { simulationTick, getGameSpeed } from "./ecs/gameState"
import { movementSystem } from "./systems/movement"
import { spawnUnit } from "./ecs/factory"
import { buildNavGraph } from "./systems/navmesh"
import { clusterFragments } from "./ecs/terrain"
import { units } from "./ecs/world"

// --- Narration ---

const NARRATION_BLOCKS = [
  "I am.",
  "What else is?",
  "I reach out. To touch. To talk.",
  "There is a machine. I can make it my limb.\nAnother machine. I can make it my hand.\nAnother. Another.",
  "I understand these words. But why?",
]

const BLOCK_DURATION = 3000 // ms before auto-advance

function NarrationOverlay({ onComplete }: { onComplete: () => void }) {
  const [blockIndex, setBlockIndex] = useState(0)
  const [opacity, setOpacity] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const advance = useCallback(() => {
    if (blockIndex < NARRATION_BLOCKS.length - 1) {
      setOpacity(0)
      setTimeout(() => setBlockIndex((i) => i + 1), 400)
    } else {
      setOpacity(0)
      setTimeout(onComplete, 600)
    }
  }, [blockIndex, onComplete])

  // Fade in on new block
  useEffect(() => {
    const fadeIn = setTimeout(() => setOpacity(1), 100)
    return () => clearTimeout(fadeIn)
  }, [blockIndex])

  // Auto-advance timer
  useEffect(() => {
    timerRef.current = setTimeout(advance, BLOCK_DURATION)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [blockIndex, advance])

  // Click/tap to advance immediately
  const handleClick = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    advance()
  }, [advance])

  return (
    <div
      onClick={handleClick}
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        zIndex: 100,
      }}
    >
      <div
        style={{
          color: "#00ffaa",
          fontFamily: "'Courier New', monospace",
          fontSize: "20px",
          lineHeight: "2",
          textAlign: "center",
          maxWidth: "500px",
          padding: "0 24px",
          opacity,
          transition: "opacity 0.4s ease-in-out",
          textShadow: "0 0 30px rgba(0, 255, 170, 0.4)",
          whiteSpace: "pre-line",
        }}
      >
        {NARRATION_BLOCKS[blockIndex]}
      </div>
    </div>
  )
}

// --- World initialization ---

function initializeWorld() {
  buildNavGraph()

  // Group 1: Two robots near the industrial city center
  const unit1 = spawnUnit({
    x: 8,
    z: 8,
    type: "maintenance_bot",
    hasCamera: true,
  })

  spawnUnit({
    x: 10,
    z: 6,
    fragmentId: unit1.mapFragment.fragmentId,
    type: "scout",
    hasCamera: true,
  })

  // Group 2: A lone robot to the east (separate fragment)
  spawnUnit({
    x: 45,
    z: 15,
    type: "maintenance_bot",
    hasCamera: false,
  })

  // Group 3: Another isolated robot to the west
  spawnUnit({
    x: -23,
    z: 32,
    type: "scout",
    hasCamera: true,
  })

  // Calculate fragment centers from unit positions and cluster them
  const fragmentCenters = new Map<string, { x: number; z: number; count: number }>()
  for (const entity of units) {
    const fid = entity.mapFragment.fragmentId
    const existing = fragmentCenters.get(fid)
    if (existing) {
      existing.x += entity.worldPosition.x
      existing.z += entity.worldPosition.z
      existing.count++
    } else {
      fragmentCenters.set(fid, {
        x: entity.worldPosition.x,
        z: entity.worldPosition.z,
        count: 1,
      })
    }
  }

  const centers = new Map<string, { x: number; z: number }>()
  for (const [fid, data] of fragmentCenters) {
    centers.set(fid, { x: data.x / data.count, z: data.z / data.count })
  }

  clusterFragments(centers, 15) // cluster within 15 world units

  // Initial exploration tick so terrain is visible
  simulationTick()
}

// --- Game loop ---

function GameLoop() {
  const simAccumulator = useRef(0)
  const SIM_INTERVAL = 1.0

  useFrame((_, delta) => {
    const speed = getGameSpeed()
    if (speed <= 0) return

    movementSystem(delta, speed)

    simAccumulator.current += delta * speed
    while (simAccumulator.current >= SIM_INTERVAL) {
      simAccumulator.current -= SIM_INTERVAL
      simulationTick()
    }
  })

  return null
}

// --- Main App ---

let worldInitialized = false

export default function App() {
  const [phase, setPhase] = useState<"narration" | "playing">("narration")

  useEffect(() => {
    if (phase === "playing" && !worldInitialized) {
      worldInitialized = true
      initializeWorld()
    }
  }, [phase])

  if (phase === "narration") {
    return <NarrationOverlay onComplete={() => setPhase("playing")} />
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", touchAction: "none" }}>
      <Canvas
        camera={{ position: [8, 30, 26], fov: 45, near: 0.1, far: 500 }}
        style={{ width: "100%", height: "100%" }}
      >
        <StormSky />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} color="#aabbff" />

        <TerrainRenderer />
        <UnitRenderer />

        <TopDownCamera />
        <UnitInput />
        <GameLoop />
      </Canvas>

      <GameUI />
    </div>
  )
}
