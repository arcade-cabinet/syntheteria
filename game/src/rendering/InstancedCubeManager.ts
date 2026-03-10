/**
 * InstancedCubeManager — manages Three.js InstancedMesh lifecycle for
 * batched MaterialCube rendering.
 *
 * Each material type gets its own InstancedMesh so all cubes of the same
 * material are drawn in a single GPU draw call. The manager tracks:
 *
 *   - Instance allocation/deallocation with swap-and-pop removal
 *   - Per-instance transform matrices (position + rotation)
 *   - Per-instance color attribute for selection highlight
 *   - Dirty tracking to avoid unnecessary GPU buffer uploads
 *
 * Performance target: 5000+ cubes at 60fps on mobile WebGL.
 */

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum number of instances per material type */
const DEFAULT_MAX_INSTANCES = 10_000;

/** Cube geometry size — 0.5m on each side */
const CUBE_SIZE = 0.5;

/** Default color (white = no tint, material color shows through) */
const DEFAULT_COLOR = new THREE.Color(1, 1, 1);

/** Selection highlight color — green emissive tint baked into instance color */
const HIGHLIGHT_COLOR = new THREE.Color(0.3, 1.0, 0.7);

// ---------------------------------------------------------------------------
// Shared geometry
// ---------------------------------------------------------------------------

let _sharedGeometry: THREE.BoxGeometry | null = null;

function getSharedGeometry(): THREE.BoxGeometry {
	if (!_sharedGeometry) {
		_sharedGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
	}
	return _sharedGeometry;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Opaque handle returned by addCube, used for update/remove operations. */
export interface CubeHandle {
	/** Material type this cube belongs to */
	readonly materialType: string;
	/**
	 * Current index in the InstancedMesh arrays. This may change if another
	 * cube is removed (swap-and-pop), so always read from the handle.
	 */
	index: number;
	/** Unique ID for this handle (stable across swaps) */
	readonly id: number;
}

/** Internal per-material-type batch data. */
interface MaterialBatch {
	mesh: THREE.InstancedMesh;
	/** Current number of active instances */
	count: number;
	/** Max capacity before needing reallocation */
	maxInstances: number;
	/** Map from handle ID to array index for fast lookup */
	handleIdToIndex: Map<number, number>;
	/** Map from array index to handle ID for swap-and-pop */
	indexToHandleId: Map<number, number>;
	/** Whether instance matrices need GPU upload */
	matricesDirty: boolean;
	/** Whether instance colors need GPU upload */
	colorsDirty: boolean;
	/** Highlight state per instance (indexed by handle ID) */
	highlighted: Set<number>;
}

// ---------------------------------------------------------------------------
// Reusable temporaries (avoid per-frame allocations)
// ---------------------------------------------------------------------------

const _tempMatrix = new THREE.Matrix4();
const _tempPosition = new THREE.Vector3();
const _tempQuaternion = new THREE.Quaternion();
const _tempScale = new THREE.Vector3(1, 1, 1);
const _tempColor = new THREE.Color();

// ---------------------------------------------------------------------------
// InstancedCubeManager
// ---------------------------------------------------------------------------

export class InstancedCubeManager {
	private batches = new Map<string, MaterialBatch>();
	private nextHandleId = 0;
	private handleMap = new Map<number, CubeHandle>();
	private maxInstances: number;

	/** Parent group that holds all InstancedMesh objects for scene attachment */
	readonly group = new THREE.Group();

	constructor(maxInstances = DEFAULT_MAX_INSTANCES) {
		this.maxInstances = maxInstances;
		this.group.name = "InstancedCubeManager";
	}

	// -----------------------------------------------------------------------
	// Batch management
	// -----------------------------------------------------------------------

	/**
	 * Get or create the MaterialBatch for a given material type.
	 * The InstancedMesh is created lazily on first use.
	 */
	private getBatch(
		materialType: string,
		material: THREE.Material,
	): MaterialBatch {
		let batch = this.batches.get(materialType);
		if (batch) return batch;

		const geometry = getSharedGeometry();
		const mesh = new THREE.InstancedMesh(geometry, material, this.maxInstances);
		mesh.name = `InstancedCubes_${materialType}`;
		mesh.count = 0;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.frustumCulled = false; // instances span the whole world

		// Initialize instance color attribute (white = no tint)
		const colors = new Float32Array(this.maxInstances * 3);
		for (let i = 0; i < this.maxInstances; i++) {
			colors[i * 3] = 1;
			colors[i * 3 + 1] = 1;
			colors[i * 3 + 2] = 1;
		}
		mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

		batch = {
			mesh,
			count: 0,
			maxInstances: this.maxInstances,
			handleIdToIndex: new Map(),
			indexToHandleId: new Map(),
			matricesDirty: false,
			colorsDirty: false,
			highlighted: new Set(),
		};

		this.batches.set(materialType, batch);
		this.group.add(mesh);

		return batch;
	}

	// -----------------------------------------------------------------------
	// Public API
	// -----------------------------------------------------------------------

	/**
	 * Add a cube instance of the given material type at the specified position
	 * and rotation. Returns a CubeHandle for subsequent updates/removal.
	 *
	 * @param materialType - Key matching cubeMaterials.json (e.g. "iron", "copper")
	 * @param position     - World-space position {x, y, z}
	 * @param rotation     - Euler rotation {x, y, z} in radians (default: no rotation)
	 * @param material     - Three.js material to use for this batch
	 */
	addCube(
		materialType: string,
		position: { x: number; y: number; z: number },
		rotation: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
		material: THREE.Material,
	): CubeHandle {
		const batch = this.getBatch(materialType, material);

		if (batch.count >= batch.maxInstances) {
			console.warn(
				`[InstancedCubeManager] Max instances (${batch.maxInstances}) reached for "${materialType}". Cube not added.`,
			);
			// Return a dummy handle
			const handle: CubeHandle = {
				materialType,
				index: -1,
				id: this.nextHandleId++,
			};
			return handle;
		}

		const index = batch.count;
		const id = this.nextHandleId++;

		const handle: CubeHandle = { materialType, index, id };
		this.handleMap.set(id, handle);

		batch.handleIdToIndex.set(id, index);
		batch.indexToHandleId.set(index, id);
		batch.count++;
		batch.mesh.count = batch.count;

		// Set transform
		_tempPosition.set(position.x, position.y, position.z);
		_tempQuaternion.setFromEuler(
			new THREE.Euler(rotation.x, rotation.y, rotation.z),
		);
		_tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
		batch.mesh.setMatrixAt(index, _tempMatrix);

		// Set default color (white)
		batch.mesh.instanceColor!.setXYZ(
			index,
			DEFAULT_COLOR.r,
			DEFAULT_COLOR.g,
			DEFAULT_COLOR.b,
		);

		batch.matricesDirty = true;
		batch.colorsDirty = true;

		return handle;
	}

	/**
	 * Remove a cube instance by its handle.
	 * Uses swap-and-pop: the removed slot is filled by the last instance.
	 */
	removeCube(handle: CubeHandle): void {
		const batch = this.batches.get(handle.materialType);
		if (!batch) return;

		const index = batch.handleIdToIndex.get(handle.id);
		if (index === undefined) return;

		const lastIndex = batch.count - 1;

		if (index !== lastIndex) {
			// Swap with last instance
			const lastHandleId = batch.indexToHandleId.get(lastIndex)!;
			const lastHandle = this.handleMap.get(lastHandleId)!;

			// Copy last instance's matrix to the removed slot
			batch.mesh.getMatrixAt(lastIndex, _tempMatrix);
			batch.mesh.setMatrixAt(index, _tempMatrix);

			// Copy last instance's color to the removed slot
			const colors = (
				batch.mesh.instanceColor as THREE.InstancedBufferAttribute
			).array as Float32Array;
			colors[index * 3] = colors[lastIndex * 3];
			colors[index * 3 + 1] = colors[lastIndex * 3 + 1];
			colors[index * 3 + 2] = colors[lastIndex * 3 + 2];

			// Update bookkeeping for the swapped instance
			lastHandle.index = index;
			batch.handleIdToIndex.set(lastHandleId, index);
			batch.indexToHandleId.set(index, lastHandleId);
		}

		// Remove the last slot's bookkeeping
		batch.indexToHandleId.delete(lastIndex);
		batch.handleIdToIndex.delete(handle.id);
		this.handleMap.delete(handle.id);
		handle.index = -1;

		batch.count--;
		batch.mesh.count = batch.count;
		batch.matricesDirty = true;
		batch.colorsDirty = true;
	}

	/**
	 * Update the world-space position of a cube instance.
	 */
	updateCubePosition(
		handle: CubeHandle,
		position: { x: number; y: number; z: number },
	): void {
		const batch = this.batches.get(handle.materialType);
		if (!batch) return;

		const index = batch.handleIdToIndex.get(handle.id);
		if (index === undefined) return;

		// Read existing matrix to preserve rotation
		batch.mesh.getMatrixAt(index, _tempMatrix);
		_tempMatrix.decompose(_tempPosition, _tempQuaternion, _tempScale);

		// Update position only
		_tempPosition.set(position.x, position.y, position.z);
		_tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
		batch.mesh.setMatrixAt(index, _tempMatrix);

		batch.matricesDirty = true;
	}

	/**
	 * Update the world-space position and rotation of a cube instance.
	 */
	updateCubeTransform(
		handle: CubeHandle,
		position: { x: number; y: number; z: number },
		rotation: { x: number; y: number; z: number },
	): void {
		const batch = this.batches.get(handle.materialType);
		if (!batch) return;

		const index = batch.handleIdToIndex.get(handle.id);
		if (index === undefined) return;

		_tempPosition.set(position.x, position.y, position.z);
		_tempQuaternion.setFromEuler(
			new THREE.Euler(rotation.x, rotation.y, rotation.z),
		);
		_tempMatrix.compose(_tempPosition, _tempQuaternion, _tempScale);
		batch.mesh.setMatrixAt(index, _tempMatrix);

		batch.matricesDirty = true;
	}

	/**
	 * Set the selection highlight state for a cube instance.
	 * Highlighted cubes get a green tint; non-highlighted cubes revert to white.
	 */
	setHighlight(handle: CubeHandle, highlighted: boolean): void {
		const batch = this.batches.get(handle.materialType);
		if (!batch) return;

		const index = batch.handleIdToIndex.get(handle.id);
		if (index === undefined) return;

		if (highlighted) {
			batch.highlighted.add(handle.id);
			_tempColor.copy(HIGHLIGHT_COLOR);
		} else {
			batch.highlighted.delete(handle.id);
			_tempColor.copy(DEFAULT_COLOR);
		}

		batch.mesh.instanceColor!.setXYZ(
			index,
			_tempColor.r,
			_tempColor.g,
			_tempColor.b,
		);
		batch.colorsDirty = true;
	}

	/**
	 * Check if a handle is highlighted.
	 */
	isHighlighted(handle: CubeHandle): boolean {
		const batch = this.batches.get(handle.materialType);
		if (!batch) return false;
		return batch.highlighted.has(handle.id);
	}

	// -----------------------------------------------------------------------
	// GPU buffer sync — call once per frame after all mutations
	// -----------------------------------------------------------------------

	/**
	 * Upload dirty buffers to the GPU. Call this once per frame (in useFrame)
	 * after all addCube/removeCube/updateCubePosition/setHighlight calls.
	 *
	 * Only uploads buffers that have actually changed since the last flush.
	 */
	flush(): void {
		for (const batch of this.batches.values()) {
			if (batch.matricesDirty) {
				batch.mesh.instanceMatrix.needsUpdate = true;
				batch.matricesDirty = false;
			}
			if (batch.colorsDirty && batch.mesh.instanceColor) {
				batch.mesh.instanceColor.needsUpdate = true;
				batch.colorsDirty = false;
			}
		}
	}

	// -----------------------------------------------------------------------
	// Queries
	// -----------------------------------------------------------------------

	/** Get the total number of active cube instances across all materials. */
	get totalCount(): number {
		let total = 0;
		for (const batch of this.batches.values()) {
			total += batch.count;
		}
		return total;
	}

	/** Get the number of active instances for a specific material type. */
	getCountForMaterial(materialType: string): number {
		return this.batches.get(materialType)?.count ?? 0;
	}

	/** Get all material types that have at least one instance. */
	getActiveMaterialTypes(): string[] {
		const types: string[] = [];
		for (const [type, batch] of this.batches) {
			if (batch.count > 0) types.push(type);
		}
		return types;
	}

	/** Check if a handle is still valid (not removed). */
	isValid(handle: CubeHandle): boolean {
		return handle.index >= 0 && this.handleMap.has(handle.id);
	}

	// -----------------------------------------------------------------------
	// Disposal
	// -----------------------------------------------------------------------

	/**
	 * Dispose all GPU resources: InstancedMesh objects, their materials,
	 * and the shared geometry. Call on scene teardown.
	 */
	dispose(): void {
		for (const [, batch] of this.batches) {
			this.group.remove(batch.mesh);
			batch.mesh.dispose();
			// Don't dispose the shared geometry here — it may be used by other
			// components. Don't dispose materials either — they are owned by
			// the CubeMaterialProvider.
			batch.handleIdToIndex.clear();
			batch.indexToHandleId.clear();
			batch.highlighted.clear();
		}
		this.batches.clear();
		this.handleMap.clear();
	}

	/**
	 * Dispose everything including the shared geometry.
	 * Call only when completely tearing down the game scene.
	 */
	static disposeSharedResources(): void {
		if (_sharedGeometry) {
			_sharedGeometry.dispose();
			_sharedGeometry = null;
		}
	}
}
