/**
 * Syntheteria — Phase 1 Prototype
 * Continuous terrain with navmesh-based free 3D navigation.
 */
import { useEffect, useRef } from "react"
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

// Initialize the game world
function initializeWorld() {
  // Build navigation graph from terrain
  buildNavGraph()

  // Group 1: Two robots near the center
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
    hasCamera: false, // abstract map only
  })

  // Group 3: Another isolated robot to the west
  spawnUnit({
    x: -23,
    z: 32,
    type: "scout",
    hasCamera: true,
  })
}

function GameLoop() {
  const simAccumulator = useRef(0)
  const SIM_INTERVAL = 1.0 // 1 second per tick at 1x speed

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

let worldInitialized = false

export default function App() {
  useEffect(() => {
    if (!worldInitialized) {
      worldInitialized = true
      initializeWorld()
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
