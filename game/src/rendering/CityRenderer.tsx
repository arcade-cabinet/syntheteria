/**
 * Renders city buildings as instanced meshes.
 * Each building type has a distinct visual style appropriate for
 * a post-apocalyptic industrial city.
 */
import { useMemo } from "react"
import * as THREE from "three"
import { getCityBuildings, type CityBuilding } from "../ecs/cityLayout"
import { getTerrainHeight } from "../ecs/terrain"

const COLORS: Record<CityBuilding["type"], number> = {
  factory: 0x4a4a50,
  warehouse: 0x5a5548,
  tower: 0x3a3a44,
  ruin: 0x6a5a4a,
  wall: 0x555555,
}

const DARK_ACCENT: Record<CityBuilding["type"], number> = {
  factory: 0x333338,
  warehouse: 0x44403a,
  tower: 0x2a2a32,
  ruin: 0x4a3e34,
  wall: 0x3a3a3a,
}

function BuildingGroup({ buildings, type }: { buildings: CityBuilding[]; type: CityBuilding["type"] }) {
  const { mainMesh, accentMesh } = useMemo(() => {
    const dummy = new THREE.Object3D()

    // Main building bodies
    const mainGeo = new THREE.BoxGeometry(1, 1, 1)
    const mainMat = new THREE.MeshLambertMaterial({ color: COLORS[type] })
    const main = new THREE.InstancedMesh(mainGeo, mainMat, buildings.length)

    // Accent details (roof/trim) — slightly darker, offset on top
    const accentGeo = new THREE.BoxGeometry(1, 1, 1)
    const accentMat = new THREE.MeshLambertMaterial({ color: DARK_ACCENT[type] })
    const accent = new THREE.InstancedMesh(accentGeo, accentMat, buildings.length)

    buildings.forEach((b, i) => {
      const terrainY = getTerrainHeight(b.x, b.z)

      // Main body
      dummy.position.set(b.x, terrainY + b.height / 2, b.z)
      dummy.scale.set(b.halfW * 2, b.height, b.halfD * 2)
      dummy.rotation.set(0, 0, 0)

      if (type === "ruin") {
        // Ruins are tilted slightly
        dummy.rotation.z = (Math.sin(b.x * 7.3 + b.z * 3.1) * 0.08)
        dummy.rotation.x = (Math.cos(b.x * 2.7 + b.z * 5.9) * 0.05)
      }

      dummy.updateMatrix()
      main.setMatrixAt(i, dummy.matrix)

      // Accent: roof overhang / ledge
      if (type === "factory") {
        // Factory: flat roof with slight overhang
        dummy.position.set(b.x, terrainY + b.height + 0.15, b.z)
        dummy.scale.set(b.halfW * 2 + 0.3, 0.3, b.halfD * 2 + 0.3)
        dummy.rotation.set(0, 0, 0)
      } else if (type === "warehouse") {
        // Warehouse: peaked roof
        dummy.position.set(b.x, terrainY + b.height + 0.4, b.z)
        dummy.scale.set(b.halfW * 1.6, 0.8, b.halfD * 2 + 0.2)
        dummy.rotation.set(0, 0, 0)
      } else if (type === "tower") {
        // Tower: smaller cap on top
        dummy.position.set(b.x, terrainY + b.height + 0.3, b.z)
        dummy.scale.set(b.halfW * 1.4, 0.6, b.halfD * 1.4)
        dummy.rotation.set(0, 0, 0)
      } else if (type === "ruin") {
        // Ruins: broken top edge
        dummy.position.set(b.x + 0.2, terrainY + b.height * 0.8, b.z - 0.1)
        dummy.scale.set(b.halfW * 1.2, b.height * 0.3, b.halfD * 0.6)
        dummy.rotation.set(0.1, 0.3, 0.05)
      } else {
        // Wall: flat top
        dummy.position.set(b.x, terrainY + b.height + 0.1, b.z)
        dummy.scale.set(b.halfW * 2 + 0.2, 0.2, b.halfD * 2 + 0.2)
        dummy.rotation.set(0, 0, 0)
      }
      dummy.updateMatrix()
      accent.setMatrixAt(i, dummy.matrix)
    })

    main.instanceMatrix.needsUpdate = true
    accent.instanceMatrix.needsUpdate = true

    return { mainMesh: main, accentMesh: accent }
  }, [buildings, type])

  return (
    <>
      <primitive object={mainMesh} />
      <primitive object={accentMesh} />
    </>
  )
}

/**
 * Window detail layer — adds glowing windows to buildings for atmosphere.
 */
function WindowDetails({ buildings }: { buildings: CityBuilding[] }) {
  const mesh = useMemo(() => {
    // Only add windows to factory, warehouse, tower types
    const eligible = buildings.filter(b => b.type !== "wall" && b.type !== "ruin" && b.height > 2)
    if (eligible.length === 0) return null

    // Estimate total windows
    const windowData: { x: number; y: number; z: number; sx: number; sy: number }[] = []

    for (const b of eligible) {
      const numFloors = Math.floor(b.height / 1.5)
      const terrainY = getTerrainHeight(b.x, b.z)

      for (let floor = 0; floor < numFloors; floor++) {
        const y = terrainY + 1 + floor * 1.5

        // Windows on front and back (z faces)
        const numWindowsX = Math.floor(b.halfW * 2 / 1.2)
        for (let w = 0; w < numWindowsX; w++) {
          const wx = b.x - b.halfW + 0.6 + w * 1.2
          // Use hash to decide if window is lit
          const hash = Math.sin(wx * 127.1 + y * 311.7 + b.z * 71.3) * 43758.5453
          if (hash - Math.floor(hash) > 0.7) continue // some windows dark

          windowData.push({ x: wx, y, z: b.z + b.halfD + 0.01, sx: 0.4, sy: 0.5 })
          windowData.push({ x: wx, y, z: b.z - b.halfD - 0.01, sx: 0.4, sy: 0.5 })
        }

        // Windows on sides (x faces)
        const numWindowsZ = Math.floor(b.halfD * 2 / 1.2)
        for (let w = 0; w < numWindowsZ; w++) {
          const wz = b.z - b.halfD + 0.6 + w * 1.2
          const hash = Math.sin(b.x * 99.3 + y * 177.1 + wz * 233.7) * 43758.5453
          if (hash - Math.floor(hash) > 0.7) continue

          windowData.push({ x: b.x + b.halfW + 0.01, y, z: wz, sx: 0.4, sy: 0.5 })
          windowData.push({ x: b.x - b.halfW - 0.01, y, z: wz, sx: 0.4, sy: 0.5 })
        }
      }
    }

    if (windowData.length === 0) return null

    const dummy = new THREE.Object3D()
    const geo = new THREE.PlaneGeometry(1, 1)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x224433,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    })
    const instancedMesh = new THREE.InstancedMesh(geo, mat, windowData.length)

    windowData.forEach((w, i) => {
      dummy.position.set(w.x, w.y, w.z)
      dummy.scale.set(w.sx, w.sy, 1)
      // Determine facing direction based on position offset from building
      dummy.lookAt(w.x, w.y, w.z + 1) // default facing, works for z-face windows
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
      factory: [],
      warehouse: [],
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
      <WindowDetails buildings={allBuildings} />
    </>
  )
}
