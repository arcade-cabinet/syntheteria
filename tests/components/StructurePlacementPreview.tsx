/**
 * Preview component for structure placement visual test.
 *
 * Renders floor tiles with deterministic wall structures forming a corridor.
 * Uses simple box meshes for walls to avoid GLB asset loading dependencies.
 * Colors are duplicated from StructuralFloorRenderer to avoid importing its
 * transitive dependency chain (floorTextureAssets, expo-asset).
 */
import {
	SECTOR_LATTICE_SIZE,
	gridToWorld,
} from "../../src/world/sectorCoordinates";
import { TestCanvasWrapper } from "./testCanvasWrapper";

/** Mirror of StructuralFloorRenderer.FLOOR_COLORS */
const FLOOR_COLORS: Record<string, number> = {
	command_core: 0x5e7385,
	corridor_transit: 0x71879b,
	fabrication: 0x7a634a,
	storage: 0x75614f,
	power: 0x62658a,
	habitation: 0x5a7f8f,
	breach_exposed: 0x50545f,
};

const GRID_W = 8;
const GRID_H = 8;

/** Deterministic wall positions forming a corridor running east-west */
const WALL_POSITIONS: { q: number; r: number; rotation: number }[] = [
	// North wall of corridor (r=2)
	{ q: 2, r: 2, rotation: 0 },
	{ q: 3, r: 2, rotation: 0 },
	{ q: 4, r: 2, rotation: 0 },
	{ q: 5, r: 2, rotation: 0 },
	// South wall of corridor (r=5)
	{ q: 2, r: 5, rotation: 0 },
	{ q: 3, r: 5, rotation: 0 },
	{ q: 4, r: 5, rotation: 0 },
	{ q: 5, r: 5, rotation: 0 },
	// End caps (east/west walls)
	{ q: 2, r: 3, rotation: Math.PI / 2 },
	{ q: 2, r: 4, rotation: Math.PI / 2 },
	{ q: 5, r: 3, rotation: Math.PI / 2 },
	{ q: 5, r: 4, rotation: Math.PI / 2 },
];

function FloorTile({ q, r }: { q: number; r: number }) {
	const pos = gridToWorld(q, r);
	// Corridor interior gets a different zone color
	const isCorridor = q >= 2 && q <= 5 && r >= 2 && r <= 5;
	const zone = isCorridor ? "corridor_transit" : "fabrication";
	const color = FLOOR_COLORS[zone];
	const plateSize = SECTOR_LATTICE_SIZE;

	return (
		<mesh position={[pos.x, -0.005, pos.z]} receiveShadow>
			<boxGeometry args={[plateSize, 0.02, plateSize]} />
			<meshStandardMaterial
				color={color}
				roughness={0.72}
				metalness={0.08}
				emissive={0x111111}
				emissiveIntensity={0.2}
			/>
		</mesh>
	);
}

function WallSegment({
	q,
	r,
	rotation,
}: {
	q: number;
	r: number;
	rotation: number;
}) {
	const pos = gridToWorld(q, r);
	const wallHeight = 1.2;
	const wallThickness = 0.12;
	const wallLength = SECTOR_LATTICE_SIZE * 0.95;

	return (
		<mesh
			position={[pos.x, wallHeight / 2, pos.z]}
			rotation={[0, rotation, 0]}
			castShadow
		>
			<boxGeometry args={[wallLength, wallHeight, wallThickness]} />
			<meshStandardMaterial
				color={0x4a5f72}
				roughness={0.6}
				metalness={0.25}
				emissive={0x1a2a36}
				emissiveIntensity={0.15}
			/>
		</mesh>
	);
}

export function StructurePlacementPreview() {
	const cells: { q: number; r: number }[] = [];
	for (let r = 0; r < GRID_H; r++) {
		for (let q = 0; q < GRID_W; q++) {
			cells.push({ q, r });
		}
	}

	const centerX = ((GRID_W - 1) / 2) * SECTOR_LATTICE_SIZE;
	const centerZ = ((GRID_H - 1) / 2) * SECTOR_LATTICE_SIZE;

	return (
		<TestCanvasWrapper
			width={800}
			height={600}
			// Angled view to show wall height
			cameraPosition={[centerX + 6, 12, centerZ + 8]}
			cameraLookAt={[centerX, 0.3, centerZ]}
			cameraZoom={50}
		>
			{cells.map(({ q, r }) => (
				<FloorTile key={`floor_${q},${r}`} q={q} r={r} />
			))}
			{WALL_POSITIONS.map(({ q, r, rotation }) => (
				<WallSegment
					key={`wall_${q},${r}_${rotation}`}
					q={q}
					r={r}
					rotation={rotation}
				/>
			))}
		</TestCanvasWrapper>
	);
}
