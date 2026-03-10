/**
 * WallRenderer — visual feedback for detected wall segments.
 *
 * Reads wall segments from wallBuilding.detectWallSegments() each frame
 * (with change-detection caching) and renders:
 *   - Subtle outline/glow around wall segment cubes
 *   - Wall HP bar when a segment is selected/hovered
 *   - Visual crack/damage overlay when wall HP is low
 *   - Material-appropriate coloring (rusty for scrap, shiny for chrome)
 *
 * Performance: uses a single shared geometry and cached materials.
 * Wall segment detection runs only when the stack registry changes.
 */

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import {
	getWallSegments,
	detectWallSegments,
} from "../systems/wallBuilding";
import { getAllStackedCubes } from "../systems/cubeStacking";
import { GRID_SIZE, gridToWorld } from "../systems/gridSnap";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CUBE_SIZE = GRID_SIZE; // 0.5m

/** Outline scale factor — slightly larger than the cube for the glow effect. */
const OUTLINE_SCALE = 1.06;

/** HP bar dimensions (world units). */
const HP_BAR_WIDTH = 2.0;
const HP_BAR_HEIGHT = 0.08;
const HP_BAR_OFFSET_Y = 0.6; // above the wall

/** Damage overlay opacity thresholds. */
const DAMAGE_THRESHOLD_LIGHT = 0.7; // below 70% HP: light cracks
const DAMAGE_THRESHOLD_HEAVY = 0.3; // below 30% HP: heavy cracks

// ---------------------------------------------------------------------------
// Material palette — color per wall material type
// ---------------------------------------------------------------------------

const WALL_COLORS: Record<string, number> = {
	scrap_metal: 0x8b4513, // rusty brown
	scrap: 0x8b4513,
	rock: 0x808080,
	iron: 0x888888, // dark grey
	copper: 0xb87333, // copper orange
	silicon: 0xa0a0c0, // blue-grey
	steel: 0xc0c0c0, // silver
	chrome: 0xe8e8e8, // bright silver
	titanium: 0xd0d0e0, // light steel blue
};

const DEFAULT_WALL_COLOR = 0x808080;

// ---------------------------------------------------------------------------
// Outline material cache
// ---------------------------------------------------------------------------

const outlineMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

function getOutlineMaterial(
	materialType: string,
	hpPercent: number,
): THREE.MeshBasicMaterial {
	// Key includes damage state for color variation
	const damageKey = hpPercent > DAMAGE_THRESHOLD_LIGHT
		? "healthy"
		: hpPercent > DAMAGE_THRESHOLD_HEAVY
			? "damaged"
			: "critical";
	const cacheKey = `${materialType}_${damageKey}`;

	const cached = outlineMaterialCache.get(cacheKey);
	if (cached) return cached;

	const baseColor = WALL_COLORS[materialType] ?? DEFAULT_WALL_COLOR;
	let color: THREE.Color;

	if (damageKey === "healthy") {
		color = new THREE.Color(baseColor);
		color.lerp(new THREE.Color(0x4488ff), 0.3); // blue-ish glow
	} else if (damageKey === "damaged") {
		color = new THREE.Color(baseColor);
		color.lerp(new THREE.Color(0xffaa00), 0.5); // orange warning
	} else {
		color = new THREE.Color(0xff2200); // red critical
	}

	const mat = new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity: damageKey === "healthy" ? 0.15 : damageKey === "damaged" ? 0.25 : 0.35,
		side: THREE.BackSide,
		depthWrite: false,
	});

	outlineMaterialCache.set(cacheKey, mat);
	return mat;
}

// ---------------------------------------------------------------------------
// Damage overlay material
// ---------------------------------------------------------------------------

const crackMaterialCache = new Map<string, THREE.MeshStandardMaterial>();

function getCrackMaterial(severity: "light" | "heavy"): THREE.MeshStandardMaterial {
	const cached = crackMaterialCache.get(severity);
	if (cached) return cached;

	const mat = new THREE.MeshStandardMaterial({
		color: severity === "light" ? 0x444444 : 0x222222,
		transparent: true,
		opacity: severity === "light" ? 0.3 : 0.5,
		roughness: 1.0,
		metalness: 0.0,
		depthWrite: false,
	});

	crackMaterialCache.set(severity, mat);
	return mat;
}

// ---------------------------------------------------------------------------
// Shared geometry
// ---------------------------------------------------------------------------

let outlineGeometry: THREE.BoxGeometry | null = null;
let crackGeometry: THREE.BoxGeometry | null = null;
let hpBarGeometry: THREE.PlaneGeometry | null = null;
let hpBarBgGeometry: THREE.PlaneGeometry | null = null;

function getOutlineGeometry(): THREE.BoxGeometry {
	if (!outlineGeometry) {
		outlineGeometry = new THREE.BoxGeometry(
			CUBE_SIZE * OUTLINE_SCALE,
			CUBE_SIZE * OUTLINE_SCALE,
			CUBE_SIZE * OUTLINE_SCALE,
		);
	}
	return outlineGeometry;
}

function getCrackGeometry(): THREE.BoxGeometry {
	if (!crackGeometry) {
		// Slightly larger than cube but smaller than outline
		crackGeometry = new THREE.BoxGeometry(
			CUBE_SIZE * 1.002,
			CUBE_SIZE * 1.002,
			CUBE_SIZE * 1.002,
		);
	}
	return crackGeometry;
}

function getHpBarGeometry(): THREE.PlaneGeometry {
	if (!hpBarGeometry) {
		hpBarGeometry = new THREE.PlaneGeometry(HP_BAR_WIDTH, HP_BAR_HEIGHT);
	}
	return hpBarGeometry;
}

function getHpBarBgGeometry(): THREE.PlaneGeometry {
	if (!hpBarBgGeometry) {
		hpBarBgGeometry = new THREE.PlaneGeometry(
			HP_BAR_WIDTH + 0.04,
			HP_BAR_HEIGHT + 0.04,
		);
	}
	return hpBarBgGeometry;
}

// ---------------------------------------------------------------------------
// HP bar materials
// ---------------------------------------------------------------------------

const hpBarBgMat = new THREE.MeshBasicMaterial({
	color: 0x222222,
	transparent: true,
	opacity: 0.6,
	depthWrite: false,
});

function getHpBarColor(percent: number): THREE.Color {
	if (percent > 0.6) return new THREE.Color(0x44cc44); // green
	if (percent > 0.3) return new THREE.Color(0xccaa22); // yellow
	return new THREE.Color(0xcc2222); // red
}

// ---------------------------------------------------------------------------
// Snapshot types
// ---------------------------------------------------------------------------

interface WallSegmentSnapshot {
	id: string;
	material: string;
	hpPercent: number;
	breached: boolean;
	/** World-space centroid of the segment (for HP bar positioning). */
	centroidX: number;
	centroidY: number;
	centroidZ: number;
	/** Maximum Y world position among segment cubes. */
	maxWorldY: number;
	/** Grid positions of cubes in this segment, converted to world. */
	cubePositions: Array<{ x: number; y: number; z: number }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WallRenderer() {
	const [segments, setSegments] = useState<WallSegmentSnapshot[]>([]);
	const prevHashRef = useRef("");
	const prevStackCountRef = useRef(-1);
	const { camera } = useThree();

	useFrame(() => {
		// Only re-detect wall segments when the stack registry changes
		const stackMap = getAllStackedCubes();
		const stackCount = stackMap.size;

		if (stackCount !== prevStackCountRef.current) {
			prevStackCountRef.current = stackCount;
			detectWallSegments();
		}

		const wallSegs = getWallSegments();

		const snapshots: WallSegmentSnapshot[] = wallSegs.map((seg) => {
			const hpPercent = seg.maxHp > 0 ? seg.hp / seg.maxHp : 0;

			const cubePositions = seg.cubes.map((coord) => {
				const world = gridToWorld(coord);
				return {
					x: world.x,
					y: world.y + CUBE_SIZE * 0.5, // center above grid
					z: world.z,
				};
			});

			// Compute centroid
			let cx = 0;
			let cy = 0;
			let cz = 0;
			let maxY = 0;
			for (const pos of cubePositions) {
				cx += pos.x;
				cy += pos.y;
				cz += pos.z;
				if (pos.y > maxY) maxY = pos.y;
			}
			const n = cubePositions.length || 1;

			return {
				id: seg.id,
				material: seg.material,
				hpPercent,
				breached: seg.breached,
				centroidX: cx / n,
				centroidY: cy / n,
				centroidZ: cz / n,
				maxWorldY: maxY,
				cubePositions,
			};
		});

		// Change detection hash
		const hash = snapshots
			.map((s) => `${s.id}:${s.hpPercent.toFixed(2)}:${s.breached ? 1 : 0}`)
			.join("|");

		if (hash !== prevHashRef.current) {
			prevHashRef.current = hash;
			setSegments(snapshots);
		}
	});

	if (segments.length === 0) return null;

	const oGeom = getOutlineGeometry();
	const cGeom = getCrackGeometry();

	return (
		<>
			{segments.map((seg) => (
				<group key={seg.id}>
					{/* Outline glow on each cube in the wall segment */}
					{seg.cubePositions.map((pos, i) => (
						<mesh
							key={`outline-${seg.id}-${i}`}
							geometry={oGeom}
							material={getOutlineMaterial(seg.material, seg.hpPercent)}
							position={[pos.x, pos.y, pos.z]}
							renderOrder={998}
						/>
					))}

					{/* Damage crack overlay when HP is below threshold */}
					{seg.hpPercent < DAMAGE_THRESHOLD_LIGHT &&
						seg.cubePositions.map((pos, i) => (
							<mesh
								key={`crack-${seg.id}-${i}`}
								geometry={cGeom}
								material={getCrackMaterial(
									seg.hpPercent > DAMAGE_THRESHOLD_HEAVY ? "light" : "heavy",
								)}
								position={[pos.x, pos.y, pos.z]}
								renderOrder={997}
							/>
						))}

					{/* HP bar floating above the wall segment centroid */}
					<WallHpBar
						centroidX={seg.centroidX}
						maxWorldY={seg.maxWorldY}
						centroidZ={seg.centroidZ}
						hpPercent={seg.hpPercent}
						camera={camera}
					/>
				</group>
			))}
		</>
	);
}

// ---------------------------------------------------------------------------
// HP bar sub-component (billboards toward camera)
// ---------------------------------------------------------------------------

function WallHpBar({
	centroidX,
	maxWorldY,
	centroidZ,
	hpPercent,
	camera,
}: {
	centroidX: number;
	maxWorldY: number;
	centroidZ: number;
	hpPercent: number;
	camera: THREE.Camera;
}) {
	const groupRef = useRef<THREE.Group>(null);
	const fillRef = useRef<THREE.Mesh>(null);
	const fillMatRef = useRef<THREE.MeshBasicMaterial | null>(null);

	useFrame(() => {
		// Billboard: face the camera
		if (groupRef.current) {
			groupRef.current.lookAt(camera.position);
		}

		// Update fill bar scale and color
		if (fillRef.current) {
			fillRef.current.scale.x = Math.max(0.01, hpPercent);
			// Offset to keep fill left-aligned
			fillRef.current.position.x = -(HP_BAR_WIDTH * (1 - hpPercent)) / 2;
		}

		if (fillMatRef.current) {
			fillMatRef.current.color.copy(getHpBarColor(hpPercent));
		}
	});

	const barY = maxWorldY + HP_BAR_OFFSET_Y;

	return (
		<group ref={groupRef} position={[centroidX, barY, centroidZ]}>
			{/* Background */}
			<mesh geometry={getHpBarBgGeometry()} material={hpBarBgMat} />
			{/* Fill */}
			<mesh
				ref={fillRef}
				geometry={getHpBarGeometry()}
				position={[0, 0, 0.001]}
			>
				<meshBasicMaterial
					ref={fillMatRef}
					color={getHpBarColor(hpPercent)}
					transparent
					opacity={0.9}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}
