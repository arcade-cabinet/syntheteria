import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { resolveAssetUri } from "../config/assetUri";
import {
	FLOOR_MATERIAL_PRESETS,
	getDefaultFloorMaterialForZone,
} from "../city/config/floorMaterialPresets";
import { getActiveWorldSession } from "../world/session";
import { gridToWorld, SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";
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

const floorPresetById = new Map(FLOOR_MATERIAL_PRESETS.map((preset) => [preset.id, preset]));

interface FloorTextureBundle {
	map: THREE.Texture;
	normalMap: THREE.Texture;
	roughnessMap: THREE.Texture;
	aoMap: THREE.Texture;
	displacementMap: THREE.Texture;
}

function StructuralCellMesh({
	q,
	r,
	floorPresetId,
	structuralZone,
	passable,
	profile,
	textures,
}: {
	q: number;
	r: number;
	floorPresetId: string;
	structuralZone: string;
	passable: number;
	profile: "default" | "overview" | "ops";
	textures: FloorTextureBundle | null;
}) {
	const pos = gridToWorld(q, r);
	const preset =
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
	const accentWidth = profile === "ops" ? 0.08 : 0.1;
	const overlayOpacity =
		profile === "overview" ? 0.18 : profile === "ops" ? 0.16 : 0.15;
	const shellOpacity =
		profile === "overview" ? 0.08 : profile === "ops" ? 0.06 : 0.07;
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
			<mesh position={[0, -0.02, 0]} receiveShadow>
				<boxGeometry args={[plateWidth, 0.12, plateDepth]} />
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
			<mesh position={[0, 0.035, 0]}>
				<boxGeometry args={[accentLength, 0.01, accentWidth]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={passable ? overlayOpacity : overlayOpacity * 0.3}
				/>
			</mesh>
			<mesh position={[0, 0.031, 0]}>
				<boxGeometry args={[accentWidth, 0.01, plateDepth * 0.52]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={passable ? overlayOpacity * 0.48 : overlayOpacity * 0.24}
				/>
			</mesh>
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
					[
						`${preset.id}_map`,
						resolveAssetUri(preset.textureSet.color),
					],
					[
						`${preset.id}_normal`,
						resolveAssetUri(preset.textureSet.normal),
					],
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
						resolveAssetUri(preset.textureSet.height ?? preset.textureSet.color),
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
			[...(session?.sectorCells ?? [])].sort((a, b) =>
				a.r === b.r ? a.q - b.q : a.r - b.r,
			),
		[session],
	);

	if (!session) {
		return null;
	}

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
			{orderedCells.map((cell) => (
				<StructuralCellMesh
					key={`${cell.q},${cell.r}`}
					q={cell.q}
					r={cell.r}
					floorPresetId={cell.floor_preset_id}
					structuralZone={cell.structural_zone}
					passable={cell.passable}
					profile={profile}
					textures={
						texturesByPreset.get(cell.floor_preset_id) ??
						texturesByPreset.get("command_core") ??
						null
					}
				/>
			))}
		</group>
	);
}
