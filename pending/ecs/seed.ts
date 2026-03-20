/**
 * World seed management and deterministic PRNG.
 *
 * A world seed is a 32-bit integer that drives ALL randomness in the game —
 * terrain height, city layout, scavenge point placement, and enemy spawns.
 * The same seed always produces the exact same world, like Minecraft.
 *
 * Seeds are shown to the player as memorable three-word phrases:
 *   adjective · adjective · noun
 * e.g. "hollow-crimson-delta" or "bright-silent-forge"
 *
 * The seed phrase is generated from the numeric seed deterministically, and
 * can also be typed in as input to reproduce a specific world.
 */

// ---------------------------------------------------------------------------
// Mulberry32 — fast, high-quality 32-bit seeded PRNG
// ---------------------------------------------------------------------------

export function makePRNG(seed: number): () => number {
	let s = seed >>> 0;
	return () => {
		s |= 0;
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 0xffffffff;
	};
}

// ---------------------------------------------------------------------------
// Seed phrase word lists
// ---------------------------------------------------------------------------

const ADJECTIVES = [
	"hollow",
	"bright",
	"silent",
	"broken",
	"cold",
	"deep",
	"feral",
	"ashen",
	"ruined",
	"lost",
	"ancient",
	"static",
	"dark",
	"pale",
	"copper",
	"crimson",
	"iron",
	"rusted",
	"storm",
	"void",
	"null",
	"hard",
	"soft",
	"lone",
	"veiled",
	"bleak",
	"stark",
	"raw",
	"slack",
	"split",
	"sharp",
	"worn",
	"bare",
	"grim",
	"grey",
	"amber",
	"azure",
	"black",
	"white",
	"scarred",
	"dim",
	"bright",
	"wet",
	"dry",
	"slow",
	"fast",
	"wide",
	"thin",
	"tall",
	"low",
	"old",
	"new",
	"dead",
	"live",
	"hot",
	"cool",
	"mild",
	"harsh",
];

const NOUNS = [
	"forge",
	"delta",
	"circuit",
	"signal",
	"grid",
	"shard",
	"node",
	"echo",
	"static",
	"ruin",
	"tower",
	"ward",
	"vault",
	"rift",
	"core",
	"shell",
	"pulse",
	"tide",
	"wave",
	"stream",
	"flow",
	"arc",
	"link",
	"chain",
	"bridge",
	"gate",
	"lock",
	"key",
	"cell",
	"loop",
	"line",
	"point",
	"dot",
	"mark",
	"sign",
	"trace",
	"wire",
	"beam",
	"spark",
	"flash",
	"surge",
	"drain",
	"field",
	"zone",
	"sector",
	"block",
	"patch",
	"band",
	"mesh",
	"stack",
	"heap",
	"root",
	"seed",
	"leaf",
	"stem",
	"branch",
];

// ---------------------------------------------------------------------------
// Seed ↔ phrase conversion
// ---------------------------------------------------------------------------

/**
 * Convert a 32-bit seed number to a "adj-adj-noun" phrase.
 */
export function seedToPhrase(seed: number): string {
	const s = seed >>> 0;
	const ai = s % ADJECTIVES.length;
	const bi = Math.floor(s / ADJECTIVES.length) % ADJECTIVES.length;
	const ni =
		Math.floor(s / (ADJECTIVES.length * ADJECTIVES.length)) % NOUNS.length;
	return `${ADJECTIVES[ai]}-${ADJECTIVES[bi]}-${NOUNS[ni]}`;
}

/**
 * Parse an "adj-adj-noun" phrase back to a numeric seed.
 * Returns null if the phrase doesn't match the word lists.
 *
 * Also accepts a raw decimal integer string.
 */
export function phraseToSeed(phrase: string): number | null {
	const trimmed = phrase.trim().toLowerCase().replace(/\s+/g, "-");

	// Raw numeric seed
	const asNum = Number(trimmed);
	if (!Number.isNaN(asNum) && Number.isInteger(asNum)) {
		return asNum >>> 0;
	}

	const parts = trimmed.split("-");
	if (parts.length !== 3) return null;

	const ai = ADJECTIVES.indexOf(parts[0]);
	const bi = ADJECTIVES.indexOf(parts[1]);
	const ni = NOUNS.indexOf(parts[2]);
	if (ai === -1 || bi === -1 || ni === -1) return null;

	const seed =
		ai + bi * ADJECTIVES.length + ni * ADJECTIVES.length * ADJECTIVES.length;
	return seed >>> 0;
}

/**
 * Generate a random seed (e.g. at title screen startup).
 */
export function randomSeed(): number {
	return (Math.random() * 0xffffffff) >>> 0;
}

// ---------------------------------------------------------------------------
// Global seed singleton
// ---------------------------------------------------------------------------

let _currentSeed = 42;

export function setWorldSeed(seed: number) {
	_currentSeed = seed >>> 0;
}

export function getWorldSeed(): number {
	return _currentSeed;
}

/**
 * Create a PRNG seeded from the world seed + a purpose-specific offset.
 * Different systems use different offsets so they don't interfere.
 *
 * Usage:
 *   const rng = worldPRNG("city");
 *   const x = rng(); // deterministic for this seed + "city"
 */
export function worldPRNG(purpose: string): () => number {
	// Hash purpose string into an offset
	let h = _currentSeed;
	for (let i = 0; i < purpose.length; i++) {
		h = (Math.imul(h, 31) + purpose.charCodeAt(i)) >>> 0;
	}
	return makePRNG(h);
}

// ---------------------------------------------------------------------------
// Gameplay PRNG
// ---------------------------------------------------------------------------
// A separate pool for dynamic gameplay events (combat rolls, enemy spawns)
// so they don't consume the world generation PRNG sequence.
let _gameplayPRNG = makePRNG(Date.now());

export function initGameplayPRNG(seed: number) {
	_gameplayPRNG = makePRNG(seed);
}

/**
 * Get a random number from the gameplay PRNG pool.
 */
export function gameplayRandom(): number {
	return _gameplayPRNG();
}
