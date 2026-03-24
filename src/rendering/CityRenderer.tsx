/**
 * Renders city buildings and corridor floors from the labyrinth tile grid.
 *
 * Wall tiles become solid box geometry with industrial materials.
 * Passable tiles adjacent to walls get visible floor planes so corridors
 * and rooms are clearly defined against the terrain.
 *
 * Fog-of-war visibility is updated per frame — hidden elements scale to zero.
 * Accent traces (glowing circuit-board lines) reinforce the industrial aesthetic.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TILE_SIZE_M } from "../board/grid";
import {
	type CityBuilding,
	getBoard,
	getCityBuildings,
} from "../ecs/cityLayout";
import {
	getAllFragments,
	getTerrainHeight,
	worldToFogIndex,
} from "../ecs/terrain";

// ─── Wall materials by type ─────────────────────────────────────────────────

const WALL_COLORS: Record<CityBuilding["type"], number> = {
	conduit: 0x2a2a3e, // dark blue-grey corridor wall
	node: 0x1e2e1e, // dark green junction
	tower: 0x3a3a4e, // lighter grey tower
	ruin: 0x3a3520, // brown rubble
	wall: 0x1a1a2e, // dark perimeter wall
};

const ACCENT_COLORS: Record<CityBuilding["type"], number> = {
	conduit: 0x00e5ff, // cyan trace on top
	node: 0x00ff88, // green circuit pad
	tower: 0x00e5ff, // cyan antenna
	ruin: 0x334433, // dim green (faded)
	wall: 0x003344, // dark teal
};

// Floor material for corridors
const FLOOR_COLOR = 0x2a2a2e;

// ─── Fog helpers ─────────────────────────────────────────────────────────────

/**
 * Get fog level at a world position.
 * Returns 0 (unexplored), 1 (abstract), or 2 (detailed).
 */
function getFogLevel(x: number, z: number): number {
	const fogIdx = worldToFogIndex(x, z);
	if (fogIdx < 0) return 0;
	let maxFog = 0;
	const fragments = getAllFragments();
	for (const frag of fragments) {
		const val = frag.fog[fogIdx] ?? 0;
		if (val > maxFog) maxFog = val;
		if (maxFog >= 2) return 2;
	}
	return maxFog;
}

// ─── Floor tiles ─────────────────────────────────────────────────────────────

interface FloorTile {
	x: number;
	z: number;
}

/**
 * Find passable tiles that should have visible floor planes.
 * A tile gets a floor if it's passable and has at least one non-passable neighbor
 * (i.e., it's part of a corridor or room edge). For rooms, include all passable
 * tiles within the labyrinth bounds.
 */
function getFloorTiles(): FloorTile[] {
	let board: ReturnType<typeof getBoard>;
	try {
		board = getBoard();
	} catch {
		return [];
	}

	const { width, height } = board.config;
	const tiles = board.tiles;
	const floors: FloorTile[] = [];

	for (let z = 0; z < height; z++) {
		for (let x = 0; x < width; x++) {
			const tile = tiles[z]![x]!;
			if (!tile.passable) continue;

			// All passable tiles get a floor — makes corridors and rooms visible
			floors.push({
				x: x * TILE_SIZE_M + TILE_SIZE_M / 2,
				z: z * TILE_SIZE_M + TILE_SIZE_M / 2,
			});
		}
	}

	return floors;
}

// ─── Wall renderer (instanced boxes) ─────────────────────────────────────────

function WallGroup({
	buildings,
	type,
}: {
	buildings: CityBuilding[];
	type: CityBuilding["type"];
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const accentRef = useRef<THREE.InstancedMesh>(null);
	const buildingsRef = useRef(buildings);
	buildingsRef.current = buildings;

	const { wallMesh, accentMesh } = useMemo(() => {
		const dummy = new THREE.Object3D();

		// Simple box geometry — guaranteed correct sizing
		const geo = new THREE.BoxGeometry(1, 1, 1);
		const mat = new THREE.MeshStandardMaterial({
			vertexColors: false,
			roughness: 0.85,
			metalness: 0.15,
		});
		const mesh = new THREE.InstancedMesh(geo, mat, buildings.length);

		// Instance colors for fog-based dimming
		const colors = new Float32Array(buildings.length * 3);
		const baseColor = new THREE.Color(WALL_COLORS[type]);
		for (let i = 0; i < buildings.length; i++) {
			colors[i * 3] = baseColor.r;
			colors[i * 3 + 1] = baseColor.g;
			colors[i * 3 + 2] = baseColor.b;
		}
		mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

		// Accent glow on top of walls
		const accentGeo =
			type === "tower"
				? new THREE.CylinderGeometry(0.08, 0.15, 1, 6)
				: new THREE.BoxGeometry(1, 0.08, 1);
		const accentMat = new THREE.MeshBasicMaterial({
			color: ACCENT_COLORS[type],
			transparent: true,
			opacity: 0.7,
		});
		const accent = new THREE.InstancedMesh(
			accentGeo,
			accentMat,
			buildings.length,
		);

		for (let i = 0; i < buildings.length; i++) {
			const b = buildings[i]!;
			const terrainY = getTerrainHeight(b.x, b.z);

			// Position at center of box (terrainY + half height)
			dummy.position.set(b.x, terrainY + b.height / 2, b.z);
			dummy.scale.set(b.halfW * 2, b.height, b.halfD * 2);
			dummy.rotation.set(0, 0, 0);

			if (type === "ruin") {
				dummy.rotation.z = Math.sin(b.x * 7.3 + b.z * 3.1) * 0.08;
				dummy.rotation.x = Math.cos(b.x * 2.7 + b.z * 5.9) * 0.05;
			}

			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);

			// Accent on top
			setAccentTransform(dummy, b, type, terrainY);
			dummy.updateMatrix();
			accent.setMatrixAt(i, dummy.matrix);
		}

		mesh.instanceMatrix.needsUpdate = true;
		accent.instanceMatrix.needsUpdate = true;
		return { wallMesh: mesh, accentMesh: accent };
	}, [buildings, type]);

	// Per-frame fog visibility — walls always visible but dimmed in unexplored areas
	useFrame(() => {
		const wall = meshRef.current ?? wallMesh;
		const accent = accentRef.current ?? accentMesh;
		const bs = buildingsRef.current;
		const dummy = new THREE.Object3D();
		const baseColor = new THREE.Color(WALL_COLORS[type]);

		for (let i = 0; i < bs.length; i++) {
			const b = bs[i]!;
			const fog = getFogLevel(b.x, b.z);
			const terrainY = getTerrainHeight(b.x, b.z);

			// Walls always rendered — fog controls brightness via instance color
			// Unexplored: dark silhouette (15% brightness)
			// Abstract: dimmed (40% brightness)
			// Detailed: full brightness
			const brightness = fog === 2 ? 1.0 : fog === 1 ? 0.4 : 0.15;

			dummy.position.set(b.x, terrainY + b.height / 2, b.z);
			dummy.scale.set(b.halfW * 2, b.height, b.halfD * 2);
			dummy.rotation.set(0, 0, 0);
			if (type === "ruin") {
				dummy.rotation.z = Math.sin(b.x * 7.3 + b.z * 3.1) * 0.08;
				dummy.rotation.x = Math.cos(b.x * 2.7 + b.z * 5.9) * 0.05;
			}
			dummy.updateMatrix();
			wall.setMatrixAt(i, dummy.matrix);

			// Dim instance color based on fog
			if (wall.instanceColor) {
				wall.instanceColor.setXYZ(
					i,
					baseColor.r * brightness,
					baseColor.g * brightness,
					baseColor.b * brightness,
				);
			}

			// Accent traces only visible when explored
			if (fog >= 1) {
				setAccentTransform(dummy, b, type, terrainY);
			} else {
				dummy.position.set(0, -100, 0);
				dummy.scale.set(0, 0, 0);
				dummy.rotation.set(0, 0, 0);
			}
			dummy.updateMatrix();
			accent.setMatrixAt(i, dummy.matrix);
		}

		wall.instanceMatrix.needsUpdate = true;
		if (wall.instanceColor) wall.instanceColor.needsUpdate = true;
		accent.instanceMatrix.needsUpdate = true;
	});

	return (
		<>
			<primitive ref={meshRef} object={wallMesh} />
			<primitive ref={accentRef} object={accentMesh} />
		</>
	);
}

/** Set the accent (glowing trace) transform for a building. */
function setAccentTransform(
	dummy: THREE.Object3D,
	b: CityBuilding,
	type: CityBuilding["type"],
	terrainY: number,
) {
	const topY = terrainY + b.height + 0.05;
	if (type === "conduit") {
		dummy.position.set(b.x, topY, b.z);
		dummy.scale.set(b.halfW * 2 * 0.3, 1, b.halfD * 2 + 0.1);
		dummy.rotation.set(0, 0, 0);
	} else if (type === "node") {
		dummy.position.set(b.x, topY, b.z);
		dummy.scale.set(b.halfW * 2 * 0.7, 1, b.halfD * 2 * 0.7);
		dummy.rotation.set(0, 0, 0);
	} else if (type === "tower") {
		dummy.position.set(b.x, terrainY + b.height + 1.5, b.z);
		dummy.scale.set(1, 3, 1);
		dummy.rotation.set(0, 0, 0);
	} else if (type === "ruin") {
		dummy.position.set(b.x + 0.2, terrainY + b.height * 0.7, b.z - 0.1);
		dummy.scale.set(b.halfW * 1.0, 1, b.halfD * 0.5);
		dummy.rotation.set(0.1, 0.3, 0.05);
	} else {
		// wall: edge glow on top
		dummy.position.set(b.x, topY, b.z);
		dummy.scale.set(b.halfW * 2 + 0.1, 1, b.halfD * 2 + 0.1);
		dummy.rotation.set(0, 0, 0);
	}
}

// ─── Floor renderer (instanced planes) ───────────────────────────────────────

function FloorRenderer() {
	const meshRef = useRef<THREE.InstancedMesh>(null);

	const { floorMesh, floors } = useMemo(() => {
		const floorTiles = getFloorTiles();

		const geo = new THREE.PlaneGeometry(TILE_SIZE_M, TILE_SIZE_M);
		geo.rotateX(-Math.PI / 2); // lay flat on XZ plane
		const mat = new THREE.MeshStandardMaterial({
			vertexColors: false,
			roughness: 0.95,
			metalness: 0.05,
		});

		const mesh = new THREE.InstancedMesh(geo, mat, floorTiles.length);
		const dummy = new THREE.Object3D();

		// Instance colors for fog-based dimming
		const baseColor = new THREE.Color(FLOOR_COLOR);
		const colors = new Float32Array(floorTiles.length * 3);

		for (let i = 0; i < floorTiles.length; i++) {
			const f = floorTiles[i]!;
			const terrainY = getTerrainHeight(f.x, f.z);
			dummy.position.set(f.x, terrainY + 0.05, f.z);
			dummy.scale.set(1, 1, 1);
			dummy.rotation.set(0, 0, 0);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);

			colors[i * 3] = baseColor.r;
			colors[i * 3 + 1] = baseColor.g;
			colors[i * 3 + 2] = baseColor.b;
		}

		mesh.instanceMatrix.needsUpdate = true;
		mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
		return { floorMesh: mesh, floors: floorTiles };
	}, []);

	// Per-frame fog dimming — floors always visible but dimmed in unexplored areas
	useFrame(() => {
		const mesh = meshRef.current ?? floorMesh;
		if (!mesh.instanceColor) return;

		const baseColor = new THREE.Color(FLOOR_COLOR);

		for (let i = 0; i < floors.length; i++) {
			const f = floors[i]!;
			const fog = getFogLevel(f.x, f.z);

			// Unexplored: very dark (10%), abstract: dimmed (35%), detailed: full
			const brightness = fog === 2 ? 1.0 : fog === 1 ? 0.35 : 0.1;

			mesh.instanceColor.setXYZ(
				i,
				baseColor.r * brightness,
				baseColor.g * brightness,
				baseColor.b * brightness,
			);
		}
		mesh.instanceColor.needsUpdate = true;
	});

	return <primitive ref={meshRef} object={floorMesh} />;
}

// ─── Circuit traces ──────────────────────────────────────────────────────────

interface TraceData {
	x: number;
	y: number;
	z: number;
	sx: number;
	sz: number;
}

function CircuitTraces({ buildings }: { buildings: CityBuilding[] }) {
	const meshRef = useRef<THREE.InstancedMesh>(null);
	const tracesRef = useRef<TraceData[]>([]);

	const instancedMesh = useMemo(() => {
		const traceData: TraceData[] = [];

		const conduits = buildings.filter(
			(b) => b.type === "conduit" || b.type === "node",
		);

		for (const b of conduits) {
			const terrainY = getTerrainHeight(b.x, b.z);
			const hash = Math.sin(b.x * 127.1 + b.z * 311.7) * 43758.5453;
			const frac = hash - Math.floor(hash);
			if (frac > 0.4) continue;

			const dir = Math.floor(frac * 4);
			const len = 1 + frac * 3;
			if (dir === 0 || dir === 2) {
				const zOff = dir === 0 ? b.halfD + len / 2 : -(b.halfD + len / 2);
				traceData.push({
					x: b.x,
					y: terrainY + 0.02,
					z: b.z + zOff,
					sx: 0.08,
					sz: len,
				});
			} else {
				const xOff = dir === 1 ? b.halfW + len / 2 : -(b.halfW + len / 2);
				traceData.push({
					x: b.x + xOff,
					y: terrainY + 0.02,
					z: b.z,
					sx: len,
					sz: 0.08,
				});
			}
		}

		if (traceData.length === 0) return null;
		tracesRef.current = traceData;

		const dummy = new THREE.Object3D();
		const geo = new THREE.BoxGeometry(1, 0.02, 1);
		const mat = new THREE.MeshBasicMaterial({
			color: 0x00e5ff,
			transparent: true,
			opacity: 0.3,
		});
		const mesh = new THREE.InstancedMesh(geo, mat, traceData.length);

		traceData.forEach((t, i) => {
			dummy.position.set(t.x, t.y, t.z);
			dummy.scale.set(t.sx, 1, t.sz);
			dummy.rotation.set(0, 0, 0);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		});

		mesh.instanceMatrix.needsUpdate = true;
		return mesh;
	}, [buildings]);

	// Per-frame fog: only show traces in revealed areas
	useFrame(() => {
		const mesh = meshRef.current ?? instancedMesh;
		if (!mesh) return;
		const traces = tracesRef.current;
		const dummy = new THREE.Object3D();

		for (let i = 0; i < traces.length; i++) {
			const t = traces[i]!;
			const fog = getFogLevel(t.x, t.z);

			if (fog >= 1) {
				dummy.position.set(t.x, t.y, t.z);
				dummy.scale.set(t.sx, 1, t.sz);
			} else {
				dummy.position.set(0, -100, 0);
				dummy.scale.set(0, 0, 0);
			}
			dummy.rotation.set(0, 0, 0);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		}
		mesh.instanceMatrix.needsUpdate = true;
	});

	if (!instancedMesh) return null;
	return <primitive ref={meshRef} object={instancedMesh} />;
}

// ─── Main renderer ───────────────────────────────────────────────────────────

export function CityRenderer() {
	const allBuildings = useMemo(() => getCityBuildings(), []);

	const grouped = useMemo(() => {
		const groups: Record<CityBuilding["type"], CityBuilding[]> = {
			conduit: [],
			node: [],
			tower: [],
			ruin: [],
			wall: [],
		};
		for (const b of allBuildings) {
			groups[b.type].push(b);
		}
		return groups;
	}, [allBuildings]);

	return (
		<>
			<FloorRenderer />
			{Object.entries(grouped).map(
				([type, buildings]) =>
					buildings.length > 0 && (
						<WallGroup
							key={type}
							type={type as CityBuilding["type"]}
							buildings={buildings}
						/>
					),
			)}
			<CircuitTraces buildings={allBuildings} />
		</>
	);
}
