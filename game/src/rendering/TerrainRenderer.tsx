/**
 * Renders continuous terrain as a single mesh with vertex colors.
 * Fog-of-war controls visibility: unexplored vertices are transparent (void).
 * Detailed fog shows full terrain colors; abstract fog shows wireframe overlay.
 */
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import {
  WORLD_SIZE,
  WORLD_HALF,
  getTerrainHeight,
  buildCombinedFog,
  type FogState,
} from "../ecs/terrain"

// Terrain mesh resolution — one vertex per world unit
const MESH_STEP = 1
const VERTS_PER_AXIS = Math.floor(WORLD_SIZE / MESH_STEP) + 1

// Color palette (same as old system)
const COLOR_WATER = new THREE.Color(0x1a3a4a)
const COLOR_ROUGH = new THREE.Color(0x4a6a3a)
const COLOR_NORMAL = new THREE.Color(0x6a8a5a)
const COLOR_STEEP = new THREE.Color(0x8a7a5a)
const COLOR_ABSTRACT = new THREE.Color(0x00ffaa)

function getTerrainColor(rawHeight: number): THREE.Color {
  if (rawHeight < 0.15) return COLOR_WATER
  if (rawHeight < 0.3) return COLOR_ROUGH
  if (rawHeight < 0.7) return COLOR_NORMAL
  return COLOR_STEEP
}

export function TerrainRenderer() {
  const meshRef = useRef<THREE.Mesh>(null)
  const abstractRef = useRef<THREE.LineSegments>(null)

  // Build terrain geometry once
  const { detailedGeo, abstractGeo, colorAttr, alphaAttr, abstractAlphaAttr } =
    useMemo(() => {
      // --- Detailed terrain (solid triangles) ---
      const positions: number[] = []
      const colors: number[] = []
      const alphas: number[] = []
      const indices: number[] = []

      // Generate vertex grid
      for (let gz = 0; gz < VERTS_PER_AXIS; gz++) {
        for (let gx = 0; gx < VERTS_PER_AXIS; gx++) {
          const wx = gx * MESH_STEP - WORLD_HALF
          const wz = gz * MESH_STEP - WORLD_HALF
          const h = getTerrainHeight(wx, wz)
          const rawH = h / 0.5 // un-scale for color lookup

          positions.push(wx, h, wz)

          const color = getTerrainColor(rawH)
          colors.push(color.r, color.g, color.b)
          alphas.push(0) // start invisible, fog will reveal
        }
      }

      // Generate triangle indices
      for (let gz = 0; gz < VERTS_PER_AXIS - 1; gz++) {
        for (let gx = 0; gx < VERTS_PER_AXIS - 1; gx++) {
          const v0 = gz * VERTS_PER_AXIS + gx
          const v1 = v0 + 1
          const v2 = v0 + VERTS_PER_AXIS
          const v3 = v2 + 1

          indices.push(v0, v2, v1)
          indices.push(v1, v2, v3)
        }
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      )
      const colorAttribute = new THREE.Float32BufferAttribute(colors, 3)
      geo.setAttribute("color", colorAttribute)
      const alphaAttribute = new THREE.Float32BufferAttribute(alphas, 1)
      geo.setAttribute("alpha", alphaAttribute)
      geo.setIndex(indices)
      geo.computeVertexNormals()

      // --- Abstract terrain (wireframe overlay for abstract fog) ---
      const absPositions: number[] = []
      const absAlphas: number[] = []

      for (let gz = 0; gz < VERTS_PER_AXIS - 1; gz++) {
        for (let gx = 0; gx < VERTS_PER_AXIS - 1; gx++) {
          const wx = gx * MESH_STEP - WORLD_HALF
          const wz = gz * MESH_STEP - WORLD_HALF
          const s = MESH_STEP

          const h00 = getTerrainHeight(wx, wz)
          const h10 = getTerrainHeight(wx + s, wz)
          const h01 = getTerrainHeight(wx, wz + s)
          const h11 = getTerrainHeight(wx + s, wz + s)

          // 4 edges of the quad
          absPositions.push(wx, h00, wz, wx + s, h10, wz)
          absPositions.push(wx + s, h10, wz, wx + s, h11, wz + s)
          absPositions.push(wx + s, h11, wz + s, wx, h01, wz + s)
          absPositions.push(wx, h01, wz + s, wx, h00, wz)

          // 2 alpha values per line segment (start, end)
          for (let i = 0; i < 8; i++) absAlphas.push(0)
        }
      }

      const absGeo = new THREE.BufferGeometry()
      absGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(absPositions, 3)
      )
      const absAlphaAttr = new THREE.Float32BufferAttribute(absAlphas, 1)
      absGeo.setAttribute("alpha", absAlphaAttr)

      return {
        detailedGeo: geo,
        abstractGeo: absGeo,
        colorAttr: colorAttribute,
        alphaAttr: alphaAttribute,
        abstractAlphaAttr: absAlphaAttr,
      }
    }, [])

  // Update fog visibility every frame
  useFrame(() => {
    const fog = buildCombinedFog()

    // Update detailed mesh alpha based on fog
    for (let gz = 0; gz < VERTS_PER_AXIS; gz++) {
      for (let gx = 0; gx < VERTS_PER_AXIS; gx++) {
        const vertIdx = gz * VERTS_PER_AXIS + gx
        const fogIdx = gz * WORLD_SIZE + gx // fog grid is same resolution
        const fogState = (fogIdx >= 0 && fogIdx < fog.length ? fog[fogIdx] : 0) as FogState

        // Detailed fog = fully visible, abstract = dim, unexplored = invisible
        if (fogState === 2) {
          alphaAttr.setX(vertIdx, 1.0)
          // Restore terrain color
          const wx = gx * MESH_STEP - WORLD_HALF
          const wz = gz * MESH_STEP - WORLD_HALF
          const rawH = getTerrainHeight(wx, wz) / 0.5
          const color = getTerrainColor(rawH)
          colorAttr.setXYZ(vertIdx, color.r, color.g, color.b)
        } else if (fogState === 1) {
          alphaAttr.setX(vertIdx, 0.0) // abstract areas use wireframe only
          colorAttr.setXYZ(vertIdx, 0, 0, 0)
        } else {
          alphaAttr.setX(vertIdx, 0.0)
        }
      }
    }
    alphaAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    // Update abstract wireframe visibility
    let absIdx = 0
    for (let gz = 0; gz < VERTS_PER_AXIS - 1; gz++) {
      for (let gx = 0; gx < VERTS_PER_AXIS - 1; gx++) {
        const fogIdx = gz * WORLD_SIZE + gx
        const fogState = (fogIdx >= 0 && fogIdx < fog.length ? fog[fogIdx] : 0) as FogState
        const a = fogState === 1 ? 0.6 : fogState === 2 ? 0.0 : 0.0

        // 4 edges × 2 vertices per edge = 8 alpha values
        for (let i = 0; i < 8; i++) {
          abstractAlphaAttr.setX(absIdx++, a)
        }
      }
    }
    abstractAlphaAttr.needsUpdate = true
  })

  return (
    <>
      {/* Detailed terrain */}
      <mesh ref={meshRef} geometry={detailedGeo}>
        <meshLambertMaterial
          vertexColors
          transparent
          side={THREE.DoubleSide}
          onBeforeCompile={(shader) => {
            // Inject alpha attribute into the shader
            shader.vertexShader = shader.vertexShader.replace(
              "void main() {",
              "attribute float alpha;\nvarying float vAlpha;\nvoid main() {\nvAlpha = alpha;"
            )
            shader.fragmentShader = shader.fragmentShader.replace(
              "void main() {",
              "varying float vAlpha;\nvoid main() {"
            )
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <dithering_fragment>",
              "#include <dithering_fragment>\nif (vAlpha < 0.01) discard;\ngl_FragColor.a *= vAlpha;"
            )
          }}
        />
      </mesh>

      {/* Abstract wireframe overlay */}
      <lineSegments ref={abstractRef} geometry={abstractGeo}>
        <lineBasicMaterial
          color={0x00ffaa}
          transparent
          onBeforeCompile={(shader) => {
            shader.vertexShader = shader.vertexShader.replace(
              "void main() {",
              "attribute float alpha;\nvarying float vAlpha;\nvoid main() {\nvAlpha = alpha;"
            )
            shader.fragmentShader = shader.fragmentShader.replace(
              "void main() {",
              "varying float vAlpha;\nvoid main() {"
            )
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <dithering_fragment>",
              "#include <dithering_fragment>\nif (vAlpha < 0.01) discard;\ngl_FragColor.a *= vAlpha;"
            )
          }}
        />
      </lineSegments>
    </>
  )
}
