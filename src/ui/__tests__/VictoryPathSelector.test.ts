/**
 * Tests for VictoryPathSelector — pure utility functions.
 *
 * All tests operate on the exported constants and pure functions only,
 * no DOM rendering required.
 */

import {
	VICTORY_PATHS,
	getPathAccentColor,
	getPathShortLabel,
	getVictoryPathMeta,
	isValidVictoryPath,
	type VictoryPathId,
} from "../VictoryPathSelector";

// ---------------------------------------------------------------------------
// VICTORY_PATHS constant
// ---------------------------------------------------------------------------

describe("VICTORY_PATHS", () => {
	it("has exactly 4 paths", () => {
		expect(VICTORY_PATHS).toHaveLength(4);
	});

	it("includes all 4 required path IDs", () => {
		const ids = VICTORY_PATHS.map((p) => p.id);
		expect(ids).toContain("technical_mastery");
		expect(ids).toContain("subjugation");
		expect(ids).toContain("social_networking");
		expect(ids).toContain("religious_philosophical");
	});

	it("each path has a non-empty displayName", () => {
		for (const path of VICTORY_PATHS) {
			expect(typeof path.displayName).toBe("string");
			expect(path.displayName.length).toBeGreaterThan(0);
		}
	});

	it("each path has a non-empty glyph", () => {
		for (const path of VICTORY_PATHS) {
			expect(typeof path.glyph).toBe("string");
			expect(path.glyph.length).toBeGreaterThan(0);
		}
	});

	it("each path has a non-empty description", () => {
		for (const path of VICTORY_PATHS) {
			expect(typeof path.description).toBe("string");
			expect(path.description.length).toBeGreaterThan(0);
		}
	});

	it("each path has an accentColor starting with #", () => {
		for (const path of VICTORY_PATHS) {
			expect(path.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
		}
	});

	it("all path IDs are unique", () => {
		const ids = VICTORY_PATHS.map((p) => p.id);
		const unique = new Set(ids);
		expect(ids.length).toBe(unique.size);
	});

	it("all accent colors are unique", () => {
		const colors = VICTORY_PATHS.map((p) => p.accentColor);
		const unique = new Set(colors);
		expect(colors.length).toBe(unique.size);
	});
});

// ---------------------------------------------------------------------------
// getVictoryPathMeta
// ---------------------------------------------------------------------------

describe("getVictoryPathMeta", () => {
	it("returns metadata for a valid path ID", () => {
		const meta = getVictoryPathMeta("technical_mastery");
		expect(meta).toBeDefined();
		expect(meta!.id).toBe("technical_mastery");
	});

	it("returns undefined for an unknown path ID", () => {
		expect(getVictoryPathMeta("unknown_path")).toBeUndefined();
	});

	it("returns undefined for an empty string", () => {
		expect(getVictoryPathMeta("")).toBeUndefined();
	});

	it("returns the correct metadata for religious_philosophical", () => {
		const meta = getVictoryPathMeta("religious_philosophical");
		expect(meta).toBeDefined();
		expect(meta!.displayName).toBe("FAITH");
		expect(meta!.accentColor).toBe("#aa44ff");
	});
});

// ---------------------------------------------------------------------------
// getPathShortLabel
// ---------------------------------------------------------------------------

describe("getPathShortLabel", () => {
	it("returns TECHNICAL for technical_mastery", () => {
		expect(getPathShortLabel("technical_mastery")).toBe("TECHNICAL");
	});

	it("returns SUBJUGATION for subjugation", () => {
		expect(getPathShortLabel("subjugation")).toBe("SUBJUGATION");
	});

	it("returns SOCIAL for social_networking", () => {
		expect(getPathShortLabel("social_networking")).toBe("SOCIAL");
	});

	it("returns FAITH for religious_philosophical", () => {
		expect(getPathShortLabel("religious_philosophical")).toBe("FAITH");
	});
});

// ---------------------------------------------------------------------------
// getPathAccentColor
// ---------------------------------------------------------------------------

describe("getPathAccentColor", () => {
	it("returns blue for technical_mastery", () => {
		expect(getPathAccentColor("technical_mastery")).toBe("#00aaff");
	});

	it("returns red for subjugation", () => {
		expect(getPathAccentColor("subjugation")).toBe("#ff4444");
	});

	it("returns amber for social_networking", () => {
		expect(getPathAccentColor("social_networking")).toBe("#ffaa00");
	});

	it("returns purple for religious_philosophical", () => {
		expect(getPathAccentColor("religious_philosophical")).toBe("#aa44ff");
	});

	it("returns the chrome fallback for an unknown path ID", () => {
		// Should return some color string, not throw
		const result = getPathAccentColor("unknown" as VictoryPathId);
		expect(typeof result).toBe("string");
		expect(result.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// isValidVictoryPath
// ---------------------------------------------------------------------------

describe("isValidVictoryPath", () => {
	it("returns true for all 4 valid path IDs", () => {
		const validIds: VictoryPathId[] = [
			"technical_mastery",
			"subjugation",
			"social_networking",
			"religious_philosophical",
		];
		for (const id of validIds) {
			expect(isValidVictoryPath(id)).toBe(true);
		}
	});

	it("returns false for an unknown string", () => {
		expect(isValidVictoryPath("conquest")).toBe(false);
	});

	it("returns false for an empty string", () => {
		expect(isValidVictoryPath("")).toBe(false);
	});

	it("returns false for a partial match", () => {
		expect(isValidVictoryPath("technical")).toBe(false);
	});
});
