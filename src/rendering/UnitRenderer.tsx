import { Text, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { BotAnimationState } from "../ai/steering/AnimationState";
import { getEntityAnimationState } from "../ai/steering/AnimationState";
import { getBotDefinition } from "../bots";
import { resolveAssetUri } from "../config/assetUri";
import { modelAssets } from "../config/modelAssets";
import type { BuildingEntity, UnitEntity } from "../ecs/traits";
import {
	Building,
	hasArms,
	hasCamera,
	Identity,
	MapFragment,
	Rotation,
	Unit,
	WorldPosition,
} from "../ecs/traits";
import { buildings, units } from "../ecs/world";
import { type BotLODLevel, getLODLevel } from "../systems/botLOD";
import {
	getActivePlacement,
	getGhostPosition,
} from "../systems/buildingPlacement";
import { getUnitExperience } from "../systems/experience";
import { getUnitTurnState, hasAnyPoints } from "../systems/turnSystem";
import { worldToGrid } from "../world/sectorCoordinates";
import {
	getSectorCell,
	getStructuralFragment,
	getSurfaceHeightAtWorldPosition,
} from "../world/structuralSpace";
import {
	CULTIST_AURA_COLOR,
	CULTIST_EMISSIVE,
	getBadgeColor,
	getBadgeLabel,
	getDamageRatio,
	getDamageVisuals,
	isCultistVisual,
} from "./unitVisuals";

const COLOR_SELECTED = 0xffaa00;
const COLOR_BUILDING = 0x888888;
const COLOR_BUILDING_UNPOWERED = 0x554444;
const COLOR_FABRICATION = 0xaa8844;
const COLOR_BROKEN = 0xff4444;
const FACTION_BEACON_COLORS: Record<string, number> = {
	player: 0x00cccc, // Cyan
	rogue: 0xffaa44, // Amber — Reclaimers
	cult: 0xd987ff, // Purple (legacy key)
	cultist: 0xd987ff, // Purple — Signal Choir / Iron Creed
	feral: 0x44cc44, // Green — Volt Collective
};

/**
 * Check if a rival unit is in a cell the player has discovered.
 * Player units are always visible.
 */
function isUnitVisibleToPlayer(entity: UnitEntity): boolean {
	const faction = entity.get(Identity)?.faction ?? "player";
	if (faction === "player") return true;

	const pos = entity.get(WorldPosition);
	if (!pos) return false;

	const { q, r } = worldToGrid(pos.x, pos.z);
	const cell = getSectorCell(q, r);
	// Show rival units only in discovered cells (discovery_state >= 1)
	return cell ? cell.discovery_state >= 1 : false;
}

function normalizeUnitMaterial(material: THREE.Material, beaconColor: number) {
	if (!(material instanceof THREE.MeshStandardMaterial)) {
		return;
	}

	const accent = new THREE.Color(beaconColor);
	material.color = material.color.clone().lerp(new THREE.Color(0xb7c7d6), 0.4);
	material.emissive = material.emissive.clone().lerp(accent, 0.12);
	material.emissiveIntensity = 0.22;
	material.roughness = Math.min(material.roughness ?? 0.92, 0.84);
	material.metalness = Math.max(material.metalness ?? 0.1, 0.12);
	material.side = THREE.DoubleSide;
	material.needsUpdate = true;
}

/**
 * Cultist-specific material treatment — dark purple/red corruption tones.
 * Heavier emissive, darker base, more metallic to look corrupted.
 */
function normalizeCultistMaterial(material: THREE.Material) {
	if (!(material instanceof THREE.MeshStandardMaterial)) {
		return;
	}

	// Dark corrupted base — purple-black
	material.color = material.color.clone().lerp(new THREE.Color(0x1a0a1e), 0.65);
	// Strong purple-red emissive glow
	material.emissive = new THREE.Color(0x8822aa);
	material.emissiveIntensity = 0.35;
	material.roughness = Math.min(material.roughness ?? 0.92, 0.7);
	material.metalness = Math.max(material.metalness ?? 0.1, 0.3);
	material.side = THREE.DoubleSide;
	material.needsUpdate = true;
}

const CULTIST_GLITCH_SPEED = 3.5;
const CULTIST_GLITCH_AMPLITUDE = 0.04;

const SPENT_GRAY = new THREE.Color(0x666666);
const GLOW_PULSE_SPEED = 2.5;
const GLOW_PULSE_MIN = 0.3;
const GLOW_PULSE_MAX = 1.0;
const SPENT_OPACITY = 0.6;

// ─── Visual movement interpolation ──────────────────────────────────────────
/** How fast the visual position catches up to the simulation position (lerp factor per frame) */
const POSITION_LERP_SPEED = 8;
/** If the gap exceeds this, snap instead of lerping (e.g., teleport/load) */
const POSITION_SNAP_THRESHOLD = 10;

// ─── Animation state visual constants ───────────────────────────────────────
const IDLE_BOB_SPEED = 1.8;
const IDLE_BOB_AMPLITUDE = 0.04;
const HARVEST_ROTATE_SPEED = 2.0;
const HARVEST_PULSE_SPEED = 3.0;
const ATTACK_FLASH_SPEED = 6.0;
const BUILDING_PULSE_SPEED = 2.5;
const COLOR_HARVEST_GLOW = new THREE.Color(0x00ffaa);
const COLOR_ATTACK_FLASH = new THREE.Color(0xff4444);
const COLOR_BUILDING_GLOW = new THREE.Color(0xddaa44);

/** Spark particle effect for damaged units */
function DamageSparks() {
	const sparkRef = useRef<THREE.Points>(null);
	const sparkCount = 6;

	const positions = useMemo(() => {
		const arr = new Float32Array(sparkCount * 3);
		for (let i = 0; i < sparkCount; i++) {
			arr[i * 3] = (Math.random() - 0.5) * 0.6;
			arr[i * 3 + 1] = Math.random() * 0.8 + 0.2;
			arr[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
		}
		return arr;
	}, []);

	useFrame(({ clock }) => {
		if (!sparkRef.current) return;
		const geo = sparkRef.current.geometry;
		const posAttr = geo.getAttribute("position");
		if (!posAttr) return;
		const arr = posAttr.array as Float32Array;
		const t = clock.getElapsedTime();
		for (let i = 0; i < sparkCount; i++) {
			arr[i * 3 + 1] =
				((arr[i * 3 + 1] + 0.02) % 1.0) + 0.2 + Math.sin(t * 10 + i) * 0.05;
		}
		posAttr.needsUpdate = true;
	});

	return (
		<points ref={sparkRef}>
			<bufferGeometry>
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>
			<pointsMaterial
				color={0xffaa44}
				size={0.06}
				transparent
				opacity={0.8}
				depthWrite={false}
			/>
		</points>
	);
}

/** Cultist aura ring -- glowing ground ring for cultist/rogue faction */
function CultistAura() {
	const ringRef = useRef<THREE.Mesh>(null);

	useFrame(({ clock }) => {
		if (!ringRef.current) return;
		const mat = ringRef.current.material as THREE.MeshBasicMaterial;
		mat.opacity = 0.15 + 0.1 * Math.sin(clock.getElapsedTime() * 2.0);
	});

	return (
		<mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
			<ringGeometry args={[0.6, 0.8, 24]} />
			<meshBasicMaterial
				color={CULTIST_AURA_COLOR}
				transparent
				opacity={0.2}
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</mesh>
	);
}

/** Mark level badge floating above a unit */
function MarkBadge({ markLevel }: { markLevel: number }) {
	const color = getBadgeColor(markLevel);
	const label = getBadgeLabel(markLevel);
	if (color === null || label === null) return null;

	return (
		<group position={[0, 1.8, 0]}>
			{/* Badge background disc */}
			<mesh>
				<circleGeometry args={[0.18, 16]} />
				<meshBasicMaterial
					color={0x111111}
					transparent
					opacity={0.7}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
			{/* Badge text */}
			<Text
				position={[0, 0, 0.01]}
				fontSize={0.2}
				color={new THREE.Color(color)}
				anchorX="center"
				anchorY="middle"
				depthOffset={-1}
			>
				{label}
			</Text>
		</group>
	);
}

function UnitMesh({ entity }: { entity: UnitEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const modelGroupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);
	const glowRingRef = useRef<THREE.Mesh>(null);
	const glowMatRef = useRef<THREE.MeshStandardMaterial>(null);
	const upgradeRef = useRef<THREE.Group>(null);
	const upgradeMatRef = useRef<THREE.MeshStandardMaterial>(null);
	const modelMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
	const originalColorsRef = useRef<THREE.Color[]>([]);
	const displayPosRef = useRef(new THREE.Vector3());
	const initializedRef = useRef(false);

	const unitComponent = entity.get(Unit);
	if (!unitComponent) {
		throw new Error(
			"UnitMesh: entity is missing Unit trait — cannot render a unit without a type",
		);
	}
	const unitType = unitComponent.type;
	const config = getBotDefinition(unitType);
	const modelPath = resolveAssetUri(modelAssets[config.model]);
	const gltf = useGLTF(modelPath);
	const scene = Array.isArray(gltf) ? gltf[0]?.scene : gltf.scene;
	const faction = entity.get(Identity)?.faction ?? "player";
	const isCultist = faction === "cultist";
	const beaconColor = FACTION_BEACON_COLORS[faction] ?? 0x8be6ff;
	const normalizedScene = useMemo<THREE.Group | null>(() => {
		if (!scene) {
			return null;
		}
		const box = new THREE.Box3().setFromObject(scene);
		const center = new THREE.Vector3();
		box.getCenter(center);
		const clone = scene.clone(true) as THREE.Group;
		clone.position.set(-center.x, -box.min.y, -center.z);
		const materials: THREE.MeshStandardMaterial[] = [];
		const origColors: THREE.Color[] = [];
		clone.traverse((child) => {
			if (!(child instanceof THREE.Mesh)) {
				return;
			}
			child.castShadow = true;
			child.receiveShadow = true;
			if (Array.isArray(child.material)) {
				child.material = child.material.map((material) => {
					if (material instanceof THREE.MeshStandardMaterial) {
						const next = material.clone();
						if (isCultist) {
							normalizeCultistMaterial(next);
						} else {
							normalizeUnitMaterial(next, beaconColor);
						}
						materials.push(next);
						origColors.push(next.color.clone());
						return next;
					}
					return material;
				});
				return;
			}
			if (child.material instanceof THREE.MeshStandardMaterial) {
				child.material = child.material.clone();
				if (isCultist) {
					normalizeCultistMaterial(child.material);
				} else {
					normalizeUnitMaterial(child.material, beaconColor);
				}
				materials.push(child.material);
				origColors.push(child.material.color.clone());
			}
		});
		modelMaterialsRef.current = materials;
		originalColorsRef.current = origColors;
		return clone;
	}, [beaconColor, isCultist, scene]);

	useFrame(({ clock }, delta) => {
		const frag = entity.has(MapFragment)
			? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			const wp = entity.get(WorldPosition)!;

			// LOD check — hide units that are too far from camera
			const entityId = entity.get(Identity)?.id ?? "";
			const lod = getLODLevel(entityId, wp.x + ox, wp.z + oz);
			groupRef.current.visible = lod !== "hidden";
			const targetX = wp.x + ox;
			const targetY = wp.y;
			const targetZ = wp.z + oz;

			// Smooth visual interpolation — lerp display position toward simulation position
			const dp = displayPosRef.current;
			if (!initializedRef.current) {
				dp.set(targetX, targetY, targetZ);
				initializedRef.current = true;
			} else {
				const gapX = targetX - dp.x;
				const gapY = targetY - dp.y;
				const gapZ = targetZ - dp.z;
				const gap = Math.sqrt(gapX * gapX + gapY * gapY + gapZ * gapZ);

				if (gap > POSITION_SNAP_THRESHOLD) {
					dp.set(targetX, targetY, targetZ);
				} else {
					const t = Math.min(1, POSITION_LERP_SPEED * delta);
					dp.x += gapX * t;
					dp.y += gapY * t;
					dp.z += gapZ * t;
				}
			}

			groupRef.current.position.set(dp.x, dp.y, dp.z);

			const rot = entity.get(Rotation);
			if (rot) {
				groupRef.current.rotation.set(0, rot.y, 0);
			}
		}
		if (ringRef.current) {
			ringRef.current.visible = entity.get(Unit)?.selected ?? false;
		}

		const entityId = entity.get(Identity)?.id ?? "";
		const hasPoints = hasAnyPoints(entityId);

		// ─── Animation state visual effects ─────────────────────────────
		const animState: BotAnimationState = getEntityAnimationState(entityId);
		if (modelGroupRef.current) {
			switch (animState) {
				case "idle": {
					const bob =
						Math.sin(clock.elapsedTime * IDLE_BOB_SPEED) * IDLE_BOB_AMPLITUDE;
					modelGroupRef.current.position.y = bob;
					modelGroupRef.current.rotation.y = 0;
					break;
				}
				case "walking": {
					modelGroupRef.current.position.y = 0;
					modelGroupRef.current.rotation.y = 0;
					break;
				}
				case "harvesting": {
					modelGroupRef.current.rotation.y =
						clock.elapsedTime * HARVEST_ROTATE_SPEED;
					modelGroupRef.current.position.y = 0;
					break;
				}
				case "attacking": {
					modelGroupRef.current.position.y = 0;
					modelGroupRef.current.rotation.y = 0;
					break;
				}
				case "building": {
					const pump =
						Math.abs(Math.sin(clock.elapsedTime * BUILDING_PULSE_SPEED)) * 0.06;
					modelGroupRef.current.position.y = pump;
					modelGroupRef.current.rotation.y = 0;
					break;
				}
			}
		}

		// Material effects: spent dimming + animation state color overlays
		const mats = modelMaterialsRef.current;
		const origColors = originalColorsRef.current;
		for (let i = 0; i < mats.length; i++) {
			const mat = mats[i]!;
			const orig = origColors[i]!;
			if (hasPoints) {
				mat.color.copy(orig);
				mat.opacity = 1.0;
				mat.transparent = false;

				// Animation state color overlays (skip for cultists — they use glitch emissive)
				if (!isCultist) {
					switch (animState) {
						case "harvesting": {
							const hPulse =
								0.5 + 0.5 * Math.sin(clock.elapsedTime * HARVEST_PULSE_SPEED);
							mat.emissive.copy(COLOR_HARVEST_GLOW);
							mat.emissiveIntensity = 0.15 + hPulse * 0.2;
							break;
						}
						case "attacking": {
							const flash =
								0.5 + 0.5 * Math.sin(clock.elapsedTime * ATTACK_FLASH_SPEED);
							mat.emissive.copy(COLOR_ATTACK_FLASH);
							mat.emissiveIntensity = 0.1 + flash * 0.35;
							break;
						}
						case "building": {
							const bPulse =
								0.5 + 0.5 * Math.sin(clock.elapsedTime * BUILDING_PULSE_SPEED);
							mat.emissive.copy(COLOR_BUILDING_GLOW);
							mat.emissiveIntensity = 0.12 + bPulse * 0.18;
							break;
						}
						default: {
							mat.emissiveIntensity = 0.22;
							break;
						}
					}
				}
			} else {
				mat.color.copy(orig).lerp(SPENT_GRAY, 0.55);
				mat.opacity = SPENT_OPACITY;
				mat.transparent = true;
				if (!isCultist) {
					mat.emissiveIntensity = 0.1;
				}
			}
		}

		// Damage visual degradation — reduce glow and desaturate materials
		const unitComponents = entity.get(Unit)?.components ?? [];
		const damageRatio = getDamageRatio(unitComponents);
		if (damageRatio > 0) {
			const damageVis = getDamageVisuals(damageRatio);
			for (let i = 0; i < mats.length; i++) {
				const mat = mats[i]!;
				mat.emissiveIntensity *= damageVis.glowIntensity;
				if (!isCultist) {
					const gray = 0.3 + damageVis.desaturation * 0.2;
					mat.color.lerp(
						new THREE.Color(gray, gray, gray),
						damageVis.desaturation * 0.3,
					);
				}
			}
		}

		// Cultist emissive overlay from unitVisuals constants
		if (isCultist) {
			for (const mat of mats) {
				mat.emissive = new THREE.Color(CULTIST_EMISSIVE);
			}
		}

		// Cultist glitch effect: subtle emissive flicker + micro position jitter
		if (isCultist && groupRef.current) {
			const t = clock.elapsedTime * CULTIST_GLITCH_SPEED;
			const flicker = Math.sin(t * 7.3) * Math.sin(t * 13.1);
			const jitterX =
				flicker > 0.7 ? CULTIST_GLITCH_AMPLITUDE * Math.sin(t * 47) : 0;
			const jitterZ =
				flicker > 0.7 ? CULTIST_GLITCH_AMPLITUDE * Math.cos(t * 51) : 0;
			groupRef.current.position.x += jitterX;
			groupRef.current.position.z += jitterZ;
			for (const mat of mats) {
				mat.emissiveIntensity = 0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 2.1));
			}
		}

		// Upgrade indicator — pulsing diamond above upgrade-eligible units
		if (upgradeRef.current) {
			const xp = getUnitExperience(entityId);
			if (xp?.upgradeEligible && !isCultist) {
				upgradeRef.current.visible = true;
				upgradeRef.current.rotation.y = clock.elapsedTime * 1.5;
				upgradeRef.current.position.y =
					1.8 + Math.sin(clock.elapsedTime * 2.5) * 0.06;
				if (upgradeMatRef.current) {
					upgradeMatRef.current.emissiveIntensity =
						0.6 + 0.3 * Math.sin(clock.elapsedTime * 3);
				}
			} else {
				upgradeRef.current.visible = false;
			}
		}
	});

	const modelScale = (config.scale || 1) * 1.25;
	const showCultist = isCultistVisual(faction);
	const renderComponents = entity.get(Unit)?.components ?? [];
	const markLevel =
		faction === "player" ? (entity.get(Unit)?.markLevel ?? 1) : 0;
	const renderDamageRatio = getDamageRatio(renderComponents);
	const renderDamageVisuals = getDamageVisuals(renderDamageRatio);

	return (
		<group ref={groupRef}>
			<group ref={modelGroupRef}>
				{normalizedScene ? (
					<primitive
						object={normalizedScene}
						scale={[modelScale, modelScale, modelScale]}
					/>
				) : null}
			</group>
			<mesh position={[0, 1.4, 0]}>
				<sphereGeometry args={[0.09, 14, 14]} />
				<meshStandardMaterial
					color={beaconColor}
					emissive={beaconColor}
					emissiveIntensity={0.75}
					roughness={0.18}
					metalness={0.08}
				/>
			</mesh>
			<mesh position={[0, 0.15, 0]}>
				<cylinderGeometry args={[0.09, 0.14, 0.12, 10]} />
				<meshStandardMaterial
					color={0x14232d}
					emissive={beaconColor}
					emissiveIntensity={0.18}
					roughness={0.84}
					metalness={0.1}
				/>
			</mesh>
			{/* Cultist aura ring */}
			{showCultist && <CultistAura />}
			{/* Mark level badge for player units */}
			{faction === "player" && markLevel >= 1 && (
				<MarkBadge markLevel={markLevel} />
			)}
			{/* Damage spark particles */}
			{renderDamageVisuals.sparking && <DamageSparks />}
			{/* Selection ring */}
			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[0.5, 0.65, 16]} />
				<meshBasicMaterial color={COLOR_SELECTED} side={THREE.DoubleSide} />
			</mesh>
			{/* Upgrade indicator — floating diamond */}
			<group ref={upgradeRef} position={[0, 1.8, 0]} visible={false}>
				<mesh rotation={[0, 0, Math.PI / 4]}>
					<octahedronGeometry args={[0.1, 0]} />
					<meshStandardMaterial
						ref={upgradeMatRef}
						color={0xf6c56a}
						emissive={0xf6c56a}
						emissiveIntensity={0.6}
						roughness={0.2}
						metalness={0.1}
						transparent
						opacity={0.9}
					/>
				</mesh>
			</group>
			{/* Glow ring handled by GlowRingRenderer (instanced) */}
		</group>
	);
}

function BuildingMesh({ entity }: { entity: BuildingEntity }) {
	const groupRef = useRef<THREE.Group>(null);
	const ringRef = useRef<THREE.Mesh>(null);

	useFrame(() => {
		const frag = entity.has(MapFragment)
			? getStructuralFragment(entity.get(MapFragment)!.fragmentId)
			: null;
		const ox = frag?.displayOffset.x ?? 0;
		const oz = frag?.displayOffset.z ?? 0;

		if (groupRef.current) {
			groupRef.current.position.set(
				entity.get(WorldPosition)!.x + ox,
				entity.get(WorldPosition)!.y,
				entity.get(WorldPosition)!.z + oz,
			);
		}
		if (ringRef.current) {
			const selected = entity.get(Unit)!
				? entity.get(Unit)?.selected
				: entity.get(Building)?.selected;
			ringRef.current.visible = selected ?? false;
		}
	});

	const buildingType = entity.get(Building)?.type ?? "";
	const isPowered = entity.get(Building)?.powered;

	return (
		<group ref={groupRef}>
			{/* Shared base platform for all buildings */}
			<mesh position={[0, 0.15, 0]} castShadow receiveShadow>
				<boxGeometry args={[1.6, 0.3, 1.6]} />
				<meshStandardMaterial
					color={isPowered ? COLOR_BUILDING : COLOR_BUILDING_UNPOWERED}
					roughness={isPowered ? 0.82 : 0.9}
					metalness={isPowered ? 0.14 : 0.08}
					emissive={isPowered ? 0x111a22 : 0x0a0808}
					emissiveIntensity={isPowered ? 0.12 : 0.06}
					side={THREE.DoubleSide}
				/>
			</mesh>

			{/* Fabrication Unit — boxy with chimney and status light */}
			{buildingType === "fabrication_unit" && (
				<>
					<mesh position={[0, 0.7, 0]} castShadow receiveShadow>
						<boxGeometry args={[1.2, 0.8, 1.2]} />
						<meshStandardMaterial
							color={isPowered ? COLOR_FABRICATION : 0x554433}
							roughness={0.72}
							metalness={0.2}
							emissive={isPowered ? 0x2a1e0e : 0x0a0806}
							emissiveIntensity={isPowered ? 0.16 : 0.04}
						/>
					</mesh>
					<mesh position={[0, 1.3, 0]}>
						<cylinderGeometry args={[0.08, 0.08, 0.5, 8]} />
						<meshStandardMaterial
							color={0x666666}
							roughness={0.78}
							metalness={0.22}
						/>
					</mesh>
					<mesh position={[0.5, 0.9, 0.61]}>
						<sphereGeometry args={[0.08, 8, 8]} />
						<meshStandardMaterial
							color={isPowered ? 0x00ff00 : COLOR_BROKEN}
							emissive={isPowered ? 0x00ff00 : COLOR_BROKEN}
							emissiveIntensity={0.8}
							roughness={0.2}
							metalness={0.05}
						/>
					</mesh>
					<mesh position={[0, 1.2, 0.4]} castShadow>
						<boxGeometry args={[0.4, 0.3, 0.3]} />
						<meshStandardMaterial
							color={0x777766}
							roughness={0.74}
							metalness={0.16}
							emissive={0x0e0e0a}
							emissiveIntensity={0.08}
						/>
					</mesh>
				</>
			)}

			{/* Lightning Rod — tall pole with conductive tip and protection ring */}
			{buildingType === "lightning_rod" && (
				<>
					<mesh position={[0, 1.5, 0]} castShadow>
						<cylinderGeometry args={[0.06, 0.1, 2.5, 6]} />
						<meshStandardMaterial
							color={0x6e7080}
							roughness={0.58}
							metalness={0.42}
							emissive={0x0e1018}
							emissiveIntensity={0.08}
						/>
					</mesh>
					<mesh position={[0, 2.8, 0]}>
						<coneGeometry args={[0.12, 0.4, 6]} />
						<meshStandardMaterial
							color={0x99aa22}
							emissive={0x334400}
							emissiveIntensity={0.35}
							roughness={0.32}
							metalness={0.18}
						/>
					</mesh>
					<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
						<ringGeometry args={[7.5, 8, 32]} />
						<meshBasicMaterial
							color={0x00ffaa}
							transparent
							opacity={0.15}
							side={THREE.DoubleSide}
						/>
					</mesh>
				</>
			)}

			{/* Defense Turret — squat barrel on rotating mount */}
			{buildingType === "defense_turret" && (
				<>
					<mesh position={[0, 0.55, 0]} castShadow>
						<cylinderGeometry args={[0.55, 0.65, 0.5, 8]} />
						<meshStandardMaterial
							color={isPowered ? 0x6a7080 : 0x4a4a50}
							roughness={0.6}
							metalness={0.35}
							emissive={isPowered ? 0x0e1218 : 0x060608}
							emissiveIntensity={0.1}
						/>
					</mesh>
					{/* Barrel */}
					<mesh
						position={[0, 0.7, 0.5]}
						rotation={[Math.PI / 2, 0, 0]}
						castShadow
					>
						<cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
						<meshStandardMaterial
							color={0x555560}
							roughness={0.5}
							metalness={0.5}
						/>
					</mesh>
					{/* Muzzle tip */}
					<mesh position={[0, 0.7, 0.85]}>
						<sphereGeometry args={[0.06, 6, 6]} />
						<meshStandardMaterial
							color={isPowered ? 0xff4444 : 0x444444}
							emissive={isPowered ? 0xff2222 : 0x000000}
							emissiveIntensity={isPowered ? 0.5 : 0}
							roughness={0.3}
							metalness={0.1}
						/>
					</mesh>
				</>
			)}

			{/* Relay Tower — tall antenna with signal dish */}
			{buildingType === "relay_tower" && (
				<>
					<mesh position={[0, 1.2, 0]} castShadow>
						<cylinderGeometry args={[0.05, 0.08, 2.0, 6]} />
						<meshStandardMaterial
							color={0x7080a0}
							roughness={0.55}
							metalness={0.4}
						/>
					</mesh>
					{/* Signal dish */}
					<mesh position={[0.3, 1.8, 0]} rotation={[0, 0, -Math.PI / 6]}>
						<coneGeometry args={[0.25, 0.15, 8, 1, true]} />
						<meshStandardMaterial
							color={isPowered ? 0x8be6ff : 0x445566}
							emissive={isPowered ? 0x2266aa : 0x000000}
							emissiveIntensity={isPowered ? 0.3 : 0}
							roughness={0.4}
							metalness={0.3}
							side={THREE.DoubleSide}
						/>
					</mesh>
					{/* Blinking tip */}
					<mesh position={[0, 2.3, 0]}>
						<sphereGeometry args={[0.06, 6, 6]} />
						<meshStandardMaterial
							color={isPowered ? 0x00ccff : 0x334455}
							emissive={isPowered ? 0x00aaff : 0x000000}
							emissiveIntensity={isPowered ? 0.7 : 0}
							roughness={0.2}
							metalness={0.1}
						/>
					</mesh>
				</>
			)}

			{/* Power Sink — heavy cubic transformer with coils */}
			{buildingType === "power_sink" && (
				<>
					<mesh position={[0, 0.7, 0]} castShadow receiveShadow>
						<boxGeometry args={[1.0, 0.8, 1.0]} />
						<meshStandardMaterial
							color={isPowered ? 0x556688 : 0x3a3a44}
							roughness={0.65}
							metalness={0.3}
							emissive={isPowered ? 0x112244 : 0x000000}
							emissiveIntensity={isPowered ? 0.15 : 0}
						/>
					</mesh>
					{/* Coil rings */}
					<mesh position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
						<torusGeometry args={[0.35, 0.04, 8, 16]} />
						<meshStandardMaterial
							color={isPowered ? 0xf6c56a : 0x665544}
							emissive={isPowered ? 0xaa6622 : 0x000000}
							emissiveIntensity={isPowered ? 0.35 : 0}
							roughness={0.4}
							metalness={0.4}
						/>
					</mesh>
					<mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
						<torusGeometry args={[0.4, 0.03, 8, 16]} />
						<meshStandardMaterial
							color={isPowered ? 0xddaa44 : 0x554433}
							roughness={0.5}
							metalness={0.3}
						/>
					</mesh>
				</>
			)}

			{/* Storage Hub — wide flat crate with stacked containers */}
			{buildingType === "storage_hub" && (
				<>
					<mesh position={[0, 0.55, 0]} castShadow receiveShadow>
						<boxGeometry args={[1.4, 0.5, 1.0]} />
						<meshStandardMaterial
							color={0x6a7766}
							roughness={0.8}
							metalness={0.12}
							emissive={0x0a0e08}
							emissiveIntensity={0.06}
						/>
					</mesh>
					{/* Stacked crate */}
					<mesh position={[0.2, 1.0, 0.1]} castShadow>
						<boxGeometry args={[0.8, 0.4, 0.6]} />
						<meshStandardMaterial
							color={0x7a8866}
							roughness={0.75}
							metalness={0.1}
						/>
					</mesh>
					{/* Small side crate */}
					<mesh position={[-0.4, 0.55, 0.35]} castShadow>
						<boxGeometry args={[0.4, 0.3, 0.3]} />
						<meshStandardMaterial
							color={0x667755}
							roughness={0.82}
							metalness={0.08}
						/>
					</mesh>
				</>
			)}

			{/* Habitat Module — dome with viewport window */}
			{buildingType === "habitat_module" && (
				<>
					<mesh position={[0, 0.8, 0]} castShadow receiveShadow>
						<sphereGeometry
							args={[0.65, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]}
						/>
						<meshStandardMaterial
							color={isPowered ? 0x8899aa : 0x556666}
							roughness={0.7}
							metalness={0.2}
							emissive={isPowered ? 0x112233 : 0x000000}
							emissiveIntensity={isPowered ? 0.12 : 0}
						/>
					</mesh>
					{/* Viewport window */}
					<mesh position={[0, 0.9, 0.6]}>
						<circleGeometry args={[0.15, 12]} />
						<meshStandardMaterial
							color={isPowered ? 0xaaeeff : 0x445566}
							emissive={isPowered ? 0x44aacc : 0x000000}
							emissiveIntensity={isPowered ? 0.4 : 0}
							roughness={0.15}
							metalness={0.05}
							transparent
							opacity={0.85}
						/>
					</mesh>
				</>
			)}

			{/* Motor Pool — wide hangar with bay door */}
			{buildingType === "motor_pool" && (
				<>
					<mesh position={[0, 0.65, 0]} castShadow receiveShadow>
						<boxGeometry args={[1.4, 0.7, 1.2]} />
						<meshStandardMaterial
							color={isPowered ? 0x7a8090 : 0x505558}
							roughness={0.7}
							metalness={0.25}
							emissive={isPowered ? 0x0e1420 : 0x040406}
							emissiveIntensity={isPowered ? 0.1 : 0.03}
						/>
					</mesh>
					{/* Bay door */}
					<mesh position={[0, 0.5, 0.61]}>
						<boxGeometry args={[0.8, 0.6, 0.04]} />
						<meshStandardMaterial
							color={isPowered ? 0x556070 : 0x3a3e44}
							roughness={0.6}
							metalness={0.3}
						/>
					</mesh>
					{/* Status strip above door */}
					<mesh position={[0, 0.85, 0.62]}>
						<boxGeometry args={[0.9, 0.06, 0.02]} />
						<meshStandardMaterial
							color={isPowered ? 0x00ccaa : 0x333333}
							emissive={isPowered ? 0x00aa88 : 0x000000}
							emissiveIntensity={isPowered ? 0.6 : 0}
							roughness={0.3}
							metalness={0.1}
						/>
					</mesh>
				</>
			)}

			<mesh
				ref={ringRef}
				rotation={[-Math.PI / 2, 0, 0]}
				position={[0, 0.05, 0]}
				visible={false}
			>
				<ringGeometry args={[1.0, 1.2, 16]} />
				<meshBasicMaterial color={COLOR_SELECTED} side={THREE.DoubleSide} />
			</mesh>
		</group>
	);
}

function GhostBuilding() {
	const groupRef = useRef<THREE.Group>(null);

	useFrame(() => {
		const ghost = getGhostPosition();
		const active = getActivePlacement();
		if (!groupRef.current) return;

		if (!ghost || !active) {
			groupRef.current.visible = false;
			return;
		}

		groupRef.current.visible = true;
		const y = getSurfaceHeightAtWorldPosition(ghost.x, ghost.z);
		groupRef.current.position.set(ghost.x, y, ghost.z);
	});

	return (
		<group ref={groupRef}>
			<mesh position={[0, 0.8, 0]}>
				<boxGeometry args={[1.6, 1.6, 1.6]} />
				<meshBasicMaterial
					color={0x00ffaa}
					transparent
					opacity={0.3}
					wireframe
				/>
			</mesh>
		</group>
	);
}

export function UnitRenderer() {
	return (
		<>
			{Array.from(units)
				.filter((entity) => entity.get(Unit)?.type !== "fabrication_unit")
				.filter(isUnitVisibleToPlayer)
				.map((entity) => (
					<UnitMesh key={entity.get(Identity)?.id} entity={entity} />
				))}
			{Array.from(buildings).map((entity) => (
				<BuildingMesh key={entity.get(Identity)?.id} entity={entity} />
			))}
			<GhostBuilding />
		</>
	);
}
