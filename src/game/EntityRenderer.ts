/**
 * EntityRenderer — manages BabylonJS meshes for Koota ECS entities.
 *
 * Loads robot GLB models into an asset pool, then each frame syncs
 * ECS entities (Position + Unit) to instantiated meshes. Handles
 * creation, position updates, selection rings, idle bob animation,
 * and disposal when entities are destroyed.
 *
 * Not a React component — called imperatively from GameCanvas.
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
// Side-effect import registers the glTF/GLB loader plugin
import "@babylonjs/loaders/glTF";

import { getAllRobotModelUrls, resolveUnitModelUrl } from "../config/models";
import {
	EntityId,
	Faction,
	Navigation,
	Position,
	ScavengeSite,
	Unit,
} from "../ecs/traits";
import { world } from "../ecs/world";
import {
	type BaseMarkerState,
	disposeBaseMarkers,
	initBaseMarkers,
	syncBaseMarkers,
} from "./BaseMarker";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EntityMeshEntry {
	/** Root transform node for this entity's model instance. */
	root: TransformNode;
	/** All meshes belonging to this instance (for raycasting). */
	meshes: AbstractMesh[];
	/** Selection ring torus, hidden when not selected. */
	selectionRing: AbstractMesh;
	/** The entity's Koota numeric ID (for staleness checks). */
	kootaId: number;
	/** Unit type used to instantiate — if it changes we need to re-create. */
	unitType: string;
	/** Base Y position (world coords) for bob animation offset. */
	baseY: number;
	/** Per-entity phase offset for bob animation (radians), derived from entity ID hash. */
	bobPhase: number;
	/** Current selection ring opacity for fade animation (0–0.8). */
	selectionRingOpacity: number;
}

/** State bag for the entity renderer, managed imperatively. */
export interface EntityRendererState {
	/** GLB asset containers keyed by model URL. */
	assetPool: Map<string, AssetContainer>;
	/** Live entity meshes keyed by EntityId string value. */
	entityMeshes: Map<string, EntityMeshEntry>;
	/** Shared selection ring material. */
	selectionMaterial: StandardMaterial;
	/** Whether asset loading is complete. */
	ready: boolean;
	/** Base marker renderer state. */
	baseMarkers: BaseMarkerState;
	/** Number of models that loaded successfully. */
	modelsLoaded: number;
	/** Total number of models attempted. */
	modelsTotal: number;
	/** Salvage node meshes keyed by Koota entity numeric ID. */
	salvageMeshes: Map<number, SalvageMeshEntry>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Uniform scale applied to all robot GLBs. */
const MODEL_SCALE = 0.5;

/** Bob animation amplitude (meters). */
const BOB_AMPLITUDE = 0.1;

/** Bob animation speed (radians per second). */
const BOB_SPEED = 2.0;

/** Selection ring inner/outer diameter ratio. */
const RING_DIAMETER = 2.5;
const RING_THICKNESS = 0.12;

// ─── Salvage node constants ─────────────────────────────────────────────────

/** Emissive colors for each material type. */
const SALVAGE_COLORS: Record<string, Color3> = {
	scrapMetal: new Color3(1.0, 0.5, 0.1), // orange
	circuitry: new Color3(0.0, 0.8, 1.0), // cyan
	powerCells: new Color3(1.0, 0.9, 0.2), // yellow
	durasteel: new Color3(0.75, 0.75, 0.8), // silver
};

/** Fallback color if material type is unknown. */
const SALVAGE_FALLBACK_COLOR = new Color3(0.5, 0.5, 0.5);

/** Pulse animation speed (radians per second). */
const SALVAGE_PULSE_SPEED = 3.0;

/** Pulse emissive intensity range. */
const SALVAGE_PULSE_MIN = 0.4;
const SALVAGE_PULSE_MAX = 1.0;

interface SalvageMeshEntry {
	/** Root mesh for this salvage node. */
	root: AbstractMesh;
	/** All child meshes for disposal. */
	meshes: AbstractMesh[];
	/** Material for emissive pulsing. */
	material: StandardMaterial;
	/** Phase offset for pulse animation. */
	pulsePhase: number;
	/** Base emissive color (before pulsing). */
	baseColor: Color3;
}

// ─── Initialization ─────────────────────────────────────────────────────────

/**
 * Load all robot GLBs into an asset pool and prepare shared materials.
 * Returns the renderer state bag. Meshes won't appear until syncEntities
 * is called each frame.
 */
export async function initEntityRenderer(
	scene: Scene,
): Promise<EntityRendererState> {
	const assetPool = new Map<string, AssetContainer>();
	const urls = getAllRobotModelUrls();

	// Load all unique GLBs in parallel
	const results = await Promise.allSettled(
		urls.map(async (url) => {
			const container = await LoadAssetContainerAsync(url, scene);
			assetPool.set(url, container);
		}),
	);

	// Log any failures but don't crash — missing models get the fallback
	let failCount = 0;
	for (let i = 0; i < results.length; i++) {
		if (results[i].status === "rejected") {
			failCount++;
			console.warn(
				`[EntityRenderer] Failed to load ${urls[i]}:`,
				(results[i] as PromiseRejectedResult).reason,
			);
		}
	}

	const modelsLoaded = urls.length - failCount;
	const modelsTotal = urls.length;
	if (import.meta.env.DEV) {
		console.log(
			`[EntityRenderer] Models loaded: ${modelsLoaded}/${modelsTotal}`,
		);
	}

	// Shared cyan emissive material for selection rings (not frozen — per-ring clones need alpha writes)
	const selectionMaterial = new StandardMaterial("selection-ring-mat", scene);
	selectionMaterial.diffuseColor = Color3.Black();
	selectionMaterial.emissiveColor = new Color3(0, 1, 1);
	selectionMaterial.specularColor = Color3.Black();
	selectionMaterial.alpha = 0;

	// Initialize base markers
	const baseMarkers = initBaseMarkers(scene);

	return {
		assetPool,
		entityMeshes: new Map(),
		selectionMaterial,
		ready: assetPool.size > 0,
		baseMarkers,
		modelsLoaded,
		modelsTotal,
		salvageMeshes: new Map(),
	};
}

// ─── Per-frame sync ─────────────────────────────────────────────────────────

/**
 * Synchronize BabylonJS meshes with the Koota ECS world.
 * Called every frame via scene.registerBeforeRender().
 *
 * - New entities: instantiate from asset pool
 * - Existing entities: update position, selection ring visibility
 * - Removed entities: dispose meshes
 */
export function syncEntities(state: EntityRendererState, scene: Scene): void {
	if (!state.ready) return;

	const time = performance.now() / 1000;
	const liveIds = new Set<string>();

	// Query all entities that should be rendered
	for (const entity of world.query(Position, Unit, EntityId)) {
		const eid = entity.get(EntityId)!.value;
		if (!eid) continue;

		liveIds.add(eid);

		const pos = entity.get(Position)!;
		const unit = entity.get(Unit)!;
		const nav = entity.has(Navigation) ? entity.get(Navigation) : undefined;
		const isMoving = nav?.moving ?? false;

		let entry = state.entityMeshes.get(eid);

		// If the unit type changed, dispose old mesh and re-create
		if (entry && entry.unitType !== unit.unitType) {
			disposeEntry(entry);
			state.entityMeshes.delete(eid);
			entry = undefined;
		}

		// Create mesh for new entity
		if (!entry) {
			entry = createEntityMesh(eid, unit.unitType, pos, state, scene);
			if (!entry) continue; // model not loaded
			state.entityMeshes.set(eid, entry);
		}

		// Update position with per-entity bob phase offset
		entry.baseY = pos.y;
		const bobOffset = isMoving
			? 0
			: Math.sin(time * BOB_SPEED + entry.bobPhase) * BOB_AMPLITUDE;
		entry.root.position.set(pos.x, pos.y + bobOffset, pos.z);

		// Selection ring fade animation — lerp opacity toward target over ~200ms
		const targetOpacity = unit.selected ? 0.8 : 0;
		const lerpRate = 1 - 0.01 ** (1 / 12); // ~200ms at 60fps
		entry.selectionRingOpacity +=
			(targetOpacity - entry.selectionRingOpacity) * lerpRate;
		const opacity = entry.selectionRingOpacity;
		if (opacity > 0.01) {
			entry.selectionRing.setEnabled(true);
			(entry.selectionRing.material as StandardMaterial).alpha = opacity;
		} else {
			entry.selectionRing.setEnabled(false);
		}

		// Faction-based coloring — tint cult units red
		const faction = entity.has(Faction) ? entity.get(Faction)!.value : "player";
		if (faction === "cultist") {
			for (const mesh of entry.meshes) {
				if (mesh.material && mesh.material instanceof StandardMaterial) {
					// Only tint once
					if (!mesh.metadata?.tinted) {
						mesh.material = mesh.material.clone(`${mesh.material.name}-cult`);
						(mesh.material as StandardMaterial).emissiveColor = new Color3(
							0.4,
							0,
							0,
						);
						mesh.metadata = { ...mesh.metadata, tinted: true };
					}
				}
			}
		}
	}

	// Dispose meshes for entities that no longer exist
	for (const [eid, entry] of state.entityMeshes) {
		if (!liveIds.has(eid)) {
			disposeEntry(entry);
			state.entityMeshes.delete(eid);
		}
	}

	// ── Salvage node sync ────────────────────────────────────────────────
	syncSalvageNodes(state, scene, time);

	// Sync base markers
	syncBaseMarkers(state.baseMarkers, scene, world);
}

// ─── Raycasting ─────────────────────────────────────────────────────────────

/**
 * Pick an entity at screen coordinates via BabylonJS scene.pick().
 * Returns the EntityId string value if a robot mesh was hit, or null.
 */
export function getEntityAtPoint(
	state: EntityRendererState,
	scene: Scene,
	screenX: number,
	screenY: number,
): string | null {
	const pickResult = scene.pick(screenX, screenY);
	if (!pickResult?.hit || !pickResult.pickedMesh) return null;

	// Walk up parent chain to find a mesh with entityId metadata
	let mesh: AbstractMesh | null = pickResult.pickedMesh;
	while (mesh) {
		const entityId = mesh.metadata?.entityId as string | undefined;
		if (entityId && state.entityMeshes.has(entityId)) {
			return entityId;
		}
		mesh = mesh.parent as AbstractMesh | null;
	}

	return null;
}

// ─── Cleanup ────────────────────────────────────────────────────────────────

/**
 * Dispose all entity meshes and asset containers. Call on unmount.
 */
export function disposeEntityRenderer(state: EntityRendererState): void {
	for (const [, entry] of state.entityMeshes) {
		disposeEntry(entry);
	}
	state.entityMeshes.clear();

	for (const [, container] of state.assetPool) {
		container.dispose();
	}
	state.assetPool.clear();

	for (const [, entry] of state.salvageMeshes) {
		disposeSalvageEntry(entry);
	}
	state.salvageMeshes.clear();

	disposeBaseMarkers(state.baseMarkers);
	state.selectionMaterial.dispose();
	state.ready = false;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Simple string hash → float in [0, 2π] for per-entity bob phase offset.
 * Ensures entities bob at different phases rather than in sync.
 */
function hashEntityId(id: string): number {
	let h = 0;
	for (let i = 0; i < id.length; i++) {
		h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
	}
	return ((h >>> 0) / 0xffffffff) * Math.PI * 2;
}

function createEntityMesh(
	entityId: string,
	unitType: string,
	pos: { x: number; y: number; z: number },
	state: EntityRendererState,
	scene: Scene,
): EntityMeshEntry | undefined {
	const modelUrl = resolveUnitModelUrl(unitType);
	const container = state.assetPool.get(modelUrl);

	if (!container) {
		// Try fallback URL
		const fallbackUrl = resolveUnitModelUrl("__fallback__");
		const fallbackContainer = state.assetPool.get(fallbackUrl);
		if (!fallbackContainer) {
			console.warn(
				`[EntityRenderer] No model for "${unitType}" (url: ${modelUrl}) and no fallback available`,
			);
			return undefined;
		}
		return createFromContainer(
			entityId,
			unitType,
			pos,
			fallbackContainer,
			state,
			scene,
		);
	}

	return createFromContainer(entityId, unitType, pos, container, state, scene);
}

function createFromContainer(
	entityId: string,
	unitType: string,
	pos: { x: number; y: number; z: number },
	container: AssetContainer,
	state: EntityRendererState,
	scene: Scene,
): EntityMeshEntry {
	const instance = container.instantiateModelsToScene(
		(name) => `${name}_${entityId}`,
	);

	const rootNode = instance.rootNodes[0] as TransformNode;
	rootNode.position = new Vector3(pos.x, pos.y, pos.z);
	rootNode.scaling = new Vector3(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);

	// Tag all meshes with entityId for raycasting and enforce visibility
	const meshes: AbstractMesh[] = [];
	for (const node of instance.rootNodes) {
		const nodeMeshes = (node as TransformNode).getChildMeshes?.(false) ?? [];
		for (const mesh of nodeMeshes) {
			mesh.metadata = { ...mesh.metadata, entityId };
			mesh.isPickable = true;
			mesh.isVisible = true;
			mesh.setEnabled(true);
			// Ensure PBR materials have minimum emissive so meshes are visible
			// even without a perfect environment texture setup
			if (mesh.material instanceof PBRMaterial) {
				const pbr = mesh.material;
				if (pbr.emissiveColor.equals(Color3.Black())) {
					pbr.emissiveColor = new Color3(0.08, 0.08, 0.08);
					pbr.emissiveIntensity = 1.0;
				}
			}
			meshes.push(mesh);
		}
		// Also tag the root if it's a mesh
		if ("isPickable" in node) {
			(node as AbstractMesh).metadata = {
				...(node as AbstractMesh).metadata,
				entityId,
			};
			(node as AbstractMesh).isPickable = true;
			(node as AbstractMesh).isVisible = true;
			meshes.push(node as AbstractMesh);
		}
	}

	// Also tag the root transform node
	rootNode.metadata = { ...rootNode.metadata, entityId };

	// Fallback: if GLB produced no visible child meshes, create a colored box
	// so the entity is always visible in the scene
	if (meshes.length === 0) {
		console.warn(
			`[EntityRenderer] GLB for "${unitType}" (entity ${entityId}) produced 0 meshes — creating fallback box`,
		);
		const fallbackBox = MeshBuilder.CreateBox(
			`fallback-${entityId}`,
			{ size: 1.0 },
			scene,
		);
		const fallbackMat = new StandardMaterial(`fallback-mat-${entityId}`, scene);
		fallbackMat.diffuseColor = new Color3(0.2, 0.8, 0.2);
		fallbackMat.emissiveColor = new Color3(0, 0.3, 0);
		fallbackMat.specularColor = Color3.Black();
		fallbackBox.material = fallbackMat;
		fallbackBox.parent = rootNode;
		fallbackBox.position = new Vector3(0, 0.5, 0);
		fallbackBox.metadata = { entityId };
		fallbackBox.isPickable = true;
		meshes.push(fallbackBox);
	}

	// Selection ring — torus parented to root, hidden by default
	const ring = MeshBuilder.CreateTorus(
		`selection-ring-${entityId}`,
		{
			diameter: RING_DIAMETER,
			thickness: RING_THICKNESS,
			tessellation: 32,
		},
		scene,
	);
	// Clone material per ring so each can have independent alpha for fade animation
	const ringMat = state.selectionMaterial.clone(
		`selection-ring-mat-${entityId}`,
	) as StandardMaterial;
	ringMat.alpha = 0;
	ring.material = ringMat;
	ring.parent = rootNode;
	ring.position = new Vector3(0, 0.05, 0); // Slightly above ground
	ring.isPickable = false;
	ring.setEnabled(false);

	return {
		root: rootNode,
		meshes,
		selectionRing: ring,
		kootaId: 0, // Not used for tracking — we use EntityId string
		unitType,
		baseY: pos.y,
		bobPhase: hashEntityId(entityId),
		selectionRingOpacity: 0,
	};
}

function disposeEntry(entry: EntityMeshEntry): void {
	// Dispose selection ring and its per-entity cloned material
	if (entry.selectionRing.material) {
		entry.selectionRing.material.dispose();
	}
	entry.selectionRing.dispose();

	// Dispose all child meshes
	for (const mesh of entry.meshes) {
		mesh.dispose();
	}

	// Dispose root node
	entry.root.dispose();
}


// ─── Salvage node rendering ────────────────────────────────────────────────

/**
 * Sync salvage node meshes with ECS ScavengeSite entities.
 * Creates procedural meshes for new sites, updates pulse animation,
 * and removes meshes for depleted/destroyed sites.
 */
function syncSalvageNodes(
	state: EntityRendererState,
	scene: Scene,
	time: number,
): void {
	const liveIds = new Set<number>();

	for (const entity of world.query(ScavengeSite, Position)) {
		const site = entity.get(ScavengeSite)!;
		const pos = entity.get(Position)!;
		const eid = entity as unknown as number; // Koota entities ARE numbers

		// Skip depleted sites
		if (site.remaining <= 0) continue;

		liveIds.add(eid);

		let entry = state.salvageMeshes.get(eid);

		// Create mesh if this entity is new
		if (!entry) {
			entry = createSalvageMesh(scene, site.materialType, pos.x, pos.y, pos.z);
			state.salvageMeshes.set(eid, entry);
		}

		// Update position (salvage nodes don't move, but just in case)
		entry.root.position.set(pos.x, pos.y, pos.z);

		// Pulsing emissive animation
		const pulse =
			SALVAGE_PULSE_MIN +
			(SALVAGE_PULSE_MAX - SALVAGE_PULSE_MIN) *
				(0.5 + 0.5 * Math.sin(time * SALVAGE_PULSE_SPEED + entry.pulsePhase));
		entry.material.emissiveColor = new Color3(
			entry.baseColor.r * pulse,
			entry.baseColor.g * pulse,
			entry.baseColor.b * pulse,
		);
	}

	// Dispose meshes for entities that no longer exist or are depleted
	for (const [eid, entry] of state.salvageMeshes) {
		if (!liveIds.has(eid)) {
			disposeSalvageEntry(entry);
			state.salvageMeshes.delete(eid);
		}
	}
}

/**
 * Create a procedural salvage node mesh: a pile of debris shapes.
 * Each material type gets a different shape composition.
 */
function createSalvageMesh(
	scene: Scene,
	materialType: string,
	x: number,
	y: number,
	z: number,
): SalvageMeshEntry {
	const baseColor = SALVAGE_COLORS[materialType] ?? SALVAGE_FALLBACK_COLOR;

	// Shared emissive material for this node
	const mat = new StandardMaterial(`salvage_mat_${x}_${z}`, scene);
	mat.diffuseColor = new Color3(
		baseColor.r * 0.3,
		baseColor.g * 0.3,
		baseColor.b * 0.3,
	);
	mat.emissiveColor = baseColor.clone();
	mat.specularColor = Color3.Black();

	const meshes: AbstractMesh[] = [];

	// Build shape composition based on material type
	if (materialType === "scrapMetal") {
		// Twisted metal chunks — rotated boxes
		const box1 = MeshBuilder.CreateBox(`salvage_box1_${x}_${z}`, { width: 0.6, height: 0.3, depth: 0.4 }, scene);
		box1.rotation.y = 0.7;
		box1.position.y = 0.15;
		box1.material = mat;
		meshes.push(box1);

		const box2 = MeshBuilder.CreateBox(`salvage_box2_${x}_${z}`, { width: 0.4, height: 0.25, depth: 0.5 }, scene);
		box2.rotation.y = -0.5;
		box2.rotation.z = 0.3;
		box2.position.set(0.2, 0.25, 0.1);
		box2.material = mat;
		meshes.push(box2);
	} else if (materialType === "circuitry") {
		// Circuit board — flat rectangle + small sphere nodes
		const board = MeshBuilder.CreateBox(`salvage_board_${x}_${z}`, { width: 0.8, height: 0.05, depth: 0.6 }, scene);
		board.position.y = 0.1;
		board.material = mat;
		meshes.push(board);

		const node1 = MeshBuilder.CreateSphere(`salvage_node1_${x}_${z}`, { diameter: 0.15 }, scene);
		node1.position.set(-0.2, 0.18, 0.1);
		node1.material = mat;
		meshes.push(node1);

		const node2 = MeshBuilder.CreateSphere(`salvage_node2_${x}_${z}`, { diameter: 0.12 }, scene);
		node2.position.set(0.15, 0.18, -0.15);
		node2.material = mat;
		meshes.push(node2);
	} else if (materialType === "powerCells") {
		// Glowing cylinders — battery cells
		const cell1 = MeshBuilder.CreateCylinder(`salvage_cell1_${x}_${z}`, { height: 0.5, diameter: 0.25 }, scene);
		cell1.position.set(0, 0.25, 0);
		cell1.material = mat;
		meshes.push(cell1);

		const cell2 = MeshBuilder.CreateCylinder(`salvage_cell2_${x}_${z}`, { height: 0.4, diameter: 0.2 }, scene);
		cell2.rotation.z = 0.4;
		cell2.position.set(0.2, 0.2, 0.15);
		cell2.material = mat;
		meshes.push(cell2);
	} else {
		// durasteel / fallback — sturdy angular shapes
		const slab = MeshBuilder.CreateBox(`salvage_slab_${x}_${z}`, { width: 0.7, height: 0.15, depth: 0.5 }, scene);
		slab.position.y = 0.08;
		slab.rotation.y = 0.3;
		slab.material = mat;
		meshes.push(slab);

		const chunk = MeshBuilder.CreateBox(`salvage_chunk_${x}_${z}`, { width: 0.3, height: 0.35, depth: 0.3 }, scene);
		chunk.position.set(-0.15, 0.25, 0.1);
		chunk.material = mat;
		meshes.push(chunk);
	}

	// Parent all shapes under a root TransformNode
	const root = MeshBuilder.CreateBox(`salvage_root_${x}_${z}`, { size: 0.001 }, scene);
	root.isVisible = false;
	root.position.set(x, y, z);

	for (const m of meshes) {
		m.parent = root;
		m.isPickable = false;
	}

	// Random pulse phase so nodes don't glow in sync
	const pulsePhase = (x * 7.3 + z * 13.7) % (Math.PI * 2);

	return { root, meshes, material: mat, pulsePhase, baseColor };
}

function disposeSalvageEntry(entry: SalvageMeshEntry): void {
	entry.material.dispose();
	for (const mesh of entry.meshes) {
		mesh.dispose();
	}
	entry.root.dispose();
}
