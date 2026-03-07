/**
 * Renders all units. Reads worldPosition directly in useFrame — never in React state.
 */
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { units } from "../ecs/world"
import type { Entity } from "../ecs/types"

const UNIT_COLOR = 0x44aaff
const UNIT_SELECTED_COLOR = 0xffaa00
const UNIT_SIZE = 0.4

function UnitMesh({ entity }: { entity: Entity }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(
        entity.worldPosition.x,
        entity.worldPosition.y + 0.6,
        entity.worldPosition.z
      )
    }
    if (ringRef.current) {
      ringRef.current.position.set(
        entity.worldPosition.x,
        entity.worldPosition.y + 0.05,
        entity.worldPosition.z
      )
      ringRef.current.visible = entity.unit.selected
    }
  })

  return (
    <>
      <mesh ref={meshRef}>
        <boxGeometry args={[UNIT_SIZE, UNIT_SIZE * 1.2, UNIT_SIZE]} />
        <meshLambertMaterial
          color={entity.unit.selected ? UNIT_SELECTED_COLOR : UNIT_COLOR}
        />
      </mesh>
      {/* Selection ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.4, 0.55, 16]} />
        <meshBasicMaterial color={UNIT_SELECTED_COLOR} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

export function UnitRenderer() {
  return (
    <>
      {Array.from(units).map((entity) => (
        <UnitMesh key={entity.id} entity={entity} />
      ))}
    </>
  )
}
