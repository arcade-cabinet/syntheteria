/**
 * Terrain floor types — ecumenopolis substrate taxonomy.
 *
 * Each FloorType corresponds to a visual cluster in the procedural shader
 * AND defines what the tile yields when strip-mined.
 *
 * Replaces: board/types.ts TileZone, pending/config/floorTextures.json,
 *           pending/config/zoneBlending.json
 *
 * Geography-driven types (void_pit, structural_mass, abyssal_platform) are
 * assigned from elevation and geography noise in the board generator.
 * Cluster-driven types (the remaining six) are assigned from the GLSL
 * cluster noise — same thresholds on CPU and GPU.
 */

/**
 * Impassable types:
 *   void_pit        — deep drop; no infrastructure (elevation = -1)
 *   structural_mass — dense machine structure; impassable barrier (geography noise)
 *
 * Passable types:
 *   abyssal_platform — steel grating over former ocean void; walk-on but hazardous
 *   transit_deck     — sealed transit/infrastructure corridors
 *   durasteel_span   — primary structural floor spans
 *   collapsed_zone   — rubble and debris fields
 *   dust_district    — wind-scoured ash and degraded electronics
 *   bio_district     — fossilized organic matter; polymer-rich
 *   aerostructure    — upper-level platforms exposed to the hypercane
 */
export type FloorType =
	| "void_pit"
	| "structural_mass"
	| "abyssal_platform"
	| "transit_deck"
	| "durasteel_span"
	| "collapsed_zone"
	| "dust_district"
	| "bio_district"
	| "aerostructure";

/**
 * 13-material resource taxonomy.
 * Replaces the old "ore" | "crystal" | "scrap" triple.
 * Ported from pending/systems/resources.ts and expanded.
 */
export type ResourceMaterial =
	// Foundation tier — structural salvage
	| "ferrous_scrap"
	| "alloy_stock"
	| "polymer_salvage"
	| "conductor_wire"
	// Advanced tier — energy and compute
	| "electrolyte"
	| "silicon_wafer"
	| "storm_charge"
	| "el_crystal"
	// Common tier — general debris
	| "scrap_metal"
	| "e_waste"
	| "intact_components"
	// Abyssal tier — former ocean infrastructure
	| "thermal_fluid"
	| "depth_salvage";

export type FloorDef = {
	/** Human-readable label. */
	label: string;
	/** Whether a unit can strip-mine this tile. */
	mineable: boolean;
	/** Turns required to fully mine (0 = not mineable). */
	hardness: number;
	/** Primary resource material yielded on completion. */
	resourceMaterial: ResourceMaterial | null;
	/** [min, max] resource units yielded. */
	resourceAmount: [number, number];
};

/**
 * Canonical floor definitions — gameplay values for each surface type.
 *
 * DESIGN INTENT — Floor mining is a BACKSTOP for resource deserts.
 * Buildings and prop structures on tiles are the PRIMARY resource source
 * (stripping a building yields advanced materials: conductor_wire,
 *  silicon_wafer, alloy_stock, storm_charge, el_crystal, etc.).
 *
 * Floor mining only yields basic/common materials. structural_mass is the
 * exception — it IS the "building" equivalent (impassable dense structure
 * that blocks movement) and yields intact_components as primary yield.
 *
 * Players who find themselves in a resource desert can always fall back to
 * floor mining for survival-level basics to build a Synthesizer and start
 * fusing advanced materials from base inputs.
 */
export const FLOOR_DEFS: Record<FloorType, FloorDef> = {
	void_pit: {
		label: "Void Pit",
		mineable: false,
		hardness: 0,
		resourceMaterial: null,
		resourceAmount: [0, 0],
	},
	/** Primary building-equivalent structure — dense machine infrastructure.
	 *  Impassable barrier (mountain/structure mechanic). High yield. */
	structural_mass: {
		label: "Structural Mass",
		mineable: true,
		hardness: 5,
		resourceMaterial: "intact_components",
		resourceAmount: [3, 7],
	},
	/** Former ocean floor under steel grating. Only source of thermal_fluid. */
	abyssal_platform: {
		label: "Abyssal Platform",
		mineable: true,
		hardness: 3,
		resourceMaterial: "thermal_fluid",
		resourceAmount: [2, 5],
	},
	/** Backstop: ferrous_scrap from surface floor panels. */
	transit_deck: {
		label: "Transit Deck",
		mineable: true,
		hardness: 2,
		resourceMaterial: "ferrous_scrap",
		resourceAmount: [1, 3],
	},
	/** Backstop: ferrous_scrap — primary structural flooring. */
	durasteel_span: {
		label: "Durasteel Span",
		mineable: true,
		hardness: 4,
		resourceMaterial: "ferrous_scrap",
		resourceAmount: [2, 4],
	},
	/** Backstop: scrap_metal — rubble and debris fields. */
	collapsed_zone: {
		label: "Collapsed Zone",
		mineable: true,
		hardness: 1,
		resourceMaterial: "scrap_metal",
		resourceAmount: [1, 3],
	},
	/** Backstop: e_waste — degraded electronics in wind-scoured ash. */
	dust_district: {
		label: "Dust District",
		mineable: true,
		hardness: 1,
		resourceMaterial: "e_waste",
		resourceAmount: [1, 3],
	},
	/** Backstop: polymer_salvage — fossilized organics and biopolymers. */
	bio_district: {
		label: "Bio District",
		mineable: true,
		hardness: 2,
		resourceMaterial: "polymer_salvage",
		resourceAmount: [1, 3],
	},
	/** Backstop: scrap_metal from upper-platform debris. */
	aerostructure: {
		label: "Aerostructure",
		mineable: true,
		hardness: 3,
		resourceMaterial: "scrap_metal",
		resourceAmount: [1, 2],
	},
};

/** FloorType → atlas cell index. Must match scripts/build-texture-atlas.ts layout. */
export const FLOOR_INDEX_MAP: Record<FloorType, number> = {
	structural_mass: 0,
	durasteel_span: 1,
	transit_deck: 2,
	collapsed_zone: 3,
	dust_district: 4,
	bio_district: 5,
	aerostructure: 6,
	abyssal_platform: 7,
	void_pit: 8,
};

/** True for passable floor types. */
export function isPassableFloor(t: FloorType): boolean {
	return t !== "void_pit" && t !== "structural_mass";
}
