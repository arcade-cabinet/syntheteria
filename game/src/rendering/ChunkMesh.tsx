/**
 * Renders a single chunk as a mesh with vertex colors.
 * Abstract chunks use wireframe; detailed chunks use solid faces.
 */
import { useMemo } from "react"
import * as THREE from "three"
import { CHUNK_SIZE, TILE_SIZE, type Chunk } from "../ecs/fragments"

// Color palette
const COLOR_WATER = new THREE.Color(0x1a3a4a)
const COLOR_ROUGH = new THREE.Color(0x4a6a3a)
const COLOR_NORMAL = new THREE.Color(0x6a8a5a)
const COLOR_STEEP = new THREE.Color(0x8a7a5a)
const COLOR_ABSTRACT = new THREE.Color(0x00ffaa)

function getTerrainColor(height: number): THREE.Color {
  if (height < 0.15) return COLOR_WATER
  if (height < 0.3) return COLOR_ROUGH
  if (height < 0.7) return COLOR_NORMAL
  return COLOR_STEEP
}

interface ChunkMeshProps {
  chunk: Chunk
  offsetX: number
  offsetZ: number
}

export function DetailedChunkMesh({ chunk, offsetX, offsetZ }: ChunkMeshProps) {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    let vertIdx = 0
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const fog = chunk.fog[ty][tx]
        if (fog === "unexplored") continue

        const h = chunk.heightMap[ty][tx]
        const elevation = h * 0.5 // subtle height variation
        const x = (chunk.cx * CHUNK_SIZE + tx) * TILE_SIZE
        const z = (chunk.cy * CHUNK_SIZE + ty) * TILE_SIZE

        const color = fog === "abstract"
          ? COLOR_ABSTRACT
          : getTerrainColor(h)

        // Quad: two triangles
        // v0--v1
        // |  / |
        // v2--v3
        const s = TILE_SIZE
        positions.push(x, elevation, z)
        positions.push(x + s, elevation, z)
        positions.push(x, elevation, z + s)
        positions.push(x + s, elevation, z + s)

        for (let i = 0; i < 4; i++) {
          colors.push(color.r, color.g, color.b)
        }

        indices.push(vertIdx, vertIdx + 2, vertIdx + 1)
        indices.push(vertIdx + 1, vertIdx + 2, vertIdx + 3)
        vertIdx += 4
      }
    }

    if (positions.length === 0) return null

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }, [chunk, chunk.fog]) // Note: fog mutation won't trigger re-render automatically

  if (!geometry) return null

  return (
    <mesh geometry={geometry} position={[offsetX, 0, offsetZ]}>
      <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  )
}

export function AbstractChunkMesh({ chunk, offsetX, offsetZ }: ChunkMeshProps) {
  const geometry = useMemo(() => {
    const positions: number[] = []

    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        if (chunk.fog[ty][tx] !== "abstract") continue

        const h = chunk.heightMap[ty][tx]
        const elevation = h * 0.5
        const x = (chunk.cx * CHUNK_SIZE + tx) * TILE_SIZE
        const z = (chunk.cy * CHUNK_SIZE + ty) * TILE_SIZE
        const s = TILE_SIZE

        // Wireframe edges
        positions.push(x, elevation, z, x + s, elevation, z)
        positions.push(x + s, elevation, z, x + s, elevation, z + s)
        positions.push(x + s, elevation, z + s, x, elevation, z + s)
        positions.push(x, elevation, z + s, x, elevation, z)
      }
    }

    if (positions.length === 0) return null

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [chunk, chunk.fog])

  if (!geometry) return null

  return (
    <lineSegments geometry={geometry} position={[offsetX, 0, offsetZ]}>
      <lineBasicMaterial color={0x00ffaa} opacity={0.6} transparent />
    </lineSegments>
  )
}
