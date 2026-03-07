/**
 * Renders all units and buildings at their displayed positions.
 * Maintenance bots: small box with optional arm/camera indicators.
 * Fabrication unit: larger structure with status glow.
 */
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { units, buildings } from "../ecs/world"
import { getFragment } from "../ecs/terrain"
import { hasCamera, hasArms } from "../ecs/types"
import type { Entity } from "../ecs/types"

const COLOR_UNIT = 0x44aaff
const COLOR_SELECTED = 0xffaa00
const COLOR_BROKEN = 0xff4444
const COLOR_BUILDING = 0x888888
const COLOR_BUILDING_UNPOWERED = 0x554444
const COLOR_FABRICATION = 0xaa8844

function UnitMesh({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Mesh>(null)
  const rightArmRef = useRef<THREE.Mesh>(null)
  const cameraRef = useRef<THREE.Mesh>(null)

  const entityHasCamera = hasCamera(entity)
  const entityHasArms = hasArms(entity)

  useFrame(() => {
    const frag = getFragment(entity.mapFragment.fragmentId)
    const ox = frag?.displayOffset.x ?? 0
    const oz = frag?.displayOffset.z ?? 0

    if (groupRef.current) {
      groupRef.current.position.set(
        entity.worldPosition.x + ox,
        entity.worldPosition.y,
        entity.worldPosition.z + oz
      )
    }
    if (ringRef.current) {
      ringRef.current.visible = entity.unit.selected
    }
  })

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.4]} />
        <meshLambertMaterial
          color={entity.unit.selected ? COLOR_SELECTED : COLOR_UNIT}
        />
      </mesh>

      {/* Legs/treads */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.55, 0.2, 0.5]} />
        <meshLambertMaterial color={0x335588} />
      </mesh>

      {/* Camera (top dome) — red if broken */}
      <mesh ref={cameraRef} position={[0, 0.9, 0.1]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshLambertMaterial
          color={entityHasCamera ? 0x00ff88 : COLOR_BROKEN}
          emissive={entityHasCamera ? 0x004422 : 0x440000}
        />
      </mesh>

      {/* Left arm — red if broken */}
      <mesh ref={leftArmRef} position={[-0.35, 0.45, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshLambertMaterial
          color={entityHasArms ? 0x6688aa : COLOR_BROKEN}
        />
      </mesh>

      {/* Right arm */}
      <mesh ref={rightArmRef} position={[0.35, 0.45, 0]}>
        <boxGeometry args={[0.1, 0.4, 0.1]} />
        <meshLambertMaterial
          color={entityHasArms ? 0x6688aa : COLOR_BROKEN}
        />
      </mesh>

      {/* Selection ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={false}>
        <ringGeometry args={[0.5, 0.65, 16]} />
        <meshBasicMaterial color={COLOR_SELECTED} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function BuildingMesh({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    const frag = getFragment(entity.mapFragment.fragmentId)
    const ox = frag?.displayOffset.x ?? 0
    const oz = frag?.displayOffset.z ?? 0

    if (groupRef.current) {
      groupRef.current.position.set(
        entity.worldPosition.x + ox,
        entity.worldPosition.y,
        entity.worldPosition.z + oz
      )
    }
  })

  const isFabricator = entity.building.type === "fabrication_unit"
  const isPowered = entity.building.powered

  return (
    <group ref={groupRef}>
      {/* Base platform */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[1.6, 0.3, 1.6]} />
        <meshLambertMaterial
          color={isPowered ? COLOR_BUILDING : COLOR_BUILDING_UNPOWERED}
        />
      </mesh>

      {isFabricator && (
        <>
          {/* Main body */}
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[1.2, 0.8, 1.2]} />
            <meshLambertMaterial
              color={isPowered ? COLOR_FABRICATION : 0x554433}
            />
          </mesh>

          {/* Fabrication arm (top) */}
          <mesh position={[0, 1.3, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
            <meshLambertMaterial color={0x666666} />
          </mesh>

          {/* Status indicator light */}
          <mesh position={[0.5, 0.9, 0.61]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshLambertMaterial
              color={isPowered ? 0x00ff00 : COLOR_BROKEN}
              emissive={isPowered ? 0x00ff00 : COLOR_BROKEN}
            />
          </mesh>

          {/* Material hopper */}
          <mesh position={[0, 1.2, 0.4]}>
            <boxGeometry args={[0.4, 0.3, 0.3]} />
            <meshLambertMaterial color={0x777766} />
          </mesh>
        </>
      )}
    </group>
  )
}

export function UnitRenderer() {
  return (
    <>
      {Array.from(units).map((entity) => (
        <UnitMesh key={entity.id} entity={entity} />
      ))}
      {Array.from(buildings).map((entity) => (
        <BuildingMesh key={entity.id} entity={entity} />
      ))}
    </>
  )
}
