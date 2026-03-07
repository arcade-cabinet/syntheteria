/**
 * Procedural landscape props: rocks, ruins, debris, and industrial remnants.
 * Deterministically placed using seeded positions based on terrain.
 */
import { useMemo } from "react"
import * as THREE from "three"
import { getTerrainHeight, isWalkable, WORLD_HALF } from "../ecs/terrain"
import { isInsideBuilding } from "../ecs/cityLayout"

// Simple seeded hash for deterministic placement
function hash(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return n - Math.floor(n)
}

interface PropInstance {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  type: "rock" | "ruin_wall" | "ruin_pillar" | "debris" | "dead_tree"
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

      if (typeRoll < 0.3) {
        // Rocks
        props.push({
          position: [gx, terrainY, gz],
          rotation: [0, rotY, 0],
          scale: [scaleVar, scaleVar * 0.7, scaleVar],
          type: "rock",
        })
      } else if (typeRoll < 0.5) {
        // Ruin walls
        props.push({
          position: [gx, terrainY, gz],
          rotation: [0, rotY, (hash(gx + 2, gz) - 0.5) * 0.3],
          scale: [scaleVar * 1.5, scaleVar * 1.2, 0.3],
          type: "ruin_wall",
        })
      } else if (typeRoll < 0.65) {
        // Ruin pillars
        props.push({
          position: [gx, terrainY, gz],
          rotation: [
            (hash(gx + 3, gz) - 0.5) * 0.2,
            rotY,
            (hash(gx, gz + 3) - 0.5) * 0.2,
          ],
          scale: [0.3, scaleVar * 2, 0.3],
          type: "ruin_pillar",
        })
      } else if (typeRoll < 0.85) {
        // Debris / scrap metal
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
      } else {
        // Dead trees (bare trunks)
        props.push({
          position: [gx, terrainY, gz],
          rotation: [0, rotY, (hash(gx + 5, gz) - 0.5) * 0.15],
          scale: [0.15, scaleVar * 2.5, 0.15],
          type: "dead_tree",
        })
      }
    }
  }

  return props
}

const COLORS: Record<PropInstance["type"], number> = {
  rock: 0x666655,
  ruin_wall: 0x7a7060,
  ruin_pillar: 0x8a7a6a,
  debris: 0x555544,
  dead_tree: 0x443322,
}

/**
 * Instanced rendering of landscape props for performance.
 * Groups by type and uses InstancedMesh.
 */
function PropGroup({
  instances,
  type,
}: {
  instances: PropInstance[]
  type: PropInstance["type"]
}) {
  const meshRef = useMemo(() => {
    const dummy = new THREE.Object3D()
    const mesh = new THREE.InstancedMesh(
      type === "rock"
        ? new THREE.DodecahedronGeometry(0.5, 0)
        : type === "dead_tree"
          ? new THREE.CylinderGeometry(0.08, 0.15, 1, 5)
          : new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: COLORS[type] }),
      instances.length
    )

    instances.forEach((inst, i) => {
      dummy.position.set(...inst.position)
      dummy.rotation.set(...inst.rotation)
      dummy.scale.set(...inst.scale)

      // Lift objects so they sit on terrain
      if (type === "ruin_pillar" || type === "dead_tree") {
        dummy.position.y += inst.scale[1] * 0.5
      } else if (type === "ruin_wall") {
        dummy.position.y += inst.scale[1] * 0.5
      } else if (type === "rock") {
        dummy.position.y += inst.scale[1] * 0.2
      }

      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    return mesh
  }, [instances, type])

  return <primitive object={meshRef} />
}

export function LandscapeProps() {
  const allProps = useMemo(() => generateProps(), [])

  const grouped = useMemo(() => {
    const groups: Record<PropInstance["type"], PropInstance[]> = {
      rock: [],
      ruin_wall: [],
      ruin_pillar: [],
      debris: [],
      dead_tree: [],
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
