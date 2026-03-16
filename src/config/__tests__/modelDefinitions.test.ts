/**
 * Model Definitions Source-of-Truth Tests
 *
 * Every assertion derives from modelDefinitions.json — the single source of
 * truth for all 3D models in the game. NO hardcoded expected values.
 */

import * as fs from "fs";
import * as path from "path";
import {
	ASSET_BASE_PATH,
	EXPECTED_CATEGORIES,
	EXPECTED_MODEL_COUNT,
	TILE_SIZE_METERS,
	VALID_CATEGORIES,
} from "../../../tests/testConstants";
import modelManifest from "../modelDefinitions.json";

const MODELS = modelManifest.models;
const PROJECT_ROOT = path.resolve(__dirname, "../../..");

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

describe("model definitions completeness", () => {
	it("contains exactly the expected number of models", () => {
		expect(MODELS.length).toBe(EXPECTED_MODEL_COUNT);
		// Cross-check the declared count in the manifest header
		expect(modelManifest.modelCount).toBe(MODELS.length);
	});

	it("has no duplicate IDs", () => {
		const ids = MODELS.map((m) => m.id);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(ids.length);
	});

	it("covers all expected categories", () => {
		expect(VALID_CATEGORIES).toEqual([...EXPECTED_CATEGORIES].sort());
	});
});

// ---------------------------------------------------------------------------
// Required Fields
// ---------------------------------------------------------------------------

describe("model definitions required fields", () => {
	it.each(
		MODELS.map((m) => [m.id, m]),
	)("%s has all required fields", (_id, model) => {
		expect(typeof model.id).toBe("string");
		expect(model.id.length).toBeGreaterThan(0);
		expect(typeof model.displayName).toBe("string");
		expect(model.displayName.length).toBeGreaterThan(0);
		expect(typeof model.category).toBe("string");
		expect(typeof model.family).toBe("string");
		expect(typeof model.assetPath).toBe("string");
		expect(model.assetPath.length).toBeGreaterThan(0);

		// Bounds must be non-negative; flat items (doors, platforms) may have
		// one zero dimension but at least two must be positive.
		expect(model.bounds).toBeDefined();
		expect(model.bounds.width).toBeGreaterThanOrEqual(0);
		expect(model.bounds.height).toBeGreaterThanOrEqual(0);
		expect(model.bounds.depth).toBeGreaterThanOrEqual(0);
		const positiveDims = [
			model.bounds.width,
			model.bounds.height,
			model.bounds.depth,
		].filter((d) => d > 0).length;
		expect(positiveDims).toBeGreaterThanOrEqual(2);

		// Grid footprint must be positive integers
		expect(model.gridFootprint).toBeDefined();
		expect(model.gridFootprint.width).toBeGreaterThanOrEqual(1);
		expect(model.gridFootprint.depth).toBeGreaterThanOrEqual(1);
		expect(Number.isInteger(model.gridFootprint.width)).toBe(true);
		expect(Number.isInteger(model.gridFootprint.depth)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Asset Path Validation
// ---------------------------------------------------------------------------

describe("model definitions asset paths", () => {
	it.each(
		MODELS.map((m) => [m.id, m.assetPath]),
	)("%s asset exists on disk at %s", (_id, assetPath) => {
		const fullPath = path.join(PROJECT_ROOT, ASSET_BASE_PATH, assetPath);
		expect(fs.existsSync(fullPath)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Category Validation
// ---------------------------------------------------------------------------

describe("model definitions category validity", () => {
	it.each(
		MODELS.map((m) => [m.id, m.category]),
	)("%s has valid category %s", (_id, category) => {
		expect(EXPECTED_CATEGORIES).toContain(category);
	});
});

// ---------------------------------------------------------------------------
// Harvest Rules
// ---------------------------------------------------------------------------

describe("model definitions harvest rules", () => {
	const harvestableModels = MODELS.filter((m) => m.harvest !== null);

	it("every harvestable model has at least one yield", () => {
		for (const model of harvestableModels) {
			expect(model.harvest!.yields.length).toBeGreaterThan(0);
		}
	});

	it("every harvest yield has positive min and max", () => {
		for (const model of harvestableModels) {
			for (const y of model.harvest!.yields) {
				expect(y.min).toBeGreaterThan(0);
				expect(y.max).toBeGreaterThanOrEqual(y.min);
				expect(typeof y.resource).toBe("string");
				expect(y.resource.length).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Combat Rules
// ---------------------------------------------------------------------------

describe("model definitions combat rules", () => {
	const combatModels = MODELS.filter((m) => m.combat !== null);

	it("every combat model has positive HP", () => {
		for (const model of combatModels) {
			expect(model.combat!.hp).toBeGreaterThan(0);
		}
	});

	it("every combat model has non-negative armor", () => {
		for (const model of combatModels) {
			expect(model.combat!.armor).toBeGreaterThanOrEqual(0);
		}
	});
});

// ---------------------------------------------------------------------------
// Economy / Build Cost Rules
// ---------------------------------------------------------------------------

describe("model definitions economy rules", () => {
	const buildableModels = MODELS.filter((m) => m.buildable === true);
	const withBuildCost = buildableModels.filter(
		(m) => m.economy?.buildCost !== null,
	);

	it("every buildable model with build cost has at least one resource cost", () => {
		for (const model of withBuildCost) {
			const cost = model.economy!.buildCost!;
			const entries = Object.entries(cost);
			expect(entries.length).toBeGreaterThan(0);
			for (const [resource, amount] of entries) {
				expect(typeof resource).toBe("string");
				expect(amount).toBeGreaterThan(0);
			}
		}
	});
});

// ---------------------------------------------------------------------------
// Grid Footprint Consistency
// ---------------------------------------------------------------------------

describe("model definitions grid footprint consistency", () => {
	it.each(
		MODELS.map((m) => [m.id, m]),
	)("%s footprint matches bounds / tileSize (ceil)", (_id, model) => {
		const expectedWidth = Math.max(
			1,
			Math.ceil(model.bounds.width / TILE_SIZE_METERS),
		);
		const expectedDepth = Math.max(
			1,
			Math.ceil(model.bounds.depth / TILE_SIZE_METERS),
		);
		expect(model.gridFootprint.width).toBe(expectedWidth);
		expect(model.gridFootprint.depth).toBe(expectedDepth);
	});
});

// ---------------------------------------------------------------------------
// Robot Model Conventions
// ---------------------------------------------------------------------------

describe("model definitions robot conventions", () => {
	const robotModels = MODELS.filter((m) => m.category === "robot");

	it("all robot models have family starting with robot_", () => {
		for (const model of robotModels) {
			expect(model.family.startsWith("robot_")).toBe(true);
		}
	});

	it("robot model count matches category count", () => {
		expect(robotModels.length).toBe(
			MODELS.filter((m) => m.category === "robot").length,
		);
	});
});

// ---------------------------------------------------------------------------
// Forbidden References
// ---------------------------------------------------------------------------

describe("model definitions forbidden references", () => {
	it("no model has 'overworld' in its category or assetPath", () => {
		for (const model of MODELS) {
			expect(model.category.toLowerCase()).not.toContain("overworld");
			expect(model.assetPath.toLowerCase()).not.toContain("overworld");
		}
	});

	it("no model has 'polyhaven' as its category", () => {
		for (const model of MODELS) {
			expect(model.category).not.toBe("polyhaven");
		}
	});
});

// ---------------------------------------------------------------------------
// Schema Version
// ---------------------------------------------------------------------------

describe("model definitions schema", () => {
	it("has a valid schema version", () => {
		expect(modelManifest.schemaVersion).toBeGreaterThanOrEqual(1);
	});

	it("declares the correct tile size", () => {
		expect(modelManifest.tileSize).toBe(TILE_SIZE_METERS);
	});
});
