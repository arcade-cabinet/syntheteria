/**
 * Tests for FactionSelect — faction data constants and FactionId type.
 *
 * Tests cover the module-level constants and imported faction data integrity.
 */

import civilizations from "../../../config/civilizations.json";
import type { FactionId } from "../FactionSelect";

// Inline the bonuses/glyphs as they appear in FactionSelect.tsx,
// since they are not exported. We test the config data and type correctness.

const ALL_FACTION_IDS: FactionId[] = [
	"reclaimers",
	"volt_collective",
	"signal_choir",
	"iron_creed",
];

// ---------------------------------------------------------------------------
// civilizations config — shape expected by FactionSelect
// ---------------------------------------------------------------------------

describe("civilizations config (used by FactionSelect)", () => {
	it("contains all four faction IDs", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(civilizations).toHaveProperty(id);
		}
	});

	it("each faction has a name string", () => {
		for (const id of ALL_FACTION_IDS) {
			const civ = civilizations[id as keyof typeof civilizations];
			expect(typeof civ.name).toBe("string");
			expect(civ.name.length).toBeGreaterThan(0);
		}
	});

	it("each faction has a color string", () => {
		for (const id of ALL_FACTION_IDS) {
			const civ = civilizations[id as keyof typeof civilizations];
			expect(typeof civ.color).toBe("string");
			expect(civ.color.length).toBeGreaterThan(0);
		}
	});

	it("each faction has a description string", () => {
		for (const id of ALL_FACTION_IDS) {
			const civ = civilizations[id as keyof typeof civilizations];
			expect(typeof civ.description).toBe("string");
			expect(civ.description.length).toBeGreaterThan(0);
		}
	});

	it("faction names are unique", () => {
		const names = ALL_FACTION_IDS.map(
			(id) => civilizations[id as keyof typeof civilizations].name,
		);
		const uniqueNames = new Set(names);
		expect(uniqueNames.size).toBe(names.length);
	});

	it("faction colors are unique", () => {
		const colors = ALL_FACTION_IDS.map(
			(id) => civilizations[id as keyof typeof civilizations].color,
		);
		const uniqueColors = new Set(colors);
		expect(uniqueColors.size).toBe(colors.length);
	});
});

// ---------------------------------------------------------------------------
// FACTION_BONUSES constants (mirrored from FactionSelect.tsx for verification)
// ---------------------------------------------------------------------------

const FACTION_BONUSES: Record<FactionId, string[]> = {
	reclaimers: [
		"+25% scrap yield",
		"+15% repair speed",
		"Start with extra scavenger bot",
	],
	volt_collective: [
		"+20% power efficiency",
		"Lightning resistance",
		"Start with powered rod",
	],
	signal_choir: [
		"+30% hacking speed",
		"+25% signal range",
		"Start with signal relay",
	],
	iron_creed: [
		"+20% combat damage",
		"+15% armor durability",
		"Start with fortified position",
	],
};

describe("FACTION_BONUSES", () => {
	it("every faction has bonuses defined", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(FACTION_BONUSES).toHaveProperty(id);
		}
	});

	it("each faction has exactly 3 bonuses", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(FACTION_BONUSES[id]).toHaveLength(3);
		}
	});

	it("each bonus is a non-empty string", () => {
		for (const id of ALL_FACTION_IDS) {
			for (const bonus of FACTION_BONUSES[id]) {
				expect(typeof bonus).toBe("string");
				expect(bonus.length).toBeGreaterThan(0);
			}
		}
	});

	it("reclaimers bonuses reference scrap/repair", () => {
		expect(FACTION_BONUSES.reclaimers[0]).toContain("scrap");
		expect(FACTION_BONUSES.reclaimers[1]).toContain("repair");
	});

	it("volt_collective bonuses reference power", () => {
		expect(FACTION_BONUSES.volt_collective[0]).toContain("power");
	});

	it("signal_choir bonuses reference hacking", () => {
		expect(FACTION_BONUSES.signal_choir[0]).toContain("hacking");
	});

	it("iron_creed bonuses reference combat", () => {
		expect(FACTION_BONUSES.iron_creed[0]).toContain("combat");
	});
});

// ---------------------------------------------------------------------------
// FACTION_GLYPHS constants (mirrored from FactionSelect.tsx)
// ---------------------------------------------------------------------------

const FACTION_GLYPHS: Record<FactionId, string> = {
	reclaimers: "[::.]",
	volt_collective: "[/\\/]",
	signal_choir: "[(~)]",
	iron_creed: "[##]",
};

describe("FACTION_GLYPHS", () => {
	it("every faction has a glyph defined", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(FACTION_GLYPHS).toHaveProperty(id);
		}
	});

	it("each glyph is a non-empty string", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(typeof FACTION_GLYPHS[id]).toBe("string");
			expect(FACTION_GLYPHS[id].length).toBeGreaterThan(0);
		}
	});

	it("glyphs are unique across factions", () => {
		const glyphs = Object.values(FACTION_GLYPHS);
		const unique = new Set(glyphs);
		expect(unique.size).toBe(glyphs.length);
	});

	it("reclaimers glyph is '[::.]'", () => {
		expect(FACTION_GLYPHS.reclaimers).toBe("[::.]");
	});

	it("iron_creed glyph is '[##]'", () => {
		expect(FACTION_GLYPHS.iron_creed).toBe("[##]");
	});
});

// ---------------------------------------------------------------------------
// FactionId type coverage
// ---------------------------------------------------------------------------

describe("FactionId valid values", () => {
	it("all four faction ids are valid strings", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(typeof id).toBe("string");
			expect(id.length).toBeGreaterThan(0);
		}
	});

	it("faction ids use underscores not hyphens", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(id).not.toContain("-");
		}
	});

	it("faction ids are all lowercase", () => {
		for (const id of ALL_FACTION_IDS) {
			expect(id).toBe(id.toLowerCase());
		}
	});
});
