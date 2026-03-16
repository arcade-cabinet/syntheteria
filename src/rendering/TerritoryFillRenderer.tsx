/**
 * Territory Fill Renderer
 *
 * Renders translucent colored overlays on faction-owned cells.
 * Complements TerritoryBorderRenderer (which draws edge lines).
 *
 * Each faction gets its own tint:
 * - player: cyan
 * - rogue: amber
 * - feral: red
 * - cultist: purple
 *
 * Uses instanced rendering — one instanced mesh per faction, with a
 * flat plane per cell. Reacts to TerritoryCell Koota entity changes
 * via useQuery — no useFrame poll needed.
 */

import { useQuery } from "koota/react";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { TerritoryCell } from "../ecs/traits";
import type { EconomyFactionId } from "../systems/factionEconomy";
import { gridToWorld, SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";

const FACTION_FILL_COLORS: Record<string, number> = {
	player: 0x00cccc, // Cyan
	rogue: 0xffaa44, // Amber — Reclaimers
	cultist: 0xd987ff, // Purple — Signal Choir / Iron Creed
	feral: 0x44cc44, // Green — Volt Collective
};

const FILL_Y = 0.015;
const FILL_OPACITY = 0.08;

interface FactionFillData {
	faction: EconomyFactionId;
	matrices: Float32Array;
	count: number;
	color: number;
}

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion().setFromEuler(
	new THREE.Euler(-Math.PI / 2, 0, 0),
);
const _scale = new THREE.Vector3(
	SECTOR_LATTICE_SIZE * 0.96,
	SECTOR_LATTICE_SIZE * 0.96,
	1,
);

type CellEntity = ReturnType<typeof useQuery>[number];

function buildFillData(cellEntities: readonly CellEntity[]): FactionFillData[] {
	const cellsByFaction = new Map<
		EconomyFactionId,
		{ q: number; r: number }[]
	>();

	for (const entity of cellEntities) {
		const cell = entity.get(TerritoryCell);
		if (!cell) continue;
		const owner = cell.owner as EconomyFactionId;
		let cells = cellsByFaction.get(owner);
		if (!cells) {
			cells = [];
			cellsByFaction.set(owner, cells);
		}
		cells.push({ q: cell.q, r: cell.r });
	}

	const result: FactionFillData[] = [];
	for (const [faction, cells] of cellsByFaction) {
		const matrices = new Float32Array(cells.length * 16);
		for (let i = 0; i < cells.length; i++) {
			const pos = gridToWorld(cells[i].q, cells[i].r);
			_position.set(pos.x, FILL_Y, pos.z);
			_matrix.compose(_position, _quaternion, _scale);
			_matrix.toArray(matrices, i * 16);
		}
		result.push({
			faction,
			matrices,
			count: cells.length,
			color: FACTION_FILL_COLORS[faction] ?? 0x8be6ff,
		});
	}
	return result;
}

function FactionFillInstances({
	matrices,
	count,
	color,
}: {
	matrices: Float32Array;
	count: number;
	color: number;
}) {
	const meshRef = useRef<THREE.InstancedMesh>(null);

	useMemo(() => {
		if (!meshRef.current) return;
		const mesh = meshRef.current;
		for (let i = 0; i < count; i++) {
			_matrix.fromArray(matrices, i * 16);
			mesh.setMatrixAt(i, _matrix);
		}
		mesh.instanceMatrix.needsUpdate = true;
		mesh.count = count;
	}, [matrices, count]);

	if (count === 0) return null;

	return (
		<instancedMesh
			ref={meshRef}
			args={[undefined, undefined, Math.max(count, 1)]}
			frustumCulled={false}
		>
			<planeGeometry args={[1, 1]} />
			<meshBasicMaterial
				color={color}
				transparent
				opacity={FILL_OPACITY}
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</instancedMesh>
	);
}

/**
 * Renders faction territory as translucent colored overlays on owned cells.
 * Reacts to TerritoryCell Koota entity changes via useQuery — no poll needed.
 */
export function TerritoryFillRenderer() {
	const cellEntities = useQuery(TerritoryCell);

	const fillData = useMemo(() => buildFillData(cellEntities), [cellEntities]);

	return (
		<>
			{fillData.map((data) => (
				<FactionFillInstances
					key={data.faction}
					matrices={data.matrices}
					count={data.count}
					color={data.color}
				/>
			))}
		</>
	);
}
