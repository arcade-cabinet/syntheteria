/**
 * Renders city buildings as instanced meshes with a circuit-board aesthetic.
 *
 * Conduits are long thin walls with glowing trace lines along their tops.
 * Nodes are wider junction blocks with emissive circuit patterns.
 * Towers are tall pylons with blinking antenna lights.
 * Ruins are broken segments, partially collapsed.
 * Walls are perimeter segments.
 *
 * All buildings are fog-aware: only visible where the player's
 * combined fog-of-war has revealed terrain (fog state >= 1).
 */
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { getCityBuildings, type CityBuilding } from "../ecs/cityLayout"
import { getTerrainHeight, getAllFragments, worldToFogIndex } from "../ecs/terrain"

// Circuit-board color palette — dark metallic with cyan/green accents
const COLORS: Record<CityBuilding["type"], number> = {
  conduit: 0x1a1a2e,   // dark blue-black
  node: 0x16213e,      // slightly lighter dark blue
  tower: 0x0f3460,     // deep blue
  ruin: 0x2a2a2a,      // neutral dark grey
  wall: 0x1a1a1a,      // near-black
}

const ACCENT_COLORS: Record<CityBuilding["type"], number> = {
  conduit: 0x00e5ff,   // cyan trace on top
  node: 0x00ff88,      // green circuit pad
  tower: 0x00e5ff,     // cyan antenna
  ruin: 0x334433,      // dim green (faded)
  wall: 0x003344,      // dark teal
}

/**
 * Check if a world position has been revealed by any player fragment.
 * Returns true if fog state >= 1 in any fragment.
 */
function isRevealedAtPosition(x: number, z: number): boolean {
  const fogIdx = worldToFogIndex(x, z)
  if (fogIdx < 0) return false

  const fragments = getAllFragments()
  for (const frag of fragments) {
    if (frag.fog[fogIdx] >= 1) return true
  }
  return false
}

function BuildingGroup({
  buildings,
  type,
}: {
  buildings: CityBuilding[]
  type: CityBuilding["type"]
}) {
  const mainRef = useRef<THREE.InstancedMesh>(null)
  const accentRef = useRef<THREE.InstancedMesh>(null)
  const buildingsRef = useRef(buildings)
  buildingsRef.current = buildings

  const { mainMesh, accentMesh } = useMemo(() => {
    const dummy = new THREE.Object3D()

    // Main building bodies
    const mainGeo = new THREE.BoxGeometry(1, 1, 1)
    const mainMat = new THREE.MeshLambertMaterial({ color: COLORS[type] })
    const main = new THREE.InstancedMesh(mainGeo, mainMat, buildings.length)

    // Accent details — glowing traces/edges
    const accentGeo =
      type === "tower"
        ? new THREE.CylinderGeometry(0.08, 0.15, 1, 6)
        : new THREE.BoxGeometry(1, 1, 1)
    const accentMat = new THREE.MeshBasicMaterial({
      color: ACCENT_COLORS[type],
      transparent: true,
      opacity: 0.8,
    })
    const accent = new THREE.InstancedMesh(accentGeo, accentMat, buildings.length)

    buildings.forEach((b, i) => {
      const terrainY = getTerrainHeight(b.x, b.z)

      // Main body
      dummy.position.set(b.x, terrainY + b.height / 2, b.z)
      dummy.scale.set(b.halfW * 2, b.height, b.halfD * 2)
      dummy.rotation.set(0, 0, 0)

      if (type === "ruin") {
        dummy.rotation.z = Math.sin(b.x * 7.3 + b.z * 3.1) * 0.08
        dummy.rotation.x = Math.cos(b.x * 2.7 + b.z * 5.9) * 0.05
      }

      dummy.updateMatrix()
      main.setMatrixAt(i, dummy.matrix)

      // Accent: trace line on top of conduits, pad glow for nodes, etc.
      if (type === "conduit") {
        // Thin glowing strip along the top center
        dummy.position.set(b.x, terrainY + b.height + 0.05, b.z)
        dummy.scale.set(b.halfW * 2 * 0.3, 0.1, b.halfD * 2 + 0.1)
        dummy.rotation.set(0, 0, 0)
      } else if (type === "node") {
        // Flat glowing pad on top
        dummy.position.set(b.x, terrainY + b.height + 0.05, b.z)
        dummy.scale.set(b.halfW * 2 * 0.7, 0.08, b.halfD * 2 * 0.7)
        dummy.rotation.set(0, 0, 0)
      } else if (type === "tower") {
        // Tall antenna on top
        dummy.position.set(b.x, terrainY + b.height + 1.5, b.z)
        dummy.scale.set(1, 3, 1)
        dummy.rotation.set(0, 0, 0)
      } else if (type === "ruin") {
        // Faint broken trace
        dummy.position.set(b.x + 0.2, terrainY + b.height * 0.7, b.z - 0.1)
        dummy.scale.set(b.halfW * 1.0, 0.05, b.halfD * 0.5)
        dummy.rotation.set(0.1, 0.3, 0.05)
      } else {
        // Wall: edge glow on top
        dummy.position.set(b.x, terrainY + b.height + 0.05, b.z)
        dummy.scale.set(b.halfW * 2 + 0.1, 0.08, b.halfD * 2 + 0.1)
        dummy.rotation.set(0, 0, 0)
      }
      dummy.updateMatrix()
      accent.setMatrixAt(i, dummy.matrix)
    })

    main.instanceMatrix.needsUpdate = true
    accent.instanceMatrix.needsUpdate = true

    return { mainMesh: main, accentMesh: accent }
  }, [buildings, type])

  // Per-frame fog visibility update
  useFrame(() => {
    const main = mainRef.current ?? mainMesh
    const accent = accentRef.current ?? accentMesh
    const bs = buildingsRef.current
    const dummy = new THREE.Object3D()

    for (let i = 0; i < bs.length; i++) {
      const b = bs[i]
      const revealed = isRevealedAtPosition(b.x, b.z)

      if (revealed) {
        const terrainY = getTerrainHeight(b.x, b.z)
        dummy.position.set(b.x, terrainY + b.height / 2, b.z)
        dummy.scale.set(b.halfW * 2, b.height, b.halfD * 2)
        dummy.rotation.set(0, 0, 0)
        if (type === "ruin") {
          dummy.rotation.z = Math.sin(b.x * 7.3 + b.z * 3.1) * 0.08
          dummy.rotation.x = Math.cos(b.x * 2.7 + b.z * 5.9) * 0.05
        }
      } else {
        // Hide by scaling to zero
        dummy.position.set(0, -100, 0)
        dummy.scale.set(0, 0, 0)
        dummy.rotation.set(0, 0, 0)
      }
      dummy.updateMatrix()
      main.setMatrixAt(i, dummy.matrix)

      if (revealed) {
        const terrainY = getTerrainHeight(b.x, b.z)
        if (type === "conduit") {
          dummy.position.set(b.x, terrainY + b.height + 0.05, b.z)
          dummy.scale.set(b.halfW * 2 * 0.3, 0.1, b.halfD * 2 + 0.1)
          dummy.rotation.set(0, 0, 0)
        } else if (type === "node") {
          dummy.position.set(b.x, terrainY + b.height + 0.05, b.z)
          dummy.scale.set(b.halfW * 2 * 0.7, 0.08, b.halfD * 2 * 0.7)
          dummy.rotation.set(0, 0, 0)
        } else if (type === "tower") {
          dummy.position.set(b.x, terrainY + b.height + 1.5, b.z)
          dummy.scale.set(1, 3, 1)
          dummy.rotation.set(0, 0, 0)
        } else if (type === "ruin") {
          dummy.position.set(b.x + 0.2, terrainY + b.height * 0.7, b.z - 0.1)
          dummy.scale.set(b.halfW * 1.0, 0.05, b.halfD * 0.5)
          dummy.rotation.set(0.1, 0.3, 0.05)
        } else {
          dummy.position.set(b.x, terrainY + b.height + 0.05, b.z)
          dummy.scale.set(b.halfW * 2 + 0.1, 0.08, b.halfD * 2 + 0.1)
          dummy.rotation.set(0, 0, 0)
        }
      } else {
        dummy.position.set(0, -100, 0)
        dummy.scale.set(0, 0, 0)
        dummy.rotation.set(0, 0, 0)
      }
      dummy.updateMatrix()
      accent.setMatrixAt(i, dummy.matrix)
    }

    main.instanceMatrix.needsUpdate = true
    accent.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <primitive ref={mainRef} object={mainMesh} />
      <primitive ref={accentRef} object={accentMesh} />
    </>
  )
}

/**
 * Ground-level circuit trace lines — thin glowing lines on the ground
 * between buildings, reinforcing the circuit-board aesthetic.
 */
function CircuitTraces({ buildings }: { buildings: CityBuilding[] }) {
  const mesh = useMemo(() => {
    // Create ground-level trace lines connecting nearby conduits/nodes
    const traceData: { x: number; y: number; z: number; sx: number; sz: number }[] = []

    const conduits = buildings.filter((b) => b.type === "conduit" || b.type === "node")

    for (const b of conduits) {
      const terrainY = getTerrainHeight(b.x, b.z)
      // Hash-based decorative traces radiating from buildings
      const hash = Math.sin(b.x * 127.1 + b.z * 311.7) * 43758.5453
      const frac = hash - Math.floor(hash)
      if (frac > 0.4) continue

      // Short trace extending from building edge
      const dir = Math.floor(frac * 4) // 0=N, 1=E, 2=S, 3=W
      const len = 1 + frac * 3
      if (dir === 0 || dir === 2) {
        const zOff = dir === 0 ? b.halfD + len / 2 : -(b.halfD + len / 2)
        traceData.push({
          x: b.x,
          y: terrainY + 0.02,
          z: b.z + zOff,
          sx: 0.08,
          sz: len,
        })
      } else {
        const xOff = dir === 1 ? b.halfW + len / 2 : -(b.halfW + len / 2)
        traceData.push({
          x: b.x + xOff,
          y: terrainY + 0.02,
          z: b.z,
          sx: len,
          sz: 0.08,
        })
      }
    }

    if (traceData.length === 0) return null

    const dummy = new THREE.Object3D()
    const geo = new THREE.BoxGeometry(1, 0.02, 1)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.3,
    })
    const instancedMesh = new THREE.InstancedMesh(geo, mat, traceData.length)

    traceData.forEach((t, i) => {
      dummy.position.set(t.x, t.y, t.z)
      dummy.scale.set(t.sx, 1, t.sz)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)
    })

    instancedMesh.instanceMatrix.needsUpdate = true
    return instancedMesh
  }, [buildings])

  if (!mesh) return null
  return <primitive object={mesh} />
}

export function CityRenderer() {
  const allBuildings = useMemo(() => getCityBuildings(), [])

  const grouped = useMemo(() => {
    const groups: Record<CityBuilding["type"], CityBuilding[]> = {
      conduit: [],
      node: [],
      tower: [],
      ruin: [],
      wall: [],
    }
    for (const b of allBuildings) {
      groups[b.type].push(b)
    }
    return groups
  }, [allBuildings])

  return (
    <>
      {Object.entries(grouped).map(
        ([type, buildings]) =>
          buildings.length > 0 && (
            <BuildingGroup
              key={type}
              type={type as CityBuilding["type"]}
              buildings={buildings}
            />
          )
      )}
      <CircuitTraces buildings={allBuildings} />
    </>
  )
}
