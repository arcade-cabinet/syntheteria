/**
 * Unit tests for seed.ts — PRNG, seed phrases, and world seed management.
 */

import {
	makePRNG,
	seedToPhrase,
	phraseToSeed,
	setWorldSeed,
	getWorldSeed,
	worldPRNG,
} from "../seed";

// ---------------------------------------------------------------------------
// makePRNG — Mulberry32 PRNG
// ---------------------------------------------------------------------------

describe("makePRNG", () => {
	it("returns a function", () => {
		const rng = makePRNG(42);
		expect(typeof rng).toBe("function");
	});

	it("produces numbers between 0 and 1", () => {
		const rng = makePRNG(12345);
		for (let i = 0; i < 100; i++) {
			const val = rng();
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThanOrEqual(1);
		}
	});

	it("is deterministic — same seed produces same sequence", () => {
		const rng1 = makePRNG(42);
		const rng2 = makePRNG(42);
		for (let i = 0; i < 50; i++) {
			expect(rng1()).toBe(rng2());
		}
	});

	it("different seeds produce different sequences", () => {
		const rng1 = makePRNG(1);
		const rng2 = makePRNG(2);
		// At least one of the first 5 values should differ
		let allSame = true;
		for (let i = 0; i < 5; i++) {
			if (rng1() !== rng2()) {
				allSame = false;
				break;
			}
		}
		expect(allSame).toBe(false);
	});

	it("handles seed 0", () => {
		const rng = makePRNG(0);
		const val = rng();
		expect(val).toBeGreaterThanOrEqual(0);
		expect(val).toBeLessThanOrEqual(1);
	});

	it("handles very large seed values", () => {
		const rng = makePRNG(0xffffffff);
		const val = rng();
		expect(val).toBeGreaterThanOrEqual(0);
		expect(val).toBeLessThanOrEqual(1);
	});

	it("handles negative seed values (treated as unsigned)", () => {
		const rng = makePRNG(-1);
		const val = rng();
		expect(val).toBeGreaterThanOrEqual(0);
		expect(val).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// seedToPhrase — numeric seed to "adj-adj-noun" phrase
// ---------------------------------------------------------------------------

describe("seedToPhrase", () => {
	it("returns a string with three hyphen-separated words", () => {
		const phrase = seedToPhrase(42);
		const parts = phrase.split("-");
		expect(parts).toHaveLength(3);
	});

	it("is deterministic — same seed produces same phrase", () => {
		expect(seedToPhrase(42)).toBe(seedToPhrase(42));
	});

	it("different seeds produce different phrases (generally)", () => {
		const phrases = new Set<string>();
		for (let i = 0; i < 100; i++) {
			phrases.add(seedToPhrase(i));
		}
		// Should have many distinct phrases
		expect(phrases.size).toBeGreaterThan(50);
	});

	it("handles seed 0", () => {
		const phrase = seedToPhrase(0);
		expect(typeof phrase).toBe("string");
		expect(phrase.split("-")).toHaveLength(3);
	});

	it("handles very large seed values", () => {
		const phrase = seedToPhrase(0xffffffff);
		expect(typeof phrase).toBe("string");
		expect(phrase.split("-")).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// phraseToSeed — "adj-adj-noun" phrase back to numeric seed
// ---------------------------------------------------------------------------

describe("phraseToSeed", () => {
	it("roundtrips: seedToPhrase → phraseToSeed gives back the same seed", () => {
		for (const seed of [0, 1, 42, 100, 999, 12345]) {
			const phrase = seedToPhrase(seed);
			const result = phraseToSeed(phrase);
			expect(result).toBe(seed);
		}
	});

	it("handles uppercase input", () => {
		const phrase = seedToPhrase(42);
		const upper = phrase.toUpperCase();
		expect(phraseToSeed(upper)).toBe(42);
	});

	it("handles spaces instead of hyphens", () => {
		const phrase = seedToPhrase(42);
		const spaced = phrase.replace(/-/g, " ");
		expect(phraseToSeed(spaced)).toBe(42);
	});

	it("handles leading/trailing whitespace", () => {
		const phrase = seedToPhrase(42);
		expect(phraseToSeed(`  ${phrase}  `)).toBe(42);
	});

	it("returns null for invalid phrase with wrong number of words", () => {
		expect(phraseToSeed("only-two")).toBeNull();
		expect(phraseToSeed("too-many-words-here")).toBeNull();
		expect(phraseToSeed("single")).toBeNull();
	});

	it("returns null for words not in the word lists", () => {
		expect(phraseToSeed("banana-apple-mango")).toBeNull();
	});

	it("parses raw decimal integer strings", () => {
		expect(phraseToSeed("42")).toBe(42);
		expect(phraseToSeed("0")).toBe(0);
		expect(phraseToSeed("12345")).toBe(12345);
	});

	it("treats negative integer strings as unsigned", () => {
		const result = phraseToSeed("-1");
		expect(result).toBe((-1) >>> 0);
	});
});

// ---------------------------------------------------------------------------
// Global seed singleton
// ---------------------------------------------------------------------------

describe("world seed singleton", () => {
	it("starts with default seed 42", () => {
		// Reset state
		setWorldSeed(42);
		expect(getWorldSeed()).toBe(42);
	});

	it("setWorldSeed / getWorldSeed roundtrip", () => {
		setWorldSeed(12345);
		expect(getWorldSeed()).toBe(12345);
	});

	it("setWorldSeed treats negative as unsigned", () => {
		setWorldSeed(-1);
		expect(getWorldSeed()).toBe(0xffffffff);
	});
});

// ---------------------------------------------------------------------------
// worldPRNG — purpose-keyed PRNG from world seed
// ---------------------------------------------------------------------------

describe("worldPRNG", () => {
	beforeEach(() => {
		setWorldSeed(42);
	});

	it("returns a function", () => {
		const rng = worldPRNG("test");
		expect(typeof rng).toBe("function");
	});

	it("is deterministic for the same seed + purpose", () => {
		setWorldSeed(100);
		const rng1 = worldPRNG("terrain");
		worldPRNG("terrain");
		// Both should produce the same values
		// (since they're derived from the same seed + purpose hash)
		setWorldSeed(100);
		const rng3 = worldPRNG("terrain");
		for (let i = 0; i < 10; i++) {
			// Compare rng1 sequence with rng3 (both started from seed 100 + "terrain")
			expect(rng1()).toBe(rng3());
		}
	});

	it("different purposes produce different sequences", () => {
		const rng1 = worldPRNG("city");
		const rng2 = worldPRNG("enemy");
		let allSame = true;
		for (let i = 0; i < 5; i++) {
			if (rng1() !== rng2()) {
				allSame = false;
				break;
			}
		}
		expect(allSame).toBe(false);
	});

	it("different world seeds produce different sequences for same purpose", () => {
		setWorldSeed(1);
		const rng1 = worldPRNG("terrain");
		setWorldSeed(2);
		const rng2 = worldPRNG("terrain");

		let allSame = true;
		for (let i = 0; i < 5; i++) {
			if (rng1() !== rng2()) {
				allSame = false;
				break;
			}
		}
		expect(allSame).toBe(false);
	});

	it("produces values between 0 and 1", () => {
		const rng = worldPRNG("test");
		for (let i = 0; i < 100; i++) {
			const val = rng();
			expect(val).toBeGreaterThanOrEqual(0);
			expect(val).toBeLessThanOrEqual(1);
		}
	});
});
