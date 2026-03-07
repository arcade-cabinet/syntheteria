/**
 * Procedural landscape props: rocks, ruins, debris, and trees.
 *
 * Inside the city: only debris, scrap, and broken electronics — no trees.
 * Outside the city (countryside): rocks, trees, and natural vegetation.
 *
 * Fog-aware: only renders props in areas revealed by player fragments.
 * Deterministically placed using seeded positions based on terrain.
 */
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { getTerrainHeight, isWalkable, WORLD_HALF, getAllFragments, worldToFogIndex } from "../ecs/terrain"
import { isInsideBuilding, isInsideCityBounds } from "../ecs/cityLayout"

// Simple seeded hash for deterministic placement
function hash(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}

interface PropInstance {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  type: "rock" | "scrap" | "debris" | "tree" | "dead_tree" | "ruin_pillar"
}

function generateProps(): PropInstance[] {
  const props: PropInstance[] = []
  const STEP = 6 // check every 6 world units

  for (let gz = -WORLD_HALF; gz < WORLD_HALF; gz += STEP) {
    for (let gx = -WORLD_HALF; gx < WORLD_HALF; gx += STEP) {
      const h = hash(gx, gz)

      // Skip water, buildings, and sparse placement
      if (!isWalkable(gx, gz)) continue
      if (isInsideBuilding(gx, gz)) continue
      if (h > 0.25) continue // ~25% chance of placing something

      const terrainY = getTerrainHeight(gx, gz)
      const typeRoll = hash(gx + 0.5, gz + 0.5)
      const rotY = hash(gx + 1, gz) * Math.PI * 2
      const scaleVar = 0.6 + hash(gx, gz + 1) * 0.8

      const inCity = isInsideCityBounds(gx, gz)

      if (inCity) {
        // Inside the city: only debris/scrap/broken electronics — NO trees
        if (typeRoll < 0.4) {
          // Scrap metal chunks
          props.push({
            position: [gx, terrainY, gz],
            rotation: [
              (hash(gx + 4, gz) - 0.5) * 0.5,
              rotY,
              (hash(gx, gz + 4) - 0.5) * 0.5,
            ],
            scale: [scaleVar * 0.5, 0.15, scaleVar * 0.8],
            type: "scrap",
          })
        } else if (typeRoll < 0.7) {
          // Electronic debris
          props.push({
            position: [gx, terrainY, gz],
            rotation: [
              (hash(gx + 4, gz) - 0.5) * 0.3,
              rotY,
              (hash(gx, gz + 4) - 0.5) * 0.3,
            ],
            scale: [scaleVar * 0.4, 0.1, scaleVar * 0.6],
            type: "debris",
          })
        } else if (typeRoll < 0.85) {
          // Broken pillar/pipe
          props.push({
            position: [gx, terrainY, gz],
            rotation: [
              (hash(gx + 3, gz) - 0.5) * 0.2,
              rotY,
              (hash(gx, gz + 3) - 0.5) * 0.2,
            ],
            scale: [0.25, scaleVar * 1.5, 0.25],
            type: "ruin_pillar",
          })
        }
        // else: nothing — keep some open space
      } else {
        // Outside the city: natural landscape — rocks and trees
        if (typeRoll < 0.3) {
          // Rocks
          props.push({
            position: [gx, terrainY, gz],
            rotation: [0, rotY, 0],
            scale: [scaleVar, scaleVar * 0.7, scaleVar],
            type: "rock",
          })
        } else if (typeRoll < 0.55) {
          // Living trees (countryside)
          props.push({
            position: [gx, terrainY, gz],
            rotation: [0, rotY, 0],
            scale: [scaleVar * 0.8, scaleVar * 2.5, scaleVar * 0.8],
            type: "tree",
          })
        } else if (typeRoll < 0.7) {
          // Dead trees
          props.push({
            position: [gx, terrainY, gz],
            rotation: [0, rotY, (hash(gx + 5, gz) - 0.5) * 0.15],
            scale: [0.15, scaleVar * 2.5, 0.15],
            type: "dead_tree",
          })
        } else {
          // Small debris even outside city
          props.push({
            position: [gx, terrainY, gz],
            rotation: [
              (hash(gx + 4, gz) - 0.5) * 0.5,
              rotY,
              (hash(gx, gz + 4) - 0.5) * 0.5,
            ],
            scale: [scaleVar * 0.5, 0.15, scaleVar * 0.8],
            type: "debris",
          })
        }
      }
    }
  }

  return props
}

const COLORS: Record<PropInstance["type"], number> = {
  rock: 0x666655,
  scrap: 0x555566,       // metallic grey-blue
  debris: 0x444455,      // dark grey-blue
  tree: 0x2a5a2a,        // green (countryside only)
  dead_tree: 0x443322,
  ruin_pillar: 0x3a3a4a, // dark blue-grey
}

/**
 * Instanced rendering of landscape props for performance.
 * Groups by type and uses InstancedMesh.
 * Fog-aware: hides instances in unrevealed areas.
 */
function PropGroup({
  instances,
  type,
}: {
  instances: PropInstance[]
  type: PropInstance["type"]
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const mesh = useMemo(() => {
    const dummy = new THREE.Object3D()
    let geo: THREE.BufferGeometry

    if (type === "rock") {
      geo = new THREE.DodecahedronGeometry(0.5, 0)
    } else if (type === "dead_tree") {
      geo = new THREE.CylinderGeometry(0.08, 0.15, 1, 5)
    } else if (type === "tree") {
      // Simple tree: cylinder trunk + cone canopy combined via merge
      // For simplicity, use a cone (canopy dominates visual)
      geo = new THREE.ConeGeometry(0.5, 1, 6)
    } else {
      geo = new THREE.BoxGeometry(1, 1, 1)
    }

    const instancedMesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshLambertMaterial({ color: COLORS[type] }),
      instances.length
    )

    instances.forEach((inst, i) => {
      dummy.position.set(...inst.position)
      dummy.rotation.set(...inst.rotation)
      dummy.scale.set(...inst.scale)

      // Lift objects so they sit on terrain
      if (type === "ruin_pillar" || type === "dead_tree" || type === "tree") {
        dummy.position.y += inst.scale[1] * 0.5
      } else if (type === "rock") {
        dummy.position.y += inst.scale[1] * 0.2
      }

      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)
    })
    instancedMesh.instanceMatrix.needsUpdate = true
    return instancedMesh
  }, [instances, type])

  // Fog-aware visibility update
  useFrame(() => {
    const m = meshRef.current ?? mesh
    const dummy = new THREE.Object3D()

    for (let i = 0; i < instances.length; i++) {
      const inst = instances[i]
      const fogIdx = worldToFogIndex(inst.position[0], inst.position[2])
      let revealed = false

      if (fogIdx >= 0) {
        const fragments = getAllFragments()
        for (const frag of fragments) {
          if (frag.fog[fogIdx] >= 1) {
            revealed = true
            break
          }
        }
      }

      if (revealed) {
        dummy.position.set(...inst.position)
        dummy.rotation.set(...inst.rotation)
        dummy.scale.set(...inst.scale)
        if (type === "ruin_pillar" || type === "dead_tree" || type === "tree") {
          dummy.position.y += inst.scale[1] * 0.5
        } else if (type === "rock") {
          dummy.position.y += inst.scale[1] * 0.2
        }
      } else {
        dummy.position.set(0, -100, 0)
        dummy.scale.set(0, 0, 0)
        dummy.rotation.set(0, 0, 0)
      }

      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  })

  return <primitive ref={meshRef} object={mesh} />
}

export function LandscapeProps() {
  const allProps = useMemo(() => generateProps(), [])

  const grouped = useMemo(() => {
    const groups: Record<PropInstance["type"], PropInstance[]> = {
      rock: [],
      scrap: [],
      debris: [],
      tree: [],
      dead_tree: [],
      ruin_pillar: [],
    }
    for (const p of allProps) {
      groups[p.type].push(p)
    }
    return groups
  }, [allProps])

  return (
    <>
      {Object.entries(grouped).map(
        ([type, instances]) =>
          instances.length > 0 && (
            <PropGroup
              key={type}
              type={type as PropInstance["type"]}
              instances={instances}
            />
          )
      )}
    </>
  )
}
