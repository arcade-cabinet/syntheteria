import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
	FLOOR_MATERIAL_PRESETS,
	getDefaultFloorMaterialForZone,
} from "../city/config/floorMaterialPresets";
import { resolveAssetUri } from "../config/assetUri";
import { gridToWorld, SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";
import { getActiveWorldSession } from "../world/session";
import type { WorldSessionSnapshot } from "../world/snapshots";

const FLOOR_COLORS: Record<string, number> = {
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
	return FLOOR_PRESET_TO_MATERIAL[floorPresetId] ?? floorPresetId;
}

interface FloorTextureBundle {
	map: THREE.Texture;
	normalMap: THREE.Texture;
	roughnessMap: THREE.Texture;
	aoMap: THREE.Texture;
	displacementMap: THREE.Texture;
}

/** Directions for 4-connected grid neighbors: +x, -x, +z, -z */
type EdgeDirection = "px" | "nx" | "pz" | "nz";

interface BlendEdge {
	direction: EdgeDirection;
	neighborColor: number;
}

function BlendEdgeStrip({
	direction,
	neighborColor,
	plateSize,
}: {
	direction: EdgeDirection;
	neighborColor: number;
	plateSize: number;
}) {
	const blendDepth = plateSize * 0.3;
	const blendWidth = plateSize * 0.98;
	let px = 0;
	let pz = 0;
	let sx = blendWidth;
	let sz = blendDepth;

	if (direction === "px") {
		px = plateSize / 2 - blendDepth / 2;
		sx = blendDepth;
		sz = blendWidth;
	} else if (direction === "nx") {
		px = -(plateSize / 2 - blendDepth / 2);
		sx = blendDepth;
		sz = blendWidth;
	} else if (direction === "pz") {
		pz = plateSize / 2 - blendDepth / 2;
	} else {
		pz = -(plateSize / 2 - blendDepth / 2);
	}

	// Inner strip: narrower, higher opacity for gradient falloff
	const innerDepth = blendDepth * 0.5;
	let ipx = 0;
	let ipz = 0;
	let isx = blendWidth;
	let isz = innerDepth;
	if (direction === "px") {
		ipx = plateSize / 2 - innerDepth / 2;
		isx = innerDepth;
		isz = blendWidth;
	} else if (direction === "nx") {
		ipx = -(plateSize / 2 - innerDepth / 2);
		isx = innerDepth;
		isz = blendWidth;
	} else if (direction === "pz") {
		ipz = plateSize / 2 - innerDepth / 2;
	} else {
		ipz = -(plateSize / 2 - innerDepth / 2);
	}

	return (
		<group>
			{/* Outer blend — wide, subtle */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.004, pz]}>
				<planeGeometry args={[sx, sz]} />
				<meshBasicMaterial
					color={neighborColor}
					transparent
					opacity={0.08}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
			{/* Inner blend — narrow, stronger for gradient */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[ipx, 0.005, ipz]}>
				<planeGeometry args={[isx, isz]} />
				<meshBasicMaterial
					color={neighborColor}
					transparent
					opacity={0.14}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
		</group>
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
		profile === "overview" ? 0.12 : profile === "ops" ? 0.10 : 0.09;
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
			{/* Zone transition blend edges */}
			{blendEdges.map((edge) => (
				<BlendEdgeStrip
					key={edge.direction}
					direction={edge.direction}
					neighborColor={edge.neighborColor}
					plateSize={plateWidth}
				/>
			))}
		</group>
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

	const orderedCells = useMemo(
		() =>
			[...(session?.sectorCells ?? [])]
				// Fog of war: only render cells the player has discovered
				.filter((cell) => cell.discovery_state >= 1)
				.sort((a, b) => (a.r === b.r ? a.q - b.q : a.r - b.r)),
		[session],
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
					const [map, normalMap, roughnessMap, aoMap, displacementMap] =
						await Promise.all([
							loader.loadAsync(presetTextureSources[`${preset.id}_map`]!),
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

		void loadTextures();

		return () => {
			cancelled = true;
		};
	}, [presetTextureSources]);

	return (
		<group>
			{orderedCells.map((cell) => {
				const edges: BlendEdge[] = [];
				const neighbors: [EdgeDirection, number, number][] = [
					["px", cell.q + 1, cell.r],
					["nx", cell.q - 1, cell.r],
					["pz", cell.q, cell.r + 1],
					["nz", cell.q, cell.r - 1],
				];
				for (const [dir, nq, nr] of neighbors) {
					const neighbor = cellByCoord.get(`${nq},${nr}`);
					if (
						neighbor &&
						neighbor.floor_preset_id !== cell.floor_preset_id
					) {
						const nColor =
							FLOOR_COLORS[neighbor.floor_preset_id] ??
							FLOOR_COLORS.command_core;
						edges.push({ direction: dir, neighborColor: nColor });
					}
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
						textures={
							texturesByPreset.get(
								resolveTexturePresetId(cell.floor_preset_id),
							) ??
							texturesByPreset.get("command_concrete") ??
							null
						}
						blendEdges={edges}
					/>
				);
			})}
		</group>
	);
}
