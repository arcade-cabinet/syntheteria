/**
 * Adjective-adjective-noun seed pools for human-readable world names.
 *
 * Thematically evokes a dead ecumenopolis: decay, silence, ruin, cold light.
 * Used by NewGameModal to generate names like "Fractured Crimson Nexus".
 */

export const SEED_ADJECTIVES = [
	"Fractured",
	"Silent",
	"Crimson",
	"Frozen",
	"Burning",
	"Shattered",
	"Hollow",
	"Obsidian",
	"Sunken",
	"Ashen",
	"Rusted",
	"Veiled",
	"Blighted",
	"Corroded",
	"Dormant",
	"Echoing",
	"Fallen",
	"Gilded",
	"Haunted",
	"Irradiated",
	"Jagged",
	"Kinetic",
	"Luminous",
	"Molten",
	"Nocturnal",
	"Orbital",
	"Prismatic",
	"Quaking",
	"Resonant",
	"Scarred",
	"Temporal",
	"Umbral",
	"Volatile",
	"Withered",
	"Xenon",
	"Yielding",
	"Zeroed",
	"Abyssal",
	"Barren",
	"Cyclic",
	"Derelict",
	"Entropic",
	"Ferric",
	"Glacial",
	"Hexed",
	"Ionic",
	"Ruptured",
	"Spectral",
	"Tarnished",
	"Unbound",
	"Waning",
] as const;

export const SEED_NOUNS = [
	"Nexus",
	"Lattice",
	"Spire",
	"Cascade",
	"Monolith",
	"Conduit",
	"Crucible",
	"Bastion",
	"Abyss",
	"Meridian",
	"Sanctum",
	"Pinnacle",
	"Fulcrum",
	"Helix",
	"Prism",
	"Citadel",
	"Terminus",
	"Archive",
	"Furnace",
	"Beacon",
	"Vortex",
	"Remnant",
	"Threshold",
	"Substrate",
	"Dominion",
	"Aperture",
	"Stratum",
	"Edifice",
	"Cortex",
	"Labyrinth",
] as const;

export type SeedAdjective = (typeof SEED_ADJECTIVES)[number];
export type SeedNoun = (typeof SEED_NOUNS)[number];

/**
 * Generate an "Adjective Adjective Noun" world name from an RNG function.
 * The two adjectives are guaranteed to be different.
 */
export function generateWorldName(rng: () => number): string {
	const adj1Index = Math.floor(rng() * SEED_ADJECTIVES.length);
	let adj2Index = Math.floor(rng() * (SEED_ADJECTIVES.length - 1));
	if (adj2Index >= adj1Index) adj2Index++;
	const nounIndex = Math.floor(rng() * SEED_NOUNS.length);

	return `${SEED_ADJECTIVES[adj1Index]} ${SEED_ADJECTIVES[adj2Index]} ${SEED_NOUNS[nounIndex]}`;
}

