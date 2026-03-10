/**
 * DecalSystem — module-level registry for projected decals.
 *
 * Manages visual effects projected onto mesh surfaces: damage cracks,
 * rust patches, scorch marks, and moss growth. Each decal is a thin
 * geometry overlay created via THREE.DecalGeometry and rendered with
 * alpha-blended MeshStandardMaterial.
 *
 * Design:
 *   - Module-level Map stores active decals (not a class singleton)
 *   - Max 100 active decals; oldest are evicted when limit is reached
 *   - Each decal has an age that drives opacity fade-out
 *   - `updateDecals(delta)` must be called each frame to advance ages
 *   - `removeDecal(id)` disposes geometry + material for a single decal
 *   - `disposeAllDecals()` tears down everything on scene exit
 */

import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported decal visual types. */
export type DecalType = "crack" | "rust" | "scorch" | "moss";

/** Full decal record stored in the registry. */
export interface DecalEntry {
	/** Unique identifier for this decal. */
	id: number;
	/** Which visual type this decal represents. */
	type: DecalType;
	/** The generated geometry projected onto the target mesh. */
	geometry: THREE.BufferGeometry;
	/** Alpha-blended material for this decal. */
	material: THREE.MeshStandardMaterial;
	/** The mesh object added to the scene. */
	mesh: THREE.Mesh;
	/** Seconds since the decal was created. */
	age: number;
	/** Seconds until the decal begins to fade. -1 = never fade. */
	fadeAfter: number;
	/** Total seconds for the fade-out once it starts. */
	fadeDuration: number;
	/** Initial opacity (captured at creation time). */
	baseOpacity: number;
	/** Creation timestamp (monotonic frame time). */
	createdAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of active decals before oldest are evicted. */
const MAX_DECALS = 100;

/** Default decal visual configs per type. */
const DECAL_DEFAULTS: Record<
	DecalType,
	{
		color: number;
		emissive: number;
		emissiveIntensity: number;
		opacity: number;
		metalness: number;
		roughness: number;
		fadeAfter: number;
		fadeDuration: number;
	}
> = {
	crack: {
		color: 0x222222,
		emissive: 0x000000,
		emissiveIntensity: 0,
		opacity: 0.8,
		metalness: 0.1,
		roughness: 0.95,
		fadeAfter: -1,
		fadeDuration: 10,
	},
	rust: {
		color: 0x8b4513,
		emissive: 0x000000,
		emissiveIntensity: 0,
		opacity: 0.7,
		metalness: 0.3,
		roughness: 0.9,
		fadeAfter: -1,
		fadeDuration: 15,
	},
	scorch: {
		color: 0x111111,
		emissive: 0xff4400,
		emissiveIntensity: 0.15,
		opacity: 0.85,
		metalness: 0.05,
		roughness: 0.98,
		fadeAfter: 30,
		fadeDuration: 20,
	},
	moss: {
		color: 0x2d5a27,
		emissive: 0x001100,
		emissiveIntensity: 0.05,
		opacity: 0.6,
		metalness: 0.0,
		roughness: 1.0,
		fadeAfter: -1,
		fadeDuration: 30,
	},
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** Active decals, ordered by creation (oldest first by insertion order). */
const decals = new Map<number, DecalEntry>();

/** Monotonically increasing ID counter. */
let nextId = 0;

/** Accumulated frame time for creation timestamps. */
let frameTime = 0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Project a decal onto a target mesh surface.
 *
 * @param targetMesh  - The Three.js Mesh to project onto. Must have geometry
 *                      with position attributes (BoxGeometry, BufferGeometry, etc.)
 * @param type        - Visual type: 'crack', 'rust', 'scorch', or 'moss'
 * @param position    - World-space hit point where the decal is centered
 * @param normal      - Surface normal at the hit point (used to orient the decal)
 * @param size        - Dimensions of the decal projection box (width, height, depth)
 * @returns           - The decal ID, or -1 if the decal could not be created
 */
export function addDecal(
	targetMesh: THREE.Mesh,
	type: DecalType,
	position: THREE.Vector3,
	normal: THREE.Vector3,
	size: THREE.Vector3 = new THREE.Vector3(0.5, 0.5, 0.2),
): number {
	// Evict oldest decals if at capacity
	while (decals.size >= MAX_DECALS) {
		const oldestKey = decals.keys().next().value;
		if (oldestKey !== undefined) {
			removeDecal(oldestKey);
		} else {
			break;
		}
	}

	// Compute orientation from surface normal
	const orientation = new THREE.Euler();
	const lookTarget = position.clone().add(normal);
	const helper = new THREE.Object3D();
	helper.position.copy(position);
	helper.lookAt(lookTarget);
	orientation.copy(helper.rotation);

	// Create the projected geometry
	let geometry: THREE.BufferGeometry;
	try {
		geometry = new DecalGeometry(targetMesh, position, orientation, size);
	} catch {
		// DecalGeometry can fail if the target mesh has no valid face in range
		return -1;
	}

	// Bail if the geometry produced no vertices
	const posAttr = geometry.getAttribute("position");
	if (!posAttr || posAttr.count === 0) {
		geometry.dispose();
		return -1;
	}

	const defaults = DECAL_DEFAULTS[type];

	const material = new THREE.MeshStandardMaterial({
		color: defaults.color,
		emissive: defaults.emissive,
		emissiveIntensity: defaults.emissiveIntensity,
		metalness: defaults.metalness,
		roughness: defaults.roughness,
		transparent: true,
		opacity: defaults.opacity,
		depthWrite: false,
		depthTest: true,
		polygonOffset: true,
		polygonOffsetFactor: -4,
		polygonOffsetUnits: -4,
		side: THREE.FrontSide,
	});

	const mesh = new THREE.Mesh(geometry, material);
	mesh.renderOrder = 10; // Render after regular scene objects
	mesh.frustumCulled = true;
	mesh.name = `decal_${type}_${nextId}`;

	const id = nextId++;

	const entry: DecalEntry = {
		id,
		type,
		geometry,
		material,
		mesh,
		age: 0,
		fadeAfter: defaults.fadeAfter,
		fadeDuration: defaults.fadeDuration,
		baseOpacity: defaults.opacity,
		createdAt: frameTime,
	};

	decals.set(id, entry);
	return id;
}

/**
 * Remove a single decal by ID. Disposes geometry and material.
 * Returns true if the decal existed and was removed.
 */
export function removeDecal(decalId: number): boolean {
	const entry = decals.get(decalId);
	if (!entry) return false;

	// Remove from parent scene if attached
	if (entry.mesh.parent) {
		entry.mesh.parent.remove(entry.mesh);
	}

	entry.geometry.dispose();
	entry.material.dispose();
	decals.delete(decalId);
	return true;
}

/**
 * Advance decal ages and handle opacity fading.
 * Call once per frame from useFrame.
 *
 * @param delta - Seconds since last frame
 * @returns IDs of decals that fully faded out and were removed this frame
 */
export function updateDecals(delta: number): number[] {
	frameTime += delta;
	const removed: number[] = [];

	for (const [id, entry] of decals) {
		entry.age += delta;

		// Check if this decal should be fading
		if (entry.fadeAfter >= 0 && entry.age > entry.fadeAfter) {
			const fadeElapsed = entry.age - entry.fadeAfter;
			const fadeProgress = Math.min(fadeElapsed / entry.fadeDuration, 1);
			entry.material.opacity = entry.baseOpacity * (1 - fadeProgress);

			// Fully faded — schedule removal
			if (fadeProgress >= 1) {
				removed.push(id);
			}
		}
	}

	// Remove fully-faded decals
	for (const id of removed) {
		removeDecal(id);
	}

	return removed;
}

/**
 * Get the mesh object for a decal so it can be added to a scene/group.
 * Returns null if the decal ID is invalid.
 */
export function getDecalMesh(decalId: number): THREE.Mesh | null {
	return decals.get(decalId)?.mesh ?? null;
}

/**
 * Get a read-only snapshot of a decal entry.
 */
export function getDecal(decalId: number): Readonly<DecalEntry> | null {
	return decals.get(decalId) ?? null;
}

/**
 * Get all active decal IDs.
 */
export function getActiveDecalIds(): number[] {
	return Array.from(decals.keys());
}

/**
 * Get the current number of active decals.
 */
export function getDecalCount(): number {
	return decals.size;
}

/**
 * Remove and dispose ALL active decals.
 * Call on scene teardown to free GPU memory.
 */
export function disposeAllDecals(): void {
	for (const [id] of decals) {
		const entry = decals.get(id);
		if (entry) {
			if (entry.mesh.parent) {
				entry.mesh.parent.remove(entry.mesh);
			}
			entry.geometry.dispose();
			entry.material.dispose();
		}
	}
	decals.clear();
}
