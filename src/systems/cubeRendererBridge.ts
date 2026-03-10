/**
 * Cube renderer bridge — connects cube systems to instanced mesh rendering.
 *
 * The cubePileTracker groups cubes into piles. The cubeStacking system manages
 * grid placement. The cubeMaterialProperties defines per-material stats. But
 * nothing connects these systems to generate render data — positions, materials,
 * colors, instance counts — for the instanced mesh renderer.
 *
 * This bridge collects render data from cube-related systems and outputs
 * frame-ready render instructions. It tracks registered cubes, their transforms,
 * highlight state, and PBR material properties, then batches them by material
 * type for efficient instanced rendering.
 *
 * No config imports. No R3F/Three.js imports. Pure data output.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

/** PBR render properties for a material type. */
export interface MaterialRenderProps {
	color: string;
	roughness: number;
	metalness: number;
	emissive: string;
}

/** Per-cube render state tracked by the bridge. */
export interface CubeRenderState {
	cubeId: string;
	position: Vec3;
	rotation: Vec3;
	scale: number;
	materialType: string;
	highlighted: boolean;
	renderProps: MaterialRenderProps;
}

/** A single instance entry for the instanced mesh renderer. */
export interface CubeInstance {
	cubeId: string;
	position: Vec3;
	rotation: Vec3;
	scale: number;
	materialType: string;
	color: string;
	emissive: string;
	roughness: number;
	metalness: number;
}

/** World-space label for a pile of cubes. */
export interface PileLabel {
	position: Vec3;
	text: string;
	value: number;
}

/** Full render batch output for a single frame. */
export interface RenderBatch {
	instances: CubeInstance[];
	pileLabels: PileLabel[];
}

// ---------------------------------------------------------------------------
// Material PBR table (hardcoded per spec)
// ---------------------------------------------------------------------------

const MATERIAL_RENDER_TABLE: ReadonlyMap<string, MaterialRenderProps> = new Map([
	["scrap_iron", { color: "#8B7355", roughness: 0.8, metalness: 0.3, emissive: "#000000" }],
	["iron", { color: "#A8A8A8", roughness: 0.4, metalness: 0.7, emissive: "#000000" }],
	["copper", { color: "#B87333", roughness: 0.3, metalness: 0.8, emissive: "#000000" }],
	["e_waste", { color: "#4A6741", roughness: 0.7, metalness: 0.2, emissive: "#000000" }],
	["fiber_optics", { color: "#00BFFF", roughness: 0.2, metalness: 0.1, emissive: "#003344" }],
	["rare_alloy", { color: "#FFD700", roughness: 0.1, metalness: 0.9, emissive: "#000000" }],
]);

const FALLBACK_RENDER_PROPS: MaterialRenderProps = {
	color: "#8B7355",
	roughness: 0.8,
	metalness: 0.3,
	emissive: "#000000",
};

/** Emissive color applied to highlighted cubes. */
const HIGHLIGHT_EMISSIVE = "#FFAA00";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

/** All registered cubes indexed by cubeId. */
let cubeStates = new Map<string, CubeRenderState>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get PBR render properties for a material type.
 *
 * Returns hardcoded PBR values. Falls back to scrap_iron properties
 * for unknown material types.
 */
export function getMaterialRenderProps(materialType: string): MaterialRenderProps {
	return MATERIAL_RENDER_TABLE.get(materialType) ?? FALLBACK_RENDER_PROPS;
}

/**
 * Register a cube for rendering.
 *
 * Creates a CubeRenderState with default rotation (0,0,0), scale 1,
 * and PBR properties looked up from the material table.
 */
export function registerCubeForRendering(
	cubeId: string,
	position: Vec3,
	materialType: string,
): void {
	const renderProps = getMaterialRenderProps(materialType);
	cubeStates.set(cubeId, {
		cubeId,
		position: { ...position },
		rotation: { x: 0, y: 0, z: 0 },
		scale: 1,
		materialType,
		highlighted: false,
		renderProps: { ...renderProps },
	});
}

/**
 * Stop tracking a cube for rendering.
 */
export function unregisterCubeForRendering(cubeId: string): void {
	cubeStates.delete(cubeId);
}

/**
 * Update a cube's world-space position and optional rotation.
 *
 * No-op if the cubeId is not registered.
 */
export function updateCubeRenderPosition(
	cubeId: string,
	position: Vec3,
	rotation?: Vec3,
): void {
	const state = cubeStates.get(cubeId);
	if (!state) return;

	state.position = { ...position };
	if (rotation) {
		state.rotation = { ...rotation };
	}
}

/**
 * Set or clear emissive highlight on a cube (for selection glow).
 *
 * When highlighted, the cube's emissive is overridden with the highlight
 * color. When un-highlighted, it reverts to the material's base emissive.
 */
export function setCubeHighlight(cubeId: string, highlighted: boolean): void {
	const state = cubeStates.get(cubeId);
	if (!state) return;

	state.highlighted = highlighted;
}

/**
 * Get the current visual state of a cube.
 *
 * Returns undefined if the cubeId is not registered.
 */
export function getCubeRenderState(cubeId: string): CubeRenderState | undefined {
	const state = cubeStates.get(cubeId);
	if (!state) return undefined;

	// Return a copy to prevent external mutation
	return {
		...state,
		position: { ...state.position },
		rotation: { ...state.rotation },
		renderProps: { ...state.renderProps },
	};
}

/**
 * Group all registered cubes by material type for instanced rendering.
 *
 * Returns a Map where each key is a materialType string and each value
 * is the array of CubeInstance entries for that material. Highlighted
 * cubes have their emissive overridden.
 */
export function getInstancedBatches(): Map<string, CubeInstance[]> {
	const batches = new Map<string, CubeInstance[]>();

	for (const state of cubeStates.values()) {
		const instance = stateToInstance(state);

		let batch = batches.get(state.materialType);
		if (!batch) {
			batch = [];
			batches.set(state.materialType, batch);
		}
		batch.push(instance);
	}

	return batches;
}

/**
 * Collect pile label data for world-space UI.
 *
 * Groups cubes by XZ position (floored to integers) and produces a
 * PileLabel for each group with the count and a position placed
 * above the highest cube in that column.
 */
export function getPileLabelData(): PileLabel[] {
	// Group cubes by integer XZ column
	const columns = new Map<string, { cubes: CubeRenderState[]; maxY: number }>();

	for (const state of cubeStates.values()) {
		const colKey = `${Math.floor(state.position.x)},${Math.floor(state.position.z)}`;
		let col = columns.get(colKey);
		if (!col) {
			col = { cubes: [], maxY: -Infinity };
			columns.set(colKey, col);
		}
		col.cubes.push(state);
		if (state.position.y > col.maxY) {
			col.maxY = state.position.y;
		}
	}

	const labels: PileLabel[] = [];

	for (const col of columns.values()) {
		if (col.cubes.length < 2) continue;

		// Average XZ, label floats above the highest cube
		let sumX = 0;
		let sumZ = 0;
		for (const cube of col.cubes) {
			sumX += cube.position.x;
			sumZ += cube.position.z;
		}
		const count = col.cubes.length;

		labels.push({
			position: {
				x: sumX / count,
				y: col.maxY + 0.75,
				z: sumZ / count,
			},
			text: `x${count}`,
			value: count,
		});
	}

	return labels;
}

/**
 * Get all cubes that currently have emissive highlight enabled.
 */
export function getHighlightedCubes(): CubeRenderState[] {
	const result: CubeRenderState[] = [];
	for (const state of cubeStates.values()) {
		if (state.highlighted) {
			result.push({
				...state,
				position: { ...state.position },
				rotation: { ...state.rotation },
				renderProps: { ...state.renderProps },
			});
		}
	}
	return result;
}

/**
 * Aggregate all cube data into a single RenderBatch for the current frame.
 *
 * Combines instance data (with highlight overrides) and pile labels.
 */
export function collectRenderData(): RenderBatch {
	const instances: CubeInstance[] = [];

	for (const state of cubeStates.values()) {
		instances.push(stateToInstance(state));
	}

	const pileLabels = getPileLabelData();

	return { instances, pileLabels };
}

/**
 * Clear all render tracking state. For testing and new-game initialization.
 */
export function reset(): void {
	cubeStates = new Map();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert internal CubeRenderState to a CubeInstance for output.
 *
 * Applies highlight emissive override when the cube is highlighted.
 */
function stateToInstance(state: CubeRenderState): CubeInstance {
	return {
		cubeId: state.cubeId,
		position: { ...state.position },
		rotation: { ...state.rotation },
		scale: state.scale,
		materialType: state.materialType,
		color: state.renderProps.color,
		emissive: state.highlighted ? HIGHLIGHT_EMISSIVE : state.renderProps.emissive,
		roughness: state.renderProps.roughness,
		metalness: state.renderProps.metalness,
	};
}
