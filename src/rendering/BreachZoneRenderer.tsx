/**
 * Breach Zone Renderer
 *
 * Marks breach zone cells with a pulsing emissive rift effect.
 * Primary breach zones (near cult site) pulse stronger and redder.
 * Secondary breach zones pulse subtler with purple tones.
 *
 * Each breach cell gets:
 * - A base corruption overlay (dark, cracked appearance)
 * - A pulsing emissive rift line through the cell center
 * - A faint particle-like glow ring around the rift
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { getBreachZones } from "../systems/breachZones";
import {
	gridToWorld,
	SECTOR_LATTICE_SIZE,
} from "../world/sectorCoordinates";

const CORRUPTION_COLOR = 0x1a0a1e;
const RIFT_COLOR_PRIMARY = 0xff4466;
const RIFT_COLOR_SECONDARY = 0xb044dd;
const GLOW_COLOR_PRIMARY = 0xff2244;
const GLOW_COLOR_SECONDARY = 0x8833cc;

const CORRUPTION_Y = 0.012;
const RIFT_Y = 0.025;
const GLOW_Y = 0.018;

const PULSE_SPEED = 1.8;
const PULSE_MIN = 0.15;
const PULSE_MAX = 0.55;

interface BreachCellData {
	x: number;
	z: number;
	isPrimary: boolean;
	/** Seeded rotation for the rift line */
	riftAngle: number;
}

function hashCell(q: number, r: number): number {
	return (Math.imul(q ^ 0x45d9f3b, 0x45d9f3b) ^ Math.imul(r ^ 0x119de1f3, 0x119de1f3)) >>> 0;
}

function collectBreachCells(): BreachCellData[] {
	const zones = getBreachZones();
	const cells: BreachCellData[] = [];
	const seen = new Set<string>();

	for (const zone of zones) {
		for (const cell of zone.cells) {
			const key = `${cell.q},${cell.r}`;
			if (seen.has(key)) continue;
			seen.add(key);

			const pos = gridToWorld(cell.q, cell.r);
			cells.push({
				x: pos.x,
				z: pos.z,
				isPrimary: zone.isPrimary,
				riftAngle: (hashCell(cell.q, cell.r) % 628) / 100,
			});
		}
	}
	return cells;
}

/** Corruption base overlay — dark quad on each breach cell */
function CorruptionOverlay({ cells }: { cells: BreachCellData[] }) {
	const size = SECTOR_LATTICE_SIZE * 0.94;
	return (
		<>
			{cells.map((cell, i) => (
				<mesh
					key={`corruption-${i}`}
					rotation={[-Math.PI / 2, 0, 0]}
					position={[cell.x, CORRUPTION_Y, cell.z]}
				>
					<planeGeometry args={[size, size]} />
					<meshBasicMaterial
						color={CORRUPTION_COLOR}
						transparent
						opacity={0.35}
						side={THREE.DoubleSide}
						depthWrite={false}
					/>
				</mesh>
			))}
		</>
	);
}

/** Pulsing rift lines through breach cells */
function RiftLines({ cells }: { cells: BreachCellData[] }) {
	const materialRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

	useFrame(({ clock }) => {
		const t = clock.getElapsedTime();
		for (let i = 0; i < materialRefs.current.length; i++) {
			const mat = materialRefs.current[i];
			if (!mat) continue;
			// Each rift pulses with a slight phase offset based on index
			const phase = t * PULSE_SPEED + i * 0.4;
			const pulse = PULSE_MIN + (PULSE_MAX - PULSE_MIN) * (0.5 + 0.5 * Math.sin(phase));
			mat.emissiveIntensity = pulse;
			mat.opacity = 0.3 + pulse * 0.5;
		}
	});

	// Ensure refs array matches cell count
	if (materialRefs.current.length !== cells.length) {
		materialRefs.current = new Array(cells.length).fill(null);
	}

	const riftLength = SECTOR_LATTICE_SIZE * 0.7;
	const riftWidth = 0.08;

	return (
		<>
			{cells.map((cell, i) => (
				<mesh
					key={`rift-${i}`}
					rotation={[-Math.PI / 2, 0, 0]}
					position={[cell.x, RIFT_Y, cell.z]}
				>
					<planeGeometry args={[riftLength, riftWidth]} />
					<meshStandardMaterial
						ref={(ref) => {
							materialRefs.current[i] = ref;
						}}
						color={cell.isPrimary ? RIFT_COLOR_PRIMARY : RIFT_COLOR_SECONDARY}
						emissive={cell.isPrimary ? RIFT_COLOR_PRIMARY : RIFT_COLOR_SECONDARY}
						emissiveIntensity={0.4}
						transparent
						opacity={0.5}
						side={THREE.DoubleSide}
						depthWrite={false}
						roughness={0.2}
						metalness={0.0}
					/>
				</mesh>
			))}
		</>
	);
}

/** Glow rings around rift centers */
function GlowRings({ cells }: { cells: BreachCellData[] }) {
	const materialRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

	useFrame(({ clock }) => {
		const t = clock.getElapsedTime();
		for (let i = 0; i < materialRefs.current.length; i++) {
			const mat = materialRefs.current[i];
			if (!mat) continue;
			const phase = t * PULSE_SPEED * 0.7 + i * 0.6;
			const pulse = 0.04 + 0.08 * (0.5 + 0.5 * Math.sin(phase));
			mat.opacity = pulse;
		}
	});

	if (materialRefs.current.length !== cells.length) {
		materialRefs.current = new Array(cells.length).fill(null);
	}

	const innerRadius = SECTOR_LATTICE_SIZE * 0.25;
	const outerRadius = SECTOR_LATTICE_SIZE * 0.42;

	return (
		<>
			{cells.map((cell, i) => (
				<mesh
					key={`glow-${i}`}
					rotation={[-Math.PI / 2, 0, 0]}
					position={[cell.x, GLOW_Y, cell.z]}
				>
					<ringGeometry args={[innerRadius, outerRadius, 16]} />
					<meshBasicMaterial
						ref={(ref) => {
							materialRefs.current[i] = ref;
						}}
						color={cell.isPrimary ? GLOW_COLOR_PRIMARY : GLOW_COLOR_SECONDARY}
						transparent
						opacity={0.06}
						side={THREE.DoubleSide}
						depthWrite={false}
					/>
				</mesh>
			))}
		</>
	);
}

/**
 * Renders breach zone visual markers — corruption overlay, pulsing rifts,
 * and glow rings on all breach cells.
 */
export function BreachZoneRenderer() {
	const cells = useMemo(() => collectBreachCells(), []);

	if (cells.length === 0) return null;

	return (
		<group>
			<CorruptionOverlay cells={cells} />
			<RiftLines cells={cells} />
			<GlowRings cells={cells} />
		</group>
	);
}
