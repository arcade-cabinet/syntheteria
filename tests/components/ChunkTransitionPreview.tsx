/**
 * Preview component for chunk boundary visual test.
 *
 * Renders tiles across a simulated chunk boundary where two distinct zones
 * meet. The left half uses one zone color (command_core), the right half
 * uses another (fabrication), creating a visible transition at the boundary.
 *
 * Colors are duplicated from StructuralFloorRenderer to avoid importing its
 * transitive dependency chain (floorTextureAssets, expo-asset).
 */
import * as THREE from "three";
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

/**
 * Chunk size for the visual test. Matches chunks.json chunkSize = 8.
 * Hardcoded here to avoid importing testConstants which pulls in
 * modelDefinitions.json (unnecessary for this visual-only preview).
 */
const VISUAL_CHUNK_SIZE = 8;

const LEFT_ZONE = "command_core" as const;
const RIGHT_ZONE = "fabrication" as const;

/** Accent stripe color per zone */
const ACCENT_COLORS: Record<string, number> = {
	command_core: 0x6ff3c8,
	fabrication: 0xf6c56a,
};

function ChunkTile({
	q,
	r,
	zone,
}: {
	q: number;
	r: number;
	zone: typeof LEFT_ZONE | typeof RIGHT_ZONE;
}) {
	const pos = gridToWorld(q, r);
	const color = FLOOR_COLORS[zone];
	const accent = ACCENT_COLORS[zone] ?? 0x8be6ff;
	const plateSize = SECTOR_LATTICE_SIZE;

	return (
		<group position={[pos.x, 0, pos.z]}>
			{/* Floor plate */}
			<mesh position={[0, -0.005, 0]} receiveShadow>
				<boxGeometry args={[plateSize, 0.02, plateSize]} />
				<meshStandardMaterial
					color={color}
					roughness={0.72}
					metalness={0.08}
					emissive={zone === "command_core" ? 0x18383a : 0x111111}
					emissiveIntensity={0.2}
				/>
			</mesh>
			{/* Accent stripe */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
				<planeGeometry args={[plateSize * 0.56, 0.05]} />
				<meshBasicMaterial
					color={accent}
					transparent
					opacity={0.09}
					side={THREE.DoubleSide}
					depthWrite={false}
				/>
			</mesh>
		</group>
	);
}

/** Boundary marker: thin glowing line at the chunk edge */
function BoundaryLine({
	x,
	depth,
}: {
	x: number;
	depth: number;
}) {
	return (
		<mesh position={[x, 0.02, depth / 2]} rotation={[0, 0, 0]}>
			<boxGeometry args={[0.06, 0.04, depth]} />
			<meshBasicMaterial color={0xff9cb5} transparent opacity={0.5} />
		</mesh>
	);
}

export function ChunkTransitionPreview() {
	const rows = VISUAL_CHUNK_SIZE;
	const cols = VISUAL_CHUNK_SIZE;
	const cells: { q: number; r: number; zone: typeof LEFT_ZONE | typeof RIGHT_ZONE }[] = [];

	// Left chunk: columns 0..cols-1
	for (let r = 0; r < rows; r++) {
		for (let q = 0; q < cols; q++) {
			cells.push({ q, r, zone: LEFT_ZONE });
		}
	}
	// Right chunk: columns cols..2*cols-1
	for (let r = 0; r < rows; r++) {
		for (let q = cols; q < cols * 2; q++) {
			cells.push({ q, r, zone: RIGHT_ZONE });
		}
	}

	const totalCols = cols * 2;
	const centerX = ((totalCols - 1) / 2) * SECTOR_LATTICE_SIZE;
	const centerZ = ((rows - 1) / 2) * SECTOR_LATTICE_SIZE;
	const extentX = (totalCols * SECTOR_LATTICE_SIZE) / 2;

	// Boundary X position (between the two chunks)
	const boundaryX = (cols - 0.5) * SECTOR_LATTICE_SIZE;
	const gridDepth = rows * SECTOR_LATTICE_SIZE;

	return (
		<TestCanvasWrapper
			width={800}
			height={600}
			cameraPosition={[centerX, 20, centerZ]}
			cameraLookAt={[centerX, 0, centerZ]}
			cameraZoom={800 / (extentX * 2.6)}
		>
			{cells.map(({ q, r, zone }) => (
				<ChunkTile key={`${q},${r}`} q={q} r={r} zone={zone} />
			))}
			<BoundaryLine x={boundaryX} depth={gridDepth} />
		</TestCanvasWrapper>
	);
}
