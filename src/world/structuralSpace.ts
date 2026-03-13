import { createNewGameConfig, type NewGameConfig } from "./config";
import { generateWorldData } from "./generation";
import {
	type SectorWorldDimensions,
	setWorldDimensions,
	worldToGrid,
} from "./sectorCoordinates";
import { requireActiveWorldSession } from "./session";
import type { SectorCellSnapshot } from "./snapshots";

export type DiscoveryState = 0 | 1 | 2;
export type FogState = DiscoveryState;
export type StructuralSurfaceClass =
	| "breach"
	| "transit"
	| "power"
	| "command"
	| "fabrication"
	| "storage"
	| "habitation";

export interface StructuralFragment {
	id: string;
	mergedWith: Set<string>;
	displayOffset: { x: number; z: number };
}

export interface StructuralCellRecord {
	q: number;
	r: number;
	structuralZone: StructuralSurfaceClass | string;
	floorPresetId: string;
	discoveryState: DiscoveryState;
	passable: boolean;
}

const fragments = new Map<string, StructuralFragment>();
const cellsByFragment = new Map<string, Map<string, StructuralCellRecord>>();
let nextFragmentId = 0;

const DRIFT_RATE = 0.003;

function cellKey(q: number, r: number) {
	return `${q},${r}`;
}

function requireFragmentCells(fragmentId: string) {
	const cells = cellsByFragment.get(fragmentId);
	if (!cells) {
		throw new Error(`No structural cells loaded for fragment "${fragmentId}".`);
	}
	return cells;
}

export function loadStructuralFragment(
	cells: StructuralCellRecord[],
	dimensions: SectorWorldDimensions,
	fragmentId?: string,
) {
	resetStructuralSpace();
	setWorldDimensions(dimensions);

	const id = fragmentId ?? `frag_${nextFragmentId++}`;
	const fragment: StructuralFragment = {
		id,
		mergedWith: new Set(),
		displayOffset: { x: 0, z: 0 },
	};

	const keyedCells = new Map<string, StructuralCellRecord>();
	for (const cell of cells) {
		keyedCells.set(cellKey(cell.q, cell.r), { ...cell });
	}

	fragments.set(id, fragment);
	cellsByFragment.set(id, keyedCells);
	return fragment;
}

export function createStructuralFragment(config?: NewGameConfig) {
	if (fragments.size > 0) {
		return fragments.values().next().value!;
	}

	const nextConfig =
		config ??
		createNewGameConfig(42, {
			sectorScale: "standard",
			climateProfile: "temperate",
		});
	const generatedWorld = generateWorldData(nextConfig);
	return loadStructuralFragment(
		generatedWorld.sectorCells.map((cell) => ({
			q: cell.q,
			r: cell.r,
			structuralZone: cell.structuralZone,
			floorPresetId: cell.floorPresetId,
			discoveryState: cell.discoveryState as DiscoveryState,
			passable: cell.passable,
		})),
		generatedWorld.ecumenopolis,
	);
}

export function getStructuralFragment(id: string) {
	return fragments.get(id);
}

export function getStructuralFragments() {
	return Array.from(fragments.values());
}

export function requirePrimaryStructuralFragment() {
	const fragment = fragments.values().next().value;
	if (!fragment) {
		throw new Error("No structural fragment is loaded.");
	}
	return fragment;
}

export function resetStructuralSpace() {
	fragments.clear();
	cellsByFragment.clear();
	nextFragmentId = 0;
}

export function updateDisplayOffsets() {
	for (const fragment of fragments.values()) {
		fragment.displayOffset.x *= 1 - DRIFT_RATE;
		fragment.displayOffset.z *= 1 - DRIFT_RATE;
		if (
			Math.abs(fragment.displayOffset.x) < 0.01 &&
			Math.abs(fragment.displayOffset.z) < 0.01
		) {
			fragment.displayOffset.x = 0;
			fragment.displayOffset.z = 0;
		}
	}
}

export function getSectorCell(q: number, r: number) {
	const session = requireActiveWorldSession();
	return (
		session.sectorCells.find((entry) => entry.q === q && entry.r === r) ?? null
	);
}

export function requireSectorCell(q: number, r: number) {
	const cell = getSectorCell(q, r);
	if (!cell) {
		throw new Error(`No sector cell found at (${q}, ${r}).`);
	}
	return cell;
}

export function getAllSectorCells() {
	return requireActiveWorldSession().sectorCells;
}

export function getNeighborSectorCells(
	cell: Pick<SectorCellSnapshot, "q" | "r">,
) {
	const neighborOffsets = [
		[1, 0],
		[0, -1],
		[-1, 0],
		[0, 1],
		[1, -1],
		[1, 1],
		[-1, -1],
		[-1, 1],
	] as const;
	return neighborOffsets.flatMap(([dq, dr]) => {
		const neighbor = getSectorCell(cell.q + dq, cell.r + dr);
		return neighbor ? [neighbor] : [];
	});
}

export function getPassableSectorCell(q: number, r: number) {
	const cell = getSectorCell(q, r);
	if (!cell || !cell.passable) {
		return null;
	}
	return cell;
}

export function isPassableAtWorldPosition(x: number, z: number) {
	const { q, r } = worldToGrid(x, z);
	const cell = getSectorCell(q, r);
	return Boolean(cell?.passable);
}

export function getSurfaceHeightAtWorldPosition(_x: number, _z: number) {
	return 0;
}

export function getDiscoveryAtWorldPosition(
	fragment: StructuralFragment,
	x: number,
	z: number,
) {
	const { q, r } = worldToGrid(x, z);
	return (
		requireFragmentCells(fragment.id).get(cellKey(q, r))?.discoveryState ?? 0
	);
}

export function setDiscoveryAtWorldPosition(
	fragment: StructuralFragment,
	x: number,
	z: number,
	state: DiscoveryState,
) {
	const { q, r } = worldToGrid(x, z);
	const record = requireFragmentCells(fragment.id).get(cellKey(q, r));
	if (record && record.discoveryState < state) {
		record.discoveryState = state;
	}
}

export function getStructuralCellRecords(fragmentId: string) {
	return Array.from(requireFragmentCells(fragmentId).values());
}
