/**
 * Syntheteria — Phase 1 Prototype
 * Fragmented map exploration with mobile-first controls.
 */
import { useEffect, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { FragmentRenderer } from "./rendering/FragmentRenderer"
import { UnitRenderer } from "./rendering/UnitRenderer"
import { StormSky } from "./rendering/StormSky"
import { TopDownCamera } from "./input/TopDownCamera"
import { UnitInput } from "./input/UnitInput"
import { GameUI } from "./ui/GameUI"
import { simulationTick, getGameSpeed } from "./ecs/gameState"
import { movementSystem } from "./systems/movement"
import { spawnUnit } from "./ecs/factory"

// Initialize the game world — spawn some units in separate fragments
function initializeWorld() {
  // Fragment 1: Two robots near the industrial city center
  const unit1 = spawnUnit({
    cx: 0, cy: 0, tx: 8, ty: 8,
    type: "maintenance_bot",
    hasCamera: true,
    fragmentOffsetX: 0,
    fragmentOffsetY: 0,
  })

  // Second unit in the same fragment
  spawnUnit({
    fragmentId: unit1.mapFragment.fragmentId,
    cx: 0, cy: 0, tx: 10, ty: 6,
    type: "scout",
    hasCamera: true,
  })

  // Fragment 2: A lone robot elsewhere (disconnected)
  spawnUnit({
    cx: 0, cy: 0, tx: 5, ty: 5,
    type: "maintenance_bot",
    hasCamera: false, // abstract map only
    fragmentOffsetX: 40,
    fragmentOffsetY: 10,
  })

  // Fragment 3: Another isolated robot
  spawnUnit({
    cx: 0, cy: 0, tx: 7, ty: 7,
    type: "scout",
    hasCamera: true,
    fragmentOffsetX: -30,
    fragmentOffsetY: 25,
  })
}

// Component that runs per-frame game logic inside the R3F render loop
function GameLoop() {
  const simAccumulator = useRef(0)
  const SIM_INTERVAL = 1.0 // 1 second per tick at 1x speed

  useFrame((_, delta) => {
    const speed = getGameSpeed()
    if (speed <= 0) return

    // Movement interpolation every frame
    movementSystem(delta, speed)

    // Sim tick at fixed intervals
    simAccumulator.current += delta * speed
    while (simAccumulator.current >= SIM_INTERVAL) {
      simAccumulator.current -= SIM_INTERVAL
      simulationTick()
    }
  })

  return null
}

// Track if world has been initialized
let worldInitialized = false

export default function App() {
  useEffect(() => {
    if (!worldInitialized) {
      worldInitialized = true
      initializeWorld()
      // Run initial exploration tick so terrain is visible
      simulationTick()
    }
  }, [])

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000", touchAction: "none" }}>
      <Canvas
        camera={{ position: [8, 30, 26], fov: 45, near: 0.1, far: 500 }}
        style={{ width: "100%", height: "100%" }}
      >
        <StormSky />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.6} color="#aabbff" />

        <FragmentRenderer />
        <UnitRenderer />

        <TopDownCamera />
        <UnitInput />
        <GameLoop />
      </Canvas>

      <GameUI />
    </div>
  )
}
