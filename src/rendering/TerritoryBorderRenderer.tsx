/**
 * TerritoryBorderRenderer — renders faction territory borders on terrain.
 *
 * Each territory is rendered as a flat ring (RingGeometry) lying on the terrain
 * plane at y≈0.05 to avoid z-fighting with the ground. The ring color matches
 * the owning faction's accent color from config/factionVisuals.json.
 *
 * Border opacity scales with territory strength (0–1) so freshly claimed or
 * weakening territories fade in/out naturally. Contested territories (two
 * different factions overlapping) get a pulsing opacity to indicate tension.
 *
 * Pure utility functions (computeBorderColor, computeBorderOpacity,
 * computeIsContested) are exported for unit tests.
 *
 * Mount inside <Canvas> in GameScene.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { getFactionAccentColor } from "./botUtils";
import {
	type Territory,
	getAllTerritories,
	getOverlappingTerritories,
} from "../systems/territory";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How many edge segments for the ring geometry — smooth circle. */
const RING_SEGMENTS = 64;

/** Border ring width in world units (inner radius = territory.radius - BORDER_WIDTH). */
const BORDER_WIDTH = 0.8;

/** Y height slightly above terrain to avoid z-fighting. */
const BORDER_Y = 0.05;

/** Minimum territory radius to render a border. */
const MIN_RADIUS = 1.0;

// ---------------------------------------------------------------------------
// Pure utilities — exported for tests
// ---------------------------------------------------------------------------

/**
 * Compute the hex number color for a territory border.
 * Uses the owning faction's accent color, falling back to neutral gold.
 *
 * @param ownerId - Faction entity ID owning the territory
 * @returns Three.js hex color number (e.g. 0xDAA520)
 */
export function computeBorderColor(ownerId: string): number {
	return getFactionAccentColor(ownerId);
}

/**
 * Compute the base opacity for a territory border mesh.
 *
 * Opacity scales with territory strength so weakening territories fade.
 * Clamps between a minimum visible floor and 1.0 so the border is always
 * readable at full strength.
 *
 * @param territory - The territory to compute border opacity for
 * @returns Opacity in [0.25, 0.85]
 */
export function computeBorderOpacity(territory: Territory): number {
	const MIN_OPACITY = 0.25;
	const MAX_OPACITY = 0.85;
	return MIN_OPACITY + territory.strength * (MAX_OPACITY - MIN_OPACITY);
}

/**
 * Compute a pulsing opacity multiplier for contested territory borders.
 *
 * Returns a value between 0.6 and 1.0 based on time, so contested borders
 * pulse to indicate ongoing conflict. Non-contested borders return 1.0.
 *
 * @param isContested - Whether this territory overlaps with another faction
 * @param time - Elapsed time in seconds (from clock.elapsedTime)
 * @returns Multiplier in [0.6, 1.0]
 */
export function computeContestedPulse(isContested: boolean, time: number): number {
	if (!isContested) return 1.0;
	return 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time * 3.0));
}

/**
 * Build the hash string for a set of territories.
 * Used to detect when snapshot needs to update.
 */
export function computeTerritoryHash(territories: readonly Territory[]): string {
	return territories
		.map((t) => `${t.id}:${t.ownerId}:${t.radius.toFixed(1)}:${t.strength.toFixed(2)}`)
		.join("|");
}

// ---------------------------------------------------------------------------
// Geometry + material cache
// ---------------------------------------------------------------------------

/** Module-level cache of RingGeometry keyed by rounded radius string. */
const ringGeometryCache = new Map<string, THREE.RingGeometry>();

function getRingGeometry(radius: number): THREE.RingGeometry {
	const innerRadius = Math.max(0.1, radius - BORDER_WIDTH);
	const key = `${innerRadius.toFixed(2)}_${radius.toFixed(2)}`;
	if (!ringGeometryCache.has(key)) {
		const geo = new THREE.RingGeometry(innerRadius, radius, RING_SEGMENTS);
		ringGeometryCache.set(key, geo);
	}
	return ringGeometryCache.get(key)!;
}

/**
 * Dispose all cached ring geometries. Call on scene unmount.
 */
export function clearBorderGeometryCache(): void {
	for (const geo of ringGeometryCache.values()) {
		geo.dispose();
	}
	ringGeometryCache.clear();
}

// ---------------------------------------------------------------------------
// Single territory border mesh
// ---------------------------------------------------------------------------

interface BorderMeshProps {
	territory: Territory;
	isContested: boolean;
}

function TerritoryBorderMesh({ territory, isContested }: BorderMeshProps) {
	const meshRef = useRef<THREE.Mesh>(null);

	const { geometry, material } = useMemo(() => {
		const geo = getRingGeometry(territory.radius);
		const color = computeBorderColor(territory.ownerId);
		const mat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: computeBorderOpacity(territory),
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		return { geometry: geo, material: mat };
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [territory.id, territory.ownerId, territory.radius]);

	useFrame(({ clock }) => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const mat = mesh.material as THREE.MeshBasicMaterial;
		const baseOpacity = computeBorderOpacity(territory);
		const pulse = computeContestedPulse(isContested, clock.elapsedTime);
		mat.opacity = baseOpacity * pulse;
		mat.needsUpdate = true;
	});

	return (
		<mesh
			ref={meshRef}
			geometry={geometry}
			material={material}
			position={[territory.center.x, BORDER_Y, territory.center.z]}
			rotation={[-Math.PI / 2, 0, 0]}
		/>
	);
}

// ---------------------------------------------------------------------------
// Territory snapshot
// ---------------------------------------------------------------------------

interface TerritorySnapshot {
	territory: Territory;
	isContested: boolean;
}

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Renders territory borders as flat ring overlays on the terrain plane.
 * Mount inside <Canvas>. Polls getAllTerritories() each frame and rebuilds
 * snapshots only when the territory hash changes.
 */
export function TerritoryBorderRenderer() {
	const [snapshots, setSnapshots] = useState<TerritorySnapshot[]>([]);
	const prevHashRef = useRef("");

	useFrame(() => {
		const all = getAllTerritories();
		const hash = computeTerritoryHash(all);

		if (hash === prevHashRef.current) return;
		prevHashRef.current = hash;

		// Build contested set: territory IDs involved in any overlap
		const contestedIds = new Set<string>();
		for (const [a, b] of getOverlappingTerritories(all)) {
			contestedIds.add(a.id);
			contestedIds.add(b.id);
		}

		const next: TerritorySnapshot[] = [];
		for (const t of all) {
			if (t.radius < MIN_RADIUS) continue;
			next.push({
				territory: { ...t },
				isContested: contestedIds.has(t.id),
			});
		}

		setSnapshots(next);
	});

	return (
		<>
			{snapshots.map(({ territory, isContested }) => (
				<TerritoryBorderMesh
					key={territory.id}
					territory={territory}
					isContested={isContested}
				/>
			))}
		</>
	);
}
