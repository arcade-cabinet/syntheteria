/**
 * BaseMarker — BabylonJS mesh for base indicators.
 *
 * Creates tall thin cylinders with emissive glow at base world positions.
 * Player bases glow cyan, cult bases glow red.
 * Semi-transparent (alpha 0.7) so terrain is visible underneath.
 *
 * Not a React component — called imperatively from the render loop.
 */

import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Scene } from "@babylonjs/core/scene";
import type { World } from "koota";
import { Base, EntityId, Faction, Position } from "../ecs/traits";

// ─── Constants ──────────────────────────────────────────────────────────────

const MARKER_HEIGHT = 6;
const MARKER_DIAMETER = 1.5;
const MARKER_TESSELLATION = 16;
const MARKER_ALPHA = 0.7;

// ─── State ──────────────────────────────────────────────────────────────────

export interface BaseMarkerState {
	/** Live marker meshes keyed by EntityId string value. */
	markers: Map<string, Mesh>;
	/** Shared materials. */
	playerMaterial: StandardMaterial;
	cultMaterial: StandardMaterial;
}

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Create shared materials for base markers.
 * Call once during scene setup.
 */
export function initBaseMarkers(scene: Scene): BaseMarkerState {
	const playerMaterial = new StandardMaterial("base-marker-player", scene);
	playerMaterial.diffuseColor = Color3.Black();
	playerMaterial.emissiveColor = new Color3(0, 1, 1); // cyan
	playerMaterial.specularColor = Color3.Black();
	playerMaterial.alpha = MARKER_ALPHA;

	const cultMaterial = new StandardMaterial("base-marker-cult", scene);
	cultMaterial.diffuseColor = Color3.Black();
	cultMaterial.emissiveColor = new Color3(1, 0.2, 0); // red-orange
	cultMaterial.specularColor = Color3.Black();
	cultMaterial.alpha = MARKER_ALPHA;

	return {
		markers: new Map(),
		playerMaterial,
		cultMaterial,
	};
}

// ─── Per-frame sync ─────────────────────────────────────────────────────────

/**
 * Synchronize base markers with ECS entities.
 * Creates markers for new bases, removes markers for destroyed bases.
 */
export function syncBaseMarkers(
	state: BaseMarkerState,
	scene: Scene,
	world: World,
): void {
	const liveIds = new Set<string>();

	for (const entity of world.query(Base, Position, EntityId, Faction)) {
		const eid = entity.get(EntityId)!.value;
		if (!eid) continue;
		liveIds.add(eid);

		const pos = entity.get(Position)!;
		const faction = entity.get(Faction)!.value;

		let marker = state.markers.get(eid);
		if (!marker) {
			// Create new marker
			marker = MeshBuilder.CreateCylinder(
				`base-marker-${eid}`,
				{
					height: MARKER_HEIGHT,
					diameter: MARKER_DIAMETER,
					tessellation: MARKER_TESSELLATION,
				},
				scene,
			);

			marker.material =
				faction === "player" ? state.playerMaterial : state.cultMaterial;
			marker.metadata = { baseEntityId: eid };
			marker.isPickable = true;

			state.markers.set(eid, marker);
		}

		// Update position (Y centered at height/2)
		marker.position = new Vector3(pos.x, MARKER_HEIGHT / 2, pos.z);
	}

	// Dispose markers for removed bases
	for (const [eid, marker] of state.markers) {
		if (!liveIds.has(eid)) {
			marker.dispose();
			state.markers.delete(eid);
		}
	}
}

// ─── Picking ────────────────────────────────────────────────────────────────

/**
 * Check if a picked mesh is a base marker and return its entity ID.
 */
export function getBaseEntityFromMesh(
	state: BaseMarkerState,
	meshMetadata: unknown,
): string | null {
	if (
		meshMetadata &&
		typeof meshMetadata === "object" &&
		"baseEntityId" in meshMetadata
	) {
		const eid = (meshMetadata as { baseEntityId: string }).baseEntityId;
		if (state.markers.has(eid)) return eid;
	}
	return null;
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Dispose all base markers and materials.
 */
export function disposeBaseMarkers(state: BaseMarkerState): void {
	for (const marker of state.markers.values()) {
		marker.dispose();
	}
	state.markers.clear();
	state.playerMaterial.dispose();
	state.cultMaterial.dispose();
}
