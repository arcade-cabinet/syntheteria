/**
 * CultDomeRenderer — translucent hemisphere energy shields at cult POIs.
 *
 * For each cult breach_altar or cult_stronghold with HP > 0, renders a
 * translucent hemisphere growing from the sphere surface. Color by sect:
 *   - Static Remnants: red/crimson
 *   - Null Monks: purple/violet
 *   - Lost Signal: green/teal
 *
 * The dome uses BackSide rendering so the interior is visible from outside.
 * Dome radius = corruptionRadius from CultStructure trait.
 */

import { useFrame } from "@react-three/fiber";
import type { World } from "koota";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import { CultStructure } from "../ecs/traits/cult";
import { sphereModelPlacement } from "./spherePlacement";

// ---------------------------------------------------------------------------
// Sect dome colors
// ---------------------------------------------------------------------------

export const SECT_DOME_COLORS: Record<string, THREE.Color> = {
	static_remnants: new THREE.Color(0.8, 0.15, 0.1), // red/crimson
	null_monks: new THREE.Color(0.55, 0.15, 0.75), // purple/violet
	lost_signal: new THREE.Color(0.1, 0.7, 0.55), // green/teal
};

const DEFAULT_DOME_COLOR = new THREE.Color(0.5, 0.2, 0.2);

/** Map cult faction IDs to their sect for dome coloring. */
function getSectFromPosition(tileX: number, tileZ: number): string {
	// Deterministic sect assignment from position hash
	const hash = (tileX * 31 + tileZ * 17) % 3;
	const sects = ["static_remnants", "null_monks", "lost_signal"];
	return sects[hash];
}

// ---------------------------------------------------------------------------
// Data extraction (pure — for testing)
// ---------------------------------------------------------------------------

/** POI structure types that get dome shields. */
const DOME_STRUCTURE_TYPES = new Set(["breach_altar", "cult_stronghold"]);

export interface CultDomeData {
	tileX: number;
	tileZ: number;
	radius: number;
	sect: string;
}

/**
 * Extract dome data from the ECS world. Pure function for testability.
 */
export function buildCultDomeData(
	world: World,
	boardWidth: number,
	boardHeight: number,
): CultDomeData[] {
	const domes: CultDomeData[] = [];

	for (const entity of world.query(CultStructure)) {
		const s = entity.get(CultStructure);
		if (!s) continue;
		if (!DOME_STRUCTURE_TYPES.has(s.structureType)) continue;
		if (s.hp <= 0) continue;

		domes.push({
			tileX: s.tileX,
			tileZ: s.tileZ,
			radius: s.corruptionRadius,
			sect: getSectFromPosition(s.tileX, s.tileZ),
		});
	}

	return domes;
}

// ---------------------------------------------------------------------------
// Dome mesh material
// ---------------------------------------------------------------------------

const DOME_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOME_FRAG = /* glsl */ `
  precision mediump float;

  uniform vec3  uColor;
  uniform float uTime;
  uniform float uAlpha;

  varying vec3  vNormal;
  varying vec3  vWorldPos;

  void main() {
    // Fresnel effect — brighter at edges, more transparent at center
    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0))), 2.0);

    // Subtle pulse
    float pulse = 0.85 + 0.15 * sin(uTime * 1.5 + vWorldPos.x * 2.0 + vWorldPos.z * 3.0);

    // Hexagonal pattern (faux force field look)
    vec2 hexUV = vWorldPos.xz * 1.5;
    float hex = abs(sin(hexUV.x * 6.28) * sin(hexUV.y * 6.28));
    float hexLine = smoothstep(0.02, 0.05, hex);

    vec3 color = uColor * pulse;
    // Add bright edge lines for hex pattern
    color += uColor * 0.3 * (1.0 - hexLine);

    float alpha = uAlpha * (0.15 + fresnel * 0.5) * pulse;
    // Hex grid lines slightly more opaque
    alpha += (1.0 - hexLine) * 0.08;

    gl_FragColor = vec4(color, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Single dome component
// ---------------------------------------------------------------------------

function CultDome({
	data,
	boardWidth,
	boardHeight,
}: {
	data: CultDomeData;
	boardWidth: number;
	boardHeight: number;
}) {
	const meshRef = useRef<THREE.Mesh>(null);

	const { position, quaternion } = useMemo(() => {
		return sphereModelPlacement(
			data.tileX,
			data.tileZ,
			boardWidth,
			boardHeight,
			0,
		);
	}, [data.tileX, data.tileZ, boardWidth, boardHeight]);

	const color = SECT_DOME_COLORS[data.sect] ?? DEFAULT_DOME_COLOR;
	const domeRadius = data.radius * TILE_SIZE_M;

	const uniforms = useMemo(
		() => ({
			uColor: { value: color },
			uTime: { value: 0 },
			uAlpha: { value: 0.35 },
		}),
		[color],
	);

	useFrame((state) => {
		uniforms.uTime.value = state.clock.elapsedTime;
	});

	return (
		<mesh
			ref={meshRef}
			position={position}
			quaternion={quaternion}
			renderOrder={5}
		>
			<sphereGeometry
				args={[domeRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
			/>
			<shaderMaterial
				vertexShader={DOME_VERT}
				fragmentShader={DOME_FRAG}
				uniforms={uniforms}
				transparent
				depthWrite={false}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

export interface CultDomeRendererProps {
	world: World;
	boardWidth: number;
	boardHeight: number;
}

export function CultDomeRenderer({
	world,
	boardWidth,
	boardHeight,
}: CultDomeRendererProps) {
	const domesRef = useRef<CultDomeData[]>([]);
	const lastUpdate = useRef(0);

	useFrame((state) => {
		const now = state.clock.elapsedTime;
		if (now - lastUpdate.current < 1.0) return; // update every second
		lastUpdate.current = now;
		domesRef.current = buildCultDomeData(world, boardWidth, boardHeight);
	});

	// Initial build
	useEffect(() => {
		domesRef.current = buildCultDomeData(world, boardWidth, boardHeight);
	}, [world, boardWidth, boardHeight]);

	return (
		<>
			{domesRef.current.map((d) => (
				<CultDome
					key={`${d.tileX},${d.tileZ}`}
					data={d}
					boardWidth={boardWidth}
					boardHeight={boardHeight}
				/>
			))}
		</>
	);
}
