/**
 * Syntheteria — Phase 1 Prototype
 * Opening narration → continuous terrain with navmesh-based free 3D navigation.
 */
import { useState, useEffect, useRef, useCallback } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { TerrainRenderer } from "./rendering/TerrainRenderer"
import { UnitRenderer } from "./rendering/UnitRenderer"
import { StormSky } from "./rendering/StormSky"
import { LandscapeProps } from "./rendering/LandscapeProps"
import { CityRenderer } from "./rendering/CityRenderer"
import { TopDownCamera } from "./input/TopDownCamera"
import { UnitInput } from "./input/UnitInput"
import { GameUI } from "./ui/GameUI"
import { TitleScreen } from "./ui/TitleScreen"
import { simulationTick, getGameSpeed } from "./ecs/gameState"
import { movementSystem } from "./systems/movement"
import { spawnUnit, spawnFabricationUnit, spawnLightningRod } from "./ecs/factory"
import { buildNavGraph } from "./systems/navmesh"
import { getCityBuildings } from "./ecs/cityLayout"

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
  // Initialize city layout (must happen before navmesh so buildings block paths)
  getCityBuildings()
  buildNavGraph()

  // Bot 1: Has a working camera but broken arms.
  // Spawns in a clear area within the city streets.
  const bot1 = spawnUnit({
    x: 8,
    z: 12,
    displayName: "Bot Alpha",
    components: [
      { name: "camera", functional: true, material: "electronic" },
      { name: "arms", functional: false, material: "metal" },
      { name: "legs", functional: true, material: "metal" },
      { name: "power_cell", functional: true, material: "electronic" },
    ],
  })

  // Bot 2: Has working arms but broken camera.
  // Nearby but separated by buildings — must navigate streets.
  spawnUnit({
    x: 18,
    z: 16,
    fragmentId: bot1.mapFragment.fragmentId,
    displayName: "Bot Beta",
    components: [
      { name: "camera", functional: false, material: "electronic" },
      { name: "arms", functional: true, material: "metal" },
      { name: "legs", functional: true, material: "metal" },
      { name: "power_cell", functional: true, material: "electronic" },
    ],
  })

  // Fabrication unit: Stationary building, no power.
  // Located in a street between the two bots.
  spawnFabricationUnit({
    x: 13,
    z: 14,
    fragmentId: bot1.mapFragment.fragmentId,
    powered: false,
    components: [
      { name: "power_supply", functional: false, material: "electronic" },
      { name: "fabrication_arm", functional: true, material: "metal" },
      { name: "material_hopper", functional: true, material: "metal" },
    ],
  })

  // Lightning rod: Provides power and protection in the starting area.
  spawnLightningRod({
    x: 10,
    z: 13,
    fragmentId: bot1.mapFragment.fragmentId,
  })

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
  const [phase, setPhase] = useState<"title" | "narration" | "playing">("title")

  useEffect(() => {
    if (phase === "playing" && !worldInitialized) {
      worldInitialized = true
      initializeWorld()
    }
  }, [phase])

  if (phase === "title") {
    return <TitleScreen onNewGame={() => setPhase("narration")} />
  }

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
        <LandscapeProps />
        <CityRenderer />
        <UnitRenderer />

        <TopDownCamera />
        <UnitInput />
        <GameLoop />
      </Canvas>

      <GameUI />
    </div>
  )
}
