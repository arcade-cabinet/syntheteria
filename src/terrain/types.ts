/**
 * Biome terrain types — overworld biome taxonomy.
 *
 * Each BiomeType defines a natural terrain with yields when harvested/mined.
 * Improvement overlays (roboforming) transform tiles visually and functionally.
 */

/**
 * Impassable types:
 *   water    — deep water; impassable without bridges
 *   mountain — high elevation; impassable, mineable for stone/ore
 *
 * Passable types:
 *   grassland — open plains; food/fiber
 *   forest    — wooded areas; timber, slower movement
 *   desert    — arid wasteland; sand/glass
 *   hills     — rolling terrain; stone/ore (less than mountain)
 *   wetland   — marshy ground; reeds/peat, slow movement
 *   tundra    — frozen terrain; sparse resources
 */
export type BiomeType =
	| "water"
	| "mountain"
	| "grassland"
	| "forest"
	| "desert"
	| "hills"
	| "wetland"
	| "tundra";
