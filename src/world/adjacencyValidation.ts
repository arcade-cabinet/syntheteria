/**
 * Adjacency Validation
 *
 * Scores and validates model placements based on adjacency contracts
 * from the ecumenopolis atlas. Used by the sector structure plan generator
 * to select context-appropriate models rather than zone-only random selection.
 */

import {
	ECUMENOPOLIS_MODEL_ATLAS,
	type ModelEntry,
	type ZoneType,
} from "../config/ecumenopolisAtlas";

// ---------------------------------------------------------------------------
// Adjacency context for a cell
// ---------------------------------------------------------------------------

export interface AdjacencyContext {
	/** Zone type of this cell */
	zone: ZoneType;
	/** Zone types of north/east/south/west neighbors (null if edge of map) */
	neighbors: {
		north: ZoneType | null;
		east: ZoneType | null;
		south: ZoneType | null;
		west: ZoneType | null;
	};
	/** Composite roles already placed in this cell's anchor group */
	existingCompositeRoles: string[];
	/** Tags of models already placed in adjacent cells */
	neighborTags: string[];
	/** Whether this cell is on a zone boundary */
	isZoneBoundary: boolean;
	/** Whether this cell has door/portal access */
	hasPortalAccess: boolean;
}

// ---------------------------------------------------------------------------
// Adjacency scoring
// ---------------------------------------------------------------------------

/**
 * Score a model candidate for placement in a given adjacency context.
 * Higher score = better fit. Score of 0 means acceptable but no strong match.
 * Negative score means the model conflicts with the context.
 */
export function scoreModelPlacement(
	model: ModelEntry,
	context: AdjacencyContext,
): number {
	let score = 0;

	// Zone affinity: strong bonus for matching the target zone
	if (model.zoneAffinity.includes(context.zone)) {
		score += 10;
	} else {
		// Penalty for placing outside zone affinity
		score -= 5;
	}

	// Adjacency bias match against neighbor tags
	for (const bias of model.adjacencyBias) {
		if (context.neighborTags.includes(bias)) {
			score += 3;
		}
	}

	// Composite role compatibility with existing roles in the anchor group
	for (const role of model.compositeRoles) {
		if (context.existingCompositeRoles.includes(role)) {
			score += 4;
		}
	}

	// Zone boundary bonus for wall/door families
	if (
		context.isZoneBoundary &&
		(model.family === "wall" ||
			model.family === "wall_door" ||
			model.family === "wall_window")
	) {
		score += 6;
	}

	// Portal bonus for door models when portal access is needed
	if (context.hasPortalAccess && model.passability === "portal") {
		score += 5;
	}

	// Cross-zone neighbor affinity: bonus if model zones match any neighbor zones
	const neighborZones = [
		context.neighbors.north,
		context.neighbors.east,
		context.neighbors.south,
		context.neighbors.west,
	].filter((z): z is ZoneType => z !== null);

	for (const nz of neighborZones) {
		if (model.zoneAffinity.includes(nz)) {
			score += 1;
		}
	}

	// Detail density: detail models get a bonus on zone boundaries
	// (transitions are visually busier and benefit from detail)
	if (
		context.isZoneBoundary &&
		(model.family === "detail_signage" ||
			model.family === "detail_panel" ||
			model.family === "detail_pipework")
	) {
		score += 3;
	}

	return score;
}

/**
 * Rank model candidates for a given context, returning the top N.
 * Used by the sector plan generator to replace pure zone-based selection.
 */
export function rankModelCandidates(
	candidates: ModelEntry[],
	context: AdjacencyContext,
	topN: number,
): ModelEntry[] {
	return candidates
		.map((model) => ({ model, score: scoreModelPlacement(model, context) }))
		.sort((a, b) => b.score - a.score)
		.slice(0, topN)
		.map((entry) => entry.model);
}

/**
 * Select a model deterministically from ranked candidates using a seed.
 * Picks from the top candidates (weighted toward higher scores).
 */
export function selectModelByAdjacency(
	candidates: ModelEntry[],
	context: AdjacencyContext,
	seed: number,
	poolSize = 3,
): ModelEntry | null {
	const ranked = rankModelCandidates(candidates, context, poolSize);
	if (ranked.length === 0) {
		return null;
	}
	return ranked[seed % ranked.length] ?? null;
}

// ---------------------------------------------------------------------------
// Detail density rules
// ---------------------------------------------------------------------------

export interface DetailDensityRule {
	/** Zone type that this rule applies to */
	zone: ZoneType;
	/** Maximum number of detail models per cell */
	maxDetailsPerCell: number;
	/** Preferred detail families for this zone */
	preferredFamilies: ModelEntry["family"][];
	/** Detail density multiplier at zone boundaries (1.0 = normal) */
	boundaryMultiplier: number;
}

export const DETAIL_DENSITY_RULES: DetailDensityRule[] = [
	{
		zone: "core",
		maxDetailsPerCell: 2,
		preferredFamilies: ["detail_signage", "detail_panel"],
		boundaryMultiplier: 1.5,
	},
	{
		zone: "power",
		maxDetailsPerCell: 3,
		preferredFamilies: ["detail_pipework", "detail_panel"],
		boundaryMultiplier: 1.8,
	},
	{
		zone: "fabrication",
		maxDetailsPerCell: 3,
		preferredFamilies: ["detail_pipework", "detail_panel"],
		boundaryMultiplier: 1.5,
	},
	{
		zone: "storage",
		maxDetailsPerCell: 1,
		preferredFamilies: ["detail_signage"],
		boundaryMultiplier: 1.2,
	},
	{
		zone: "habitation",
		maxDetailsPerCell: 2,
		preferredFamilies: ["detail_signage", "detail_panel"],
		boundaryMultiplier: 1.3,
	},
	{
		zone: "corridor",
		maxDetailsPerCell: 2,
		preferredFamilies: ["detail_signage", "detail_pipework"],
		boundaryMultiplier: 1.6,
	},
	{
		zone: "breach",
		maxDetailsPerCell: 1,
		preferredFamilies: ["detail_pipework"],
		boundaryMultiplier: 1.0,
	},
	{
		zone: "cult_ruin",
		maxDetailsPerCell: 2,
		preferredFamilies: ["detail_signage", "detail_pipework"],
		boundaryMultiplier: 1.4,
	},
];

/** Get detail density rule for a zone */
export function getDetailDensityRule(zone: ZoneType): DetailDensityRule {
	return (
		DETAIL_DENSITY_RULES.find((rule) => rule.zone === zone) ??
		DETAIL_DENSITY_RULES.find((rule) => rule.zone === "corridor")!
	);
}

/**
 * Get detail model candidates appropriate for a zone and adjacency context.
 * Filters from the full atlas based on zone affinity and preferred families.
 */
export function getDetailCandidates(
	zone: ZoneType,
	context: AdjacencyContext,
): ModelEntry[] {
	const rule = getDetailDensityRule(zone);
	return ECUMENOPOLIS_MODEL_ATLAS.filter(
		(model) =>
			rule.preferredFamilies.includes(model.family) &&
			model.zoneAffinity.includes(zone),
	);
}

/**
 * Calculate how many details a cell should have based on zone and boundary status.
 */
export function getDetailCount(
	zone: ZoneType,
	isZoneBoundary: boolean,
	seed: number,
): number {
	const rule = getDetailDensityRule(zone);
	const baseMax = rule.maxDetailsPerCell;
	const effectiveMax = isZoneBoundary
		? Math.ceil(baseMax * rule.boundaryMultiplier)
		: baseMax;
	// Use seed to pick a count between 0 and effectiveMax
	return seed % (effectiveMax + 1);
}

// ---------------------------------------------------------------------------
// Wall variant selection based on adjacency
// ---------------------------------------------------------------------------

/**
 * Choose between wall variants (solid, window, door) based on context.
 * Zone boundaries with different passability get solid walls.
 * Zone boundaries between compatible zones get window walls.
 * Transit transitions get door walls.
 */
export function selectWallVariant(
	context: AdjacencyContext,
): "solid" | "window" | "door" {
	if (context.hasPortalAccess) {
		return "door";
	}

	// Determine if neighboring zone is visually compatible (similar vibe)
	const compatiblePairs: [ZoneType, ZoneType][] = [
		["core", "habitation"],
		["core", "corridor"],
		["habitation", "corridor"],
		["fabrication", "storage"],
		["fabrication", "power"],
		["power", "corridor"],
	];

	const neighborZones = [
		context.neighbors.north,
		context.neighbors.east,
		context.neighbors.south,
		context.neighbors.west,
	].filter((z): z is ZoneType => z !== null && z !== context.zone);

	for (const nz of neighborZones) {
		const isCompatible = compatiblePairs.some(
			([a, b]) =>
				(a === context.zone && b === nz) || (b === context.zone && a === nz),
		);
		if (isCompatible) {
			return "window";
		}
	}

	return "solid";
}

/**
 * Filter wall models from the atlas based on wall variant selection.
 */
export function getWallCandidatesForContext(
	context: AdjacencyContext,
): ModelEntry[] {
	const variant = selectWallVariant(context);

	return ECUMENOPOLIS_MODEL_ATLAS.filter((model) => {
		if (variant === "door") {
			return model.family === "wall_door";
		}
		if (variant === "window") {
			return model.family === "wall_window";
		}
		return (
			model.family === "wall" &&
			!model.tags.includes("window") &&
			!model.tags.includes("wall_door")
		);
	});
}
