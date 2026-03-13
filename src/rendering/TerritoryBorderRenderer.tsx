/**
 * Territory Border Renderer
 *
 * Renders colored line segments at the edges of faction-controlled territory.
 * Each faction gets its own emissive color. Only border edges (where a faction
 * cell is adjacent to unclaimed or rival territory) are drawn.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { EconomyFactionId } from "../systems/factionEconomy";
import { getAllCellOwnership, getCellOwner } from "../systems/territorySystem";
import { gridToWorld, SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";

const FACTION_BORDER_COLORS: Record<string, number> = {
	player: 0x00cccc, // Cyan
	rogue: 0xffaa44, // Amber — Reclaimers
	cultist: 0xd987ff, // Purple — Signal Choir / Iron Creed
	feral: 0x44cc44, // Green — Volt Collective
};

const BORDER_Y = 0.04;

/** 4-connected neighbor offsets and corresponding edge line segments */
const EDGE_DEFS: {
	dq: number;
	dr: number;
	/** Two corners of the shared edge, as offsets from cell center */
	a: [number, number];
	b: [number, number];
}[] = [
	// +x neighbor missing → draw right edge
	{ dq: 1, dr: 0, a: [0.5, -0.5], b: [0.5, 0.5] },
	// -x neighbor missing → draw left edge
	{ dq: -1, dr: 0, a: [-0.5, -0.5], b: [-0.5, 0.5] },
	// +z neighbor missing → draw bottom edge
	{ dq: 0, dr: 1, a: [-0.5, 0.5], b: [0.5, 0.5] },
	// -z neighbor missing → draw top edge
	{ dq: 0, dr: -1, a: [-0.5, -0.5], b: [0.5, -0.5] },
];

interface FactionBorderGroup {
	faction: EconomyFactionId;
	positions: Float32Array;
	color: number;
}

function buildBorderGeometry(): FactionBorderGroup[] {
	const ownership = getAllCellOwnership();
	const edgesByFaction = new Map<EconomyFactionId, number[]>();

	for (const [, cell] of ownership) {
		const worldPos = gridToWorld(cell.q, cell.r);

		for (const edge of EDGE_DEFS) {
			const neighborOwner = getCellOwner(cell.q + edge.dq, cell.r + edge.dr);
			if (neighborOwner === cell.owner) continue;

			let edges = edgesByFaction.get(cell.owner);
			if (!edges) {
				edges = [];
				edgesByFaction.set(cell.owner, edges);
			}

			const half = SECTOR_LATTICE_SIZE;
			// Push two endpoints: (x1,y,z1), (x2,y,z2)
			edges.push(
				worldPos.x + edge.a[0] * half,
				BORDER_Y,
				worldPos.z + edge.a[1] * half,
				worldPos.x + edge.b[0] * half,
				BORDER_Y,
				worldPos.z + edge.b[1] * half,
			);
		}
	}

	const groups: FactionBorderGroup[] = [];
	for (const [faction, coords] of edgesByFaction) {
		groups.push({
			faction,
			positions: new Float32Array(coords),
			color: FACTION_BORDER_COLORS[faction] ?? 0x8be6ff,
		});
	}
	return groups;
}

function FactionBorderLines({
	positions,
	color,
}: {
	positions: Float32Array;
	color: number;
}) {
	const geom = useMemo(() => {
		const g = new THREE.BufferGeometry();
		g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
		return g;
	}, [positions]);

	return (
		<lineSegments geometry={geom}>
			<lineBasicMaterial
				color={color}
				transparent
				opacity={0.55}
				linewidth={1}
			/>
		</lineSegments>
	);
}

/**
 * Renders faction territory borders as colored line segments.
 * Rebuilds geometry periodically (every 60 frames) since territory
 * only recalculates every RECALC_INTERVAL ticks anyway.
 */
export function TerritoryBorderRenderer() {
	const groupsRef = useRef<FactionBorderGroup[]>([]);
	const frameCounter = useRef(0);
	const versionRef = useRef(0);

	useFrame(() => {
		frameCounter.current++;
		if (frameCounter.current >= 60) {
			frameCounter.current = 0;
			groupsRef.current = buildBorderGeometry();
			versionRef.current++;
		}
	});

	// Initial build
	if (groupsRef.current.length === 0) {
		groupsRef.current = buildBorderGeometry();
	}

	return (
		<>
			{groupsRef.current.map((group) => (
				<FactionBorderLines
					key={group.faction}
					positions={group.positions}
					color={group.color}
				/>
			))}
		</>
	);
}
