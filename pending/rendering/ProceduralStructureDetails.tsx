/**
 * Procedural Structure Details
 *
 * Adds small detail props (pipes, vents, cables, antennae) to buildings
 * based on building type and seeded pseudo-random placement.
 *
 * Uses simple Three.js geometries — no GLB loading required.
 * Rendered as instanced meshes for performance.
 *
 * Detail types per structure zone:
 * - command: antennae, sensor dishes
 * - fabrication: exhaust pipes, vents, cable bundles
 * - storage: access hatches, reinforcement ribs
 * - power: conduit pipes, warning pylons
 * - habitation: air ducts, small windows
 * - transit: guide rails, signal lights
 */

import { useMemo } from "react";
import * as THREE from "three";
import { gridToWorld, SECTOR_LATTICE_SIZE } from "../world/sectorCoordinates";
import { getActiveWorldSession } from "../world/session";
import type { WorldSessionSnapshot } from "../world/snapshots";

interface DetailInstance {
	position: [number, number, number];
	rotation: [number, number, number];
	scale: [number, number, number];
	type: "pipe" | "vent" | "antenna" | "cable" | "pylon";
	color: number;
	emissive: number;
	emissiveIntensity: number;
}

/** Deterministic hash for seeded placement */
function detailHash(q: number, r: number, salt: number): number {
	const h =
		Math.imul(q ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul(r ^ 0x119de1f3, salt);
	return ((h >>> 0) % 10000) / 10000;
}

function generateDetailsForCell(
	q: number,
	r: number,
	zone: string,
): DetailInstance[] {
	const pos = gridToWorld(q, r);
	const details: DetailInstance[] = [];
	const half = SECTOR_LATTICE_SIZE * 0.42;

	// Each zone gets 0-3 detail props, deterministically placed
	const detailCount = Math.floor(detailHash(q, r, 0x1234) * 3.5);

	for (let i = 0; i < detailCount; i++) {
		const hx = detailHash(q, r, 0x5678 + i * 17);
		const hz = detailHash(q, r, 0x9abc + i * 31);
		const angle = detailHash(q, r, 0xdef0 + i * 43) * Math.PI * 2;
		const dx = (hx - 0.5) * half * 2;
		const dz = (hz - 0.5) * half * 2;

		switch (zone) {
			case "command_core":
			case "command": {
				// Antennae — tall thin cylinders
				const h = 0.3 + detailHash(q, r, 0x1111 + i) * 0.5;
				details.push({
					position: [pos.x + dx, h / 2 + 0.02, pos.z + dz],
					rotation: [0, angle, 0],
					scale: [0.03, h, 0.03],
					type: "antenna",
					color: 0x556677,
					emissive: 0x88ccff,
					emissiveIntensity: 0.15,
				});
				break;
			}
			case "fabrication": {
				// Exhaust pipes — horizontal cylinders
				details.push({
					position: [pos.x + dx, 0.15, pos.z + dz],
					rotation: [0, angle, Math.PI / 2],
					scale: [0.06, 0.3, 0.06],
					type: "pipe",
					color: 0x665533,
					emissive: 0xf6c56a,
					emissiveIntensity: 0.08,
				});
				break;
			}
			case "storage": {
				// Reinforcement ribs — short wide boxes
				details.push({
					position: [pos.x + dx, 0.04, pos.z + dz],
					rotation: [0, angle, 0],
					scale: [0.35, 0.08, 0.04],
					type: "cable",
					color: 0x555555,
					emissive: 0x333333,
					emissiveIntensity: 0.02,
				});
				break;
			}
			case "power": {
				// Warning pylons — small glowing boxes
				details.push({
					position: [pos.x + dx, 0.12, pos.z + dz],
					rotation: [0, angle, 0],
					scale: [0.05, 0.24, 0.05],
					type: "pylon",
					color: 0x444466,
					emissive: 0x88a7ff,
					emissiveIntensity: 0.25,
				});
				break;
			}
			case "habitation": {
				// Air ducts — wider cylinders
				details.push({
					position: [pos.x + dx, 0.06, pos.z + dz],
					rotation: [Math.PI / 2, angle, 0],
					scale: [0.08, 0.25, 0.08],
					type: "vent",
					color: 0x556666,
					emissive: 0x7ed6e5,
					emissiveIntensity: 0.05,
				});
				break;
			}
			case "corridor_transit":
			case "transit": {
				// Signal lights — tiny glowing spheres
				details.push({
					position: [pos.x + dx, 0.08, pos.z + dz],
					rotation: [0, 0, 0],
					scale: [0.04, 0.04, 0.04],
					type: "pylon",
					color: 0x113333,
					emissive: 0x8be6ff,
					emissiveIntensity: 0.35,
				});
				break;
			}
			default:
				break;
		}
	}

	return details;
}

/** Shared geometries for detail props */
const cylinderGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function DetailMesh({ detail }: { detail: DetailInstance }) {
	const geo =
		detail.type === "cable" || detail.type === "pylon" ? boxGeo : cylinderGeo;

	return (
		<mesh
			geometry={geo}
			position={detail.position}
			rotation={detail.rotation}
			scale={detail.scale}
		>
			<meshStandardMaterial
				color={detail.color}
				emissive={detail.emissive}
				emissiveIntensity={detail.emissiveIntensity}
				roughness={0.75}
				metalness={0.2}
			/>
		</mesh>
	);
}

/**
 * Renders procedural detail props on structure cells.
 * Only processes discovered, non-breach cells that have structures.
 */
export function ProceduralStructureDetails({
	session: providedSession,
}: {
	session?: WorldSessionSnapshot | null;
}) {
	const session = providedSession ?? getActiveWorldSession();

	const allDetails = useMemo(() => {
		if (!session) return [];
		const details: DetailInstance[] = [];

		for (const cell of session.sectorCells) {
			// Only render on discovered, passable cells
			if (cell.discovery_state < 1 || !cell.passable) continue;
			// Skip breach zones — they get their own renderer
			if (cell.floor_preset_id === "breach_exposed") continue;

			const cellDetails = generateDetailsForCell(
				cell.q,
				cell.r,
				cell.floor_preset_id,
			);
			details.push(...cellDetails);
		}

		return details;
	}, [session]);

	if (allDetails.length === 0) return null;

	return (
		<group>
			{allDetails.map((detail, i) => (
				<DetailMesh key={`detail-${i}`} detail={detail} />
			))}
		</group>
	);
}
