/**
 * Material definitions — textures, roughness, metalness for board zones.
 *
 * Migrated from groundMaterials.json. All texture paths are relative to /public.
 * Zone-based multi-texture blending (Gravel, Rock, Metal per zone) is deferred.
 */

/** Base colour in hex used as fallback before PBR textures load. */
export const CONCRETE_BASE_COLOR = 0x4e4e4e;

/** Public path prefix for the Concrete043A AmbientCG texture set. */
export const CONCRETE_TEXTURE_BASE = "/assets/textures/concrete043a";

export const CONCRETE_ROUGHNESS = 0.9;
export const CONCRETE_METALNESS = 0.0;
