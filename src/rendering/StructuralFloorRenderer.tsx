import { useFrame, useThree } from "@react-three/fiber";
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import * as THREE from "three";
import {
	FLOOR_MATERIAL_PRESETS,
	getDefaultFloorMaterialForZone,
} from "../city/config/floorMaterialPresets";
import { resolveAssetUri } from "../config/assetUri";
import { getSnapshot, subscribe } from "../ecs/gameState";
import { gridToWorld, SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";
import { getActiveWorldSession } from "../world/session";
import type { WorldSessionSnapshot } from "../world/snapshots";
import {
	getStructuralCellRecords,
	requirePrimaryStructuralFragment,
} from "../world/structuralSpace";
import {
	type BlendEdge,
	computeBlendEdges,
	computeBlendStripParams,
	computeBreachStripParams,
	type EdgeDirection,
} from "./zoneBlendLogic";

export const FLOOR_COLORS: Record<string, number> = {
	command_core: 0x5e7385,
	corridor_transit: 0x71879b,
	fabrication: 0x7a634a,
	storage: 0x75614f,
	power: 0x62658a,
	habitation: 0x5a7f8f,
	breach_exposed: 0x50545f,
};

const FLOOR_ACCENTS: Record<string, number> = {
	command_core: 0x6ff3c8,
	corridor_transit: 0x8be6ff,
	fabrication: 0xf6c56a,
	storage: 0xc59d69,
	power: 0x88a7ff,
	habitation: 0x7ed6e5,
	breach_exposed: 0xff8f8f,
};

const floorPresetById = new Map(
	FLOOR_MATERIAL_PRESETS.map((preset) => [preset.id, preset]),
);

/**
 * Maps generation-assigned floorPresetIds to the material preset IDs
 * that actually have textures. Without this mapping, textures never load
 * because generation uses zone-semantic names (command_core, fabrication)
 * while material presets use material-semantic names (command_concrete,
 * fabrication_plate).
 */
const FLOOR_PRESET_TO_MATERIAL: Record<string, string> = {
	command_core: "command_concrete",
	corridor_transit: "service_walkway",
	fabrication: "fabrication_plate",
	storage: "fabrication_plate",
	habitation: "painted_habitation",
	power: "command_concrete",
	breach_exposed: "service_walkway",
};

function resolveTexturePresetId(floorPresetId: string): string {
	const resolved = FLOOR_PRESET_TO_MATERIAL[floorPresetId];
	if (!resolved) {
		throw new Error(
			`FATAL: No texture mapping for floor preset "${floorPresetId}". ` +
				`Add it to FLOOR_PRESET_TO_MATERIAL.`,
		);
	}
	return resolved;
}

interface FloorTextureBundle {
	map: THREE.Texture;
	normalMap: THREE.Texture;
	roughnessMap: THREE.Texture;
	aoMap: THREE.Texture;
	displacementMap: THREE.Texture;
}

// ---------------------------------------------------------------------------
// Blend edge gradient shader — smooth alpha falloff from edge inward
// ---------------------------------------------------------------------------

/**
 * Vertex shader for blend strips. Passes a normalized blend coordinate
 * (0 at the cell edge, 1 at the strip's inner boundary) for smooth falloff.
 */
const blendStripVertexShader = `
	varying float vBlendCoord;
	attribute float blendCoord;

	void main() {
		vBlendCoord = blendCoord;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

/**
 * Fragment shader for blend strips. Uses smoothstep for a soft gradient
 * that fades from the neighbor color at the edge to transparent inward.
 */
const blendStripFragmentShader = `
	uniform vec3 uColor;
	uniform float uOpacity;

	varying float vBlendCoord;

	void main() {
		// smoothstep falloff: full opacity at vBlendCoord=0 (edge),
		// fading to 0 at vBlendCoord=1 (inner boundary)
		float alpha = uOpacity * smoothstep(1.0, 0.0, vBlendCoord);
		gl_FragColor = vec4(uColor, alpha);
	}
`;

// ---------------------------------------------------------------------------
// Breach glow/crack shader — pulsing emissive crack at zone boundary
// ---------------------------------------------------------------------------

const breachGlowVertexShader = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const breachGlowFragmentShader = `
	uniform vec3 uGlowColor;
	uniform float uIntensity;
	uniform float uTime;
	uniform float uPulseSpeed;
	uniform float uCrackOpacity;

	varying vec2 vUv;

	void main() {
		// Crack line: bright center, sharp falloff on edges
		float crackDist = abs(vUv.y - 0.5) * 2.0;
		float crackLine = 1.0 - smoothstep(0.0, 0.4, crackDist);

		// Glow halo: wider, softer falloff
		float glowHalo = 1.0 - smoothstep(0.0, 1.0, crackDist);
		glowHalo *= 0.4;

		// Pulse animation
		float pulse = 0.7 + 0.3 * sin(uTime * uPulseSpeed);

		// Procedural crack variation along the length
		float variation = 0.8 + 0.2 * sin(vUv.x * 31.4 + uTime * 0.5);

		float alpha = (crackLine * uCrackOpacity + glowHalo * uIntensity) * pulse * variation;
		vec3 color = uGlowColor * (1.0 + crackLine * 0.5);

		gl_FragColor = vec4(color, alpha);
	}
`;

/**
 * Creates a plane geometry with a blendCoord attribute that varies from
 * 0 (at the cell edge) to 1 (at the inner boundary of the strip).
 * The gradient direction depends on which edge direction we're rendering.
 */
function makeBlendPlaneGeometry(
	sx: number,
	sz: number,
	direction: EdgeDirection,
): THREE.PlaneGeometry {
	const geo = new THREE.PlaneGeometry(sx, sz);
	const posAttr = geo.getAttribute("position");
	const count = posAttr.count;
	const coords = new Float32Array(count);

	for (let i = 0; i < count; i++) {
		// PlaneGeometry lies in XY plane (before rotation), UV-like coords
		const x = posAttr.getX(i);
		const y = posAttr.getY(i);

		let t: number;
		if (direction === "px") {
			// Strip depth is in the X direction (sx = depth after rotation)
			// Edge is at +x side, inner at -x side
			t = 1.0 - (x / sx + 0.5);
		} else if (direction === "nx") {
			// Edge is at -x side, inner at +x side
			t = x / sx + 0.5;
		} else if (direction === "pz") {
			// For pz/nz, strip depth is in the Y direction (sz = depth)
			// Edge is at +y side, inner at -y side
			t = 1.0 - (y / sz + 0.5);
		} else {
			// nz: edge at -y, inner at +y
			t = y / sz + 0.5;
		}

		coords[i] = Math.max(0, Math.min(1, t));
	}

	geo.setAttribute("blendCoord", new THREE.BufferAttribute(coords, 1));
	return geo;
}

/**
 * Soft gradient blend strip using a shader for smooth alpha interpolation.
 * Replaces the old dual-mesh approach with a single draw call per edge.
 */
function BlendEdgeStrip({
	direction,
	neighborColor,
	plateSize,
}: {
	direction: EdgeDirection;
	neighborColor: number;
	plateSize: number;
}) {
	const params = computeBlendStripParams(direction, plateSize);
	const { outer } = params;

	const geometry = useMemo(
		() => makeBlendPlaneGeometry(outer.sx, outer.sz, direction),
		[outer.sx, outer.sz, direction],
	);

	const uniforms = useMemo(
		() => ({
			uColor: { value: new THREE.Color(neighborColor) },
			uOpacity: { value: params.innerOpacity },
		}),
		[neighborColor, params.innerOpacity],
	);

	return (
		<mesh
			rotation={[-Math.PI / 2, 0, 0]}
			position={[outer.px, params.yOuter, outer.pz]}
			geometry={geometry}
		>
			<shaderMaterial
				uniforms={uniforms}
				vertexShader={blendStripVertexShader}
				fragmentShader={blendStripFragmentShader}
				transparent
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

/**
 * Breach boundary glow/crack effect. Renders a pulsing emissive crack
 * with a wider glow halo, visually distinct from soft zone blends.
 */
function BreachEdgeStrip({
	direction,
	plateSize,
}: {
	direction: EdgeDirection;
	plateSize: number;
}) {
	const params = computeBreachStripParams(direction, plateSize);
	const materialRef = useRef<THREE.ShaderMaterial>(null);

	const uniforms = useMemo(
		() => ({
			uGlowColor: { value: new THREE.Color(params.glowColor) },
			uIntensity: { value: params.glowIntensity },
			uTime: { value: 0 },
			uPulseSpeed: { value: params.pulseSpeed },
			uCrackOpacity: { value: params.crackOpacity },
		}),
		[
			params.glowColor,
			params.glowIntensity,
			params.pulseSpeed,
			params.crackOpacity,
		],
	);

	useFrame(({ clock }) => {
		if (materialRef.current) {
			materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
		}
	});

	return (
		<mesh
			rotation={[-Math.PI / 2, 0, 0]}
			position={[params.crack.px, params.yOffset, params.crack.pz]}
		>
			<planeGeometry args={[params.crack.sx, params.crack.sz]} />
			<shaderMaterial
				ref={materialRef}
				uniforms={uniforms}
				vertexShader={breachGlowVertexShader}
				fragmentShader={breachGlowFragmentShader}
				transparent
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

function StructuralCellMesh({
	q,
	r,
	floorPresetId,
	structuralZone,
	passable,
	profile,
	textures,
	blendEdges,
}: {
	q: number;
	r: number;
	floorPresetId: string;
	structuralZone: string;
	passable: number;
	profile: "default" | "overview" | "ops";
	textures: FloorTextureBundle | null;
	blendEdges: BlendEdge[];
}) {
	const pos = gridToWorld(q, r);
	const _preset =
		floorPresetById.get(floorPresetId) ??
		getDefaultFloorMaterialForZone(
			structuralZone === "command"
				? "core"
				: structuralZone === "transit"
					? "corridor"
					: structuralZone === "storage"
						? "storage"
						: structuralZone === "habitation"
							? "habitation"
							: structuralZone === "fabrication"
								? "fabrication"
								: "power",
		);
	const color =
		FLOOR_COLORS[floorPresetId] ??
		(passable ? FLOOR_COLORS.command_core : FLOOR_COLORS.breach_exposed);
	const accent = FLOOR_ACCENTS[floorPresetId] ?? 0x8be6ff;
	const emissive =
		floorPresetId === "power"
			? 0x5268a6
			: floorPresetId === "corridor_transit"
				? 0x27414d
				: floorPresetId === "command_core"
					? 0x18383a
					: 0x111111;
	const plateWidth = SECTOR_LATTICE_SIZE;
	const plateDepth = SECTOR_LATTICE_SIZE;
	const accentLength = plateWidth * 0.56;
	const accentWidth = profile === "ops" ? 0.04 : 0.05;
	const overlayOpacity =
		profile === "overview" ? 0.12 : profile === "ops" ? 0.1 : 0.09;
	const shellOpacity =
		profile === "overview" ? 0.06 : profile === "ops" ? 0.04 : 0.05;
	return (
		<group position={[pos.x, 0, pos.z]}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
				<planeGeometry args={[plateWidth * 1.02, plateDepth * 1.02]} />
				<meshBasicMaterial
					color={0x050d15}
					transparent
					opacity={shellOpacity}
					side={THREE.DoubleSide}
				/>
			</mesh>
			<mesh position={[0, -0.005, 0]} receiveShadow>
				<boxGeometry args={[plateWidth, 0.02, plateDepth]} />
				<meshStandardMaterial
					color={color}
					map={textures?.map ?? null}
					normalMap={textures?.normalMap ?? null}
					roughnessMap={textures?.roughnessMap ?? null}
					aoMap={textures?.aoMap ?? null}
					displacementMap={textures?.displacementMap ?? null}
					displacementScale={textures ? 0.01 : 0}
					emissive={emissive}
					emissiveIntensity={profile === "ops" ? 0.24 : 0.2}
					roughness={0.72}
					metalness={0.08}
				/>
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
				<planeGeometry args={[accentLength, accentWidth]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={passable ? overlayOpacity : overlayOpacity * 0.3}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
				<planeGeometry args={[accentWidth, plateDepth * 0.52]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={passable ? overlayOpacity * 0.48 : overlayOpacity * 0.24}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
			{/* Zone transition blend edges — shader-based gradient or breach glow */}
			{blendEdges.map((edge) =>
				edge.isBreach ? (
					<BreachEdgeStrip
						key={`breach_${edge.direction}`}
						direction={edge.direction}
						plateSize={plateWidth}
					/>
				) : (
					<BlendEdgeStrip
						key={edge.direction}
						direction={edge.direction}
						neighborColor={edge.neighborColor}
						plateSize={plateWidth}
					/>
				),
			)}
		</group>
	);
}

// ---------------------------------------------------------------------------
// VoidFillFloor — camera-following dark plane that fills the viewport
// ---------------------------------------------------------------------------

/** Floor extends this far from the camera in each direction */
const VOID_FLOOR_HALF_EXTENT = 200;

/** Dark fog color for void regions beyond the structural cells */
const VOID_FOG_COLOR = new THREE.Color(0x030508);

/** Faint grid accent for the void floor */
const VOID_GRID_COLOR = new THREE.Color(0x0a0e14);

const voidFloorVertexShader = `
	varying vec2 vWorldXZ;
	void main() {
		vec4 worldPos = modelMatrix * vec4(position, 1.0);
		vWorldXZ = worldPos.xz;
		gl_Position = projectionMatrix * viewMatrix * worldPos;
	}
`;

const voidFloorFragmentShader = `
	uniform vec3 uFogColor;
	uniform vec3 uGridColor;

	varying vec2 vWorldXZ;

	void main() {
		// Subtle grid lines at integer coordinates for visual grounding
		vec2 grid = abs(fract(vWorldXZ * 0.25) - 0.5);
		float gridLine = 1.0 - smoothstep(0.0, 0.04, min(grid.x, grid.y));
		gridLine *= 0.08;

		vec3 color = uFogColor + uGridColor * gridLine;
		gl_FragColor = vec4(color, 1.0);
	}
`;

/**
 * Infinite-looking dark floor that follows the camera to prevent void edges.
 * Sits below the structural cell meshes (y=-0.06) so it acts as a backdrop.
 * Single draw call with a subtle grid shader.
 */
function VoidFillFloor() {
	const meshRef = useRef<THREE.Mesh>(null);
	const { camera } = useThree();

	const uniforms = useMemo(
		() => ({
			uFogColor: { value: VOID_FOG_COLOR },
			uGridColor: { value: VOID_GRID_COLOR },
		}),
		[],
	);

	useFrame(() => {
		if (!meshRef.current) return;
		// Keep the floor centered under the camera so it always extends
		// beyond the frustum edges.
		meshRef.current.position.x = camera.position.x;
		meshRef.current.position.z = camera.position.z;
	});

	return (
		<mesh
			ref={meshRef}
			rotation={[-Math.PI / 2, 0, 0]}
			position={[0, -0.06, 0]}
			frustumCulled={false}
		>
			<planeGeometry
				args={[VOID_FLOOR_HALF_EXTENT * 2, VOID_FLOOR_HALF_EXTENT * 2]}
			/>
			<shaderMaterial
				uniforms={uniforms}
				vertexShader={voidFloorVertexShader}
				fragmentShader={voidFloorFragmentShader}
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

export function StructuralFloorRenderer({
	profile = "default",
	session: providedSession,
}: {
	profile?: "default" | "overview" | "ops";
	session?: WorldSessionSnapshot | null;
}) {
	const session = providedSession ?? getActiveWorldSession();
	// Re-render when game state updates (each tick) so discovery updates from exploration are visible
	const gameSnapshot = useSyncExternalStore(
		subscribe,
		getSnapshot,
		getSnapshot,
	);
	const presetTextureSources = useMemo(
		() =>
			Object.fromEntries(
				FLOOR_MATERIAL_PRESETS.flatMap((preset) => [
					[`${preset.id}_map`, resolveAssetUri(preset.textureSet.color)],
					[`${preset.id}_normal`, resolveAssetUri(preset.textureSet.normal)],
					[
						`${preset.id}_roughness`,
						resolveAssetUri(preset.textureSet.roughness),
					],
					[
						`${preset.id}_ao`,
						resolveAssetUri(preset.textureSet.ao ?? preset.textureSet.color),
					],
					[
						`${preset.id}_height`,
						resolveAssetUri(
							preset.textureSet.height ?? preset.textureSet.color,
						),
					],
				]),
			),
		[],
	);
	const [texturesByPreset, setTexturesByPreset] = useState<
		Map<string, FloorTextureBundle>
	>(new Map());

	// Read discovery state from structuralSpace (where explorationSystem writes).
	// Re-read when game tick changes so exploration updates become visible (single source of truth).
	const liveDiscovery = useMemo(() => {
		try {
			const fragment = requirePrimaryStructuralFragment();
			const records = getStructuralCellRecords(fragment.id);
			const map = new Map<string, number>();
			for (const rec of records) {
				map.set(`${rec.q},${rec.r}`, rec.discoveryState);
			}
			return map;
		} catch {
			return new Map<string, number>();
		}
	}, [gameSnapshot.tick]);

	const orderedCells = useMemo(
		() =>
			[...(session?.sectorCells ?? [])]
				.filter((cell) => {
					const live = liveDiscovery.get(`${cell.q},${cell.r}`);
					return (live ?? cell.discovery_state) >= 1;
				})
				.sort((a, b) => (a.r === b.r ? a.q - b.q : a.r - b.r)),
		[session, liveDiscovery],
	);

	/** Lookup cell by grid coordinate for zone blending */
	const cellByCoord = useMemo(() => {
		const map = new Map<string, (typeof orderedCells)[number]>();
		for (const cell of orderedCells) {
			map.set(`${cell.q},${cell.r}`, cell);
		}
		return map;
	}, [orderedCells]);

	useEffect(() => {
		let cancelled = false;
		const loader = new THREE.TextureLoader();

		async function loadTextures() {
			const next = new Map<string, FloorTextureBundle>();
			await Promise.all(
				FLOOR_MATERIAL_PRESETS.map(async (preset) => {
					const repeatX = preset.textureRepeat[0] ?? 1;
					const repeatY = preset.textureRepeat[1] ?? 1;
					const mapUri = presetTextureSources[`${preset.id}_map`];
					if (!mapUri) {
						throw new Error(
							`FATAL: Floor texture for preset "${preset.id}" resolved to empty URI. ` +
								`Asset pipeline is broken — check resolveAssetUri() and metro.config.js assetExts.`,
						);
					}
					const [map, normalMap, roughnessMap, aoMap, displacementMap] =
						await Promise.all([
							loader.loadAsync(mapUri),
							loader.loadAsync(presetTextureSources[`${preset.id}_normal`]!),
							loader.loadAsync(presetTextureSources[`${preset.id}_roughness`]!),
							loader.loadAsync(presetTextureSources[`${preset.id}_ao`]!),
							loader.loadAsync(presetTextureSources[`${preset.id}_height`]!),
						]);
					const bundle: FloorTextureBundle = {
						map,
						normalMap,
						roughnessMap,
						aoMap,
						displacementMap,
					};
					for (const texture of Object.values(bundle)) {
						texture.wrapS = THREE.RepeatWrapping;
						texture.wrapT = THREE.RepeatWrapping;
						texture.repeat.set(repeatX, repeatY);
						texture.anisotropy = 8;
						texture.needsUpdate = true;
					}
					next.set(preset.id, bundle);
				}),
			);
			if (!cancelled) {
				setTexturesByPreset(next);
			}
		}

		loadTextures().catch((err) => {
			console.error(
				"[StructuralFloorRenderer] Floor texture loading FAILED:",
				err,
			);
			throw err;
		});

		return () => {
			cancelled = true;
		};
	}, [presetTextureSources]);

	return (
		<group>
			{/* Dark backdrop plane that follows the camera — prevents void edges */}
			<VoidFillFloor />
			{orderedCells.map((cell) => {
				const edges = computeBlendEdges(
					cell,
					cellByCoord as Map<
						string,
						{ q: number; r: number; floor_preset_id: string }
					>,
					FLOOR_COLORS,
					FLOOR_COLORS.command_core,
				);

				const resolvedPresetId = resolveTexturePresetId(cell.floor_preset_id);
				const cellTextures =
					texturesByPreset.size > 0
						? (texturesByPreset.get(resolvedPresetId) ?? null)
						: null;

				// Fail hard if textures loaded but this preset is missing
				if (texturesByPreset.size > 0 && !cellTextures) {
					throw new Error(
						`FATAL: No texture bundle for floor preset "${cell.floor_preset_id}" ` +
							`(resolved: "${resolvedPresetId}"). ` +
							`Available: [${Array.from(texturesByPreset.keys()).join(", ")}]`,
					);
				}

				return (
					<StructuralCellMesh
						key={`${cell.q},${cell.r}`}
						q={cell.q}
						r={cell.r}
						floorPresetId={cell.floor_preset_id}
						structuralZone={cell.structural_zone}
						passable={cell.passable}
						profile={profile}
						textures={cellTextures}
						blendEdges={edges}
					/>
				);
			})}
		</group>
	);
}
