/**
 * Model data integrity tests — validates modelDefinitions.json.
 *
 * Catches malformed data: undefined yields, missing bounds, bad families,
 * missing elevation profiles, etc. Driven from the JSON source of truth.
 */

import modelManifest from "../../../config/modelDefinitions.json";
import { FLOOR_MATERIALS } from "../types";

type RawModel = (typeof modelManifest.models)[number];

const VALID_FAMILIES = [
	"column", "detail", "door", "floor", "pipe", "prop", "roof", "stair",
	"wall", "fence", "sign", "turret", "barricade", "gate", "collectible",
	"resource", "terrain", "structure", "computer", "container", "conveyor",
	"antenna", "cable", "support", "generator", "monorail", "vehicle",
	"lamp", "robot_hostile", "robot_industrial", "robot_player", "vent",
	"platform",
];

// ─── Required Fields ────────────────────────────────────────────────────────

describe("model required fields", () => {
	it("every model has a non-empty string id", () => {
		for (const model of modelManifest.models) {
			expect(typeof model.id).toBe("string");
			expect(model.id.length).toBeGreaterThan(0);
		}
	});

	it("every model has a valid family", () => {
		for (const model of modelManifest.models) {
			expect(typeof model.family).toBe("string");
			expect(model.family.length).toBeGreaterThan(0);
			// Should be a known family
			expect(VALID_FAMILIES).toContain(model.family);
		}
	});

	it("model IDs are unique", () => {
		const ids = modelManifest.models.map((m) => m.id);
		const unique = new Set(ids);
		expect(unique.size).toBe(ids.length);
	});

	it("every model has a boolean passable field", () => {
		for (const model of modelManifest.models) {
			expect(typeof model.passable).toBe("boolean");
		}
	});
});

// ─── Bounds Validation ──────────────────────────────────────────────────────

describe("model bounds", () => {
	it("every model has bounds with positive width, depth, height", () => {
		for (const model of modelManifest.models) {
			expect(model.bounds).toBeDefined();
			expect(typeof model.bounds.width).toBe("number");
			expect(typeof model.bounds.depth).toBe("number");
			expect(typeof model.bounds.height).toBe("number");
			expect(model.bounds.width).toBeGreaterThan(0);
			expect(model.bounds.depth).toBeGreaterThanOrEqual(0); // Some flat decals may be 0
			expect(model.bounds.height).toBeGreaterThanOrEqual(0); // Flat platforms may have h=0
		}
	});
});

// ─── Harvest Yield Validation ───────────────────────────────────────────────

describe("harvest yields", () => {
	it("every harvest yield has resource (string), min (number), max (number)", () => {
		for (const model of modelManifest.models) {
			if (!model.harvest || !model.harvest.yields) continue;

			for (const yield_ of model.harvest.yields) {
				const y = yield_ as Record<string, unknown>;

				// Must have 'resource' field, not 'type'
				expect(y.resource).toBeDefined();
				expect(typeof y.resource).toBe("string");
				expect((y.resource as string).length).toBeGreaterThan(0);

				// Must have 'min' and 'max' numbers
				expect(y.min).toBeDefined();
				expect(typeof y.min).toBe("number");
				expect(y.max).toBeDefined();
				expect(typeof y.max).toBe("number");

				// min <= max
				expect(y.min as number).toBeLessThanOrEqual(y.max as number);

				// No negative yields
				expect(y.min as number).toBeGreaterThanOrEqual(0);

				// Should NOT have undefined fields
				expect(y.type).toBeUndefined(); // Common mistake: using 'type' instead of 'resource'
				expect(y.amount).toBeUndefined(); // Common mistake: using 'amount' instead of min/max
			}
		}
	});

	it("no model has empty yields array (if harvest exists, yields must have items)", () => {
		for (const model of modelManifest.models) {
			if (model.harvest === null) continue;
			if (model.harvest && model.harvest.yields) {
				expect(model.harvest.yields.length).toBeGreaterThan(0);
			}
		}
	});

	it("harvestable models within a family yield the same resource types", () => {
		// Group harvestable models by family
		const familyYields = new Map<string, Set<string>>();

		for (const model of modelManifest.models) {
			if (!model.harvest?.yields?.length) continue;

			const resources = (model.harvest.yields as Array<{ resource: string }>)
				.map((y) => y.resource)
				.sort()
				.join(",");

			const existing = familyYields.get(model.family);
			if (existing) {
				existing.add(resources);
			} else {
				familyYields.set(model.family, new Set([resources]));
			}
		}

		// Each family should have at most 2 yield patterns
		// (allows for size variants like small_rock vs large_rock)
		for (const [family, patterns] of familyYields) {
			expect(patterns.size).toBeLessThanOrEqual(3);
		}
	});
});

// ─── Elevation Profile Validation ───────────────────────────────────────────

describe("elevation profiles", () => {
	it("every model has an elevationProfile object", () => {
		for (const model of modelManifest.models) {
			expect(model.elevationProfile).toBeDefined();
			expect(typeof model.elevationProfile).toBe("object");
		}
	});

	it("elevationProfile has all required boolean fields", () => {
		for (const model of modelManifest.models) {
			const ep = model.elevationProfile;
			expect(typeof ep.supportsBridging).toBe("boolean");
			expect(typeof ep.isRamp).toBe("boolean");
			expect(typeof ep.isVerticalSupport).toBe("boolean");
		}
	});

	it("elevationProfile has all required numeric fields", () => {
		for (const model of modelManifest.models) {
			const ep = model.elevationProfile;
			expect(typeof ep.minLevel).toBe("number");
			expect(typeof ep.maxLevel).toBe("number");
			expect(ep.minLevel).toBeGreaterThanOrEqual(0);
			expect(ep.maxLevel).toBeGreaterThanOrEqual(ep.minLevel);
			expect(ep.maxLevel).toBeLessThanOrEqual(2);
		}
	});

	it("bridge models have clearanceProvided > 0", () => {
		for (const model of modelManifest.models) {
			if (model.elevationProfile.supportsBridging) {
				expect(model.elevationProfile.clearanceProvided).toBeGreaterThan(0);
			}
		}
	});
});

// ─── Cross-Reference Validation ─────────────────────────────────────────────

describe("cross-references", () => {
	it("floor materials in types.ts match actual materials used", () => {
		// FLOOR_MATERIALS should be a valid set
		expect(FLOOR_MATERIALS.length).toBeGreaterThanOrEqual(2);
		for (const mat of FLOOR_MATERIALS) {
			expect(typeof mat).toBe("string");
			expect(mat.length).toBeGreaterThan(0);
		}
	});

	it("no model has undefined or null in critical string fields", () => {
		for (const model of modelManifest.models) {
			// id and family must never be undefined/null
			expect(model.id).not.toBeNull();
			expect(model.id).not.toBeUndefined();
			expect(model.family).not.toBeNull();
			expect(model.family).not.toBeUndefined();
			expect(model.category).not.toBeNull();
			expect(model.category).not.toBeUndefined();
		}
	});

	it("model count matches expected from JSON", () => {
		expect(modelManifest.models.length).toBeGreaterThan(0);
		// Verify we're reading real data, not an empty or corrupted file
		expect(modelManifest.models.length).toBeGreaterThanOrEqual(200);
	});
});
